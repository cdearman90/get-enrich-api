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

export const config = {
  api: {
    bodyParser: false
  }
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

  // Rate limit OpenAI calls to 100 requests per minute (adjust based on OpenAI's limits)
  const limit = pLimit(100 / 60); // 100 requests per minute = ~1.67 requests per second

  const callOpenAI = async (prompt, retries = 3, delay = 2000) => {
    const model = process.env.OPENAI_MODEL || "gpt-4-turbo"; // Default to GPT-4 Turbo
    console.log("Calling OpenAI with prompt:", prompt);
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
            model: model, // Use GPT-4 Turbo or env-specified model
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

        // Extract the name using the structured output format
        const match = content.match(/##Name:\s*(.+)/);
        if (!match) {
          console.error("Failed to extract name from OpenAI response:", content);
          throw new Error("Invalid OpenAI response format: missing ##Name: delimiter");
        }
        return match[1].trim();
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

  const splitDomainIntoWords = (domain) => {
    let name = domain.replace(/\.com$/, '');
    name = name.replace(/([a-z])([A-Z])/g, '$1 $2')
               .replace(/([a-zA-Z])(\d)/g, '$1 $2')
               .replace(/(\d)([a-zA-Z])/g, '$1 $2');
    return name.split(/\s+/).filter(word => word);
  };

  const levenshteinDistance = (a, b) => {
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
    return matrix[b.length][a.length];
  };

  const normalizeText = (name) => {
    if (!name || typeof name !== "string") return "";
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
    return words.map(word => {
      const closestMatch = domainWords.find(dw => dw.includes(word) || word.includes(dw));
      if (closestMatch) {
        return closestMatch;
      }
      return word;
    });
  };

  const correctTypos = (words) => {
    const topCitiesNormalized = [
      "losangeles", "sandiego", "sanjose", "sanfrancisco", "fresno", "sacramento", 
      "longbeach", "oakland", "bakersfield", "anaheim", "stockton", "riverside", 
      "santaana", "irvine", "chulavista", "fremont", "santaclarita", "sanbernardino", 
      "modesto", "morenovalley",
      "jacksonville", "miami", "tampa", "orlando", "stpetersburg", "hialeah", 
      "portstlucie", "capecoral", "tallahassee", "fortlauderdale", "pembrokepines", 
      "hollywood", "gainesville", "miramar", "coralsprings", "palmbay", "westpalmbeach", 
      "clearwater", "lakeland", "pompanobeach",
      "newyorkcity", "buffalo", "rochester", "yonkers", "syracuse", "albany", 
      "newrochelle", "mountvernon", "schenectady", "utica", "whiteplains", "hempstead", 
      "troy", "niagarafalls", "binghamton", "freeport", "valleystream", "longbeach", 
      "springvalley", "rome",
      "houston", "sanantonio", "dallas", "austin", "fortworth", "elpaso", "arlington", 
      "corpuschristi", "plano", "laredo", "lubbock", "garland", "irving", "frisco", 
      "amarillo", "mckinney", "grandprairie", "brownsville", "killeen", "pasadena",
      "birmingham", "montgomery", "huntsville", "mobile", "tuscaloosa", "anchorage", 
      "juneau", "fairbanks", "phoenix", "tucson", "mesa", "littlerock", "fortsmith", 
      "fayetteville", "denver", "coloradosprings", "aurora", "bridgeport", "newhaven", 
      "stamford", "wilmington", "dover", "newark", "washingtondc", "atlanta", "columbus", 
      "augusta", "honolulu", "eastonolulu", "pearlcity", "boise", "meridian", "nampa", 
      "chicago", "aurora", "joliet", "indianapolis", "fortwayne", "evansville", 
      "desmoines", "cedarrapids", "davenport", "wichita", "overlandpark", "kansascity", 
      "louisville", "lexington", "bowlinggreen", "neworleans", "batonrouge", "shreveport", 
      "portland", "lewiston", "bangor", "baltimore", "columbia", "germantown", "boston", 
      "worcester", "springfield", "detroit", "grandrapids", "warren", "minneapolis", 
      "stpaul", "rochester", "jackson", "gulfport", "southaven", "kansascity", "stlouis", 
      "springfield", "billings", "missoula", "greatfalls", "omaha", "lincoln", "bellevue", 
      "lasvegas", "henderson", "reno", "manchester", "nashua", "concord", "newark", 
      "jerseycity", "paterson", "albuquerque", "lascruces", "riorancho", "charlotte", 
      "raleigh", "greensboro", "fargo", "bismarck", "grandforks", "columbus", "cleveland", 
      "cincinnati", "oklahomacity", "tulsa", "norman", "portland", "eugene", "salem", 
      "philadelphia", "pittsburgh", "allentown", "providence", "cranston", "warwick", 
      "charleston", "columbia", "northcharleston", "siouxfalls", "rapidcity", "aberdeen", 
      "nashville", "memphis", "knoxville", "saltlakecity", "westvalleycity", "westjordan", 
      "burlington", "southburlington", "rutland", "virginiabeach", "chesapeake", "norfolk", 
      "seattle", "spokane", "tacoma", "charleston", "huntington", "morgantown", "milwaukee", 
      "madison", "greenbay", "cheyenne", "casper", "laramie"
    ];

    const cityDisplayNames = {
      "losangeles": "Los Angeles", "sandiego": "San Diego", "sanjose": "San Jose", 
      "sanfrancisco": "San Francisco", "fresno": "Fresno", "sacramento": "Sacramento", 
      "longbeach": "Long Beach", "oakland": "Oakland", "bakersfield": "Bakersfield", 
      "anaheim": "Anaheim", "stockton": "Stockton", "riverside": "Riverside", 
      "santaana": "Santa Ana", "irvine": "Irvine", "chulavista": "Chula Vista", 
      "fremont": "Fremont", "santaclarita": "Santa Clarita", "sanbernardino": "San Bernardino", 
      "modesto": "Modesto", "morenovalley": "Moreno Valley",
      "jacksonville": "Jacksonville", "miami": "Miami", "tampa": "Tampa", "orlando": "Orlando", 
      "stpetersburg": "St Petersburg", "hialeah": "Hialeah", "portstlucie": "Port St Lucie", 
      "capecoral": "Cape Coral", "tallahassee": "Tallahassee", "fortlauderdale": "Fort Lauderdale", 
      "pembrokepines": "Pembroke Pines", "hollywood": "Hollywood", "gainesville": "Gainesville", 
      "miramar": "Miramar", "coralsprings": "Coral Springs", "palmbay": "Palm Bay", 
      "westpalmbeach": "West Palm Beach", "clearwater": "Clearwater", "lakeland": "Lakeland", 
      "pompanobeach": "Pompano Beach",
      "newyorkcity": "New York City", "buffalo": "Buffalo", "rochester": "Rochester", 
      "yonkers": "Yonkers", "syracuse": "Syracuse", "albany": "Albany", "newrochelle": "New Rochelle", 
      "mountvernon": "Mount Vernon", "schenectady": "Schenectady", "utica": "Utica", 
      "whiteplains": "White Plains", "hempstead": "Hempstead", "troy": "Troy", 
      "niagarafalls": "Niagara Falls", "binghamton": "Binghamton", "freeport": "Freeport", 
      "valleystream": "Valley Stream", "longbeach": "Long Beach", "springvalley": "Spring Valley", 
      "rome": "Rome",
      "houston": "Houston", "sanantonio": "San Antonio", "dallas": "Dallas", "austin": "Austin", 
      "fortworth": "Fort Worth", "elpaso": "El Paso", "arlington": "Arlington", 
      "corpuschristi": "Corpus Christi", "plano": "Plano", "laredo": "Laredo", "lubbock": "Lubbock", 
      "garland": "Garland", "irving": "Irving", "frisco": "Frisco", "amarillo": "Amarillo", 
      "mckinney": "McKinney", "grandprairie": "Grand Prairie", "brownsville": "Brownsville", 
      "killeen": "Killeen", "pasadena": "Pasadena",
      "birmingham": "Birmingham", "montgomery": "Montgomery", "huntsville": "Huntsville", 
      "mobile": "Mobile", "tuscaloosa": "Tuscaloosa", "anchorage": "Anchorage", "juneau": "Juneau", 
      "fairbanks": "Fairbanks", "phoenix": "Phoenix", "tucson": "Tucson", "mesa": "Mesa", 
      "littlerock": "Little Rock", "fortsmith": "Fort Smith", "fayetteville": "Fayetteville", 
      "denver": "Denver", "coloradosprings": "Colorado Springs", "aurora": "Aurora", 
      "bridgeport": "Bridgeport", "newhaven": "New Haven", "stamford": "Stamford", 
      "wilmington": "Wilmington", "dover": "Dover", "newark": "Newark", "washingtondc": "Washington DC", 
      "atlanta": "Atlanta", "columbus": "Columbus", "augusta": "Augusta", "honolulu": "Honolulu", 
      "eastonolulu": "East Honolulu", "pearlcity": "Pearl City", "boise": "Boise", "meridian": "Meridian", 
      "nampa": "Nampa", "chicago": "Chicago", "aurora": "Aurora", "joliet": "Joliet", 
      "indianapolis": "Indianapolis", "fortwayne": "Fort Wayne", "evansville": "Evansville", 
      "desmoines": "Des Moines", "cedarrapids": "Cedar Rapids", "davenport": "Davenport", 
      "wichita": "Wichita", "overlandpark": "Overland Park", "kansascity": "Kansas City", 
      "louisville": "Louisville", "lexington": "Lexington", "bowlinggreen": "Bowling Green", 
      "neworleans": "New Orleans", "batonrouge": "Baton Rouge", "shreveport": "Shreveport", 
      "portland": "Portland", "lewiston": "Lewiston", "bangor": "Bangor", "baltimore": "Baltimore", 
      "columbia": "Columbia", "germantown": "Germantown", "boston": "Boston", "worcester": "Worcester", 
      "springfield": "Springfield", "detroit": "Detroit", "grandrapids": "Grand Rapids", 
      "warren": "Warren", "minneapolis": "Minneapolis", "stpaul": "St Paul", "rochester": "Rochester", 
      "jackson": "Jackson", "gulfport": "Gulfport", "southaven": "Southaven", "kansascity": "Kansas City", 
      "stlouis": "St Louis", "springfield": "Springfield", "billings": "Billings", "missoula": "Missoula", 
      "greatfalls": "Great Falls", "omaha": "Omaha", "lincoln": "Lincoln", "bellevue": "Bellevue", 
      "lasvegas": "Las Vegas", "henderson": "Henderson", "reno": "Reno", "manchester": "Manchester", 
      "nashua": "Nashua", "concord": "Concord", "newark": "Newark", "jerseycity": "Jersey City", 
      "paterson": "Paterson", "albuquerque": "Albuquerque", "lascruces": "Las Cruces", 
      "riorancho": "Rio Rancho", "charlotte": "Charlotte", "raleigh": "Raleigh", "greensboro": "Greensboro", 
      "fargo": "Fargo", "bismarck": "Bismarck", "grandforks": "Grand Forks", "columbus": "Columbus", 
      "cleveland": "Cleveland", "cincinnati": "Cincinnati", "oklahomacity": "Oklahoma City", 
      "tulsa": "Tulsa", "norman": "Norman", "portland": "Portland", "eugene": "Eugene", "salem": "Salem", 
      "philadelphia": "Philadelphia", "pittsburgh": "Pittsburgh", "allentown": "Allentown", 
      "providence": "Providence", "cranston": "Cranston", "warwick": "Warwick", "charleston": "Charleston", 
      "columbia": "Columbia", "northcharleston": "North Charleston", "siouxfalls": "Sioux Falls", 
      "rapidcity": "Rapid City", "aberdeen": "Aberdeen", "nashville": "Nashville", "memphis": "Memphis", 
      "knoxville": "Knoxville", "saltlakecity": "Salt Lake City", "westvalleycity": "West Valley City", 
      "westjordan": "West Jordan", "burlington": "Burlington", "southburlington": "South Burlington", 
      "rutland": "Rutland", "virginiabeach": "Virginia Beach", "chesapeake": "Chesapeake", 
      "norfolk": "Norfolk", "seattle": "Seattle", "spokane": "Spokane", "tacoma": "Tacoma", 
      "charleston": "Charleston", "huntington": "Huntington", "morgantown": "Morgantown", 
      "milwaukee": "Milwaukee", "madison": "Madison", "greenbay": "Green Bay", "cheyenne": "Cheyenne", 
      "casper": "Casper", "laramie": "Laramie"
    };

    return words.map(word => {
      const normalizedWord = word.toLowerCase().replace(/\s+/g, '');
      const closestMatch = topCitiesNormalized.reduce((best, city) => {
        const distance = levenshteinDistance(normalizedWord, city);
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

    if (result.toLowerCase().startsWith("of ")) {
      return { name: result, error: "[Invalid Start]" };
    }

    const wellKnownNames = [
      "pat milliken", "tuttle click", "penske auto", "union park", "malouf auto", 
      "tasca auto", "suntrup auto", "jt auto"
    ];
    let finalResult = result;
    if (!wellKnownNames.some(wn => wn.includes("-") && result.toLowerCase().includes(wn))) {
      finalResult = finalResult.replace(/-/g, " ");
    }

    return { name: finalResult, error: null };
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

    const hasAbbreviation = words.some(word => (
      (/^[A-Z]{2,4}$/.test(word) || 
       /^[A-Z][a-z]+[A-Z][a-z]*$/.test(word) || 
       /^[A-Z][a-z]{1,2}$/.test(word) || 
       !/^[a-z]+$/i.test(word) && !commonWords.includes(word.toLowerCase()) && word.length > 3 && !/^(mccarthy|mclarty)$/i.test(word))
    ) && !commonWords.includes(word.toLowerCase()));
    return hasAbbreviation;
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

  const replaceDashes = (result) => {
    const wellKnownNames = [
      "pat milliken", "tuttle click", "penske auto", "union park", "malouf auto", 
      "tasca auto", "suntrup auto", "jt auto"
    ];
    if (!wellKnownNames.some(wn => wn.includes("-") && result.toLowerCase().includes(wn))) {
      result = result.replace(/-/g, " ");
    }
    return result;
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

  const formatFinalName = (words, hasAbbreviation) => {
    let result = words.join(" ").replace(/\s+/g, " ").trim();
    result = replaceDashes(result);
    return hasAbbreviation ? `${result} [Unexpanded]` : result;
  };

  const humanizeName = (name, domain) => {
    let words = normalizeText(name);
    const { hasBrand, brand } = detectBrand(words);
    words = decompressDomain(words, domain);
    words = correctTypos(words);
    const hasAbbreviation = detectAbbreviation(words);
    words = cleanupFillers(words);
    words = removeUnnecessaryAuto(words);
    words = adjustForPossessiveFlow(words);
    let result = enforceColdEmailCompatibility(words, domain);

    const confidenceScore = computeConfidenceScore(words, domain, hasBrand, hasAbbreviation);

    result = result.name
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

    return { name: result, confidenceScore };
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

Input: Domain: richmondford.com
Output: ##Name: Richmond Ford

Input: Domain: newhollandauto.com
Output: ##Name: New Holland Auto

Input: Domain: tuttleclick.com
Output: ##Name: Tuttle Click

Input: Domain: bmwwestspringfield.com
Output: ##Name: Springfield BMW

### Examples of Acceptable Names:
- Duval Ford
- Athens Ford
- Pat Milliken
- Town And Country Ford
- Team Ford
- San Leandro Ford
- Gus Machado Ford
- Don Hinds Ford
- Union Park
- Jack Powell Auto
- Malouf Auto
- Preston Motor
- Bill Dube Auto
- Golf Mill Ford
- Demontond Chevrolet
- Carl Black Auto
- Richmond Ford
- Tasca Auto
- Bentley Auto
- Avis Ford
- Rod Baker Ford
- Karl Chevrolet
- Davis Chevrolet
- GY Chevrolet
- Miami Lakes Auto Mall
- Potamkin Hyundai
- McCarthy Auto
- Dyer Auto
- Ted Britt
- Anderson Auto
- Smith Auto
- Johnson Chevrolet
- Brown Toyota

### Examples of Unacceptable Names (and Fixes):
- Ford → Ford Atlanta
- Gy → GY Chevrolet
- Sanleandroford → San Leandro Ford
- Kia of Auburn → Auburn Kia
- Pat Milliken of Patmillikenford → Pat Milliken
- Nissan of Athens → Athens Nissan
- Mazda of South Charolotte → Mazda SC
- Mercedes-Benz of Mbbhm → Mercedes-Benz Birmingham
- Mercedes-Benz of Mb Usa → MB USA
- Cadillac of Las Vegas → Vegas Cadillac
- Karl Chevrolet Stuart → Karl Chevrolet
- Unionpark → Union Park
- Ford of Teamford → Team Ford
- Demontond → Demontond Chevrolet
- McCarthy Auto Group → McCarthy Auto

### Formatting Guidelines:
- Expand all abbreviations to their full form, e.g., EH → East Hills, CHMB → Chapman Mercedes-Benz, G Y → GY Chevy, Np → North Point, Rt → Route. If an abbreviation cannot be expanded with certainty, append a known brand associated with the dealership, e.g., CZAG → CZAG Ford if it’s a Ford dealership, or Auto, e.g., CZAG → CZAG Auto, to ensure clarity. Do not return a name with unexpanded abbreviations like CZAG without a brand or Auto. Include examples like Demontond → Demontond Chevrolet.
- Avoid including slogans, taglines, or marketing phrases, e.g., Jacksonville’s Best Dealership, unless essential to the dealership’s identity, e.g., Metro of Madison.
- Avoid filler words like LLC, Inc, Enterprise, Group, or Team unless essential to the dealership’s identity.
- Ensure proper spacing and capitalization, like San Leandro Ford instead of sanleandroford.
- If the first two words end with an s, e.g., Crossroads Cars, either change the second word to Auto or something similar that would flow smoothly in a cold email in a possessive format. For example, Crossroads Cars could be changed to Crossroad Cars or Crossroads Auto so it works better in a possessive form in a cold email, e.g., Crossroad Cars CRM isn’t broken—it’s bleeding. If it doesn’t make sense like this, use your best judgment to alter it or flag it and move to the next row if you’re extremely unsure.
- The final name must sound 100% natural when spoken aloud, like something you’d say to a dealer over the phone. Avoid formatting errors, e.g., no "-benz" or starting with "of" or dashes unless it’s separating two words like mercedes-benz.
- Only use letters/words in a name. The only exception is when using a dash to separate two words, e.g., mercedes-benz.

Return the final dealership name in the format: ##Name: [Clean Dealership Name]
Use your best judgment to choose the most natural name to flow in our cold email examples. Don’t hesitate to flag something and skip it if you are extremely unsure.
    `.trim();

    const result = await callOpenAI(prompt);

    if (result && result.error) {
      console.error(`Failed to process domain ${domain}: ${result.error}`);
      return { name: "", confidenceScore: 0, error: result.error };
    }

    const cleaned = humanizeName(result, domain);
    if (!cleaned.name) {
      console.error(`Failed to humanize name for domain ${domain}: ${result}`);
      return { name: "", confidenceScore: 0, error: `Failed to humanize name: ${result}` };
    }

    const model = process.env.OPENAI_MODEL || "gpt-4-turbo"; // Reflect the model used
    const finalResult = { name: cleaned.name, confidenceScore: cleaned.confidenceScore, modelUsed: model };
    domainCache.set(domain, finalResult);
    console.log(`Processed domain ${domain}: ${finalResult.name} (Confidence: ${finalResult.confidenceScore})`);

    if (finalResult.confidenceScore < 70 || finalResult.name.includes("[Unexpanded]") || finalResult.name.includes("[Domain Mismatch]") || finalResult.name.includes("[Invalid Start]")) {
      console.log(`Flagging for manual review: ${finalResult.name} (Confidence: ${finalResult.confidenceScore})`);
      manualReviewQueue.push({ domain, name: finalResult.name, confidenceScore: finalResult.confidenceScore, reason: finalResult.name.includes("[Unexpanded]") ? "Unexpanded abbreviation" : finalResult.name.includes("[Domain Mismatch]") ? "Domain mismatch" : finalResult.name.includes("[Invalid Start]") ? "Invalid start" : "Low confidence" });
    }

    return finalResult;
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

    const result = await callOpenAI(prompt);

    if (result && result.error) {
      console.error(`Failed to process email ${email}: ${result.error}`);
      return { franchiseGroup: "", buyerScore: 0, referenceClient: "", error: result.error };
    }

    const parsed = extractJsonSafely(result, ["franchiseGroup", "buyerScore", "referenceClient"]);

    if (parsed) {
      console.log(`Enriched lead for email ${email}:`, parsed);
      const model = process.env.OPENAI_MODEL || "gpt-4-turbo"; // Reflect the model used
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

  const manualReviewQueue = [];

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
  return res.status(200).json({ results, manualReviewQueue });
}

function runUnitTests() {
  const tests = [
    {
      name: "Well-known name without brand appending",
      input: { name: "Pat Milliken Ford", domain: "patmillikenford.com" },
      expected: "Pat Milliken",
      confidenceThreshold: 80
    },
    {
      name: "Abbreviation detection",
      input: { name: "CZAG", domain: "czag.com" },
      expected: "CZAG Auto [Unexpanded]",
      confidenceThreshold: 50
    },
    {
      name: "Domain mismatch",
      input: { name: "Crossroads Auto", domain: "newhollandauto.com" },
      expected: "New Holland Auto",
      confidenceThreshold: 50
    },
    {
      name: "Typo correction",
      input: { name: "Sanleandroford", domain: "sanleandroford.com" },
      expected: "San Leandro Ford",
      confidenceThreshold: 80
    }
  ];

  let passed = 0;
  console.log("Running unit tests...");
  tests.forEach((test, index) => {
    const result = humanizeName(test.input.name, test.input.domain);
    const passedName = result.name === test.expected;
    const passedConfidence = result.confidenceScore >= test.confidenceThreshold;
    if (passedName && passedConfidence) {
      console.log(`✅ Test ${index + 1}: ${test.name} - Passed`);
      passed++;
    } else {
      console.log(`❌ Test ${index + 1}: ${test.name} - Failed`);
      console.log(`  Expected: ${test.expected}, Got: ${result.name}`);
      console.log(`  Expected Confidence >= ${test.confidenceThreshold}, Got: ${result.confidenceScore}`);
    }
  });
  console.log(`Unit tests completed: ${passed}/${tests.length} passed`);
}

// Note: Unit tests are not run automatically in production to prevent crashes.
// To run tests, execute `runUnitTests()` in a development environment or CI/CD pipeline.
