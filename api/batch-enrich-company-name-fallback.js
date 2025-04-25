// api/batch-enrich-company-name-fallback.js
// Fallback logic using OpenAI with caching

import { humanizeName, capitalizeName, earlyCompoundSplit, extractBrandOfCityFromDomain, normalizeDomain, cleanCompanyName } from "./lib/humanize.js";

// Define domainCache at the top of the file
const domainCache = new Map();

// Comprehensive list of car brands
const CAR_BRANDS = new Set([
    "acura", "alfa romeo", "amc", "aston martin", "audi", "bentley", "bmw", "bugatti", "buick",
    "cadillac", "carmax", "cdj", "cdjrf", "cdjr", "chev", "chevvy", "chevrolet", "chrysler", "cjd",
    "daewoo", "dodge", "eagle", "ferrari", "fiat", "ford", "genesis", "gmc", "honda", "hummer",
    "hyundai", "inf", "infiniti", "isuzu", "jaguar", "jeep", "jlr", "kia", "lamborghini", "land rover",
    "landrover", "lexus", "lincoln", "lucid", "maserati", "maz", "mazda", "mb", "mclaren", "merc", "mercedes",
    "mercedes-benz", "mercedesbenz", "merk", "mini", "mitsubishi", "nissan", "oldsmobile", "plymouth",
    "polestar", "pontiac", "porsche", "ram", "rivian", "rolls-royce", "saab", "saturn", "scion",
    "smart", "subaru", "subie", "suzuki", "tesla", "toyota", "volkswagen", "volvo", "vw", "chevy",
    "honda", "lambo"
]);
  // Mapping for standardized brand names
const BRAND_MAPPING = new Map([
  ["acura", "Acura"], ["alfa romeo", "Alfa Romeo"], ["amc", "AMC"], ["aston martin", "Aston Martin"], ["audi", "Audi"],
  ["bentley", "Bentley"], ["bmw", "BMW"], ["bugatti", "Bugatti"], ["buick", "Buick"], ["cadillac", "Cadillac"],
  ["carmax", "Carmax"], ["cdj", "Dodge"], ["cdjrf", "Dodge"], ["cdjr", "Dodge"], ["chev", "Chevy"],
  ["chevvy", "Chevy"], ["chevrolet", "Chevy"], ["chrysler", "Chrysler"], ["cjd", "Dodge"], ["daewoo", "Daewoo"],
  ["dodge", "Dodge"], ["eagle", "Eagle"], ["ferrari", "Ferrari"], ["fiat", "Fiat"], ["ford", "Ford"], ["genesis", "Genesis"],
  ["gmc", "GMC"], ["honda", "Honda"], ["hummer", "Hummer"], ["hyundai", "Hyundai"], ["inf", "Infiniti"], ["infiniti", "Infiniti"],
  ["isuzu", "Isuzu"], ["jaguar", "Jaguar"], ["jeep", "Jeep"], ["jlr", "Jaguar Land Rover"], ["kia", "Kia"],
  ["lamborghini", "Lamborghini"], ["land rover", "Land Rover"], ["landrover", "Land Rover"], ["lexus", "Lexus"],
  ["lincoln", "Ford"], ["lucid", "Lucid"], ["maserati", "Maserati"], ["maz", "Mazda"], ["mazda", "Mazda"],
  ["mb", "M.B."], ["merc", "M.B."], ["mercedes", "M.B."], ["mercedes-benz", "M.B."], ["mercedesbenz", "M.B."],
  ["merk", "Mercedes"], ["mini", "Mini"], ["mitsubishi", "Mitsubishi"], ["nissan", "Nissan"], ["oldsmobile", "Oldsmobile"],
  ["plymouth", "Plymouth"], ["polestar", "Polestar"], ["pontiac", "Pontiac"], ["porsche", "Porsche"], ["ram", "Ram"],
  ["rivian", "Rivian"], ["rolls-royce", "Rolls-Royce"], ["saab", "Saab"], ["saturn", "Saturn"], ["scion", "Scion"],
  ["smart", "Smart"], ["subaru", "Subaru"], ["subie", "Subaru"], ["suzuki", "Suzuki"], ["tesla", "Tesla"], ["toyota", "Toyota"],
  ["volkswagen", "VW"], ["volvo", "Volvo"], ["vw", "VW"], ["chevy", "Chevy"], ["jcd", "Jeep"], ["lamborghini", "Lambo"]
]);

const BRAND_ONLY_DOMAINS = new Set([
    "chevy.com", "ford.com", "cadillac.com", "buick.com", "gmc.com", "chrysler.com",
    "dodge.com", "ramtrucks.com", "jeep.com", "lincoln.com", "toyota.com", "honda.com",
    "nissanusa.com", "subaru.com", "mazdausa.com", "mitsubishicars.com", "acura.com",
    "lexus.com", "infinitiusa.com", "hyundaiusa.com", "kia.com", "genesis.com",
    "bmwusa.com", "mercedes-benz.com", "audiusa.com", "vw.com", "volkswagen.com",
    "porsche.com", "miniusa.com", "fiatusa.com", "alfa-romeo.com", "landroverusa.com",
    "jaguarusa.com", "tesla.com", "lucidmotors.com", "rivian.com", "volvocars.com"
  ]);

// Spammy tokens to filter out
const SPAMMY_TOKENS = ["sales", "autogroup", "cars"];

const KNOWN_PROPER_NOUNS = new Set([
    "rt128", "abbots", "dealer", "ac", "airport", "all", "american", "anderson", "art", "moehn", "atamian", "fox", "avis", "barnett", "beaty", "beck", "masten",
    "bentley", "berman", "bert", "smith", "bespoke", "motor", "bill", "dube", "bird", "now", "bob", "walk", "bob", "johnson", "boch", "south", "bulluck",
    "byers", "calavan", "camino", "real", "capitol", "carl", "black", "carrollton", "chapman", "charlie", "chastang", "ciocca", "classic", "criswell",
    "crossroads", "crystal", "currie", "czag", "dancummins", "davis", "andrews", "demontrond", "devine", "diamond", "dick", "lovett", "donalson", "don", "baker",
    "don", "hattan", "don", "hinds", "don", "jacobs", "doupreh", "duval", "east", "hills", "eckenrod", "elway", "executive", "ag", "exprealty", "fairey",
    "fletcher", "fox", "frank", "leta", "galpin", "galeana", "garlyn", "garlyn", "shelton", "germain", "golden", "graber", "grainger", "gravity", "gregg",
    "young", "greg", "leblanc", "gus", "machado", "haley", "hgreg", "hilltop", "hoehn", "hmotors", "ingersoll", "ingrid", "jack", "powell", "jake", "jake", "sweeney",
    "jay", "wolfe", "jerry", "seiner", "jim", "falk", "taylor", "jimmy", "britt", "joyce", "koons", "jt", "kadlec", "kalidy", "karl", "stuart", "keating",
    "kennedy", "kerbeck", "kwic", "lacity", "laura", "law", "leblancauto", "look", "larson", "lou", "sobh", "luxury", "malloy", "malouf", "mariano", "martin",
    "masano", "masten", "mattiacio", "maita", "maverick", "mbbhm", "mb", "cherryhill", "mb", "brooklyn", "mb", "caldwell", "mb", "stockton", "mccarthy",
    "mclarty", "daniel", "medlin", "metro", "mikeerdman", "mike", "shaw", "mill", "milnes", "morehead", "mterry", "new", "holland", "np", "oakland", "pape",
    "pat", "milliken", "phil", "smith", "potamkin", "preston", "pugmire", "radley", "raser", "ray", "razor", "rbmw", "rb", "ready", "lallier", "regal",
    "ricart", "rick", "smith", "rivera", "robbins", "robert", "thorne", "rod", "gossett", "baker", "ron", "bouchard", "saffordauto", "safford", "brown", "sansone",
    "sansone", "schmelz", "scott", "clark", "seawell", "secor", "sewell", "sharpe", "sheehy", "shottenkirk", "smart", "drive", "smothers", "starling",
    "stiverson", "line", "step", "one", "strong", "sunbelt", "sunny", "king", "suntrup", "swant", "graber", "tasca", "taylor", "tedbritt", "team",
    "premier", "collection", "tfl", "titus", "will", "tom", "cadlec", "tomlinsonm", "tom", "hesser", "tommynix", "town", "country", "trent", "tsands",
    "tuttle", "click", "union", "park", "vander", "hyde", "vinart", "vscc", "westgate", "herr", "wickmail", "wolfe", "bear", "mountain", "cavalier",
    "liberty", "first", "grainger", "hmtr", "jet", "nola", "lynch", "monadnock", "nfwauto", "total", "offroad", "viva", "alan", "byer",
    "ancira", "asag", "mv", "banks", "blake", "offreeport", "chevyland", "drive", "superior", "mark", "news", "my", "big", "horn", "fairey",
    "briswell", "barlow", "bill", "smith", "braman", "carver", "carter", "cavender", "century", "crevier", "deacons", "ferguson", "gateway",
    "mcgeorge", "qarm", "st", "pete", "raceway", "redland", "rosen", "rossi", "shults", "stadium", "stephen", "wade", "stivers", "strong",
    "werner", "wide", "world", "zumbrota", "bill", "nation", "daniel", "dyer", "gold", "karl", "koons", "larry", "miller", "nixon",
    "norwood", "robby", "rohman", "serpentini", "vannuys", "bramanmc", "carter", "carver", "deacons", "destination", "eastcjd", "fair", "oaks",
    "golf", "mill", "kingsford", "mb", "smithtown", "memorial", "perillo", "woodland", "rosen", "rossi", "tv", "werner", "wide", "world",
    "kadlac", "adesa", "advantage", "adventure", "allen", "alsop", "amc", "andean", "andy", "mohr", "ardmore", "armen", "arnie",
    "bauer", "atlantic", "axio", "bachman", "baker", "baldhill", "ballard", "trucks", "beck", "behlmann", "bettengm", "big",
    "billingsley", "black", "bleecker", "bobby", "rahal", "bodwell", "boulevard", "bowman", "brandon", "braun", "ability", "britt",
    "bronco", "brown", "buckeye", "bunnin", "butler", "carhop", "chester", "nikel", "chris", "clawson", "center", "coast",
    "coastal", "save", "saves", "colemean", "collection", "colonial", "central", "rockwall", "rohrman", "joliet", "world", "novato",
    "ogden", "leblanc", "sands", "new", "smyrna", "used", "preowned", "fort", "rogers", "dabbs", "sharpe", "sharp", "atzen",
    "hoffer", "golden", "west", "rudy", "luther", "saveat", "stockton", "farland", "corn", "husker", "husky", "route1", "keller",
    "deal", "elk", "whitetail", "rockhill", "cooper", "barnett", "tomlinson", "streetside", "jake", "daniels", "nadal", "lisle",
    "jim", "byer", "alan", "drive", "joyce", "jessup", "plaza", "thinkmidway", "think", "queens", "pinegar", "galveston", "star",
    "elyria", "morrey", "tru", "true", "platinum", "fordham", "worktrux", "titanium", "granuto", "summit", "fivestar", "banks",
    "crown", "royal", "fenton", "goldstein", "bespoke", "benna", "haasza", "albrecht", "mcgrath", "hiley", "principle",
    "fast", "grubbs", "sutherland", "leasing", "purdy", "acadian", "aberneth", "4me", "adventures", "airport", "champion",
    "american", "apple", "alpine", "rocky", "mountain", "piazza", "pacific", "ballard", "trucks", "bertera", "blossom",
    "blueprint", "boch", "bodwell", "boyle", "bridgewater", "buchanan", "brinson", "boardman", "burns", "captitol", "carlsen",
    "4", "3", "1", "chapman", "chase", "cityside", "countryside", "competition", "concordia", "conley", "corwin", "coulter",
    "courtesy", "curry", "covert", "devoe", "davidson", "darling", "davis", "days", "denooyer", "diers", "dorsch",
    "eastside", "east", "southside", "westside", "chevyman", "dorman", "diamond", "elder", "farrish", "faulkner",
    "evergreen", "exton", "elkgrove", "eide", "first", "class", "challenge", "fields", "firkins", "fishers", "formula",
    "tower", "fernelious", "fiesta", "fernandez", "feeny", "interstate", "gault", "garrett", "garber", "george", "grand",
    "green", "goodson", "goldstein", "get", "goss", "greve", "grayson", "hh", "granite", "grands", "hacienda", "hardin",
    "hanner", "halleen", "gossett", "goodson", "goss", "hardy", "harbor", "heartland", "hendricks", "huggins", "hunt",
    "holler", "heritage", "horne", "house", "ide", "hodges", "hughes", "huggins", "barge", "irwin", "offroad", "jenkins",
    "haggerty", "spady", "megel", "joseph", "joe", "bowman", "kamaaina", "key", "kings", "prestige", "kerry", "kunes",
    "klein", "kitchener", "lebrun", "ac", "lake", "lindsay", "lockhart", "linquist", "lodi", "machaik", "maher",
    "manahawkin", "mandal", "mann", "maxwell", "marlboro", "marion", "matthews", "medlin", "meadel", "mcguire", "huber",
    "mag", "mills", "stead", "moon", "mullina", "moyer", "motion", "monument", "mohawk", "nick", "emetro", "nelson",
    "city", "mullinax", "nwh", "northshore", "paragon", "family", "conte", "pearson", "parkave", "parks", "team",
    "northtown", "odonnell", "obrien", "pappas", "plaza", "imports", "rabbe", "planet", "pederson", "pellegrino",
    "pioneer", "pinebelt", "rally", "right", "ressler", "redding", "riley", "roberts", "green", "getahonda", "brogden",
    "rivard", "ramsey", "putnam", "prp", "rice", "roush", "ryan", "rosenthal", "rodenroth", "rockland", "sentry",
    "sierra", "shepard", "sendell", "schultz", "schimmer", "scenic", "sm", "sands", "se", "wickley", "sth", "stanley",
    "simms", "stowasser", "sullivan", "stingray", "stringwray", "statewide", "philly", "southland", "stillwell",
    "stevens", "creek", "stones", "sussex", "superior", "sutton", "topy", "thoroughbred", "transit", "troncalli",
    "twins", "umansky", "valencia", "university", "vera", "village", "waconia", "wagner", "walker", "weirs",
    "wheelers", "winchester", "woodmen", "woodhams", "woodbury", "wolf", "chase", "whitaker", "wantz", "winn",
    "windy", "wollam", "young", "huttig", "woldwide", "sunset", "paddock", "kendall", "beardmore", "schworer",
    "falls", "antonino", "exchange", "arrow", "arrowhead", "applegate", "arceneaux", "trust", "atzenhoffer",
    "bayou", "bayway", "blossom", "billholt", "bill", "brand", "kay", "billingsley", "bachman", "bettenbaker",
    "motorcity", "Trust", "Andrew", "Andy", "Mohr", "Voss", "Akins", "Biddle", "Weaver", "Haasza", "Hanania",
    "Rising", "Fast", "Deluca", "milnes", "strong", "beaty", "birdnow", "reedlallier", "oxmoor", "haley", 
    "rivera", "nfwauto", "totaloffroad", "ingersoll", "caruso", "maita", "victory", "hilltop", "shottenkirk", 
    "mabry", "bertogden", "teddy", "jet", "raceway", "mcdaniel", "newsmyrna", "destination", "armen", "bond",
    "livermore", "alsop", "lakeside", "pape"
]);

const SORTED_CITY_LIST = [
    // Alabama (top 50)
      "birmingham", "montgomery", "huntsville", "mobile", "tuscaloosa", "bayshore", "la fontaine", "big bend", "walnut creek", "beverly hills", "boerne", "berlin city", "el cajon", "turner", "ocean", "siousx falls", "treasure coast", "stone mountain", "melbourne", "rallye", "north shore", "red river", "hawaii", "north cutt", "northpoint", "danberry", "st charles", "white plains", "dife", "el cajon", "lake charles", "queens", "lake geneva", "chester springs", "watertown", "west chester", "inver grove", "tucson", "san marcos", "habberstead", "vacaville", "san rafeal", "south charlotte", "hoover", "dothan", "auburn", "decatur", "madison",
      "florence", "gadsden", "vestavia hills", "prattville", "phenix city", "cedar city", "huntsville", "coral gables", "redwood city", "alabaster", "opelika", "northport", "enterprise", "daphne",
      "homewood", "bessemer", "athens", "pelham", "fairhope", "anniston", "mountain brook", "guntersville", "troy", "roswell", "wooster", "hagerstown", "fort collins", "folsom", "freehold", "marietta", "trussville", "talladega",
      "selma", "oxford", "alexander city", "millbrook", "helena", "sylacauga", "scottsboro", "hueytown", "gardendale", "foley",
      "jasper", "cullman", "prichard", "irondale", "eufaula", "saraland", "fort payne", "albertville", "ozark", "wetumpka",
      // Alaska (top 50, limited by population)
      "anchorage", "juneau", "fairbanks", "ketchikan", "sitka", "wasilla", "kenai", "kodiak", "bethel", "palmer",
      "homer", "soldotna", "valdez", "nome", "barrow", "kotzebue", "seward", "cordova", "dillingham", "petersburg",
      "wrangell", "north pole", "delta junction", "hoonah", "unalaska", "craig", "metlakatla", "skagway", "king cove", "sand point",
      "klawock", "seldovia", "togiak", "mountain village", "emmonak", "akutan", "gambell", "alakanuk", "st. marys", "shaktoolik",
      "koyuk", "hooper bay", "st. paul", "chevak", "kivalina", "kwethluk", "mekoryuk", "napakiak", "savoonga", "quinhagak",
      // Arizona (top 50)
      "phoenix", "tucson", "mesa", "chandler", "gilbert", "glendale", "scottsdale", "peoria", "tempe", "surprise",
      "yuma", "avondale", "goodyear", "flagstaff", "buckeye", "casa grande", "lake havasu city", "maricopa", "sierra vista", "prescott",
      "bullhead city", "apache junction", "prescott valley", "marana", "el mirage", "queen creek", "kingman", "san luis", "sahuarita", "florence",
      "fountain hills", "nogales", "douglas", "elooy", "payson", "somerton", "paradise valley", "coolidge", "cottonwood", "camp verde",
      "chito valley", "show low", "safford", "sedona", "winslow", "globe", "page", "tolleson", "wickenburg", "youngtown",
      // Arkansas (top 50)
      "little rock", "fort smith", "fayetteville", "springdale", "jonesboro", "north little rock", "conway", "rogers", "bentonville", "pine bluff",
      "hot springs", "benton", "sherwood", "texarkana", "russellville", "bella vista", "west memphis", "paragould", "cabot", "searcy",
      "van buren", "el dorado", "maumelle", "bryant", "siloam springs", "jacksonville", "forrest city", "harrison", "mountain home", "magnolia",
      "hope", "centerton", "stuttgart", "arkadelphia", "greenwood", "clarksville", "heber springs", "mena", "osceola", "lowell",
      "beebe", "morrilton", "de queen", "farmington", "alma", "berryville", "white hall", "warren", "crossett", "camden",
      // California (top 50)
      "los angeles", "san diego", "san jose", "san francisco", "fresno", "sacramento", "long beach", "oakland", "bakersfield", "anaheim",
      "santa ana", "riverside", "stockton", "chula vista", "irvine", "fremont", "san bernardino", "modesto", "oxnard", "fontana",
      "huntington beach", "glendale", "santa clarita", "garden grove", "santa rosa", "southbay", "oceanside", "rancho cucamonga", "ontario", "elk grove",
      "corona", "hayward", "lancaster", "palmdale", "sunnyvale", "pomona", "escondido", "torrance", "pasadena", "orange",
      "fullerton", "thousand oaks", "visalia", "simi valley", "concord", "roseville", "santa clara", "vallejo", "victorville", "berkeley",
      "cerritos", "redlands",
      // Colorado (top 50)
      "denver", "colorado springs", "aurora", "fort collins", "lakewood", "thornton", "arvada", "westminster", "pueblo", "centennial",
      "boulder", "greeley", "longmont", "loveland", "broomfield", "grand junction", "castle rock", "commerce city", "parker", "littleton",
      "northglenn", "brighton", "englewood", "wheat ridge", "lafayette", "windsor", "erie", "golden", "louisville", "sheridan",
      "montrose", "durango", "canon city", "greenwood village", "sterling", "lone tree", "johnstown", "superior", "fruitvale", "steamboat springs",
      "federal heights", "firestone", "fort lupton", "trinidad", "woodland park", "aspen", "avon", "glendale", "delta", "rifle",
      // Connecticut (top 50)
      "bridgeport", "new haven", "stamford", "hartford", "waterbury", "norwalk", "danbury", "new britain", "west hartford", "greenwich",
      "fairfield", "hamden", "bristol", "meriden", "manchester", "west haven", "milford", "stratford", "east hartford", "middletown",
      "wallingford", "southington", "shelton", "norwich", "torrington", "trumbull", "naugatuck", "newington", "vernon", "windsor",
      "westport", "east haven", "new london", "wethersfield", "farmington", "ridgefield", "new milford", "simsbury", "watertown", "guilford",
      "south windsor", "north haven", "darien", "ansonia", "windsor locks", "rocky hill", "plainville", "brookfield", "wolcott", "seymour",
      // Delaware (top 50, limited by population)
      "wilmington", "dover", "newark", "middletown", "smyrna", "milford", "seaford", "georgetown", "elsmere", "new castle",
      "millsboro", "laurel", "harrington", "camden", "clayton", "lewes", "milton", "selbyville", "townsend", "ocean view",
      "bridgeville", "delmar", "delaware city", "felton", "wyoming", "blades", "greenwood", "frederica", "south bethany", "cheswold",
      "millville", "dagsboro", "frankford", "bethany beach", "newport", "rehoboth beach", "ellendale", "fenwick island", "ardsley", "slaughter beach",
      "houston", "dewey beach", "bowers", "magnolia", "south bowers", "little creek", "odessa", "claymont", "ardentown", "kentmere",
      // Florida (top 50)
      "jacksonville", "miami", "tampa", "orlando", "st. petersburg", "hialeah", "port st. lucie", "cape coral", "tallahassee", "fort lauderdale",
      "pembroke pines", "hollywood", "miramar", "gainesville", "coral springs", "clearwater", "palm bay", "lakeland", "west palm beach", "pompano beach",
      "davie", "miami gardens", "sunrise", "boca raton", "deltona", "miamilakes", "palmcoast", "plantation", "weston", "boynton beach",
      "north miami", "lauderhill", "doral", "homestead", "deerfield beach", "tamarac", "delray beach", "daytona beach", "wellington", "north port",
      "jupiter", "port orange", "coconut creek", "ocala", "sanford", "margate", "bradenton", "apopka", "sarasota", "palm beach gardens",
      "naples", "orangepark",
      // Georgia (top 50)
      "atlanta", "augusta", "columbus", "macon", "savannah", "athens", "sandy springs", "roswell", "johns creek", "albany",
      "warner robins", "alpharetta", "marietta", "valdosta", "smyrna", "dunwoody", "brookhaven", "peachtree corners", "mableton", "milton",
      "evans", "east point", "peachtree city", "rome", "tucker", "hinesville", "dalton", "woodstock", "canton", "duluth",
      "kennesaw", "gainesville", "newnan", "douglasville", "lawrenceville", "statesboro", "lagrange", "stockbridge", "carrollton", "decatur",
      "griffin", "cumming", "acworth", "union city", "pooler", "riverdale", "sugar hill", "forest park", "snellville", "fayetteville",
      // Hawaii (top 50, limited by population)
      "honolulu", "east honolulu", "pearl city", "hilo", "kailua", "waipahu", "kaneohe", "mililani", "kahului", "ewa gentry",
      "mililani mauka", "kihei", "makakilo", "wahiawa", "schofield barracks", "kapolei", "kapaa", "kailua-kona", "lahaina", "wailuku",
      "nanakuli", "waianae", "halawa", "kalaheo", "aiea", "waimea", "kaneohe station", "maili", "waipio", "kapahulu",
      "waimalu", "hanalei", "puhi", "kula", "waikoloa village", "kalaoa", "eleele", "hawi", "kilauea", "kekaha",
      "haleiwa", "kaunakakai", "lanai city", "hana", "paia", "koloa", "wailua homesteads", "makawao", "anahola", "hanapepe",
      // Idaho (top 50)
      "boise", "meridian", "nampa", "idaho falls", "pocatello", "caldwell", "coeur dalene", "twin falls", "lewiston", "post falls",
      "rexburg", "moscow", "eagle", "kuna", "ammon", "chubbuck", "hayden", "mountain home", "blackfoot", "garden city",
      "jerome", "burley", "star", "sandpoint", "rathdrum", "hailey", "payette", "emmett", "middleton", "weiser",
      "preston", "fruitland", "shelley", "buhl", "rigby", "american falls", "lincoln", "st. anthony", "gooding", "kimberly",
      "filer", "salmon", "grangeville", "soda springs", "ketchum", "mccall", "homedale", "bonners ferry", "dalton gardens", "victor",
      // Illinois (top 50)
      "chicago", "aurora", "naperville", "joliet", "rockford", "springfield", "elgin", "peoria", "waukegan", "cicero",
      "champaign", "bloomington", "decatur", "arlington heights", "evanston", "schaumburg", "bolingbrook", "palatine", "skokie", "des plaines",
      "orland park", "tinley park", "oak lawn", "berwyn", "mount prospect", "wheaton", "normal", "hoffman estates", "oak park", "downers grove",
      "glenview", "belleville", "elmhurst", "dekalb", "moline", "urbana", "buffalo grove", "bartlett", "hanover park", "carpentersville",
      "wheeling", "park ridge", "addison", "northbrook", "elk grove village", "danville", "gurnee", "mundelein", "oswego", "highland park",
      // Indiana (top 50)
      "indianapolis", "fort wayne", "evansville", "south bend", "carmel", "fishers", "bloomington", "hammond", "gary", "lafayette",
      "muncie", "noblesville", "terre haute", "greenwood", "kokomo", "anderson", "elkhart", "west lafayette", "mishawaka", "lawrence",
      "jeffersonville", "columbus", "westfield", "new albany", "portage", "richmond", "valparaiso", "goshen", "michigan city", "zionsville",
      "merrillville", "crown point", "schererville", "hobart", "east chicago", "marion", "plainfield", "highland", "munster", "granger",
      "franklin", "clarksville", "seymour", "griffith", "dyer", "shelbyville", "logansport", "vincennes", "huntington", "lebanon",
      // Iowa (top 50)
      "des moines", "cedar rapids", "davenport", "sioux city", "iowa city", "waterloo", "ames", "west des moines", "council bluffs", "dubuque",
      "ankeny", "urbandale", "cedar falls", "marion", "bettendorf", "mason city", "clinton", "burlington", "ottumwa", "fort dodge",
      "muscatine", "coralville", "johnston", "clive", "newton", "indianola", "altoona", "norwalk", "boone", "spencer",
      "storm lake", "carroll", "le mars", "fairfield", "grinnell", "perry", "mount pleasant", "denison", "webster city", "decorah",
      "clear lake", "knoxville", "charles city", "atlantic", "creston", "estonia", "oskaloosa", "waverly", "cherokee", "centerville",
      // Kansas (top 50)
      "wichita", "overland park", "kansas city", "olathe", "topeka", "lawrence", "shawnee", "manhattan", "lenexa", "salina",
      "hutchinson", "leavenworth", "leawood", "dodge city", "garden city", "emporia", "derby", "junction city", "prairie village", "liberal",
      "hays", "pittsburg", "newton", "gardner", "great bend", "mcpherson", "el dorado", "ottawa", "winfield", "arkansas city",
      "andover", "lansing", "merriam", "haysville", "atchison", "parsons", "coffeyville", "chanute", "independence", "augusta",
      "fort scott", "welllington", "mission", "park city", "bonner springs", "valley center", "beloit", "roeland park", "abilene", "eudora",
      // Kentucky (top 50)
      "louisville", "lexington", "bowling green", "owensboro", "covington", "richmond", "georgetown", "florence", "hopkinsville", "nicholasville",
      "elizabethtown", "henderson", "frankfort", "independence", "jeffersontown", "paducah", "radcliff", "ashland", "madisonville", "murray",
      "erlanger", "winchester", "st. matthews", "danville", "fort thomas", "newport", "shively", "shelbyville", "glasgow", "berea",
      "mount washington", "shepherdsville", "bardstown", "campbellsville", "lawrenceburg", "paris", "versailles", "alexandria", "harrodsburg", "pikeville",
      "london", "franklin", "mayfield", "middlesboro", "corbin", "burlington", "oak grove", "maysville", "morehead", "hazard",
      // Louisiana (top 50)
      "new orleans", "baton rouge", "shreveport", "lafayette", "lake charles", "kenner", "bossier city", "monroe", "alexandria", "houma",
      "hammond", "slidell", "gonzales", "zachary", "new iberia", "laplace", "thibodaux", "pineville", "crowley", "baker",
      "sulphur", "west monroe", "gretna", "harvey", "opelousas", "ruston", "natchitoches", "deridder", "morgan city", "abbeville",
      "bogalusa", "mandeville", "bastrop", "eunice", "jennings", "denham springs", "westwego", "minden", "covington", "port allen",
      "marksville", "franklin", "patterson", "donaldsonville", "oakdale", "plaquemine", "tallulah", "ville platte", "springhill", "winnfield",
      "neworleans",
      // Maine (top 50, limited by population)
      "portland", "lewiston", "bangor", "south portland", "auburn", "biddeford", "sanford", "saco", "westbrook", "augusta",
      "waterville", "brewer", "presque isle", "bath", "caribou", "old town", "rockland", "ellsworth", "belfast", "gardiner",
      "calais", "hallowell", "eastport", "machias", "bar harbor", "camden", "millinocket", "skowhegan", "madawaska", "boothbay harbor",
      "orono", "farmington", "kittery", "rumford", "mexico", "paris", "norway", "fort kent", "lincoln", "dover-foxcroft",
      "berwick", "buxton", "freeport", "topsham", "yarmouth", "kennebunk", "falmouth", "bridgton", "houlton", "pittsfield",
      // Maryland (top 50)
      "baltimore", "columbia", "germantown", "silver spring", "waldorf", "glen burnie", "ellicott city", "dundalk", "rockville", "bethesda",
      "frederick", "gaithersburg", "towson", "bowie", "aspin hill", "wheaton", "bel air", "north bethesda", "montgomery village", "odenton",
      "catonsville", "hagerstown", "annapolis", "potomac", "north laurel", "severn", "essex", "hanover", "st. charles", "clinton",
      "laurel", "south laurel", "college park", "greenbelt", "cumberland", "hyattsville", "takoma park", "westminster", "langley park", "camp springs",
      "east riverdale", "landover", "olney", "seabrook", "arnold", "largo", "fairland", "arbutus", "lake shore", "aberdeen",
      // Massachusetts (top 50)
      "boston", "worcester", "springfield", "cambridge", "lowell", "brockton", "new bedford", "quincy", "lynn", "fall river",
      "newton", "somerville", "lawrence", "framingham", "waltham", "haverhill", "malden", "medford", "taunton", "chicopee",
      "weymouth", "revere", "peabody", "methuen", "barnstable", "pittsfield", "attleboro", "arlington", "everett", "salem",
      "westfield", "leominster", "fitchburg", "holyoke", "beverly", "marlborough", "woburn", "chelsea", "braintree", "natick",
      "randolph", "watertown", "franklin", "north attleborough", "gloucester", "northampton", "agawam", "west springfield", "gardner", "belmont",
      "northborough",
      // Michigan (top 50)
      "detroit", "grand rapids", "warren", "sterling heights", "ann arbor", "lansing", "flint", "dearborn", "livonia", "troy",
      "westland", "farmington hills", "kalamazoo", "wyoming", "southfield", "rochester hills", "taylor", "royal oak", "st. clair shores", "pontiac",
      "dearborn heights", "novi", "battle creek", "saginaw", "kentwood", "east lansing", "redford", "roseville", "muskegon", "portage",
      "midland", "lincoln park", "holland", "bay city", "jackson", "eastpointe", "madison heights", "oak park", "southgate", "burton",
      "port huron", "northville", "garden city", "inkster", "allen park", "ferndale", "wyandotte", "mount pleasant", "traverse city", "hamtramck",
      // Minnesota (top 50)
      "minneapolis", "st. paul", "rochester", "duluth", "bloomington", "brooklyn park", "plymouth", "maple grove", "woodbury", "st. cloud",
      "eden prairie", "lakeville", "eagan", "blaine", "coon rapids", "burnsville", "minnetonka", "apple valley", "edina", "st. louis park",
      "mankato", "moorhead", "shakopee", "maplewood", "cottage grove", "inver grove heights", "richfield", "andover", "brooklyn center", "savage",
      "fridley", "oakdale", "chaska", "ramsey", "prior lake", "shoreview", "winona", "chanhassen", "white bear lake", "champlin",
      "elk river", "faribault", "rosemount", "crystal", "farmington", "hastings", "new brighton", "golden valley", "lino lakes", "northfield",
      // Mississippi (top 50)
      "jackson", "gulfport", "southaven", "biloxi", "hattiesburg", "olive branch", "tupelo", "meridian", "greenville", "madison",
      "clinton", "pearl", "horn lake", "oxford", "brandon", "starkville", "ridgeland", "columbus", "vicksburg", "pascagoula",
      "gautier", "laurel", "hernando", "long beach", "natchez", "corinth", "diberville", "greenwood", "ocean springs", "moss point",
      "mccomb", "grenada", "brookhaven", "cleveland", "byram", "yazoo city", "west point", "picayune", "petal", "indianola",
      "new albany", "flowood", "bay st. louis", "canton", "booneville", "senatobia", "holly springs", "amory", "kosciusko", "richland",
      // Missouri (top 50)
      "kansas city", "st. louis", "springfield", "columbia", "independence", "lees summit", "ofallon", "st. joseph", "st. charles", "st. peters",
      "blue springs", "florissant", "joplin", "chesterfield", "jefferson city", "cape girardeau", "wildwood", "university city", "ballwin", "raytown",
      "liberty", "wentzville", "mehlville", "kirkwood", "maryland heights", "hazelwood", "gladstone", "grandview", "belton", "webster groves",
      "sedalia", "ferguson", "arnold", "affton", "nixa", "warrensburg", "rolla", "ozark", "raymore", "creve coeur",
      "farmington", "manchester", "kirksville", "hannibal", "poplar bluff", "sikeston", "lemay", "concord", "clayton", "branson",
      // Montana (top 50, limited by population)
      "billings", "missoula", "great falls", "bozeman", "butte", "helena", "kalispell", "havre", "anaconda", "miles city",
      "belgrade", "livingston", "laurel", "whitefish", "sidney", "lewistown", "glendive", "columbia falls", "polson", "hamilton",
      "dillon", "hardin", "shelby", "glasgow", "deer lodge", "cut bank", "libby", "wolf point", "conrad", "malta",
      "east helena", "colstrip", "three forks", "red lodge", "ronan", "baker", "choteau", "manhattan", "plentywood", "eureka",
      "roundup", "forsyth", "thompson falls", "big timber", "townsend", "stevensville", "browning", "west yellowstone", "white sulphur springs", "lolo",
      // Nebraska (top 50)
      "omaha", "lincoln", "bellevue", "grand island", "kearney", "fremont", "hastings", "north platte", "norfolk", "columbus",
      "papillion", "la vista", "scottsbluff", "south sioux city", "beatrice", "lexington", "gering", "alliance", "blair", "york",
      "mccook", "nebraska city", "seward", "sidney", "crete", "plattsmouth", "schuyler", "ralston", "wayne", "holdrege",
      "chadron", "ogallala", "wahoo", "aurora", "falls city", "cozad", "fairbury", "oneill", "broken bow", "gothenburg",
      "west point", "minden", "central city", "david city", "valentine", "ashland", "kimball", "madison", "st. paul", "milford",
      // Nevada (top 50)
      "las vegas", "henderson", "reno", "north las vegas", "sparks", "carson city", "fernley", "elko", "mesquite", "boulder city",
      "fallon", "winnemucca", "west wendover", "ely", "yerington", "carlin", "lovelock", "wells", "caliente", "tonopah",
      "round mountain", "pioche", "eureka", "virginia city", "goldfield", "hawthorne", "laughlin", "pahrump", "incline village", "dayton",
      "spring creek", "sun valley", "silver springs", "gardnerville", "minden", "battle mountain", "jackpot", "overton", "moapa valley", "panaca",
      "alamo", "amargosa valley", "beatty", "gabbs", "henderson valley", "indian springs", "logandale", "mesquite heights", "nellis afb", "sloan",
      // New Hampshire (top 50, limited by population)
      "manchester", "nashua", "concord", "dover", "rochester", "keene", "portsmouth", "laconia", "lebanon", "claremont",
      "somersworth", "berlin", "franklin", "durham", "hampton", "exeter", "merrimack", "londonderry", "hudson", "milford",
      "newmarket", "swanzey", "pembroke", "plymouth", "littleton", "conway", "newport", "farmington", "jaffrey", "raymond",
      "goffstown", "peterborough", "barrington", "epping", "kingston", "rindge", "northfield", "hinsdale", "winchester", "hooksett",
      "bristol", "gilford", "belfast", "deerfield", "north conway", "wolfeboro", "meredith", "hanover", "henniker", "charlestown",
      "bedford",
      // New Jersey (top 50)
      "newark", "jersey city", "paterson", "elizabeth", "lakewood", "edison", "woodbridge", "toms river", "hamilton", "trenton",
      "clifton", "camden", "brick", "cherry hill", "passaic", "middletown", "union city", "old bridge", "gloucester township", "north bergen",
      "vineland", "bayonne", "piscataway", "new brunswick", "perth amboy", "east orange", "west new york", "plainfield", "hackensack", "sayreville",
      "kearny", "linden", "north brunswick", "atlantic city", "howell", "ewing", "long branch", "westfield", "garfield", "egg harbor",
      "west orange", "orange", "pennsauken", "fair lawn", "bergenfield", "paramus", "livingston", "millville", "nutley", "rahway",
      "newton", "freehold",
      // New Mexico (top 50)
      "albuquerque", "las cruces", "rio rancho", "santa fe", "roswell", "farmington", "clovis", "hobbs", "alamogordo", "carlsbad",
      "gallup", "deming", "los lunas", "chaparral", "sunland park", "las vegas", "portales", "artesia", "lovington", "española",
      "silver city", "bernalillo", "ruidoso", "aztec", "bloomfield", "truth or consequences", "anthony", "los ranchos de albuquerque", "taos", "el cerro",
      "placitas", "tucumcari", "raton", "belen", "corrales", "grants", "eldorado at santa fe", "north valley", "kirtland", "socorro",
      "lee acres", "paradise hills", "shiprock", "white rock", "la cienega", "bosque farms", "milan", "holloman afb", "zuni pueblo", "peralta",
      // New York (top 50)
      "new york", "buffalo", "rochester", "yonkers", "syracuse", "albany", "new rochelle", "mount vernon", "schenectady", "utica",
      "white plains", "hempstead", "troy", "niagara falls", "binghamton", "freeport", "valley stream", "long beach", "north tonawanda", "spring valley",
      "rome", "ithaca", "poughkeepsie", "north hempstead", "elmira", "lindenhurst", "auburn", "watertown", "glen cove", "saratoga springs",
      "middletown", "kingston", "peekskill", "lockport", "plattsburgh", "corning", "lackawanna", "west babylon", "north bay shore", "ossining",
      "uniondale", "amsterdam", "north massapequa", "north bellmore", "massapequa", "huntington station", "east meadow", "central islip", "farmingdale", "port chester",
      "brooklyn",
      // North Carolina (top 50)
      "charlotte", "raleigh", "greensboro", "durham", "winston-salem", "fayetteville", "cary", "wilmington", "high point", "concord",
      "asheville", "greenville", "gastonia", "jacksonville", "chapel hill", "huntersville", "temecula", "apex", "burlington", "rocky mount", "kannapolis",
      "mooresville", "wake forest", "wilson", "sanford", "hickory", "matthews", "monroe", "salisbury", "new bern", "goldsboro",
      "cornelius", "garner", "thomasville", "statesville", "morrisville", "kernersville", "lumberton", "kinston", "carrboro", "asheboro",
      "clemmons", "lexington", "elizabeth city", "boone", "hope mills", "clayton", "henderson", "eden", "laurinburg", "albemarle",
      "southcharlotte",
      // North Dakota (top 50, limited by population)
      "fargo", "bismarck", "grand forks", "minot", "west fargo", "williston", "dickinson", "mandan", "jamestown", "wahpeton",
      "devils lake", "valley city", "grafton", "beulah", "rugby", "lisbon", "carrington", "hazen", "bottineau", "langdon",
      "mayville", "harvey", "bowman", "tioga", "garrison", "stanley", "new town", "cavalier", "park river", "new rockford",
      "rolla", "sibley", "cooperstown", "larimore", "casselton", "washburn", "ellendale", "crosby", "surrey", "hetlinger",
      "wishek", "lakota", "dunseith", "mohall", "lamoure", "kenmare", "mott", "beach", "underwood", "velva",
      // Ohio (top 50)
      "columbus", "cleveland", "cincinnati", "toledo", "akron", "dayton", "parma", "canton", "youngstown", "lorain",
      "hamilton", "springfield", "kettering", "elyria", "lakewood", "cuyahoga falls", "middletown", "euclid", "newark", "mansfield",
      "mentor", "beavercreek", "cleveland heights", "strongsville", "dublin", "fairfield", "findlay", "warren", "lancaster", "lima",
      "hubber heights", "westerville", "marion", "grove city", "reynoldsburg", "delaware", "brunswick", "upper arlington", "stow", "north olmsted",
      "gahanna", "westlake", "north royalton", "massillon", "north ridgeville", "mason", "fairborn", "bowling green", "garfield heights", "shaker heights",
      "beachwood",
      // Oklahoma (top 50)
      "oklahoma city", "tulsa", "norman", "broken arrow", "edmond", "lawton", "moore", "midwest city", "stillwater", "enid",
      "muskogee", "bartlesville", "owasso", "shawnee", "yukon", "ardmore", "ponca city", "duncan", "del city", "bixby",
      "sapulpa", "altus", "bethany", "sand springs", "claremore", "chickasha", "mcalester", "mustang", "jenks", "el reno",
      "ada", "durant", "tahlequah", "elgin", "woodward", "elk city", "okmulgee", "choctaw", "weatherford", "guymon",
      "guthrie", "warr acres", "coweta", "pryor creek", "wagoner", "miami", "sallisaw", "cushing", "seminole", "poteau",
      // Oregon (top 50)
      "portland", "eugene", "salem", "gresham", "hillsboro", "beaverton", "bend", "medford", "springfield", "corvallis",
      "albany", "tigard", "lake oswego", "keizer", "grants pass", "oregon city", "mcminnville", "redmond", "tualatin", "west linn",
      "woodburn", "forest grove", "newberg", "roseburg", "wilsonville", "klamath falls", "ashland", "milwaukie", "sherwood", "happy valley",
      "central point", "canby", "hermiston", "pendleton", "troutdale", "coos bay", "the dalles", "lebanon", "st. helens", "dallas",
      "la grande", "cornelius", "gladstone", "ontario", "newport", "monmouth", "damascus", "prineville", "cottage grove", "silverton",
      // Pennsylvania (top 50)
      "philadelphia", "pittsburgh", "allentown", "erie", "reading", "scranton", "bethlehem", "lancaster", "harrisburg", "york",
      "altoona", "wilkes-barre", "chester", "williamsport", "easton", "lebanon", "hazelton", "new castle", "johnstown", "mckeesport",
      "west mifflin", "chambersburg", "carlisle", "hanover", "pottsville", "greensburg", "natrona heights", "washington", "butler", "indiana",
      "meadville", "uniontown", "oil city", "beaver falls", "sharon", "coatesville", "st. marys", "lower burrell", "hermitage", "aliquippa",
      "sunbury", "bloomsburg", "lock haven", "warren", "jeannette", "latrobe", "bradford", "lewistown", "connellsville", "tamaqua",
      // Rhode Island (top 50, limited by population)
      "providence", "warwick", "cranston", "pawtucket", "east providence", "woonsocket", "coventry", "cumberland", "north providence", "south kingstown",
      "west warwick", "johnston", "north kingstown", "bristol", "lincoln", "smithfield", "central falls", "portsmouth", "barrington", "middletown",
      "burrillville", "tiverton", "narragansett", "east greenwich", "north smithfield", "valley falls", "warren", "scituate", "glocester", "hopkinton",
      "charlestown", "richmond", "exeter", "west greenwich", "jamestown", "foster", "little compton", "new shoreham", "block island", "kingston",
      "wakefield", "peace dale", "carolina", "hope valley", "ashaway", "bradford", "greene", "wyoming", "chepachet", "pascoag",
      // South Carolina (top 50)
      "charleston", "columbia", "north charleston", "mount pleasant", "rock hill", "greenville", "summerville", "goose creek", "sumter", "hilton head island",
      "florence", "spartanburg", "myrtle beach", "aiken", "anderson", "mauldin", "greenwood", "north augusta", "easley", "simpsonville",
      "hanahan", "lexington", "conway", "west columbia", "north myrtle beach", "clemson", "orangeburg", "cayce", "bluffton", "beaufort",
      "irmo", "fort mill", "port royal", "forest acres", "newberry", "laurens", "camden", "lancaster", "georgetown", "hartsville",
      "york", "union", "seneca", "tega cay", "gaffney", "clinton", "bennettsville", "marion", "dillon", "darlington",
      "southcharlotte",
      // South Dakota (top 50, limited by population)
      "sioux falls", "rapid city", "aberdeen", "brookings", "watertown", "mitchell", "yankton", "pierre", "huron", "spearfish",
      "vermillion", "brandon", "box elder", "madison", "sturgis", "belle fourche", "harrisburg", "tea", "dell rapids", "mobridge",
      "canton", "hot springs", "milbank", "lead", "north sioux city", "winner", "chamberlain", "sisseton", "flandreau", "redfield",
      "fort pierre", "beresford", "elks point", "springfield", "custer", "webster", "parkston", "salem", "gregory", "eagle butte",
      "miller", "clear lake", "platte", "garretson", "de smet", "britton", "lemmon", "mission", "tyndall", "gettyburg",
      // Tennessee (top 50)
      "memphis", "nashville", "knoxville", "chattanooga", "clarksville", "murfreesboro", "franklin", "jackson", "johnson city", "bartlett",
      "hendersonville", "kingsport", "collierville", "smyrna", "cleveland", "brentwood", "germantown", "columbia", "la vergne", "gallatin",
      "cookeville", "oak ridge", "morristown", "bristol", "farragut", "shelbyville", "east ridge", "tullahoma", "spring hill", "maryville",
      "dyersburg", "sevierville", "athens", "greeneville", "lebanon", "dickson", "mcminnville", "soddy-daisy", "lakeland", "red bank",
      "martin", "union city", "lawrenceburg", "paris", "crossville", "clinton", "springfield", "covington", "millington", "pulaski",
      // Texas (top 50)
      "houston", "san antonio", "dallas", "austin", "fort worth", "el paso", "arlington", "corpus christi", "plano", "laredo",
      "lubbock", "garland", "irving", "amarillo", "grand prairie", "brownsville", "mckinney", "frisco", "pasadena", "killeen",
      "mcallen", "mesquite", "midland", "denton", "carrollton", "round rock", "abilene", "pearland", "richardson", "odessa",
      "sugar land", "beaumont", "waco", "lewisville", "tyler", "league city", "college station", "edinburg", "san angelo", "allen",
      "wichita falls", "north richland hills", "longview", "mission", "pharr", "bryan", "baytown", "temple", "missouri city", "flower mound",
      "centralhouston",
      // Utah (top 50)
      "salt lake city", "west valley city", "provo", "west jordan", "orem", "sandy", "st. george", "ogden", "layton", "south jordan",
      "lehi", "millcreek", "taylorsville", "logan", "murray", "draper", "bountiful", "riverton", "herriman", "spanish fork",
      "roy", "pleasant grove", "kearns", "tooele", "cottonwood heights", "springville", "cedar city", "midvale", "kaysville", "holladay",
      "american fork", "clearfield", "syracuse", "south salt lake", "farmington", "saratoga springs", "washington", "clinton", "north ogden", "payson",
      "north salt lake", "brigham city", "highland", "centerville", "hurricane", "south ogden", "heber", "west haven", "kanab", "eagle mountain",
      // Vermont (top 50, limited by population)
      "burlington", "south burlington", "rutland", "barre", "montpelier", "winooski", "st. albans", "newport", "vergennes", "middlebury",
      "bennington", "brattleboro", "hartford", "milton", "essex junction", "williston", "springfield", "jericho", "swanton", "northfield",
      "waterbury", "fair haven", "randolph", "morristown", "johnson", "lyndonville", "rockingham", "hardwick", "shelburne", "enosburg falls",
      "richford", "ludlow", "windsor", "poultney", "manchester center", "west rutland", "woodstock", "proctorsville", "white river junction", "west brattleboro",
      "orleans", "newport center", "north bennington", "east montpelier", "bristol", "albany", "chester", "wilder", "derby center", "saxtons river",
      // Virginia (top 50)
      "virginia beach", "norfolk", "chesapeake", "richmond", "newport news", "alexandria", "hampton", "roanoke", "portsmouth", "suffolk",
      "lynchburg", "harrisonburg", "leesburg", "charlottesville", "danville", "manassas", "petersburg", "fredericksburg", "winchester", "salem",
      "staunton", "herndon", "hopewell", "fairfax", "christiansburg", "colonial heights", "radford", "culpeper", "vienna", "williamsburg",
      "front royal", "warrenton", "martinsville", "falls church", "poquoson", "abingdon", "bristol", "covington", "manassas park", "waynesboro",
      "purcellville", "galax", "lexington", "buena vista", "bedford", "farmville", "strasburg", "bluefield", "richlands", "big stone gap",
      // Washington (top 50)
      "seattle", "spokane", "tacoma", "vancouver", "bellevue", "kent", "everett", "renton", "spokane valley", "federal way",
      "yakima", "kirkland", "bellingham", "kennewick", "auburn", "pasco", "marysville", "sammamish", "redmond", "lakewood",
      "richland", "shoreline", "olympia", "lacey", "burien", "bothell", "edmonds", "puyallup", "bremerton", "lynnwood",
      "issaquah", "longview", "mount vernon", "wenatchee", "pullman", "des moines", "lake stevens", "sea-tac", "mercer island", "bainbridge island",
      "moses lake", "camas", "tukwila", "mukilteo", "oak harbor", "east wenatchee", "union gap", "mill creek", "snohomish", "port angeles",
      // West Virginia (top 50, limited by population)
      "charleston", "huntington", "morgantown", "parkersburg", "wheeling", "weirton", "fairmont", "martinsburg", "beckley", "clarksburg",
      "south charleston", "st. albans", "vienna", "bluefield", "moundsville", "bridgeport", "oak hill", "dunbar", "elkins", "nitro",
      "hurricane", "princeton", "charles town", "buckhannon", "keyser", "new martinsville", "grafton", "ranson", "point pleasant", "weston",
      "barboursville", "ravenswood", "summersville", "ripley", "kenova", "welch", "follansbee", "bethany", "williamson", "madison", "logan", "mullens",
      "kingwood", "paden city", "chester", "spencer", "shinnston", "philippi", "richwood", "williamstown", "montgomery", "salem", "rainelle", "mcmachan",
      "alderon", "marmet",
      // Wisconsin (top 50)
      "milwaukee", "madison", "green bay", "kenosha", "racine", "appleton", "waukesha", "eau claire", "oshkosh", "janesville",
      "west allis", "la crosse", "sheboygan", "wausau", "fond du lac", "new berlin", "wauwatosa", "brookfield", "beloit", "greenfield",
      "menomonee falls", "oak creek", "manitowoc", "west bend", "sun prairie", "superior", "stevens point", "neenah", "fitchburg", "muskego",
      "watertown", "de pere", "mequon", "south milwaukee", "cudahy", "wisconsin rapids", "ashwaubenon", "howard", "middleton", "menasha",
      "weston", "beaver dam", "oconomowoc", "kaukauna", "marshfield", "wisconsin dells", "platteville", "whitewater", "verona", "allouez",
      // Wyoming (top 50, limited by population)
      "cheyenne", "casper", "laramie", "gillette", "rock springs", "sheridan", "green river", "evanston", "riverton", "jackson",
      "cody", "rawlins", "lander", "torrington", "douglas", "powell", "worland", "buffalo", "wheatland", "newcastle",
      "mills", "thermopolis", "kemmerer", "afton", "greybull", "glenrock", "lovell", "lyman", "pinedale", "star valley ranch",
      "mountain view", "sundance", "basin", "saratoga", "pine bluffs", "guernsey", "wright", "moorcroft", "upton", "encampment",
      "dubois", "alpine", "bar nunn", "hanna", "diamondville", "shoshoni", "burlington", "cowley", "byron", "big piney",
      // Additional cities/regions from domains
      "riverview", "northwest", "southwest", "downtown", "uptown", "midtown", "miamilakes", "westchester", "alhambra", "san leandro",
      "union park", "ventura", "sterling", "hemet", "selma", "wakefield", "gwinnett", "deland", "waconia", "kingston",
      "lakewood", "brookhaven", "caldwell", "manhattan", "lagrange", "beachwood", "bedford", "cookeville", "freehold", "newton",
      "northborough", "bloomington", "bristol", "cuyahoga", "dalton", "elyria", "midland", "milwaukee", "pinehurst", "st. petersburg", "tuscaloosa",
      "waco", "woodland hills", "fort myers", "livermore", "lakeside", "inver grove", "southtown", "akins",

        // Alabama (20 new, focusing on smaller cities with dealerships)
      "andalusia", "attalla", "bay minette", "brewton", "clanton", "demopolis", "dothan", "evergreen", "fayette", "fort rucker",
      "geneva", "greenville", "guntersville", "haleyville", "luverne", "monroeville", "roanoke", "russellville", "tuscumbia", "valley",

      // Alaska (10 new, smaller communities with auto sales)
      "anchorage", "bethel island", "eagle river", "fairbanks north star", "kenai peninsula", "ketchikan gateway", "matanuska-susitna", "palmer", "sitka city", "skagway-hoonah-angoon",

      // Arizona (25 new, mid-sized cities and auto hubs)
      "avondale estates", "bisbee", "casa blanca", "chandler heights", "eloy", "fort mohave", "gilbertown", "goodyear village", "green valley", "litchfield park",
      "maricopa wells", "oro valley", "paradise", "peoria heights", "phoenixville", "prescott south", "safford valley", "santa cruz", "scottsdale north", "sierra vista southeast",
      "sun city", "surprise valley", "tempe junction", "tuba city", "yuma foothills",

      // Arkansas (15 new, smaller cities with dealership presence)
      "ash flat", "batesville", "blytheville", "camden south", "conway west", "crossett south", "dumas", "el dorado south", "helena-west helena", "malvern",
      "monticello", "newport", "pine bluff south", "sheridan", "wynne",

      // California (50 new, covering Central Valley, Inland Empire, and smaller coastal cities)
      "aliso viejo", "antioch", "apple valley", "arcadia", "arroyo grande", "atascadero", "baldwin park", "banning", "bellflower", "brea",
      "buena park", "burbank", "carlsbad", "cathedral city", "cerritos hills", "chico", "chino", "clovis", "compton", "costa mesa",
      "covina", "culver city", "daly city", "del mar", "downey", "el centro", "el monte", "encinitas", "escondido hills", "fairfield",
      "folsom", "gilroy", "hawthorne", "hemet valley", "indio", "la mesa", "lake forest", "livermore", "lodi", "manteca",
      "murrieta", "norco", "palo alto", "pittsburg", "redondo beach", "san clemente", "san mateo", "santa barbara", "santa monica", "tustin",

      // Colorado (20 new, focusing on Front Range and Western Slope)
      "alamosa", "brighton south", "broomfield west", "brush", "cortez", "craig", "eatonton", "fort morgan", "fountain", "fruita",
      "glenwood springs", "grand lake", "gunnison", "la junta", "lamar", "littleton west", "longmont east", "loveland north", "pueblo west", "vail",

      // Connecticut (15 new, smaller towns with dealerships)
      "branford", "cheshire", "colchester", "east lyme", "groton", "madison", "milford city", "monroe", "new canaan", "north branford",
      "old saybrook", "orange", "stonington", "westbrook", "wilton",

      // Delaware (10 new, smaller communities)
      "bear", "brookside", "glasgow", "hockessin", "middletown crossing", "milford crossing", "newark south", "pike creek", "seaford west", "wilmington manor",

      // Florida (30 new, focusing on Central and South Florida)
      "altamonte springs", "aventura", "belle glade", "boca del mar", "bonita springs", "brandon", "cape canaveral", "casselberry", "coconut grove", "coral gables",
      "crestview", "cutler bay", "dania beach", "deland", "destin", "fernandina beach", "fort myers", "fort pierce", "greenacres", "hialeah gardens",
      "jensen beach", "key west", "lake worth", "melbourne", "merritt island", "miami beach", "north lauderdale", "palmetto", "punta gorda", "vero beach",

      // Georgia (25 new, covering South and Central Georgia)
      "bainbridge", "barnesville", "blakely", "brunswick", "cairo", "calhoun", "cartersville", "cedartown", "commerce", "cordele",
      "dublin", "fitzgerald", "forsyth", "hawkinsville", "jesup", "mcdonough", "milledgeville", "moultrie", "sandersville", "swainsboro",
      "thomasville", "tifton", "vidalia", "waycross", "west point",

      // Hawaii (10 new, smaller communities)
      "ewa beach", "hanamaulu", "kapalua", "lahaina west", "lihue", "makaha", "mililani town", "pearl harbor", "wahiawa heights", "waimanalo",

      // Idaho (15 new, rural and mid-sized cities)
      "bliss", "burley south", "challis", "driggs", "fort hall", "gooding", "idaho city", "jerome north", "kamiah", "kellogg",
      "malad city", "osburn", "parma", "priest river", "saint anthony",

      // Illinois (25 new, covering Chicagoland and Central Illinois)
      "algonquin", "alsip", "batavia", "bloomingdale", "blue island", "bridgeview", "calumet city", "cary", "crest hill", "crystal lake",
      "deerfield", "dixon", "elmwood park", "frankfort", "geneva", "grayslake", "homer glen", "lake zurich", "lisle", "lockport",
      "mchenry", "niles", "north aurora", "romeoville", "streamwood",

      // Indiana (20 new, focusing on Northern and Central Indiana)
      "angola", "auburn", "bedford", "bluffton", "columbia city", "crawfordsville", "decatur", "frankfort", "greensburg", "huntingburg",
      "jasper", "kendallville", "lafayette west", "madison", "monticello", "peru", "portland", "princeton", "rochester", "warsaw",

      // Iowa (15 new, smaller cities with dealerships)
      "algona", "anamosa", "chariton", "clarinda", "creston", "estonia", "forest city", "guttenberg", "hampton", "humboldt",
      "maquoketa", "monticello", "red oak", "sioux center", "vinton",

      // Kansas (15 new, rural and mid-sized cities)
      "belleville", "colby", "concordia", "ellsworth", "eureka", "fredonia", "goodland", "hillsboro", "hugoton", "kingman",
      "lyons", "marysville", "pratt", "russell", "wellington",

      // Kentucky (20 new, covering Eastern and Central Kentucky)
      "ashland", "barbourville", "berea", "cynthiana", "flemingsburg", "georgetown", "grayson", "harlan", "hazard", "hyden",
      "jackson", "london", "louisa", "manchester", "monticello", "morehead", "paintsville", "pikeville", "prestonburg", "somerset",

      // Louisiana (15 new, smaller cities with dealerships)
      "amite", "bunkie", "dequincy", "franklin", "homer", "jonesboro", "kinder", "leesville", "many", "marksville",
      "new roads", "oak grove", "rayville", "vidalia", "winnsboro",

      // Maine (10 new, smaller towns)
      "bar harbor", "bethel", "calais", "caribou", "dexter", "houlton", "limestone", "madawaska", "presque isle", "van buren",

      // Maryland (15 new, covering Eastern Shore and Western Maryland)
      "beltsville", "cheverly", "chestertown", "easton", "edgewood", "elkton", "emmitsburg", "frostburg", "fruitland", "havre de grace",
      "la plata", "mount airy", "ocean city", "pocomoke city", "salisbury",

      // Massachusetts (20 new, smaller cities and towns)
      "amherst", "andover", "ayer", "belmont", "burlington", "dedham", "dracut", "foxborough", "greenfield", "holbrook",
      "hudson", "ipswich", "melrose", "milton", "north adams", "north reading", "stoneham", "swampscott", "westborough", "winthrop",

      // Michigan (25 new, covering Upper Peninsula and Lower Peninsula)
      "adrian", "alma", "alpena", "big rapids", "cadillac", "charlevoix", "cheboygan", "coldwater", "escanaba", "gaylord",
      "hancock", "hillsdale", "houghton", "ionia", "iron mountain", "ishpeming", "ludington", "manistee", "marquette", "menominee",
      "owosso", "petoskey", "sault ste. marie", "sturgis", "three rivers",

      // Minnesota (20 new, covering Twin Cities suburbs and Greater Minnesota)
      "albert lea", "alexandria", "bemidji", "brainerd", "buffalo", "cambridge", "detroit lakes", "fairmont", "fergus falls", "grand rapids",
      "hibbing", "hutchinson", "marshall", "monticello", "morris", "new ulm", "north branch", "owatonna", "thief river falls", "willmar",

      // Mississippi (15 new, smaller cities with dealerships)
      "batesville", "brookhaven", "carthage", "clarksdale", "cleveland", "columbia", "forest", "hazlehurst", "houston", "kosciusko",
      "louisville", "magee", "philadelphia", "pontotoc", "west point",

      // Missouri (20 new, covering Ozarks and Northern Missouri)
      "bolivar", "branson", "carthage", "chillicothe", "clinton", "excelsior springs", "festus", "fulton", "jackson", "kennett",
      "lebanon", "macon", "maryville", "mexico", "nevada", "perryville", "poplar bluff", "saint robert", "union", "west plains",

      // Montana (10 new, rural communities)
      "anaconda-deer lodge", "bigfork", "cut bank", "deer lodge", "glasgow", "libby", "livingston", "polson", "sidney", "whitefish",

      // Nebraska (15 new, smaller cities)
      "albion", "aurora", "blair", "chadron", "falls city", "geneva", "gothenburg", "hastings", "kearney", "lexington",
      "mccook", "norfolk", "plattsmouth", "seward", "york",

      // Nevada (10 new, smaller cities and towns)
      "boulder", "carson", "elko", "fallon", "fernley", "mesquite", "reno south", "sparks east", "winnemucca", "yerington",

      // New Hampshire (10 new, smaller towns)
      "barrington", "belmont", "colebrook", "gorham", "hillsborough", "lisbon", "new ipswich", "newport", "northwood", "tamworth",

      // New Jersey (25 new, covering North and Central Jersey)
      "asbury park", "bayville", "bloomfield", "bound brook", "carteret", "closter", "dover", "dumont", "elmwood park", "englewood",
      "fort lee", "hoboken", "keyport", "lodi", "lyndhurst", "mahwah", "maplewood", "montclair", "morristown", "point pleasant", "ridgewood",
      "rutherford", "summit", "union", "westwood",

      // New Mexico (15 new, smaller cities)
      "alamo", "artesia", "bloomfield", "carlsbad", "clovis east", "deming", "espanola", "gallup", "grants", "hobbs",
      "lovington", "portales", "roswell", "ruidoso", "silver city",

      // New York (25 new, covering Upstate and Long Island)
      "amityville", "baldwinsville", "batavia", "beacon", "canandaigua", "cortland", "endicott", "geneva", "hornell", "horseheads",
      "jamestown", "johnstown", "malone", "massena", "medina", "new paltz", "north syracuse", "ogdensburg", "oneida", "oneonta",
      "oswego", "port jervis", "rochester hills", "saratoga", "watertown",

      // North Carolina (20 new, covering Piedmont and Coastal regions)
      "ahoskie", "belmont", "brevard", "dunn", "elizabeth city", "farmville", "graham", "hamlet", "haverford", "hendersonville",
      "laurinburg", "lenoir", "lillington", "lincolnton", "lumberton", "mocksville", "mount airy", "reidsville", "roxboro", "siler city",

      // North Dakota (10 new, smaller communities)
      "belcourt", "cavalier", "devils lake", "grafton", "harvey", "larimore", "lisbon", "new rockford", "rugby", "valley city",

      // Ohio (25 new, covering Northeast and Central Ohio)
      "alliance", "ashland", "ashtabula", "athens", "barberton", "berea", "chardon", "coshocton", "defiance", "dover",
      "eastlake", "fostoria", "galion", "greenville", "kent", "marietta", "medina", "painesville", "portsmouth", "sandusky",
      "sidney", "tiffin", "wadsworth", "willoughby", "zanesville",

      // Oklahoma (15 new, smaller cities)
      "anadarko", "blackwell", "bristow", "chandler", "cushing", "frederick", "henryetta", "hobart", "holdenville", "idabel",
      "pauls valley", "perry", "purcell", "sulphur", "vinita",

      // Oregon (15 new, covering Willamette Valley and Eastern Oregon)
      "astoria", "baker city", "coquille", "florence", "hood river", "junction city", "la pine", "lincoln city", "madras", "milton-freewater",
      "north bend", "seaside", "sutherlin", "tillamook", "umatilla",

      // Pennsylvania (25 new, covering Western and Central Pennsylvania)
      "ambridge", "beaver", "bellefonte", "blairsville", "bloomsburg", "clarion", "clearfield", "coraopolis", "corry", "doylestown",
      "du bois", "east stroudsburg", "edensburg", "gettysburg", "hollidaysburg", "huntingdon", "kittanning", "kutzton", "lewisburg", "lock haven",
      "milton", "monroeville", "new kensington", "punxsutawney", "selinsgrove",

      // Rhode Island (10 new, smaller communities)
      "barrington", "bristol", "central falls", "coventry", "exeter", "narragansett", "newport", "tiverton", "westerly", "woonsocket",

      // South Carolina (15 new, covering Upstate and Lowcountry)
      "abbeville", "anderson", "bennettsville", "cheraw", "chester", "clover", "gaffney", "lake city", "marion", "mullins",
      "newberry", "pageland", "union", "walterboro", "williamston",

      // South Dakota (10 new, smaller communities)
      "beresford", "brookings", "canton", "chamberlain", "dell rapids", "hot springs", "lead", "mobridge", "sturgis", "vermillion",

      // Tennessee (20 new, covering East and Middle Tennessee)
      "alcoa", "bristol", "crossville", "dayton", "elizabethton", "fayetteville", "gallatin", "harriman", "hohenwald", "jackson",
      "lafayette", "lafollette", "loudon", "manchester", "mcminnville", "milan", "paris", "pigeon forge", "ripley", "sweetwater",

      // Texas (30 new, covering Panhandle, Hill Country, and South Texas)
      "alvin", "angleton", "bastrop", "bay city", "boerne", "brenham", "brownwood", "burleson", "canyon", "cleburne",
      "conroe", "corsicana", "del rio", "eagle pass", "ennis", "fredericksburg", "galveston", "georgetown", "huntsville", "kerrville",
      "kingsville", "lampasas", "lufkin", "marshall", "nacogdoches", "palestine", "port arthur", "seguin", "sherman", "weatherford",

      // Utah (15 new, covering Wasatch Front and Southern Utah)
      "blanding", "brigham", "cedar hills", "delta", "ephraim", "fillmore", "moab", "morgan", "nephi", "park city",
      "price", "richfield", "roosevelt", "tremonton", "vernal",

      // Vermont (10 new, smaller towns)
      "barre", "bellows falls", "bethel", "brandon", "enosburg", "fair haven", "lyndon", "newport", "stowe", "vergennes",

      // Virginia (20 new, covering Shenandoah Valley and Tidewater)
      "blackstone", "bridgewater", "chincoteague", "colonial beach", "dumfries", "emporia", "falmouth", "front royal", "luray", "marion",
      "norton", "orange", "pulaski", "south boston", "south hill", "tappahannock", "vinton", "warrenton", "wise", "wytheville",

      // Washington (15 new, covering Puget Sound and Eastern Washington)
      "anacortes", "arlington", "battle ground", "bonney lake", "chehalis", "cheney", "colville", "ellensburg", "enumclaw", "ferndale",
      "gig harbor", "monroe", "port orchard", "sequim", "shelton",

      // West Virginia (10 new, smaller communities)
      "beckley", "clendenin", "fayetteville", "lewisburg", "moorefield", "oak hill", "parsons", "petersburg", "romney", "summersville",

      // Wisconsin (20 new, covering Southeast and Central Wisconsin)
      "baraboo", "cedarburg", "chippewa falls", "delafield", "delavan", "fort atkinson", "grafton", "hartford", "lake geneva", "menomonie",
      "merrill", "monroe", "oconto", "pewaukee", "portage", "reedsburg", "rice lake", "river falls", "stoughton", "sturgeon bay",

      // Wyoming (10 new, smaller communities)
      "afton", "evanston", "glenrock", "green river", "jackson hole", "kemmerer", "lander", "powell", "riverton", "sheridan", "birmingham", "montgomery",
      "hunstville", "lakeland", "wilsonville", "palm coast", "morristown", "palm coast", "morristown", "roseville", "novato", "jacksonville", "richmond",
      "san leandro"
  ];


const SUFFIXES_TO_REMOVE = ["llc", "inc", "corp", "co", "ltd", "group", "auto", "motors"];

// Overrides for specific domains
const OVERRIDES = {
    "acdealergroup.com": "AC Dealer",
    "aldermansvt.com": "Aldermans VT",
    "allamericanford.net": "All American",
    "alsopchevrolet.com": "Alsop Chevy",
    "alpine-usa.com": "Alpine USA",
    "andersonautogroup.com": "Anderson Auto",
    "andymohr.com": "Andy Mohr",
    "artmoehn.com": "Art Moehn",
    "austininfiniti.com": "Austin Infiniti",
    "autobahnmotors.com": "Autobahn Motor",
    "autonationusa.com": "AutoNation",
    "autobyfox.com": "Fox Auto",
    "beckmasten.net": "Beck Masten",
    "bentleyauto.com": "Bentley Auto",
    "bettenbaker.com": "Baker Auto",
    "bevsmithtoyota.com": "Bev Smith",
    "bianchilhonda.com": "Bianchil Honda",
    "bighorntoyota.com": "Big Horn",
    "billdube.com": "Bill Dube",
    "billsmithbuickgmc.com": "Bill Smith",
    "bienerford.com": "Biener Ford",
    "bmwofnorthhaven.com": "North Haven BMW",
    "bmwwestspringfield.com": "BMW West Springfield",
    "bobweaver.com": "Bob Weaver",
    "bramanmc.com": "Braman MC",
    "bulluckchevrolet.com": "Bulluck Chevy",
    "bulldogkia.com": "Bulldog Kia",
    "cadillacnorwood.com": "Norwood Cadillac",
    "cadillacoflasvegas.com": "Vegas Cadillac",
    "caminorealchevrolet.com": "Camino Real Chevy",
    "capital-honda.com": "Capital Honda",
    "carlblack.com": "Carl Black",
    "carsatcarlblack.com": "Carl Black",
    "caruso.com": "Caruso",
    "carterhonda.com": "Carter Honda",
    "carusofordlincoln.com": "Caruso",
    "cavendercadillac.com": "Cavender",
    "championerie.com": "Champion Erie",
    "chapmanchoice.com": "Chapman",
    "charliesmm.com": "Charlie's Motor",
    "chastangford.com": "Chastang Ford",
    "chevyland.com": "Chevy Land",
    "chevyofcolumbuschevrolet.com": "Columbus Chevy",
    "chmb.com": "M.B. Cherry Hill",
    "chuckfairbankschevy.com": "Fairbanks Chevy",
    "cincyjlr.com": "Cincy Jaguar",
    "citykia.com": "City Kia",
    "classicbmw.com": "Classic BMW",
    "classiccadillac.net": "Classic Cadillac",
    "classicchevrolet.com": "Classic Chevy",
    "crewschevrolet.com": "Crews Chevy",
    "crosscreekcars.com": "Cross Creek",
    "crossroadscars.com": "Crossroad",
    "crownautomotive.com": "Crown Auto",
    "crystalautogroup.com": "Crystal",
    "curriemotors.com": "Currie Motor",
    "czag.net": "CZAG Auto",
    "dancummins.com": "Dan Cummins",
    "davischevrolet.com": "Davis Chevy",
    "davisautosales.com": "Davis",
    "daystarchrysler.com": "Daystar Chrysler",
    "daytonahyundai.com": "Daytona Hyundai",
    "daytonandrews.com": "Dayton Andrews",
    "deaconscdjr.com": "Deacons CDJR",
    "delandkia.net": "Deland Kia",
    "demontrond.com": "DeMontrond",
    "destinationkia.com": "Destination Kia",
    "devineford.com": "Devine",
    "dicklovett.co.uk": "Dick Lovett",
    "donalsonauto.com": "Donalson Auto",
    "donhattan.com": "Don Hattan",
    "donhindsford.com": "Don Hinds Ford",
    "donjacobs.com": "Don Jacobs",
    "dougrehchevrolet.com": "Doug Reh",
    "driveclassic.com": "Drive Classic",
    "drivesuperior.com": "Drive Superior",
    "drivevictory.com": "Victory Auto",
    "duvalford.com": "Duval",
    "dyerauto.com": "Dyer Auto",
    "eagleautomall.com": "Eagle Auto Mall",
    "eastcjd.com": "East CJD",
    "eckenrodford.com": "Eckenrod",
    "edwardsgm.com": "Edwards GM",
    "edwardsautogroup.com": "Edwards Auto Group",
    "ehchevy.com": "East Hills Chevy",
    "elkgrovevw.com": "Elk Grove",
    "elwaydealers.net": "Elway",
    "elyriahyundai.com": "Elyria Hyundai",
    "executiveag.com": "Executive AG",
    "exprealty.com": "Exp Realty",
    "faireychevrolet.com": "Fairey Chevy",
    "fairoaksford.com": "Fair Oaks Ford",
    "firstautogroup.com": "First Auto",
    "fletcherauto.com": "Fletcher Auto",
    "fordhamtoyota.com": "Fordham Toyota",
    "fordlincolncharlotte.com": "Ford Charlotte",
    "fordofdalton.com": "Dalton Ford",
    "fordtustin.com": "Tustin Ford",
    "galeanasc.com": "Galeana",
    "garberchevrolet.com": "Garber Chevy",
    "garlynshelton.com": "Garlyn Shelton",
    "germaincars.com": "Germain Cars",
    "geraldauto.com": "Gerald Auto",
    "givemethevin.com": "Give me the Vin",
    "golfmillchevrolet.com": "Golf Mill",
    "golfmillford.com": "Golf Mill",
    "goldcoastcadillac.com": "Gold Coast",
    "gomontrose.com": "Go Montrose",
    "gusmachadoford.com": "Gus Machado",
    "gychevy.com": "Gy Chevy",
    "haaszaautomall.com": "Haasza Auto",
    "hananiaautos.com": "Hanania Auto",
    "helloautogroup.com": "Hello Auto",
    "hgreglux.com": "HGreg Lux",
    "hillsidehonda.com": "Hillside Honda",
    "hmtrs.com": "HMTR",
    "hoehnmotors.com": "Hoehn Motor",
    "hondaoftomsriver.com": "Toms River",
    "hyundaioforangepark.com": "Orange Park Hyundai",
    "jacksoncars.com": "Jackson",
    "jakesweeney.com": "Jake Sweeney",
    "jcroffroad.com": "JCR Offroad",
    "jeffdeals.com": "Jeff",
    "jenkinsandwynne.com": "Jenkins & Wynne",
    "jetchevrolet.com": "Jet Chevy",
    "jimfalkmotorsofmaui.com": "Jim Falk",
    "joecs.com": "Joe",
    "johnsondodge.com": "Johnson Dodge",
    "joycekoons.com": "Joyce Koons",
    "jtscars.com": "JT Auto",
    "karlchevroletstuart.com": "Karl Stuart",
    "kcmetroford.com": "Metro Ford",
    "keatinghonda.com": "Keating Honda",
    "kennedyauto.com": "Kennedy Auto",
    "kerbeck.net": "Kerbeck",
    "kiaofcerritos.com": "Cerritos Kia",
    "kiaofchattanooga.com": "Chattanooga Kia",
    "kiaoflagrange.com": "Lagrange Kia",
    "kingsfordinc.com": "Kings Ford",
    "kwic.com": "KWIC",
    "lacitycars.com": "LA City",
    "lamesarv.com": "La Mesa RV",
    "landerscorp.com": "Landers",
    "larryhmillertoyota.com": "Larry H. Miller",
    "laurelautogroup.com": "Laurel Auto",
    "laurelchryslerjeep.com": "Laurel",
    "lexusofchattanooga.com": "Lexus Chattanooga",
    "lexusoflakeway.com": "Lexus Lakeway",
    "lexusofnorthborough.com": "Northborough Lexus",
    "lexusoftulsa.com": "Tulsa Lexus",
    "londoff.com": "Londoff",
    "looklarson.com": "Larson",
    "lynnlayton.com": "Lynn Layton",
    "machens.com": "Machens",
    "malouf.com": "Malouf",
    "martinchevrolet.com": "Martin Chevy",
    "maverickmotorgroup.com": "Maverick Motor",
    "mazdanashville.com": "Nashville Mazda",
    "mbbhm.com": "M.B. BHM",
    "mbofbrooklyn.com": "M.B. Brooklyn",
    "mbofcutlerbay.com": "M.B. Cutler Bay",
    "mbofmc.com": "M.B. Music City",
    "mbofsmithtown.com": "M.B. Smithtown",
    "mbofwalnutcreek.com": "M.B. Walnut Creek",
    "mbmnj.com": "M.B. Morristown",
    "mbnaunet.com": "M.B. Naunet",
    "mbrvc.com": "M.B. RVC",
    "mbusa.com": "M.B. USA",
    "mcdanielauto.com": "McDaniel",
    "mclartydaniel.com": "McLarty Daniel",
    "mclartydanielford.com": "McLarty Daniel",
    "mcgeorgetoyota.com": "McGeorge",
    "mccarthyautogroup.com": "McCarthy Auto Group",
    "memorialchevrolet.com": "Memorial Chevy",
    "mercedesbenzstcharles.com": "M.B. St. Charles",
    "metrofordofmadison.com": "Metro Ford",
    "miamilakesautomall.com": "Miami Lakes Auto",
    "mikeerdman.com": "Mike Erdman",
    "mikeerdmantoyota.com": "Mike Erdman",
    "monadnockford.com": "Monadnock Ford",
    "moreheadautogroup.com": "Morehead",
    "mterryautogroup.com": "M Terry Auto",
    "newhollandauto.com": "New Holland",
    "newsmyrnachevy.com": "New Smyrna Chevy",
    "newtontoyota.com": "Newton Toyota",
    "nissanofcookeville.com": "Cookeville Nissan",
    "northwestcars.com": "Northwest Toyota",
    "npcdjr.com": "NP Chrysler",
    "nplincoln.com": "NP Lincoln",
    "obrienauto.com": "O'Brien Auto",
    "oaklandauto.com": "Oakland Auto",
    "oceanautomotivegroup.com": "Ocean Auto",
    "onesubaru.com": "One Subaru",
    "palmetto57.com": "Palmetto",
    "parkerauto.com": "Parker Auto",
    "patmilliken.com": "Pat Milliken",
    "penskeautomotive.com": "Penske Auto",
    "perillobmw.com": "Perillo BMW",
    "philsmithkia.com": "Phil Smith",
    "phofnash.com": "Porsche Nashville",
    "pinehurstautomall.com": "Pinehurst Auto",
    "planet-powersports.net": "Planet Power",
    "potamkinhyundai.com": "Potamkin Hyundai",
    "powerautogroup.com": "Power Auto Group",
    "prestoncars.com": "Preston",
    "prestonmotor.com": "Preston",
    "racewayford.com": "Raceway Ford",
    "radleyautogroup.com": "Radley Auto Group",
    "rbmofatlanta.com": "RBM Atlanta",
    "ricksmithchevrolet.com": "Rick Smith",
    "risingfastmotors.com": "Rising Fast",
    "robbinstoyota.com": "Robbin Toyota",
    "robbynixonbuickgmc.com": "Robby Nixon",
    "robertthorne.com": "Robert Thorne",
    "rodbakerford.com": "Rod Baker",
    "rohrmanhonda.com": "Rohrman Honda",
    "rosenautomotive.com": "Rosen Auto",
    "rossihonda.com": "Rossi Honda",
    "rt128honda.com": "RT128",
    "saabvw.com": "Scmelz",
    "saffordauto.com": "Safford Auto",
    "saffordbrown.com": "Safford Brown",
    "samscismfordlm.com": "Sam Cism",
    "sanleandroford.com": "San Leandro Ford",
    "sansoneauto.com": "Sansone Auto",
    "scottclark.com": "Scott Clark",
    "scottclarkstoyota.com": "Scott Clark",
    "secorauto.com": "Secor",
    "serpentinichevy.com": "Serpentini",
    "sharpecars.com": "Sharpe",
    "shoplynch.com": "Lynch",
    "signatureautony.com": "Signature Auto",
    "slvdodge.com": "Silver Dodge",
    "smithtowntoyota.com": "Smithtown Toyota",
    "southcharlottejcd.com": "Charlotte Auto",
    "stadiumtoyota.com": "Stadium Toyota",
    "steelpointeauto.com": "Steel Pointe",
    "steponeauto.com": "Step One Auto",
    "street-toyota.com": "Street",
    "subaruofwakefield.com": "Subaru Wakefield",
    "sundancechevy.com": "Sundance Chevy",
    "sunnysideauto.com": "Sunnyside Chevy",
    "sunsetmitsubishi.com": "Sunset Mitsubishi",
    "suntrupbuickgmc.com": "Suntrup",
    "swantgraber.com": "Swant Graber",
    "tasca.com": "Tasca",
    "taylorauto.com": "Taylor",
    "teamford.com": "Team Ford",
    "teamsewell.com": "Sewell",
    "tedbritt.com": "Ted Britt",
    "teddynissan.com": "Teddy Nissan",
    "tflauto.com": "TFL Auto",
    "thechevyteam.com": "Chevy Team",
    "thepremiercollection.com": "Premier Collection",
    "tituswill.com": "Titus-Will",
    "tomhesser.com": "Tom Hesser",
    "tomlinsonmotorco.com": "Tomlinson Motor",
    "tommynixautogroup.com": "Tommy Nix",
    "towneauto.com": "Towne Auto",
    "townandcountryford.com": "Town & Country",
    "toyotacedarpark.com": "Cedar Park",
    "toyotaofchicago.com": "Chicago Toyota",
    "toyotaofgreenwich.com": "Greenwich Toyota",
    "toyotaofredlands.com": "Toyota Redland",
    "tuttleclick.com": "Tuttle Click",
    "tvbuickgmc.com": "TV Buick",
    "unionpark.com": "Union Park",
    "valleynissan.com": "Valley Nissan",
    "vanderhydeford.net": "Vanderhyde Ford",
    "vannuyscdjr.com": "Van Nuys CDJR",
    "vinart.com": "Vinart",
    "vscc.com": "VSCC",
    "wernerhyundai.com": "Werner Hyundai",
    "westherr.com": "West Herr",
    "wickmail.com": "Wick Mail",
    "wideworldbmw.com": "Wide World BMW",
    "williamssubarucharlotte.com": "Williams Subaru",
    "yorkautomotive.com": "York Auto"
};

const ABBREVIATION_EXPANSIONS = {
    "audiof": "Audi",
    "ba": "BA Auto",
    "bmwof": "BMW",
    "cdj": "Dodge",
    "cdjr": "Dodge",
    "chevroletof": "Chevy",
    "chevyof": "Chevy",
    "ch": "CH",
    "dv": "Don Vandercraft", // Resolved: kept over "DV"
    "ec": "EC", // Resolved: removed duplicate
    "eh": "East Hills",
    "fordof": "Ford",
    "gh": "Green Hills",
    "gy": "GY",
    "hgreg": "HGreg",
    "hondaof": "Honda",
    "inf": "Infiniti",
    "jlr": "Jaguar",
    "jm": "JM", // Resolved: removed duplicate
    "jt": "JT",
    "kia": "Kia",
    "la": "LA",
    "lh": "La Habra",
    "lv": "LV",
    "mb": "M.B.",
    "mbof": "M.B.",
    "mc": "MC",
    "mercedesbenzof": "M.B.",
    "mercedesof": "M.B.",
    "mv": "Mountain View",
    "nc": "North County",
    "np": "North Park",
    "nv": "North Valley",
    "rt": "RT",
    "sb": "Santa Barbara",
    "sc": "South County",
    "sp": "SP",
    "sv": "South Valley",
    "toyotaof": "Toyota",
    "tv": "Treasure Valley",
    "vc": "Valley Chevy",
    "vw": "VW",
    "wc": "Walnut Creek", // Resolved: kept over "WC"
    "wg": "WG",
    "ph": "Porsche",
    "nash": "Nashville",
    "slv": "SLV",
    "bh": "BH",
    "bhm": "BHM",
    "bpg": "BPG", // Resolved: removed duplicate
    "dm": "DM",
    "gmc": "GMC",
    "usa": "USA",
    "us": "US",
    "ada": "ADA",
    "bmw": "BMW",
    "lac": "LAC",
    "fm": "FM",
    "socal": "SoCal",
    "uvw": "UVW",
    "bb": "BB",
    "dfw": "DFW",
    "fj": "FJ",
    "cc": "CC",
    "hh": "HH",
    "sj": "SJ",
    "jc": "JC",
    "jcr": "JCR", // Fixed: corrected syntax error from "jcr"; "JCR"
    "chev": "Chevy",
    "kc": "KC",
    "ac": "AC",
    "okc": "OKC",
    "obr": "OBR",
    "benz": "M.B.",
    "mbokc": "M.B. OKC",
    "nwh": "NWH",
    "nw": "NW",
    "pbg": "PBG",
    "rbm": "RBM",
    "sm": "SM",
    "sf": "SF",
    "sth": "STH",
    "gm": "GM",
    "tea": "Stead"
  };

     // Define known first and last names for human name splitting
    const KNOWN_FIRST_NAMES = new Set([
      "aaron", "abel", "al", "abraham", "adam", "arnie", "adrian", "al", "alan", "allan", "allen", "albert", "alden", "alex",
      "alexander", "alfred", "allan", "allen", "alton", "alvin", "amos", "andre", "andrew",
      "andy", "angus", "anthony", "archie", "arnold", "arthur", "asa", "austin", "avery",
      "barney", "barnett", "barrett", "barry", "bart", "basil", "bo", "beau", "beauford", "ben",
      "benedict", "benjamin", "bennie", "benny", "bernard", "bernie", "bert", "beverly",
      "bill", "billy", "blaine", "blair", "blake", "bob", "bobbie", "bobby", "boyd",
      "brad", "bradford", "bradley", "brand", "brant", "brent", "brett", "brian", "brock",
      "bruce", "bryan", "bryce", "buck", "bud", "buddy", "burl", "burton", "byron",
      "cal", "caleb", "calvin", "cameron", "carey", "carl", "carlton", "carroll", "carson",
      "casey", "cecil", "cedric", "chad", "chadwick", "chandler", "charles", "charlie",
      "chester", "chip", "chris", "christian", "chuck", "ches", "clair", "clarence", "clark",
      "claude", "clay", "clayton", "clem", "clement", "cletus", "cliff", "clifford",
      "clifton", "clyde", "cody", "coleman", "colin", "connor", "conrad", "corey",
      "cornell", "cory", "courtney", "craig", "curt", "curtis", "cyrus", "dale",
      "dallas", "damon", "dan", "diane", "dane", "daniel", "danny", "daren", "dayton", "darrel", "darrell",
      "darren", "darryl", "dave", "david", "dawson", "dean", "delbert", "delmar",
      "denis", "dennis", "denny", "derek", "derrick", "desmond", "devin", "dewey",
      "dexter", "dick", "dickie", "dillon", "dino", "dominic", "don", "donald",
      "donnie", "donovan", "doyle", "doug", "drake", "drew", "duane", "dudley", "duncan",
      "dustin", "dwight", "earl", "earnest", "ed", "eddie", "edgar", "edmond",
      "edward", "edwin", "elbert", "elden", "eldon", "eli", "eliot", "elliot",
      "elliott", "ellis", "ed", "elmer", "elton", "elwood", "emery", "emmett", "ernest",
      "ernie", "ethan", "eugene", "evan", "everett", "ezra", "felix", "ferdinand",
      "finn", "fletcher", "floyd", "forrest", "francis", "frank", "franklin", "fred",
      "freddie", "frederick", "freddy", "gabe", "gabriel", "gail", "gale", "garland",
      "garrett", "garry", "gary", "gavin", "gayle", "gene", "geoff", "geoffrey",
      "george", "gerald", "gil", "gilbert", "giles", "glen", "glenn", "gordon",
      "grady", "graham", "grant", "greg", "gregg", "gregory", "grover", "gus",
      "guy", "hal", "hank", "hans", "harlan", "herb", "harley", "harold", "harris", "harrison",
      "harry", "hart", "harvey", "hayden", "heath", "hector", "henry", "herbert",
      "herman", "homer", "horace", "hadwin", "howard", "hugh", "hugo", "ian", "ira", "irvin",
      "irving", "isaac", "ivan", "jack", "jackson", "jacob", "jake", "jamie",
      "jared", "jarrett", "jasper", "jay", "jed", "jeff", "jeffery", "jeffrey",
      "jerald", "jeremy", "jerome", "jerry", "jim", "jessie", "jim", "jimmie", "jimmy",
      "joel", "joey", "john", "johnnie", "johnny", "jon", "jonah", "jonas",
      "jonathan", "jordan", "jordy", "joseph", "josh", "joshua", "judd", "julian",
      "julius", "junior", "justin", "keith", "kelvin", "kc", "ken", "kenneth", "kenny",
      "kent", "kevin", "kurt", "kyle", "lamar", "lance", "landon", "lane",
      "larry", "lavern", "lawrence", "lee", "leland", "lenny", "leo", "leon",
      "leroy", "les", "leslie", "levi", "lewis", "lincoln", "lloyd", "logan",
      "lon", "lonnie", "loren", "lou", "louie", "louis", "lowell", "luc", "lucas",
      "lucian", "luke", "lyle", "lyman", "lynn", "mack", "malcolm", "marc",
      "marco", "mario", "marion", "mark", "marshall", "martin", "marty", "marvin",
      "mason", "matt", "matthew", "maurice", "max", "maxwell", "melvin", "merle",
      "merrill", "michael", "mickey", "mike", "miles", "milo", "milton", "mitch",
      "mitchell", "monty", "morgan", "morris", "murray", "nate", "nathan", "nathaniel",
      "ned", "neil", "nelson", "nick", "nicholas", "noah", "norm", "norman",
      "norris", "oliver", "orville", "oscar", "otis", "owen", "pascal", "pat",
      "paul", "percy", "pete", "pat", "peter", "phil", "philip", "quentin", "quinn",
      "ralph", "ramon", "randall", "randell", "randy", "ray", "raymond", "reed",
      "reginald", "reid", "rex", "rhett", "richard", "rick", "ricky", "rob",
      "robert", "rod", "rodney", "roger", "roland", "roman", "ron", "ronald",
      "ronnie", "rory", "ross", "roy", "rudy", "russ", "russell", "russel",
      "sal", "sam", "sammy", "saul", "sawyer", "scott", "sean", "seth", "shawn",
      "sheldon", "sherman", "sid", "sidney", "silas", "simon", "sol", "sonny",
      "spencer", "stan", "stanley", "stewart", "steve", "steven", "stuart",
      "sylvester", "tanner", "ted", "terry", "theodore", "thomas", "tim", "timothy",
      "toby", "todd", "tom", "tony", "tracy", "travis", "trent", "trevor", "trey",
      "tristan", "troy", "tucker", "ty", "tyler", "tyrone", "val", "vance",
      "vernon", "victor", "vince", "vincent", "virgil", "wade", "walker", "wallace",
      "walter", "warren", "wayne", "walker", "wendell", "wes", "vic", "wesley", "whit", "wilber",
      "wilbert", "will", "willard", "willie", "wilson", "winston", "woody", "wyatt",
      "xavier", "zach", "zachary", "zack", "zane",
      // New first names (500, for white males aged 40–80, born ~1945–1985)
      "abner", "alden", "alfonzo", "alford", "alpheus", "alston", "ambrose", "anson",
      "arden", "arlie", "arlin", "armand", "arno", "arnold", "arvel", "asa", "aubrey",
      "august", "aurelius", "barrett", "bartholomew", "baxter", "bennett", "berton",
      "beverly", "blaine", "blair", "blanchard", "boyce", "bradford", "bradley",
      "bradshaw", "brantley", "brent", "brett", "brice", "broderick", "bronson",
      "buckley", "burl", "burton", "byron", "calvert", "carey", "carleton", "carlton",
      "carmine", "cassius", "cecil", "cedric", "chadwick", "chalmers", "chance",
      "channing", "charlton", "chester", "clair", "clarence", "claudius", "clemens",
      "cletus", "clifford", "clinton", "clyde", "coleman", "columbus", "conrad",
      "cordell", "cornelius", "cortez", "crawford", "cullen", "curtis", "cyril",
      "dalton", "damian", "darius", "darrin", "darwin", "daryl", "davey", "delbert",
      "delmer", "denny", "derrick", "desmond", "dewitt", "dexter", "dillard",
      "dion", "dolph", "dominick", "donovan", "dorian", "dorsey", "doyle", "dudley",
      "duff", "duncan", "dwayne", "dwight", "earle", "easton", "edgar", "edison",
      "edmund", "edwin", "eldridge", "elias", "elisha", "elliot", "ellis", "elmer",
      "elton", "elwood", "emanuel", "emerson", "emery", "emil", "emmett", "enoch",
      "ephraim", "erasmus", "erastus", "ernest", "ernie", "errol", "ervin", "esau",
      "eugene", "everett", "ezekiel", "ezra", "fabian", "felton", "ferdinand", "ferris",
      "finley", "fleming", "fletcher", "flora", "floyd", "forrest", "foster", "frank", "francis",
      "franklin", "fredric", "freeman", "gabe", "garfield", "garland", "garrett",
      "garrison", "gaston", "geoff", "gideon", "gilbert", "giles", "gillian", "glenn",
      "godfrey", "gordon", "grady", "granger", "grant", "gregg", "grover", "gustave",
      "hadley", "halbert", "halsey", "hammond", "hanson", "harlan", "harmon", "harold",
      "harper", "harris", "harrison", "hartley", "harvey", "hayden", "hayes", "haywood",
      "heath", "hector", "henry", "herbert", "herschel", "hezekiah", "hilton", "hiram",
      "hobart", "hollis", "homer", "horatio", "hosea", "howard", "hoyt", "hubert",
      "hugh", "hugo", "humbert", "hunter", "hyman", "ignatius", "irwin", "isaiah",
      "israel", "ivan", "ivor", "jacob", "jared", "jerry", "jarvis", "jasper", "jeb", "jedediah",
      "jefferson", "jeremiah", "jerome", "jesse", "jethro", "joab", "joel", "johnathan",
      "jonas", "jordy", "josiah", "jude", "judson", "julian", "julius", "juniper",
      "justus", "kermit", "king", "kingsley", "kirk", "lambert", "lamont", "lance",
      "larkin", "laurence", "lawson", "layton", "lemuel", "lenard", "leonard", "leroy",
      "lester", "levi", "lewis", "lincoln", "lindsey", "linus", "lionel", "lloyd",
      "lonnie", "loren", "lorenzo", "lowell", "lucian", "luther", "lyle", "mackenzie",
      "malachi", "malcolm", "manfred", "marcus", "marlin", "marshall", "marvin",
      "mason", "maurice", "maxwell", "merritt", "micah", "miles", "milo", "montague",
      "montgomery", "morgan", "morris", "morton", "moses", "murphy", "murray", "myron",
      "nathaniel", "ned", "nelson", "newell", "newton", "niles", "noel", "nolan",
      "norbert", "normand", "obadiah", "octavius", "packey", "odell", "olaf", "olin", "orion",
      "orlando", "orville", "osborn", "oswald", "otis", "otto", "owens", "palmer",
      "pascal", "patrick", "percy", "perry", "phineas", "pierce", "porter", "prescott",
      "preston", "quentin", "quincy", "ralph", "randolph", "rayburn", "rayford",
      "reginald", "reuben", "rex", "reynold", "rhodes", "richard", "rigby", "robert",
      "roderick", "roger", "roland", "rollin", "russell", "roman", "ronald", "roosevelt", "rory",
      "roscoe", "ross", "royce", "rudy", "rufus", "rupert", "russell", "sampson", "samuel",
      "saul", "sebastian", "seth", "seymour", "shadrach", "sherman", "sherwood",
      "sidney", "sigmond", "silas", "simon", "solomon", "spencer", "stanford", "stephan",
      "sterling", "stevens", "sylvester", "talmadge", "teddy", "terence", "theodore",
      "thomas", "thornton", "titus", "tobias", "troy", "truman", "tucker", "tyrone",
      "ulysses", "valentine", "vance", "vaughn", "vernon", "vic", "victor", "vincent",
      "virgil", "vito", "vivian", "vladimir", "wade", "walker", "wallace", "walter",
      "ward", "warner", "warren", "weldon", "wendell", "wesley", "weston", "whitman",
      "wilbur", "wilder", "wilfred", "willard", "willis", "winfield", "winston",
      "woodrow", "wyatt", "zachariah", "zephaniah", "scott"
    ]);

       // Place immediately after KNOWN_FIRST_NAMES in api/lib/humanize.js
    const KNOWN_LAST_NAMES = new Set([
      // Existing last names (~600, summarized from humanize.js lines 299–368)
      "abbott", "ackerman", "adams", "adkins", "albert", "aldrich", "alexander", "alford", "allison", "alston",
      "anderson", "andrews", "appleton", "archer", "archibald", "andrews", "armstrong", "arnold", "ashley", "atkins", "atkinson",
      "atwood", "austin", "avery", "babcock", "bain", "baird", "baker", "baldwin", "ball", "ballard",
      "banning", "barker", "barlow", "barr", "barrett", "barry", "bartlett", "barnett", "barrett", "barton", "bates", "bauer",
      "baxter", "beal", "beard", "beasley", "beck", "becker", "bell", "bellows", "bennett", "benson",
      "berry", "billings", "bingham", "bishop", "bixby", "boruff", "black", "bestle", "cecconis", "blackburn", "blair", "blake", "blanchard",
      "bolton", "bond", "booth", "bowen", "bowers", "bowman", "boyd", "boyle", "bradley", "brady",
      "brannon", "bray", "brewer", "briggs", "bright", "brink", "baur", "britt", "brock", "brooks", "brown",
      "browne", "browning", "bryant", "bryce", "buck", "buckley", "bullock", "bumpus", "burdick", "burgess",
      "burke", "burnett", "burns", "burrows", "burton", "bush", "butler", "byrd", "calhoun", "callahan",
      "calvert", "cameron", "campbell", "cannon", "cantrell", "carey", "cism", "carlson", "carmichael", "carpenter", "carr",
      "carroll", "carson", "case", "casey", "cassidy", "chaffee", "chambers", "chandler", "chapman", "chase",
      "childers", "church", "churchill", "clark", "clay", "clayton", "clemens", "clements", "cobb", "cochran",
      "cody", "colburn", "colby", "cole", "coleman", "collier", "collins", "compton", "conley", "connolly",
      "connor", "conway", "cook", "cooke", "cooper", "cope", "corbett", "chambers", "corbin", "cowan", "cox",
      "craig", "crane", "crawford", "crews", "crockett", "crosby", "cross", "crowley", "cummings", "cummins",
      "curry", "dalton", "daly", "daniel", "daniels", "daugherty", "davidson", "davis", "dawes", "day",
      "dean", "decker", "denton", "dickerson", "dickinson", "dillard", "dillon", "dixon", "dodson", "doherty", "donnelly",
      "donovan", "dorsey", "dotson", "dougherty", "douglas", "downey", "downs", "doyle", "drake", "dube",
      "dudley", "duff", "duffy", "duncan", "dunn", "dunbar", "dutton", "eastman", "eaton", "edmonds",
      "edwards", "elliott", "ellis", "emerson", "england", "english", "erickson", "evans", "farley", "farmer",
      "farris", "faulkner", "fenton", "ferguson", "finley", "fischer", "fisher", "fitzgerald", "fleming", "fletcher",
      "flynn", "ford", "foster", "fowler", "fox", "holt", "kay", "brand", "dube", "summers", "franklin", "fraser", "freeman", "frost", "fuller",
      "gallagher", "gannett", "garcia", "gardner", "garner", "garrison", "gibbons", "gibbs", "gibson", "giles",
      "gill", "gilles", "gilmore", "glass", "gleason", "goddard", "goodman", "goodrich", "goodwin", "gordon",
      "gould", "grady", "graham", "granger", "grant", "graves", "gray", "green", "greene", "gregory",
      "griffin", "griffith", "grimes", "gross", "grove", "guthrie", "hadley", "hahn", "hale", "hall",
      "hamilton", "hammond", "hancock", "hanna", "hardy", "harmon", "hubler", "harper", "harriman", "harrington", "harris",
      "hart", "hartman", "hastings", "hatcher", "hawkins", "hawley", "hayden", "hayes", "hayward", "healey",
      "heath", "henderson", "hendricks", "hendrickson", "henry", "herndon", "hesser", "hicks", "higgins", "hill", "hinton",
      "hitchcock", "hodges", "hoffman", "hogan", "holbrook", "holden", "holder", "holland", "holloway", "holmes",
      "holt", "hood", "hooper", "hopkins", "horn", "horton", "houghton", "houston", "howe", "howard",
      "hubbard", "huffman", "hughes", "humphrey", "hunt", "hunter", "hutchinson", "ingalls", "ingram", "irwin",
      "jackson", "jack", "jacobs", "jacobson", "james", "jameson", "jarvis", "jennings", "jensen", "jewett", "johnson",
      "johnston", "jones", "jordan", "judson", "kane", "keating", "keller", "kelley", "kellogg", "kelly",
      "kemp", "kendall", "kennedy", "kent", "kerr", "koehn", "rinke", "kimball", "king", "kinney", "kirby", "kirk",
      "klein", "knox", "lambert", "lane", "lang", "lobb", "larkin", "latta", "larson", "lawrence", "lawson", "leach",
      "leavitt", "leblanc", "lee", "leta", "tomlinson", "lewis", "lindsey", "locke", "logan", "lombard", "long", "lovett",
      "lowe", "lowry", "lucas", "lynch", "lyons", "luther", "mack", "mackenzie", "madden", "malone", "mann",
      "manning", "marks", "marlowe", "marsh", "martin", "mason", "matthews", "mccarthy", "mccoy", "mcdaniel",
      "mckinney", "mclaughlin", "mclean", "mcmillan", "mcpherson", "meadows", "mercer", "merrill", "merritt", "meyer",
      "miles", "miller", "mills", "mitchell", "moody", "moore", "morgan", "morrison", "morrow", "morse",
      "morton", "moss", "mullins", "munson", "murphy", "murray", "myers", "nash", "neal", "nelson",
      "newell", "newman", "newton", "nichols", "nixon", "noble", "nolan", "norman", "norris", "norton",
      "oakley", "obrien", "oconnor", "odonnell", "oliver", "oneal", "oneil", "oneill", "orr", "osborne",
      "osgood", "owens", "pace", "page", "palmer", "parker", "parsons", "patterson", "payne", "peabody",
      "pearson", "pennington", "perkins", "perry", "peters", "peterson", "phelps", "philips", "pierce", "pollard",
      "poole", "porter", "potter", "powell", "pratt", "prescott", "polis", "preston", "price", "purcell", "putnam",
      "quinn", "raines", "ramsey", "randall", "ransom", "raymond", "reed", "reese", "reeves", "regan",
      "reid", "reilly", "remington", "reyes", "reynolds", "rhodes", "rice", "richards", "richardson", "ricker",
      "riley", "rivera", "roberts", "robinson", "rogers", "rollins", "roman", "rose", "ross", "rowe",
      "rudd", "rutherford", "ryan", "salazar", "sanders", "sanderson", "sargent", "saunders", "savage", "sawyer",
      "schmidt", "schneider", "schroeder", "schultz", "scott", "seiner", "sears", "sewell", "sexton", "shannon", "sharp",
      "shaw", "shea", "sheldon", "shepherd", "sherman", "sherwood", "short", "simmons", "simon", "simpson",
      "sinclair", "slater", "sloan", "small", "smith", "snyder", "sparks", "spencer", "sprague", "stafford",
      "stanley", "stark", "steele", "stephens", "stevens", "stewart", "summers", "stoddard", "stokes", "stone", "stratton",
      "strickland", "strong", "sullivan", "summers", "shallotte", "sumner", "sutton", "sweeney", "swanson", "talbot", "tanner",
      "taylor", "thayer", "thomas", "thorne", "thornton", "todd", "torres", "tucker", "turner", "underwood",
      "upton", "vance", "vaughn", "vinton", "wadsworth", "walker", "wall", "wallace", "walden", "walters",
      "walton", "ward", "warner", "warren", "watson", "weaver", "webb", "welch", "wells", "west",
      "wheeler", "whitaker", "whitcomb", "white", "whiting", "whitman", "whiteames", "whitney", "wiley", "wilcox", "wilder",
      "wilkerson", "wilkins", "williams", "williamson", "willis", "webb", "wilson", "winslow", "winters", "wise", "wolfe",
      "wood", "woodard", "woodruff", "vigil", "mello", "woods", "wright", "workman", "wright", "wyatt", "yates", "york", "young",
      "youngblood", "zimmerman",
      // New last names (500, for white males aged 40–80, born ~1945–1985)
      "abbot", "acker", "addison", "ainsworth", "albright", "allred", "ames", "appleby", "archibald", "armistead",
      "ashburn", "ashcroft", "ashford", "atwater", "austen", "badger", "bagley", "bainbridge", "balding", "barber",
      "barclay", "barker", "barnard", "barnes", "barnett", "barron", "barton", "bassett", "bates", "baxter",
      "bayard", "beadle", "beall", "beckett", "boulware", "bedford", "beecham", "belcher", "belding", "bellamy", "benedict",
      "benford", "bennet", "bentley", "berkeley", "bertram", "beverly", "bickford", "biddle", "bigelow", "bingham",
      "birch", "bird", "blackwell", "blair", "blakeley", "blanchard", "blevins", "bloom", "blythe", "bogart",
      "bogue", "bolling", "bolton", "bondurant", "boone", "boswell", "boughton", "bowden", "bowles", "boynton",
      "brace", "bradbury", "bradford", "bradshaw", "bragg", "bramwell", "branson", "brant", "braxton", "breckenridge",
      "brewster", "brice", "bridger", "briggs", "brigham", "brinton", "briscoe", "britton", "broadus", "brockway",
      "bromley", "brook", "brough", "brownell", "brunson", "buckingham", "buckner", "buffington", "bullard", "burch",
      "burdett", "burleigh", "burnham", "burr", "burrows", "burton", "bushnell", "byers", "byram", "cabell",
      "calder", "caldwell", "calloway", "camden", "cameron", "camp", "canfield", "cannon", "cantrell", "capps",
      "cardwell", "carleton", "carlisle", "carmichael", "carrington", "carson", "cartwright", "carver", "cass",
      "castle", "caulfield", "chadwick", "chambers", "chandler", "chapin", "chase", "chatfield", "cheatham", "childs",
      "chisholm", "christenson", "church", "clancy", "clapp", "clarke", "clayborne", "clem", "clement", "clifford",
      "clinch", "cobb", "coburn", "cocker", "cockrell", "coddington", "colburn", "colgate", "collier", "colvin",
      "comer", "comstock", "conant", "conklin", "connell", "converse", "cooley", "cooper", "corbin", "cornish",
      "cortland", "coryell", "cotton", "courtney", "covington", "cowles", "craddock", "crane", "crawley", "creighton",
      "cromwell", "croswell", "crum", "cullen", "culver", "cummings", "cunningham", "currier", "curtis", "cushing",
      "cutler", "cutts", "daly", "danforth", "darnell", "darr", "davenport", "davidson", "dawson", "deane",
      "decker", "delano", "denham", "denny", "derr", "dewey", "dickenson", "dill", "dinsmore", "dix",
      "dixon", "dodge", "dole", "donovan", "dorsett", "doughty", "dow", "dowling", "drake", "draper",
      "drayton", "drew", "driscoll", "duff", "duke", "dunham", "dunlap", "dunnell", "durrence", "durant", "durham",
      "dutton", "dwyer", "eads", "eagle", "earl", "easterly", "eaton", "eckert", "eddy", "edmondson",
      "eldred", "eller", "ellington", "ellis", "ellsworth", "elmore", "emerson", "emery", "emmons", "engle",
      "ennis", "epps", "ernest", "esmond", "evans", "everett", "ewing", "fairchild", "falkner", "fanning",
      "farley", "farnham", "farrar", "farrell", "farrow", "faulk", "fay", "felton", "fenn", "ferris",
      "field", "finch", "fish", "fisk", "fitzpatrick", "flagg", "fleming", "flint", "flynn", "fogg",
      "folger", "forbes", "fordham", "forsyth", "fortune", "foss", "foster", "fowler", "fox", "frame",
      "franks", "fraser", "freeland", "freeman", "french", "frost", "fry", "fuller", "gaines", "gallagher",
      "galloway", "gardiner", "garland", "garrett", "garrison", "gates", "gaylord", "geiger", "gerry", "gibbs",
      "giddings", "gilchrist", "giles", "gillespie", "gilman", "gilmore", "gladstone", "glenn", "glover", "godwin",
      "goldsmith", "goodwin", "gore", "gould", "grafton", "grantham", "graves", "gray", "greenleaf", "greenwood",
      "gregg", "gridley", "griffith", "grimes", "grinnell", "griswold", "grove", "gunn", "hadley", "haines",
      "hale", "hall", "halsey", "hamlin", "hammond", "hampton", "hancock", "hand", "hanley", "hanson",
      "harding", "hargrove", "harmon", "harper", "harrington", "hart", "hartley", "harvey", "haskell", "hatch",
      "hawes", "hawthorne", "hayden", "hayes", "hamm", "hayward", "heath", "heaton", "hedrick", "hempstead", "henderson",
      "henley", "henson", "herrick", "hewitt", "hickman", "hicks", "higgins", "high", "hill", "hilliard",
      "hilton", "hines", "hinson", "hitchcock", "hoag", "hobbs", "hodge", "hodgson", "hogan", "holbrook",
      "holden", "holladay", "holland", "hollister", "holmes", "holt", "hooker", "hooper", "hopkins", "horn",
      "horton", "houghton", "houston", "howard", "howell", "hoyt", "hubbard", "huber", "huck", "huff",
      "huffman", "huggins", "hull", "hume", "hunt", "huntington", "hurd", "hurley", "huston", "hutchins",
      "hyde", "ingalls", "ingle", "ireland", "irvine", "irving", "isaacs", "ives", "jackson", "jarrett",
      "jeffries", "jensen", "jessup", "jewell", "jobe", "johns", "joiner", "jordan", "judd", "keane",
      "keeler", "keen", "kellogg", "kemp", "kendall", "kennedy", "kenney", "kent", "kerr", "keyes",
      "kilgore", "kimball", "king", "kingsbury", "kinsey", "kirby", "kirk", "knapp", "knighton", "knott",
      "knowles", "knox", "lacey", "lamar", "lambert", "lamson", "lancaster", "landis", "lane", "langdon",
      "langston", "larkin", "larson", "latham", "law", "lawton", "leach", "leavitt", "ledger", "leighton",
      "leland", "leonard", "lester", "lewis", "lilly", "lincoln", "lindley", "lindsey", "litchfield", "lockwood",
      "lodge", "logan", "long", "lord", "lovett", "lowe", "lowry", "lucas", "luce", "ludlow",
      "lundy", "lusk", "lyman", "lyon", "lyons", "mace", "mack", "maddox", "magee", "main",
      "malcolm", "mallett", "manley", "mann", "manning", "mansfield", "marble", "marlow", "marsh", "martin",
      "marvin", "mason", "mathews", "maury", "maxwell", "may", "maynard", "mays", "mccabe", "mccall",
      "mccarter", "mcclellan", "mcclure", "mccormick", "mcculloch", "mcdowell", "mcgee", "mcgowan", "mcguire", "mckay",
      "mckee", "mckenna", "mcknight", "mclane", "mcnair", "mcneil", "mcrae", "mead", "meadows", "melton",
      "mercer", "meredith", "merrick", "merrill", "merritt", "miles", "millard", "miller", "mills", "milner",
      "mitchell", "moody", "moore", "moran", "moreland", "morgan", "morrill", "morrison", "morrow", "morse",
      "morton", "moseley", "moss", "mott", "mullins", "munroe", "murdoch", "myers", "murphy", "murray", "myers",
      "nash", "naylor", "neal", "needham", "neely", "nikel", "rown", "newcomb", "newell", "newton", "nicholls", "noble",
      "nolan", "norris", "north", "norton", "norwood", "nutter", "oakley", "ober", "odell", "ogden",
      "oliver", "ormond", "orr", "osborn", "osgood", "otis", "overton", "owens", "pace", "page",
      "paine", "palmer", "park", "parker", "parrish", "parsons", "patten", "patterson", "payne", "peabody",
      "pearce", "peck", "peel", "pemberton", "penn", "pennington", "perry", "peters", "peterson", "pettigrew",
      "phelps", "phillips", "pickens", "pierce", "pike", "pittman", "platt", "plummer", "poole", "porter",
      "potter", "powell", "pratt", "prescott", "preston", "price", "prichard", "proctor", "purdy", "putnam",
      "quincy", "raines", "raleigh", "rand", "randall", "ransom", "rathbun", "ray", "rahal", "raymond", "reade",
      "redding", "reed", "rees", "reese", "reid", "remington", "renfro", "reynolds", "rous", "rhodes", "rice",
      "rich", "richards", "richardson", "richmond", "ricketts", "rider", "ridgeway", "riggs", "riley", "ripley",
      "robbins", "roberts", "robertson", "robinson", "rockwell", "rodgers", "rogers", "rollins", "roper", "ross",
      "rowland", "roy", "rudd", "rush", "russell", "rutherford", "ryder", "sabin", "sampson", "samuels",
      "sanders", "sanford", "sanger", "sargent", "saunders", "savage", "sawyer", "schuyler", "scott", "sinclair", "sears",
      "seaton", "seaver", "sedgwick", "sewell", "sextons", "shannon", "curley", "oneal", "vaden", "baier", "winter", "butler", "sharp", "shaw", "sheldon", "shelton",
      "shepherd", "sheridan", "sherwood", "shipman", "shirley", "shields", "short", "shumway", "sikes", "simmons",
      "simonds", "simpson", "sinclair", "singleton", "skinner", "slade", "slater", "sloan", "small", "smyth",
      "snell", "snow", "somers", "spalding", "sparks", "spear", "spears", "spence", "spencer", "sprague",
      "springer", "stafford", "sauer", "stanton", "stark", "starr", "steele", "stein", "sterling", "stetson", "stevens",
      "stewart", "stiles", "stockton", "stoddard", "stone", "stout", "stratton", "street", "strong", "stuart",
      "sullivan", "sumner", "sutton", "swain", "swanson", "sweet", "sykes", "talbot", "tanner", "tate",
      "taylor", "teague", "temple", "terrell", "thatcher", "thayer", "thompson", "thorne", "thornton", "thurston",
      "tibbetts", "tierney", "tilton", "todd", "tomlinson", "torrey", "towne", "townsend", "tracy", "travis",
      "treadwell", "tucker", "turnbull", "turner", "tyler", "underwood", "upham", "vance", "vaughan", "vinton",
      "wadsworth", "wainwright", "waldron", "walker", "wall", "wallace", "walton", "ward", "ware", "warner",
      "warren", "washburn", "waterman", "watkins", "watson", "watts", "weaver", "webber", "webster", "weeks",
      "welch", "weld", "wellman", "wells", "wendell", "wentworth", "west", "weston", "wheeler", "whipple",
      "whitaker", "whitcomb", "white", "whitehead", "whiting", "whitman", "whitney", "whittaker", "whittier", "wight",
      "wilbur", "wilcox", "wilder", "wilkerson", "wilkins", "willard", "willcox", "williams", "williamson", "willis",
      "wilson", "winchester", "wing", "winslow", "winston", "winter", "withers", "wood", "woodbridge", "woodbury",
      "woodruff", "woods", "woodward", "woolsey", "worthington", "wright", "wyatt", "yates", "yeager", "york",
      "young", "youngblood", "zimmerman", "kadlac", "clark", "caruso", "perillo", "stoops", "weaver"
    ]);

// Blocklist for spammy patterns
const BLOCKLIST = ["auto auto", "group group", "cars cars", "sales sales"];

// Precompute proper nouns set for performance (only proper nouns)
const properNounsSet = new Set([
    ...(Array.isArray(KNOWN_FIRST_NAMES) ? KNOWN_FIRST_NAMES : []).map(n => n.toLowerCase()),
    ...(Array.isArray(KNOWN_LAST_NAMES) ? KNOWN_LAST_NAMES : []).map(n => n.toLowerCase()),
    ...(Array.isArray(SORTED_CITY_LIST) ? SORTED_CITY_LIST : []).map(c => c.toLowerCase()),
    ...(Array.isArray(KNOWN_PROPER_NOUNS) ? KNOWN_PROPER_NOUNS : []).map(n => n.toLowerCase())
]);

// Construct KNOWN_CITIES_SET from SORTED_CITY_LIST
const KNOWN_CITIES_SET = new Set(SORTED_CITY_LIST.map(c => c.toLowerCase()));

import winston from "winston";

// Logging setup
const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [new winston.transports.Console()]
});

function log(level, message, context = {}) {
  logger[level]({ message, domain: context.domain || null, ...context });
}

// Cache for OpenAI results
const openAICache = new Map();

// Utility to validate override format
function validateOverrideFormat(overrideName) {
  if (!overrideName || typeof overrideName !== 'string' || !overrideName.trim()) {
    log('warn', 'Override validation failed: invalid input', { overrideName });
    return null;
  }

  // Relaxed pattern to allow abbreviations (e.g., "M.B.") and all-uppercase tokens (e.g., "BMW")
  const pattern = /^(?:[A-Z]\.[A-Z]\.|(?:[A-Z][a-z]+|[A-Z]+)(?: (?:[A-Z][a-z]+|[A-Z]+))*)$/;
  const tokens = overrideName.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 1 || tokens.length > 3 || !pattern.test(overrideName)) {
    log('warn', 'Override validation failed: pattern or token count mismatch', { overrideName, tokens });
    return null;
  }

  const spammyTokens = new Set(['cars', 'sales', 'autogroup']);
  const carBrandsSet = CAR_BRANDS instanceof Set ? CAR_BRANDS : new Set();
  const isSpammy = tokens.some(token => {
    const lowerToken = token.toLowerCase();
    // Check if the token is part of a multi-word proper noun, city, or brand
    const segment = tokens.join("");
    return spammyTokens.has(lowerToken) && 
           !carBrandsSet.has(lowerToken) && 
           !properNounsSet.has(segment) && 
           !KNOWN_CITIES_SET.has(segment);
  });

  if (isSpammy) {
    log('warn', 'Override validation failed: contains spammy tokens', { overrideName, tokens });
    return null;
  }

  return overrideName;
}

function handleOverride(normalizedDomain, override) {
  if (!validateOverrideFormat(override)) {
    log('warn', 'Invalid override format', { domain: normalizedDomain, override });
    return {
      companyName: '',
      confidenceScore: 0,
      flags: ['override', 'invalidOverrideFormat'],
      tokens: [],
      confidenceOrigin: 'invalidOverrideFormat'
    };
  }

  const companyName = cleanCompanyName(override); // Using humanize.js version
  const nameTokens = companyName.split(' ').filter(Boolean);
  const validation = validateFallbackName(
    { name: companyName, brand: null, flagged: false },
    normalizedDomain,
    null,
    125
  );

  if (!validation.validatedName) {
    log('warn', 'Override validation failed in validateFallbackName', { domain: normalizedDomain, override, validation });
    return {
      companyName: '',
      confidenceScore: 0,
      flags: ['override', 'overrideValidationFailed', ...validation.flags],
      tokens: [],
      confidenceOrigin: 'overrideValidationFailed',
      rawTokenCount: 0
    };
  }

  log('info', 'Override applied successfully', { 
    domain: normalizedDomain, 
    companyName: validation.validatedName,
    confidenceScore: validation.confidenceScore,
    flags: validation.flags
  });

  return {
    companyName: validation.validatedName,
    confidenceScore: validation.confidenceScore,
    flags: ['override', ...validation.flags],
    tokens: nameTokens.map(t => t.toLowerCase()),
    confidenceOrigin: 'override',
    rawTokenCount: nameTokens.length
  };
}

function extractTokens(domain) {
  const flags = [];
  let confidenceScore = 80;

  if (!domain || typeof domain !== 'string' || !domain.trim()) {
    log('error', 'Invalid domain input in extractTokens', { domain });
    return { tokens: [], confidenceScore: 0, flags: ['InvalidDomainInput'] };
  }

  try {
    // Use earlyCompoundSplit for tokenization
    let tokens = earlyCompoundSplit(domain);
    if (!Array.isArray(tokens) || tokens.some(t => typeof t !== 'string')) {
      log('error', 'earlyCompoundSplit returned invalid tokens', { domain, tokens });
      flags.push('InvalidTokens');
      return { tokens: [], confidenceScore: 0, flags };
    }

    // Validate tokens
    if (tokens.length === 0) {
      log('warn', 'No valid tokens extracted', { domain, tokens });
      flags.push('NoValidTokens');
      confidenceScore = 0;
      return { tokens: [], confidenceScore, flags };
    }

    // Adjust confidence based on tokenization quality
    if (tokens.length === 1 && tokens[0].length > 8) {
      // If earlyCompoundSplit produced a single long token, it likely failed to split properly
      log('debug', 'Single long token detected, reducing confidence', { domain, token: tokens[0] });
      confidenceScore = Math.min(confidenceScore, 75);
      flags.push('PotentialTokenizationFailure');
    }

    // Step 1: Deduplicate tokens
    const originalLength = tokens.length;
    tokens = [...new Set(tokens.map(token => token.toLowerCase()))];
    if (tokens.length < originalLength) {
      log('debug', 'Duplicate tokens removed', { domain, originalCount: originalLength, newCount: tokens.length });
      flags.push('DuplicateTokensRemoved');
      confidenceScore = Math.min(confidenceScore, 95);
    }

    // Step 2: Context-aware removal of suffixes and spammy tokens
    const suffixes = SUFFIXES_TO_REMOVE instanceof Set ? new Set([...SUFFIXES_TO_REMOVE, 'motors', 'auto', 'group']) : new Set(['motors', 'auto', 'group']);
    const carBrandsSet = CAR_BRANDS instanceof Set ? CAR_BRANDS : new Set();
    const originalTokens = [...tokens]; // Keep a copy for fallback
    const filteredTokens = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const lowerToken = token.toLowerCase();
      const isSuffix = suffixes.has(lowerToken);
      const isSpammy = SPAMMY_TOKENS.includes(lowerToken);

      // Check if the token is part of a multi-word proper noun, city, or brand
      let isPartOfMultiWord = false;
      for (let len = Math.min(3, tokens.length - i); len >= 2; len--) {
        const segment = tokens.slice(i, i + len).join("");
        if (
          properNounsSet.has(segment) ||
          KNOWN_CITIES_SET.has(segment) ||
          carBrandsSet.has(segment)
        ) {
          isPartOfMultiWord = true;
          break;
        }
      }

      if ((isSuffix || isSpammy) && !isPartOfMultiWord) {
        log('debug', 'Token removed', { domain, token, reason: isSuffix ? 'Suffix' : 'SpammyToken' });
        if (isSuffix) flags.push('SuffixRemoved');
        if (isSpammy) flags.push('SpammyTokenRemoved');
      } else {
        filteredTokens.push(token);
      }
    }

    tokens = filteredTokens;

    // Step 3: Cap at 3 tokens
    if (tokens.length > 3) {
      log('debug', 'Token count exceeds limit, truncating', { domain, originalCount: tokens.length });
      flags.push('TokenCountAdjusted');
      confidenceScore = Math.min(confidenceScore, 95);
      tokens = tokens.slice(0, 3);
    }

    // Step 4: Handle edge case where all tokens are removed
    if (tokens.length === 0) {
      log('warn', 'No tokens remain after filtering, using fallback', { domain });
      flags.push('AllTokensFiltered');
      confidenceScore = Math.min(confidenceScore, 50);
      tokens = originalTokens.slice(0, 3); // Fallback to original tokens, capped at 3
    }

    log('debug', 'Extracted tokens', {
      domain,
      tokens,
      rawTokenCount: tokens.length,
      confidenceScore,
      flags
    });

    return { tokens, confidenceScore, flags };
  } catch (err) {
    log('error', 'extractTokens failed', { domain, error: err.message, stack: err.stack });
    return { tokens: [], confidenceScore: 0, flags: ['ExtractTokensError'] };
  }
}

/**
 * Splits merged tokens using earlyCompoundSplit from humanize.js.
 * @param {string} name - The name to split.
 * @returns {string} - The split name.
 */
function splitMergedTokens(name) {
  try {
    // Validate input
    if (!name || typeof name !== 'string' || !name.trim()) {
      log('error', 'Invalid name in splitMergedTokens', { name });
      return name || '';
    }

    // Use earlyCompoundSplit to tokenize
    let splitTokens = earlyCompoundSplit(name.trim());
    
    // Validate output
    if (!Array.isArray(splitTokens) || !splitTokens.every(token => typeof token === 'string' && token.trim())) {
      log('warn', 'Invalid or empty tokens from earlyCompoundSplit', { name, splitTokens });
      return capitalizeName(name.trim())?.name || name.trim();
    }

    // Apply abbreviation expansions during tokenization
    splitTokens = splitTokens.map(token => {
      if (ABBREVIATION_EXPANSIONS[token.toLowerCase()]) {
        return ABBREVIATION_EXPANSIONS[token.toLowerCase()];
      }
      return token;
    });

    // Capitalize tokens and handle special cases (e.g., "mb" → "M.B.")
    const capitalizedTokens = splitTokens
      .map(token => {
        if (token.toLowerCase() === 'mb') return 'M.B.';
        if (token.toLowerCase() === 'bhm') return 'Birmingham';
        const capResult = capitalizeName(token) || { name: token };
        return capResult.name;
      })
      .filter(token => token); // Remove empty tokens

    // Cap at 4 tokens for cold-email safety (aligned with validateFallbackName)
    const finalTokens = capitalizedTokens.slice(0, 4);
    
    // Join tokens
    const result = finalTokens.join(' ');

    log('debug', 'splitMergedTokens result', { name, result, tokens: finalTokens });
    return result;
  } catch (e) {
    log('error', 'splitMergedTokens failed', { name, error: e.message, stack: e.stack });
    return capitalizeName(name?.trim() || '')?.name || name || '';
  }
}

function validateFallbackName(result, domain, domainBrand, confidenceScore = 80) {
  const flags = new Set();
  let validatedName = result.name?.trim();
  let currentConfidenceScore = confidenceScore;

  log('info', 'validateFallbackName started', { domain, result });

  try {
    // Step 1: Initial validation and override check
    const normalizedDomain = domain.endsWith('.com') ? domain : `${domain}.com`;
    const isOverride = OVERRIDES[normalizedDomain];
    if (isOverride) {
      validatedName = OVERRIDES[normalizedDomain];
      log('info', 'Override applied', { domain, validatedName });
      flags.add('OverrideApplied');
      currentConfidenceScore = 125;
      const capResult = capitalizeName(validatedName) || { name: validatedName };
      return {
        validatedName: capResult.name,
        flags: Array.from(flags),
        confidenceScore: currentConfidenceScore
      };
    }

    if (!result || !validatedName || typeof validatedName !== "string") {
      log('warn', 'Invalid OpenAI result', { domain, result });
      flags.add('FallbackNameError');
      flags.add('ReviewNeeded');
      return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
    }

    // Step 2: Split merged tokens and normalize
    let tokens = validatedName.split(' ').filter(Boolean);
    if (tokens.length === 1) {
      const splitName = splitMergedTokens(validatedName);
      if (splitName !== validatedName) {
        validatedName = splitName;
        log('info', 'Merged tokens split', { domain, validatedName });
        flags.add('TokenSplitApplied');
        currentConfidenceScore = Math.min(currentConfidenceScore, 95);
      }
    }

    // Step 3: Fix truncation issues
    tokens = validatedName.split(' ').filter(Boolean);
    if (tokens.length > 0) {
      const lastToken = tokens[tokens.length - 1].toLowerCase();
      if (lastToken.length >= 3 && lastToken.endsWith("au") && domain.toLowerCase().includes("auto")) {
        tokens[tokens.length - 1] = lastToken.replace(/au$/, " Auto");
        validatedName = tokens.join(" ");
        flags.add('TruncationFixed');
      } else if (lastToken.length >= 3 && lastToken.endsWith("mo") && domain.toLowerCase().includes("motors")) {
        tokens[tokens.length - 1] = lastToken.replace(/mo$/, " Motors");
        validatedName = tokens.join(" ");
        flags.add('TruncationFixed');
      }
    }

    // Step 4: Capitalize name with domainBrand
    const capResult = capitalizeName(validatedName, domainBrand, domain) || { name: validatedName };
    validatedName = capResult.name;
    tokens = validatedName.split(' ').filter(Boolean);
    flags.add(...capResult.flags);

    // Step 5: Validate name length and pattern
    const pattern = /^(?:[A-Z]\.[A-Z]\.|(?:[A-Z][a-z]+|[A-Z]+)(?: (?:[A-Z][a-z]+|[A-Z]+))*)$/;
    const isValidSingleToken = tokens.length === 1 && 
      !CAR_BRANDS.has(validatedName.toLowerCase()) && 
      !KNOWN_CITIES_SET.has(validatedName.toLowerCase());
    if (!pattern.test(validatedName) || tokens.length > 4) {
      log('warn', 'Uncapitalized, malformed, or excessive token count', { domain, validatedName, tokenCount: tokens.length });
      flags.add('FallbackNameError');
      flags.add('ReviewNeeded');
      return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
    }

    // Step 6: Check for city-only or brand-only outputs
    const hasCity = tokens.some(t => KNOWN_CITIES_SET.has(t.toLowerCase())) || 
                    KNOWN_CITIES_SET.has(validatedName.toLowerCase());
    const isBrand = CAR_BRANDS.has(validatedName.toLowerCase());
    const genericTerms = ['auto', 'motors', 'dealers', 'group', 'cars', 'drive', 'center', 'world'];
    const hasGeneric = tokens.some(t => genericTerms.includes(t.toLowerCase()));

    if (hasCity && !hasGeneric && tokens.length <= 2) {
      log('warn', 'City-only output detected', { domain, validatedName });
      flags.add('CityOnlyFallback');
      flags.add('ReviewNeeded');
      return { validatedName: null, flags: Array.from(flags), confidenceScore: 50 };
    }

    if (isBrand && tokens.length === 1) {
      log('warn', 'Brand-only output detected', { domain, validatedName });
      flags.add('BrandOnlyFallback');
      flags.add('ReviewNeeded');
      return { validatedName: null, flags: Array.from(flags), confidenceScore: 50 };
    }

    // Step 7: Handle brand mismatch
    if (result.brand && domainBrand && result.brand.toLowerCase() !== domainBrand.toLowerCase()) {
      log('warn', 'OpenAI brand mismatch, prioritizing domain brand', { domain, openAIBrand: result.brand, domainBrand });
      flags.add('BrandMismatchPenalty');
      currentConfidenceScore = Math.max(currentConfidenceScore - 5, 50);
      const lowerDomainBrand = domainBrand.toLowerCase();
      const hasBrandToken = tokens.some(w => w.toLowerCase() === lowerDomainBrand || CAR_BRANDS.has(w.toLowerCase()));
      if (!hasBrandToken) {
        tokens.push(domainBrand);
        validatedName = tokens.join(' ');
        flags.add('DomainBrandApplied');
      }
    }

    // Step 8: Validate brand against CAR_BRANDS
    if (result.brand && !CAR_BRANDS.has(result.brand.toLowerCase())) {
      log('warn', 'OpenAI hallucinated brand, using domain brand', { domain, brand: result.brand });
      flags.add('BrandHallucination');
      if (domainBrand && CAR_BRANDS.has(domainBrand.toLowerCase())) {
        const lowerDomainBrand = domainBrand.toLowerCase();
        const hasBrandToken = tokens.some(w => w.toLowerCase() === lowerDomainBrand || CAR_BRANDS.has(w.toLowerCase()));
        if (!hasBrandToken) {
          tokens.push(domainBrand);
          validatedName = tokens.join(' ');
          flags.add('DomainBrandApplied');
        }
      } else {
        flags.add('FallbackNameError');
        flags.add('ReviewNeeded');
        return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
      }
    }

    // Step 9: Remove suffixes and spammy tokens
    tokens = validatedName.split(' ').filter(Boolean);
    const suffixesSet = new Set(SUFFIXES_TO_REMOVE.map(s => s.toLowerCase()));
    const filteredTokens = tokens.filter(token => {
      const lowerToken = token.toLowerCase();
      if (suffixesSet.has(lowerToken)) {
        flags.add('SuffixRemoved');
        return false;
      }
      if (SPAMMY_TOKENS.includes(lowerToken) && !genericTerms.includes(lowerToken)) {
        flags.add('SpammyTokens');
        return false;
      }
      return true;
    });

    if (filteredTokens.length === 0) {
      log('warn', 'All tokens removed during suffix/spammy token filtering', { domain, validatedName });
      flags.add('AllTokensFiltered');
      flags.add('ReviewNeeded');
      return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
    }

    validatedName = filteredTokens.join(' ');
    if (!pattern.test(validatedName)) {
      log('warn', 'Name invalid after suffix/spammy token removal', { domain, validatedName });
      flags.add('FallbackNameError');
      flags.add('ReviewNeeded');
      return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
    }

    // Step 10: Check for duplicates
    tokens = validatedName.split(' ').filter(Boolean);
    const words = tokens.map(w => w.toLowerCase());
    const uniqueWords = [...new Set(words)];
    if (uniqueWords.length !== words.length) {
      log('info', 'Duplicate tokens removed', { domain, validatedName });
      validatedName = uniqueWords
        .map(t => tokens[words.indexOf(t)]) // Preserve original case
        .join(' ');
      flags.add('DuplicatesRemoved');
      currentConfidenceScore = Math.min(currentConfidenceScore, 95);
    }

    // Step 11: Final city-only/brand-only check
    tokens = validatedName.split(' ').filter(Boolean);
    const isFinalBrand = CAR_BRANDS.has(validatedName.toLowerCase());
    const hasFinalCity = tokens.some(t => KNOWN_CITIES_SET.has(t.toLowerCase())) || 
                         KNOWN_CITIES_SET.has(validatedName.toLowerCase());
    const hasFinalGeneric = tokens.some(t => genericTerms.includes(t.toLowerCase()));

    if (hasFinalCity && !hasFinalGeneric && tokens.length <= 2) {
      log('warn', 'City-only output after filtering', { domain, validatedName });
      flags.add('CityOnlyFallback');
      flags.add('ReviewNeeded');
      return { validatedName: null, flags: Array.from(flags), confidenceScore: 50 };
    }

    if (isFinalBrand && tokens.length === 1) {
      log('warn', 'Brand-only output after filtering', { domain, validatedName });
      flags.add('BrandOnlyFallback');
      flags.add('ReviewNeeded');
      return { validatedName: null, flags: Array.from(flags), confidenceScore: 50 };
    }

    // Step 12: Adjust confidence based on token count
    if (tokens.length === 1) {
      currentConfidenceScore = Math.min(currentConfidenceScore, 95);
      flags.add('SingleTokenWarning');
    } else if (tokens.length >= 2) {
      currentConfidenceScore = Math.max(currentConfidenceScore, 125);
    }

    log('info', 'Output validated successfully', {
      domain,
      validatedName,
      confidenceScore: currentConfidenceScore,
      flags: Array.from(flags)
    });
    return { validatedName, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
  } catch (e) {
    log('error', 'validateFallbackName failed', { domain, error: e.message, stack: e.stack });
    flags.add('FallbackNameError');
    flags.add('ReviewNeeded');
    return { validatedName: null, flags: Array.from(flags), confidenceScore: currentConfidenceScore };
  }
}

async function fallbackName(domain, originalDomain, meta = {}) {
  const normalizedDomain = normalizeDomain(domain);
  let companyName = '';
  let confidenceScore = 0;
  let flags = new Set(['FallbackName']);
  let tokens = 0;

  try {
    log('info', 'Starting fallback processing', { domain: normalizedDomain });

    const pattern = /^[A-Z][a-z]+(?: [A-Z][a-z]+){0,2}$/;

    // Check domain cache for repeated domains
    if (domainCache.has(normalizedDomain)) {
      const cached = domainCache.get(normalizedDomain);
      log('info', 'Domain cache hit', { domain: normalizedDomain, companyName: cached.companyName });
      return {
        ...cached,
        flags: [...cached.flags, 'DomainCacheHit']
      };
    }

    // Check overrides
    const overrideKey = normalizedDomain.endsWith('.com') ? normalizedDomain : `${normalizedDomain}.com`;
    if (OVERRIDES[overrideKey]) {
      const validatedOverride = validateOverrideFormat(OVERRIDES[overrideKey]);
      if (validatedOverride) {
        log('info', 'Override applied', { domain: normalizedDomain, companyName: validatedOverride });
        const result = handleOverride(normalizedDomain, validatedOverride);
        domainCache.set(normalizedDomain, result);
        return result;
      } else {
        flags.add('OverrideValidationFailed');
      }
    }

    // Validate input
    if (!normalizedDomain) {
      log('error', 'Invalid domain input', { domain: normalizedDomain });
      flags.add('InvalidDomainInput');
      flags.add('ManualReviewRecommended');
      return { companyName, confidenceScore, flags: Array.from(flags), tokens };
    }

    // Check brand-only domains
    if (BRAND_ONLY_DOMAINS.has(`${normalizedDomain}.com`)) {
      log('info', 'Skipping fallback for brand-only domain', { domain: normalizedDomain });
      flags.add('BrandOnlyDomainSkipped');
      return { companyName, confidenceScore: 0, flags: Array.from(flags), tokens };
    }

    // Try humanizeName
    let initialResult;
    try {
      initialResult = await humanizeName(normalizedDomain);
      flags.add(...initialResult.flags);
      log('info', 'humanizeName completed', { domain: normalizedDomain, result: initialResult });

      const confidenceThreshold = 80;
      if (initialResult.confidenceScore >= confidenceThreshold && !initialResult.flags.includes('ReviewNeeded')) {
        log('info', 'Using humanizeName result', { domain: normalizedDomain, companyName: initialResult.companyName });
        const result = {
          companyName: initialResult.companyName,
          confidenceScore: initialResult.confidenceScore,
          flags: Array.from(flags),
          tokens: initialResult.tokens?.length || 0
        };
        domainCache.set(normalizedDomain, result);
        return result;
      }
      companyName = initialResult.companyName || '';
      confidenceScore = initialResult.confidenceScore || 0;
      tokens = initialResult.tokens?.length || 0;
    } catch (error) {
      log('error', 'humanizeName failed', { domain: normalizedDomain, error: error.message, stack: error.stack });
      flags.add('HumanizeNameError');
      initialResult = { companyName: '', confidenceScore: 0, flags: [], tokens: 0 };
    }

    // Extract brand and city
    let cleanDomain = normalizedDomain.replace(/(\.com|\.net|\.org|\.biz|\.ca|\.co\.uk)$/g, '');
    let brandCityResult = extractBrandOfCityFromDomain(cleanDomain) || { brand: '', city: '' };
    let domainBrand = brandCityResult.brand;
    let city = brandCityResult.city;

    // Extract tokens
    let extractedTokensResult = extractTokens(cleanDomain);
    let extractedTokens = extractedTokensResult.tokens;
    tokens = extractedTokens.length;
    flags.add(...extractedTokensResult.flags);
    confidenceScore = Math.max(confidenceScore, extractedTokensResult.confidenceScore);

    const filteredTokens = extractedTokens
      .map(t => t.toLowerCase())
      .filter(t => !SPAMMY_TOKENS.includes(t) && t !== 'of');
    extractedTokens = filteredTokens;

    const rawTokens = extractedTokensResult.tokens;

    // Meta-title extraction (prioritize metadata)
    if (!meta.title) {
      try {
        const metadata = await fetchMetaData(normalizedDomain);
        meta = { ...meta, title: metadata.title || meta.title || '' };
      } catch (error) {
        log('error', 'fetchMetaData failed', { domain: normalizedDomain, error: error.message });
        flags.add('FetchMetaDataError');
      }
    }

    if (meta.title) {
      const metaResult = getMetaTitleBrand(meta);
      if (metaResult && metaResult.companyName) {
        const result = {
          companyName: metaResult.companyName,
          confidenceScore: metaResult.confidenceScore,
          flags: Array.from(new Set([...metaResult.flags, ...flags])),
          tokens
        };
        domainCache.set(normalizedDomain, result);
        return result;
      }
    }

    // Proper noun pair recovery
    const properNounPair = extractedTokens.filter(t => properNounsSet.has(t));
    if (properNounPair.length >= 2) {
      const tempName = properNounPair.slice(0, 2).map(t => capitalizeName(t).name).join(' ');
      const retryResult = await humanizeName(tempName);
      if (retryResult.confidenceScore >= 80 && pattern.test(retryResult.companyName)) {
        log('info', 'Proper noun pair recovered', { domain: normalizedDomain, companyName: retryResult.companyName });
        flags.add('ProperNounRecovered');
        const result = {
          companyName: retryResult.companyName,
          confidenceScore: 125,
          flags: Array.from(new Set([...retryResult.flags, ...flags])),
          tokens
        };
        domainCache.set(normalizedDomain, result);
        return result;
      }
    }

    // Single proper noun fallback with enhanced recovery
    const carBrandsSet = CAR_BRANDS;
    const singleProper = extractedTokens.find(t => properNounsSet.has(t) && !carBrandsSet.has(t) && !KNOWN_CITIES_SET.has(t));
    if (singleProper) {
      const nameResult = capitalizeName(singleProper);
      companyName = nameResult.name;
      if (!pattern.test(companyName)) {
        log('warn', 'Single proper noun pattern validation failed', { domain: normalizedDomain, companyName });
        companyName = '';
      } else {
        confidenceScore = 95;
        flags.add('SingleProperNoun');

        // Enhanced recovery for generic domains
        let appended = false;
        const isOverride = OVERRIDES[overrideKey];

        // Try to append a brand
        if (!isOverride) {
          let brand = domainBrand || rawTokens.find(t => carBrandsSet.has(t.toLowerCase()));
          if (brand && !companyName.toLowerCase().includes(brand.toLowerCase())) {
            const formattedBrand = BRAND_MAPPING.get(brand.toLowerCase()) || capitalizeName(brand).name;
            companyName = `${companyName} ${formattedBrand}`;
            flags.add('BrandAppendedForClarity');
            confidenceScore = 125;
            appended = true;
            log('info', 'Appended brand to single proper noun', { domain: normalizedDomain, companyName });
          }
        }

        // Try to append a city if no brand was appended
        if (!appended && city && !companyName.toLowerCase().includes(city.toLowerCase())) {
          const formattedCity = capitalizeName(city).name;
          companyName = `${companyName} ${formattedCity}`;
          flags.add('CityAppended');
          confidenceScore = 125;
          appended = true;
          log('info', 'Appended city to single proper noun', { domain: normalizedDomain, companyName });
        }

        // Fallback to generic term if no brand or city
        if (!appended && !isOverride) {
          const genericTerms = ['auto', 'motors', 'dealers', 'group', 'cars', 'drive', 'center', 'world'];
          const generic = rawTokens.find(t => genericTerms.includes(t.toLowerCase()));
          if (generic && !companyName.toLowerCase().includes(generic.toLowerCase())) {
            const formattedGeneric = capitalizeName(generic).name;
            companyName = `${companyName} ${formattedGeneric}`;
            flags.add('GenericAppended');
            confidenceScore = 95;
            log('info', 'Appended generic term to single proper noun', { domain: normalizedDomain, companyName });
          } else {
            // Flag generic domains for ReviewQueue if no meaningful append
            log('warn', 'Generic domain with no clear append', { domain: normalizedDomain, companyName });
            companyName = '';
            confidenceScore = 50;
            flags.add('GenericDomain');
            flags.add('ManualReviewRecommended');
          }
        }
      }
    }

    // City-based fallback (avoid city-only outputs)
    if (city && !companyName) {
      const formattedCity = capitalizeName(city).name;
      if (domainBrand) {
        const formattedBrand = BRAND_MAPPING.get(domainBrand.toLowerCase()) || capitalizeName(domainBrand).name;
        companyName = `${formattedCity} ${formattedBrand}`;
        if (pattern.test(companyName)) {
          log('info', 'City and domain brand applied', { domain: normalizedDomain, companyName });
          flags.add('CityBrandPattern');
          confidenceScore = 125;
        } else {
          companyName = '';
          flags.add('PatternValidationFailed');
          flags.add('ManualReviewRecommended');
        }
      } else {
        // Avoid city-only output by flagging for ReviewQueue
        log('warn', 'City-only output detected in fallback', { domain: normalizedDomain, companyName: formattedCity });
        companyName = '';
        confidenceScore = 50;
        flags.add('CityOnlyFallback');
        flags.add('ManualReviewRecommended');
      }
    }

    // Generic token fallback with strict brand-only prevention
    if (!companyName) {
      const spamTriggers = ['cars', 'sales', 'autogroup', 'group'];
      let cleanedTokens = extractedTokens
        .filter(t => !spamTriggers.includes(t))
        .filter((t, i, arr) => i === 0 || t !== arr[i - 1]);

      if (cleanedTokens.length === 0) {
        log('warn', 'No valid tokens after cleaning', { domain: normalizedDomain });
        companyName = '';
        confidenceScore = 50;
        flags.add('NoValidTokens');
        flags.add('ManualReviewRecommended');
      } else {
        let primaryToken = cleanedTokens.find(t => properNounsSet.has(capitalizeName(t).name.toLowerCase())) || cleanedTokens[0];
        let brand = domainBrand || cleanedTokens.find(t => carBrandsSet.has(t));

        const primaryTokenResult = capitalizeName(primaryToken);
        companyName = primaryTokenResult.name;

        if (brand) {
          brand = BRAND_MAPPING.get(brand.toLowerCase()) || capitalizeName(brand).name;
          if (!companyName.toLowerCase().includes(brand.toLowerCase())) {
            companyName = `${companyName} ${brand}`;
            flags.add('BrandAppended');
            confidenceScore = 125;
          }
        } else {
          // Flag for ReviewQueue if no brand can be appended (generic domain)
          log('warn', 'Generic domain with no brand to append', { domain: normalizedDomain, companyName });
          companyName = '';
          confidenceScore = 50;
          flags.add('GenericDomain');
          flags.add('ManualReviewRecommended');
        }

        const nameTokens = companyName.split(' ').filter((t, i, arr) => i === 0 || t.toLowerCase() !== arr[i - 1].toLowerCase());
        companyName = nameTokens.slice(0, 3).join(' ').replace(/\b(auto auto|auto group)\b/gi, 'Auto').replace(/\s+/g, ' ').trim();
        flags.add('GenericPattern');
      }
    }

    // Final validation: Prevent brand-only outputs
    if (companyName && carBrandsSet.has(companyName.toLowerCase()) && !OVERRIDES[overrideKey]) {
      log('warn', 'Brand-only output detected in final validation', { domain: normalizedDomain, companyName });
      companyName = '';
      confidenceScore = 50;
      flags.add('BrandOnlyFallback');
      flags.add('ManualReviewRecommended');
    }

    const finalResult = {
      companyName,
      confidenceScore,
      flags: Array.from(flags),
      tokens
    };

    domainCache.set(normalizedDomain, finalResult);
    log('info', 'Result cached', { domain: normalizedDomain, companyName, confidenceScore, flags: Array.from(flags) });

    return finalResult;
  } catch (err) {
    log('error', 'fallbackName failed', {
      domain: normalizedDomain || 'unknown',
      error: err.message,
      stack: err.stack
    });
    flags.add('FallbackNameError');
    flags.add('ManualReviewRecommended');
    return { companyName, confidenceScore: 0, flags: Array.from(flags), tokens };
  }
}

// Add fetchMetaData
async function fetchMetaData(domain, meta = {}) {
  try {
    if (!domain || typeof domain !== 'string') {
      log('error', 'Invalid domain in fetchMetaData', { domain });
      return { title: meta.title || '' };
    }

    const clean = domain.trim().toLowerCase();

    const metadata = {
      'donjacobs.com': { title: 'Chevrolet Dealer' },
      'crossroadscars.com': { title: 'Toyota Dealer' },
      'chicagocars.com': { title: 'Toyota Dealer in Chicago' },
      'davisautosales.com': { title: 'Davis Auto' },
      'northwestcars.com': { title: 'Northwest Toyota' },
      'fordtustin.com': { title: 'Ford Dealer in Tustin' },
      'hondakingsport.com': { title: 'Honda Dealer in Kingsport' },
      'toyotaofchicago.com': { title: 'Toyota Dealer in Chicago' },
      'nplincoln.com': { title: 'Lincoln Dealer' },
      'chevyofcolumbuschevrolet.com': { title: 'Chevrolet Dealer in Columbus' },
      'mazdanashville.com': { title: 'Mazda Dealer in Nashville' },
      'kiachattanooga.com': { title: 'Kia Dealer in Chattanooga' },
      'subaruofgwinnett.com': { title: 'Subaru Dealer in Gwinnett' },
      'ricksmithchevrolet.com': { title: 'Chevrolet Dealer' },
      'mikeerdman.com': { title: 'Toyota Dealer' },
      'tasca.com': { title: 'Ford Dealer' },
      'crystalautogroup.com': { title: 'Crystal Auto' },
      'lacitycars.com': { title: 'LA City Auto' },
      'barlowautogroup.com': { title: 'Barlow Auto' },
      'drivevictory.com': { title: 'Victory Auto' },
      'jaxcjd.com': { title: 'Dodge Dealer in Jacksonville' },
      'veramotors.com': { title: 'Vera Motors' },
      'stonemountainvw.com': { title: 'Stone Mountain VW' },
      'sandskia.com': { title: 'Sands Kia' },
      'fortcollinskia.com': { title: 'Kia Dealer in Fort Collins' },
      'schworervolkswagen.com': { title: 'Schworer VW' },
      'philsmithkia.com': { title: 'Phil Smith Kia' },
      'gregleblanc.com': { title: 'Greg LeBlanc' },
      'jimfalkmotorsofmaui.com': { title: 'Jim Falk Motors' },
      'robbynixonbuickgmc.com': { title: 'Robby Nixon GMC' },
      'tomlinsonmotorco.com': { title: 'Tomlinson Motor Co.' },
      'jaywolfe.com': { title: 'Jay Wolfe Automotive' },
      'sunsetmitsubishi.com': { title: 'Sunset Mitsubishi' },
      'joycekoons.com': { title: 'Joyce Koons Honda' },
      'brooklynvolkswagen.com': { title: 'Brooklyn Volkswagen' }
    };

    // TODO: Add real metadata fetching (e.g., HTTP request to domain) for production
    return metadata[clean] || { title: meta.title || '' };
  } catch (e) {
    log('error', 'fetchMetaData failed', { domain, error: e.message, stack: e.stack });
    return { title: meta.title || '' }; // Use the meta parameter passed to the function
  }
}

// Add getMetaTitleBrand
function getMetaTitleBrand(meta) {
  try {
    if (!meta || typeof meta.title !== 'string' || !meta.title.trim()) {
      log('warn', 'Invalid meta title in getMetaTitleBrand', { meta });
      return null;
    }

    const title = meta.title.toLowerCase().replace(/[^a-z0-9\s]/gi, '');
    const words = title.split(/\s+/).filter(Boolean);

    // Check for multiple brands
    const brandTokens = words.filter(w => CAR_BRANDS.has(w));
    if (brandTokens.length > 1) {
      log('warn', 'Multiple brands detected in meta title', { title, brandTokens });
      return null;
    }

    let companyName = null;
    let confidenceScore = 125;
    let flags = new Set(['MetaTitleExtracted']);

    // Priority 1: Match proper noun or city
    for (const word of words) {
      const wordNoSpaces = word.replace(/\s+/g, '');
      if (properNounsSet.has(wordNoSpaces) && !CAR_BRANDS.has(word)) {
        companyName = capitalizeName(word).name; // Remove properNounsMap.get()
        flags.add('ProperNounMatch');
        break;
      }
      if (KNOWN_CITIES_SET.has(wordNoSpaces) && !CAR_BRANDS.has(word)) {
        companyName = capitalizeName(wordNoSpaces).name;
        flags.add('CityMatch');
        break;
      }
    }

    // Priority 2: Match single brand (if no name found)
    if (!companyName) {
      for (const word of words) {
        if (CAR_BRANDS.has(word)) {
          companyName = BRAND_MAPPING.get(word) || capitalizeName(word).name;
          flags.add('BrandMatch');
          break;
        }
      }
    }

    // Append generic term if present
    if (companyName) {
      const genericTerms = ['auto', 'automotive', 'motors', 'dealer', 'group', 'cars', 'drive', 'center', 'world'];
      const genericCandidate = words.find(t => genericTerms.includes(t) && !CAR_BRANDS.has(t));
      if (genericCandidate) {
        const formattedGeneric = capitalizeName(genericCandidate).name;
        const combinedName = `${companyName} ${formattedGeneric}`;
        const words = combinedName.split(' ').map(w => w.toLowerCase());
        if (new Set(words).size !== words.length) {
          flags.add('DuplicatesRemoved');
          confidenceScore = 95;
        } else if (combinedName.split(' ').length > 3) {
          flags.add('TokenLimitExceeded');
          confidenceScore = 95;
        } else {
          companyName = combinedName;
          flags.add('GenericAppended');
        }
      }
    }

    if (companyName) {
      log('debug', 'getMetaTitleBrand succeeded', { companyName, confidenceScore, flags });
      return { companyName, confidenceScore, flags: Array.from(flags) };
    }

    return null;
  } catch (e) {
    log('error', 'getMetaTitleBrand failed', { meta, error: e.message, stack: e.stack });
    return null;
  }
}

/**
 * Clears OpenAI cache
 */
function clearOpenAICache() {
  if (openAICache instanceof Map) {
    openAICache.clear();
    log("info", "OpenAI cache cleared", {});
  } else {
    log("warn", "openAICache is not a Map, cannot clear cache", {});
  }
}

/**
 * Handler for fallback API endpoint
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} - JSON response
 */
const RATE_LIMIT = {
  maxRequests: 100,
  windowMs: 60 * 1000 // 1 minute
};
let requestCount = 0;
let windowStart = Date.now();

async function handler(req, res) {
  // Reset rate limit counter if window has passed
  if (Date.now() - windowStart > RATE_LIMIT.windowMs) {
    requestCount = 0;
    windowStart = Date.now();
  }

  // Check rate limit
  if (requestCount >= RATE_LIMIT.maxRequests) {
    log("warn", "Rate limit exceeded", { requestCount });
    return res.status(429).json({
      error: "Too Many Requests",
      message: "Rate limit exceeded, please try again later",
      retryAfter: Math.ceil((RATE_LIMIT.windowMs - (Date.now() - windowStart)) / 1000)
    });
  }
  requestCount++;

  // Validate authentication token
  const authToken = process.env.VERCEL_AUTH_TOKEN;
  const authHeader = req.headers.authorization;

  if (!authHeader || authHeader !== `Bearer ${authToken}`) {
    log("warn", "Unauthorized request", { authHeader });
    return res.status(401).json({ error: "Unauthorized", message: "Invalid or missing authorization token" });
  }

  let body = null;
  try {
    log("info", "Received body", { bodyLength: req.body ? JSON.stringify(req.body).length : 0 });
    body = req.body;

    const leads = body.leads || body.leadList || body.domains || body;
    if (!Array.isArray(leads)) {
      log("warn", "Leads is not an array", { leads });
      return res.status(400).json({ error: "Leads must be an array" });
    }

    const validatedLeads = leads.map((lead, i) => ({
      domain: (lead.domain || "").trim().toLowerCase(),
      rowNum: lead.rowNum || i + 1,
      metaTitle: lead.metaTitle || undefined
    })).filter(lead => lead.domain);

    const successful = await Promise.all(validatedLeads.map(async (lead) => {
      const result = await fallbackName(lead.domain, lead.domain, { title: lead.metaTitle });
      return {
        domain: lead.domain,
        companyName: result.companyName,
        confidenceScore: result.confidenceScore,
        flags: result.flags,
        tokens: result.tokens,
        rowNum: lead.rowNum
      };
    }));

    const manualReviewQueue = successful.filter(r => r.flags.includes("ManualReviewRecommended"));
    const fallbackTriggers = successful.filter(r => r.flags.includes("OpenAIFallback") || r.flags.includes("LocalFallbackUsed"));
    const totalTokens = successful.reduce((sum, r) => sum + (r.tokens || 0), 0);

    return res.status(200).json({
      successful,
      manualReviewQueue,
      fallbackTriggers,
      totalTokens,
      partial: false,
      fromFallback: fallbackTriggers.length > 0
    });
  } catch (error) {
    log("error", "Handler error", {
      error: error.message,
      stack: error.stack,
      body: body ? JSON.stringify(body).slice(0, 1000) : "null"
    });
    return res.status(500).json({
      error: "Internal server error",
      confidenceScore: 80,
      flags: Array.from(new Set(["FallbackHandlerFailed", "ManualReviewRecommended"])),
      tokens: 0
    });
  }
}

export { fallbackName, clearOpenAICache, BRAND_ONLY_DOMAINS, handler, validateFallbackName, cleanCompanyName, validateOverrideFormat, handleOverride, fetchMetaData, getMetaTitleBrand };
