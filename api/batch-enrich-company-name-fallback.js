// api/company-name-fallback.js
// Fallback logic using OpenAI with caching

import { humanizeName, getMetaTitleBrand, KNOWN_CITIES_SET } from "./lib/humanize.js";
import { callOpenAI } from "./lib/openai.js";
import winston from "winston";
import path from "path";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join("logs", "enrich.log"), maxsize: 5242880, maxFiles: 5 }),
    new winston.transports.Console()
  ]
});

/**
 * Logs messages with Winston
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 */
function log(level, message, context = {}) {
  logger[level]({ message, domain: context.domain || null, ...context });
}

const CAR_BRANDS = [
  "acura", "alfa romeo", "amc", "aston martin", "audi", "bentley", "bmw", "bugatti", "buick",
  "cadillac", "carmax", "cdj", "cdjrf", "cdjr", "chev", "chevvy", "chevrolet", "chrysler", "cjd",
  "daewoo", "dodge", "eagle", "ferrari", "fiat", "ford", "genesis", "gmc", "honda", "hummer",
  "hyundai", "inf", "infiniti", "isuzu", "jaguar", "jeep", "jlr", "kia", "lamborghini", "land rover",
  "landrover", "lexus", "lincoln", "lucid", "maserati", "maz", "mazda", "mb", "merc", "mercedes",
  "mercedes-benz", "mercedesbenz", "merk", "mini", "mitsubishi", "nissan", "oldsmobile", "plymouth",
  "polestar", "pontiac", "porsche", "ram", "rivian", "rolls-royce", "saab", "saturn", "scion",
  "smart", "subaru", "subie", "suzuki", "tesla", "toyota", "volkswagen", "volvo", "vw", "chevy",
  "honda"
];

const BRAND_MAPPING = {
  "acura": "Acura", "alfa romeo": "Alfa Romeo", "amc": "AMC", "aston martin": "Aston Martin", "audi": "Audi",
  "bentley": "Bentley", "bmw": "BMW", "bugatti": "Bugatti", "buick": "Buick", "cadillac": "Cadillac",
  "carmax": "Carmax", "cdj": "Dodge", "cdjrf": "Dodge", "cdjr": "Dodge", "chev": "Chevy",
  "chevvy": "Chevy", "chevrolet": "Chevy", "chrysler": "Chrysler", "cjd": "Dodge", "daewoo": "Daewoo",
  "dodge": "Dodge", "eagle": "Eagle", "ferrari": "Ferrari", "fiat": "Fiat", "ford": "Ford", "genesis": "Genesis",
  "gmc": "GMC", "honda": "Honda", "hummer": "Hummer", "hyundai": "Hyundai", "inf": "Infiniti", "infiniti": "Infiniti",
  "isuzu": "Isuzu", "jaguar": "Jaguar", "jeep": "Jeep", "jlr": "Jaguar Land Rover", "kia": "Kia",
  "lamborghini": "Lamborghini", "land rover": "Land Rover", "landrover": "Land Rover", "lexus": "Lexus",
  "lincoln": "Ford", "lucid": "Lucid", "maserati": "Maserati", "maz": "Mazda", "mazda": "Mazda",
  "mb": "Mercedes", "merc": "Mercedes", "mercedes": "Mercedes", "mercedes-benz": "Mercedes", "mercedesbenz": "Mercedes",
  "merk": "Mercedes", "mini": "Mini", "mitsubishi": "Mitsubishi", "nissan": "Nissan", "oldsmobile": "Oldsmobile",
  "plymouth": "Plymouth", "polestar": "Polestar", "pontiac": "Pontiac", "porsche": "Porsche", "ram": "Ram",
  "rivian": "Rivian", "rolls-royce": "Rolls-Royce", "saab": "Saab", "saturn": "Saturn", "scion": "Scion",
  "smart": "Smart", "subaru": "Subaru", "subie": "Subaru", "suzuki": "Suzuki", "tesla": "Tesla", "toyota": "Toyota",
  "volkswagen": "VW", "volvo": "Volvo", "vw": "VW", "chevy": "Chevy"
};

const BRAND_ONLY_DOMAINS = [
  "chevy.com", "ford.com", "cadillac.com", "buick.com", "gmc.com", "chrysler.com",
  "dodge.com", "ramtrucks.com", "jeep.com", "lincoln.com", "toyota.com", "honda.com",
  "nissanusa.com", "subaru.com", "mazdausa.com", "mitsubishicars.com", "acura.com",
  "lexus.com", "infinitiusa.com", "hyundaiusa.com", "kia.com", "genesis.com",
  "bmwusa.com", "mercedes-benz.com", "audiusa.com", "vw.com", "volkswagen.com",
  "porsche.com", "miniusa.com", "fiatusa.com", "alfa-romeo.com", "landroverusa.com",
  "jaguarusa.com", "tesla.com", "lucidmotors.com", "rivian.com", "volvocars.com"
];

const openAICache = new Map();

class FallbackError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "FallbackError";
    this.details = details;
  }
}

/**
 * Fallback logic for low-confidence or failed humanize results
 * @param {string} domain - Domain to enrich
 * @param {Object} meta - Meta data
 * @returns {Object} - Enriched result
 */
export async function fallbackName(domain, meta = {}) {
  const normalizedDomain = domain?.toLowerCase().trim() || "";
  let companyName = "";
  let confidenceScore = 80;
  let flags = [];
  let tokens = 0;

  try {
    log("info", "Starting fallback processing", { domain: normalizedDomain });

    if (!normalizedDomain) {
      log("error", "Invalid domain input", { domain: normalizedDomain });
      flags.push("InvalidDomainInput");
      return { companyName, confidenceScore, flags: Array.from(new Set(flags)), tokens };
    }

    if (BRAND_ONLY_DOMAINS.includes(`${normalizedDomain}.com`)) {
      log("info", "Skipping fallback for brand-only domain", { domain: normalizedDomain });
      flags.push("BrandOnlyDomainSkipped");
      return { companyName, confidenceScore: 0, flags: Array.from(new Set(flags)), tokens };
    }

    let initialResult;
    try {
      initialResult = await humanizeName(normalizedDomain, normalizedDomain, true);
      flags.push(...initialResult.flags);
      log("info", "humanizeName completed", { domain: normalizedDomain, result: initialResult });
      if (initialResult.confidenceScore >= 95 && !initialResult.flags.includes("ManualReviewRecommended")) {
        log("info", "Using humanizeName result", { domain: normalizedDomain, companyName: initialResult.companyName });
        return {
          companyName: initialResult.companyName,
          confidenceScore: initialResult.confidenceScore,
          flags: Array.from(new Set(flags)),
          tokens: initialResult.tokens || 0
        };
      }
      companyName = initialResult.companyName || "";
      confidenceScore = initialResult.confidenceScore || 80;
    } catch (error) {
      log("error", "humanizeName failed", { domain: normalizedDomain, error: error.message });
      flags.push("HumanizeNameError");
      initialResult = { companyName: "", confidenceScore: 80, flags: [], tokens: 0 };
    }

    try {
      const metaBrand = getMetaTitleBrand(meta);
      const cleanDomain = normalizedDomain.replace(/^(www\.)|(\.com|\.net|\.org)$/g, "");
      const tokens = (companyName ? companyName.split(" ") : cleanDomain.split(/(?=[A-Z])/))
        .map(t => t.toLowerCase())
        .filter(t => !["of", "cars", "sales", "autogroup"].includes(t));
      const city = tokens.find(t => KNOWN_CITIES_SET.has(t.toLowerCase()));

      if (metaBrand && city) {
        const name = `${city.charAt(0).toUpperCase() + city.slice(1)} ${metaBrand}`;
        log("info", "Meta title with city applied", { domain: normalizedDomain, name });
        flags.push("MetaTitleBrandAppended", "ManualReviewRecommended");
        return {
          companyName: name,
          confidenceScore: 95,
          flags: Array.from(new Set(flags)),
          tokens: 0
        };
      } else if (metaBrand) {
        log("info", "Meta title brand fallback", { domain: normalizedDomain, metaBrand });
        flags.push("LocalFallbackUsed", "ManualReviewRecommended");
        return {
          companyName: metaBrand,
          confidenceScore: 85,
          flags: Array.from(new Set(flags)),
          tokens: 0
        };
      }
    } catch (error) {
      log("error", "Meta title fallback failed", { domain: normalizedDomain, error: error.message, stack: error.stack });
      flags.push("LocalFallbackFailed");
    }

    const cacheKey = `${normalizedDomain}:${meta.title || ""}`;
    if (openAICache.has(cacheKey)) {
      const cached = openAICache.get(cacheKey);
      log("info", "Cache hit", { domain: normalizedDomain, companyName: cached.companyName });
      flags.push("OpenAICacheHit");
      return {
        companyName: cached.companyName,
        confidenceScore: cached.confidenceScore,
        flags: Array.from(new Set([...flags, ...cached.flags])),
        tokens: 0
      };
    }

      const prompt = `
      Format the dealership domain into a natural company name for an email: ${normalizedDomain}.
      Only output the name. Follow these rules:
      - Use 1–3 words, prioritizing human names (e.g., donjacobs.com → "Don Jacobs").
      - Remove 's' for possessive-friendliness (e.g., crossroadscars.com → "Crossroad").
      - Append a single car brand if needed, validated against: ${CAR_BRANDS.join(", ")}.
      - Never output city-only names; use meta title brand if available: ${meta.title || "none"}.
      - Drop "cars", "sales", "autogroup", "of".
      - Format: "Mercedes-Benz" → "Mercedes", "Volkswagen" → "VW".
      - Do not invent brands or words not in domain or meta.
    `;

    try {
      log("info", "Calling OpenAI", { domain: normalizedDomain });
      const response = await callOpenAI(prompt, {
        model: "gpt-4-turbo",
        max_tokens: 20,
        temperature: 0.2,
        systemMessage: "You are a precise assistant for formatting dealership names."
      });

      let name = response.output.trim();
      tokens = response.tokens;

      if (!name) {
        throw new FallbackError("OpenAI returned empty name", { domain: normalizedDomain });
      }

      name = name.replace(/['’]s\b/g, "").replace(/\b(cars|sales|autogroup|of)\b/gi, "").replace(/\s+/g, " ").trim();
      const brandsInName = CAR_BRANDS.filter(b => name.toLowerCase().includes(b.toLowerCase()));
      if (brandsInName.length > 1) {
        const firstBrand = BRAND_MAPPING[brandsInName[0]] || brandsInName[0];
        name = name.replace(new RegExp(brandsInName.slice(1).join("|"), "gi"), "").replace(/\s+/g, " ").trim();
        name = `${name} ${firstBrand}`.trim();
      } else if (brandsInName.length === 0 && !initialResult.flags.includes("HumanNameDetected")) {
        const fallbackBrand = getMetaTitleBrand(meta) || "Auto";
        name = `${name} ${fallbackBrand}`.trim();
      }

      const result = {
        companyName: name,
        confidenceScore: 85,
        flags: Array.from(new Set([...flags, "OpenAIFallback", "ManualReviewRecommended"])),
        tokens
      };

      openAICache.set(cacheKey, result);
      log("info", "OpenAI result cached", { domain: normalizedDomain, companyName: name });
      return result;
    } catch (error) {
      const errorDetails = error instanceof FallbackError ? error.details : { error: error.message };
      log("error", "OpenAI fallback failed", { domain: normalizedDomain, ...errorDetails });
      const cleanDomain = normalizedDomain.replace(/^(www\.)|(\.com|\.net|\.org)$/g, "");
      const fallbackName = companyName || `${cleanDomain.split(/(?=[A-Z])/)[0]} Auto`;
      const result = {
        companyName: fallbackName,
        confidenceScore: 80,
        flags: Array.from(new Set([...flags, "OpenAIFallbackFailed", "ManualReviewRecommended"])),
        tokens: 0
      };
      openAICache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    log("error", "fallbackName failed", {
      domain: normalizedDomain || "unknown",
      error: err.message,
      stack: err.stack
    });
    flags.push("FallbackNameError", "ManualReviewRecommended");
    return { companyName, confidenceScore, flags: Array.from(new Set(flags)), tokens };
  }
}

/**
 * Clears OpenAI cache
 */
export function clearOpenAICache() {
  openAICache.clear();
  log("info", "OpenAI cache cleared", {});
}

/**
 * Handler for fallback API endpoint
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} - JSON response
 */
export async function handler(req, res) {
  let body = null;
  try {
    logger.info("Received body", { bodyLength: req.body ? JSON.stringify(req.body).length : 0 });
    body = req.body;

    const leads = body.leads || body.leadList || body.domains || body;
    if (!Array.isArray(leads)) {
      log("warn", "Leads is not an array", { leads });
      return res.status(400).json({ error: "Leads must be an array" });
    }

    const validatedLeads = leads.map((lead, i) => ({
      domain: (lead.domain || "").trim().toLowerCase(),
      rowNum: lead.rowNum || i + 1,
      metaTitle: lead.metaTitle || undefined
    })).filter(lead => lead.domain);

    const successful = await Promise.all(validatedLeads.map(async (lead) => {
      const result = await fallbackName(lead.domain, { title: lead.metaTitle });
      return {
        domain: lead.domain,
        companyName: result.companyName,
        confidenceScore: result.confidenceScore,
        flags: result.flags,
        tokens: result.tokens,
        rowNum: lead.rowNum
      };
    }));

    const manualReviewQueue = successful.filter(r => r.flags.includes("ManualReviewRecommended"));
    const fallbackTriggers = successful.filter(r => r.flags.includes("OpenAIFallback") || r.flags.includes("LocalFallbackUsed"));
    const totalTokens = successful.reduce((sum, r) => sum + (r.tokens || 0), 0);

    return res.status(200).json({
      successful,
      manualReviewQueue,
      fallbackTriggers,
      totalTokens,
      partial: false,
      fromFallback: fallbackTriggers.length > 0
    });
  } catch (error) {
    log("error", "Handler error", {
      error: error.message,
      stack: error.stack,
      body: body ? JSON.stringify(body).slice(0, 1000) : "null"
    });
    return res.status(500).json({
      error: "Internal server error",
      confidenceScore: 80,
      flags: Array.from(new Set(["FallbackHandlerFailed", "ManualReviewRecommended"])),
      tokens: 0
    });
  }
}
