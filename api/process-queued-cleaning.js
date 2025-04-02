import { loadFromBlob, saveToBlob } from "../lib/blob.js";

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    console.error("Method not allowed: Expected POST, got", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { batchId } = req.query;
  if (!batchId) {
    console.error("Missing batchId in query");
    return res.status(400).json({ error: "Missing batchId" });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY in environment variables");
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
      console.error(`OpenAI API error: ${err.message}`);
      throw new Error(`OpenAI API error: ${err.message}`);
    }
  };

  const humanizeName = (name) => {
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
  };

  const titleCase = (str) => {
    return str.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
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

Return the cleaned name as a JSON object in the format: {"name": "Cleaned Name"}
`.trim();

    try {
      const raw = await callOpenAI(prompt);
      const parsed = extractJsonSafely(raw, ["name"]);
      if (parsed && parsed.name) {
        return { name: humanizeName(parsed.name), error: null };
      } else {
        console.error(`Invalid GPT output for domain "${domain}": ${raw}`);
        return { name: "", error: `Invalid GPT output: ${raw}` };
      }
    } catch (err) {
      console.error(`Error cleaning company name for domain "${domain}": ${err.message}`);
      return { name: "", error: err.message };
    }
  };

  try {
    console.log(`Loading batch ${batchId} from blob`);
    const { leads } = await loadFromBlob(`jobs/${batchId}.json`);
    if (!Array.isArray(leads)) {
      console.error(`Invalid leads data for batch ${batchId}`);
      return res.status(400).json({ error: "Invalid leads data" });
    }

    const results = [];
    for (const lead of leads) {
      if (!lead.domain || lead.name) {
        console.log(`Skipping lead with rowNum ${lead.rowNum}: domain=${lead.domain}, name=${lead.name}`);
        continue;
      }

      console.log(`Processing lead with rowNum ${lead.rowNum} and domain ${lead.domain}`);
      const result = await cleanCompanyName(lead.domain);
      results.push({
        rowNum: lead.rowNum,
        domain: lead.domain,
        name: result.name,
        error: result.error
      });
    }

    console.log(`Saving results for batch ${batchId} to blob`);
    await saveToBlob(`results/${batchId}.json`, { results });
    console.log(`Successfully processed batch ${batchId} with ${results.length} results`);
    return res.status(200).json({ status: "completed", count: results.length });
  } catch (err) {
    console.error(`Error processing batch ${batchId}: ${err.message}`);
    return res.status(500).json({ error: "Processing failed", details: err.message });
  }
}
