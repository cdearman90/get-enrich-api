// api/batch-enrich.js v4.2.51
import {
  humanizeName,
  capitalizeName,
  earlyCompoundSplit,
  fallbackName,
  CAR_BRANDS_CACHE,
  clearOpenAICache,
  BRAND_MAPPING,
  PROPER_NOUNS_CACHE,
  KNOWN_LAST_NAMES_CACHE,
  KNOWN_CITIES_SET_CACHE // Added
} from "./batch-enrich-company-name-fallback.js";

import winston from "winston";
import path from "path";
import fs from "fs";
import { buffer } from "micro";

// Disable Vercel's default body parser for manual parsing in vercel dev mode
export const config = {
  api: {
    bodyParser: false
  }
};

const MULTI_WORD_CITIES = new Map([
  ["redwood city", "Redwood City"],
  ["coral gables", "Coral Gables"],
  ["st pete", "St. Pete"],
  ["new smyrna", "New Smyrna"],
  ["open road", "Open Road"],
  ["rocky mountain", "Rocky Mountain"],
  ["big horn", "Big Horn"],
  ["fair oaks", "Fair Oaks"],
  ["golf mill", "Golf Mill"],
  ["wide world", "Wide World"],
  ["north park", "North Park"],
  ["northbakersfield", "North Bakersfield"],
  ["ofallon", "O'Fallon"],
  ["new smyrna beach", "New Smyrna Beach"],
  ["st pete beach", "St. Pete Beach"],
  ["palm coast", "Palm Coast"],
  ["newport beach", "Newport Beach"],
  ["palo alto", "Palo Alto"],
  ["santa barbara", "Santa Barbara"],
  ["north miami", "North Miami"],
  ["miami lakes", "Miami Lakes"],
  ["toms river", "Toms River"],
  ["lake charles", "Lake Charles"],
  ["oak ridge", "Oak Ridge"]
]);

const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Ensure logs directory exists
const logDir = path.join(process.cwd(), "logs");
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    logger.info("Created logs directory", { logDir });
  }
} catch (err) {
  logger.error("Failed to create logs directory", { error: err.message, stack: err.stack });
}

// Log server startup
logger.info("Module loading started", { version: "4.2.51" });

const CONCURRENCY_LIMIT = 1; // Align with project optimization to avoid rate limits

// Verify dependencies
const dependencies = {
  humanizeName: typeof humanizeName === "function",
  capitalizeName: typeof capitalizeName === "function",
  earlyCompoundSplit: typeof earlyCompoundSplit === "function",
  fallbackName: typeof fallbackName === "function",
  clearOpenAICache: typeof clearOpenAICache === "function"
};
logger.debug("Dependency check", { dependencies });

// Define concurrency limiter
const concurrencyLimit = (fn) => new Promise((resolve) => {
  const execute = async () => {
    try {
      resolve(await fn());
    } catch (error) {
      logger.error("Concurrency limit execution failed", {
        error: error.message,
        stack: error.stack
      });
      resolve({
        domain: "unknown",
        companyName: "",
        confidenceScore: 0,
        flags: ["ConcurrencyError", "ManualReviewRecommended"],
        tokens: 0,
        rowNum: "unknown",
        openAIErrors: 0,
        fetchDuration: 0
      });
    }
  };
  const queue = [];
  let active = 0;
  const next = () => {
    if (active < CONCURRENCY_LIMIT && queue.length > 0) {
      active++;
      const task = queue.shift();
      task().finally(() => {
        active--;
        next();
      });
    }
  };
  queue.push(execute);
  next();
});

// Cache with TTL support
const domainCache = new Map();
const processedDomains = new Set();

// Retry constants
const RETRY_ATTEMPTS = 3; // Increased to 3 for better transient error handling
const RETRY_DELAY_MS = 1000; // Reduced to 1000ms for faster retries

// Custom rate limiter for Vercel (aligned with OpenAI's 60 requests/minute limit)
const requestTimestamps = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // Reduced to 60 to align with OpenAI limit

function checkRateLimit(req) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown-ip";
  const now = Date.now();
  const timestamps = requestTimestamps.get(ip) || [];

  // Remove timestamps older than the window
  const recentTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  requestTimestamps.set(ip, recentTimestamps);

  if (recentTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    logger.warn("Rate limit exceeded for IP", {
      ip,
      requestCount: recentTimestamps.length,
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
      rejectedReason: "Too many requests within rate limit window"
    });
    return false; // Rate limit exceeded
  }

  recentTimestamps.push(now);
  requestTimestamps.set(ip, recentTimestamps);
  return true;
}

/**
 * Calls fallback logic using fallbackName
 * @param {string} domain - Domain to enrich
 * @param {number|string} rowNum - Row number for logging context
 * @param {Object} meta - Metadata (e.g., title, city, brand)
 * @returns {Promise<Object>} - Fallback result with companyName, confidenceScore, flags, tokens, openAIErrors
 */
// batch-enrich-company-name-fallback.js
async function callFallbackAPI(domain, rowNum, meta = {}) {
  logger.debug("callFallbackAPI started", { domain, rowNum, city: meta.city, brand: meta.brand });

  try {
    // Use CAR_BRANDS_CACHE to check for brand-only domains
    const domainPrefix = domain.toLowerCase().split(".")[0];
    if (CAR_BRANDS_CACHE.has(domainPrefix)) {
      logger.info("Brand-only domain skipped in callFallbackAPI", {
        domain,
        rowNum,
        city: meta.city,
        brand: meta.brand,
        name: null,
        rejectedReason: "Brand-only domain detected"
      });
      return {
        domain,
        companyName: "",
        confidenceScore: 0,
        flags: ["BrandOnlyDomainSkipped"],
        tokens: 0,
        rowNum,
        openAIErrors: 0
      };
    }

    // Define pattern for validation (aligned with project)
    const pattern = /^[A-Z][a-zA-Z]*(\s[A-Z][a-zA-Z]*)*$/;

    // Extract city and brand from meta if provided
    const options = {
      title: meta.title,
      rowNum,
      city: meta.city || "Unknown",
      brand: meta.brand || "Unknown"
    };

    let lastError;
    let openAIErrors = 0;
    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        logger.debug(`Attempt ${attempt} to call fallback`, {
          domain,
          rowNum,
          attempt,
          city: options.city,
          brand: options.brand,
          name: null
        });
        const fallback = await fallbackName(domain, options);

        logger.debug("Fallback result", {
          domain,
          rowNum,
          fallback,
          city: options.city,
          brand: options.brand,
          name: fallback.companyName
        });

        // Track OpenAI errors from fallbackName
        if (fallback.flags && fallback.flags.includes("OpenAIScoringFailed")) {
          openAIErrors++;
        }

        // Clean and reformat name if it fails the pattern
        let companyName = fallback.companyName;
        if (companyName && !pattern.test(companyName)) {
          let tokens = companyName.trim().replace(/\s+/g, " ").replace(/[^a-zA-Z\s]/g, "").split(" ").filter(Boolean);
          tokens = tokens.map(token => {
            const lowerToken = token.toLowerCase();
            if (CAR_BRANDS_CACHE.has(lowerToken) && BRAND_MAPPING[lowerToken]) {
              return BRAND_MAPPING[lowerToken];
            }
            if (PROPER_NOUNS_CACHE.has(lowerToken) || KNOWN_LAST_NAMES_CACHE.has(lowerToken)) {
              return lowerToken.charAt(0).toUpperCase() + lowerToken.slice(1);
            }
            return lowerToken.charAt(0).toUpperCase() + lowerToken.slice(1);
          });
          companyName = tokens.join(" ");
          if (!pattern.test(companyName)) {
            logger.warn("callFallbackAPI result pattern validation failed after reformatting", {
              domain,
              rowNum,
              companyName,
              city: options.city,
              brand: options.brand,
              name: companyName,
              rejectedReason: "Invalid format after reformatting"
            });
            companyName = "";
            fallback.flags.push("PatternValidationFailed");
            fallback.confidenceScore = 0;
          } else {
            fallback.flags.push("ReformattedName");
          }
        }

        return {
          domain,
          companyName: companyName || "",
          confidenceScore: companyName ? fallback.confidenceScore : 0,
          flags: ["FallbackAPIUsed", ...fallback.flags],
          tokens: fallback.tokens || 0,
          rowNum,
          openAIErrors
        };
      } catch (error) {
        lastError = error;
        logger.warn(`Fallback attempt ${attempt} failed`, {
          domain,
          rowNum,
          error: error.message,
          stack: error.stack,
          city: options.city,
          brand: options.brand,
          name: null
        });
        // Check for OpenAI-specific errors
        if (error.message.includes("OpenAI")) {
          openAIErrors++;
        }
        // Handle transient errors (rate limits, 503, network timeouts)
        if ((error.message.includes("rate limit") || error.status === 503 || error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") && attempt < RETRY_ATTEMPTS) {
          const backoffTime = RETRY_DELAY_MS * attempt;
          logger.info(`Transient error detected, retrying after delay [Row ${rowNum}]`, {
            domain,
            rowNum,
            attempt,
            delay: backoffTime,
            city: options.city,
            brand: options.brand,
            name: null
          });
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          continue;
        }
        if (attempt < RETRY_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }

    logger.error("Fallback exhausted retries", {
      domain,
      rowNum,
      error: lastError?.message,
      stack: lastError?.stack,
      city: options.city,
      brand: options.brand,
      name: null
    });

    // Final fallback: derive basic name from domain prefix
    let companyName = domainPrefix.split(/[-.]/).filter(Boolean).map(token => {
      const lowerToken = token.toLowerCase();
      if (CAR_BRANDS_CACHE.has(lowerToken) && BRAND_MAPPING[lowerToken]) {
        return BRAND_MAPPING[lowerToken];
      }
      return lowerToken.charAt(0).toUpperCase() + lowerToken.slice(1);
    }).join(" ");
    if (!pattern.test(companyName)) {
      companyName = "";
    }
    const finalConfidence = companyName ? 50 : 0;
    const finalFlags = companyName ? ["FallbackAPIFailed", "DomainPrefixFallback"] : ["FallbackAPIFailed", "ManualReviewRecommended"];

    logger.info("Final fallback applied using domain prefix", {
      domain,
      rowNum,
      companyName,
      confidenceScore: finalConfidence,
      flags: finalFlags,
      city: options.city,
      brand: options.brand,
      rejectedReason: companyName ? null : "Unable to derive valid name from domain prefix"
    });

    return {
      domain,
      companyName,
      confidenceScore: finalConfidence,
      flags: finalFlags,
      tokens: 0,
      rowNum,
      openAIErrors
    };
  } catch (err) {
    logger.error("callFallbackAPI failed", {
      domain,
      rowNum,
      error: err.message,
      stack: err.stack,
      city: meta.city,
      brand: meta.brand,
      name: null,
      rejectedReason: "Unexpected error in callFallbackAPI"
    });
    return {
      domain,
      companyName: "",
      confidenceScore: 0,
      flags: ["FallbackAPIFailed", "ManualReviewRecommended"],
      tokens: 0,
      rowNum,
      openAIErrors: 0
    };
  }
}

/**
 * Validates leads array
 * @param {Array} leads - Array of lead objects
 * @returns {Object} - Validated leads and errors
 */
function validateLeads(leads) {
  const validatedLeads = [];
  const validationErrors = [];

  try {
    if (!Array.isArray(leads)) {
      logger.warn("Leads is not an array", { leads: JSON.stringify(leads) });
      validationErrors.push({ error: "Leads is not an array", rejectedReason: "Input must be an array" });
      return { validatedLeads, validationErrors };
    }

    leads.forEach((lead, i) => {
      if (!lead || typeof lead !== "object") {
        logger.warn(`Index ${i} not object`, { lead: JSON.stringify(lead) });
        validationErrors.push({ index: i, error: `Index ${i} not object`, rejectedReason: "Lead must be an object" });
        return;
      }

      const domain = (lead.domain || "").trim().toLowerCase();
      if (!domain) {
        logger.warn(`Index ${i} missing domain`, { lead: JSON.stringify(lead) });
        validationErrors.push({ index: i, error: `Index ${i} missing domain`, rejectedReason: "Domain is required" });
        return;
      }

      // Validate domain format
      const domainPattern = /^[a-z0-9]+([-.][a-z0-9]+)*\.[a-z]{2,}$/i;
      if (!domainPattern.test(domain) || domain.includes("@")) {
        logger.warn(`Index ${i} invalid domain format`, { lead: JSON.stringify(lead), domain });
        validationErrors.push({ index: i, error: `Index ${i} invalid domain format`, rejectedReason: "Domain format invalid or contains email characters" });
        return;
      }

      // Extract and validate city and brand from lead
      let city = "Unknown";
      if (lead.city && typeof lead.city === "string") {
        city = lead.city.trim().replace(/[^a-zA-Z\s]/g, "");
        if (!city || city.length < 2) {
          city = "Unknown";
          logger.warn(`Index ${i} invalid city format`, { lead: JSON.stringify(lead), city: lead.city });
          validationErrors.push({ index: i, error: `Index ${i} invalid city format`, rejectedReason: "City must be a valid string with at least 2 characters" });
        }
      }

      let brand = "Unknown";
      if (lead.brand && typeof lead.brand === "string") {
        brand = lead.brand.trim().replace(/[^a-zA-Z\s]/g, "");
        if (!brand || brand.length < 2) {
          brand = "Unknown";
          logger.warn(`Index ${i} invalid brand format`, { lead: JSON.stringify(lead), brand: lead.brand });
          validationErrors.push({ index: i, error: `Index ${i} invalid brand format`, rejectedReason: "Brand must be a valid string with at least 2 characters" });
        }
      }

      // Normalize rowNum
      let rowNum = Number.isInteger(lead.rowNum) && lead.rowNum > 0 ? lead.rowNum : i + 1;

      validatedLeads.push({
        domain,
        rowNum,
        metaTitle: typeof lead.metaTitle === "string" ? lead.metaTitle.trim() : undefined,
        city,
        brand
      });
    });

    logger.debug("validateLeads completed", { validatedLeadsCount: validatedLeads.length, validationErrors });
    return { validatedLeads, validationErrors };
  } catch (err) {
    logger.error("validateLeads failed", {
      error: err.message,
      stack: err.stack,
      leads: JSON.stringify(leads),
      failedAtIndex: leads.length > 0 ? leads.length - 1 : "unknown",
      rejectedReason: "Unexpected error during validation"
    });
    validationErrors.push({ error: "Validation error", rejectedReason: `Unexpected error: ${err.message}` });
    return { validatedLeads, validationErrors };
  }
}

/**
 * Main API handler for batch enrichment
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} - JSON response
 */
export default async function handler(req, res) {
  let body;
  // Initialize variables to track state
  let reviewNeededQueue = [];
  let fallbackTriggers = [];
  let totalTokens = 0;
  let totalOpenAIErrors = 0;
  let totalFetchDuration = 0;
  let fetchCount = 0;

  // Start tracking total processing time
  const startTime = Date.now();

  // Check rate limit before processing
  if (!checkRateLimit(req)) {
    logger.warn("Rate limit exceeded for IP", { ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown-ip" });
    return res.status(429).json({ error: "Rate limit exceeded", retryAfter: RATE_LIMIT_WINDOW_MS / 1000 });
  }

  // Safely access req.body with manual parsing for Vercel dev mode
  try {
    const rawBody = await buffer(req);
    logger.debug("Raw body received", { rawBody: rawBody.toString() });
    body = JSON.parse(rawBody.toString() || "{}");
    logger.debug("Parsed body", { bodyLength: JSON.stringify(body).length, body: JSON.stringify(body) });
  } catch (err) {
    logger.error("Failed to parse request body", { error: err.message, stack: err.stack });
    return res.status(400).json({ error: "Invalid JSON body", details: err.message });
  }

  if (!body || (Object.keys(body).length === 0 && body.constructor === Object)) {
    logger.warn("Empty body detected", {});
    return res.status(400).json({ error: "Empty body" });
  }

  const leads = body.leads || body.leadList || body.domains || body;
  logger.debug("Extracted leads", { leadCount: Array.isArray(leads) ? leads.length : 0, leads: JSON.stringify(leads) });

  const { validatedLeads, validationErrors } = validateLeads(leads);
  logger.debug("Validated leads", { validatedLeads: validatedLeads.length, validationErrors });

  if (validatedLeads.length === 0) {
    logger.warn("No valid leads", { validationErrors });
    return res.status(400).json({ error: "No valid leads", details: validationErrors });
  }

  const successful = [];
  const BATCH_SIZE = 3; // Align with project BATCH_SIZE for Vercel

  const leadBatches = [];
  for (let i = 0; i < validatedLeads.length; i += BATCH_SIZE) {
    leadBatches.push(validatedLeads.slice(i, i + BATCH_SIZE));
  }

  const processLead = async (lead) => {
    const { domain, rowNum, metaTitle, city, brand } = lead;
    const domainKey = domain.toLowerCase();
    const pattern = /^[A-Z][a-zA-Z]*(\s[A-Z][a-zA-Z]*)*$/;

    // Define extractedCity and extractedBrand at function scope with defaults
    let extractedCity = city || "Unknown";
    let extractedBrand = brand || "Unknown";
    let tokensUsed = 0;
    let leadOpenAIErrors = 0;
    let fetchDuration = 0;
    let finalResult;

    try {
      // Check cache
      if (processedDomains.has(domainKey)) {
        if (domainCache.has(domainKey)) {
          const cached = domainCache.get(domainKey);
          if (cached) {
            logger.debug("Using cached result", { domain: domainKey, rowNum, cached, city: extractedCity, brand: extractedBrand });
            return {
              domain,
              companyName: cached.companyName,
              confidenceScore: cached.confidenceScore,
              flags: Array.from(new Set([...cached.flags, "DuplicateSkipped"])),
              tokens: 0,
              rowNum,
              openAIErrors: 0,
              fetchDuration: 0
            };
          }
        } else {
          logger.warn("domainCache is not a Map or does not contain domainKey", { domain: domainKey, rowNum, city: extractedCity, brand: extractedBrand });
        }
      }

      finalResult = { companyName: "", confidenceScore: 80, flags: [], tokens: 0, city: extractedCity, brand: extractedBrand };

      // Validate city and brand inputs
      if (extractedCity !== "Unknown") {
        const cityLower = extractedCity.toLowerCase();
        extractedCity = (KNOWN_CITIES_SET_CACHE.has(cityLower) || MULTI_WORD_CITIES.has(cityLower)) ? extractedCity : "Unknown";
      }
      if (extractedBrand !== "Unknown") {
        const brandLower = extractedBrand.toLowerCase();
        extractedBrand = CAR_BRANDS_CACHE.has(brandLower) ? extractedBrand : "Unknown";
      }

      // Extract city and brand from metaTitle if not provided in lead
      if (metaTitle && (extractedCity === "Unknown" || extractedBrand === "Unknown")) {
        const titleTokens = metaTitle.toLowerCase().split(" ").filter(Boolean);
        if (extractedCity === "Unknown") {
          extractedCity = titleTokens.find(token => KNOWN_CITIES_SET_CACHE.has(token)) || "Unknown";
        }
        if (extractedBrand === "Unknown") {
          extractedBrand = titleTokens.find(token => CAR_BRANDS_CACHE.has(token)) || "Unknown";
        }
      }

      // Check for brand-only domains
      const domainPrefix = domainKey.split(".")[0];
      if (CAR_BRANDS_CACHE.has(domainPrefix)) {
        logger.debug("Brand-only domain skipped", { domain: domainKey, rowNum, city: extractedCity, brand: extractedBrand });
        finalResult = {
          companyName: "",
          confidenceScore: 0,
          flags: ["BrandOnlyDomainSkipped"],
          tokens: 0,
          city: extractedCity,
          brand: extractedBrand
        };
        return { ...finalResult, domain, rowNum, openAIErrors: 0, fetchDuration: 0 };
      }

      // Attempt humanizeName with retries
      let humanizeError = null;
      let initialResult = null;
      for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
        logger.debug(`Attempt ${attempt} to humanize domain`, { domain, rowNum, attempt, city: extractedCity, brand: extractedBrand });
        try {
          if (typeof domain === "string" && domain.trim()) {
            initialResult = await humanizeName(domain, rowNum, extractedCity, extractedBrand);
          } else {
            logger.warn("Invalid input to humanizeName", { domain, rowNum, city: extractedCity, brand: extractedBrand });
            throw new Error("Invalid input to humanizeName");
          }
          logger.debug("humanizeName result", { domain, rowNum, result: initialResult, city: extractedCity, brand: extractedBrand });

          // Sanitize companyName to align with Vercel and GAS
          if (initialResult.companyName) {
            initialResult.companyName = initialResult.companyName.trim().replace(/[^a-zA-Z\s]/g, "");
          }

          if (initialResult.companyName && !pattern.test(initialResult.companyName)) {
            logger.warn("humanizeName result pattern validation failed", {
              domain,
              rowNum,
              companyName: initialResult.companyName,
              city: extractedCity,
              brand: extractedBrand
            });
            initialResult.companyName = "";
            initialResult.flags.push("PatternValidationFailed");
            initialResult.confidenceScore = 0;
          }

          finalResult = {
            companyName: initialResult.companyName || "",
            confidenceScore: initialResult.confidenceScore || 80,
            flags: Array.from(new Set(initialResult.flags || [])),
            tokens: initialResult.tokens?.length || 0,
            city: extractedCity,
            brand: extractedBrand
          };
          tokensUsed = initialResult.tokens?.length || 0;
          humanizeError = null;
          break;
        } catch (error) {
          humanizeError = error;
          logger.warn(`Humanize attempt ${attempt} failed`, {
            domain,
            rowNum,
            error: error.message,
            stack: error.stack,
            city: extractedCity,
            brand: extractedBrand
          });
          // Check for OpenAI-specific errors
          if (error.message.includes("OpenAI")) {
            leadOpenAIErrors++;
          }
          if (attempt < RETRY_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          }
        }
      }

      // Handle fallback if necessary
      if (humanizeError || finalResult.confidenceScore < 75 || finalResult.flags.includes("ManualReviewRecommended")) {
        logger.debug("Calling fallback API", { domain, rowNum, city: extractedCity, brand: extractedBrand });
        try {
          const meta = {
            title: metaTitle,
            city: extractedCity,
            brand: extractedBrand
          };
          const fallback = await callFallbackAPI(domain, rowNum, meta);

          // Sanitize companyName
          if (fallback.companyName) {
            fallback.companyName = fallback.companyName.trim().replace(/[^a-zA-Z\s]/g, "");
          }

          if (fallback.companyName && !pattern.test(fallback.companyName)) {
            logger.warn("callFallbackAPI result pattern validation failed", {
              domain,
              rowNum,
              companyName: fallback.companyName,
              city: extractedCity,
              brand: extractedBrand
            });
            fallback.companyName = "";
            fallback.flags.push("PatternValidationFailed");
            fallback.confidenceScore = 0;
          }

          finalResult = {
            companyName: fallback.companyName,
            confidenceScore: fallback.confidenceScore,
            flags: Array.from(new Set([...fallback.flags, "FallbackAPIUsed"])),
            tokens: fallback.tokens || 0,
            city: extractedCity,
            brand: extractedBrand
          };
          tokensUsed += fallback.tokens || 0;
          leadOpenAIErrors += fallback.openAIErrors || 0;
          logger.debug("Fallback API result", { domain, rowNum, result: finalResult, city: extractedCity, brand: extractedBrand });

          if (humanizeError || finalResult.flags.includes("FallbackAPIUsed")) {
            fallbackTriggers.push({
              domain,
              rowNum,
              reason: humanizeError ? "HumanizeFailed" : "LowConfidence",
              details: {
                error: humanizeError ? humanizeError.message : null,
                primary: {
                  companyName: initialResult?.companyName || "",
                  confidenceScore: initialResult?.confidenceScore || 0,
                  flags: initialResult?.flags || []
                },
                fallback: {
                  companyName: finalResult.companyName,
                  confidenceScore: finalResult.confidenceScore,
                  flags: finalResult.flags,
                  city: extractedCity,
                  brand: extractedBrand
                }
              },
              tokens: tokensUsed
            });
          }
        } catch (fallbackErr) {
          logger.error("Fallback API failed", {
            domain,
            rowNum,
            error: fallbackErr.message,
            stack: fallbackErr.stack,
            city: extractedCity,
            brand: extractedBrand
          });
          if (fallbackErr.message.includes("OpenAI")) {
            leadOpenAIErrors++;
          }
          finalResult = {
            companyName: "",
            confidenceScore: 0,
            flags: Array.from(new Set([...finalResult.flags, "FallbackAPIError", "ManualReviewRecommended"])),
            tokens: tokensUsed,
            city: extractedCity,
            brand: extractedBrand
          };
        }
      }

      // Finalize result
      finalResult.flags = finalResult.flags.map(flag => String(flag));
      domainCache.set(domainKey, {
        companyName: finalResult.companyName,
        confidenceScore: finalResult.confidenceScore,
        flags: finalResult.flags
      });
      processedDomains.add(domainKey);

      totalTokens += tokensUsed;
      return {
        domain,
        companyName: finalResult.companyName,
        confidenceScore: finalResult.confidenceScore,
        flags: finalResult.flags,
        tokens: tokensUsed,
        rowNum,
        openAIErrors: leadOpenAIErrors,
        fetchDuration // Use the variable
      };
    } catch (error) {
      logger.error("processLead failed", {
        domain,
        rowNum,
        error: error.message,
        stack: error.stack,
        city: extractedCity,
        brand: extractedBrand
      });
      if (error.message.includes("OpenAI")) {
        leadOpenAIErrors++;
      }
      return {
        domain,
        companyName: "",
        confidenceScore: 0,
        flags: Array.from(new Set(["EnrichmentFailed", "ManualReviewRecommended"])),
        tokens: 0,
        rowNum,
        openAIErrors: leadOpenAIErrors,
        fetchDuration: 0
      };
    }
  };

  // Process leads in batches
  for (const batch of leadBatches) {
    const batchResults = await Promise.all(batch.map(lead => concurrencyLimit(() => processLead(lead))));
    successful.push(...batchResults);
    totalOpenAIErrors += batchResults.reduce((sum, result) => sum + (result.openAIErrors || 0), 0);
    totalFetchDuration += batchResults.reduce((sum, result) => sum + (result.fetchDuration || 0), 0);
    fetchCount += batchResults.filter(result => result.fetchDuration > 0).length;
  }

  // Sanitize results to ensure JSON serialization
  const sanitizedResults = successful.map(result => ({
    domain: result.domain,
    companyName: result.companyName || "",
    confidenceScore: result.confidenceScore || 80,
    flags: result.flags ? result.flags.map(flag => String(flag)) : [],
    tokens: result.tokens || 0,
    rowNum: result.rowNum
  }));

  reviewNeededQueue = sanitizedResults.filter(r => r.flags.includes("ManualReviewRecommended"));

  // Calculate performance metrics
  const totalProcessingTime = Date.now() - startTime;
  const avgFetchDuration = fetchCount > 0 ? totalFetchDuration / fetchCount : 0;

  logger.info("Handler completed successfully", {
    successful: sanitizedResults.length,
    reviewNeededQueue: reviewNeededQueue.length,
    fallbackTriggers: fallbackTriggers.length,
    totalTokens,
    totalOpenAIErrors,
    totalProcessingTime,
    avgFetchDuration
  });

  return res.status(200).json({
    successful: sanitizedResults,
    reviewNeededQueue,
    fallbackTriggers,
    totalTokens,
    totalOpenAIErrors,
    partial: successful.some(r => r.flags.includes("EnrichmentFailed")),
    fromFallback: fallbackTriggers.length > 0,
    performance: {
      totalProcessingTime,
      avgFetchDuration
    }
  });
}

/**
 * Resets processed domains and caches
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} - JSON response
 */
export const resetProcessedDomains = async (req, res) => {
  logger.info("Resetting processed domains", {});
  try {
    processedDomains.clear();
    domainCache.clear();
    clearOpenAICache();
    logger.info("Processed domains and OpenAI cache reset", {});
    return res.status(200).json({ message: "Processed domains and OpenAI cache reset" });
  } catch (err) {
    logger.error("resetProcessedDomains failed", { error: err.message, stack: err.stack });
    return res.status(500).json({ error: "Failed to reset caches" });
  }
};

logger.info("Module loading completed", {});