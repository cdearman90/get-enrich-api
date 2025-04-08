// api/batch-enrich-company-name-fallback.js (Version 1.0.9 - Optimized 2025-04-07)
// Updated to accept 2-word fallbacks at 75+, align with humanize.js and batch-enrich.js v4.0,
// enhance logging, sync acceptability thresholds, and add override enforcement

import { humanizeName, KNOWN_OVERRIDES } from "./lib/humanize.js"; // Aligned with single-export humanize.js

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

// Entry point
export default async function handler(req, res) {
  console.log("batch-enrich-company-name-fallback.js Version 1.0.9 - Optimized 2025-04-07");

  try {
    let leads;
    try {
      const rawBody = await streamToString(req);
      leads = JSON.parse(rawBody);
      console.log(`Received ${leads.length} leads for fallback processing`);
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
    const fallbackTriggers = []; // Added for tracking manual review reasons
    let totalTokens = 0;

    const BATCH_SIZE = 5; // Aligned with batch-enrich.js v4.0 and Google Apps Script
    const leadChunks = Array.from({ length: Math.ceil(leads.length / BATCH_SIZE) }, (_, i) =>
      leads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    for (const chunk of leadChunks) {
      if (Date.now() - startTime > 18000) { // 18s timeout for Vercel paid tier
        console.log("Partial response due to timeout after 18s");
        return res.status(200).json({ results, manualReviewQueue, totalTokens, fallbackTriggers, partial: true });
      }

      const chunkResults = await Promise.all(
        chunk.map(lead => limit(async () => {
          const { domain, rowNum } = lead;
          if (!domain) {
            console.error(`Row ${rowNum}: Missing domain`);
            return { name: "", confidenceScore: 0, flags: ["MissingDomain"], rowNum, tokens: 0 };
          }

          const domainLower = domain.toLowerCase();

          // Check for overrides first with improved enforcement
          const override = KNOWN_OVERRIDES[domainLower];
          if (typeof override === 'string' && override.trim().length > 0) {
            const overrideName = override.trim();
            console.log(`Row ${rowNum}: Override applied for ${domain}: ${overrideName}`);
            return {
              name: overrideName,
              confidenceScore: 100,
              flags: ["OverrideApplied"],
              rowNum,
              tokens: 0
            };
          } else if (override !== undefined && override.trim() === "") {
            console.log(`Row ${rowNum}: Empty override for ${domain}, proceeding to fallback`);
            // Continue to humanizeName with EmptyOverride flag
          }

          console.log(`Processing fallback for ${domain} (Row ${rowNum})`);
          let finalResult;
          let tokensUsed = 0;

          // Retry logic for humanizeName
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              finalResult = await humanizeName(domain, domain, false);
              tokensUsed = finalResult.tokens || 0;
              console.log(`Row ${rowNum}: humanizeName attempt ${attempt} success: ${JSON.stringify(finalResult)}`);
              break;
            } catch (err) {
              console.error(`Row ${rowNum}: humanizeName attempt ${attempt} failed: ${err.message}, Stack: ${err.stack}`);
              if (attempt === 3) {
                finalResult = { name: "", confidenceScore: 0, flags: ["ProcessingError"], tokens: 0 };
                fallbackTriggers.push({ domain, reason: "ProcessingError", details: err.message });
              }
              await new Promise(res => setTimeout(res, 1000));
            }
          }

          // Add fallback flag
          finalResult.flags = [...(finalResult.flags || []), "FallbackUsed"];

          // Acceptability criteria synced with batch-enrich.js v4.0 and Google Apps Script
          const forceReviewFlags = [
            "TooGeneric",
            "CityNameOnly",
            "PossibleAbbreviation",
            "BadPrefixOf",
            "CarBrandSuffixRemaining",
            "FuzzyCityMatch",
            "NotPossessiveFriendly"
          ];
          const isAcceptable = finalResult.confidenceScore >= 75 && !finalResult.flags.some(f => ["TooGeneric", "CityNameOnly"].includes(f));

          if (!isAcceptable) {
            const reviewReason = finalResult.confidenceScore < 75 ? "LowConfidence" : `ProblematicFlags: ${finalResult.flags.filter(f => forceReviewFlags.includes(f)).join(", ")}`;
            manualReviewQueue.push({
              domain,
              name: finalResult.name,
              confidenceScore: finalResult.confidenceScore,
              flags: finalResult.flags,
              rowNum
            });
            fallbackTriggers.push({ domain, reason: reviewReason, details: `Score: ${finalResult.confidenceScore}, Flags: ${finalResult.flags.join(", ")}` });
            finalResult = {
              name: finalResult.name || "",
              confidenceScore: Math.max(finalResult.confidenceScore, 60),
              flags: [...finalResult.flags, "LowConfidence"],
              tokens: tokensUsed,
              rowNum
            };
            console.log(`Row ${rowNum}: Added to manual review due to ${reviewReason}: ${JSON.stringify(finalResult)}`);
          } else {
            console.log(`Row ${rowNum}: Acceptable fallback result: ${JSON.stringify(finalResult)}`);
          }

          totalTokens += tokensUsed;
          return { ...finalResult, rowNum, tokens: tokensUsed };
        }))
      );

      results.push(...chunkResults);
    }

    console.log(`Fallback completed: ${results.length} results, ${manualReviewQueue.length} for review, ${totalTokens} tokens used, ${fallbackTriggers.length} fallback triggers`);
    return res.status(200).json({ results, manualReviewQueue, totalTokens, fallbackTriggers, partial: false });

  } catch (err) {
    console.error(`Handler error: ${err.message}, Stack: ${err.stack}`);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}

export const config = { api: { bodyParser: false } };
