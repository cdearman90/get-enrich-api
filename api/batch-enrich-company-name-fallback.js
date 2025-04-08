// api/batch-enrich-company-name-fallback.js (Version 1.0.16 - Optimized 2025-04-08)
// Changes:
// - Added subdomain normalization for [CarBrand]of[City] patterns (ChatGPT #1)
// - Enhanced fallbackTriggers logging with detailed justifications (ChatGPT #5)
// - Added manual test for known CarBrandOfCity domains (ChatGPT #6)
// - Fixed response format to match Apps Script and batch-enrich.js (successful field, companyName, domain)
// - Aligned flag handling with batch-enrich.js (FallbackAPIUsed, added UnverifiedCity to forceReviewFlags)
// - Added per-domain timeout check to prevent exceeding Vercel’s 20s limit
// - Reduced logging verbosity for large batches
// - Improved streamToString error handling with fallback
// - Updated version to 1.0.16 to reflect the changes

import { humanizeName, KNOWN_OVERRIDES, extractBrandOfCityFromDomain } from "./lib/humanize.js";

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

// Stream to string helper with timeout and fallback
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
    console.error(`Stream read failed: ${err.message}`);
    return ""; // Fallback to empty string to allow graceful error handling
  }
};

// Entry point
export default async function handler(req, res) {
  console.log("batch-enrich-company-name-fallback.js Version 1.0.16 - Optimized 2025-04-08");

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
      if (!rawBody) {
        console.error("Request body is empty after stream read");
        return res.status(400).json({ error: "Request body is empty" });
      }
      body = JSON.parse(rawBody);
      console.log(`Received payload with ${body.leads?.length || 0} leads`);
    } catch (err) {
      console.error(`JSON parse error: ${err.message}, Stack: ${err.stack}`);
      return res.status(400).json({ error: "Invalid JSON", details: err.message });
    }

    // Validate payload structure
    if (!body || typeof body !== "object") {
      console.error("Request body is missing or not an object");
      return res.status(400).json({ error: "Request body is missing or not an object" });
    }

    // Extract leads (support 'leads', 'leadList', and 'domains' for compatibility)
    const leads = body.leads || body.leadList || body.domains;
    if (!leads) {
      console.error("Missing 'leads', 'leadList', or 'domains' field in payload");
      return res.status(400).json({ error: "Missing 'leads', 'leadList', or 'domains' field in payload" });
    }
    if (!Array.isArray(leads)) {
      console.error("'leads', 'leadList', or 'domains' must be an array");
      return res.status(400).json({ error: "'leads', 'leadList', or 'domains' must be an array" });
    }
    if (leads.length === 0) {
      console.error("'leads', 'leadList', or 'domains' array is empty");
      return res.status(400).json({ error: "'leads', 'leadList', or 'domains' array is empty" });
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

    console.log(`Processing ${validatedLeads.length} valid leads in Fallback Mode`);

    const startTime = Date.now();
    const limit = pLimit(5);
    const successful = [];
    const manualReviewQueue = [];
    const fallbackTriggers = [];
    let totalTokens = 0;

    const BATCH_SIZE = 5;
    const leadChunks = Array.from({ length: Math.ceil(validatedLeads.length / BATCH_SIZE) }, (_, i) =>
      validatedLeads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    for (const chunk of leadChunks) {
      if (Date.now() - startTime > 18000) {
        console.log("Partial response due to timeout after 18s");
        return res.status(200).json({ successful, manualReviewQueue, totalTokens, fallbackTriggers, partial: true });
      }

      const chunkResults = await Promise.all(
        chunk.map(lead => limit(async () => {
          const { domain, rowNum } = lead;

          // Per-domain timeout check
          const domainStartTime = Date.now();
          if (Date.now() - startTime > 18000) {
            console.log(`Row ${rowNum}: Skipped due to overall timeout`);
            return { domain, companyName: "", confidenceScore: 0, flags: ["SkippedDueToTimeout"], rowNum, tokens: 0 };
          }

          let domainLower = domain.toLowerCase();

          // Normalize subdomains like mydealer-mbofstockton.com
          const normalizedMatch = extractBrandOfCityFromDomain(domainLower);
          if (normalizedMatch && !KNOWN_OVERRIDES[domainLower]) {
            const normalizedDomain = `${normalizedMatch.brand.toLowerCase()}of${normalizedMatch.city.toLowerCase()}`;
            console.log(`Row ${rowNum}: Normalized subdomain detected: ${domain} → ${normalizedDomain}`);
            domainLower = normalizedDomain;
          }

          // Check for overrides first with improved enforcement
          const override = KNOWN_OVERRIDES[domainLower];
          if (typeof override === 'string' && override.trim().length > 0) {
            const overrideName = override.trim();
            console.log(`Row ${rowNum}: Override applied for ${domain}: ${overrideName}`);
            return {
              domain,
              companyName: overrideName,
              confidenceScore: 100,
              flags: ["OverrideApplied"],
              rowNum,
              tokens: 0
            };
          } else if (override !== undefined && override.trim() === "") {
            console.log(`Row ${rowNum}: Empty override for ${domain}, proceeding to fallback`);
          }

          console.log(`Processing fallback for ${domain} (Row ${rowNum})`);
          let finalResult;
          let tokensUsed = 0;
          let brandDetected = null;
          let cityDetected = null;

          // Extract brand and city for logging
          if (normalizedMatch) {
            brandDetected = normalizedMatch.brand;
            cityDetected = normalizedMatch.city;
          }

          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              finalResult = await humanizeName(domainLower, domainLower, false);
              tokensUsed = finalResult.tokens || 0;
              console.log(`Row ${rowNum}: humanizeName attempt ${attempt} success: name=${finalResult.name}, score=${finalResult.confidenceScore}`);
              break;
            } catch (err) {
              console.error(`Row ${rowNum}: humanizeName attempt ${attempt} failed: ${err.message}`);
              if (attempt === 3) {
                finalResult = { name: "", confidenceScore: 0, flags: ["ProcessingError"], tokens: 0 };
                fallbackTriggers.push({ 
                  domain, 
                  rowNum, 
                  reason: "ProcessingError", 
                  details: { 
                    flags: ["ProcessingError"], 
                    score: 0, 
                    brand: brandDetected, 
                    city: cityDetected, 
                    gptUsed: false 
                  }, 
                  tokens: 0 
                });
              }
              await new Promise(res => setTimeout(res, 1000));
            }
          }

          finalResult.flags = Array.isArray(finalResult.flags) ? finalResult.flags : [];
          finalResult.flags.push("FallbackAPIUsed");

          const confidenceScore = finalResult.confidenceScore || 0;
          finalResult.flags.push(confidenceScore >= 90 ? "HighConfidence" : confidenceScore >= 75 ? "MediumConfidence" : "LowConfidence");

          if (finalResult.flags.includes("CarBrandOfCityPattern")) {
            console.log(`Row ${rowNum}: CarBrandOfCity pattern detected for ${domain}: ${finalResult.name}`);
          }

          const criticalFlags = ["TooGeneric", "CityNameOnly", "Skipped", "FallbackFailed", "PossibleAbbreviation"];
          const forceReviewFlags = [
            "TooGeneric",
            "CityNameOnly",
            "PossibleAbbreviation",
            "BadPrefixOf",
            "CarBrandSuffixRemaining",
            "NotPossessiveFriendly",
            "UnverifiedCity"
          ];
          const isAcceptable = finalResult.confidenceScore >= 75 && !finalResult.flags.some(f => criticalFlags.includes(f)) &&
                              !(finalResult.flags.includes("OpenAICityValidated") && finalResult.confidenceScore < 75);

          if (!isAcceptable) {
            const reviewReason = finalResult.confidenceScore < 75 
              ? "LowConfidence" 
              : `ProblematicFlags: ${finalResult.flags.filter(f => forceReviewFlags.includes(f)).join(", ")}`;
            manualReviewQueue.push({
              domain,
              name: finalResult.name,
              confidenceScore: finalResult.confidenceScore,
              flags: finalResult.flags,
              rowNum,
              tokens: tokensUsed
            });
            fallbackTriggers.push({ 
              domain, 
              rowNum,
              reason: reviewReason, 
              details: { 
                flags: finalResult.flags, 
                score: finalResult.confidenceScore, 
                brand: brandDetected, 
                city: cityDetected, 
                gptUsed: finalResult.flags.includes("GPTSpacingValidated") || finalResult.flags.includes("OpenAICityValidated")
              }, 
              tokens: tokensUsed 
            });
            finalResult = {
              domain,
              companyName: finalResult.name || "",
              confidenceScore: Math.max(finalResult.confidenceScore, 60),
              flags: [...finalResult.flags, "LowConfidence"],
              tokens: tokensUsed,
              rowNum
            };
            console.log(`Row ${rowNum}: Added to manual review due to ${reviewReason}: name=${finalResult.companyName}, score=${finalResult.confidenceScore}`);
          } else {
            console.log(`Row ${rowNum}: Acceptable fallback result: name=${finalResult.name}, score=${finalResult.confidenceScore}`);
          }

          totalTokens += tokensUsed;
          return { domain, companyName: finalResult.name, confidenceScore: finalResult.confidenceScore, flags: finalResult.flags, rowNum, tokens: tokensUsed };
        }))
      );

      successful.push(...chunkResults);
    }

    console.log(`Fallback completed: ${successful.length} successful, ${manualReviewQueue.length} for review, ${totalTokens} tokens used, ${fallbackTriggers.length} fallback triggers`);
    return res.status(200).json({ successful, manualReviewQueue, totalTokens, fallbackTriggers, partial: false });

  } catch (err) {
    console.error(`Handler error: ${err.message}, Stack: ${err.stack}`);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}

/*
Manual Test for CarBrandOfCity Domains
Expected: All domains should resolve to Brand City without manual review or OpenAI fallback.
- "toyotaofslidell.net" → "Toyota Slidell" (confidence: 100, flags: ["CarBrandOfCityPattern", "BrandOfPatternMatched", "AutoPatternBypass"])
- "lexusofneworleans.com" → "Lexus New Orleans" (confidence: 100, flags: ["CarBrandOfCityPattern", "BrandOfPatternMatched", "AutoPatternBypass"])
- "cadillacoflasvegas.com" → "Cadillac Las Vegas" (confidence: 100, flags: ["CarBrandOfCityPattern", "BrandOfPatternMatched", "AutoPatternBypass"])
- "kiaoflagrange.com" → "Kia Lagrange" (confidence: 100, flags: ["CarBrandOfCityPattern", "BrandOfPatternMatched", "AutoPatternBypass"])
*/

export const config = { api: { bodyParser: false } };
