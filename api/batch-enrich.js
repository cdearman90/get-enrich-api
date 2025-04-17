// api/batch-enrich.js v4.2.30
// Orchestrates lead enrichment with humanize.js and company-name-fallback.js

log('info', 'Module loading started', { timestamp: new Date().toISOString() });

import { humanizeName, extractBrandOfCityFromDomain, TEST_CASE_OVERRIDES, capitalizeName, expandInitials, earlyCompoundSplit } from "./lib/humanize.js";
import { clearOpenAICache } from "./company-name-fallback.js";

log('info', 'Module imports completed', { timestamp: new Date().toISOString() });

/**
 * Structured logger
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Log message
 * @param {object} context - Additional context
 */
function log(level, message, context = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  };
  console[level](JSON.stringify(logEntry, null, 2));
}

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

const domainCache = new Map();
const processedDomains = new Set();

const FALLBACK_API_URL = "/api/company-name-fallback";
const FALLBACK_API_TIMEOUT_MS = parseInt(process.env.FALLBACK_API_TIMEOUT_MS, 10) || 6000;
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

async function callFallbackAPI(domain, rowNum) {
  log('info', 'callFallbackAPI started', { domain, rowNum });

  // Skip fallback for brand-only domains
  if (BRAND_ONLY_DOMAINS.includes(`${domain.toLowerCase()}.com`)) {
    log('warn', 'Brand-only domain skipped in callFallbackAPI', { domain });
    return {
      domain,
      companyName: "",
      confidenceScore: 0,
      flags: ["BrandOnlyDomainSkipped"],
      tokens: 0,
      rowNum
    };
  }

  try {
    log('info', `Fetching from fallback API: ${FALLBACK_API_URL}`, { domain });
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      log('warn', 'Fallback API timeout triggered', { domain });
      controller.abort();
    }, FALLBACK_API_TIMEOUT_MS);

    const response = await fetch(FALLBACK_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leads: [{ domain, rowNum }] }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    log('info', 'Fallback API response received', { domain, status: response.status });

    const data = await response.json();
    if (!response.ok || !data.successful?.[0]) {
      throw new Error(`Fallback error ${response.status}`);
    }

    const result = data.successful[0];
    log('info', 'Fallback API result', { domain, result });
    return {
      domain: result.domain || domain,
      companyName: result.companyName || "",
      confidenceScore: result.confidenceScore || 0,
      flags: Array.isArray(result.flags) ? Array.from(new Set(result.flags)) : ["InvalidFallbackResponse"], // Deduplicate flags
      tokens: result.tokens || 0,
      rowNum
    };
  } catch (error) {
    log('error', 'Fallback API failed', { domain, error: error.message });

    let local;
    try {
      log('info', 'Attempting local humanizeName', { domain });
      local = await humanizeName(domain, domain, true);
      log('info', 'Local humanizeName result', { domain, result: local });
    } catch (humanizeError) {
      log('error', 'Local humanizeName failed', { domain, error: humanizeError.message });
      local = { name: "", confidenceScore: 0, flags: ["InvalidHumanizeResponse"], tokens: 0 };
    }

    if (!local.name || typeof local.name !== "string") {
      local.name = "";
      local.flags = [...(local.flags || []), "InvalidHumanizeResponse"];
    }

    if (!local.name || local.confidenceScore < 75) {
      const splitName = earlyCompoundSplit(domain.split(".")[0]);
      local.name = capitalizeName(splitName).name || "";
      local.confidenceScore = 80;
      local.flags = [...(local.flags || []), "LocalCompoundSplit"];
      log('info', 'Local compound split result', { domain, result: local });
    }

    return {
      domain,
      companyName: local.name,
      confidenceScore: local.confidenceScore,
      flags: Array.from(new Set([...(local.flags || []), "FallbackAPIFailed", "LocalFallbackUsed"])), // Deduplicate flags
      tokens: local.tokens || 0,
      rowNum,
      error: error.message
    };
  }
}

log('info', 'Module constants defined', { timestamp: new Date().toISOString() });

export default async function handler(req, res) {
  try {
    log('info', 'Handler started', { method: req.method, headers: req.headers });

    if (req.method !== "POST") {
      log('warn', 'Invalid method, expected POST', { method: req.method });
      return res.status(405).json({ error: "Method not allowed, use POST" });
    }

    const body = req.body;
    log('info', 'Received body', { body });
    if (!body) {
      log('warn', 'Empty body detected', {});
      return res.status(400).json({ error: "Empty body" });
    }

    const leads = body.leads || body.leadList || body.domains;
    log('info', 'Extracted leads', { leads });
    if (!Array.isArray(leads)) {
      log('warn', 'Leads is not an array', { leads });
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
      validatedLeads.push({ domain, rowNum: lead.rowNum || i + 1 });
    });

    log('info', 'Validated leads', { validatedLeads, validationErrors });
    if (validatedLeads.length === 0) {
      log('warn', 'No valid leads', { validationErrors });
      return res.status(400).json({ error: "No valid leads", details: validationErrors });
    }

    const successful = [];
    const manualReviewQueue = [];
    const fallbackTriggers = [];
    let totalTokens = 0;

    for (const lead of validatedLeads) {
      log('info', 'Processing lead', { lead });
      const { domain, rowNum } = lead;
      const domainKey = domain.toLowerCase();

      // Check cache for duplicates
      if (processedDomains.has(domainKey)) {
        const cached = domainCache.get(domainKey);
        if (cached) {
          log('info', 'Using cached result', { domain: domainKey, cached });
          successful.push({
            domain,
            companyName: cached.companyName,
            confidenceScore: cached.confidenceScore,
            flags: Array.from(new Set([...cached.flags, "DuplicateSkipped"])), // Deduplicate flags
            tokens: 0,
            rowNum
          });
          continue;
        }
      }

      let finalResult = { companyName: "", confidenceScore: 0, flags: [], tokens: 0 };
      let tokensUsed = 0;

      let brandDetected = null;
      let cityDetected = null;
      try {
        log('info', 'Calling extractBrandOfCityFromDomain', { domain: domainKey });
        const match = extractBrandOfCityFromDomain(domainKey);
        brandDetected = match.brand || null;
        cityDetected = match.city || null;
        log('info', 'extractBrandOfCityFromDomain result', { domain: domainKey, brandDetected, cityDetected });
      } catch (error) {
        log('error', 'extractBrandOfCityFromDomain failed', { domain: domainKey, error: error.message });
        brandDetected = null;
        cityDetected = null;
      }

      // Skip processing for brand-only domains
      if (BRAND_ONLY_DOMAINS.includes(`${domainKey}.com`)) {
        log('warn', 'Brand-only domain skipped', { domain: domainKey });
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
            log('info', `Attempt ${attempt} to humanize domain`, { domain });
            const result = await humanizeName(domain, domain, true);
            log('info', 'humanizeName result', { domain, result });
            finalResult = {
              companyName: result.name || "",
              confidenceScore: result.confidenceScore || 0,
              flags: Array.from(new Set(result.flags || [])), // Deduplicate flags
              tokens: result.tokens || 0
            };
            tokensUsed = result.tokens || 0;
            humanizeError = null;
            break;
          } catch (error) {
            humanizeError = error;
            log('warn', `Humanize attempt ${attempt} failed`, { domain, error: error.message });
            if (attempt < RETRY_ATTEMPTS) {
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            }
          }
        }

        // Skip fallback if BrandOnlyDomainSkipped or high-confidence result
        if (finalResult.flags.includes("BrandOnlyDomainSkipped")) {
          log('info', 'Skipping fallback due to BrandOnlyDomainSkipped', { domain });
        } else if (humanizeError || finalResult.confidenceScore < 75) {
          log('info', 'Calling fallback API', { domain });
          const fallback = await callFallbackAPI(domain, rowNum);
          finalResult = {
            companyName: fallback.companyName,
            confidenceScore: fallback.confidenceScore,
            flags: Array.from(new Set([...fallback.flags, "FallbackAPIUsed"])), // Deduplicate flags
            tokens: fallback.tokens
          };
          tokensUsed += fallback.tokens;
          log('info', 'Fallback API result', { domain, result: finalResult });

          if (humanizeError) {
            fallbackTriggers.push({
              domain,
              rowNum,
              reason: "HumanizeFailed",
              details: {
                error: humanizeError.message,
                primary: {
                  name: "",
                  confidenceScore: 0,
                  flags: []
                },
                fallback: {
                  name: finalResult.companyName,
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

        // Add to manualReviewQueue if ManualReviewRecommended flag is present
        if (finalResult.flags.includes("ManualReviewRecommended")) {
          log('info', 'Adding to manualReviewQueue', { domain, name: finalResult.companyName });
          manualReviewQueue.push({
            domain,
            name: finalResult.companyName,
            confidenceScore: finalResult.confidenceScore,
            flags: finalResult.flags,
            rowNum
          });
        }
      }

      // Handle abbreviation expansion
      if (finalResult.companyName && finalResult.companyName.split(" ").every(w => /^[A-Z]{1,3}$/.test(w))) {
        log('info', 'Expanding initials', { domain, name: finalResult.companyName });
        const expandedName = expandInitials(finalResult.companyName);
        if (expandedName && expandedName.name !== finalResult.companyName) {
          finalResult.companyName = expandedName.name;
          finalResult.flags = Array.from(new Set([...finalResult.flags, "InitialsExpandedLocally"])); // Deduplicate flags
          finalResult.confidenceScore -= 5;
        }
        log('info', 'Expanded initials result', { domain, result: finalResult });
      }

      // Cache and track processed domains
      domainCache.set(domainKey, {
        companyName: finalResult.companyName,
        confidenceScore: finalResult.confidenceScore,
        flags: finalResult.flags
      });
      processedDomains.add(domainKey);

      totalTokens += tokensUsed;
      log('info', 'Lead processing complete', { domain, result: finalResult });
      successful.push({
        domain,
        companyName: finalResult.companyName,
        confidenceScore: finalResult.confidenceScore,
        flags: finalResult.flags,
        tokens: tokensUsed,
        rowNum
      });
    }

    log('info', 'Handler completed successfully', { timestamp: new Date().toISOString() });
    return res.status(200).json({
      successful,
      manualReviewQueue,
      fallbackTriggers,
      totalTokens,
      partial: false
    });
  } catch (error) {
    log('error', 'Handler error', { error: error.message });
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
}

export const resetProcessedDomains = async (req, res) => {
  log('info', 'Resetting processed domains', { timestamp: new Date().toISOString() });
  processedDomains.clear();
  domainCache.clear();
  clearOpenAICache();
  log('info', 'Processed domains and OpenAI cache reset', {});
  return res.status(200).json({ message: "Processed domains and OpenAI cache reset" });
};

log('info', 'Module loading completed', { timestamp: new Date().toISOString() });
