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

  const cleanCompanyName = async (lead) => {
    const { domain } = lead;
    if (!domain) return { name: "", error: "Missing domain" };

    const prompt = `
Return only a JSON object like {"name": "Duval Ford"} for this domain: "${domain}".
No explanation, markdown, or quotes — just raw JSON.
    `.trim();

    const raw = await callOpenAI(prompt);
    const parsed = extractJsonSafely(raw, ["name"]);

    if (parsed && parsed.name) {
      return { name: humanizeName(parsed.name), modelUsed: "gpt-4" };
    }

    return { name: "", error: `Invalid GPT output: ${raw}` };
  };

  const enrichLead = async (lead) => {
    const { email, firstName, lastName, jobTitle, domain, mobilePhone, leadLinkedIn, engagedContact } = lead;
    if (!email || !domain) {
      return { franchiseGroup: "", buyerScore: 0, referenceClient: "", error: "Missing email or domain" };
    }

    const prompt = `
Enrich this lead based on:

- Email: ${email}
- Name: ${firstName || "N/A"} ${lastName || ""}
- Title: ${jobTitle || "N/A"}
- Domain: ${domain}
- Mobile: ${mobilePhone || "N/A"}
- LinkedIn: ${leadLinkedIn || "N/A"}
- Engaged: ${engagedContact || "N/A"}

Return only: {"franchiseGroup": "X", "buyerScore": 0-100, "referenceClient": "Name"}
    `.trim();

    const raw = await callOpenAI(prompt);
    const parsed = extractJsonSafely(raw, ["franchiseGroup", "buyerScore", "referenceClient"]);

    if (parsed) {
      return {
        franchiseGroup: parsed.franchiseGroup,
        buyerScore: parsed.buyerScore,
        referenceClient: parsed.referenceClient,
        modelUsed: "gpt-4"
      };
    }

    return { franchiseGroup: "", buyerScore: 0, referenceClient: "", error: `Invalid GPT response: ${raw}` };
  };

  const results = [];

  for (const lead of leads) {
    try {
      if (lead.domain && !lead.email) {
        const cleaned = await cleanCompanyName(lead);
        results.push(cleaned);
      } else {
        const enriched = await enrichLead(lead);
        results.push(enriched);
      }
    } catch (err) {
      results.push({ name: "", franchiseGroup: "", buyerScore: 0, referenceClient: "", error: `Unhandled error: ${err.message}` });
    }
  }

  return res.status(200).json({ results });
}
