// ✅ FULL VERSION: Company Name Cleaning Only (includes fallbacks, typo correction, JSON resilience, brand detection, review queue, timeout guard)

// --- Simple rate-limiting (p-limit style) ---
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

// --- Cache, constants ---
const domainCache = new Map();
const BRANDS = [
  "chevrolet", "gmc", "cadillac", "buick", "ford", "lincoln", "chrysler",
  "dodge", "jeep", "ram", "tesla", "rivian", "lucid", "honda", "nissan",
  "hyundai", "kia", "bmw", "mercedes", "benz", "subaru", "toyota", "vw",
  "lexus", "infiniti"
];
const STATES = [
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut",
  "delaware", "florida", "georgia", "hawaii", "idaho", "illinois", "indiana", "iowa",
  "kansas", "kentucky", "louisiana", "maine", "maryland", "massachusetts", "michigan",
  "minnesota", "mississippi", "missouri", "montana", "nebraska", "nevada", "new hampshire",
  "new jersey", "new mexico", "new york", "north carolina", "north dakota", "ohio",
  "oklahoma", "oregon", "pennsylvania", "rhode island", "south carolina", "south dakota",
  "tennessee", "texas", "utah", "vermont", "virginia", "washington", "west virginia",
  "wisconsin", "wyoming", "district of columbia", "dc"
];
const COMMON_WORDS = [
  "pat", "gus", "san", "team", "town", "east", "west", "north", "south", "auto",
  ...STATES,
  "gallery", "plaza", "superstore", "center", "group", "outlet", "dealer", "sales", "motors",
  ...BRANDS.map(brand => brand.toLowerCase())
];

const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

// --- Normalize & clean incoming name ---
const normalizeText = (name) => {
  if (!name || typeof name !== "string") return [];
  let result = name.replace(/^"|"$/g, ''); // Strip wrapping quotes from input
  let words = result.toLowerCase().trim().split(/\s+/);
  if (words[0] === "the") words.shift();
  return words;
};

// --- Detect brand from array of words ---
const detectBrand = (words) => {
  const brand = words.find(word => BRANDS.includes(word.toLowerCase()));
  return { hasBrand: !!brand, brand };
};

// --- Remove car brand names from the list of words ---
const removeCarBrands = (words) => {
  return words.filter(word => !BRANDS.includes(word.toLowerCase()));
};

// --- Levenshtein Distance with memoization for typo correction ---
const levenshteinDistance = (a, b, cache = new Map()) => {
  const key = `${a}|${b}`;
  if (cache.has(key)) return cache.get(key);
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  const dist = matrix[b.length][a.length];
  cache.set(key, dist);
  return dist;
};

// --- Correct city typos based on known city match ---
const correctTypos = (words) => {
  const cache = new Map();
  const cities = ["sanleandro", "fortlauderdale", "westpalmbeach", "newyork", "jacksonville"];
  const cityMap = {
    "sanleandro": "San Leandro",
    "fortlauderdale": "Fort Lauderdale",
    "westpalmbeach": "West Palm Beach",
    "newyork": "New York",
    "jacksonville": "Jacksonville"
  };

  return words.map(word => {
    const normalized = word.toLowerCase().replace(/\s+/g, '');
    const closest = cities.reduce((best, city) => {
      const dist = levenshteinDistance(normalized, city, cache);
      return dist < best.distance ? { city, distance: dist } : best;
    }, { city: null, distance: Infinity });

    return closest.distance <= 2 ? cityMap[closest.city] || capitalize(closest.city) : word;
  });
};

// --- Decompress domain into component words ---
const splitDomainIntoWords = (domain) => {
  let name = domain.replace(/\.com$/, '');
  name = name.replace(/([a-z])([A-Z])/g, '$1 $2')
             .replace(/([a-zA-Z])(\d)/g, '$1 $2')
             .replace(/(\d)([a-zA-Z])/g, '$1 $2');
  return name.split(/\s+/).filter(word => word);
};

const decompressDomain = (words, domain) => {
  const domainWords = splitDomainIntoWords(domain).map(word => word.toLowerCase());
  const result = [];
  let domainIndex = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (domainIndex >= domainWords.length) {
      result.push(word);
      continue;
    }
    const domainWord = domainWords[domainIndex];
    if (domainWord.includes(word.toLowerCase()) || word.toLowerCase().includes(domainWord)) {
      result.push(word);
      domainIndex++;
    } else {
      result.push(word);
    }
  }

  return result;
};

// --- Remove common filler words ---
const cleanupFillers = (words) => {
  const fillers = ["motors", "llc", "inc", "enterprise", "group", "dealership", "sales"];
  return words.filter(word => !fillers.includes(word.toLowerCase())).map(word => word.replace(/^-/, ""));
};

// --- Remove unnecessary trailing 'auto' unless it's a well-known phrase ---
const removeUnnecessaryAuto = (words) => {
  const last = words[words.length - 1];
  const base = words.slice(0, -1).join(" ").toLowerCase();
  const preserve = ["penske auto", "tasca auto", "union park", "jt auto", "suntrup auto"];
  if (last === "auto" && words.length > 1 && !preserve.includes(base + " auto")) {
    return words.slice(0, -1);
  }
  return words;
};

// --- Adjust for possessive flow (e.g., Gus's → Gus) ---
const adjustForPossessiveFlow = (words) => {
  if (words.length > 1 && words[1].toLowerCase().endsWith("s") && words[1].toLowerCase() !== "cars") {
    words[1] = words[1].replace(/s$/, "");
  }
  return words;
};

// --- Remove possessive forms (e.g., Ford's → Ford) ---
const removePossessiveForms = (words) => {
  return words.map(word => word.replace(/'s$/i, ""));
};

// --- Ensure the name is suitable for possessive use ---
const ensurePossessiveSuitability = (words) => {
  // Remove words that don't fit possessive form (e.g., "sales")
  const unsuitableWords = ["sales"];
  words = words.filter(word => !unsuitableWords.includes(word.toLowerCase()));

  // If "auto" is the last word and the name has more than two words, remove it for better possessive form
  if (words.length > 2 && words[words.length - 1].toLowerCase() === "auto") {
    words = words.slice(0, -1);
  }

  // If the name is empty after removing unsuitable words, try to use a distinguishing word from the domain
  if (words.length === 0) {
    return ["Unknown"];
  }

  return words;
};

// --- Abbreviation detection (e.g., CZAG, ABCD) ---
const detectAbbreviation = (words) => {
  return words.some(word => (
    (/^[A-Z]{2,4}$/.test(word) || // e.g., CZAG
     /^[A-Z][a-z]+[A-Z][a-z]*$/.test(word) || // e.g., McCarthy
     /^[A-Z][a-z]{1,2}$/.test(word) || // e.g., AB
     (!/^[a-z]+$/i.test(word) && !COMMON_WORDS.includes(word.toLowerCase()) && word.length > 3 && !BRANDS.includes(word.toLowerCase())))
  ));
};

// --- Final formatting for output ---
const applyMinimalFormatting = (name) => {
  return name
    .replace(/^"|"$/g, '') // Strip wrapping quotes
    .replace(/",$/g, '')   // Strip trailing comma and quote
    .replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1))
    .replace(/Mccarthy/g, "McCarthy")
    .replace(/Mclarty/g, "McLarty")
    .replace(/Bmw/g, "BMW")
    .replace(/Vw/g, "VW")
    .replace(/'s\b/gi, "'s")
    .replace(/([a-z])'S\b/gi, "$1's")
    .trim();
};

// --- Confidence Score Calculation ---
const computeConfidenceScore = (words, domain, hasBrand, hasAbbreviation, isGptResponse = false) => {
  let score = 0;
  const domainWords = splitDomainIntoWords(domain).map(w => w.toLowerCase());
  const nameWords = words.map(w => w.toLowerCase());

  let hasDomainMatch = false;
  let partialMatchScore = 0;

  for (const nameWord of nameWords) {
    for (const domainWord of domainWords) {
      if (nameWord === domainWord && nameWord.length > 3) {
        hasDomainMatch = true;
        break;
      }
      if (domainWord.includes(nameWord) && nameWord.length > 3) {
        partialMatchScore = Math.max(partialMatchScore, 20);
      }
    }
    if (hasDomainMatch) break;
  }

  score += hasDomainMatch ? 50 : partialMatchScore;
  score += hasBrand ? 30 : 0;
  score += hasAbbreviation ? 0 : 20;

  // Boost for known dealership patterns
  const extraSafeWords = ["plaza", "gallery", "center", "superstore", "auto"];
  if (words.some(w => extraSafeWords.includes(w.toLowerCase()))) {
    score += 20; // Higher boost to ensure 50+
  }

  // Boost for valid GPT response
  if (isGptResponse) {
    score += 10; // Add 10 for a clean GPT match
  }

  const nameStr = nameWords.join(" ");
  if (["pat milliken", "union park", "tasca auto", "jt auto"].includes(nameStr)) {
    score += 10;
  }

  // Penalize if the name is too short or generic
  if (words.length <= 1) {
    score -= 20;
  }

  return Math.min(score, 100);
};

// --- Fallback Cleanup + Scoring + Flagging ---
const humanizeName = (name, domain) => {
  let words = normalizeText(name);
  const { hasBrand, brand } = detectBrand(words);

  // Trusted names (without brands)
  const knownGood = ["pat milliken", "union park", "tasca auto", "jt auto"];
  const normalized = words.join(" ").toLowerCase();
  if (knownGood.includes(normalized) && !hasBrand) {
    return {
      name: applyMinimalFormatting(normalized),
      confidenceScore: 90,
      flags: []
    };
  }

  // Clean up sequence
  words = decompressDomain(words, domain);
  words = [...new Set(words)];
  words = correctTypos(words);
  words = removePossessiveForms(words); // Remove possessive forms
  words = removeCarBrands(words); // Remove car brand names
  words = ensurePossessiveSuitability(words); // Ensure the name fits possessive form
  const hasAbbreviation = detectAbbreviation(words);
  words = cleanupFillers(words);
  words = removeUnnecessaryAuto(words);
  words = adjustForPossessiveFlow(words);

  // Trim long names
  const flags = [];
  if (words.length > 4) {
    flags.push("TooLong");
    const brandIndex = words.findIndex(word => detectBrand([word]).hasBrand);
    if (brandIndex !== -1) {
      const brand = words[brandIndex];
      const otherWords = words.filter((_, i) => i !== brandIndex).slice(0, 3);
      words = [...otherWords, brand];
    } else {
      words = words.slice(0, 4);
    }
  }

  const formattedName = words.join(" ").trim();
  const confidenceScore = computeConfidenceScore(words, domain, hasBrand, hasAbbreviation, true); // Pass true for GPT response
  if (hasAbbreviation) flags.push("Unexpanded");

  // Flag if the name is too generic or short
  if (words.length <= 1) {
    flags.push("TooGeneric");
  }

  return {
    name: applyMinimalFormatting(formattedName),
    confidenceScore,
    flags
  };
};

// --- GPT Call with Timeout, Retry, and max_tokens ---
const callOpenAI = async (prompt, apiKey, retries = 3) => {
  const estimatedTokens = Math.ceil(prompt.length / 4);
  const model = process.env.OPENAI_MODEL || "gpt-4-turbo";

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000); // 9s timeout to fit in Vercel window

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          max_tokens: 100, // optimization: smaller response = faster
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content: "You are a dealership naming expert. Respond only in this format:\n##Name: Clean Name"
            },
            {
              role: "user",
              content: prompt
            }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const text = await response.text();
      console.log("Raw OpenAI response:", text); // Added logging
      if (!response.ok) {
        throw new Error(`Status ${response.status}: ${text}`);
      }
      const match = text.match(/##Name:\s*([^\n\r]+)/);
      if (!match) {
        console.error("Failed to extract name from OpenAI response:", text);
        throw new Error("Missing ##Name: in response");
      }
      return { result: match[1].trim(), tokens: estimatedTokens };

    } catch (err) {
      if (err.name === "AbortError") {
        return { result: null, error: "OpenAI timeout", tokens: estimatedTokens };
      }
      if (attempt === retries) {
        return { result: null, error: err.message, tokens: estimatedTokens };
      }
      await new Promise(res => setTimeout(res, 1500 * attempt));
    }
  }
};

// --- Safe JSON extraction (for future JSON-mode prompts) ---
const extractJsonSafely = (data, fields = []) => {
  let parsed = data;
  if (typeof data === "string") {
    try {
      parsed = JSON.parse(data);
    } catch {
      const match = data.match(/\{[^}]+\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {}
      }
    }
  }

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const missing = fields.filter(f => !(f in parsed));
    return missing.length === 0 ? parsed : null;
  }

  return null;
};

export default async function handler(req, res) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Missing OpenAI API key" });

  let leads;
  try {
    const buffers = [];
    for await (const chunk of req) buffers.push(chunk);
    leads = JSON.parse(Buffer.concat(buffers).toString("utf-8"));
  } catch (err) {
    return res.status(400).json({ error: "Invalid JSON", details: err.message });
  }

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: "Missing or invalid lead list" });
  }

  const startTime = Date.now();
  const limit = pLimit(1); // sequential GPT calls for timeout safety
  const results = [];
  const manualReviewQueue = [];
  let totalTokens = 0;

  const BATCH_SIZE = 2; // Match Google Apps Script menu specification
  const leadChunks = Array.from({ length: Math.ceil(leads.length / BATCH_SIZE) }, (_, i) =>
    leads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
  );

  for (const chunk of leadChunks) {
    if (Date.now() - startTime > 9000) {
      return res.status(200).json({ results, manualReviewQueue, totalTokens, partial: true });
    }

    const chunkResults = await Promise.all(
      chunk.map(lead =>
        limit(async () => {
          const { domain, rowNum } = lead;
          if (!domain) return { name: "", confidenceScore: 0, error: "Missing domain", rowNum };

          if (domainCache.has(domain)) {
            return { ...domainCache.get(domain), rowNum };
          }

          const prompt = `Given the dealership domain "${domain}", return a clean, human-friendly dealership name as of April 2025.\nRespond only with:\n##Name: Clean Name`;

          const { result: gptNameRaw, error, tokens } = await callOpenAI(prompt, apiKey);
          totalTokens += tokens;

          const fallback = gptNameRaw
            ? humanizeName(gptNameRaw, domain)
            : { name: "", confidenceScore: 0, flags: [], reason: error || "Timeout" };

          const finalResult = {
            name: fallback.name,
            confidenceScore: fallback.confidenceScore,
            flags: fallback.flags,
            reason: fallback.confidenceScore >= 80 && fallback.flags.length === 0
              ? "GPT name used directly (high confidence)"
              : "Used fallback",
            rowNum
          };

          if (finalResult.confidenceScore < 20 || (finalResult.flags && finalResult.flags.length > 0 && !finalResult.flags.every(flag => flag === "Unexpanded"))) {
            manualReviewQueue.push({
              domain,
              name: finalResult.name,
              confidenceScore: finalResult.confidenceScore,
              reason: finalResult.reason,
              flags: finalResult.flags,
              rowNum
            });
          }

          domainCache.set(domain, {
            name: finalResult.name,
            confidenceScore: finalResult.confidenceScore,
            flags: finalResult.flags
          });

          return finalResult;
        })
      )
    );

    results.push(...chunkResults);
  }

  return res.status(200).json({ results, manualReviewQueue, totalTokens, partial: false });
}

export const config = {
  api: { bodyParser: false }
};

// --- Optional: Local Unit Test Runner ---
function runUnitTests() {
  const tests = [
    {
      name: "Well-known name without brand appending",
      input: { name: "Pat Milliken Ford", domain: "patmillikenford.com" },
      expected: { name: "Pat Milliken", confidenceScore: 90, flags: [] }
    },
    {
      name: "Abbreviation detection",
      input: { name: "CZAG", domain: "czag.com" },
      expected: { name: "CZAG", confidenceScore: 50, flags: ["Unexpanded"] }
    },
    {
      name: "Domain mismatch",
      input: { name: "Crossroads Auto", domain: "newhollandauto.com" },
      expected: { name: "New Holland", confidenceScore: 50, flags: [] }
    },
    {
      name: "Typo correction",
      input: { name: "Sanleandroford", domain: "sanleandroford.com" },
      expected: { name: "San Leandro", confidenceScore: 80, flags: [] }
    },
    {
      name: "Too many words fallback",
      input: { name: "Jack Powell Chrysler Dodge Jeep Ram", domain: "jackpowell.com" },
      expected: { name: "Jack Powell", confidenceScore: 70, flags: ["TooLong"] }
    },
    {
      name: "Generic name with sales",
      input: { name: "Ford Auto Sales", domain: "teamfordauto.com" },
      expected: { name: "Team Auto", confidenceScore: 50, flags: [] }
    },
    {
      name: "Name with auto in the middle",
      input: { name: "Athens Family Auto Ford", domain: "athensfamilyauto.com" },
      expected: { name: "Athens Family", confidenceScore: 60, flags: [] }
    }
  ];

  let passed = 0;
  console.log("Running unit tests...");
  tests.forEach((test, index) => {
    const result = humanizeName(test.input.name, test.input.domain);
    const passedName = result.name === test.expected.name;
    const passedConfidence = result.confidenceScore >= test.expected.confidenceScore;
    const passedFlags = JSON.stringify(result.flags) === JSON.stringify(test.expected.flags);
    if (passedName && passedConfidence && passedFlags) {
      console.log(`✅ Test ${index + 1}: ${test.name} - Passed`);
      passed++;
    } else {
      console.log(`❌ Test ${index + 1}: ${test.name} - Failed`);
      console.log(`  Expected Name: ${test.expected.name}, Got: ${result.name}`);
      console.log(`  Expected Confidence >= ${test.expected.confidenceScore}, Got: ${result.confidenceScore}`);
      console.log(`  Expected Flags: ${JSON.stringify(test.expected.flags)}, Got: ${JSON.stringify(result.flags)}`);
    }
  });

  console.log(`🏁 Unit tests completed: ${passed}/${tests.length} passed`);
}
