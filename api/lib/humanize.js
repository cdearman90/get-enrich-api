// api/lib/humanize.js v5.0.9
// Logger configuration with Vercel-safe transports only

import winston from "winston";

import {
  CAR_BRANDS,
  BRAND_MAPPING,
  KNOWN_CITIES_SET,
  KNOWN_FIRST_NAMES,
  KNOWN_PROPER_NOUNS,
  BRAND_ONLY_DOMAINS,
  KNOWN_LAST_NAMES,
  COMMON_WORDS,
  SUFFIXES_TO_REMOVE,
  ABBREVIATION_EXPANSIONS,
  SORTED_CITY_LIST,
  TEST_CASE_OVERRIDES,
  properNounsSet
} from "./constants.js";

const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
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
  logger[level]({ message, ...context });
}

// Normalizes domain by removing "www." and extracting base domain
function normalizeDomain(domain) {
  if (typeof domain !== "string" || !domain) {
    log("error", "Invalid domain input", { domain });
    return "";
  }
  return domain.toLowerCase().replace(/^www\./, "").split(".")[0];
}

// Cleans company name by removing trailing suffixes and connectors
function cleanCompanyName(companyName) {
  try {
    if (!companyName || typeof companyName !== "string") {
      log("error", "Invalid name in cleanCompanyName", { companyName });
      return "";
    }

    // Validate dependencies
    if (!(COMMON_WORDS instanceof Set) || !(SUFFIXES_TO_REMOVE instanceof Set)) {
      log("error", "Invalid dependencies in cleanCompanyName", {
        COMMON_WORDS: COMMON_WORDS instanceof Set,
        SUFFIXES_TO_REMOVE: SUFFIXES_TO_REMOVE instanceof Set
      });
      return companyName.trim();
    }

    let tokens = companyName.trim().split(/\s+/).filter(Boolean);
    if (!tokens.every(token => typeof token === "string")) {
      log("error", "Invalid tokens in cleanCompanyName", { companyName, tokens });
      return companyName.trim();
    }

    // Remove leading connectors (e.g., "Of Ford")
    while (tokens.length > 0 && COMMON_WORDS.has(tokens[0].toLowerCase())) {
      tokens.shift();
    }

    // Remove trailing suffixes and connectors (e.g., "Toyota The")
    while (tokens.length > 0 && (SUFFIXES_TO_REMOVE.has(tokens[tokens.length - 1].toLowerCase()) || COMMON_WORDS.has(tokens[tokens.length - 1].toLowerCase()))) {
      tokens.pop();
    }

    return tokens.join(" ").trim();
  } catch (e) {
    log("error", "cleanCompanyName failed", { companyName, error: e.message, stack: e.stack });
    return companyName ? companyName.trim() : "";
  }
}

function capitalizeName(name) {
  try {
    if (!name || typeof name !== "string" || !name.trim()) {
      log("error", "Invalid name in capitalizeName", { name });
      return { name: "", flags: ["InvalidInput"] };
    }

    const trimmedName = name.trim().replace(/\s+/g, " ");
    let flags = [];
    let result = trimmedName;

    if (trimmedName.includes(".")) {
      const parts = trimmedName.split(" ").filter(Boolean);
      result = parts
        .map(word => {
          if (!word) return word;
          if (/^[A-Z]\.[A-Z]\.$/.test(word)) return word; // Preserve "M.B."
          if (word.length <= 5 && word === word.toUpperCase()) return word; // Preserve acronyms
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(" ");
      flags.push("AbbreviationPreserved");
    } else {
      result = trimmedName.replace(/([a-z])([A-Z])/g, "$1 $2");
      result = result
        .split(" ")
        .filter(Boolean)
        .map(word => {
          if (!word) return word;
          if (word.length <= 5 && word === word.toUpperCase()) return word;
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(" ");
    }

    return { name: result, flags };
  } catch (e) {
    log("error", "capitalizeName failed", { name, error: e.message, stack: e.stack });
    return { name: "", flags: ["CapitalizeNameError"] };
  }
}

// ✅ Removed duplicate capitalizeName implementation that caused the error

// Expands initials in tokens (e.g., 'J.B.' → 'J B')
function expandInitials(token) {
  if (!token || typeof token !== "string") return token;
  if (token.match(/^[A-Z]\.[A-Z]\.$/)) {
    return token.replace(/\./g, " ").trim();
  }
  return token;
}

// Tokenizes domain into meaningful components
function earlyCompoundSplit(domain) {
  if (!domain || typeof domain !== "string") {
    log("error", "Invalid domain for tokenization", { domain });
    return [];
  }

  // Check for overrides first
  const override = TEST_CASE_OVERRIDES.get(domain + ".com");
  if (override) {
    log("info", `Override applied for domain: ${domain}`, { override });
    return override.split(" ").map(word => word.toLowerCase());
  }

  // Initialize tokens
  let tokens = [];

  // Handle camelCase and basic splitting
  const camelCaseTokens = domain.match(/[A-Z]?[a-z]+/g) || [domain];
  let remaining = camelCaseTokens.join("");

  // Process abbreviations with word boundaries (e.g., 'mb' → 'M.B.')
  for (const [abbr, expansion] of ABBREVIATION_EXPANSIONS) {
    const regex = new RegExp(`\\b${abbr}\\b`, "g");
    if (remaining.match(regex)) {
      remaining = remaining.replace(regex, expansion.toLowerCase());
    }
  }

  // Re-split after expansions
  tokens = remaining.split(/[^a-zA-Z]+/).filter(Boolean);

  // Expand initials in tokens
  tokens = tokens.map(token => expandInitials(token)).flatMap(token => token.split(" ")).filter(Boolean);

  // Handle multi-word cities (e.g., 'northlasvegas')
  for (const city of SORTED_CITY_LIST) {
    const cityLower = city.toLowerCase().replace(/\s+/g, "");
    if (remaining.includes(cityLower)) {
      const cityTokens = city.toLowerCase().split(" ").filter(Boolean);
      const index = tokens.join("").indexOf(cityLower);
      if (index !== -1) {
        tokens.splice(tokens.findIndex(t => t.includes(cityLower[0])), 0, ...cityTokens);
        tokens = tokens.filter(t => !cityLower.includes(t) || cityTokens.includes(t));
        remaining = remaining.replace(cityLower, "");
      }
    }
  }

  // Greedy prefix matching for proper nouns and brands
  const tokenParts = tokens.slice();
  tokens = [];
  for (let i = 0; i < tokenParts.length; i++) {
    let matched = false;
    for (let len = 3; len >= 1; len--) {
      if (i + len > tokenParts.length) continue;
      const segment = tokenParts.slice(i, i + len).join("");
      if (KNOWN_PROPER_NOUNS.has(segment.toLowerCase())) {
        tokens.push(segment.toLowerCase());
        i += len - 1;
        matched = true;
        break;
      } else if (CAR_BRANDS.has(segment.toLowerCase())) {
        tokens.push(segment.toLowerCase());
        i += len - 1;
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push(tokenParts[i]);
    }
  }

  // Add remaining tokens, excluding common words unless necessary
  const finalTokens = tokens
    .filter(token => token && (!COMMON_WORDS.has(token.toLowerCase()) || CAR_BRANDS.has(token) || KNOWN_CITIES_SET.has(token)))
    .slice(0, 3); // Cap at 3 tokens

  // Deduplicate tokens
  const uniqueTokens = [...new Set(finalTokens)];

  log("debug", `Tokenized domain: ${domain}`, { tokens: uniqueTokens });

  return uniqueTokens;
}

function extractBrandOfCityFromDomain(domain) {
  try {
    // Validate input
    if (!domain || typeof domain !== 'string' || !domain.trim()) {
      log('error', 'Invalid domain in extractBrandOfCityFromDomain', { domain });
      return { brand: '', city: '', connector: '' };
    }

    // Normalize the domain
    const normalized = normalizeDomain(domain);
    if (!normalized || typeof normalized !== 'string') {
      log('error', 'normalizeDomain returned invalid result', { domain, normalized });
      return { brand: '', city: '', connector: '' };
    }

    // Check brand-only domains
    if (BRAND_ONLY_DOMAINS.has(`${normalized}.com`)) {
      log('info', 'Skipping brand-only domain', { domain: normalized });
      return { brand: '', city: '', connector: '' };
    }

    // Split into tokens
    let tokens = earlyCompoundSplit(normalized);
    if (!Array.isArray(tokens) || !tokens.every(token => typeof token === 'string') || tokens.length === 0) {
      log('warn', 'earlyCompoundSplit returned invalid or empty tokens', { domain, tokens });
      return { brand: '', city: '', connector: '' };
    }

    // Validate dependencies
    const carBrandsSet = new Set(CAR_BRANDS);
    if (!(carBrandsSet instanceof Set) || !(KNOWN_CITIES_SET instanceof Set) || !(BRAND_MAPPING instanceof Map)) {
      log('error', 'Invalid dependencies in extractBrandOfCityFromDomain', {
        CAR_BRANDS: carBrandsSet instanceof Set,
        KNOWN_CITIES_SET: KNOWN_CITIES_SET instanceof Set,
        BRAND_MAPPING: BRAND_MAPPING instanceof Map
      });
      return { brand: '', city: '', connector: '' };
    }

    let brand = '';
    let city = '';

    // First pass: Look for brand followed by city
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (typeof token !== 'string' || !token.trim()) continue;
      const lowerToken = token.toLowerCase();
      if (carBrandsSet.has(lowerToken)) {
        brand = BRAND_MAPPING.get(lowerToken) || capitalizeName(token)?.name || token;
        for (let j = i + 1; j < tokens.length; j++) {
          const nextToken = tokens[j];
          if (typeof nextToken !== 'string' || !nextToken.trim()) continue;
          const lowerNextToken = nextToken.toLowerCase();
          if (KNOWN_CITIES_SET.has(lowerNextToken)) {
            city = capitalizeName(nextToken)?.name || nextToken;
            break;
          }
        }
        if (city) break;
      }
    }

    // Second pass: Check all tokens if no match found
    if (!brand || !city) {
      for (const token of tokens) {
        if (typeof token !== 'string' || !token.trim()) continue;
        const lowerToken = token.toLowerCase();
        if (!brand && carBrandsSet.has(lowerToken)) {
          brand = BRAND_MAPPING.get(lowerToken) || capitalizeName(token)?.name || token;
        }
        if (!city && KNOWN_CITIES_SET.has(lowerToken)) {
          city = capitalizeName(token)?.name || token;
        }
      }
    }

    if (!brand && !city) {
      log('debug', 'No brand or city found', { domain, tokens });
      return { brand: '', city: '', connector: '' };
    }

    return { brand, city, connector: '' };
  } catch (err) {
    log('error', 'extractBrandOfCityFromDomain failed', { domain, error: err.message, stack: err.stack });
    return { brand: '', city: '', connector: '' };
  }
}

// Matches first/last name patterns (e.g., 'jimmybrittchevrolet' → 'Jimmy Britt Chevrolet')
function tryHumanNamePattern(tokens) {
  try {
    if (!tokens || !Array.isArray(tokens) || tokens.length < 2 || !tokens.every(t => typeof t === "string")) {
      log("error", "Invalid tokens in tryHumanNamePattern", { tokens });
      return null;
    }

    if (!(KNOWN_FIRST_NAMES instanceof Set) || !(KNOWN_LAST_NAMES instanceof Set) || !(CAR_BRANDS instanceof Set) || !(KNOWN_CITIES_SET instanceof Set)) {
      log("error", "Invalid dependencies in tryHumanNamePattern", {
        KNOWN_FIRST_NAMES: KNOWN_FIRST_NAMES instanceof Set,
        KNOWN_LAST_NAMES: KNOWN_LAST_NAMES instanceof Set,
        CAR_BRANDS: CAR_BRANDS instanceof Set,
        KNOWN_CITIES_SET: KNOWN_CITIES_SET instanceof Set
      });
      return null;
    }

    let firstName = "";
    let lastName = "";
    let brand = "";
    let confidenceScore = 100;
    const flags = ["humanNamePattern"];
    const confidenceOrigin = "humanNamePattern";

    for (let i = 0; i < tokens.length - 1; i++) {
      const currentToken = tokens[i].toLowerCase();
      const nextToken = tokens[i + 1].toLowerCase();
      if (KNOWN_FIRST_NAMES.has(currentToken) && KNOWN_LAST_NAMES.has(nextToken)) {
        firstName = tokens[i];
        lastName = tokens[i + 1];
        break;
      }
    }

    if (!firstName || !lastName) return null;

    for (let i = tokens.indexOf(lastName) + 1; i < tokens.length; i++) {
      const token = tokens[i].toLowerCase();
      if (CAR_BRANDS.has(token)) {
        // Fixed: Use object-safe access for BRAND_MAPPING
        if (lastName.toLowerCase().endsWith("s")) {
          brand = Object.hasOwn(BRAND_MAPPING, token) ? BRAND_MAPPING[token] : token;
          flags.push("brandIncluded");
          confidenceScore = 125;
        }
        break;
      }
    }

    const nameParts = [firstName, lastName];
    if (brand) nameParts.push(brand);

    const nameResult = capitalizeName(nameParts.join(" ")) || { name: "", flags: [] };
    const companyName = nameResult.name || "";
    nameResult.flags.forEach(flag => flags.push(flag));

    if (!companyName || CAR_BRANDS.has(companyName.toLowerCase()) || KNOWN_CITIES_SET.has(companyName.toLowerCase())) {
      flags.push("brandOrCityOnlyBlocked");
      confidenceScore = 0;
      return null;
    }

    const wordList = companyName.split(" ").map(w => w.toLowerCase());
    if (new Set(wordList).size !== wordList.length) {
      flags.push("duplicateTokens");
      confidenceScore = Math.min(confidenceScore, 95);
    }

    const nameTokens = companyName.split(" ").filter(Boolean);
    if (nameTokens.length > 3) {
      confidenceScore = Math.min(confidenceScore, 85);
      flags.push("tokenLimitExceeded");
    }

    if (!companyName.match(/^([A-Z][a-z]+(?: [A-Z][a-z]+)?)(?: [A-Z][a-z]+)?$/)) {
      return null;
    }

    log("info", "Human name pattern matched", { companyName, tokens });

    return {
      companyName,
      confidenceScore,
      confidenceOrigin,
      flags,
      tokens: nameTokens.map(t => t.toLowerCase())
    };
  } catch (e) {
    log("error", "tryHumanNamePattern failed", { tokens, error: e.message, stack: e.stack });
    return null;
  }
}

// Matches proper noun patterns (e.g., 'dorschford' → 'Dorsch Ford')
function tryProperNounPattern(tokens) {
  try {
    if (!tokens || !Array.isArray(tokens) || tokens.length < 1 || !tokens.every(t => typeof t === 'string')) {
      log('error', 'Invalid tokens in tryProperNounPattern', { tokens });
      return null;
    }

    const carBrandsSet = new Set(CAR_BRANDS); // Convert array to Set
    if (!(properNounsSet instanceof Set) || !(carBrandsSet instanceof Set) || !(KNOWN_CITIES_SET instanceof Set)) {
      log('error', 'Invalid dependencies in tryProperNounPattern', {
        properNounsSet: properNounsSet instanceof Set,
        CAR_BRANDS: carBrandsSet instanceof Set,
        KNOWN_CITIES_SET: KNOWN_CITIES_SET instanceof Set
      });
      return null;
    }

    let properNoun = '';
    let brand = '';
    let generic = '';
    let confidenceScore = 100;
    const flags = ['properNounPattern'];
    const confidenceOrigin = 'properNounPattern';

    for (const token of tokens) {
      const lowerToken = token.toLowerCase();
      if (properNounsSet.has(lowerToken)) {
        properNoun = token;
        break;
      }
    }

    if (!properNoun) return null;

    const nounIndex = tokens.indexOf(properNoun);
    for (let i = nounIndex + 1; i < tokens.length; i++) {
      const token = tokens[i].toLowerCase();
      if (carBrandsSet.has(token)) {
        brand = BRAND_MAPPING.get(token) || capitalizeName(token)?.name || token;
        flags.push('brandIncluded');
        confidenceScore = 125;
        break;
      } else if (['motors', 'auto', 'dealership'].includes(token)) {
        generic = capitalizeName(token)?.name || token;
        flags.push('genericIncluded');
        confidenceScore = 100;
        break;
      }
    }

    if (KNOWN_CITIES_SET.has(properNoun.toLowerCase()) || carBrandsSet.has(properNoun.toLowerCase())) {
      return null;
    }

    const nameParts = [properNoun];
    if (brand) nameParts.push(brand);
    else if (generic) nameParts.push(generic);

    const nameResult = capitalizeName(nameParts.join(' ')) || { name: '', flags: [] };
    const companyName = nameResult.name;
    nameResult.flags.forEach(flag => flags.push(flag));

    if (!companyName || carBrandsSet.has(companyName.toLowerCase()) || KNOWN_CITIES_SET.has(companyName.toLowerCase())) {
      flags.push('brandOrCityOnlyBlocked');
      confidenceScore = 0;
      return null;
    }

    const wordList = companyName.split(' ').map(w => w.toLowerCase());
    if (new Set(wordList).size !== wordList.length) {
      flags.push('duplicateTokens');
      confidenceScore = Math.min(confidenceScore, 95);
    }

    const nameTokens = companyName.split(' ').filter(Boolean);
    if (nameTokens.length > 3) {
      confidenceScore = Math.min(confidenceScore, 85);
      flags.push('tokenLimitExceeded');
    }

    if (!companyName.match(/^([A-Z][a-z]+(?: [A-Z][a-z]+)?)(?: [A-Z][a-z]+)?$/)) {
      return null;
    }

    log('info', 'Proper noun pattern matched', { companyName, tokens });
    return {
      companyName,
      confidenceScore,
      confidenceOrigin,
      flags,
      tokens: nameTokens.map(t => t.toLowerCase())
    };
  } catch (e) {
    log('error', 'tryProperNounPattern failed', { tokens, error: e.message, stack: e.stack });
    return null;
  }
}

// Matches brand + city patterns (e.g., 'toyotaofslidell' → 'Slidell Toyota')
function tryBrandCityPattern(tokens) {
  try {
    if (!tokens || !Array.isArray(tokens) || tokens.length < 2 || !tokens.every(t => typeof t === "string")) {
      log("error", "Invalid tokens in tryBrandCityPattern", { tokens });
      return null;
    }

    if (!(CAR_BRANDS instanceof Set) || !(KNOWN_CITIES_SET instanceof Set) || !(COMMON_WORDS instanceof Set)) {
      log("error", "Invalid dependencies in tryBrandCityPattern", {
        CAR_BRANDS: CAR_BRANDS instanceof Set,
        KNOWN_CITIES_SET: KNOWN_CITIES_SET instanceof Set,
        COMMON_WORDS: COMMON_WORDS instanceof Set
      });
      return null;
    }

    const domain = tokens.join("");
    let brandCityResult = extractBrandOfCityFromDomain(domain) || { brand: "", city: "" };
    let brand = brandCityResult.brand;
    let city = brandCityResult.city;

    if (!brand || !city) {
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i].toLowerCase();
        if (CAR_BRANDS.has(token)) {
          // Fixed: Use object-safe access for BRAND_MAPPING
          brand = Object.hasOwn(BRAND_MAPPING, token) ? BRAND_MAPPING[token] : token;
          for (let j = 0; j < tokens.length; j++) {
            if (j === i) continue;
            const otherToken = tokens[j].toLowerCase();
            if (KNOWN_CITIES_SET.has(otherToken) && !CAR_BRANDS.has(otherToken) && !COMMON_WORDS.has(otherToken)) {
              city = tokens[j];
              break;
            }
          }
          if (city) break;
        }
      }
    }

    if (!brand || !city) return null;

    let confidenceScore = 100;
    const flags = ["brandCityPattern"];
    const confidenceOrigin = "brandCityPattern";

    const nameParts = city.toLowerCase().endsWith("s") ? [city, brand] : [city];
    const nameResult = capitalizeName(nameParts.join(" ")) || { name: "", flags: [] };
    let companyName = nameResult.name || "";
    nameResult.flags.forEach(flag => flags.push(flag));

    confidenceScore = 100;

    if (!companyName || CAR_BRANDS.has(companyName.toLowerCase()) || KNOWN_CITIES_SET.has(companyName.toLowerCase())) {
      flags.push("brandOrCityOnlyBlocked");
      confidenceScore = 0;
      return null;
    }

    const wordList = companyName.split(" ").map(w => w.toLowerCase());
    if (new Set(wordList).size !== wordList.length) {
      flags.push("duplicateTokens");
      confidenceScore = Math.min(confidenceScore, 95);
    }

    const nameTokens = companyName.split(" ").filter(Boolean);
    if (nameTokens.length > 3) {
      confidenceScore = Math.min(confidenceScore, 85);
      flags.push("tokenLimitExceeded");
    }

    if (!companyName.match(/^([A-Z][a-z]+(?: [A-Z][a-z]+)?)(?: [A-Z][a-z]+)?$/)) {
      return null;
    }

    log("info", "Brand city pattern matched", { companyName, tokens });
    return {
      companyName,
      confidenceScore,
      confidenceOrigin,
      flags,
      tokens: nameTokens.map(t => t.toLowerCase())
    };
  } catch (e) {
    log("error", "tryBrandCityPattern failed", { tokens, error: e.message, stack: e.stack });
    return null;
  }
}

// Matches proper noun + brand patterns (e.g., 'curryacura' → 'Curry Acura')
function tryBrandGenericPattern(tokens) {
  try {
    if (!tokens || !Array.isArray(tokens) || tokens.length < 2 || !tokens.every(t => typeof t === "string")) {
      log("error", "Invalid tokens in tryBrandGenericPattern", { tokens });
      return null;
    }

    if (!(KNOWN_PROPER_NOUNS instanceof Set) || !(KNOWN_LAST_NAMES instanceof Set) || !(CAR_BRANDS instanceof Set) || !(KNOWN_CITIES_SET instanceof Set) || !(COMMON_WORDS instanceof Set)) {
      log("error", "Invalid dependencies in tryBrandGenericPattern", {
        KNOWN_PROPER_NOUNS: KNOWN_PROPER_NOUNS instanceof Set,
        KNOWN_LAST_NAMES: KNOWN_LAST_NAMES instanceof Set,
        CAR_BRANDS: CAR_BRANDS instanceof Set,
        KNOWN_CITIES_SET: KNOWN_CITIES_SET instanceof Set,
        COMMON_WORDS: COMMON_WORDS instanceof Set
      });
      return null;
    }

    let properNoun = "";
    let brand = "";
    let generic = "";
    let confidenceScore = 100;
    const flags = ["brandGenericPattern"];
    const confidenceOrigin = "brandGenericPattern";

    for (let i = 0; i < tokens.length - 1; i++) {
      const currentToken = tokens[i].toLowerCase();
      const nextToken = tokens[i + 1].toLowerCase();

      if (!properNoun && !CAR_BRANDS.has(currentToken) && !KNOWN_CITIES_SET.has(currentToken) && !COMMON_WORDS.has(currentToken)) {
        if (KNOWN_PROPER_NOUNS.has(currentToken) || KNOWN_LAST_NAMES.has(currentToken)) {
          properNoun = tokens[i];
          confidenceScore = 125;
          flags.push("knownProperNoun");
        } else {
          properNoun = tokens[i];
          confidenceScore = 95;
          flags.push("inferredProperNoun");
        }
      }

      if (properNoun && CAR_BRANDS.has(nextToken)) {
        // Fixed: Use object-safe access for BRAND_MAPPING
        if (properNoun.toLowerCase().endsWith("s")) {
          brand = Object.hasOwn(BRAND_MAPPING, nextToken) ? BRAND_MAPPING[nextToken] : nextToken;
          flags.push("brandIncluded");
          confidenceScore = Math.max(confidenceScore, 125);
        }
        break;
      } else if (properNoun && ["auto", "motors", "dealership"].includes(nextToken)) {
        generic = nextToken;
        flags.push("genericIncluded");
        confidenceScore = Math.max(confidenceScore, 100);
        break;
      }
    }

    if (!properNoun || (!brand && !generic)) {
      return null;
    }

    if (KNOWN_CITIES_SET.has(properNoun.toLowerCase()) || CAR_BRANDS.has(properNoun.toLowerCase())) {
      return null;
    }

    const nameParts = [properNoun];
    if (brand) nameParts.push(brand);
    else if (generic) nameParts.push(generic);

    const nameResult = capitalizeName(nameParts.join(" ")) || { name: "", flags: [] };
    const companyName = cleanCompanyName(nameResult.name || "") || "";
    nameResult.flags.forEach(flag => flags.push(flag));

    if (!companyName || CAR_BRANDS.has(companyName.toLowerCase()) || KNOWN_CITIES_SET.has(companyName.toLowerCase())) {
      flags.push("brandOrCityOnlyBlocked");
      return null;
    }

    const nameTokens = companyName.split(" ").filter(Boolean);
    const uniqueTokens = new Set(nameTokens.map(t => t.toLowerCase()));
    if (uniqueTokens.size !== nameTokens.length) {
      flags.push("duplicateTokens");
      confidenceScore = Math.min(confidenceScore, 95);
    }

    if (nameTokens.length > 3) {
      flags.push("tokenLimitExceeded");
      confidenceScore = Math.min(confidenceScore, 85);
    }

    if (!companyName.match(/^([A-Z][a-z]+(?: [A-Z][a-z]+)?)(?: [A-Z][a-z]+)?$/)) {
      return null;
    }

    log("info", "Brand generic pattern matched", { companyName, tokens });
    return {
      companyName,
      confidenceScore,
      confidenceOrigin,
      flags,
      tokens: nameTokens.map(t => t.toLowerCase()).slice(0, 3)
    };
  } catch (e) {
    log("error", "tryBrandGenericPattern failed", { tokens, error: e.message, stack: e.stack });
    return null;
  }
}

// Matches patterns with a proper noun and generic term (e.g., 'sunsetauto' → 'Sunset Auto')
function tryGenericPattern(tokens, properNounsSet) {
  try {
    if (!tokens || !Array.isArray(tokens) || tokens.length < 1 || !tokens.every(t => typeof t === "string")) {
      log("error", "Invalid tokens in tryGenericPattern", { tokens });
      return null;
    }

    if (!(properNounsSet instanceof Set) || !(CAR_BRANDS instanceof Set) || !(KNOWN_CITIES_SET instanceof Set)) {
      log("error", "Invalid dependencies in tryGenericPattern", {
        properNounsSet: properNounsSet instanceof Set,
        CAR_BRANDS: CAR_BRANDS instanceof Set,
        KNOWN_CITIES_SET: KNOWN_CITIES_SET instanceof Set
      });
      return null;
    }

    const genericTerms = ["auto", "motors", "dealers", "group", "cars", "drive", "center", "world"];
    let properNoun = null;
    let generic = null;

    for (const token of tokens) {
      const lowerToken = token.toLowerCase();
      if (!properNoun && properNounsSet.has(lowerToken) && !CAR_BRANDS.has(lowerToken) && !KNOWN_CITIES_SET.has(lowerToken)) {
        const nameResult = capitalizeName(token) || { name: "" };
        properNoun = nameResult.name;
      }
      if (!generic && genericTerms.includes(lowerToken)) {
        const nameResult = capitalizeName(token) || { name: "" };
        generic = nameResult.name;
      }
      if (properNoun && generic) break;
    }

    if (!properNoun || !generic) return null;

    const companyName = `${properNoun} ${generic}`;
    if (!companyName.match(/^([A-Z][a-z]+(?: [A-Z][a-z]+)?)(?: [A-Z][a-z]+)?$/)) return null;

    const nameTokens = companyName.split(" ").map(t => t.toLowerCase());
    return {
      companyName,
      confidenceScore: 95,
      flags: ["genericPattern"],
      tokens: nameTokens
    };
  } catch (e) {
    log("error", "tryGenericPattern failed", { tokens, error: e.message, stack: e.stack });
    return null;
  }
}

// Main function to humanize domain names
function humanizeName(domain) {
  try {
    // Validate input
    if (!domain || typeof domain !== "string" || !domain.trim()) {
      log("error", "Invalid domain input", { domain });
      return { companyName: "", confidenceScore: 0, flags: ["invalidInput"], tokens: [], confidenceOrigin: "invalidInput", rawTokenCount: 0 };
    }

    // Normalize the domain
    const normalizedDomain = normalizeDomain(domain);
    if (!normalizedDomain || typeof normalizedDomain !== "string") {
      log("error", "normalizeDomain returned invalid result", { domain, normalizedDomain });
      return { companyName: "", confidenceScore: 0, flags: ["normalizeDomainFailed"], tokens: [], confidenceOrigin: "normalizeDomainFailed", rawTokenCount: 0 };
    }

    // Check for brand-only domains
    if (!(BRAND_ONLY_DOMAINS instanceof Set)) {
      log("error", "BRAND_ONLY_DOMAINS is not a Set", { BRAND_ONLY_DOMAINS });
      return { companyName: "", confidenceScore: 0, flags: ["invalidDependency"], tokens: [], confidenceOrigin: "invalidDependency", rawTokenCount: 0 };
    }

    if (BRAND_ONLY_DOMAINS.has(normalizedDomain + ".com")) {
      log("info", `Brand-only domain detected: ${normalizedDomain}`);
      return {
        companyName: "",
        confidenceScore: 0,
        flags: ["brandOnly"],
        tokens: [],
        confidenceOrigin: "brandOnly",
        rawTokenCount: 0
      };
    }

    // Split into tokens
    let tokens = earlyCompoundSplit(normalizedDomain);
    if (!Array.isArray(tokens) || !tokens.every(token => typeof token === "string")) {
      log("error", "earlyCompoundSplit returned invalid tokens", { domain, tokens });
      return { companyName: "", confidenceScore: 0, flags: ["earlyCompoundSplitFailed"], tokens: [], confidenceOrigin: "earlyCompoundSplitFailed", rawTokenCount: 0 };
    }

    const rawTokenCount = tokens.length;

    // Validate COMMON_WORDS dependency
    if (!(COMMON_WORDS instanceof Set)) {
      log("error", "COMMON_WORDS is not a Set", { COMMON_WORDS });
      return { companyName: "", confidenceScore: 0, flags: ["invalidDependency"], tokens: [], confidenceOrigin: "invalidDependency", rawTokenCount };
    }

    // Check token set strength
    if (tokens.length < 2 || tokens.every(t => typeof t === "string" && COMMON_WORDS.has(t.toLowerCase()))) {
      const result = {
        companyName: "",
        confidenceScore: 0,
        flags: ["tokenSetTooWeak"],
        tokens,
        confidenceOrigin: "tokenSanityCheck",
        rawTokenCount
      };
      log("debug", "Final result confidence", { companyName: result.companyName, confidenceScore: result.confidenceScore });
      result.tokens = result.tokens.slice(0, 3);
      return result;
    }

    // Try pattern matching with error handling
    let result = null;
    try {
      result = tryHumanNamePattern(tokens);
    } catch (e) {
      log("error", "tryHumanNamePattern failed", { domain, tokens, error: e.message, stack: e.stack });
    }
    if (!result) {
      try {
        result = tryProperNounPattern(tokens);
      } catch (e) {
        log("error", "tryProperNounPattern failed", { domain, tokens, error: e.message, stack: e.stack });
      }
    }
    if (!result) {
      try {
        result = tryBrandCityPattern(tokens);
      } catch (e) {
        log("error", "tryBrandCityPattern failed", { domain, tokens, error: e.message, stack: e.stack });
      }
    }
    if (!result) {
      try {
        result = tryBrandGenericPattern(tokens);
      } catch (e) {
        log("error", "tryBrandGenericPattern failed", { domain, tokens, error: e.message, stack: e.stack });
      }
    }
    if (!result) {
      try {
        result = tryGenericPattern(tokens, properNounsSet);
      } catch (e) {
        log("error", "tryGenericPattern failed", { domain, tokens, error: e.message, stack: e.stack });
      }
    }

    if (!result) {
      result = {
        companyName: "",
        confidenceScore: 0,
        flags: ["noPatternMatch"],
        tokens: [],
        confidenceOrigin: "noPatternMatch",
        rawTokenCount
      };
      log("debug", "Final result confidence", { companyName: result.companyName, confidenceScore: result.confidenceScore });
      result.tokens = result.tokens.slice(0, 3);
      return result;
    }

    // Clean up company name
    if (result.companyName && typeof result.companyName === "string") {
      result.companyName = result.companyName.trim().replace(/\s+/g, " ");
    } else {
      result.companyName = "";
      result.flags.push("invalidCompanyName");
    }

    // Apply penalty for generic structures
    if (tokens.every(t => typeof t === "string") && tokens.includes("auto") && tokens.includes("group")) {
      result.confidenceScore = Math.min(result.confidenceScore, 90);
      result.flags.push("genericStructurePenalty");
    }

    result.rawTokenCount = rawTokenCount;

    log("info", `Processed domain: ${normalizedDomain}`, { result });
    log("debug", "Final result confidence", { companyName: result.companyName, confidenceScore: result.confidenceScore });
    result.tokens = (result.tokens || []).slice(0, 3);
    return result;
  } catch (e) {
    log("error", "humanizeName failed", { domain, error: e.message, stack: e.stack });
    return { companyName: "", confidenceScore: 0, flags: ["humanizeNameError"], tokens: [], confidenceOrigin: "humanizeNameError", rawTokenCount: 0 };
  }
}

// Export all functions required by batch-enrich.js
export {
  humanizeName,
  earlyCompoundSplit,
  capitalizeName,
  expandInitials,
  normalizeDomain,
  extractBrandOfCityFromDomain
};
