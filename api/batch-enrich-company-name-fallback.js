// api/company-name-fallback.js
// Fallback logic using OpenAI with caching

import { humanizeName, getMetaTitleBrand, KNOWN_CITIES_SET, capitalizeName } from "./lib/humanize.js";
import { callOpenAI } from "./lib/openai.js";
import winston from "winston";
import path from "path";

const logger = winston.createLogger({
  level: "debug",
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

const OVERRIDES = {
  'autonationusa.com': 'AutoNation',
  'robbynixonbuickgmc.com': 'Robby Nixon',
  'chevyofcolumbuschevrolet.com': 'Columbus Chevy',
  'mazdanashville.com': 'Nashville Mazda',
  'classicchevrolet.com': 'Classic Chevy',
  'penskeautomotive.com': 'Penske Auto',
  'helloautogroup.com': 'Hello Auto'
};

const BLOCKLIST = ['sales', 'auto', 'cars', 'group'];

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
async function fallbackName(domain, meta = {}) {
  const normalizedDomain = domain?.toLowerCase().trim() || "";
  let companyName = "";
  let confidenceScore = 80;
  let flags = [];
  let tokens = 0;

  try {
    log("info", "Starting fallback processing", { domain: normalizedDomain });

    // Check OVERRIDES first
    if (OVERRIDES[normalizedDomain]) {
      log("info", "Using override", { domain: normalizedDomain, companyName: OVERRIDES[normalizedDomain] });
      return {
        companyName: OVERRIDES[normalizedDomain],
        confidenceScore: 125,
        flags: ['Override'],
        tokens: 0
      };
    }

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
      if (initialResult.confidenceScore >= 100 && !initialResult.flags.includes("ManualReviewRecommended")) {
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

    // Enhanced city/brand detection
    try {
      const metaBrand = getMetaTitleBrand(meta);
      const cleanDomain = normalizedDomain.replace(/^(www\.)|(\.com|\.net|\.org)$/g, "");
      const tokens = cleanDomain
        .split(/(?=[A-Z])|of/)
        .map(t => t.toLowerCase())
        .filter(t => !["of", "cars", "sales", "autogroup"].includes(t));
      const city = tokens.find(t => KNOWN_CITIES_SET.has(t.toLowerCase()));

      if (city && metaBrand && !CAR_BRANDS.some(b => cleanDomain.includes(b.toLowerCase()))) {
        const name = `${capitalizeName(city)} ${BRAND_MAPPING[metaBrand.toLowerCase()] || metaBrand}`;
        log("info", "City and meta brand applied", { domain: normalizedDomain, name });
        flags.push("CityBrandPattern", "MetaTitleBrandAppended");
        return {
          companyName: name,
          confidenceScore: 125,
          flags: Array.from(new Set(flags)),
          tokens: 0
        };
      }
      if (city) {
        const brand = CAR_BRANDS.find(b => cleanDomain.includes(b.toLowerCase()));
        if (brand) {
          const name = `${capitalizeName(city)} ${BRAND_MAPPING[brand.toLowerCase()] || brand}`;
          log("info", "City and domain brand applied", { domain: normalizedDomain, name });
          flags.push("CityBrandPattern");
          return {
            companyName: name,
            confidenceScore: 125,
            flags: Array.from(new Set(flags)),
            tokens: 0
          };
        }
      }
      if (city && !companyName.includes(city)) {
        log("warn", "City dropped", { domain: normalizedDomain, city });
        flags.push("CityDropped");
      }
    } catch (error) {
      log("error", "City/brand fallback failed", { domain: normalizedDomain, error: error.message });
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

    // Clean input tokens before OpenAI
    const cleanTokens = tokens
      .filter((t, i, arr) => i === 0 || t !== arr[i - 1]) // Deduplicate
      .filter(t => CAR_BRANDS.includes(t) || KNOWN_CITIES_SET.has(t) || /^[a-z]+$/.test(t));
    const inputName = cleanTokens.join(" ");

    const prompt = `
      Given a dealership domain "${normalizedDomain}", return a JSON object with a 1–3 word, cold-email-safe name.
      Rules:
      - Use 1–3 words, prioritizing human names (e.g., "donjacobs.com" → {"name": "Don Jacobs", "brand": null, "flagged": false}).
      - Remove "of", "sales", "cars", "autogroup".
      - Use title case (e.g., "Nashville Mazda").
      - If a brand is present, use it once: ${CAR_BRANDS.join(", ")}.
      - Do not repeat brands or invent words.
      - Meta title: ${meta.title || "none"}.
      - Response format: {"name": string, "brand": string|null, "flagged": boolean}
    `;

    try {
      log("info", "Calling OpenAI", { domain: normalizedDomain });
      const response = await callOpenAI(prompt, {
        model: "gpt-4-turbo",
        max_tokens: 20,
        temperature: 0.2,
        systemMessage: "You are a precise assistant for formatting dealership names.",
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.output);
      let name = result.name.trim();
      tokens = response.tokens;

      if (!name) {
        throw new FallbackError("OpenAI returned empty name", { domain: normalizedDomain });
      }

      // Clean and deduplicate name
      name = name
        .replace(/['’]s\b/g, "")
        .replace(/\b(cars|sales|autogroup|of)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      const nameTokens = name.toLowerCase().split(" ");
      const brandsInName = CAR_BRANDS.filter(b => nameTokens.some(t => t.includes(b.toLowerCase())));
      if (brandsInName.length > 1) {
        name = nameTokens
          .filter(t => !brandsInName.slice(1).some(b => t.includes(b.toLowerCase())))
          .join(" ")
          .trim();
        name = `${capitalizeName(name)} ${BRAND_MAPPING[brandsInName[0]] || capitalizeName(brandsInName[0])}`.trim();
      }

      // Validate name
      const isValidName = name => {
        const words = name.toLowerCase().split(" ");
        return words.every(word => CAR_BRANDS.includes(word) || KNOWN_CITIES_SET.has(word) || /^[a-z]+$/.test(word));
      };
      const validateName = name => {
        if (BLOCKLIST.some(trigger => name.toLowerCase().includes(trigger))) {
          log("warn", "Spam trigger detected", { domain: normalizedDomain, name });
          return false;
        }
        return true;
      };

      if (!isValidName(name)) {
        log("warn", "Invalid OpenAI name", { domain: normalizedDomain, name });
        flags.push("OpenAIInvalidName", "ManualReviewRecommended");
        return {
          companyName: companyName || capitalizeName(cleanDomain.split(/(?=[A-Z])/)[0]),
          confidenceScore: 80,
          flags: Array.from(new Set([...flags, "OpenAIFallbackFailed"])),
          tokens
        };
      }
      if (!validateName(name)) {
        flags.push("SpamTriggerDetected", "ManualReviewRecommended");
        name = companyName || capitalizeName(cleanDomain.split(/(?=[A-Z])/)[0]);
        confidenceScore = 80;
      }

      const finalResult = {
        companyName: name,
        confidenceScore: result.flagged ? 80 : 85,
        flags: Array.from(new Set([...flags, "OpenAIFallback", result.flagged ? "ManualReviewRecommended" : ""])),
        tokens
      };

      openAICache.set(cacheKey, finalResult);
      log("info", "OpenAI result cached", { domain: normalizedDomain, companyName: name });
      return finalResult;
    } catch (error) {
      const errorDetails = error instanceof FallbackError ? error.details : { error: error.message };
      log("error", "OpenAI fallback failed", { domain: normalizedDomain, ...errorDetails });
      const fallbackName = companyName || capitalizeName(cleanDomain.split(/(?=[A-Z])/)[0]);
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
function clearOpenAICache() {
  openAICache.clear();
  log("info", "OpenAI cache cleared", {});
}

/**
 * Handler for fallback API endpoint
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} - JSON response
 */
async function handler(req, res) {
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

export { fallbackName, clearOpenAICache, handler };
