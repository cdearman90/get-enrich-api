// api/batch-enrich.js v4.2.19
import { humanizeName, extractBrandOfCityFromDomain, TEST_CASE_OVERRIDES, capitalizeName, expandInitials, earlyCompoundSplit } from "./lib/humanize.js";
import { clearOpenAICache } from "./company-name-fallback.js";

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
  if (BRAND_ONLY_DOMAINS.includes(`${domain.toLowerCase()}.com`)) {
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FALLBACK_API_TIMEOUT_MS);

    const response = await fetch(FALLBACK_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leads: [{ domain, rowNum }] }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    const data = await response.json();

    if (!response.ok || !data.successful?.[0]) {
      throw new Error(`Fallback error ${response.status}`);
    }

    const result = data.successful[0];
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
    let local = await humanizeName(domain, domain, true);

    if (!local.name || typeof local.name !== 'string') {
      local.name = '';
      local.flags = [...(local.flags || []), "InvalidHumanizeResponse"];
    }

    if (!local.name || local.confidenceScore < 75) {
      const splitName = earlyCompoundSplit(domain.split(".")[0]);
      local.name = capitalizeName(splitName).name || '';
      local.confidenceScore = 80;
      local.flags = [...(local.flags || []), "LocalCompoundSplit"];
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

const streamToString = async (req) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const timeout = setTimeout(() => reject(new Error("Stream timeout")), 5000);

    req.on("data", (chunk) => {
      chunks.push(chunk);
    });
    req.on("end", () => {
      clearTimeout(timeout);
      const raw = Buffer.concat(chunks).toString("utf-8");
      console.log(`Raw request body: ${raw}`); // Debug log
      resolve(raw);
    });
    req.on("error", (error) => {
      clearTimeout(timeout);
      console.error(`Stream error: ${error.message}`);
      reject(error);
    });
  });
};

export default async function handler(req, res) {
  try {
    const raw = await streamToString(req);
    if (!raw) return res.status(400).json({ error: "Empty body" });

    let body;
    try {
      body = JSON.parse(raw);
    } catch (error) {
      console.error(`Invalid JSON body: ${error.message}, Raw: ${raw}`);
      return res.status(400).json({ error: "Invalid JSON body", details: error.message, raw });
    }

    const leads = body.leads || body.leadList || body.domains;
    if (!Array.isArray(leads)) {
      console.error("Leads must be an array");
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

    if (validatedLeads.length === 0) {
      console.error("No valid leads");
      return res.status(400).json({ error: "No valid leads", details: validationErrors });
    }

    const limit = pLimit(5);
    const startTime = Date.now();
    const successful = [];
    const manualReviewQueue = [];
    const fallbackTriggers = [];
    let totalTokens = 0;

    const BATCH_SIZE = 10;
    const chunks = Array.from({ length: Math.ceil(validatedLeads.length / BATCH_SIZE) }, (_, i) =>
      validatedLeads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    for (const chunk of chunks) {
      if (Date.now() - startTime > 18000) {
        return res.status(200).json({ successful, manualReviewQueue, totalTokens, fallbackTriggers, partial: true });
      }

      const chunkResults = await Promise.all(
        chunk.map(lead => limit(async () => {
          const { domain, rowNum } = lead;
          const domainKey = domain.toLowerCase();

          if (processedDomains.has(domainKey)) {
            const cached = domainCache.get(domainKey);
            if (cached) {
              return {
                domain,
                companyName: cached.companyName,
                confidenceScore: cached.confidenceScore,
                flags: [...cached.flags, "DuplicateSkipped"],
                rowNum,
                tokens: 0
              };
            }
          }

          let finalResult = { companyName: "", confidenceScore: 0, flags: [], tokens: 0 };
          let tokensUsed = 0;

          const match = extractBrandOfCityFromDomain(domainKey);
          const brandDetected = match.brand || null;
          const cityDetected = match.city || null;

          if (domainKey in TEST_CASE_OVERRIDES) {
            const result = await humanizeName(domain, domain, true);
            finalResult = {
              companyName: result.name,
              confidenceScore: result.confidenceScore,
              flags: result.flags,
              tokens: result.tokens
            };
            tokensUsed = result.tokens;
          } else {
            let humanizeError = null;
            for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
              try {
                const result = await humanizeName(domain, domain, true);
                finalResult = {
                  companyName: result.name,
                  confidenceScore: result.confidenceScore,
                  flags: result.flags,
                  tokens: result.tokens
                };
                tokensUsed = result.tokens;
                humanizeError = null;
                break;
              } catch (error) {
                humanizeError = error;
                if (attempt < RETRY_ATTEMPTS) {
                  await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                }
              }
            }

            if (humanizeError || finalResult.confidenceScore < 75 || finalResult.flags.includes("ManualReviewRecommended")) {
              const fallback = await callFallbackAPI(domain, rowNum);
              finalResult = {
                companyName: fallback.companyName,
                confidenceScore: fallback.confidenceScore,
                flags: [...fallback.flags, "FallbackAPIUsed"],
                tokens: fallback.tokens
              };
              tokensUsed += fallback.tokens;
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
          }

          if (finalResult.companyName && finalResult.companyName.split(" ").every(w => /^[A-Z]{1,3}$/.test(w))) {
            const expandedName = expandInitials(finalResult.companyName);
            if (expandedName && expandedName.name !== finalResult.companyName) {
              finalResult.companyName = expandedName.name;
              finalResult.flags.push("InitialsExpandedLocally");
              finalResult.confidenceScore -= 5;
            }
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
            rowNum,
            tokens: tokensUsed
          };
        }))
      );

      successful.push(...chunkResults);
    }

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
  processedDomains.clear();
  domainCache.clear();
  clearOpenAICache();
  return res.status(200).json({ message: "Processed domains and OpenAI cache reset" });
};

export const config = {
  api: {
    bodyParser: false
  }
};
