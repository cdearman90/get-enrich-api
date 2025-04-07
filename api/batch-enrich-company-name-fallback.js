// api/batch-enrich-company-name-fallback.js (Version 1.0.7 - Optimized 2025-04-07)
// Updated to accept 2-word fallbacks at 75+, align with humanize.js, and sync with batch-enrich.js v3.9

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
  console.log("batch-enrich-company-name-fallback.js Version 1.0.7 - Optimized 2025-04-07");

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
    const limit = pLimit(1); // Kept at 1 for stability
    const results = [];
    const manualReviewQueue = [];
    let totalTokens = 0;

    const BATCH_SIZE = 5; // Aligned with system overview and batch-enrich.js v3.9
    const leadChunks = Array.from({ length: Math.ceil(leads.length / BATCH_SIZE) }, (_, i) =>
      leads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    for (const chunk of leadChunks) {
      if (Date.now() - startTime > 18000) { // 18s timeout for paid tier
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

          // Retry logic for humanizeName
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              finalResult = await humanizeName(domain, domain, false);
              console.log(`Row ${rowNum}: humanizeName output: ${JSON.stringify(finalResult)}`);
              tokensUsed = finalResult.tokens || 0;
              break;
            } catch (err) {
              console.error(`Row ${rowNum}: humanizeName attempt ${attempt} failed: ${err.message}, Stack: ${err.stack}`);
              if (attempt === 3) {
                finalResult = { name: "", confidenceScore: 0, flags: ["ProcessingError"], tokens: 0 };
              }
              await new Promise(res => setTimeout(res, 1000));
            }
          }

          finalResult.flags = [...(finalResult.flags || []), "FallbackUsed"];

          const forceReviewFlags = [
            "TooGeneric",
            "CityNameOnly",
            "PossibleAbbreviation",
            "BadPrefixOf",
            "CarBrandSuffixRemaining",
            "FuzzyCityMatch",
            "NotPossessiveFriendly"
          ];

          // Accept scores >= 75 unless flagged TooGeneric or CityNameOnly
          if (
            finalResult.confidenceScore < 75 ||
            (Array.isArray(finalResult.flags) && finalResult.flags.some(f => ["TooGeneric", "CityNameOnly"].includes(f)))
          ) {
            manualReviewQueue.push({
              domain,
              name: finalResult.name,
              confidenceScore: finalResult.confidenceScore,
              flags: finalResult.flags,
              rowNum
            });
            finalResult = { name: "", confidenceScore: 0, flags: [...finalResult.flags, "Skipped"], tokens: tokensUsed, rowNum };
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
