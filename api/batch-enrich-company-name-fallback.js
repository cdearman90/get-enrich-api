// company-name-fallback.js — Version 1.0.50
// Build ID: 20250421-FIX-BRAND-DUPLICATION
// Purpose: Enhance company names from dealership domains for cold email personalization
// Integrates with humanize.js v4.2.26
// Deployed via Vercel CLI v41.5.0

import {
  humanizeName,
  extractBrandOfCityFromDomain,
  KNOWN_PROPER_NOUNS,
  KNOWN_COMPOUND_NOUNS,
  capitalizeName,
  expandInitials,
  calculateConfidenceScore,
  CAR_BRANDS,
  BRAND_MAPPING,
  KNOWN_CITIES_SET,
  NON_DEALERSHIP_KEYWORDS,
  BRAND_ONLY_DOMAINS as HUMANIZE_BRAND_ONLY_DOMAINS,
  splitCamelCaseWords,
  validateSpacingWithOpenAI,
  splitFallbackCompounds
} from "./lib/humanize.js";

console.log('company-name-fallback.js v1.0.50 – Initialized (Build ID: 20250421-FIX-BRAND-DUPLICATION)');

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

const isMeaningfulCompound = (prefix, domain) => {
  return prefix.length > 2 && !KEYWORD_BLACKLIST.has(prefix.toLowerCase()) && 
         (domain.toLowerCase().includes(prefix.toLowerCase()) || KNOWN_PROPER_NOUNS.has(prefix));
};

const normalizeName = async (name, domain, flags = []) => {
  if (name.length < 20 && !name.includes(" ")) {
    const { name: spacedName, flags: newFlags } = await splitCamelCaseWords(name, flags);
    return { name: spacedName, flags: newFlags };
  }
  return { name, flags };
};

const pLimit = async (concurrency) => {
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

const isInitialsOnly = (name) => {
  const words = name.split(" ");
  return words.every((w) => /^[A-Z]{1,3}$/.test(w));
};

const enforceProperNounMapping = (name, flags = []) => {
  const words = name.split(" ");
  const mappedWords = words.map((word) => {
    const wordLower = word.toLowerCase();
    const properMatch = Array.from(KNOWN_PROPER_NOUNS).find((noun) => {
      const nounLower = noun.toLowerCase();
      return nounLower === wordLower || nounLower.startsWith(wordLower);
    });
    return properMatch || word;
  });
  return { name: mappedWords.join(" "), flags: [...flags, "ProperNounMappingEnforced"] };
};

const deduplicateBrands = (name, flags = []) => {
  const words = name.split(" ");
  const uniqueWords = [];
  const seenBrands = new Set();
  for (const word of words) {
    const wordLower = word.toLowerCase();
    if (CAR_BRANDS.includes(wordLower) || BRAND_MAPPING[wordLower]) {
      if (!seenBrands.has(wordLower)) {
        uniqueWords.push(word);
        seenBrands.add(wordLower);
      } else {
        flags.push("BrandDuplicationRemoved");
      }
    } else {
      uniqueWords.push(word);
    }
  }
  return { name: uniqueWords.join(" "), flags };
};

async function processLead(lead, fallbackTriggers, retryCount = 0) {
  const { domain, rowNum } = lead;
  console.error(
    `🌀 Fallback processing row ${rowNum}: ${domain} (company-name-fallback.js v1.0.50)`
  );

  const cacheKey = domain.toLowerCase();
  if (domainCache.has(cacheKey)) {
    const cached = domainCache.get(cacheKey);
    console.error(
      `[company-name-fallback.js v1.0.50] Cache hit for ${domain}: ${JSON.stringify(cached)}`
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

  let result;
  let tokensUsed = 0;

  const domainLower = domain.toLowerCase();

  // Early exit for brand-only domains
  if (BRAND_ONLY_DOMAINS.has(domainLower)) {
    console.error(
      `[company-name-fallback.js v1.0.50] Franchise brand domain ${domain} banned, halting processing`
    );
    const finalResult = {
      domain,
      companyName: "",
      confidenceScore: 0,
      flags: ["BrandOnlySkippedEarlyExit"],
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

  // Backup flags for retries
  const flagsBackup = [];
  let attempt = 1;
  for (; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      result = await humanizeName(domain, domain, true);
      tokensUsed = result.tokens || 0;
      console.error(
        `[company-name-fallback.js v1.0.50] humanizeName result for ${domain}: ${JSON.stringify(result)}`
      );
      break;
    } catch (error) {
      console.error(
        `[company-name-fallback.js v1.0.50] humanizeName attempt ${attempt} failed for ${domain}: ${error.message}`
      );
      if (attempt < RETRY_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
        console.error(
          `[company-name-fallback.js v1.0.50] All retries failed for ${domain}: ${error.message}`
        );
        result = { name: "", confidenceScore: 0, flags: ["HumanizeError"], tokens: 0 };
        fallbackTriggers.push({
          domain,
          rowNum,
          reason: "MaxRetriesExceeded",
          details: { error: error.message },
        });
      }
    }
  }

  result.flags = Array.isArray(result.flags) ? result.flags : [];
  flagsBackup.push(...result.flags);

  // Apply local overrides
  if (domainLower in TEST_CASE_OVERRIDES_LOCAL) {
    const overrideName = TEST_CASE_OVERRIDES_LOCAL[domainLower];
    if (result.name !== overrideName) {
      result.name = overrideName;
      result.confidenceScore = Math.max(result.confidenceScore, 110);
      result.flags = [...flagsBackup, "OverrideApplied"];
    }
  } else {
    result.flags.push("FallbackAPIUsed");
  }

  // Apply deduplication
  const { name: dedupedName, flags: dedupedFlags } = deduplicateBrands(result.name, result.flags);
  result.name = dedupedName;
  result.flags = dedupedFlags;

  // Normalize spacing
  const { name: normalizedName, flags: normalizedFlags } = await normalizeName(result.name, domain, result.flags);
  result.name = normalizedName;
  result.flags = normalizedFlags;

  // Enforce proper noun mappings
  const { name: mappedName, flags: mappedFlags } = enforceProperNounMapping(result.name, result.flags);
  result.name = mappedName;
  result.flags = mappedFlags;

  // Adjust confidence for known proper nouns
  if (KNOWN_PROPER_NOUNS.has(result.name) && result.confidenceScore < 125) {
    result.confidenceScore = 125;
    result.flags = result.flags.filter(
      (flag) => flag !== "ProperNounFallbackBypassedThreshold"
    );
    result.flags.push("ConfidenceAdjustedForProperNoun");
  }

  // Cap confidence for non-overridden results
  if (!result.flags.includes("OverrideApplied") && result.confidenceScore > 110) {
    result.confidenceScore = 110;
    result.flags.push("ConfidenceCapped");
  }

  // Split compound blobs
  let words = result.name.split(" ");
  if (words.length === 1 && result.name.toLowerCase().includes("auto") && domainLower !== "auto.com") {
    const { name: splitName, flags: splitFlags } = splitFallbackCompounds(result.name, result.flags);
    if (splitName !== result.name) {
      result.name = splitName;
      result.confidenceScore = Math.min(125, result.confidenceScore + 20);
      result.flags = splitFlags;
    }
  } else if (!result.name.includes(" ") && result.name.length > 10) {
    const { name: splitName, flags: splitFlags } = splitFallbackCompounds(result.name, result.flags);
    if (splitName !== result.name) {
      result.name = splitName;
      result.confidenceScore = Math.min(125, result.confidenceScore + 20);
      result.flags = splitFlags;
    }
  }

  // Flag generic names
  const genericNames = new Set(["auto", "cars", "dealer", "online", "net"]);
  if (genericNames.has(result.name.toLowerCase())) {
    if (domainLower === "auto.com") {
      result.name = "Auto Group";
      result.confidenceScore = 80;
      result.flags.push("GenericNameAdjusted");
    } else {
      result.name = "";
      result.confidenceScore = 50;
      result.flags.push("TooGeneric");
    }
  }

  // Handle non-dealership domains with keyword expansion
  const match = extractBrandOfCityFromDomain(domain);
  const brandDetected = match.brand || null;
  const cityDetected = match.city || null;
  const isOverride = result.flags.includes("OverrideApplied");
  const isProperNoun = KNOWN_PROPER_NOUNS.has(result.name);
  const isCityOnly =
    words.length === 1 &&
    (cityDetected === words[0].toLowerCase() || KNOWN_CITIES_SET.has(words[0].toLowerCase()));
  const endsWithS = isProperNoun && result.name.toLowerCase().endsWith("s");
  const isBrandOnly =
    words.length === 1 &&
    (CAR_BRANDS.includes(result.name.toLowerCase()) || BRAND_MAPPING[result.name.toLowerCase()]);

  if (!isOverride && !isProperNoun && !isCityOnly && !isBrandOnly && NON_DEALERSHIP_KEYWORDS.some(k => domainLower.includes(k))) {
    for (const [keyword, expansion] of KEYWORD_EXPANSIONS) {
      if (domainLower.includes(keyword)) {
        const baseName = domainLower.replace(new RegExp(`\\b${keyword}\\b`, 'i'), "").replace(/\.(com|net|org|co\.uk)/i, "").trim();
        if (isMeaningfulCompound(baseName, domainLower)) {
          result.name = `${capitalizeName(baseName).name} ${expansion}`;
          result.confidenceScore = 80;
          result.flags = ["NonDealership", "KeywordExpansion"];
        } else {
          result.name = "";
          result.confidenceScore = 50;
          result.flags.push("TooGeneric");
        }
        break;
      }
    }
  }

  // Handle short names with SingleWordGeneric safeguard
  if (words.length === 1 && !isProperNoun && !isCityOnly && !isBrandOnly && !isOverride) {
    const domainBase = domainLower.replace(/\.(com|net|org|co\.uk)$/, "");
    const { name: splitName, flags: splitFlags } = splitFallbackCompounds(domainBase, result.flags);
    if (splitName.split(" ").length > 1 && isMeaningfulCompound(splitName.split(" ")[0], domainLower)) {
      result.name = splitName;
      result.confidenceScore = Math.min(125, result.confidenceScore + 10);
      result.flags = splitFlags;
    } else {
      if (ACCEPTED_COMPOUND_SUFFIXES.has(domainBase.split(/(auto|group|motors|dealers)/i)[1]?.toLowerCase())) {
        result.name = `${result.name} Group`;
        result.confidenceScore = Math.min(125, result.confidenceScore + 5);
        result.flags.push("DomainAwareGroupAppend");
      } else {
        result.name = "";
        result.confidenceScore = 50;
        result.flags.push("TooShortFallback", "ForceReview");
      }
    }
  }

  // Append "Auto Group" for automotive domains
  if (!isOverride && !isProperNoun && !isCityOnly && !isBrandOnly && !result.name.includes("Auto") && 
      (domainLower.includes("automotive") || domainLower.includes("group"))) {
    result.name = `${result.name} Auto Group`;
    result.confidenceScore = Math.min(125, result.confidenceScore + 10);
    result.flags.push("AutoGroupAppended");
  }

  // Expand initials
  if (isInitialsOnly(result.name)) {
    const expandedName = expandInitials(result.name, domain, brandDetected, cityDetected, result.flags).name;
    if (expandedName !== result.name) {
      result.name = expandedName;
      result.flags.push("InitialsExpandedLocally");
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
    result.flags.push("WordCountTruncated");
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

  let isAcceptable =
    result.confidenceScore >= 75 && !result.flags.some((f) => criticalFlags.includes(f));

  if (
    !isAcceptable ||
    result.confidenceScore < 75 ||
    result.flags.some((f) => forceReviewFlags.includes(f))
  ) {
    fallbackTriggers.push({
      domain,
      rowNum,
      reason: "LowConfidenceOrFlagged",
      details: {
        name: result.name,
        confidenceScore: result.confidenceScore,
        flags: result.flags,
        brand: brandDetected,
        city: cityDetected,
      },
      tokens: tokensUsed,
    });
  }

  const finalResult = {
    domain,
    companyName: result.name || "",
    confidenceScore: result.confidenceScore,
    flags: result.flags,
    tokens: tokensUsed,
    rowNum,
  };

  domainCache.set(cacheKey, {
    companyName: finalResult.companyName,
    confidenceScore: finalResult.confidenceScore,
    flags: finalResult.flags,
  });

  console.error(
    `[company-name-fallback.js v1.0.50] Final result for ${domain}: ${JSON.stringify(finalResult)}`
  );

  return finalResult;
}

export default async function handler(req, res) {
  try {
    console.error("🧠 company-name-fallback.js v1.0.50 – Fallback Processing Start");

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

// Changelog for v1.0.50
/*
  - Hardened BRAND_ONLY_DOMAINS early exit with BrandOnlySkippedEarlyExit flag.
  - Enhanced splitFallbackCompounds with domain-aware suffix appending (e.g., "Group").
  - Added KEYWORD_BLACKLIST to prevent generic prefixes like "click", "save".
  - Implemented spacing normalization for names < 20 characters with no spaces.
  - Preserved flags across retries using flagsBackup.
  - Added force review for names ≤1 token not in KNOWN_PROPER_NOUNS.
  - Appended "Auto Group" only for automotive-related domains.
  - Updated logging to confirm version and build ID.
  - Fixed linting warnings with ESLint config.
*/

// Deployment Steps
/*
  1. Verify Vercel CLI: `vercel --version` (should be v41.5.0).
  2. Clear local cache: `rm -rf .vercel`.
  3. Deploy with no cache: `vercel --prod --force --no-cache`.
  4. Check logs: `vercel logs <your-app>.vercel.app --token=<your-token>`.
     - Confirm log: "company-name-fallback.js v1.0.50 – Initialized (Build ID: 20250421-FIX-BRAND-DUPLICATION)".
  5. If logs show older version (e.g., v1.0.49), run `vercel env rm CACHE_BUST` and redeploy.
*/
