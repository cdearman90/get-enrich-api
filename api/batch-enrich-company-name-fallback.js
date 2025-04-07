// api/batch-enrich-company-name-fallback.js (Version 1.0.2 - Optimized 2025-04-10)
import { humanizeName } from "./lib/humanize.js";

// Concurrency limiter (same as batch-enrich.js)
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

export default async function handler(req, res) {
  console.log("batch-enrich-company-name-fallback.js Version 1.0.2 - Optimized 2025-04-10");

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
    const limit = pLimit(2); // Limit to 2 concurrent requests
    const results = [];
    const manualReviewQueue = [];

    const chunkResults = await Promise.all(
      leads.map(lead => limit(async () => {
        if (Date.now() - startTime > 9000) {
          console.log(`Row ${lead.rowNum}: Skipped due to timeout`);
          return { name: "", confidenceScore: 0, flags: ["Timeout"], rowNum: lead.rowNum, tokens: 0 };
        }

        const { domain, rowNum } = lead;
        if (!domain) {
          console.error(`Row ${rowNum}: Missing domain`);
          return { name: "", confidenceScore: 0, flags: ["MissingDomain"], rowNum, tokens: 0 };
        }

        let finalResult;
        try {
          finalResult = await humanizeName(domain, domain, false); // Default call
        } catch (err) {
          console.error(`Row ${rowNum}: humanizeName threw error: ${err.message}, Stack: ${err.stack}`);
          // Fallback without OpenAI
          try {
            finalResult = await humanizeName(domain, domain, false, true); // Skip OpenAI
            finalResult.flags = [...(finalResult.flags || []), "OpenAIFallbackUsed"];
          } catch (fallbackErr) {
            console.error(`Row ${rowNum}: Fallback humanizeName failed: ${fallbackErr.message}, Stack: ${fallbackErr.stack}`);
            finalResult = { name: "", confidenceScore: 0, flags: ["ProcessingError"], tokens: 0 };
          }
        }

        finalResult.flags = [...(finalResult.flags || []), "FallbackUsed"];
        const tokensUsed = finalResult.tokens || 0;

        console.log(`Row ${rowNum}: ${JSON.stringify(finalResult)}`);

    const forceReviewFlags = [
      "TooGeneric",
      "CityNameOnly",
      "PossibleAbbreviation",
      "BadPrefixOf",
      "CarBrandSuffixRemaining",
      "FuzzyCityMatch" // Added to review OpenAI-detected cities
    ];

        if (
          finalResult.confidenceScore < 50 ||
          finalResult.flags.some(f => skipFlags.includes(f))
        ) {
          manualReviewQueue.push({
            domain,
            name: finalResult.name,
            confidenceScore: finalResult.confidenceScore,
            flags: finalResult.flags,
            rowNum
          });
          finalResult = { name: "", confidenceScore: 0, flags: ["Skipped"], tokens: tokensUsed, rowNum };
        }

        return { ...finalResult, rowNum, tokens: tokensUsed };
      }))
    );

    results.push(...chunkResults);

    console.log(`Completed: ${results.length} results, ${manualReviewQueue.length} for review`);
    return res.status(200).json({ results, manualReviewQueue, partial: false });

  } catch (err) {
    console.error(`Handler error: ${err.message}, Stack: ${err.stack}`);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}

export const config = { api: { bodyParser: false } };
