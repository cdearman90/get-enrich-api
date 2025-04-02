export default async function handler(req, res) {
  const leads = req.body || [];

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: "Missing or invalid lead list" });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  const getRegionFromState = (state) => {
    const regions = {
      "Northeast": ["NY", "NJ", "PA", "MA", "CT", "RI", "VT", "NH", "ME"],
      "Midwest": ["OH", "MI", "IN", "IL", "WI", "MN", "IA", "MO", "ND", "SD", "NE", "KS"],
      "South": ["DE", "MD", "DC", "VA", "WV", "KY", "NC", "SC", "GA", "FL", "AL", "MS", "TN", "AR", "LA", "TX"],
      "West": ["MT", "WY", "CO", "NM", "ID", "UT", "AZ", "NV"],
      "Pacific": ["CA", "OR", "WA", "AK", "HI"]
    };
    for (const region in regions) {
      if (regions[region].includes(state)) return region;
    }
    return "Unknown";
  };

  const getCityTier = (city) => {
    const major = [/* ... list of major cities ... */];
    const mid = [/* ... list of mid cities ... */];
    if (!city) return "Unknown";
    if (major.includes(city)) return "Major";
    if (mid.includes(city)) return "Mid";
    return "Unknown";
  };

  const callOpenAI = async (prompt, model) => {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
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
    const json = await res.json();
    return json.choices?.[0]?.message?.content?.trim();
  };

  function humanizeName(name) {
    if (!name || typeof name !== "string") return "";

    const keepAsIs = ["pat milliken", "union park", "don hinds"];
    const addFordIf = ["duval", "team"];
    const removeWords = ["automotive group", "auto group", "motor group", "group", "motors", "dealership", "llc", "inc", "co", "enterprise", "sales", "unlimited"];

    let cleaned = name.trim().toLowerCase();

    if (keepAsIs.includes(cleaned)) return titleCase(cleaned);

    removeWords.forEach(suffix => {
      const regex = new RegExp(`\\b${suffix}\\b`, "gi");
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
    const { firstName, title, city, state, company, domain } = lead;
    if (!domain || !title || !company) {
      return { parts: [], domain, error: "Missing required fields" };
    }

    const prompt = `
You're generating detailed enrichment for a cold outreach campaign targeting automotive franchise dealership General Sales Managers (GSMs).

Given:
- Name: ${firstName}
- Title: ${title}
- Dealership: ${company}
- Location: ${city}, ${state}
- Domain: ${domain}

Return exactly these 12 pipe-separated fields:
1. Franchise Group name ("Independent" if unsure)
2. Brands sold (comma-separated)
3. Buyer Score (1–5; higher for franchise, mobile, and complete data)
4. Top relevant pain points (comma-separated)
5. Personalized Hook (dealership-specific opener)
6. One-Sentence Value Prop
7. Region (Northeast, Midwest, South, West, Pacific)
8. City Tier (Major, Mid, Unknown)
9. Ideal Reference Client (real dealership or "Peer Dealer")
10. Validation Flag ("OK" or "Needs Check")
11. Safe to Send ("YES" if Buyer Score ≥4, else "NO")
12. Already Enriched ("YES")

Instructions:
- Derive the human-friendly dealership name from homepage title, logo, or domain.
- Expand abbreviations and capitalize known brands (e.g., Ford, Chevy, Toyota).
- Remove suffixes like “Motors”, “Auto”, “Automotive Group”, “LLC”, or “Dealership” unless essential to brand.
- If the dealership name ends in a brand and is 3 words or fewer, it’s OK to remove the brand (e.g., "Pat Milliken Ford" → "Pat Milliken").
- Keep full brand if the name would be ambiguous without it (e.g., "Team Ford" should stay as "Team Ford").
- NEVER include marketing fluff, slogans, or location-based filler (no city names, taglines, or extras).
- Always return clean, human-sounding names as if you were speaking them aloud.
    `.trim();

    const domainRoot = domain.replace("www.", "").split(".")[0].toLowerCase();

    // ✅ Primary GPT-4 call
    let output = await callOpenAI(prompt, "gpt-4");

    // Optional fallback to GPT-3.5 if GPT-4 fails
    if (!output || output.toLowerCase().includes(domainRoot) || output.split("|").length < 5) {
      output = await callOpenAI(prompt, "gpt-3.5-turbo");
    }

    const parts = output.split("|").map(p => p.trim());
    while (parts.length < 12) parts.push("");

    parts[6] = getRegionFromState(state);
    parts[7] = getCityTier(city);
    parts[10] = parseInt(parts[2]) >= 4 ? "YES" : "NO";
    parts[11] = "YES";

    if (parts[0]) {
      parts[0] = humanizeName(parts[0]);
    }

    return { domain, parts };
  };

  try {
    const results = [];
    for (let lead of leads) {
      const result = await enrichLead(lead);
      results.push(result);
    }
    return res.status(200).json({ results });
  } catch (err) {
    return res.status(500).json({ error: "Batch GPT failed", details: err.message });
  }
}
