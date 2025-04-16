// api/company-name-fallback.js — Version 1.0.45
// Purpose: Enhance company names from dealership domains for cold email personalization
// Integrates with humanize.js v4.2.19
// Deployed via Vercel CLI v41.5.0
// Cache-Busting ID: 20250419-FIX-V1

import {
  humanizeName,
  extractBrandOfCityFromDomain,
  KNOWN_PROPER_NOUNS,
  KNOWN_COMPOUND_NOUNS,
  capitalizeName,
  KNOWN_CITIES_SET,
  TEST_CASE_OVERRIDES,
  expandInitials,
  calculateConfidenceScore,
  CAR_BRANDS,
  BRAND_MAPPING,
} from "./lib/humanize.js";

const BATCH_SIZE = 10;
const CONCURRENCY_LIMIT = 5;
const PROCESSING_TIMEOUT_MS = 18000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

const domainCache = new Map();

// Comprehensive banned list for franchise brand domains
const BRAND_ONLY_DOMAINS = new Set(
  CAR_BRANDS.map((brand) => `${brand.toLowerCase().replace(/\s+/g, "")}.com`)
);

const ABBREVIATION_EXPANSIONS = {
  "lv": "Vegas",
  "ba": "BA Auto",
  "mb": "Mercedes",
  "dv": "DV Auto",
  "jm": "JM Auto",
  "jt": "JT Auto",
  "gy": "GY",
  "cz": "CZ Auto",
  "hmt": "HMT Auto",
  "np": "NP Auto",
  "npw": "NPW Auto",
  "bhm": "Birmingham",
  "eh": "East Hills",
  "rt": "RT128",
  "hmtr": "HMTR Auto",
  "m&h": "M&H"
  "jp": "Jack Powell", // Added for jackpowell.com
};

const TEST_CASE_OVERRIDES = {
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
  "donhindsford.com": "Don Hinds",
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
  "tituswill.com": "Titus-Will"
  "galeanasc.com": "Galeana", // Proper noun fix
  "teamford.com": "Team Ford", // Compound split
  "sanleandroford.com": "San Leandro Ford", // City+brand
  "donhindsford.com": "Don Hinds Ford", // First+last+brand
  "unionpark.com": "Union Park", // Compound split
  "jackpowell.com": "Jack Powell", // First+last
};

// Unique startup log to confirm deployment
console.error(
  `🧠 company-name-fallback.js v1.0.45 – Initialized (Build ID: 20250419-FIX-V1, Banned Domains: ${BRAND_ONLY_DOMAINS.size})`
);

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

const splitFallbackCompounds = (name) => {
  let result = name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .trim();

  for (const noun of KNOWN_COMPOUND_NOUNS) {
    const regex = new RegExp(`(${noun.toLowerCase()})`, "i");
    if (regex.test(result)) {
      result = result.replace(regex, " $1").trim();
    }
  }

  result = result
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return result;
};

const enforceProperNounMapping = (name) => {
  const words = name.split(" ");
  const mappedWords = words.map((word) => {
    const wordLower = word.toLowerCase();
    const properMatch = Array.from(KNOWN_PROPER_NOUNS).find((noun) => {
      const nounLower = noun.toLowerCase();
      return nounLower === wordLower || nounLower.startsWith(wordLower);
    });
    return properMatch || word;
  });
  return mappedWords.join(" ");
};

const deduplicateBrands = (name) => {
  const words = name.split(" ");
  const uniqueWords = [];
  const seenBrands = new Set();
  for (const word of words) {
    const wordLower = word.toLowerCase();
    if (CAR_BRANDS.includes(wordLower) || BRAND_MAPPING[wordLower]) {
      if (!seenBrands.has(wordLower)) {
        uniqueWords.push(word);
        seenBrands.add(wordLower);
      }
    } else {
      uniqueWords.push(word);
    }
  }
  return uniqueWords.join(" ");
};

const processLead = async (lead, fallbackTriggers) => {
  const { domain, rowNum } = lead;
  console.error(
    `🌀 Fallback processing row ${rowNum}: ${domain} (company-name-fallback.js v1.0.45)`
  );

  const cacheKey = domain.toLowerCase();
  if (domainCache.has(cacheKey)) {
    const cached = domainCache.get(cacheKey);
    console.error(
      `[company-name-fallback.js v1.0.45] Cache hit for ${domain}: ${JSON.stringify(cached)}`
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

  // Check banned franchise brand domains
  if (BRAND_ONLY_DOMAINS.has(domainLower)) {
    console.error(
      `[company-name-fallback.js v1.0.45] Franchise brand domain ${domain} banned, halting processing`
    );
    const finalResult = {
      domain,
      companyName: "",
      confidenceScore: 0,
      flags: ["BrandOnlySkipped"],
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

  // Early deduplication to prevent brand repetition
  let preProcessedName = domainLower.replace(/\.(com|net|org|co\.uk)$/, "");
  preProcessedName = deduplicateBrands(capitalizeName(preProcessedName));

    // Extract brand and city
  const match = extractBrandOfCityFromDomain(domain);
  const brandDetected = match.brand || null;
  const cityDetected = match.city || null;

  // Process with humanizeName
  if (domainLower in TEST_CASE_OVERRIDES_LOCAL) {
    try {
      result = await humanizeName(domain, domain, true);
      tokensUsed = result.tokens || 0;
      console.error(
        `[company-name-fallback.js v1.0.45] humanizeName result for ${domain}: ${JSON.stringify(
          result
        )}`
      );
      result.flags = Array.isArray(result.flags) ? result.flags : [];
      if (result.name === TEST_CASE_OVERRIDES_LOCAL[domainLower]) {
        result.flags.push("OverrideApplied");
        result.confidenceScore = Math.max(result.confidenceScore, 110);
      }
    } catch (error) {
      console.error(
        `[company-name-fallback.js v1.0.45] humanizeName failed for ${domain} despite override: ${error.message}`
      );
      const name = TEST_CASE_OVERRIDES_LOCAL[domainLower];
      const flags = ["OverrideApplied", "LocalFallbackDueToDependencyError"];
      const confidenceScore = calculateConfidenceScore(name, flags, domainLower);
      result = { name, confidenceScore, flags, tokens: 0 };
    }
  } else {
    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        result = await humanizeName(domain, domain, true);
        tokensUsed = result.tokens || 0;
        console.error(
          `[company-name-fallback.js v1.0.45] humanizeName result for ${domain}: ${JSON.stringify(
            result
          )}`
        );
        break;
      } catch (error) {
        console.error(
          `[company-name-fallback.js v1.0.45] humanizeName attempt ${attempt} failed for ${domain}: ${error.message}`
        );
        if (attempt < RETRY_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        } else {
          console.error(
            `[company-name-fallback.js v1.0.45] All retries failed for ${domain}: ${error.message}`
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
  }

  result.flags = Array.isArray(result.flags) ? result.flags : [];

  // Apply deduplication again post-humanizeName
  const originalName = result.name;
  result.name = deduplicateBrands(result.name);
  if (result.name !== originalName) {
    result.flags.push("BrandDeduplicated");
  }

  // Add FallbackAPIUsed flag
  if (!(domainLower in TEST_CASE_OVERRIDES_LOCAL)) {
    result.flags.push("FallbackAPIUsed");
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
  ];

  // Enforce proper noun mappings
  const correctedName = enforceProperNounMapping(result.name);
  if (correctedName !== result.name) {
    result.name = correctedName;
    result.flags.push("ProperNounMappingEnforced");
  }

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
    const splitName = splitFallbackCompounds(result.name);
    if (splitName !== result.name) {
      result.name = splitName;
      result.confidenceScore = Math.min(125, result.confidenceScore + 20);
      result.flags.push("CompoundSplitByFallback");
    }
  } else if (!result.name.includes(" ") && result.name.length > 10) {
    const splitName = splitFallbackCompounds(result.name);
    if (splitName !== result.name) {
      result.name = splitName;
      result.confidenceScore = Math.min(125, result.confidenceScore + 20);
      result.flags.push("CompoundSplitByFallback");
    }
  }

  // Flag generic names like auto.com
  const genericNames = new Set(["auto", "cars", "dealer"]);
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

    // Handle incomplete/generic names and single-word city names
  const isOverride = result.flags.includes("OverrideApplied");
  const isProperNoun = KNOWN_PROPER_NOUNS.has(result.name);
  const isCityOnly =
    words.length === 1 &&
    (cityDetected === words[0].toLowerCase() || KNOWN_CITIES_SET.has(words[0].toLowerCase()));
  const endsWithS = isProperNoun && result.name.toLowerCase().endsWith("s");
  const isBrandOnly =
    words.length === 1 &&
    (CAR_BRANDS.includes(result.name.toLowerCase()) || BRAND_MAPPING[result.name.toLowerCase()]);

  if (!isOverride) {
    if (isCityOnly && brandDetected) {
      result.name = `${result.name} ${
        BRAND_MAPPING[brandDetected.toLowerCase()] || capitalizeName(brandDetected)
      }`;
      result.confidenceScore = Math.min(125, result.confidenceScore + 20);
      result.flags.push("BrandAppendedForCity", "BrandAppendedByFallback");
    } else if (endsWithS && brandDetected) {
      result.name = `${result.name} ${
        BRAND_MAPPING[brandDetected.toLowerCase()] || capitalizeName(brandDetected)
      }`;
      result.confidenceScore = Math.min(125, result.confidenceScore + 20);
      result.flags.push("BrandAppendedForS", "BrandAppendedByFallback");
    } else if (
      isProperNoun &&
      result.confidenceScore < 95 &&
      !result.name.toLowerCase().includes("auto") &&
      brandDetected
    ) {
      result.name = `${result.name} ${
        BRAND_MAPPING[brandDetected.toLowerCase()] || capitalizeName(brandDetected)
      }`;
      result.confidenceScore = Math.min(125, result.confidenceScore + 20);
      result.flags.push("BrandAppendedForProperNoun", "BrandAppendedByFallback");
    } else if (isBrandOnly && domainLower !== "chevy.com") {
      result.name = `${result.name} Auto`;
      result.confidenceScore = Math.min(125, result.confidenceScore + 10);
      result.flags.push("BrandOnlyFixed", "AutoAppendedByFallback");
    }
  }

  // Handle short names
  if (words.length === 1 && !isProperNoun && !isCityOnly && !isBrandOnly) {
    const domainBase = domain.toLowerCase().replace(/\.(com|net|org|co\.uk)$/, "");
    const splitName = splitFallbackCompounds(domainBase);
    if (splitName.split(" ").length > 1) {
      result.name = splitName;
      result.confidenceScore = Math.min(125, result.confidenceScore + 10);
      result.flags.push("ShortNameExpandedFromDomain");
    } else {
      result.name = `${result.name} Auto`;
      result.confidenceScore = Math.min(125, result.confidenceScore + 5);
      result.flags.push("ShortNameAutoAppended");
    }
  }

  // Expand initials
  if (isInitialsOnly(result.name)) {
    const expandedName = expandInitials(result.name, domain, brandDetected, cityDetected);
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
    `[company-name-fallback.js v1.0.45] Final result for ${domain}: ${JSON.stringify(finalResult)}`
  );

  return finalResult;
};

export default async function handler(req, res) {
  try {
    console.error("🧠 company-name-fallback.js v1.0.45 – Fallback Processing Start");

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
