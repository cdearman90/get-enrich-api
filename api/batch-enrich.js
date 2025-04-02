export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  console.log("Received request to /api/batch-enrich");

  let leads;

  // Parse the incoming request body
  try {
    if (req.headers["content-type"]?.includes("application/json")) {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const raw = Buffer.concat(buffers).toString("utf-8");
      console.log("Raw request body:", raw);

      try {
        const parsed = JSON.parse(raw);
        leads = parsed.leads || parsed || [];
      } catch (err) {
        console.error("Failed to parse JSON:", err.message);
        return res.status(400).json({ error: "Invalid JSON body", details: err.message });
      }
    } else {
      console.error("Unsupported content-type:", req.headers["content-type"]);
      return res.status(400).json({ error: "Unsupported content-type", details: req.headers["content-type"] });
    }
  } catch (err) {
    console.error("Failed to parse request body:", err.message);
    return res.status(400).json({ error: "Failed to parse request body", details: err.message });
  }

  // Validate the leads array
  if (!Array.isArray(leads) || leads.length === 0) {
    console.error("Invalid lead list:", leads);
    return res.status(400).json({ error: "Missing or invalid lead list" });
  }

  // Check for OpenAI API key
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY in environment variables");
    return res.status(500).json({ error: "Missing OPENAI_API_KEY in environment variables" });
  }

  // Function to call OpenAI with a timeout
  const callOpenAI = async (prompt) => {
    console.log("Calling OpenAI with prompt:", prompt);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

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
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const text = await response.text();
      if (!response.ok) {
        console.error("OpenAI request failed:", text);
        throw new Error(text);
      }
      console.log("OpenAI response:", text);
      return text;
    } catch (err) {
      console.error("OpenAI error:", err.message);
      return JSON.stringify({ error: `OpenAI error: ${err.message}` });
    }
  };

  // Function to humanize company names
  const humanizeName = (name) => {
    if (!name || typeof name !== "string") return "";
    return name
      .toLowerCase()
      .replace(/\b(automotive group|auto group|group|motors|llc|inc|co|dealership|enterprise|sales|unlimited)\b/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

 –

  // Function to safely extract JSON from OpenAI response
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

  // Function to clean company names using OpenAI
  const cleanCompanyName = async (lead) => {
    const { domain } = lead;
    if (!domain) {
      console.error("Missing domain for lead:", lead);
      return { name: "", error: "Missing domain" };
    }

    const prompt = `
Return only a JSON object like {"name": "Duval Ford"} for this domain: "${domain}".
No explanation, markdown, or quotes — just raw JSON.
    `.trim();

    const raw = await callOpenAI(prompt);
    const parsed = extractJsonSafely(raw, ["name"]);

    if (parsed && parsed.name) {
      const cleanedName = humanizeName(parsed.name);
      console.log(`Cleaned name for domain ${domain}: ${cleanedName}`);
      return { name: cleanedName, modelUsed: "gpt-4" };
    }

    console.error(`Invalid GPT output for domain ${domain}: ${raw}`);
    return { name: "", error: `Invalid GPT output: ${raw}` };
  };

  // Function to enrich leads using OpenAI
  const enrichLead = async (lead) => {
    const { email, firstName, lastName, jobTitle, domain, mobilePhone, leadLinkedIn, engagedContact } = lead;
    if (!email || !domain) {
      console.error("Missing email or domain for lead:", lead);
      return { franchiseGroup: "", buyerScore: 0, referenceClient: "", error: "Missing email or domain" };
    }

    const prompt = `
Enrich this lead based on:

- Email: ${email}
- Name: ${firstName || "N/A"} ${lastName || ""}
- Title: ${jobTitle || "N/A"}
- Domain: ${domain}
- Mobile: ${mobilePhone || "N/A"}
- LinkedIn: ${leadLinkedIn || "N/A"}
- Engaged: ${engagedContact || "N/A"}

Return only: {"franchiseGroup": "X", "buyerScore": 0-100, "referenceClient": "Name"}
    `.trim();

    const raw = await callOpenAI(prompt);
    const parsed = extractJsonSafely(raw, ["franchiseGroup", "buyerScore", "referenceClient"]);

    if (parsed) {
      console.log(`Enriched lead for email ${email}:`, parsed);
      return {
        franchiseGroup: parsed.franchiseGroup,
        buyerScore: parsed.buyerScore,
        referenceClient: parsed.referenceClient,
        modelUsed: "gpt-4"
      };
    }

    console.error(`Invalid GPT response for email ${email}: ${raw}`);
    return { franchiseGroup: "", buyerScore: 0, referenceClient: "", error: `Invalid GPT response: ${raw}` };
  };

  // Process each lead
  const results = [];
  for (const lead of leads) {
    try {
      if (lead.domain && !lead.email) {
        const cleaned = await cleanCompanyName(lead);
        results.push(cleaned);
      } else {
        const enriched = await enrichLead(lead);
        results.push(enriched);
      }
    } catch (err) {
      console.error("Unhandled error processing lead:", lead, err.message);
      results.push({ name: "", franchiseGroup: "", buyerScore: 0, referenceClient: "", error: `Unhandled error: ${err.message}` });
    }
  }

  console.log("Returning results:", results);
  return res.status(200).json({ results });
}
