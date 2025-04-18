// api/company-name-fallback.js
// Fallback logic using OpenAI with caching

import { humanizeName, getMetaTitleBrand, KNOWN_CITIES_SET, capitalizeName, earlyCompoundSplit } from "./lib/humanize.js";
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

// Abbreviation expansions for normalization
const ABBREVIATION_EXPANSIONS = {
  "la": "LA",
  "mb": "M.B.",
  "gy": "GY",
  "np": "NP",
  "rt": "RT"
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
  "lacitycars.com": "LA City",
  "rodbakerford.com": "Rod Baker",
  "carsatcarlblack.com": "Carl Black",
  "southcharlottejcd.com": "Charlotte Auto",
  "oaklandauto.com": "Oakland Auto",
  "nplincoln.com": "NP Lincoln",
  "rohrmanhonda.com": "Rohrman Honda",
  "malouf.com": "Malouf",
  "prestonmotor.com": "Preston",
  "demontrond.com": "DeMontrond",
  "fletcherauto.com": "Fletcher",
  "davischevrolet.com": "Davis Chevy",
  "gychevy.com": "Gy Chevy",
  "potamkinhyundai.com": "Potamkin Hyundai",
  "tedbritt.com": "Ted Britt",
  "andersonautogroup.com": "Anderson Auto",
  "racewayford.com": "Raceway Ford",
  "donhattan.com": "Don Hattan",
  "chastangford.com": "Chastang Ford",
  "machens.com": "Machens",
  "taylorauto.com": "Taylor",
  "dancummins.com": "Dan Cummins",
  "kennedyauto.com": "Kennedy Auto",
  "artmoehn.com": "Art Moehn",
  "mbbhm.com": "M.B. BHM"
};

/**
 * Splits merged tokens using earlyCompoundSplit from humanize.js.
 * @param {string} name - The name to split.
 * @returns {string} - The split name.
 */
function splitMergedTokens(name) {
  try {
    if (!name || typeof name !== "string") {
      log("error", "Invalid name in splitMergedTokens", { name });
      return name;
    }

    const splitTokens = earlyCompoundSplit(name);
    const result = splitTokens.join(" ");
    log("debug", "splitMergedTokens result", { name, result });
    return result;
  } catch (e) {
    log("error", "splitMergedTokens failed", { name, error: e.message });
    return name;
  }
}

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
      flags.push("FallbackNameError", "ReviewNeeded");
      return { validatedName: null, flags };
    }

    // Split merged tokens (e.g., "Rodbakerford" → "Rod Baker")
    if (validatedName.split(" ").length === 1) {
      const splitName = splitMergedTokens(validatedName);
      if (splitName !== validatedName) {
        validatedName = splitName;
        log("info", "Merged tokens split", { domain, validatedName });
        flags.push("TokenSplitApplied");
      } else {
        validatedName = capitalizeName(validatedName).name;
      }
    }

    // Check for city-only or brand-only outputs
    if (validatedName) {
      const isBrand = CAR_BRANDS.includes(validatedName.toLowerCase());
      const isCity = KNOWN_CITIES_SET.has(validatedName.toLowerCase());
      const isProper = KNOWN_PROPER_NOUNS_ARRAY.includes(validatedName);
      if (!isProper && (isBrand || isCity)) {
        log("warn", "City-only or brand-only output detected", { domain, name: validatedName });
        flags.push(isBrand ? "BrandOnlyFallback" : "CityOnlyFallback", "ReviewNeeded");
        return { validatedName: null, flags };
      }
    }

    // Enforce domain brand precedence
    if (result.brand && domainBrand && result.brand.toLowerCase() !== domainBrand.toLowerCase()) {
      log("warn", "OpenAI brand mismatch", { domain, openAIBrand: result.brand, domainBrand });
      flags.push("FallbackNameError", "ReviewNeeded");
      return { validatedName: null, flags };
    }

    // Validate brand against CAR_BRANDS
    if (result.brand && !CAR_BRANDS.includes(result.brand.toLowerCase())) {
      log("warn", "OpenAI hallucinated brand", { domain, brand: result.brand });
      flags.push("FallbackNameError", "ReviewNeeded");
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
      validatedName = validatedName.split(" ").slice(0, 3).join(" ");
      flags.push("TokenCountAdjusted");
    }

    // Check for duplicates (e.g., "Kia Kia")
    if (validatedName) {
      const words = validatedName.toLowerCase().split(" ");
      const uniqueWords = new Set(words);
      if (uniqueWords.size !== words.length) {
        log("warn", "Duplicate tokens in OpenAI output", { domain, name: validatedName });
        validatedName = Array.from(uniqueWords).map(t => capitalizeName(t).name).join(" ");
        flags.push("DuplicatesRemoved");
      }
    }

    // Check blocklist
    if (validatedName && BLOCKLIST.includes(validatedName.toLowerCase())) {
      log("warn", "OpenAI output in blocklist", { domain, name: validatedName });
      flags.push("FallbackNameError");
      validatedName = null;
    }

    // Check spammy tokens and flag for review
    if (validatedName) {
      const hasSpammyTokens = SPAMMY_TOKENS.some(token => validatedName.toLowerCase().includes(token));
      const endsWithSpammy = SPAMMY_TOKENS.some(token => validatedName.toLowerCase().endsWith(token));
      if (hasSpammyTokens || endsWithSpammy) {
        log("warn", "OpenAI output contains spammy tokens", { domain, name: validatedName });
        flags.push("FallbackNameError", "ReviewNeeded");
        validatedName = validatedName.split(" ").filter(t => !SPAMMY_TOKENS.includes(t.toLowerCase())).join(" ");
        if (!validatedName) validatedName = null;
      }
    }

    // Check for 3+ brands in name
    if (validatedName) {
      const brandCount = validatedName.split(" ").filter(t => CAR_BRANDS.includes(t.toLowerCase())).length;
      if (brandCount >= 3) {
        log("warn", "Too many brands in OpenAI output", { domain, name: validatedName });
        flags.push("FallbackNameError", "ReviewNeeded");
        validatedName = null;
      }
    }

    // Strip "of", "and", "the" between brand/city pairs
    if (validatedName) {
      const tokens = validatedName.split(" ").filter(t => !["of", "and", "the"].includes(t.toLowerCase()));
      validatedName = tokens.join(" ");
    }

    // Log successful validation
    if (validatedName) {
      log("info", "OpenAI output validated", { domain, name: validatedName });
    }

    return { validatedName, flags };
  } catch (e) {
    log("error", "validateFallbackName failed", { domain, error: e.message, stack: e.stack });
    flags.push("FallbackNameError", "ReviewNeeded");
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
      if (initialResult.confidenceScore >= 95 && !initialResult.flags.includes("ReviewNeeded")) {
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
      let tokens = earlyCompoundSplit(cleanDomain);
      tokens = tokens
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
        } else {
          const name = `${capitalizeName(city).name} Auto`;
          log("info", "City-only output, appending Auto", { domain: normalizedDomain, name });
          flags.push("CityOnlyFallback", "BrandAppendedForClarity", "ReviewNeeded");
          return {
            companyName: name,
            confidenceScore: 50,
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

    // Check for brand-only output and append meta or domain context
    if (companyName && CAR_BRANDS.includes(companyName.toLowerCase())) {
      const city = tokens.find(t => KNOWN_CITIES_SET.has(t.toLowerCase()));
      const inferredBrand = companyName;
      if (city) {
        companyName = `${capitalizeName(city).name} ${inferredBrand}`;
        log("info", "Brand-only output, appending city", { domain: normalizedDomain, name: companyName });
        flags.push("BrandCityAppended");
        confidenceScore = 125;
      } else {
        log("warn", "Brand-only output", { domain: normalizedDomain, name: companyName });
        flags.push("BrandOnlyFallback", "ReviewNeeded");
        confidenceScore = 50;
      }
    }

    // Final token accuracy pass
    if (companyName) {
      const isProper = companyName.split(" ").every(t => KNOWN_PROPER_NOUNS_ARRAY.includes(t));
      if (!isProper && companyName.split(" ").length === 1) {
        const splitName = splitMergedTokens(companyName);
        if (splitName !== companyName) {
          companyName = splitName;
          log("info", "Final token split applied", { domain: normalizedDomain, name: companyName });
          flags.push("TokenSplitApplied");
          confidenceScore = confidenceScore > 50 ? 55 : confidenceScore;
          flags.push("ReviewNeeded");
        }
      }

      // Cap score for weak fallbacks
      if (companyName.split(" ").length < 2 && !isProper) {
        confidenceScore = confidenceScore > 50 ? 50 : confidenceScore;
        flags.push("LowTokenVariety", "ReviewNeeded");
      }

      // Possessive-friendly rule
      const POSSESSIVE_SAFE_NAMES = ["Rick Smith", "Don Jacobs", "Bill Dube", "Robby Nixon", "Robert Thorne", "Team"];
      if (!POSSESSIVE_SAFE_NAMES.includes(companyName)) {
        const shouldAppendBrand = (domain, name) => {
          const domainBrand = CAR_BRANDS.find(b => domain.includes(b.toLowerCase()));
          return domainBrand && !name.toLowerCase().includes(domainBrand.toLowerCase());
        };
        if (shouldAppendBrand(normalizedDomain, companyName)) {
          const domainBrand = CAR_BRANDS.find(b => normalizedDomain.includes(b.toLowerCase()));
          const inferredBrand = BRAND_MAPPING[domainBrand.toLowerCase()] || capitalizeName(domainBrand).name;
          companyName = `${companyName} ${inferredBrand}`;
          log("info", "Brand appended for clarity", { domain: normalizedDomain, name: companyName });
          flags.push("BrandAppendedForClarity");
        }
      }
    }

    // Add brand suffix for generic names or names ending in "s"
    if (companyName) {
      const tokens = companyName.toLowerCase().split(" ");
      const isGeneric = tokens.some(t => ["auto", "motors"].includes(t));
      const endsWithS = tokens[tokens.length - 1]?.endsWith("s");
      if (isGeneric || endsWithS) {
        const domainBrand = CAR_BRANDS.find(b => normalizedDomain.includes(b.toLowerCase()));
        const metaBrand = getMetaTitleBrand(meta);
        const brandToAppend = BRAND_MAPPING[domainBrand?.toLowerCase()] || BRAND_MAPPING[metaBrand?.toLowerCase()] || domainBrand || metaBrand;
        if (brandToAppend && !companyName.toLowerCase().includes(brandToAppend.toLowerCase())) {
          companyName = `${companyName} ${brandToAppend}`;
          log("info", "Brand suffix appended for generic name", { domain: normalizedDomain, companyName });
          flags.push("BrandAppendedForGenericName");
        }
      }
    }

    // Guard against score inflation
    if (companyName) {
      const tokens = companyName.toLowerCase().split(" ");
      if (tokens.length === 1 && KNOWN_CITIES_SET.has(tokens[0])) {
        flags.push("CityOnly");
        confidenceScore = 50;
      }
      if (companyName.length <= 2 || /[a-z]{5,}[a-z]{5,}/i.test(companyName.replace(/\s/g, ""))) {
        flags.push("PossiblyMergedTokens");
        confidenceScore = 50;
      }
    }

    // Apply abbreviation expansions and brand mapping
    if (companyName) {
      let normalizedName = companyName;
      Object.keys(ABBREVIATION_EXPANSIONS).forEach(abbr => {
        const regex = new RegExp(`\\b${abbr}\\b`, "gi");
        normalizedName = normalizedName.replace(regex, ABBREVIATION_EXPANSIONS[abbr]);
      });
      if (normalizedName.includes("Chevrolet")) {
        normalizedName = normalizedName.replace("Chevrolet", "Chevy");
      }
      if (normalizedName.includes("Mercedes-Benz")) {
        normalizedName = normalizedName.replace("Mercedes-Benz", "M.B.");
      }
      if (normalizedName !== companyName) {
        companyName = normalizedName;
        log("info", "Applied abbreviation and brand normalization", { domain: normalizedDomain, companyName });
        flags.push("NormalizationApplied");
      }
    }

    // Check cache
    const cacheKey = `${normalizedDomain}:${(meta.title || "").toLowerCase().trim()}`;
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

    // Try OpenAI fallback for spacing/casing only
    if (companyName && (companyName.split(" ").length < 2 || /\b[a-z]+[A-Z]/.test(companyName))) {
      const prompt = `
        Given a name "${companyName}", return a JSON object with the name properly spaced and capitalized.
        Rules:
        - Only fix spacing and casing (e.g., "Jimmybritt" → {"name": "Jimmy Britt", "flagged": false}).
        - Do not add or invent new words (e.g., do not add "Auto", "Group", "Mall").
        - Use title case (e.g., "Rod Baker").
        - Response format: {"name": string, "flagged": boolean}
      `;
      try {
        log("info", "Calling OpenAI for spacing fix", { domain: normalizedDomain });
        const response = await callOpenAI(prompt, {
          model: "gpt-4-turbo",
          max_tokens: 20,
          temperature: 0.2,
          systemMessage: "You are a precise assistant for formatting names. Only adjust spacing and capitalization, do not add new words.",
          response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.output);
        let name = result.name?.trim();
        tokens = response.tokens;

        if (!name || result.flagged) {
          throw new FallbackError("OpenAI spacing fix failed", { domain: normalizedDomain });
        }

        // Extract domainBrand from normalizedDomain
        const domainBrand = CAR_BRANDS.find(b => normalizedDomain.includes(b.toLowerCase())) || null;

        // Validate OpenAI result with strict constraints
        const { validatedName, flags: validationFlags } = validateFallbackName({ name, brand: null, flagged: false }, normalizedDomain, domainBrand);
        flags.push(...validationFlags);

        // Additional check to prevent hallucination
        const originalWords = companyName.toLowerCase().split(/\s+/).filter(word => word);
        const newWords = name.toLowerCase().split(/\s+/).filter(word => word);
        const addedWords = newWords.filter(word => !originalWords.includes(word));
        if (addedWords.length > 0) {
          log("warn", "OpenAI hallucinated words", { domain: normalizedDomain, addedWords });
          flags.push("OpenAIHallucinationDetected", "ReviewNeeded");
        } else if (validatedName) {
          companyName = validatedName;
          confidenceScore += 5;
          flags.push("OpenAISpacingFix");
        } else {
          flags.push("OpenAIFallbackFailed", "ReviewNeeded");
        }
      } catch (error) {
        log("error", "OpenAI spacing fix failed", { domain: normalizedDomain, error: error.message });
        flags.push("OpenAIFallbackFailed", "ReviewNeeded");
      }
    }

    // Final adjustments
    if (companyName) {
      if (confidenceScore < 85 && confidenceScore > 0) {
        flags.push("ReviewNeeded");
      }
    } else {
      companyName = capitalizeName(cleanDomain.split(/(?=[A-Z])/)[0]).name;
      flags.push("FallbackNameError", "ReviewNeeded");
      confidenceScore = 50;
    }

    const finalResult = {
      companyName,
      confidenceScore,
      flags: Array.from(new Set(flags)),
      tokens
    };

    openAICache.set(cacheKey, finalResult);
    log("info", "Result cached", { domain: normalizedDomain, companyName });
    return finalResult;
  } catch (err) {
    log("error", "fallbackName failed", {
      domain: normalizedDomain || "unknown",
      error: err.message,
      stack: err.stack
    });
    flags.push("FallbackNameError", "ReviewNeeded");
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
const RATE_LIMIT = {
  maxRequests: 100,
  windowMs: 60 * 1000 // 1 minute
};
let requestCount = 0;
let windowStart = Date.now();

async function handler(req, res) {
  // Reset rate limit counter if window has passed
  if (Date.now() - windowStart > RATE_LIMIT.windowMs) {
    requestCount = 0;
    windowStart = Date.now();
  }

  // Check rate limit
  if (requestCount >= RATE_LIMIT.maxRequests) {
    log("warn", "Rate limit exceeded", { requestCount });
    return res.status(429).json({
      error: "Too Many Requests",
      message: "Rate limit exceeded, please try again later",
      retryAfter: Math.ceil((RATE_LIMIT.windowMs - (Date.now() - windowStart)) / 1000)
    });
  }
  requestCount++;

  // Validate authentication token
  const authToken = process.env.VERCEL_AUTH_TOKEN;
  const authHeader = req.headers.authorization;

  if (!authHeader || authHeader !== `Bearer ${authToken}`) {
    log("warn", "Unauthorized request", { authHeader });
    return res.status(401).json({ error: "Unauthorized", message: "Invalid or missing authorization token" });
  }

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
