// api/batch-enrich-franchise.js
import { CAR_BRANDS, CAR_BRAND_MAPPING } from "./lib/humanize.js"; // Assuming CAR_BRANDS and CAR_BRAND_MAPPING are exported

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
    return { title: titleMatch?.[1] || "", description: metaMatch?.[1] || "", redirectedDomain: response.url };
  } catch (err) {
    console.error(`Metadata fetch failed for ${domain}: ${err.message}`);
    return { title: "", description: "", redirectedDomain: domain, error: err.message };
  }
};

export default async function handler(req, res) {
  console.log("batch-enrich-franchise.js - Created 2025-04-06");
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

    const results = await Promise.all(leads.map(async lead => {
      const { domain, humanName, rowNum } = lead;
      if (!domain) {
        console.error(`Row ${rowNum}: Missing domain`);
        return { franchiseGroup: "", flags: ["MissingDomain"], rowNum };
      }

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
            break;
          }
        }
        if (primaryBrand) break;
      }

      if (!primaryBrand) {
        const metadata = await fetchWebsiteMetadata(domain);
        if (metadata.error) {
          return { franchiseGroup: "", flags: ["MetadataFetchFailed"], rowNum };
        }
        sources.push({ name: "metatitle", text: metadata.title.toLowerCase() });
        sources.push({ name: "description", text: metadata.description.toLowerCase() });

        for (const source of sources) {
          const text = source.text.toLowerCase();
          for (const brand of CAR_BRANDS) {
            if (text.includes(brand)) {
              primaryBrand = brand;
              break;
            }
          }
          if (primaryBrand) break;
        }
      }

      if (primaryBrand) {
        const standardizedBrand = CAR_BRAND_MAPPING[primaryBrand.toLowerCase()] || primaryBrand;
        return { franchiseGroup: standardizedBrand, flags: ["Success"], rowNum };
      } else {
        return { franchiseGroup: "", flags: ["NoCarBrandFound"], rowNum };
      }
    }));

    console.log(`Completed: ${results.length} results`);
    return res.status(200).json({ results });
  } catch (err) {
    console.error(`Handler error: ${err.message}, Stack: ${err.stack}`);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}

export const config = { api: { bodyParser: false } };
