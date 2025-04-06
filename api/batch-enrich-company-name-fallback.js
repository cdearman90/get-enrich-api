import { humanizeName } from "./lib/humanize.js";

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

    for (const lead of leads) {
      if (Date.now() - startTime > 8000) {
        console.log("Partial response due to timeout");
        return res.status(200).json({ results, manualReviewQueue, partial: true });
      }

      const { domain, rowNum } = lead;
      if (!domain) {
        console.error(`Row ${rowNum}: Missing domain`);
        results.push({ name: "", confidenceScore: 0, flags: ["MissingDomain"], rowNum });
        continue;
      }

      let finalResult;
      try {
        finalResult = await humanizeName(domain, domain); // ✅ Added await for async compatibility
      } catch (err) {
        console.error(`Row ${rowNum}: humanizeName threw error: ${err.message}`);
        finalResult = { name: "", confidenceScore: 0, flags: ["ProcessingError"], rowNum };
      }

      finalResult.flags.push("FallbackUsed");

      console.log(`Row ${rowNum}: ${JSON.stringify(finalResult)}`);

      const skipFlags = [
        "TooGeneric",
        "PossibleAbbreviation",
        "NotPossessiveFriendly",
        "PossessiveAmbiguity",
        "CityNameOnly"
      ];

      if (
        finalResult.confidenceScore < 50 ||
        finalResult.flags.some(f => skipFlags.includes(f))
      ) {
        manualReviewQueue.push({
          domain,
          name: finalResult.name,
          confidenceScore: finalResult.confidenceScore,
          flags: finalResult.flags,
          rowNum
        });

        finalResult = { name: "", confidenceScore: 0, flags: ["Skipped"], rowNum };
      }

      results.push({ ...finalResult, rowNum });
    }

    console.log(`Completed: ${results.length} results, ${manualReviewQueue.length} for review`);
    return res.status(200).json({ results, manualReviewQueue, partial: false });

  } catch (err) {
    console.error(`Handler error: ${err.message}`, err.stack);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}

export const config = { api: { bodyParser: false } };
