// api/batch-enrich.js — Version 4.2.7
import { humanizeName, extractBrandOfCityFromDomain, applyCityShortName } from "./lib/humanize.js";
import { callOpenAI } from "./lib/openai.js";

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

const domainCache = new Map();
const processedDomains = new Set();

const VERCEL_API_BASE_URL = "https://get-enrich-api-git-main-show-revv.vercel.app";
const FALLBACK_API_URL = `${VERCEL_API_BASE_URL}/api/batch-enrich-company-name-fallback`;
const FALLBACK_API_TIMEOUT_MS = parseInt(process.env.FALLBACK_API_TIMEOUT_MS, 10) || 6000;

const KNOWN_CITY_SHORT_NAMES = {
  "las vegas": "Vegas",
  "los angeles": "LA",
  "new york": "NY",
  "new orleans": "N.O.",
  "miami lakes": "Miami",
  "south charlotte": "South Charlotte",
  "huntington beach": "HB",
  "west springfield": "West Springfield",
  "san leandro": "San Leandro",
  "san francisco": "SF",
  "san diego": "SD",
  "fort lauderdale": "FTL",
  "west palm beach": "WPB",
  "palm beach gardens": "PBG",
  "st. louis": "STL",
  "st. petersburg": "St. Pete",
  "st. paul": "St. Paul",
  "south bend": "South Bend",
  "north las vegas": "North Las Vegas",
  "north charleston": "North Charleston",
  "southfield": "Southfield",
  "college station": "College Station",
  "lake havasu city": "Lake Havasu City",
  "mount vernon": "Mount Vernon",
  "port st. lucie": "Port St. Lucie",
  "panama city": "Panama City",
  "fort myers": "Fort Myers",
  "palm coast": "Palm Coast",
  "newport news": "Newport News",
  "jacksonville beach": "Jax Beach",
  "west new york": "West New York",
  "elk grove": "Elk Grove",
  "palm springs": "Palm Springs",
  "grand prairie": "Grand Prairie",
  "palm bay": "Palm Bay",
  "st. augustine": "St. Augustine",
  "boca raton": "Boca",
  "bonita springs": "Bonita",
  "north miami": "N. Miami",
  "south miami": "S. Miami",
  "pompano beach": "Pompano",
  "boynton beach": "Boynton",
  "delray beach": "Delray",
  "hallandale beach": "Hallandale",
  "winter haven": "Winter Haven",
  "cape coral": "Cape Coral",
  "weston": "Weston",
  "north port": "North Port",
  "port charlotte": "Port Charlotte",
  "port orange": "Port Orange",
  "palm harbor": "Palm Harbor",
  "north lauderdale": "North Lauderdale",
  "north fort myers": "North Fort Myers",
  "west chester": "West Chester",
  "white plains": "White Plains",
  "west covina": "West Covina",
  "west hollywood": "West Hollywood",
  "east haven": "East Haven",
  "east orange": "East Orange",
  "north bergen": "North Bergen",
  "north ridgeville": "North Ridgeville",
  "north olmsted": "North Olmsted",
  "north royalton": "North Royalton",
  "north huntingdon": "North Huntingdon",
  "north augusta": "North Augusta",
  "south gate": "South Gate",
  "south jordan": "South Jordan",
  "south ogden": "South Ogden",
  "south el monte": "South El Monte",
  "south san francisco": "South San Francisco",
  "south boston": "South Boston",
  "mount prospect": "Mount Prospect",
  "mount pleasant": "Mount Pleasant",
  "mount laurel": "Mount Laurel",
  "fort worth": "Fort Worth",
  "fort collins": "Fort Collins",
  "fort wayne": "Fort Wayne",
  "fort smith": "Fort Smith",
  "fort pierce": "Fort Pierce",
  "fort dodge": "Fort Dodge",
  "fort payne": "Fort Payne",
  "new rochelle": "New Rochelle",
  "new bedford": "New Bedford",
  "new britain": "New Britain",
  "new haven": "New Haven",
  "newark": "Newark",
  "newport": "Newport",
  "bay st. louis": "Bay St. Louis",
  "union park": "Union Park",
  "orlando": "Orlando",
  "new york city": "NYC",
  "austin": "Austin",
  "brookhaven": "Brookhaven",
  "redlands": "Redlands",
  "lakeway": "Lakeway",
  "killeen": "Killeen",
  "tuscaloosa": "Tuscaloosa",
  "milwaukeenorth": "Milwaukee North",
  "manhattan": "Manhattan",
  "fairoaks": "Fair Oaks",
  "northborough": "Northborough",
  "columbia": "Columbia",
  "freeport": "Freeport",
  "wakefield": "Wakefield",
  "gwinnett": "Gwinnett",
  "elyria": "Elyria",
  "kingsport": "Kingsport",
  "bloomington": "Bloomington",
  "alhambra": "Alhambra",
  "slidell": "Slidell",
  "shelbyville": "Shelbyville"
};

const callWithRetries = async (fn, retries = 7, delay = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return { result: await fn(), attempt };
    } catch (error) {
      if (attempt === retries) throw error;
      console.error(`Retry ${attempt} failed: ${error.message}`);
      await new Promise((res) => setTimeout(res, 2 ** attempt * delay));
    }
  }
  return null;
};

const callFallbackAPI = async (domain, rowNum) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FALLBACK_API_TIMEOUT_MS);

    const response = await fetch(FALLBACK_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leads: [{ domain, rowNum }] }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error(`Invalid JSON response: ${text}`);
    }

    if (!response.ok || !data.successful?.[0]) {
      throw new Error(`Fallback error ${response.status}: ${data.error || text}`);
    }

    const result = data.successful[0];
    return {
      domain: result.domain || domain,
      companyName: result.companyName || "",
      confidenceScore: result.confidenceScore || 0,
      flags: Array.isArray(result.flags) ? result.flags : ["InvalidFallbackResponse"],
      tokens: result.tokens || 0,
      rowNum
    };
  } catch (error) {
    console.error(`Fallback API failed: ${error.message}`);
    let local = await humanizeName(domain, domain, true);
    let tokensUsed = local.tokens || 0;

    if (local.confidenceScore < 75 || local.name.toLowerCase() === domain.replace(/\.(com|net|org|co\.uk)$/, "")) {
      try {
        const response = await callOpenAI({
          model: "gpt-4-turbo",
          messages: [
            {
              role: "system",
              content: "Split compound words into a human-readable company name, max 3 words, suitable for '[Company]'s CRM isn't broken-it's bleeding.' Exclude possessive forms."
            },
            {
              role: "user",
              content: `Domain: ${domain}`
            }
          ]
        });
        const suggestedName = response.choices[0].message.content.trim();
        if (suggestedName.split(" ").length <= 3 && !suggestedName.includes("'s")) {
          local = {
            name: suggestedName,
            confidenceScore: 80,
            flags: [...(local.flags || []), "OpenAIValidated"],
            tokens: response.usage.total_tokens
          };
          tokensUsed += response.usage.total_tokens;
        }
      } catch (openaiErr) {
        console.error(`OpenAI fallback failed: ${openaiErr.message}`);
        local.flags.push("OpenAIParseError");
        local.confidenceScore = 50;
      }
    }

    const brandMatch = domain.match(/(chevy|ford|toyota|lincoln|bmw)/i);
    if (brandMatch && local.name.split(" ").length < 3) {
      const prefix = local.name.split(" ")[0] || local.name;
      local.name = `${prefix} ${capitalizeName(brandMatch[0])}`;
      local.confidenceScore += 5;
      local.flags.push("BrandAppended");
    }

    return {
      domain,
      companyName: local.name || "",
      confidenceScore: local.confidenceScore || 0,
      flags: [...(local.flags || []), "FallbackAPIFailed", "LocalFallbackUsed"],
      tokens: tokensUsed,
      rowNum,
      error: error.message
    };
  }
};

const streamToString = async (req) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const timeout = setTimeout(() => reject(new Error("Stream timeout")), 5000);

    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      clearTimeout(timeout);
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });
    req.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
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
      const cityMatch = Object.entries(KNOWN_CITY_SHORT_NAMES).find(([, short]) => short.toUpperCase() === word);
      if (cityMatch) {
        expanded.push(capitalizeName(cityMatch[0]));
      } else if (cityDetected && word === cityDetected.toUpperCase().slice(0, word.length)) {
        expanded.push(applyCityShortName(cityDetected));
      } else if (brandDetected && word === brandDetected.toUpperCase().slice(0, word.length)) {
        expanded.push(capitalizeName(brandDetected));
      } else {
        const domainParts = domain.split(".")[0].split(/[^a-zA-Z]/);
        const matchingPart = domainParts.find(part => part.toUpperCase().startsWith(word));
        expanded.push(matchingPart ? capitalizeName(matchingPart) : word);
      }
    } else {
      expanded.push(word);
    }
  });

  return expanded.join(" ");
};

const capitalizeName = (words) => {
  if (typeof words === "string") words = words.split(/\s+/);
  return words
    .map((word, i) => {
      if (word.toLowerCase() === "chevrolet") return "Chevy";
      if (["of", "and", "to"].includes(word.toLowerCase()) && i > 0) return word.toLowerCase();
      if (/^[A-Z]{1,3}$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

export default async function handler(req, res) {
  try {
    console.error("🧠 batch-enrich.js v4.2.7 – Domain Processing Start");

    const raw = await streamToString(req);
    if (!raw) return res.status(400).json({ error: "Empty body" });
    let body;
    try {
      body = JSON.parse(raw);
    } catch (error) {
      return res.status(400).json({ error: "Invalid JSON body", details: error.message });
    }

    const leads = body.leads || body.leadList || body.domains;
    if (!Array.isArray(leads)) {
      return res.status(400).json({ error: "Leads must be an array" });
    }

    const validatedLeads = [];
    const validationErrors = [];

    leads.forEach((lead, i) => {
      if (!lead || typeof lead !== "object") {
        validationErrors.push(`Index ${i} not object`);
        return;
      }

      const domain = (lead.domain || "").trim().toLowerCase();
      if (!domain) {
        validationErrors.push(`Index ${i} missing domain`);
        return;
      }

      validatedLeads.push({ domain, rowNum: lead.rowNum || i + 1 });
    });

    if (validatedLeads.length === 0) {
      return res.status(400).json({ error: "No valid leads", details: validationErrors });
    }

    const limit = pLimit(5);
    const startTime = Date.now();
    const successful = [];
    const manualReviewQueue = [];
    const fallbackTriggers = [];
    let totalTokens = 0;

    const BATCH_SIZE = 10;
    const chunks = Array.from({ length: Math.ceil(validatedLeads.length / BATCH_SIZE) }, (_, i) =>
      validatedLeads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    for (const chunk of chunks) {
      if (Date.now() - startTime > 18000) {
        return res.status(200).json({ successful, manualReviewQueue, totalTokens, fallbackTriggers, partial: true });
      }

      const chunkResults = await Promise.all(
        chunk.map(lead => limit(async () => {
          const { domain, rowNum } = lead;
          const domainKey = domain.toLowerCase();

          console.error(`Processing lead: ${domain} (Row ${rowNum})`);

          if (processedDomains.has(domainKey)) {
            const cached = domainCache.get(domainKey);
            if (cached) {
              console.error(`Skipping duplicate: ${domain}`);
              return {
                domain,
                companyName: cached.companyName,
                confidenceScore: cached.confidenceScore,
                flags: [...cached.flags, "DuplicateSkipped"],
                rowNum,
                tokens: 0
              };
            }
          }

          if (domainCache.has(domainKey)) {
            const cached = domainCache.get(domainKey);
            processedDomains.add(domainKey);
            return { ...cached, rowNum, domain };
          }

          let finalResult;
          let tokensUsed = 0;

          const match = extractBrandOfCityFromDomain(domainKey);
          const brandDetected = match.brand || null;
          const cityDetected = match.city || null;

          try {
            finalResult = await humanizeName(domain, domain, true);
            tokensUsed = finalResult.tokens || 0;
          } catch (error) {
            console.error(`humanizeName failed for ${domain}: ${error.message}`);
            finalResult = await callFallbackAPI(domain, rowNum);
            tokensUsed += finalResult.tokens || 0;
          }

          const criticalFlags = ["TooGeneric", "CityNameOnly", "FallbackFailed", "Skipped"];
          const isAcceptable = finalResult.confidenceScore >= 75 &&
            !finalResult.flags.some(f => criticalFlags.includes(f));

          if (isAcceptable) {
            domainCache.set(domainKey, {
              companyName: finalResult.companyName,
              confidenceScore: finalResult.confidenceScore,
              flags: finalResult.flags
            });
            processedDomains.add(domainKey);
          } else {
            const primary = { ...finalResult };
            const fallback = await callFallbackAPI(domain, rowNum);
            tokensUsed += fallback.tokens || 0;

            if (
              fallback.companyName &&
              fallback.confidenceScore >= 75 &&
              !fallback.flags.some(f => criticalFlags.includes(f))
            ) {
              finalResult = {
                ...fallback,
                flags: [...(fallback.flags || []), "FallbackAPIUsed"],
                rowNum
              };
            } else {
              finalResult.flags.push("FallbackAPIFailed");
              fallbackTriggers.push({
                domain,
                rowNum,
                reason: "FallbackAPIFailed",
                details: {
                  primary: {
                    name: primary.companyName,
                    confidenceScore: primary.confidenceScore,
                    flags: primary.flags
                  },
                  fallbackScore: fallback.confidenceScore,
                  fallbackFlags: fallback.flags,
                  brand: brandDetected,
                  city: cityDetected
                },
                tokens: tokensUsed
              });
            }
          }

          const reviewFlags = ["TooGeneric", "CityNameOnly", "PossibleAbbreviation"];
          if (
            finalResult.confidenceScore < 75 ||
            finalResult.flags.some(f => reviewFlags.includes(f))
          ) {
            manualReviewQueue.push({
              domain,
              name: finalResult.companyName,
              confidenceScore: finalResult.confidenceScore,
              flags: finalResult.flags,
              rowNum
            });

            finalResult = {
              domain,
              companyName: finalResult.companyName || "",
              confidenceScore: Math.max(finalResult.confidenceScore, 50),
              flags: [...finalResult.flags, "LowConfidence"],
              rowNum
            };
          }

          if (isInitialsOnly(finalResult.companyName)) {
            const expandedName = expandInitials(finalResult.companyName, domain, brandDetected, cityDetected);
            if (expandedName !== finalResult.companyName) {
              finalResult.companyName = expandedName;
              finalResult.flags.push("InitialsExpandedLocally");
              finalResult.confidenceScore -= 5;
            }
          }

          if (process.env.OPENAI_API_KEY && isInitialsOnly(finalResult.companyName)) {
            const prompt = `Is "${finalResult.companyName}" readable and natural in "{Company}'s CRM isn't broken—it’s bleeding"? Respond with {"isReadable": true/false, "isConfident": true/false}`;
            const response = await callOpenAI({ prompt, maxTokens: 40 });
            tokensUsed += response.tokens || 0;

            try {
              const parsed = JSON.parse(response.output || "{}");
              if (!parsed.isReadable && parsed.isConfident) {
                const fallbackCity = cityDetected ? applyCityShortName(cityDetected) : finalResult.companyName.split(" ")[0];
                const fallbackBrand = brandDetected || finalResult.companyName.split(" ")[1] || "Auto";
                finalResult.companyName = `${fallbackCity} ${fallbackBrand}`;
                finalResult.flags.push("InitialsExpandedByOpenAI");
                finalResult.confidenceScore -= 5;
              }
            } catch (error) {
              finalResult.flags.push("OpenAIParseError");
            }
          }

          domainCache.set(domainKey, {
            companyName: finalResult.companyName,
            confidenceScore: finalResult.confidenceScore,
            flags: finalResult.flags
          });
          processedDomains.add(domainKey);

          totalTokens += tokensUsed;
          return {
            domain,
            companyName: finalResult.companyName,
            confidenceScore: finalResult.confidenceScore,
            flags: finalResult.flags,
            rowNum,
            tokens: tokensUsed
          };
        }))
      );

      successful.push(...chunkResults);
    }

    console.error(
      `Batch complete: enriched=${successful.length}, review=${manualReviewQueue.length}, fallbacks=${fallbackTriggers.length}, tokens=${totalTokens}`
    );

    return res.status(200).json({
      successful,
      manualReviewQueue,
      fallbackTriggers,
      totalTokens,
      partial: false
    });
  } catch (error) {
    console.error(`❌ Handler error: ${error.message}\n${error.stack}`);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
}

export const resetProcessedDomains = async (req, res) => {
  processedDomains.clear();
  domainCache.clear();
  return res.status(200).json({ message: "Processed domains reset" });
};

export const config = {
  api: {
    bodyParser: false
  }
};
