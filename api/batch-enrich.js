// api/batch-enrich.js (Version 4.1.11 - Updated 2025-04-14)
// Changes:
// - Increased concurrency limit to pLimit(5) for better throughput
// - Added configurable FALLBACK_API_TIMEOUT_MS (default 6 seconds)
// - Enhanced fallbackTriggers logging to include primary humanizeName result
// - Added attempt number to Fallback API success logs
// - Added "Processing Started" logs for each domain

// api/batch-enrich.js
import { 
  humanizeName, 
  CAR_BRANDS, 
  normalizeText, 
  KNOWN_PROPER_NOUNS, 
  KNOWN_CITIES_SET, 
  extractBrandOfCityFromDomain, 
  applyCityShortName, 
  earlyCompoundSplit 
} from "./lib/humanize.js";
import { callOpenAI } from "./lib/openai.js";

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

// Safe POST fallback endpoint with retry
const VERCEL_API_BASE_URL = "https://get-enrich-api-git-main-show-revv.vercel.app";
const VERCEL_API_ENRICH_FALLBACK_URL = `${VERCEL_API_BASE_URL}/api/batch-enrich-company-name-fallback`;
const FALLBACK_API_TIMEOUT_MS = parseInt(process.env.FALLBACK_API_TIMEOUT_MS, 10) || 6000; // Default to 6 seconds

const callWithRetries = async (fn, retries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      return { result, attempt };
    } catch (err) {
      if (attempt === retries) throw err;
      console.error(`Attempt ${attempt} failed: ${err.message}`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

const callFallbackAPI = async (domain, rowNum) => {
  try {
    const fn = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FALLBACK_API_TIMEOUT_MS);
      try {
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
        if (!Array.isArray(result.successful) || !result.successful[0]) {
          throw new Error(`Invalid fallback API response format: ${text}`);
        }
        const fallbackResult = result.successful[0];
        const validatedResult = {
          domain: fallbackResult.domain || domain,
          companyName: typeof fallbackResult.companyName === "string" ? fallbackResult.companyName : "",
          confidenceScore: typeof fallbackResult.confidenceScore === "number" ? fallbackResult.confidenceScore : 0,
          flags: Array.isArray(fallbackResult.flags) ? fallbackResult.flags : ["InvalidFallbackResponse"],
          tokens: typeof fallbackResult.tokens === "number" ? fallbackResult.tokens : 0
        };
        return validatedResult;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };
    const { result, attempt } = await callWithRetries(fn);
    console.log(`Fallback API success for ${domain} (row ${rowNum}) after attempt ${attempt}: name=${result.companyName}, score=${result.confidenceScore}`);
    return { ...result, rowNum };
  } catch (err) {
    const localResult = await humanizeName(domain, domain, false, true);
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
};

// Stream to string helper with timeout (rewritten for Vercel compatibility)
const streamToString = async (req) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const timeout = setTimeout(() => {
      reject(new Error("Stream read timeout"));
    }, 5000); // 5s timeout

    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      clearTimeout(timeout);
      const buffer = Buffer.concat(chunks);
      resolve(buffer.toString('utf-8'));
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
};

// Entry point
export default async function handler(req, res) {
  console.log("batch-enrich.js Version 4.1.11 - Updated 2025-04-14");

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

    const leads = body.leads || body.leadList || body.domains;
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      console.error("Invalid or empty leads array");
      return res.status(400).json({ error: "Invalid or empty leads array" });
    }

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
    const limit = pLimit(5); // Increased concurrency to 5
    const successful = [];
    const manualReviewQueue = [];
    let totalTokens = 0;
    const fallbackTriggers = [];

    const BATCH_SIZE = 5;
    const leadChunks = Array.from({ length: Math.ceil(validatedLeads.length / BATCH_SIZE) }, (_, i) =>
      validatedLeads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    for (const chunk of leadChunks) {
      if (Date.now() - startTime > 18000) {
        console.log("Partial response due to timeout after 18s");
        return res.status(200).json({ successful, manualReviewQueue, totalTokens, fallbackTriggers, partial: true });
      }

      const chunkResults = await Promise.all(
        chunk.map(lead => limit(async () => {
          const { domain, rowNum } = lead;

          console.info(`Row ${rowNum}: Processing ${domain}: Started`);

          if (Date.now() - startTime > 18000) {
            console.log(`Row ${rowNum}: Skipped due to overall timeout`);
            return { domain, companyName: "", confidenceScore: 0, flags: ["SkippedDueToTimeout"], rowNum, tokens: 0 };
          }

          const domainLower = domain.toLowerCase();

          if (domainCache.has(domainLower)) {
            const cachedResult = domainCache.get(domainLower);
            console.log(`Row ${rowNum}: Cache hit for ${domain}: name=${cachedResult.companyName}, score=${cachedResult.confidenceScore}`);
            return { ...cachedResult, domain, rowNum };
          }

          let finalResult;
          let tokensUsed = 0;
          const normalizedMatch = extractBrandOfCityFromDomain(domainLower);
          const brandDetected = normalizedMatch?.brand || null;
          const cityDetected = normalizedMatch?.city || null;

          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              finalResult = await humanizeName(domainLower, domainLower, false, true);
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

          const criticalFlags = ["TooGeneric", "CityNameOnly", "Skipped", "FallbackFailed", "PossibleAbbreviation"];
          const forceReviewFlags = [
            "TooGeneric", "CityNameOnly", "PossibleAbbreviation", "BadPrefixOf", "CarBrandSuffixRemaining",
            "FuzzyCityMatch", "NotPossessiveFriendly", "UnverifiedCity"
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
          } else {
            const primaryResult = { ...finalResult };
            const fallback = await callFallbackAPI(domain, rowNum);
            if (fallback.companyName && fallback.confidenceScore >= 75 && !fallback.flags.some(f => criticalFlags.includes(f))) {
              finalResult = { ...fallback, flags: [...(fallback.flags || []), "FallbackAPIUsed"], rowNum };
              tokensUsed += fallback.tokens || 0;
              console.log(`Row ${rowNum}: Fallback API used successfully: name=${finalResult.companyName}, score=${finalResult.confidenceScore}`);
            } else {
              finalResult.flags.push("FallbackAPIFailed");
              fallbackTriggers.push({ 
                domain, 
                rowNum,
                reason: "FallbackAPIFailed", 
                details: { 
                  primaryResult: {
                    name: primaryResult.name,
                    confidenceScore: primaryResult.confidenceScore,
                    flags: primaryResult.flags
                  },
                  score: fallback.confidenceScore, 
                  flags: fallback.flags, 
                  brand: brandDetected, 
                  city: cityDetected, 
                  gptUsed: fallback.flags.includes("GPTSpacingValidated") || fallback.flags.includes("OpenAICityValidated")
                }, 
                tokens: tokensUsed 
              });
              console.log(`Row ${rowNum}: Fallback API failed, using primary result: name=${finalResult.companyName}, score=${finalResult.confidenceScore}`);
            }
          }

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
              confidenceScore: Math.max(finalResult.confidenceScore, 50),
              flags: [...finalResult.flags, "LowConfidence"],
              rowNum
            };
            console.log(`Row ${rowNum}: Added to manual review: name=${finalResult.companyName}, score=${finalResult.confidenceScore}`);
          }

          // Check for unreadable initials (e.g., "LV BA")
          if (process.env.OPENAI_API_KEY && finalResult.companyName.split(" ").every(w => /^[A-Z]{1,3}$/.test(w))) {
            const prompt = `Is "${finalResult.companyName}" readable and natural as a company name in "{Company}'s CRM isn't broken—it’s bleeding"? Respond with {"isReadable": true/false, "isConfident": true/false}`;
            const response = await callOpenAI({ prompt, maxTokens: 40 });
            tokensUsed += response.tokens || 0;
            const parsed = typeof response.text === "string" ? JSON.parse(response.text) : { isReadable: true, isConfident: false };
            if (!parsed.isReadable && parsed.isConfident) {
              const fullCity = cityDetected ? applyCityShortName(cityDetected) : finalResult.companyName.split(" ")[0];
              finalResult.companyName = `${fullCity} ${brandDetected || finalResult.companyName.split(" ")[1] || "Auto"}`;
              finalResult.flags.push("InitialsExpanded");
              finalResult.confidenceScore -= 5;
              console.log(`Row ${rowNum}: Expanded unreadable initials: ${finalResult.companyName}`);
            }
          }

          domainCache.set(domainLower, {
            domain,
            companyName: finalResult.companyName,
            confidenceScore: finalResult.confidenceScore,
            flags: finalResult.flags
          });

          totalTokens += tokensUsed;
          return {
            domain,
            companyName: finalResult.companyName,
            confidenceScore: finalResult.confidenceScore,
            flags: finalResult.flags,
            rowNum,
            tokens: tokensUsed
          };
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
Expected: All domains resolve with short names where applicable, relying on pattern matching.
- "toyotaofslidell.net" → "Slidell Toyota" (confidence: 100, flags: ["PatternMatched", "CarBrandOfCityPattern"])
- "lexusofneworleans.com" → "N.O. Lexus" (confidence: 100, flags: ["PatternMatched", "CarBrandOfCityPattern"])
- "cadillacoflasvegas.com" → "Vegas Cadillac" (confidence: 100, flags: ["PatternMatched", "CarBrandOfCityPattern"])
- "kiaoflagrange.com" → "Lagrange Kia" (confidence: 100, flags: ["PatternMatched", "CarBrandOfCityPattern"])
*/

export const config = { api: { bodyParser: false } };
