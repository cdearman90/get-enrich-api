// api/batch-enrich-franchise.js (Version 1.0.0 - Optimized 2025-04-07)
// Assigns Franchise Groups based on domain and company name, aligned with batch-enrich.js v4.0,
// batch-enrich-company-name-fallback.js v1.0.8, and Google Apps Script

import { CAR_BRANDS, CAR_BRAND_MAPPING } from "./lib/humanize.js"; // Aligned with updated humanize.js

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

// Cache for franchise results
const franchiseCache = new Map();

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
    console.log(`Metadata fetched for ${domain}: title=${titleMatch?.[1] || ""}`);
    return { title: titleMatch?.[1] || "", description: metaMatch?.[1] || "", redirectedDomain: response.url };
  } catch (err) {
    console.error(`Metadata fetch failed for ${domain}: ${err.message}, Stack: ${err.stack}`);
    return { title: "", description: "", redirectedDomain: domain, error: err.message };
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

export default async function handler(req, res) {
  console.log("batch-enrich-franchise.js Version 1.0.0 - Optimized 2025-04-07");

  try {
    let leads;
    try {
      const rawBody = await streamToString(req);
      leads = JSON.parse(rawBody);
      console.log(`Received ${leads.length} leads for franchise enrichment`);
    } catch (err) {
      console.error(`JSON parse error: ${err.message}, Stack: ${err.stack}`);
      return res.status(400).json({ error: "Invalid JSON", details: err.message });
    }

    if (!Array.isArray(leads) || leads.length === 0) {
      console.error("Missing or invalid lead list");
      return res.status(400).json({ error: "Missing or invalid lead list" });
    }

    const startTime = Date.now();
    const limit = pLimit(1); // Conservative concurrency for stability
    const results = [];
    const manualReviewQueue = [];

    const BATCH_SIZE = 5; // Aligned with batch-enrich.js v4.0 and Google Apps Script
    const leadChunks = Array.from({ length: Math.ceil(leads.length / BATCH_SIZE) }, (_, i) =>
      leads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    for (const chunk of leadChunks) {
      if (Date.now() - startTime > 18000) { // 18s timeout for Vercel paid tier
        console.log("Partial response due to timeout after 18s");
        return res.status(200).json({ results, manualReviewQueue, partial: true });
      }

      const chunkResults = await Promise.all(
        chunk.map(lead => limit(async () => {
          const { domain, humanName, rowNum } = lead;
          if (!domain) {
            console.error(`Row ${rowNum}: Missing domain`);
            return { franchiseGroup: "", flags: ["MissingDomain"], rowNum };
          }

          const cacheKey = `${domain}|${humanName || ""}`;
          if (franchiseCache.has(cacheKey)) {
            console.log(`Cache hit for ${domain} (Row ${rowNum}): ${JSON.stringify(franchiseCache.get(cacheKey))}`);
            return { ...franchiseCache.get(cacheKey), rowNum };
          }

          console.log(`Processing franchise for ${domain} (Row ${rowNum})`);
          let primaryBrand = null;
          const sources = [
            { name: "humanName", text: humanName || domain.replace(/\.(com|org|net|co\.uk)$/, "") },
            { name: "domain", text: domain }
          ];

          for (const source of sources) {
            const text = source.text.toLowerCase();
            for (const brand of CAR_BRANDS) {
              if (text.includes(brand)) {
                primaryBrand = brand;
                console.log(`Row ${rowNum}: Found ${brand} in ${source.name}`);
                break;
              }
            }
            if (primaryBrand) break;
          }

          if (!primaryBrand) {
            const metadata = await fetchWebsiteMetadata(domain);
            if (metadata.error) {
              console.log(`Row ${rowNum}: Metadata fetch failed, skipping`);
              manualReviewQueue.push({ domain, humanName, rowNum, reason: "MetadataFetchFailed" });
              return { franchiseGroup: "", flags: ["MetadataFetchFailed", "NeedsHumanReview"], rowNum };
            }
            sources.push({ name: "metatitle", text: metadata.title.toLowerCase() });
            sources.push({ name: "description", text: metadata.description.toLowerCase() });

            for (const source of sources) {
              const text = source.text.toLowerCase();
              for (const brand of CAR_BRANDS) {
                if (text.includes(brand)) {
                  primaryBrand = brand;
                  console.log(`Row ${rowNum}: Found ${brand} in ${source.name}`);
                  break;
                }
              }
              if (primaryBrand) break;
            }
          }

          if (primaryBrand) {
            const standardizedBrand = CAR_BRAND_MAPPING[primaryBrand.toLowerCase()] || primaryBrand;
            const result = { franchiseGroup: standardizedBrand, flags: ["Success"], rowNum };
            franchiseCache.set(cacheKey, result);
            console.log(`Row ${rowNum}: Assigned franchise ${standardizedBrand}`);
            return result;
          } else {
            console.log(`Row ${rowNum}: No car brand found`);
            manualReviewQueue.push({ domain, humanName, rowNum, reason: "NoCarBrandFound" });
            const result = { franchiseGroup: "", flags: ["NoCarBrandFound", "NeedsHumanReview"], rowNum };
            franchiseCache.set(cacheKey, result);
            return result;
          }
        }))
      );

      results.push(...chunkResults);
    }

    console.log(`Completed: ${results.length} results, ${manualReviewQueue.length} for review`);
    return res.status(200).json({ results, manualReviewQueue, partial: false });
  } catch (err) {
    console.error(`Handler error: ${err.message}, Stack: ${err.stack}`);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}

export const config = { api: { bodyParser: false } };
