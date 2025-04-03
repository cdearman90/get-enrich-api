export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  const startTime = Date.now();
  console.log("Received request to /api/batch-enrich at", new Date().toISOString());

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

  // Function to call OpenAI with a timeout and retry logic
  const callOpenAI = async (prompt, retries = 3, delay = 2000) => {
    console.log("Calling OpenAI with prompt:", prompt);
    for (let attempt = 1; attempt <= retries; attempt++) {
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
          if (response.status === 429 && attempt < retries) {
            // Rate limit error, wait and retry
            console.warn(`Rate limit exceeded, retrying (${attempt}/${retries}) after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          console.error("OpenAI request failed with status", response.status, ":", text);
          throw new Error(text);
        }

        // Log the raw OpenAI response
        console.log("Raw OpenAI response:", text);

        // Parse the OpenAI response as JSON
        let openAiResponse;
        try {
          openAiResponse = JSON.parse(text);
        } catch (err) {
          console.error("Failed to parse OpenAI response as JSON:", err.message);
          throw new Error(`Invalid JSON response from OpenAI: ${text}`);
        }

        // Extract the content from choices[0].message.content
        if (!openAiResponse.choices || !openAiResponse.choices[0] || !openAiResponse.choices[0].message || !openAiResponse.choices[0].message.content) {
          console.error("Invalid OpenAI response structure:", openAiResponse);
          throw new Error("Invalid OpenAI response structure: missing choices[0].message.content");
        }

        const content = openAiResponse.choices[0].message.content;

        // Log the extracted content
        console.log("Extracted OpenAI content:", content);

        return content;
      } catch (err) {
        if (attempt < retries) {
          console.warn(`OpenAI request failed, retrying (${attempt}/${retries}) after ${delay}ms...`, err.message);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        console.error("OpenAI error after retries:", err.message);
        return { error: `OpenAI error: ${err.message}` };
      }
    }
  };

  // Function to humanize company names
  const humanizeName = (name) => {
    if (!name || typeof name !== "string") return "";

    // Step 1: Remove unwanted elements (city names, marketing phrases)
    let cleanedName = name
      .replace(/\b(jacksonville|atlanta|chicago|new york|los angeles|best dealership|your trusted dealer|welcome to|home of)\b/gi, '') // Remove city names and marketing phrases
      .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
      .trim();

    // Step 2: Remove filler words unless essential to identity
    const fillerWords = /\b(auto|motors|llc|inc|enterprise|group|dealership)\b/gi;
    const knownBrands = /\b(ford|chevy|toyota|honda|nissan|hyundai|kia|bmw|mercedes|volkswagen|jeep|dodge|ram|chrysler)\b/gi;

    // Check if the name ends with a known brand
    const brandMatch = cleanedName.match(knownBrands);
    const brand = brandMatch ? brandMatch[0] : null;
    let nameWithoutBrand = brand ? cleanedName.replace(knownBrands, '').trim() : cleanedName;

    // Remove filler words
    const wordCountBefore = nameWithoutBrand.split(' ').filter(word => word).length;
    nameWithoutBrand = nameWithoutBrand.replace(fillerWords, '').trim();
    const wordCountAfter = nameWithoutBrand.split(' ').filter(word => word).length;

    // Step 3: Handle known brands (remove if <= 2 words and not confusing)
    if (brand) {
      const isConfusing = nameWithoutBrand.toLowerCase().match(/\b(team|east|west|north|south|central|city|valley|hill|ridge|park|lake|river|mountain|auto)\b/);
      const isEssentialFiller = wordCountBefore > wordCountAfter && wordCountAfter <= 1; // Keep filler if it results in a very short name
      if (wordCountAfter <= 2 && !isConfusing && !isEssentialFiller) {
        cleanedName = nameWithoutBrand;
      } else {
        cleanedName = `${nameWithoutBrand} ${brand}`;
      }
    } else {
      cleanedName = nameWithoutBrand;
    }

    // Step 4: Limit to 3 words (or 4 if a brand is included)
    const words = cleanedName.split(' ').filter(word => word);
    if (words.length > 4 || (words.length > 3 && !brand)) {
      cleanedName = words.slice(0, brand ? 4 : 3).join(' ');
      console.log(`Truncated name to ${brand ? 4 : 3} words: ${cleanedName}`);
    }

    // Step 5: Apply title case
    cleanedName = cleanedName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return cleanedName;
  };

  // Function to safely extract JSON (updated to handle parsed objects)
  const extractJsonSafely = (data, fields = []) => {
    // If data is a string, try to parse it as JSON
    let parsed = data;
    if (typeof data === "string") {
      try {
        parsed = JSON.parse(data);
      } catch {
        const match = data.match(/\{[^}]+\}/);
        if (match) {
          try {
            parsed = JSON.parse(match[0]);
          } catch {}
        }
      }
    }

    // If parsed is an object and has all required fields, return it
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const missing = fields.filter(f => !(f in parsed));
      return missing.length === 0 ? parsed : null;
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
Given the dealership domain "${domain}" sourced from an email list, return a clean, human-friendly dealership name that would be used naturally in conversation or cold outreach, based on your knowledge of the dealership's domain, logo, and homepage meta title as of late 2023. Consider all factors equally to make the best decision.

The name must fit seamlessly in cold email copy like:
- "{{CompanyName}}’s CRM isn’t broken — it’s bleeding."
- "Want me to run {{CompanyName}}’s CRM numbers?"
- "$450K may be hiding in {{CompanyName}}’s CRM."

Formatting Guidelines:
- Use the dealership's domain, logo text, and homepage meta title as references (based on your knowledge up to late 2023), considering all factors equally.
- Expand abbreviations (e.g., "EH" → "East Hills").
- Avoid including slogans, taglines, city names, or marketing phrases (e.g., "Jacksonville’s Best Dealership") unless they enhance the naturalness of the name.
- Avoid filler words like "Auto", "Motors", "LLC", "Inc", "Enterprise", "Group", or "Dealership" unless they make the name sound more natural or are essential to the dealership's identity.
- You may remove a known brand (e.g., "Ford", "Chevy", "Toyota") from the end of the name if the rest of the name is 2 words or fewer and removing the brand does not cause confusion (e.g., "Pat Milliken Ford" → "Pat Milliken", but keep "Team Ford" as "Team" would be too vague).
- The final name must sound 100% natural when spoken aloud — like something you’d say to a dealer over the phone.

Only return the final dealership name with no quotes or punctuation.
    `.trim();

    const result = await callOpenAI(prompt);

    // Check if result is an error object
    if (result && result.error) {
      console.error(`Failed to process domain ${domain}: ${result.error}`);
      return { name: "", error: result.error };
    }

    // Humanize the name returned by OpenAI
    const cleanedName = humanizeName(result);
    if (!cleanedName) {
      console.error(`Failed to humanize name for domain ${domain}: ${result}`);
      return { name: "", error: `Failed to humanize name: ${result}` };
    }

    console.log(`Cleaned name for domain ${domain}: ${cleanedName}`);
    return { name: cleanedName, modelUsed: "gpt-4" };
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

    const result = await callOpenAI(prompt);

    // Check if result is an error object
    if (result && result.error) {
      console.error(`Failed to process email ${email}: ${result.error}`);
      return { franchiseGroup: "", buyerScore: 0, referenceClient: "", error: result.error };
    }

    const parsed = extractJsonSafely(result, ["franchiseGroup", "buyerScore", "referenceClient"]);

    if (parsed) {
      console.log(`Enriched lead for email ${email}:`, parsed);
      return {
        franchiseGroup: parsed.franchiseGroup,
        buyerScore: parsed.buyerScore,
        referenceClient: parsed.referenceClient,
        modelUsed: "gpt-4"
      };
    }

    console.error(`Invalid GPT response for email ${email}:`, result);
    return { franchiseGroup: "", buyerScore: 0, referenceClient: "", error: `Invalid GPT response: ${JSON.stringify(result)}` };
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
  console.log(`Request completed in ${Date.now() - startTime}ms at`, new Date().toISOString());
  return res.status(200).json({ results });
}
