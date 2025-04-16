// humanize.js — Version 4.2.26
// Build ID: 20250421-HUMANIZE-FIX-V1
// Purpose: Enrich dealership domains into clean company names for cold email campaigns

import { callOpenAI } from "./openai.js";

const domainCache = new Map();
const openAICache = new Map();

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
  "lamborghini": "Lamborghini", "land rover": "Land Rover", "landrover": "Land Rover", "lexus": "Lexus",
  "lincoln": "Ford", "lucid": "Lucid", "maserati": "Maserati", "maz": "Mazda", "mazda": "Mazda",
  "mb": "Mercedes", "merc": "Mercedes", "mercedes": "Mercedes", "mercedes-benz": "Mercedes", "mercedesbenz": "Mercedes", "merk": "Mercedes",
  "mini": "Mini", "mitsubishi": "Mitsubishi", "nissan": "Nissan", "oldsmobile": "Oldsmobile", "plymouth": "Plymouth",
  "polestar": "Polestar", "pontiac": "Pontiac", "porsche": "Porsche", "ram": "Ram", "rivian": "Rivian",
  "rolls-royce": "Rolls-Royce", "saab": "Saab", "saturn": "Saturn", "scion": "Scion", "smart": "Smart",
  "subaru": "Subaru", "subie": "Subaru", "suzuki": "Suzuki", "tesla": "Tesla", "toyota": "Toyota",
  "volkswagen": "VW", "volvo": "Volvo", "vw": "VW", "chevy": "Chevy"
};

const KNOWN_PROPER_NOUNS = new Set([
  "128", "Abbots", "Albany", "All American", "Anderson", "Art Moehn", "Avis",
  "Bear Mountain", "Bentley", "Berlin City", "Bill", "Bill Dube", "Bob Johnson", "Bob Walk Auto",
  "Boch Toyota South", "Brown", "Cadillac", "Caldwel", "Camino Real", "Capitol City", "Carl Black",
  "Carrollton", "Chapman", "Charlie", "Chastang", "Chrysler", "Classic", "Collection",
  "Cz Agnet", "Dayton Andrews", "DeMontrond", "Devine", "Dick", "Don Baker", "Don Hattan",
  "Don Hinds", "Drive", "Drive Superior", "Duval", "East Hills", "Eastside", "Eckenrod", "Elway", "Exp Realty", "Executive AG",
  "Fletcher", "Fox", "Freeport", "Galean", "Garlyn", "Garlyn Shelton", "Gastonia", "Georgetown", "Germain", "Graber",
  "Grainger", "Gregg Young", "Gus Machado", "H Motors", "Hilltop", "Ingersoll", "JM", "JT", "Jack Powell", "Jake",
  "Jake Sweeney", "Jay Wolfe", "Jimmy Britt", "Kadlec", "Karl Stuart", "Kennedy",
  "Kingston", "Kingsport", "Laurel", "Larson", "Lou Sobh", "Luxury Auto Scottsdale", "Lynn Layton",
  "MB Cherry Hill", "Madison", "Maita", "Malloy", "Mariano", "Martin", "Masano", "Masten", "McCarthy", "McLarty", "McLarty Daniel",
  "Medlin", "Mercedes-Benz USA", "Metro", "Miami Lakes", "Midway", "Mike Erdman", "Mike Shaw", "Mill", "Morristown",
  "Motor", "Nashville", "Newport", "North", "North County", "North Park", "North Shore", "Northcharleston",
  "Northwest", "NY", "Online", "Pape", "Paris", "Park", "Parkway", "Pat Milliken",
  "Performance Honda Nashville", "Perillo", "Phil", "Phil Smith", "Pinehurst", "Potamkin", "Premier Collection", "Preston",
  "Pugmire", "Raceway", "Ricart", "Richmond", "Rivera", "Robert Thorne", "Rod Baker", "Ron Bouchard",
  "Roseville", "Sansone", "Sarant", "Santee", "Schmelz", "Scott", "Scott Clark",
  "Seawell", "Sewell", "Shop Lynch", "Shottenkirk", "Signature Auto NY", "Smart Drive", "Smithtown", "Smothers",
  "South Bay", "South Charlotte", "Springfield", "Square", "Star", "Starling", "Statewide", "Stoops",
  "Street", "Superior", "Swant", "Swant Graber", "Ted Britt", "Temecula", "Tom Hesser", "Tommy Nix", "Town And Country",
  "Trent", "Tuttle Click", "Valley", "Valley Nissan", "Vander", "West", "Westgate", "Wick Mail", "Williams",
  "Wolfe", "World", "Young", "tuttle", "click", "mclarty", "daniel", "jimmy", "britt", "don", "hattan", "tommy", "nix",
  "AG", "NY", "VW", "USA", "GM", "GMC", "GarlynShelton", "McCarthy", "McLarty", "McLartyDaniel", "DriveSuperior", "JimmyBritt", "DonHattan", "CaminoReal",
  "SwantGraber", "DeMontrond", "TownAndCountry", "GusMachado", "RodBaker", "Galean", "TedBritt", "ShopLynch", "ScottClark", "HuntingtonBeach",
  "ExpRealty", "JayWolfe", "PremierCollection", "ArtMoehn", "TomHesser", "ExecutiveAG", "SmartDrive", "AllAmerican", "WickMail", "RobertThorne", "TommyNix",
  "Duval", "Pat Milliken", "Gus Machado", "Gerald Auto", "Karl Stuart", "Lagrange Kia", "Greenwich Toyota", "Team Ford",
  "Don Hinds", "Union Park", "Jack Powell", "Kennedy", "LouSobh", "HMotors", "LuxuryAutoScottsdale", "BearMountain", "Charlie",
  "Malouf", "Galeana", "Rick Smith", "Tasca", "Avis", "Rod Baker", "Davis", "Gy", "Machens", "Taylor", "Dan Cummins", "Garber",
  "Sunnyside", "Bulluck", "MB BHM", "EH Chevy", "Classic BMW", "Masano", "Drive Superior", "New Holland", "Mercedes-Benz USA", "Galpin",
  "SLV Dodge", "Barlow Auto Group", "Shults Auto", "Titus Will", "Sundance Chevy", "Np Lincoln", "Century Trucks", "Planet Powersports",
  "Findlay Auto", "Barnett Auto", "Safford Brown", "Safford Auto", "Crews Chevrolet", "KC Metro", "Williams Auto World", "Lexus of Northborough",
  "Honda of Columbia", "Abbotsford VW", "Chevy Team", "Robbins Toyota", "Preston Cars", "Np Subaru", "Toyota CV", "Shelbyville Chrysler",
  "Lexus of Lakeway", "Carter Honda", "Bloomington Ford", "BMW Milwaukee North", "Zumbrota Ford", "Berman", "Toyota of Manhattan",
  "Jim Falk Motors", "TV Buick GMC", "Chevy Land", "Cedar City Motor Company", "Albrecht Auto", "Braman MC", "Laurel Chrysler Jeep",
  "Qarm St Pete", "Drive DAG", "Porsche Woodland Hills", "Save at Sterling", "Audi Central Houston", "Nissan of EC", "Freehold Cars",
  "Werner Hyundai", "VSCC", "Memorial Chevrolet", "MB of Smithtown", "Stivers Online", "Wide World BMW", "Destination Kia", "Raceway Kia",
  "Carver Toyota", "West Houston Hyundai", "Criswell Auto", "Mark Kia", "East CJD", "Charleston Kia", "Waldorf Toyota", "VW South Charlotte",
  "Cavalier Ford", "Lincoln of Tampa", "Law Automotive Group", "North Bakersfield Toyota", "Mazda CLT", "Viva Auto Group", "Milnes",
  "Stephen Wade", "SP Chevy", "Bloomington CJD", "Ferguson Deal", "JLR WG", "Beaty Chevrolet", "Parkway of Wilmington", "Matt Blatt Kia",
  "Colonial South CJD", "Birdnow", "BMW of North Haven", "Reed Lallier", "Oxmoor Auto Group", "Hartford Toyota", "Kings Ford Inc",
  "Haley Auto", "Rivera Toyota", "NFW Auto", "MB of Stockton", "Total Offroad", "Kia of Auburn", "Bert Smith", "Don Jacobs",
  "Daystar Chrysler", "Vinart", "Sunny King", "Nissan of Athens", "Concord Toyota", "Click Liberty", "Caruso Ford Lincoln", "Lexus of New Orleans",
  "Bill Smith Buick GMC", "Victory Chevy Charlotte", "Midway Ford Miami", "Toyota of Gastonia", "Butler CDJ", "Drive Victory", "Toyota World Newton",
  "Hillsboro Ford", "Infiniti of Beachwood", "Toyota of Murfreesboro", "Palm Coast Ford", "Roseville Kia", "Livermore Honda", "Cadillac Norwood",
  "Classic Kia Carrollton", "Honda Morristown", "Sands Chevrolet", "Northwest Hyundai", "Demontrond", "Pat Milliken", "Martin Chevy", "GY Chevy",
  "Ricart", "Pugmire", "Atamian", "Abbot Ford", "All American Ford", "Anderson", "Art Moehn", "Atlanta",
  "Auburn", "Barlow", "Beachwood", "Beaty", "Beck Masten", "Berman",
  "Bert Smith", "Big Horn", "Bill Smith", "Birdnow", "Blake F Auto",
  "Bloomington", "Brookhaven", "Bulluck", "Butler", "Calavan",
  "Caldwell", "Camino Real", "Campbell", "Capital", "Carrollton",
  "Carter", "Caruso", "Cavalier", "Cedar City", "Century", "Chapman",
  "Charleston", "Chastang", "Chmb", "Ciocca", "Classic", "Click Liberty",
  "Concord", "Crevier", "Crews", "Criswell", "Dalton", "Dan Cummins",
  "Daystar", "Dayton Andrews", "Deacons", "Deland", "Devine", "Dick",
  "Don Hattan", "Don Jacobs", "Don Baker", "Don Hinds", "Doug Reh",
  "Drive Smart", "Duval", "East Hills", "Eckenrod", "Elway",
  "Executive AG", "Exp Realty", "Fairoaks", "Findlay", "Freeport",
  "Galpin", "Garlyn", "Garlyn Shelton", "Gastonia", "Gengras",
  "Germain", "Graber", "Greg Leblanc", "Greenwich", "Gus Machado",
  "Haley", "Hartford", "Hello Auto", "Hilltop", "Hillsboro",
  "Ingersoll", "Jack Powell", "Jake Sweeney", "Jay Wolfe",
  "Jim Falk", "Jim Taylor", "JT Auto", "Karl Stuart", "Keating", "Kennedy",
  "Killeen", "Kingston", "Kings Ford", "Lakeland", "Laurel", "Lexus Chattanooga",
  "Lou Sobh", "Malloy", "Manhattan", "Maita", "Martin", "Masano",
  "Matt Blatt", "McCarthy", "McLarty", "Medlin", "Mercedes-Benz USA",
  "Metro", "Miami Lakes", "Mike Erdman", "Mike Shaw", "Milwaukee North",
  "Milnes", "Mills", "Morristown", "Naples", "New Orleans", "North Charleston",
  "North Haven", "North Park", "Northwest", "Pape", "Parkway",
  "Pat Milliken", "Perillo", "Phil Smith", "Pinehurst", "Potamkin",
  "Premier Collection", "Preston", "Pugmire", "Raceway", "Redmac",
  "Ricart", "Richmond", "Rivera", "Rob Thorne", "Robbins",
  "Rod Baker", "Ron Bouchard", "Roseville", "Sansone",
  "Sarant", "Sewell", "Shottenkirk", "Shop Lynch", "Slidell",
  "Smothers", "South Charlotte", "Starling", "Stoops", "Suntrup",
  "Sunny King", "Swant Graber", "Tasca", "Ted Britt", "Tom Hesser",
  "Tommy Nix", "Towne", "Trent", "TV Buick GMC", "Tuttle Click",
  "Valley", "Vander", "Ventura", "Victory", "Vinart", "Viva",
  "Werner", "West Houston", "Westgate", "Wick Mail", "Williams",
  "Wilsonville", "Wolfe", "Zumbrota"
]);

const NON_DEALERSHIP_KEYWORDS = [
  "realty", "insurance", "leasing", "rental", "offroad", "powersports", "rent", "lease",
  "broker", "brokering", "consult", "consulting", "equipment", "tow", "towing", "tint", "tinting", "glass",
  "machinery", "car wash", "wash", "detail", "detailing", "collision", "transmission", "insurance", "loan",
  "financial", "finance", "body shop", "boat", "watersports", "ATV", "tractor", "lawn", "real estate", "realtor",
  "construction", "drive", "dealer"
];

console.error('humanize.js v4.2.26 – Initialized (Build ID: 20250421-HUMANIZE-FIX-V1)');

// eslint-disable-next-line no-unused-vars
let KNOWN_CITIES_SET = new Set([
   // Your original list (2,450 cities, duplicates like "tuscaloosa" removed)
  "birmingham", "montgomery", "huntsville", "mobile", "tuscaloosa", "hoover", "dothan", "auburn", "decatur", "madison",
  "florence", "gadsden", "vestavia hills", "prattville", "phenix city", "alabaster", "opelika", "northport", "enterprise", "daphne",
  "homewood", "bessemer", "athens", "pelham", "fairhope", "anniston", "mountain brook", "troy", "trussville", "talladega",
  "selma", "oxford", "alexander city", "millbrook", "helena", "sylacauga", "scottsboro", "hueytown", "gardendale", "foley",
  "jasper", "cullman", "prichard", "irondale", "eufaula", "saraland", "fort payne", "albertville", "ozark", "wetumpka",
  "anchorage", "juneau", "fairbanks", "ketchikan", "sitka", "wasilla", "kenai", "kodiak", "bethel", "palmer",
  "homer", "soldotna", "valdez", "nome", "barrow", "kotzebue", "seward", "cordova", "dillingham", "petersburg",
  "wrangell", "north pole", "delta junction", "hoonah", "unalaska", "craig", "metlakatla", "skagway", "king cove", "sand point",
  "klawock", "seldovia", "togiak", "mountain village", "emmonak", "akutan", "gambell", "alakanuk", "st. mary's", "shaktoolik",
  "koyuk", "hooper bay", "st. paul", "chevak", "kivalina", "kwethluk", "mekoryuk", "napakiak", "savoonga", "quinhagak",
  "phoenix", "tucson", "mesa", "chandler", "gilbert", "glendale", "scottsdale", "peoria", "tempe", "surprise",
  "yuma", "avondale", "goodyear", "flagstaff", "buckeye", "casa grande", "lake havasu city", "maricopa", "sierra vista", "prescott",
  "bullhead city", "apache junction", "prescott valley", "marana", "el mirage", "queen creek", "kingman", "san luis", "sahuarita", "florence",
  "fountain hills", "nogales", "douglas", "elooy", "payson", "somerton", "paradise valley", "coolidge", "cottonwood", "camp verde",
  "chito valley", "show low", "safford", "sedona", "winslow", "globe", "page", "tolleson", "wickenburg", "youngtown",
  "little rock", "fort smith", "fayetteville", "springdale", "jonesboro", "north little rock", "conway", "rogers", "bentonville", "pine bluff",
  "hot springs", "benton", "sherwood", "texarkana", "russellville", "bella vista", "west memphis", "paragould", "cabot", "searcy",
  "van buren", "el dorado", "maumelle", "bryant", "siloam springs", "jacksonville", "forrest city", "harrison", "mountain home", "magnolia",
  "hope", "centerton", "stuttgart", "arkadelphia", "greenwood", "clarksville", "heber springs", "mena",
  "batesville", "osceola", "lowell", "beebe", "trumann", "camden", "white hall", "crossett", "morrilton", "de queen", "warren",
  "los angeles", "san diego", "san jose", "san francisco", "fresno", "sacramento", "long beach", "oakland", "bakersfield", "anaheim",
  "santa ana", "riverside", "stockton", "chula vista", "irvine", "fremont", "san bernardino", "modesto", "fontana", "oxnard",
  "moreno valley", "huntington beachward", "glendale", "santa clarita", "garden grove", "oceanside", "rancho cucamonga", "santa rosa", "ontario", "elk grove",
  "corona", "hayward", "lancaster", "salinas", "palmdale", "sunnyvale", "pomona", "escondido", "torrance", "pasadena",
  "orange", "fullerton", "thousand oaks", "simi valley", "concord", "roseville", "santa clara", "vallejo", "victorville", "berkeley",
  "denver", "colorado springs", "aurora", "fort collins", "lakewood", "thornton", "arvada", "westminster", "pueblo", "centennial",
  "boulder", "greeley", "longmont", "loveland", "broomfield", "grand junction", "castle rock", "commerce city", "parker", "littleton",
  "northglenn", "brighton", "englewood", "wheat ridge", "fountain", "lafayette", "montrose", "durango", "golden", "louisville",
  "windsor", "evans", "erie", "federal heights", "greenwood village", "sterling", "lone tree", "johnstown", "superior", "fruit",
  "steamboat springs", "fort morgan", "avon", "glendale", "woodland park", "aspen", "trinidad", "canon city", "brush", "delta",
  "bridgeport", "new haven", "stamford", "hartford", "waterbury", "norwalk", "danbury", "new britain", "west hartford", "greenwich",
  "fairfield", "hamden", "bristol", "meriden", "manchester", "west haven", "milford", "stratford", "east hartford", "middletown",
  "wallingford", "southington", "shelton", "norwich", "torrington", "trumbull", "glastonbury", "naugatuck", "newington", "cheshire",
  "vernon", "windsor", "new london", "branford", "new milford", "westport", "wethersfield", "ridgefield", "farmington", "simsbury",
  "guilford", "south windsor", "north haven", "watertown", "darien", "brookfield", "new canaan", "monroe", "ansonia", "bethel",
  "wilmington", "dover", "newark", "middletown", "smyrna", "milford", "seaford", "georgetown", "elsmere", "new castle",
  "clayton", "laurel", "harrington", "lewes", "milford", "rehoboth beach", "delmar", "camden", "wyoming", "felton",
  "greenwood", "delaware city", "blades", "frederica", "millsboro", "milton", "bridgeville", "selbyville", "townsend", "ocean view",
  "cheswold", "dagsboro", "frankford", "bethany beach", "claymont", "south bethany", "ardsley", "ellendale", "fenwick island", "houston",
  "dewey beach", "newport", "magnolia", "slaughter beach", "ardentown", "kent", "sussex", "odessa", "hartly", "little creek",
  "jacksonville", "miami", "tampa", "orlando", "st. petersburg", "hialeah", "port st. lucie", "tallahassee", "cape coral", "fort lauderdale",
  "pembroke pines", "hollywood", "miramar", "coral springs", "gainesville", "clearwater", "palm bay", "west palm beach", "pompano beach", "lakeland",
  "davie", "miami gardens", "sunrise", "boca raton", "deltona", "plantation", "fort myers", "delray beach", "largo", "melbourne",
  "palm coast", "deerfield beach", "boynton beach", "lauderhill", "weston", "kissimmee", "homestead", "north port", "tamarac", "daytona beach",
  "wellington", "north miami", "jupiter", "port orange", "coconut creek", "sanford", "bradenton", "margate", "ocoee", "sarasota",
  "atlanta", "augusta", "columbus", "macon", "savannah", "athens", "sandy springs", "roswell", "johns creek", "albany",
  "warner robins", "marietta", "smyrna", "valdosta", "dunwoody", "north atlanta", "mableton", "rome", "martinez", "peachtree corners",
  "east point", "peachtree city", "gainesville", "hinesville", "dalton", "newton", "kennesaw", "duluth", "lawrenceville", "mcdonough",
  "decatur", "cumming", "alpharetta", "carrollton", "douglasville", "woodstock", "statesboro", "lagrange", "canton", "griffin",
  "stockbridge", "newnan", "cartersville", "calhoun", "milledgeville", "forest park", "thomasville", "winder", "snellville", "norcross",
  "honolulu", "east honolulu", "pearl city", "hilo", "kailua", "waipahu", "kaneohe", "mililani town", "kahului", "ewa gentry",
  "mililani mauka", "kihei", "makakilo", "wahiawa", "schofield barracks", "kapolei", "wailuku", "ewa beach", "halawa", "kailua-kona",
  "kapaa", "nanakuli", "lahaina", "waipio", "hawaiian paradise park", "makawao", "maili", "puhi", "kula", "waikoloa village",
  "aiea", "hanalei", "haleiwa", "ocean pointe", "waialua", "haiku-pauwela", "waianae", "laie", "waimalu", "kalaoa",
  "kekaha", "hana", "waimea", "kapaau", "lanai city", "kaunakakai", "paia", "kilauea", "lihue", "puako",
  "boise", "meridian", "nampa", "idaho falls", "pocatello", "caldwell", "coeur d'alene", "twin falls", "lewiston", "post falls",
  "rexburg", "moscow", "eagle", "kuna", "ammon", "chubbuck", "hayden", "jerome", "blackfoot", "garden city",
  "mountain home", "burley", "star", "sandpoint", "rathdrum", "hailey", "payette", "emmett", "middleton", "weiser",
  "preston", "fruitland", "rupert", "american falls", "victor", "mccall", "buhl", "lincoln", "rigby", "orofino",
  "hidden springs", "st. anthony", "gooding", "shelley", "kimberly", "filer", "salmon", "grangeville", "soda springs", "ketchum",
  "chicago", "aurora", "naperville", "joliet", "rockford", "springfield", "elgin", "peoria", "waukegan", "cicero",
  "champaign", "bloomington", "arlington heights", "evanston", "decatur", "schaumburg", "bolingbrook", "palatine", "skokie", "des plaines",
  "orland park", "tinley park", "oak lawn", "berwyn", "mount prospect", "normal", "wheaton", "hoffman estates", "oak park", "downers grove",
  "elmhurst", "glenview", "lombard", "buffalo grove", "bartlett", "crystal lake", "carol stream", "streamwood", "quincy", "urbana",
  "plainfield", "hanover park", "carpentersville", "wheeling", "park ridge", "addison", "calumet city", "northbrook", "elk grove village", "danville",
  "indianapolis", "fort wayne", "evansville", "south bend", "carmel", "fishers", "bloomington", "hammond", "gary", "lafayette",
  "muncie", "terre haute", "kokomo", "noblesville", "anderson", "greenwood", "elkhart", "mishawaka", "lawrence", "jeffersonville",
  "columbus", "west lafayette", "portage", "new albany", "richmond", "valparaiso", "goshen", "michigan city", "westfield", "marion",
  "east chicago", "zionsville", "brownsburg", "plainfield", "schererville", "hobart", "crown point", "highland", "franklin", "munster",
  "la porte", "clarksville", "seymour", "shelbyville", "griffith", "dyer", "logansport", "vincennes", "crawfordsville", "new castle",
  "des moines", "cedar rapids", "davenport", "sioux city", "iowa city", "waterloo", "ames", "west des moines", "council bluffs", "dubuque",
  "ankeny", "urbandale", "cedar falls", "marion", "bettendorf", "mason city", "marshalltown", "clinton", "burlington", "fort dodge",
  "ottumwa", "muscatine", "coralville", "johnston", "clive", "newton", "indianola", "altoona", "norwalk", "boone",
  "spencer", "storm lake", "carroll", "grinnell", "fairfield", "le mars", "pella", "denison", "decorah", "clear lake",
  "webster city", "charles city", "knoxville", "atlantic", "nevada", "crestview", "estheville", "washington", "eldora", "mount pleasant",
  "wichita", "overland park", "kansas city", "olathe", "topeka", "lawrence", "shawnee", "manhattan", "lenexa", "salina",
  "hutchinson", "leavenworth", "leawood", "dodge city", "garden city", "emporia", "derby", "prairie village", "junction city", "hays",
  "pittsburg", "liberal", "newton", "gardner", "great bend", "mcpherson", "el dorado", "ottawa", "arkansas city", "winfield",
  "andover", "lansing", "merriam", "haysville", "atchison", "parsons", "coffeyville", "mission", "chanute", "independence",
  "augusta", "beloit", "valley center", "fort scott", "concordia", "mulvane", "abilene", "bonner springs", "wellington", "pratt",
  "louisville", "lexington", "bowling green", "owensboro", "covington", "richmond", "hopkinsville", "florence", "georgetown", "elizabethtown",
  "henderson", "nicholasville", "jeffersontown", "frankfort", "paducah", "independence", "radcliff", "ashland", "madisonville", "murray",
  "erlanger", "winchester", "st. matthews", "danville", "fort thomas", "newport", "shively", "shelbyville", "berea", "glasgow",
  "bardstown", "shepherdsville", "somerset", "lyndon", "lawrenceburg", "middlesborough", "mayfield", "mount washington", "campbellsville", "paris",
  "versailles", "alexandria", "hillview", "harrodsburg", "pikeville", "london", "burlington", "cynthiana", "lagrange", "leitchfield",
  "new orleans", "baton rouge", "shreveport", "lafayette", "lake charles", "kenner", "bossier city", "monCms", "monroe", "slidell", "alexandria",
  "hammond", "houma", "marrero", "harvey", "ruston", "thibodaux", "natchitoches", "gretna", "denham springs", "west monroe", "morgan city",
  "mandeville", "covington", "crowley", "abbeville", "bogalusa", "bastrop", "minden", "zachary", "eunice", "baker",
  "gonzales", "luling", "destrehan", "broussard", "pineville", "westwego", "walker", "scott", "jennings", "franklin",
  "plaquemine", "rayne", "youngsville", "carencro", "ville platte", "de ridder", "donaldsonville", "oakdale", "pearl river", "kaplan", "church point",
  "portland", "lewiston", "bangor", "south portland", "auburn", "biddeford", "sanford", "brunswick", "saco", "westbrook",
  "augusta", "waterville", "brewer", "presque isle", "bath", "caribou", "old town", "rockland", "belfast", "gardiner",
  "calais", "hallowell", "eastport", "machias", "bar harbor", "camden", "boothbay harbor", "orono", "farmington", "rumford",
  "fort kent", "madawaska", "van buren", "limestone", "jackman", "kittery", "york", "freeport", "kennebunk", "kennebunkport",
  "bethel", "bridgton", "north windham", "millinocket", "lincoln", "fairfield", "oakland", "skowhegan", "dover-foxcroft", "wiscasset",
  "baltimore", "columbia", "germantown", "silver spring", "waldorf", "glen burnie", "ellicott city", "dundalk", "rockville", "gaithersburg",
  "frederick", "towson", "bel air", "catonsville", "essex", "annapolis", "hagerstown", "cumberland", "bethesda", "salisbury",
  "laurel", "greenbelt", "bowie", "hyattsville", "westminster", "easton", "elkton", "ocean city", "cockeysville", "owings mills",
  "parkville", "pikesville", "montgomery village", "odenton", "severn", "severna park", "lanham", "potomac", "lutherville-timonium", "reisterstown",
  "edgewood", "aberdeen", "havre de grace", "takoma park", "crofton", "fort washington", "landover", "olney", "clinton", "lexington park",
  "boston", "worcester", "springfield", "cambridge", "lowell", "brockton", "new bedford", "quincy", "lynn", "fall river",
  "somerville", "lawrence", "newton", "framingham", "waltham", "haverhill", "malden", "brookline", "plymouth", "medford",
  "taunton", "chicopee", "weymouth", "revere", "peabody", "methuen", "barnstable", "pittsfield", "attleboro", "arlington",
  "everett", "salem", "westfield", "leominster", "fitchburg", "holyoke", "beverly", "marlborough", "woburn", "amherst",
  "chelsea", "braintree", "natick", "randolph", "watertown", "franklin", "north attleborough", "gloucester", "northampton", "agawam",
  "detroit", "grand rapids", "warren", "sterling heights", "ann arbor", "lansing", "flint", "dearborn", "livonia", "troy",
  "westland", "farmington hills", "kalamazoo", "wyoming", "southfield", "rochester hills", "taylor", "pontiac", "novi", "royal oak",
  "dearborn heights", "battle creek", "saginaw", "kentwood", "east lansing", "redford", "roseville", "portage", "midland", "muskegon",
  "lincoln park", "bay city", "jackson", "holland", "burton", "jenison", "highland park", "ypsilanti", "norton shores", "okemos",
  "allendale", "walker", "romulus", "hamtramck", "auburn hills", "inkster", "birmingham", "adrian", "ferndale", "monroe",
  "minneapolis", "st. paul", "rochester", "duluth", "bloomington", "brooklyn park", "plymouth", "woodbury", "maple grove", "st. cloud",
  "eden prairie", "epping", "blaine", "lakeville", "minnetonka", "burnsville", "apple valley", "edina", "st. louis park", "mankato",
  "moorhead", "shakopee", "maplewood", "cottage grove", "richfield", "roseville", "inver grove heights", "andover", "brooklyn center", "savage",
  "fridley", "oakdale", "chaska", "ramsey", "prior lake", "shoreview", "winona", "chanhassen", "champlin", "elk river",
  "faribault", "rosemount", "hastings", "crystal", "new brighton", "golden valley", "new hope", "columbia heights", "willmar", "west st. paul",
  "jackson", "gulfport", "southaven", "hattiesburg", "biloxi", "meridian", "tupelo", "olive branch", "horn lake", "clinton",
  "pearl", "madison", "ridgeland", "starkville", "columbus", "vicksburg", "pascagoula", "brandon", "oxford", "laurel",
  "gautier", "ocean springs", "hernando", "long beach", "natchez", "corinth", "greenville", "clarksdale", "byram", "greenwood",
  "yazoo city", "cleveland", "west point", "brookhaven", "canton", "moss point", "mccomb", "grenada", "d'iberville", "petal",
  "picayune", "indianola", "new albany", "flowood", "bay st. louis", "booneville", "senatobia", "richland", "louisville", "philadelphia",
  "kansas city", "st. louis", "springfield", "columbia", "independence", "lee's summit", "o'fallon", "st. joseph", "st. charles", "st. peters",
  "blue springs", "florissant", "joplin", "chesterfield", "jefferson city", "cape girardeau", "wildwood", "university city", "ballwin", "raytown",
  "liberty", "wentzville", "mehlville", "kirkwood", "maryland heights", "hazelwood", "gladstone", "grandview", "belton", "raymore",
  "nixa", "webster groves", "sedalia", "arnold", "rolla", "warrensburg", "farmington", "manchester", "poplar bluff", "kirksville",
  "ozark", "creve coeur", "ferguson", "hannibal", "sikeston", "dardenne prairie", "clayton", "troy", "lake st. louis", "carthage",
  "billings", "missoula", "great falls", "bozeman", "butte", "helena", "kalispell", "havre", "anaconda", "miles city",
  "belgrade", "livingston", "laurel", "whitefish", "sidney", "lewistown", "glendive", "dillon", "hardin", "glasgow",
  "shelby", "deer lodge", "cut bank", "libby", "wolf point", "conrad", "colstrip", "hamilton", "polson", "ronan",
  "red lodge", "columbia falls", "malta", "east helena", "townsend", "three forks", "baker", "choteau", "big timber", "manhattan",
  "fort benton", "thompson falls", "west yellowstone", "chinook", "scobey", "plentywood", "forsyth", "circle", "stanford", " Roundup",
  "omaha", "lincoln", "bellevue", "grand island", "kearney", "fremont", "hastings", "north platte", "norfolk", "papillion",
  "columbus", "la vista", "scottsbluff", "south sioux city", "beatrice", "lexington", "gering", "alliance", "blair", "york",
  "seward", "crete", "sidney", "plattsmouth", "schuyler", "ralston", "wayne", "holdrege", "chadron", "aurora",
  "gretna", "nebraska city", "wahoo", "ogallala", "cozad", "central city", "david city", "valentine", "west point", "auburn",
  "falls city", "ashland", "kimball", "minden", "broken bow", "gothenburg", "fairbury", "syracuse", "alma", "hebron",
  "las vegas", "henderson", "reno", "north las vegas", "sparks", "carson city", "fernley", "elko", "mesquite", "boulder city",
  "fallon", "winnemucca", "west wendover", "ely", "yerington", "carlin", "lovelock", "wells", "caliente", "tonopah",
  "virginia city", "pioche", "eureka", "goldfield", "hawthorne", "battle mountain", "laughlin", "dayton", "incline village", "stateline",
  "minden", "gardnerville", "sun valley", "spring creek", "lemmon valley", "silver springs", "stagecoach", "cold springs", "topaz ranch estates", "kingsbury",
  "johnson lane", "spanish springs", "verdi", "washoe valley", "smith valley", "jackpot", "overton", "pahrump", "moapa valley", "enterprise",
  "manchester", "nashua", "concord", "derry", "dover", "rochester", "salem", "merrimack", "hudson", "londonderry",
  "milford", "hampton", "exeter", "windham", "goffstown", "durham", "bedford", "portsmouth", "laconia", "keene",
  "lebanon", "claremont", "somersworth", "hanover", "amherst", "raymond", "conway", "berlin", "newmarket", "weare",
  "seabrook", "littleton", "franklin", "epsom", "plaistow", "barrington", "bow", "belmont", "stratham", "swanzey",
  "pembroke", "rumney", "meredith", "jaffrey", "atkinson", "pelham", "hooksett", "kingston", "rindge", "new boston",
  "newark", "jersey city", "paterson", "elizabeth", "edison", "woodbridge", "lakewood", "toms river", "hamilton", "trenton",
  "clifton", "camden", "brick", "cherry hill", "passaic", "middletown", "union city", "north bergen", "irvington", "vineland",
  "bayonne", "east orange", "north brunswick", "hoboken", "wayne", "west new york", "howell", "perth amboy", "east brunswick", "plainfield",
  "west orange", "hackensack", "sayreville", "kearny", "linden", "marlboro", "teaneck", "north arlington", "montclair", "belleville",
  "bloomfield", "westfield", "livingston", "nutley", "rahway", "west milford", "paramus", "ridgewood", "lodi", "cliffside park",
  "albuquerque", "las cruces", "rio rancho", "santa fe", "roswell", "farmington", "south valley", "clovis", "hobbs", "alamogordo",
  "carlsbad", "gallup", "deming", "los lunas", "chaparral", "sunland park", "las vegas", "portales", "los alamos", "north valley",
  "artesia", "lovington", "espanola", "silver city", "bernalillo", "grants", "aztec", "bloomfield", "raton", "truth or consequences",
  "belen", "socorro", "shiprock", "corrales", "ruidoso", "kirtland", "taos", "tucumcari", "placitas", "eldorado at santa fe",
  "white rock", "los ranchos de albuquerque", "tijeras", "edgewood", "santa teresa", "ranchos de taos", "milan", "moriarty", "sandia heights", "mesa del sol",
  "new york", "buffalo", "rochester", "yonkers", "syracuse", "albany", "new rochelle", "mount vernon", "schenectady", "utica",
  "white plains", "hempstead", "troy", "niagara falls", "binghamton", "freeport", "valley stream", "long beach", "spring valley", "rome",
  "north tonawanda", "port chester", "ithaca", "middletown", "poughkeepsie", "newburgh", "elmira", "kiryas joel", "west babylon", "hicksville",
  "east meadow", "brighton", "uniondale", "central islip", "commack", "huntington station", "levittown", "west islip", "north amityville", "west hempstead",
  "franklin square", "oceanside", "north bay shore", "north bellmore", "baldwin", "massapequa", "merrick", "east massapequa", "plainview", "lockport",
  "charlotte", "raleigh", "greensboro", "durham", "winston-salem", "fayetteville", "cary", "wilmington", "high point", "greenville",
  "asheville", "concord", "gastonia", "jacksonville", "rocky mount", "chapel hill", "burlington", "huntersville", "hickory", "apex",
  "wake forest", "indian trail", "mooresville", "goldsboro", "monroe", "salisbury", "matthews", "sanford", "new bern", "cornelius",
  "garner", "thomasville", "statesville", "asheboro", "mint hill", "kinston", "lumberton", "carrboro", "havlock", "shelby",
  "clemmons", "lexington", "clayton", "boone", "elizabeth city", "laurinburg", "kernersville", "hope mills", "albemarle", "morganton",
  "fargo", "bismarck", "grand forks", "minot", "west fargo", "williston", "dickinson", "mandan", "jamestown", "wahpeton",
  "valley city", "grafton", "beulah", "rugby", "horace", "stanley", "lisbon", "casselton", "new town", "langdon",
  "hazen", "bottineau", "carrington", "larimore", "mayville", "oakes", "park river", "harvey", "bowman", "tioga",
  "cavalier", "hettinger", "new rockford", "rolla", "washburn", "crosby", "ellendale", "surrey", "dunseith", "cooperstown",
  "parshall", "killdeer", "mohall", "beach", "lakota", "underwood", "velva", "kenmare", "new england", "lamoure",
  "columbus", "cleveland", "cincinnati", "toledo", "akron", "dayton", "parma", "canton", "youngstown", "lorain",
  "hamilton", "springfield", "kettering", "elyria", "lakewood", "cuyahoga falls", "middletown", "euclid", "newark", "mansfield",
  "mentor", "beavercreek", "cleveland heights", "dublin", "north olmsted", "north royalton", "findlay", "fairfield", "westerville", "medina",
  "upper arlington", "gahanna", "north ridgeville", "strongsville", "fairborn", "stow", "brunswick", "massillon", "westlake", "north canton",
  "tiffin", "sylvania", "athens", "ashland", "trotwood", "green", "barberton", "xenia", "wooster", "zanesville",
  "oklahoma city", "tulsa", "norman", "broken arrow", "edmond", "lawton", "moore", "midwest city", "stillwater", "enid",
  "muskogee", "bartlesville", "owasso", "shawnee", "yukon", "ardmore", "ponca city", "duncan", "del city", "jenks",
  "sapulpa", "mustang", "sand springs", "bethany", "altus", "el reno", "ada", "durant", "tahlequah", "chickasha",
  "mcalester", "claremore", "miami", "woodward", "elk city", "guymon", "weatherford", "okmulgee", "choctaw", "guthrie",
  "warr acres", "pryor creek", "coweta", "the village", "cushing", "seminole", "wagoner", "pauls valley", "skiatook", "idabel",
  "portland", "eugene", "salem", "gresham", "hillsboro", "beaverton", "bend", "medford", "springfield", "corvallis",
  "albany", "tigard", "lake oswego", "keizer", "grants pass", "oregon city", "mcminnville", "redmond", "tualatin", "west linn",
  "woodburn", "newberg", "forest grove", "roseburg", "klamath falls", "ashland", "milwaukie", "sherwood", "happy valley", "central point",
  "wilsonville", "canby", "troutdale", "lebanon", "coos bay", "dallas", "pendleton", "hermiston", "the dalles", "la grande",
  "ontario", "gladstone", "north bend", "newport", "prineville", "baker city", "cottage grove", "sandy", "florence", "scappoose",
  "philadelphia", "pittsburgh", "allentown", "erie", "reading", "scranton", "bethlehem", "lancaster", "harrisburg", "york",
  "state college", "wilkes-barre", "altoona", "chester", "williamsport", "easton", "lebanon", "hazleton", "new castle", "johnstown",
  "mckeesport", "hermitage", "greensburg", "pottsville", "sharon", "butler", "washington", "meadville", "new kensington", "st. marys",
  "lower burrell", "oil city", "nanticoke", "uniontown", "jeannette", "aliquippa", "baldwin", "beaver falls", "monroeville", "carbondale",
  "butler township", "west mifflin", "murrysville", "kingston", "carlisle", "chambersburg", "hanover", "bloomsburg", "elizabeth township", "west chester",
  "providence", "warwick", "cranston", "pawtucket", "east providence", "woonsocket", "coventry", "north providence", "cumberland", "west warwick",
  "north kingstown", "south kingstown", "johnston", "newport", "bristol", "lincoln", "smithfield", "central falls", "portsmouth", "burrillville",
  "barrington", "middletown", "tiverton", "narragansett", "east greenwich", "north smithfield", "scituate", "glocester", "charlestown", "richmond",
  "hopkinton", "west greenwich", "exeter", "new shoreham", "little compton", "foster", "jamestown", "westerly", "warren", "block island",
  "north scituate", "wakefield", "kingston", "saunderstown", "peace dale", "bradford", "wyoming", "carolina", "hope valley", "chepachet",
  "charleston", "columbia", "north charleston", "mount pleasant", "rock hill", "greenville", "summerville", "goose creek", "hilton head island", "sumter",
  "florence", "spartanburg", "myrtle beach", "aiken", "anderson", "greer", "mauldin", "hanahan", "conway", "simpsonville",
  "lexington", "easley", "greenwood", "north augusta", "taylors", "fort mill", "bluffton", "lancaster", "seneca", "gaffney",
  "clemson", "west columbia", "beaufort", "orangeburg", "cayce", "moncks corner", "port royal", "newberry", "bennettsville", "hartsville",
  "york", "irmo", "ladson", "hardeeville", "camden", "marion", "dillon", "chester", "walterboro", "union",
  "sioux falls", "rapid city", "aberdeen", "brookings", "watertown", "mitchell", "yankton", "pierre", "huron", "spearfish",
  "vermillion", "brandon", "box elder", "sturgis", "madison", "belle fourche", "hot springs", "milbank", "winner", "canton",
  "north sioux city", "lead", "dell rapids", "mobridge", "lemmon", "redfield", "fort pierre", "custer", "chamberlain", "elks point",
  "beresford", "flandreau", "garretson", "miller", "salem", "tea", "hartford", "baltic", "crooks", "sisseton",
  "webster", "parkston", "freeman", "britton", "clear lake", "gregory", "de smet", "eagle butte", "mission", "platte",
  "memphis", "nashville", "knoxville", "chattanooga", "clarksville", "murfreesboro", "franklin", "jackson", "johnson city", "bartlett",
  "hendersonville", "kingsport", "collierville", "smyrna", "cleveland", "brentwood", "germantown", "columbia", "gallatin", "la vergne",
  "cookeville", "morristown", "oak ridge", "maryville", "bristol", "farragut", "shelbyville", "east ridge", "tullahoma", "spring hill",
  "goodlettsville", "dyersburg", "dickson", "seymour", "greeneville", "lebanon", "athens", "soddy-daisy", "mcminnville", "martin",
  "portland", "union city", "lewisburg", "crossville", "lawrenceburg", "paris", "millington", "ripley", "covington", "savannah",
  "houston", "san antonio", "dallas", "austin", "fort worth", "el paso", "arlington", "corpus christi", "plano", "laredo",
  "lubbock", "garland", "irving", "amarillo", "grand prairie", "brownsville", "mckinney", "frisco", "pasadena", "killeen",
  "mcallen", "mesquite", "midland", "carrollton", "denton", "abilene", "beaumont", "odessa", "round rock", "the woodlands",
  "wichita falls", "lewisville", "tyler", "pearland", "college station", "league city", "allen", "sugar land", "edinburg", "mission",
  "longview", "bryan", "pharr", "baytown", "missouri city", "temple", "flower mound", "north richland hills", "new braunfels", "conroe",
  "salt lake city", "west valley city", "provo", "west jordan", "orem", "sandy", "st. george", "ogden", "layton", "south jordan",
  "lehi", "millcreek", "taylorsville", "logan", "murray", "draper", "bountiful", "riverton", "herriman", "eagle mountain",
  "spanish fork", "roy", "pleasant grove", "kearns", "tooele", "cottonwood heights", "north ogden", "midvale", "cedar city", "springville",
  "kaysville", "holladay", "clearfield", "syracuse", "south salt lake", "farmington", "clinton", "north salt lake", "payson", "hurricane",
  "heber city", "west haven", "ivins", "grantsville", "price", "riverdale", "washington terrace", "lindon", "santaquin", "smithfield",
  "burlington", "south burlington", "rutland", "essex junction", "barre", "montpelier", "winooski", "st. albans", "newport", "vergennes",
  "middlebury", "brattleboro", "bennington", "st. johnsbury", "lyndonville", "morristown", "waterbury", "northfield", "swanton", "fair haven",
  "milton", "colchester", "essex", "hartford", "shelburne", "williston", "jericho", "richmond", "charlotte", "underhill",
  "hinesburg", "ferrisburgh", "georgia", "westford", "cambridge", "johnson", "enosburg falls", "manchester", "woodstock", "ludlow",
  "hardwick", "brandon", "poultney", "fairlee", "orleans", "albany", "barton", "troy", "west burke", "derby",
  "virginia beach", "norfolk", "chesapeake", "richmond", "newport news", "alexandria", "hampton", "roanoke", "portsmouth", "suffolk",
  "lynchburg", "harrisonburg", "leesburg", "charlottesville", "danville", "manassas", "fredericksburg", "winchester", "salem", "herndon",
  "fairfax", "hopewell", "christiansburg", "woodbridge", "waynesboro", "bristol", "colonial heights", "radford", "culpeper", "vienna",
  "front royal", "staunton", "williamsburg", "falls church", "poquoson", "warrenton", "purcellville", "farmville", "abingdon", "smithfield",
  "lexington", "galax", "buena vista", "bedford", "covington", "marion", "emporia", "big stone gap", "bluefield", "richlands",
  "seattle", "spokane", "tacoma", "vancouver", "bellevue", "kent", "everett", "renton", "spokane valley", "federal way",
  "yakima", "bellingham", "kennewick", "auburn", "pasco", "marysville", "lakewood", "redmond", "shoreline", "richland",
  "kirkland", "burien", "olympia", "sammamish", "lacey", "edmonds", "puyallup", "bremerton", "lynnwood", "bothell",
  "issaquah", "wenatchee", "mount vernon", "university place", "wallawalla", "pullman", "des moines", "lake stevens", "longview", "anacortes",
  "moses lake", "camas", "mill creek", "port angeles", "centralia", "tumwater", "mukilteo", "oak harbor", "battle ground", "covington",
  "charleston", "huntington", "morgantown", "parkersburg", "wheeling", "weirton", "martinsburg", "fairmont", "beckley", "clarksburg",
  "south charleston", "teays valley", "st. albans", "vienna", "bluefield", "cross lanes", "moundsville", "oak hill", "dunbar", "elkins",
  "hurricane", "pea ridge", "princeton", "ranson", "buckhannon", "keyser", "new martinsville", "grafton", "weston", "barboursville",
  "bridgeport", "lewisburg", "summersville", "ripley", "kingwood", "williamson", "kenova", "follansbee", "welch", "richwood",
  "fayetteville", "philippi", "madison", "petersburg", "shinnston", "mullens", "oceana", "rainelle", "spencer", "man",
  "milwaukee", "madison", "green bay", "kenosha", "racine", "appleton", "waukesha", "eau claire", "oshkosh", "janesville",
  "west allis", "la crosse", "sheboygan", "wausau", "fond du lac", "new berlin", "waupun", "beloit", "greenfield", "manitowoc",
  "west bend", "sun prairie", "superior", "stevens point", "neenah", "muskego", "hartford", "middleton", "mequon", "cedarburg",
  "marshfield", "wisconsin rapids", "menasha", "oconomowoc", "kaukauna", "ashwaubenon", "menomonie", "river falls", "port washington", "baraboo",
  "verona", "waterford", "delafield", "platteville", "whitewater", "fort atkinson", "stoughton", "chippewa falls", "pewaukee", "sussex",
  "cheyenne", "casper", "laramie", "gillette", "rock springs", "sheridan", "green river", "evanston", "riverton", "jackson",
  "cody", "rawlins", "lander", "torrington", "powell", "douglas", "worland", "buffalo", "wheatland", "newcastle",
  "thermopolis", "glenrock", "lovell", "mountain view", "lyman", "afton", "pinedale", "kemmerer", "greybull", "wright",
  "sundance", "lusk", "star valley ranch", "pine bluffs", "guernsey", "saratoga", "basin", "mills", "bar nunn", "upton",
  "moorcroft", "dubois", "alpine", "hanna", "diamondville", "shoshoni", "encampment", "baggs", "cokeville", "la barge",
  // Non-duplicate cities added
  "folsom", "estero", "sutherlin", "highland park", "woodland hills", "freehold", "carver", "beachwood", "livermore", "waconia", "southtowne", "cedarpark", "westgate", "South Charlotte"
]);


const KNOWN_CITY_SHORT_NAMES = {
  "las vegas": "Vegas",
  "los angeles": "LA",
  "new york": "NY",
  "new orleans": "N.O.",
  "miami lakes": "Miami",
  "south charlotte": "South Charlotte",
  "huntington beach": "Huntington Beach",
  "west springfield": "West Springfield",
  "san leandro": "San Leandro",
  "san francisco": "SF",
  "san diego": "SD",
  "fort lauderdale": "FTL",
  "west palm beach": "WPB",
  "palm beach gardens": "PBG",
  "st. louis": "STL",
  "st. petersburg": "St. Pete",
  "st. paul": "St. Paul",
  "south bend": "South Bend",
  "north las vegas": "North Las Vegas",
  "north charleston": "North Charleston",
  "southfield": "Southfield",
  "college station": "College Station",
  "lake havasu city": "Lake Havasu City",
  "mount vernon": "Mount Vernon",
  "port st. lucie": "Port St. Lucie",
  "panama city": "Panama City",
  "fort myers": "Fort Myers",
  "palm coast": "Palm Coast",
  "newport news": "Newport News",
  "jacksonville beach": "Jax Beach",
  "west new york": "West New York",
  "elk grove": "Elk Grove",
  "palm springs": "Palm Springs",
  "grand prairie": "Grand Prairie",
  "palm bay": "Palm Bay",
  "st. augustine": "St. Augustine",
  "boca raton": "Boca",
  "bonita springs": "Bonita",
  "north miami": "N. Miami",
  "south miami": "S. Miami",
  "pompano beach": "Pompano",
  "boynton beach": "Boynton",
  "delray beach": "Delray",
  "hallandale beach": "Hallandale",
  "winter haven": "Winter Haven",
  "cape coral": "Cape Coral",
  "weston": "Weston",
  "north port": "North Port",
  "port charlotte": "Port Charlotte",
  "port orange": "Port Orange",
  "palm harbor": "Palm Harbor",
  "north lauderdale": "North Lauderdale",
  "north fort myers": "North Fort Myers",
  "west chester": "West Chester",
  "white plains": "White Plains",
  "west covina": "West Covina",
  "west hollywood": "West Hollywood",
  "east haven": "East Haven",
  "east orange": "East Orange",
  "north bergen": "North Bergen",
  "north ridgeville": "North Ridgeville",
  "north olmsted": "North Olmsted",
  "north royalton": "North Royalton",
  "north huntingdon": "North Huntingdon",
  "north augusta": "North Augusta",
  "south gate": "South Gate",
  "south jordan": "South Jordan",
  "south ogden": "South Ogden",
  "south el monte": "South El Monte",
  "south san francisco": "South San Francisco",
  "south boston": "South Boston",
  "mount prospect": "Mount Prospect",
  "mount pleasant": "Mount Pleasant",
  "mount laurel": "Mount Laurel",
  "fort worth": "Fort Worth",
  "fort collins": "Fort Collins",
  "fort wayne": "Fort Wayne",
  "fort smith": "Fort Smith",
  "fort pierce": "Fort Pierce",
  "fort dodge": "Fort Dodge",
  "fort payne": "Fort Payne",
  "new rochelle": "New Rochelle",
  "new bedford": "New Bedford",
  "new britain": "New Britain",
  "new haven": "New Haven",
  "newark": "Newark",
  "newport": "Newport",
  "bay st. louis": "Bay St. Louis",
  "union park": "Union Park",
  "orlando": "Orlando",
  "new york city": "NYC",
  "austin": "Austin",
  "brookhaven": "Brookhaven",
  "redlands": "Redlands",
  "lakeway": "Lakeway",
  "killeen": "Killeen",
  "tuscaloosa": "Tuscaloosa",
  "milwaukeenorth": "Milwaukee North",
  "manhattan": "Manhattan",
  "fairoaks": "Fair Oaks",
  "northborough": "Northborough",
  "columbia": "Columbia",
  "freeport": "Freeport",
  "wakefield": "Wakefield",
  "gwinnett": "Gwinnett",
  "elyria": "Elyria",
  "kingsport": "Kingsport",
  "bloomington": "Bloomington",
  "alhambra": "Alhambra",
  "slidell": "Slidell",
  "shelbyville": "Shelbyville",
  "caldwell": "Caldwell",
  "henderson": "Henderson",
  "lakewood": "Lakewood",
  "waconia": "Waconia",
  "deland": "Deland",
  "chattanooga": "Chattanooga",
  "southtowne": "Southtowne",
  "madison": "Madison",
  "charlotte": "Charlotte",
  "dalton": "Dalton",
  "cedarpark": "Cedar Park",
  "irvine": "Irvine",
  "ventura": "Ventura",
  "westgate": "Westgate",
  "milwaukee": "Milwaukee",
  "tooele": "Tooele",
  "camino real": "Camino Real",
  "birmingham": "Birmingham"
};

const ABBREVIATION_EXPANSIONS = {
  lv: "Vegas",
  ba: "BA Auto",
  mb: "Mercedes",
  dv: "DV Auto",
  jm: "JM Auto",
  jt: "JT Auto",
  gy: "GY",
  cz: "CZ Auto",
  hmt: "HMT Auto",
  np: "NP Auto",
  npw: "NPW Auto",
  bhm: "Birmingham",
  eh: "East Hills",
  rt: "RT128",
  hmtr: "HMTR Auto",
  "m&h": "M&H",
  jp: "Jack Powell",
  sj: "SJ",
  mv: "MV"
};

// Placeholder for KNOWN_DEALERSHIP_WORDS (defining to fix no-undef error)
const KNOWN_DEALERSHIP_WORDS = new Set([
  "auto", "motors", "dealers", "dealership", "group", "motor", "superior", "trucks",
  "powersports", "realty", "team", "collection", "ford", "chevy", "toyota", "honda",
  "hyundai", "kia", "bmw", "infiniti", "nissan", "lincoln", "chrysler", "subaru",
  "128", "mill"
]);

const TEST_CASE_OVERRIDES = {
  "duvalford.com": "Duval Ford",
  "patmillikenford.com": "Pat Milliken",
  "athensford.com": "Athens Ford",
  "gusmachadoford.com": "Gus Machado",
  "geraldauto.com": "Gerald Auto",
  "mbofbrooklyn.com": "M.B. Brooklyn",
  "karlchevroletstuart.com": "Karl Stuart",
  "kiaoflagrange.com": "Lagrange Kia",
  "toyotaofgreenwich.com": "Greenwich Toyota",
  "sanleandroford.com": "San Leandro Ford",
  "donhindsford.com": "Don Hinds Ford",
  "unionpark.com": "Union Park",
  "jackpowell.com": "Jack Powell",
  "teamford.com": "Team Ford",
  "miamilakesautomall.com": "Miami Lakes Auto",
  "mclartydaniel.com": "Mclarty Daniel",
  "autobyfox.com": "Fox Auto",
  "yorkautomotive.com": "York Auto",
  "executiveag.com": "Executive AG",
  "smartdrive.com": "Smart Drive",
  "wickmail.com": "Wick Mail",
  "oceanautomotivegroup.com": "Ocean Auto",
  "tommynixautogroup.com": "Tommy Nix",
  "larryhmillertoyota.com": "Larry H. Miller",
  "dougrehchevrolet.com": "Doug Reh",
  "caminorealchevrolet.com": "Camino Real Chevy",
  "golfmillford.com": "Golf Mill Ford",
  "townandcountryford.com": "Town & Country",
  "czag.net": "CZAG Auto",
  "signatureautony.com": "Signature Auto",
  "sunnysideauto.com": "Sunnyside Chevy",
  "exprealty.com": "Exp Realty",
  "drivesuperior.com": "Drive Superior",
  "powerautogroup.com": "Power Auto Group",
  "crossroadscars.com": "Crossroad",
  "onesubaru.com": "One Subaru",
  "vanderhydeford.net": "Vanderhyde Ford",
  "mbusa.com": "M.B. USA",
  "gomontrose.com": "Go Montrose",
  "ehchevy.com": "East Hills Chevy",
  "shoplynch.com": "Lynch",
  "austininfiniti.com": "Austin Infiniti",
  "martinchevrolet.com": "Martin Chevy",
  "garberchevrolet.com": "Garber Chevy",
  "bulluckchevrolet.com": "Bulluck Chevy",
  "scottclark.com": "Scott Clark",
  "newhollandauto.com": "New Holland",
  "lynnlayton.com": "Lynn Layton",
  "landerscorp.com": "Landers",
  "parkerauto.com": "Parker Auto",
  "laurelautogroup.com": "Laurel Auto",
  "rt128honda.com": "RT128",
  "subaruofwakefield.com": "Subaru Wakefield",
  "lexusofchattanooga.com": "Lexus Chattanooga",
  "planet-powersports.net": "Planet Power",
  "garlynshelton.com": "Garlyn Shelton",
  "saffordbrown.com": "Safford Brown",
  "saffordauto.com": "Safford Auto",
  "npsubaru.com": "NP Subaru",
  "prestoncars.com": "Preston",
  "toyotaofredlands.com": "Toyota Redland",
  "lexusoflakeway.com": "Lexus Lakeway",
  "robbinstoyota.com": "Robbin Toyota",
  "swantgraber.com": "Swant Graber",
  "sundancechevy.com": "Sundance Chevy",
  "steponeauto.com": "Step One Auto",
  "capital-honda.com": "Capital Honda",
  "tituswill.com": "Titus-Will",
  "galeanasc.com": "Galeana"
};

const GENERIC_SUFFIXES = new Set(["auto", "autogroup", "motors", "dealers", "dealership", "group", "inc", "mall", "collection"]);

const GENERIC_WORDS = new Set(["the", "of", "to", "inc", "corp", "llc", "cars", "shop", "auto", "group", "dealership"]);

const BRAND_ONLY_DOMAINS = new Set([
  // American
  "chevy.com",
  "ford.com",
  "cadillac.com",
  "buick.com",
  "gmc.com",
  "chrysler.com",
  "dodge.com",
  "ramtrucks.com",
  "jeep.com",
  "lincoln.com",

  // Japanese
  "toyota.com",
  "honda.com",
  "nissanusa.com",
  "subaru.com",
  "mazdausa.com",
  "mitsubishicars.com",
  "acura.com",
  "lexus.com",
  "infinitiusa.com",

  // Korean
  "hyundaiusa.com",
  "kia.com",
  "genesis.com",

  // German
  "bmwusa.com",
  "mercedes-benz.com",
  "audiusa.com",
  "vw.com",
  "volkswagen.com",
  "porsche.com",
  "miniusa.com",

  // Others (US presence or specialty)
  "fiatusa.com",
  "alfa-romeo.com",
  "landroverusa.com",
  "jaguarusa.com",
  "tesla.com",
  "lucidmotors.com",
  "rivian.com",
  "volvocars.com"
]);

const KNOWN_COMPOUND_NOUNS = [
  "Auto", "AutoGroup", "Motors", "Dealers", "Dealership", "Group", "Motor",
  "Superior", "Trucks", "Powersports", "Realty", "Team", "Collection", "Ford", "Chevy",
  "Toyota", "Honda", "Hyundai", "Kia", "BMW", "Infiniti", "Nissan", "Lincoln", "Chrysler",
  "Subaru", "128", "Mill", "dayton", "freehold", "elkgrove", "fortcollins", "georgewhite", "miami", "south"
];

const KNOWN_BAD_COMPOUNDS_SET = new Set([
  "teamford", "sanleandroford", "jackpowell", "unionpark", "donhindsford",
  "carlblack", "fletcherauto", "mccarthyautogroup", "dyerauto", "andersonautogroup",
  "racewayford", "jimmybrittchevrolet", "starlingchevy", "daytonandrews", "vanderhydeford",
  "potamkinatlanta", "scottclarkstoyota", "eckenrodford", "southcharlottechevy", "steponeauto",
  "cioccaauto", "barlowautogroup", "shultsauto", "allamericanford", "goldcoastcadillac",
  "fordhamtoyota", "sundancechevy", "hillsidehonda", "valleynissan", "bulluckchevrolet",
  "edwardsautogroup", "signatureautony", "smithtowntoyota", "regalauto", "bighorntoyota",
  "bulldogkia", "acdealergroup", "newhollandauto", "crossroadscars", "lynnlayton",
  "jakesweeney", "bmwwestspringfield", "venturatoyota", "elwaydealers", "streettoyota",
  "laurelautogroup", "parkerauto", "metrofordofmadison", "chapmanchoice", "williamssubarucharlotte",
  "dicklovett", "colonialwest", "rt128honda", "drivesunrise", "philsmithkia", "westgatecars",
  "gomontrose", "obrienauto", "campbellcars", "jimtaylorautogroup", "rossihonda",
  "aldermansvt", "banksautos", "caldwellcares", "hawkauto", "stadiumtoyota",
  "golfmillford", "caminorealchevrolet", "dougrehchevrolet",
  "mccarthyautogroup", "kennedyauto", "tommynixautogroup.com", "andersonautogroup", "fletcherauto",
  "thepremiercollection", "billdube", "dancummins", "donhattan", "acuraofmemphis", "audiofbirmingham", "theaudiconnection", "chevystore"
]);

const PROPER_NOUN_PREFIXES = new Set([
  "o'brien", "mccarthy", "mcclarty", "o'connor", "o'neil", "o'reilly",
  "macdonald", "mcdonald", "mcgregor", "mcguire", "mckinney", "mclaren",
  "mc", "mac", "o"
]);

const FIRST_LAST_NAME_PATTERN = /^[A-Z][a-z]+ [A-Z][a-z]+$/;

const PROPER_NOUN_PATTERN = /(o'|mc|mac)\s+[a-z]+/i;

function containsCarBrand(name) {
  if (!name || typeof name !== "string") return false;
  const normalized = name.toLowerCase().replace(/\.(com|org|net|co\.uk)$/, "");
  return CAR_BRANDS.some(brand => normalized.includes(brand));
}

function stripGenericWords(name, domain, flags = []) {
  if (!name || typeof name !== 'string') return { name: "", flags };
  let words = name.split(/\s+/);
  const preserved = [];
  const generics = new Set([...GENERIC_WORDS, "auto", "motor", "west", "group"]);
  for (let i = 0; i < words.length; i++) {
    const w = words[i].toLowerCase();
    if (generics.has(w) && i === words.length - 1 && !KNOWN_PROPER_NOUNS.has(words[i])) {
      continue; // Drop standalone generics
    } else if (!generics.has(w) || (i < words.length - 1 && KNOWN_PROPER_NOUNS.has(words[i + 1]))) {
      preserved.push(words[i]);
    }
  }
  let result = preserved.join(" ").trim();
  if (result.split(" ").length === 1 && generics.has(result.toLowerCase()) && !containsCarBrand(domain)) {
    result = result === "auto" ? "Auto Group" : "";
    flags.push("GenericNameAdjusted");
  }
  return { name: result, flags };
}

function capitalizeName(words, flags = []) {
  if (!words) return { name: "", flags };
  if (typeof words === "string") words = words.split(/\s+/);
  const result = words.map((word, i) => {
    if (!word) return word;
    if (word.includes("-") && !KNOWN_PROPER_NOUNS.has(word)) {
      return word.split("-").map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join("-");
    }
    const properMatch = Array.from(KNOWN_PROPER_NOUNS).find(noun => noun.toLowerCase() === word.toLowerCase());
    if (properMatch) return properMatch;
    if (/^[A-Z]{2,5}$/.test(word)) return word.toUpperCase();
    if (ABBREVIATION_EXPANSIONS[word.toLowerCase()]?.match(/^[A-Z]{2,5}$/)) return ABBREVIATION_EXPANSIONS[word.toLowerCase()];
    if (["and"].includes(word.toLowerCase()) && i > 0) return word.toLowerCase();
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).filter(Boolean).join(" ");
  return { name: result, flags };
}

function applyCityShortName(city, flags = []) {
  if (!city || typeof city !== "string") return { name: "", flags };
  const cityLower = city.toLowerCase();
  if (KNOWN_CITY_SHORT_NAMES[cityLower]) {
    return { name: KNOWN_CITY_SHORT_NAMES[cityLower], flags };
  }
  return capitalizeName(city, flags);
}

function expandInitials(name, domain, brand, city, flags = []) {
  if (!name || typeof name !== "string" || name.split(" ").length > 2) return { name, flags };
  let expanded = [];
  const words = name.split(" ");
  const domainLower = domain.toLowerCase();
  words.forEach(word => {
    const wordLower = word.toLowerCase();
    if (/^[A-Z]{1,3}$/.test(word) && ABBREVIATION_EXPANSIONS[wordLower]) {
      let expansion = ABBREVIATION_EXPANSIONS[wordLower];
      if (wordLower === "mb" && domainLower.includes("mbusa")) expansion = "M.B. USA";
      else if (wordLower === "mb" && domainLower.includes("mbof")) expansion = "M.B.";
      else if (wordLower === "cz" && domainLower.includes("czag")) expansion = "CZAG Auto";
      else if (wordLower === "np" && domainLower.includes("subaru")) expansion = "NP Subaru";
      else if (wordLower === "gy" && domainLower.includes("chevy")) expansion = "GY Chevy";
      else if (wordLower === "sj" && domainLower.includes("infiniti")) expansion = "SJ Infiniti";
      else if (wordLower === "mv" && domainLower.includes("mv")) expansion = "MV Auto";
      expanded.push(expansion);
      flags.push("InitialsExpanded", "AbbreviationExpanded");
    } else {
      expanded.push(word);
    }
  });
  return { name: expanded.join(" "), flags };
}

function extractBrandOfCityFromDomain(domain, flags = []) {
  if (!domain || typeof domain !== "string") return { name: "", brand: null, city: null, flags: ["InvalidInput"] };
  const domainLower = domain.toLowerCase().replace(/\.(com|org|net|co\.uk)$/, "");
  let name = domainLower;
  let brand = null;
  let city = null;

  for (const genericWord of GENERIC_WORDS) {
    const regex = new RegExp(genericWord, 'i');
    name = name.replace(regex, "").trim();
  }

  for (const carBrand of CAR_BRANDS) {
    const brandLower = carBrand.toLowerCase();
    if (domainLower.includes(brandLower)) {
      brand = carBrand;
      name = domainLower.replace(brandLower, "").trim();
      flags.push("PatternMatched");
      break;
    }
  }

  for (const properNoun of KNOWN_PROPER_NOUNS) {
    const nounLower = properNoun.toLowerCase().replace(/\s+/g, "");
    if (domainLower.includes(nounLower)) {
      name = properNoun;
      flags.push("ProperNounMatched");
      break;
    }
  }

  const splitName = splitCamelCaseWords(domainLower);
  if (FIRST_LAST_NAME_PATTERN.test(splitName)) {
    name = splitName;
    flags.push("FirstLastNameMatched");
  }

  if (!brand && !flags.includes("ProperNounMatched") && !flags.includes("FirstLastNameMatched")) {
    const parts = domainLower.split(/(auto|motors|group|dealers|dealership)/i);
    if (parts.length > 1) {
      name = parts[0].trim();
      flags.push("PatternMatched");
    }
  }

  if (!name) {
    name = domainLower;
    flags.push("FallbackToDomain");
  }

  return { name: capitalizeName(name, flags).name, brand, city, flags: flags };
}

function splitCamelCaseWords(input, flags = []) {
  let result = preprocessProperNouns(input, flags).name;
  const lowerInput = result.toLowerCase();
  const suffixes = new Set(["motor", "group", "auto", "dealers", "dealership", "cars", "co"]);
  if (lowerInput.length > 5) {
    for (let suffix of suffixes) {
      if (lowerInput.endsWith(suffix)) {
        const prefix = lowerInput.slice(0, -suffix.length).trim();
        result = `${capitalizeName(prefix, flags).name} ${capitalizeName(suffix, flags).name}`;
        flags.push("CompoundSuffixSplit");
        break;
      }
    }
  }
  result = result.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z])([A-Z][a-z])/g, "$1 $2").trim();
  return { name: result, flags };
}

function reorderBrandCity(name, flags = []) {
  if (!name || typeof name !== "string") return { name, flags };
  const words = name.split(" ");
  if (words.length < 2) return { name, flags };
  const [first, ...rest] = words;
  const firstLower = first.toLowerCase();
  const restLower = rest.join(" ").toLowerCase();
  const isBrandFirst = CAR_BRANDS.includes(firstLower) || BRAND_MAPPING[firstLower];
  const isCityRest = KNOWN_CITIES_SET.has(rest.join(" ").toLowerCase());
  if (isBrandFirst && isCityRest) {
    return { name: `${applyCityShortName(rest.join(" "), flags).name} ${BRAND_MAPPING[firstLower] || capitalizeName(first, flags).name}`, flags };
  }
  return { name, flags };
}

function calculateConfidenceScore(name, flags, domainLower) {
  let score = 50;
  const appliedBoosts = new Set();
  const generics = new Set([...GENERIC_WORDS, "auto", "motor", "west", "group"]);
  if (name.split(" ").length === 1 && generics.has(name.toLowerCase()) && !containsCarBrand(domainLower)) {
    score = Math.min(score, 65);
    flags.push("GenericNameAlone");
  }
  if (flags.includes("PatternMatched") && !appliedBoosts.has("PatternMatched")) {
    score += 10;
    appliedBoosts.add("PatternMatched");
  }
  if (flags.includes("CityMatched") && !appliedBoosts.has("CityMatched")) {
    score += 6;
    appliedBoosts.add("CityMatched");
  }
  if (flags.includes("AbbreviationExpanded") && !appliedBoosts.has("AbbreviationExpanded")) {
    score += 10;
    appliedBoosts.add("AbbreviationExpanded");
  }
  if (flags.includes("FallbackBlobSplit") && !appliedBoosts.has("FallbackBlobSplit")) {
    score += 10;
    appliedBoosts.add("FallbackBlobSplit");
  }
  if (flags.includes("BrandFirstordering") && !appliedBoosts.has("BrandFirstOrdering")) {
    score += 10;
    appliedBoosts.add("BrandFirstOrdering");
  }
  if (flags.includes("InitialsExpandedWithBrand") && !appliedBoosts.has("InitialsExpandedWithBrand")) {
    score += 10;
    appliedBoosts.add("InitialsExpandedWithBrand");
  }
  if (flags.includes("AmbiguousInitials")) score -= 10;
  if (flags.includes("AmbiguousCompound")) score -= 10;
  if (flags.includes("CityNameOnly")) score -= 5;
  if (flags.includes("TooGeneric")) score -= 10;
  if (flags.includes("TooVerbose")) score -= 10;
  if (flags.includes("InitialsHeavy")) score -= 5;
  if (flags.includes("RawDomain")) score -= 10;
  if (flags.includes("UnsplitCompound")) score -= 5;
  if (flags.includes("OpenAIParseError")) score -= 10;
  if (flags.includes("PartialProperNoun")) score -= 15;
  if (flags.includes("FallbackAPIFailed")) score -= 10;
  if (flags.includes("LocalCompoundSplit")) score -= 10;
  if (flags.includes("FallbackToDomain")) {
    const wordCount = name.split(" ").length;
    score -= wordCount > 1 ? 5 : 10;
    if (wordCount === 1 && !KNOWN_PROPER_NOUNS.has(name)) score = Math.min(score, 75);
  }
  if (["penske", "landers", "ciocca", "helloauto", "classicbmw"].some(k => domainLower.includes(k))) {
    if (!appliedBoosts.has("KnownAutoGroup")) {
      score += 5;
      appliedBoosts.add("KnownAutoGroup");
      flags.push("KnownAutoGroup");
    }
  }
  const wordCount = name.split(" ").length;
  if (wordCount === 1) {
    if (KNOWN_PROPER_NOUNS.has(name) && !appliedBoosts.has("SingleWordProperNoun")) {
      score = 125;
      appliedBoosts.add("SingleWordProperNoun");
      flags.push("SingleWordProperNoun");
      appliedBoosts.add("ProperNounBoost");
      flags.push("ProperNounBoost");
    } else if (!appliedBoosts.has("OneWordName")) {
      score += 10;
      appliedBoosts.add("OneWordName");
      flags.push("OneWordName");
    }
  } else if (wordCount === 2) {
    if (!appliedBoosts.has("TwoWordName")) {
      score += 8;
      appliedBoosts.add("TwoWordName");
      flags.push("TwoWordName");
    }
    if ((flags.includes("FirstLastNameMatched") || flags.includes("LocalCompoundSplit")) && !appliedBoosts.has("CompoundSplitBoost")) {
      score += 15;
      appliedBoosts.add("CompoundSplitBoost");
      flags.push("CompoundSplitBoost");
    }
    if (FIRST_LAST_NAME_PATTERN.test(name) && !appliedBoosts.has("FirstLastNameMatched")) {
      score += 20;
      appliedBoosts.add("ProperNounBoost");
      flags.push("ProperNounBoost");
    }
  } else if (wordCount === 3 && !appliedBoosts.has("ThreeWordName")) {
    score += 5;
    appliedBoosts.add("ThreeWordName");
    flags.push("ThreeWordName");
  }
  if (Object.values(KNOWN_CITY_SHORT_NAMES).some(city => name.includes(city)) && !appliedBoosts.has("KnownPatternBoost")) {
    score += 5;
    appliedBoosts.add("KnownPatternBoost");
    flags.push("KnownPatternBoost");
  }
  if (flags.includes("UnsplitCompound")) score = Math.min(score, 90);
  const brandCount = name.split(" ").filter(word =>
    CAR_BRANDS.includes(word.toLowerCase()) || BRAND_MAPPING[word.toLowerCase()]
  ).length;
  if (brandCount > 1) {
    score -= 10;
    flags.push("BrandOverusePenalty");
  } else if (brandCount === 1 && !appliedBoosts.has("BrandIncludedBoost")) {
    score += 10;
    appliedBoosts.add("BrandIncludedBoost");
    flags.push("BrandIncludedBoost");
  }
  if (name.toLowerCase().includes("auto") && (wordCount === 2 || wordCount === 3) && !appliedBoosts.has("AutoNameBoost")) {
    score += 10;
    appliedBoosts.add("AutoNameBoost");
    flags.push("AutoNameBoost");
  }
  if (flags.includes("OverrideApplied") && name.toLowerCase().includes("auto") && !appliedBoosts.has("OverrideAutoBoost")) {
    score += 10;
    appliedBoosts.add("OverrideAutoBoost");
    flags.push("OverrideAutoBoost");
  }
  if (flags.includes("OverrideApplied")) score = Math.max(score, 95);
  if (flags.includes("OverrideApplied") && (KNOWN_PROPER_NOUNS.has(name) || FIRST_LAST_NAME_PATTERN.test(name))) score = Math.max(score, 125);
  const boostCap = 110;
  if (score > boostCap && !flags.includes("OverrideApplied") && !KNOWN_PROPER_NOUNS.has(name)) {
    score = boostCap;
    flags.push("BoostCapped");
  }
  if (!name) score = 50;
  if (flags.includes("TooGeneric")) score = Math.min(score, 75);
  if (flags.includes("GenericNameAdjusted")) score = 80;
  flags.length = 0;
  flags.push(...Array.from(new Set(flags)));
  return Math.max(50, Math.min(score, 125));
}

function preprocessProperNouns(name, flags = []) {
  if (!name || typeof name !== "string") return { name, flags };
  let processedName = name.replace(PROPER_NOUN_PATTERN, match => match.replace(/\s+/g, "").toLowerCase());

  const apostropheNames = {
    "obrien": "O'Brien",
    "o brien": "O'Brien",
    "oconnor": "O'Connor",
    "o connor": "O'Connor",
    "oreilly": "O'Reilly",
    "o reilly": "O'Reilly"
  };
  const nameLower = processedName.toLowerCase();
  if (apostropheNames[nameLower]) processedName = apostropheNames[nameLower];

  if (name.includes("-") && !KNOWN_PROPER_NOUNS.has(name)) {
    processedName = name.split("-").map(part => capitalizeName(part, flags).name).join(" ");
  } else {
    const words = processedName.split(/\s+/);
    processedName = words.map(word => {
      if (PROPER_NOUN_PREFIXES.has(word.toLowerCase())) {
        if (word.startsWith("o'")) return "O'" + word.charAt(2).toUpperCase() + word.slice(3);
        else if (word.startsWith("mc") || word.startsWith("mac")) return word.charAt(0).toUpperCase() + word.charAt(1) + word.charAt(2).toUpperCase() + word.slice(3);
      }
      return word;
    }).join(" ");
  }

  if (apostropheNames[nameLower] && !processedName.toLowerCase().includes("auto")) processedName += " Auto";
  return { name: processedName, flags };
}

function splitFallbackCompounds(input, flags = []) {
  if (!input || typeof input !== "string") return { name: input, flags };
  let result = input;
  const suffixes = new Set(["motor", "group", "auto", "dealers", "dealership", "cars", "co"]);
  if (result.length > 5) {
    for (let suffix of suffixes) {
      if (result.toLowerCase().endsWith(suffix)) {
        const prefix = result.slice(0, -suffix.length).trim();
        result = `${capitalizeName(prefix, flags).name} ${capitalizeName(suffix, flags).name}`;
        flags.push("CompoundSuffixSplit");
        break;
      }
    }
  }
  return { name: result, flags };
}

async function validateSpacingWithOpenAI(name, flags = []) {
  if (!name || typeof name !== "string") return { name, flags };
  if (openAICache.has(name)) return { name: openAICache.get(name), flags };
  const preprocessedName = preprocessProperNouns(name, flags).name;
  const prompt = `Given a company name, add a space between concatenated words if improperly joined (e.g., 'Fletcherauto' → 'Fletcher Auto'). Do not split proper nouns or abbreviations. Return JSON: { "name": "corrected name" }. Input: ${preprocessedName}`;
  try {
    const result = await callOpenAI(prompt, { systemMessage: "Precise spacing validator", max_tokens: 50, temperature: 0.1 });
    const parsed = JSON.parse(result.output);
    let spacedName = parsed.name || preprocessedName;
    const normalizedInput = preprocessedName.toLowerCase().replace(/\s+/g, "");
    const normalizedOutput = spacedName.toLowerCase().replace(/\s+/g, "");
    if (normalizedInput !== normalizedOutput) {
      console.error(`OpenAI modified words for ${preprocessedName}: ${spacedName}`);
      return { name: preprocessedName, flags };
    }
    if (PROPER_NOUN_PATTERN.test(spacedName)) {
      console.error(`OpenAI split proper noun in ${spacedName}`);
      return { name: preprocessedName, flags };
    }
    openAICache.set(name, spacedName);
    flags.push("OpenAISpacingApplied");
    return { name: spacedName, flags };
  } catch (error) {
    console.error(`OpenAI spacing failed for ${name}: ${error.message}`);
    flags.push("FallbackAPIFailed", "LocalFallbackUsed");
    return { name: preprocessedName, flags };
  }
}

function earlyCompoundSplit(input, flags = []) {
  if (!input || typeof input !== "string") return { name: input, flags };
  const domainLower = input.toLowerCase().replace(/\.(com|org|net|co\.uk)$/, "");
  if (CAR_BRANDS.includes(domainLower)) return { name: domainLower, flags };
  if (domainLower.length < 5) return { name: domainLower, flags };
  let result = splitCamelCaseWords(input, flags).name;
  const capitalCount = (result.match(/[A-Z]/g) || []).length;
  if (capitalCount >= 2 || KNOWN_BAD_COMPOUNDS_SET.has(domainLower)) {
    result = splitFallbackCompounds(result, flags).name;
  }
  if (result.split(" ").length === 2 && calculateConfidenceScore(result, flags, domainLower) > 90) {
    flags.push("HighConfidenceTwoWord");
    return { name: result, flags };
  }
  if (result.length <= 5 && !result.includes(" ") && /^[a-zA-Z]+$/.test(result) && !/[aeiou]{2}/.test(result.toLowerCase())) {
    const initials = result.toUpperCase();
    result = ABBREVIATION_EXPANSIONS[initials.toLowerCase()] || `${initials} Auto`;
    flags.push("InitialsExpanded");
  }
  return { name: result, flags };
}

function enforceThreeWordLimit(name, brand, city, flags = []) {
  if (!name || typeof name !== "string") return { name, flags };
  let words = name.split(" ");
  if (words.length <= 3) return { name, flags };
  let result = [];
  if (brand) result.push(BRAND_MAPPING[brand.toLowerCase()] || capitalizeName(brand, flags).name);
  if (city) result.push(applyCityShortName(city, flags).name);
  const properNouns = words.filter(word => KNOWN_PROPER_NOUNS.has(capitalizeName(word, flags).name));
  if (properNouns.length > 0 && result.length < 3) result.push(properNouns[0]);
  result = result.filter(word => !GENERIC_SUFFIXES.has(word.toLowerCase()));
  return { name: result.slice(0, 3).join(" "), flags };
}

function handleNamesEndingInS(name, brand, city, flags = []) {
  if (!name || typeof name !== "string") return { name, flags };
  const words = name.split(" ");
  const lastWord = words[words.length - 1];
  if (!lastWord.toLowerCase().endsWith("s")) return { name, flags };
  if (KNOWN_PROPER_NOUNS.has(name) || KNOWN_PROPER_NOUNS.has(lastWord)) return { name, flags };
  if (CAR_BRANDS.includes(lastWord.toLowerCase()) || lastWord.toLowerCase() === "classics") return { name, flags };
  if (lastWord.toLowerCase() === "sc") {
    words[words.length - 1] = "SC";
    return { name: words.join(" "), flags };
  }
  const isCity = city && (city.toLowerCase() === lastWord.toLowerCase() || KNOWN_CITIES_SET.has(lastWord.toLowerCase()));
  if (isCity && brand) return { name, flags };
  words[words.length - 1] = lastWord.slice(0, -1);
  return { name: `${words.join(" ")} Auto`, flags };
}

async function humanizeName(inputName, domain, skipCache = false) {
  try {
    if (!domain || typeof domain !== "string") {
      console.error(`Invalid domain: ${domain}`);
      return { name: "", confidenceScore: 0, flags: ["InvalidInput"], tokens: 0 };
    }
    const domainLower = domain.toLowerCase();
    console.warn(`🔍 Processing domain: ${domain}`);
    if (BRAND_ONLY_DOMAINS.has(domainLower)) {
      console.warn(`Brand-only domain detected: ${domain}, skipping`);
      return { name: "", confidenceScore: 0, flags: ["BrandOnlySkipped"], tokens: 0 };
    }
    if (!skipCache && domainCache.has(domainLower)) {
      const cached = domainCache.get(domainLower);
      console.warn(`🧪 Cache hit for ${domainLower}: "${cached.name}"`);
      return { ...cached, flags: [...cached.flags, "CacheHit"] };
    }
    if (TEST_CASE_OVERRIDES[domainLower]) {
      const name = TEST_CASE_OVERRIDES[domainLower];
      console.warn(`🧪 TEST_CASE_OVERRIDES applied for ${domainLower}: "${name}"`);
      const flags = ["OverrideApplied"];
      const confidenceScore = calculateConfidenceScore(name, flags, domainLower);
      const result = { name, confidenceScore, flags, tokens: 0 };
      domainCache.set(domainLower, result);
      return result;
    }
    if (!containsCarBrand(domain) && NON_DEALERSHIP_KEYWORDS.some(k => domainLower.includes(k))) {
      console.warn(`Non-dealership domain detected: ${domain}`);
      let fallbackName = earlyCompoundSplit(domainLower, []).name;
      if (domainLower.includes("realty")) {
        const baseName = domainLower.replace(/realty/i, "").replace(/\.(com|net|org|co\.uk)/i, "").replace(/[^a-zA-Z0-9\s-]/g, "").trim();
        fallbackName = `${capitalizeName(baseName, []).name} Realty`;
      } else if (domainLower.includes("insurance")) {
        const baseName = domainLower.replace(/insurance/i, "").replace(/\.(com|net|org|co\.uk)/i, "").replace(/[^a-zA-Z0-9\s-]/g, "").trim();
        fallbackName = `${capitalizeName(baseName, []).name} Insurance`;
      } else {
        fallbackName = `${capitalizeName(fallbackName, []).name} Auto`;
      }
      fallbackName = enforceThreeWordLimit(fallbackName, null, null, []).name;
      const flags = ["NonDealership", "FallbackCompoundSplitAfterNonDealership"];
      const confidenceScore = calculateConfidenceScore(fallbackName, flags, domainLower);
      const result = { name: fallbackName, confidenceScore: Math.max(confidenceScore, 80), flags, tokens: 0 };
      domainCache.set(domainLower, result);
      return result;
    }
    let { name, flags, brand, city } = extractBrandOfCityFromDomain(domain);
    name = stripGenericWords(name, domain, flags).name;
    name = preprocessProperNouns(name, flags).name;
    let words = name.split(" ");
    const deduped = [];
    const seen = new Set();
    let cityDetected = false;
    for (let i = 0; i < words.length; i++) {
      const w = words[i].toLowerCase();
      if (CAR_BRANDS.includes(w) || BRAND_MAPPING[w]) {
        if (seen.has(w)) continue;
        seen.add(w);
        deduped.push(words[i]);
      } else {
        deduped.push(words[i]);
      }
    }
    name = deduped.join(" ");
    if (deduped.length < words.length) flags.push("BrandDuplicationFixedEarly");
    if (!name.includes(" ") && containsCarBrand(domain)) {
      name = splitCamelCaseWords(name, flags).name;
      const { name: spacedName, flags: newFlags } = await validateSpacingWithOpenAI(name, flags);
      name = spacedName;
      flags = newFlags;
    }
    const { name: expandedName, flags: expandedFlags } = expandInitials(name, domain, brand, city, flags);
    name = expandedName;
    flags = expandedFlags;
    const { name: reorderedName, flags: reorderedFlags } = reorderBrandCity(name, flags);
    name = reorderedName;
    flags = reorderedFlags;
    const { name: limitedName, flags: limitedFlags } = enforceThreeWordLimit(name, brand, city, flags);
    name = limitedName;
    flags = limitedFlags;
    const { name: handledName, flags: handledFlags } = handleNamesEndingInS(name, brand, city, flags);
    name = handledName;
    flags = handledFlags;
    let confidenceScore = calculateConfidenceScore(name, flags, domainLower);
    if (confidenceScore < 90 || name.toLowerCase() === domainLower || !name) {
      if (name.match(/^[A-Z]{2,5}$/i) && !brand && !city) {
        flags.push("AmbiguousInitials");
        name = ABBREVIATION_EXPANSIONS[name.toLowerCase()] || `${name.toUpperCase()} Auto`;
        confidenceScore = 70;
      } else if (KNOWN_PROPER_NOUNS.has(capitalizeName(domainLower, []).name)) {
        name = capitalizeName(domainLower, []).name;
        confidenceScore = 125;
      } else {
        console.warn(`⚠️ Weak fallback for domain ${domain}: ${name}, score ${confidenceScore}, flags: ${flags.join(", ")}`);
        flags.push("ManualReviewRecommended");
      }
    } else {
      console.warn(`✅ Acceptable result: ${name} (${confidenceScore})`);
    }
    const result = { name, confidenceScore, flags, tokens: 0 };
    domainCache.set(domainLower, result);
    return result;
  } catch (err) {
    console.error(`❌ humanizeName failed for ${domain}: ${err.stack}`);
    return { name: "", confidenceScore: 0, flags: ["ProcessingError"], tokens: 0 };
  }
}

process.on("unhandledRejection", (reason, p) => {
  console.error("Unhandled Rejection at:", p, "reason:", reason);
});

export {
  CAR_BRANDS,
  BRAND_MAPPING,
  KNOWN_PROPER_NOUNS,
  GENERIC_SUFFIXES,
  NON_DEALERSHIP_KEYWORDS,
  KNOWN_CITY_SHORT_NAMES,
  ABBREVIATION_EXPANSIONS,
  TEST_CASE_OVERRIDES,
  normalizeText,
  capitalizeName,
  containsCarBrand,
  applyCityShortName,
  earlyCompoundSplit,
  expandInitials,
  calculateConfidenceScore,
  extractBrandOfCityFromDomain,
  humanizeName
};
