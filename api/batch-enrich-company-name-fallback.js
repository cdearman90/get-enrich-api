// api/batch-enrich-company-name-fallback.js
// Fallback logic using OpenAI with caching

import { humanizeName, capitalizeName, earlyCompoundSplit, extractBrandOfCityFromDomain, normalizeDomain, expandInitials } from "./lib/humanize.js";

import {
  BRAND_ONLY_DOMAINS,
  CAR_BRANDS,
  KNOWN_CITIES_SET,
  properNounsSet,
  OVERRIDES,
  SPAMMY_TOKENS,
  KNOWN_GENERIC_BLOBS,
  BRAND_MAPPING,
  SUFFIXES_TO_REMOVE,
  BLOCKLIST
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

function log(level, message, context = {}) {
  logger[level]({ message, domain: context.domain || null, ...context });
}

// Cache for OpenAI results
const openAICache = new Map();

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
    log('warn', 'Invalid override format', { domain: normalizedDomain, override });
    return {
      companyName: '',
      confidenceScore: 0,
      flags: ['override', 'invalidOverrideFormat'],
      tokens: [],
      confidenceOrigin: 'invalidOverrideFormat'
    };
  }

  const companyName = cleanCompanyName(capitalizeName(override));
  const nameTokens = companyName.split(' ').filter(Boolean);
  const validation = validateFallbackName(
    { name: companyName, brand: null, flagged: false },
    normalizedDomain,
    null,
    125
  );

  if (!validation.validatedName) {
    log('warn', 'Override validation failed', { domain: normalizedDomain, override });
    return {
      companyName: '',
      confidenceScore: 0,
      flags: ['override', 'patternValidationFailed'],
      tokens: [],
      confidenceOrigin: 'overrideValidationFailed',
      rawTokenCount: 0
    };
  }

  log('info', 'Override applied', { domain: normalizedDomain, companyName: validation.validatedName });
  return {
    companyName: validation.validatedName,
    confidenceScore: validation.confidenceScore,
    flags: ['override', ...validation.flags],
    tokens: nameTokens.map(t => t.toLowerCase()),
    confidenceOrigin: 'override',
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

  // Validate input
  if (!domain || typeof domain !== 'string' || !domain.trim()) {
    log('error', 'Invalid domain input in extractTokens', { domain });
    return { tokens: [], confidenceScore: 0, flags: ['InvalidDomainInput'] };
  }

  try {
    // Split on separators and camelCase boundaries
    let tokens = domain
      .toLowerCase()
      .replace(/([a-z])([A-Z])/g, '$1-$2') // Split camelCase (e.g., "JimmyBritt" → "Jimmy-Britt")
      .split(/[-_]/) // Split on hyphens and underscores
      .filter(token => token && /^[a-z0-9]+$/.test(token)); // Remove empty or invalid tokens

    // Validate tokens
    if (tokens.length === 0) {
      log('warn', 'No valid tokens extracted after initial split', { domain, tokens });
      flags.push('NoValidTokens');
      confidenceScore = 0;
      return { tokens: [], confidenceScore, flags };
    }

    // Expand initials with validation
    tokens = tokens.map(t => {
      try {
        const expanded = expandInitials(t);
        if (!expanded || typeof expanded !== 'string') {
          log('warn', 'Invalid output from expandInitials', { domain, token: t, expanded });
          return t; // Fallback to original token
        }
        return expanded;
      } catch (err) {
        log('error', 'expandInitials failed', { domain, token: t, error: err.message, stack: err.stack });
        return t; // Fallback to original token
      }
    }).flatMap(token => token.split(' ').filter(t => t)); // Handle multi-token expansions

    // Remove suffixes and spammy tokens with existence guards
    const suffixes = SUFFIXES_TO_REMOVE instanceof Set ? new Set([...SUFFIXES_TO_REMOVE, 'motors', 'auto', 'group']) : new Set(['motors', 'auto', 'group']);
    tokens = tokens.filter(token => {
      const lowerToken = token.toLowerCase();
      if (suffixes instanceof Set && suffixes.has(lowerToken)) {
        flags.push('SuffixRemoved');
        return false;
      }
      if (Array.isArray(SPAMMY_TOKENS) && SPAMMY_TOKENS.includes(lowerToken)) {
        flags.push('SpammyTokenRemoved');
        return false;
      }
      return true;
    });

    // Deduplicate tokens
    tokens = [...new Set(tokens)];
    if (tokens.length < tokens.length) { // Note: This condition is always false due to deduplication; fix logic
      flags.push('DuplicateTokensRemoved');
      confidenceScore = Math.min(confidenceScore, 95);
    }

    // Cap at 3 tokens for cold-email safety
    if (tokens.length > 3) {
      log('debug', 'Token count exceeds limit, truncating', { domain, originalCount: tokens.length });
      flags.push('TokenCountAdjusted');
      confidenceScore = Math.min(confidenceScore, 95);
      tokens = tokens.slice(0, 3);
    }

    // Final validation
    if (tokens.length === 0) {
      log('warn', 'No tokens remain after filtering', { domain });
      flags.push('AllTokensFiltered');
      confidenceScore = 0;
    }

    // Log tokenization details
    log('debug', 'Extracted tokens', {
      domain,
      tokens,
      rawTokenCount: tokens.length,
      confidenceScore,
      flags
    });

    return { tokens, confidenceScore, flags };
  } catch (err) {
    log('error', 'extractTokens failed', { domain, error: err.message, stack: err.stack });
    return { tokens: [], confidenceScore: 0, flags: ['ExtractTokensError'] };
  }
}

/**
 * Splits merged tokens using earlyCompoundSplit from humanize.js.
 * @param {string} name - The name to split.
 * @returns {string} - The split name.
 */
function splitMergedTokens(name) {
  try {
    // Validate input
    if (!name || typeof name !== 'string' || !name.trim()) {
      log('error', 'Invalid name in splitMergedTokens', { name });
      return name || '';
    }

    // Use earlyCompoundSplit to tokenize
    const splitTokens = earlyCompoundSplit(name.trim());
    
    // Validate output
    if (!Array.isArray(splitTokens) || !splitTokens.every(token => typeof token === 'string' && token.trim())) {
      log('warn', 'Invalid or empty tokens from earlyCompoundSplit', { name, splitTokens });
      return capitalizeName(name.trim())?.name || name.trim();
    }

    // Capitalize tokens and join
    const capitalizedTokens = splitTokens
      .map(token => {
        const capResult = capitalizeName(token) || { name: token };
        return capResult.name;
      })
      .filter(token => token); // Remove empty tokens

    // Cap at 3 tokens for cold-email safety
    const finalTokens = capitalizedTokens.slice(0, 3);
    
    // Join tokens
    const result = finalTokens.join(' ');

    // Validate result
    const pattern = /^([A-Z][a-z]+(?: [A-Z][a-z]+)?)(?: [A-Z][a-z]+)?$/;
    if (!result || !pattern.test(result)) {
      log('warn', 'Split tokens result does not match pattern', { name, result });
      return capitalizeName(name.trim())?.name || name.trim();
    }

    log('debug', 'splitMergedTokens result', { name, result, tokens: finalTokens });
    return result;
  } catch (e) {
    log('error', 'splitMergedTokens failed', { name, error: e.message, stack: e.stack });
    return capitalizeName(name?.trim() || '')?.name || name || '';
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

  log('info', 'validateFallbackName started', { domain, result });

  try {
    // Initial validation: Ensure result is valid
    if (!result || !validatedName || typeof validatedName !== 'string') {
      log('warn', 'Invalid OpenAI result', { domain, result });
      flags.add('FallbackNameError');
      flags.add('ReviewNeeded');
      return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
    }

    // Convert CAR_BRANDS to Set for consistency with existence guard
    const carBrandsSet = CAR_BRANDS instanceof Set ? CAR_BRANDS : new Set();

    // Define regex pattern for name validation (e.g., "Chicago Auto")
    const pattern = /^([A-Z][a-z]+(?: [A-Z][a-z]+)?)(?: [A-Z][a-z]+)?$/;

    // Step 1: Split merged tokens if necessary
    if (validatedName.split(' ').length === 1) {
      const splitName = splitMergedTokens(validatedName);
      if (splitName !== validatedName) {
        validatedName = splitName;
        log('info', 'Merged tokens split', { domain, validatedName });
        flags.add('TokenSplitApplied');
        currentConfidenceScore = Math.min(currentConfidenceScore, 95);
      } else {
        const capResult = capitalizeName(validatedName) || { name: validatedName };
        validatedName = capResult.name;
      }
    }

    // Step 2: Handle blob-like names
    if (validatedName && validatedName.length > 12 && !/\s/.test(validatedName)) {
      const lowerName = validatedName.toLowerCase();
      if (properNounsSet instanceof Set && properNounsSet.has(lowerName)) {
        const capResult = capitalizeName(validatedName) || { name: validatedName };
        validatedName = capResult.name;
        log('info', 'Blob-like name recovered as proper noun', { domain, validatedName });
        flags.add('BlobLikeRecovered');
      } else {
        const splitAttempt = validatedName
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .split(' ')
          .filter(Boolean)
          .map(t => {
            const capResult = capitalizeName(t) || { name: t };
            return capResult.name;
          })
          .join(' ');
        if (splitAttempt.split(' ').length > 1 && pattern.test(splitAttempt)) {
          validatedName = splitAttempt;
          log('info', 'Blob-like name split', { domain, validatedName });
          flags.add('BlobLikeSplit');
          currentConfidenceScore = Math.min(currentConfidenceScore, 95);
        } else {
          log('warn', 'Blob-like name detected', { domain, validatedName });
          flags.add('BlobLikeFallback');
          flags.add('ReviewNeeded');
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
      log('warn', 'Uncapitalized or malformed output', { domain, validatedName });
      flags.add('FallbackNameError');
      flags.add('ReviewNeeded');
      return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
    }

    // Step 4: Check for city-only or brand-only outputs
    const tokens = validatedName.split(' ');
    const isBrand = carBrandsSet instanceof Set && carBrandsSet.has(validatedName.toLowerCase());
    const isProper = properNounsSet instanceof Set && properNounsSet.has(validatedName.toLowerCase());
    const hasCity = KNOWN_CITIES_SET instanceof Set && tokens.some(t => KNOWN_CITIES_SET.has(t.toLowerCase()));
    const genericTerms = ['auto', 'motors', 'dealers', 'group', 'cares', 'cars', 'drive', 'center', 'world'];
    const hasGeneric = tokens.some(t => genericTerms.includes(t.toLowerCase()));

    if (!isProper) {
      if (isBrand) {
        log('warn', 'Brand-only output detected', { domain, validatedName });
        flags.add('BrandOnlyFallback');
        flags.add('ReviewNeeded');
        return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
      }
      if (hasCity && !hasGeneric && tokens.length === 1) {
        log('warn', 'City-only output detected', { domain, validatedName });
        flags.add('CityOnlyFallback');
        flags.add('ReviewNeeded');
        return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
      }
    }

    // Step 5: Handle brand mismatch
    if (result.brand && domainBrand && result.brand.toLowerCase() !== domainBrand.toLowerCase()) {
      log('warn', 'OpenAI brand mismatch, prioritizing domain brand', { domain, openAIBrand: result.brand, domainBrand });
      flags.add('BrandMismatchPenalty');
      currentConfidenceScore = Math.max(currentConfidenceScore - 5, 50);
      if (tokens.some(w => carBrandsSet instanceof Set && carBrandsSet.has(w.toLowerCase()))) {
        validatedName = tokens
          .map(w =>
            carBrandsSet instanceof Set && carBrandsSet.has(w.toLowerCase())
              ? (BRAND_MAPPING instanceof Map && BRAND_MAPPING.has(domainBrand.toLowerCase()) ? BRAND_MAPPING.get(domainBrand.toLowerCase()) : capitalizeName(domainBrand)?.name || domainBrand)
              : w
          )
          .join(' ');
        flags.add('DomainBrandApplied');
      }
    }

    // Step 6: Validate brand against CAR_BRANDS
    if (result.brand && !(carBrandsSet instanceof Set && carBrandsSet.has(result.brand.toLowerCase()))) {
      log('warn', 'OpenAI hallucinated brand', { domain, brand: result.brand });
      flags.add('FallbackNameError');
      flags.add('ReviewNeeded');
      return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
    }

    // Step 7: Consolidated validation checks
    // Check token count (1–3 words)
    if (tokens.length > 3) {
      log('warn', 'Output too long', { domain, validatedName });
      validatedName = tokens.slice(0, 3).join(' ');
      flags.add('TokenCountAdjusted');
      currentConfidenceScore = Math.min(currentConfidenceScore, 95);
    }

    // Check for duplicates
    const words = validatedName.toLowerCase().split(' ');
    const uniqueWords = [...new Set(words)];
    if (uniqueWords.length !== words.length) {
      log('warn', 'Duplicate tokens in output', { domain, validatedName });
      validatedName = uniqueWords
        .map(t => {
          const capResult = capitalizeName(t) || { name: t };
          return capResult.name;
        })
        .join(' ');
      flags.add('DuplicatesRemoved');
      currentConfidenceScore = Math.min(currentConfidenceScore, 95);
    }

    // Check blocklist with existence guard
    if (Array.isArray(BLOCKLIST) && BLOCKLIST.includes(validatedName.toLowerCase())) {
      log('warn', 'Output in blocklist', { domain, validatedName });
      flags.add('FallbackNameError');
      flags.add('ReviewNeeded');
      return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
    }

    // Check spammy tokens (exclude valid generics) with existence guard
    const safeGenerics = ['auto', 'motors', 'dealers', 'group', 'cares', 'cars', 'drive', 'center', 'world'];
    const hasSpammyTokens = Array.isArray(SPAMMY_TOKENS) && SPAMMY_TOKENS.some(
      token => validatedName.toLowerCase().includes(token) && !safeGenerics.includes(token)
    );
    if (hasSpammyTokens) {
      log('warn', 'Output contains spammy tokens', { domain, validatedName });
      flags.add('SpammyTokens');
      flags.add('ReviewNeeded');
      validatedName = tokens
        .filter(t => !(Array.isArray(SPAMMY_TOKENS) && SPAMMY_TOKENS.includes(t.toLowerCase())) || safeGenerics.includes(t.toLowerCase()))
        .join(' ');
      if (!validatedName || !pattern.test(validatedName)) {
        flags.add('FallbackNameError');
        return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
      }
    }

    // Check for 3+ brands
    const brandCount = tokens.filter(t => carBrandsSet instanceof Set && carBrandsSet.has(t.toLowerCase())).length;
    if (brandCount >= 3) {
      log('warn', 'Too many brands in output', { domain, validatedName });
      flags.add('FallbackNameError');
      flags.add('ReviewNeeded');
      return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
    }

    // Final success logging
    log('info', 'Output validated successfully', {
      domain,
      validatedName,
      confidenceScore: currentConfidenceScore,
      flags: Array.from(flags)
    });
    return { validatedName, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
  } catch (e) {
    log('error', 'validateFallbackName failed', { domain, error: e.message, stack: e.stack });
    flags.add('FallbackNameError');
    flags.add('ReviewNeeded');
    return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
  }
}

/**
 * Fallback logic for low-confidence or failed humanize results
 * @param {string} domain - Domain to enrich
 * @param {string} originalDomain - Original domain for override lookup
 * @param {Object} meta - Meta data
 * @returns {{companyName: string, confidenceScore: number, flags: string[], tokens: number}} - Enriched result
 */
async function fallbackName(domain, originalDomain, meta = {}) {
  const normalizedDomain = normalizeDomain(domain);
  let companyName = '';
  let confidenceScore = 0;
  let flags = new Set(['FallbackName']);
  let tokens = 0;

  try {
    log('info', 'Starting fallback processing', { domain: normalizedDomain });

    const pattern = /^([A-Z][a-z]+(?: [A-Z][a-z]+)?)(?: [A-Z][a-z]+)?$/;

    // Check overrides with existence guard
    if (OVERRIDES && typeof OVERRIDES === 'object' && OVERRIDES[normalizedDomain]) {
      return handleOverride(normalizedDomain, OVERRIDES[normalizedDomain]);
    }

    // Validate input
    if (!normalizedDomain) {
      log('error', 'Invalid domain input', { domain: normalizedDomain });
      flags.add('InvalidDomainInput');
      flags.add('ManualReviewRecommended');
      return { companyName, confidenceScore, flags: Array.from(flags), tokens };
    }

    // Check brand-only domains with existence guard
    if (BRAND_ONLY_DOMAINS instanceof Set && BRAND_ONLY_DOMAINS.has(`${normalizedDomain}.com`)) {
      log('info', 'Skipping fallback for brand-only domain', { domain: normalizedDomain });
      flags.add('BrandOnlyDomainSkipped');
      return { companyName, confidenceScore: 0, flags: Array.from(flags), tokens };
    }

    // Try humanizeName
    let initialResult;
    try {
      initialResult = await humanizeName(normalizedDomain);
      flags.add(...initialResult.flags);
      log('info', 'humanizeName completed', { domain: normalizedDomain, result: initialResult });

      const confidenceThreshold = 80;
      if (initialResult.confidenceScore >= confidenceThreshold && !initialResult.flags.includes('ReviewNeeded')) {
        log('info', 'Using humanizeName result', { domain: normalizedDomain, companyName: initialResult.companyName });
        return {
          companyName: initialResult.companyName,
          confidenceScore: initialResult.confidenceScore,
          flags: Array.from(flags),
          tokens: initialResult.tokens?.length || 0
        };
      }
      companyName = initialResult.companyName || '';
      confidenceScore = initialResult.confidenceScore || 0;
      tokens = initialResult.tokens?.length || 0;
    } catch (error) {
      log('error', 'humanizeName failed', { domain: normalizedDomain, error: error.message, stack: error.stack });
      flags.add('HumanizeNameError');
      initialResult = { companyName: '', confidenceScore: 0, flags: [], tokens: 0 };
    }

    // Extract brand and city
    let cleanDomain = normalizedDomain.replace(/(\.com|\.net|\.org|\.biz|\.ca|\.co\.uk)$/g, '');
    let brandCityResult = extractBrandOfCityFromDomain(cleanDomain) || { brand: '', city: '' };
    let domainBrand = brandCityResult.brand;
    let city = brandCityResult.city;
    log('debug', 'extractBrandOfCityFromDomain result', { domain: normalizedDomain, brand: domainBrand, city });

    // Extract tokens
    let extractedTokensResult = extractTokens(cleanDomain);
    let extractedTokens = extractedTokensResult.tokens;
    tokens = extractedTokens.length;
    flags.add(...extractedTokensResult.flags);
    confidenceScore = Math.max(confidenceScore, extractedTokensResult.confidenceScore);

    extractedTokens = extractedTokens
      .map(t => t.toLowerCase())
      .filter(t => !(Array.isArray(SPAMMY_TOKENS) && SPAMMY_TOKENS.includes(t)) && t !== 'of');

    // Retry with proper noun tokens
    const properNounTokens = extractedTokens.filter(t => properNounsSet instanceof Set && properNounsSet.has(t));
    if (properNounTokens.length >= 2) {
      const tempName = properNounTokens.map(t => (capitalizeName(t) || { name: '' }).name).join(' ');
      const retryResult = await humanizeName(tempName);
      if (retryResult.confidenceScore >= 80) {
        const validatedName = retryResult.companyName;
        if (!pattern.test(validatedName)) {
          log('warn', 'Retry humanizeName result pattern validation failed', { domain: normalizedDomain, companyName: validatedName });
          flags.add('RetryPatternFailed');
        } else {
          log('info', 'Retry humanizeName success with proper noun', { domain: normalizedDomain, companyName: validatedName });
          flags.add('RetryHumanizeSuccess');
          return {
            companyName: validatedName,
            confidenceScore: retryResult.confidenceScore,
            flags: Array.from(new Set([...retryResult.flags, ...flags])),
            tokens
          };
        }
      }
    }

    // Single proper noun fallback
    const carBrandsSet = CAR_BRANDS instanceof Set ? CAR_BRANDS : new Set();
    const singleProper = extractedTokens.find(t => (properNounsSet instanceof Set && properNounsSet.has(t)) && !(carBrandsSet instanceof Set && carBrandsSet.has(t)) && !(KNOWN_CITIES_SET instanceof Set && KNOWN_CITIES_SET.has(t)));
    if (singleProper) {
      const nameResult = capitalizeName(singleProper) || { name: '' };
      companyName = nameResult.name;
      if (!pattern.test(companyName)) {
        log('warn', 'Single proper noun pattern validation failed', { domain: normalizedDomain, companyName });
        companyName = '';
      } else {
        confidenceScore = 95;
        flags.add('SingleProperNoun');

        if (domainBrand && (companyName.length < 5 || companyName.toLowerCase() === 'smith' || companyName.toLowerCase() === 'jones')) {
          const formattedBrand = BRAND_MAPPING instanceof Map && BRAND_MAPPING.has(domainBrand.toLowerCase()) ? BRAND_MAPPING.get(domainBrand.toLowerCase()) : (capitalizeName(domainBrand) || { name: '' }).name;
          const combinedName = `${companyName} ${formattedBrand}`;
          if (!pattern.test(combinedName)) {
            log('warn', 'Brand append pattern validation failed', { domain: normalizedDomain, companyName: combinedName });
          } else {
            companyName = combinedName;
            flags.add('BrandAppendedForClarity');
            confidenceScore = 100;
          }
        }

        if (companyName.length > 12 && !/\s/.test(companyName)) {
          flags.add('BlobLikeFallback');
          flags.add('ManualReviewRecommended');
          confidenceScore = 80;
        }
      }
    }

    // City-based fallback
    if (city && !companyName) {
      const formattedCityResult = capitalizeName(city) || { name: '' };
      let formattedCity = formattedCityResult.name;
      if (domainBrand) {
        const formattedBrand = BRAND_MAPPING instanceof Map && BRAND_MAPPING.has(domainBrand.toLowerCase()) ? BRAND_MAPPING.get(domainBrand.toLowerCase()) : (capitalizeName(domainBrand) || { name: '' }).name;
        companyName = formattedCity.toLowerCase().endsWith('s') ? `${formattedCity} ${formattedBrand}` : formattedCity;
        if (!pattern.test(companyName)) {
          log('warn', 'City + domain brand pattern validation failed', { domain: normalizedDomain, companyName });
          companyName = formattedCity;
          flags.add('PatternValidationFailed');
        } else {
          log('info', 'City and domain brand applied', { domain: normalizedDomain, companyName });
          flags.add('CityBrandPattern');
          confidenceScore = 125;
        }
      } else {
        const genericTerms = ['auto', 'motors', 'dealers', 'group', 'cars', 'drive', 'center', 'world'];
const generic = extractedTokens.find(t => genericTerms.includes(t));
if (generic) {
  const formattedGenericResult = capitalizeName(generic) || { name: '' };
  const formattedGeneric = formattedGenericResult.name;
  companyName = `${formattedCity} ${formattedGeneric}`;
  if (!pattern.test(companyName)) {
    log('warn', 'City + generic pattern validation failed', { domain: normalizedDomain, companyName });
    companyName = formattedCity;
    flags.add('PatternValidationFailed');
  } else {
    log('info', 'City and generic term applied', { domain: normalizedDomain, companyName });
    flags.add('CityGenericPattern');
    confidenceScore = 95;
  }
} else {
          companyName = formattedCity;
          if (!pattern.test(companyName)) {
            log('warn', 'City-only pattern validation failed', { domain: normalizedDomain, companyName });
            companyName = '';
            flags.add('PatternValidationFailed');
          } else {
            log('info', 'City-only output', { domain: normalizedDomain, companyName });
            flags.add('CityOnlyFallback');
            confidenceScore = 80;
          }
        }
      }
    }

    // Generic token fallback
    if (!companyName) {
      const spamTriggers = ['cars', 'sales', 'autogroup', 'group'];
      let cleanedTokens = extractedTokens
        .filter(t => !spamTriggers.includes(t))
        .filter((t, i, arr) => i === 0 || t !== arr[i - 1]);

      if (cleanedTokens.length === 0) {
        companyName = 'Auto';
        flags.add('GenericAppended');
        confidenceScore = 85;
      } else {
        let primaryToken = cleanedTokens.find(t => properNounsSet instanceof Set && properNounsSet.has((capitalizeName(t) || { name: '' }).name)) || cleanedTokens[0];
        let brand = domainBrand || cleanedTokens.find(t => carBrandsSet instanceof Set && carBrandsSet.has(t));
        if (brand) {
          brand = BRAND_MAPPING instanceof Map && BRAND_MAPPING.has(brand.toLowerCase()) ? BRAND_MAPPING.get(brand.toLowerCase()) : (capitalizeName(brand) || { name: '' }).name;
        }

        const primaryTokenResult = capitalizeName(primaryToken) || { name: '' };
        companyName = primaryTokenResult.name;
        const isPossessiveFriendly = companyName.toLowerCase().endsWith('s') || !/^[aeiou]$/i.test(companyName.slice(-1));
        if (!isPossessiveFriendly && brand && !companyName.toLowerCase().includes(brand.toLowerCase())) {
          companyName = `${companyName} ${brand || 'Auto'}`;
        }

        const nameTokens = companyName.split(' ').filter((t, i, arr) => i === 0 || t.toLowerCase() !== arr[i - 1].toLowerCase());
        companyName = nameTokens.slice(0, 3).join(' ').replace(/\b(auto auto|auto group)\b/gi, 'Auto').replace(/\s+/g, ' ').trim();
        flags.add('GenericPattern');
        confidenceScore = 95;

        if (nameTokens.every(t => properNounsSet instanceof Set && properNounsSet.has(t)) || (nameTokens.length === 1 && properNounsSet instanceof Set && properNounsSet.has(nameTokens[0]))) {
          confidenceScore = 125;
        }
      }
    }

    // Final brand append
    if (companyName && domainBrand && !companyName.toLowerCase().includes(domainBrand.toLowerCase())) {
      const formattedBrand = BRAND_MAPPING instanceof Map && BRAND_MAPPING.has(domainBrand.toLowerCase()) ? BRAND_MAPPING.get(domainBrand.toLowerCase()) : (capitalizeName(domainBrand) || { name: '' }).name;
      if (companyName.toLowerCase().endsWith('s')) {
        const combinedName = `${companyName} ${formattedBrand}`;
        if (!pattern.test(combinedName)) {
          log('warn', 'Brand + generic pattern validation failed', { domain: normalizedDomain, companyName: combinedName });
          flags.add('PatternValidationFailed');
        } else {
          companyName = combinedName;
          log('info', 'Brand and generic term applied', { domain: normalizedDomain, companyName });
          flags.add('BrandGenericMatch');
          confidenceScore = 100;
        }
      }
    }

    // Deduplicate tokens
    if (companyName) {
      const words = companyName.toLowerCase().split(' ');
      const uniqueWords = [...new Set(words)];
      if (uniqueWords.length !== words.length) {
        companyName = uniqueWords
          .map(t => (capitalizeName(t) || { name: '' }).name)
          .join(' ');
        if (!pattern.test(companyName)) {
          log('warn', 'Deduplicated output pattern validation failed', { domain: normalizedDomain, companyName });
          companyName = '';
          flags.add('PatternValidationFailed');
        } else {
          confidenceScore = Math.min(confidenceScore, 95);
          flags.add('DuplicatesRemoved');
        }
      }
    }

    // Final validation
    if (!companyName || companyName.length < 3) {
      log('warn', 'Final company name is empty or too short', { domain: normalizedDomain, companyName });
      companyName = '';
      confidenceScore = 0;
      flags.add('InvalidFinalName');
      flags.add('ManualReviewRecommended');
    }

    if (companyName && (carBrandsSet instanceof Set && carBrandsSet.has(companyName.toLowerCase()))) {
      companyName = '';
      confidenceScore = 0;
      flags.add('BrandOnlyFallback');
      flags.add('ManualReviewRecommended');
    }

    const finalResult = {
      companyName,
      confidenceScore,
      flags: Array.from(flags),
      tokens
    };

    if (openAICache instanceof Map) {
      openAICache.set(`${normalizedDomain}:${(meta.title || '').toLowerCase().trim()}`, finalResult);
      log('info', 'Result cached', { domain: normalizedDomain, companyName, confidenceScore, flags: Array.from(flags) });
    } else {
      log('warn', 'openAICache is not a Map, cannot cache result', { domain: normalizedDomain });
    }

    return finalResult;
  } catch (err) {
    log('error', 'fallbackName failed', {
      domain: normalizedDomain || 'unknown',
      error: err.message,
      stack: err.stack
    });
    flags.add('FallbackNameError');
    flags.add('ManualReviewRecommended');
    return { companyName, confidenceScore: 0, flags: Array.from(flags), tokens };
  }
}

/**
 * Clears OpenAI cache
 */
function clearOpenAICache() {
  if (openAICache instanceof Map) {
    openAICache.clear();
    log("info", "OpenAI cache cleared", {});
  } else {
    log("warn", "openAICache is not a Map, cannot clear cache", {});
  }
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
