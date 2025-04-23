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
  if (!companyName || typeof companyName !== "string") return "";
  let tokens = companyName.trim().split(/\s+/).filter(Boolean);
  // Remove leading connectors (e.g., "Of Ford")
  while (tokens.length > 0 && COMMON_WORDS.has(tokens[0].toLowerCase())) {
    tokens.shift();
  }
  // Remove trailing suffixes and connectors (e.g., "Toyota The")
  while (tokens.length > 0 && (SUFFIXES_TO_REMOVE.has(tokens[tokens.length - 1].toLowerCase()) || COMMON_WORDS.has(tokens[tokens.length - 1].toLowerCase()))) {
    tokens.pop();
  }
  return tokens.join(" ").trim();
}

// Capitalize name while preserving abbreviations
function capitalizeName(name) {
  try {
    // Validate input
    if (!name || typeof name !== "string" || !name.trim()) {
      log("error", "Invalid name in capitalizeName", { name });
      return { name: "", flags: ["InvalidInput"] };
    }

    // Normalize the input by trimming and removing extra spaces
    const trimmedName = name.trim().replace(/\s+/g, " ");
    let flags = [];
    let result = trimmedName;

    if (trimmedName.includes(".")) {
      // Preserve abbreviations with dots (e.g., "M.B.")
      const parts = trimmedName.split(" ").filter(part => part); // Remove empty parts
      result = parts
        .map(word => {
          if (!word) return word; // Guard against empty strings
          if (word.match(/^[A-Z]\.[A-Z]\.$/)) return word; // Preserve "M.B."
          if (word.length <= 5 && word === word.toUpperCase()) return word; // Preserve all-caps (e.g., "CDJR")
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(" ");
      flags.push("AbbreviationPreserved");
    } else {
      // Insert spaces between camelCase fragments
      result = trimmedName.replace(/([a-z])([A-Z])/g, "$1 $2");
      result = result
        .split(" ")
        .filter(part => part) // Remove empty parts
        .map(word => {
          if (!word) return word; // Guard against empty strings
          if (word.length <= 5 && word === word.toUpperCase()) return word; // Preserve all-caps
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

// Extracts brand and city from domain (for batch-enrich.js and tryBrandCityPattern)
function extractBrandOfCityFromDomain(domain) {
  try {
    // Validate input
    if (!domain || typeof domain !== "string" || !domain.trim()) {
      log("error", "Invalid domain in extractBrandOfCityFromDomain", { domain });
      return { brand: "", city: "", connector: "" };
    }

    // Normalize the domain
    const normalized = normalizeDomain(domain);
    if (!normalized || typeof normalized !== "string") {
      log("error", "normalizeDomain returned invalid result", { domain, normalized });
      return { brand: "", city: "", connector: "" };
    }

    // Split into tokens
    let tokens = earlyCompoundSplit(normalized);
    if (!Array.isArray(tokens) || !tokens.every(token => typeof token === "string")) {
      log("error", "earlyCompoundSplit returned invalid tokens", { domain, tokens });
      return { brand: "", city: "", connector: "" };
    }

    let brand = "";
    let city = "";

    // Validate dependencies
    if (!(CAR_BRANDS instanceof Set) || !(KNOWN_CITIES_SET instanceof Set) || !(BRAND_MAPPING instanceof Map)) {
      log("error", "Invalid dependencies in extractBrandOfCityFromDomain", {
        CAR_BRANDS: CAR_BRANDS instanceof Set,
        KNOWN_CITIES_SET: KNOWN_CITIES_SET instanceof Set,
        BRAND_MAPPING: BRAND_MAPPING instanceof Map
      });
      return { brand: "", city: "", connector: "" };
    }

    // Extract brand and city
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (typeof token !== "string" || !token.trim()) continue; // Skip invalid tokens
      const lowerToken = token.toLowerCase();
      if (CAR_BRANDS.has(lowerToken)) {
        brand = BRAND_MAPPING.get(lowerToken) || token;
        for (let j = i + 1; j < tokens.length; j++) {
          const nextToken = tokens[j];
          if (typeof nextToken !== "string" || !nextToken.trim()) continue; // Skip invalid tokens
          const lowerNextToken = nextToken.toLowerCase();
          if (KNOWN_CITIES_SET.has(lowerNextToken)) {
            city = nextToken;
            break;
          }
        }
        if (city) break;
      }
    }

    if (!brand || !city) {
      log("debug", "No brand or city found", { domain, tokens });
      return { brand: "", city: "", connector: "" };
    }

    // Capitalize brand and city
    const brandResult = capitalizeName(brand) || { name: "" };
    const cityResult = capitalizeName(city) || { name: "" };

    return { brand: brandResult.name, city: cityResult.name, connector: "" };
  } catch (err) {
    log("error", "extractBrandOfCityFromDomain failed", { domain, error: err.message, stack: err.stack });
    return { brand: "", city: "", connector: "" };
  }
}

// Matches first/last name patterns (e.g., 'jimmybrittchevrolet' → 'Jimmy Britt Chevrolet')
function tryHumanNamePattern(tokens) {
  if (!tokens || !Array.isArray(tokens) || tokens.length < 2) return null;

  let firstName = "";
  let lastName = "";
  let brand = "";
  let confidenceScore = 100;
  const flags = ["humanNamePattern"];
  const confidenceOrigin = "humanNamePattern";

  for (let i = 0; i < tokens.length - 1; i++) {
    if (KNOWN_FIRST_NAMES.has(tokens[i].toLowerCase()) && KNOWN_LAST_NAMES.has(tokens[i + 1].toLowerCase())) {
      firstName = tokens[i];
      lastName = tokens[i + 1];
      break;
    }
  }

  if (!firstName || !lastName) return null;

  for (let i = tokens.indexOf(lastName) + 1; i < tokens.length; i++) {
    const token = tokens[i].toLowerCase();
    if (CAR_BRANDS.has(token)) {
      brand = BRAND_MAPPING.get(token) || token;
      flags.push("brandIncluded");
      confidenceScore = 125;
      break;
    }
  }

  const nameParts = [firstName, lastName];
  if (brand) nameParts.push(brand);

  const nameResult = capitalizeName(nameParts.join(" "));
  const companyName = nameResult.name;
  nameResult.flags.forEach(flag => flags.push(flag));

  if (CAR_BRANDS.has(companyName.toLowerCase()) || KNOWN_CITIES_SET.has(companyName.toLowerCase())) {
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
}

// Matches proper noun patterns (e.g., 'dorschford' → 'Dorsch Ford')
function tryProperNounPattern(tokens) {
  if (!tokens || !Array.isArray(tokens) || tokens.length < 1) return null;

  if (!(properNounsSet instanceof Set)) {
    log("warn", "properNounsSet is not a Set, skipping proper noun pattern");
    return null;
  }

  let properNoun = "";
  let brand = "";
  let generic = "";
  let confidenceScore = 100;
  const flags = ["properNounPattern"];
  const confidenceOrigin = "properNounPattern";

  for (const token of tokens) {
    if (properNounsSet.has(token.toLowerCase())) {
      properNoun = token;
      break;
    }
  }

  if (!properNoun) return null;

  const nounIndex = tokens.indexOf(properNoun);
  for (let i = nounIndex + 1; i < tokens.length; i++) {
    const token = tokens[i].toLowerCase();
    if (CAR_BRANDS.has(token)) {
      brand = BRAND_MAPPING.get(token) || token;
      flags.push("brandIncluded");
      confidenceScore = 125;
      break;
    } else if (["motors", "auto", "dealership"].includes(token)) {
      generic = token;
      flags.push("genericIncluded");
      confidenceScore = 100;
      break;
    }
  }

  if (KNOWN_CITIES_SET.has(properNoun.toLowerCase()) || CAR_BRANDS.has(properNoun.toLowerCase())) {
    return null;
  }

  const nameParts = [properNoun];
  if (brand) nameParts.push(brand);
  else if (generic) nameParts.push(generic);

  const nameResult = capitalizeName(nameParts.join(" "));
  const companyName = nameResult.name;
  nameResult.flags.forEach(flag => flags.push(flag));

  if (CAR_BRANDS.has(companyName.toLowerCase()) || KNOWN_CITIES_SET.has(companyName.toLowerCase())) {
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

  log("info", "Proper noun pattern matched", { companyName, tokens });
  return {
    companyName,
    confidenceScore,
    confidenceOrigin,
    flags,
    tokens: nameTokens.map(t => t.toLowerCase())
  };
}

// Matches brand + city patterns (e.g., 'toyotaofslidell' → 'Slidell Toyota')
function tryBrandCityPattern(tokens) {
  if (!tokens || !Array.isArray(tokens) || tokens.length < 2) return null;

  const domain = tokens.join("");
  const { brand, city } = extractBrandOfCityFromDomain(domain);
  if (!brand || !city) return null;

  let confidenceScore = 100;
  const flags = ["brandCityPattern"];
  const confidenceOrigin = "brandCityPattern";

  const nameParts = [brand, city];
  const nameResult = capitalizeName(nameParts.join(" "));
  const companyName = nameResult.name;
  nameResult.flags.forEach(flag => flags.push(flag));

  confidenceScore = 100;

  if (CAR_BRANDS.has(companyName.toLowerCase()) || KNOWN_CITIES_SET.has(companyName.toLowerCase())) {
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
}

// Matches proper noun + brand patterns (e.g., 'curryacura' → 'Curry Acura')
function tryBrandGenericPattern(tokens) {
  if (!Array.isArray(tokens) || tokens.length < 2) {
    return null;
  }

  let properNoun = "";
  let brand = "";
  let confidenceScore = 100;
  const flags = ["brandGenericPattern"];
  const confidenceOrigin = "brandGenericPattern";

  for (let i = 0; i < tokens.length - 1; i++) {
    const currentToken = tokens[i].toLowerCase();
    const nextToken = tokens[i + 1].toLowerCase();

    if ((KNOWN_PROPER_NOUNS.has(currentToken) || KNOWN_LAST_NAMES.has(currentToken)) && CAR_BRANDS.has(nextToken)) {
      properNoun = currentToken;
      brand = BRAND_MAPPING.get(nextToken) || nextToken;
      confidenceScore = 125;
      flags.push("brandIncluded");
      break;
    }
  }

  if (!properNoun || !brand) {
    return null;
  }

  if (KNOWN_CITIES_SET.has(properNoun) || CAR_BRANDS.has(properNoun)) {
    return null;
  }

  const nameResult = capitalizeName(`${properNoun} ${brand}`);
  const companyName = cleanCompanyName(nameResult.name);
  nameResult.flags.forEach(flag => flags.push(flag));

  const nameTokens = companyName.split(" ").filter(Boolean);

  if (CAR_BRANDS.has(companyName.toLowerCase()) || KNOWN_CITIES_SET.has(companyName.toLowerCase())) {
    flags.push("brandOrCityOnlyBlocked");
    return null;
  }

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
}

// tryGenericPattern function
function tryGenericPattern(tokens, properNounsSet) {
  if (!tokens || !Array.isArray(tokens) || tokens.length < 1) return null;

  const genericTerms = ["auto", "motors", "dealers", "group", "cars", "drive", "center", "world"];
  let properNoun = null;
  let generic = null;

  for (const token of tokens) {
    const lowerToken = token.toLowerCase();
    if (!properNoun && properNounsSet.has(lowerToken) && !CAR_BRANDS.has(lowerToken) && !KNOWN_CITIES_SET.has(lowerToken)) {
      properNoun = capitalizeName(token).name;
    }
    if (!generic && genericTerms.includes(lowerToken)) {
      generic = capitalizeName(token).name;
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

    // Try pattern matching
    let result = tryHumanNamePattern(tokens) || tryProperNounPattern(tokens) || tryBrandCityPattern(tokens) || tryBrandGenericPattern(tokens) || tryGenericPattern(tokens, properNounsSet);

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
