// api/company-name-fallback.js — Version 1.0.25
import { humanizeName, extractBrandOfCityFromDomain, applyCityShortName } from "./lib/humanize.js";
import { callOpenAI } from "./lib/openai.js";

// Constants for API configuration
const BATCH_SIZE = 10;
const CONCURRENCY_LIMIT = 5;
const PROCESSING_TIMEOUT_MS = 18000;

const domainCache = new Map(); // Added for deduplication

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

const processLead = async (lead, fallbackTriggers) => {
  const { domain, rowNum } = lead;
  const domainLower = domain.toLowerCase();
  console.error(`🌀 Fallback processing row ${rowNum}: ${domain}`);

  // Check cache
  const cacheKey = domainLower;
  if (domainCache.has(cacheKey)) {
    const cached = domainCache.get(cacheKey);
    return {
      domain,
      companyName: cached.companyName,
      confidenceScore: cached.confidenceScore,
      flags: [...cached.flags, "CacheHit"],
      tokens: 0,
      rowNum
    };
  }

  let result;
  let tokensUsed = 0;

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

  let isAcceptable = result.confidenceScore >= 75 && !result.flags.some(f => criticalFlags.includes(f));

  // OpenAI validator for low confidence or raw outputs
  if (result.confidenceScore < 75 || result.name.toLowerCase() === domainLower.replace(/\.(com|net|org|co\.uk)$/, "")) {
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
        result = {
          name: suggestedName,
          confidenceScore: 80,
          flags: [...result.flags, "OpenAIValidated"],
          tokens: response.usage.total_tokens
        };
        tokensUsed += response.usage.total_tokens;
      }
    } catch (err) {
      console.error(`OpenAI fallback failed: ${err.message}`);
      result.flags.push("OpenAIParseError");
      result.confidenceScore = 50;
    }
  }

  // Append brand if possible
  const brandMatch = domainLower.match(/(chevy|ford|toyota|lincoln|bmw)/i);
  if (brandMatch && result.name.split(" ").length < 3) {
    const prefix = result.name.split(" ")[0] || result.name;
    result.name = `${prefix} ${capitalizeName(brandMatch[0])}`;
    result.confidenceScore += 5;
    result.flags.push("BrandAppended");
  }

  if (isInitialsOnly(result.name)) {
    const expandedName = expandInitials(result.name, domain, brandDetected, cityDetected);
    if (expandedName !== result.name) {
      result.name = expandedName;
      result.flags.push("InitialsExpandedLocally");
      result.confidenceScore -= 5;
    }
  }

  if (process.env.OPENAI_API_KEY && isInitialsOnly(result.name)) {
    const prompt = `Is "${result.name}" readable and natural in "{Company}'s CRM isn't broken—it’s bleeding"? Respond with {"isReadable": true/false, "isConfident": true/false}`;
    try {
      const response = await callOpenAI({ prompt, maxTokens: 40 });
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
      console.error(`OpenAI parse error: ${err.message}`);
      result.flags.push("OpenAIParseError");
      result.confidenceScore = 50;
    }
  }

  // Update acceptability after modifications
  isAcceptable = result.confidenceScore >= 75 && !result.flags.some(f => criticalFlags.includes(f));

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

  const finalResult = {
    domain,
    companyName: result.name || "",
    confidenceScore: result.confidenceScore,
    flags: result.flags,
    tokens: tokensUsed,
    rowNum
  };

  domainCache.set(cacheKey, {
    companyName: finalResult.companyName,
    confidenceScore: finalResult.confidenceScore,
    flags: finalResult.flags
  });

  return finalResult;
};

export default async function handler(req, res) {
  try {
    console.log("🧠 company-name-fallback.js v1.0.25 – Fallback Processing Start");

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
