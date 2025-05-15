import { kv } from "@vercel/kv"; // Add KV import
import { callOpenAI } from "./lib/openai.js";
import winston from "winston";

// Configure Winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  const path = req.url.split('?')[0];
  if (path !== '/public-api/batch-clean-titles-and-locations') {
    return res.status(404).json({ error: "Endpoint not found" });
  }

  let leads;
  try {
    if (req.headers["content-type"]?.includes("application/json")) {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const raw = Buffer.concat(buffers).toString("utf-8");
      const parsed = JSON.parse(raw);
      leads = parsed.leads || [];
      if (!parsed.batchId) {
        return res.status(400).json({ error: "Missing batchId" });
      }
    } else {
      return res.status(400).json({ error: "Unsupported content-type" });
    }
  } catch (err) {
    return res.status(400).json({ error: "Invalid JSON body", details: err.message });
  }

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: "Missing or invalid lead list" });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing OpenAI API key" });
  }

  const callOpenAI = async (prompt, model = "gpt-4") => {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3
        })
      });

      const json = await response.json();
      if (!json.choices?.[0]?.message?.content) {
        throw new Error("Invalid OpenAI response");
      }
      return json.choices[0].message.content.trim();
    } catch (err) {
      throw new Error(`OpenAI API error: ${err.message}`);
    }
  };

  const cleanTitlesAndLocations = async (leadsBatch) => {
    const prompt = `
Clean and standardize the following leads data:
${leadsBatch.map((lead, idx) => `
Lead ${idx + 1}:
- Job Title: ${lead.title || "N/A"}
- City: ${lead.city || "N/A"}
- State: ${lead.state || "N/A"}
`).join('\n')}

For each lead:
- Job Title: Map to "General Sales Manager", "Sales Manager", or "General Manager". Use "gsm" → "General Sales Manager", "gm" → "General Manager", "manager" → "Sales Manager". Return as-is if no match.
- City: Standardize (e.g., "new york" → "New York"). Infer from state if missing (e.g., "NY" → "New York"). Use "Unknown" if unresolvable.
- State: Convert to 2-letter code (e.g., "New York" → "NY"). Infer from city if missing. Use "Unknown" if unresolvable.

Return a JSON array of objects: [{"title": "Cleaned Title", "city": "Cleaned City", "state": "Cleaned State"}, ...]
`.trim();

    try {
      const response = await callOpenAI(prompt);
      const cleaned = JSON.parse(response);
      return leadsBatch.map((lead, idx) => ({
        title: cleaned[idx]?.title || lead.title,
        city: cleaned[idx]?.city || lead.city,
        state: cleaned[idx]?.state || lead.state,
        rowNum: lead.rowNum,
        modelUsed: "gpt-4",
        ...(cleaned[idx] ? {} : { error: "Failed to clean lead" })
      }));
    } catch (err) {
      return leadsBatch.map(lead => ({
        title: lead.title,
        city: lead.city,
        state: lead.state,
        rowNum: lead.rowNum,
        error: err.message,
        modelUsed: "gpt-4"
      }));
    }
  };

  try {
    // Process leads in smaller batches (e.g., 10 leads per OpenAI call)
    const batchSize = 10;
    const results = [];
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      const cleanedBatch = await cleanTitlesAndLocations(batch);
      results.push(...cleanedBatch);
    }
    return res.status(200).json({ results });
  } catch (err) {
    return res.status(500).json({ error: "Processing failed", details: err.message });
  }
}
