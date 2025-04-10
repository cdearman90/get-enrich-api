// api/company-name-fallback.js — Version 1.0.24
import { humanizeName, extractBrandOfCityFromDomain, applyCityShortName } from "./lib/humanize.js";
import { callOpenAI } from "./lib/openai.js";

// Constants for API configuration
const BATCH_SIZE = 10;
const CONCURRENCY_LIMIT = 5;
const PROCESSING_TIMEOUT_MS = 18000;

// Known sets (for local expansion, aligned with humanize.js)
const KNOWN_CITY_SHORT_NAMES = {
  "las vegas": "Vegas", "los angeles": "LA", "new york": "NY", "new orleans": "N.O.", "miami lakes": "Miami Lakes",
  "orlando": "Orlando", "new york city": "NYC", "austin": "Austin",
  "brookhaven": "Brookhaven", "redlands": "Redlands", "lakeway": "Lakeway",
  "killeen": "Killeen", "tuscaloosa": "Tuscaloosa", "milwaukeenorth": "Milwaukee North",
  "manhattan": "Manhattan", "fairoaks": "Fair Oaks", "northborough": "Northborough",
  "columbia": "Columbia", "freeport": "Freeport", "wakefield": "Wakefield",
  "gwinnett": "Gwinnett", "elyria": "Elyria", "kingsport": "Kingsport",
  "bloomington": "Bloomington", "alhambra": "Alhambra", "slidell": "Slidell",
  "shelbyville": "Shelbyville"
};

const BRAND_MAPPING = {
  "mercedes-benz": "M.B.", "volkswagen": "VW", "chevrolet": "Chevy", "toyota": "Toyota", "ford": "Ford"
};

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

// Check if a name is initials-only
const isInitialsOnly = (name) => {
  const words = name.split(" ");
  return words.every(w => /^[A-Z]{1,3}$/.test(w));
};

// Expand initials-only names using domain context
const expandInitials = (name, domain, brandDetected, cityDetected) => {
  let expanded = [];
  const words = name.split(" ");

  words.forEach(word => {
    if (/^[A-Z]{1,3}$/.test(word)) {
      const cityMatch = Object.entries(KNOWN_CITY_SHORT_NAMES).find(([full, short]) => short.toUpperCase() === word);
      const nounMatch = Object.entries(BRAND_MAPPING).find(([full, short]) => short.toUpperCase() === word);

      if (cityMatch) {
        expanded.push(cityMatch[1]);
      } else if (nounMatch) {
        expanded.push(nounMatch[1]);
      } else if (cityDetected && word === cityDetected.toUpperCase().slice(0, word.length)) {
        expanded.push(applyCityShortName(cityDetected));
      } else if (brandDetected && word === brandDetected.toUpperCase().slice(0, word.length)) {
        expanded.push(brandDetected);
      } else {
        const domainParts = domain.split(".")[0].split(/[^a-zA-Z]/);
        const matchingPart = domainParts.find(part => part.toUpperCase().startsWith(word));
        expanded.push(matchingPart ? matchingPart.charAt(0).toUpperCase() + matchingPart.slice(1) : word);
      }
    } else {
      expanded.push(word);
    }
  });

  return expanded.join(" ");
};

// Process a single lead (domain enrichment logic)
const processLead = async (lead, fallbackTriggers) => {
  const { domain, rowNum } = lead;
  const domainLower = domain.toLowerCase();
  console.error(`🌀 Fallback processing row ${rowNum}: ${domain}`);

  let result;
  let tokensUsed = 0;
  let gptUsed = false;

  const match = extractBrandOfCityFromDomain(domainLower);
  const brandDetected = match.brand || null;
  const cityDetected = match.city || null;

  // Attempt to humanize the domain name
  try {
    result = await humanizeName(domain, domain, true);
    tokensUsed = result.tokens || 0;
    console.error(`humanizeName result for ${domain}: ${JSON.stringify(result)}`);
  } catch (_err) {
    console.error(`humanizeName error for ${domain}: ${_err.message}`);
    result = { name: "", confidenceScore: 0, flags: ["HumanizeError"], tokens: 0 };
  }

  result.flags = Array.isArray(result.flags) ? result.flags : [];
  result.flags.push("FallbackAPIUsed");

  const criticalFlags = ["TooGeneric", "CityNameOnly", "Skipped", "FallbackFailed", "PossibleAbbreviation"];
  const forceReviewFlags = [
    "TooGeneric", "CityNameOnly", "PossibleAbbreviation", "BadPrefixOf", "CarBrandSuffixRemaining",
    "UnverifiedCity"
  ];

  const isAcceptable = result.confidenceScore >= 75 && !result.flags.some(f => criticalFlags.includes(f));

  // Local initials expansion before OpenAI
  if (isInitialsOnly(result.name)) {
    const expandedName = expandInitials(result.name, domain, brandDetected, cityDetected);
    if (expandedName !== result.name) {
      result.name = expandedName;
      result.flags.push("InitialsExpandedLocally");
      result.confidenceScore -= 5;
    }
  }

  // OpenAI readability validation (only as a last resort)
  if (process.env.OPENAI_API_KEY && isInitialsOnly(result.name)) {
    console.error(`Triggering OpenAI readability validation for ${result.name}`);
    const prompt = `Return a JSON object in the format {"isReadable": true/false, "isConfident": true/false} indicating whether "${result.name}" is readable and natural as a company name in the sentence "{Company}'s CRM isn't broken—it's bleeding". Do not include any additional text outside the JSON object.`;
    try {
      const response = await callOpenAI({ prompt, maxTokens: 40 });
      gptUsed = true;
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
        const cityName = cityDetected ? applyCityShortName(cityDetected) : result.name.split(" ")[0];
        result.name = `${cityName} ${brandDetected || result.name.split(" ")[1] || "Auto"}`;
        result.flags.push("InitialsExpandedByOpenAI");
        result.confidenceScore -= 5;
      }
    } catch (err) {
      console.error(`OpenAI readability check failed for ${domain}: ${err.message}`);
      result.flags.push("OpenAIError");
    }
  } else {
    console.error(`Skipping OpenAI readability validation for ${result.name}`);
  }

  // Boost confidence for known patterns
  if (
    Object.values(KNOWN_CITY_SHORT_NAMES).some(city => result.name.includes(city)) ||
    Object.values(BRAND_MAPPING).some(brand => result.name.includes(brand))
  ) {
    result.confidenceScore += 5;
    result.flags.push("ConfidenceBoosted");
  }

  // Log fallback trigger reason
  if (!isAcceptable) {
    fallbackTriggers.push({
      domain,
      rowNum,
      reason: "UnacceptableResult",
      details: {
        confidenceScore: result.confidenceScore,
        flags: result.flags,
        brand: brandDetected,
        city: cityDetected
      },
      tokens: tokensUsed
    });
  }

  if (!isAcceptable || result.flags.some(f => forceReviewFlags.includes(f))) {
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
    console.error("🛟 company-name-fallback.js v1.0.24 – Fallback Processing Start");

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
        totalTokens += tokensUsed || 0;
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
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
}

// Disable body parser to handle stream manually
export const config = {
  api: {
    bodyParser: false,
  },
};
