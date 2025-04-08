// api/batch-enrich.js (Version 4.1.2 - Updated 2025-04-07)
// Changes:
// - Fixed callFallbackAPI to send payload in the correct format ({ leads: [...] })
// - Updated version to 4.1.2 to reflect the change

import { humanizeName, CAR_BRANDS, COMMON_WORDS, normalizeText, KNOWN_OVERRIDES, KNOWN_PROPER_NOUNS, KNOWN_CITIES_SET } from "./lib/humanize.js";
import { callOpenAI } from "./lib/openai.js"; // Required for GPT fallback

// Concurrency limiter
const pLimit = (concurrency) => {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve).catch(reject).finally(() => {
      active--;
      next();
    });
  };
  return (fn) => new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    next();
  });
};

// Cache
const domainCache = new Map();

// Fuzzy domain matcher
const fuzzyMatchDomain = (inputDomain, knownDomains) => {
  try {
    const normalizedInput = inputDomain.toLowerCase().replace(/\.(com|org|net|co\.uk)$/, "").trim();
    for (const knownDomain of knownDomains) {
      const normalizedKnown = knownDomain.toLowerCase().replace(/\.(com|org|net|co\.uk)$/, "").trim();
      if (normalizedInput === normalizedKnown) return knownDomain;
      if (normalizedInput.includes(normalizedKnown) || normalizedKnown.includes(normalizedInput)) return knownDomain;
    }
    return null;
  } catch (err) {
    console.error(`Error fuzzy matching domain ${inputDomain}: ${err.message}, Stack: ${err.stack}`);
    return null;
  }
};

// Safe POST fallback endpoint with retry
const VERCEL_API_BASE_URL = "https://get-enrich-api-git-main-show-revv.vercel.app";
const VERCEL_API_ENRICH_FALLBACK_URL = `${VERCEL_API_BASE_URL}/api/batch-enrich-company-name-fallback`;

const callFallbackAPI = async (domain, rowNum) => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s per retry
      const response = await fetch(VERCEL_API_ENRICH_FALLBACK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: [{ domain, rowNum }] }), // Fixed payload format
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (jsonErr) {
        throw new Error(`Invalid JSON response: ${text}`);
      }
      if (!response.ok) throw new Error(`Fallback API HTTP ${response.status}: ${result.error || "Unknown error"}`);
      console.log(`Fallback API success for ${domain}: ${JSON.stringify(result.results[0])}`);
      return result.results[0] || { name: "", confidenceScore: 0, flags: ["FallbackAPIFailed"] };
    } catch (err) {
      console.error(`Fallback API attempt ${attempt} failed for ${domain}: ${err.message}, Stack: ${err.stack}`);
      if (attempt === 3) {
        const localResult = await humanizeName(domain, domain, false);
        console.log(`Local fallback for ${domain} after API failure: ${JSON.stringify(localResult)}`);
        return { ...localResult, flags: [...localResult.flags, "FallbackAPIFailed", "LocalFallbackUsed"], error: err.message };
      }
      await new Promise(res => setTimeout(res, 1000)); // 1s delay as per system architecture
    }
  }
};

// Stream to string helper with timeout
const streamToString = async (stream) => {
  const chunks = [];
  const timeout = setTimeout(() => { throw new Error("Stream read timeout"); }, 5000); // 5s timeout
  try {
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    clearTimeout(timeout);
    return Buffer.concat(chunks).toString("utf-8");
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
};

// Entry point
export default async function handler(req, res) {
  console.log("batch-enrich.js Version 4.1.2 - Updated 2025-04-07");

  try {
    // Parse the request body
    let body;
    try {
      const rawBody = await streamToString(req);
      body = JSON.parse(rawBody);
      console.log(`Received payload: ${JSON.stringify(body).slice(0, 300)}`);
    } catch (err) {
      console.error(`JSON parse error: ${err.message}, Stack: ${err.stack}`);
      return res.status(400).json({ error: "Invalid JSON", details: err.message });
    }

    // Validate payload structure
    if (!body || typeof body !== "object") {
      console.error("Request body is missing or not an object");
      return res.status(400).json({ error: "Request body is missing or not an object" });
    }

    // Extract leads (support 'leads', 'leadList', and 'domains' for compatibility)
    const leads = body.leads || body.leadList || body.domains;
    if (!leads) {
      console.error("Missing 'leads', 'leadList', or 'domains' field in payload");
      return res.status(400).json({ error: "Missing 'leads', 'leadList', or 'domains' field in payload" });
    }
    if (!Array.isArray(leads)) {
      console.error("'leads', 'leadList', or 'domains' must be an array");
      return res.status(400).json({ error: "'leads', 'leadList', or 'domains' must be an array" });
    }
    if (leads.length === 0) {
      console.error("'leads', 'leadList', or 'domains' array is empty");
      return res.status(400).json({ error: "'leads', 'leadList', or 'domains' array is empty" });
    }

    // Validate each lead entry
    const validatedLeads = leads.map((lead, index) => {
      if (!lead || typeof lead !== "object" || !lead.domain || typeof lead.domain !== "string" || lead.domain.trim() === "") {
        console.error(`Invalid lead at index ${index}: ${JSON.stringify(lead)}`);
        return null;
      }
      return { domain: lead.domain.trim().toLowerCase(), rowNum: lead.rowNum || (index + 1) };
    }).filter(lead => lead !== null);

    if (validatedLeads.length === 0) {
      console.error("No valid leads after validation");
      return res.status(400).json({ error: "No valid leads after validation" });
    }

    console.log(`Processing ${validatedLeads.length} valid leads`);

    const startTime = Date.now();
    const limit = pLimit(1); // Conservative concurrency for stability
    const results = [];
    const manualReviewQueue = [];
    let totalTokens = 0;
    const fallbackTriggers = [];

    const BATCH_SIZE = 5; // Matches system architecture
    const leadChunks = Array.from({ length: Math.ceil(validatedLeads.length / BATCH_SIZE) }, (_, i) =>
      validatedLeads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    for (const chunk of leadChunks) {
      if (Date.now() - startTime > 18000) { // 18s timeout for Vercel paid tier
        console.log("Partial response due to timeout after 18s");
        return res.status(200).json({ results, manualReviewQueue, totalTokens, fallbackTriggers, partial: true });
      }

      const chunkResults = await Promise.all(
        chunk.map(lead => limit(async () => {
          const { domain, rowNum } = lead;

          const domainLower = domain.toLowerCase();

          // Fuzzy override matching with improved enforcement
          const matchedOverrideDomain = fuzzyMatchDomain(domainLower, Object.keys(KNOWN_OVERRIDES));
          if (matchedOverrideDomain) {
            const override = KNOWN_OVERRIDES[matchedOverrideDomain];
            if (typeof override === 'string' && override.trim().length > 0) {
              const overrideName = override.trim();
              console.log(`Row ${rowNum}: Fuzzy override match for ${domain}: ${overrideName}`);
              return {
                name: overrideName,
                confidenceScore: 100,
                flags: ["FuzzyOverrideMatched"],
                rowNum,
                tokens: 0
              };
            } else if (override !== undefined && override.trim() === "") {
              console.log(`Row ${rowNum}: Empty override for ${domain}, proceeding to fallback`);
              return { name: "", confidenceScore: 0, flags: ["EmptyOverride"], rowNum, tokens: 0 };
            }
          }

          // Check cache
          if (domainCache.has(domainLower)) {
            const cachedResult = domainCache.get(domainLower);
            console.log(`Row ${rowNum}: Cache hit for ${domain}: ${JSON.stringify(cachedResult)}`);
            return { ...cachedResult, rowNum };
          }

          let finalResult;
          let tokensUsed = 0;

          // Primary humanizeName call with retries
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              finalResult = await humanizeName(domain, domain, false);
              tokensUsed = finalResult.tokens || 0;
              console.log(`Row ${rowNum}: humanizeName attempt ${attempt} success for ${domain}: ${JSON.stringify(finalResult)}`);
              break;
            } catch (err) {
              console.error(`Row ${rowNum}: humanizeName attempt ${attempt} failed for ${domain}: ${err.message}, Stack: ${err.stack}`);
              if (attempt === 2) {
                finalResult = { name: "", confidenceScore: 0, flags: ["HumanizeError"], tokens: 0 };
              }
              await new Promise(res => setTimeout(res, 500));
            }
          }

          // Acceptability criteria (aligned with non-negotiable rules)
          const criticalFlags = ["TooGeneric", "CityNameOnly", "Skipped", "FallbackFailed", "PossibleAbbreviation"];
          const forceReviewFlags = [
            "TooGeneric",
            "CityNameOnly",
            "PossibleAbbreviation",
            "BadPrefixOf",
            "CarBrandSuffixRemaining",
            "FuzzyCityMatch",
            "NotPossessiveFriendly"
          ];
          const isAcceptable = finalResult.confidenceScore >= 75 && !finalResult.flags.some(f => criticalFlags.includes(f));

          if (isAcceptable) {
            domainCache.set(domainLower, {
              name: finalResult.name,
              confidenceScore: finalResult.confidenceScore,
              flags: finalResult.flags
            });
            console.log(`Row ${rowNum}: Acceptable result for ${domain}: ${JSON.stringify(finalResult)}`);
            return { ...finalResult, rowNum, tokens: tokensUsed };
          }

          // Fallback to API if needed
          if (finalResult.confidenceScore < 75 || finalResult.flags.some(f => forceReviewFlags.includes(f))) {
            const fallback = await callFallbackAPI(domain, rowNum);
            if (fallback.name && fallback.confidenceScore >= 75 && !fallback.flags.some(f => criticalFlags.includes(f))) {
              finalResult = { ...fallback, flags: [...(fallback.flags || []), "FallbackAPIUsed"], rowNum };
              tokensUsed += fallback.tokens || 0;
              console.log(`Row ${rowNum}: Fallback API used successfully: ${JSON.stringify(finalResult)}`);
            } else {
              finalResult.flags.push("FallbackAPIFailed");
              fallbackTriggers.push({ 
                domain, 
                reason: "FallbackAPIFailed", 
                details: `Score: ${fallback.confidenceScore}, Flags: ${fallback.flags.join(", ")}` 
              });
              console.log(`Row ${rowNum}: Fallback API failed, using primary result: ${JSON.stringify(finalResult)}`);
            }
          }

          // Manual review for low-confidence or problematic results
          if (finalResult.confidenceScore < 75 || finalResult.flags.some(f => forceReviewFlags.includes(f))) {
            manualReviewQueue.push({
              domain,
              name: finalResult.name,
              confidenceScore: finalResult.confidenceScore,
              flags: finalResult.flags,
              rowNum
            });
            finalResult = {
              name: finalResult.name || "",
              confidenceScore: Math.max(finalResult.confidenceScore, 60),
              flags: [...finalResult.flags, "LowConfidence"],
              rowNum
            };
            console.log(`Row ${rowNum}: Added to manual review due to low confidence or flags: ${JSON.stringify(finalResult)}`);
          }

          domainCache.set(domainLower, {
            name: finalResult.name,
            confidenceScore: finalResult.confidenceScore,
            flags: finalResult.flags
          });

          totalTokens += tokensUsed;
          return { ...finalResult, rowNum, tokens: tokensUsed };
        }))
      );

      results.push(...chunkResults);
    }

    console.log(`Batch completed: ${results.length} results, ${manualReviewQueue.length} for review, ${totalTokens} tokens used, ${fallbackTriggers.length} fallback triggers`);
    return res.status(200).json({ results, manualReviewQueue, totalTokens, fallbackTriggers, partial: false });
  } catch (err) {
    console.error(`Handler error: ${err.message}, Stack: ${err.stack}`);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}

export const config = { api: { bodyParser: false } };
