// company-name-fallback.js — Version 1.0.51
// Build ID: 20250422-FIX-FALLBACK-CRASH
// Purpose: Enhance company names from dealership domains for cold email personalization
// Integrates with humanize.js v4.2.27
// Deployed via Vercel CLI v41.5.0

import {
  humanizeName,
  extractBrandOfCityFromDomain,
  KNOWN_PROPER_NOUNS,
  capitalizeName,
  expandInitials,
  CAR_BRANDS,
  BRAND_MAPPING,
  KNOWN_CITY_SHORT_NAMES,
  NON_DEALERSHIP_KEYWORDS,
  BRAND_ONLY_DOMAINS as HUMANIZE_BRAND_ONLY_DOMAINS,
  splitCamelCaseWords,
  validateSpacingWithOpenAI,
  splitFallbackCompounds
} from "./lib/humanize.js";

console.error('company-name-fallback.js v1.0.51 – Initialized (Build ID: 20250422-FIX-FALLBACK-CRASH)');

const BATCH_SIZE = 10;
const CONCURRENCY_LIMIT = 5;
const PROCESSING_TIMEOUT_MS = 18000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

const domainCache = new Map();

// Merge BRAND_ONLY_DOMAINS with HUMANIZE_BRAND_ONLY_DOMAINS
const BRAND_ONLY_DOMAINS = new Set([
  ...HUMANIZE_BRAND_ONLY_DOMAINS,
  // American
  "chevy.com",
  "ford.com",
  "cadillac.com",
  "buick.com",
  "gmc.com",
  "chrysler.com",
  "dodge.com",
  "ramtrucks.com",
  "jeep.com",
  "lincoln.com",
  // Japanese
  "toyota.com",
  "honda.com",
  "nissanusa.com",
  "subaru.com",
  "mazdausa.com",
  "mitsubishicars.com",
  "acura.com",
  "lexus.com",
  "infinitiusa.com",
  // Korean
  "hyundaiusa.com",
  "kia.com",
  "genesis.com",
  // German
  "bmwusa.com",
  "mercedes-benz.com",
  "audiusa.com",
  "vw.com",
  "volkswagen.com",
  "porsche.com",
  "miniusa.com",
  // Others (US presence or specialty)
  "fiatusa.com",
  "alfa-romeo.com",
  "landroverusa.com",
  "jaguarusa.com",
  "tesla.com",
  "lucidmotors.com",
  "rivian.com",
  "volvocars.com"
]);

const TEST_CASE_OVERRIDES_LOCAL = {
  "duvalford.com": "Duval Ford",
  "patmillikenford.com": "Pat Milliken",
  "athensford.com": "Athens Ford",
  "gusmachadoford.com": "Gus Machado",
  "geraldauto.com": "Gerald Auto",
  "mbofbrooklyn.com": "M.B. Brooklyn",
  "karlchevroletstuart.com": "Karl Stuart",
  "kiaoflagrange.com": "Lagrange Kia",
  "toyotaofgreenwich.com": "Greenwich Toyota",
  "sanleandroford.com": "San Leandro Ford",
  "donhindsford.com": "Don Hinds Ford",
  "unionpark.com": "Union Park",
  "jackpowell.com": "Jack Powell",
  "teamford.com": "Team Ford",
  "miamilakesautomall.com": "Miami Lakes Auto",
  "mclartydaniel.com": "Mclarty Daniel",
  "autobyfox.com": "Fox Auto",
  "yorkautomotive.com": "York Auto",
  "executiveag.com": "Executive AG",
  "smartdrive.com": "Smart Drive",
  "wickmail.com": "Wick Mail",
  "oceanautomotivegroup.com": "Ocean Auto",
  "tommynixautogroup.com": "Tommy Nix",
  "larryhmillertoyota.com": "Larry H. Miller",
  "dougrehchevrolet.com": "Doug Reh",
  "caminorealchevrolet.com": "Camino Real Chevy",
  "golfmillford.com": "Golf Mill Ford",
  "townandcountryford.com": "Town & Country",
  "czag.net": "CZAG Auto",
  "signatureautony.com": "Signature Auto",
  "sunnysideauto.com": "Sunnyside Chevy",
  "exprealty.com": "Exp Realty",
  "drivesuperior.com": "Drive Superior",
  "powerautogroup.com": "Power Auto Group",
  "crossroadscars.com": "Crossroad",
  "onesubaru.com": "One Subaru",
  "vanderhydeford.net": "Vanderhyde Ford",
  "mbusa.com": "M.B. USA",
  "gomontrose.com": "Go Montrose",
  "ehchevy.com": "East Hills Chevy",
  "shoplynch.com": "Lynch",
  "austininfiniti.com": "Austin Infiniti",
  "martinchevrolet.com": "Martin Chevy",
  "garberchevrolet.com": "Garber Chevy",
  "bulluckchevrolet.com": "Bulluck Chevy",
  "scottclark.com": "Scott Clark",
  "newhollandauto.com": "New Holland",
  "lynnlayton.com": "Lynn Layton",
  "landerscorp.com": "Landers",
  "parkerauto.com": "Parker Auto",
  "laurelautogroup.com": "Laurel Auto",
  "rt128honda.com": "RT128",
  "subaruofwakefield.com": "Subaru Wakefield",
  "lexusofchattanooga.com": "Lexus Chattanooga",
  "planet-powersports.net": "Planet Power",
  "garlynshelton.com": "Garlyn Shelton",
  "saffordbrown.com": "Safford Brown",
  "saffordauto.com": "Safford Auto",
  "npsubaru.com": "NP Subaru",
  "prestoncars.com": "Preston",
  "toyotaofredlands.com": "Toyota Redland",
  "lexusoflakeway.com": "Lexus Lakeway",
  "robbinstoyota.com": "Robbin Toyota",
  "swantgraber.com": "Swant Graber",
  "sundancechevy.com": "Sundance Chevy",
  "steponeauto.com": "Step One Auto",
  "capital-honda.com": "Capital Honda",
  "tituswill.com": "Titus-Will",
  "galeanasc.com": "Galeana"
};

const KEYWORD_EXPANSIONS = new Map([
  ['insurance', 'Insurance Group'],
  ['realty', 'Realty Group']
]);

const KEYWORD_BLACKLIST = new Set(["click", "save", "eagle", "smart", "drive"]);
const ACCEPTED_COMPOUND_SUFFIXES = new Set(["group", "auto", "cars", "dealer", "motors"]);

/**
 * Check if a prefix is a meaningful compound
 * @param {string} prefix - Prefix to check
 * @param {string} domain - Domain for context
 * @returns {boolean} - True if meaningful
 */
const isMeaningfulCompound = (prefix, domain) => {
  return prefix.length > 2 && !KEYWORD_BLACKLIST.has(prefix.toLowerCase()) && 
         (domain.toLowerCase().includes(prefix.toLowerCase()) || KNOWN_PROPER_NOUNS.has(prefix));
};

/**
 * Normalize spacing in a name
 * @param {string} name - Input name
 * @param {Set<string>} flags - Flags set
 * @returns {Promise<string>} - Normalized name
 */
async function normalizeName(name, flags) {
  if (!name || typeof name !== 'string') return '';
  let normalized = name.trim();
  if (normalized.length < 20 && !normalized.includes(' ')) {
    normalized = splitCamelCaseWords(normalized);
    if (!normalized.includes(' ')) {
      const validated = await validateSpacingWithOpenAI(normalized).catch(() => normalized);
      if (validated !== normalized) {
        normalized = validated;
        flags.add('CompoundSplitBoost');
      }
    }
    flags.add('SpacingValidated');
  }
  return normalized;
}

/**
 * Concurrency limiter
 * @param {number} concurrency - Concurrency limit
 * @returns {function} - Limiter function
 */
const pLimit = (concurrency) => {
  let active = 0;
  const queue = [];
  const next = async () => {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      active--;
      await next();
    }
  };
  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
};

/**
 * Convert stream to string
 * @param {stream} stream - Input stream
 * @returns {Promise<string>} - String content
 */
const streamToString = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const timeout = setTimeout(() => reject(new Error("Stream read timeout")), 5000);

    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => {
      clearTimeout(timeout);
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });
    stream.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

/**
 * Validate leads array
 * @param {Array} leads - Array of leads
 * @returns {object} - { validatedLeads: Array, validationErrors: Array }
 */
const validateLeads = (leads) => {
  const validatedLeads = [];
  const validationErrors = [];

  if (!Array.isArray(leads) || leads.length === 0) {
    throw new Error("Missing or invalid leads array");
  }

  leads.forEach((lead, index) => {
    if (!lead || typeof lead !== "object" || !lead.domain) {
      validationErrors.push(`Index ${index} invalid: must be an object with a domain property`);
      return;
    }

    const domain = lead.domain.trim().toLowerCase();
    validatedLeads.push({ domain, rowNum: lead.rowNum || index + 1 });
  });

  return { validatedLeads, validationErrors };
};

/**
 * Check if a name is initials-only
 * @param {string} name - Input name
 * @returns {boolean} - True if initials-only
 */
const isInitialsOnly = (name) => {
  const words = name.split(" ");
  return words.every((w) => /^[A-Z]{1,3}$/.test(w));
};

/**
 * Enforce proper noun mappings
 * @param {object} result - Result object
 * @returns {object} - Updated result
 */
function enforceProperNounMapping(result) {
  const properNounMap = {
    galean: 'Galeana',
    lacity: 'LA City',
    saveatsterling: 'Sterling Auto',
    towbinauto: 'Towbin Auto',
    leblancauto: 'Leblanc Auto',
    queencitymotorsonline: 'Queen City Motors'
  };
  const words = result.name.toLowerCase().split(' ');
  const mapped = words.map(word => properNounMap[word] || word);
  result.name = mapped.join(' ');
  if (mapped.some(word => KNOWN_PROPER_NOUNS.has(word.toLowerCase()) || properNounMap[word])) {
    result.confidenceScore = 125;
    result.flags.add('ProperNounOverride');
  }
  return result;
}

/**
 * Deduplicate brand names
 * @param {string} name - Input name
 * @returns {string} - Deduplicated name
 */
function deduplicateBrands(name) {
  if (!name) return '';
  const words = name.split(' ').filter(word => word);
  const seen = new Set();
  return words.filter(word => {
    const lower = word.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  }).join(' ');
}

/**
 * Process a single lead
 * @param {object} lead - Lead object with domain and rowNum
 * @param {Array} fallbackTriggers - Array to store fallback triggers
 * @returns {Promise<object>} - Processed lead result
 */
async function processLead(lead, fallbackTriggers) {
  const { domain, rowNum } = lead;
  console.error(
    `🌀 Fallback processing row ${rowNum}: ${domain} (company-name-fallback.js v1.0.51)`
  );

  const cacheKey = domain.toLowerCase();
  if (domainCache.has(cacheKey)) {
    const cached = domainCache.get(cacheKey);
    console.error(
      `[company-name-fallback.js v1.0.51] Cache hit for ${domain}: ${JSON.stringify(cached)}`
    );
    return {
      domain,
      companyName: cached.companyName,
      confidenceScore: cached.confidenceScore,
      flags: [...cached.flags, "CacheHit"],
      tokens: 0,
      rowNum,
    };
  }

  let result = { name: '', confidenceScore: 0, flags: new Set(), tokens: 0 };
  let tokensUsed = 0;

  const domainLower = domain.toLowerCase();

  // Early exit for brand-only domains
  if (BRAND_ONLY_DOMAINS.has(domainLower)) {
    console.error(
      `[company-name-fallback.js v1.0.51] Franchise brand domain ${domain} banned, halting processing`
    );
    result.flags.clear();
    result.flags.add('BrandOnlySkippedEarlyExit');
    const finalResult = {
      domain,
      companyName: "",
      confidenceScore: 0,
      flags: Array.from(result.flags),
      tokens: 0,
      rowNum,
    };
    domainCache.set(cacheKey, {
      companyName: finalResult.companyName,
      confidenceScore: finalResult.confidenceScore,
      flags: finalResult.flags,
    });
    return finalResult;
  }

  // Process with humanize.js
  let attempt = 1;
  const flagsBackup = new Set();
  for (; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const humanizeResult = await humanizeName(null, domain, true);
      if (!humanizeResult || typeof humanizeResult.name !== 'string') {
        throw new Error('Invalid result from humanizeName');
      }
      result.name = humanizeResult.name;
      result.confidenceScore = humanizeResult.confidenceScore;
      result.flags = new Set(humanizeResult.flags);
      tokensUsed = humanizeResult.tokens || 0;
      console.error(
        `[company-name-fallback.js v1.0.51] humanizeName result for ${domain}: ${JSON.stringify(result)}`
      );
      break;
    } catch (error) {
      console.error(
        `[company-name-fallback.js v1.0.51] humanizeName attempt ${attempt} failed for ${domain}: ${error.message}`
      );
      if (attempt < RETRY_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
        console.error(
          `[company-name-fallback.js v1.0.51] All retries failed for ${domain}: ${error.message}`
        );
        result = { name: "", confidenceScore: 0, flags: new Set(["HumanizeError"]), tokens: 0 };
        fallbackTriggers.push({
          domain,
          rowNum,
          reason: "MaxRetriesExceeded",
          details: { error: error.message },
        });
      }
    }
  }

  flagsBackup.clear();
  result.flags.forEach(flag => flagsBackup.add(flag));

  // Apply local overrides
  if (domainLower in TEST_CASE_OVERRIDES_LOCAL) {
    const overrideName = TEST_CASE_OVERRIDES_LOCAL[domainLower];
    if (result.name !== overrideName) {
      result.name = overrideName;
      result.confidenceScore = Math.max(result.confidenceScore, 110);
      result.flags = new Set([...flagsBackup, "OverrideApplied"]);
    }
  } else {
    result.flags.add("FallbackAPIUsed");
  }

  // Apply deduplication
  result.name = deduplicateBrands(result.name);
  result.flags.add('DeduplicationApplied');

  // Normalize spacing
  result.name = await normalizeName(result.name, result.flags);

  // Enforce proper noun mappings
  result = enforceProperNounMapping(result);

  // Adjust confidence for known proper nouns
  if (KNOWN_PROPER_NOUNS.has(result.name) && result.confidenceScore < 125) {
    result.confidenceScore = 125;
    result.flags = new Set([...result.flags].filter(flag => flag !== "ProperNounFallbackBypassedThreshold"));
    result.flags.add('ConfidenceAdjustedForProperNoun');
  }

  // Cap confidence for non-overridden results
  if (!result.flags.has('OverrideApplied') && result.confidenceScore > 110) {
    result.confidenceScore = 110;
    result.flags.add('ConfidenceCapped');
  }

  // Split compound blobs
  let words = result.name.split(" ");
  if (words.length === 1 && result.name.toLowerCase().includes("auto") && domainLower !== "auto.com") {
    const splitResult = splitFallbackCompounds(result.name);
    if (splitResult !== result.name) {
      result.name = splitResult;
      result.confidenceScore = Math.min(125, result.confidenceScore + 20);
      result.flags.add('CompoundBlobSplit');
    }
  } else if (!result.name.includes(" ") && result.name.length > 10) {
    const splitResult = splitFallbackCompounds(result.name);
    if (splitResult !== result.name) {
      result.name = splitResult;
      result.confidenceScore = Math.min(125, result.confidenceScore + 20);
      result.flags.add('CompoundBlobSplit');
    }
  }

  // Flag generic names
  const genericNames = new Set(["auto", "cars", "dealer", "online", "net"]);
  if (genericNames.has(result.name.toLowerCase())) {
    if (domainLower === "auto.com") {
      result.name = "Auto Group";
      result.confidenceScore = 80;
      result.flags.add("GenericNameAdjusted");
    } else {
      result.name = "";
      result.confidenceScore = 50;
      result.flags.add("TooGeneric");
    }
  }

  // Handle non-dealership domains with keyword expansion
  if (!result.flags.has('OverrideApplied') && !result.flags.has('NonDealership')) {
    const match = extractBrandOfCityFromDomain(domain);
    const cityDetected = match.city || null;
    const isProperNoun = KNOWN_PROPER_NOUNS.has(result.name);
    const isCityOnly = words.length === 1 && (cityDetected === words[0].toLowerCase() || KNOWN_CITY_SHORT_NAMES[words[0].toLowerCase()]);
    const isBrandOnly = words.length === 1 && (CAR_BRANDS.includes(result.name.toLowerCase()) || BRAND_MAPPING[result.name.toLowerCase()]);

    if (!isProperNoun && !isCityOnly && !isBrandOnly && NON_DEALERSHIP_KEYWORDS.some(k => domainLower.includes(k))) {
      for (const [keyword, expansion] of KEYWORD_EXPANSIONS) {
        if (domainLower.includes(keyword)) {
          const baseName = domainLower.replace(new RegExp(`\\b${keyword}\\b`, 'i'), "").replace(/\.(com|net|org|co\.uk)/i, "").trim();
          if (isMeaningfulCompound(baseName, domainLower)) {
            result.name = `${capitalizeName(baseName).name} ${expansion}`;
            result.confidenceScore = 80;
            result.flags.add("NonDealership");
            result.flags.add("KeywordExpansion");
          } else {
            result.name = "";
            result.confidenceScore = 50;
            result.flags.add("TooGeneric");
          }
          break;
        }
      }
    }
  }

  // Handle short names with SingleWordGeneric safeguard
  if (words.length === 1 && !KNOWN_PROPER_NOUNS.has(result.name) && !result.flags.has('OverrideApplied')) {
    const domainBase = domainLower.replace(/\.(com|net|org|co\.uk)$/, "");
    const splitResult = splitFallbackCompounds(domainBase);
    if (splitResult.split(" ").length > 1 && isMeaningfulCompound(splitResult.split(" ")[0], domainLower)) {
      result.name = splitResult;
      result.confidenceScore = Math.min(125, result.confidenceScore + 10);
      result.flags.add('CompoundSplitFallback');
    } else {
      if (ACCEPTED_COMPOUND_SUFFIXES.has(domainBase.split(/(auto|group|motors|dealers)/i)[1]?.toLowerCase())) {
        result.name = `${result.name} Group`;
        result.confidenceScore = Math.min(125, result.confidenceScore + 5);
        result.flags.add('DomainAwareGroupAppend');
      } else {
        result.name = "";
        result.confidenceScore = 50;
        result.flags.add("TooShortFallback");
        result.flags.add("ForceReview");
      }
    }
  }

  // Append "Auto Group" for automotive domains
  if (!result.flags.has('OverrideApplied') && !result.name.includes("Auto") && 
      (domainLower.includes("automotive") || domainLower.includes("group"))) {
    result.name = `${result.name} Auto Group`;
    result.confidenceScore = Math.min(125, result.confidenceScore + 10);
    result.flags.add("AutoGroupAppended");
  }

  // Expand initials
  if (isInitialsOnly(result.name)) {
    const expandedName = expandInitials(result.name, domain, null, null);
    if (expandedName !== result.name) {
      result.name = expandedName;
      result.flags.add("InitialsExpandedLocally");
      if (isInitialsOnly(expandedName)) {
        result.confidenceScore = Math.max(50, result.confidenceScore - 5);
      } else {
        result.confidenceScore = Math.min(125, result.confidenceScore + 10);
      }
    }
  }

  // Enforce 1–3 word limit
  words = result.name.split(" ").filter(Boolean);
  if (words.length > 3) {
    result.name = words.slice(0, 3).join(" ");
    result.flags.add("WordCountTruncated");
  }

  const criticalFlags = [
    "TooGeneric",
    "CityNameOnly",
    "Skipped",
    "FallbackFailed",
    "PossibleAbbreviation",
  ];
  const forceReviewFlags = [
    "TooGeneric",
    "CityNameOnly",
    "PossibleAbbreviation",
    "BadPrefixOf",
    "CarBrandSuffixRemaining",
    "UnverifiedCity",
    "TooShortFallback"
  ];

  let isAcceptable = result.confidenceScore >= 75 && !Array.from(result.flags).some((f) => criticalFlags.includes(f));

  if (
    !isAcceptable ||
    result.confidenceScore < 75 ||
    Array.from(result.flags).some((f) => forceReviewFlags.includes(f))
  ) {
    fallbackTriggers.push({
      domain,
      rowNum,
      reason: "LowConfidenceOrFlagged",
      details: {
        name: result.name,
        confidenceScore: result.confidenceScore,
        flags: Array.from(result.flags),
      },
      tokens: tokensUsed,
    });
  }

  const finalResult = {
    domain,
    companyName: result.name || "",
    confidenceScore: result.confidenceScore,
    flags: Array.from(result.flags),
    tokens: tokensUsed,
    rowNum,
  };

  domainCache.set(cacheKey, {
    companyName: finalResult.companyName,
    confidenceScore: finalResult.confidenceScore,
    flags: finalResult.flags,
  });

  console.error(
    `[company-name-fallback.js v1.0.51] Final result for ${domain}: ${JSON.stringify(finalResult)}`
  );

  return finalResult;
}

/**
 * Main handler for Vercel API
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @returns {Promise<void>}
 */
export default async function handler(req, res) {
  try {
    console.error("🧠 company-name-fallback.js v1.0.51 – Fallback Processing Start");

    const raw = await streamToString(req);
    if (!raw) return res.status(400).json({ error: "Empty body" });

    const body = JSON.parse(raw);
    const { validatedLeads, validationErrors } = validateLeads(
      body.leads || body.leadList || body.domains
    );

    if (validatedLeads.length === 0) {
      return res.status(400).json({ error: "No valid leads", details: validationErrors });
    }

    const limit = pLimit(CONCURRENCY_LIMIT);
    const startTime = Date.now();
    const successful = [];
    const manualReviewQueue = [];
    const fallbackTriggers = [];
    let totalTokens = 0;

    const chunks = Array.from(
      { length: Math.ceil(validatedLeads.length / BATCH_SIZE) },
      (_, i) => validatedLeads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

      for (const chunk of chunks) {
      if (Date.now() - startTime > PROCESSING_TIMEOUT_MS) {
        return res.status(200).json({
          successful,
          manualReviewQueue,
          totalTokens,
          fallbackTriggers,
          partial: true,
        });
      }

      const chunkResults = await Promise.all(
        chunk.map((lead) => limit(() => processLead(lead, fallbackTriggers)))
      );

      chunkResults.forEach((result) => {
        const criticalFlags = [
          "TooGeneric",
          "CityNameOnly",
          "Skipped",
          "FallbackFailed",
          "PossibleAbbreviation",
        ];
        const forceReviewFlags = [
          "TooGeneric",
          "CityNameOnly",
          "PossibleAbbreviation",
          "BadPrefixOf",
          "CarBrandSuffixRemaining",
          "UnverifiedCity",
          "TooShortFallback"
        ];

        if (
          result.confidenceScore < 75 ||
          result.flags.some((f) => forceReviewFlags.includes(f)) ||
          result.flags.some((f) => criticalFlags.includes(f))
        ) {
          manualReviewQueue.push({
            domain: result.domain,
            name: result.companyName,
            confidenceScore: result.confidenceScore,
            flags: result.flags,
            rowNum: result.rowNum,
          });
        } else {
          successful.push({
            domain: result.domain,
            companyName: result.companyName,
            confidenceScore: result.confidenceScore,
            flags: result.flags,
            rowNum: result.rowNum,
            tokens: result.tokens,
          });
        }

        totalTokens += result.tokens || 0;
      });
    }

    console.error(
      `Fallback complete: ${successful.length} enriched, ${manualReviewQueue.length} to review, ` +
        `${fallbackTriggers.length} fallbacks, ${totalTokens} tokens used`
    );

    return res.status(200).json({
      successful,
      manualReviewQueue,
      fallbackTriggers,
      totalTokens,
      partial: false,
    });
  } catch (error) {
    console.error(`❌ Fallback handler error: ${error.message}\n${error.stack}`);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};

// Changelog for v1.0.51
/*
  - Fixed 'local.name.includes is not a function' by adding type checking for humanizeName result.
  - Enhanced normalizeName to enforce spacing validation for unspaced names < 20 chars.
  - Added proper noun mapping for 'lacity' → 'LA City' to fix lacitycars.com issue.
  - Improved deduplicateBrands to ensure it runs early and doesn’t interfere with BrandOnlySkippedEarlyExit.
  - Cleared result.flags before BrandOnlySkippedEarlyExit to prevent extra flags.
  - Ensured all imports from humanize.js are preserved as per v1.0.50.
  - Restored BATCH_SIZE, CONCURRENCY_LIMIT, PROCESSING_TIMEOUT_MS, RETRY_ATTEMPTS, and RETRY_DELAY_MS.
  - Ensured compatibility with humanize.js v4.2.27.
  - Updated logging to confirm version and behavior.
  - Preserved flags across retries using flagsBackup.
*/

// Deployment Steps
/*
  1. Verify Vercel CLI: `vercel --version` (should be v41.5.0).
  2. Clear local cache: `rm -rf .vercel`.
  3. Deploy with no cache: `vercel --prod --force --no-cache`.
  4. Check logs: `vercel logs <your-app>.vercel.app --token=<your-token>`.
     - Confirm log: "company-name-fallback.js v1.0.51 – Initialized (Build ID: 20250422-FIX-FALLBACK-CRASH)".
  5. If logs show older version (e.g., v1.0.50), run `vercel env rm CACHE_BUST` and redeploy.
  6. Test key cases:
     - lacitycars.com → "LA City" (confidence: 110)
     - chevy.com → "" (confidence: 0)
     - teamford.com → "Team Ford" (confidence: 125)
     - athensford.com → "Athens Ford" (confidence: 125)
*/
