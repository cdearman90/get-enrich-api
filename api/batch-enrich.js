// api/batch-enrich.js — Version 4.2.16
console.error("Starting batch-enrich.js module loading...");
try {
  const { humanizeName, extractBrandOfCityFromDomain, TEST_CASE_OVERRIDES, capitalizeName, expandInitials, earlyCompoundSplit } = await import("./lib/humanize.js");
  console.error("Successfully imported humanize.js");
} catch (error) {
  console.error("Failed to import humanize.js:", error.message, error.stack);
  throw error;
}

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

const callFallbackAPI = async (domain, rowNum) => {
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
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (error) {
      console.error(`Invalid JSON response for ${domain}: ${error.message}`);
      throw new Error(`Invalid JSON: ${text}`);
    }

    if (!response.ok || !data.successful?.[0]) {
      console.error(`Fallback error for ${domain}: ${response.status}: ${data.error || text}`);
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
    let tokensUsed = local.tokens || 0;

    if (!local.name || local.confidenceScore < 75 || local.name.toLowerCase() === domain.replace(/\.(com|net|org|co\.uk)$/, "")) {
      const splitName = earlyCompoundSplit(domain.split(".")[0]);
      local = {
        name: capitalizeName(splitName),
        confidenceScore: 80,
        flags: [...(local.flags || []), "LocalCompoundSplit"],
        tokens: 0
      };
    }

    const brandMatch = domain.match(/(chevy|ford|toyota|lincoln|bmw)/i);
    if (brandMatch && (local.name || "").split(" ").length < 3) {
      const prefix = (local.name || "").split(" ")[0] || local.name || domain.split(".")[0];
      local.name = `${prefix} ${capitalizeName(brandMatch[0])}`;
      local.confidenceScore = (local.confidenceScore || 0) + 5;
      local.flags = [...(local.flags || []), "BrandAppended"];
    }

    if (!brandMatch && !local.name.includes("Auto") && domain.match(/realty|exp|group/i)) {
      const baseName = domain.split(".")[0].replace(/realty|exp|group/i, "").trim();
      local.name = `${capitalizeName(baseName)} Realty`;
      local.confidenceScore = Math.max(local.confidenceScore, 70);
      local.flags = [...(local.flags || []), "NonDealershipFallback"];
    }

    return {
      domain,
      companyName: local.name || "",
      confidenceScore: local.confidenceScore || 0,
      flags: [...(local.flags || []), "FallbackAPIFailed", "LocalFallbackUsed"],
      tokens: tokensUsed,
      rowNum,
      error: error.message
    };
  }
};

const streamToString = async (req) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const timeout = setTimeout(() => reject(new Error("Stream timeout")), 5000);

    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      clearTimeout(timeout);
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });
    req.on("error", (error) => {
      console.error(`Stream error: ${error.message}`);
      clearTimeout(timeout);
      reject(error);
    });
  });
};

export default async function handler(req, res) {
  try {
    console.error("🧠 batch-enrich.js v4.2.16 – Domain Processing Start");

    const raw = await streamToString(req);
    if (!raw) return res.status(400).json({ error: "Empty body" });

    let body;
    try {
      body = JSON.parse(raw);
    } catch (error) {
      console.error(`Invalid JSON body: ${error.message}`);
      return res.status(400).json({ error: "Invalid JSON body", details: error.message });
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
        console.error("Processing timeout reached");
        return res.status(200).json({ successful, manualReviewQueue, totalTokens, fallbackTriggers, partial: true });
      }

      const chunkResults = await Promise.all(
        chunk.map(lead => limit(async () => {
          const { domain, rowNum } = lead;
          const domainKey = domain.toLowerCase();

          console.error(`Processing lead: ${domain} (Row ${rowNum})`);

          if (processedDomains.has(domainKey)) {
            const cached = domainCache.get(domainKey);
            if (cached) {
              console.error(`Skipping duplicate: ${domain}`);
              return {
                domain,
                companyName: cached.companyName || "",
                confidenceScore: cached.confidenceScore || 0,
                flags: [...(cached.flags || []), "DuplicateSkipped"],
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
              companyName: result.name || "",
              confidenceScore: result.confidenceScore || 0,
              flags: result.flags || [],
              tokens: result.tokens || 0
            };
            tokensUsed = finalResult.tokens || 0;
          } else {
            let humanizeError = null;
            for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
              try {
                const result = await humanizeName(domain, domain, true);
                finalResult = {
                  companyName: result.name || "",
                  confidenceScore: result.confidenceScore || 0,
                  flags: result.flags || [],
                  tokens: result.tokens || 0
                };
                tokensUsed = finalResult.tokens || 0;
                humanizeError = null;
                break;
              } catch (error) {
                console.error(`humanizeName attempt ${attempt} failed for ${domain}: ${error.message}`);
                humanizeError = error;
                if (attempt < RETRY_ATTEMPTS) {
                  await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                }
              }
            }

            if (humanizeError) {
              const fallback = await callFallbackAPI(domain, rowNum);
              finalResult = {
                companyName: fallback.companyName || "",
                confidenceScore: fallback.confidenceScore || 0,
                flags: fallback.flags || [],
                tokens: fallback.tokens || 0
              };
              tokensUsed += finalResult.tokens || 0;
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
                      name: finalResult.companyName || "",
                      confidenceScore: finalResult.confidenceScore || 0,
                      flags: finalResult.flags || []
                    },
                    brand: brandDetected,
                    city: cityDetected
                  },
                  tokens: tokensUsed
                });
              }
            }

            if (!finalResult.companyName) {
              console.error(`Empty companyName for ${domain}`);
              finalResult = {
                companyName: "",
                confidenceScore: 0,
                flags: [...(finalResult.flags || []), "EmptyCompanyName"],
                tokens: tokensUsed
              };
            }

            const criticalFlags = ["TooGeneric", "CityNameOnly", "FallbackFailed", "Skipped"];
            const isAcceptable = finalResult.confidenceScore >= 75 &&
              !finalResult.flags.some(f => criticalFlags.includes(f));

            if (!isAcceptable) {
              const primary = { ...finalResult };
              const fallback = await callFallbackAPI(domain, rowNum);
              tokensUsed += fallback.tokens || 0;

              if (
                fallback.companyName &&
                fallback.confidenceScore >= 75 &&
                !fallback.flags.some(f => criticalFlags.includes(f))
              ) {
                finalResult = {
                  companyName: fallback.companyName,
                  confidenceScore: fallback.confidenceScore,
                  flags: [...(fallback.flags || []), "FallbackAPIUsed"],
                  tokens: fallback.tokens || 0,
                  rowNum
                };
              } else {
                finalResult.flags = [...(finalResult.flags || []), "FallbackAPIFailed"];
                fallbackTriggers.push({
                  domain,
                  rowNum,
                  reason: "FallbackAPIFailed",
                  details: {
                    primary: {
                      name: primary.companyName || "",
                      confidenceScore: primary.confidenceScore || 0,
                      flags: primary.flags || []
                    },
                    fallback: {
                      name: fallback.companyName || "",
                      confidenceScore: fallback.confidenceScore || 0,
                      flags: fallback.flags || []
                    },
                    brand: brandDetected,
                    city: cityDetected
                  },
                  tokens: tokensUsed
                });
              }
            }
          }

          const reviewFlags = ["TooGeneric", "CityNameOnly", "PossibleAbbreviation"];
          const confidenceThreshold = finalResult.flags.some(f => ["SingleWordProperNoun", "ProperNounBoost"].includes(f)) ? 70 : 75;
          if (
            finalResult.confidenceScore < confidenceThreshold ||
            finalResult.flags.some(f => reviewFlags.includes(f))
          ) {
            manualReviewQueue.push({
              domain,
              name: finalResult.companyName || "",
              confidenceScore: finalResult.confidenceScore || 0,
              flags: finalResult.flags || [],
              rowNum
            });
            finalResult.flags = [...(finalResult.flags || []), "LowConfidence"];
            finalResult.confidenceScore = Math.max(finalResult.confidenceScore || 0, 50);
          }

          if (finalResult.companyName && finalResult.companyName.split(" ").every(w => /^[A-Z]{1,3}$/.test(w))) {
            const expandedName = expandInitials(finalResult.companyName, domain, brandDetected, cityDetected);
            if (expandedName && expandedName !== finalResult.companyName) {
              finalResult.companyName = expandedName;
              finalResult.flags.push("InitialsExpandedLocally");
              finalResult.confidenceScore -= 5;
            }
          }

          domainCache.set(domainKey, {
            companyName: finalResult.companyName || "",
            confidenceScore: finalResult.confidenceScore || 0,
            flags: finalResult.flags || []
          });
          processedDomains.add(domainKey);

          totalTokens += tokensUsed;
          return {
            domain,
            companyName: finalResult.companyName || "",
            confidenceScore: finalResult.confidenceScore || 0,
            flags: finalResult.flags || [],
            rowNum,
            tokens: tokensUsed
          };
        }))
      );

      successful.push(...chunkResults);
    }

    console.error(
      `Batch complete: enriched=${successful.length}, review=${manualReviewQueue.length}, fallbacks=${fallbackTriggers.length}, tokens=${totalTokens}`
    );

    return res.status(200).json({
      successful,
      manualReviewQueue,
      fallbackTriggers,
      totalTokens,
      partial: false
    });
  } catch (error) {
    console.error(`❌ Handler error: ${error.message}\n${error.stack}`);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
}

export const resetProcessedDomains = async (req, res) => {
  processedDomains.clear();
  domainCache.clear();
  return res.status(200).json({ message: "Processed domains reset" });
};

export const config = {
  api: {
    bodyParser: false
  }
};
