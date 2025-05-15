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

  const callOpenAI = async (prompt, model = "gpt-4o-mini") => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout
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
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const json = await response.json();
      if (!json.choices?.[0]?.message?.content) {
        throw new Error("Invalid OpenAI response");
      }
      return json.choices[0].message.content.trim();
    } catch (err) {
      throw new Error(`OpenAI API error: ${err.message}`);
    }
  };

  const cleanTitlesAndLocations = async (leads) => {
    const prompt = `
Clean the following leads data:
${leads.map((lead, idx) => `Lead ${idx + 1}: Title="${lead.title || "N/A"}", City="${lead.city || "N/A"}", State="${lead.state || "N/A"}"`).join('; ')}

For each lead:
- Title: Map "gsm" to "General Sales Manager", "gm" to "General Manager", "manager" to "Sales Manager". Keep as-is if no match.
- City: Capitalize (e.g., "new york" to "New York"). Infer from state if possible. Use "Unknown" if unresolvable.
- State: Use full name (e.g., "Pennsylvania", not "PA"). Capitalize properly. Infer from city if possible. Use "Unknown" if unresolvable.

Return ONLY a JSON array of objects: [{"title":"...","city":"...","state":"..."},...]
`.trim();

    try {
      let response = await callOpenAI(prompt);
      const jsonMatch = response.match(/\[.*\]/s);
      if (jsonMatch) {
        response = jsonMatch[0];
      }
      const cleaned = JSON.parse(response);
      if (!Array.isArray(cleaned)) {
        throw new Error("Response is not a JSON array");
      }
      return leads.map((lead, idx) => ({
        title: cleaned[idx]?.title || lead.title,
        city: cleaned[idx]?.city || lead.city,
        state: cleaned[idx]?.state || lead.state,
        rowNum: lead.rowNum,
        modelUsed: "gpt-4o-mini",
        ...(cleaned[idx] ? {} : { error: "Failed to clean lead" })
      }));
    } catch (err) {
      return leads.map(lead => ({
        title: lead.title,
        city: lead.city,
        state: lead.state,
        rowNum: lead.rowNum,
        error: err.message,
        modelUsed: "gpt-4o-mini"
      }));
    }
  };

  try {
    const results = await cleanTitlesAndLocations(leads);
    return res.status(200).json({ results });
  } catch (err) {
    return res.status(500).json({ error: "Processing failed", details: err.message });
  }
}
