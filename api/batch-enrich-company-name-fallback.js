// api/company-name-fallback.js — Version 1.0.24
import { humanizeName, extractBrandOfCityFromDomain, applyCityShortName } from "./lib/humanize.js";
import { callOpenAI } from "./lib/openai.js";

// Constants for API configuration
const BATCH_SIZE = 10;
const CONCURRENCY_LIMIT = 5;
const PROCESSING_TIMEOUT_MS = 18000;

// Known sets (for local expansion, aligned with humanize.js)
const KNOWN_CITY_SHORT_NAMES = {
  "las vegas": "Vegas", "los angeles": "LA", "new york": "NY", "new orleans": "N.O.", "miami lakes": "ML",
  "south charlotte": "SC", "huntington beach": "HB", "west springfield": "WS", "san leandro": "SL",
  "san francisco": "SF", "san diego": "SD", "fort lauderdale": "FTL", "west palm beach": "WPB",
  "palm beach gardens": "PBG", "st. louis": "STL", "st. petersburg": "St. Pete", "st. paul": "St. Paul",
  "south bend": "SB", "north las vegas": "NLV", "north charleston": "NC", "southfield": "SF",
  "college station": "CS", "lake havasu city": "LHC", "mount vernon": "MV", "port st. lucie": "PSL",
  "panama city": "PC", "fort myers": "FM", "palm coast": "PCoast", "newport news": "NN",
  "jacksonville beach": "Jax Beach", "west new york": "WNY", "elk grove": "EG", "palm springs": "PS",
  "grand prairie": "GP", "palm bay": "PB", "st. augustine": "St. Aug", "boca raton": "Boca",
  "bonita springs": "Bonita", "north miami": "N. Miami", "south miami": "S. Miami", "pompano beach": "Pompano",
  "boynton beach": "Boynton", "delray beach": "Delray", "hallandale beach": "Hallandale", "winter haven": "WH",
  "cape coral": "CC", "weston": "Weston", "north port": "NP", "port charlotte": "PC", "port orange": "PO",
  "palm harbor": "PH", "north lauderdale": "NL", "north fort myers": "NFM",
  // Fallback initials
  "west chester": "WC", "white plains": "WP", "west covina": "WC", "west hollywood": "WH",
  "east haven": "EH", "east orange": "EO", "north bergen": "NB", "north ridgeville": "NR",
  "north olmsted": "NO", "north royalton": "NR", "north huntingdon": "NH", "north augusta": "NA",
  "south gate": "SG", "south jordan": "SJ", "south ogden": "SO", "south el monte": "SEM",
  "south san francisco": "SSF", "south boston": "SB", "mount prospect": "MP", "mount pleasant": "MP",
  "mount laurel": "ML", "fort worth": "FW", "fort collins": "FC", "fort wayne": "FW", "fort smith": "FS",
  "fort pierce": "FP", "fort dodge": "FD", "fort payne": "FP", "new rochelle": "NR", "new bedford": "NB",
  "new britain": "NB", "new haven": "NH", "newark": "Newark", "newport": "Newport", "bay st. louis": "BSL",
  "union park": "Union Park"
  "las vegas": "Vegas", "los angeles": "LA", "new york": "NY", "new orleans": "N.O.", "miami lakes": "Miami Lakes",
  "south charlotte": "South Charlotte", "huntington beach": "HB", "west springfield": "West Springfield", "san leandro": "San Leandro",
  "san francisco": "SF", "san diego": "SD", "fort lauderdale": "FTL", "west palm beach": "WPB",
  "palm beach gardens": "PBG", "st. louis": "STL", "st. petersburg": "St. Pete", "st. paul": "St. Paul",
  "south bend": "South Bend", "north las vegas": "North Las Vegas", "north charleston": "North Charleston", "southfield": "Southfield",
  "college station": "College Station", "lake havasu city": "Lake Havasu City", "mount vernon": "Mount Vernon", "port st. lucie": "Port St. Lucie",
  "panama city": "Panama City", "fort myers": "Fort Myers", "palm coast": "Palm Coast", "newport news": "Newport News",
  "jacksonville beach": "Jax Beach", "west new york": "West New York", "elk grove": "Elk Grove", "palm springs": "Palm Springs",
  "grand prairie": "Grand Prairie", "palm bay": "Palm Bay", "st. augustine": "St. Augustine", "boca raton": "Boca",
  "bonita springs": "Bonita", "north miami": "N. Miami", "south miami": "S. Miami", "pompano beach": "Pompano",
  "boynton beach": "Boynton", "delray beach": "Delray", "hallandale beach": "Hallandale", "winter haven": "Winter Haven",
  "cape coral": "Cape Coral", "weston": "Weston", "north port": "North Port", "port charlotte": "Port Charlotte", "port orange": "Port Orange",
  "palm harbor": "Palm Harbor", "north lauderdale": "North Lauderdale", "north fort myers": "North Fort Myers",
  "west chester": "West Chester", "white plains": "White Plains", "west covina": "West Covina", "west hollywood": "West Hollywood",
  "east haven": "East Haven", "east orange": "East Orange", "north bergen": "North Bergen", "north ridgeville": "North Ridgeville",
  "north olmsted": "North Olmsted", "north royalton": "North Royalton", "north huntingdon": "North Huntingdon", "north augusta": "North Augusta",
  "south gate": "South Gate", "south jordan": "South Jordan", "south ogden": "South Ogden", "south el monte": "South El Monte",
  "south san francisco": "South San Francisco", "south boston": "South Boston", "mount prospect": "Mount Prospect", "mount pleasant": "Mount Pleasant",
  "mount laurel": "Mount Laurel", "fort worth": "Fort Worth", "fort collins": "Fort Collins", "fort wayne": "Fort Wayne", "fort smith": "Fort Smith",
  "fort pierce": "Fort Pierce", "fort dodge": "Fort Dodge", "fort payne": "Fort Payne", "new rochelle": "New Rochelle", "new bedford": "New Bedford",
  "new britain": "New Britain", "new haven": "New Haven", "newark": "Newark", "newport": "Newport", "bay st. louis": "Bay St. Louis",
  "union park": "Union Park",
  "orlando": "Orlando", "new york city": "NYC", "austin": "Austin",
  "brookhaven": "Brookhaven", "redlands": "Redlands", "lakeway": "Lakeway",
  "killeen": "Killeen", "tuscaloosa": "Tuscaloosa", "milwaukeenorth": "Milwaukee North",
  "manhattan": "Manhattan", "fairoaks": "Fair Oaks", "northborough": "Northborough",
  "columbia": "Columbia", "freeport": "Freeport", "wakefield": "Wakefield",
  "gwinnett": "Gwinnett", "elyria": "Elyria", "kingsport": "Kingsport",
  "bloomington": "Bloomington", "alhambra": "Alhambra", "slidell": "Slidell",
  "shelbyville": "Shelbyville"
};

const BRAND_MAPPING = {
  "acura": "Acura", "alfa romeo": "Alfa Romeo", "amc": "AMC", "aston martin": "Aston Martin", "audi": "Audi",
  "bentley": "Bentley", "bmw": "BMW", "bugatti": "Bugatti", "buick": "Buick", "cadillac": "Cadillac",
  "carmax": "Carmax", "cdj": "Dodge", "cdjrf": "Dodge", "cdjr": "Dodge", "chev": "Chevy",
  "chevvy": "Chevy", "chevrolet": "Chevy", "chrysler": "Chrysler", "cjd": "Dodge", "daewoo": "Daewoo",
  "dodge": "Dodge", "eagle": "Eagle", "ferrari": "Ferrari", "fiat": "Fiat", "ford": "Ford", "genesis": "Genesis",
  "gmc": "GMC", "honda": "Honda", "hummer": "Hummer", "hyundai": "Hyundai", "inf": "Infiniti", "infiniti": "Infiniti",
  "isuzu": "Isuzu", "jaguar": "Jaguar", "jeep": "Jeep", "jlr": "Jaguar Land Rover", "kia": "Kia",
  "lamborghini": "Lamborghini", "land rover": "Land Rover", "landrover": "Land Rover", "lexus": "Lexus",
  "lincoln": "Lincoln", "lucid": "Lucid", "maserati": "Maserati", "maz": "Mazda", "mazda": "Mazda",
  "mb": "M.B.", "merc": "M.B.", "mercedes": "M.B.", "mercedes-benz": "M.B.", "mercedesbenz": "M.B.", "merk": "M.B.",
  "mini": "Mini", "mitsubishi": "Mitsubishi", "nissan": "Nissan", "oldsmobile": "Oldsmobile", "plymouth": "Plymouth",
  "polestar": "Polestar", "pontiac": "Pontiac", "porsche": "Porsche", "ram": "Ram", "rivian": "Rivian",
  "rolls-royce": "Rolls-Royce", "saab": "Saab", "saturn": "Saturn", "scion": "Scion", "smart": "Smart",
  "subaru": "Subaru", "subie": "Subaru", "suzuki": "Suzuki", "tesla": "Tesla", "toyota": "Toyota",
  "volkswagen": "VW", "volvo": "Volvo", "vw": "VW"
};

// Utility to limit concurrency for parallel operations
const pLimit = (concurrency) => {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve).catch(reject).finally(() => {
      active--;
      next();
    });
  };
  return (fn) => new Promise((resolve, reject) => {
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
    stream.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
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
  return words.every(w => /^[A-Z]{1,3}$/.test(w));
};

const expandInitials = (name, domain, brandDetected, cityDetected) => {
  let expanded = [];
  const words = name.split(" ");

  words.forEach(word => {
    if (/^[A-Z]{1,3}$/.test(word)) {
      const cityMatch = Object.entries(KNOWN_CITY_SHORT_NAMES).find(([full, short]) => short.toUpperCase() === word);
      const nounMatch = Object.entries(BRAND_MAPPING).find(([full, short]) => short.toUpperCase() === word);

      if (cityMatch) {
        expanded.push(cityMatch[1]);
      } else if (nounMatch) {
        expanded.push(nounMatch[1]);
      } else if (cityDetected && word === cityDetected.toUpperCase().slice(0, word.length)) {
        expanded.push(applyCityShortName(cityDetected));
      } else if (brandDetected && word === brandDetected.toUpperCase().slice(0, word.length)) {
        expanded.push(brandDetected);
      } else {
        const domainParts = domain.split(".")[0].split(/[^a-zA-Z]/);
        const matchingPart = domainParts.find(part => part.toUpperCase().startsWith(word));
        expanded.push(matchingPart ? matchingPart.charAt(0).toUpperCase() + matchingPart.slice(1) : word);
      }
    } else {
      expanded.push(word);
    }
  });

  return expanded.join(" ");
};

const processLead = async (lead, fallbackTriggers) => {
  const { domain, rowNum } = lead;
  const domainLower = domain.toLowerCase();
  console.error(`🌀 Fallback processing row ${rowNum}: ${domain}`);

  let result;
  let tokensUsed = 0;
  let gptUsed = false;

  const match = extractBrandOfCityFromDomain(domainLower);
  const brandDetected = match.brand || null;
  const cityDetected = match.city || null;

  try {
    result = await humanizeName(domain, domain, true);
    tokensUsed = result.tokens || 0;
    console.error(`humanizeName result for ${domain}: ${JSON.stringify(result)}`);
  } catch (_err) {
    console.error(`humanizeName error for ${domain}: ${_err.message}`);
    result = { name: "", confidenceScore: 0, flags: ["HumanizeError"], tokens: 0 };
  }

  result.flags = Array.isArray(result.flags) ? result.flags : [];
  result.flags.push("FallbackAPIUsed");

  const criticalFlags = ["TooGeneric", "CityNameOnly", "Skipped", "FallbackFailed", "PossibleAbbreviation"];
  const forceReviewFlags = [
    "TooGeneric", "CityNameOnly", "PossibleAbbreviation", "BadPrefixOf", "CarBrandSuffixRemaining",
    "UnverifiedCity"
  ];

  const isAcceptable = result.confidenceScore >= 75 && !result.flags.some(f => criticalFlags.includes(f));

  if (isInitialsOnly(result.name)) {
    const expandedName = expandInitials(result.name, domain, brandDetected, cityDetected);
    if (expandedName !== result.name) {
      result.name = expandedName;
      result.flags.push("InitialsExpandedLocally");
      result.confidenceScore -= 5;
    }
  }

  if (process.env.OPENAI_API_KEY && isInitialsOnly(result.name)) {
    console.error(`Triggering OpenAI readability validation for ${result.name}`);
    const prompt = `Return a JSON object in the format {"isReadable": true/false, "isConfident": true/false} indicating whether "${result.name}" is readable and natural as a company name in the sentence "{Company}'s CRM isn't broken—it's bleeding". Do not include any additional text outside the JSON object.`;
    try {
      const response = await callOpenAI({ prompt, maxTokens: 40 });
      gptUsed = true;
      tokensUsed += response.tokens || 0;

      const parsed = JSON.parse(response.output || "{}");
      if (!parsed.isReadable && parsed.isConfident) {
        const fallbackCity = cityDetected ? applyCityShortName(cityDetected) : result.name.split(" ")[0];
        const fallbackBrand = brandDetected || result.name.split(" ")[1] || "Auto";
        result.name = `${fallbackCity} ${fallbackBrand}`;
        result.flags.push("InitialsExpandedByOpenAI");
        result.confidenceScore -= 5;
      }
    } catch (err) {
      console.error(`OpenAI parse error for ${domain}: ${err.message}`);
      result.flags.push("OpenAIParseError");
      result.confidenceScore = 50;
    }
  }

  // Ensure possessive-friendliness
  const possessiveResult = makePossessiveFriendly(result.name);
  result.name = possessiveResult.name;
  if (possessiveResult.possessiveApplied) {
    result.flags.push("PossessiveApplied");
    result.confidenceScore += 5;
  }

  // Recompute confidence score after updates
  result.confidenceScore = calculateConfidenceScore(result.name, result.flags, domainLower);

  if (!isAcceptable || result.confidenceScore < 75 || result.flags.some(f => forceReviewFlags.includes(f))) {
    fallbackTriggers.push({
      domain,
      rowNum,
      reason: "LowConfidenceOrFlagged",
      details: {
        name: result.name,
        confidenceScore: result.confidenceScore,
        flags: result.flags,
        brand: brandDetected,
        city: cityDetected
      },
      tokens: tokensUsed
    });
  }

  return {
    domain,
    companyName: result.name || "",
    confidenceScore: result.confidenceScore,
    flags: result.flags,
    tokens: tokensUsed,
    rowNum
  };
};

export default async function handler(req, res) {
  try {
    console.log("🧠 company-name-fallback.js v1.0.26 – Fallback Processing Start");

    const raw = await streamToString(req);
    if (!raw) return res.status(400).json({ error: "Empty body" });

    const body = JSON.parse(raw);
    const { validatedLeads, validationErrors } = validateLeads(body.leads || body.leadList || body.domains);

    if (validatedLeads.length === 0) {
      return res.status(400).json({ error: "No valid leads", details: validationErrors });
    }

    const limit = pLimit(CONCURRENCY_LIMIT);
    const startTime = Date.now();
    const successful = [];
    const manualReviewQueue = [];
    const fallbackTriggers = [];
    let totalTokens = 0;

    const chunks = Array.from({ length: Math.ceil(validatedLeads.length / BATCH_SIZE) }, (_, i) =>
      validatedLeads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    for (const chunk of chunks) {
      if (Date.now() - startTime > PROCESSING_TIMEOUT_MS) {
        return res.status(200).json({ successful, manualReviewQueue, totalTokens, fallbackTriggers, partial: true });
      }

      const chunkResults = await Promise.all(
        chunk.map(lead => limit(() => processLead(lead, fallbackTriggers)))
      );

      chunkResults.forEach(result => {
        const criticalFlags = ["TooGeneric", "CityNameOnly", "Skipped", "FallbackFailed", "PossibleAbbreviation"];
        const forceReviewFlags = [
          "TooGeneric", "CityNameOnly", "PossibleAbbreviation", "BadPrefixOf", "CarBrandSuffixRemaining",
          "UnverifiedCity"
        ];

        if (
          result.confidenceScore < 75 ||
          result.flags.some(f => forceReviewFlags.includes(f)) ||
          result.flags.some(f => criticalFlags.includes(f))
        ) {
          manualReviewQueue.push({
            domain: result.domain,
            name: result.companyName,
            confidenceScore: result.confidenceScore,
            flags: result.flags,
            rowNum: result.rowNum
          });
        } else {
          successful.push({
            domain: result.domain,
            companyName: result.companyName,
            confidenceScore: result.confidenceScore,
            flags: result.flags,
            rowNum: result.rowNum
          });
        }

        totalTokens += result.tokens || 0;
      });
    }

    console.log(
      `Fallback complete: ${successful.length} enriched, ${manualReviewQueue.length} to review, ` +
      `${fallbackTriggers.length} fallbacks, ${totalTokens} tokens used`
    );

    return res.status(200).json({
      successful,
      manualReviewQueue,
      fallbackTriggers,
      totalTokens,
      partial: false
    });
  } catch (err) {
    console.error(`❌ Fallback handler error: ${err.message}\n${err.stack}`);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
}

export const config = {
  api: {
    bodyParser: false
  }
};
