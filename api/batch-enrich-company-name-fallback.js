// api/batch-enrich.js
// Fallback logic using OpenAI with caching

import { humanizeName, capitalizeName, earlyCompoundSplit, extractBrandOfCityFromDomain, expandInitials } from "./lib/humanize.js";

import {
  CAR_BRANDS,
  BRAND_MAPPING,
  KNOWN_CITIES_SET,
  BRAND_ONLY_DOMAINS,
  BLOCKLIST,
  SPAMMY_TOKENS,
  KNOWN_GENERIC_BLOBS,
  OVERRIDES,
  properNounsSet
} from "./lib/constants.js";

import { callOpenAI } from "./lib/openai.js";
import winston from "winston";

// Logging setup
const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [new winston.transports.Console()]
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

// Utility to clean company names
function cleanCompanyName(name) {
  if (!name || typeof name !== "string") return "";
  return name.trim().replace(/\s+/g, " "); // Remove extra spaces and trim
}

// Utility to validate override format
function validateOverrideFormat(override) {
  if (!override || typeof override !== "string") return false;
  const pattern = /^([A-Z][a-z]+(?: [A-Z][a-z]+)?)(?: [A-Z][a-z]+)?$/;
  return pattern.test(override.trim());
}

// Helper: Handle override logic
function handleOverride(normalizedDomain, override) {
  if (!validateOverrideFormat(override)) {
    log("warn", "Invalid override format", { domain: normalizedDomain, override });
    return {
      companyName: "",
      confidenceScore: 0,
      flags: ["override", "invalidOverrideFormat"],
      tokens: [],
      confidenceOrigin: "invalidOverrideFormat"
    };
  }

  const companyName = cleanCompanyName(capitalizeName(override));
  const nameTokens = companyName.split(" ").filter(Boolean);
  const validation = validateFallbackName(
    { name: companyName, brand: null, flagged: false },
    normalizedDomain,
    null,
    125
  );

  if (!validation.validatedName) {
    log("warn", "Override validation failed", { domain: normalizedDomain, override });
    return {
      companyName: "",
      confidenceScore: 0,
      flags: ["override", "patternValidationFailed"],
      tokens: [],
      confidenceOrigin: "overrideValidationFailed",
      rawTokenCount: 0
    };
  }

  log("info", "Override applied", { domain: normalizedDomain, companyName: validation.validatedName });
  return {
    companyName: validation.validatedName,
    confidenceScore: validation.confidenceScore,
    flags: ["override", ...validation.flags],
    tokens: nameTokens.map(t => t.toLowerCase()),
    confidenceOrigin: "override",
    rawTokenCount: nameTokens.length
  };
}

/**
 * Extracts tokens from a domain for fallback processing.
 * @param {string} domain - The cleaned domain (e.g., "jimmybrittchevrolet").
 * @returns {Object} - { tokens: string[], confidenceScore: number, flags: string[] }
 */
function extractTokens(domain) {
  const flags = [];
  let confidenceScore = 80; // Default for token extraction

  if (!domain || typeof domain !== "string") {
    log("error", "Invalid domain input in extractTokens", { domain });
    return { tokens: [], confidenceScore: 0, flags: ["InvalidDomainInput"] };
  }

  // Split on separators and camelCase boundaries
  let tokens = domain
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, "$1-$2") // Split camelCase (e.g., "JimmyBritt" → "Jimmy-Britt")
    .split(/[-_]/) // Split on hyphens and underscores
    .filter(token => token && /^[a-z0-9]+$/.test(token)); // Remove empty or invalid tokens

  // Expand initials (e.g., "mb" → "M.B.")
  tokens = tokens.map(t => expandInitials(t));

  // Remove suffixes and spammy tokens
  const SUFFIXES = new Set(["llc", "inc", "corp", "co", "ltd", "motors", "auto", "group"]);
  tokens = tokens.filter(token => !SUFFIXES.has(token) && !SPAMMY_TOKENS.includes(token));

  // Cap at 3 tokens for cold-email safety
  if (tokens.length > 3) {
    flags.push("TokenCountAdjusted");
    confidenceScore = Math.min(confidenceScore, 95);
    tokens = tokens.slice(0, 3);
  }

  // Log tokenization details
  log("debug", "Extracted tokens", {
    domain,
    tokens,
    rawTokenCount: tokens.length,
    confidenceScore,
    flags
  });

  return { tokens, confidenceScore, flags };
}

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

/**
 * Validates OpenAI fallback name to ensure it meets cold-email-safe criteria.
 * @param {Object} result - OpenAI result { name: string, brand: string | null, flagged: boolean }.
 * @param {string} domain - The input domain (e.g., "chevyofcolumbuschevrolet.com").
 * @param {string | null} domainBrand - Brand detected from domain (e.g., "Chevrolet").
 * @param {number} confidenceScore - Initial confidence score.
 * @returns {Object} - { validatedName: string | null, flags: string[], confidenceScore: number }.
 */
function validateFallbackName(result, domain, domainBrand, confidenceScore = 80) {
  const flags = new Set();
  let validatedName = result.name?.trim();
  let currentConfidenceScore = confidenceScore;

  log("info", "validateFallbackName started", { domain, result });

  try {
    // Initial validation: Ensure result is valid
    if (!result || !validatedName || typeof validatedName !== "string") {
      log("warn", "Invalid OpenAI result", { domain, result });
      flags.add("FallbackNameError");
      flags.add("ReviewNeeded");
      return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
    }

    // Define regex pattern for name validation (e.g., "Chicago Auto")
    const pattern = /^([A-Z][a-z]+(?: [A-Z][a-z]+)?)(?: [A-Z][a-z]+)?$/;

    // Step 1: Split merged tokens if necessary
    if (validatedName.split(" ").length === 1) {
      const splitName = splitMergedTokens(validatedName);
      if (splitName !== validatedName) {
        validatedName = splitName;
        log("info", "Merged tokens split", { domain, validatedName });
        flags.add("TokenSplitApplied");
        currentConfidenceScore = Math.min(currentConfidenceScore, 95);
      } else {
        validatedName = capitalizeName(validatedName);
      }
    }

    // Step 2: Handle blob-like names
    if (validatedName && validatedName.length > 12 && !/\s/.test(validatedName)) {
      const lowerName = validatedName.toLowerCase();
      if (properNounsSet.has(lowerName)) {
        validatedName = capitalizeName(validatedName);
        log("info", "Blob-like name recovered as proper noun", { domain, validatedName });
        flags.add("BlobLikeRecovered");
      } else {
        const splitAttempt = validatedName.replace(/([a-z])([A-Z])/g, "$1 $2").split(" ").filter(Boolean);
        if (splitAttempt.length > 1) {
          validatedName = splitAttempt.map(t => capitalizeName(t)).join(" ");
          log("info", "Blob-like name split", { domain, validatedName });
          flags.add("BlobLikeSplit");
          currentConfidenceScore = Math.min(currentConfidenceScore, 95);
        } else {
          log("warn", "Blob-like name detected", { domain, validatedName });
          flags.add("BlobLikeFallback");
          flags.add("ReviewNeeded");
          currentConfidenceScore = Math.min(currentConfidenceScore, 80);
          validatedName = null;
        }
      }
    }

    // If validation failed, return early
    if (!validatedName) {
      return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
    }

    // Step 3: Validate against pattern (ensure proper capitalization)
    if (!pattern.test(validatedName)) {
      log("warn", "Uncapitalized or malformed output", { domain, validatedName });
      flags.add("FallbackNameError");
      flags.add("ReviewNeeded");
      return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
    }

    // Step 4: Check for city-only or brand-only outputs
    const tokens = validatedName.split(" ");
    const isBrand = CAR_BRANDS.includes(validatedName.toLowerCase());
    const isProper = properNounsSet.has(validatedName.toLowerCase());
    const hasCity = tokens.some(t => KNOWN_CITIES_SET.has(t.toLowerCase()));
    const genericTerms = ["auto", "motors", "dealers", "group", "cares", "cars", "drive", "center", "world"];
    const hasGeneric = tokens.some(t => genericTerms.includes(t.toLowerCase()));

    if (!isProper) {
      if (isBrand) {
        log("warn", "Brand-only output detected", { domain, validatedName });
        flags.add("BrandOnlyFallback");
        flags.add("ReviewNeeded");
        return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
      }
      if (hasCity && !hasGeneric && tokens.length === 1) {
        log("warn", "City-only output detected", { domain, validatedName });
        flags.add("CityOnlyFallback");
        flags.add("ReviewNeeded");
        return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
      }
    }

    // Step 5: Handle brand mismatch
    if (result.brand && domainBrand && result.brand.toLowerCase() !== domainBrand.toLowerCase()) {
      log("warn", "OpenAI brand mismatch, prioritizing domain brand", { domain, openAIBrand: result.brand, domainBrand });
      flags.add("BrandMismatchPenalty");
      currentConfidenceScore = Math.max(currentConfidenceScore - 5, 50);
      if (tokens.some(w => CAR_BRANDS.includes(w.toLowerCase()))) {
        validatedName = tokens.map(w => CAR_BRANDS.includes(w.toLowerCase()) ? (BRAND_MAPPING[domainBrand.toLowerCase()] || capitalizeName(domainBrand)) : w).join(" ");
        flags.add("DomainBrandApplied");
      }
    }

    // Step 6: Validate brand against CAR_BRANDS
    if (result.brand && !CAR_BRANDS.includes(result.brand.toLowerCase())) {
      log("warn", "OpenAI hallucinated brand", { domain, brand: result.brand });
      flags.add("FallbackNameError");
      flags.add("ReviewNeeded");
      return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
    }

    // Step 7: Consolidated validation checks
    // Check token count (1–3 words)
    if (tokens.length > 3) {
      log("warn", "Output too long", { domain, validatedName });
      validatedName = tokens.slice(0, 3).join(" ");
      flags.add("TokenCountAdjusted");
      currentConfidenceScore = Math.min(currentConfidenceScore, 95);
    }

    // Check for duplicates
    const words = validatedName.toLowerCase().split(" ");
    const uniqueWords = [...new Set(words)];
    if (uniqueWords.length !== words.length) {
      log("warn", "Duplicate tokens in output", { domain, validatedName });
      validatedName = uniqueWords.map(t => capitalizeName(t)).join(" ");
      flags.add("DuplicatesRemoved");
      currentConfidenceScore = Math.min(currentConfidenceScore, 95);
    }

    // Check blocklist
    if (BLOCKLIST.includes(validatedName.toLowerCase())) {
      log("warn", "Output in blocklist", { domain, validatedName });
      flags.add("FallbackNameError");
      flags.add("ReviewNeeded");
      return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
    }

    // Check spammy tokens (exclude valid generics)
    const safeGenerics = ["auto", "motors", "dealers", "group", "cares", "cars", "drive", "center", "world"];
    const hasSpammyTokens = SPAMMY_TOKENS.some(token => validatedName.toLowerCase().includes(token) && !safeGenerics.includes(token));
    if (hasSpammyTokens) {
      log("warn", "Output contains spammy tokens", { domain, validatedName });
      flags.add("SpammyTokens");
      flags.add("ReviewNeeded");
      validatedName = validatedName.split(" ").filter(t => !SPAMMY_TOKENS.includes(t.toLowerCase()) || safeGenerics.includes(t.toLowerCase())).join(" ");
      if (!validatedName) {
        flags.add("FallbackNameError");
        return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
      }
    }

    // Check for 3+ brands
    const brandCount = validatedName.split(" ").filter(t => CAR_BRANDS.includes(t.toLowerCase())).length;
    if (brandCount >= 3) {
      log("warn", "Too many brands in output", { domain, validatedName });
      flags.add("FallbackNameError");
      flags.add("ReviewNeeded");
      return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
    }

    // Final success logging
    log("info", "Output validated successfully", { domain, validatedName, confidenceScore: currentConfidenceScore, flags: Array.from(flags) });
    return { validatedName, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
  } catch (e) {
    log("error", "validateFallbackName failed", { domain, error: e.message, stack: e.stack });
    flags.add("FallbackNameError");
    flags.add("ReviewNeeded");
    return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
  }
}

/**
 * Fallback logic for low-confidence or failed humanize results
 * @param {string} domain - Domain to enrich
 * @param {string} originalDomain - Original domain for override lookup
 * @param {Object} meta - Meta data
 * @returns {{companyName: string, confidenceScore: number, flags: Array<string>, tokens: number}} - Enriched result
 */
async function fallbackName(domain, originalDomain, meta = {}) {
  const normalizedDomain = domain?.toLowerCase().trim() || "";
  let companyName = "";
  let confidenceScore = 0; // Default to 0 for consistency
  let flags = new Set(["FallbackName"]);
  let tokens = 0;

  try {
    log("info", "Starting fallback processing", { domain: normalizedDomain });

    // Define regex pattern for company name validation (e.g., "Chicago Auto")
    const pattern = /^([A-Z][a-z]+(?: [A-Z][a-z]+)?)(?: [A-Z][a-z]+)?$/; // Matches "Name", "First Last", or "Name Generic"

    // Check OVERRIDES first
    if (OVERRIDES[normalizedDomain]) {
      const overrideName = OVERRIDES[normalizedDomain];
      if (!pattern.test(overrideName)) {
        log("warn", "Override name pattern validation failed", { domain: normalizedDomain, companyName: overrideName });
        flags.add("OverridePatternFailed");
        flags.add("ManualReviewRecommended");
        return { companyName: "", confidenceScore: 0, flags: Array.from(flags), tokens: 0 };
      }
      log("info", "Using override", { domain: normalizedDomain, companyName: overrideName });
      return handleOverride(normalizedDomain, overrideName);
    }

    if (!normalizedDomain) {
      log("error", "Invalid domain input", { domain: normalizedDomain });
      flags.add("InvalidDomainInput");
      flags.add("ManualReviewRecommended");
      return { companyName, confidenceScore, flags: Array.from(flags), tokens };
    }

    if (BRAND_ONLY_DOMAINS.includes(`${normalizedDomain}.com`)) {
      log("info", "Skipping fallback for brand-only domain", { domain: normalizedDomain });
      flags.add("BrandOnlyDomainSkipped");
      return { companyName, confidenceScore: 0, flags: Array.from(flags), tokens };
    }

    // Try humanizeName first
    let initialResult;
    try {
      initialResult = await humanizeName(normalizedDomain);
      flags.add(...initialResult.flags);
      log("info", "humanizeName completed", { domain: normalizedDomain, result: initialResult });

      // Adaptive confidence threshold based on token characteristics
      const hasBrand = initialResult.tokens.some(t => CAR_BRANDS.includes(t.toLowerCase()));
      const hasProper = initialResult.tokens.some(t => properNounsSet.has(t.toLowerCase()));
      const hasCity = initialResult.tokens.some(t => KNOWN_CITIES_SET.has(t.toLowerCase()));
      const confidenceThreshold = (hasBrand || hasCity || hasProper) ? 95 : 80;

      if (initialResult.confidenceScore >= confidenceThreshold && !initialResult.flags.includes("ReviewNeeded")) {
        log("info", "Using humanizeName result", { domain: normalizedDomain, companyName: initialResult.companyName });
        return {
          companyName: initialResult.companyName,
          confidenceScore: initialResult.confidenceScore,
          flags: Array.from(flags),
          tokens: initialResult.tokens || 0
        };
      }
      companyName = initialResult.companyName || "";
      confidenceScore = initialResult.confidenceScore || 0;
      tokens = initialResult.tokens || 0;
    } catch (error) {
      log("error", "humanizeName failed", { domain: normalizedDomain, error: error.message });
      flags.add("HumanizeNameError");
      initialResult = { companyName: "", confidenceScore: 0, flags: [], tokens: 0 };
    }

    // Enhanced token rescue
    let cleanDomain;
    try {
      cleanDomain = normalizedDomain.replace(/^(www\.)|(\.com|\.net|\.org|\.biz|\.ca|\.co\.uk)$/g, "");
      const { brand: domainBrand, city } = extractBrandOfCityFromDomain(cleanDomain);
      let extractedTokensResult = extractTokens(cleanDomain);
      let extractedTokens = extractedTokensResult.tokens;
      tokens = extractedTokens.length;
      flags.add(...extractedTokensResult.flags);
      confidenceScore = Math.max(confidenceScore, extractedTokensResult.confidenceScore);

      extractedTokens = extractedTokens
        .map(t => t.toLowerCase())
        .filter(t => !SPAMMY_TOKENS.includes(t) && t !== "of");

      // Priority 1: Retry humanizeName with proper noun sequence (support multi-word proper nouns)
      const properNounTokens = extractedTokens.filter(t => properNounsSet.has(t));
      if (properNounTokens.length >= 2) {
        const tempName = properNounTokens.map(t => capitalizeName(t)).join(" ");
        const retryResult = await humanizeName(tempName);
        if (retryResult.confidenceScore >= 95) {
          const validatedName = retryResult.companyName;
          if (!pattern.test(validatedName)) {
            log("warn", "Retry humanizeName result pattern validation failed", { domain: normalizedDomain, companyName: validatedName });
            flags.add("RetryPatternFailed");
          } else {
            log("info", "Retry humanizeName success with proper noun", { domain: normalizedDomain, companyName: validatedName });
            flags.add("RetryHumanizeSuccess");
            return {
              companyName: validatedName,
              confidenceScore: retryResult.confidenceScore,
              flags: Array.from(new Set([...retryResult.flags, ...flags])),
              tokens
            };
          }
        }
      }

      // Priority 2: Single proper noun with conditional brand append
      const singleProper = extractedTokens.find(t => properNounsSet.has(t) && !CAR_BRANDS.includes(t) && !KNOWN_CITIES_SET.has(t));
      if (singleProper) {
        companyName = capitalizeName(singleProper);
        if (!pattern.test(companyName)) {
          log("warn", "Single proper noun pattern validation failed", { domain: normalizedDomain, companyName });
          companyName = "";
        } else {
          confidenceScore = 95;
          flags.add("SingleProperNoun");

          // Append brand only if the name is ambiguous for cold emails (e.g., too generic)
          if (domainBrand && (companyName.length < 5 || companyName.toLowerCase() === "smith" || companyName.toLowerCase() === "jones")) {
            const formattedBrand = BRAND_MAPPING[domainBrand.toLowerCase()] || capitalizeName(domainBrand);
            const combinedName = `${companyName} ${formattedBrand}`;
            if (!pattern.test(combinedName)) {
              log("warn", "Brand append pattern validation failed", { domain: normalizedDomain, companyName: combinedName });
            } else {
              companyName = combinedName;
              flags.add("BrandAppendedForClarity");
              confidenceScore = 100;
            }
          }

          if (companyName.length > 12 && !/\s/.test(companyName)) {
            flags.add("BlobLikeFallback");
            flags.add("ManualReviewRecommended");
            confidenceScore = 80;
          }
        }
      }

      // Priority 3: City + Brand or Generic (expanded generic terms)
      if (city) {
        if (domainBrand) {
          const formattedCity = capitalizeName(city);
          const formattedBrand = BRAND_MAPPING[domainBrand.toLowerCase()] || capitalizeName(domainBrand);
          companyName = `${formattedCity} ${formattedBrand}`;
          if (!pattern.test(companyName)) {
            log("warn", "City + domain brand pattern validation failed", { domain: normalizedDomain, companyName });
            companyName = formattedCity;
            flags.add("PatternValidationFailed");
          } else {
            log("info", "City and domain brand applied", { domain: normalizedDomain, companyName });
            flags.add("CityBrandPattern");
            confidenceScore = 125;
          }
        } else {
          const genericTerms = ["auto", "motors", "dealers", "group", "cars", "drive", "center", "world"];
          const generic = extractedTokens.find(t => genericTerms.includes(t));
          if (generic) {
            const formattedCity = capitalizeName(city);
            const formattedGeneric = capitalizeName(generic);
            companyName = `${formattedCity} ${formattedGeneric}`;
            if (!pattern.test(companyName)) {
              log("warn", "City + generic pattern validation failed", { domain: normalizedDomain, companyName });
              companyName = formattedCity;
              flags.add("PatternValidationFailed");
            } else {
              log("info", "City and generic term applied", { domain: normalizedDomain, companyName });
              flags.add("CityGenericPattern");
              confidenceScore = 95;
            }
          } else {
            companyName = capitalizeName(city);
            if (!pattern.test(companyName)) {
              log("warn", "City-only pattern validation failed", { domain: normalizedDomain, companyName });
              companyName = "";
              flags.add("PatternValidationFailed");
            } else {
              log("info", "City-only output", { domain: normalizedDomain, companyName });
              flags.add("CityOnlyFallback");
              flags.add("ManualReviewRecommended");
              confidenceScore = 80;
            }
          }
        }
      }

      // Priority 4: Generic Blob or Initials Fallback
      if (!companyName && extractedTokens.length === 1) {
        const token = extractedTokens[0];
        if (KNOWN_GENERIC_BLOBS[token]) {
          companyName = KNOWN_GENERIC_BLOBS[token];
          if (!pattern.test(companyName)) {
            log("warn", "Generic blob pattern validation failed", { domain: normalizedDomain, companyName });
            companyName = "";
            flags.add("PatternValidationFailed");
          } else {
            log("info", "Generic blob mapped", { domain: normalizedDomain, companyName });
            flags.add("GenericBlobMapped");
            confidenceScore = 95;
          }
        } else if (token.length >= 3 && token.length <= 5 && /^[a-zA-Z]+$/.test(token)) {
          const initials = token.toUpperCase();
          companyName = `${initials} Auto`;
          if (!pattern.test(companyName)) {
            log("warn", "Initials pattern validation failed", { domain: normalizedDomain, companyName });
            companyName = "";
            flags.add("PatternValidationFailed");
          } else {
            log("info", "Initials extracted", { domain: normalizedDomain, companyName });
            flags.add("InitialsRecovered");
            confidenceScore = 80;
          }
        }
      }

      // Priority 5: Brand + Generic (expanded generic terms)
      if (domainBrand && !companyName) {
        const genericTerms = ["auto", "motors", "dealers", "group", "cares", "cars", "drive", "center", "world"];
        const generic = extractedTokens.find(t => genericTerms.includes(t));
        if (generic) {
          const formattedBrand = BRAND_MAPPING[domainBrand.toLowerCase()] || capitalizeName(domainBrand);
          const formattedGeneric = capitalizeName(generic);
          companyName = `${formattedBrand} ${formattedGeneric}`;
          if (!pattern.test(companyName)) {
            log("warn", "Brand + generic pattern validation failed", { domain: normalizedDomain, companyName });
            companyName = "";
            flags.add("PatternValidationFailed");
          } else {
            log("info", "Brand and generic term applied", { domain: normalizedDomain, companyName });
            flags.add("BrandGenericMatch");
            confidenceScore = 100;
          }
        }
      }

      // Removed Priority 6: Enhanced Metadata Fallback (since getMetaTitleBrand is undefined)
    } catch (error) {
      log("error", "Token rescue failed", { domain: normalizedDomain, error: error.message, stack: error.stack });
      flags.add("LocalFallbackFailed");
      flags.add("ManualReviewRecommended");
    }

    // Optimize OpenAI usage: Skip OpenAI if the name is already well-formed
    if (companyName && pattern.test(companyName) && companyName.split(" ").length >= 2 && !/\b[a-z]+[A-Z]/.test(companyName)) {
      log("info", "Skipping OpenAI fallback due to well-formed name", { domain: normalizedDomain, companyName, confidenceScore });
      const finalResult = {
        companyName,
        confidenceScore,
        flags: Array.from(flags),
        tokens
      };
      openAICache.set(`${normalizedDomain}:${(meta.title || "").toLowerCase().trim()}`, finalResult);
      log("info", "Result cached without OpenAI", { domain: normalizedDomain, companyName });
      return finalResult;
    }

    // OpenAI fallback for spacing/casing (last resort, only if necessary)
    if (companyName && (companyName.split(" ").length < 2 || /\b[a-z]+[A-Z]/.test(companyName))) {
      const cacheKey = `${normalizedDomain}:${(meta.title || "").toLowerCase().trim()}`;
      if (openAICache.has(cacheKey)) {
        const cached = openAICache.get(cacheKey);
        log("info", "Cache hit", { domain: normalizedDomain, companyName: cached.companyName });
        flags.add("OpenAICacheHit");
        return {
          companyName: cached.companyName,
          confidenceScore: cached.confidenceScore,
          flags: Array.from(new Set([...flags, ...cached.flags])),
          tokens: cached.tokens
        };
      }

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

        if (!pattern.test(name)) {
          log("warn", "OpenAI spacing fix pattern validation failed", { domain: normalizedDomain, name });
          throw new FallbackError("OpenAI spacing fix pattern validation failed", { domain: normalizedDomain });
        }

        const domainBrand = CAR_BRANDS.find(b => normalizedDomain.includes(b.toLowerCase())) || null;
        const { validatedName, flags: validationFlags, confidenceScore: updatedConfidence } = validateFallbackName(
          { name, brand: null, flagged: false },
          normalizedDomain,
          domainBrand,
          confidenceScore
        );
        flags.add(...validationFlags);

        if (validatedName) {
          companyName = validatedName;
          confidenceScore = updatedConfidence;
          flags.add("OpenAISpacingFix");
        } else {
          flags.add("OpenAIFallbackFailed");
          flags.add("ManualReviewRecommended");
        }

        const finalResult = {
          companyName,
          confidenceScore,
          flags: Array.from(flags),
          tokens
        };
        openAICache.set(cacheKey, finalResult);
        return finalResult;
      } catch (error) {
        log("error", "OpenAI spacing fix failed", { domain: normalizedDomain, error: error.message, stack: error.stack });
        flags.add("OpenAIFallbackFailed");
        flags.add("ManualReviewRecommended");
      }
    }

    // Final fallback
    if (!companyName) {
      companyName = capitalizeName(cleanDomain.split(/(?=[A-Z])/)[0]);
      if (!pattern.test(companyName)) {
        log("warn", "Final fallback pattern validation failed", { domain: normalizedDomain, companyName });
        companyName = "";
        flags.add("PatternValidationFailed");
      } else {
        flags.add("FinalFallback");
        flags.add("ManualReviewRecommended");
        confidenceScore = 50;
      }
    }

    // Deduplicate output
    if (companyName) {
      const words = companyName.toLowerCase().split(" ");
      const uniqueWords = [...new Set(words)];
      if (uniqueWords.length !== words.length) {
        companyName = uniqueWords.map(t => capitalizeName(t)).join(" ");
        if (!pattern.test(companyName)) {
          log("warn", "Deduplicated output pattern validation failed", { domain: normalizedDomain, companyName });
          companyName = "";
          flags.add("PatternValidationFailed");
        } else {
          confidenceScore = Math.min(confidenceScore, 95);
          flags.add("DuplicatesRemoved");
        }
      }
    }

    // Final validation: Ensure the companyName is non-empty and meets quality standards
    if (!companyName || companyName.length < 3) {
      log("warn", "Final company name is empty or too short", { domain: normalizedDomain, companyName });
      companyName = "";
      confidenceScore = 0;
      flags.add("InvalidFinalName");
      flags.add("ManualReviewRecommended");
    }

    // Final validation: Check for brand-only output
    if (companyName && CAR_BRANDS.includes(companyName.toLowerCase())) {
      companyName = "";
      confidenceScore = 0;
      flags.add("BrandOnlyFallback");
      flags.add("ManualReviewRecommended");
    }

    const finalResult = {
      companyName,
      confidenceScore,
      flags: Array.from(flags),
      tokens
    };

    openAICache.set(`${normalizedDomain}:${(meta.title || "").toLowerCase().trim()}`, finalResult);
    log("info", "Result cached", { domain: normalizedDomain, companyName, confidenceScore, flags: Array.from(flags) });
    return finalResult;
  } catch (err) {
    log("error", "fallbackName failed", {
      domain: normalizedDomain || "unknown",
      error: err.message,
      stack: err.stack
    });
    flags.add("FallbackNameError");
    flags.add("ManualReviewRecommended");
    return { companyName, confidenceScore: 0, flags: Array.from(flags), tokens };
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
      const result = await fallbackName(lead.domain, lead.domain, { title: lead.metaTitle });
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

export { fallbackName, clearOpenAICache, handler, validateFallbackName, cleanCompanyName, validateOverrideFormat, handleOverride };
