// api/batch-enrich.js — Version 4.2.0 (Final)
// April 15, 2025 - Aligned with updated humanize.js and all OpenAI/fallback logic

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

const VERCEL_API_BASE_URL = "https://get-enrich-api-git-main-show-revv.vercel.app";
const FALLBACK_API_URL = `${VERCEL_API_BASE_URL}/api/batch-enrich-company-name-fallback`;
const FALLBACK_API_TIMEOUT_MS = parseInt(process.env.FALLBACK_API_TIMEOUT_MS, 10) || 6000;

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
    const data = JSON.parse(text);

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
  } catch (err) {
    console.error(`Fallback API failed: ${err.message}`);
    const local = await humanizeName(domain, domain, false, true);
    return {
      domain,
      companyName: local.name || "",
      confidenceScore: local.confidenceScore || 0,
      flags: [...(local.flags || []), "FallbackAPIFailed", "LocalFallbackUsed"],
      tokens: local.tokens || 0,
      rowNum,
      error: err.message
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
    req.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
};

export default async function handler(req, res) {
  try {
    console.log("🧠 batch-enrich.js v4.2.0 – Domain Processing Start");

  const raw = await streamToString(req);
  if (!raw) return res.status(400).json({ error: "Empty body" });
  const body = JSON.parse(raw);

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

  const BATCH_SIZE = 5;
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

        if (domainCache.has(domainKey)) {
          const cached = domainCache.get(domainKey);
          return { ...cached, rowNum, domain };
        }

        let finalResult;
        let tokensUsed = 0;

        const match = extractBrandOfCityFromDomain(domainKey);
        const brandDetected = match.brand || null;
        const cityDetected = match.city || null;

        try {
          finalResult = await humanizeName(domain, domain, false, true);
          tokensUsed = finalResult.tokens || 0;
        } catch (err) {
          console.error(`humanizeName error: ${err.message}`);
          finalResult = { name: "", confidenceScore: 0, flags: ["HumanizeError"], tokens: 0 };
        }

        // Check quality
        const criticalFlags = ["TooGeneric", "CityNameOnly", "FallbackFailed", "Skipped"];
        const isAcceptable = finalResult.confidenceScore >= 75 &&
          !finalResult.flags.some(f => criticalFlags.includes(f));


              if (isAcceptable) {
          domainCache.set(domainKey, {
            companyName: finalResult.name,
            confidenceScore: finalResult.confidenceScore,
            flags: finalResult.flags
          });
        } else {
          const primary = { ...finalResult };
          const fallback = await callFallbackAPI(domain, rowNum);

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
            tokensUsed += fallback.tokens || 0;
          } else {
            finalResult.flags.push("FallbackAPIFailed");
            fallbackTriggers.push({
              domain,
              rowNum,
              reason: "FallbackAPIFailed",
              details: {
                primary: {
                  name: primary.name,
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

        // Add to manual review if weak
        const reviewFlags = ["TooGeneric", "CityNameOnly", "PossibleAbbreviation", "NotPossessiveFriendly"];
        if (
          finalResult.confidenceScore < 75 ||
          finalResult.flags.some(f => reviewFlags.includes(f))
        ) {
          manualReviewQueue.push({
            domain,
            name: finalResult.name,
            confidenceScore: finalResult.confidenceScore,
            flags: finalResult.flags,
            rowNum
          });

          finalResult = {
            domain,
            companyName: finalResult.name || "",
            confidenceScore: Math.max(finalResult.confidenceScore, 50),
            flags: [...finalResult.flags, "LowConfidence"],
            rowNum
          };
        }

        // OpenAI readability validation (only if every word is initials)
if (
  process.env.OPENAI_API_KEY &&
  finalResult.companyName.split(" ").every(w => /^[A-Z]{1,3}$/.test(w))
) {
  const prompt = `Is "${finalResult.companyName}" readable and natural in "{Company}'s CRM isn't broken—it’s bleeding"? Respond with {"isReadable": true/false, "isConfident": true/false}`;
  const response = await callOpenAI({ prompt, maxTokens: 40 });
  tokensUsed += response.tokens || 0;

  try {
    const parsed = JSON.parse(response.output || "{}");

    if (!parsed.isReadable && parsed.isConfident) {
      const safeName = typeof finalResult.companyName === "string" ? finalResult.companyName : "";

      // Fallback safety net if name is missing entirely
      if (!safeName) {
        finalResult.companyName = "Generic Auto";
        finalResult.confidenceScore = 50;
        finalResult.flags.push("EmptyCompanyNameFallback");
      } else {
        const fallbackCity = cityDetected ? applyCityShortName(cityDetected) : safeName.split(" ")[0];
        const fallbackBrand = brandDetected || safeName.split(" ")[1] || "Auto";
        finalResult.companyName = `${fallbackCity} ${fallbackBrand}`;
        finalResult.flags.push("InitialsExpanded");
        finalResult.confidenceScore -= 5;
      }
    }
  } catch (err) {
    finalResult.flags.push("OpenAIParseError");
  }
} // Add this closing brace to close the if block

domainCache.set(domainKey, {
  companyName: finalResult.companyName,
  confidenceScore: finalResult.confidenceScore,
  flags: finalResult.flags
});

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

    successful.push(...chunkResults);
  }

    console.log(
    `Batch complete: ${successful.length} enriched, ${manualReviewQueue.length} to review, ${fallbackTriggers.length} fallbacks, ${totalTokens} tokens used`
  );

  return res.status(200).json({
    successful,
    manualReviewQueue,
    fallbackTriggers,
    totalTokens,
    partial: false
  });
  } catch (err) {
    console.error(`❌ Handler error: ${err.message}\n${err.stack}`);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
}

// Disable body parser to handle stream manually
export const config = {
  api: {
    bodyParser: false
  }
};
