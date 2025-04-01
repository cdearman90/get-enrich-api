// 📦 /api/full-enrich.js (Vercel API route with retry + timeout-safe)

export default async function handler(req, res) {
  const { firstName, title, city, state, company, domain } = req.body || {};

  if (!domain || !title || !company) {
    return res.status(400).json({ error: "Missing required fields" });
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
    const major = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Dallas", "San Antonio", "San Diego", "Austin",
      "Jacksonville", "San Jose", "Fort Worth", "Columbus", "Charlotte", "Indianapolis", "Seattle", "Denver",
      "Washington", "Boston", "Las Vegas", "Nashville", "Detroit", "Sacramento", "Fresno", "Long Beach", "Oakland",
      "Bakersfield", "Anaheim", "Riverside", "Santa Ana", "Irvine", "El Paso", "Arlington", "Plano", "Lubbock",
      "Corpus Christi", "Frisco", "McKinney", "Waco", "Garland", "Irving", "Miami", "Tampa", "Orlando", "St. Petersburg",
      "Hialeah", "Fort Lauderdale", "Pembroke Pines", "Cape Coral", "Hollywood", "Gainesville"];
    const mid = ["Mesa", "Kansas City", "Raleigh", "Omaha", "Minneapolis", "Cleveland", "Cincinnati", "New Orleans",
      "Pittsburgh", "Tulsa", "Wichita", "Baton Rouge", "St. Louis", "Anchorage", "Chula Vista", "Modesto", "Fontana",
      "Oxnard", "Glendale", "Huntington Beach", "Ontario", "Rancho Cucamonga", "Amarillo", "Round Rock", "Tyler",
      "Brownsville", "Beaumont", "Abilene", "Carrollton", "Killeen", "Pasadena", "Lewisville", "West Palm Beach",
      "Lakeland", "Pompano Beach", "Clearwater", "Miramar", "Palm Bay", "Spring Hill", "Lehigh Acres"];
    if (!city) return "Unknown";
    if (major.includes(city)) return "Major";
    if (mid.includes(city)) return "Mid";
    return "Unknown";
  };

  const prompt = `You're generating detailed enrichment for a cold outreach campaign targeting automotive franchise dealership General Sales Managers (GSMs).\n\nGiven:\n- Name: ${firstName}\n- Title: ${title}\n- Dealership: ${company}\n- Location: ${city}, ${state}\n- Domain: ${domain}\n\nReturn exactly these 12 pipe-separated fields:\n1. Franchise Group name (\"Independent\" if unsure)\n2. Brands sold (comma-separated)\n3. Buyer Score (1–5; higher for franchise, mobile, and complete data)\n4. Top relevant pain points (comma-separated)\n5. Personalized Hook (dealership-specific opener)\n6. One-Sentence Value Prop\n7. Region (Northeast, Midwest, South, West, Pacific)\n8. City Tier (Major, Mid, Unknown)\n9. Ideal Reference Client (real dealership or \"Peer Dealer\")\n10. Validation Flag (\"OK\" or \"Needs Check\")\n11. Safe to Send (\"YES\" if Buyer Score ≥4, else \"NO\")\n12. Already Enriched (\"YES\")`;

  const callOpenAI = async (model) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

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

      clearTimeout(timeout);
      const json = await response.json();

      if (!json.choices || !json.choices[0]?.message?.content) {
        throw new Error("GPT response incomplete");
      }

      return json.choices[0].message.content.trim();
    } catch (e) {
      console.error(`❌ GPT (${model}) failed:`, e.message);
      throw new Error(`GPT-${model} Error: ${e.message}`);
    }
  };

  let output;
  try {
    output = await callOpenAI("gpt-3.5-turbo");
    const domainRoot = domain.replace("www.", "").split(".")[0].toLowerCase();
    const isWeak = !output || output.toLowerCase().includes(domainRoot) || output.split("|").length < 5;
    if (isWeak) {
      output = await callOpenAI("gpt-4");
    }
  } catch (err) {
    console.warn(`⚠️ GPT-3.5 failed. Retrying with GPT-4 for ${domain}`);
    try {
      output = await callOpenAI("gpt-4");
    } catch (retryErr) {
      return res.status(500).json({ error: "GPT failed", details: retryErr.message });
    }
  }

  const parts = output.split("|").map(p => p.trim());
  while (parts.length < 12) parts.push("");

  parts[6] = getRegionFromState(state);
  parts[7] = getCityTier(city);
  parts[10] = parseInt(parts[2]) >= 4 ? "YES" : "NO";
  parts[11] = "YES";

  return res.status(200).json({ parts });
}
