// api/batch-enrich-company-name-fallback.js (Version 1.0.5 - Optimized 2025-04-07)
// Updated to align with humanize.js (spacing validator), improve timeout handling, and sync with batch-enrich.js

import { humanizeName } from "./lib/humanize.js";

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

// Stream to string helper for Vercel
const streamToString = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
};

export default async function handler(req, res) {
  console.log("batch-enrich-company-name-fallback.js Version 1.0.5 - Optimized 2025-04-07");

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
      console.error("Missing or invalid lead list");
      return res.status(400).json({ error: "Missing or invalid lead list" });
    }

    const startTime = Date.now();
    const limit = pLimit(1); // Kept at 1 to minimize timeout risk
    const results = [];
    const manualReviewQueue = [];
    let totalTokens = 0;

    const BATCH_SIZE = 4; // Aligned with system overview and batch-enrich.js
    const leadChunks = Array.from({ length: Math.ceil(leads.length / BATCH_SIZE) }, (_, i) =>
      leads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    for (const chunk of leadChunks) {
      if (Date.now() - startTime > 10000) { // Extended to 10s for free tier; adjust to 18000 for paid tier
        console.log("Partial response due to timeout");
        return res.status(200).json({ results, manualReviewQueue, totalTokens, partial: true });
      }

      const chunkResults = await Promise.all(
        chunk.map(lead => limit(async () => {
          const { domain, rowNum } = lead;
          if (!domain) {
            console.error(`Row ${rowNum}: Missing domain`);
            return { name: "", confidenceScore: 0, flags: ["MissingDomain"], rowNum, tokens: 0 };
          }

          let finalResult;
          let tokensUsed = 0;

          // Simplified retry logic (humanize.js handles OpenAI internally)
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              finalResult = await humanizeName(domain, domain, false);
              tokensUsed = finalResult.tokens || 0;
              break;
            } catch (err) {
              console.error(`Row ${rowNum}: humanizeName attempt ${attempt} failed: ${err.message}, Stack: ${err.stack}`);
              if (attempt === 2) {
                finalResult = { name: "", confidenceScore: 0, flags: ["ProcessingError"], tokens: 0 };
              }
              await new Promise(res => setTimeout(res, 1000));
            }
          }

          finalResult.flags = [...(finalResult.flags || []), "FallbackUsed"];
          console.log(`Row ${rowNum}: ${JSON.stringify(finalResult)}`);

          const forceReviewFlags = [
            "TooGeneric",
            "CityNameOnly",
            "PossibleAbbreviation",
            "BadPrefixOf",
            "CarBrandSuffixRemaining",
            "FuzzyCityMatch",
            "NotPossessiveFriendly"
          ];

          if (
            finalResult.confidenceScore < 60 || // Raised to 60 to account for GPTSpacingValidated boosts
            (Array.isArray(finalResult.flags) && finalResult.flags.some(f => forceReviewFlags.includes(f)))
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

          totalTokens += tokensUsed;
          return { ...finalResult, rowNum, tokens: tokensUsed };
        }))
      );

      results.push(...chunkResults);
    }

    console.log(`Completed: ${results.length} results, ${manualReviewQueue.length} for review, Total tokens: ${totalTokens}`);
    return res.status(200).json({ results, manualReviewQueue, totalTokens, partial: false });

  } catch (err) {
    console.error(`Handler error: ${err.message}, Stack: ${err.stack}`);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}

export const config = { api: { bodyParser: false } };
