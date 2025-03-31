// 📦 /api/batch-clean.js (Vercel API route)

export default async function handler(req, res) {
  const leads = req.body || [];

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: "Missing or invalid lead list" });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  const callOpenAI = async (prompt, model) => {
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
      })
    });
    const json = await response.json();
    return json.choices?.[0]?.message?.content?.trim();
  };

  const getCleanName = async (domain) => {
    const prompt = `Given the dealership domain ${domain}, return a clean, human-friendly dealership name for use in a cold email.\n- Use the homepage title or logo as reference.\n- Expand abbreviations.\n- Capitalize known brands.\n- Never return the raw domain.\n- Never return just \"Auto\".\n- Only return the final cleaned dealership name.`;

    const domainRoot = domain.replace("www.", "").split(".")[0].toLowerCase();

    let name = await callOpenAI(prompt, "gpt-3.5-turbo");
    const isWeak = !name ||
      name.toLowerCase().includes(domainRoot) ||
      name.toLowerCase().includes("auto") ||
      name.split(" ").length < 2;

    if (isWeak) {
      name = await callOpenAI(prompt, "gpt-4");
    }

    return name;
  };

  const results = [];

  for (const lead of leads) {
    const { domain } = lead;
    if (!domain) {
      results.push({ domain, name: "", modelUsed: "", error: "Missing domain" });
      continue;
    }

    try {
      const name = await getCleanName(domain);
      results.push({ domain, name, modelUsed: "gpt-clean" });
    } catch (e) {
      results.push({ domain, name: "", modelUsed: "", error: e.message });
    }
  }

  return res.status(200).json({ results });
}
