// api/batch-enrich.js v4.2.38
// Batch orchestration for domain enrichment

import {
  humanizeName,
  extractBrandOfCityFromDomain,
  capitalizeName,
  expandInitials,
  earlyCompoundSplit
} from "./lib/humanize.js";
import { fallbackName, clearOpenAICache } from "./company-name-fallback.js";
import winston from "winston";
import path from "path";
import fs from "fs";

// Ensure logs directory exists
const logDir = path.join(process.cwd(), "logs");
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch (err) {
  console.error("Failed to create logs directory", err);
}

// Initialize Winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, "enrich.log"),
      maxsize: 5242880,
      maxFiles: 5
    }),
    new winston.transports.Console()
  ]
});

// Log server startup
logger.info("Module loading started", { version: "4.2.38" });

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
const RETRY_DELAY_MS = 1000;

const BRAND_ONLY_DOMAINS = [
  "chevy.com", "ford.com", "cadillac.com", "buick.com", "gmc.com", "chrysler.com",
  "dodge.com", "ramtrucks.com", "jeep.com", "lincoln.com", "toyota.com", "honda.com",
  "nissanusa.com", "subaru.com", "mazdausa.com", "mitsubishicars.com", "acura.com",
  "lexus.com", "infinitiusa.com", "hyundaiusa.com", "kia.com", "genesis.com",
  "bmwusa.com", "mercedes-benz.com", "audiusa.com", "vw.com", "volkswagen.com",
  "porsche.com", "miniusa.com", "fiatusa.com", "alfa-romeo.com", "landroverusa.com",
  "jaguarusa.com", "tesla.com", "lucidmotors.com", "rivian.com", "volvocars.com"
];

/**
 * Calls fallback logic using fallbackName
 * @param {string} domain - Domain to enrich
 * @param {number} rowNum - Row number
 * @param {Object} meta - Meta data
 * @returns {Object} - Fallback result
 */
async function callFallbackAPI(domain, rowNum, meta = {}) {
  logger.info("callFallbackAPI started", { domain, rowNum });

  try {
    if (BRAND_ONLY_DOMAINS.includes(`${domain.toLowerCase()}.com`)) {
      logger.info("Brand-only domain skipped in callFallbackAPI", { domain });
      return {
        domain,
        companyName: "",
        confidenceScore: 0,
        flags: Array.from(new Set(["BrandOnlyDomainSkipped"])),
        tokens: 0,
        rowNum
      };
    }

    let lastError;
    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        logger.info(`Attempt ${attempt} to call fallback`, { domain });
        const fallback = await fallbackName(domain, { title: meta.title });

        logger.info("Fallback result", { domain, fallback });
        return {
          domain,
          companyName: fallback.companyName,
          confidenceScore: fallback.confidenceScore,
          flags: Array.from(new Set([...fallback.flags, "FallbackAPIUsed"])),
          tokens: fallback.tokens || 0,
          rowNum
        };
      } catch (error) {
        lastError = error;
        logger.warn(`Fallback attempt ${attempt} failed`, { domain, error: error.message });
        if (attempt < RETRY_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }

    logger.error("Fallback exhausted retries", { domain, error: lastError.message });
    let local;
    try {
      logger.info("Attempting local humanizeName", { domain });
      local = await humanizeName(domain, domain, true);
      logger.info("Local humanizeName result", { domain, result: local });
    } catch (humanizeError) {
      logger.error("Local humanizeName failed", { domain, error: humanizeError.message });
      local = { companyName: "", confidenceScore: 80, flags: ["InvalidHumanizeResponse"], tokens: 0 };
    }

    if (!local.companyName || typeof local.companyName !== "string") {
      local.companyName = "";
      local.flags = [...(local.flags ||चा

System: I notice the `batch-enrich.js` script was cut off in the previous message. Below, I'll complete the corrected `batch-enrich.js` (v4.2.38) to ensure all `try` blocks have `catch` clauses, align with the fixed `company-name-fallback.js`, and include enhanced logging to capture crashes. I'll also verify `humanize.js` (v5.0.3) compatibility, provide `edge-cases-30.json` with 15 domains, and outline debugging steps to resolve the `FUNCTION_INVOCATION_FAILED` error. The `company-name-fallback.js` script has already been fully provided and fixed for the `Missing catch or finally clause` error at line 94.

---

### Completed batch-enrich.js (v4.2.38)

This version completes the previously truncated `batch-enrich.js`, ensuring all `try` blocks have `catch` clauses, maintaining ESLint compliance (double quotes, semicolons, `prefer-const`, `consistent-return`), and enhancing logging to capture early crashes. It aligns with the fixed `company-name-fallback.js` and `humanize.js` (v5.0.3).

```javascript
// api/batch-enrich.js v4.2.38
// Batch orchestration for domain enrichment

import {
  humanizeName,
  extractBrandOfCityFromDomain,
  capitalizeName,
  expandInitials,
  earlyCompoundSplit
} from "./lib/humanize.js";
import { fallbackName, clearOpenAICache } from "./company-name-fallback.js";
import winston from "winston";
import path from "path";
import fs from "fs";

// Ensure logs directory exists
const logDir = path.join(process.cwd(), "logs");
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch (err) {
  console.error("Failed to create logs directory", err);
}

// Initialize Winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, "enrich.log"),
      maxsize: 5242880,
      maxFiles: 5
    }),
    new winston.transports.Console()
  ]
});

// Log server startup
logger.info("Module loading started", { version: "4.2.38" });

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
const RETRY_DELAY_MS = 1000;

const BRAND_ONLY_DOMAINS = [
  "chevy.com", "ford.com", "cadillac.com", "buick.com", "gmc.com", "chrysler.com",
  "dodge.com", "ramtrucks.com", "jeep.com", "lincoln.com", "toyota.com", "honda.com",
  "nissanusa.com", "subaru.com", "mazdausa.com", "mitsubishicars.com", "acura.com",
  "lexus.com", "infinitiusa.com", "hyundaiusa.com", "kia.com", "genesis.com",
  "bmwusa.com", "mercedes-benz.com", "audiusa.com", "vw.com", "volkswagen.com",
  "porsche.com", "miniusa.com", "fiatusa.com", "alfa-romeo.com", "landroverusa.com",
  "jaguarusa.com", "tesla.com", "lucidmotors.com", "rivian.com", "volvocars.com"
];

/**
 * Calls fallback logic using fallbackName
 * @param {string} domain - Domain to enrich
 * @param {number} rowNum - Row number
 * @param {Object} meta - Meta data
 * @returns {Object} - Fallback result
 */
async function callFallbackAPI(domain, rowNum, meta = {}) {
  logger.info("callFallbackAPI started", { domain, rowNum });

  try {
    if (BRAND_ONLY_DOMAINS.includes(`${domain.toLowerCase()}.com`)) {
      logger.info("Brand-only domain skipped in callFallbackAPI", { domain });
      return {
        domain,
        companyName: "",
        confidenceScore: 0,
        flags: Array.from(new Set(["BrandOnlyDomainSkipped"])),
        tokens: 0,
        rowNum
      };
    }

    let lastError;
    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        logger.info(`Attempt ${attempt} to call fallback`, { domain });
        const fallback = await fallbackName(domain, { title: meta.title });

        logger.info("Fallback result", { domain, fallback });
        return {
          domain,
          companyName: fallback.companyName,
          confidenceScore: fallback.confidenceScore,
          flags: Array.from(new Set([...fallback.flags, "FallbackAPIUsed"])),
          tokens: fallback.tokens || 0,
          rowNum
        };
      } catch (error) {
        lastError = error;
        logger.warn(`Fallback attempt ${attempt} failed`, { domain, error: error.message });
        if (attempt < RETRY_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }

    logger.error("Fallback exhausted retries", { domain, error: lastError.message });
    let local;
    try {
      logger.info("Attempting local humanizeName", { domain });
      local = await humanizeName(domain, domain, true);
      logger.info("Local humanizeName result", { domain, result: local });
    } catch (humanizeError) {
      logger.error("Local humanizeName failed", { domain, error: humanizeError.message });
      local = { companyName: "", confidenceScore: 80, flags: ["InvalidHumanizeResponse"], tokens: 0 };
    }

    if (!local.companyName || typeof local.companyName !== "string") {
      local.companyName = "";
      local.flags = [...(local.flags || []), "InvalidHumanizeResponse"];
    }

    if (!local.companyName || local.confidenceScore < 75) {
      const splitName = earlyCompoundSplit(domain.split(".")[0]);
      local.companyName = capitalizeName(splitName).name || "";
      local.confidenceScore = 80;
      local.flags = [...(local.flags || []), "LocalCompoundSplit"];
      logger.info("Local compound split result", { domain, result: local });
    }

    return {
      domain,
      companyName: local.companyName,
      confidenceScore: local.confidenceScore,
      flags: Array.from(new Set([...(local.flags || []), "FallbackAPIFailed", "LocalFallbackUsed"])),
      tokens: local.tokens || 0,
      rowNum,
      error: lastError.message
    };
  } catch (err) {
    logger.error("callFallbackAPI failed", { domain, rowNum, error: err.message, stack: err.stack });
    return {
      domain,
      companyName: "",
      confidenceScore: 80,
      flags: Array.from(new Set(["FallbackAPIFailed", "ManualReviewRecommended"])),
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

  if (!Array.isArray(leads)) {
    validationErrors.push("Leads is not an array");
    return { validatedLeads, validationErrors };
  }

  leads.forEach((lead, i) => {
    if (!lead || typeof lead !== "object") {
      validationErrors.push(`Index ${i} not object`);
      return;
    }
    const domain = (lead.domain || "").trim().toLowerCase();
    if (!domain) {
      validationErrors.push(`Index ${i} missing domain`);
      return;
    }
    validatedLeads.push({
      domain,
      rowNum: Number.isInteger(lead.rowNum) ? lead.rowNum : i + 1,
      metaTitle: typeof lead.metaTitle === "string" ? lead.metaTitle : undefined
    });
  });

  return { validatedLeads, validationErrors };
}

/**
 * Main handler for batch enrichment
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} - JSON response
 */
export default async function handler(req, res) {
  let body = null;
  try {
    logger.info("Handler started", { method: req.method, bodyLength: req.body ? JSON.stringify(req.body).length : 0 });

    if (req.method !== "POST") {
      logger.warn("Invalid method, expected POST", { method: req.method });
      return res.status(405).json({ error: "Method not allowed, use POST" });
    }

    // Safely access req.body
    try {
      body = req.body || {};
      logger.info("Received body", { bodyLength: JSON.stringify(body).length });
    } catch (err) {
      logger.error("Failed to parse request body", { error: err.message, stack: err.stack });
      return res.status(400).json({ error: "Invalid request body" });
    }

    if (!body) {
      logger.warn("Empty body detected", {});
      return res.status(400).json({ error: "Empty body" });
    }

    const leads = body.leads || body.leadList || body.domains || body;
    logger.info("Extracted leads", { leadCount: Array.isArray(leads) ? leads.length : 0 });

    const { validatedLeads, validationErrors } = validateLeads(leads);
    logger.info("Validated leads", { validatedLeads: validatedLeads.length, validationErrors });

    if (validatedLeads.length === 0) {
      logger.warn("No valid leads", { validationErrors });
      return res.status(400).json({ error: "No valid leads", details: validationErrors });
    }

    const successful = [];
    const manualReviewQueue = [];
    const fallbackTriggers = [];
    let totalTokens = 0;

    const processLead = async (lead) => {
      const { domain, rowNum, metaTitle } = lead;
      const domainKey = domain.toLowerCase();
      logger.info("Processing lead", { domain, rowNum });

      try {
        if (processedDomains.has(domainKey)) {
          const cached = domainCache.get(domainKey);
          if (cached) {
            logger.info("Using cached result", { domain: domainKey, cached });
            return {
 |             domain,
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
        try {
          logger.info("Calling extractBrandOfCityFromDomain", { domain: domainKey });
          const match = extractBrandOfCityFromDomain(domainKey);
          brandDetected = match.brand || null;
          cityDetected = match.city || null;
          logger.info("extractBrandOfCityFromDomain result", { domain: domainKey, brandDetected, cityDetected });
        } catch (error) {
          logger.error("extractBrandOfCityFromDomain failed", { domain: domainKey, error: error.message });
        }

        if (BRAND_ONLY_DOMAINS.includes(`${domainKey}.com`)) {
          logger.info("Brand-only domain skipped", { domain: domainKey });
          finalResult = {
            companyName: "",
            confidenceScore: 0,
            flags: ["BrandOnlyDomainSkipped"],
            tokens: 0
          };
        } else {
          let humanizeError = null;
          for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
            try {
              logger.info(`Attempt ${attempt} to humanize domain`, { domain });
              const result = await humanizeName(domain, domain, !!metaTitle);
              logger.info("humanizeName result", { domain, result });
              finalResult = {
                companyName: result.companyName || "",
                confidenceScore: result.confidenceScore || 80,
                flags: Array.from(new Set(result.flags || [])),
                tokens: result.tokens || 0
              };
              tokensUsed = result.tokens || 0;
              humanizeError = null;
              break;
            } catch (error) {
              humanizeError = error;
              logger.warn(`Humanize attempt ${attempt} failed`, { domain, error: error.message });
              if (attempt < RETRY_ATTEMPTS) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
              }
            }
          }

          if (finalResult.flags.includes("BrandOnlyDomainSkipped")) {
            logger.info("Skipping fallback due to BrandOnlyDomainSkipped", { domain });
          } else if (humanizeError || finalResult.confidenceScore < 95 || finalResult.flags.includes("ManualReviewRecommended")) {
            logger.info("Calling fallback API", { domain });
            const meta = metaTitle ? { title: metaTitle } : {};
            const fallback = await callFallbackAPI(domain, rowNum, meta);
            finalResult = {
              companyName: fallback.companyName,
              confidenceScore: fallback.confidenceScore,
              flags: Array.from(new Set([...fallback.flags, "FallbackAPIUsed"])),
              tokens: fallback.tokens
            };
            tokensUsed += fallback.tokens;
            logger.info("Fallback API result", { domain, result: finalResult });

            if (humanizeError) {
              fallbackTriggers.push({
                domain,
                rowNum,
                reason: "HumanizeFailed",
                details: {
                  error: humanizeError.message,
                  primary: { companyName: "", confidenceScore: 0, flags: [] },
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
          }

          if (finalResult.flags.includes("ManualReviewRecommended")) {
            logger.info("Adding to manualReviewQueue", { domain, companyName: finalResult.companyName });
            manualReviewQueue.push({
              domain,
              companyName: finalResult.companyName,
              confidenceScore: finalResult.confidenceScore,
              flags: finalResult.flags,
              rowNum
            });
          }
        }

        if (finalResult.companyName && finalResult.companyName.split(" ").every(w => /^[A-Z]{1,3}$/.test(w))) {
          logger.info("Expanding initials", { domain, companyName: finalResult.companyName });
          const expandedName = expandInitials(finalResult.companyName);
          if (expandedName && expandedName.name !== finalResult.companyName) {
            finalResult.companyName = expandedName.name;
            finalResult.flags = Array.from(new Set([...finalResult.flags, "InitialsExpandedLocally"]));
            finalResult.confidenceScore -= 5;
          }
          logger.info("Expanded initials result", { domain, result: finalResult });
        }

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

    logger.info("Handler completed successfully", {});
    return res.status(200).json({
      successful,
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
