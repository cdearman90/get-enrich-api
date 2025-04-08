// api/batch-enrich-company-name-fallback.js (Version 1.0.10 - Optimized 2025-04-07)
// Changes:
// - Updated payload parsing to match batch-enrich.js v4.1 (supports leadList/domains)
// - Added detailed validation and error messages
// - Improved logging for debugging
// - Aligned with system architecture (3 retries, 1s delay, 18s timeout)
// - Ensured non-negotiable rules (disqualification flags, threshold ≥ 75)
// - Added environment variable check for OpenAI

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
  console.log("batch-enrich-company-name-fallback.js Version 1.0.10 - Optimized 2025-04-07");

  try {
    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error("Missing OPENAI_API_KEY environment variable");
      return res.status(500).json({ error: "Server configuration error", details: "Missing OPENAI_API_KEY environment variable" });
    }

    // Parse the request body
    let body;
    try {
      const rawBody = await streamToString(req);
      body = JSON.parse(rawBody);
      console.log(`Received payload: ${JSON.stringify(body).slice(0, 300)}`);
    } catch (err) {
      console.error(`JSON parse error: ${err.message}, Stack: ${err.stack}`);
      return res.status(400).json({ error: "Invalid JSON", details: err.message });
    }

    // Validate payload structure
    if (!body || typeof body !== "object") {
      console.error("Request body is missing or not an object");
      return res.status(400).json({ error: "Request body is missing or not an object" });
    }

    // Extract leads (support both 'leadList' and 'domains' for compatibility)
    const leads = body.leadList || body.domains;
    if (!leads) {
      console.error("Missing 'leadList' or 'domains' field in payload");
      return res.status(400).json({ error: "Missing 'leadList' or 'domains' field in payload" });
    }
    if (!Array.isArray(leads)) {
      console.error("'leadList' or 'domains' must be an array");
      return res.status(400).json({ error: "'leadList' or 'domains' must be an array" });
    }
    if (leads.length === 0) {
      console.error("'leadList' or 'domains' array is empty");
      return res.status(400).json({ error: "'leadList' or 'domains' array is empty" });
    }

    // Validate each lead entry
    const validatedLeads = leads.map((lead, index) => {
      if (!lead || typeof lead !== "object" || !lead.domain || typeof lead.domain !== "string" || lead.domain.trim() === "") {
        console.error(`Invalid lead at index ${index}: ${JSON.stringify(lead)}`);
        return null;
      }
      return { domain: lead.domain.trim().toLowerCase(), rowNum: lead.rowNum || (index + 1) };
    }).filter(lead => lead !== null);

    if (validatedLeads.length === 0) {
      console.error("No valid leads after validation");
      return res.status(400).json({ error: "No valid leads after validation" });
    }

    console.log(`Processing ${validatedLeads.length} valid leads in fallback`);

    const startTime = Date.now();
    const limit = pLimit(1); // Conservative concurrency for stability
    const results = [];
    const manualReviewQueue = [];
    const fallbackTriggers = [];
    let totalTokens = 0;

    const BATCH_SIZE = 5; // Aligned with system architecture
    const leadChunks = Array.from({ length: Math.ceil(validatedLeads.length / BATCH_SIZE) }, (_, i) =>
      validatedLeads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    for (const chunk of leadChunks) {
      if (Date.now() - startTime > 18000) { // 18s timeout for Vercel paid tier
        console.log("Partial response due to timeout after 18s");
        return res.status(200).json({ results, manualReviewQueue, totalTokens, fallbackTriggers, partial: true });
      }

      const chunkResults = await Promise.all(
        chunk.map(lead => limit(async () => {
          const { domain, rowNum } = lead;
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

          // Retry logic for humanizeName (3 retries, 1s delay)
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

          // Acceptability criteria (aligned with non-negotiable rules)
          const criticalFlags = ["TooGeneric", "CityNameOnly", "Skipped", "FallbackFailed", "PossibleAbbreviation"];
          const forceReviewFlags = [
            "TooGeneric",
            "CityNameOnly",
            "PossibleAbbreviation",
            "BadPrefixOf",
            "CarBrandSuffixRemaining",
            "FuzzyCityMatch",
            "NotPossessiveFriendly"
          ];
          const isAcceptable = finalResult.confidenceScore >= 75 && !finalResult.flags.some(f => criticalFlags.includes(f));

          if (!isAcceptable) {
            const reviewReason = finalResult.confidenceScore < 75 
              ? "LowConfidence" 
              : `ProblematicFlags: ${finalResult.flags.filter(f => forceReviewFlags.includes(f)).join(", ")}`;
            manualReviewQueue.push({
              domain,
              name: finalResult.name,
              confidenceScore: finalResult.confidenceScore,
              flags: finalResult.flags,
              rowNum
            });
            fallbackTriggers.push({ 
              domain, 
              reason: reviewReason, 
              details: `Score: ${finalResult.confidenceScore}, Flags: ${finalResult.flags.join(", ")}` 
            });
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
