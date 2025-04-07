// api/batch-enrich.js (Version 3.4.8 - Optimized 2025-04-10)
import { humanizeName, CAR_BRANDS, COMMON_WORDS, normalizeText, KNOWN_OVERRIDES } from "./lib/humanize.js";
import { callOpenAI } from "./lib/openai.js"; // Import centralized callOpenAI

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

const fetchWebsiteMetadata = async (domain) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
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
    console.error(`Metadata fetch failed for ${domain}: ${err.message}`);
    return { title: "", description: "", redirectedDomain: domain, error: err.message };
  }
};

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
    console.error(`Logo extraction failed for ${domain}: ${err.message}`);
    return "No logo text available";
  }
};

const callFallbackAPI = async (domain, rowNum) => {
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
    console.error(`Fallback API error for ${domain}: ${err.message}, Stack: ${err.stack}`);
    return { name: "", confidenceScore: 0, flags: ["FallbackAPIFailed"], error: err.message };
  }
};

export default async function handler(req, res) {
  console.log("batch-enrich.js Version 3.4.8 - Optimized 2025-04-10");
  try {
    let leads;
    try {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      leads = JSON.parse(Buffer.concat(buffers).toString("utf-8"));
    } catch (err) {
      console.error(`JSON parse error: ${err.message}, Stack: ${err.stack}`);
      return res.status(400).json({ error: "Invalid JSON", details: err.message });
    }

    if (!Array.isArray(leads) || leads.length === 0) {
      console.error("Missing or invalid lead list");
      return res.status(400).json({ error: "Missing or invalid lead list" });
    }

    const startTime = Date.now();
    const limit = pLimit(2);
    const results = [];
    const manualReviewQueue = [];
    let totalTokens = 0;
    const fallbackTriggers = [];

    const BATCH_SIZE = 3;
    const leadChunks = Array.from({ length: Math.ceil(leads.length / BATCH_SIZE) }, (_, i) =>
      leads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    for (const chunk of leadChunks) {
      if (Date.now() - startTime > 9000) {
        console.log("Partial response due to timeout");
        return res.status(200).json({ results, manualReviewQueue, totalTokens, fallbackTriggers, partial: true });
      }

      const chunkResults = await Promise.all(
        chunk.map(lead => limit(async () => {
          const { domain, rowNum } = lead;
          if (!domain) {
            console.error(`Row ${rowNum}: Missing domain`);
            return { name: "", confidenceScore: 0, flags: ["MissingDomain"], rowNum };
          }

          const domainLower = domain.toLowerCase();
          if (KNOWN_OVERRIDES[domainLower]) {
            return { name: KNOWN_OVERRIDES[domainLower], confidenceScore: 100, flags: ["OverrideApplied"], rowNum, tokens: 0 };
          }

          if (domainCache.has(domain)) {
            console.log(`Row ${rowNum}: Cache hit for ${domain}`);
            return { ...domainCache.get(domain), rowNum };
          }

          let finalResult;
          try {
  finalResult = await humanizeName(domain, domain, false);
} catch (err) {
  console.error(`humanizeName failed for ${domain}: ${err.message}, Stack: ${err.stack}`);
  finalResult = { name: "", confidenceScore: 0, flags: ["HumanizeError"], tokens: 0 };
}
          let tokensUsed = finalResult.tokens || 0;

          // Fallback to OpenAI if humanizeName returns no name or low confidence
          if (!finalResult.name || finalResult.confidenceScore < 60) {
            let gptResult;
            try {
              const prompt = `Domain: ${domain}, extract dealership name. Format response as ##Name: [Dealership Name]`;
              gptResult = await callOpenAI(prompt, {
                systemMessage: "You are a helpful assistant that extracts dealership names.",
                max_tokens: 50,
                temperature: 0.2,
              });
              const match = gptResult.match(/##Name:\s*([^\n\r]+)/);
              gptResult = match?.[1]?.trim() || "";
            } catch (err) {
              console.error(`OpenAI error for ${domain}: ${err.message}, Stack: ${err.stack}`);
              gptResult = null;
              finalResult.flags.push("GPTFailed");
              fallbackTriggers.push({ domain, reason: "GPTFailed", error: err.message });
            }
           tokensUsed += Math.ceil(prompt.length / 4);
           totalTokens += Math.ceil(prompt.length / 4);
           if (gptResult) {
            finalResult = await humanizeName(gptResult, domain, false, true); // Skip OpenAI in humanize.js
            finalResult.flags.push("GPTFallbackUsed");
          }
        }

          // Score CarBrandCityException properly
          if (Array.isArray(finalResult.flags) && finalResult.flags.includes("CarBrandCityException")) {
            finalResult.confidenceScore = 100;
            finalResult.flags = [...new Set([...finalResult.flags, "Scored100FromPattern"])];
          }

          // Force review for problematic flags
          const forceReviewFlags = ["TooGeneric", "CityNameOnly", "PossibleAbbreviation", "BadPrefixOf", "CarBrandSuffixRemaining"];
          if (finalResult.confidenceScore < 60 || finalResult.flags.some(f => forceReviewFlags.includes(f))) {
            const metadata = await fetchWebsiteMetadata(domain);
            const logoText = await extractLogoText(domain, metadata.html);
            const prompt = `Domain: ${domain}, Redirected: ${metadata.redirectedDomain}, Title: ${metadata.title}, Description: ${metadata.description}, Logo: ${logoText}. Extract the dealership name. Format response as ##Name: [Dealership Name]`;
            let metaResult;
            for (let attempt = 1; attempt <= 2; attempt++) {
              try {
                metaResult = await callOpenAI(prompt, {
                  systemMessage: "You are a helpful assistant that extracts dealership names.",
                  max_tokens: 50,
                  temperature: 0.2,
                });
                const match = metaResult.match(/##Name:\s*([^\n\r]+)/);
                metaResult = match?.[1]?.trim() || "";
                break;
              } catch (err) {
                console.error(`OpenAI meta error for ${domain} (attempt ${attempt}): ${err.message}, Stack: ${err.stack}`);
                if (attempt === 2) {
                  metaResult = null;
                  break;
                }
                await new Promise(res => setTimeout(res, 500));
              }
            }
            tokensUsed += Math.ceil(prompt.length / 4);
            totalTokens += Math.ceil(prompt.length / 4);
            if (metaResult && metaResult !== finalResult.name) {
              finalResult = await humanizeName(metaResult, domain, false, true); // Skip OpenAI in humanize.js
              finalResult.flags.push("MetaFallbackUsed");
            } else {
              finalResult.flags.push("MetaFallbackFailed");
              fallbackTriggers.push({ domain, reason: "MetaFallbackFailed" });
            }
          }

          // Additional fallback to /api/batch-enrich-company-name-fallback
          if (finalResult.confidenceScore < 60 || finalResult.flags.some(f => forceReviewFlags.includes(f))) {
            const fallbackResult = await callFallbackAPI(domain, rowNum);
            if (fallbackResult.name && fallbackResult.confidenceScore >= 80) {
              finalResult = { ...fallbackResult, flags: [...(fallbackResult.flags || []), "FallbackAPIUsed"], rowNum };
            } else {
              finalResult.flags.push("FallbackAPIFailed");
              fallbackTriggers.push({ domain, reason: "FallbackAPIFailed" });
            }
          }

          // Final review check
          if (finalResult.confidenceScore < 50 || finalResult.flags.some(f => forceReviewFlags.includes(f))) {
            manualReviewQueue.push({
              domain,
              name: finalResult.name,
              confidenceScore: finalResult.confidenceScore,
              flags: finalResult.flags,
              rowNum
            });
            finalResult = {
              name: finalResult.name || "",
              confidenceScore: Math.max(finalResult.confidenceScore, 50),
              flags: [...finalResult.flags, "LowConfidence"],
              rowNum
            };
          }

          domainCache.set(domain, {
            name: finalResult.name,
            confidenceScore: finalResult.confidenceScore,
            flags: finalResult.flags
          });
          console.log(`Row ${rowNum}: ${JSON.stringify(finalResult)}`);
          return { ...finalResult, rowNum, tokens: tokensUsed };
        }))
      );

      if (!results) throw new Error('Results array is undefined');
      results.push(...chunkResults);
    }

    console.log(`Completed: ${results.length} results, ${manualReviewQueue.length} for review`);
    return res.status(200).json({ results, manualReviewQueue, totalTokens, fallbackTriggers, partial: false });
  } catch (err) {
    console.error(`Handler error: ${err.message}, Stack: ${err.stack}`);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}

export const config = { api: { bodyParser: false } };
