// api/batch-enrich-company-name-fallback.js
import { humanizeName } from "./lib/humanize.js"; // Revert to relative path

export default async function handler(req, res) {
  console.log("batch-enrich-company-name-fallback.js - Starting");
  try {
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
    const results = [];
    const manualReviewQueue = [];
    let totalTokens = 0;

    for (const lead of leads) {
      if (Date.now() - startTime > 8000) { // Leave 2 seconds buffer for Vercel 10-second timeout
        console.log("Partial response due to timeout");
        return res.status(200).json({ results, manualReviewQueue, totalTokens, partial: true });
      }

      const { domain, rowNum, email, phone, firstName, lastName } = lead;
      if (!domain) {
        console.error(`Row ${rowNum}: Missing domain`);
        results.push({ name: "", confidenceScore: 0, flags: ["MissingDomain"], rowNum });
        continue;
      }

      let finalResult = humanizeName(domain, domain);
      finalResult.flags.push("FallbackUsed");
      console.log(`Row ${rowNum}: Fallback result - ${JSON.stringify(finalResult)}`);

      if (finalResult.confidenceScore < 50 || 
          finalResult.flags.includes("TooGeneric") || 
          finalResult.flags.includes("PossibleAbbreviation") || 
          finalResult.flags.includes("NotPossessiveFriendly") || 
          (finalResult.flags.includes("PossessiveAmbiguity") && finalResult.confidenceScore < 80) ||
          finalResult.flags.includes("CityNameOnly")) {
        console.log(`Row ${rowNum} flagged for review: ${JSON.stringify(finalResult)}`);
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

      results.push({ ...finalResult, rowNum });
    }

    console.log(`Completed: ${results.length} results, ${manualReviewQueue.length} for review`);
    return res.status(200).json({ results, manualReviewQueue, totalTokens, partial: false });
  } catch (err) {
    console.error(`Handler error: ${err.message}`);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};

export const config = { api: { bodyParser: false } };
