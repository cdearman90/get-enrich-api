// api/batch-enrich.js (Version 4.1.5 - Updated 2025-04-09)
// Changes:
// - Aligned forceReviewFlags with batch-enrich-company-name-fallback.js (added UnverifiedCity)
// - Added subdomain normalization for [CarBrand]of[City] patterns before humanizeName
// - Enhanced fallbackTriggers logging with brand, city, and gptUsed details
// - Added manual test for known CarBrandOfCity domains
// - Updated version to 4.1.5 to reflect the changes

import { humanizeName, CAR_BRANDS, COMMON_WORDS, normalizeText, KNOWN_OVERRIDES, KNOWN_PROPER_NOUNS, KNOWN_CITIES_SET, extractBrandOfCityFromDomain } from "./lib/humanize.js";
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
        body: JSON.stringify({ leads: [{ domain, rowNum }] }),
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
      // Validate the response schema
      if (!Array.isArray(result.successful) || !result.successful[0]) {
        throw new Error(`Invalid fallback API response format: ${text}`);
      }
      const fallbackResult = result.successful[0];
      // Ensure required fields are present
      const validatedResult = {
        domain: fallbackResult.domain || domain,
        companyName: typeof fallbackResult.companyName === "string" ? fallbackResult.companyName : "",
        confidenceScore: typeof fallbackResult.confidenceScore === "number" ? fallbackResult.confidenceScore : 0,
        flags: Array.isArray(fallbackResult.flags) ? fallbackResult.flags : ["InvalidFallbackResponse"],
        tokens: typeof fallbackResult.tokens === "number" ? fallbackResult.tokens : 0
      };
      console.log(`Fallback API success for ${domain} (row ${rowNum}): name=${validatedResult.companyName}, score=${validatedResult.confidenceScore}`);
      return { ...validatedResult, rowNum };
    } catch (err) {
      console.error(`Fallback API attempt ${attempt} failed for ${domain} (row ${rowNum}): ${err.message}`);
      if (attempt === 3) {
        const localResult = await humanizeName(domain, domain, false);
        console.log(`Local fallback for ${domain} (row ${rowNum}) after API failure: name=${localResult.name}, score=${localResult.confidenceScore}`);
        return { 
          domain,
          companyName: localResult.name || "",
          confidenceScore: localResult.confidenceScore || 0,
          flags: [...(localResult.flags || []), "FallbackAPIFailed", "LocalFallbackUsed"], 
          rowNum, 
          error: err.message,
          tokens: localResult.tokens || 0 
        };
      }
      await new Promise(res => setTimeout(res, 1000)); // 1s delay as per system architecture
    }
  }
};

// Stream to string helper with timeout and fallback
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
    console.error(`Stream read failed: ${err.message}`);
    return ""; // Fallback to empty string to allow graceful error handling
  }
};

// Entry point
export default async function handler(req, res) {
  console.log("batch-enrich.js Version 4.1.5 - Updated 2025-04-09");

  try {
    // Parse the request body
    let body;
    try {
      const rawBody = await streamToString(req);
      if (!rawBody) {
        console.error("Request body is empty after stream read");
        return res.status(400).json({ error: "Request body is empty" });
      }
      body = JSON.parse(rawBody);
      console.log(`Received payload with ${body.leads?.length || 0} leads`);
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
    const limit = pLimit(2); // Increased concurrency to 2 for better throughput
    const successful = [];
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
        return res.status(200).json({ successful, manualReviewQueue, totalTokens, fallbackTriggers, partial: true });
      }

      const chunkResults = await Promise.all(
        chunk.map(lead => limit(async () => {
          const { domain, rowNum } = lead;

          // Per-domain timeout check
          const domainStartTime = Date.now();
          if (Date.now() - startTime > 18000) {
            console.log(`Row ${rowNum}: Skipped due to overall timeout`);
            return { domain, companyName: "", confidenceScore: 0, flags: ["SkippedDueToTimeout"], rowNum, tokens: 0 };
          }

          let domainLower = domain.toLowerCase();

          // Normalize subdomains like mydealer-mbofstockton.com
          const normalizedMatch = extractBrandOfCityFromDomain(domainLower);
          if (normalizedMatch && !KNOWN_OVERRIDES[domainLower]) {
            const normalizedDomain = `${normalizedMatch.brand.toLowerCase()}of${normalizedMatch.city.toLowerCase()}`;
            console.log(`Row ${rowNum}: Normalized subdomain detected: ${domain} → ${normalizedDomain}`);
            domainLower = normalizedDomain;
          }

          // Fuzzy override matching with improved enforcement
          const matchedOverrideDomain = fuzzyMatchDomain(domainLower, Object.keys(KNOWN_OVERRIDES));
          if (matchedOverrideDomain) {
            const override = KNOWN_OVERRIDES[matchedOverrideDomain];
            if (typeof override === 'string' && override.trim().length > 0) {
              const overrideName = override.trim();
              console.log(`Row ${rowNum}: Fuzzy override match for ${domain}: ${overrideName}`);
              return {
                domain,
                companyName: overrideName,
                confidenceScore: 100,
                flags: ["FuzzyOverrideMatched"],
                rowNum,
                tokens: 0
              };
            } else if (override !== undefined && override.trim() === "") {
              console.log(`Row ${rowNum}: Empty override for ${domain}, proceeding to fallback`);
              return { domain, companyName: "", confidenceScore: 0, flags: ["EmptyOverride"], rowNum, tokens: 0 };
            }
          }

          // Check cache
          if (domainCache.has(domainLower)) {
            const cachedResult = domainCache.get(domainLower);
            console.log(`Row ${rowNum}: Cache hit for ${domain}: name=${cachedResult.companyName}, score=${cachedResult.confidenceScore}`);
            return { ...cachedResult, domain, rowNum };
          }

          let finalResult;
          let tokensUsed = 0;
          let brandDetected = null;
          let cityDetected = null;

          // Extract brand and city for logging
          if (normalizedMatch) {
            brandDetected = normalizedMatch.brand;
            cityDetected = normalizedMatch.city;
          }

          // Primary humanizeName call with retries
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              finalResult = await humanizeName(domainLower, domainLower, false);
              tokensUsed = finalResult.tokens || 0;
              console.log(`Row ${rowNum}: humanizeName attempt ${attempt} success for ${domain}: name=${finalResult.name}, score=${finalResult.confidenceScore}`);
              break;
            } catch (err) {
              console.error(`Row ${rowNum}: humanizeName attempt ${attempt} failed for ${domain}: ${err.message}`);
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
            "NotPossessiveFriendly",
            "UnverifiedCity" // Added for consistency with batch-enrich-company-name-fallback.js
          ];
          const isAcceptable = finalResult.confidenceScore >= 75 && !finalResult.flags.some(f => criticalFlags.includes(f));

          if (isAcceptable) {
            domainCache.set(domainLower, {
              domain,
              companyName: finalResult.name,
              confidenceScore: finalResult.confidenceScore,
              flags: finalResult.flags
            });
            console.log(`Row ${rowNum}: Acceptable result for ${domain}: name=${finalResult.name}, score=${finalResult.confidenceScore}`);
            return { domain, companyName: finalResult.name, confidenceScore: finalResult.confidenceScore, flags: finalResult.flags, rowNum, tokens: tokensUsed };
          }

          // Fallback to API if needed
          if (finalResult.confidenceScore < 75 || finalResult.flags.some(f => forceReviewFlags.includes(f))) {
            const fallback = await callFallbackAPI(domain, rowNum);
            if (fallback.companyName && fallback.confidenceScore >= 75 && !fallback.flags.some(f => criticalFlags.includes(f))) {
              finalResult = { ...fallback, flags: [...(fallback.flags || []), "FallbackAPIUsed"], rowNum };
              tokensUsed += fallback.tokens || 0;
              console.log(`Row ${rowNum}: Fallback decision → name=${fallback.companyName}, score=${fallback.confidenceScore}, flags=${fallback.flags.join(", ")}`);
              console.log(`Row ${rowNum}: Fallback API used successfully: name=${finalResult.companyName}, score=${finalResult.confidenceScore}`);
            } else {
              finalResult.flags.push("FallbackAPIFailed");
              fallbackTriggers.push({ 
                domain, 
                rowNum,
                reason: "FallbackAPIFailed", 
                details: { 
                  score: fallback.confidenceScore, 
                  flags: fallback.flags, 
                  brand: brandDetected, 
                  city: cityDetected, 
                  gptUsed: fallback.flags.includes("GPTSpacingValidated") || fallback.flags.includes("OpenAICityValidated")
                }, 
                tokens: tokensUsed 
              });
              console.log(`Row ${rowNum}: Fallback decision → name=${fallback.companyName}, score=${fallback.confidenceScore}, flags=${fallback.flags.join(", ")}`);
              console.log(`Row ${rowNum}: Fallback API failed, using primary result: name=${finalResult.companyName}, score=${finalResult.confidenceScore}`);
            }
          }

          // Manual review for low-confidence or problematic results
          if (finalResult.confidenceScore < 75 || finalResult.flags.some(f => forceReviewFlags.includes(f))) {
            manualReviewQueue.push({
              domain,
              name: finalResult.companyName,
              confidenceScore: finalResult.confidenceScore,
              flags: finalResult.flags,
              rowNum
            });
            finalResult = {
              domain,
              companyName: finalResult.companyName || "",
              confidenceScore: Math.max(finalResult.confidenceScore, 60),
              flags: [...finalResult.flags, "LowConfidence"],
              rowNum
            };
            console.log(`Row ${rowNum}: Added to manual review: name=${finalResult.companyName}, score=${finalResult.confidenceScore}`);
          }

          domainCache.set(domainLower, {
            domain,
            companyName: finalResult.companyName,
            confidenceScore: finalResult.confidenceScore,
            flags: finalResult.flags
          });

          totalTokens += tokensUsed;
          return { ...finalResult, rowNum, tokens: tokensUsed };
        }))
      );

      successful.push(...chunkResults);
    }

    console.log(`Batch completed: ${successful.length} successful, ${manualReviewQueue.length} for review, ${totalTokens} tokens used, ${fallbackTriggers.length} fallback triggers`);
    return res.status(200).json({ successful, manualReviewQueue, totalTokens, fallbackTriggers, partial: false });
  } catch (err) {
    console.error(`Handler error: ${err.message}, Stack: ${err.stack}`);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}

/*
Manual Test for CarBrandOfCity Domains
Expected: All domains should resolve to Brand City without manual review or OpenAI fallback.
- "toyotaofslidell.net" → "Toyota Slidell" (confidence: 100, flags: ["CarBrandOfCityPattern", "BrandOfPatternMatched", "AutoPatternBypass"])
- "lexusofneworleans.com" → "Lexus New Orleans" (confidence: 100, flags: ["CarBrandOfCityPattern", "BrandOfPatternMatched", "AutoPatternBypass"])
- "cadillacoflasvegas.com" → "Cadillac Las Vegas" (confidence: 100, flags: ["CarBrandOfCityPattern", "BrandOfPatternMatched", "AutoPatternBypass"])
- "kiaoflagrange.com" → "Kia Lagrange" (confidence: 100, flags: ["CarBrandOfCityPattern", "BrandOfPatternMatched", "AutoPatternBypass"])
*/

export const config = { api: { bodyParser: false } };
