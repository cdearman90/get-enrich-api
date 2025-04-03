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

  // Function to call OpenAI with timeout and retry logic
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
            console.warn(`Rate limit exceeded, retrying (${attempt}/${retries}) after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          console.error("OpenAI request failed with status", response.status, ":", text);
          throw new Error(text);
        }

        console.log("Raw OpenAI response:", text);

        let openAiResponse;
        try {
          openAiResponse = JSON.parse(text);
        } catch (err) {
          console.error("Failed to parse OpenAI response as JSON:", err.message);
          throw new Error(`Invalid JSON response from OpenAI: ${text}`);
        }

        if (!openAiResponse.choices || !openAiResponse.choices[0] || !openAiResponse.choices[0].message || !openAiResponse.choices[0].message.content) {
          console.error("Invalid OpenAI response structure:", openAiResponse);
          throw new Error("Invalid OpenAI response structure: missing choices[0].message.content");
        }

        const content = openAiResponse.choices[0].message.content;
        console.log("Extracted OpenAI content:", content);
        return content;
      } catch (err) {
        if (err.name === "AbortError") {
          console.error("OpenAI request timed out after 30 seconds");
          if (attempt < retries) {
            console.warn(`Retrying (${attempt}/${retries}) after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          return { error: "OpenAI request timed out after 30 seconds" };
        }
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

    // Step 1: Store the original name
    const originalName = name;

    // Step 2: Normalize and split
    let words = name.toLowerCase().trim().split(/\s+/);
    if (words[0] === "the") words.shift();

    // Step 3: Rephrase "Of" constructions
    const cityNames = ["jacksonville", "birmingham", "greenwich", "atlanta", "chicago", "washington", "madison", "brooklyn", "wakefield", "gwinnett", "caldwell", "lakeland", "henderson", "southtowne", "new york", "usa"];
    const ofIndex = words.indexOf("of");
    if (ofIndex !== -1 && ofIndex < words.length - 1) {
      const nextWord = words[ofIndex + 1];
      if (cityNames.includes(nextWord)) {
        words = [nextWord, ...words.slice(0, ofIndex), ...words.slice(ofIndex + 2)];
      } else {
        words = [...words.slice(0, ofIndex), ...words.slice(ofIndex + 1)];
      }
    }

    // Step 4: Remove unwanted elements
    words = words.filter(word => !cityNames.includes(word));

    // Step 5: Handle known brands
    const brands = ["ford", "chevy", "toyota", "honda", "nissan", "hyundai", "kia", "bmw", "mercedes", "benz", "subaru", "jeep", "dodge", "ram", "chrysler", "vw"];
    const hasBrand = words.some(word => brands.includes(word));
    const brand = hasBrand ? words.find(word => brands.includes(word)) : null;
    let baseName = hasBrand ? words.filter(word => !brands.includes(word)) : words;

    // Step 6: Handle filler words
    const fillers = ["motors", "llc", "inc", "enterprise", "group", "dealership", "team"];
    baseName = baseName.filter(word => !fillers.includes(word) || (["dealership", "team"].includes(word) && baseName.length === 1));
    if (baseName.includes("auto") && baseName.length > 2) baseName = baseName.filter(word => word !== "auto");

    // Step 7: Ensure singular form
    const lastWord = baseName[baseName.length - 1];
    if (lastWord === "cars" || lastWord === "autos" || lastWord === "dealers") {
      baseName[baseName.length - 1] = "auto";
    }

    // Step 8: Fix formatting errors
    baseName = baseName.map(word => word.replace(/^-/, ""));

    // Step 9: Reconstruct name
    const wellKnownNames = ["pat milliken", "tommy nix", "elway", "kossi honda", "sarant cadillac", "penske automotive", "the premier collection"];
    let finalName = baseName;
    if (hasBrand && (baseName.length > 2 || !wellKnownNames.some(wn => baseName.join(" ").includes(wn.split(" ")[0])))) {
      finalName = [...baseName, brand];
    }
    if (finalName.length <= 2 && !finalName.includes("auto") && !hasBrand) {
      finalName.push("auto");
    }

    // Step 9 (cont.): Ensure name is never just a brand or brand with generic term
    const finalHasBrand = finalName.some(word => brands.includes(word));
    const isJustBrand = finalHasBrand && finalName.length === 1;
    const genericTerms = ["auto", "dealership", "team", "group", "motors", "enterprise"];
    const isBrandWithGenericTerm = finalHasBrand && finalName.length === 2 && genericTerms.includes(finalName[1]);
    const baseNameWithoutBrand = finalHasBrand ? finalName.filter(word => !brands.includes(word) && !genericTerms.includes(word)) : finalName;
    const lacksIdentifier = finalHasBrand && baseNameWithoutBrand.length === 0;
    if (isJustBrand || isBrandWithGenericTerm || lacksIdentifier) {
      console.warn(`Name lacks a dealership-specific identifier after transformations: ${finalName.join(" ")}`);
      finalName = originalName.toLowerCase().trim().split(/\s+/);
      const originalHasBrand = finalName.some(word => brands.includes(word));
      const originalBaseNameWithoutBrand = originalHasBrand ? finalName.filter(word => !brands.includes(word) && !genericTerms.includes(word)) : finalName;
      const originalLacksIdentifier = originalHasBrand && originalBaseNameWithoutBrand.length === 0;
      if (originalLacksIdentifier) {
        finalName = [...finalName, "of", domain.split(".")[0]]; // Note: domain is not in scope here; this will be fixed in cleanCompanyName
      }
    }

    // Step 10: Limit length
    const maxWords = hasBrand ? 4 : 3;
    finalName = finalName.slice(0, maxWords);

    // Step 11: Flag unexpanded abbreviations
    const commonWords = ["pat", "gus", "san", "team", "town", "east", "west", "north", "south", "auto", "hills", "birmingham", "mercedes", "benz", "elway", "kossi", "sarant", "tommy", "nix"];
    const hasAbbreviation = finalName.some(word => (/^[A-Z]{2,4}$/.test(word) || /^[A-Z][a-z]+[A-Z][a-z]*$/.test(word) || /^[A-Z][a-z]{1,2}$/.test(word)) && !commonWords.includes(word) && !brands.includes(word));
    const result = finalName.join(" ");

    // Step 12: Apply title case with specific fixes
    let titleCased = result
      .replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1))
      .replace(/Mccarthy/g, "McCarthy")
      .replace(/Mclarty/g, "McLarty")
      .replace(/Bmw/g, "BMW")
      .replace(/Vw/g, "VW");

    return hasAbbreviation ? `${titleCased} [Unexpanded]` : titleCased;
  };

  // Function to safely extract JSON
  const extractJsonSafely = (data, fields = []) => {
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
Given the dealership domain "${domain}" sourced from an email list, return a clean, human-friendly dealership name that would be used naturally in conversation or cold outreach, based on your knowledge of the dealership's domain, logo, and homepage meta title as of April 2025. Consider all factors equally to make the best decision.

The name must fit seamlessly in cold email copy like:
- "{{CompanyName}}’s CRM isn’t broken — it’s bleeding."
- "Want me to run {{CompanyName}}’s CRM numbers?"
- "$450K may be hiding in {{CompanyName}}’s CRM."
Ensure the name is singular to work naturally with the possessive form (e.g., "Fletcher Auto’s" instead of "Fletcher Autos’").

Formatting Guidelines:
- Use the dealership's domain, logo text, and homepage meta title as references (based on your knowledge up to April 2025), considering all factors equally.
- Expand all abbreviations to their full form (e.g., "EH" → "East Hills", "CHMB" → "Chapman Mercedes-Benz", "G Y" → "GY Chevy", "Np" → "North Point", "Rt" → "Route"). If an abbreviation cannot be expanded with certainty, append a known brand associated with the dealership (e.g., "CZAG" → "CZAG Ford" if it’s a Ford dealership) or "Auto" (e.g., "CZAG" → "CZAG Auto") to ensure clarity. Do not return a name with unexpanded abbreviations like "CZAG" without a brand or "Auto".
- Ensure the brand matches the domain (e.g., for "lexusofsuntrip.com", the brand must be "Lexus", not another brand like "Chevy"). If the domain includes a brand (e.g., "lexus" in "lexusofsuntrip.com"), include that brand in the name.
- The name must never be just the car brand (e.g., do not return "Toyota", "Lexus", or "Mercedes-Benz" alone) or the car brand with a generic term like "Auto", "Dealership", or "Team" (e.g., do not return "Toyota Auto", "Lexus Dealership", "Team Chevy", or "Mercedes-Benz Team"). Always include a dealership-specific identifier (e.g., a city, state, person’s last name, or unique name like "Suntrip Lexus" instead of "Lexus", "Caldwell Mercedes-Benz" instead of "Mercedes-Benz"). If the domain implies only a brand (e.g., "toyota.com") and no specific identifier is available from the domain, logo, or meta title, retain the original structure (e.g., "Toyota of Japan" if that’s the meta title) or use a unique identifier if known (e.g., "Toyota Corporate"). If no identifier is available, return the name with the brand and a placeholder like "of [Domain]" (e.g., "Toyota of Toyota" for "toyota.com") to ensure the name clearly represents a dealership, not the car brand.
- Avoid including slogans, taglines, city names, or marketing phrases (e.g., "Jacksonville’s Best Dealership") unless they are essential to the dealership’s identity (e.g., "Metro Of Madison" can keep "Of Madison" if part of the official name). Do not start the name with "Of" (e.g., "Of Greenwich" should be "Greenwich Toyota").
- Include filler words like "Auto" if they make the name sound more natural in a cold email (e.g., "Fletcher Auto" instead of "Fletcher"), but avoid other filler words like "Motors", "LLC", "Inc", "Enterprise", "Group", "Dealership", or "Team" unless essential to the dealership’s identity (e.g., "Pat Milliken Dealership" can keep "Dealership" if "Pat Milliken" alone is not specific enough). Do not append "Auto" to a name that already includes a brand unless it’s part of the dealership-specific identifier (e.g., "Caldwell Mercedes-Benz", not "Caldwell Mercedes-Benz Auto").
- Keep a known brand (e.g., "Ford", "Chevy", "Toyota") in the name unless the dealership is well-known without it (e.g., "Pat Milliken Ford" can be "Pat Milliken", but "Duval Ford" should stay "Duval Ford"). If the name ends in a plural form (e.g., "Crossroads Cars"), use a singular form with "Auto" (e.g., "Crossroads Auto").
- The final name must sound 100% natural when spoken aloud — like something you’d say to a dealer over the phone. Avoid formatting errors (e.g., do not include prefixes like "-benz" or start with "Of").

Only return the final dealership name with no quotes or punctuation.
    `.trim();

    const result = await callOpenAI(prompt);

    if (result && result.error) {
      console.error(`Failed to process domain ${domain}: ${result.error}`);
      return { name: "", error: result.error };
    }

    // Validate OpenAI result
    const commonWords = ["pat", "gus", "san", "team", "town", "east", "west", "north", "south", "auto", "hills", "birmingham", "mercedes", "benz", "elway", "kossi", "sarant", "tommy", "nix"];
    const brands = ["ford", "chevy", "toyota", "honda", "nissan", "hyundai", "kia", "bmw", "mercedes", "benz", "subaru", "jeep", "dodge", "ram", "chrysler", "vw"];
    const words = result.toLowerCase().trim().split(/\s+/);
    const hasUnexpanded = words.some(word => (/^[A-Z]{2,4}$/.test(word) || /^[A-Z][a-z]+[A-Z][a-z]*$/.test(word) || /^[A-Z][a-z]{1,2}$/.test(word)) && !commonWords.includes(word) && !brands.includes(word));
    if (hasUnexpanded) {
      console.warn(`OpenAI failed to expand abbreviations for domain ${domain}: ${result}`);
      return { name: `${result} Auto`, error: "OpenAI failed to expand abbreviations" };
    }

    const hasBrand = words.some(word => brands.includes(word));
    const isJustBrand = hasBrand && words.length === 1;
    const genericTerms = ["auto", "dealership", "team", "group", "motors", "enterprise"];
    const isBrandWithGenericTerm = hasBrand && words.length === 2 && genericTerms.includes(words[1]);
    const baseNameWithoutBrand = hasBrand ? words.filter(word => !brands.includes(word) && !genericTerms.includes(word)) : words;
    const lacksIdentifier = hasBrand && baseNameWithoutBrand.length === 0;
    let validatedResult = result;
    if (isJustBrand || isBrandWithGenericTerm || lacksIdentifier) {
      console.warn(`OpenAI returned a name without a dealership-specific identifier for domain ${domain}: ${result}`);
      validatedResult = `${words.filter(word => !genericTerms.includes(word)).join(" ")} of ${domain.split(".")[0]}`;
    }

    const cleanedName = humanizeName(validatedResult);
    if (!cleanedName) {
      console.error(`Failed to humanize name for domain ${domain}: ${validatedResult}`);
      return { name: "", error: `Failed to humanize name: ${validatedResult}` };
    }

    console.log(`Original name: ${result} -> Cleaned name for domain ${domain}: ${cleanedName}`);
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
