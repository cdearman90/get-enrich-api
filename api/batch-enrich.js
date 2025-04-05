// api/batch-enrich.js (Version 3.4 - Updated 2025-04-05)
import { humanizeName, CAR_BRANDS, COMMON_WORDS, normalizeText } from "../lib/humanize.js";

const VERCEL_API_BASE_URL = "https://get-enrich-api-git-main-show-revv.vercel.app";
const VERCEL_API_ENRICH_FALLBACK_URL = `${VERCEL_API_BASE_URL}/api/batch-enrich-company-name-fallback`;

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
  ["patmillikenford.com", { name: "Pat Milliken", confidenceScore: 100 }],
  ["duvalauto.com", { name: "Duval", confidenceScore: 100 }],
  ["karlchevroletstuart.com", { name: "Karl Stuart", confidenceScore: 100 }],
  ["gychevy.com", { name: "Gregg Young", confidenceScore: 100 }]
]);

// Normalize domain for matching
const normalizeDomain = (domain) => {
  try {
    return domain
      .replace(/\.com$/, "")
      .replace(/(ford|auto|chevrolet|toyota|bmw)/gi, "")
      .toLowerCase()
      .trim();
  } catch (err) {
    console.error(`Error normalizing domain ${domain}: ${err.message}`);
    return domain.toLowerCase().replace(/\.com$/, "");
  }
};

// Fuzzy match domain against known domains
const fuzzyMatchDomain = (inputDomain, knownDomains) => {
  try {
    const normalizedInput = normalizeDomain(inputDomain);
    for (const knownDomain of knownDomains) {
      const normalizedKnown = normalizeDomain(knownDomain);
      if (normalizedInput === normalizedKnown) return knownDomain;
      if (normalizedInput.includes(normalizedKnown) || normalizedKnown.includes(normalizedInput)) {
        return knownDomain;
      }
    }
    return null;
  } catch (err) {
    console.error(`Error fuzzy matching domain ${inputDomain}: ${err.message}`);
    return null;
  }
};

// Fetch website metadata
const fetchWebsiteMetadata = async (domain) => {
  try {
    const response = await fetch(`https://${domain}`, {
      redirect: "follow",
      timeout: 5000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
      }
    });
    const html = await response.text();
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    return {
      title: titleMatch ? titleMatch[1] : "",
      description: metaMatch ? metaMatch[1] : "",
      redirectedDomain: response.url,
      html // Pass HTML for logo extraction
    };
  } catch (err) {
    console.error(`Failed to fetch metadata for ${domain}: ${err.message}`);
    if (err.message.includes("CERT") || err.message.includes("SSL")) {
      try {
        const httpResponse = await fetch(`http://${domain}`, {
          redirect: "follow",
          timeout: 5000,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
          }
        });
        const httpHtml = await httpResponse.text();
        const httpTitleMatch = httpHtml.match(/<title>([^<]+)<\/title>/i);
        const httpMetaMatch = httpHtml.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
        return {
          title: httpTitleMatch ? httpTitleMatch[1] : "",
          description: httpMetaMatch ? httpMetaMatch[1] : "",
          redirectedDomain: httpResponse.url,
          html: httpHtml,
          sslError: true
        };
      } catch (httpErr) {
        console.error(`HTTP fallback failed for ${domain}: ${httpErr.message}`);
        return { title: "", description: "", redirectedDomain: domain, sslError: true };
      }
    }
    return { title: "", description: "", redirectedDomain: domain, error: err.message };
  }
};

// Extract logo text
const extractLogoText = async (domain, html) => {
  try {
    if (!html) return "No logo text available";
    const logoMatch = html.match(/<img[^>]+class=["']logo["'][^>]+src=["']([^"']+)["']/i);
    if (!logoMatch) return "No logo text available";

    const logoUrl = logoMatch[1];
    const altMatch = html.match(/<img[^>]+class=["']logo["'][^>]+alt=["']([^"']+)["']/i);
    let logoText = altMatch ? altMatch[1] : logoUrl.split('/').pop().replace(/[-_]/g, " ").replace(/\.(png|jpg|jpeg|gif)$/i, "").trim();

    for (let brand of CAR_BRANDS) {
      logoText = logoText.toLowerCase().replace(brand, "").trim();
    }
    return logoText || "No logo text available";
  } catch (err) {
    console.error(`Failed to extract logo text for ${domain}: ${err.message}`);
    return "No logo text available";
  }
};

// OpenAI call for meta+logo-based enrichment
const callOpenAIForMeta = async (domain, metadata, logoText, apiKey) => {
  const model = process.env.OPENAI_MODEL || "gpt-4-turbo";
  const prompt = `Given the dealership domain "${domain}" (redirected to "${metadata.redirectedDomain}"), and the following metadata:
  Title: "${metadata.title}"
  Description: "${metadata.description}"
  Logo Text: "${logoText}"
  Extract the clean, natural dealership name already in use. Prioritize the logo text over the meta title for identifying the dealership name, as the logo often contains the parent company or true dealership name. If the logo text is unavailable or ambiguous, fall back to the meta title. If the original domain "${domain}" contains a generic word paired with a car brand (e.g., "classicbmw.com" for "Classic BMW"), preserve that name if it matches the meta title or logo text. Prefer multi-word names that include a proper name and are suitable for possessive form. Avoid returning generic names like "Classic" unless they are part of a proper dealership name (e.g., "Classic Dallas"). Avoid including brand names like Ford unless they are part of the dealership name. Do not return a city-only name unless no other proper name is found. If the name is a car brand or too generic, you may append "Auto" or "Auto Group" only if those suffixes are present in the meta title or logo text.`;

  for (let attempt = 1; attempt <= 3; attempt++) {
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
              content: "You are a dealership naming expert. Respond only in this format:\n##Name: Clean Name\nExtract the dealership name from the provided metadata and logo text. Do not invent names or add car brands unless unavoidable."
            },
            { role: "user", content: prompt }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const text = await response.text();
      console.log(`OpenAI meta response (attempt ${attempt}): ${text}`);

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);
      const match = text.match(/##Name:\s*([^\n\r]+)/);
      if (!match) throw new Error("Invalid response format");

      return { result: match[1].trim(), tokens: Math.ceil(prompt.length / 4) };
    } catch (err) {
      console.error(`OpenAI meta error (attempt ${attempt}): ${err.message}`);
      if (err.name === "AbortError") return { result: null, error: "Timeout", tokens: 0 };
      if (attempt === 3) return { result: null, error: err.message, tokens: 0 };
      await new Promise(res => setTimeout(res, 1000 * attempt));
    }
  }
};

// OpenAI call (initial)
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
              content: "You are a dealership naming expert. Respond only in this format:\n##Name: Clean Name\nGiven the dealership domain \"${prompt}\", return the clean, natural dealership name already in use. Do not invent or add suffixes like \"Plaza\", \"Gallery\", \"Superstore\", \"Mall\", or \"Center\" unless they are actually part of the business name. Never include a car brand name in the name (e.g., Ford, Toyota, BMW, Chevrolet, GMC, Lexus, Mercedes-Benz, etc.) unless unavoidable and the only identifiers are a city and car brand. For names ending in 's', prefer the singular form (e.g., 'Stan' over 'Stans') unless the plural is clearly intentional (e.g., 'Crossroads')."
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
  console.log("batch-enrich.js Version 3.4 - Updated 2025-04-05");
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("Missing OpenAI API key");
      return res.status(500).json({ error: "Missing OpenAI API key" });
    }

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
      console.error("Missing or invalid lead list");
      return res.status(400).json({ error: "Missing or invalid lead list" });
    }

    const startTime = Date.now();
    const limit = pLimit(1);
    const results = [];
    const manualReviewQueue = [];
    let totalTokens = 0;
    const fallbackTriggers = [];

    const BATCH_SIZE = 3;
    const leadChunks = Array.from({ length: Math.ceil(leads.length / BATCH_SIZE) }, (_, i) =>
      leads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    for (const chunk of leadChunks) {
      if (Date.now() - startTime > 30000) {
        console.log("Partial response due to timeout");
        return res.status(200).json({ results, manualReviewQueue, totalTokens, fallbackTriggers, partial: true });
      }

      const chunkResults = await Promise.all(
        chunk.map(lead => limit(async () => {
          const { domain, rowNum, email, phone, firstName, lastName } = lead;
          if (!domain) {
            console.error(`Row ${rowNum}: Missing domain`);
            return { name: "", confidenceScore: 0, flags: ["MissingDomain"], rowNum };
          }

          // Normalize and fuzzy match domain
          const matchedDomain = fuzzyMatchDomain(domain, KNOWN_NAMES.keys());
          if (matchedDomain && KNOWN_NAMES.has(matchedDomain)) {
            const entry = KNOWN_NAMES.get(matchedDomain);
            console.log(`Row ${rowNum}: Library hit - ${entry.name} (matched ${domain} to ${matchedDomain})`);
            return { name: entry.name, confidenceScore: entry.confidenceScore, flags: [], rowNum };
          }

          if (domainCache.has(domain)) {
            console.log(`Row ${rowNum}: Cache hit for ${domain}`);
            return { ...domainCache.get(domain), rowNum };
          }

          const prompt = `Given the dealership domain "${domain}", return the clean, natural dealership name already in use.`;
          let finalResult;
          let tokensUsed = 0;

          const { result: gptNameRaw, error, tokens } = await callOpenAI(prompt, apiKey);
          tokensUsed += tokens;
          totalTokens += tokens;

          if (gptNameRaw && !error) {
            finalResult = humanizeName(gptNameRaw, domain);
            console.log(`Row ${rowNum}: GPT result - ${JSON.stringify(finalResult)}`);
          } else {
            finalResult = humanizeName(domain, domain);
            finalResult.flags.push("GPTFailed");
            console.error(`Row ${rowNum}: GPT failed - ${error}`);
          }

          const needsMetaFallback = finalResult.confidenceScore < 60 || 
                                   finalResult.flags.includes("CityNameOnly") || 
                                   finalResult.flags.includes("TooGeneric") || 
                                   finalResult.flags.includes("BrandIncluded") || 
                                   finalResult.flags.includes("Unexpanded") || 
                                   finalResult.flags.includes("PossibleAbbreviation") || 
                                   finalResult.flags.includes("NotPossessiveFriendly") || 
                                   finalResult.flags.includes("GPTFailed") || 
                                   (finalResult.flags.includes("PossessiveAmbiguity") && finalResult.confidenceScore < 80) ||
                                   (finalResult.name.split(/\s+/).length === 1) ||
                                   (finalResult.name.length <= 5 && COMMON_WORDS.includes(finalResult.name.toLowerCase())) ||
                                   CAR_BRANDS.includes(finalResult.name.toLowerCase()) ||
                                   finalResult.name.toLowerCase().split(/\s+/).every(word => COMMON_WORDS.includes(word));

          if (needsMetaFallback) {
            const reason = finalResult.flags.includes("CityNameOnly") ? "CityNameOnly" :
                          finalResult.flags.includes("TooGeneric") ? "TooGeneric" :
                          finalResult.flags.includes("BrandIncluded") ? "BrandIncluded" :
                          finalResult.flags.includes("PossibleAbbreviation") ? "PossibleAbbreviation" :
                          finalResult.flags.includes("NotPossessiveFriendly") ? "NotPossessiveFriendly" :
                          finalResult.flags.includes("GPTFailed") ? "GPTFailed" :
                          "LowConfidence";
            console.log(`Row ${rowNum}: Triggering meta fallback - Reason: ${reason}`);
            const metaStartTime = Date.now();
            const metadata = await fetchWebsiteMetadata(domain);
            const logoText = await extractLogoText(domain, metadata.html);
            const metaResult = await callOpenAIForMeta(domain, metadata, logoText, apiKey);
            const metaDuration = Date.now() - metaStartTime;
            const accepted = !!metaResult.result && metaResult.result !== finalResult.name;
            tokensUsed += metaResult.tokens;
            totalTokens += metaResult.tokens;

            let sourcePreference = "unknown";
            if (metaResult.result && metaResult.result.toLowerCase().includes(logoText.toLowerCase())) {
              sourcePreference = "logo";
              finalResult.confidenceScore += 10;
            } else if (metaResult.result && metaResult.result.toLowerCase() === domain.replace(/\.com$/, "").toLowerCase()) {
              sourcePreference = "metaTitle";
              finalResult.confidenceScore -= 10;
            }
            fallbackTriggers.push({ rowNum, domain, reason, sourcePreference, duration: metaDuration, success: accepted });

            if (metadata.error || metadata.sslError) {
              console.log(`Row ${rowNum}: Failed to fetch metadata for ${domain}, sending to manual review`);
              manualReviewQueue.push({
                domain,
                name: finalResult.name,
                confidenceScore: finalResult.confidenceScore,
                flags: [...finalResult.flags, "MetaFetchFailed"],
                rowNum,
                reason: metadata.sslError ? "SSL certificate error" : "Failed to fetch metadata",
                email,
                phone,
                firstName,
                lastName
              });
              finalResult = { name: "", confidenceScore: 0, flags: ["Skipped"], rowNum };
            } else if (metaResult.result && accepted) {
              finalResult = humanizeName(metaResult.result, domain);
              finalResult.flags.push("FallbackUsed");
              console.log(`Row ${rowNum}: Meta fallback result - ${JSON.stringify(finalResult)}`);
            } else {
              finalResult.flags.push("MetaFallbackFailed");
              console.error(`Row ${rowNum}: Meta fallback failed`);
            }
          }

          if (finalResult.confidenceScore < 50 || 
              finalResult.flags.includes("TooGeneric") || 
              finalResult.flags.includes("PossibleAbbreviation") || 
              finalResult.flags.includes("NotPossessiveFriendly") || 
              (finalResult.flags.includes("PossessiveAmbiguity") && finalResult.confidenceScore < 80) ||
              finalResult.flags.includes("CityNameOnly")) {
            console.log(`Row ${rowNum} flagged for review: ${JSON.stringify(finalResult)} - Reason: ${finalResult.flags.includes("PossessiveAmbiguity") ? "Name ends in 's'" : finalResult.flags.includes("CityNameOnly") ? "City name only" : "Low confidence or generic"}`);
            manualReviewQueue.push({ 
              domain, 
              name: finalResult.name, 
              confidenceScore: finalResult.confidenceScore, 
              flags: finalResult.flags, 
              rowNum,
              reason: finalResult.flags.includes("PossessiveAmbiguity") ? "Name ends in 's', possessive form unclear" : 
                      finalResult.flags.includes("CityNameOnly") ? "City name only, needs verification" :
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

          console.log(`Final result for ${domain}: ${JSON.stringify(finalResult)}`);
          return { ...finalResult, rowNum, tokens: tokensUsed };
        }))
      );

      results.push(...chunkResults);
    }

    console.log(`Completed: ${results.length} results, ${manualReviewQueue.length} for review, ${fallbackTriggers.length} meta fallbacks triggered`);
    return res.status(200).json({ results, manualReviewQueue, totalTokens, fallbackTriggers, partial: false });
  } catch (err) {
    console.error(`Handler error: ${err.message}`);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};

export const config = { api: { bodyParser: false } };

// Unit Tests
function runUnitTests() {
  const tests = [
    { input: { name: "Pat Milliken Ford", domain: "patmillikenford.com" }, expected: { name: "Pat Milliken", confidenceScore: 100, flags: [] } },
    { input: { name: "Duval LLC", domain: "duvalauto.com" }, expected: { name: "Duval", confidenceScore: 100, flags: [] } },
    { input: { name: "Toyota Redlands", domain: "toyotaredlands.com" }, expected: { name: "Toyota Redlands", confidenceScore: 100, flags: ["CarBrandCityException"] } },
    { input: { name: "Crossroads Ford", domain: "crossroadsford.com" }, expected: { name: "Crossroads", confidenceScore: 100, flags: [] } },
    { input: { name: "Duval Ford", domain: "duvalford.com" }, expected: { name: "Duval", confidenceScore: 100, flags: [] } },
    { input: { name: "Athens Ford", domain: "athensford.com" }, expected: { name: "Ford Athens", confidenceScore: 100, flags: ["CarBrandCityException"] } },
    { input: { name: "Team Ford", domain: "teamford.com" }, expected: { name: "Team", confidenceScore: 100, flags: [] } },
    { input: { name: "Smith Motor Shop", domain: "smithmotorshop.com" }, expected: { name: "Smith", confidenceScore: 100, flags: [] } },
    { input: { name: "Karl Chevrolet Stuart", domain: "karlchevroletstuart.com" }, expected: { name: "Karl Stuart", confidenceScore: 100, flags: [] } },
    { input: { name: "Gychevy", domain: "gychevy.com" }, expected: { name: "Gregg Young", confidenceScore: 100, flags: [] } },
    { input: { name: "Bentley Auto", domain: "bentleyauto.com" }, expected: { name: "Bentley", confidenceScore: 100, flags: [] } },
    { input: { name: "Bentley Automotive", domain: "bentleyautomotive.com" }, expected: { name: "Bentley", confidenceScore: 100, flags: [] } },
    { input: { name: "Bentley Automotive Group", domain: "bentleyautomotivegroup.com" }, expected: { name: "Bentley", confidenceScore: 100, flags: [] } },
    { input: { name: "Bentley Motors", domain: "bentleymotors.com" }, expected: { name: "Bentley", confidenceScore: 100, flags: [] } },
    { input: { name: "Mbbhm", domain: "mbbhm.com" }, expected: { name: "MB Birmingham", confidenceScore: 100, flags: ["CarBrandCityException"] } },
    { input: { name: "Mbusa", domain: "mbusa.com" }, expected: { name: "MB USA", confidenceScore: 100, flags: [] } },
    { input: { name: "Classic BMW", domain: "classicbmw.com" }, expected: { name: "BMW Classic", confidenceScore: 100, flags: ["CarBrandCityException"] } },
    { input: { name: "Prime Honda", domain: "primehonda.com" }, expected: { name: "Prime", confidenceScore: 100, flags: [] } },
    { input: { name: "Elite Audi", domain: "eliteaudi.com" }, expected: { name: "Elite", confidenceScore: 100, flags: [] } },
    { input: { name: "Premier Toyota", domain: "premiertoyota.com" }, expected: { name: "Premier", confidenceScore: 100, flags: [] } },
    { input: { name: "Huntington Beach Ford", domain: "huntingtonbeachford.com" }, expected: { name: "Ford Huntington Beach", confidenceScore: 100, flags: ["CarBrandCityException"] } },
    { input: { name: "San Diego Ford", domain: "sandiegoford.com" }, expected: { name: "Ford San Diego", confidenceScore: 100, flags: ["CarBrandCityException"] } },
    { input: { name: "Miami BMW", domain: "miamibmw.com" }, expected: { name: "BMW Miami", confidenceScore: 100, flags: ["CarBrandCityException"] } },
    { input: { name: "Austin Toyota", domain: "austintoyota.com" }, expected: { name: "Toyota Austin", confidenceScore: 100, flags: ["CarBrandCityException"] } }
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
