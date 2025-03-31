export default async function handler(req, res) {
  const { domain } = req.query;

  if (!domain) {
    return res.status(400).json({ error: "Missing domain" });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const prompt = `Given the dealership domain ${domain}, return a clean, human-friendly dealership name for use in a cold email.
- Use the homepage title or logo as reference.
- Expand abbreviations (e.g. EH → East Hills).
- Capitalize known brands (e.g. BMW, GMC).
- Return only the final cleaned dealership name.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      })
    });

    const json = await response.json();
    const output = json.choices?.[0]?.message?.content?.trim();
    return res.status(200).json({ name: output || "" });

  } catch (err) {
    return res.status(500).json({ error: "GPT failed", details: err.message });
  }
}
