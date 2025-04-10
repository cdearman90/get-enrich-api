// api/batch-enrich.js — Version 4.2.0 (Final)
// April 15, 2025 - Aligned with updated humanize.js and all OpenAI/fallback logic

import { humanizeName, extractBrandOfCityFromDomain, applyCityShortName } from "./lib/humanize.js";
import { callOpenAI } from "./lib/openai.js";

// Constants for API configuration
const VERCEL_API_BASE_URL = "https://get-enrich-api-git-main-show-revv.vercel.app";
const FALLBACK_API_URL = `${VERCEL_API_BASE_URL}/api/batch-enrich-company-name-fallback`;
const FALLBACK_API_TIMEOUT_MS = parseInt(process.env.FALLBACK_API_TIMEOUT_MS, 10) || 6000;
const BATCH_SIZE = 5;
const CONCURRENCY_LIMIT = 5;
const PROCESSING_TIMEOUT_MS = 18000;

// Cache for storing processed domains
const domainCache = new Map();

// Utility to limit concurrency for parallel operations
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

// Utility to convert a stream to a string
const streamToString = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const timeout = setTimeout(() => reject(new Error("Stream timeout")), 5000);

    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      clearTimeout(timeout);
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });
    req.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

// Fallback API call to enrich a domain
const callFallbackAPI = async (domain, rowNum) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FALLBACK_API_TIMEOUT_MS);

    const response = await fetch(FALLBACK_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leads: [{ domain, rowNum }] }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const text = await response.text();
    const data = JSON.parse(text);

    if (!response.ok || !data.successful?.[0]) {
      throw new Error(`Fallback error ${response.status}: ${data.error || text}`);
    }

    const result = data.successful[0];
    return {
      domain: result.domain || domain,
      companyName: result.companyName || "",
      confidenceScore: result.confidenceScore || 0,
      flags: Array.isArray(result.flags) ? result.flags : ["InvalidFallbackResponse"],
      tokens: result.tokens || 0,
      rowNum,
    };
  } catch (err) {
    console.error(`Fallback API failed for domain ${domain}: ${err.message}`);
    try {
      const local = await humanizeName(domain, domain, false, true);
      return {
        domain,
        companyName: local.name || "",
        confidenceScore: local.confidenceScore || 0,
        flags: [...(local.flags || []), "FallbackAPIFailed", "LocalFallbackUsed"],
        tokens: local.tokens || 0,
        rowNum,
        error: err.message,
      };
    } catch (fallbackErr) {
      console.error(`Fallback humanizeName failed for domain ${domain}: ${fallbackErr.message}`);
      return {
        domain,
        companyName: "",
        confidenceScore: 0,
        flags: ["FallbackAPIFailed", "LocalFallbackFailed"],
        tokens: 0,
        rowNum,
        error: fallbackErr.message,
      };
    }
  }
};

// Validate incoming leads and return a list of valid leads
const validateLeads = (leads) => {
  const validatedLeads = [];
  const validationErrors = [];

  if (!Array.isArray(leads)) {
    throw new Error("Leads must be an array");
  }

  leads.forEach((lead, index) => {
    if (!lead || typeof lead !== "object" || !lead.domain) {
      validationErrors.push(`Index ${index} not object`);
      return;
    }

    const domain = (lead.domain || "").trim().toLowerCase();
    if (!domain) {
      validationErrors.push(`Index ${index} missing domain`);
      return;
    }

    validatedLeads.push({ domain, rowNum: lead.rowNum || index + 1 });
  });

  return { validatedLeads, validationErrors };
};

// Process a single lead (domain enrichment logic)
const processLead = async (lead, domainCache, fallbackTriggers) => {
  const { domain, rowNum } = lead;
  const domainKey = domain.toLowerCase();
  console.error(`🌀 Processing row ${rowNum}: ${domain}`);

  let finalResult;
  let tokensUsed = 0;
  const match = extractBrandOfCityFromDomain(domainKey);
  const brandDetected = match.brand || null;
  const cityDetected = match.city || null;

  // Attempt to humanize the domain name
  try {
    finalResult = await humanizeName(domain, domain, false, true);
    tokensUsed = finalResult.tokens || 0;
    console.error(`humanizeName result for ${domain}: ${JSON.stringify(finalResult)}`);
  } catch (_err) {
    console.error(`humanizeName error for domain ${domain}: ${_err.message}`);
    finalResult = { name: "", confidenceScore: 0, flags: ["HumanizeError"], tokens: 0 };
  }

  // Check quality of the result
  const criticalFlags = ["TooGeneric", "CityNameOnly", "FallbackFailed", "Skipped"];
  const isAcceptable = finalResult.confidenceScore >= 75 && !finalResult.flags.some((f) => criticalFlags.includes(f));

  if (isAcceptable) {
    domainCache.set(domainKey, {
      companyName: finalResult.name,
      confidenceScore: finalResult.confidenceScore,
      flags: finalResult.flags,
    });
  } else {
    const primary = { ...finalResult };
    const fallback = await callFallbackAPI(domain, rowNum);

    if (fallback.companyName && fallback.confidenceScore >= 75 && !fallback.flags.some((f) => criticalFlags.includes(f))) {
      finalResult = {
        ...fallback,
        flags: [...(fallback.flags || []), "FallbackAPIUsed"],
        rowNum,
      };
      tokensUsed += fallback.tokens || 0;
    } else {
      finalResult.flags.push("FallbackAPIFailed");
      fallbackTriggers.push({
        domain,
        rowNum,
        reason: "FallbackAPIFailed",
        details: {
          primary: {
            name: primary.name,
            confidenceScore: primary.confidenceScore,
            flags: primary.flags,
          },
          fallbackScore: fallback.confidenceScore,
          fallbackFlags: fallback.flags,
          brand: brandDetected,
          city: cityDetected,
        },
        tokens: tokensUsed,
      });
    }
  }

  // Add to manual review if the result is weak
  const reviewFlags = ["TooGeneric", "CityNameOnly", "PossibleAbbreviation", "NotPossessiveFriendly"];
  if (finalResult.confidenceScore < 75 || finalResult.flags.some((f) => reviewFlags.includes(f))) {
    console.error(`Flagging for manual review: ${JSON.stringify(finalResult)}`);
    return {
      manualReview: {
        domain,
        name: finalResult.name,
        confidenceScore: finalResult.confidenceScore,
        flags: finalResult.flags,
        rowNum,
      },
      result: {
        domain,
        companyName: finalResult.name || "",
        confidenceScore: Math.max(finalResult.confidenceScore, 50),
        flags: [...finalResult.flags, "LowConfidence"],
        rowNum,
      },
      tokensUsed,
    };
  }

  // OpenAI readability validation (only if every word is initials)
  if (
    process.env.OPENAI_API_KEY &&
    typeof finalResult.name === "string" &&
    finalResult.name.split(" ").every((w) => /^[A-Z]{1,3}$/.test(w))
  ) {
    console.error(`Triggering OpenAI readability validation for ${finalResult.name}`);
    const prompt = `Return a JSON object in the format {"isReadable": true/false, "isConfident": true/false} indicating whether "${finalResult.name}" is readable and natural in the sentence "{Company}'s CRM isn't broken—it’s bleeding". Do not include any additional text outside the JSON object.`;
    try {
      const response = await callOpenAI({ prompt, maxTokens: 40 });
      tokensUsed += response.tokens || 0;

      let parsed;
      try {
        console.error(`Raw OpenAI response for ${domain}: ${response.output}`);
        parsed = JSON.parse(response.output || "{}");
      } catch (err) {
        console.error(`Failed to parse OpenAI response for ${domain}: ${err.message}`);
        parsed = { isReadable: true, isConfident: false };
      }

      if (!parsed.isReadable && parsed.isConfident) {
        const safeName = typeof finalResult.name === "string" ? finalResult.name : "";
        if (!safeName) {
          finalResult.name = "Generic Auto";
          finalResult.confidenceScore = 50;
          finalResult.flags.push("EmptyCompanyNameFallback");
        } else {
          const fallbackCity = cityDetected ? applyCityShortName(cityDetected) : safeName.split(" ")[0];
          const fallbackBrand = brandDetected || safeName.split(" ")[1] || "Auto";
          finalResult.name = `${fallbackCity} ${fallbackBrand}`;
          finalResult.flags.push("InitialsExpanded");
          finalResult.confidenceScore -= 5;
        }
      }
    } catch (err) {
      console.error(`OpenAI readability check failed for ${domain}: ${err.message}`);
      finalResult.flags.push("OpenAIError");
    }
  } else {
    console.error(`Skipping OpenAI readability validation for ${finalResult.name}`);
  }

  // Cache the final result
  domainCache.set(domainKey, {
    companyName: finalResult.name,
    confidenceScore: finalResult.confidenceScore,
    flags: finalResult.flags,
  });

  return {
    manualReview: null,
    result: {
      domain,
      companyName: finalResult.name,
      confidenceScore: finalResult.confidenceScore,
      flags: finalResult.flags,
      rowNum,
      tokens: tokensUsed,
    },
    tokensUsed,
  };
};

// Main handler function for the API
export default async function handler(req, res) {
  try {
    console.error("🧠 batch-enrich.js v4.2.0 – Domain Processing Start");

    // Check for required environment variables
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ Missing OPENAI_API_KEY env var");
      return res.status(500).json({ error: "Missing OpenAI API key" });
    }

    // Parse the request body
    const raw = await streamToString(req);
    if (!raw) {
      return res.status(400).json({ error: "Empty body" });
    }
    const body = JSON.parse(raw);

    // Validate leads
    const { validatedLeads, validationErrors } = validateLeads(body.leads || body.leadList || body.domains);
    if (validatedLeads.length === 0) {
      return res.status(400).json({ error: "No valid leads", details: validationErrors });
    }

    const limit = pLimit(CONCURRENCY_LIMIT);
    const startTime = Date.now();
    const successful = [];
    const manualReviewQueue = [];
    const fallbackTriggers = [];
    let totalTokens = 0;

    // Process leads in chunks
    const chunks = Array.from({ length: Math.ceil(validatedLeads.length / BATCH_SIZE) }, (_, i) =>
      validatedLeads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    for (const chunk of chunks) {
      if (Date.now() - startTime > PROCESSING_TIMEOUT_MS) {
        console.error("Processing timeout reached, returning partial results");
        return res.status(200).json({
          successful,
          manualReviewQueue,
          fallbackTriggers,
          totalTokens,
          partial: true,
        });
      }

      const results = await Promise.all(
        chunk.map((lead) => limit(() => processLead(lead, domainCache, fallbackTriggers)))
      );

      results.forEach(({ manualReview, result, tokensUsed }) => {
        if (manualReview) {
          manualReviewQueue.push(manualReview);
        }
        successful.push(result);
        totalTokens += tokensUsed || 0; // Ensure tokensUsed is a number
      });
    }

    console.error(
      `Batch complete: ${successful.length} enriched, ${manualReviewQueue.length} to review, ${fallbackTriggers.length} fallbacks, ${totalTokens} tokens used`
    );

    return res.status(200).json({
      successful,
      manualReviewQueue,
      fallbackTriggers,
      totalTokens: totalTokens || 0, // Ensure totalTokens is a number
      partial: false,
    });
  } catch (err) {
    console.error(`❌ Handler error: ${err.message}\n${err.stack}`);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
}

// Disable body parser to handle stream manually
export const config = {
  api: {
    bodyParser: false,
  },
};
