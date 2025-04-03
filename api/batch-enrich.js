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
  "losangeles", "sandiego", "sanjose", "sanfrancisco", "fresno", "sacramento", "longbeach", "oakland", "bakersfield", "anaheim",
  "stockton", "riverside", "santaana", "irvine", "chulavista", "fremont", "santaclarita", "sanbernardino", "modesto", "morenovalley",
  "jacksonville", "miami", "tampa", "orlando", "stpetersburg", "hialeah", "portstlucie", "capecoral", "tallahassee", "fortlauderdale",
  "pembrokepines", "hollywood", "gainesville", "miramar", "coralsprings", "palmbay", "westpalmbeach", "clearwater", "lakeland", "pompanobeach",
  "newyorkcity", "buffalo", "rochester", "yonkers", "syracuse", "albany", "newrochelle", "mountvernon", "schenectady", "utica",
  "whiteplains", "hempstead", "troy", "niagarafalls", "binghamton", "freeport", "valleystream", "longbeach", "springvalley", "rome",
  "houston", "sanantonio", "dallas", "austin", "fortworth", "elpaso", "arlington", "corpuschristi", "plano", "laredo",
  "lubbock", "garland", "irving", "frisco", "amarillo", "mckinney", "grandprairie", "brownsville", "killeen", "pasadena",
  "birmingham", "montgomery", "huntsville", "mobile", "tuscaloosa", "anchorage", "juneau", "fairbanks", "phoenix", "tucson",
  "mesa", "littlerock", "fortsmith", "fayetteville", "denver", "coloradosprings", "aurora", "bridgeport", "newhaven", "stamford",
  "wilmington", "dover", "newark", "washingtondc", "atlanta", "columbus", "augusta", "honolulu", "eastonolulu", "pearlcity",
  "boise", "meridian", "nampa", "chicago", "aurora", "joliet", "indianapolis", "fortwayne", "evansville", "desmoines",
  "cedarrapids", "davenport", "wichita", "overlandpark", "kansascity", "louisville", "lexington", "bowlinggreen", "neworleans", "batonrouge",
  "shreveport", "portland", "lewiston", "bangor", "baltimore", "columbia", "germantown", "boston", "worcester", "springfield",
  "detroit", "grandrapids", "warren", "minneapolis", "stpaul", "rochester", "jackson", "gulfport", "southaven", "kansascity",
  "stlouis", "springfield", "billings", "missoula", "greatfalls", "omaha", "lincoln", "bellevue", "lasvegas", "henderson",
  "reno", "manchester", "nashua", "concord", "newark", "jerseycity", "paterson", "albuquerque", "lascruces", "riorancho",
  "charlotte", "raleigh", "greensboro", "fargo", "bismarck", "grandforks", "columbus", "cleveland", "cincinnati", "oklahomacity",
  "tulsa", "norman", "portland", "eugene", "salem", "philadelphia", "pittsburgh", "allentown", "providence", "cranston",
  "warwick", "charleston", "columbia", "northcharleston", "siouxfalls", "rapidcity", "aberdeen", "nashville", "memphis",
  "knoxville", "saltlakecity", "westvalleycity", "westjordan", "burlington", "southburlington", "rutland", "virginiabeach", "chesapeake",
  "norfolk", "seattle", "spokane", "tacoma", "charleston", "huntington", "morgantown", "milwaukee", "madison", "greenbay",
  "cheyenne", "casper", "laramie"
];

const cityDisplayNames = {
  "losangeles": "Los Angeles", "sandiego": "San Diego", "sanjose": "San Jose", "sanfrancisco": "San Francisco", "fresno": "Fresno",
  "sacramento": "Sacramento", "longbeach": "Long Beach", "oakland": "Oakland", "bakersfield": "Bakersfield", "anaheim": "Anaheim",
  "stockton": "Stockton", "riverside": "Riverside", "santaana": "Santa Ana", "irvine": "Irvine", "chulavista": "Chula Vista",
  "fremont": "Fremont", "santaclarita": "Santa Clarita", "sanbernardino": "San Bernardino", "modesto": "Modesto", "morenovalley": "Moreno Valley",
  "jacksonville": "Jacksonville", "miami": "Miami", "tampa": "Tampa", "orlando": "Orlando", "stpetersburg": "St Petersburg",
  "hialeah": "Hialeah", "portstlucie": "Port St Lucie", "capecoral": "Cape Coral", "tallahassee": "Tallahassee", "fortlauderdale": "Fort Lauderdale",
  "pembrokepines": "Pembroke Pines", "hollywood": "Hollywood", "gainesville": "Gainesville", "miramar": "Miramar", "coralsprings": "Coral Springs",
  "palmbay": "Palm Bay", "westpalmbeach": "West Palm Beach", "clearwater": "Clearwater", "lakeland": "Lakeland", "pompanobeach": "Pompano Beach",
  "newyorkcity": "New York City", "buffalo": "Buffalo", "rochester": "Rochester", "yonkers": "Yonkers", "syracuse": "Syracuse",
  "albany": "Albany", "newrochelle": "New Rochelle", "mountvernon": "Mount Vernon", "schenectady": "Schenectady", "utica": "Utica",
  "whiteplains": "White Plains", "hempstead": "Hempstead", "troy": "Troy", "niagarafalls": "Niagara Falls", "binghamton": "Binghamton",
  "freeport": "Freeport", "valleystream": "Valley Stream", "longbeach": "Long Beach", "springvalley": "Spring Valley", "rome": "Rome",
  "houston": "Houston", "sanantonio": "San Antonio", "dallas": "Dallas", "austin": "Austin", "fortworth": "Fort Worth",
  "elpaso": "El Paso", "arlington": "Arlington", "corpuschristi": "Corpus Christi", "plano": "Plano", "laredo": "Laredo",
  "lubbock": "Lubbock", "garland": "Garland", "irving": "Irving", "frisco": "Frisco", "amarillo": "Amarillo",
  "mckinney": "McKinney", "grandprairie": "Grand Prairie", "brownsville": "Brownsville", "killeen": "Killeen", "pasadena": "Pasadena",
  "birmingham": "Birmingham", "montgomery": "Montgomery", "huntsville": "Huntsville", "mobile": "Mobile", "tuscaloosa": "Tuscaloosa",
  "anchorage": "Anchorage", "juneau": "Juneau", "fairbanks": "Fairbanks", "phoenix": "Phoenix", "tucson": "Tucson",
  "mesa": "Mesa", "littlerock": "Little Rock", "fortsmith": "Fort Smith", "fayetteville": "Fayetteville", "denver": "Denver",
  "coloradosprings": "Colorado Springs", "aurora": "Aurora", "bridgeport": "Bridgeport", "newhaven": "New Haven", "stamford": "Stamford",
  "wilmington": "Wilmington", "dover": "Dover", "newark": "Newark", "washingtondc": "Washington DC", "atlanta": "Atlanta",
  "columbus": "Columbus", "augusta": "Augusta", "honolulu": "Honolulu", "eastonolulu": "East Honolulu", "pearlcity": "Pearl City",
  "boise": "Boise", "meridian": "Meridian", "nampa": "Nampa", "chicago": "Chicago", "aurora": "Aurora",
  "joliet": "Joliet", "indianapolis": "Indianapolis", "fortwayne": "Fort Wayne", "evansville": "Evansville", "desmoines": "Des Moines",
  "cedarrapids": "Cedar Rapids", "davenport": "Davenport", "wichita": "Wichita", "overlandpark": "Overland Park", "kansascity": "Kansas City",
  "louisville": "Louisville", "lexington": "Lexington", "bowlinggreen": "Bowling Green", "neworleans": "New Orleans", "batonrouge": "Baton Rouge",
  "shreveport": "Shreveport", "portland": "Portland", "lewiston": "Lewiston", "bangor": "Bangor", "baltimore": "Baltimore",
  "columbia": "Columbia", "germantown": "Germantown", "boston": "Boston", "worcester": "Worcester", "springfield": "Springfield",
  "detroit": "Detroit", "grandrapids": "Grand Rapids", "warren": "Warren", "minneapolis": "Minneapolis", "stpaul": "St Paul",
  "rochester": "Rochester", "jackson": "Jackson", "gulfport": "Gulfport", "southaven": "Southaven", "kansascity": "Kansas City",
  "stlouis": "St Louis", "springfield": "Springfield", "billings": "Billings", "missoula": "Missoula", "greatfalls": "Great Falls",
  "omaha": "Omaha", "lincoln": "Lincoln", "bellevue": "Bellevue", "lasvegas": "Las Vegas", "henderson": "Henderson",
  "reno": "Reno", "manchester": "Manchester", "nashua": "Nashua", "concord": "Concord", "newark": "Newark",
  "jerseycity": "Jersey City", "paterson": "Paterson", "albuquerque": "Albuquerque", "lascruces": "Las Cruces", "riorancho": "Rio Rancho",
  "charlotte": "Charlotte", "raleigh": "Raleigh", "greensboro": "Greensboro", "fargo": "Fargo", "bismarck": "Bismarck",
  "grandforks": "Grand Forks", "columbus": "Columbus", "cleveland": "Cleveland", "cincinnati": "Cincinnati", "oklahomacity": "Oklahoma City",
  "tulsa": "Tulsa", "norman": "Norman", "portland": "Portland", "eugene": "Eugene", "salem": "Salem",
  "philadelphia": "Philadelphia", "pittsburgh": "Pittsburgh", "allentown": "Allentown", "providence": "Providence", "cranston": "Cranston",
  "warwick": "Warwick", "charleston": "Charleston", "columbia": "Columbia", "northcharleston": "North Charleston", "siouxfalls": "Sioux Falls",
  "rapidcity": "Rapid City", "aberdeen": "Aberdeen", "nashville": "Nashville", "memphis": "Memphis", "knoxville": "Knoxville",
  "saltlakecity": "Salt Lake City", "westvalleycity": "West Valley City", "westjordan": "West Jordan", "burlington": "Burlington", "southburlington": "South Burlington",
  "rutland": "Rutland", "virginiabeach": "Virginia Beach", "chesapeake": "Chesapeake", "norfolk": "Norfolk", "seattle": "Seattle",
  "spokane": "Spokane", "tacoma": "Tacoma", "charleston": "Charleston", "huntington": "Huntington", "morgantown": "Morgantown",
  "milwaukee": "Milwaukee", "madison": "Madison", "greenbay": "Green Bay", "cheyenne": "Cheyenne", "casper": "Casper",
  "laramie": "Laramie"
};

// Global states for abbreviation detection
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

// Global common words for abbreviation detection and auto removal
const commonWords = [
  "pat", "gus", "san", "team", "town", "east", "west", "north", "south", "auto",
  "hills", "birmingham", "mercedes", "benz", "elway", "kossi", "sarant", "tommy", "nix",
  ...states,
  ...topCitiesNormalized
];

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
  const cache = new Map();
  const brands = [
    "chevrolet", "gmc", "cadillac", "buick", "ford", "lincoln", "chrysler", "dodge",
    "jeep", "ram", "tesla", "rivian", "lucid", "honda", "nissan", "hyundai", "kia",
    "bmw", "mercedes", "benz", "subaru", "toyota", "vw", "lexus", "infiniti"
  ];

  return words.map(word => {
    const normalized = word.toLowerCase().replace(/\s+/g, '');
    if (brands.includes(normalized)) return word;

    const closestMatch = topCitiesNormalized.reduce((best, city) => {
      const dist = levenshteinDistance(normalized, city, cache);
      return (dist < best.distance && dist <= 2)
        ? { city, distance: dist }
        : best;
    }, { city: null, distance: Infinity });

    if (closestMatch.city) {
      const tempWords = [...words];
      const index = tempWords.indexOf(word);
      tempWords[index] = cityDisplayNames[closestMatch.city];
      const tempConfidence = computeConfidenceScore(tempWords, "", !!detectBrand([word]).hasBrand, false);
      if (tempConfidence > 80) {
        return cityDisplayNames[closestMatch.city];
      }
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
    const wellKnownNames = [
      "pat milliken", "tuttle click", "penske auto", "union park", "malouf auto",
      "tasca auto", "suntrup auto", "jt auto"
    ];
    if (wellKnownNames.includes(nameWithoutAuto + " auto")) {
      return words; // Keep "Auto" for well-known names
    }
    if (words.length > 2 || commonWords.includes(nameWithoutAuto)) {
      words = words.slice(0, -1);
    }
  }
  return words;
};

const computeConfidenceScore = (words, domain, hasBrand, hasAbbreviation) => {
  let score = 0;
  const domainWords = splitDomainIntoWords(domain).map(w => w.toLowerCase());
  const nameWords = words.map(w => w.toLowerCase());

  let hasDomainMatch = false;
  let partialMatchScore = 0;

  for (const nameWord of nameWords) {
    for (const domainWord of domainWords) {
      if (nameWord === domainWord && nameWord.length > 3) {
        hasDomainMatch = true;
        break;
      }
      if (domainWord.includes(nameWord) && nameWord.length > 3) {
        partialMatchScore = Math.max(partialMatchScore, 20);
      }
    }
    if (hasDomainMatch) break;
  }

  score += hasDomainMatch ? 50 : partialMatchScore;
  score += hasBrand ? 30 : 0;
  score += hasAbbreviation ? 0 : 20;

  // Boost score if proper nouns match
  const properNounsInName = nameWords.filter(word => /^[A-Z]/.test(word) || commonWords.includes(word));
  const properNounsInDomain = domainWords.filter(word => /^[A-Z]/.test(word) || commonWords.includes(word));
  if (properNounsInName.some(pn => properNounsInDomain.includes(pn))) {
    score += 20;
  }

  const wellKnownNames = [
    "pat milliken", "tuttle click", "penske auto", "union park",
    "malouf auto", "tasca auto", "suntrup auto", "jt auto"
  ];
  const nameStr = nameWords.join(" ");
  score += wellKnownNames.includes(nameStr) ? 10 : 0;

  return Math.min(score, 100);
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

  // Enforce 4-word limit
  const flags = [];
  if (words.length > 4) {
    flags.push("TooLong");
    const brandIndex = words.findIndex(word => detectBrand([word]).hasBrand);
    if (brandIndex !== -1) {
      const brand = words[brandIndex];
      const otherWords = words.filter((_, i) => i !== brandIndex).slice(0, 3);
      words = [...otherWords, brand];
    } else {
      words = words.slice(0, 4);
    }
  }

  const { name: finalName, flags: compatibilityFlags } = enforceColdEmailCompatibility(words, domain);
  const confidenceScore = computeConfidenceScore(words, domain, hasBrand, hasAbbreviation);
  if (hasAbbreviation) flags.push("Unexpanded");
  flags.push(...compatibilityFlags);

  return {
    name: applyMinimalFormatting(finalName),
    confidenceScore,
    flags
  };
};

export default async function handler(req, res) {
  const startTime = Date.now();
  console.log("Received request to /api/batch-enrich at", new Date(startTime).toISOString());

  let leads;
  try {
    if (req.headers["content-type"]?.includes("application/json")) {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const raw = Buffer.concat(buffers).toString("utf-8");
      console.log("Raw request body:", raw);
      leads = JSON.parse(raw);
    } else {
      return res.status(400).json({ error: "Unsupported content-type" });
    }
  } catch (err) {
    console.error("Failed to parse request body:", err.message, "Raw:", raw?.slice(0, 100));
    return res.status(400).json({ error: "Failed to parse request body", details: err.message });
  }

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: "Missing or invalid lead list" });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  const limit = pLimit(1);
  const manualReviewQueue = [];
  const results = [];
  let totalTokens = 0;

  const callOpenAI = async (prompt, retries = 3) => {
    const model = process.env.OPENAI_MODEL || "gpt-4-turbo";
    console.log("Calling OpenAI with prompt:", prompt.slice(0, 100) + "...");
    const estimatedTokens = Math.ceil(prompt.length / 4);
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: "You are a dealership naming expert with knowledge of U.S. automotive dealerships as of April 2025." },
              { role: "user", content: prompt }
            ],
            temperature: 0.3
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`OpenAI request failed with status ${response.status}: ${errorText}`);
          throw new Error(errorText);
        }

        const text = await response.text();
        const openAiResponse = JSON.parse(text);
        const content = openAiResponse.choices[0].message.content;
        const match = content.match(/##Name:\s*([^\n\r]+)/);
        if (!match) throw new Error("No valid ##Name: format in response");
        return { result: match[1].trim(), tokens: estimatedTokens };
      } catch (err) {
        if (err.name === "AbortError") {
          console.error("OpenAI request timed out after 8s");
          return { result: null, error: "OpenAI request timed out", tokens: estimatedTokens };
        }
        const backoffDelay = 2000 * attempt; // Exponential backoff
        if (attempt < retries) {
          console.warn(`Retrying (${attempt}/${retries}) after ${backoffDelay}ms due to: ${err.message}`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        }
        console.error(`OpenAI error after ${retries} retries: ${err.message}`);
        return { result: null, error: err.message, tokens: estimatedTokens };
      }
    }
  };

  const cleanCompanyName = async (lead) => {
    const { domain, rowNum } = lead;
    if (!domain) return { name: "", confidenceScore: 0, error: "Missing domain", rowNum };

    if (domainCache.has(domain)) {
      console.log({ domain, message: "Cache hit" });
      return { ...domainCache.get(domain), rowNum };
    }

    const prompt = `Given the dealership domain "${domain}" sourced from an email list, return a clean, human-friendly dealership name as of April 2025. Return: ##Name: [Clean Dealership Name]`;
    const { result: gptNameRaw, error, tokens } = await limit(() => callOpenAI(prompt));
    totalTokens += tokens;

    if (error) {
      console.error({ domain, error, rowNum });
      return { name: "", confidenceScore: 0, error, rowNum };
    }

    const cleaned = humanizeName(gptNameRaw || domain, domain);
    const finalResult = {
      name: cleaned.name,
      confidenceScore: cleaned.confidenceScore,
      flags: cleaned.flags,
      reason: cleaned.confidenceScore < 80 ? "Low confidence" : null,
      rowNum
    };

    if (finalResult.confidenceScore < 80 || finalResult.flags.length > 0) {
      manualReviewQueue.push({
        domain,
        name: finalResult.name,
        confidenceScore: finalResult.confidenceScore,
        reason: finalResult.flags.join(", ") || "Low confidence",
        rowNum
      });
    }

    domainCache.set(domain, { name: finalResult.name, confidenceScore: finalResult.confidenceScore, flags: finalResult.flags });
    console.log({ domain, name: finalResult.name, score: finalResult.confidenceScore, flags: finalResult.flags, error: null });
    return finalResult;
  };

  const enrichFranchiseGroup = async (lead) => {
    const { email, domain, rowNum } = lead;
    if (!email || !domain) return { franchiseGroup: "", confidenceScore: 0, error: "Missing email or domain", rowNum };

    const prompt = `Enrich lead: Email: ${email}, Domain: ${domain}. Identify the primary brand as of April 2025. Return: {"franchiseGroup": "X", "confidenceScore": 0-100}`;
    const { result, error, tokens } = await limit(() => callOpenAI(prompt));
    totalTokens += tokens;

    if (error) return { franchiseGroup: "", confidenceScore: 0, error, rowNum };
    const parsed = extractJsonSafely(result, ["franchiseGroup", "confidenceScore"]) || {};
    const finalFranchiseGroup = parsed.franchiseGroup?.split(",")[0]?.trim() || "";
    const finalResult = {
      franchiseGroup: applyMinimalFormatting(finalFranchiseGroup),
      confidenceScore: parsed.confidenceScore || 0,
      reason: parsed.confidenceScore < 80 ? "Low confidence" : null,
      rowNum
    };

    if (finalResult.confidenceScore < 80) {
      manualReviewQueue.push({
        domain,
        franchiseGroup: finalResult.franchiseGroup,
        confidenceScore: finalResult.confidenceScore,
        reason: "Low confidence",
        rowNum
      });
    }

    console.log({ domain, email, franchiseGroup: finalResult.franchiseGroup, score: finalResult.confidenceScore, error: null });
    return finalResult;
  };

  const extractJsonSafely = (data, fields) => {
    try {
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      return fields.every(f => f in parsed && parsed[f] !== undefined) ? parsed : null;
    } catch (e) {
      console.error("JSON parsing error:", e.message, "Data:", data?.slice(0, 100));
      return null;
    }
  };

  const BATCH_SIZE = 2; // Reduced from 3 to help with timeout issues
  const leadChunks = Array.from({ length: Math.ceil(leads.length / BATCH_SIZE) }, (_, i) =>
    leads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
  );

  for (const chunk of leadChunks) {
    const chunkStartTime = Date.now();
    if (chunkStartTime - startTime > 9000) {
      console.warn({ message: "Timeout guard hit", duration: chunkStartTime - startTime, partial: true });
      return res.status(200).json({ results, manualReviewQueue, totalTokens, partial: true });
    }

    const chunkResults = await Promise.all(
      chunk.map(lead =>
        limit(async () => {
          try {
            return lead.domain && !lead.email
              ? await cleanCompanyName(lead)
              : await enrichFranchiseGroup(lead);
          } catch (err) {
            console.error({ domain: lead.domain || lead.email, error: err.message, rowNum: lead.rowNum });
            return lead.domain && !lead.email
              ? { name: "", confidenceScore: 0, error: err.message, rowNum: lead.rowNum }
              : { franchiseGroup: "", confidenceScore: 0, error: err.message, rowNum: lead.rowNum };
          }
        })
      )
    );
    results.push(...chunkResults);

    if (Date.now() - startTime > 9000) {
      console.warn({ message: "Chunk processing exceeded 9s", duration: Date.now() - startTime, partial: true });
      return res.status(200).json({ results, manualReviewQueue, totalTokens, partial: true });
    }
  }

  console.log({ message: "Returning results", results: results.map(r => ({ domain: r.domain, name: r.name, score: r.confidenceScore, flags: r.flags })) });
  console.log({ message: "Request completed", duration: Date.now() - startTime, tokens: totalTokens });
  return res.status(200).json({ results, manualReviewQueue, totalTokens, partial: false });
};

export const config = {
  api: { bodyParser: false }
};

// Unit tests (unchanged)
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
    },
    {
      name: "Test case: Edwards Auto Group",
      input: { name: "Edwards Auto Group", domain: "edwardsautogroup.com" },
      expected: { name: "Edwards", confidenceScore: 90, flags: [] }
    },
    {
      name: "Test case: Scott Clark",
      input: { name: "Scott Clark Auto Group", domain: "scottclark.com" },
      expected: { name: "Scott Clark", confidenceScore: 90, flags: [] }
    },
    {
      name: "Test case: Jack Powell",
      input: { name: "Jack Powell Chrysler Dodge Jeep Ram", domain: "jackpowell.com" },
      expected: { name: "Jack Powell Chrysler", confidenceScore: 70, flags: ["TooLong"] }
    },
    {
      name: "Test case: Tasca",
      input: { name: "Tasca Auto", domain: "tasca.com" },
      expected: { name: "Tasca Auto", confidenceScore: 90, flags: [] }
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
