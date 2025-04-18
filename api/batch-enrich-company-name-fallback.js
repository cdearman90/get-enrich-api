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

// Comprehensive list of car brands
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

// Mapping for standardized brand names
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

// List of brand-only domains to skip
const BRAND_ONLY_DOMAINS = [
  "chevy.com", "ford.com", "cadillac.com", "buick.com", "gmc.com", "chrysler.com",
  "dodge.com", "ramtrucks.com", "jeep.com", "lincoln.com", "toyota.com", "honda.com",
  "nissanusa.com", "subaru.com", "mazdausa.com", "mitsubishicars.com", "acura.com",
  "lexus.com", "infinitiusa.com", "hyundaiusa.com", "kia.com", "genesis.com",
  "bmwusa.com", "mercedes-benz.com", "audiusa.com", "vw.com", "volkswagen.com",
  "porsche.com", "miniusa.com", "fiatusa.com", "alfa-romeo.com", "landroverusa.com",
  "jaguarusa.com", "tesla.com", "lucidmotors.com", "rivian.com", "volvocars.com"
];

// Overrides for specific domains
const OVERRIDES = {
  "autonationusa.com": "AutoNation",
  "robbynixonbuickgmc.com": "Robby Nixon",
  "chevyofcolumbuschevrolet.com": "Columbus Chevy",
  "classicchevrolet.com": "Classic Chevy",
  "penskeautomotive.com": "Penske Auto",
  "helloautogroup.com": "Hello Auto",
  "billdube.com": "Bill Dube",
  "donjacobs.com": "Don Jacobs",
  "sunsetmitsubishi.com": "Sunset Mitsubishi",
  "classicbmw.com": "Classic BMW",
  "robertthorne.com": "Robert Thorne",
  "ricksmithchevrolet.com": "Rick Smith",
  "crystalautogroup.com": "Crystal",
  "davisautosales.com": "Davis",
  "drivevictory.com": "Victory Auto",
  "mazdanashville.com": "Nashville Mazda",
  "kiaofchattanooga.com": "Chattanooga Kia",
  "mikeerdman.com": "Mike Erdman",
  "tasca.com": "Tasca",
  "lacitycars.com": "La City"
};

// Blocklist for spammy patterns
const BLOCKLIST = ["auto auto", "group group", "cars cars", "sales sales"];

// Spammy tokens to filter out
const SPAMMY_TOKENS = ["sales", "autogroup", "cars", "group", "auto"];

// Known proper nouns for noun-pair restoration (subset of KNOWN_PROPER_NOUNS from humanize.js)
const KNOWN_PROPER_NOUNS_ARRAY = [
  "Bill", "Dube", "Don", "Jacobs", "Rick", "Smith", "McLarty", "Daniel", "NP", "Lincoln",
  "Sunset", "Classic", "Tasca", "Davis", "Barlow", "Mike", "Erdman", "AutoNation", "Robby", "Nixon",
  "Robert", "Thorne", "Crystal", "Young", "Victory"
];

// Cache for OpenAI results
const openAICache = new Map();

// Custom error class for fallback failures
class FallbackError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "FallbackError";
    this.details = details;
  }
}

/**
 * Validates OpenAI fallback name to ensure it meets cold-email-safe criteria.
 * @param {Object} result - OpenAI result { name: string, brand: string | null, flagged: boolean }.
 * @param {string} domain - The input domain (e.g., "chevyofcolumbuschevrolet.com").
 * @param {string | null} domainBrand - Brand detected from domain (e.g., "Chevrolet").
 * @returns {Object} - { validatedName: string | null, flags: string[] }.
 */
function validateFallbackName(result, domain, domainBrand) {
  const flags = [];
  let validatedName = result.name?.trim();

  log("info", "validateFallbackName started", { domain, result });

  try {
    // Ensure result is valid
    if (!result || !validatedName || typeof validatedName !== "string") {
      log("warn", "Invalid OpenAI result", { domain, result });
      flags.push("FallbackNameError", "ManualReviewRecommended");
      return { validatedName: null, flags };
    }

    // Split merged tokens (e.g., "Robertthorne" → "Robert Thorne")
    if (validatedName.split(" ").length === 1) {
      const splitTokens = validatedName.replace(/([a-z])([A-Z])/g, '$1 $2').split(" ").map(t => capitalizeName(t).name);
      if (splitTokens.length > 1 && splitTokens.every(t => KNOWN_PROPER_NOUNS_ARRAY.includes(t))) {
        validatedName = splitTokens.join(" ");
        log("info", "Merged tokens split", { domain, validatedName });
      }
    }

    // Enforce domain brand precedence
    if (result.brand && domainBrand && result.brand.toLowerCase() !== domainBrand.toLowerCase()) {
      log("warn", "OpenAI brand mismatch", { domain, openAIBrand: result.brand, domainBrand });
      flags.push("FallbackNameError", "ManualReviewRecommended");
      return { validatedName: null, flags };
    }

    // Validate brand against CAR_BRANDS
    if (result.brand && !CAR_BRANDS.includes(result.brand.toLowerCase())) {
      log("warn", "OpenAI hallucinated brand", { domain, brand: result.brand });
      flags.push("FallbackNameError", "ManualReviewRecommended");
      return { validatedName: null, flags };
    }

    // Check for uncapitalized or malformed output
    if (!/^([A-Z][a-z]*\s?){1,3}$/.test(validatedName)) {
      log("warn", "Uncapitalized or malformed OpenAI output", { domain, name: validatedName });
      flags.push("FallbackNameError");
      validatedName = null;
    }

    // Check token count (1–3 words)
    if (validatedName && validatedName.split(" ").length > 3) {
      log("warn", "OpenAI output too long", { domain, name: validatedName });
      flags.push("FallbackNameError");
      validatedName = null;
    }

    // Check for duplicates (e.g., "Kia Kia")
    if (validatedName) {
      const words = validatedName.toLowerCase().split(" ");
      if (new Set(words).size !== words.length) {
        log("warn", "Duplicate tokens in OpenAI output", { domain, name: validatedName });
        flags.push("FallbackNameError");
        validatedName = null;
      }
    }

    // Check blocklist
    if (validatedName && BLOCKLIST.includes(validatedName.toLowerCase())) {
      log("warn", "OpenAI output in blocklist", { domain, name: validatedName });
      flags.push("FallbackNameError");
      validatedName = null;
    }

    // Check spammy tokens
    if (validatedName && SPAMMY_TOKENS.some(token => validatedName.toLowerCase().includes(token))) {
      log("warn", "OpenAI output contains spammy tokens", { domain, name: validatedName });
      flags.push("FallbackNameError");
      validatedName = null;
    }

    // Relax ManualReviewRecommended for known proper nouns
    if (validatedName) {
      const nameTokens = validatedName.split(" ");
      if (nameTokens.every(t => KNOWN_PROPER_NOUNS_ARRAY.includes(t)) || 
          (nameTokens.length === 1 && KNOWN_PROPER_NOUNS_ARRAY.includes(nameTokens[0]))) {
        log("info", "Relaxing ManualReviewRecommended for known proper nouns", { domain, name: validatedName });
      } else if (!domainBrand || nameTokens.some(t => t.toLowerCase() === domainBrand?.toLowerCase())) {
        flags.push("ManualReviewRecommended");
      }
    }

    // Log successful validation
    if (validatedName) {
      log("info", "OpenAI output validated", { domain, name: validatedName });
    }

    return { validatedName, flags };
  } catch (e) {
    log("error", "validateFallbackName failed", { domain, error: e.message, stack: e.stack });
    flags.push("FallbackNameError", "ManualReviewRecommended");
    return { validatedName: null, flags };
  }
}

/**
 * Fallback logic for low-confidence or failed humanize results
 * @param {string} domain - Domain to enrich
 * @param {Object} meta - Meta data
 * @returns {{companyName: string, confidenceScore: number, flags: Array<string>, tokens: number}} - Enriched result
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
        flags: ["Override"],
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

    // Try humanizeName first
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

    // Enhanced token rescue
    let cleanDomain;
    try {
      cleanDomain = normalizedDomain.replace(/^(www\.)|(\.com|\.net|\.org)$/g, "");
      const tokens = cleanDomain
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Split camelCase
        .split(/(?=[A-Z])|of/)
        .map(t => t.toLowerCase())
        .filter(t => !SPAMMY_TOKENS.includes(t) && t !== "of");
      const city = tokens.find(t => KNOWN_CITIES_SET.has(t.toLowerCase()));
      const properNounPair = tokens.filter(t => KNOWN_PROPER_NOUNS_ARRAY.includes(capitalizeName(t).name));

      if (properNounPair.length === 2) {
        const name = properNounPair.map(t => capitalizeName(t).name).join(" ");
        log("info", "Proper noun pair rescued", { domain: normalizedDomain, name });
        flags.push("ProperNounRecovered");
        return {
          companyName: name,
          confidenceScore: 125,
          flags: Array.from(new Set(flags)),
          tokens: 0
        };
      }

      const metaBrand = getMetaTitleBrand(meta);
      if (city && metaBrand && !CAR_BRANDS.some(b => cleanDomain.includes(b.toLowerCase()))) {
        const name = `${capitalizeName(city).name} ${BRAND_MAPPING[metaBrand.toLowerCase()] || metaBrand}`;
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
          const name = `${capitalizeName(city).name} ${BRAND_MAPPING[brand.toLowerCase()] || brand}`;
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
      log("error", "Token rescue failed", { domain: normalizedDomain, error: error.message });
      flags.push("LocalFallbackFailed");
    }

    // Check cache
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

    // Try OpenAI fallback with strict constraints
    const domainBrands = CAR_BRANDS.filter(b => cleanDomain.includes(b.toLowerCase()));
    const domainBrand = domainBrands.length > 0 ? BRAND_MAPPING[domainBrands[0]] || capitalizeName(domainBrands[0]).name : null;
    const prompt = `
      Given a dealership domain "${normalizedDomain}", return a JSON object with a 1–3 word, cold-email-safe name.
      Rules:
      - Use 1–3 words, prioritizing human names (e.g., "donjacobs.com" → {"name": "Don Jacobs", "brand": "Chevy", "flagged": false}).
      - Remove "of", "sales", "cars", "autogroup".
      - Use title case (e.g., "Nashville Mazda").
      - Brand must match domain brand (${domainBrand || "none"}) or meta title brand (${getMetaTitleBrand(meta) || "none"}).
      - If no brand in domain or meta, set brand to null.
      - Do not repeat brands or invent brands (e.g., no "Mercedes" unless explicitly in domain/meta).
      - Ensure proper spacing for human names (e.g., "Donjacobs" → "Don Jacobs").
      - Meta title: ${meta.title || "none"}.
      - Valid brands: ${CAR_BRANDS.join(", ")}.
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
      let name = result.name?.trim();
      tokens = response.tokens;

      if (!name) {
        throw new FallbackError("OpenAI returned empty name", { domain: normalizedDomain });
      }

      // Clean and normalize name
      name = name
        .replace(/['’]s\b/g, "") // Remove possessive 's
        .replace(/\b(cars|sales|autogroup|of)\b/gi, "") // Remove spammy tokens
        .replace(/\s+/g, " ") // Normalize spaces
        .trim();

      // Validate OpenAI result
      const { validatedName, flags: validationFlags } = validateFallbackName(result, normalizedDomain, domainBrand);
      flags.push(...validationFlags);

      if (!validatedName) {
        log("warn", "OpenAI validation failed", { domain: normalizedDomain, name });
        flags.push("OpenAIFallbackFailed", "ManualReviewRecommended");
      } else {
        name = validatedName;
      }

      // Post-fallback validation: ensure proper capitalization and no spammy tokens
      if (name && !/^([A-Z][a-z]*\s?){1,3}$/.test(name)) {
        log("warn", "Post-fallback capitalization fix needed", { domain: normalizedDomain, name });
        name = name
          .split(" ")
          .map(t => capitalizeName(t).name)
          .join(" ");
      }

      if (name && SPAMMY_TOKENS.some(token => name.toLowerCase().includes(token))) {
        log("warn", "Post-fallback spammy tokens detected", { domain: normalizedDomain, name });
        name = name
          .split(" ")
          .filter(t => !SPAMMY_TOKENS.includes(t.toLowerCase()))
          .join(" ");
        flags.push("SpammyTokensRemoved");
      }

      // Ensure final name is not empty
      if (!name) {
        name = companyName || capitalizeName(cleanDomain.split(/(?=[A-Z])/)[0]).name;
        flags.push("FallbackNameError", "ManualReviewRecommended");
      }

      const finalResult = {
        companyName: name,
        confidenceScore: validatedName && confidenceScore >= 95 ? confidenceScore : 80,
        flags: Array.from(new Set([...flags, validatedName ? "OpenAIFallback" : "OpenAIFallbackFailed"])),
        tokens
      };

      openAICache.set(cacheKey, finalResult);
      log("info", "OpenAI result cached", { domain: normalizedDomain, companyName: name });
      return finalResult;
    } catch (error) {
      const errorDetails = error instanceof FallbackError ? error.details : { error: error.message };
      log("error", "OpenAI fallback failed", { domain: normalizedDomain, ...errorDetails });
      const fallbackName = companyName || capitalizeName(cleanDomain.split(/(?=[A-Z])/)[0]).name;
      const finalResult = {
        companyName: fallbackName,
        confidenceScore: 80,
        flags: Array.from(new Set([...flags, "OpenAIFallbackFailed", "ManualReviewRecommended"])),
        tokens
      };
      openAICache.set(cacheKey, finalResult);
      return finalResult;
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
    log("info", "Received body", { bodyLength: req.body ? JSON.stringify(req.body).length : 0 });
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

export { fallbackName, clearOpenAICache, handler, validateFallbackName };
