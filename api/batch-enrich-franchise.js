// api/batch-enrich-franchise.js (Version 1.0.1 - Optimized 2025-04-07)
// Changes:
// - Integrated extractBrandOfCityFromDomain from humanize.js for CarBrandOfCity pattern detection
// - Added FRANCHISE_GROUPS mapping for multi-brand dealership groups
// - Improved brand detection with word boundaries and humanName prioritization
// - Added metadataCache for efficient metadata fetching
// - Increased concurrency to pLimit(5) for better throughput
// - Updated version to 1.0.1 to reflect the changes

import { CAR_BRANDS, CAR_BRAND_MAPPING, extractBrandOfCityFromDomain } from "./lib/humanize.js";

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

// Cache for franchise results and metadata
const franchiseCache = new Map();
const metadataCache = new Map();

// Known multi-brand franchise groups
const FRANCHISE_GROUPS = {
  "autonation.com": "AutoNation",
  "lithia.com": "Lithia Motors",
  "penskeautomotive.com": "Penske Automotive",
  "group1auto.com": "Group 1 Automotive",
  "sonicdealers.com": "Sonic Automotive"
};

// HTML metadata fetch
const fetchWebsiteMetadata = async (domain) => {
  if (metadataCache.has(domain)) {
    console.log(`Metadata cache hit for ${domain}`);
    return metadataCache.get(domain);
  }

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
    const result = { title: titleMatch?.[1] || "", description: metaMatch?.[1] || "", redirectedDomain: response.url };
    metadataCache.set(domain, result);
    console.log(`Metadata fetched for ${domain}: title=${result.title}`);
    return result;
  } catch (err) {
    console.error(`Metadata fetch failed for ${domain}: ${err.message}, Stack: ${err.stack}`);
    const result = { title: "", description: "", redirectedDomain: domain, error: err.message };
    metadataCache.set(domain, result);
    return result;
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
  console.log("batch-enrich-franchise.js Version 1.0.1 - Optimized 2025-04-07");

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
    const limit = pLimit(5); // Increased to 5 for better throughput
    const results = [];
    const manualReviewQueue = [];

    const BATCH_SIZE = 5;
    const leadChunks = Array.from({ length: Math.ceil(leads.length / BATCH_SIZE) }, (_, i) =>
      leads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    for (const chunk of leadChunks) {
      if (Date.now() - startTime > 18000) {
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
          let franchiseGroup = "";
          let flags = [];
          let primaryBrand = null;

          // Check for known franchise groups
          const domainLower = domain.toLowerCase();
          for (const [franchiseDomain, group] of Object.entries(FRANCHISE_GROUPS)) {
            if (domainLower.includes(franchiseDomain)) {
              franchiseGroup = group;
              flags.push("FranchiseGroupMatched");
              console.log(`Row ${rowNum}: Matched franchise group ${group} for ${domain}`);
              break;
            }
          }

          if (!franchiseGroup) {
            // Try CarBrandOfCity pattern first
            const brandOfCityResult = extractBrandOfCityFromDomain(domainLower);
            if (brandOfCityResult) {
              primaryBrand = brandOfCityResult.brand.toLowerCase();
              flags.push("CarBrandOfCityPattern");
              console.log(`Row ${rowNum}: Extracted brand ${primaryBrand} from CarBrandOfCity pattern`);
            }

            // If no brand found, try humanName and domain substring matching
            if (!primaryBrand) {
              const sources = [
                { name: "humanName", text: humanName || "" },
                { name: "domain", text: domain.replace(/\.(com|org|net|co\.uk)$/, "") }
              ];

              for (const source of sources) {
                const words = source.text.toLowerCase().split(/\W+/);
                for (const word of words) {
                  for (const brand of CAR_BRANDS) {
                    if (word === brand.toLowerCase()) {
                      primaryBrand = brand;
                      console.log(`Row ${rowNum}: Found ${brand} in ${source.name}`);
                      break;
                    }
                  }
                  if (primaryBrand) break;
                }
                if (primaryBrand) break;
              }
            }

            // If still no brand, fetch metadata
            if (!primaryBrand) {
              const metadata = await fetchWebsiteMetadata(domain);
              if (metadata.error) {
                console.log(`Row ${rowNum}: Metadata fetch failed, proceeding without metadata`);
                flags.push("MetadataFetchFailed");
              } else {
                const metadataSources = [
                  { name: "metatitle", text: metadata.title.toLowerCase() },
                  { name: "description", text: metadata.description.toLowerCase() }
                ];

                for (const source of metadataSources) {
                  const words = source.text.split(/\W+/);
                  for (const word of words) {
                    for (const brand of CAR_BRANDS) {
                      if (word === brand.toLowerCase()) {
                        primaryBrand = brand;
                        console.log(`Row ${rowNum}: Found ${brand} in ${source.name}`);
                        break;
                      }
                    }
                    if (primaryBrand) break;
                  }
                  if (primaryBrand) break;
                }
              }
            }

            // Assign franchise group based on primary brand
            if (primaryBrand) {
              franchiseGroup = CAR_BRAND_MAPPING[primaryBrand.toLowerCase()] || primaryBrand;
              flags.push("Success");
              console.log(`Row ${rowNum}: Assigned franchise ${franchiseGroup}`);
            } else {
              console.log(`Row ${rowNum}: No car brand found`);
              manualReviewQueue.push({ domain, humanName, rowNum, reason: "NoCarBrandFound" });
              flags.push("NoCarBrandFound", "NeedsHumanReview");
            }
          }

          const result = { franchiseGroup, flags, rowNum };
          franchiseCache.set(cacheKey, result);
          return result;
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
