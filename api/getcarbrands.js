// /api/getcarbrands.js
import { callOpenAI } from "./lib/openai.js";
import winston from "winston";

// List of car brands (aligned with GAS Constants.gs)
const CAR_BRANDS = [
  "acura", "alfa romeo", "amc", "aston martin", "audi", "bentley", "bmw", "bugatti", "buick",
  "cadillac", "carmax", "cdj", "cdjrf", "cdjr", "chev", "chevvy", "chevrolet", "chrysler", "cjd",
  "daewoo", "dodge", "eagle", "ferrari", "fiat", "ford", "genesis", "gmc", "honda", "hummer",
  "hyundai", "inf", "infiniti", "isuzu", "jaguar", "jeep", "jlr", "kia", "lamborghini", "land rover",
  "landrover", "lexus", "lincoln", "lucid", "maserati", "maz", "mazda", "mb", "merc", "mercedes",
  "mercedes-benz", "mercedesbenz", "merk", "mini", "mitsubishi", "nissan", "oldsmobile", "plymouth",
  "polestar", "pontiac", "porsche", "ram", "rivian", "rolls-royce", "saab", "saturn", "scion", "smart",
  "subaru", "subie", "suzuki", "tesla", "toyota", "volkswagen", "volvo", "vw", "chevy", "honda",
  "suby", "subi", "chr", "chry", "niss", "toy", "hyund", "mercbenz", "benzo", "aud", "por", "volks",
  "jagu", "landrov", "lex", "infinit", "mitsu", "vinfast", "fisker", "mopar", "gma", "cad", "bui",
  "lin", "mazd", "rolls", "chevr", "chevrol", "audis", "bm", "mercben", "toyt", "hyu", "nis", "sub",
  "infinitiy", "kias", "vol", "porsch", "jagr", "landr", "byd", "stellantis", "jcdr", "cdjrs", "gmcad"
];

// BRAND_MAPPING (aligned with GAS, single-brand mappings only)
const BRAND_MAPPING = {
  "acura": "Acura", "alfa romeo": "Alfa Romeo", "amc": "AMC", "aston martin": "Aston Martin", "audi": "Audi",
  "aud": "Audi", "audis": "Audi", "bentley": "Bentley", "bmw": "BMW", "bm": "BMW", "bugatti": "Bugatti",
  "buick": "Buick", "bui": "Buick", "cadillac": "Cadillac", "cad": "Cadillac", "carmax": "Carmax",
  "cdj": "Chrysler", "cdjrf": "Chrysler", "cdjr": "Chrysler", "cdjrs": "Chrysler", "chev": "Chevrolet",
  "chevvy": "Chevrolet", "chevrolet": "Chevrolet", "chevr": "Chevrolet", "chevrol": "Chevrolet",
  "schevy": "Chevrolet", "chevy": "Chevrolet", "chrysler": "Chrysler", "chr": "Chrysler", "chry": "Chrysler",
  "cjd": "Chrysler", "jcdr": "Chrysler", "cdjrs": "Chrysler", "daewoo": "Daewoo", "dodge": "Dodge",
  "eagle": "Eagle", "ferrari": "Ferrari", "fiat": "Fiat", "ford": "Ford", "genesis": "Genesis", "gmc": "GMC",
  "gma": "GMC", "gmcad": "GMC", "honda": "Honda", "hondaof": "Honda", "hummer": "Hummer", "hyundai": "Hyundai",
  "hyund": "Hyundai", "hyu": "Hyundai", "inf": "Infiniti", "infiniti": "Infiniti", "infinit": "Infiniti",
  "infinitiy": "Infiniti", "infinitiof": "Infiniti", "isuzu": "Isuzu", "jaguar": "Jaguar", "jagu": "Jaguar",
  "jagr": "Jaguar", "jaguarof": "Jaguar", "jeep": "Jeep", "jcd": "Jeep", "jlr": "Jaguar", "jcdr": "Jeep",
  "kia": "Kia", "kias": "Kia", "lamborghini": "Lamborghini", "land rover": "Land Rover", "landrover": "Land Rover",
  "landrov": "Land Rover", "landr": "Land Rover", "landroverof": "Land Rover", "lexus": "Lexus", "lex": "Lexus",
  "lexusof": "Lexus", "lincoln": "Lincoln", "lin": "Lincoln", "lucid": "Lucid", "maserati": "Maserati",
  "mazda": "Mazda", "maz": "Mazda", "mazd": "Mazda", "mb": "Mercedes-Benz", "merc": "Mercedes-Benz",
  "mercedes": "Mercedes-Benz", "mercedes-benz": "Mercedes-Benz", "mercedesbenz": "Mercedes-Benz",
  "mercbenz": "Mercedes-Benz", "mercben": "Mercedes-Benz", "merk": "Mercedes-Benz", "benzo": "Mercedes-Benz",
  "mercedesof": "Mercedes-Benz", "mini": "Mini", "mitsubishi": "Mitsubishi", "mitsu": "Mitsubishi",
  "nissan": "Nissan", "niss": "Nissan", "nis": "Nissan", "nissanof": "Nissan", "oldsmobile": "Oldsmobile",
  "plymouth": "Plymouth", "polestar": "Polestar", "pontiac": "Pontiac", "porsche": "Porsche", "por": "Porsche",
  "porsch": "Porsche", "ram": "Ram", "rivian": "Rivian", "rolls-royce": "Rolls-Royce", "rolls": "Rolls-Royce",
  "saab": "Saab", "saturn": "Saturn", "scion": "Scion", "smart": "Smart", "subaru": "Subaru", "subie": "Subaru",
  "suby": "Subaru", "subi": "Subaru", "sub": "Subaru", "subaruof": "Subaru", "suzuki": "Suzuki", "tesla": "Tesla",
  "toyota": "Toyota", "toy": "Toyota", "toyt": "Toyota", "toyotaof": "Toyota", "volkswagen": "Volkswagen",
  "volks": "Volkswagen", "vw": "Volkswagen", "vwof": "Volkswagen", "volvo": "Volvo", "vol": "Volvo",
  "vinfast": "VinFast", "fisker": "Fisker", "mopar": "Chrysler", "byd": "BYD", "stellantis": "Chrysler",
  "bmwof": "BMW", "fordof": "Ford", "audiof": "Audi"
};

// Winston logger setup
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

module.exports = async (req, res) => {
  if (req.method !== "POST" || !req.body.domain) {
    logger.error(`Invalid request: Method=${req.method}, Domain=${req.body.domain}`);
    return res.status(400).json({ error: "Invalid request: POST method with domain in body required" });
  }

  const domain = req.body.domain.toLowerCase().trim();
  const tokens = req.body.tokens || domain.toLowerCase().replace(/^(www\.)/, "").replace(/\..*$/, "").split(/[-_.]/);
  const context = req.body.context || {};
  logger.info(`Processing domain: ${domain}`);

  try {
    // Step 1: Check domain tokens for direct brand match (local fallback)
    let primaryBrand = null;
    let confidence = 0;
    for (const brand of CAR_BRANDS) {
      if (tokens.some(token => token.includes(brand))) {
        primaryBrand = brand;
        confidence = 75; // Local fallback confidence
        logger.info(`Local fallback brand match for domain ${domain}: ${primaryBrand} (Confidence: ${confidence}%)`);
        break;
      }
    }

    // Step 2: OpenAI Fallback if no direct match
    if (!primaryBrand) {
      const knownBrands = context.knownBrands || CAR_BRANDS;
      const prompt = `Given the domain ${domain}, identify the primary car brand sold by the dealership. Check the domain for brand names or patterns (e.g., "honda" in "unionparkhonda.com" indicates Honda). Respond with only the brand name (e.g., Toyota), nothing else. Prioritize these known brands: ${knownBrands.join(", ")}. If multiple brands are sold, choose the most prominent one from the known brands. If the domain does not represent a car dealership or you are unsure, return "unknown".`;
      const openAIResult = await callOpenAI(prompt, {
        model: "gpt-4-turbo",
        max_tokens: 10,
        temperature: 0.3,
        systemMessage: "Respond with only the car brand name or 'unknown', nothing else.",
        retries: 2,
        timeoutMs: 9000
      });

      if (openAIResult.error) {
        throw new Error(`OpenAI error: ${openAIResult.error}`);
      }

      const brand = openAIResult.output.toLowerCase();
      logger.info(`OpenAI response for domain ${domain}: ${brand}`);

      if (CAR_BRANDS.includes(brand)) {
        primaryBrand = brand;
        confidence = brand === "unknown" ? 65 : 85; // Vercel confidence (boost to 95% post-deployment)
      } else {
        for (const [key, mappedBrand] of Object.entries(BRAND_MAPPING)) {
          if (brand === key) {
            primaryBrand = mappedBrand; // Use the mapped brand name (e.g., "Chevrolet" for "chev")
            confidence = 85;
            break;
          }
        }
      }

      if (!primaryBrand) {
        confidence = brand === "unknown" ? 65 : 0;
        // Retry local fallback if OpenAI returns "unknown"
        if (brand === "unknown") {
          for (const brand of CAR_BRANDS) {
            if (tokens.some(token => token.includes(brand))) {
              primaryBrand = brand;
              confidence = 75;
              logger.info(`Local fallback after OpenAI "unknown" for domain ${domain}: ${primaryBrand} (Confidence: ${confidence}%)`);
              break;
            }
          }
        }
      }
    }

    // Finalize response
    if (primaryBrand && confidence >= 65) {
      const standardizedBrand = BRAND_MAPPING[primaryBrand] || primaryBrand.charAt(0).toUpperCase() + primaryBrand.slice(1).toLowerCase();
      logger.info(`Brand match found for domain ${domain}: ${standardizedBrand} (Confidence: ${confidence}%)`);
      return res.status(200).json({ brand: standardizedBrand, confidence });
    }

    logger.info(`No brand match for domain ${domain} (Confidence: ${confidence}%)`);
    return res.status(200).json({ brand: "", confidence });
  } catch (error) {
    logger.error(`Error processing domain ${domain}: ${error.message}`);
    return res.status(500).json({ error: `Failed to process domain: ${error.message}` });
  }
};
