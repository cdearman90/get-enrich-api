// /api/getcarbrands.js
const axios = require("axios");
const { callOpenAI } = require("./lib/openai");

// List of car brands (same as CAR_BRANDS in constants.gs)
const CAR_BRANDS = [
  "acura", "alfa romeo", "amc", "aston martin", "audi", "bentley", "bmw", "bugatti", "buick",
  "cadillac", "carmax", "cdj", "cdjrf", "cdjr", "chev", "chevvy", "chevrolet", "chrysler", "cjd", "daewoo",
  "dodge", "eagle", "ferrari", "fiat", "ford", "genesis", "gmc", "honda", "hummer", "hyundai", "inf", "infiniti",
  "isuzu", "jaguar", "jeep", "jlr", "kia", "lamborghini", "land rover", "landrover", "lexus", "lincoln", "lucid",
  "maserati", "maz", "mazda", "mb", "merc", "mercedes", "mercedes-benz", "mercedesbenz", "merk", "mini",
  "mitsubishi", "nissan", "oldsmobile", "plymouth", "polestar", "pontiac", "porsche", "ram", "rivian",
  "rolls-royce", "saab", "saturn", "scion", "smart", "subaru", "subie", "suzuki", "tesla", "toyota",
  "volkswagen", "volvo", "vw", "chevy", "honda"
];

  const BRAND_MAPPING = {
    "acura": "Acura", "alfa romeo": "Alfa Romeo", "amc": "AMC", "aston martin": "Aston Martin", "audi": "Audi",
    "bentley": "Bentley", "bmw": "BMW", "bugatti": "Bugatti", "buick": "Buick", "cadillac": "Cadillac",
    "carmax": "Carmax", "cdj": "Dodge", "cdjrf": "Dodge", "cdjr": "Dodge", "chev": "Chevy",
    "chevvy": "Chevy", "chevrolet": "Chevy", "chrysler": "Chrysler", "cjd": "Dodge", "daewoo": "Daewoo",
    "dodge": "Dodge", "eagle": "Eagle", "ferrari": "Ferrari", "fiat": "Fiat", "ford": "Ford", "genesis": "Genesis",
    "gmc": "GMC", "honda": "Honda", "hummer": "Hummer", "hyundai": "Hyundai", "inf": "Infiniti", "infiniti": "Infiniti",
    "isuzu": "Isuzu", "jaguar": "Jaguar", "jeep": "Jeep", "jlr": "Jaguar Land Rover", "kia": "Kia",
    "lamborghini": "Lambo", "land rover": "Land Rover", "landrover": "Land Rover", "lexus": "Lexus",
    "lincoln": "Ford", "lucid": "Lucid", "maserati": "Maserati", "maz": "Mazda", "mazda": "Mazda",
    "mb": "Mercedes", "merc": "Mercedes", "mercedes": "Mercedes", "mercedes-benz": "Mercedes", "mercedesbenz": "Mercedes", "merk": "Mercedes",
    "mini": "Mini", "mitsubishi": "Mitsubishi", "nissan": "Nissan", "oldsmobile": "Oldsmobile", "plymouth": "Plymouth",
    "polestar": "Polestar", "pontiac": "Pontiac", "porsche": "Porsche", "ram": "Ram", "rivian": "Rivian",
    "rolls-royce": "Rolls-Royce", "saab": "Saab", "saturn": "Saturn", "scion": "Scion", "smart": "Smart",
    "subaru": "Subaru", "subie": "Subaru", "suzuki": "Suzuki", "tesla": "Tesla", "toyota": "Toyota",
    "volkswagen": "VW", "volvo": "Volvo", "vw": "VW", "chevy": "Chevy", "jcd": "Jeep",
      "suby": "Subaru", // Variant of "subie", common in domains like "subytoyota.com"
  "subi": "Subaru", // Additional variant for "Subaru", e.g., "subiauto.com"
  "chr": "Chrysler", // Abbreviation, e.g., "chrdealer.com"
  "chry": "Chrysler", // Common shorthand, e.g., "chryjeep.com"
  "niss": "Nissan", // Abbreviation, e.g., "nissdeal.com"
  "toy": "Toyota", // Abbreviation, e.g., "toyauto.com"
  "hyund": "Hyundai", // Abbreviation, e.g., "hyundsales.com"
  "mercbenz": "Mercedes", // Concatenated variant, e.g., "mercbenzdealer.com"
  "benzo": "Mercedes", // Slang variant, e.g., "benzodeals.com"
  "aud": "Audi", // Abbreviation, e.g., "audsales.com"
  "por": "Porsche", // Abbreviation, e.g., "pordealer.com"
  "volks": "VW", // Abbreviation, e.g., "volksauto.com"
  "jagu": "Jaguar", // Abbreviation, e.g., "jagusales.com"
  "landrov": "Land Rover", // Abbreviation, e.g., "landrovdeal.com"
  "lex": "Lexus", // Abbreviation, e.g., "lexauto.com"
  "infinit": "Infiniti", // Variant, e.g., "infinitcars.com"
  "mitsu": "Mitsubishi", // Abbreviation, e.g., "mitsuauto.com"
  "vinfast": "VinFast", // Newer EV brand, e.g., "vinfastusa.com"
  "fisker": "Fisker", // Newer EV brand, e.g., "fiskerdealer.com"
  "mopar": "Mopar", // Chrysler parts/service brand, e.g., "mopardealer.com"
  "gma": "GMC", // Abbreviation, e.g., "gmauto.com"
  "cad": "Cadillac", // Abbreviation, e.g., "caddealer.com"
  "bui": "Buick", // Abbreviation, e.g., "buiauto.com"
  "lin": "Lincoln", // Abbreviation, e.g., "lindealer.com"
  "mazd": "Mazda", // Abbreviation, e.g., "mazdsales.com"
  "maz": "Mazda",
  "rolls": "Rolls-Royce", // Abbreviation, e.g., "rollsdealer.com"
    "chevr": "Chevy", // Abbreviation, e.g., "chevrdealer.com"
    "chevrol": "Chevy", // Partial variant, e.g., "chevrolauto.com"
    "audis": "Audi", // Plural variant, e.g., "audissales.com"
    "bm": "BMW", // Short abbreviation, e.g., "bmdealer.com"
    "mercben": "Mercedes", // Concatenated variant, e.g., "mercbenauto.com"
    "toyt": "Toyota", // Abbreviation, e.g., "toytcars.com"
    "hyu": "Hyundai", // Short abbreviation, e.g., "hyuauto.com"
    "nis": "Nissan", // Short abbreviation, e.g., "nisdealer.com"
    "sub": "Subaru", // Short abbreviation, e.g., "subauto.com"
    "infinitiy": "Infiniti", // Typo variant, e.g., "infinitiycars.com"
    "kias": "Kia", // Plural variant, e.g., "kiassales.com"
    "vol": "Volvo", // Short abbreviation, e.g., "voldealer.com"
    "porsch": "Porsche", // Partial variant, e.g., "porschauto.com"
    "jagr": "Jaguar", // Abbreviation, e.g., "jagrauto.com"
    "landr": "Land Rover", // Short abbreviation, e.g., "landrauto.com"
    "byd": "BYD", // Emerging EV brand, e.g., "byddealer.com"
    "stellantis": "Stellantis", // Parent company, e.g., "stellantisauto.com"
    "jcdr": "Jeep", // Multi-brand, e.g., "jcdrauto.com"
    "cdjrs": "Chrysler", // Multi-brand, e.g., "cdjrsdealer.com"
    "gmcad": "GMC", // Multi-brand, e.g., "gmcadauto.com"
    "schevy": "chevy",
    "chev": "chevrolet",
    "hondaof": "honda",
    "hmtrs": "hmtr",
    "infinitiof": "infiniti",
    "hondaof": "honda",
    "infinitibhm": ["infiniti", "bhm"],
    "infinitiofgwinnett": ["infiniti", "gwinnett"],
    "infinitioflexington": ["infiniti", "lexington"],
    "infinitioftucson": ["infiniti", "tucson"],
    "jmlexus": ["JM", "Lexus"],
    "toyotaof": ["Toyota"],
    "bmwof": ["BMW"],
    "fordof": ["Ford"],
    "mercedesof": ["M.B."],
    "lexusof": ["Lexus"],
    "nissanof": ["Nissan"],
    "chev": ["Chevy"],
    "audiof": ["Audi"],
    "subaruof": ["Subaru"],
    "vwof": ["VW"],
    "jaguarof": ["Jaguar"],
    "landroverof": ["Land Rover"],
    "arrowford": ["arrow", "ford"],
     "arrowford": ["arrow", "ford"],
  "ascensionhonda": ["ascension", "honda"],
  "ashlandfordchrysler": ["ashland", "ford", "chrysler"],
  "bmwofbrooklyn": ["bmw", "brooklyn"],
  "bmwoffreeport": ["bmw", "freeport"],
  "bmwofnashville": ["bmw", "nashville"],
  "billbrandtford": ["billbrandt", "ford"],
  "bobbrownauto": ["bobbrown", "auto"],
  "blossomchevy": ["blossom", "chevy"],
  "gpi.bmwofcolumbia": ["gpi", "bmw", "columbia"],
  "delandkia": ["deland", "kia"],
  "dellaauto": ["della", "auto"],
  "easleymitsubishi": ["easley", "mitsubishi"],
  "eastwestlincoln": ["eastwest", "lincoln"],
  "dyerauto": ["dyer", "auto"],
  "elderdodge": ["elder", "dodge"],
  "elderhyundai": ["elder", "hyundai"],
  "eldermitsubishi": ["elder", "mitsubishi"],
  "elkinschevrolet": ["elkins", "chevrolet"],
  "epicchevrolet": ["epic", "chevrolet"],
  "executivehonda": ["executive", "honda"],
  "extonnissan": ["exton", "nissan"],
  "faireychevrolet": ["fairey", "chevrolet"],
  "fairwayfordevans": ["fairway", "ford", "evans"],
  "fordfairfield": ["ford", "fairfield"],
  "fordlincolnofcookeville": ["ford", "lincoln", "cookeville"],
  "farlandcars": ["farland", "cars"],
  "friendshipauto": ["friendship", "auto"],
  "goldencircle": ["goldencircle", "auto"],
  "nazarethford": ["nazareth", "ford"],
  "fortbendtoyota": ["fortbend", "toyota"],
  "frankleta": ["frank", "leta"],
  "fremonthyundai": ["fremont", "hyundai"],
  "fresnochrysler": ["fresno", "chrysler"],
  "friendlyhondacuse": ["friendly", "honda", "cuse"],
  "gillelandchevrolet": ["gilleland", "chevrolet"],
  "glendaledcj": ["glendale", "dodge"],
  "goldcoastcadillac": ["goldcoast", "cadillac"],
  "garyforceacura": ["garyforce", "acura"],
  "garyforcehonda": ["garyforce", "honda"],
  "graingernissan": ["grainger", "nissan"],
  "nissanofanderson": ["nissan", "anderson"],
  "grandsubaru": ["grand", "subaru"],
  "grantspasstoyota": ["grantspass", "toyota"],
  "easleymitsubishi.com": ["Easley"],
  "dellaauto.net": ["Della"],
  "hardyautomotive.com": ["Hardy"],
  "homangmripon.com": ["Homan"],
  "landroverdallas.com": ["Land Rover Dallas"],
  "hyundaicityny.com": ["Hyundai City"],
  "griecocars.com": ["Grieco Chevy"],
  "hessertchevy.com": ["Hessert Chevy"],
  "serramontehonda.com": ["Serramonte Honda"],
  "darcars": ["darcars"], // For row 2976
  "audiexchange": ["audi", "exchange"], // For row 2994
  "diverchev": ["diver", "chevy"], // For rows 3047, 3049
  "toyotaknoxville": ["toyota", "knoxville"], // For row 3045
  "springfieldford": ["springfield", "ford"] // For rows 3025, 3027
  };

module.exports = async (req, res) => {
  if (req.method !== "GET" || !req.query.domain) {
    return res.status(400).json({ error: "Invalid request: GET method with domain query parameter required" });
  }

  const domain = req.query.domain.toLowerCase().trim();

  try {
    // Step 1: Vercel Fallback (equivalent to callVercelFallback v2.1)
    let vercelName = "";
    try {
      const VERCEL_AUTH_TOKEN = process.env.VERCEL_AUTH_TOKEN;
      const VERCEL_AUTOMATION_BYPASS_SECRET = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

      const vercelResponse = await axios.get("https://get-enrich-api-show-revv.vercel.app/api/getName", {
        params: { domain },
        headers: {
          "Authorization": `Bearer ${VERCEL_AUTH_TOKEN}`,
          "X-Vercel-Automation-Bypass": VERCEL_AUTOMATION_BYPASS_SECRET
        }
      });

      vercelName = vercelResponse.data.toLowerCase(); // e.g., "Westchester Infiniti"
    } catch (error) {
      console.error(`Vercel fallback failed for domain ${domain}: ${error.message}`);
    }

    if (vercelName) {
      // Check for direct match in CAR_BRANDS
      for (const brand of CAR_BRANDS) {
        if (vercelName.includes(brand)) {
          const standardizedBrand = BRAND_MAPPING[brand] || brand;
          return res.status(200).json({ brand: standardizedBrand });
        }
      }

      // Check for match in BRAND_MAPPING keys
      for (const [key, value] of Object.entries(BRAND_MAPPING)) {
        if (vercelName.includes(key)) {
          return res.status(200).json({ brand: value });
        }
      }
    }

// Step 2: OpenAI Fallback using callOpenAI
const prompt = `What car brand does the company at ${domain} sell? Respond with only the car brand name (e.g., Toyota), nothing else. If the company sells multiple car brands, return the primary or most prominent brand. If the company is not a car dealership or you are unsure, return "unknown".`;
const openAIResult = await callOpenAI(prompt, {
  model: "gpt-4-turbo",
  max_tokens: 10,
  temperature: 0.3,
  systemMessage: "You are a helpful assistant. Respond with only the car brand name, nothing else. If unsure, respond with 'unknown'.",
  retries: 2,
  timeoutMs: 9000
});

if (openAIResult.error) {
  throw new Error(`OpenAI error: ${openAIResult.error}`);
}

const brand = openAIResult.output.toLowerCase();
// Check for direct match in CAR_BRANDS
if (CAR_BRANDS.includes(brand)) {
  const standardizedBrand = BRAND_MAPPING[brand] || brand;
  return res.status(200).json({ brand: standardizedBrand });
}

// Check for match in BRAND_MAPPING keys
for (const [key, value] of Object.entries(BRAND_MAPPING)) {
  if (brand === key) {
    return res.status(200).json({ brand: value });
  }
}

// If both fallbacks fail, return an empty result
return res.status(200).json({ brand: "" });
} catch (error) {
  console.error(`Error processing domain ${domain}:`, error.message);
  return res.status(500).json({ error: `Failed to process domain: ${error.message}` });
}
