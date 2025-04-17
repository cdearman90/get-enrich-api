// api/batch-enrich.js v4.2.28 (debugging step 4)
console.warn("Module loading started at:", new Date().toISOString());

import { humanizeName, extractBrandOfCityFromDomain, TEST_CASE_OVERRIDES, capitalizeName, expandInitials, earlyCompoundSplit } from "./lib/humanize.js";
import { clearOpenAICache } from "./company-name-fallback.js";

console.warn("Module imports completed at:", new Date().toISOString());

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

const callFallbackAPI = async (domain, rowNum) => {
  console.warn(`callFallbackAPI started for domain: ${domain}`);
  if (BRAND_ONLY_DOMAINS.includes(`${domain.toLowerCase()}.com`)) {
    console.warn(`Brand-only domain skipped: ${domain}`);
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
    console.warn(`Fetching from fallback API: ${FALLBACK_API_URL}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      console.warn(`Fallback API timeout triggered for domain: ${domain}`);
      controller.abort();
    }, FALLBACK_API_TIMEOUT_MS);

    const response = await fetch(FALLBACK_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leads: [{ domain, rowNum }] }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    console.warn(`Fallback API response received for domain: ${domain}, status: ${response.status}`);
    const data = await response.json();

    if (!response.ok || !data.successful?.[0]) {
      throw new Error(`Fallback error ${response.status}`);
    }

    const result = data.successful[0];
    console.warn(`Fallback API result for domain ${domain}:`, result);
    return {
      domain: result.domain || domain,
      companyName: result.companyName || "",
      confidenceScore: result.confidenceScore || 0,
      flags: Array.isArray(result.flags) ? result.flags : ["InvalidFallbackResponse"],
      tokens: result.tokens || 0,
      rowNum
    };
  } catch (error) {
    console.error(`Fallback API failed for ${domain}: ${error.message}`);
    let local;
    try {
      console.warn(`Attempting local humanizeName for ${domain}`);
      local = await humanizeName(domain, domain, true);
      console.warn(`Local humanizeName result for ${domain}:`, local);
    } catch (humanizeError) {
      console.error(`Local humanizeName failed for ${domain}: ${humanizeError.message}`);
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
      console.warn(`Local compound split result for ${domain}:`, local);
    }

    return {
      domain,
      companyName: local.name,
      confidenceScore: local.confidenceScore,
      flags: [...(local.flags || []), "FallbackAPIFailed", "LocalFallbackUsed"],
      tokens: local.tokens || 0,
      rowNum,
      error: error.message
    };
  }
};

console.warn("Module constants defined at:", new Date().toISOString());

export default async function handler(req, res) {
  try {
    console.warn("Handler started at:", new Date().toISOString());
    console.warn("Request method:", req.method);
    console.warn("Request headers:", req.headers);

    if (req.method !== "POST") {
      console.warn("Invalid method, expected POST");
      return res.status(405).json({ error: "Method not allowed, use POST" });
    }

    const body = req.body;
    console.warn(`Received body: ${JSON.stringify(body)}`);
    if (!body) {
      console.warn("Empty body detected");
      return res.status(400).json({ error: "Empty body" });
    }

    const leads = body.leads || body.leadList || body.domains;
    console.warn("Extracted leads:", leads);
    if (!Array.isArray(leads)) {
      console.warn("Leads is not an array");
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

    console.warn("Validated leads:", validatedLeads);
    console.warn("Validation errors:", validationErrors);

    if (validatedLeads.length === 0) {
      console.warn("No valid leads");
      return res.status(400).json({ error: "No valid leads", details: validationErrors });
    }

    const successful = [];
    const manualReviewQueue = [];
    const fallbackTriggers = [];
    let totalTokens = 0;

    for (const lead of validatedLeads) {
      console.warn("Processing lead:", lead);
      const { domain, rowNum } = lead;
      const domainKey = domain.toLowerCase();

      if (processedDomains.has(domainKey)) {
        const cached = domainCache.get(domainKey);
        if (cached) {
          console.warn("Using cached result for domain:", domainKey);
          successful.push({
            domain,
            companyName: cached.companyName,
            confidenceScore: cached.confidenceScore,
            flags: [...cached.flags, "DuplicateSkipped"],
            tokens: 0,
            rowNum
          });
          continue;
        }
      }

      if (BRAND_ONLY_DOMAINS.includes(`${domainKey}.com`)) {
        console.warn(`Brand-only domain skipped: ${domainKey}`);
        successful.push({
          domain,
          companyName: "",
          confidenceScore: 0,
          flags: ["BrandOnlyDomainSkipped"],
          tokens: 0,
          rowNum
        });
        continue;
      }

      let finalResult = { companyName: "", confidenceScore: 0, flags: [], tokens: 0 };
      let tokensUsed = 0;

      let brandDetected = null;
      let cityDetected = null;
      try {
        console.warn(`Calling extractBrandOfCityFromDomain for ${domainKey}`);
        const match = extractBrandOfCityFromDomain(domainKey);
        brandDetected = match.brand || null;
        cityDetected = match.city || null;
        console.warn(`extractBrandOfCityFromDomain result for ${domainKey}:`, { brandDetected, cityDetected });
      } catch (error) {
        console.error(`extractBrandOfCityFromDomain error for ${domainKey}: ${error.message}`);
        brandDetected = null;
        cityDetected = null;
      }

      let humanizeError = null;
      for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
        try {
          console.warn(`Attempt ${attempt} to humanize domain: ${domain}`);
          const result = await humanizeName(domain, domain, true);
          console.warn(`humanizeName result for ${domain}:`, result);
          finalResult = {
            companyName: result.name || "",
            confidenceScore: result.confidenceScore || 0,
            flags: result.flags || [],
            tokens: result.tokens || 0
          };
          tokensUsed = result.tokens || 0;
          humanizeError = null;
          break;
        } catch (error) {
          humanizeError = error;
          console.warn(`Humanize attempt ${attempt} failed for domain ${domain}: ${error.message}`);
          if (attempt < RETRY_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          }
        }
      }

      // Add to manualReviewQueue if ManualReviewRecommended flag is present
      if (finalResult.flags.includes("ManualReviewRecommended")) {
        console.warn(`Adding ${domain} to manualReviewQueue`);
        manualReviewQueue.push({
          domain,
          name: finalResult.companyName,
          confidenceScore: finalResult.confidenceScore,
          flags: finalResult.flags,
          rowNum
        });
      }

      if (humanizeError || finalResult.confidenceScore < 75) {
        console.warn(`Calling fallback API for domain: ${domain}`);
        const fallback = await callFallbackAPI(domain, rowNum);
        finalResult = {
          companyName: fallback.companyName,
          confidenceScore: fallback.confidenceScore,
          flags: [...fallback.flags, "FallbackAPIUsed"],
          tokens: fallback.tokens
        };
        tokensUsed += fallback.tokens;
        console.warn(`Fallback API result for domain: ${domain}:`, finalResult);

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

        // Add to manualReviewQueue if ManualReviewRecommended flag is present in fallback result
        if (finalResult.flags.includes("ManualReviewRecommended")) {
          console.warn(`Adding ${domain} to manualReviewQueue after fallback`);
          manualReviewQueue.push({
            domain,
            name: finalResult.companyName,
            confidenceScore: finalResult.confidenceScore,
            flags: finalResult.flags,
            rowNum
          });
        }
      }

      if (finalResult.companyName && finalResult.companyName.split(" ").every(w => /^[A-Z]{1,3}$/.test(w))) {
        console.warn(`Expanding initials for: ${finalResult.companyName}`);
        const expandedName = expandInitials(finalResult.companyName);
        if (expandedName && expandedName.name !== finalResult.companyName) {
          finalResult.companyName = expandedName.name;
          finalResult.flags.push("InitialsExpandedLocally");
          finalResult.confidenceScore -= 5;
        }
        console.warn(`Expanded initials result:`, finalResult);
      }

      domainCache.set(domainKey, {
        companyName: finalResult.companyName,
        confidenceScore: finalResult.confidenceScore,
        flags: finalResult.flags
      });
      processedDomains.add(domainKey);

      totalTokens += tokensUsed;
      console.warn("Lead processing complete for:", domain, finalResult);
      successful.push({
        domain,
        companyName: finalResult.companyName,
        confidenceScore: finalResult.confidenceScore,
        flags: finalResult.flags,
        tokens: tokensUsed,
        rowNum
      });
    }

    console.warn("Handler completed successfully at:", new Date().toISOString());
    return res.status(200).json({
      successful,
      manualReviewQueue,
      fallbackTriggers,
      totalTokens,
      partial: false
    });
  } catch (error) {
    console.error(`Handler error: ${error.message}`);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
}

export const resetProcessedDomains = async (req, res) => {
  console.warn("Resetting processed domains at:", new Date().toISOString());
  processedDomains.clear();
  domainCache.clear();
  clearOpenAICache();
  console.warn("Processed domains and OpenAI cache reset");
  return res.status(200).json({ message: "Processed domains and OpenAI cache reset" });
};

console.warn("Module loading completed at:", new Date().toISOString());
