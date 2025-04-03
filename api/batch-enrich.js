// Simple rate-limiting library (simulating p-limit)
const pLimit = (concurrency) => {
  let active = 0;
  const queue = [];

  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve).catch(reject).finally(() => {
      active--;
      next();
    });
  };

  return (fn) => new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    next();
  });
};

// In-memory cache for domain-to-name mappings
const domainCache = new Map();

// Memoized Levenshtein Distance for typo correction
const levenshteinDistance = (a, b, cache = new Map()) => {
  const key = `${a}|${b}`;
  if (cache.has(key)) return cache.get(key);
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  const dist = matrix[b.length][a.length];
  cache.set(key, dist);
  return dist;
};

// Global arrays for city normalization
const topCitiesNormalized = [
  "losangeles", "sandiego", "sanjose", "sanfrancisco", "fresno", "sacramento",
  "longbeach", "oakland", "bakersfield", "anaheim", "stockton", "riverside",
  "santaana", "irvine", "chulavista", "fremont", "santaclarita", "sanbernardino",
  "modesto", "morenovalley", "jacksonville", "miami", "tampa", "orlando",
  "stpetersburg", "hialeah", "portstlucie", "capecoral", "tallahassee",
  "fortlauderdale", "pembrokepines", "hollywood", "gainesville", "miramar",
  "coralsprings", "palmbay", "westpalmbeach", "clearwater", "lakeland",
  "pompanobeach", "newyorkcity", "buffalo", "rochester", "yonkers", "syracuse",
  "albany", "newrochelle", "mountvernon", "schenectady", "utica", "whiteplains",
  "hempstead", "troy", "niagarafalls", "binghamton", "freeport", "valleystream",
  "longbeach", "springvalley", "rome", "houston", "sanantonio", "dallas",
  "austin", "fortworth", "elpaso", "arlington", "corpuschristi", "plano",
  "laredo", "lubbock", "garland", "irving", "frisco", "amarillo", "mckinney",
  "grandprairie", "brownsville", "killeen", "pasadena", "birmingham",
  "montgomery", "huntsville", "mobile", "tuscaloosa", "anchorage", "juneau",
  "fairbanks", "phoenix", "tucson", "mesa", "littlerock", "fortsmith",
  "fayetteville", "denver", "coloradosprings", "aurora", "bridgeport",
  "newhaven", "stamford", "wilmington", "dover", "newark", "washingtondc",
  "atlanta", "columbus", "augusta", "honolulu", "eastonolulu", "pearlcity",
  "boise", "meridian", "nampa", "chicago", "aurora", "joliet", "indianapolis",
  "fortwayne", "evansville", "desmoines", "cedarrapids", "davenport", "wichita",
  "overlandpark", "kansascity", "louisville", "lexington", "bowlinggreen",
  "neworleans", "batonrouge", "shreveport", "portland", "lewiston", "bangor",
  "baltimore", "columbia", "germantown", "boston", "worcester", "springfield",
  "detroit", "grandrapids", "warren", "minneapolis", "stpaul", "rochester",
  "jackson", "gulfport", "southaven", "kansascity", "stlouis", "springfield",
  "billings", "missoula", "greatfalls", "omaha", "lincoln", "bellevue",
  "lasvegas", "henderson", "reno", "manchester", "nashua", "concord", "newark",
  "jerseycity", "paterson", "albuquerque", "lascruces", "riorancho", "charlotte",
  "raleigh", "greensboro", "fargo", "bismarck", "grandforks", "columbus",
  "cleveland", "cincinnati", "oklahomacity", "tulsa", "norman", "portland",
  "eugene", "salem", "philadelphia", "pittsburgh", "allentown", "providence",
  "cranston", "warwick", "charleston", "columbia", "northcharleston",
  "siouxfalls", "rapidcity", "aberdeen", "nashville", "memphis", "knoxville",
  "saltlakecity", "westvalleycity", "westjordan", "burlington",
  "southburlington", "rutland", "virginiabeach", "chesapeake", "norfolk",
  "seattle", "spokane", "tacoma", "charleston", "huntington", "morgantown",
  "milwaukee", "madison", "greenbay", "cheyenne", "casper", "laramie"
];

const cityDisplayNames = {
  "losangeles": "Los Angeles", "sandiego": "San Diego", "sanjose": "San Jose",
  "sanfrancisco": "San Francisco", "fresno": "Fresno", "sacramento": "Sacramento",
  "longbeach": "Long Beach", "oakland": "Oakland", "bakersfield": "Bakersfield",
  "anaheim": "Anaheim", "stockton": "Stockton", "riverside": "Riverside",
  "santaana": "Santa Ana", "irvine": "Irvine", "chulavista": "Chula Vista",
  "fremont": "Fremont", "santaclarita": "Santa Clarita", "sanbernardino": "San Bernardino",
  "modesto": "Modesto", "morenovalley": "Moreno Valley", "jacksonville": "Jacksonville",
  "miami": "Miami", "tampa": "Tampa", "orlando": "Orlando", "stpetersburg": "St Petersburg",
  "hialeah": "Hialeah", "portstlucie": "Port St Lucie", "capecoral": "Cape Coral",
  "tallahassee": "Tallahassee", "fortlauderdale": "Fort Lauderdale", "pembrokepines": "Pembroke Pines",
  "hollywood": "Hollywood", "gainesville": "Gainesville", "miramar": "Miramar",
  "coralsprings": "Coral Springs", "palmbay": "Palm Bay", "westpalmbeach": "West Palm Beach",
  "clearwater": "Clearwater", "lakeland": "Lakeland", "pompanobeach": "Pompano Beach",
  "newyorkcity": "New York City", "buffalo": "Buffalo", "rochester": "Rochester",
  "yonkers": "Yonkers", "syracuse": "Syracuse", "albany": "Albany", "newrochelle": "New Rochelle",
  "mountvernon": "Mount Vernon", "schenectady": "Schenectady", "utica": "Utica",
  "whiteplains": "White Plains", "hempstead": "Hempstead", "troy": "Troy",
  "niagarafalls": "Niagara Falls", "binghamton": "Binghamton", "freeport": "Freeport",
  "valleystream": "Valley Stream", "longbeach": "Long Beach", "springvalley": "Spring Valley",
  "rome": "Rome", "houston": "Houston", "sanantonio": "San Antonio", "dallas": "Dallas",
  "austin": "Austin", "fortworth": "Fort Worth", "elpaso": "El Paso", "arlington": "Arlington",
  "corpuschristi": "Corpus Christi", "plano": "Plano", "laredo": "Laredo", "lubbock": "Lubbock",
  "garland": "Garland", "irving": "Irving", "frisco": "Frisco", "amarillo": "Amarillo",
  "mckinney": "McKinney", "grandprairie": "Grand Prairie", "brownsville": "Brownsville",
  "killeen": "Killeen", "pasadena": "Pasadena", "birmingham": "Birmingham",
  "montgomery": "Montgomery", "huntsville": "Huntsville", "mobile": "Mobile",
  "tuscaloosa": "Tuscaloosa", "anchorage": "Anchorage", "juneau": "Juneau",
  "fairbanks": "Fairbanks", "phoenix": "Phoenix", "tucson": "Tucson", "mesa": "Mesa",
  "littlerock": "Little Rock", "fortsmith": "Fort Smith", "fayetteville": "Fayetteville",
  "denver": "Denver", "coloradosprings": "Colorado Springs", "aurora": "Aurora",
  "bridgeport": "Bridgeport", "newhaven": "New Haven", "stamford": "Stamford",
  "wilmington": "Wilmington", "dover": "Dover", "newark": "Newark", "washingtondc": "Washington DC",
  "atlanta": "Atlanta", "columbus": "Columbus", "augusta": "Augusta", "honolulu": "Honolulu",
  "eastonolulu": "East Honolulu", "pearlcity": "Pearl City", "boise": "Boise",
  "meridian": "Meridian", "nampa": "Nampa", "chicago": "Chicago", "aurora": "Aurora",
  "joliet": "Joliet", "indianapolis": "Indianapolis", "fortwayne": "Fort Wayne",
  "evansville": "Evansville", "desmoines": "Des Moines", "cedarrapids": "Cedar Rapids",
  "davenport": "Davenport", "wichita": "Wichita", "overlandpark": "Overland Park",
  "kansascity": "Kansas City", "louisville": "Louisville", "lexington": "Lexington",
  "bowlinggreen": "Bowling Green", "neworleans": "New Orleans", "batonrouge": "Baton Rouge",
  "shreveport": "Shreveport", "portland": "Portland", "lewiston": "Lewiston",
  "bangor": "Bangor", "baltimore": "Baltimore", "columbia": "Columbia",
  "germantown": "Germantown", "boston": "Boston", "worcester": "Worcester",
  "springfield": "Springfield", "detroit": "Detroit", "grandrapids": "Grand Rapids",
  "warren": "Warren", "minneapolis": "Minneapolis", "stpaul": "St Paul",
  "rochester": "Rochester", "jackson": "Jackson", "gulfport": "Gulfport",
  "southaven": "Southaven", "kansascity": "Kansas City", "stlouis": "St Louis",
  "springfield": "Springfield", "billings": "Billings", "missoula": "Missoula",
  "greatfalls": "Great Falls", "omaha": "Omaha", "lincoln": "Lincoln",
  "bellevue": "Bellevue", "lasvegas": "Las Vegas", "henderson": "Henderson",
  "reno": "Reno", "manchester": "Manchester", "nashua": "Nashua", "concord": "Concord",
  "newark": "Newark", "jerseycity": "Jersey City", "paterson": "Paterson",
  "albuquerque": "Albuquerque", "lascruces": "Las Cruces", "riorancho": "Rio Rancho",
  "charlotte": "Charlotte", "raleigh": "Raleigh", "greensboro": "Greensboro",
  "fargo": "Fargo", "bismarck": "Bismarck", "grandforks": "Grand Forks",
  "columbus": "Columbus", "cleveland": "Cleveland", "cincinnati": "Cincinnati",
  "oklahomacity": "Oklahoma City", "tulsa": "Tulsa", "norman": "Norman",
  "portland": "Portland", "eugene": "Eugene", "salem": "Salem", "philadelphia": "Philadelphia",
  "pittsburgh": "Pittsburgh", "allentown": "Allentown", "providence": "Providence",
  "cranston": "Cranston", "warwick": "Warwick", "charleston": "Charleston",
  "columbia": "Columbia", "northcharleston": "North Charleston", "siouxfalls": "Sioux Falls",
  "rapidcity": "Rapid City", "aberdeen": "Aberdeen", "nashville": "Nashville",
  "memphis": "Memphis", "knoxville": "Knoxville", "saltlakecity": "Salt Lake City",
  "westvalleycity": "West Valley City", "westjordan": "West Jordan",
  "burlington": "Burlington", "southburlington": "South Burlington", "rutland": "Rutland",
  "virginiabeach": "Virginia Beach", "chesapeake": "Chesapeake", "norfolk": "Norfolk",
  "seattle": "Seattle", "spokane": "Spokane", "tacoma": "Tacoma", "charleston": "Charleston",
  "huntington": "Huntington", "morgantown": "Morgantown", "milwaukee": "Milwaukee",
  "madison": "Madison", "greenbay": "Green Bay", "cheyenne": "Cheyenne",
  "casper": "Casper", "laramie": "Laramie"
};

const splitDomainIntoWords = (domain) => {
  let name = domain.replace(/\.com$/, '');
  name = name.replace(/([a-z])([A-Z])/g, '$1 $2')
             .replace(/([a-zA-Z])(\d)/g, '$1 $2')
             .replace(/(\d)([a-zA-Z])/g, '$1 $2');
  return name.split(/\s+/).filter(word => word);
};

const normalizeText = (name) => {
  if (!name || typeof name !== "string") return [];
  let result = name.replace(/^"|"$/g, '');
  let words = result.toLowerCase().trim().split(/\s+/);
  if (words[0] === "the") words.shift();
  return words;
};

const detectBrand = (words) => {
  const brands = [
    "chevrolet", "gmc", "cadillac", "buick", "ford", "lincoln", "chrysler",
    "dodge", "jeep", "ram", "tesla", "rivian", "lucid", "honda", "nissan",
    "hyundai", "kia", "bmw", "mercedes", "benz", "subaru", "toyota", "vw",
    "lexus", "infiniti"
  ];
  const brand = words.find(word => brands.includes(word.toLowerCase()));
  return { hasBrand: !!brand, brand };
};

const decompressDomain = (words, domain) => {
  const domainWords = splitDomainIntoWords(domain).map(word => word.toLowerCase());
  let splitDomainWords = domainWords;
  if (domainWords.length === 1) {
    const dw = domainWords[0];
    const brands = [
      "chevrolet", "gmc", "cadillac", "buick", "ford", "lincoln", "chrysler",
      "dodge", "jeep", "ram", "tesla", "rivian", "lucid", "honda", "nissan",
      "hyundai", "kia", "bmw", "mercedes", "benz", "subaru", "toyota", "vw",
      "lexus", "infiniti"
    ];
    const commonNames = ["ted", "britt", "anderson", "duval", "pat", "milliken"];
    let tempWords = [dw];
    for (const brand of brands) {
      if (dw.includes(brand)) {
        tempWords = [dw.replace(brand, ""), brand].filter(Boolean);
        break;
      }
    }
    for (const name of commonNames) {
      if (dw.includes(name) && tempWords.length === 1) {
        tempWords = [name, dw.replace(name, "")].filter(Boolean);
        break;
      }
    }
    for (const city of topCitiesNormalized) {
      if (dw.includes(city) && tempWords.length === 1) {
        tempWords = [city, dw.replace(city, "")].filter(Boolean);
        break;
      }
    }
    splitDomainWords = tempWords;
  }

  const result = [];
  let domainIndex = 0;
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (domainIndex >= splitDomainWords.length) {
      result.push(word);
      continue;
    }
    const domainWord = splitDomainWords[domainIndex];
    if (domainWord.includes(word.toLowerCase()) || word.toLowerCase().includes(domainWord)) {
      result.push(word);
      domainIndex++;
    } else {
      result.push(word);
    }
  }
  return result;
};

const correctTypos = (words) => {
  const cache = new Map(); // Per-call cache for this function
  return words.map(word => {
    const normalizedWord = word.toLowerCase().replace(/\s+/g, '');
    const closestMatch = topCitiesNormalized.reduce((best, city) => {
      const distance = levenshteinDistance(normalizedWord, city, cache);
      if (distance < best.distance && distance <= 3) {
        return { city, distance };
      }
      return best;
    }, { city: null, distance: Infinity });

    if (closestMatch.city) {
      return cityDisplayNames[closestMatch.city];
    }
    return word;
  });
};

const cleanupFillers = (words) => {
  const fillers = ["motors", "llc", "inc", "enterprise", "group", "dealership", "team"];
  return words.filter(word => !fillers.includes(word.toLowerCase())).map(word => word.replace(/^-/, ""));
};

const adjustForPossessiveFlow = (words) => {
  if (words.length > 1 && words[1].toLowerCase().endsWith("s") && words[1].toLowerCase() !== "cars") {
    words[1] = words[1].replace(/s$/, "");
  }
  return words;
};

const enforceColdEmailCompatibility = (words, domain) => {
  const result = words.join(" ").replace(/\s+/g, " ").trim();
  const flags = [];

  if (result.toLowerCase().startsWith("of ")) {
    flags.push("InvalidStart");
  }

  const wellKnownNames = [
    "pat milliken", "tuttle click", "penske auto", "union park", "malouf auto",
    "tasca auto", "suntrup auto", "jt auto"
  ];
  let finalResult = result;
  if (!wellKnownNames.some(wn => wn.includes("-") && result.toLowerCase().includes(wn))) {
    finalResult = finalResult.replace(/-/g, " ");
  }

  return { name: finalResult, flags };
};

const detectAbbreviation = (words) => {
  const states = [
    "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut",
    "delaware", "florida", "georgia", "hawaii", "idaho", "illinois", "indiana", "iowa",
    "kansas", "kentucky", "louisiana", "maine", "maryland", "massachusetts", "michigan",
    "minnesota", "mississippi", "missouri", "montana", "nebraska", "nevada", "new hampshire",
    "new jersey", "new mexico", "new york", "north carolina", "north dakota", "ohio",
    "oklahoma", "oregon", "pennsylvania", "rhode island", "south carolina", "south dakota",
    "tennessee", "texas", "utah", "vermont", "virginia", "washington", "west virginia",
    "wisconsin", "wyoming", "district of columbia", "dc"
  ];

  const commonWords = [
    "pat", "gus", "san", "team", "town", "east", "west", "north", "south", "auto",
    "hills", "birmingham", "mercedes", "benz", "elway", "kossi", "sarant", "tommy", "nix",
    ...states,
    ...topCitiesNormalized
  ];

  return words.some(word => (
    (/^[A-Z]{2,4}$/.test(word) ||
     /^[A-Z][a-z]+[A-Z][a-z]*$/.test(word) ||
     /^[A-Z][a-z]{1,2}$/.test(word) ||
     !/^[a-z]+$/i.test(word) && !commonWords.includes(word.toLowerCase()) && word.length > 3 && !/^(mccarthy|mclarty)$/i.test(word))
  ) && !commonWords.includes(word.toLowerCase()));
};

const removeUnnecessaryAuto = (words) => {
  if (words[words.length - 1] === "auto" && words.length > 1) {
    const nameWithoutAuto = words.slice(0, -1).join(" ").toLowerCase();
    if (words.length > 2 || commonWords.includes(nameWithoutAuto)) {
      words = words.slice(0, -1);
    }
  }
  return words;
};

const computeConfidenceScore = (words, domain, hasBrand, hasAbbreviation) => {
  let score = 0;
  const domainWords = splitDomainIntoWords(domain).map(word => word.toLowerCase());
  const nameWords = words.map(word => word.toLowerCase());
  const hasDomainMatch = nameWords.some(word => domainWords.includes(word) && word.length > 3);
  score += hasDomainMatch ? 40 : 0;
  score += hasBrand ? 30 : 0;
  score += hasAbbreviation ? 0 : 20;
  const wellKnownNames = [
    "pat milliken", "tuttle click", "penske auto", "union park", "malouf auto",
    "tasca auto", "suntrup auto", "jt auto"
  ];
  const nameStr = words.join(" ").toLowerCase();
  score += wellKnownNames.includes(nameStr) ? 10 : 0;
  return score;
};

const applyMinimalFormatting = (name) => {
  let result = name
    .replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1))
    .replace(/Mccarthy/g, "McCarthy")
    .replace(/Mclarty/g, "McLarty")
    .replace(/Bmw/g, "BMW")
    .replace(/Vw/g, "VW")
    .replace(/'s\b/gi, "'s")
    .replace(/([a-z])'S\b/gi, "$1's");

  Object.keys(cityDisplayNames).forEach(normalized => {
    const displayName = cityDisplayNames[normalized];
    const regex = new RegExp(`\\b${normalized}\\b`, "gi");
    result = result.replace(regex, displayName);
  });

  return result;
};

const humanizeName = (name, domain) => {
  let words = normalizeText(name);
  const { hasBrand } = detectBrand(words);
  const wellKnownNames = [
    "pat milliken", "tuttle click", "penske auto", "union park", "malouf auto",
    "tasca auto", "suntrup auto", "jt auto"
  ];
  const normalizedName = words.join(" ").toLowerCase();
  if (wellKnownNames.includes(normalizedName) && !hasBrand) {
    return {
      name: applyMinimalFormatting(normalizedName),
      confidenceScore: 90,
      flags: []
    };
  }

  words = decompressDomain(words, domain);
  words = [...new Set(words)]; // Prevent duplication
  words = correctTypos(words);
  const hasAbbreviation = detectAbbreviation(words);
  words = cleanupFillers(words);
  words = removeUnnecessaryAuto(words);
  words = adjustForPossessiveFlow(words);
  const { name: finalName, flags } = enforceColdEmailCompatibility(words, domain);
  const confidenceScore = computeConfidenceScore(words, domain, hasBrand, hasAbbreviation);
  if (hasAbbreviation) flags.push("Unexpanded");

  return {
    name: applyMinimalFormatting(finalName),
    confidenceScore,
    flags
  };
};

export default async function handler(req, res) {
  const startTime = Date.now();
  console.log("Received request to /api/batch-enrich at", new Date().toISOString());

  let leads;
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

  if (!Array.isArray(leads) || leads.length === 0) {
    console.error("Invalid lead list:", leads);
    return res.status(400).json({ error: "Missing or invalid lead list" });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY in environment variables");
    return res.status(500).json({ error: "Missing OPENAI_API_KEY in environment variables" });
  }

  const limit = pLimit(100 / 60); // ~1.67 requests per second
  const manualReviewQueue = [];
  const results = [];
  let totalTokens = 0;

  const callOpenAI = async (prompt, retries = 3, delay = 2000) => {
    const model = process.env.OPENAI_MODEL || "gpt-4-turbo";
    console.log("Calling OpenAI with prompt:", prompt);
    const estimatedTokens = Math.ceil(prompt.length / 4);
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await limit(() => fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: "You are a dealership naming expert with extensive knowledge of U.S. automotive dealerships, their branding, and naming conventions. Your task is to generate clean, human-friendly dealership names that are natural for use in cold email campaigns." },
              { role: "user", content: prompt }
            ],
            temperature: 0.3
          }),
          signal: controller.signal
        }));

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
        const match = content.match(/##Name:\s*(.+)/);
        if (!match) {
          console.error("Failed to extract name from OpenAI response:", content);
          throw new Error("Invalid OpenAI response format: missing ##Name: delimiter");
        }
        return { result: match[1].trim(), tokens: estimatedTokens };
      } catch (err) {
        if (err.name === "AbortError") {
          console.error("OpenAI request timed out after 30 seconds");
          if (attempt < retries) {
            console.warn(`Retrying (${attempt}/${retries}) after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          return { result: null, error: "OpenAI request timed out after 30 seconds", tokens: estimatedTokens };
        }
        if (attempt < retries) {
          console.warn(`OpenAI request failed, retrying (${attempt}/${retries}) after ${delay}ms...`, err.message);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        console.error("OpenAI error after retries:", err.message);
        return { result: null, error: `OpenAI error: ${err.message}`, tokens: estimatedTokens };
      }
    }
  };

  const cleanCompanyName = async (lead) => {
    const { domain } = lead;
    if (!domain) {
      console.error("Missing domain for lead:", lead);
      return { name: "", confidenceScore: 0, error: "Missing domain" };
    }

    if (domainCache.has(domain)) {
      const cached = domainCache.get(domain);
      console.log(`Cache hit for domain ${domain}: ${cached.name}`);
      return cached;
    }

    const prompt = `
Given the dealership domain "${domain}" sourced from an email list, return a clean, human-friendly dealership name that would be used naturally in conversation or cold outreach, based on your knowledge of the dealership's domain, logo, and homepage meta title as of April 2025. Consider the domain, logo, and homepage meta title equally to formulate the most natural name, as if a dealer is casually speaking to another dealer in a conversation.

The name must fit seamlessly in cold email copy like:
- "{{CompanyName}}’s CRM isn’t broken — it’s bleeding."
- "Want me to run {{CompanyName}}’s CRM numbers?"
- "$450K may be hiding in {{CompanyName}}’s CRM."
Ensure the name is singular to work naturally with the possessive form (e.g., Duval Ford’s, Pat Milliken’s).

### Do's:
- Generate a name that sounds natural and conversational, as if one dealer is speaking to another.
- Decompress the domain name by separating compressed words using common US first and last names, known car brand names (e.g., Ford, Chevy, Toyota, GMC, Kia), and US city names or geographic regions. For example, unionpark → Union Park, richmondford → Richmond Ford.
- Include a dealership-specific identifier (e.g., a city, state, person’s last name, or unique name) when it makes sense and sounds natural, like Duval Ford, Athens Ford, Chastang Ford, Mercedes-Benz Caldwell, BMW West Springfield.
- Use well-known dealership names if they are recognizable, like Pat Milliken, Tuttle-Click, Penske Auto, Union Park, Malouf Auto, Tasca Auto, Suntrup Auto, JT Auto. Do not append a brand to well-known names, e.g., Pat Milliken Ford → Pat Milliken.
- Include "Auto" if it makes the name sound more natural and the name lacks a brand, e.g., Fletcher Auto, or if it’s part of the dealership’s identity, e.g., Lifted Trucks Auto. Only add "Auto" if the name is ambiguous without it, e.g., Regal → Regal Auto, but not Ted Britt → Ted Britt Auto.
- Always use "auto" instead of "automotive", only where applicable.
- Ensure proper spacing and capitalization, like San Leandro Ford instead of sanleandroford.
- Prefer spaces over dashes for names unless the dash is part of the dealership’s well-known identity, e.g., Tuttle-Click → Tuttle Click unless Tuttle-Click is explicitly well-known.
- Prioritize the domain when generating the name, ensuring the name contains at least one significant word from the domain, e.g., newhollandauto.com → New Holland Auto, not Crossroads Auto.

### Don'ts:
- Do not return just the car brand, like Ford, Chevrolet, Toyota.
- Do not start the name with "of", like of Greenwich (should be Greenwich Toyota). Names like Team Ford are acceptable and should not be transformed into Ford of Teamford.
- Never capitalize the first letter of transition words like "of" or "to".
- Never capitalize an S after an apostrophe, e.g., Jane'S Auto Group.
- Avoid using all capital letters in a word, unless it's initials like JT or MB. Use your best judgment to identify the exceptions.
- Avoid using one-word names or names with more than 4 words, unless you think it is appropriate for the use case.
- Never use 5 words in one name under any circumstances.
- Do not include city names, person names, or marketing phrases, e.g., Jacksonville’s Best Dealership, Stuart, unless they are essential to the dealership’s identity, e.g., Miami Lakes Auto Mall. Simplify city names if possible, e.g., West Springfield → Springfield.
- Do not include .com, www, dealer, autos, group, inc, llc, hyphens, URLs, symbols, or words like Website, Home, Welcome.
- Avoid filler words like LLC, Inc, Enterprise, Group, or Team unless essential to the dealership’s identity, e.g., McCarthy Auto Group → McCarthy Auto.

### Example Inputs and Outputs:
Input: Domain: duvalford.com
Output: ##Name: Duval Ford

Input: Domain: patmillikenford.com
Output: ##Name: Pat Milliken

Input: Domain: sanleandroford.com
Output: ##Name: San Leandro Ford

Input: Domain: miamilakesautomall.com
Output: ##Name: Miami Lakes Auto Mall

Input: Domain: unionpark.com
Output: ##Name: Union Park

Return the final dealership name in the format: ##Name: [Clean Dealership Name]
Use your best judgment to choose the most natural name to flow in our cold email examples.
    `.trim();

    const { result, error, tokens } = await callOpenAI(prompt);
    totalTokens += tokens;

    if (error) {
      console.error(`Failed to process domain ${domain}: ${error}`);
      return { name: "", confidenceScore: 0, error };
    }

    try {
      const gptNameRaw = result || "";
      const match = gptNameRaw.match(/##Name:\s*(.+)/);
      const extractedName = match ? match[1].trim() : "";

      if (!extractedName) {
        console.error(`No valid ##Name found for domain ${domain}: ${result}`);
        return { name: "", confidenceScore: 0, error: "No valid ##Name found" };
      }

      const domainKey = domain.replace(".com", "").toLowerCase();
      const cleanedName = extractedName.replace(/\s+/g, "").toLowerCase();
      const model = process.env.OPENAI_MODEL || "gpt-4-turbo";

      if (cleanedName === domainKey) {
        console.log(`GPT name matches domain for ${domain}, falling back to humanizeName`);
        const cleaned = humanizeName(extractedName, domain);
        const finalResult = {
          name: cleaned.name,
          confidenceScore: cleaned.confidenceScore,
          flags: cleaned.flags, // Use flags from humanizeName
          modelUsed: model,
          reason: "GPT name matches domain, used fallback humanization"
        };
        if (finalResult.name && finalResult.name.toLowerCase().replace(/\s+/g, "") !== domainKey) {
          domainCache.set(domain, finalResult);
        }
        console.log(`Processed domain ${domain}: ${extractedName} -> ${finalResult.name} (Confidence: ${finalResult.confidenceScore})`);
        if (finalResult.confidenceScore < 70 || finalResult.flags.length > 0) {
          console.log(`Flagging for manual review: ${finalResult.name} (Confidence: ${finalResult.confidenceScore})`);
          manualReviewQueue.push({
            domain,
            name: finalResult.name,
            confidenceScore: finalResult.confidenceScore,
            reason: finalResult.flags.join(", ") || "Low confidence"
          });
        }
        return finalResult;
      }

      const wordCount = extractedName.split(" ").length;
      if (
        extractedName &&
        wordCount <= 4 &&
        !extractedName.toLowerCase().includes("group") &&
        cleanedName !== domainKey &&
        !extractedName.toLowerCase().startsWith("of ")
      ) {
        const cleaned = humanizeName(extractedName, domain);
        const finalResult = {
          name: cleaned.name,
          confidenceScore: cleaned.confidenceScore,
          flags: cleaned.flags,
          modelUsed: model,
          reason: cleaned.confidenceScore < 70 ? "Low confidence (GPT name used with humanization)" : null
        };

        if (finalResult.name && finalResult.name.toLowerCase() !== domainKey) {
          domainCache.set(domain, finalResult);
        }

        console.log(`Processed domain ${domain}: ${extractedName} -> ${finalResult.name} (Confidence: ${finalResult.confidenceScore})`);
        if (finalResult.confidenceScore < 70 || finalResult.flags.length > 0) {
          console.log(`Flagging for manual review: ${finalResult.name} (Confidence: ${finalResult.confidenceScore})`);
          manualReviewQueue.push({
            domain,
            name: finalResult.name,
            confidenceScore: finalResult.confidenceScore,
            reason: finalResult.flags.join(", ") || "Low confidence"
          });
        }
        return finalResult;
      }

      console.log(`Falling back to humanizeName for domain ${domain}: GPT name "${extractedName}" is invalid`);
      const cleaned = humanizeName(extractedName, domain);
      if (!cleaned.name) {
        console.error(`Failed to humanize name for domain ${domain}: ${extractedName}`);
        return { name: "", confidenceScore: 0, error: `Failed to humanize name: ${extractedName}` };
      }

      const finalResult = {
        name: cleaned.name,
        confidenceScore: cleaned.confidenceScore,
        flags: cleaned.flags,
        modelUsed: model,
        reason: cleanedName === domainKey ? "GPT name matches domain, used fallback" : null
      };

      if (finalResult.name && finalResult.name.toLowerCase() !== domainKey) {
        domainCache.set(domain, finalResult);
      }

      console.log(`Processed domain ${domain}: ${extractedName} -> ${finalResult.name} (Confidence: ${finalResult.confidenceScore})`);
      if (finalResult.confidenceScore < 70 || finalResult.flags.length > 0) {
        console.log(`Flagging for manual review: ${finalResult.name} (Confidence: ${finalResult.confidenceScore})`);
        manualReviewQueue.push({
          domain,
          name: finalResult.name,
          confidenceScore: finalResult.confidenceScore,
          reason: finalResult.flags.join(", ") || "Low confidence"
        });
      }
      return finalResult;
    } catch (err) {
      console.error(`Error in humanizeName for domain ${domain}: ${err.message}`);
      return { name: "", confidenceScore: 0, error: `Error in humanizeName: ${err.message}` };
    }
  };

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

    const { result, error, tokens } = await callOpenAI(prompt);
    totalTokens += tokens;

    if (error) {
      console.error(`Failed to process email ${email}: ${error}`);
      return { franchiseGroup: "", buyerScore: 0, referenceClient: "", error };
    }

    const parsed = extractJsonSafely(result, ["franchiseGroup", "buyerScore", "referenceClient"]);
    if (parsed) {
      console.log(`Enriched lead for email ${email}:`, parsed);
      const model = process.env.OPENAI_MODEL || "gpt-4-turbo";
      return {
        franchiseGroup: parsed.franchiseGroup,
        buyerScore: parsed.buyerScore,
        referenceClient: parsed.referenceClient,
        modelUsed: model
      };
    }

    console.error(`Invalid GPT response for email ${email}: ${result}`);
    return { franchiseGroup: "", buyerScore: 0, referenceClient: "", error: `Invalid GPT response: ${JSON.stringify(result)}` };
  };

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

  const BATCH_SIZE = 10;
  const leadChunks = Array.from(
    { length: Math.ceil(leads.length / BATCH_SIZE) },
    (_, i) => leads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
  );

  for (const chunk of leadChunks) {
    const chunkResults = await Promise.all(
      chunk.map(lead =>
        limit(async () => {
          try {
            return lead.domain && !lead.email
              ? await cleanCompanyName(lead)
              : await enrichLead(lead);
          } catch (err) {
            console.error("Error processing lead:", lead, err.message);
            return { name: "", franchiseGroup: "", buyerScore: 0, referenceClient: "", error: err.message };
          }
        })
      )
    );
    results.push(...chunkResults);
  }

  console.log("Returning results:", results);
  console.log(`Request completed in ${Date.now() - startTime}ms at`, new Date().toISOString());
  return res.status(200).json({ results, manualReviewQueue, totalTokens });
}

export const config = {
  api: {
    bodyParser: false
  }
};

function runUnitTests() {
  const tests = [
    {
      name: "Well-known name without brand appending",
      input: { name: "Pat Milliken Ford", domain: "patmillikenford.com" },
      expected: { name: "Pat Milliken", confidenceScore: 90, flags: [] }
    },
    {
      name: "Abbreviation detection",
      input: { name: "CZAG", domain: "czag.com" },
      expected: { name: "CZAG Auto", confidenceScore: 50, flags: ["Unexpanded"] }
    },
    {
      name: "Domain mismatch",
      input: { name: "Crossroads Auto", domain: "newhollandauto.com" },
      expected: { name: "New Holland Auto", confidenceScore: 50, flags: [] }
    },
    {
      name: "Typo correction",
      input: { name: "Sanleandroford", domain: "sanleandroford.com" },
      expected: { name: "San Leandro Ford", confidenceScore: 80, flags: [] }
    },
    {
      name: "Duplication in decompressDomain",
      input: { name: "Ted Britt", domain: "tedbritt.com" },
      expected: { name: "Ted Britt", confidenceScore: 80, flags: [] }
    },
    {
      name: "Duplication with three words",
      input: { name: "Anderson Auto Group", domain: "andersonautogroup.com" },
      expected: { name: "Anderson Auto", confidenceScore: 80, flags: [] }
    },
    {
      name: "GPT name matches domain",
      input: { name: "Tedbritt", domain: "tedbritt.com" },
      expected: { name: "Ted Britt", confidenceScore: 80, flags: [] }
    }
  ];

  let passed = 0;
  console.log("Running unit tests...");
  tests.forEach((test, index) => {
    const result = humanizeName(test.input.name, test.input.domain);
    const passedName = result.name === test.expected.name;
    const passedConfidence = result.confidenceScore >= test.expected.confidenceScore;
    const passedFlags = JSON.stringify(result.flags) === JSON.stringify(test.expected.flags);
    if (passedName && passedConfidence && passedFlags) {
      console.log(`✅ Test ${index + 1}: ${test.name} - Passed`);
      passed++;
    } else {
      console.log(`❌ Test ${index + 1}: ${test.name} - Failed`);
      console.log(`  Expected Name: ${test.expected.name}, Got: ${result.name}`);
      console.log(`  Expected Confidence >= ${test.expected.confidenceScore}, Got: ${result.confidenceScore}`);
      console.log(`  Expected Flags: ${JSON.stringify(test.expected.flags)}, Got: ${JSON.stringify(result.flags)}`);
    }
  });
  console.log(`Unit tests completed: ${passed}/${tests.length} passed`);
}

// Note: Unit tests are not run automatically in production to prevent crashes.
// To run tests, execute `runUnitTests()` in a development environment or CI/CD pipeline.
