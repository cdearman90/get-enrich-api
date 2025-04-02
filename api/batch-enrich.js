export const config = {
  api: {
    bodyParser: false // required to support binary uploads
  }
};

export default async function handler(req, res) {
  let leads;

  try {
    if (req.headers["content-type"]?.includes("application/json")) {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const raw = Buffer.concat(buffers).toString("utf-8");
      const parsed = JSON.parse(raw);
      leads = parsed.leads || parsed || [];
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

  const callOpenAI = async (prompt, model) => {
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
    return json.choices?.[0]?.message?.content?.trim();
  };

  function humanizeName(name) {
    if (!name || typeof name !== "string") return "";
    const keepAsIs = ["pat milliken", "union park", "don hinds"];
    const addFordIf = ["duval", "team"];
    const removeWords = [
      "automotive group", "auto group", "motor group", "group",
      "motors", "dealership", "llc", "inc", "co", "enterprise", "sales", "unlimited"
    ];

    let cleaned = name.trim().toLowerCase();
    if (keepAsIs.includes(cleaned)) return titleCase(cleaned);

    removeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      cleaned = cleaned.replace(regex, "");
    });

    cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
    if (addFordIf.includes(cleaned)) cleaned += " Ford";

    return titleCase(cleaned);
  }

  function titleCase(str) {
    return str.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  const enrichLead = async (lead) => {
    const { domain } = lead;
    if (!domain) return { domain, name: "", error: "Missing domain" };

    const prompt = `
Given the dealership domain ${domain}, return a clean, human-friendly dealership name that would be used naturally in conversation or cold outreach.

Formatting Rules:
- Must sound natural in: "{{CompanyName}}'s CRM isn’t broken — it’s bleeding."
- Derive from homepage title/logo if possible. No raw domains.
- Expand abbreviations (e.g., eh → East Hills).
- Capitalize known brands.
- Do NOT include slogans, taglines, city names, or "Inc", "Motors", "LLC", etc.
- Trim unnecessary suffixes unless part of branding (e.g., keep “Team Ford”).
- Speak it aloud — should sound like how dealers refer to the store.

Only return the cleaned name.
`.trim();

    const domainRoot = domain.replace("www.", "").split(".")[0].toLowerCase();
    let modelUsed = "gpt-4";
    let name;

    try {
      name = await callOpenAI(prompt, modelUsed);
      const isWeak = !name || name.toLowerCase().includes(domainRoot) || name.split(" ").length < 2;

      if (isWeak) {
        modelUsed = "gpt-3.5-turbo";
        name = await callOpenAI(prompt, modelUsed);
      }
    } catch (err) {
      return { domain, name: "", error: err.message };
    }

    return {
      domain,
      name: humanizeName(name)
    };
  };

  try {
    const results = [];

    for (const lead of leads) {
      const enriched = await enrichLead(lead);
      results.push(enriched);
    }

    return res.status(200).json({
      results: results.map(r => ({
        domain: r.domain,
        name: r.name || ""
      }))
    });
  } catch (err) {
    return res.status(500).json({ error: "Enrichment failed", details: err.message });
  }
}
