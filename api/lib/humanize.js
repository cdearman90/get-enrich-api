// lib/humanize.js
export const COMMON_WORDS = [
  "llc", "inc", "corporation", "corp",
  "plaza", "superstore", "gallery", "center", "group", "dealership", "sales",
  "auto", "motors", "motor", "automotive", "shop",
  "classic", "prime", "elite", "premier", "luxury", "select", "pro", "top", "best", "first", "great", "new", "used",
  "com"
];

export const CAR_BRANDS = [
  "ford", "toyota", "bmw", "chevrolet", "gmc", "lexus", "mercedes", "benz",
  "honda", "nissan", "hyundai", "kia", "volkswagen", "audi", "porsche", "subaru",
  "mb", "dodge", "chrysler", "jeep", "buick", "cadillac", "lincoln", "infiniti"
];

export const NON_DEALERSHIP_KEYWORDS = [
    "powerlawn", "engines", "floors", "wheel", "customs", "blueprint", "ability", "design", "offroad",
    "boats", "boating", "outdoors", "store", "mart", "glass"
];

export function addPossessive(name) {
    if (!name || typeof name !== "string") return "";
    return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

export const KNOWN_PROPER_NOUNS = [
  "athens", "crossroads", "dallas", "houston", "paris", "memphis", "nashville",
  "pat", "milliken", "town", "country", "san", "leandro", "gus", "machado", "don", "hinds",
  "union", "park", "jack", "powell", "preston", "bill", "dube", "golf", "mill",
  "de", "montrond", "carl", "black", "fletcher", "richmond", "rod", "baker", "karl", "stuart",
  "gregg", "young", "miami", "lakes", "automall", "potamkin", "mccarthy", "dyer", "ted", "britt",
  "anderson", "mclarty", "daniel", "raceway", "auto", "by", "fox", "gerald", "austin", "infiniti",
  "hattan", "galean", "chastang", "martin", "taylor", "kennedy", "garber", "sunnyside", "art", "moehn",
  "garlyn", "shelton", "devine", "butler", "penske", "shop", "lynch", "ricart", "valley", "czagnet",
  "eh", "chevy", "scott", "clark", "signature", "ny", "smithtown", "masano", "huntington", "beach",
  "bighorn", "cedar", "exp", "realty", "drive", "superior", "jay", "wolfe", "pugmire", "lynn", "layton",
  "premier", "collection", "jake", "sweeney", "west", "springfield", "starling", "dalton",
  "york", "shottenkirk", "landers", "corp", "john", "elway", "dealership", "vander", "hyde", "atlanta",
  "street", "slidell", "chapman", "choice", "williams", "charlotte", "swant", "graber", "tom", "hesser",
  "greenwich", "atamian", "schmelz", "countryside", "dick", "lovett", "colonial", "sunrise", "phil", "smith",
  "executive", "ag", "obrien", "mercedes", "benz", "usa", "elyria", "kingsport", "eckenrod", "galpin",
  "salt", "lake", "south", "smart", "brooklyn", "all", "american", "sewell", "londoff", "kingston",
  "tituswill", "malloy", "henderson", "crain", "dodge", "red", "mac", "rt", "128", "waconia", "kc", "metro",
  "coluia", "deacons", "cdjr", "freeport", "rossi", "sarant", "abbots", "vw", "alderman", "svt", "elway",
  "dealers", "chevyteam", "caldwel", "five", "star", "online", "wick", "mail", "north", "lincoln", "beck",
  "masten", "sansone", "findlay", "barnett", "saf", "brown", "georgetown", "alhara", "lakeway", "crevier",
  "bristol", "pinehurst", "temecula", "valley", "buick", "mariano", "rivera", "nfw", "stockton", "auburn",
  "daystar", "concord", "ingersoll", "caruso", "look", "larson", "bill", "kadlec", "maita", "northcharleston",
  "laorghini", "newport", "germain", "motor", "company", "grainger", "midway", "perillo", "gastonia",
  "trent", "stoops", "statewide", "eastside", "world", "newton", "infiniti", "beachwood", "murfreesboro",
  "hilltop", "pape", "palm", "coast", "roseville", "smothers", "european", "medlin", "livermore", "cerritos",
  "square", "cadillac", "norwood", "classic", "carrollton", "morristown", "robert", "thorne", "laurel", "chrysler",
  "north", "park", "north", "country", "golf", "mill", "metro", "madison", "Pat Milliken", "Duval", "Karl Stuart", "Gregg Young", "Fletcher", "Bentley", "Avis",
  "Mercedes-Benz USA", "McCarthy", "McLarty", "DeMontrond", "Town And Country", "San Leandro",
  "Gus Machado", "Rod Baker", "Don Hattan", "Galean", "Ted Britt", "Auto By Fox", "Shop Lynch",
  "Cz Agnet", "Eh Chevy", "Scott Clark", "Signature Auto NY", "Huntington Beach", "Exp Realty",
  "Jay Wolfe", "Premier Collection", "Art Moehn", "Tom Hesser", "Executive AG", "Smart Drive",
  "All American", "Wick Mail", "Robert Thorne", "Tommy Nix", "Kennedy", "Lou Sobh", "H Motors",
  "Performance Honda Nashville", "Luxury Auto Scottsdale", "Bear Mountain", "North Shore", "Berlin City"];

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

export const normalizeText = (name) => {
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
  // ✅ Handle single string blobs like "billdube" passed directly
  if (typeof words === "string") {
    words = words.match(/[a-z]+/gi) || [];
  }

  return words
    .map((word, i) => {
      if (["of", "the", "to", "and"].includes(word.toLowerCase()) && i !== 0) return word.toLowerCase();

      // ✅ Preserve known acronyms (e.g. JM, VW)
      if (/^[A-Z]{2,5}$/.test(word)) return word;

      let fixedWord = word.replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/(GarlynShelton|McCarthy|McLarty|DeMontrond|TownAndCountry|SanLeandro|GusMachado|RodBaker|DonHattan|Galean|TedBritt|ShopLynch|ScottClark|HuntingtonBeach|JayWolfe|PremierCollection|ArtMoehn|TomHesser|ExecutiveAG|SmartDrive|AllAmerican|WickMail|RobertThorne|TommyNix|Kennedy|LouSobh|HMotors|LuxuryAutoScottsdale|BearMountain|Charlie|University)/gi, match => {
          const known = KNOWN_PROPER_NOUNS.find(n => n.toLowerCase() === match.toLowerCase());
          return known ? known : match
            .split(/(?=[A-Z][a-z])|(?<=[a-z])(?=[A-Z])/)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ");
        })
        .replace(/Cjd/g, "Chrysler Jeep Dodge")
        .replace(/Uv(w)?/g, "University");

      return fixedWord.charAt(0).toUpperCase() + fixedWord.slice(1).toLowerCase();
    })
    .join(" ")
    .replace(/Mccarthy/g, "McCarthy")
    .replace(/Mclarty/g, "McLarty")
    .replace(/De Montrond/g, "DeMontrond")
    .replace(/Townandcountry/g, "Town And Country")
    .replace(/Sanleandro/g, "San Leandro")
    .replace(/Gusmachado/g, "Gus Machado")
    .replace(/Rodbaker/g, "Rod Baker")
    .replace(/Donhattan/g, "Don Hattan")
    .replace(/Galeanasc/g, "Galean")
    .replace(/Tedbritt/g, "Ted Britt")
    .replace(/Autobyfox/g, "Auto By Fox")
    .replace(/Shoplynch/g, "Shop Lynch")
    .replace(/Czagnet/g, "Cz Agnet")
    .replace(/Ehchevy/g, "Eh Chevy")
    .replace(/Scottclark/g, "Scott Clark")
    .replace(/Signatureautony/g, "Signature Auto NY")
    .replace(/Huntingtonbeach/g, "Huntington Beach")
    .replace(/Exprealty/g, "Exp Realty")
    .replace(/Jaywolfe/g, "Jay Wolfe")
    .replace(/Thepremiercollection/g, "Premier Collection")
    .replace(/Artmoehn/g, "Art Moehn")
    .replace(/Tomhesser/g, "Tom Hesser")
    .replace(/Executiveag/g, "Executive AG")
    .replace(/Smartdrive/g, "Smart Drive")
    .replace(/Allamericannet/g, "All American")
    .replace(/Wickmail/g, "Wick Mail")
    .replace(/Roberthorne/g, "Robert Thorne")
    .replace(/Tommynixautogroup/g, "Tommy Nix")
    .replace(/Kennedyauto/g, "Kennedy")
    .replace(/Lousobh/g, "Lou Sobh")
    .replace(/Hmtrs/g, "H Motors")
    .replace(/Ph Nash/g, "Performance Honda Nashville")
    .replace(/Lac Scottsdale/g, "Luxury Auto Scottsdale")
    .replace(/Bear Mtn Adi/g, "Bear Mountain")
    .replace(/Charlies Mm/g, "Charlie");
};

const containsCarBrand = (name) => {/* unchanged */};
const removeCarBrands = (words) =>
  words.filter(word => !CAR_BRANDS.includes(word.toLowerCase()));
const removeForbiddenWords = (words) => {/* unchanged */};
const endsWithS = (name) => {/* unchanged */};
const isPossessiveFriendly = (name) => {/* unchanged */};
const isPossibleAbbreviation = (word) => {/* unchanged */};

const addPossessive = (name) => {
  if (!name || typeof name !== "string") return "";
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
};

export const humanizeName = (inputName, domain, addPossessiveFlag = false) => {
  try {
    let words = normalizeText(inputName || domain);
    console.log(`Before brand removal for ${domain}: ${words.join(" ")}`);
    const originalWords = [...words];
    let flags = [];

    const lowerInput = (inputName || domain).toLowerCase();
    if (NON_DEALERSHIP_KEYWORDS.some(keyword => lowerInput.includes(keyword))) {
      console.log(`Non-dealership domain detected: ${domain}`);
      return { name: "", confidenceScore: 0, flags: ["NonDealership"] };
    }

    // Handle "Shop + Brand" edge case
    if (words.length >= 2 && words[0].toLowerCase() === "shop" && CAR_BRANDS.includes(words[1].toLowerCase())) {
      const carBrand = words[1].charAt(0).toUpperCase() + words[1].slice(1).toLowerCase();
      return {
        name: `Shop ${carBrand}`,
        confidenceScore: 100,
        flags: ["ShopCarBrandException"],
        reason: "ShopCarBrandPattern"
      };
    }

    // Enforce single brand + city logic
    const matchedBrands = words.filter(w => CAR_BRANDS.includes(w.toLowerCase()));
    const carBrandFound = matchedBrands.length > 0 ? matchedBrands[0].toLowerCase() : null;
    const carBrandCount = matchedBrands.length;
    const hasCarBrand = !!carBrandFound;
    const hasCity = words.some(w => KNOWN_CITIES_SET.has(w.toLowerCase()));

    if (hasCarBrand && hasCity && carBrandCount >= 1) {
      const capitalizedBrand = carBrandFound.charAt(0).toUpperCase() + carBrandFound.slice(1).toLowerCase();
      const city = words.find(word => KNOWN_CITIES_SET.has(word.toLowerCase()));
      const capitalizedCity = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
      let finalName = `${capitalizedBrand} ${capitalizedCity}`;
      finalName = finalName.replace("Mercedes-Benz", "MB");
      return {
        name: finalName,
        confidenceScore: 100,
        flags: ["CarBrandCityException"],
        reason: "CarBrandCityPattern"
      };
    }

    // Handle brand + region (e.g., Toyota North)
    const regionPrefixes = ["north", "south", "east", "west", "central"];
    if (matchedBrands.length === 1) {
      const brandIndex = words.findIndex(w => w.toLowerCase() === matchedBrands[0].toLowerCase());
      const nextWord = words[brandIndex + 1]?.toLowerCase();
      if (regionPrefixes.includes(nextWord)) {
        const capitalizedBrand = matchedBrands[0].charAt(0).toUpperCase() + matchedBrands[0].slice(1).toLowerCase();
        const region = words.slice(brandIndex + 1).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        const namePart = words.slice(0, brandIndex).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        const finalName = `${namePart ? namePart + " " : ""}${capitalizedBrand} ${region}`.replace("Mercedes-Benz", "MB");
        return {
          name: finalName,
          confidenceScore: 100,
          flags: ["CarBrandRegionException"],
          reason: "CarBrandRegionPattern"
        };
      }
    }

    // Handle single fallback blobs like "billdube" → "Bill Dube"
    if (originalWords.length === 1 && originalWords[0].length <= 12 && !words.includes(" ")) {
      const blobSplit = originalWords[0].match(/[a-z]+/gi) || [];
      if (blobSplit.length >= 2) {
        const fallbackName = capitalizeName(blobSplit);
        return {
          name: fallbackName,
          confidenceScore: 80,
          flags: ["FallbackBlobSplit"]
        };
      }
    }

    // Apply normal cleanup
    if (words.length === 1 && !KNOWN_PROPER_NOUNS.includes(words[0].toLowerCase())) {
      words = words[0].match(/[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|\d|\W|$)/g) || words;
      console.log(`Early compound split for ${domain}: ${words[0]} → ${words}`);
    }

    words = removeForbiddenWords(words);
    const beforeBrandRemoval = [...words];
    words = words.filter(w => !CAR_BRANDS.includes(w.toLowerCase()));
    if (words.length === 0 && beforeBrandRemoval.length > 0) {
      flags.push("EmptyAfterBrandRemoval");
    }

    console.log(`After brand removal for ${domain}: ${words.join(" ")}`);

    // Remove suffixes like "Auto", "Group", etc.
    const forbiddenSuffixes = ["plaza", "superstore", "gallery", "mall", "center", "sales", "group", "dealership", "auto", "trucks"];
    const lastWord = words[words.length - 1]?.toLowerCase();
    if (forbiddenSuffixes.includes(lastWord) && !KNOWN_PROPER_NOUNS.includes(domain)) {
      words = words.slice(0, -1);
      console.log(`Removed forbidden suffix: ${lastWord}, new words: ${words}`);
    }

    words = words.filter(word => {
      const lower = word.toLowerCase();
      return !COMMON_WORDS.includes(lower) || KNOWN_PROPER_NOUNS.includes(lower);
    });

    const isCityOnly = words.length === 1 && KNOWN_CITIES_SET.has(words[0].toLowerCase());
    if (isCityOnly) {
      return { name: words.join(" "), confidenceScore: 50, flags: ["CityNameOnly", ...flags] };
    }

    const isTooGeneric = words.length === 1 && words[0].length <= 4 && !KNOWN_PROPER_NOUNS.includes(words[0].toLowerCase());
    if (isTooGeneric) {
      return { name: words.join(" "), confidenceScore: 50, flags: ["TooGeneric", ...flags] };
    }

    let name = capitalizeName(words);
    if (!name) {
      return { name: originalWords.join(" "), confidenceScore: 50, flags: ["EmptyFallbackUsed", ...flags] };
    }

    if (!isPossessiveFriendly(name)) {
      flags.push("NotPossessiveFriendly");
    }

    const confidenceScore = flags.includes("NotPossessiveFriendly") ? 80 : 100;

    const finalName = addPossessiveFlag ? addPossessive(name) : name;
    return {
      name: finalName,
      confidenceScore,
      flags
    };
  } catch (err) {
    console.error(`Error in humanizeName for domain ${domain}: ${err.message}`);
    return { name: "", confidenceScore: 0, flags: ["ProcessingError"] };
  }
};
