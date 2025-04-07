// humanize.js - Fully patched version for ShowRevv Lead Processing Tools
// Updated to handle compound splitting, retain car brands when appropriate, and merge with existing utility functions

import { callOpenAI } from './openai.js';

// lib/humanize.js
export const COMMON_WORDS = [
  "and", "auto", "autogroup", "automall", "best", "bmw", "cars", "center", "chevrolet", "chevy", "classic",
  "com", "corp", "corporation", "dealers", "dealership", "elite", "first", "great", "group", "honda",
  "imports", "inc", "infiniti", "international", "kia", "llc", "luxury", "mall", "mazda", "motor", "motors",
  "new", "nissan", "of", "plaza", "premier", "prime", "pro", "sales", "select", "shop", "subaru",
  "superstore", "the", "to", "top", "toyota", "used"
];

export const CAR_BRANDS = [
  "acura", "alfa romeo", "amc", "aston martin", "audi", "bentley", "bmw", "bugatti", "buick",
  "cadillac", "carmax", "cdj", "cdjrf", "cdjr", "chev", "chevvy", "chevrolet", "chrysler", "cjd", "daewoo",
  "dodge", "eagle", "ferrari", "fiat", "ford", "genesis", "gmc", "honda", "hummer", "hyundai", "inf", "infiniti",
  "isuzu", "jaguar", "jeep", "jlr", "kia", "lamborghini", "land rover", "landrover", "lexus", "lincoln", "lucid",
  "maserati", "maz", "mazda", "mb", "merc", "mercedes", "mercedes-benz", "mercedesbenz", "merk", "mini",
  "mitsubishi", "nissan", "oldsmobile", "plymouth", "polestar", "pontiac", "porsche", "ram", "rivian",
  "rolls-royce", "saab", "saturn", "scion", "smart", "subaru", "subie", "suzuki", "tesla", "toyota",
  "volkswagen", "volvo", "vw"
];

export const NON_DEALERSHIP_KEYWORDS = [
  "ability", "accident", "accounting", "aftermarket", "agent", "agents", "atv", "audio", "autoparts",
  "bikes", "blueprint", "boating", "boats", "bodyshop", "broker", "brokers", "building", "carpentry",
  "cart", "carwash", "ceramic", "collision", "collector", "commercial", "consultants", "consulting",
  "construction", "custom", "customs", "damages", "debt", "design", "detail", "detailing", "developer",
  "engines", "engineering", "equipment", "estate", "financial", "floors", "freight", "furniture", "gas",
  "glass", "golfcarts", "goods", "haul", "home", "industries", "injury", "insurance", "jeweler", "jetski",
  "law", "lawyers", "lease", "leasor", "leasing", "lender", "locksmith", "logistics", "loan", "lube",
  "machinery", "mail", "mailing", "mall", "mart", "mechanic", "metal", "motorcycle", "moving", "oem",
  "offroad", "oil", "outdoors", "packaging", "parcel", "parts", "pipe", "piping", "plaza", "powerlawn",
  "powersports", "realestate", "realtor", "realty", "rent", "rental", "rentacar", "repair", "residential",
  "rv", "scrap", "seats", "semiconductor", "services", "shine", "shipping", "ski", "soap", "sound",
  "sparkplugs", "sprinter", "steel", "storage", "store", "suds", "systems", "tile", "tint", "tire",
  "tires", "tow", "towing", "tractor", "trailer", "transmission", "transportation", "trucking", "vans",
  "vintage", "vintageautos", "wash", "watersports", "welding", "wheel", "wheels", "wholesale", "window",
  "wood", "wreck", "yard"
];

export const KNOWN_PROPER_NOUNS = [
  "128", "Abbots", "Albany", "All American", "Anderson", "Art Moehn", "Atlanta", "Auto By Fox", "Avis",
  "Bear Mountain", "Bentley", "Berlin City", "Bill", "Bill Dube", "Bob Johnson", "Bob Walk Auto",
  "Boch Toyota South", "Brooklyn", "Brown", "Cadillac", "Caldwel", "Camino Real", "Capitol City", "Carl Black",
  "Carrollton", "Cerritos", "Chapman", "Charlie", "Chastang", "Chrysler", "Classic", "Collection",
  "Concord", "Cz Agnet", "Dayton Andrews", "DeMontrond", "Devine", "Dick", "Don Baker", "Don Hattan",
  "Don Hinds", "Drive", "Drive Superior", "Duval", "East Hills", "Eastside", "Eckenrod", "Elway", "Exp Realty", "Executive AG",
  "Fletcher", "Fox", "Freeport", "Galean", "Garlyn", "Garlyn Shelton", "Gastonia", "Georgetown", "Germain", "Graber",
  "Grainger", "Greenwich", "Gregg Young", "Gus Machado", "H Motors", "Hilltop", "Huntington Beach",
  "Ingersoll", "JM", "JT", "Jack Powell", "Jake", "Jake Sweeney", "Jay Wolfe", "Jimmy Britt", "Kadlec", "Karl Stuart", "Kennedy",
  "Kingston", "Kingsport", "Laurel", "Larson", "Lou Sobh", "Luxury Auto Scottsdale", "Lynn Layton",
  "MB Cherry Hill", "Madison", "Maita", "Malloy", "Mariano", "Martin", "Masano", "Masten", "McCarthy", "McLarty", "McLarty Daniel",
  "Medlin", "Mercedes-Benz USA", "Metro", "Miami Lakes", "Midway", "Mike Erdman", "Mike Shaw", "Mill", "Morristown",
  "Motor", "Nashville", "Newport", "North", "North County", "North Park", "North Shore", "Northcharleston",
  "Northwest", "NY", "Online", "Pape", "Paris", "Park", "Parkway", "Pat Milliken",
  "Performance Honda Nashville", "Perillo", "Phil", "Phil Smith", "Pinehurst", "Potamkin", "Premier Collection", "Preston",
  "Pugmire", "Raceway", "Ricart", "Richmond", "Rivera", "Robert Thorne", "Rod Baker", "Ron Bouchard",
  "Roseville", "San Leandro", "San Marcos", "Sansone", "Sarant", "Santee", "Schmelz", "Scott", "Scott Clark",
  "Seawell", "Sewell", "Shop Lynch", "Shottenkirk", "Signature Auto NY", "Smart Drive", "Smithtown", "Smothers",
  "South Bay", "South Charlotte", "Springfield", "Square", "Star", "Starling", "Statewide", "Stoops",
  "Street", "Superior", "Swant", "Swant Graber", "Ted Britt", "Temecula", "Tom Hesser", "Tommy Nix", "Town And Country",
  "Trent", "Tuttle Click", "Valley", "Valley Nissan", "Vander", "West", "West Springfield", "Westgate", "Wick Mail", "Williams",
  "Wolfe", "World", "Young", "tuttle", "click", "mclarty", "daniel", "jimmy", "britt", "don", "hattan", "tommy", "nix", "camino", "real", "swant", "graber"
];

export const KNOWN_CITIES_SET = new Set([
  // Alabama (top 50)
  "birmingham", "montgomery", "huntsville", "mobile", "tuscaloosa", "hoover", "dothan", "auburn", "decatur", "madison",
  "florence", "gadsden", "vestavia hills", "prattville", "phenix city", "alabaster", "opelika", "northport", "enterprise", "daphne",
  "homewood", "bessemer", "athens", "pelham", "fairhope", "anniston", "mountain brook", "troy", "trussville", "talladega",
  "selma", "oxford", "alexander city", "millbrook", "helena", "sylacauga", "scottsboro", "hueytown", "gardendale", "foley",
  "jasper", "cullman", "prichard", "irondale", "eufaula", "saraland", "fort payne", "albertville", "ozark", "wetumpka", "tuscaloosa",
  // Alaska (top 50, limited by population)
  "anchorage", "juneau", "fairbanks", "ketchikan", "sitka", "wasilla", "kenai", "kodiak", "bethel", "palmer",
  "homer", "soldotna", "valdez", "nome", "barrow", "kotzebue", "seward", "cordova", "dillingham", "petersburg",
  "wrangell", "north pole", "delta junction", "hoonah", "unalaska", "craig", "metlakatla", "skagway", "king cove", "sand point",
  "klawock", "seldovia", "togiak", "mountain village", "emmonak", "akutan", "gambell", "alakanuk", "st. mary's", "shaktoolik",
  "koyuk", " Hooper Bay", "st. paul", "chevak", "kivalina", "kwethluk", "mekoryuk", "napakiak", "savoonga", "quinhagak",
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
  "boise", "meridian", "nampa", "idaho falls", "pocatello", "caldwell", "coeur d'alene", "twin falls", "lewiston", "post falls",
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
  "gautier", "laurel", "hernando", "long beach", "natchez", "corinth", "d'iberville", "greenwood", "ocean springs", "moss point",
  "mccomb", "grenada", "brookhaven", "cleveland", "byram", "yazoo city", "west point", "picayune", "petal", "indianola",
  "new albany", "flowood", "bay st. louis", "canton", "booneville", "senatobia", "holly springs", "amory", "kosciusko", "richland",
  // Missouri (top 50)
  "kansas city", "st. louis", "springfield", "columbia", "independence", "lee's summit", "o'fallon", "st. joseph", "st. charles", "st. peters",
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
  // New Jersey (top 50)
  "newark", "jersey city", "paterson", "elizabeth", "lakewood", "edison", "woodbridge", "toms river", "hamilton", "trenton",
  "clifton", "camden", "brick", "cherry hill", "passaic", "middletown", "union city", "old bridge", "gloucester township", "north bergen",
  "vineland", "bayonne", "piscataway", "new brunswick", "perth amboy", "east orange", "west new york", "plainfield", "hackensack", "sayreville",
  "kearny", "linden", "north brunswick", "atlantic city", "howell", "ewing", "long branch", "westfield", "garfield", "egg harbor",
  "west orange", "orange", "pennsauken", "fair lawn", "bergenfield", "paramus", "livingston", "millville", "nutley", "rahway",
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
  // North Carolina (top 50)
  "charlotte", "raleigh", "greensboro", "durham", "winston-salem", "fayetteville", "cary", "wilmington", "high point", "concord",
  "asheville", "greenville", "gastonia", "jacksonville", "chapel hill", "huntersville", "apex", "burlington", "rocky mount", "kannapolis",
  "mooresville", "wake forest", "wilson", "sanford", "hickory", "matthews", "monroe", "salisbury", "new bern", "goldsboro",
  "cornelius", "garner", "thomasville", "statesville", "morrisville", "kernersville", "lumberton", "kinston", "carrboro", "asheboro",
  "clemmons", "lexington", "elizabeth city", "boone", "hope mills", "clayton", "henderson", "eden", "laurinburg", "albemarle",
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
  "shottenkirk", "riverview", "northwest", "southwest", "downtown", "uptown", "midtown", 
]);  

// Existing KNOWN_OVERRIDES from your script
export const KNOWN_OVERRIDES = {
  "acdealergroup.com": "AC Dealer",
  "acura4me.com": "Acura 4 Me",
  "akinsonline.com": "Akins",
  "albanyfordsubaru.com": "Albany",
  "athensford.com": "Athens Ford",
  "atamian.com": "Atamian",
  "audicentralhouston.com": "Audi Central Houston",
  "audimv.com": "Audi Mission Viejo",
  "audinorthaustin.com": "Audi North Austin",
  "audinorthorlando.com": "Audi North Orlando",
  "audinorthscottsdale.com": "Audi North Scottsdale",
  "audinorthshore.com": "Audi North Shore",
  "audisouthorlando.com": "Audi South Orlando",
  "austininfiniti.com": "Austin Infiniti",
  "autobyfox.com": "Fox",
  "autonation.com": "AutoNation",
  "autonationacura.com": "AutoNation Acura",
  "autonationchevrolet.com": "AutoNation Chevrolet",
  "autonationford.com": "AutoNation Ford",
  "autonationhonda.com": "AutoNation Honda",
  "avisford.com": "Avis",
  "ballardtrucks.com": "Ballard",
  "bargedesign.com": "",
  "bearmtnadi.com": "Bear Mountain",
  "bentleynaples.com": "Bentley Naples",
  "bentleyauto.com": "Bentley",
  "bighorntoyota.com": "Bighorn",
  "billdube.com": "Bill Dube",
  "bloomingtoncjd.com": "Bloomington",
  "blueprintengines.com": "",
  "blisspowerlawn.com": "",
  "bmwwestspringfield.com": "West Springfield",
  "bobjohnsonchevy.com": "Bob Johnson",
  "bondysford.com": "Bondy",
  "boulevard4u.com": "Boulevard",
  "braunability.com": "",
  "budschevy.com": "Bud",
  "bulldogkia.com": "Bulldog",
  "bulluckchevrolet.com": "Bulluck",
  "bwalkauto.com": "Bob Walk Auto",
  "caldwellcountry.com": "Caldwell",
  "caminorealchevrolet.com": "Camino Real Chevrolet",
  "campbellcars.com": "Campbell",
  "capital-honda.com": "Capital",
  "capitalbpg.com": "Capital BPG",
  "carlblack.com": "Carl Black",
  "cars.com": "",
  "carterseattle.com": "Carter",
  "castlerockautoplex.com": "Castle Rock",
  "chapmanchoice.com": "Chapman",
  "charliesmm.com": "Charlie",
  "chem-strip.com": "",
  "chevyland.com": "Chevyland",
  "chevyexchange.com": "Chevy Exchange",
  "chmb.com": "MB Cherry Hill",
  "chryslerwinona.com": "Chrysler Winona",
  "cincyjlr.com": "JLR Cincinnati",
  "citykia.com": "City Kia",
  "classicbmw.com": "Classic BMW",
  "colonial-west.com": "Colonial West",
  "crossroadscars.com": "Crossroads",
  "czag.net": "CZAG Auto",
  "dancummins.com": "Dan Cummins",
  "davischevrolet.com": "Davis Chevrolet",
  "daytonandrews.com": "Dayton Andrews",
  "demontrond.com": "DeMontrond",
  "dicklovett.co.uk": "Dick Lovett",
  "dmautoleasing.com": "DM Auto",
  "donhattan.com": "Don Hattan",
  "donhindsford.com": "Don Hinds",
  "drivedag.com": "DAG",
  "driveclassic.com": "Classic",
  "drivejoyce.com": "Joyce",
  "drivesunrise.com": "Sunrise",
  "drivesuperior.com": "Drive Superior",
  "duvalford.com": "Duval",
  "dvbmw.com": "DV BMW",
  "dyerauto.com": "Dyer",
  "ehchevy.com": "East Hills",
  "elwaydealers.net": "Elway",
  "exprealty.com": "",
  "firstautogroup.com": "First Auto",
  "fivestaronline.net": "Five Star",
  "fletcherauto.com": "Fletcher",
  "fordofdalton.com": "Ford Dalton",
  "4porsche.com": "4Porsche",
  "garberchevrolet.com": "Garber",
  "garlynshelton.com": "Garlyn Shelton",
  "germaincars.com": "Germain",
  "gilescars.com": "Giles",
  "givemethevin.com": "Give me the Vin",
  "goldenwestoil.com": "Golden West",
  "golfmillford.com": "Golf Mill",
  "gomontrose.com": "Montrose",
  "gravityautos.com": "Gravity Autos",
  "group1auto.com": "Group 1",
  "gusmachadoford.com": "Gus Machado",
  "gychevy.com": "Gregg Young",
  "hemetcdjr.com": "Hemet",
  "hgreglux.com": "HGreg Lux",
  "hileyhuntsville.com": "Hiley",
  "hillsidehonda.com": "Hillside",
  "hmtrs.com": "H Motors",
  "huntingtonbeachford.com": "Huntington Beach Ford",
  "idehonda.com": "Ide Honda",
  "infinitibhm.com": "Birmingham Infiniti",
  "jackpowell.com": "Jack Powell",
  "jacksoncars.com": "Jackson",
  "jakesweeney.com": "Jake Sweeney",
  "jaxcjd.com": "Jacksonville",
  "jcroffroad.com": "",
  "jeffdeals.com": "Jeff",
  "jetchevrolet.com": "Jet Chevrolet",
  "jimfalkmotorsofmaui.com": "Jim Falk",
  "jimmybrittchevrolet.com": "Jimmy Britt",
  "jmlexus.com": "JM",
  "jtscars.com": "JT",
  "karlchevroletstuart.com": "Karl Stuart",
  "katzkin.com": "",
  "kcmetroford.com": "Ford Kansas City",
  "kwic.com": "Kwic Auto",
  "lacitycars.com": "LA City",
  "lacscottsdale.com": "Luxury Auto Scottsdale",
  "lakelandtoyota.com": "Lakeland",
  "landerscorp.com": "Landers",
  "laurelautogroup.com": "Laurel",
  "malouf.com": "Malouf",
  "martinchevrolet.com": "Martin",
  "masano.com": "Masano",
  "mbbhm.com": "MB Birmingham",
  "mbso.com": "MB South Orlando",
  "mbusa.com": "Mercedes-Benz USA",
  "mccarthyautogroup.com": "McCarthy",
  "mclarennb.com": "McLaren New Braunfels",
  "mclartydaniel.com": "McLarty Daniel",
  "mercofselma.com": "Selma",
  "metro-toyota.com": "Metro",
  "metrofordofmadison.com": "Metro Ford Madison",
  "miamilakesautomall.com": "Miami Lakes Auto",
  "mikeshawtoyota.com": "Mike Shaw",
  "mterryautogroup.com": "M Terry",
  "myhappyhyundai.com": "Happy Hyundai",
  "myhudsonnissan.com": "Hudson Nissan",
  "nadalcapital.com": "Nadal",
  "newhollandauto.com": "New Holland",
  "nissanofec.com": "Nissan East Coast",
  "northcountyautomall.com": "North County",
  "northwestauto.com": "Northwest",
  "nplincoln.com": "North Park Lincoln",
  "npsubaru.com": "North Park Subaru",
  "onesubaru.com": "One Subaru",
  "parkerauto.com": "Parker",
  "patmillikenford.com": "Pat Milliken",
  "penskeautomotive.com": "Penske",
  "philsmithkia.com": "Phil Smith",
  "phofnash.com": "Performance Honda Nashville",
  "potamkinatlanta.com": "Potamkin Atlanta",
  "potamkinhyundai.com": "Potamkin",
  "powerautogroup.com": "Power",
  "prestonmotor.com": "Preston Motor",
  "pugmire.com": "Pugmire",
  "racewayford.com": "Raceway",
  "regalauto.com": "Regal",
  "richmondford.com": "Richmond Ford",
  "ricart.com": "Ricart",
  "rodbakerford.com": "Rod Baker",
  "ronbouchardsautostores.com": "Ron Bouchard",
  "route1usa.com": "Route 1",
  "rt128honda.com": "Route 128",
  "saabvw.com": "Saab",
  "sanleandroford.com": "San Leandro",
  "sandschevrolet.com": "Sands",
  "saveatsterling.com": "Sterling",
  "sbhyundai.com": "South Bay Hyundai",
  "scottclark.com": "Scott Clark",
  "serpentinichevy.com": "Serpentini",
  "sharpecars.com": "Sharpe",
  "shoplynch.com": "Shop Lynch",
  "shopsubaru.com": "Shop Subaru",
  "shottenkirk.com": "Shottenkirk",
  "signatureautony.com": "Signature NY",
  "sjinfiniti.com": "San Jose Infiniti",
  "slvdodge.com": "San Luis Valley Dodge",
  "smithtowntoyota.com": "Smithtown",
  "southwestdealersgroup.com": "Southwest",
  "starlingchevy.com": "Starling",
  "startoyota.net": "Star Toyota",
  "streetsideclassics.com": "Streetside",
  "subaruofgwinnett.com": "Gwinnett Subaru",
  "subaruofwakefield.com": "Wakefield",
  "subiecity.com": "Subie City",
  "sunnysideauto.com": "Sunnyside",
  "swantgraber.com": "Swant Graber",
  "tasca.com": "Tasca",
  "teamford.com": "Team Ford",
  "tflauto.com": "TFL Auto",
  "thechevyteam.com": "Chevy Team",
  "thepremiercollection.com": "Premier Collection",
  "thinkmidway.com": "Midway",
  "tomhesser.com": "Tom Hesser",
  "tommynixautogroup.com": "Tommy Nix",
  "townandcountryford.com": "Town And Country",
  "toyotacedarpark.com": "Cedar Park",
  "toyotacv.com": "Toyota Chula Vista",
  "toyotaofgreenwich.com": "Toyota Greenwich",
  "toyotaofslidell.net": "Toyota Slidell",
  "trustandrew.com": "Andrew",
  "tsands.com": "T Sands",
  "tuscaloosatoyota.com": "Tuscaloosa Toyota",
  "tuttleclick.com": "Tuttle Click",
  "unionpark.com": "Union Park",
  "uvwaudi.com": "University VW Audi",
  "valleynissan.com": "Valley",
  "vannuyscdjr.com": "Van Nuys",
  "venturatoyota.com": "Ventura",
  "vtaig.com": "VT Auto Group",
  "vwsouthclt.com": "VW South Charlotte",
  "westgatecars.com": "Westgate",
  "williamssubarucharlotte.com": "Williams Subaru",
  "wilsonvilletoyota.com": "Wilsonville",
  "yorkautomotive.com": "York"
};

// Utility Functions (Updated)
export function normalizeText(name) {
  if (!name || typeof name !== "string") return [];
  return name
    .replace(/\.(com|org|net|co\.uk)$/, "")
    .replace(/['".,-]+/g, '')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(word => word);
}

function capitalizeName(words) {
  if (typeof words === "string") {
    words = words.match(/[a-z]+/gi) || [];
  }

  return words
    .map((word, i) => {
      if (["of", "the", "to", "and"].includes(word.toLowerCase()) && i !== 0) return word.toLowerCase();
      if (/^[A-Z]{2,5}$/.test(word)) return word;

      let fixedWord = word
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/(GarlynShelton|McCarthy|McLarty|McLartyDaniel|DriveSuperior|JimmyBritt|DonHattan|CaminoReal|SwantGraber|DeMontrond|TownAndCountry|SanLeandro|GusMachado|RodBaker|DonHattan|Galean|TedBritt|ShopLynch|ScottClark|HuntingtonBeach|ExpRealty|JayWolfe|PremierCollection|ArtMoehn|TomHesser|ExecutiveAG|SmartDrive|AllAmerican|WickMail|RobertThorne|TommyNix|Kennedy|LouSobh|HMotors|LuxuryAutoScottsdale|BearMountain|Charlie|University)/gi, match => {
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
    .replace(/Mclartydaniel/g, "McLarty Daniel")
    .replace(/Drivesuperior/g, "Drive Superior")
    .replace(/Jimmybritt/g, "Jimmy Britt")
    .replace(/Donhattan/g, "Don Hattan")
    .replace(/Caminoreal/g, "Camino Real")
    .replace(/Swantgraber/g, "Swant Graber")
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
    .replace(/Ehchevy/g, "East Hills")
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
  return /^[A-Z]{2,5}$/.test(word) || (word.length <= 2 && !KNOWN_PROPER_NOUNS.includes(word.toLowerCase()));
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

function earlyCompoundSplit(text) {
  const carBrands = new Set(CAR_BRANDS.map(b => b.toLowerCase()));
  const cities = new Set(KNOWN_CITIES_SET.map(c => c.toLowerCase()));
  let parts = [text.toLowerCase()];
  const brandRegex = new RegExp(`\\b(${CAR_BRANDS.join('|')})\\b`, 'gi');
  const cityRegex = new RegExp(`\\b(${KNOWN_CITIES_SET.join('|')})\\b`, 'gi');
  const abbrRegex = /^[a-z]{2,5}$/i;

  // Split by brands, cities, and camelCase
  parts = parts.flatMap(part => part.split(brandRegex).filter(Boolean));
  parts = parts.flatMap(part => part.split(cityRegex).filter(Boolean));
  parts = parts.flatMap(part => part.match(/[A-Z][a-z]+|[a-z]+/g) || [part]);

  return parts.map(part => {
    if (carBrands.has(part)) return CAR_BRANDS.find(b => b.toLowerCase() === part);
    if (cities.has(part)) return KNOWN_CITIES_SET.find(c => c.toLowerCase() === part);
    if (abbrRegex.test(part)) return part.toUpperCase();
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join(" ");
}

function correctBadEndings(name) {
  if (name.endsWith("Rolet")) return name.replace("Rolet", "Chevrolet");
  if (name.endsWith("Motive")) return name.replace("Motive", "Automotive");
  if (name.endsWith("Cars") && !isPossessiveFriendly(name)) return name.replace("Cars", "");
  return name;
}

// OpenAI Fuzzy Matching for City Detection (retained from your script)
const cityCache = new Map();

export async function fuzzyMatchCity(token) {
  if (!token || typeof token !== "string") return null;
  const normalized = token.toLowerCase().trim();
  if (cityCache.has(normalized)) return cityCache.get(normalized);

  try {
    const prompt = `Is "${token}" a U.S. city name (allowing for typos)? If yes, return the correct name. Else, return null.`;
    const response = await callOpenAI(prompt, {
      systemMessage: "You are a helpful assistant that identifies U.S. city names.",
      max_tokens: 50,
      temperature: 0.3,
    });

    const trimmed = (response || "").trim();
    const isInvalid = !trimmed || trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === token.toLowerCase();
    const result = isInvalid ? null : trimmed;

    cityCache.set(normalized, result);
    return result;

  } catch (err) {
    console.error(`fuzzyMatchCity failed for "${token}": ${err.message}`);
    cityCache.set(normalized, null);
    return null;
  }
}

// Main humanization function (fully patched)
export async function humanizeName(inputName, domain, addPossessiveFlag = false) {
  try {
    const domainLower = domain.toLowerCase();
    if (KNOWN_OVERRIDES[domainLower]) {
      const name = addPossessiveFlag ? addPossessive(KNOWN_OVERRIDES[domainLower]) : KNOWN_OVERRIDES[domainLower];
      return { name, confidenceScore: 100, flags: ['OverrideApplied'], tokens: 0 };
    }

    let words = normalizeText(inputName || domain);
    console.log(`Before processing for ${domain}: ${words.join(" ")}`);
    let flags = [];
    let tokens = 0;

    const lowerInput = (inputName || domain).toLowerCase();
    const hasCarBrand = containsCarBrand(inputName || domain);
    if (NON_DEALERSHIP_KEYWORDS.some(keyword => lowerInput.includes(keyword)) && !hasCarBrand) {
      console.log(`Non-dealership domain detected: ${domain}`);
      return { name: "", confidenceScore: 0, flags: ["NonDealership"], tokens };
    }

    // ShopCarBrandException
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

    // HappyCarBrandException
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

    // Enhanced blob splitting
    let cleanedName = words.join(" ");
    if (words.length === 1 && !cleanedName.includes(" ") && !KNOWN_PROPER_NOUNS.includes(cleanedName.toLowerCase())) {
      cleanedName = earlyCompoundSplit(cleanedName);
      if (cleanedName.split(" ").length >= 2) {
        console.log(`Early compound split for ${domain}: ${words[0]} → ${cleanedName}`);
        flags.push("FallbackBlobSplit");
      }
    }

    words = cleanedName.split(" ");
    const hasCity = words.some(w => KNOWN_CITIES_SET.has(w.toLowerCase()));
    let cityCandidate = null;

    // Fuzzy city matching with OpenAI if no city found
    if (!hasCity) {
      const potentialCities = words.filter(word => 
        !CAR_BRANDS.includes(word.toLowerCase()) &&
        !COMMON_WORDS.includes(word.toLowerCase()) &&
        !KNOWN_PROPER_NOUNS.includes(word.toLowerCase()) &&
        word.length > 3
      );
      for (const token of potentialCities) {
        const matchedCity = await fuzzyMatchCity(token);
        if (matchedCity) {
          cityCandidate = matchedCity;
          words = words.map(w => w.toLowerCase() === token.toLowerCase() ? matchedCity : w);
          flags.push("FuzzyCityMatch");
          break;
        }
      }
    }

    // Handle specific patterns (e.g., "Kia of LaGrange")
    if (domain.match(/^(kiaof|toyotaof|hondaof|fordof|mbof)/i) && words.length > 1) {
      const parts = earlyCompoundSplit(domain).split(" ");
      const brand = parts[0];
      const rest = parts.slice(1).join(" ");
      const name = `${brand} of ${rest}`;
      const finalName = capitalizeName(name);
      return {
        name: addPossessiveFlag ? addPossessive(finalName) : finalName,
        confidenceScore: 95,
        flags: ["CarBrandOfPattern", ...flags],
        tokens
      };
    }

    // CarBrandCityException (e.g., "Honda of Columbia")
    const carBrandCityPattern = words.length >= 3 && 
      CAR_BRANDS.includes(words[0].toLowerCase()) && 
      words[1].toLowerCase() === "of" && 
      KNOWN_CITIES_SET.has(words[2].toLowerCase());
    if (carBrandCityPattern) {
      const brand = words[0];
      const city = words[2];
      const capitalizedBrand = brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
      const capitalizedCity = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
      let finalName = `${capitalizedBrand} of ${capitalizedCity}`;
      return {
        name: addPossessiveFlag ? addPossessive(finalName) : finalName,
        confidenceScore: 100,
        flags: ["CarBrandCityException", ...flags],
        reason: "CarBrandCityPattern",
        tokens
      };
    }

    // CityBrandPattern (e.g., "Columbia Honda")
    const cityBrandPattern = (hasCity || cityCandidate) && words.some(word => CAR_BRANDS.includes(word.toLowerCase()));
    if (cityBrandPattern) {
      const city = cityCandidate || words.find(word => KNOWN_CITIES_SET.has(word.toLowerCase()));
      const brand = words.find(word => CAR_BRANDS.includes(word.toLowerCase()));
      const capitalizedCity = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
      const capitalizedBrand = brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
      let finalName = `${capitalizedCity} ${capitalizedBrand}`;
      return {
        name: addPossessiveFlag ? addPossessive(finalName) : finalName,
        confidenceScore: 100,
        flags: ["CityBrandPattern", cityCandidate ? "FuzzyCityMatch" : ""],
        tokens
      };
    }

    // CarBrandRegionException (e.g., "North Ford")
    const regionPrefixes = ["north", "south", "east", "west", "central"];
    const matchedBrands = words.filter(w => CAR_BRANDS.includes(w.toLowerCase()));
    if (matchedBrands.length === 1) {
      const brandIndex = words.findIndex(w => w.toLowerCase() === matchedBrands[0].toLowerCase());
      const nextWord = words[brandIndex + 1]?.toLowerCase();
      if (regionPrefixes.includes(nextWord)) {
        const capitalizedBrand = matchedBrands[0].charAt(0).toUpperCase() + matchedBrands[0].slice(1).toLowerCase();
        const region = words.slice(brandIndex + 1).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        const namePart = words.slice(0, brandIndex).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        let finalName = `${namePart ? namePart + " " : ""}${capitalizedBrand} ${region}`.replace("Mercedes-Benz", "MB");
        return {
          name: addPossessiveFlag ? addPossessive(finalName) : finalName,
          confidenceScore: 100,
          flags: ["CarBrandRegionException", ...flags],
          reason: "CarBrandRegionPattern",
          tokens
        };
      }
    }

    words = removeForbiddenWords(words);
    const beforeBrandRemoval = [...words];
    if (!carBrandCityPattern && !cityBrandPattern) {
      words = removeCarBrands(words);
    }
    const removedBrands = beforeBrandRemoval.filter(word => CAR_BRANDS.includes(word.toLowerCase()));
    words = preserveBrandForPossessive(words, removedBrands);

    if (words.length === 0 && beforeBrandRemoval.length > 0) {
      words = beforeBrandRemoval;
      flags.push("CarBrandRemovalAdjusted");
    }

    console.log(`After brand removal for ${domain}: ${words.join(" ")}`);

    // Add "Auto" if single-word name without city
    let name = capitalizeName(words);
    if (words.length === 1 && !hasCity && !name.toLowerCase().endsWith("auto") && !flags.includes("TooGeneric")) {
      name += " Auto";
      flags.push("AutoSuffixAdded");
    }

    if (!name) {
      return { name: words.join(" "), confidenceScore: 0, flags: ["EmptyFallbackUsed", ...flags], tokens };
    }

    // Strip redundant trailing brand
    const finalWords = name.split(" ");
    const trailingBrand = name.match(new RegExp(`\\b(${CAR_BRANDS.join('|')})$`, 'i'));
    if (trailingBrand && finalWords.length > 1) {
      name = name.replace(trailingBrand[0], '').trim();
      flags.push("TrailingBrandRemoved");
    }

    name = correctBadEndings(name);

    // Check for city-only or generic names
    const isCityOnly = finalWords.length === 1 && (KNOWN_CITIES_SET.has(finalWords[0].toLowerCase()) || cityCandidate) && !hasCarBrand;
    if (isCityOnly) {
      flags.push("CityNameOnly");
    }

    const isTooGeneric = finalWords.length === 1 && finalWords[0].length <= 4 && !KNOWN_PROPER_NOUNS.includes(finalWords[0].toLowerCase()) && !KNOWN_CITIES_SET.has(finalWords[0].toLowerCase()) && !hasCarBrand;
    if (isTooGeneric) {
      flags.push("TooGeneric");
    }

    if (name.toLowerCase().startsWith("of")) {
      flags.push("BadPrefixOf");
    }

    if (!isPossessiveFriendly(name)) {
      flags.push("NotPossessiveFriendly");
    }

    if (finalWords.some(word => isPossibleAbbreviation(word))) {
      flags.push("PossibleAbbreviation");
    }

    // Adjust for non-dealership misflags
    if (flags.includes("NonDealership") && (hasCarBrand || domain.includes("auto"))) {
      flags = flags.filter(f => f !== "NonDealership");
    }

    let confidenceScore = 100;
    if (flags.includes("NotPossessiveFriendly")) confidenceScore = 80;
    if (flags.includes("FallbackBlobSplit")) confidenceScore = Math.min(confidenceScore, 90);
    if (flags.includes("CarBrandSuffixRemaining")) confidenceScore = Math.min(confidenceScore, 50);
    if (flags.includes("TooGeneric") || flags.includes("CityNameOnly") || flags.includes("PossibleAbbreviation")) {
      confidenceScore = Math.min(confidenceScore, 75);
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

function runUnitTests() {
  const tests = [
    { domain: 'athensford.com', expected: 'Athens Ford' },
    { domain: 'karlchevroletstuart.com', expected: 'Karl Stuart' },
    { domain: 'gusmachadoford.com', expected: 'Gus Machado' },
    { domain: 'duvalford.com', expected: 'Duval' },
    { domain: 'fordofdalton.com', expected: 'Ford Dalton' },
    { domain: 'devineford.com', expected: 'Devine Auto' }, // Updated to reflect suffix addition
    { domain: 'hondaofcolumbia.com', expected: 'Honda of Columbia' },
    { domain: 'andersonautogroup.com', expected: 'Anderson Auto' },
    { domain: 'mbofbrooklyn.com', expected: 'MB of Brooklyn' },
    { domain: 'vscc.com', expected: 'VSCC Auto' }
  ];

  let passed = 0;
  for (const test of tests) {
    const result = await humanizeName(test.domain, test.domain, false);
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

export { humanizeName, CAR_BRANDS, COMMON_WORDS, NON_DEALERSHIP_KEYWORDS, KNOWN_PROPER_NOUNS };
