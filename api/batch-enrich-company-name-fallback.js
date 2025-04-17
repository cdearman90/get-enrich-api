// api/company-name-fallback.js
// Fallback logic using OpenAI with caching

import { humanizeName } from "./lib/humanize.js";
import { callOpenAI } from "./lib/openai.js";

const CAR_BRANDS = [
  "acura", "alfa romeo", "amc", "aston martin", "audi", "bentley", "bmw", "bugatti", "buick",
  "cadillac", "carmax", "cdj", "cdjrf", "cdjr", "chev", "chevvy", "chevrolet", "chrysler", "cjd", "daewoo",
  "dodge", "eagle", "ferrari", "fiat", "ford", "genesis", "gmc", "honda", "hummer", "hyundai", "inf", "infiniti",
  "isuzu", "jaguar", "jeep", "jlr", "kia", "lamborghini", "land rover", "landrover", "lexus", "lincoln", "lucid",
  "maserati", "maz", "mazda", "mb", "merc", "mercedes", "mercedes-benz", "mercedesbenz", "merk", "mini",
  "mitsubishi", "nissan", "oldsmobile", "plymouth", "polestar", "pontiac", "porsche", "ram", "rivian",
  "rolls-royce", "saab", "saturn", "scion", "smart", "subaru", "subie", "suzuki", "tesla", "toyota",
  "volkswagen", "volvo", "vw", "chevy", "honda"
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
  "mb": "Mercedes", "merc": "Mercedes", "mercedes": "Mercedes", "mercedes-benz": "Mercedes", "mercedesbenz": "Mercedes", "merk": "Mercedes",
  "mini": "Mini", "mitsubishi": "Mitsubishi", "nissan": "Nissan", "oldsmobile": "Oldsmobile", "plymouth": "Plymouth",
  "polestar": "Polestar", "pontiac": "Pontiac", "porsche": "Porsche", "ram": "Ram", "rivian": "Rivian",
  "rolls-royce": "Rolls-Royce", "saab": "Saab", "saturn": "Saturn", "scion": "Scion", "smart": "Smart",
  "subaru": "Subaru", "subie": "Subaru", "suzuki": "Suzuki", "tesla": "Tesla", "toyota": "Toyota",
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

// Cache for OpenAI responses
const openAICache = new Map();

/**
 * Custom error for fallback failures
 */
class FallbackError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'FallbackError';
    this.details = details;
  }
}

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
    domain: context.domain || null,
    ...context
  };
  console[level](JSON.stringify(logEntry, null, 2));
}

/**
 * Fallback function for unresolved names
 * @param {string} domain - Dealership domain
 * @param {object} meta - Metadata
 * @returns {object} - { companyName: string, confidenceScore: number, flags: string[], tokens: number }
 */
export async function fallbackName(domain, meta = {}) {
  const flags = new Set();
  let tokens = 0;

  log('info', 'Starting fallback processing', { domain });

  // Try humanize.js first
  let initialResult;
  try {
    initialResult = await humanizeName(domain, domain, true);
    flags.add(...initialResult.flags);
    log('info', 'humanizeName completed', { domain, result: initialResult });
  } catch (error) {
    log('error', 'humanizeName failed', { domain, error: error.message });
    flags.add("HumanizeNameError");
    initialResult = { name: "", confidenceScore: 0, flags: [], tokens: 0 };
  }

  // Return early if humanizeName produced a high-confidence result
  if (initialResult.confidenceScore >= 95 && !initialResult.flags.includes("ManualReviewRecommended")) {
    log('info', 'Using humanizeName result', { domain, name: initialResult.name });
    return {
      companyName: initialResult.name,
      confidenceScore: initialResult.confidenceScore,
      flags: Array.from(flags),
      tokens: initialResult.tokens
    };
  }

  // Skip OpenAI for brand-only domains
  if (initialResult.flags.includes("BrandOnlyDomainSkipped") || BRAND_ONLY_DOMAINS.includes(`${domain.toLowerCase()}.com`)) {
    log('warn', 'Skipping OpenAI for brand-only domain', { domain });
    flags.add("BrandOnlyDomainSkipped");
    flags.add("FallbackSkipped");
    return {
      companyName: "",
      confidenceScore: 0,
      flags: Array.from(flags),
      tokens: 0
    };
  }

  // Local fallback: use meta title brand
  try {
    const metaBrand = getMetaTitleBrand(meta);
    if (metaBrand) {
      log('info', 'Local fallback used', { domain, metaBrand });
      flags.add("LocalFallbackUsed");
      return {
        companyName: metaBrand,
        confidenceScore: 80,
        flags: Array.from(flags),
        tokens: 0
      };
    }
  } catch (error) {
    log('error', 'Local fallback failed', { domain, error: error.message });
    flags.add("LocalFallbackFailed");
  }

  // Check OpenAI cache
  const cacheKey = `${domain}:${meta.title || ''}`;
  if (openAICache.has(cacheKey)) {
    const cached = openAICache.get(cacheKey);
    log('info', 'Cache hit', { domain, cachedName: cached.companyName });
    flags.add("OpenAICacheHit");
    return {
      companyName: cached.companyName,
      confidenceScore: cached.confidenceScore,
      flags: Array.from(flags.add(...cached.flags)),
      tokens: 0
    };
  }

  // OpenAI prompt
  const prompt = `
    Format the dealership domain into a natural company name for an email: ${domain}.
    Only output the name. Follow these rules:
    - Prioritize human names (e.g., donjacobs.com → "Don Jacobs").
    - Remove 's' for possessive-friendliness (e.g., crossroadscars.com → "Crossroad").
    - Append a single car brand if needed, validated against: ${CAR_BRANDS.join(", ")}.
    - Never output city-only names (e.g., chicagocars.com → "Chicago Toyota").
    - Drop 'cars', 'sales', 'Auto Group'.
    - Format: "Mercedes-Benz" → "M.B.", "Volkswagen" → "VW", remove "of".
  `;

  try {
    log('info', 'Calling OpenAI', { domain });
    const response = await callOpenAI(prompt, {
      model: "gpt-4-turbo",
      max_tokens: 50,
      temperature: 0.3,
      systemMessage: "You are a precise assistant for formatting dealership names."
    });

    let name = response.output.trim();
    tokens = response.tokens;

    if (!name) {
      throw new FallbackError('OpenAI returned empty name', { domain });
    }

    // Post-process
    name = name.replace(/['’]s\b/g, '');
    name = name.replace(/\b(cars|sales|autogroup)\b/gi, '');
    name = name.replace(/\bof\b/gi, '');

    const brandsInName = CAR_BRANDS.filter(b => name.toLowerCase().includes(b.toLowerCase()));
    if (brandsInName.length > 1) {
      const firstBrand = BRAND_MAPPING[brandsInName[0]] || brandsInName[0];
      name = name.replace(new RegExp(brandsInName.slice(1).join('|'), 'gi'), '').replace(/\s+/g, ' ').trim();
      name = `${name} ${firstBrand}`.trim();
    } else if (brandsInName.length === 0 && !initialResult.flags.includes("HumanNameDetected")) {
      const fallbackBrand = metaBrand || "Auto";
      name = `${name} ${fallbackBrand}`.trim();
    }

    const result = {
      companyName: name,
      confidenceScore: 85,
      flags: Array.from(flags.add("OpenAIFallback").add("ManualReviewRecommended")),
      tokens
    };

    // Cache result
    openAICache.set(cacheKey, result);
    log('info', 'OpenAI result cached', { domain, name });
    return result;
  } catch (error) {
    const errorDetails = error instanceof FallbackError ? error.details : { error: error.message };
    log('error', 'OpenAI fallback failed', { domain, ...errorDetails });
    const fallbackName = initialResult.name || `${domain.split('.')[0]} Auto`;
    const result = {
      companyName: fallbackName,
      confidenceScore: 80,
      flags: Array.from(flags.add("OpenAIFallbackFailed").add("ManualReviewRecommended")),
      tokens: 0
    };
    openAICache.set(cacheKey, result);
    return result;
  }
}

/**
 * Extracts brand from meta title
 * @param {object} meta - Metadata
 * @returns {string|null} - Formatted brand
 */
function getMetaTitleBrand(meta) {
  if (!meta.title) return null;
  const title = meta.title.toLowerCase();
  for (const brand of CAR_BRANDS) {
    if (title.includes(brand.toLowerCase())) {
      return BRAND_MAPPING[brand] || brand;
    }
  }
  return null;
}

/**
 * Clears OpenAI cache
 */
export function clearOpenAICache() {
  openAICache.clear();
  log('info', 'OpenAI cache cleared', {});
}

/**
 * API handler (stub for Vercel)
 */
export default async function handler(req, res) {
  return res.status(200).json({
    successful: [],
    manualReviewQueue: [],
    fallbackTriggers: [],
    totalTokens: 0,
    partial: false,
    fromFallback: true
  });
}
