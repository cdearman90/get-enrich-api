import { loadFromBlob, saveToBlob } from "../lib/blob.js"; // adjust if your blob file is in another path

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { batchId } = req.query;
  if (!batchId) return res.status(400).json({ error: "Missing batchId" });

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY in environment variables" });
  }

  const callOpenAI = async (prompt) => {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3
        })
      });
      const text = await response.text();
      if (!response.ok) throw new Error(text);
      return text;
    } catch (err) {
      return JSON.stringify({ error: `OpenAI error: ${err.message}` });
    }
  };

  const humanizeName = (name) => {
    if (!name || typeof name !== "string") return "";
    return name
      .toLowerCase()
      .replace(/\b(automotive group|auto group|group|motors|llc|inc|co|dealership|enterprise|sales|unlimited)\b/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const extractJsonSafely = (raw, fields = []) => {
    try {
      const parsed = JSON.parse(raw);
      const missing = fields.filter(f => !(f in parsed));
      return missing.length === 0 ? parsed : null;
    } catch {
      const match = raw.match(/\{[^}]+\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          const missing = fields.filter(f => !(f in parsed));
          return missing.length === 0 ? parsed : null;
        } catch {}
      }
    }
    return null;
  };

  const cleanCompanyName = async (domain) => {
    const prompt = `
Return a JSON object like {"name": "Duval Ford"} for this domain: "${domain}".
Do not include explanations, just valid JSON only.
    `.trim();

    const raw = await callOpenAI(prompt);
    const parsed = extractJsonSafely(raw, ["name"]);

    if (parsed && parsed.name) {
      return { name: humanizeName(parsed.name), error: null };
    } else {
      return { name: "", error: `Invalid GPT output: ${raw}` };
    }
  };

  try {
    const { leads } = await loadFromBlob(`jobs/${batchId}.json`);
    const results = [];

    for (const lead of leads) {
      if (!lead.domain || lead.name) continue;

      const result = await cleanCompanyName(lead.domain);
      results.push({
        rowNum: lead.rowNum,
        domain: lead.domain,
        name: result.name,
        error: result.error
      });
    }

    await saveToBlob(`results/${batchId}.json`, { results });
    return res.status(200).json({ status: "completed", count: results.length });
  } catch (err) {
    return res.status(500).json({ error: "Processing failed", details: err.message });
  }
}
