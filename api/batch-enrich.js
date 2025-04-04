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

// Cache and library
const domainCache = new Map();
const KNOWN_NAMES = new Map([
  ["patmillikenford.com", "Pat Milliken"],
  ["duvalauto.com", "Duval"],
  ["mclartydanielford.com", "McLarty Daniel"]
]);

const COMMON_WORDS = [
  "llc", "inc", "corporation", "corp",
  "plaza", "superstore", "mall", "center", "group", "dealership", "sales",
  "auto", "motors", "motor", "automotive", "shop"
];

const CAR_BRANDS = [
  "ford", "toyota", "bmw", "chevrolet", "gmc", "lexus", "mercedes", "benz",
  "honda", "nissan", "hyundai", "kia", "volkswagen", "audi", "porsche", "subaru"
];

// List of known proper nouns (e.g., cities) that should not be flagged for PossessiveAmbiguity
const KNOWN_PROPER_NOUNS = [
  "athens", "crossroads", "dallas", "houston", "paris", "memphis", "nashville"
];

// Normalize text
const normalizeText = (name) => {
  if (!name || typeof name !== "string") return [];
  return name
    .replace(/['".,-]+/g, '')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(word => word && !COMMON_WORDS.includes(word));
};

// Capitalize
const capitalizeName = (words) => {
  return words
    .map((word, i) => {
      if (["of", "the", "to"].includes(word.toLowerCase()) && i !== 0) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ")
    .replace(/Mccarthy/g, "McCarthy")
    .replace(/Mclarty/g, "McLarty");
};

// Extract domain words
const extractDomainWords = (domain) => {
  return domain
    .replace(/\.com$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/\s+/)
    .filter(word => word && !COMMON_WORDS.includes(word.toLowerCase()));
};

// Check for car brand
const containsCarBrand = (name) => {
  const words = name.toLowerCase().split(/\s+/);
  return words.some(word => CAR_BRANDS.includes(word));
};

// Remove car brands
const removeCarBrands = (words) => {
  return words.filter(word => !CAR_BRANDS.includes(word.toLowerCase()));
};

// Check possessive fit
const fitsPossessive = (name) => {
  const lastWord = name.split(/\s+/).pop().toLowerCase();
  return !["motors", "sales", "auto"].includes(lastWord);
};

// Check for "s" ending
const endsWithS = (name) => {
  return name.toLowerCase().endsWith("s");
};

// Humanize name
const humanizeName = (inputName, domain) => {
  let words = normalizeText(inputName || domain);
  const domainWords = extractDomainWords(domain);
  
  console.log(`Before brand removal for ${domain}: ${words.join(" ")}`);
  words = removeCarBrands(words);
  console.log(`After brand removal for ${domain}: ${words.join(" ")}`);
  
  words = words.filter(word => word.length > 2 || /^[A-Z]{2,}$/.test(word));
  if (words.length > 3) words = words.slice(0, 3);
  if (words.length === 0) words = domainWords.slice(0, 2);

  let name = capitalizeName(words);
  const flags = [];
  
  if (words.length === 1 && words[0].length <= 3) flags.push("TooGeneric");
  if (/^[A-Z]{2,}$/.test(words[0])) flags.push("Unexpanded");
  if (containsCarBrand(name)) flags.push("BrandIncluded");
  if (endsWithS(name) && !KNOWN_PROPER_NOUNS.includes(name.toLowerCase())) flags.push("PossessiveAmbiguity");

  const confidenceScore = computeConfidenceScore(name, domain, flags);
  return { name, confidenceScore, flags };
};

// Confidence scoring
const computeConfidenceScore = (name, domain, flags) => {
  let score = 50;
  const domainWords = extractDomainWords(domain).map(w => w.toLowerCase());
  const nameWords = name.toLowerCase().split(/\s+/);

  if (domainWords.some(dw => nameWords.some(nw => nw.includes(dw) && nw.length > 3))) score += 30;
  if (nameWords.length === 1) score += 20;
  else if (nameWords.length === 2) score += 10;
  else if (nameWords.length > 3) score -= 10;
  if (!containsCarBrand(name)) score += 10;
  if (fitsPossessive(name)) score += 10;

  if (flags.includes("TooGeneric")) score -= 20;
  if (flags.includes("Unexpanded")) score -= 10;
  if (flags.includes("BrandIncluded")) score -= 10;
  if (flags.includes("PossessiveAmbiguity")) score -= 10;

  return Math.max(10, Math.min(100, score));
};

// OpenAI call
const callOpenAI = async (prompt, apiKey, retries = 3) => {
  const model = process.env.OPENAI_MODEL || "gpt-4-turbo";
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          max_tokens: 50,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: "You are a dealership naming expert. Respond only in this format:\n##Name: Clean Name\nGiven the dealership domain \"${domain}\", return the clean, natural dealership name already in use. Do not invent or add suffixes like \"Plaza\", \"Gallery\", \"Superstore\", \"Mall\", or \"Center\" unless they are actually part of the business name. Never include a car brand name in the name (e.g., Ford, Toyota, BMW, Chevrolet, GMC, Lexus, Mercedes-Benz, etc.) unless unavoidable and the only identifiers are a city and car brand. For names ending in 's', prefer the singular form (e.g., 'Stan' over 'Stans') unless the plural is clearly intentional (e.g., 'Crossroads')."
            },
            { role: "user", content: prompt }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const text = await response.text();
      console.log(`OpenAI response (attempt ${attempt}): ${text}`);

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);
      const match = text.match(/##Name:\s*([^\n\r]+)/);
      if (!match) throw new Error("Invalid response format");
      
      return { result: match[1].trim(), tokens: Math.ceil(prompt.length / 4) };
    } catch (err) {
      console.error(`OpenAI error (attempt ${attempt}): ${err.message}`);
      if (err.name === "AbortError") return { result: null, error: "Timeout", tokens: 0 };
      if (attempt === retries) return { result: null, error: err.message, tokens: 0 };
      await new Promise(res => setTimeout(res, 1000 * attempt));
    }
  }
};

// Main handler
export default async function handler(req, res) {
  console.log("batch-enrich.js Version 1.4 - Updated 2025-04-03");
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Missing OpenAI API key" });

  let leads;
  try {
    const buffers = [];
    for await (const chunk of req) buffers.push(chunk);
    leads = JSON.parse(Buffer.concat(buffers).toString("utf-8"));
  } catch (err) {
    console.error(`JSON parse error: ${err.message}`);
    return res.status(400).json({ error: "Invalid JSON", details: err.message });
  }

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: "Missing or invalid lead list" });
  }

  const startTime = Date.now();
  const limit = pLimit(1);
  const results = [];
  const manualReviewQueue = [];
  let totalTokens = 0;

  const BATCH_SIZE = 3;
  const leadChunks = Array.from({ length: Math.ceil(leads.length / BATCH_SIZE) }, (_, i) =>
    leads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
  );

  for (const chunk of leadChunks) {
    if (Date.now() - startTime > 30000) {
      console.log("Partial response due to timeout");
      return res.status(200).json({ results, manualReviewQueue, totalTokens, partial: true });
    }

    const chunkResults = await Promise.all(
      chunk.map(lead => limit(async () => {
        const { domain, rowNum, email, phone, firstName, lastName } = lead;
        if (!domain) {
          console.error(`Row ${rowNum}: Missing domain`);
          return { name: "", confidenceScore: 0, flags: ["MissingDomain"], rowNum };
        }

        if (KNOWN_NAMES.has(domain)) {
          const name = KNOWN_NAMES.get(domain);
          console.log(`Row ${rowNum}: Library hit - ${name}`);
          return { name, confidenceScore: 100, flags: [], rowNum };
        }

        if (domainCache.has(domain)) {
          console.log(`Row ${rowNum}: Cache hit for ${domain}`);
          return { ...domainCache.get(domain), rowNum };
        }

        const prompt = `Given the dealership domain "${domain}", return the clean, natural dealership name already in use.`;
        const { result: gptNameRaw, error, tokens } = await callOpenAI(prompt, apiKey);
        totalTokens += tokens;

        let finalResult;
        if (gptNameRaw && !error) {
          const nameWords = normalizeText(gptNameRaw);
          const lastWord = nameWords[nameWords.length - 1]?.toLowerCase();
          const forbiddenSuffixes = ["plaza", "superstore", "gallery", "mall", "center", "sales", "group", "dealership"];
          if (forbiddenSuffixes.includes(lastWord)) {
            console.warn(`⚠️ GPT added forbidden suffix in "${gptNameRaw}": ${lastWord} → removing`);
            nameWords.pop();
          }
          const gptName = nameWords.join(" ");
          finalResult = humanizeName(gptName, domain);
          console.log(`Row ${rowNum}: GPT result - ${JSON.stringify(finalResult)}`);
        } else {
          finalResult = humanizeName(domain, domain);
          finalResult.flags.push("GPTFailed");
          console.error(`Row ${rowNum}: GPT failed - ${error}`);
        }

        if (finalResult.confidenceScore < 30 || 
            finalResult.flags.includes("TooGeneric") || 
            (finalResult.flags.includes("PossessiveAmbiguity") && finalResult.confidenceScore < 80)) {
          console.log(`Row ${rowNum} flagged for review: ${JSON.stringify(finalResult)} - Reason: ${finalResult.flags.includes("PossessiveAmbiguity") ? "Name ends in 's'" : "Low confidence or generic"}`);
          manualReviewQueue.push({ 
            domain, 
            name: finalResult.name, 
            confidenceScore: finalResult.confidenceScore, 
            flags: finalResult.flags, 
            rowNum,
            reason: finalResult.flags.includes("PossessiveAmbiguity") ? "Name ends in 's', possessive form unclear" : 
                    finalResult.flags.includes("BrandIncluded") ? "Possible city-brand combo" : "Low confidence or generic",
            email,
            phone,
            firstName,
            lastName
          });
          finalResult = { name: "", confidenceScore: 0, flags: ["Skipped"], rowNum };
        }

        domainCache.set(domain, {
          name: finalResult.name,
          confidenceScore: finalResult.confidenceScore,
          flags: finalResult.flags
        });

        return { ...finalResult, rowNum };
      }))
    );

    results.push(...chunkResults);
  }

  console.log(`Completed: ${results.length} results, ${manualReviewQueue.length} for review`);
  return res.status(200).json({ results, manualReviewQueue, totalTokens, partial: false });
};

export const config = { api: { bodyParser: false } };

// Unit Tests
function runUnitTests() {
  const tests = [
    { input: { name: "Pat Milliken Ford", domain: "patmillikenford.com" }, expected: { name: "Pat Milliken", confidenceScore: 100, flags: [] } },
    { input: { name: "Duval LLC", domain: "duvalauto.com" }, expected: { name: "Duval", confidenceScore: 100, flags: [] } },
    { input: { name: "Toyota Redlands", domain: "toyotaredlands.com" }, expected: { name: "Redlands", confidenceScore: 70, flags: [] } },
    { input: { name: "Crossroads Ford", domain: "crossroadsford.com" }, expected: { name: "", confidenceScore: 0, flags: ["Skipped"] } },
    { input: { name: "Duval Ford", domain: "duvalford.com" }, expected: { name: "Duval", confidenceScore: 70, flags: [] } },
    { input: { name: "Athens Ford", domain: "athensford.com" }, expected: { name: "Athens", confidenceScore: 70, flags: [] } },
    { input: { name: "Team Ford", domain: "teamford.com" }, expected: { name: "Team", confidenceScore: 70, flags: [] } },
    { input: { name: "Smith Motor Shop", domain: "smithmotorshop.com" }, expected: { name: "Smith", confidenceScore: 70, flags: [] } }
  ];

  let passed = 0;
  console.log("Running unit tests...");
  tests.forEach((test, i) => {
    const result = humanizeName(test.input.name, test.input.domain);
    const passName = result.name === test.expected.name;
    const passScore = result.confidenceScore >= test.expected.confidenceScore;
    const passFlags = JSON.stringify(result.flags) === JSON.stringify(test.expected.flags);
    
    if (passName && passScore && passFlags) {
      console.log(`✅ Test ${i + 1}: Passed`);
      passed++;
    } else {
      console.log(`❌ Test ${i + 1}: Failed - Expected: ${JSON.stringify(test.expected)}, Got: ${JSON.stringify(result)}`);
    }
  });
  console.log(`🏁 ${passed}/${tests.length} passed`);
}

if (process.env.NODE_ENV === "test") runUnitTests();
