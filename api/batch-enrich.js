// ✅ FULL VERSION OF batch-enrich.js WITH FALLBACKS, CITY/BRAND DETECTION, TYPOS, FLAGS, REVIEW QUEUE

// --- Rate Limiting ---
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

// --- Cache & Brand/City Constants ---
const domainCache = new Map();
const BRANDS = [
  "chevrolet", "gmc", "cadillac", "buick", "ford", "lincoln", "chrysler",
  "dodge", "jeep", "ram", "tesla", "rivian", "lucid", "honda", "nissan",
  "hyundai", "kia", "bmw", "mercedes", "benz", "subaru", "toyota", "vw",
  "lexus", "infiniti"
];
const STATES = ["alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho", "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana", "maine", "maryland", "massachusetts", "michigan", "minnesota", "mississippi", "missouri", "montana", "nebraska", "nevada", "new hampshire", "new jersey", "new mexico", "new york", "north carolina", "north dakota", "ohio", "oklahoma", "oregon", "pennsylvania", "rhode island", "south carolina", "south dakota", "tennessee", "texas", "utah", "vermont", "virginia", "washington", "west virginia", "wisconsin", "wyoming"];
const COMMON_WORDS = ["pat", "gus", "san", "team", "town", "east", "west", "north", "south", "auto", ...STATES];

// --- Normalize text ---
const normalizeText = (name) => {
  if (!name || typeof name !== "string") return [];
  let result = name.replace(/^"|"$/g, '');
  let words = result.toLowerCase().trim().split(/\s+/);
  if (words[0] === "the") words.shift();
  return words;
};

// --- Brand Detection (from array of words) ---
const detectBrand = (words) => {
  const brand = words.find(word => BRANDS.includes(word.toLowerCase()));
  return { hasBrand: !!brand, brand };
};

// --- Memoized Levenshtein Distance for typo correction ---
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

// --- Typo Correction (city detection only) ---
const correctTypos = (words) => {
  const cache = new Map();
  const CITIES = ["houston", "chicago", "phoenix", "dallas", "austin", "atlanta", "miami", "tampa", "orlando", "jacksonville", "losangeles", "newyork", "charlotte"];
  const cityDisplay = { "losangeles": "Los Angeles", "newyork": "New York", "fortlauderdale": "Fort Lauderdale", "westpalmbeach": "West Palm Beach" };
  return words.map(word => {
    const normalized = word.toLowerCase().replace(/\s+/g, '');
    const closestMatch = CITIES.reduce((best, city) => {
      const dist = levenshteinDistance(normalized, city, cache);
      return (dist < best.distance && dist <= 2)
        ? { city, distance: dist }
        : best;
    }, { city: null, distance: Infinity });
    return closestMatch.city ? (cityDisplay[closestMatch.city] || capitalize(closestMatch.city)) : word;
  });
};

// --- Domain decompression (splits things like 'jackpowelltoyota') ---
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

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

// --- Final formatting with casing, brand/city fixes ---
const applyMinimalFormatting = (name) => {
  let result = name
    .replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1))
    .replace(/Mccarthy/g, "McCarthy")
    .replace(/Mclarty/g, "McLarty")
    .replace(/Bmw/g, "BMW")
    .replace(/Vw/g, "VW")
    .replace(/'s\b/gi, "'s")
    .replace(/([a-z])'S\b/gi, "$1's");

  return result;
};

// --- Cleanup helpers ---
const cleanupFillers = (words) => {
  const fillers = ["motors", "llc", "inc", "enterprise", "group", "dealership", "team"];
  return words.filter(word => !fillers.includes(word.toLowerCase())).map(word => word.replace(/^-/, ""));
};

const adjustForPossessiveFlow = (words) => {
  if (words.length > 1 && words[1].toLowerCase().endsWith("s") && words[1].toLowerCase() !== "cars") {
    words[1] = words[1].replace(/s$/, "");
  }
  return words;
};

const detectAbbreviation = (words) => {
  return words.some(word =>
    (/^[A-Z]{2,4}$/.test(word) ||
     /^[A-Z][a-z]+[A-Z][a-z]*$/.test(word) ||
     /^[A-Z][a-z]{1,2}$/.test(word) ||
     (!/^[a-z]+$/i.test(word) && !COMMON_WORDS.includes(word.toLowerCase()) && word.length > 3))
  );
};

const removeUnnecessaryAuto = (words) => {
  if (words[words.length - 1] === "auto" && words.length > 1) {
    const nameWithoutAuto = words.slice(0, -1).join(" ").toLowerCase();
    const keepAuto = ["pat milliken", "penske auto", "union park", "tasca auto", "jt auto"].some(n => nameWithoutAuto.includes(n));
    if (!keepAuto) words = words.slice(0, -1);
  }
  return words;
};

// --- Scoring ---
const computeConfidenceScore = (words, domain, hasBrand, hasAbbreviation) => {
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

  const wellKnownNames = ["pat milliken", "union park", "tasca auto", "jt auto"];
  const nameStr = nameWords.join(" ");
  score += wellKnownNames.includes(nameStr) ? 10 : 0;

  return Math.min(score, 100);
};

// --- Full Fallback Cleanup Logic ---
const humanizeName = (name, domain) => {
  let words = normalizeText(name);
  const { hasBrand } = detectBrand(words);

  // Known safe names
  const wellKnownNames = ["pat milliken", "union park", "tasca auto", "jt auto"];
  const normalizedName = words.join(" ").toLowerCase();
  if (wellKnownNames.includes(normalizedName) && !hasBrand) {
    return {
      name: applyMinimalFormatting(normalizedName),
      confidenceScore: 90,
      flags: []
    };
  }

  // Decompress domain for pattern match
  words = decompressDomain(words, domain);
  words = [...new Set(words)]; // Deduplicate
  words = correctTypos(words);
  const hasAbbreviation = detectAbbreviation(words);
  words = cleanupFillers(words);
  words = removeUnnecessaryAuto(words);
  words = adjustForPossessiveFlow(words);

  // Enforce 4-word limit
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

  // Final cleanup & scoring
  const cleanedName = words.join(" ").replace(/\s+/g, " ").trim();
  const confidenceScore = computeConfidenceScore(words, domain, hasBrand, hasAbbreviation);
  if (hasAbbreviation) flags.push("Unexpanded");

  return {
    name: applyMinimalFormatting(cleanedName),
    confidenceScore,
    flags
  };
};

// --- OpenAI Call Logic with Timeout + Retry + Safety ---
const callOpenAI = async (prompt, apiKey, retries = 3) => {
  const estimatedTokens = Math.ceil(prompt.length / 4);
  const model = process.env.OPENAI_MODEL || "gpt-4-turbo";

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You are a dealership naming expert with deep familiarity with U.S. auto dealerships. Respond with: ##Name: Clean Name" },
            { role: "user", content: prompt }
          ],
          temperature: 0.3
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const text = await response.text();

      if (!response.ok) {
        throw new Error(`Status ${response.status}: ${text}`);
      }

      const match = text.match(/##Name:\s*(.+)/);
      if (!match || !match[1]) {
        throw new Error("Missing ##Name: in GPT output");
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

export default async function handler(req, res) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Missing OpenAI API key" });

  const startTime = Date.now();
  const limit = pLimit(1);
  const manualReviewQueue = [];
  const results = [];
  let totalTokens = 0;

  let leads;
  try {
    const buffers = [];
    for await (const chunk of req) buffers.push(chunk);
    const raw = Buffer.concat(buffers).toString("utf-8");
    leads = JSON.parse(raw);
  } catch (err) {
    return res.status(400).json({ error: "Invalid request body", details: err.message });
  }

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: "Missing or invalid lead list" });
  }

  const BATCH_SIZE = 2;
  const leadChunks = Array.from({ length: Math.ceil(leads.length / BATCH_SIZE) }, (_, i) =>
    leads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
  );

  for (const chunk of leadChunks) {
    if (Date.now() - startTime > 9500) {
      console.warn("⏳ Timeout guard hit. Returning partial response.");
      return res.status(200).json({ results, manualReviewQueue, totalTokens, partial: true });
    }

    const chunkResults = await Promise.all(chunk.map(lead =>
      limit(async () => {
        const { domain, rowNum } = lead;
        if (!domain) return { name: "", confidenceScore: 0, error: "Missing domain", rowNum };

        if (domainCache.has(domain)) {
          return { ...domainCache.get(domain), rowNum };
        }

        const prompt = `Given the dealership domain "${domain}", return a clean, human-friendly dealership name as of April 2025. Respond in this format:\n##Name: [Clean Name]`;
        const { result: gptNameRaw, error, tokens } = await callOpenAI(prompt, apiKey);
        totalTokens += tokens;

        let fallback = { name: "", confidenceScore: 0, flags: [], reason: error || "No result" };

        if (gptNameRaw) {
          fallback = humanizeName(gptNameRaw, domain);
          if (fallback.confidenceScore >= 80 && fallback.flags.length === 0) {
            fallback.name = applyMinimalFormatting(gptNameRaw);
            fallback.reason = "GPT name used directly (high confidence)";
          } else {
            fallback.reason = "Used fallback (low confidence or flagged)";
          }
        }

        const result = {
          ...fallback,
          rowNum,
          modelUsed: "gpt-4-turbo"
        };

        if (result.confidenceScore < 80 || result.flags.length > 0) {
          manualReviewQueue.push({
            domain,
            name: result.name,
            confidenceScore: result.confidenceScore,
            reason: result.reason
          });
        }

        domainCache.set(domain, { name: result.name, confidenceScore: result.confidenceScore, flags: result.flags });
        return result;
      })
    ));

    results.push(...chunkResults);
  }

  return res.status(200).json({ results, manualReviewQueue, totalTokens, partial: false });
}

export const config = {
  api: { bodyParser: false }
};

// --- Unit Test Suite (optional) ---
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
      expected: { name: "CZAG Auto", confidenceScore: 50, flags: ["Unexpanded"] }
    },
    {
      name: "Domain mismatch",
      input: { name: "Crossroads Auto", domain: "newhollandauto.com" },
      expected: { name: "New Holland Auto", confidenceScore: 50, flags: [] }
    },
    {
      name: "Typo correction",
      input: { name: "Sanleandroford", domain: "sanleandroford.com" },
      expected: { name: "San Leandro Ford", confidenceScore: 80, flags: [] }
    },
    {
      name: "Too many words with fallback",
      input: { name: "Jack Powell Chrysler Dodge Jeep Ram", domain: "jackpowell.com" },
      expected: { name: "Jack Powell Chrysler", confidenceScore: 70, flags: ["TooLong"] }
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

  console.log(`✅ Unit tests completed: ${passed}/${tests.length} passed`);
}

runUnitTests();
