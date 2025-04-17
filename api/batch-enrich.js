// api/batch-enrich.js v4.2.36
// Batch orchestration for domain enrichment

import {
  humanizeName,
  extractBrandOfCityFromDomain,
  capitalizeName,
  expandInitials,
  earlyCompoundSplit
} from "./lib/humanize.js";
import { clearOpenAICache, companyNameFallback } from "./company-name-fallback.js";
import winston from "winston";
import path from "path";

// Initialize Winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join("logs", "enrich.log"),
      maxsize: 5242880,
      maxFiles: 5
    }),
    new winston.transports.Console()
  ]
});

// Log server startup
logger.info("Module loading started", { version: "4.2.36" });

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

// Simulated BRAND_ONLY_DOMAINS
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
 * Calls fallback logic directly (replacing fetch to FALLBACK_API_URL)
 * @param {string} domain - Domain to enrich
 * @param {number} rowNum - Row number
 * @param {Object} meta - Meta data
 * @returns {Object} - Fallback result
 */
async function callFallbackAPI(domain, rowNum, meta = {}) {
  logger.info("callFallbackAPI started", { domain, rowNum });

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
      const humanizeResult = await humanizeName(domain, domain, true);
      const fallback = await companyNameFallback(domain, {
        companyName: humanizeResult.name || "",
        confidenceScore: humanizeResult.confidenceScore || 0,
        flags: humanizeResult.flags || [],
        metaTitle: meta.title
      });

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
}

/**
 * Main handler for batch enrichment
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} - JSON response
 */
export default async function handler(req, res) {
  try {
    logger.info("Handler started", { method: req.method });

    if (req.method !== "POST") {
      logger.warn("Invalid method, expected POST", { method: req.method });
      return res.status(405).json({ error: "Method not allowed, use POST" });
    }

    const body = req.body;
    if (!body) {
      logger.warn("Empty body detected", {});
      return res.status(400).json({ error: "Empty body" });
    }

    const leads = body.leads || body.leadList || body.domains || body;
    logger.info("Extracted leads", { leadCount: Array.isArray(leads) ? leads.length : 0 });
    if (!Array.isArray(leads)) {
      logger.warn("Leads is not an array", { leads });
      return res.status(400).json({ error: "Leads must be an array" });
    }

    const validatedLeads = [];
    const validationErrors = [];

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
        rowNum: lead.rowNum || i + 1,
        metaTitle: lead.metaTitle || undefined
      });
    });

    logger.info("Validated leads", { validatedLeads, validationErrors });
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

      if (processedDomains.has(domainKey)) {
        const cached = domainCache.get(domainKey);
        if (cached) {
          logger.info("Using cached result", { domain: domainKey, cached });
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
    logger.error("Handler error", { error: error.message, stack: error.stack });
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
  processedDomains.clear();
  domainCache.clear();
  clearOpenAICache();
  logger.info("Processed domains and OpenAI cache reset", {});
  return res.status(200).json({ message: "Processed domains and OpenAI cache reset" });
};

logger.info("Module loading completed", {});
