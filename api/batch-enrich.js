// api/batch-enrich.js (Version 3.4.7 - Optimized 2025-04-09)
import { humanizeName, CAR_BRANDS, COMMON_WORDS, normalizeText, KNOWN_OVERRIDES } from "./lib/humanize.js";

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

const normalizeDomain = (domain) => {
  try {
    return domain
      .replace(/\.com$/, "")
      .replace(/(ford|auto|chevrolet|toyota|bmw)/gi, "")
      .toLowerCase()
      .trim();
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
    const response = await fetch(`https://${domain}`, {
      redirect: "follow",
      timeout: 2000,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" }
    });
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
  const prompt = `Domain: ${domain}, Redirected: ${metadata.redirectedDomain}, Title: ${metadata.title}, Description: ${metadata.description}, Logo: ${logoText}. Extract the dealership name. Format response as ##Name: [Dealership Name]`;
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
      console.error(`OpenAI meta error for ${domain} (attempt ${attempt}): ${err.message}`);
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

const callFallbackAPI = async (domain, rowNum) => {
  try {
    const response = await fetch(VERCEL_API_ENRICH_FALLBACK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ domain, rowNum }])
    });
    const result = await response.json();
    if (!response.ok) throw new Error(`Fallback API HTTP ${response.status}: ${result.error || "Unknown error"}`);
    return result.results[0] || { name: "", confidenceScore: 0, flags: ["FallbackAPIFailed"] };
  } catch (err) {
    console.error(`Fallback API error for ${domain}: ${err.message}`);
    return { name: "", confidenceScore: 0, flags: ["FallbackAPIFailed"], error: err.message };
  }
};

export default async function handler(req, res) {
  console.log("batch-enrich.js Version 3.4.7 - Optimized 2025-04-09");
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
    const limit = pLimit(2); // Reduced concurrency to prevent timeouts
    const results = [];
    const manualReviewQueue = [];
    let totalTokens = 0;
    const fallbackTriggers = [];

    const BATCH_SIZE = 3; // Reduced batch size for better reliability
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

          // Apply overrides first
          const domainLower = domain.toLowerCase();
          if (KNOWN_OVERRIDES[domainLower]) {
            return { name: KNOWN_OVERRIDES[domainLower], confidenceScore: 100, flags: ["OverrideApplied"], rowNum, tokens: 0 };
          }

          if (domainCache.has(domain)) {
            console.log(`Row ${rowNum}: Cache hit for ${domain}`);
            return { ...domainCache.get(domain), rowNum };
          }

          let finalResult = await humanizeName(domain, domain, false);
          let tokensUsed = 0;

          // Fallback to OpenAI if humanizeName returns no name
          if (!finalResult.name) {
            const { result: gptName, tokens } = await callOpenAI(`Domain: ${domain}, extract dealership name. Format response as ##Name: [Dealership Name]`, apiKey);
            tokensUsed += tokens;
            totalTokens += tokens;
            if (gptName) {
              finalResult = await humanizeName(gptName, domain, false);
              finalResult.flags.push("GPTFallbackUsed");
            } else {
              finalResult.flags.push("GPTFailed");
              fallbackTriggers.push({ domain, reason: "GPTFailed" });
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
            const { result: metaName, tokens } = await callOpenAIForMeta(domain, metadata, logoText, apiKey);
            tokensUsed += tokens;
            totalTokens += tokens;
            if (metaName && metaName !== finalResult.name) {
              finalResult = await humanizeName(metaName, domain, false);
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
