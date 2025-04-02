// 📦 /api/batch-clean.js (Vercel API route with timeout-safe and retry-on-failure)

export default async function handler(req, res) {
  const leads = req.body || [];

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: "Missing or invalid lead list" });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  const callOpenAI = async (prompt, model) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
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

  const getCleanName = async (domain) => {
    const prompt = `Given the dealership domain ${domain}, return a clean, human-friendly dealership name that would be used in natural conversation or cold outreach.

- Use the homepage title or logo as reference.
- Expand abbreviations (e.g., EH → East Hills).
- Capitalize known brands (e.g., Ford, Chevy, Toyota).
- DO NOT include slogans, taglines, or location-based marketing.
- DO NOT return the raw domain name or add fluff like "Your Ultimate Destination..."
- Avoid unnecessary words like "Group", "Motors", "Dealership", or "Automotive" unless essential to the brand.
- If the brand is obvious, you may trim it (e.g., return "Pat Milliken" instead of "Pat Milliken Ford").

Only return the final cleaned dealership name, like: "Pat Milliken", "Town & Country", or "Don Hinds".`;

    const domainRoot = domain.replace("www.", "").split(".")[0].toLowerCase();
    let modelUsed = "gpt-3.5-turbo";
    let name;

    try {
      name = await callOpenAI(prompt, modelUsed);
      const isWeak = !name ||
        name.toLowerCase().includes(domainRoot) ||
        name.toLowerCase().includes("auto") ||
        name.split(" ").length < 2;

      if (isWeak) {
        modelUsed = "gpt-4";
        name = await callOpenAI(prompt, modelUsed);
      }
    } catch (err) {
      console.warn(`⚠️ First attempt failed, retrying once with GPT-4 for domain: ${domain}`);
      modelUsed = "gpt-4";
      try {
        name = await callOpenAI(prompt, modelUsed);
      } catch (retryErr) {
        throw new Error(retryErr.message);
      }
    }

    return { name, modelUsed };
  };

  const results = [];

  for (const lead of leads) {
    const { domain } = lead;
    if (!domain) {
      results.push({ domain, name: "", modelUsed: "", error: "Missing domain" });
      continue;
    }

    try {
      const { name, modelUsed } = await getCleanName(domain);
      results.push({ domain, name, modelUsed });
    } catch (e) {
      console.error(`❌ Failed to clean domain ${domain}:`, e.message);
      results.push({ domain, name: "", modelUsed: "", error: e.message });
    }
  }

  const errorCount = results.filter(r => r.error).length;
  const statusCode = errorCount === results.length ? 500 : 200;

  return res.status(statusCode).json({ results });
}
