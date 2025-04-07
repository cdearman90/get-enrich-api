// api/batch-enrich.js (Version 3.6 - Fully Patched and Optimized)
// Updated to optimize for timeouts, enhance retry logic, align with humanize.js updates, and improve error handling

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
    console.error(`Error fuzzy matching domain ${inputDomain}: ${err.message}`);
    return null;
  }
};

// HTML metadata fetch
const fetchWebsiteMetadata = async (domain) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout for reliability
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
  for (let attempt = 1; attempt <= 3; attempt++) { // Increased retries to 3
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(VERCEL_API_ENRICH_FALLBACK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ domain, rowNum }]),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const result = await response.json();
      if (!response.ok) throw new Error(`Fallback API HTTP ${response.status}: ${result.error || "Unknown error"}`);
      return result.results[0] || { name: "", confidenceScore: 0, flags: ["FallbackAPIFailed"] };
    } catch (err) {
      console.error(`Fallback API attempt ${attempt} failed for ${domain}: ${err.message}, Stack: ${err.stack}`);
      if (attempt === 3) {
        return { name: "", confidenceScore: 0, flags: ["FallbackAPIFailed"], error: err.message };
      }
      await new Promise(res => setTimeout(res, 1000)); // Increased delay to 1s between retries
    }
  }
};

// Stream to string helper for Vercel
const streamToString = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
};

// Entry point
export default async function handler(req, res) {
  console.log("batch-enrich.js Version 3.6 - Fully Patched and Optimized");

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
    const limit = pLimit(1); // Kept at 1 to minimize timeout risk
    const results = [];
    const manualReviewQueue = [];
    let totalTokens = 0;
    const fallbackTriggers = [];

    const BATCH_SIZE = 3; // 
    const leadChunks = Array.from({ length: Math.ceil(leads.length / BATCH_SIZE) }, (_, i) =>
      leads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    for (const chunk of leadChunks) {
      if (Date.now() - startTime > 8000) {
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

          try {
            finalResult = await humanizeName(domain, domain, false);
            tokensUsed = finalResult.tokens || 0;
          } catch (err) {
            console.error(`humanizeName failed for ${domain}: ${err.message}, Stack: ${err.stack}`);
            finalResult = { name: "", confidenceScore: 0, flags: ["HumanizeError"], tokens: 0 };
          }

          // Skip GPT fallback if humanizeName score is high enough
          if (finalResult.confidenceScore >= 80 && !finalResult.flags.some(f => ["TooGeneric", "CityNameOnly"].includes(f))) {
            domainCache.set(domain, finalResult);
            return { ...finalResult, rowNum, tokens: tokensUsed };
          }

          // Fallback to GPT-4 if needed
          if (!finalResult.name || finalResult.confidenceScore < 60) {
            for (let attempt = 1; attempt <= 2; attempt++) {
              try {
                const prompt = `Domain: ${domain}, extract dealership name. Format response as ##Name: [Dealership Name]`;
                const gptRaw = await callOpenAI(prompt, {
                  systemMessage: "You are a helpful assistant that extracts dealership names.",
                  max_tokens: 50,
                  temperature: 0.2,
                });
                const match = gptRaw?.match(/##Name:\s*(.+)/);
                const gptName = match?.[1]?.trim();
                tokensUsed += Math.ceil(prompt.length / 4);
                totalTokens += Math.ceil(prompt.length / 4);
                if (gptName) {
                  finalResult = await humanizeName(gptName, domain, false, true);
                  finalResult.flags.push("GPTFallbackUsed");
                  console.log(`Row ${rowNum}: GPT fallback successful`);
                  break;
                }
              } catch (err) {
                console.error(`GPT fallback attempt ${attempt} failed for ${domain}: ${err.message}, Stack: ${err.stack}`);
                if (attempt === 2) {
                  finalResult.flags.push("GPTFailed");
                  fallbackTriggers.push({ domain, reason: "GPTFailed", error: err.message });
                }
                await new Promise(res => setTimeout(res, 500));
              }
            }
          }

          // Metadata fallback if flagged
          const forceReviewFlags = [
            "TooGeneric",
            "CityNameOnly",
            "PossibleAbbreviation",
            "BadPrefixOf",
            "CarBrandSuffixRemaining",
            "FuzzyCityMatch",
            "NotPossessiveFriendly"
          ];
          if (finalResult.confidenceScore < 60 || finalResult.flags.some(f => forceReviewFlags.includes(f))) {
            const meta = await fetchWebsiteMetadata(domain);
            const logoText = await extractLogoText(domain, meta.html);
            const prompt = `Domain: ${domain}, Redirected: ${meta.redirectedDomain}, Title: ${meta.title}, Description: ${meta.description}, Logo: ${logoText}. Extract the dealership name. Format response as ##Name: [Dealership Name]`;

            for (let attempt = 1; attempt <= 2; attempt++) {
              try {
                const metaRaw = await callOpenAI(prompt, {
                  systemMessage: "You are a helpful assistant that extracts dealership names.",
                  max_tokens: 50,
                  temperature: 0.2,
                });
                const match = metaRaw?.match(/##Name:\s*(.+)/);
                const metaName = match?.[1]?.trim();
                tokensUsed += Math.ceil(prompt.length / 4);
                totalTokens += Math.ceil(prompt.length / 4);
                if (metaName && metaName !== finalResult.name) {
                  finalResult = await humanizeName(metaName, domain, false, true);
                  finalResult.flags.push("MetaFallbackUsed");
                  console.log(`Row ${rowNum}: Metadata fallback successful`);
                  break;
                }
              } catch (err) {
                console.error(`Metadata fallback attempt ${attempt} failed for ${domain}: ${err.message}, Stack: ${err.stack}`);
                if (attempt === 2) {
                  finalResult.flags.push("MetaFallbackFailed");
                  fallbackTriggers.push({ domain, reason: "MetaFallbackFailed", error: err.message });
                }
                await new Promise(res => setTimeout(res, 500));
              }
            }
          }

          // Final fallback to local API
          if (finalResult.confidenceScore < 60 || finalResult.flags.some(f => forceReviewFlags.includes(f))) {
            const fallback = await callFallbackAPI(domain, rowNum);
            if (fallback.name && fallback.confidenceScore >= 80) {
              finalResult = { ...fallback, flags: [...(fallback.flags || []), "FallbackAPIUsed"], rowNum };
              console.log(`Row ${rowNum}: Fallback API successful`);
            } else {
              finalResult.flags.push("FallbackAPIFailed");
              fallbackTriggers.push({ domain, reason: "FallbackAPIFailed" });
            }
          }

          // Add to manual review if still low
          if (finalResult.confidenceScore < 50 || finalResult.flags.some(f => forceReviewFlags.includes(f))) {
            manualReviewQueue.push({ domain, name: finalResult.name, confidenceScore: finalResult.confidenceScore, flags: finalResult.flags, rowNum });
            finalResult = { name: finalResult.name || "", confidenceScore: Math.max(finalResult.confidenceScore, 50), flags: [...finalResult.flags, "LowConfidence"], rowNum };
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
    }

    return res.status(200).json({ results, manualReviewQueue, totalTokens, fallbackTriggers, partial: false });
  } catch (err) {
    console.error(`Handler error: ${err.message}, Stack: ${err.stack}`);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}

export const config = { api: { bodyParser: false } };
