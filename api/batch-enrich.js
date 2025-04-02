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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const json = await response.json();
      if (!json.choices || !json.choices[0]?.message?.content) {
        throw new Error("Invalid OpenAI response: No choices or content found");
      }

      return json.choices[0].message.content.trim();
    } catch (err) {
      throw new Error(`OpenAI API error: ${err.message}`);
    }
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

  const cleanCompanyName = async (lead) => {
    const { domain } = lead;
    if (!domain) return { name: "", error: "Missing domain" };

    const prompt = `
Given the dealership domain "${domain}", return a clean, human-friendly dealership name that would be used naturally in conversation or cold outreach.

The name must fit seamlessly in cold email copy like:
- "{{CompanyName}}’s CRM isn’t broken — it’s bleeding."
- "Want me to run {{CompanyName}}’s CRM numbers?"
- "$450K may be hiding in {{CompanyName}}’s CRM."

Examples to guide your inference:
- Domain: "duvalford.com"
  - Likely Meta Title: "Duval Ford | Ford Dealership in Jacksonville"
  - Likely Logo Alt Text: "Duval Ford Logo"
  - Human-Friendly Name: "Duval Ford"
- Domain: "patmillikenford.com"
  - Likely Meta Title: "Pat Milliken Ford | New & Used Ford Dealer in Detroit"
  - Likely Logo Alt Text: "Pat Milliken Ford Logo"
  - Human-Friendly Name: "Pat Milliken"
- Domain: "rossihonda.com"
  - Likely Meta Title: "Rossi Honda | Honda Dealer in Vineland, NJ"
  - Likely Logo Alt Text: "Rossi Honda Logo"
  - Human-Friendly Name: "Rossi Honda"

Inference Rules:
- Break down the domain into components (e.g., "duvalford.com" likely indicates "Duval Ford", where "duval" is the dealership name and "ford" indicates the brand).
- Infer the dealership name by considering typical website meta titles (e.g., "[Dealership Name] | [Brand] Dealer in [Location]") and logo alt texts (e.g., "[Dealership Name] Logo").
- Use your knowledge of dealership naming conventions, branding patterns, and website structures to make an educated guess.
- If the domain includes a known brand (e.g., "ford", "honda"), include it in the name unless the name is short (3 words or fewer) and the brand can be dropped without confusion (e.g., "Pat Milliken Ford" → "Pat Milliken", but "Team Ford" should stay "Team Ford").

Formatting Rules:
- Expand abbreviations (e.g., "eh" → "East Hills").
- Capitalize known brands (e.g., Ford, Chevy, Toyota).
- DO NOT include slogans, taglines, city names, or marketing phrases.
- Avoid filler like “Auto”, “Motors”, “LLC”, “Inc”, “Enterprise”, “Group”, or “Dealership” unless essential to identity.
- If the name ends in a known brand and is 3 words or fewer, it’s OK to remove the brand (e.g., “Pat Milliken Ford” → “Pat Milliken”).
- If dropping the brand causes confusion (e.g., “Team Ford”), keep it.
- The final name must sound 100% natural when spoken aloud — like something you’d say to a dealer over the phone.

Return: {"name": "Cleaned Name"}
`.trim();

    try {
      const response = await callOpenAI(prompt);
      let cleaned;
      try {
        cleaned = JSON.parse(response);
      } catch (err) {
        return { name: "", error: `Invalid JSON response from OpenAI: ${response}` };
      }
      if (!cleaned.name || typeof cleaned.name !== "string") {
        return { name: "", error: `Invalid response format from OpenAI: ${JSON.stringify(cleaned)}` };
      }
      return { name: humanizeName(cleaned.name), modelUsed: "gpt-4" };
    } catch (err) {
      return { name: "", error: err.message, modelUsed: "gpt-4" };
    }
  };

  const enrichLead = async (lead) => {
    const { email, firstName, lastName, jobTitle, domain, mobilePhone, leadLinkedIn, engagedContact } = lead;
    if (!email || !domain) {
      return { franchiseGroup: "", buyerScore: 0, referenceClient: "", error: "Missing email or domain" };
    }

    const prompt = `
Given the lead data:
- Email: ${email}
- First Name: ${firstName || "N/A"}
- Last Name: ${lastName || "N/A"}
- Job Title: ${jobTitle || "N/A"}
- Domain: ${domain}
- Mobile Phone: ${mobilePhone || "N/A"}
- Lead LinkedIn: ${leadLinkedIn || "N/A"}
- Engaged Contact: ${engagedContact || "N/A"}

Enrich the lead:
- Franchise Group: Identify if the domain belongs to a known auto franchise (e.g., "duvalford.com" → "Duval Ford"). Use "Independent" if unknown.
- Buyer Score: Calculate a score (0-100):
  - Base: 50
  - +20 if Mobile Phone present
  - +15 if Lead LinkedIn present
  - +10 if Email present (always true here)
  - +5 if Engaged Contact present
- Reference Client: If Engaged Contact is provided, return "${firstName || "Lead"} ${lastName || ""}"; otherwise, "".

Return: {"franchiseGroup": "Group Name", "buyerScore": Number, "referenceClient": "Name"}
`.trim();

    try {
      const response = await callOpenAI(prompt);
      let enriched;
      try {
        enriched = JSON.parse(response);
      } catch (err) {
        return { franchiseGroup: "", buyerScore: 0, referenceClient: "", error: `Invalid JSON response from OpenAI: ${response}` };
      }
      if (!enriched.franchiseGroup || typeof enriched.buyerScore !== "number" || !enriched.referenceClient) {
        return { franchiseGroup: "", buyerScore: 0, referenceClient: "", error: `Invalid response format from OpenAI: ${JSON.stringify(enriched)}` };
      }
      return {
        franchiseGroup: enriched.franchiseGroup,
        buyerScore: enriched.buyerScore,
        referenceClient: enriched.referenceClient,
        modelUsed: "gpt-4"
      };
    } catch (err) {
      return { franchiseGroup: "", buyerScore: 0, referenceClient: "", error: err.message, modelUsed: "gpt-4" };
    }
  };

  try {
    const results = [];

    for (const lead of leads) {
      if (lead.domain && !lead.email) { // Company name cleaning
        const cleaned = await cleanCompanyName(lead);
        results.push(cleaned);
      } else { // Full enrichment
        const enriched = await enrichLead(lead);
        results.push(enriched);
      }
    }

    return res.status(200).json({ results });
  } catch (err) {
    return res.status(500).json({ error: "Enrichment failed", details: err.message });
  }
}
