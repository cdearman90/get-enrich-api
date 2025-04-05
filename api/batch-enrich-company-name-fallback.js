// api/batch-enrich-company-name-fallback.js
import { humanizeName } from "../lib/humanize.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
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
    return res.status(400).json({ error: "Invalid input: Expected an array of leads" });
  }

  const results = [];
  let totalTokens = 0;
  const manualReviewQueue = [];

  for (const lead of leads) {
    const { domain, rowNum, email, phone, firstName, lastName } = lead;
    if (!domain || !rowNum) {
      results.push({
        name: "",
        confidenceScore: 0,
        flags: ["MissingData"],
        rowNum,
        tokens: 0
      });
      continue;
    }

    let name = domain.replace(/\.com$/, "");
    let finalResult;
    try {
      finalResult = humanizeName(name, domain);
      finalResult.flags.push("FallbackUsed");
    } catch (err) {
      console.error(`Error in humanizeName for ${domain}: ${err.message}`);
      finalResult = { name: "", confidenceScore: 0, flags: ["ProcessingError", "FallbackUsed"] };
    }

    // Check for compound blobs
    if (finalResult.name.split(" ").length === 1 && finalResult.name.length > 12) {
      finalResult.flags.push("CompoundBlob");
      const splitWords = finalResult.name.match(/[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|\d|\W|$)/g) || [finalResult.name];
      const reformattedResult = humanizeName(splitWords.join(" "), domain);
      finalResult.name = reformattedResult.name;
      finalResult.confidenceScore = reformattedResult.confidenceScore;
      finalResult.flags = [...finalResult.flags, "FallbackReformatted", ...reformattedResult.flags];
    }

    finalResult.rowNum = rowNum;
    finalResult.tokens = 0; // Fallback does not use OpenAI, so tokens = 0

    if (finalResult.confidenceScore < 60 || finalResult.flags.includes("BrandIncluded")) {
      manualReviewQueue.push({
        rowNum,
        domain,
        name: finalResult.name,
        confidenceScore: finalResult.confidenceScore,
        flags: finalResult.flags,
        reason: "LowConfidenceOrBrand",
        email: email || "",
        phone: phone || "",
        firstName: firstName || "",
        lastName: lastName || ""
      });
    }

    results.push(finalResult);
  }

  return res.status(200).json({
    results,
    manualReviewQueue,
    totalTokens,
    partial: false
  });
}

export const config = { api: { bodyParser: false } };
