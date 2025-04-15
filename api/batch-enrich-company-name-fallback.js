// api/company-name-fallback.js — Version 1.0.27
import { humanizeName, extractBrandOfCityFromDomain, applyCityShortName, KNOWN_PROPER_NOUNS, capitalizeName } from "./lib/humanize.js";
import { callOpenAI } from "./lib/openai.js";

// Constants for API configuration
const BATCH_SIZE = 10;
const CONCURRENCY_LIMIT = 5;
const PROCESSING_TIMEOUT_MS = 18000;

const domainCache = new Map();

const pLimit = async (concurrency) => {
  let active = 0;
  const queue = [];
  const next = async () => {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      active--;
      await next();
    }
  };
  return (fn) => new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    next();
  });
};

const streamToString = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const timeout = setTimeout(() => reject(new Error("Stream read timeout")), 5000);

    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => {
      clearTimeout(timeout);
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });
    stream.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

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

const isInitialsOnly = (name) => {
  const words = name.split(" ");
  return words.every(w => /^[A-Z]{1,3}$/.test(w));
};

const expandInitials = (name, domain, brandDetected, cityDetected) => {
  let expanded = [];
  const words = name.split(" ");
  const domainLower = domain.toLowerCase().replace(/\.(com|net|org|co\.uk)$/, "");

  words.forEach(word => {
    if (/^[A-Z]{1,3}$/.test(word)) {
      if (cityDetected && word === cityDetected.toUpperCase().slice(0, word.length)) {
        expanded.push(applyCityShortName(cityDetected));
      } else if (brandDetected && word === brandDetected.toUpperCase().slice(0, word.length)) {
        expanded.push(BRAND_MAPPING[brandDetected.toLowerCase()] || capitalizeName(brandDetected));
      } else {
        // Check if initials match a known proper noun
        const matchingNoun = Array.from(KNOWN_PROPER_NOUNS).find(noun =>
          noun.toUpperCase().startsWith(word)
        );
        if (matchingNoun) {
          expanded.push(matchingNoun);
        } else {
          // Preserve initials case (e.g., "Slv" → "SLV")
          expanded.push(word);
        }
      }
    } else {
      expanded.push(word);
    }
  });

  return expanded.join(" ");
};

const processLead = async (lead, fallbackTriggers) => {
  const { domain, rowNum } = lead;
  const domainLower = domain.toLowerCase();
  console.error(`🌀 Fallback processing row ${rowNum}: ${domain}`);

  const cacheKey = domainLower;
  if (domainCache.has(cacheKey)) {
    const cached = domainCache.get(cacheKey);
    return {
      domain,
      companyName: cached.companyName,
      confidenceScore: cached.confidenceScore,
      flags: [...cached.flags, "CacheHit"],
      tokens: 0,
      rowNum
    };
  }

  let result;
  let tokensUsed = 0;

  const match = extractBrandOfCityFromDomain(domainLower);
  const brandDetected = match.brand || null;
  const cityDetected = match.city || null;

  try {
    result = await humanizeName(domain, domain, true);
    tokensUsed = result.tokens || 0;
    console.error(`humanizeName result for ${domain}: ${JSON.stringify(result)}`);
  } catch (error) {
    console.error(`humanizeName error for ${domain}: ${error.message}`);
    result = { name: "", confidenceScore: 0, flags: ["HumanizeError"], tokens: 0 };
  }

  result.flags = Array.isArray(result.flags) ? result.flags : [];
  result.flags.push("FallbackAPIUsed");

  const criticalFlags = ["TooGeneric", "CityNameOnly", "Skipped", "FallbackFailed", "PossibleAbbreviation"];
  const forceReviewFlags = [
    "TooGeneric", "CityNameOnly", "PossibleAbbreviation", "BadPrefixOf", "CarBrandSuffixRemaining",
    "UnverifiedCity"
  ];

  let isAcceptable = result.confidenceScore >= 75 && !result.flags.some(f => criticalFlags.includes(f));

  // Rely on humanize.js logic instead of OpenAI fallback generation
  if (result.confidenceScore < 75 || result.name.toLowerCase() === domainLower.replace(/\.(com|net|org|co\.uk)$/, "")) {
    if (KNOWN_PROPER_NOUNS.has(capitalizeName(domainLower.replace(/\.(com|net|org|co\.uk)$/, "")))) {
      result.name = capitalizeName(domainLower.replace(/\.(com|net|org|co\.uk)$/, ""));
      result.confidenceScore = 80;
      result.flags.push("ProperNounFallbackFromHumanize");
    } else {
      result.flags.push("LowConfidenceFallback");
      result.confidenceScore = 50;
    }
  }

  // Brand appending only if no context
  const brandMatch = domainLower.match(/(chevy|ford|toyota|lincoln|bmw)/i);
  const words = result.name.split(" ");
  const hasContext = result.name.toLowerCase().includes("auto") || words.length > 1 || KNOWN_PROPER_NOUNS.has(result.name);
  if (brandMatch && words.length < 3 && !hasContext) {
    const prefix = result.name.split(" ")[0] || result.name;
    result.name = `${prefix} ${capitalizeName(brandMatch[0])}`;
    result.confidenceScore += 5;
    result.flags.push("BrandAppended");
  }

  if (isInitialsOnly(result.name)) {
    const expandedName = expandInitials(result.name, domain, brandDetected, cityDetected);
    if (expandedName !== result.name) {
      result.name = expandedName;
      result.flags.push("InitialsExpandedLocally");
      result.confidenceScore -= 5;
    }
  }

  isAcceptable = result.confidenceScore >= 75 && !result.flags.some(f => criticalFlags.includes(f));

  if (!isAcceptable || result.confidenceScore < 75 || result.flags.some(f => forceReviewFlags.includes(f))) {
    fallbackTriggers.push({
      domain,
      rowNum,
      reason: "LowConfidenceOrFlagged",
      details: {
        name: result.name,
        confidenceScore: result.confidenceScore,
        flags: result.flags,
        brand: brandDetected,
        city: cityDetected
      },
      tokens: tokensUsed
    });
  }

  const finalResult = {
    domain,
    companyName: result.name || "",
    confidenceScore: result.confidenceScore,
    flags: result.flags,
    tokens: tokensUsed,
    rowNum
  };

  domainCache.set(cacheKey, {
    companyName: finalResult.companyName,
    confidenceScore: finalResult.confidenceScore,
    flags: finalResult.flags
  });

  return finalResult;
};

export default async function handler(req, res) {
  try {
    console.error("🧠 company-name-fallback.js v1.0.27 – Fallback Processing Start");

    const raw = await streamToString(req);
    if (!raw) return res.status(400).json({ error: "Empty body" });

    const body = JSON.parse(raw);
    const { validatedLeads, validationErrors } = validateLeads(body.leads || body.leadList || body.domains);

    if (validatedLeads.length === 0) {
      return res.status(400).json({ error: "No valid leads", details: validationErrors });
    }

    const limit = pLimit(CONCURRENCY_LIMIT);
    const startTime = Date.now();
    const successful = [];
    const manualReviewQueue = [];
    const fallbackTriggers = [];
    let totalTokens = 0;

    const chunks = Array.from({ length: Math.ceil(validatedLeads.length / BATCH_SIZE) }, (_, i) =>
      validatedLeads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    for (const chunk of chunks) {
      if (Date.now() - startTime > PROCESSING_TIMEOUT_MS) {
        return res.status(200).json({ successful, manualReviewQueue, totalTokens, fallbackTriggers, partial: true });
      }

      const chunkResults = await Promise.all(
        chunk.map(lead => limit(() => processLead(lead, fallbackTriggers)))
      );

      chunkResults.forEach(result => {
        const criticalFlags = ["TooGeneric", "CityNameOnly", "Skipped", "FallbackFailed", "PossibleAbbreviation"];
        const forceReviewFlags = [
          "TooGeneric", "CityNameOnly", "PossibleAbbreviation", "BadPrefixOf", "CarBrandSuffixRemaining",
          "UnverifiedCity"
        ];

        if (
          result.confidenceScore < 75 ||
          result.flags.some(f => forceReviewFlags.includes(f)) ||
          result.flags.some(f => criticalFlags.includes(f))
        ) {
          manualReviewQueue.push({
            domain: result.domain,
            name: result.companyName,
            confidenceScore: result.confidenceScore,
            flags: result.flags,
            rowNum: result.rowNum
          });
        } else {
          successful.push({
            domain: result.domain,
            companyName: result.companyName,
            confidenceScore: result.confidenceScore,
            flags: result.flags,
            rowNum: result.rowNum
          });
        }

        totalTokens += result.tokens || 0;
      });
    }

    console.error(
      `Fallback complete: ${successful.length} enriched, ${manualReviewQueue.length} to review, ` +
      `${fallbackTriggers.length} fallbacks, ${totalTokens} tokens used`
    );

    return res.status(200).json({
      successful,
      manualReviewQueue,
      fallbackTriggers,
      totalTokens,
      partial: false
    });
  } catch (error) {
    console.error(`❌ Fallback handler error: ${error.message}\n${error.stack}`);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
}

export const config = {
  api: {
    bodyParser: false
  }
};
