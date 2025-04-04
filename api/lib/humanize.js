// lib/humanize.js
export const COMMON_WORDS = [
  "llc", "inc", "corporation", "corp",
  "plaza", "superstore", "mall", "center", "group", "dealership", "sales",
  "auto", "motors", "motor", "automotive", "shop",
  "classic", "prime", "elite", "premier", "luxury", "select", "pro", "top", "best", "first", "great", "new", "used",
  "com"
];

export const CAR_BRANDS = [
  "ford", "toyota", "bmw", "chevrolet", "gmc", "lexus", "mercedes", "benz",
  "honda", "nissan", "hyundai", "kia", "volkswagen", "audi", "porsche", "subaru",
  "mb" // Added for "Mercedes-Benz" abbreviations
];

export const KNOWN_PROPER_NOUNS = [
  "athens", "crossroads", "dallas", "houston", "paris", "memphis", "nashville",
  "pat", "milliken", "town", "country", "san", "leandro", "gus", "machado", "don", "hinds",
  "union", "park", "jack", "powell", "preston", "bill", "dube", "golf", "mill",
  "de", "montrond", "carl", "black", "fletcher", "richmond"
];

export const KNOWN_CITIES_SET = new Set([
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

// Continuation of humanize.js (excluding KNOWN_CITIES_SET for brevity)
const normalizeText = (name) => {
  if (!name || typeof name !== "string") return [];
  return name
    .replace(/\.com$/, "") // Explicitly strip .com
    .replace(/['".,-]+/g, '')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(word => word);
};

const capitalizeName = (words) => {
  return words
    .map((word, i) => {
      if (["of", "the", "to", "and"].includes(word.toLowerCase()) && i !== 0) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ")
    .replace(/Mccarthy/g, "McCarthy")
    .replace(/Mclarty/g, "McLarty")
    .replace(/De Montrond/g, "DeMontrond");
};

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
  if (words.length === 1) {
    let word = words[0];
    let splitWords = [];
    let currentWord = "";
    let i = 0;
    while (i < word.length) {
      currentWord += word[i];
      let foundMatch = false;
      for (let proper of KNOWN_PROPER_NOUNS) {
        if (currentWord.toLowerCase() === proper) {
          splitWords.push(currentWord);
          currentWord = "";
          foundMatch = true;
          break;
        }
      }
      if (!foundMatch) {
        for (let common of COMMON_WORDS) {
          if (currentWord.toLowerCase() === common) {
            currentWord = "";
            foundMatch = true;
            break;
          }
        }
      }
      if (!foundMatch && i === word.length - 1) {
        let remaining = currentWord;
        currentWord = "";
        let j = Math.min(3, remaining.length);
        while (j < remaining.length && !/[aeiou]/.test(remaining[j])) j++; // Vowel/consonant heuristic
        splitWords.push(remaining.slice(0, j + 1));
        if (j + 1 < remaining.length) splitWords.push(remaining.slice(j + 1));
      }
      i++;
    }
    words = splitWords.filter(w => w && !COMMON_WORDS.includes(w.toLowerCase()));
  }
  return words;
};

const containsCarBrand = (name) => {
  const nameLower = name.toLowerCase();
  return CAR_BRANDS.some(brand => nameLower === brand || nameLower.includes(brand));
};

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

const fitsPossessive = (name) => {
  const lastWord = name.split(/\s+/).pop().toLowerCase();
  return !["motors", "sales", "auto"].includes(lastWord);
};

const endsWithS = (name) => {
  return name.toLowerCase().endsWith("s");
};

const isPossessiveFriendly = (name) => {
  const nameLower = name.toLowerCase();
  return !/^[A-Z]{2,5}$/.test(name) && // Not all uppercase
         !nameLower.endsWith("group") && // Avoid "Group" endings
         !nameLower.endsWith("auto") && // Avoid "Auto" endings
         !nameLower.endsWith("com"); // Avoid "com" endings
};

const isProperName = (words) => {
  if (words.length === 2) {
    return words.every(word => /^[A-Z][a-z]+$/.test(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()));
  }
  return false;
};

const isPossibleAbbreviation = (word) => {
  const wordLower = word.toLowerCase();
  return /^[A-Z]{2,5}$/.test(word) || // All uppercase, 2-5 characters
         wordLower.length <= 3 || // Short length (reduced from 5 to 3)
         wordLower.startsWith("mb") || // Known Mercedes-Benz abbreviation
         wordLower.includes("bhm"); // Known Birmingham abbreviation
};

const computeConfidenceScore = (name, domain, flags) => {
  try {
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
    if (nameWords.length >= 2) score += 10; // Reward compound splits
    else if (nameWords.length > 3) score -= 10;
    if (!hasCarBrand) score += 10;
    if (fitsPossessive(name)) score += 10;
    if (allCommonWords) score -= 30;

    if (flags.includes("TooGeneric")) score -= 40;
    if (flags.includes("PossibleAbbreviation")) score -= 5;
    if (flags.includes("Unexpanded")) score -= 10;
    if (flags.includes("BrandIncluded")) score -= 40;
    if (flags.includes("PossessiveAmbiguity")) score -= 10;
    if (flags.includes("CityNameOnly")) score -= 60;
    if (flags.includes("NotPossessiveFriendly")) score -= 30;

    if (isProperName(nameWords)) score += 20;

    return Math.max(10, Math.min(100, score));
  } catch (err) {
    console.error(`Error in computeConfidenceScore for domain ${domain}: ${err.message}`);
    return 0;
  }
};

export const humanizeName = (inputName, domain) => {
  try {
    let words = normalizeText(inputName || domain);
    console.log(`Before brand removal for ${domain}: ${words.join(" ")}`);
    const originalWords = [...words];
    words = removeCarBrands(words);
    console.log(`After brand removal for ${domain}: ${words.join(" ")}`);

    words = words.filter(word => word.length > 2 || /^[A-Z]{2,}$/.test(word));
    if (words.length > 3) words = words.slice(0, 3);
    if (words.length === 0 || words.every(w => w.endsWith("com"))) {
      const fallback = domain.replace(".com", "").replace(/[^a-zA-Z]/g, " ");
      words = normalizeText(fallback).slice(0, 2);
    }
    if (words.length === 0) {
      words = extractDomainWords(domain).slice(0, 2);
    }

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

    // Prefer singular form for names ending in "s"
    if (endsWithS(name) && !KNOWN_PROPER_NOUNS.includes(nameLower)) {
      const singularName = name.slice(0, -1);
      if (singularName.length > 2) {
        name = singularName;
        flags = flags.filter(f => f !== "PossessiveAmbiguity");
        confidenceScore = computeConfidenceScore(name, domain, flags);
      }
    }

    return { name, confidenceScore, flags };
  } catch (err) {
    console.error(`Error in humanizeName for domain ${domain}: ${err.message}`);
    return { name: "", confidenceScore: 0, flags: ["ProcessingError"] };
  }
};
