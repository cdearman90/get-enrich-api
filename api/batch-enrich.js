export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  let leads;

  try {
    if (req.headers["content-type"]?.includes("application/json")) {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const raw = Buffer.concat(buffers).toString("utf-8");
      try {
        const parsed = JSON.parse(raw);
        leads = parsed.leads || parsed || [];
      } catch (err) {
        return res.status(400).json({ error: "Invalid JSON body", details: err.message });
      }
    } else {
      return res.status(400).json({ error: "Unsupported content-type" });
    }
  } catch (err) {
    return res.status(400).json({ error: "Failed to parse request body", details: err.message });
  }

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: "Missing or invalid lead list" });
  }

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
      return JSON.stringify({ name: "", error: `OpenAI error: ${err.message}` });
    }
  };

  const cleanCompanyName = async (lead) => {
    const { domain } = lead;
    if (!domain) return { name: "", error: "Missing domain" };

    const prompt = `
Given the dealership domain "${domain}", return a JSON object like {"name": "Duval Ford"} that fits naturally in cold email copy.
Do NOT include extra text, explanations, or line breaks — just the JSON.
    `.trim();

    const rawResponse = await callOpenAI(prompt);

    try {
      const parsed = JSON.parse(rawResponse);
      return { name: parsed.name || "", modelUsed: "gpt-4" };
    } catch (err) {
      return { name: "", error: `Invalid JSON from GPT: ${rawResponse}` };
    }
  };

  const results = [];

  for (const lead of leads) {
    try {
      if (lead.domain && !lead.email) {
        const cleaned = await cleanCompanyName(lead);
        results.push(cleaned);
      } else {
        results.push({ name: "", error: "Unexpected input structure" });
      }
    } catch (err) {
      results.push({ name: "", error: `Unexpected error: ${err.message}` });
    }
  }

  return res.status(200).json({ results });
}
