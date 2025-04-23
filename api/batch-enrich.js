// api/batch-enrich.js v4.2.51
// Batch orchestration for domain enrichment

import {
  humanizeName,
  extractBrandOfCityFromDomain,
  capitalizeName,
  expandInitials,
  earlyCompoundSplit
} from "./lib/humanize.js";

import { fallbackName, clearOpenAICache } from "./batch-enrich-company-name-fallback.js";

import {
  BRAND_ONLY_DOMAINS,
  CAR_BRANDS,
  KNOWN_CITIES_SET,
  properNounsSet,
  OVERRIDES,
  SPAMMY_TOKENS,
  KNOWN_GENERIC_BLOBS,
  BRAND_MAPPING,
  SUFFIXES_TO_REMOVE,
  BLOCKLIST
} from './lib/constants.js';

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

const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
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

// Verify dependencies
const dependencies = {
  humanizeName: typeof humanizeName === "function",
  extractBrandOfCityFromDomain: typeof extractBrandOfCityFromDomain === "function",
  capitalizeName: typeof capitalizeName === "function",
  expandInitials: typeof expandInitials === "function",
  earlyCompoundSplit: typeof earlyCompoundSplit === "function",
  fallbackName: typeof fallbackName === "function",
  clearOpenAICache: typeof clearOpenAICache === "function"
};
logger.debug("Dependency check", { dependencies });

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

const limit = pLimit(5);
const domainCache = new Map();
const processedDomains = new Set();

const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 2000;

// Custom rate limiter for Vercel (100 requests/minute per IP)
const requestTimestamps = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

function checkRateLimit(req) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
  const now = Date.now();
  const timestamps = requestTimestamps.get(ip) || [];

  // Remove timestamps older than the window
  const recentTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  requestTimestamps.set(ip, recentTimestamps);

  if (recentTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false; // Rate limit exceeded
  }

  recentTimestamps.push(now);
  requestTimestamps.set(ip, recentTimestamps);
  return true;
}

/**
 * Calls fallback logic using fallbackName
 * @param {string} domain - Domain to enrich
 * @param {number} rowNum - Row number
 * @param {Object} meta - Meta data
 * @returns {Object} - Fallback result
 */
async function callFallbackAPI(domain, rowNum, meta = {}) {
  logger.debug('callFallbackAPI started', { domain, rowNum });

  try {
    // Fixed: Use Set.has() for BRAND_ONLY_DOMAINS
    if (BRAND_ONLY_DOMAINS.has(`${domain.toLowerCase()}.com`)) {
      logger.info('Brand-only domain skipped in callFallbackAPI', { domain });
      return {
        domain,
        companyName: '',
        confidenceScore: 0,
        flags: ['BrandOnlyDomainSkipped'],
        tokens: 0,
        rowNum
      };
    }

    // Define pattern for validation
    const pattern = /^([A-Z][a-z]+(?: [A-Z][a-z]+)?)(?: [A-Z][a-z]+)?$/;

    let lastError;
    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        logger.debug(`Attempt ${attempt} to call fallback`, { domain, attempt });
        const fallback = await fallbackName(domain, domain, meta);

        logger.debug('Fallback result', { domain, fallback });

        // Validate fallback result against pattern
        if (fallback.companyName && !pattern.test(fallback.companyName)) {
          logger.warn('callFallbackAPI result pattern validation failed', {
            domain,
            companyName: fallback.companyName
          });
          fallback.companyName = '';
          fallback.flags.push('PatternValidationFailed');
          fallback.confidenceScore = 0;
        }

        return {
          domain,
          companyName: fallback.companyName,
          confidenceScore: fallback.confidenceScore,
          flags: ['FallbackAPIUsed', ...fallback.flags],
          tokens: Array.isArray(fallback.tokens) ? fallback.tokens.length : fallback.tokens || 0,
          rowNum
        };
      } catch (error) {
        lastError = error;
        logger.warn(`Fallback attempt ${attempt} failed`, {
          domain,
          error: error.message,
          stack: error.stack
        });
        if (attempt < RETRY_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }

    logger.error('Fallback exhausted retries', {
      domain,
      error: lastError?.message,
      stack: lastError?.stack
    });
    let local = { companyName: '', confidenceScore: 80, flags: [], tokens: 0 };
    try {
      const splitName = earlyCompoundSplit(domain.split('.')[0]);
      let nameResult = { name: '', flags: [] };
      if (Array.isArray(splitName) && splitName.every(token => typeof token === 'string')) {
        const joinedName = splitName.join(' ');
        if (typeof joinedName === 'string' && joinedName.trim()) {
          nameResult = capitalizeName(joinedName) || { name: '', flags: [] };
        } else {
          logger.warn('Invalid input to capitalizeName in callFallbackAPI', { domain, joinedName });
        }
      } else {
        logger.warn('Invalid splitName result in callFallbackAPI', { domain, splitName });
      }
      local.companyName = nameResult.name || '';
      local.confidenceScore = 80;
      local.flags = ['LocalCompoundSplit', ...(nameResult.flags || [])];
      logger.debug('Local compound split result', { domain, result: local });

      // Validate local result
      if (local.companyName && !pattern.test(local.companyName)) {
        logger.warn('Local compound split pattern validation failed', {
          domain,
          companyName: local.companyName
        });
        local.companyName = '';
        local.flags.push('PatternValidationFailed');
      }
    } catch (error) {
      logger.error('Local compound split failed', {
        domain,
        error: error.message,
        stack: error.stack
      });
      local.companyName = '';
      local.flags = ['LocalCompoundSplitFailed'];
    }

    if (!local.companyName || typeof local.companyName !== 'string') {
      local.companyName = '';
      local.flags = [...local.flags, 'InvalidLocalResponse'];
    }

    const combinedFlags = [...local.flags, 'FallbackAPIFailed', 'LocalFallbackUsed'];
    return {
      domain,
      companyName: local.companyName,
      confidenceScore: local.confidenceScore,
      flags: Array.from(new Set(combinedFlags)),
      tokens: local.tokens || 0,
      rowNum,
      error: lastError ? lastError.message : 'Unknown error'
    };
  } catch (err) {
    logger.error('callFallbackAPI failed', { domain, rowNum, error: err.message, stack: err.stack });
    return {
      domain,
      companyName: '',
      confidenceScore: 80,
      flags: ['FallbackAPIFailed', 'ManualReviewRecommended'],
      tokens: 0,
      rowNum
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
      validationErrors.push("Leads is not an array");
      return { validatedLeads, validationErrors };
    }

    leads.forEach((lead, i) => {
      if (!lead || typeof lead !== "object") {
        logger.warn(`Index ${i} not object`, { lead: JSON.stringify(lead) });
        validationErrors.push(`Index ${i} not object`);
        return;
      }
      const domain = (lead.domain || "").trim().toLowerCase();
      if (!domain) {
        logger.warn(`Index ${i} missing domain`, { lead: JSON.stringify(lead) });
        validationErrors.push(`Index ${i} missing domain`);
        return;
      }
      validatedLeads.push({
        domain,
        rowNum: Number.isInteger(lead.rowNum) ? lead.rowNum : i + 1,
        metaTitle: typeof lead.metaTitle === "string" ? lead.metaTitle : undefined
      });
    });
    logger.debug("validateLeads completed", { validatedLeadsCount: validatedLeads.length, validationErrors });
    return { validatedLeads, validationErrors };
  } catch (err) {
    logger.error("validateLeads failed", { error: err.message, stack: err.stack, leads: JSON.stringify(leads) });
    validationErrors.push("Validation error");
    return { validatedLeads, validationErrors };
  }
}

export default async function handler(req, res) {
  const leads = await buffer(req);
  const body = JSON.parse(leads.toString());
  const validatedLeads = body.leads;

  const results = await Promise.all(validatedLeads.map(async lead => {
    const { domain, rowNum } = lead;
    logger.debug('Processing lead', { domain, rowNum });

    try {
      let result = humanizeName(domain);
      logger.debug('extractBrandOfCityFromDomain result', { domain, result });

      // If confidence is too low or companyName is empty, use fallback
      if (!result.companyName || result.confidenceScore < 80) {
        logger.debug('Falling back to company-name-fallback', { domain, initialResult: result });
        result = await fallbackName(domain);
        result.flags.push('fallbackApplied');
      }

      logger.debug('Processed lead', { domain, rowNum, result });
      return { ...lead, ...result };
    } catch (error) {
      logger.error('processLead failed', { domain, rowNum, error: error.message });
      return { ...lead, companyName: '', confidenceScore: 0, flags: ['error'], tokens: [] };
    }
  }));

  logger.debug('Handler completed successfully', { results });
  return res.status(200).json({ results });
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
    const processLead = async (lead) => {
      const { domain, rowNum, metaTitle } = lead;
      const domainKey = domain.toLowerCase();
      const pattern = /^([A-Z][a-z]+(?: [A-Z][a-z]+)?)(?: [A-Z][a-z]+)?$/;

      try {
        // Step 1: Check cache
        if (processedDomains.has(domainKey)) {
          const cached = domainCache.get(domainKey);
          if (cached) {
            logger.debug("Using cached result", { domain: domainKey, cached });
            return {
              domain,
              companyName: cached.companyName,
              confidenceScore: cached.confidenceScore,
              flags: Array.from(new Set([...cached.flags, "DuplicateSkipped"])),
              tokens: 0,
              rowNum
            };
          }
        }

        let finalResult = { companyName: "", confidenceScore: 80, flags: [], tokens: 0 };
        let tokensUsed = 0;
        let brandDetected = null;
        let cityDetected = null;

        // Step 2: Extract brand and city
        logger.debug("Calling extractBrandOfCityFromDomain", { domain: domainKey });
        let match = { brand: null, city: null };
        try {
          if (typeof domainKey === "string" && domainKey.trim()) {
            match = extractBrandOfCityFromDomain(domainKey) || { brand: null, city: null };
          } else {
            logger.warn("Invalid input to extractBrandOfCityFromDomain", { domain: domainKey });
          }
        } catch (error) {
          logger.error("extractBrandOfCityFromDomain failed", { domain: domainKey, error: error.message, stack: error.stack });
        }
        brandDetected = match.brand || null;
        cityDetected = match.city || null;
        logger.debug("extractBrandOfCityFromDomain result", { domain: domainKey, brandDetected, cityDetected });

        // Step 3: Check for brand-only domains
        if (BRAND_ONLY_DOMAINS.includes(`${domainKey}.com`)) {
          logger.debug("Brand-only domain skipped", { domain: domainKey });
          finalResult = {
            companyName: "",
            confidenceScore: 0,
            flags: ["BrandOnlyDomainSkipped"],
            tokens: 0
          };
          return { ...finalResult, domain, rowNum };
        }

        // Step 4: Attempt humanizeName with retries
        let humanizeError = null;
        let initialResult = null;
        for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
          logger.debug(`Attempt ${attempt} to humanize domain`, { domain });
          try {
            if (typeof domain === "string" && domain.trim()) {
              initialResult = await humanizeName(domain);
            } else {
              logger.warn("Invalid input to humanizeName", { domain });
              throw new Error("Invalid input to humanizeName");
            }
            logger.debug("humanizeName result", { domain, result: initialResult });

            if (initialResult.companyName && !pattern.test(initialResult.companyName)) {
              logger.warn("humanizeName result pattern validation failed", { domain, companyName: initialResult.companyName });
              initialResult.companyName = "";
              initialResult.flags.push("PatternValidationFailed");
              initialResult.confidenceScore = 0;
            }

            finalResult = {
              companyName: initialResult.companyName || "",
              confidenceScore: initialResult.confidenceScore || 80,
              flags: Array.from(new Set(initialResult.flags || [])),
              tokens: initialResult.tokens?.length || 0
            };
            tokensUsed = initialResult.tokens?.length || 0;
            humanizeError = null;
            break;
          } catch (error) {
            if (error.message.includes("BrandOnlyError")) {
              logger.info(`Retrying fallback for ${domain} due to ${error.message}`);
              try {
                if (typeof domain === "string" && domain.trim()) {
                  initialResult = await humanizeName(domain);
                } else {
                  logger.warn("Invalid input to humanizeName on retry", { domain });
                  throw new Error("Invalid input to humanizeName on retry");
                }
                initialResult.flags.push("FallbackTriggered");

                if (initialResult.companyName && !pattern.test(initialResult.companyName)) {
                  logger.warn("humanizeName retry result pattern validation failed", { domain, companyName: initialResult.companyName });
                  initialResult.companyName = "";
                  initialResult.flags.push("PatternValidationFailed");
                  initialResult.confidenceScore = 0;
                }

                finalResult = {
                  companyName: initialResult.companyName || "",
                  confidenceScore: initialResult.confidenceScore || 80,
                  flags: Array.from(new Set(initialResult.flags || [])),
                  tokens: initialResult.tokens?.length || 0
                };
                tokensUsed = initialResult.tokens?.length || 0;
                humanizeError = null;
                break;
              } catch (retryErr) {
                logger.warn(`Fallback retry failed for ${domain}`, { error: retryErr.message, stack: retryErr.stack });
                humanizeError = retryErr;
              }
            } else {
              humanizeError = error;
              logger.warn(`Humanize attempt ${attempt} failed`, { domain, error: error.message, stack: error.stack });
            }
            if (attempt < RETRY_ATTEMPTS) {
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            }
          }
        }

        // Step 5: Handle fallback if necessary
        if (humanizeError || finalResult.confidenceScore < 95 || finalResult.flags.includes("ManualReviewRecommended")) {
          logger.debug("Calling fallback API", { domain });
          try {
            const meta = metaTitle ? { title: metaTitle } : {};
            const fallback = await callFallbackAPI(domain, rowNum, meta);

            if (fallback.companyName && !pattern.test(fallback.companyName)) {
              logger.warn("callFallbackAPI result pattern validation failed", { domain, companyName: fallback.companyName });
              fallback.companyName = "";
              fallback.flags.push("PatternValidationFailed");
              fallback.confidenceScore = 0;
            }

            finalResult = {
              companyName: fallback.companyName,
              confidenceScore: fallback.confidenceScore,
              flags: Array.from(new Set([...fallback.flags, "FallbackAPIUsed"])),
              tokens: Array.isArray(fallback.tokens) ? fallback.tokens.length : fallback.tokens || 0
            };
            tokensUsed += Array.isArray(fallback.tokens) ? fallback.tokens.length : fallback.tokens || 0;
            logger.debug("Fallback API result", { domain, result: finalResult });

            if (humanizeError || finalResult.flags.includes("FallbackAPIUsed")) {
              fallbackTriggers.push({
                domain,
                rowNum,
                reason: humanizeError ? (humanizeError.message.includes("BrandOnlyError") ? "BrandOnlyError" : "HumanizeFailed") : "LowConfidence",
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
                    flags: finalResult.flags
                  },
                  brand: brandDetected,
                  city: cityDetected
                },
                tokens: tokensUsed
              });
            }
          } catch (fallbackErr) {
            logger.error("Fallback API failed", { domain, error: fallbackErr.message, stack: fallbackErr.stack });
            finalResult = {
              companyName: "",
              confidenceScore: 80,
              flags: Array.from(new Set([...finalResult.flags, "FallbackAPIError", "ManualReviewRecommended"])),
              tokens: tokensUsed
            };
          }
        }

        // Step 6: Expand initials if needed
        if (finalResult.companyName && finalResult.companyName.split(" ").every(w => /^[A-Z]{1,3}$/.test(w))) {
          logger.debug("Expanding initials", { domain, companyName: finalResult.companyName });
          try {
            let expandedName = finalResult.companyName;
            if (typeof finalResult.companyName === "string" && finalResult.companyName.trim()) {
              expandedName = expandInitials(finalResult.companyName) || finalResult.companyName;
            } else {
              logger.warn("Invalid input to expandInitials", { domain, companyName: finalResult.companyName });
            }
            if (expandedName && expandedName !== finalResult.companyName) {
              if (!pattern.test(expandedName)) {
                logger.warn("Expanded initials pattern validation failed", { domain, companyName: expandedName });
                finalResult.flags.push("PatternValidationFailed");
              } else {
                finalResult.companyName = expandedName;
                finalResult.flags = Array.from(new Set([...finalResult.flags, "InitialsExpandedLocally"]));
                finalResult.confidenceScore -= 5;
              }
            }
            logger.debug("Expanded initials result", { domain, result: finalResult });
          } catch (expandErr) {
            logger.error("Expand initials failed", { domain, error: expandErr.message, stack: expandErr.stack });
            finalResult.flags.push("InitialsExpansionError");
          }
        }

        // Step 7: Finalize result
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
          rowNum
        };
      } catch (err) {
        logger.error("processLead failed", { domain, rowNum, error: err.message, stack: err.stack });
        return {
          domain,
          companyName: "",
          confidenceScore: 80,
          flags: Array.from(new Set(["EnrichmentFailed", "ManualReviewRecommended"])),
          tokens: 0,
          rowNum
        };
      }
    };

    const results = await Promise.all(validatedLeads.map(lead => limit(() => processLead(lead))));
    successful.push(...results);

    // Sanitize results to ensure JSON serialization
    const sanitizedResults = results.map(result => ({
      domain: result.domain,
      companyName: result.companyName || "",
      confidenceScore: result.confidenceScore || 80,
      flags: result.flags ? result.flags.map(flag => String(flag)) : [],
      tokens: result.tokens || 0,
      rowNum: result.rowNum
    }));

    manualReviewQueue = sanitizedResults.filter(r => r.flags.includes("ManualReviewRecommended"));

    logger.info("Handler completed successfully", {
      successful: sanitizedResults.length,
      manualReviewQueue: manualReviewQueue.length,
      fallbackTriggers: fallbackTriggers.length,
      totalTokens
    });
    return res.status(200).json({
      successful: sanitizedResults,
      manualReviewQueue,
      fallbackTriggers,
      totalTokens,
      partial: results.some(r => r.flags.includes("EnrichmentFailed")),
      fromFallback: fallbackTriggers.length > 0
    });
  } catch (error) {
    logger.error("Handler error", {
      error: error.message,
      stack: error.stack,
      body: body ? JSON.stringify(body).slice(0, 1000) : "null"
    });
    return res.status(500).json({
      error: "Internal server error",
      confidenceScore: 80,
      flags: Array.from(new Set(["BatchEnrichmentFailed", "ManualReviewRecommended"])),
      tokens: 0
    });
  }
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
