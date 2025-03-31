export default async function handler(req, res) {
  const { domain } = req.query;

  if (!domain) {
    return res.status(400).json({ error: "Missing domain" });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const prompt = `Given the dealership domain ${domain}, return a clean, human-friendly dealership name for use in a cold email.
- Use the homepage title or logo as reference.
- Expand abbreviations (e.g. EH → East Hills), even if there is a word before or after the abbreviation.
- Capitalize known brands (e.g. BMW, GMC), even if there is a word before or after it.
- Never return the domain name.
- Never return just "Auto" or generic suffixes.
- Only return the final cleaned dealership name.`;

  const openaiCall = async (model) => {
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

  try {
    const domainRoot = domain.replace("www.", "").split(".")[0].toLowerCase();

    // Try GPT-3.5 first
    const firstTry = await openaiCall("gpt-3.5-turbo");
    const isWeak = !firstTry ||
      firstTry.toLowerCase().includes(domainRoot) ||
      firstTry.toLowerCase().includes("auto") ||
      firstTry.split(" ").length < 2;

    if (!isWeak) {
      return res.status(200).json({ name: firstTry, modelUsed: "gpt-3.5-turbo" });
    }

    // Fallback to GPT-4
    const secondTry = await openaiCall("gpt-4");
    return res.status(200).json({ name: secondTry || firstTry, modelUsed: "gpt-4" });

  } catch (err) {
    return res.status(500).json({ error: "GPT failed", details: err.message });
  }
}
