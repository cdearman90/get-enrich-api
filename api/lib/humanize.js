// lib/humanize.js
export const COMMON_WORDS = [
  "of", "to", "the", "and", "auto", "group", "dealership", "motors", "cars", "superstore", "plaza",
  "center", "mall", "sales",
  "llc", "inc", "corporation", "corp",
  "shop", "classic", "prime", "elite", "premier", "luxury", "select", "pro", "top", "best", "first",
  "great", "new", "used", "com"
];

export const CAR_BRANDS = [
  "acura", "alfa romeo", "amc", "aston martin", "audi", "bentley", "bmw", "bugatti", "buick",
  "cadillac", "carmax", "cdj", "cdjr", "chevrolet", "chrysler", "cjd", "daewoo", "dodge", "eagle",
  "ferrari", "fiat", "ford", "genesis", "gmc", "honda", "hummer", "hyundai", "infiniti", "isuzu",
  "jaguar", "jeep", "jlr", "kia", "lamborghini", "land rover", "lexus", "lincoln", "lucid", "maserati",
  "mazda", "mb", "mercedes", "mercedes-benz", "merk", "mini", "mitsubishi", "nissan", "oldsmobile",
  "plymouth", "polestar", "pontiac", "porsche", "ram", "rivian", "rolls-royce", "saab", "saturn",
  "scion", "smart", "subaru", "suzuki", "tesla", "toyota", "volkswagen", "volvo", "vw"
];

export const NON_DEALERSHIP_KEYWORDS = [
  "powerlawn", "engines", "floors", "wheel", "customs", "blueprint", "ability", "design", "offroad",
  "boats", "boating", "outdoors", "store", "mart", "glass"
];

export const KNOWN_PROPER_NOUNS = [
  "128", "Abbots", "All American", "Anderson", "Art Moehn", "Atlanta", "Auto By Fox", "Avis",
  "Bear Mountain", "Bentley", "Berlin City", "Bill", "Bill Dube", "Bob Walk Auto", "Boch Toyota South",
  "Brooklyn", "Brown", "Cadillac", "Caldwel", "Capitol City", "Carrollton", "Cerritos", "Chapman",
  "Charlie", "Chastang", "Chrysler", "Classic", "Collection", "Concord", "Cz Agnet", "DeMontrond",
  "Devine", "Dick", "Don Hattan", "Don Baker", "Drive", "Duval", "Elway", "Eh Chevy", "Eckenrod",
  "Eastside", "Exp Realty", "Executive AG", "Fletcher", "Fox", "Freeport", "Gastonia", "Galean",
  "Garlyn", "Germain", "Georgetown", "Gregg Young", "Graber", "Grainger", "Greenwich", "Gus Machado",
  "H Motors", "Hilltop", "Huntington Beach", "Ingersoll", "Jay Wolfe", "JM", "Jack Powell", "Jake",
  "Jay Wolfe", "Kadlec", "Karl Stuart", "Kennedy", "Kingston", "Kingsport", "Laurel", "Larson", "Lou Sobh",
  "Luxury Auto Scottsdale", "Lynn Layton", "Madison", "Maita", "Malloy", "Mariano", "Martin", "Masano",
  "Masten", "McCarthy", "McLarty", "Medlin", "Mercedes-Benz USA", "Metro", "Midway", "Mill", "Morristown",
  "Motor", "Nashville", "Newport", "North", "North Shore", "Northcharleston", "NY", "Online", "Pape",
  "Paris", "Park", "Parkway", "Pat Milliken", "Performance Honda Nashville", "Perillo", "Phil", "Pinehurst",
  "Potamkin", "Premier Collection", "Preston", "Pugmire", "Raceway", "Ricart", "Richmond", "Rivera",
  "Robert Thorne", "Rod Baker", "Roseville", "San Leandro", "San Marcos", "Sarant", "Sansone", "Santee",
  "Schmelz", "Scott Clark", "Scott", "Seawell", "Sewell", "Shop Lynch", "Shottenkirk", "Signature Auto NY",
  "Smart Drive", "Smothers", "Springfield", "Square", "Star", "Starling", "Statewide", "Stoops", "Street",
  "Superior", "Swant", "Temecula", "Ted Britt", "Tom Hesser", "Tommy Nix", "Town And Country", "Trent",
  "Valley", "Vander", "West", "West Springfield", "Wick Mail", "Williams", "Wolfe", "World", "Young"
];

export const KNOWN_CITIES_SET = new Set([
 // Alabama (top 25)
  "birmingham", "montgomery", "huntsville", "mobile", "tuscaloosa", "hoover", "dothan", "auburn", "decatur", "madison",
  "florence", "gadsden", "vestavia hills", "prattville", "phenix city", "alabaster", "opelika", "northport", "enterprise", "daphne",
  "homewood", "bessemer", "athens", "pelham", "fairhope",
  // Alaska (top 25)
  "anchorage", "juneau", "fairbanks", "ketchikan", "sitka", "wasilla", "kenai", "kodiak", "bethel", "palmer",
  "homer", "soldotna", "valdez", "nome", "barrow", "kotzebue", "seward", "cordova", "dillingham", "petersburg",
  "wrangell", "north pole", "delta junction", "hoonah", "unalaska", "craig", // Added missing cities, removed "kodiak island"
  // Arizona (top 25)
  "phoenix", "tucson", "mesa", "chandler", "gilbert", "glendale", "scottsdale", "peoria", "tempe", "surprise",
  "yuma", "avondale", "goodyear", "flagstaff", "buckeye", "casa grande", "lake havasu city", "maricopa", "sierra vista", "prescott",
  "bullhead city", "apache junction", "prescott valley", "marana", "el mirage",
  // Arkansas (top 25)
  "little rock", "fort smith", "fayetteville", "springdale", "jonesboro", "north little rock", "conway", "rogers", "bentonville", "pine bluff",
  "hot springs", "benton", "sherwood", "texarkana", "russellville", "bella vista", "west memphis", "paragould", "cabot", "searcy",
  "van buren", "el dorado", "maumelle", "bryant", "siloam springs", "jacksonville", // Added missing city
  // California (top 25)
  "los angeles", "san diego", "san jose", "san francisco", "fresno", "sacramento", "long beach", "oakland", "bakersfield", "anaheim",
  "santa ana", "riverside", "stockton", "chula vista", "irvine", "fremont", "san bernardino", "modesto", "oxnard", "fontana",
  "huntington beach", "glendale", "santa clarita", "garden grove", "santa rosa", "southbay", // Added from domains
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
  "davie", "miami gardens", "sunrise", "boca raton", "deltona", "miamilakes", "palmcoast", // Added from domains
  // Georgia (top 25)
  "atlanta", "augusta", "columbus", "macon", "savannah", "athens", "sandy springs", "roswell", "johns creek", "albany",
  "warner robins", "alpharetta", "marietta", "valdosta", "smyrna", "dunwoody", "brookhaven", "peachtree corners", "mableton", "milton",
  "evans", "east point", "peachtree city", "rome", "tucker",
  // Hawaii (top 25, limited by population)
  "honolulu", "east honolulu", "pearl city", "hilo", "kailua", "waipahu", "kaneohe", "mililani", "kahului", "ewa gentry",
  "mililani mauka", "kihei", "makakilo", "wahiawa", "schofield barracks", "kapolei", "kailua-kona", "halawa", "wailuku", "kaneohe station",
  "waianae", "nanakuli", "lahaina", "waipio", "kapaa",
  // Idaho (top 25)
  "boise", "meridian", "nampa", "idaho falls", "pocatello", "caldwell", "coeur d'alene", "twin falls", "lewiston", "post falls",
  "rexburg", "moscow", "eagle", "kuna", "ammon", "chubbuck", "hayden", "jerome", "blackfoot", "garden city",
  "mountain home", "burley", "star", "sandpoint", "rathdrum",
  // Illinois (top 25)
  "chicago", "aurora", "joliet", "naperville", "rockford", "springfield", "peoria", "elgin", "waukegan", "champaign",
  "bloomington", "decatur", "evanston", "des plaines", "berwyn", "wheaton", "belleville", "elmhurst", "dekalb", "moline",
  "urbana", "crystal lake", "quincy", "rock island", "bartlett", "westchester", // Added from domains
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
  "moorhead", "mankato", "shakopee", "maplewood", "cottage grove", "invergroveheights", // Added from domains
  // Mississippi (top 25)
  "jackson", "gulfport", "southaven", "biloxi", "hattiesburg", "olive branch", "tupelo", "meridian", "greenville", "horn lake",
  "pearl", "madison", "starkville", "clinton", "brandon", "ridgeland", "columbus", "vicksburg", "pascagoula", "oxford",
  "gautier", "laurel", "hernando", "long beach", "natchez",
  // Missouri (top 25)
  "kansas city", "st. louis", "springfield", "columbia", "independence", "lee's summit", "o'fallon", "st. joseph", "st. charles", "st. peters",
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
  "mentor", "beavercreek", "strongsville", "fairfield", "dublin", "hilltop", // Added from domains
  // Oklahoma (top 25)
  "oklahoma city", "tulsa", "norman", "broken arrow", "edmond", "lawton", "moore", "midwest city", "enid", "stillwater",
  "muskogee", "bartlesville", "owasso", "shawnee", "yukon", "ardmore", "ponca city", "duncan", "del city", "bixby",
  "sapulpa", "altus", "bethany", "sand springs", "claremore",
  // Oregon (top 25)
  "portland", "eugene", "salem", "gresham", "hillsboro", "beaverton", "bend", "medford", "springfield", "corvallis",
  "albany", "tigard", "lake oswego", "keizer", "grants pass", "oregon city", "mcminnville", "redmond", "tualatin", "west linn",
  "woodburn", "forest grove", "newberg", "roseburg", "klamath falls", "wilsonville", // Added from domains
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
  "richland", "sammamish", "burien", "olympia", "lacey", "eastside", "westside", // Added from domains
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
  "thermopolis", "kemmerer", "glenrock", "lovell", "lyman",
  // Additional cities/regions from domains
  "shottenkirk", "riverview", "northwest", "southwest", "downtown" // Already added in updates
]);

// Added KNOWN_OVERRIDES to align with Google Apps Script
export const KNOWN_OVERRIDES = {
  "duvalford.com": "Duval",
  "patmillikenford.com": "Pat Milliken",
  "karlchevroletstuart.com": "Karl Stuart",
  "bentleyauto.com": "Bentley",
  "avisford.com": "Avis",
  "gychevy.com": "Gregg Young",
  "mbbhm.com": "MB Birmingham",
  "ehchevy.com": "Eh Chevy",
  "penskeautomotive.com": "Penske",
  "signatureautony.com": "Signature NY",
  "acdealergroup.com": "AC Dealer",
  "crossroadscars.com": "Crossroads",
  "onesubaru.com": "One Subaru",
  "fletcherauto.com": "Fletcher",
  "ricart.com": "Ricart",
  "shottenkirk.com": "Shottenkirk",
  "wilsonvilletoyota.com": "Wilsonville",
  "lakelandtoyota.com": "Lakeland",
  "huntingtonbeachford.com": "Huntington Beach",
  "northwestauto.com": "Northwest",
  "southwestdealersgroup.com": "Southwest",
  "mbusa.com": "Mercedes-Benz USA",
  "vwsouthclt.com": "VW South Charlotte",
  "bmwofmilwaukeenorth.com": "BMW Milwaukee North",
  "metrofordofmadison.com": "Metro Ford Madison",
  "kwic.com": "Kwic Auto",
  "asag.net": "Asag Auto",
  "chmb.com": "Chmb Auto",
  "hmtrs.com": "H Motors",
  "sbhyundai.com": "South Bay Hyundai",
  "sjinfiniti.com": "San Jose Infiniti",
  "nissanofec.com": "Nissan East Coast",
  "jetchevrolet.com": "Jet Chevrolet",
  "tflauto.com": "TFL Auto",
  "audimv.com": "Audi Mission Viejo",
  "slvdodge.com": "San Luis Valley Dodge",
  "dmautoleasing.com": "DM Auto",
  "startoyota.net": "Star Toyota",
  "chevyland.com": "Chevyland",
  "dvbmw.com": "DV BMW",
  "lousobhkia.com": "Lou Sobh Kia",
  "phofnash.com": "Performance Honda Nashville",
  "lacscottsdale.com": "Luxury Auto Scottsdale",
  "bearmtnadi.com": "Bear Mountain",
  "sharpecars.com": "Sharpe",
  "jacksoncars.com": "Jackson",
  "armencars.com": "Armen",
  "germaincars.com": "Germain",
  "gilescars.com": "Giles",
  "elwaydealers.net": "Elway",
  "firstautogroup.com": "First Auto",
  "streetsideclassics.com": "Streetside",
  "group1auto.com": "Group 1",
  "fivestaronline.net": "Five Star",
  "thechevyteam.com": "Chevy Team",
  "nadalcapital.com": "Nadal",
  "castlerockautoplex.com": "Castle Rock",
  "kcmetroford.com": "Ford Kansas City",
  "hgreglux.com": "HGreg Lux",
  "cincyjlr.com": "JLR Cincinnati",
  "tsands.com": "Sands",
  "lacitycars.com": "LA City",
  "route1usa.com": "Route 1",
  "drivedag.com": "DAG",
  "jimfalkmotorsofmaui.com": "Jim Falk",
  "hileyhuntsville.com": "Hiley",
  "drivejoyce.com": "Joyce",
  "thinkmidway.com": "Midway",
  "goldenwestoil.com": "Golden West",
  "saveatsterling.com": "Sterling",
  "charliesmm.com": "Charlie",
  "bondysford.com": "Bondy",
  "alsopchevrolet.com": "Alsop",
  "sandschevrolet.com": "Sands",
  "serpentinichevy.com": "Serpentini",
  "racewaykia.com": "Raceway",
  "capital-honda.com": "Capital",
  "metro-toyota.com": "Metro",
  "autobyfox.com": "Fox",
  "4porsche.com": "Porsche 4",
  "gomontrose.com": "Montrose",
  "chem-strip.com": "",
  "mclarennb.com": "McLaren New Braunfels",
  "npsubaru.com": "North Park Subaru",
  "toyotacv.com": "Toyota Chula Vista",
  "bentleynaples.com": "Bentley Naples",
  "vtaig.com": "VT Auto Group",
  "givemethevin.com": "",
  "mbso.com": "MB South Orlando",
  "nplincoln.com": "North Park Lincoln",
  "acura4me.com": "Acura 4 Me",
  "akinsonline.com": "Akins",
  "audicentralhouston.com": "Audi Central Houston",
  "audinorthaustin.com": "Audi North Austin",
  "audinorthorlando.com": "Audi North Orlando",
  "audinorthscottsdale.com": "Audi North Scottsdale",
  "audisouthorlando.com": "Audi South Orlando",
  "autonation.com": "AutoNation",
  "autonationacura.com": "AutoNation Acura",
  "autonationchevrolet.com": "AutoNation Chevrolet",
  "autonationford.com": "AutoNation Ford",
  "autonationhonda.com": "AutoNation Honda",
  "trustandrew.com": "Andrew",
  "alpine-usa.com": "",
  "audinorthshore.com": "Audi North Shore",
  "shopsubaru.com": "Shop Subaru",
  "uvwaudi.com": "University VW Audi",
  "ballardtrucks.com": "Ballard",
  "blisspowerlawn.com": "",
  "blueprintengines.com": "",
  "bloomingtoncjd.com": "Bloomington",
  "bwalkauto.com": "Bob Walk Auto",
  "boulevard4u.com": "Boulevard",
  "braunability.com": "",
  "budschevy.com": "Bud",
  "butlercdj.com": "Butler",
  "caldwellcountry.com": "Caldwell",
  "campbellcars.com": "Campbell",
  "capitalbpg.com": "Capital BPG",
  "carterseattle.com": "Carter",
  "chapmanchoice.com": "Chapman",
  "chevyexchange.com": "Chevy Exchange",
  "citykia.com": "City Kia",
  "driveclassic.com": "Classic",
  "vannuyscdjr.com": "Van Nuys",
  "chryslerwinona.com": "Chrysler Winona",
  "myhappyhyundai.com": "Happy Hyundai",
  "myhudsonnissan.com": "Hudson Nissan",
  "idehonda.com": "Ide Honda",
  "infinitibhm.com": "Birmingham Infiniti",
  "hemetcdjr.com": "Hemet",
  "bargedesign.com": "",
  "jaxcjd.com": "Jacksonville",
  "jmlexus.com": "JM",
  "jcroffroad.com": "",
  "jeffdeals.com": "Jeff",
  "czag.net": "CZAG Auto",
  "gusmachadoford.com": "Gus Machado"
};

// Utility Functions
export function normalizeText(name) {
  if (!name || typeof name !== "string") return [];
  return name
    .replace(/\.com$/, "")
    .replace(/\.net$/, "")
    .replace(/\.org$/, "")
    .replace(/\.co\.uk$/, "")
    .replace(/['".,-]+/g, '')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(word => word);
}

function capitalizeName(words) {
  // Handle single string blobs like "billdube" passed directly
  if (typeof words === "string") {
    words = words.match(/[a-z]+/gi) || [];
  }

  return words
    .map((word, i) => {
      if (["of", "the", "to", "and"].includes(word.toLowerCase()) && i !== 0) return word.toLowerCase();

      // Preserve known acronyms (e.g., JM, VW)
      if (/^[A-Z]{2,5}$/.test(word)) return word;

      let fixedWord = word.replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/(GarlynShelton|McCarthy|McLarty|DeMontrond|TownAndCountry|SanLeandro|GusMachado|RodBaker|DonHattan|Galean|TedBritt|ShopLynch|ScottClark|HuntingtonBeach|ExpRealty|JayWolfe|PremierCollection|ArtMoehn|TomHesser|ExecutiveAG|SmartDrive|AllAmerican|WickMail|RobertThorne|TommyNix|Kennedy|LouSobh|HMotors|LuxuryAutoScottsdale|BearMountain|Charlie|University)/gi, match => {
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
}

function containsCarBrand(name) {
  if (!name || typeof name !== "string") return false;
  const words = normalizeText(name);
  return words.some(word => CAR_BRANDS.includes(word.toLowerCase()));
}

function removeCarBrands(words) {
  return words.filter(word => !CAR_BRANDS.includes(word.toLowerCase()));
}

function removeForbiddenWords(words) {
  return words.filter(word => {
    const lower = word.toLowerCase();
    return !COMMON_WORDS.includes(lower) || KNOWN_PROPER_NOUNS.includes(lower);
  });
}

function endsWithS(name) {
  if (!name || typeof name !== "string") return false;
  return name.toLowerCase().endsWith("s");
}

function isPossessiveFriendly(name) {
  if (!name || typeof name !== "string") return false;
  const possessive = addPossessive(name);
  return possessive.toLowerCase().endsWith("'s");
}

function isPossibleAbbreviation(word) {
  if (!word || typeof word !== "string") return false;
  return /^[A-Z]{2,5}$/.test(word) || word.length <= 3;
}

export function addPossessive(name) {
  if (!name || typeof name !== "string") return "";
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

function preserveStructures(name) {
  const brandOfCityPattern = new RegExp(`\\b(${CAR_BRANDS.join('|')})\\s+of\\s+(\\w+)\\b`, 'i');
  const match = name.match(brandOfCityPattern);
  if (match) {
    return `${match[1]} of ${match[2]}`;
  }
  return name;
}

function earlyCompoundSplit(name) {
  let result = name;
  // Split on known separators
  result = result.replace(/(of|auto|group|motors|dealership)/gi, ' $1 ').replace(/\s+/g, ' ');
  // Split on capitalization
  result = result.replace(/([a-z])([A-Z])/g, '$1 $2');
  // Specific proper noun splits
  result = result.replace(/(exp)([a-z]+)/gi, '$1 $2');
  result = result.replace(/(art)(moehn)/gi, '$1 $2');
  result = result.replace(/(ted)(britt)/gi, '$1 $2');
  result = result.replace(/(don)(hattan)/gi, '$1 $2');
  result = result.replace(/(jay)(wolfe)/gi, '$1 $2');
  result = result.replace(/(rod)(baker)/gi, '$1 $2');
  result = result.replace(/(tom)(hesser)/gi, '$1 $2');
  result = result.replace(/(tommy)(nix)/gi, '$1 $2');
  result = result.replace(/(jake)(sweeney)/gi, '$1 $2');
  result = result.replace(/(m)(terry)/gi, '$1 $2');
  result = result.replace(/(dayton)(andrews)/gi, '$1 $2');
  // Split on known cities
  KNOWN_CITIES_SET.forEach(city => {
    const cityLower = city.toLowerCase();
    if (result.toLowerCase().includes(cityLower)) {
      result = result.replace(new RegExp(cityLower, 'gi'), ` ${city} `);
    }
  });
  // Split on car brands
  CAR_BRANDS.forEach(brand => {
    const brandLower = brand.toLowerCase();
    if (result.toLowerCase().includes(brandLower)) {
      result = result.replace(new RegExp(brandLower, 'gi'), ` ${brand} `);
    }
  });
  return result.replace(/\s+/g, ' ').trim();
}

export async function humanizeName(inputName, domain, addPossessiveFlag = false) {
  try {
    // Apply overrides first
    const domainLower = domain.toLowerCase();
    if (KNOWN_OVERRIDES[domainLower]) {
      const name = addPossessiveFlag ? addPossessive(KNOWN_OVERRIDES[domainLower]) : KNOWN_OVERRIDES[domainLower];
      return { name, confidenceScore: 100, flags: ['OverrideApplied'], tokens: 0 };
    }

    let words = normalizeText(inputName || domain);
    console.log(`Before brand removal for ${domain}: ${words.join(" ")}`);
    let flags = [];
    let tokens = 0;

    const lowerInput = (inputName || domain).toLowerCase();
    if (NON_DEALERSHIP_KEYWORDS.some(keyword => lowerInput.includes(keyword))) {
      console.log(`Non-dealership domain detected: ${domain}`);
      return { name: "", confidenceScore: 0, flags: ["NonDealership"], tokens };
    }

    // Handle "Shop + Brand" edge case
    if (words.length >= 2 && words[0].toLowerCase() === "shop" && CAR_BRANDS.includes(words[1].toLowerCase())) {
      const carBrand = words[1].charAt(0).toUpperCase() + words[1].slice(1).toLowerCase();
      const finalName = `Shop ${carBrand}`;
      return {
        name: addPossessiveFlag ? addPossessive(finalName) : finalName,
        confidenceScore: 100,
        flags: ["ShopCarBrandException"],
        reason: "ShopCarBrandPattern",
        tokens
      };
    }

    // Handle "Happy + Brand" edge case
    if (words.length >= 2 && words[0].toLowerCase() === "happy" && CAR_BRANDS.includes(words[1].toLowerCase())) {
      const carBrand = words[1].charAt(0).toUpperCase() + words[1].slice(1).toLowerCase();
      const finalName = `Happy ${carBrand}`;
      return {
        name: addPossessiveFlag ? addPossessive(finalName) : finalName,
        confidenceScore: 100,
        flags: ["HappyCarBrandException"],
        reason: "HappyCarBrandPattern",
        tokens
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
      // Post-format brand trimming for CarBrandCityException
      let finalWords = finalName.split(" ");
      const lastWord = finalWords.slice(-1)[0]?.toLowerCase();
      if (CAR_BRANDS.includes(lastWord)) {
        finalWords = finalWords.slice(0, -1);
        finalName = finalWords.join(" ");
        flags.push("CarBrandTrimmedPostFormat");
      } else {
        finalWords = finalWords.slice(0, -1);
        finalName = finalWords.join(" ");
      }
      return {
        name: addPossessiveFlag ? addPossessive(finalName) : finalName,
        confidenceScore: 100,
        flags: ["CarBrandCityException", ...flags],
        reason: "CarBrandCityPattern",
        tokens
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
        let finalName = `${namePart ? namePart + " " : ""}${capitalizedBrand} ${region}`.replace("Mercedes-Benz", "MB");
        // Post-format brand trimming for CarBrandRegionException
        let finalWords = finalName.split(" ");
        const lastWord = finalWords.slice(-1)[0]?.toLowerCase();
        if (CAR_BRANDS.includes(lastWord)) {
          finalWords = finalWords.slice(0, -1);
          finalName = finalWords.join(" ");
          flags.push("CarBrandTrimmedPostFormat");
        } else {
          finalWords = finalWords.slice(0, -1);
          finalName = finalWords.join(" ");
        }
        return {
          name: addPossessiveFlag ? addPossessive(finalName) : finalName,
          confidenceScore: 100,
          flags: ["CarBrandRegionException", ...flags],
          reason: "CarBrandRegionPattern",
          tokens
        };
      }
    }

  // Apply normal cleanup with early compound splitting
    let cleanedName = words.join(" ");
    if (words.length === 1 && !cleanedName.includes(" ") && !KNOWN_PROPER_NOUNS.includes(cleanedName.toLowerCase())) {
      const blobSplit = earlyCompoundSplit(cleanedName);
      if (blobSplit.split(" ").length >= 2) {
        cleanedName = blobSplit;
        console.log(`Early compound split for ${domain}: ${words[0]} → ${cleanedName}`);
        flags.push("FallbackBlobSplit");
      }
    }

    words = cleanedName.split(" ");
    words = removeForbiddenWords(words);
    const beforeBrandRemoval = [...words];
    words = removeCarBrands(words);
    if (words.length === 0 && beforeBrandRemoval.length > 0) {
      flags.push("EmptyAfterBrandRemoval");
    }

    console.log(`After brand removal for ${domain}: ${words.join(" ")}`);

    // Remove forbidden suffixes like "Auto", "Group", etc.
    const forbiddenSuffixes = ["plaza", "superstore", "gallery", "mall", "center", "sales", "group", "dealership", "auto", "trucks"];
    const lastWordBeforeCleanup = words[words.length - 1]?.toLowerCase();
    if (forbiddenSuffixes.includes(lastWordBeforeCleanup) && !KNOWN_PROPER_NOUNS.includes(domain)) {
      words = words.slice(0, -1);
      console.log(`Removed forbidden suffix: ${lastWordBeforeCleanup}, new words: ${words}`);
    }

    words = removeForbiddenWords(words);

    const isCityOnly = words.length === 1 && KNOWN_CITIES_SET.has(words[0].toLowerCase());
    if (isCityOnly && !KNOWN_OVERRIDES[domainLower]) {
      return { name: words.join(" "), confidenceScore: 0, flags: ["CityNameOnly", ...flags], tokens };
    }

    const isTooGeneric = words.length === 1 && words[0].length <= 4 && !KNOWN_PROPER_NOUNS.includes(words[0].toLowerCase());
    if (isTooGeneric && !KNOWN_OVERRIDES[domainLower]) {
      return { name: words.join(" "), confidenceScore: 0, flags: ["TooGeneric", "FallbackTooGeneric", ...flags], tokens };
    }

    let name = capitalizeName(words);
    if (!name) {
      return { name: words.join(" "), confidenceScore: 0, flags: ["EmptyFallbackUsed", ...flags], tokens };
    }

    // Post-format brand trimming (ChatGPT suggestion)
    let finalWords = name.split(" ");
    const lastWord = finalWords.slice(-1)[0]?.toLowerCase();
    if (CAR_BRANDS.includes(lastWord)) {
      finalWords = finalWords.slice(0, -1);
      name = finalWords.join(" ");
      flags.push("CarBrandTrimmedPostFormat");
    }

    // Remove common words again after formatting
    finalWords = finalWords.filter(word => !COMMON_WORDS.includes(word.toLowerCase()) || KNOWN_PROPER_NOUNS.includes(word.toLowerCase()));
    name = finalWords.join(" ");

    if (!name) {
      return { name: "", confidenceScore: 0, flags: ["InvalidOutput", ...flags], tokens };
    }

    // Suffix confidence downgrade (ChatGPT suggestion)
    if (CAR_BRANDS.some(brand => name.toLowerCase().endsWith(brand.toLowerCase()))) {
      flags.push("CarBrandSuffixRemaining");
    }

    // Blocker for "OfCity" names (ChatGPT suggestion)
    if (name.toLowerCase().startsWith("of") && !KNOWN_OVERRIDES[domainLower]) {
      return { name, confidenceScore: 0, flags: ["BadPrefixOf", ...flags], tokens };
    }

    // Possessive-friendly check
    if (!isPossessiveFriendly(name)) {
      flags.push("NotPossessiveFriendly");
    }

    // Check for possible abbreviations
    if (finalWords.some(word => isPossibleAbbreviation(word))) {
      flags.push("PossibleAbbreviation");
    }

    // Scoring
    let confidenceScore = 100;
    if (flags.includes("NotPossessiveFriendly")) confidenceScore = 80;
    if (flags.includes("FallbackBlobSplit")) confidenceScore = Math.max(confidenceScore, 90);
    if (flags.includes("CarBrandSuffixRemaining")) confidenceScore = Math.min(confidenceScore, 50);
    if (flags.includes("TooGeneric") || flags.includes("CityNameOnly") || flags.includes("PossibleAbbreviation")) {
      confidenceScore = 0;
    }

    const finalName = addPossessiveFlag ? addPossessive(name) : name;
    return {
      name: finalName,
      confidenceScore,
      flags,
      tokens
    };
  } catch (err) {
    console.error(`Error in humanizeName for domain ${domain}: ${err.message}`);
    return { name: "", confidenceScore: 0, flags: ["ProcessingError"], tokens: 0 };
  }
}

// Unit Tests
function runUnitTests() {
  const tests = [
    { domain: 'athensford.com', expected: 'Athens' },
    { domain: 'karlchevroletstuart.com', expected: 'Karl Stuart' },
    { domain: 'gusmachadoford.com', expected: 'Gus Machado' },
    { domain: 'duvalford.com', expected: 'Duval' },
    { domain: 'fordofdalton.com', expected: 'Ford of Dalton' }
  ];

  let passed = 0;
  for (const test of tests) {
    const result = humanizeName(test.domain, test.domain, false);
    const finalName = KNOWN_OVERRIDES[test.domain] || result.name;
    if (finalName === test.expected) {
      console.log(`Test passed: ${test.domain} → ${finalName}`);
      passed++;
    } else {
      console.log(`Test failed: ${test.domain} → ${finalName} (expected ${test.expected})`);
    }
  }
  console.log(`Unit tests: ${passed}/${tests.length} passed`);
}

// Export for use in api/batch-enrich.js
export { humanizeName, CAR_BRANDS, COMMON_WORDS, normalizeText };
