// api/batch-enrich-company-name-fallback.js (Version 1.0.19 - Optimized 2025-04-12)
// Changes:
// - Synced with humanize.js: removed TooGeneric for single-word proper nouns, added TooVerbose penalty
// - Adjusted OpenAI initials expansion to use updated scoring
// - Bumped version to 1.0.19

import { humanizeName, extractBrandOfCityFromDomain, applyCityShortName, earlyCompoundSplit } from "./lib/humanize.js";
import { callOpenAI } from "./lib/openai.js";

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
    return "";
  }
};

// Capitalize name (synced with humanize.js)
const capitalizeName = (words) => {
  if (typeof words === "string") words = words.split(/\s+/).filter(word => word);
  return words.map((word, i) => {
    if (word.toLowerCase() === "chevrolet") return "Chevy";
    if (["of", "and"].includes(word.toLowerCase()) && i !== 0) return word.toLowerCase();
    if (/^[A-Z]{2,5}$/.test(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(" ");
};

// Entry point
export default async function handler(req, res) {
  console.log("batch-enrich-company-name-fallback.js Version 1.0.19 - Optimized 2025-04-12");

  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("Missing OPENAI_API_KEY environment variable");
      return res.status(500).json({ error: "Server configuration error", details: "Missing OPENAI_API_KEY" });
    }

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

    if (!body || typeof body !== "object") {
      console.error("Request body is missing or not an object");
      return res.status(400).json({ error: "Request body is missing or not an object" });
    }

    const leads = body.leads || body.leadList || body.domains;
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      console.error("Invalid or empty leads array");
      return res.status(400).json({ error: "Invalid or empty leads array" });
    }

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

          if (Date.now() - startTime > 18000) {
            console.log(`Row ${rowNum}: Skipped due to overall timeout`);
            return { domain, companyName: "", confidenceScore: 0, flags: ["SkippedDueToTimeout"], rowNum, tokens: 0 };
          }

          const domainLower = domain.toLowerCase();
          console.log(`Processing fallback for ${domain} (Row ${rowNum})`);

          let finalResult;
          let tokensUsed = 0;
          const normalizedMatch = extractBrandOfCityFromDomain(domainLower);
          const brandDetected = normalizedMatch?.brand || null;
          const cityDetected = normalizedMatch?.city || null;

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
            "TooGeneric", "CityNameOnly", "PossibleAbbreviation", "BadPrefixOf", "CarBrandSuffixRemaining",
            "NotPossessiveFriendly", "UnverifiedCity"
          ];
          const isAcceptable = finalResult.confidenceScore >= 75 && !finalResult.flags.some(f => criticalFlags.includes(f));

          // Check for unreadable initials (e.g., "LV BA")
          if (process.env.OPENAI_API_KEY && finalResult.name.split(" ").every(w => /^[A-Z]{1,3}$/.test(w))) {
            const prompt = `Is "${finalResult.name}" readable and natural as a company name in "{Company}'s CRM isn't broken—it’s bleeding"? Respond with {"isReadable": true/false, "isConfident": true/false}`;
            const response = await callOpenAI({ prompt, maxTokens: 40 });
            tokensUsed += response.tokens || 0;
            const parsed = safeParseGPTJson(response.text, { isReadable: true, isConfident: false });
            if (!parsed.isReadable && parsed.isConfident) {
              const fullCity = cityDetected ? applyCityShortName(cityDetected) : finalResult.name.split(" ")[0];
              finalResult.name = `${fullCity} ${brandDetected || finalResult.name.split(" ")[1] || "Auto"}`;
              finalResult.flags.push("InitialsExpanded");
              finalResult.confidenceScore -= 5;
              console.log(`Row ${rowNum}: Expanded unreadable initials: ${finalResult.name}`);
            }
          }

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
              confidenceScore: Math.max(finalResult.confidenceScore, 50),
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

function safeParseGPTJson(raw, fallbackObj) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Malformed GPT JSON:", raw);
    return fallbackObj;
  }
}

/*
Manual Test for CarBrandOfCity Domains
Expected: All domains resolve with short names where applicable, relying on pattern matching.
- "toyotaofslidell.net" → "Slidell Toyota" (confidence: 100, flags: ["PatternMatched", "CarBrandOfCityPattern"])
- "lexusofneworleans.com" → "N.O. Lexus" (confidence: 100, flags: ["PatternMatched", "CarBrandOfCityPattern"])
- "cadillacoflasvegas.com" → "Vegas Cadillac" (confidence: 100, flags: ["PatternMatched", "CarBrandOfCityPattern"])
- "kiaoflagrange.com" → "Lagrange Kia" (confidence: 100, flags: ["PatternMatched", "CarBrandOfCityPattern"])
*/

export const config = { api: { bodyParser: false } };
