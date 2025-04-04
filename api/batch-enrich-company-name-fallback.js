// api/batch-enrich-company-name-fallback.js
// Version: 3.3.1 - Clean Fallback Handler

import { humanizeName } from "../lib/humanize.js"; // Adjusted path

export default async function handler(req, res) {
  try {
    const buffers = [];
    for await (const chunk of req) buffers.push(chunk);
    const leads = JSON.parse(Buffer.concat(buffers).toString("utf-8"));

    if (!Array.isArray(leads)) {
      return res.status(400).json({ error: "Invalid request body: leads must be an array" });
    }

    const results = leads.map(lead => {
      const domain = (lead.domain || "").toLowerCase().trim();
      const cleaned = humanizeName(domain, domain);

      return {
        name: cleaned.name,
        confidenceScore: cleaned.confidenceScore,
        flags: [...(cleaned.flags || []), "FallbackUsed"],
        rowNum: lead.rowNum
      };
    });

    return res.status(200).json({
      results,
      manualReviewQueue: [],
      totalTokens: 37, // static fallback value
      partial: false
    });
  } catch (err) {
    console.error(`Fallback endpoint error: ${err.message}`);
    return res.status(500).json({ error: "Fallback endpoint failed", details: err.message });
  }
}

export const config = { api: { bodyParser: false } };
