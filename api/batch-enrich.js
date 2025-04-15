// api/batch-enrich.js — Version 4.2.15
import { humanizeName, extractBrandOfCityFromDomain, applyCityShortName, TEST_CASE_OVERRIDES } from "./lib/humanize.js";
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
const openAICache = new Map(); // Cache OpenAI results for similar domains

const FALLBACK_API_URL = "/api/company-name-fallback"; // Use relative path
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
  "shelbyville": "Shelbyville",
  "caldwell": "Caldwell",
  "henderson": "Henderson",
  "lakewood": "Lakewood",
  "waconia": "Waconia",
  "deland": "Deland",
  "chattanooga": "Chattanooga",
  "southtowne": "Southtowne",
  "madison": "Madison",
  "charlotte": "Charlotte",
  "dalton": "Dalton",
  "cedarpark": "Cedar Park",
  "irvine": "Irvine",
  "ventura": "Ventura",
  "westgate": "Westgate",
  "milwaukee": "Milwaukee",
  "tooele": "Tooele",
  "camino real": "Camino Real"
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
      console.error(`Invalid JSON response for ${domain}: ${error.message}`);
      throw new Error(`Invalid JSON: ${text}`);
    }

    if (!response.ok || !data.successful?.[0]) {
      console.error(`Fallback error for ${domain}: ${response.status}: ${data.error || text}`);
      throw new Error(`Fallback error ${response.status}`);
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
    console.error(`Fallback API failed for ${domain}: ${error.message}`);
    let local = await humanizeName(domain, domain, true);
    let tokensUsed = local.tokens || 0;

    if (!local.name || local.confidenceScore < 75 || local.name.toLowerCase() === domain.replace(/\.(com|net|org|co\.uk)$/, "")) {
      try {
        const cacheKey = domain.toLowerCase();
        if (openAICache.has(cacheKey)) {
          const cached = openAICache.get(cacheKey);
          local = {
            name: cached.name,
            confidenceScore: cached.confidenceScore,
            flags: [...(local.flags || []), "OpenAICacheHit"],
            tokens: 0
          };
          tokensUsed += cached.tokens;
        } else {
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
          const suggestedName = response.choices[0]?.message?.content?.trim() || "";
          if (suggestedName && suggestedName.split(" ").length <= 3 && !suggestedName.includes("'s")) {
            local = {
              name: suggestedName,
              confidenceScore: 80,
              flags: [...(local.flags || []), "OpenAIValidated"],
              tokens: response.usage.total_tokens
            };
            tokensUsed += response.usage.total_tokens;
            openAICache.set(cacheKey, { name: suggestedName, confidenceScore: 80, tokens: response.usage.total_tokens });
            console.log(`OpenAI tokens used for ${domain}: ${response.usage.total_tokens}`);
          } else {
            local.flags = [...(local.flags || []), "InvalidOpenAIResponse"];
          }
        }
      } catch (openaiError) {
        console.error(`OpenAI failed for ${domain}: ${openaiError.message}`);
        local.flags = [...(local.flags || []), "OpenAIParseError"];
        local.confidenceScore = Math.min(local.confidenceScore, 50);
      }
    }

    const brandMatch = domain.match(/(chevy|ford|toyota|lincoln|bmw)/i);
    if (brandMatch && (local.name || "").split(" ").length < 3) {
      const prefix = (local.name || "").split(" ")[0] || local.name || domain.split(".")[0];
      local.name = `${prefix} ${capitalizeName(brandMatch[0])}`;
      local.confidenceScore = (local.confidenceScore || 0) + 5;
      local.flags = [...(local.flags || []), "BrandAppended"];
    }

    // Non-dealership fallback (e.g., exprealty.com → "Exp Realty")
    if (!brandMatch && !local.name.includes("Auto") && domain.match(/realty|exp|group/i)) {
      const baseName = domain.split(".")[0].replace(/realty|exp|group/i, "").trim();
      local.name = `${capitalizeName(baseName)} Realty`;
      local.confidenceScore = Math.max(local.confidenceScore, 70);
      local.flags = [...(local.flags || []), "NonDealershipFallback"];
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
      console.error(`Stream error: ${error.message}`);
      clearTimeout(timeout);
      reject(error);
    });
  });
};

const isInitialsOnly = (name) => {
  if (!name || typeof name !== "string") return false;
  const words = name.split(" ");
  return words.every(w => /^[A-Z]{1,3}$/.test(w));
};

const expandInitials = (name, domain, brandDetected, cityDetected) => {
  if (!name || typeof name !== "string") return "";
  let expanded = [];
  const words = name.split(" ");

  words.forEach(word => {
    if (/^[A-Z]{1,3}$/.test(word)) {
      if (cityDetected && word === cityDetected.toUpperCase().slice(0, word.length)) {
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
  if (!words || typeof words !== "string") words = "";
  if (typeof words === "string") words = words.split(/\s+/);
  return words
    .map((word, i) => {
      if (!word) return word;
      if (word.toLowerCase() === "chevrolet") return "Chevy";
      if (["of", "and", "to"].includes(word.toLowerCase()) && i > 0) return word.toLowerCase();
      if (/^[A-Z]{1,3}$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .filter(Boolean)
    .join(" ");
};

export default async function handler(req, res) {
  try {
    console.log("🧠 batch-enrich.js v4.2.15 – Domain Processing Start");

    const raw = await streamToString(req);
    if (!raw) return res.status(400).json({ error: "Empty body" });

    let body;
    try {
      body = JSON.parse(raw);
    } catch (error) {
      console.error(`Invalid JSON body: ${error.message}`);
      return res.status(400).json({ error: "Invalid JSON body", details: error.message });
    }

    const leads = body.leads || body.leadList || body.domains;
    if (!Array.isArray(leads)) {
      console.error("Leads must be an array");
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
      console.error("No valid leads");
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
        console.error("Processing timeout reached");
        return res.status(200).json({ successful, manualReviewQueue, totalTokens, fallbackTriggers, partial: true });
      }

      const chunkResults = await Promise.all(
        chunk.map(lead => limit(async () => {
          const { domain, rowNum } = lead;
          const domainKey = domain.toLowerCase();

          console.log(`Processing lead: ${domain} (Row ${rowNum})`);

          if (processedDomains.has(domainKey)) {
            const cached = domainCache.get(domainKey);
            if (cached) {
              console.log(`Skipping duplicate: ${domain}`);
              return {
                domain,
                companyName: cached.companyName || "",
                confidenceScore: cached.confidenceScore || 0,
                flags: [...(cached.flags || []), "DuplicateSkipped"],
                rowNum,
                tokens: 0
              };
            }
          }

          let finalResult = { companyName: "", confidenceScore: 0, flags: [], tokens: 0 };
          let tokensUsed = 0;

          const match = extractBrandOfCityFromDomain(domainKey);
          const brandDetected = match.brand || null;
          const cityDetected = match.city || null;

          // Check for override to short-circuit processing
          if (domainKey in TEST_CASE_OVERRIDES) {
            finalResult = await humanizeName(domain, domain, true);
            tokensUsed = finalResult.tokens || 0;
          } else {
            try {
              finalResult = await humanizeName(domain, domain, true);
              tokensUsed = finalResult.tokens || 0;
            } catch (error) {
              console.error(`humanizeName failed for ${domain}: ${error.message}`);
              finalResult = await callFallbackAPI(domain, rowNum);
              tokensUsed += finalResult.tokens || 0;
            }

            if (!finalResult.companyName) {
              console.error(`Empty companyName for ${domain}`);
              finalResult = {
                companyName: "",
                confidenceScore: 0,
                flags: [...(finalResult.flags || []), "EmptyCompanyName"],
                tokens: tokensUsed
              };
            }

            const criticalFlags = ["TooGeneric", "CityNameOnly", "FallbackFailed", "Skipped"];
            const isAcceptable = finalResult.confidenceScore >= 75 &&
              !finalResult.flags.some(f => criticalFlags.includes(f));

            if (!isAcceptable) {
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
                finalResult.flags = [...(finalResult.flags || []), "FallbackAPIFailed"];
                fallbackTriggers.push({
                  domain,
                  rowNum,
                  reason: "FallbackAPIFailed",
                  details: {
                    primary: {
                      name: primary.companyName || "",
                      confidenceScore: primary.confidenceScore || 0,
                      flags: primary.flags || []
                    },
                    fallback: {
                      name: fallback.companyName || "",
                      confidenceScore: fallback.confidenceScore || 0,
                      flags: fallback.flags || []
                    },
                    brand: brandDetected,
                    city: cityDetected
                  },
                  tokens: tokensUsed
                });
              }
            }
          }

          const reviewFlags = ["TooGeneric", "CityNameOnly", "PossibleAbbreviation"];
          if (
            finalResult.confidenceScore < 75 ||
            finalResult.flags.some(f => reviewFlags.includes(f))
          ) {
            manualReviewQueue.push({
              domain,
              name: finalResult.companyName || "",
              confidenceScore: finalResult.confidenceScore || 0,
              flags: finalResult.flags || [],
              rowNum
            });
            finalResult.flags = [...(finalResult.flags || []), "LowConfidence"];
            finalResult.confidenceScore = Math.max(finalResult.confidenceScore || 0, 50);
          }

          if (isInitialsOnly(finalResult.companyName)) {
            const expandedName = expandInitials(finalResult.companyName, domain, brandDetected, cityDetected);
            if (expandedName && expandedName !== finalResult.companyName) {
              finalResult.companyName = expandedName;
              finalResult.flags.push("InitialsExpandedLocally");
              finalResult.confidenceScore -= 5;
            }
          }

          if (process.env.OPENAI_API_KEY && isInitialsOnly(finalResult.companyName) && !brandDetected && !cityDetected) {
            try {
              const prompt = `Return a JSON object in the format {"isReadable": true/false, "isConfident": true/false} indicating whether "${finalResult.companyName}" is readable and natural as a company name in the sentence "{Company}'s CRM isn't broken—it's bleeding". Do not include any additional text outside the JSON object.`;
              const response = await callOpenAI({ prompt, maxTokens: 40 });
              tokensUsed += response.tokens || 0;

              const parsed = JSON.parse(response.output || "{}");
              if (!parsed.isReadable && parsed.isConfident) {
                const fallbackCity = cityDetected ? applyCityShortName(cityDetected) : domain.split(".")[0];
                const fallbackBrand = brandDetected || "Auto";
                finalResult.companyName = `${fallbackCity} ${fallbackBrand}`.slice(0, 3);
                finalResult.flags.push("InitialsExpandedByOpenAI");
                finalResult.confidenceScore -= 5;
              }
            } catch (error) {
              console.error(`OpenAI parse error for ${domain}: ${error.message}`);
              finalResult.flags.push("OpenAIParseError");
            }
          }

          domainCache.set(domainKey, {
            companyName: finalResult.companyName || "",
            confidenceScore: finalResult.confidenceScore || 0,
            flags: finalResult.flags || []
          });
          processedDomains.add(domainKey);

          totalTokens += tokensUsed;
          return {
            domain,
            companyName: finalResult.companyName || "",
            confidenceScore: finalResult.confidenceScore || 0,
            flags: finalResult.flags || [],
            rowNum,
            tokens: tokensUsed
          };
        }))
      );

      successful.push(...chunkResults);
    }

    console.log(
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
