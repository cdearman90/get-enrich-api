// api/batch-enrich.js (Version 3.9 - Fully Patched and Optimized 2025-04-07)
// Updated to handle Vercel errors, align with humanize.js, accept 2-word fallbacks at 75+, and optimize for paid tier (18s timeout)

import { humanizeName, CAR_BRANDS, COMMON_WORDS, normalizeText, KNOWN_OVERRIDES } from "./lib/humanize.js";
import { callOpenAI } from "./lib/openai.js"; // Required for GPT fallback

const VERCEL_API_BASE_URL = "https://get-enrich-api-git-main-show-revv.vercel.app";
const VERCEL_API_ENRICH_FALLBACK_URL = `${VERCEL_API_BASE_URL}/api/batch-enrich-company-name-fallback`;

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

// HTML metadata fetch
const fetchWebsiteMetadata = async (domain) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
    const response = await fetch(`https://${domain}`, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const html = await response.text();
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    return { title: titleMatch?.[1] || "", description: metaMatch?.[1] || "", redirectedDomain: response.url, html };
  } catch (err) {
    console.error(`Metadata fetch failed for ${domain}: ${err.message}, Stack: ${err.stack}`);
    return { title: "", description: "", redirectedDomain: domain, error: err.message };
  }
};

// Logo alt text extraction
const extractLogoText = async (domain, html) => {
  try {
    if (!html) return "No logo text available";
    const logoMatch = html.match(/<img[^>]+class=["']logo["'][^>]+src=["']([^"']+)["']/i);
    if (!logoMatch) return "No logo text available";
    const altMatch = html.match(/<img[^>]+class=["']logo["'][^>]+alt=["']([^"']+)["']/i);
    let logoText = altMatch?.[1] || logoMatch[1].split('/').pop().replace(/[-_]/g, " ").replace(/\.(png|jpg|jpeg|gif)$/i, "").trim();
    for (let brand of CAR_BRANDS) logoText = logoText.toLowerCase().replace(brand, "").trim();
    return logoText || "No logo text available";
  } catch (err) {
    console.error(`Logo extraction failed for ${domain}: ${err.message}, Stack: ${err.stack}`);
    return "No logo text available";
  }
};

// Safe POST fallback endpoint with retry
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
      return result.results[0] || { name: "", confidenceScore: 0, flags: ["FallbackAPIFailed"] };
    } catch (err) {
      console.error(`Fallback API attempt ${attempt} failed for ${domain}: ${err.message}, Stack: ${err.stack}`);
      if (attempt === 2) {
        // Local fallback if API fails
        const localResult = await humanizeName(domain, domain, false);
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
  console.log("batch-enrich.js Version 3.9 - Fully Patched and Optimized 2025-04-07");

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
    const limit = pLimit(1); // Kept at 1 for stability
    const results = [];
    const manualReviewQueue = [];
    let totalTokens = 0;
    const fallbackTriggers = [];

    const BATCH_SIZE = 5; // Aligned with system overview
    const leadChunks = Array.from({ length: Math.ceil(leads.length / BATCH_SIZE) }, (_, i) =>
      leads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    for (const chunk of leadChunks) {
      if (Date.now() - startTime > 18000) { // 18s timeout for paid tier
        console.log("Partial response due to timeout");
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
            return {
              name: KNOWN_OVERRIDES[matchedOverrideDomain],
              confidenceScore: 100,
              flags: ["FuzzyOverrideMatched"],
              rowNum,
              tokens: 0
            };
          }

          if (domainCache.has(domain)) return { ...domainCache.get(domain), rowNum };

          let finalResult;
          let tokensUsed = 0;

          // Primary humanizeName call with retries
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              finalResult = await humanizeName(domain, domain, false);
              console.log(`humanizeName output for ${domain}: ${JSON.stringify(finalResult)}`);
              tokensUsed = finalResult.tokens || 0;
              break;
            } catch (err) {
              console.error(`humanizeName attempt ${attempt} failed for ${domain}: ${err.message}, Stack: ${err.stack}`);
              if (attempt === 2) {
                finalResult = { name: "", confidenceScore: 0, flags: ["HumanizeError"], tokens: 0 };
              }
              await new Promise(res => setTimeout(res, 500));
            }
          }

          // Skip further fallbacks if score is high enough
          const forceReviewFlags = [
            "TooGeneric",
            "CityNameOnly",
            "PossibleAbbreviation",
            "BadPrefixOf",
            "CarBrandSuffixRemaining",
            "FuzzyCityMatch",
            "NotPossessiveFriendly"
          ];
          if (finalResult.confidenceScore >= 75 && !finalResult.flags.some(f => ["TooGeneric", "CityNameOnly"].includes(f))) {
            domainCache.set(domain, finalResult);
            return { ...finalResult, rowNum, tokens: tokensUsed };
          }

          // Fallback to API if needed
          if (finalResult.confidenceScore < 75 || finalResult.flags.some(f => forceReviewFlags.includes(f))) {
            const fallback = await callFallbackAPI(domain, rowNum);
            if (fallback.name && fallback.confidenceScore >= 75) {
              finalResult = { ...fallback, flags: [...(fallback.flags || []), "FallbackAPIUsed"], rowNum };
              console.log(`Row ${rowNum}: Fallback API successful: ${JSON.stringify(finalResult)}`);
            } else {
              finalResult.flags.push("FallbackAPIFailed");
              fallbackTriggers.push({ domain, reason: "FallbackAPIFailed" });
            }
          }

          // Add to manual review if still low
          if (finalResult.confidenceScore < 75 || finalResult.flags.some(f => ["TooGeneric", "CityNameOnly"].includes(f))) {
            manualReviewQueue.push({ domain, name: finalResult.name, confidenceScore: finalResult.confidenceScore, flags: finalResult.flags, rowNum });
            finalResult = { name: finalResult.name || "", confidenceScore: Math.max(finalResult.confidenceScore, 60), flags: [...finalResult.flags, "LowConfidence"], rowNum };
          }

          domainCache.set(domain, {
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

    return res.status(200).json({ results, manualReviewQueue, totalTokens, fallbackTriggers, partial: false });
  } catch (err) {
    console.error(`Handler error: ${err.message}, Stack: ${err.stack}`);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}

export const config = { api: { bodyParser: false } };
