// batch-enrich.js (Version 2.9 - Updated 2025-04-04)
const VERCEL_API_BASE_URL = "https://get-enrich-api-git-main-show-revv.vercel.app";
const VERCEL_API_ENRICH_FALLBACK_URL = `${VERCEL_API_BASE_URL}/api/batch-enrich-company-name-fallback`;

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

// Cache and library
const domainCache = new Map();
const KNOWN_NAMES = new Map([
  ["patmillikenford.com", { name: "Pat Milliken", confidenceScore: 100 }],
  ["duvalauto.com", { name: "Duval", confidenceScore: 100 }],
  ["karlchevroletstuart.com", { name: "Karl Stuart", confidenceScore: 100 }],
  ["gychevy.com", { name: "Gregg Young", confidenceScore: 100 }]
]);

const COMMON_WORDS = [
  "llc", "inc", "corporation", "corp",
  "plaza", "superstore", "mall", "center", "group", "dealership", "sales",
  "auto", "motors", "motor", "automotive", "shop",
  "classic", "prime", "elite", "premier", "luxury", "select", "pro", "top", "best", "first", "great", "new", "used"
];

const CAR_BRANDS = [
  "ford", "toyota", "bmw", "chevrolet", "gmc", "lexus", "mercedes", "benz",
  "honda", "nissan", "hyundai", "kia", "volkswagen", "audi", "porsche", "subaru"
];

// List of known proper nouns (e.g., cities) that should not be flagged for PossessiveAmbiguity
const KNOWN_PROPER_NOUNS = [
  "athens", "crossroads", "dallas", "houston", "paris", "memphis", "nashville"
];

// List of known cities (top 25 per state)
const KNOWN_CITIES_SET = new Set([
  // Alabama (top 25)
  "birmingham", "montgomery", "huntsville", "mobile", "tuscaloosa", "hoover", "dothan", "auburn", "decatur", "madison",
  "florence", "gadsden", "vestavia hills", "prattville", "phenix city", "alabaster", "opelika", "northport", "enterprise", "daphne",
  "homewood", "bessemer", "athens", "pelham", "fairhope",
  // Alaska (top 25)
  "anchorage", "juneau", "fairbanks", "ketchikan", "sitka", "wasilla", "kenai", "kodiak", "bethel", "palmer",
  "homer", "soldotna", "valdez", "nome", "barrow", "kotzebue", "seward", "cordova", "dillingham", "petersburg",
  "wrangell", "kodiak island", "north pole", "delta junction", "hoonah",
  // Arizona (top 25)
  "phoenix", "tucson", "mesa", "chandler", "gilbert", "glendale", "scottsdale", "peoria", "tempe", "surprise",
  "yuma", "avondale", "goodyear", "flagstaff", "buckeye", "casa grande", "lake havasu city", "maricopa", "sierra vista", "prescott",
  "bullhead city", "apache junction", "prescott valley", "marana", "el mirage",
  // Arkansas (top 25)
  "little rock", "fort smith", "fayetteville", "springdale", "jonesboro", "north little rock", "conway", "rogers", "bentonville", "pine bluff",
  "hot springs", "benton", "sherwood", "texarkana", "russellville", "bella vista", "west memphis", "paragould", "cabot", "searcy",
  "van buren", "el dorado", "maumelle", "bryant", "siloam springs",
  // California (top 25)
  "los angeles", "san diego", "san jose", "san francisco", "fresno", "sacramento", "long beach", "oakland", "bakersfield", "anaheim",
  "santa ana", "riverside", "stockton", "chula vista", "irvine", "fremont", "san bernardino", "modesto", "oxnard", "fontana",
  "huntington beach", "glendale", "santa clarita", "garden grove", "santa rosa",
  // Colorado (top 25)
  "denver", "colorado springs", "aurora", "fort collins", "lakewood", "thornton", "arvada", "westminster", "pueblo", "centennial",
  "boulder", "greeley", "longmont", "loveland", "broomfield", "grand junction", "castle rock", "commerce city", "parker", "littleton",
  "northglenn", "brighton", "englewood", "wheat ridge", "lafayette",
  // Connecticut (top 25)
  "bridgeport", "new haven", "stamford", "hartford", "waterbury", "norwalk", "danbury", "new britain", "west hartford", "greenwich",
  "fairfield", "hamden", "bristol", "meriden", "manchester", "west haven", "milford", "stratford", "east hartford", "middletown",
  "wallingford", "southington", "shelton", "norwich", "torrington",
  // Delaware (top 25, limited by population)
  "wilmington", "dover", "newark", "middletown", "smyrna", "milford", "seaford", "georgetown", "elsmere", "new castle",
  "millsboro", "laurel", "harrington", "camden", "clayton", "lewes", "milton", "selbyville", "townsend", "ocean view",
  "bridgeville", "delmar", "delaware city", "felton", "wyoming",
  // Florida (top 25)
  "jacksonville", "miami", "tampa", "orlando", "st. petersburg", "hialeah", "port st. lucie", "cape coral", "tallahassee", "fort lauderdale",
  "pembroke pines", "hollywood", "miramar", "gainesville", "coral springs", "clearwater", "palm bay", "lakeland", "west palm beach", "pompano beach",
  "davie", "miami gardens", "sunrise", "boca raton", "deltona",
  // Georgia (top 25)
  "atlanta", "augusta", "columbus", "macon", "savannah", "athens", "sandy springs", "roswell", "johns creek", "albany",
  "warner robins", "alpharetta", "marietta", "valdosta", "smyrna", "dunwoody", "brookhaven", "peachtree corners", "mableton", "milton",
  "evans", "east point", "peachtree city", "rome", "tucker",
  // Hawaii (top 25, limited by population)
  "honolulu", "east honolulu", "pearl city", "hilo", "kailua", "waipahu", "kaneohe", "mililani", "kahului", "ewa gentry",
  "mililani mauka", "kihei", "makakilo", "wahiawa", "schofield barracks", "kapolei", "kailua-kona", "halawa", "wailuku", "kaneohe station",
  "waianae", "nanakuli", "lahaina", "waipio", "kapaa",
  // Idaho (top 25)
  "boise", "meridian", "nampa", "idaho falls", "pocatello", "caldwell", "coeur d’alene", "twin falls", "lewiston", "post falls",
  "rexburg", "moscow", "eagle", "kuna", "ammon", "chubbuck", "hayden", "jerome", "blackfoot", "garden city",
  "mountain home", "burley", "star", "sandpoint", "rathdrum",
  // Illinois (top 25)
  "chicago", "aurora", "joliet", "naperville", "rockford", "springfield", "peoria", "elgin", "waukegan", "champaign",
  "bloomington", "decatur", "evanston", "des plaines", "berwyn", "wheaton", "belleville", "elmhurst", "dekalb", "moline",
  "urbana", "crystal lake", "quincy", "rock island", "bartlett",
  // Indiana (top 25)
  "indianapolis", "fort wayne", "evansville", "south bend", "carmel", "fishers", "bloomington", "hammond", "gary", "lafayette",
  "muncie", "terre haute", "kokomo", "noblesville", "anderson", "greenwood", "elkhart", "mishawaka", "lawrence", "jeffersonville",
  "columbus", "portage", "new albany", "richmond", "valparaiso",
  // Iowa (top 25)
  "des moines", "cedar rapids", "davenport", "sioux city", "iowa city", "waterloo", "ames", "west des moines", "council bluffs", "dubuque",
  "ankeny", "urbandale", "cedar falls", "marion", "bettendorf", "mason city", "marshalltown", "clinton", "burlington", "ottumwa",
  "fort dodge", "muscatine", "coralville", "johnston", "clive",
  // Kansas (top 25)
  "wichita", "overland park", "kansas city", "olathe", "topeka", "lawrence", "shawnee", "manhattan", "lenexa", "salina",
  "hutchinson", "leavenworth", "leawood", "dodge city", "garden city", "emporia", "derby", "prairie village", "junction city", "hays",
  "pittsburg", "liberal", "newton", "gardner", "great bend",
  // Kentucky (top 25)
  "louisville", "lexington", "bowling green", "owensboro", "covington", "hopkinsville", "richmond", "florence", "georgetown", "elizabethtown",
  "nicholasville", "henderson", "frankfort", "independence", "jeffersontown", "paducah", "radcliff", "ashland", "madisonville", "murray",
  "erlanger", "winchester", "st. matthews", "danville", "fort thomas",
  // Louisiana (top 25)
  "new orleans", "baton rouge", "shreveport", "lafayette", "lake charles", "kenner", "bossier city", "monroe", "alexandria", "houma",
  "new iberia", "slidell", "central", "ruston", "sulphur", "hammond", "bayou cane", "zachary", "thibodaux", "pineville",
  "crowley", "natchitoches", "gretna", "estelle", "opelousas",
  // Maine (top 25)
  "portland", "lewiston", "bangor", "south portland", "auburn", "biddeford", "sanford", "saco", "westbrook", "augusta",
  "waterville", "brewer", "presque isle", "bath", "caribou", "old town", "ellsworth", "rockland", "belfast", "gardiner",
  "calais", "hallowell", "eastport", "bar harbor", "yarmouth",
  // Maryland (top 25)
  "baltimore", "columbia", "germantown", "silver spring", "waldorf", "glen burnie", "ellicott city", "frederick", "dundalk", "rockville",
  "bethesda", "gaithersburg", "towson", "bowie", "aspen hill", "wheaton", "bel air", "potomac", "severn", "north bethesda",
  "catonsville", "hagerstown", "annapolis", "odenton", "severna park",
  // Massachusetts (top 25)
  "boston", "worcester", "springfield", "cambridge", "lowell", "brockton", "new bedford", "quincy", "lynn", "fall river",
  "newton", "lawrence", "somerville", "framingham", "haverhill", "waltham", "malden", "brookline", "plymouth", "medford",
  "taunton", "chicopee", "weymouth", "revere", "peabody",
  // Michigan (top 25)
  "detroit", "grand rapids", "warren", "sterling heights", "ann arbor", "lansing", "flint", "dearborn", "livonia", "troy",
  "westland", "farmington hills", "kalamazoo", "wyoming", "southfield", "rochester hills", "taylor", "royal oak", "st. clair shores", "pontiac",
  "dearborn heights", "novi", "battle creek", "saginaw", "kentwood",
  // Minnesota (top 25)
  "minneapolis", "st. paul", "rochester", "duluth", "bloomington", "brooklyn park", "plymouth", "maple grove", "woodbury", "st. cloud",
  "eden prairie", "lakeville", "blaine", "eagan", "burnsville", "coon rapids", "apple valley", "minnetonka", "edina", "st. louis park",
  "moorhead", "mankato", "shakopee", "maplewood", "cottage grove",
  // Mississippi (top 25)
  "jackson", "gulfport", "southaven", "biloxi", "hattiesburg", "olive branch", "tupelo", "meridian", "greenville", "horn lake",
  "pearl", "madison", "starkville", "clinton", "brandon", "ridgeland", "columbus", "vicksburg", "pascagoula", "oxford",
  "gautier", "laurel", "hernando", "long beach", "natchez",
  // Missouri (top 25)
  "kansas city", "st. louis", "springfield", "columbia", "independence", "lee’s summit", "o’fallon", "st. joseph", "st. charles", "st. peters",
  "blue springs", "florissant", "joplin", "chesterfield", "jefferson city", "cape girardeau", "oakville", "wildwood", "university city", "ballwin",
  "raytown", "liberty", "wentzville", "mehlville", "kirkwood",
  // Montana (top 25)
  "billings", "missoula", "great falls", "bozeman", "butte", "helena", "kalispell", "havre", "anaconda", "miles city",
  "belgrade", "livingston", "laurel", "whitefish", "sidney", "lewistown", "glendive", "dillon", "hardin", "glasgow",
  "columbia falls", "deer lodge", "cut bank", "libby", "wolf point",
  // Nebraska (top 25)
  "omaha", "lincoln", "bellevue", "grand island", "kearney", "fremont", "hastings", "norfolk", "north platte", "columbus",
  "papillion", "la vista", "scottsbluff", "south sioux city", "beatrice", "lexington", "gering", "alliance", "blair", "york",
  "mccook", "nebraska city", "seward", "crete", "sidney",
  // Nevada (top 25)
  "las vegas", "henderson", "reno", "north las vegas", "sparks", "carson city", "fernley", "elko", "mesquite", "boulder city",
  "fallon", "winnemucca", "west wendover", "ely", "yerington", "carlin", "lovelock", "wells", "caliente", "tonopah",
  "jackpot", "battle mountain", "virginia city", "hawthorne", "laughlin",
  // New Hampshire (top 25)
  "manchester", "nashua", "concord", "dover", "rochester", "keene", "portsmouth", "laconia", "lebanon", "claremont",
  "somersworth", "berlin", "franklin", "durham", "hampton", "exeter", "merrimack", "londonderry", "hudson", "milford",
  "newmarket", "newport", "littleton", "farmington", "conway",
  // New Jersey (top 25)
  "newark", "jersey city", "paterson", "elizabeth", "edison", "woodbridge", "lakewood", "toms river", "hamilton", "trenton",
  "clifton", "camden", "brick", "cherry hill", "passaic", "union city", "north bergen", "irvington", "bayonne", "east orange",
  "vineland", "union", "piscataway", "new brunswick", "wayne",
  // New Mexico (top 25)
  "albuquerque", "las cruces", "rio rancho", "santa fe", "roswell", "farmington", "clovis", "hobbs", "alamogordo", "carlsbad",
  "gallup", "deming", "los lunas", "chaparral", "sunland park", "las vegas", "portales", "los alamos", "north valley", "artesia",
  "lovington", "silver city", "española", "anthony", "bernalillo",
  // New York (top 25)
  "new york city", "buffalo", "rochester", "yonkers", "syracuse", "albany", "new rochelle", "mount vernon", "schenectady", "utica",
  "white plains", "hempstead", "troy", "niagara falls", "binghamton", "freeport", "valley stream", "long beach", "spring valley", "rome",
  "north tonawanda", "ithaca", "jamestown", "elmira", "poughkeepsie",
  // North Carolina (top 25)
  "charlotte", "raleigh", "greensboro", "durham", "winston-salem", "fayetteville", "cary", "wilmington", "high point", "greenville",
  "asheville", "concord", "gastonia", "jacksonville", "chapel hill", "burlington", "rocky mount", "huntersville", "kannapolis", "apex",
  "hickory", "wake forest", "indian trail", "mooresville", "goldsboro",
  // North Dakota (top 25)
  "fargo", "bismarck", "grand forks", "minot", "west fargo", "williston", "dickinson", "mandan", "jamestown", "wahpeton",
  "devils lake", "valley city", "grafton", "beulah", "rugby", "lisbon", "carrington", "langdon", "stanley", "oakes",
  "new rockford", "watford city", "cavalier", "bottineau", "hazleton",
  // Ohio (top 25)
  "columbus", "cleveland", "cincinnati", "toledo", "akron", "dayton", "parma", "canton", "youngstown", "lorain",
  "hamilton", "springfield", "kettering", "elyria", "lakewood", "cuyahoga falls", "middletown", "euclid", "newark", "mansfield",
  "mentor", "beavercreek", "strongsville", "fairfield", "dublin",
  // Oklahoma (top 25)
  "oklahoma city", "tulsa", "norman", "broken arrow", "edmond", "lawton", "moore", "midwest city", "enid", "stillwater",
  "muskogee", "bartlesville", "owasso", "shawnee", "yukon", "ardmore", "ponca city", "duncan", "del city", "bixby",
  "sapulpa", "altus", "bethany", "sand springs", "claremore",
  // Oregon (top 25)
  "portland", "eugene", "salem", "gresham", "hillsboro", "beaverton", "bend", "medford", "springfield", "corvallis",
  "albany", "tigard", "lake oswego", "keizer", "grants pass", "oregon city", "mcminnville", "redmond", "tualatin", "west linn",
  "woodburn", "forest grove", "newberg", "roseburg", "klamath falls",
  // Pennsylvania (top 25)
  "philadelphia", "pittsburgh", "allentown", "erie", "reading", "scranton", "bethlehem", "lancaster", "harrisburg", "altoona",
  "york", "state college", "wilkes-barre", "chester", "williamsport", "easton", "lebanon", "hazleton", "new castle", "johnstown",
  "mckeesport", "hermitage", "greensburg", "pottsville", "sharon",
  // Rhode Island (top 25)
  "providence", "cranston", "warwick", "pawtucket", "east providence", "woonsocket", "coventry", "cumberland", "north providence", "south kingstown",
  "west warwick", "johnston", "north kingstown", "newport", "bristol", "lincoln", "smithfield", "central falls", "portsmouth", "burrillville",
  "barrington", "middletown", "tiverton", "narragansett", "east greenwich",
  // South Carolina (top 25)
  "charleston", "columbia", "north charleston", "mount pleasant", "rock hill", "greenville", "summerville", "goose creek", "hilton head island", "sumter",
  "florence", "spartanburg", "myrtle beach", "aiken", "anderson", "mauldin", "hanahan", "conway", "bluffton", "simpsonville",
  "lexington", "easley", "greenwood", "north augusta", "clemson",
  // South Dakota (top 25)
  "sioux falls", "rapid city", "aberdeen", "brookings", "watertown", "mitchell", "yankton", "pierre", "huron", "spearfish",
  "vermillion", "brandon", "box elder", "madison", "sturgis", "belle fourche", "harrisburg", "tea", "dell rapids", "milbank",
  "hot springs", "canton", "lead", "mobridge", "winner",
  // Tennessee (top 25)
  "nashville", "memphis", "knoxville", "chattanooga", "clarksville", "murfreesboro", "franklin", "jackson", "johnson city", "bartlett",
  "hendersonville", "kingsport", "collierville", "smyrna", "cleveland", "brentwood", "germantown", "columbia", "la vergne", "gallatin",
  "cookeville", "oak ridge", "morristown", "spring hill", "farragut",
  // Texas (top 25)
  "houston", "san antonio", "dallas", "austin", "fort worth", "el paso", "arlington", "corpus christi", "plano", "laredo",
  "lubbock", "garland", "irving", "frisco", "amarillo", "mckinney", "grand prairie", "brownsville", "killeen", "pasadena",
  "mesquite", "mcallen", "denton", "waco", "carrollton",
  // Utah (top 25)
  "salt lake city", "west valley city", "provo", "west jordan", "orem", "sandy", "ogden", "st. george", "layton", "south jordan",
  "lehi", "millcreek", "taylorsville", "logan", "murray", "draper", "bountiful", "riverton", "herriman", "spanish fork",
  "roy", "pleasant grove", "kearns", "tooele", "cottonwood heights",
  // Vermont (top 25)
  "burlington", "south burlington", "rutland", "barre", "montpelier", "winooski", "st. albans", "newport", "vergennes", "essex junction",
  "bennington", "brattleboro", "hartford", "middlebury", "williston", "milton", "colchester", "swanton", "lyndon", "rockingham",
  "northfield", "waterbury", "fair haven", "springfield", "jericho",
  // Virginia (top 25)
  "virginia beach", "norfolk", "chesapeake", "richmond", "newport news", "alexandria", "hampton", "roanoke", "portsmouth", "suffolk",
  "lynchburg", "harrisonburg", "leesburg", "charlottesville", "danville", "blacksburg", "manassas", "petersburg", "fredericksburg", "winchester",
  "salem", "herndon", "staunton", "hopewell", "fairfax",
  // Washington (top 25)
  "seattle", "spokane", "tacoma", "vancouver", "bellevue", "kent", "everett", "renton", "spokane valley", "federal way",
  "yakima", "kirkland", "bellingham", "kennewick", "auburn", "pasco", "marysville", "lakewood", "redmond", "shoreline",
  "richland", "sammamish", "burien", "olympia", "lacey",
  // West Virginia (top 25)
  "charleston", "huntington", "morgantown", "parkersburg", "wheeling", "weirton", "fairmont", "martinsburg", "beckley", "clarksburg",
  "south charleston", "st. albans", "vienna", "bluefield", "moundsville", "bridgeport", "oak hill", "dunbar", "elkins", "nitro",
  "hurricane", "princeton", "charles town", "buckhannon", "keyser",
  // Wisconsin (top 25)
  "milwaukee", "madison", "green bay", "kenosha", "racine", "appleton", "waukesha", "oshkosh", "eau claire", "janesville",
  "west allis", "la crosse", "sheboygan", "wausau", "fond du lac", "new berlin", "wauwatosa", "brookfield", "beloit", "greenfield",
  "menomonee falls", "franklin", "oak creek", "manitowoc", "west bend",
  // Wyoming (top 25)
  "cheyenne", "casper", "laramie", "gillette", "rock springs", "sheridan", "green river", "evanston", "riverton", "jackson",
  "cody", "rawlins", "lander", "torrington", "douglas", "powell", "worland", "buffalo", "wheatland", "newcastle",
  "thermopolis", "kemmerer", "glenrock", "lovell", "lyman"
]);

// Normalize text
const normalizeText = (name) => {
  if (!name || typeof name !== "string") return [];
  return name
    .replace(/['".,-]+/g, '')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(word => word);
};

// Capitalize
const capitalizeName = (words) => {
  return words
    .map((word, i) => {
      if (["of", "the", "to"].includes(word.toLowerCase()) && i !== 0) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ")
    .replace(/Mccarthy/g, "McCarthy")
    .replace(/Mclarty/g, "McLarty");
};

// Extract domain words
const extractDomainWords = (domain) => {
  let base = domain.replace(/\.com$/, '');
  let words = base.split(/([a-z])([A-Z])/g).filter(word => word && !COMMON_WORDS.includes(word.toLowerCase()));
  if (words.length === 1) {
    let word = words[0];
    for (let brand of CAR_BRANDS) {
      if (word.toLowerCase().includes(brand)) {
        words = word.toLowerCase().split(brand).filter(w => w);
        break;
      }
    }
  }
  return words;
};

// Check for car brand
const containsCarBrand = (name) => {
  const nameLower = name.toLowerCase();
  return CAR_BRANDS.some(brand => nameLower === brand || nameLower.includes(brand));
};

// Remove car brands
const removeCarBrands = (words) => {
  const result = [];
  for (let word of words) {
    let cleanedWord = word.toLowerCase();
    let foundBrand = false;
    for (let brand of CAR_BRANDS) {
      if (cleanedWord.includes(brand)) {
        cleanedWord = cleanedWord.replace(brand, "").trim();
        foundBrand = true;
      }
    }
    if (cleanedWord && !foundBrand) {
      result.push(word);
    } else if (cleanedWord) {
      result.push(cleanedWord);
    }
  }
  return result;
};

// Check possessive fit
const fitsPossessive = (name) => {
  const lastWord = name.split(/\s+/).pop().toLowerCase();
  return !["motors", "sales", "auto"].includes(lastWord);
};

// Check for "s" ending
const endsWithS = (name) => {
  return name.toLowerCase().endsWith("s");
};

// Check if name is possessive-friendly
const isPossessiveFriendly = (name) => {
  const nameLower = name.toLowerCase();
  return !/^[A-Z]{2,5}$/.test(name) && // Not all uppercase
         !nameLower.endsWith("group") && // Avoid "Group" endings
         !nameLower.endsWith("auto") && // Avoid "Auto" endings
         name.split(/\s+/).length >= 2; // Prefer multi-word names
};

// Check if name is a proper name (e.g., "First Last")
const isProperName = (words) => {
  if (words.length === 2) {
    return words.every(word => /^[A-Z][a-z]+$/.test(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()));
  }
  return false;
};

// Check if word is a possible abbreviation
const isPossibleAbbreviation = (word) => {
  const wordLower = word.toLowerCase();
  return /^[A-Z]{2,5}$/.test(word) || // All uppercase, 2-5 characters
         wordLower.length <= 5 || // Short length
         wordLower.startsWith("mb") || // Known Mercedes-Benz abbreviation
         wordLower.includes("bhm"); // Known Birmingham abbreviation
};

// Humanize name
const humanizeName = (inputName, domain) => {
  let words = normalizeText(inputName || domain);
  console.log(`Before brand removal for ${domain}: ${words.join(" ")}`);
  const originalWords = [...words];
  words = removeCarBrands(words);
  console.log(`After brand removal for ${domain}: ${words.join(" ")}`);

  words = words.filter(word => word.length > 2 || /^[A-Z]{2,}$/.test(word));
  if (words.length > 3) words = words.slice(0, 3);
  if (words.length === 0) words = extractDomainWords(domain).slice(0, 2);

  let name = capitalizeName(words);
  if (!name) {
    name = capitalizeName(extractDomainWords(domain).slice(0, 2));
  }
  const flags = [];

  const nameLower = name.toLowerCase();
  const isGenericWithCarBrand = originalWords.length === 2 && 
                               originalWords.some(word => CAR_BRANDS.includes(word.toLowerCase())) && 
                               originalWords.some(word => COMMON_WORDS.includes(word.toLowerCase()));
  if (words.length === 1 && (words[0].length <= 4 || COMMON_WORDS.includes(words[0].toLowerCase())) && !isGenericWithCarBrand) {
    flags.push("TooGeneric");
  }
  if (words.every(word => COMMON_WORDS.includes(word.toLowerCase())) && !isGenericWithCarBrand) {
    flags.push("TooGeneric");
  }
  if (words.some(isPossibleAbbreviation)) flags.push("PossibleAbbreviation");
  if (/^[A-Z]{2,}$/.test(words[0])) flags.push("Unexpanded");
  if (containsCarBrand(name) || originalWords.some(word => CAR_BRANDS.includes(word.toLowerCase()))) {
    flags.push("BrandIncluded");
  }
  if (endsWithS(name) && !KNOWN_PROPER_NOUNS.includes(nameLower)) flags.push("PossessiveAmbiguity");
  if (words.length === 1 && KNOWN_CITIES_SET.has(nameLower)) {
    flags.push("CityNameOnly");
  } else if (words.length === 2 && KNOWN_CITIES_SET.has(words.join(" ").toLowerCase())) {
    flags.push("CityNameOnly");
  }
  if (!isPossessiveFriendly(name)) flags.push("NotPossessiveFriendly");

  let confidenceScore = computeConfidenceScore(name, domain, flags);
  if (isProperName(words)) confidenceScore += 20;
  return { name, confidenceScore, flags };
};

// Confidence scoring
const computeConfidenceScore = (name, domain, flags) => {
  let score = 50;
  const domainWords = extractDomainWords(domain).map(w => w.toLowerCase());
  const nameWords = name.toLowerCase().split(/\s+/);

  const domainBase = domain.replace(/\.com$/, "").toLowerCase();
  const nameLower = name.toLowerCase();
  const matchesDomain = domainWords.some(dw => nameWords.some(nw => nw.includes(dw) && nw.length > 3));
  const isDomainMatch = nameLower === domainBase;
  const hasCarBrand = containsCarBrand(name);
  const allCommonWords = nameWords.every(word => COMMON_WORDS.includes(word));
  const isGenericWithCarBrand = domainWords.length === 2 && 
                               domainWords.some(word => CAR_BRANDS.includes(word)) && 
                               domainWords.some(word => COMMON_WORDS.includes(word));

  if (matchesDomain && !isDomainMatch) score += 30;
  if (isDomainMatch && hasCarBrand) score -= 20;
  if (isGenericWithCarBrand && hasCarBrand) score += 20;
  if (nameWords.length === 1) score -= 20;
  else if (nameWords.length === 2) score += 10;
  else if (nameWords.length > 3) score -= 10;
  if (!hasCarBrand) score += 10;
  if (fitsPossessive(name)) score += 10;
  if (allCommonWords) score -= 30;

  if (flags.includes("TooGeneric")) score -= 40;
  if (flags.includes("PossibleAbbreviation")) score -= 30;
  if (flags.includes("Unexpanded")) score -= 10;
  if (flags.includes("BrandIncluded")) score -= 40;
  if (flags.includes("PossessiveAmbiguity")) score -= 20;
  if (flags.includes("CityNameOnly")) score -= 40;
  if (flags.includes("NotPossessiveFriendly")) score -= 20;

  if (isProperName(nameWords)) score += 20;

  return Math.max(10, Math.min(100, score));
};

// Fetch website metadata
const fetchWebsiteMetadata = async (domain) => {
  try {
    const response = await fetch(`https://${domain}`, {
      redirect: "follow",
      timeout: 5000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
      }
    });
    const html = await response.text();
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    return {
      title: titleMatch ? titleMatch[1] : "",
      description: metaMatch ? metaMatch[1] : "",
      redirectedDomain: response.url,
      html // Pass HTML for logo extraction
    };
  } catch (err) {
    console.error(`Failed to fetch metadata for ${domain}: ${err.message}`);
    if (err.message.includes("CERT") || err.message.includes("SSL")) {
      try {
        const httpResponse = await fetch(`http://${domain}`, {
          redirect: "follow",
          timeout: 5000,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
          }
        });
        const httpHtml = await httpResponse.text();
        const httpTitleMatch = httpHtml.match(/<title>([^<]+)<\/title>/i);
        const httpMetaMatch = httpHtml.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
        return {
          title: httpTitleMatch ? httpTitleMatch[1] : "",
          description: httpMetaMatch ? httpMetaMatch[1] : "",
          redirectedDomain: httpResponse.url,
          html: httpHtml,
          sslError: true
        };
      } catch (httpErr) {
        console.error(`HTTP fallback failed for ${domain}: ${httpErr.message}`);
        return { title: "", description: "", redirectedDomain: domain, sslError: true };
      }
    }
    return { title: "", description: "", redirectedDomain: domain, error: err.message };
  }
};

// Extract logo text
const extractLogoText = async (domain, html) => {
  try {
    if (!html) return "No logo text available";
    const logoMatch = html.match(/<img[^>]+class=["']logo["'][^>]+src=["']([^"']+)["']/i);
    if (!logoMatch) return "No logo text available";

    const logoUrl = logoMatch[1];
    const altMatch = html.match(/<img[^>]+class=["']logo["'][^>]+alt=["']([^"']+)["']/i);
    let logoText = altMatch ? altMatch[1] : logoUrl.split('/').pop().replace(/[-_]/g, " ").replace(/\.(png|jpg|jpeg|gif)$/i, "").trim();

    for (let brand of CAR_BRANDS) {
      logoText = logoText.toLowerCase().replace(brand, "").trim();
    }
    return logoText || "No logo text available";
  } catch (err) {
    console.error(`Failed to extract logo text for ${domain}: ${err.message}`);
    return "No logo text available";
  }
};

// OpenAI call for meta+logo-based enrichment
const callOpenAIForMeta = async (domain, metadata, logoText, apiKey) => {
  const model = process.env.OPENAI_MODEL || "gpt-4-turbo";
  const prompt = `Given the dealership domain "${domain}" (redirected to "${metadata.redirectedDomain}"), and the following metadata:
  Title: "${metadata.title}"
  Description: "${metadata.description}"
  Logo Text: "${logoText}"
  Extract the clean, natural dealership name already in use. Prioritize the logo text over the meta title for identifying the dealership name, as the logo often contains the parent company or true dealership name. If the logo text is unavailable or ambiguous, fall back to the meta title. If the original domain "${domain}" contains a generic word paired with a car brand (e.g., "classicbmw.com" for "Classic BMW"), preserve that name if it matches the meta title or logo text. Prefer multi-word names that include a proper name and are suitable for possessive form. Avoid returning generic names like "Classic" unless they are part of a proper dealership name (e.g., "Classic Dallas"). Avoid including brand names like Ford unless they are part of the dealership name. Do not return a city-only name unless no other proper name is found. If the name is a car brand or too generic, you may append "Auto" or "Auto Group" only if those suffixes are present in the meta title or logo text.`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          max_tokens: 50,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: "You are a dealership naming expert. Respond only in this format:\n##Name: Clean Name\nExtract the dealership name from the provided metadata and logo text. Do not invent names or add car brands unless unavoidable."
            },
            { role: "user", content: prompt }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const text = await response.text();
      console.log(`OpenAI meta response (attempt ${attempt}): ${text}`);

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);
      const match = text.match(/##Name:\s*([^\n\r]+)/);
      if (!match) throw new Error("Invalid response format");

      return { result: match[1].trim(), tokens: Math.ceil(prompt.length / 4) };
    } catch (err) {
      console.error(`OpenAI meta error (attempt ${attempt}): ${err.message}`);
      if (err.name === "AbortError") return { result: null, error: "Timeout", tokens: 0 };
      if (attempt === 3) return { result: null, error: err.message, tokens: 0 };
      await new Promise(res => setTimeout(res, 1000 * attempt));
    }
  }
};

// Check meta title/logo for car brand or city
const checkMetaForCarBrandOrCity = (metadata, logoText) => {
  const text = `${metadata.title} ${metadata.description} ${logoText}`.toLowerCase();
  const hasCarBrand = CAR_BRANDS.some(brand => text.includes(brand));
  const hasCity = Array.from(KNOWN_CITIES_SET).some(city => text.includes(city));
  return { hasCarBrand, hasCity };
};

// OpenAI call (initial)
const callOpenAI = async (prompt, apiKey, retries = 3) => {
  const model = process.env.OPENAI_MODEL || "gpt-4-turbo";
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          max_tokens: 50,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: "You are a dealership naming expert. Respond only in this format:\n##Name: Clean Name\nGiven the dealership domain \"${prompt}\", return the clean, natural dealership name already in use. Do not invent or add suffixes like \"Plaza\", \"Gallery\", \"Superstore\", \"Mall\", or \"Center\" unless they are actually part of the business name. Never include a car brand name in the name (e.g., Ford, Toyota, BMW, Chevrolet, GMC, Lexus, Mercedes-Benz, etc.) unless unavoidable and the only identifiers are a city and car brand. For names ending in 's', prefer the singular form (e.g., 'Stan' over 'Stans') unless the plural is clearly intentional (e.g., 'Crossroads')."
            },
            { role: "user", content: prompt }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const text = await response.text();
      console.log(`OpenAI response (attempt ${attempt}): ${text}`);

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);
      const match = text.match(/##Name:\s*([^\n\r]+)/);
      if (!match) throw new Error("Invalid response format");
      
      return { result: match[1].trim(), tokens: Math.ceil(prompt.length / 4) };
    } catch (err) {
      console.error(`OpenAI error (attempt ${attempt}): ${err.message}`);
      if (err.name === "AbortError") return { result: null, error: "Timeout", tokens: 0 };
      if (attempt === retries) return { result: null, error: err.message, tokens: 0 };
      await new Promise(res => setTimeout(res, 1000 * attempt));
    }
  }
};

// Main handler
export default async function handler(req, res) {
  console.log("batch-enrich.js Version 3.0 - Updated 2025-04-04");
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Missing OpenAI API key" });

  let leads;
  try {
    const buffers = [];
    for await (const chunk of req) buffers.push(chunk);
    leads = JSON.parse(Buffer.concat(buffers).toString("utf-8"));
  } catch (err) {
    console.error(`JSON parse error: ${err.message}`);
    return res.status(400).json({ error: "Invalid JSON", details: err.message });
  }

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: "Missing or invalid lead list" });
  }

  const startTime = Date.now();
  const limit = pLimit(1);
  const results = [];
  const manualReviewQueue = [];
  let totalTokens = 0;
  const fallbackTriggers = [];

  const BATCH_SIZE = 3;
  const leadChunks = Array.from({ length: Math.ceil(leads.length / BATCH_SIZE) }, (_, i) =>
    leads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
  );

  for (const chunk of leadChunks) {
    if (Date.now() - startTime > 30000) {
      console.log("Partial response due to timeout");
      return res.status(200).json({ results, manualReviewQueue, totalTokens, fallbackTriggers, partial: true });
    }

    const chunkResults = await Promise.all(
      chunk.map(lead => limit(async () => {
        const { domain, rowNum, email, phone, firstName, lastName } = lead;
        if (!domain) {
          console.error(`Row ${rowNum}: Missing domain`);
          return { name: "", confidenceScore: 0, flags: ["MissingDomain"], rowNum };
        }

        if (KNOWN_NAMES.has(domain)) {
          const entry = KNOWN_NAMES.get(domain);
          console.log(`Row ${rowNum}: Library hit - ${entry.name}`);
          return { name: entry.name, confidenceScore: entry.confidenceScore, flags: [], rowNum };
        }

        if (domainCache.has(domain)) {
          console.log(`Row ${rowNum}: Cache hit for ${domain}`);
          return { ...domainCache.get(domain), rowNum };
        }

        const prompt = `Given the dealership domain "${domain}", return the clean, natural dealership name already in use.`;
        let finalResult;
        let tokensUsed = 0;

        const { result: gptNameRaw, error, tokens } = await callOpenAI(prompt, apiKey);
        tokensUsed += tokens;
        totalTokens += tokens;

        if (gptNameRaw && !error) {
          const nameWords = normalizeText(gptNameRaw);
          console.log(`GPT raw name for ${domain}: ${gptNameRaw}, normalized: ${nameWords}`);
          const lastWord = nameWords[nameWords.length - 1]?.toLowerCase();
          const forbiddenSuffixes = ["plaza", "superstore", "gallery", "mall", "center", "sales", "group", "dealership", "auto"];
          if (forbiddenSuffixes.includes(lastWord) && !KNOWN_NAMES.has(domain)) {
            nameWords.pop();
            console.log(`Removed forbidden suffix: ${lastWord}, new words: ${nameWords}`);
          }
          const gptName = nameWords.join(" ");
          console.log(`Joined GPT name: ${gptName}`);
          finalResult = humanizeName(gptName, domain);
          console.log(`Row ${rowNum}: GPT result - ${JSON.stringify(finalResult)}`);
        } else {
          finalResult = humanizeName(domain, domain);
          finalResult.flags.push("GPTFailed");
          console.error(`Row ${rowNum}: GPT failed - ${error}`);
        }

        const needsMetaFallback = finalResult.confidenceScore < 60 || 
                                 finalResult.flags.includes("CityNameOnly") || 
                                 finalResult.flags.includes("TooGeneric") || 
                                 finalResult.flags.includes("BrandIncluded") || 
                                 finalResult.flags.includes("Unexpanded") || 
                                 finalResult.flags.includes("PossibleAbbreviation") || 
                                 finalResult.flags.includes("NotPossessiveFriendly") || 
                                 finalResult.flags.includes("GPTFailed") || 
                                 (finalResult.flags.includes("PossessiveAmbiguity") && finalResult.confidenceScore < 80) ||
                                 (finalResult.name.split(/\s+/).length === 1) ||
                                 (finalResult.name.length <= 5 && COMMON_WORDS.includes(finalResult.name.toLowerCase())) ||
                                 CAR_BRANDS.includes(finalResult.name.toLowerCase()) ||
                                 finalResult.name.toLowerCase().split(/\s+/).every(word => COMMON_WORDS.includes(word));

        if (needsMetaFallback) {
          const reason = finalResult.flags.includes("CityNameOnly") ? "CityNameOnly" :
                        finalResult.flags.includes("TooGeneric") ? "TooGeneric" :
                        finalResult.flags.includes("BrandIncluded") ? "BrandIncluded" :
                        finalResult.flags.includes("PossibleAbbreviation") ? "PossibleAbbreviation" :
                        finalResult.flags.includes("NotPossessiveFriendly") ? "NotPossessiveFriendly" :
                        finalResult.flags.includes("GPTFailed") ? "GPTFailed" :
                        "LowConfidence";
          console.log(`Row ${rowNum}: Triggering meta fallback - Reason: ${reason}`);
          const metaStartTime = Date.now();
          const metadata = await fetchWebsiteMetadata(domain);
          const logoText = await extractLogoText(domain, metadata.html);
          const metaResult = await callOpenAIForMeta(domain, metadata, logoText, apiKey);
          const metaDuration = Date.now() - metaStartTime;
          const accepted = !!metaResult.result && metaResult.result !== finalResult.name;
          tokensUsed += metaResult.tokens;
          totalTokens += metaResult.tokens;

          let sourcePreference = "unknown";
          if (metaResult.result && metaResult.result.toLowerCase().includes(logoText.toLowerCase())) {
            sourcePreference = "logo";
            finalResult.confidenceScore += 10;
          } else if (metaResult.result && metaResult.result.toLowerCase() === domain.replace(/\.com$/, "").toLowerCase()) {
            sourcePreference = "metaTitle";
            finalResult.confidenceScore -= 10;
          }
          fallbackTriggers.push({ rowNum, domain, reason, sourcePreference, duration: metaDuration, success: accepted });

          if (metadata.error || metadata.sslError) {
            console.log(`Row ${rowNum}: Failed to fetch metadata for ${domain}, sending to manual review`);
            manualReviewQueue.push({
              domain,
              name: finalResult.name,
              confidenceScore: finalResult.confidenceScore,
              flags: [...finalResult.flags, "MetaFetchFailed"],
              rowNum,
              reason: metadata.sslError ? "SSL certificate error" : "Failed to fetch metadata",
              email,
              phone,
              firstName,
              lastName
            });
            finalResult = { name: "", confidenceScore: 0, flags: ["Skipped"], rowNum };
          } else if (metaResult.result && accepted) {
            let nameWords = normalizeText(metaResult.result);
            const lastWord = nameWords[nameWords.length - 1]?.toLowerCase();
            const forbiddenSuffixes = ["plaza", "superstore", "gallery", "mall", "center", "sales", "group", "dealership", "auto"];
            if (forbiddenSuffixes.includes(lastWord) && !KNOWN_NAMES.has(domain)) {
              nameWords.pop();
              console.log(`Removed forbidden suffix from fallback: ${lastWord}, new words: ${nameWords}`);
            }
            finalResult = humanizeName(nameWords.join(" "), domain);
            finalResult.flags.push("FallbackUsed");
            console.log(`Row ${rowNum}: Meta fallback result - ${JSON.stringify(finalResult)}`);
          } else {
            finalResult.flags.push("MetaFallbackFailed");
            console.error(`Row ${rowNum}: Meta fallback failed`);
          }
        }

        if (finalResult.confidenceScore < 50 || 
            finalResult.flags.includes("TooGeneric") || 
            finalResult.flags.includes("PossibleAbbreviation") || 
            finalResult.flags.includes("NotPossessiveFriendly") || 
            (finalResult.flags.includes("PossessiveAmbiguity") && finalResult.confidenceScore < 80) ||
            finalResult.flags.includes("CityNameOnly")) {
          console.log(`Row ${rowNum} flagged for review: ${JSON.stringify(finalResult)} - Reason: ${finalResult.flags.includes("PossessiveAmbiguity") ? "Name ends in 's'" : finalResult.flags.includes("CityNameOnly") ? "City name only" : "Low confidence or generic"}`);
          manualReviewQueue.push({ 
            domain, 
            name: finalResult.name, 
            confidenceScore: finalResult.confidenceScore, 
            flags: finalResult.flags, 
            rowNum,
            reason: finalResult.flags.includes("PossessiveAmbiguity") ? "Name ends in 's', possessive form unclear" : 
                    finalResult.flags.includes("CityNameOnly") ? "City name only, needs verification" :
                    finalResult.flags.includes("BrandIncluded") ? "Possible city-brand combo" : "Low confidence or generic",
            email,
            phone,
            firstName,
            lastName
          });
          finalResult = { name: "", confidenceScore: 0, flags: ["Skipped"], rowNum };
        }

        domainCache.set(domain, {
          name: finalResult.name,
          confidenceScore: finalResult.confidenceScore,
          flags: finalResult.flags
        });

        console.log(`Final result for ${domain}: ${JSON.stringify(finalResult)}`);
        return { ...finalResult, rowNum, tokens: tokensUsed };
      }))
    );

    results.push(...chunkResults);
  }

  console.log(`Completed: ${results.length} results, ${manualReviewQueue.length} for review, ${fallbackTriggers.length} meta fallbacks triggered`);
  return res.status(200).json({ results, manualReviewQueue, totalTokens, fallbackTriggers, partial: false });
};

export const config = { api: { bodyParser: false } };

// Unit Tests
function runUnitTests() {
  const tests = [
    { input: { name: "Pat Milliken Ford", domain: "patmillikenford.com" }, expected: { name: "Pat Milliken", confidenceScore: 100, flags: [] } },
    { input: { name: "Duval LLC", domain: "duvalauto.com" }, expected: { name: "Duval", confidenceScore: 100, flags: [] } },
    { input: { name: "Toyota Redlands", domain: "toyotaredlands.com" }, expected: { name: "Redlands", confidenceScore: 70, flags: [] } },
    { input: { name: "Crossroads Ford", domain: "crossroadsford.com" }, expected: { name: "", confidenceScore: 0, flags: ["Skipped"] } },
    { input: { name: "Duval Ford", domain: "duvalford.com" }, expected: { name: "Duval", confidenceScore: 70, flags: [] } },
    { input: { name: "Athens Ford", domain: "athensford.com" }, expected: { name: "Athens", confidenceScore: 70, flags: [] } },
    { input: { name: "Team Ford", domain: "teamford.com" }, expected: { name: "Team", confidenceScore: 70, flags: [] } },
    { input: { name: "Smith Motor Shop", domain: "smithmotorshop.com" }, expected: { name: "Smith", confidenceScore: 70, flags: [] } },
    { input: { name: "Karl Chevrolet Stuart", domain: "karlchevroletstuart.com" }, expected: { name: "Karl Stuart", confidenceScore: 90, flags: [] } },
    { input: { name: "Gychevy", domain: "gychevy.com" }, expected: { name: "Gregg Young", confidenceScore: 90, flags: ["FallbackUsed"] } },
    { input: { name: "Bentley Auto", domain: "bentleyauto.com" }, expected: { name: "Smith Auto", confidenceScore: 90, flags: ["FallbackUsed"] } },
    { input: { name: "Bentley Automotive", domain: "bentleyautomotive.com" }, expected: { name: "Smith Automotive", confidenceScore: 90, flags: ["FallbackUsed"] } },
    { input: { name: "Bentley Automotive Group", domain: "bentleyautomotivegroup.com" }, expected: { name: "Smith Automotive Group", confidenceScore: 90, flags: ["FallbackUsed"] } },
    { input: { name: "Bentley Motors", domain: "bentleymotors.com" }, expected: { name: "Smith Motors", confidenceScore: 90, flags: ["FallbackUsed"] } },
    { input: { name: "Mbbhm", domain: "mbbhm.com" }, expected: { name: "Mercedes-Benz Birmingham", confidenceScore: 90, flags: ["FallbackUsed"] } },
    { input: { name: "Mbusa", domain: "mbusa.com" }, expected: { name: "Mercedes-Benz USA", confidenceScore: 90, flags: ["FallbackUsed"] } },
    { input: { name: "Classic BMW", domain: "classicbmw.com" }, expected: { name: "Classic BMW", confidenceScore: 90, flags: [] } },
    { input: { name: "Prime Honda", domain: "primehonda.com" }, expected: { name: "Prime Honda", confidenceScore: 90, flags: [] } },
    { input: { name: "Elite Audi", domain: "eliteaudi.com" }, expected: { name: "Elite Audi", confidenceScore: 90, flags: [] } },
    { input: { name: "Premier Toyota", domain: "premiertoyota.com" }, expected: { name: "Premier Toyota", confidenceScore: 90, flags: [] } },
    { input: { name: "Huntington Beach Ford", domain: "huntingtonbeachford.com" }, expected: { name: "Bakhtiari", confidenceScore: 90, flags: ["FallbackUsed"] } },
    { input: { name: "San Diego Ford", domain: "sandiegoford.com" }, expected: { name: "Smith Auto Group", confidenceScore: 90, flags: ["FallbackUsed"] } },
    { input: { name: "Miami BMW", domain: "miamibmw.com" }, expected: { name: "Jones Dealership", confidenceScore: 90, flags: ["FallbackUsed"] } },
    { input: { name: "Austin Toyota", domain: "austintoyota.com" }, expected: { name: "Brown Auto Group", confidenceScore: 90, flags: ["FallbackUsed"] } }
  ];

  let passed = 0;
  console.log("Running unit tests...");
  tests.forEach((test, i) => {
    const result = humanizeName(test.input.name, test.input.domain);
    const passName = result.name === test.expected.name;
    const passScore = result.confidenceScore >= test.expected.confidenceScore;
    const passFlags = JSON.stringify(result.flags) === JSON.stringify(test.expected.flags);
    
    if (passName && passScore && passFlags) {
      console.log(`✅ Test ${i + 1}: Passed`);
      passed++;
    } else {
      console.log(`❌ Test ${i + 1}: Failed - Expected: ${JSON.stringify(test.expected)}, Got: ${JSON.stringify(result)}`);
    }
  });
  console.log(`🏁 ${passed}/${tests.length} passed`);
}

if (process.env.NODE_ENV === "test") runUnitTests();
