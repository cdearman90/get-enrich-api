// api/company-name-fallback.js
// Fallback logic using OpenAI with caching

import { humanizeName, getMetaTitleBrand, KNOWN_CITIES_SET } from "./lib/humanize.js";
import { callOpenAI } from "./lib/openai.js";
import winston from 'winston';

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

const openAICache = new Map();

class FallbackError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'FallbackError';
    this.details = details;
  }
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/enrich.log' }),
    new winston.transports.Console()
  ]
});

function log(level, message, context = {}) {
  logger[level]({ message, domain: context.domain || null, ...context });
}

export async function fallbackName(domain, meta = {}) {
  const flags = new Set();
  let tokens = 0;

  log('info', 'Starting fallback processing', { domain });

  if (BRAND_ONLY_DOMAINS.includes(`${domain.toLowerCase()}.com`)) {
    log('warn', 'Skipping fallback for brand-only domain', { domain });
    flags.add("BrandOnlyDomainSkipped");
    return {
      companyName: "",
      confidenceScore: 0,
      flags: Array.from(flags),
      tokens: 0
    };
  }

  let initialResult;
  try {
    initialResult = await humanizeName(domain, domain, true);
    flags.add(...initialResult.flags);
    log('info', 'humanizeName completed', { domain, result: initialResult });
    if (initialResult.confidenceScore >= 95 && !initialResult.flags.includes("ManualReviewRecommended")) {
      log('info', 'Using humanizeName result', { domain, name: initialResult.name });
      return {
        companyName: initialResult.name,
        confidenceScore: initialResult.confidenceScore,
        flags: Array.from(flags),
        tokens: initialResult.tokens
      };
    }
  } catch (error) {
    log('error', 'humanizeName failed', { domain, error: error.message });
    flags.add("HumanizeNameError");
    initialResult = { name: "", confidenceScore: 0, flags: [], tokens: 0 };
  }

  try {
    const metaBrand = getMetaTitleBrand(meta);
    const cleanDomain = domain.toLowerCase().replace(/^(www\.)|(\.com|\.net|\.org)$/g, '');
    const tokens = (initialResult.name ? initialResult.name.split(' ') : cleanDomain.split(/(?=[A-Z])/))
      .map(t => t.toLowerCase())
      .filter(t => !["of", "cars", "sales", "autogroup"].includes(t));
    const city = tokens.find(t => KNOWN_CITIES_SET.has(t.toLowerCase()));

    if (metaBrand && city) {
      const name = `${city.charAt(0).toUpperCase() + city.slice(1)} ${metaBrand}`;
      log('info', 'Meta title with city applied', { domain, name });
      flags.add("MetaTitleBrandAppended");
      flags.add("ManualReviewRecommended");
      return {
        companyName: name,
        confidenceScore: 95,
        flags: Array.from(flags),
        tokens: 0
      };
    } else if (metaBrand) {
      log('info', 'Meta title brand fallback', { domain, metaBrand });
      flags.add("LocalFallbackUsed");
      flags.add("ManualReviewRecommended");
      return {
        companyName: metaBrand,
        confidenceScore: 85,
        flags: Array.from(flags),
        tokens: 0
      };
    }
  } catch (error) {
    log('error', 'Meta title fallback failed', { domain, error: error.message });
    flags.add("LocalFallbackFailed");
  }

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

  const prompt = `
    Format the dealership domain into a natural company name for an email: ${domain}.
    Only output the name. Follow these rules:
    - Use 1–3 words, prioritizing human names (e.g., donjacobs.com → "Don Jacobs").
    - Remove 's' for possessive-friendliness (e.g., crossroadscars.com → "Crossroad").
    - Append a single car brand if needed, validated against: ${CAR_BRANDS.join(", ")}.
    - Never output city-only names; use meta title brand if available: ${meta.title || "none"}.
    - Drop 'cars', 'sales', 'autogroup', 'of'.
    - Format: "Mercedes-Benz" → "Mercedes", "Volkswagen" → "VW".
    - Do not invent brands or words not in domain or meta.
  `;

  try {
    log('info', 'Calling OpenAI', { domain });
    const response = await callOpenAI(prompt, {
      model: "gpt-4-turbo",
      max_tokens: 20,
      temperature: 0.2,
      systemMessage: "You are a precise assistant for formatting dealership names."
    });

    let name = response.output.trim();
    tokens = response.tokens;

    if (!name) {
      throw new FallbackError('OpenAI returned empty name', { domain });
    }

    name = name.replace(/['’]s\b/g, '').replace(/\b(cars|sales|autogroup|of)\b/gi, '').replace(/\s+/g, ' ').trim();
    const brandsInName = CAR_BRANDS.filter(b => name.toLowerCase().includes(b.toLowerCase()));
    if (brandsInName.length > 1) {
      const firstBrand = BRAND_MAPPING[brandsInName[0]] || brandsInName[0];
      name = name.replace(new RegExp(brandsInName.slice(1).join('|'), 'gi'), '').replace(/\s+/g, ' ').trim();
      name = `${name} ${firstBrand}`.trim();
    } else if (brandsInName.length === 0 && !initialResult.flags.includes("HumanNameDetected")) {
      const fallbackBrand = getMetaTitleBrand(meta) || "Auto";
      name = `${name} ${fallbackBrand}`.trim();
    }

    const result = {
      companyName: name,
      confidenceScore: 85,
      flags: Array.from(flags.add("OpenAIFallback").add("ManualReviewRecommended")),
      tokens
    };

    openAICache.set(cacheKey, result);
    log('info', 'OpenAI result cached', { domain, name });
    return result;
  } catch (error) {
    const errorDetails = error instanceof FallbackError ? error.details : { error: error.message };
    log('error', 'OpenAI fallback failed', { domain, ...errorDetails });
    const fallbackName = initialResult.name || `${cleanDomain.split(/(?=[A-Z])/)[0]} Auto`;
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

export function clearOpenAICache() {
  openAICache.clear();
  log('info', 'OpenAI cache cleared', {});
}

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
