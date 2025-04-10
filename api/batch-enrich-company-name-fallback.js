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

const streamToString = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const timeout = setTimeout(() => {
      reject(new Error("Stream read timeout"));
    }, 5000);

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

export default async function handler(req, res) {
  console.log("🛟 batch-enrich-company-name-fallback.js v1.0.21");

  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Missing OPENAI_API_KEY env var");
    return res.status(500).json({ error: "Missing OpenAI API key" });
  }

  let body;
  try {
    const rawBody = await streamToString(req);
    if (!rawBody) {
      return res.status(400).json({ error: "Empty request body" });
    }
    body = JSON.parse(rawBody);
    console.log(`📥 Received fallback batch: ${body.leads?.length || 0} leads`);
  } catch (err) {
    return res.status(400).json({ error: "Invalid JSON", details: err.message });
  }

  const leads = body.leads || body.leadList || body.domains;
  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: "Missing or invalid leads array" });
  }

  const validatedLeads = leads
    .map((lead, index) => {
      if (!lead || typeof lead !== "object" || !lead.domain) return null;
      return {
        domain: lead.domain.trim().toLowerCase(),
        rowNum: lead.rowNum || index + 1
      };
    })
    .filter(Boolean);

  if (validatedLeads.length === 0) {
    return res.status(400).json({ error: "No valid leads to process" });
  }

  const startTime = Date.now();
  const BATCH_SIZE = 5;
  const concurrencyLimit = pLimit(5);
  const successful = [];
  const manualReviewQueue = [];
  const fallbackTriggers = [];
  let totalTokens = 0;

  const leadChunks = Array.from({ length: Math.ceil(validatedLeads.length / BATCH_SIZE) }, (_, i) =>
    validatedLeads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
  );

  for (const chunk of leadChunks) {
    if (Date.now() - startTime > 18000) {
      return res.status(200).json({
        successful,
        manualReviewQueue,
        fallbackTriggers,
        totalTokens,
        partial: true
      });
    }

    const results = await Promise.all(
      chunk.map(lead => concurrencyLimit(async () => {
        const { domain, rowNum } = lead;
        const domainLower = domain.toLowerCase();
        console.log(`🌀 Fallback processing row ${rowNum}: ${domain}`);

        let result;
        let tokensUsed = 0;
        let gptUsed = false;

        const { brand: brandDetected, city: cityDetected } = extractBrandOfCityFromDomain(domainLower);

        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            result = await humanizeName(domainLower, domainLower, false, true);
            tokensUsed = result.tokens || 0;
            break;
          } catch (err) {
            console.error(`⚠️ Attempt ${attempt} failed for ${domain}: ${err.message}`);
            if (attempt === 2) {
              result = {
                name: "",
                confidenceScore: 0,
                flags: ["ProcessingError"],
                tokens: 0
              };
              fallbackTriggers.push({
                domain,
                rowNum,
                reason: "ProcessingError",
                details: { error: err.message },
                tokens: 0
              });
            }
          }
          await new Promise(res => setTimeout(res, 500));
        }

        result.flags = Array.isArray(result.flags) ? result.flags : [];
        result.flags.push("FallbackAPIUsed");

        const criticalFlags = ["TooGeneric", "CityNameOnly", "Skipped", "FallbackFailed", "PossibleAbbreviation"];
        const forceReviewFlags = [
          "TooGeneric", "CityNameOnly", "PossibleAbbreviation", "BadPrefixOf", "CarBrandSuffixRemaining",
          "NotPossessiveFriendly", "UnverifiedCity"
        ];

        const isAcceptable = result.confidenceScore >= 75 && !result.flags.some(f => criticalFlags.includes(f));

        if (process.env.OPENAI_API_KEY && result.name.split(" ").every(w => /^[A-Z]{1,3}$/.test(w))) {
          const prompt = `Is "${result.name}" readable and natural as a company name in "{Company}'s CRM isn't broken—it’s bleeding"? Respond with {"isReadable": true/false, "isConfident": true/false}`;
          const response = await callOpenAI({ prompt, maxTokens: 40 });
          gptUsed = true;
          tokensUsed += response.tokens || 0;

          let parsed;
          try {
            parsed = JSON.parse(response.output);
          } catch (err) {
            parsed = { isReadable: true, isConfident: false };
          }

          if (!parsed.isReadable && parsed.isConfident) {
            const cityName = cityDetected ? applyCityShortName(cityDetected) : result.name.split(" ")[0];
            result.name = `${cityName} ${brandDetected || result.name.split(" ")[1] || "Auto"}`;
            result.flags.push("InitialsExpanded");
            result.confidenceScore -= 5;
          }
        }

        if (!isAcceptable || result.flags.some(f => forceReviewFlags.includes(f))) {
          manualReviewQueue.push({
            domain,
            name: result.name,
            confidenceScore: result.confidenceScore,
            flags: result.flags,
            rowNum,
            tokens: tokensUsed
          });
          fallbackTriggers.push({
            domain,
            rowNum,
            reason: "LowConfidenceOrFlags",
            details: {
              flags: result.flags,
              score: result.confidenceScore,
              brand: brandDetected,
              city: cityDetected,
              gptUsed
            },
            tokens: tokensUsed
          });
          result = {
            domain,
            companyName: result.name || "",
            confidenceScore: Math.max(result.confidenceScore, 50),
            flags: [...result.flags, "LowConfidence"],
            tokens: tokensUsed,
            rowNum
          };
        }

        totalTokens += tokensUsed;

        return {
          domain,
          companyName: result.name,
          confidenceScore: result.confidenceScore,
          flags: result.flags,
          tokens: tokensUsed,
          rowNum
        };
      }))
    );

    successful.push(...results);
  }

  console.log(`✅ Fallback complete: ${successful.length} enriched, ${manualReviewQueue.length} for manual review, ${fallbackTriggers.length} triggers, ${totalTokens} tokens used.`);

  return res.status(200).json({
    successful,
    manualReviewQueue,
    fallbackTriggers,
    totalTokens,
    partial: false
  });
} catch (err) {
  console.error(`❌ Fallback handler failed: ${err.message}\n${err.stack}`);
  return res.status(500).json({ error: "Server error", details: err.message });
}
}

export const config = { api: { bodyParser: false } };
