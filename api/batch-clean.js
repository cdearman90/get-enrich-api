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

  const getCleanName = async (domain) => {
    const prompt = `Given the dealership domain ${domain}, return a clean, human-friendly dealership name that would be used naturally in conversation or cold outreach.

The name must fit seamlessly in cold email copy like:
- "{{CompanyName}}’s CRM isn’t broken — it’s bleeding."
- "Want me to run {{CompanyName}}’s CRM numbers?"
- "$450K may be hiding in {{CompanyName}}’s CRM."

Formatting Rules:
- Use homepage title or logo as reference (avoid meta descriptions).
- Expand abbreviations (e.g., EH → East Hills).
- Capitalize known brands (e.g., Ford, Chevy, Toyota).
- DO NOT include slogans, taglines, city names, or marketing phrases.
- Avoid filler like “Auto”, “Motors”, “LLC”, “Inc”, “Enterprise”, “Group”, or “Dealership” unless essential to identity.
- If the name ends in a known brand and is 3 words or fewer, it’s OK to remove the brand (e.g., “Pat Milliken Ford” → “Pat Milliken”).
- If dropping the brand causes confusion (e.g., “Team Ford”), keep it.
- The final name must sound 100% natural when spoken aloud — like something you’d say to a dealer over the phone.

Only return the final dealership name with no quotes or punctuation.`;

    const domainRoot = domain.replace("www.", "").split(".")[0].toLowerCase();
    let modelUsed = "gpt-4";
    let name;

    try {
      // ✅ GPT-4 primary call
      name = await callOpenAI(prompt, modelUsed);

      const isWeak =
        !name ||
        name.toLowerCase().includes(domainRoot) ||
        name.toLowerCase().includes("auto") ||
        name.split(" ").length < 2;

      // 🔁 Fallback to GPT-3.5 if GPT-4 fails or returns a weak name
      if (isWeak) {
        modelUsed = "gpt-3.5-turbo";
        name = await callOpenAI(prompt, modelUsed);
      }
    } catch (err) {
      console.warn(`⚠️ GPT-4 failed for domain ${domain}, retrying with GPT-3.5...`);
      modelUsed = "gpt-3.5-turbo";
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
