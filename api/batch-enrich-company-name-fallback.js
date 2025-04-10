// api/company-name-fallback.js — Version 1.0.21
// April 15, 2025 - Fallback API for domain enrichment

import { humanizeName, extractBrandOfCityFromDomain, applyCityShortName } from "./lib/humanize.js";
import { callOpenAI } from "./lib/openai.js";

// Constants for API configuration
const BATCH_SIZE = 5;
const CONCURRENCY_LIMIT = 5;
const PROCESSING_TIMEOUT_MS = 18000;
const HUMANIZE_ATTEMPTS = 2;
const HUMANIZE_RETRY_DELAY_MS = 500;

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
const streamToString = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const timeout = setTimeout(() => reject(new Error("Stream read timeout")), 5000);

    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => {
      clearTimeout(timeout);
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });
    stream.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

// Validate incoming leads and return a list of valid leads
const validateLeads = (leads) => {
  const validatedLeads = [];
  const validationErrors = [];

  if (!Array.isArray(leads) || leads.length === 0) {
    throw new Error("Missing or invalid leads array");
  }

  leads.forEach((lead, index) => {
    if (!lead || typeof lead !== "object" || !lead.domain) {
      validationErrors.push(`Index ${index} invalid: must be an object with a domain property`);
      return;
    }

    const domain = lead.domain.trim().toLowerCase();
    validatedLeads.push({ domain, rowNum: lead.rowNum || index + 1 });
  });

  return { validatedLeads, validationErrors };
};

// Process a single lead (domain enrichment logic)
const processLead = async (lead, fallbackTriggers) => {
  const { domain, rowNum } = lead;
  const domainLower = domain.toLowerCase();
  console.error(`🌀 Fallback processing row ${rowNum}: ${domain}`);

  let result;
  let tokensUsed = 0;
  let gptUsed = false;

  const { brand: brandDetected, city: cityDetected } = extractBrandOfCityFromDomain(domainLower);

  // Attempt to humanize the domain name with retries
  for (let attempt = 1; attempt <= HUMANIZE_ATTEMPTS; attempt++) {
    try {
      result = await humanizeName(domainLower, domainLower, false, true);
      tokensUsed = result.tokens || 0;
      break;
    } catch (err) {
      console.error(`⚠️ Attempt ${attempt} failed for ${domain}: ${err.message}`);
      if (attempt === HUMANIZE_ATTEMPTS) {
        result = {
          name: "",
          confidenceScore: 0,
          flags: ["ProcessingError"],
          tokens: 0,
        };
        fallbackTriggers.push({
          domain,
          rowNum,
          reason: "ProcessingError",
          details: { error: err.message },
          tokens: 0,
        });
      }
      await new Promise((res) => setTimeout(res, HUMANIZE_RETRY_DELAY_MS));
    }
  }

  result.flags = Array.isArray(result.flags) ? result.flags : [];
  result.flags.push("FallbackAPIUsed");

  const criticalFlags = ["TooGeneric", "CityNameOnly", "Skipped", "FallbackFailed", "PossibleAbbreviation"];
  const forceReviewFlags = [
    "TooGeneric",
    "CityNameOnly",
    "PossibleAbbreviation",
    "BadPrefixOf",
    "CarBrandSuffixRemaining",
    "NotPossessiveFriendly",
    "UnverifiedCity",
  ];

  const isAcceptable = result.confidenceScore >= 75 && !result.flags.some((f) => criticalFlags.includes(f));

  // OpenAI readability validation (only if every word is initials)
  if (process.env.OPENAI_API_KEY && result.name.split(" ").every((w) => /^[A-Z]{1,3}$/.test(w))) {
    const prompt = `Is "${result.name}" readable and natural as a company name in "{Company}'s CRM isn't broken—it’s bleeding"? Respond with {"isReadable": true/false, "isConfident": true/false}`;
    try {
      const response = await callOpenAI({ prompt, maxTokens: 40 });
      gptUsed = true;
      tokensUsed += response.tokens || 0;

      let parsed;
      try {
        parsed = JSON.parse(response.output);
      } catch (err) {
        console.error(`Failed to parse OpenAI response for ${domain}: ${err.message}`);
        parsed = { isReadable: true, isConfident: false };
      }

      if (!parsed.isReadable && parsed.isConfident) {
        const cityName = cityDetected ? applyCityShortName(cityDetected) : result.name.split(" ")[0];
        result.name = `${cityName} ${brandDetected || result.name.split(" ")[1] || "Auto"}`;
        result.flags.push("InitialsExpanded");
        result.confidenceScore -= 5;
      }
    } catch (err) {
      console.error(`OpenAI readability check failed for ${domain}: ${err.message}`);
      result.flags.push("OpenAIError");
    }
  }

  // Check if the result needs manual review
  if (!isAcceptable || result.flags.some((f) => forceReviewFlags.includes(f))) {
    return {
      manualReview: {
        domain,
        name: result.name,
        confidenceScore: result.confidenceScore,
        flags: result.flags,
        rowNum,
        tokens: tokensUsed,
      },
      result: {
        domain,
        companyName: result.name || "",
        confidenceScore: Math.max(result.confidenceScore, 50),
        flags: [...result.flags, "LowConfidence"],
        tokens: tokensUsed,
        rowNum,
      },
      tokensUsed,
      gptUsed,
    };
  }

  return {
    manualReview: null,
    result: {
      domain,
      companyName: result.name,
      confidenceScore: result.confidenceScore,
      flags: result.flags,
      tokens: tokensUsed,
      rowNum,
    },
    tokensUsed,
    gptUsed,
  };
};

// Main handler function for the API
export default async function handler(req, res) {
  try {
    console.error("🛟 batch-enrich-company-name-fallback.js v1.0.21");

    // Check for required environment variables
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ Missing OPENAI_API_KEY env var");
      return res.status(500).json({ error: "Missing OpenAI API key" });
    }

    // Parse the request body
    const rawBody = await streamToString(req);
    if (!rawBody) {
      return res.status(400).json({ error: "Empty request body" });
    }

    const body = JSON.parse(rawBody);
    console.error(`📥 Received fallback batch: ${body.leads?.length || 0} leads`);

    // Validate leads
    const { validatedLeads, validationErrors } = validateLeads(body.leads || body.leadList || body.domains);
    if (validatedLeads.length === 0) {
      return res.status(400).json({ error: "No valid leads to process", details: validationErrors });
    }

    const concurrencyLimit = pLimit(CONCURRENCY_LIMIT);
    const startTime = Date.now();
    const successful = [];
    const manualReviewQueue = [];
    const fallbackTriggers = [];
    let totalTokens = 0;

    // Process leads in chunks
    const leadChunks = Array.from({ length: Math.ceil(validatedLeads.length / BATCH_SIZE) }, (_, i) =>
      validatedLeads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    for (const chunk of leadChunks) {
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
        chunk.map((lead) => concurrencyLimit(() => processLead(lead, fallbackTriggers)))
      );

      results.forEach(({ manualReview, result, tokensUsed }) => {
        if (manualReview) {
          manualReviewQueue.push(manualReview);
        }
        successful.push(result);
        totalTokens += tokensUsed;
      });
    }

    console.error(
      `✅ Fallback complete: ${successful.length} enriched, ${manualReviewQueue.length} for manual review, ${fallbackTriggers.length} triggers, ${totalTokens} tokens used`
    );

    return res.status(200).json({
      successful,
      manualReviewQueue,
      fallbackTriggers,
      totalTokens,
      partial: false,
    });
  } catch (err) {
    console.error(`❌ Fallback handler failed: ${err.message}\n${err.stack}`);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}

// Disable body parser to handle stream manually
export const config = {
  api: {
    bodyParser: false,
  },
};
