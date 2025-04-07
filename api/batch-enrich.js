// api/batch-enrich.js (Version 4.0 - Fully Patched and Optimized 2025-04-07)
// Updated to fix Vercel errors, align with humanize.js and Google Apps Script, 
// accept 2-word fallbacks at 75+, remove redundant metadata fetches, and enhance logging

import { humanizeName, CAR_BRANDS, COMMON_WORDS, normalizeText, KNOWN_OVERRIDES } from "./lib/humanize.js";

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
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s per retry
      const response = await fetch(VERCEL_API_ENRICH_FALLBACK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ domain, rowNum }]),
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
      if (attempt === 2) {
        const localResult = await humanizeName(domain, domain, false);
        console.log(`Local fallback for ${domain} after API failure: ${JSON.stringify(localResult)}`);
        return { ...localResult, flags: [...localResult.flags, "FallbackAPIFailed", "LocalFallbackUsed"], error: err.message };
      }
      await new Promise(res => setTimeout(res, 1000));
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
  console.log("batch-enrich.js Version 4.0 - Fully Patched and Optimized 2025-04-07");

  try {
    let leads;
    try {
      const rawBody = await streamToString(req);
      leads = JSON.parse(rawBody);
    } catch (err) {
      console.error(`JSON parse error: ${err.message}, Stack: ${err.stack}`);
      return res.status(400).json({ error: "Invalid JSON", details: err.message });
    }

    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: "Missing or invalid lead list" });
    }

    const startTime = Date.now();
    const limit = pLimit(1); // Conservative concurrency for stability
    const results = [];
    const manualReviewQueue = [];
    let totalTokens = 0;
    const fallbackTriggers = [];

    const BATCH_SIZE = 5; // Matches system overview and Google Apps Script
    const leadChunks = Array.from({ length: Math.ceil(leads.length / BATCH_SIZE) }, (_, i) =>
      leads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    for (const chunk of leadChunks) {
      if (Date.now() - startTime > 18000) { // 18s timeout for Vercel paid tier
        console.log("Partial response due to timeout after 18s");
        return res.status(200).json({ results, manualReviewQueue, totalTokens, fallbackTriggers, partial: true });
      }

      const chunkResults = await Promise.all(
        chunk.map(lead => limit(async () => {
          const { domain, rowNum } = lead;
          if (!domain) return { name: "", confidenceScore: 0, flags: ["MissingDomain"], rowNum, tokens: 0 };

          const domainLower = domain.toLowerCase();

          // Fuzzy override matching
          const matchedOverrideDomain = fuzzyMatchDomain(domainLower, Object.keys(KNOWN_OVERRIDES));
          if (matchedOverrideDomain) {
            console.log(`Fuzzy override match for ${domain}: ${KNOWN_OVERRIDES[matchedOverrideDomain]}`);
            return {
              name: KNOWN_OVERRIDES[matchedOverrideDomain],
              confidenceScore: 100,
              flags: ["FuzzyOverrideMatched"],
              rowNum,
              tokens: 0
            };
          }

          if (domainCache.has(domainLower)) {
            console.log(`Cache hit for ${domain}: ${JSON.stringify(domainCache.get(domainLower))}`);
            return { ...domainCache.get(domainLower), rowNum };
          }

          let finalResult;
          let tokensUsed = 0;

          // Primary humanizeName call with retries
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              finalResult = await humanizeName(domain, domain, false);
              tokensUsed = finalResult.tokens || 0;
              console.log(`humanizeName attempt ${attempt} success for ${domain}: ${JSON.stringify(finalResult)}`);
              break;
            } catch (err) {
              console.error(`humanizeName attempt ${attempt} failed for ${domain}: ${err.message}, Stack: ${err.stack}`);
              if (attempt === 2) {
                finalResult = { name: "", confidenceScore: 0, flags: ["HumanizeError"], tokens: 0 };
              }
              await new Promise(res => setTimeout(res, 500));
            }
          }

          // Align acceptability with Google Apps Script
          const forceReviewFlags = [
            "TooGeneric",
            "CityNameOnly",
            "PossibleAbbreviation",
            "BadPrefixOf",
            "CarBrandSuffixRemaining",
            "FuzzyCityMatch",
            "NotPossessiveFriendly"
          ];
          if (finalResult.confidenceScore >= 75 && !finalResult.flags.some(f => ["TooGeneric", "CityNameOnly", "PossibleAbbreviation"].includes(f))) {
            domainCache.set(domainLower, finalResult);
            console.log(`Acceptable result for ${domain}: ${JSON.stringify(finalResult)}`);
            return { ...finalResult, rowNum, tokens: tokensUsed };
          }

          // Fallback to API if needed
          if (finalResult.confidenceScore < 75 || finalResult.flags.some(f => forceReviewFlags.includes(f))) {
            const fallback = await callFallbackAPI(domain, rowNum);
            if (fallback.name && fallback.confidenceScore >= 75 && !fallback.flags.some(f => ["TooGeneric", "CityNameOnly", "PossibleAbbreviation"].includes(f))) {
              finalResult = { ...fallback, flags: [...(fallback.flags || []), "FallbackAPIUsed"], rowNum };
              console.log(`Row ${rowNum}: Fallback API used successfully: ${JSON.stringify(finalResult)}`);
            } else {
              finalResult.flags.push("FallbackAPIFailed");
              fallbackTriggers.push({ domain, reason: "FallbackAPIFailed", details: `Score: ${fallback.confidenceScore}, Flags: ${fallback.flags.join(", ")}` });
              console.log(`Row ${rowNum}: Fallback API failed, using primary result: ${JSON.stringify(finalResult)}`);
            }
          }

          // Manual review for low-confidence or problematic results
          if (finalResult.confidenceScore < 75 || finalResult.flags.some(f => ["TooGeneric", "CityNameOnly", "PossibleAbbreviation"].includes(f))) {
            manualReviewQueue.push({ domain, name: finalResult.name, confidenceScore: finalResult.confidenceScore, flags: finalResult.flags, rowNum });
            finalResult = { name: finalResult.name || "", confidenceScore: Math.max(finalResult.confidenceScore, 60), flags: [...finalResult.flags, "LowConfidence"], rowNum };
            console.log(`Row ${rowNum}: Added to manual review: ${JSON.stringify(finalResult)}`);
          }

          domainCache.set(domainLower, {
            name: finalResult.name,
            confidenceScore: finalResult.confidenceScore,
            flags: finalResult.flags
          });

          return { ...finalResult, rowNum, tokens: tokensUsed };
        }))
      );

      results.push(...chunkResults);
      totalTokens += chunkResults.reduce((sum, r) => sum + (r.tokens || 0), 0);
    }

    console.log(`Batch completed: ${results.length} results, ${manualReviewQueue.length} for review, ${totalTokens} tokens used`);
    return res.status(200).json({ results, manualReviewQueue, totalTokens, fallbackTriggers, partial: false });
  } catch (err) {
    console.error(`Handler error: ${err.message}, Stack: ${err.stack}`);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}

export const config = { api: { bodyParser: false } };
