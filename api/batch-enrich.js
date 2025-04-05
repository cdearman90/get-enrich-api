// api/batch-enrich.js (Version 3.4.5 - Optimized 2025-04-08)
import { humanizeName, CAR_BRANDS, COMMON_WORDS, normalizeText } from "./lib/humanize.js";

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

// Cache and library
const domainCache = new Map();
const KNOWN_NAMES = new Map([
  ["patmillikenford.com", { name: "Pat Milliken", confidenceScore: 100 }],
  ["duvalauto.com", { name: "Duval", confidenceScore: 100 }],
  ["karlchevroletstuart.com", { name: "Karl Stuart", confidenceScore: 100 }],
  ["gychevy.com", { name: "Gregg Young", confidenceScore: 100 }]
]);

const normalizeDomain = (domain) => {
  try {
    return domain.replace(/\.com$/, "").replace(/(ford|auto|chevrolet|toyota|bmw)/gi, "").toLowerCase().trim();
  } catch (err) {
    console.error(`Error normalizing domain ${domain}: ${err.message}`);
    return domain.toLowerCase().replace(/\.com$/, "");
  }
};

const fuzzyMatchDomain = (inputDomain, knownDomains) => {
  try {
    const normalizedInput = normalizeDomain(inputDomain);
    for (const knownDomain of knownDomains) {
      const normalizedKnown = normalizeDomain(knownDomain);
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
    const response = await fetch(`https://${domain}`, { redirect: "follow", timeout: 2000, headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" } });
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

const callOpenAIForMeta = async (domain, metadata, logoText, apiKey) => {
  const prompt = `Domain: ${domain}, Redirected: ${metadata.redirectedDomain}, Title: ${metadata.title}, Description: ${metadata.description}, Logo: ${logoText}. Extract the dealership name.`;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4-turbo", max_tokens: 50, temperature: 0.2, messages: [{ role: "user", content: prompt }] }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);
      const match = text.match(/##Name:\s*([^\n\r]+)/);
      return { result: match?.[1]?.trim() || "", tokens: Math.ceil(prompt.length / 4) };
    } catch (err) {
      console.error(`OpenAI meta error (attempt ${attempt}): ${err.message}`);
      if (attempt === 2) return { result: null, error: err.message, tokens: 0 };
      await new Promise(res => setTimeout(res, 500));
    }
  }
};

const callOpenAI = async (prompt, apiKey) => {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4-turbo", max_tokens: 50, temperature: 0.2, messages: [{ role: "user", content: prompt }] }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);
      const match = text.match(/##Name:\s*([^\n\r]+)/);
      return { result: match?.[1]?.trim() || "", tokens: Math.ceil(prompt.length / 4) };
    } catch (err) {
      console.error(`OpenAI error (attempt ${attempt}): ${err.message}`);
      if (attempt === 2) return { result: null, error: err.message, tokens: 0 };
      await new Promise(res => setTimeout(res, 500));
    }
  }
};

export default async function handler(req, res) {
  console.log("batch-enrich.js Version 3.4.5 - Optimized 2025-04-08");
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing OpenAI API key" });

    let leads;
    try {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      leads = JSON.parse(Buffer.concat(buffers).toString("utf-8"));
    } catch (err) {
      console.error(`JSON parse error: ${err.message}`);
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

    const BATCH_SIZE = 5;
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
          if (!domain) {
            console.error(`Row ${rowNum}: Missing domain`);
            return { name: "", confidenceScore: 0, flags: ["MissingDomain"], rowNum };
          }

          if (domainCache.has(domain)) {
            console.log(`Row ${rowNum}: Cache hit for ${domain}`);
            return { ...domainCache.get(domain), rowNum };
          }

          const matchedDomain = fuzzyMatchDomain(domain, KNOWN_NAMES.keys());
          let finalResult = matchedDomain && KNOWN_NAMES.has(matchedDomain)
            ? { ...KNOWN_NAMES.get(matchedDomain), flags: [], rowNum }
            : humanizeName(domain, domain, false);

          let tokensUsed = 0;
          if (!finalResult.name) {
            const { result: gptName, tokens } = await callOpenAI(`Domain: ${domain}, extract dealership name.`, apiKey);
            tokensUsed += tokens;
            totalTokens += tokens;
            if (gptName) {
              finalResult = humanizeName(gptName, domain, false);
              finalResult.flags.push("GPTFallbackUsed");
            } else {
              finalResult.flags.push("GPTFailed");
              fallbackTriggers.push({ domain, reason: "GPTFailed" });
            }
          }

          // Score City + Brand properly
          if (Array.isArray(finalResult.flags) && finalResult.flags.includes("CarBrandCityException")) {
            finalResult.confidenceScore = 100;
            finalResult.flags = [...new Set([...finalResult.flags, "Scored100FromPattern"])];
          }

          if (finalResult.confidenceScore < 60 || finalResult.flags.some(f => ["TooGeneric", "PossibleAbbreviation", "NotPossessiveFriendly", "CityNameOnly"].includes(f))) {
            const metadata = await fetchWebsiteMetadata(domain);
            const logoText = await extractLogoText(domain, metadata.html);
            const { result: metaName, tokens } = await callOpenAIForMeta(domain, metadata, logoText, apiKey);
            tokensUsed += tokens;
            totalTokens += tokens;
            if (metaName && metaName !== finalResult.name) {
              finalResult = humanizeName(metaName, domain, false);
              finalResult.flags.push("MetaFallbackUsed");
            } else {
              finalResult.flags.push("MetaFallbackFailed");
              fallbackTriggers.push({ domain, reason: "MetaFallbackFailed" });
            }
          }

          if (finalResult.confidenceScore < 50 || finalResult.flags.some(f => ["TooGeneric", "PossibleAbbreviation", "NotPossessiveFriendly", "CityNameOnly"].includes(f))) {
            manualReviewQueue.push({ domain, name: finalResult.name, confidenceScore: finalResult.confidenceScore, flags: finalResult.flags, rowNum });
            finalResult = { name: finalResult.name || "", confidenceScore: Math.max(finalResult.confidenceScore, 50), flags: [...finalResult.flags, "LowConfidence"], rowNum };
          }

          domainCache.set(domain, { name: finalResult.name, confidenceScore: finalResult.confidenceScore, flags: finalResult.flags });
          console.log(`Row ${rowNum}: ${JSON.stringify(finalResult)}`);
          return { ...finalResult, rowNum, tokens: tokensUsed };
        }))
      );

      // Ensure results array is always defined before pushing
      if (!results) throw new Error('Results array is undefined');
      results.push(...chunkResults);
    }

    console.log(`Completed: ${results.length} results, ${manualReviewQueue.length} for review`);
    return res.status(200).json({ results, manualReviewQueue, totalTokens, fallbackTriggers, partial: false });
  } catch (err) {
    console.error(`Handler error: ${err.message}`, err.stack);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}

export const config = { api: { bodyParser: false } };
