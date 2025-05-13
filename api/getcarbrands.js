// /api/getCarBrand.js
const axios = require("axios");
const { callOpenAI } = require("./lib/openai"); // Import callOpenAI

// List of car brands (same as CAR_BRANDS in constants.gs)
const CAR_BRANDS = ["toyota", "infiniti", "chevrolet", "ford", "honda" /* add all brands */];

module.exports = async (req, res) => {
  if (req.method !== "GET" || !req.query.domain) {
    return res.status(400).json({ error: "Invalid request: GET method with domain query parameter required" });
  }

  const domain = req.query.domain.toLowerCase().trim();

  try {
    // Step 1: Vercel Fallback (equivalent to callVercelFallback v2.1)
    const VERCEL_AUTH_TOKEN = process.env.VERCEL_AUTH_TOKEN;
    const VERCEL_AUTOMATION_BYPASS_SECRET = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

    const vercelResponse = await axios.get("https://get-enrich-api-show-revv.vercel.app/public-api/getcarbrands", {
      params: { domain },
      headers: {
        "Authorization": `Bearer ${VERCEL_AUTH_TOKEN}`,
        "X-Vercel-Automation-Bypass": VERCEL_AUTOMATION_BYPASS_SECRET
      }
    });

    const vercelName = vercelResponse.data.toLowerCase(); // e.g., "Westchester Infiniti"
    for (const brand of CAR_BRANDS) {
      if (vercelName.includes(brand)) {
        return res.status(200).json({ brand });
      }
    }

    // Step 2: OpenAI Fallback using callOpenAI
    const prompt = `What car brand does the company at ${domain} sell? Answer with just the brand name (e.g., Toyota). If there are multiple car brands sold by any given company, only return one of them. If unsure, return an empty string.`;
    const openAIResult = await callOpenAI(prompt, {
      model: "gpt-4-turbo",
      max_tokens: 10,
      temperature: 0.3,
      systemMessage: "You are a helpful assistant.",
      retries: 2,
      timeoutMs: 9000
    });

    if (openAIResult.error) {
      throw new Error(`OpenAI error: ${openAIResult.error}`);
    }

    const brand = openAIResult.output.toLowerCase();
    if (CAR_BRANDS.includes(brand)) {
      return res.status(200).json({ brand });
    }

    // If both fallbacks fail, return an empty result
    return res.status(200).json({ brand: "" });
  } catch (error) {
    // Winston logging is handled by callOpenAI; add additional logging if needed
    console.error(`Error processing domain ${domain}:`, error.message);
    return res.status(500).json({ error: `Failed to process domain: ${error.message}` });
  }
};
