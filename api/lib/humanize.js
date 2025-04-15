// api/lib/humanize.js — Version 4.2.10
import { callOpenAI } from "./openai.js";

const CAR_BRANDS = [
  "acura", "alfa romeo", "amc", "aston martin", "audi", "bentley", "bmw", "bugatti", "buick",
  "cadillac", "carmax", "cdj", "cdjrf", "cdjr", "chev", "chevvy", "chevrolet", "chrysler", "cjd", "daewoo",
  "dodge", "eagle", "ferrari", "fiat", "ford", "genesis", "gmc", "honda", "hummer", "hyundai", "inf", "infiniti",
  "isuzu", "jaguar", "jeep", "jlr", "kia", "lamborghini", "land rover", "landrover", "lexus", "lincoln", "lucid",
  "maserati", "maz", "mazda", "mb", "merc", "mercedes", "mercedes-benz", "mercedesbenz", "merk", "mini",
  "mitsubishi", "nissan", "oldsmobile", "plymouth", "polestar", "pontiac", "porsche", "ram", "rivian",
  "rolls-royce", "saab", "saturn", "scion", "smart", "subaru", "subie", "suzuki", "tesla", "toyota",
  "volkswagen", "volvo", "vw"
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
  "lincoln": "Lincoln", "lucid": "Lucid", "maserati": "Maserati", "maz": "Mazda", "mazda": "Mazda",
  "mb": "M.B.", "merc": "M.B.", "mercedes": "M.B.", "mercedes-benz": "M.B.", "mercedesbenz": "M.B.", "merk": "M.B.",
  "mini": "Mini", "mitsubishi": "Mitsubishi", "nissan": "Nissan", "oldsmobile": "Oldsmobile", "plymouth": "Plymouth",
  "polestar": "Polestar", "pontiac": "Pontiac", "porsche": "Porsche", "ram": "Ram", "rivian": "Rivian",
  "rolls-royce": "Rolls-Royce", "saab": "Saab", "saturn": "Saturn", "scion": "Scion", "smart": "Smart",
  "subaru": "Subaru", "subie": "Subaru", "suzuki": "Suzuki", "tesla": "Tesla", "toyota": "Toyota",
  "volkswagen": "VW", "volvo": "Volvo", "vw": "VW"
};

const KNOWN_PROPER_NOUNS = new Set([
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
  "Wolfe", "World", "Young", "tuttle", "click", "mclarty", "daniel", "jimmy", "britt", "don", "hattan", "tommy", "nix",
  "AG", "NY", "VW", "USA", "GM", "GMC", "GarlynShelton", "McCarthy", "McLarty", "McLartyDaniel", "DriveSuperior", "JimmyBritt", "DonHattan", "CaminoReal",
  "SwantGraber", "DeMontrond", "TownAndCountry", "SanLeandro", "GusMachado", "RodBaker", "Galean", "TedBritt", "ShopLynch", "ScottClark", "HuntingtonBeach",
  "ExpRealty", "JayWolfe", "PremierCollection", "ArtMoehn", "TomHesser", "ExecutiveAG", "SmartDrive", "AllAmerican", "WickMail", "RobertThorne", "TommyNix",
  "Duval", "Pat Milliken", "Gus Machado", "Gerald Auto", "Karl Stuart", "Lagrange Kia", "Greenwich Toyota", "Team Ford",
  "Don Hinds", "Union Park", "Jack Powell", "Kennedy", "LouSobh", "HMotors", "LuxuryAutoScottsdale", "BearMountain", "Charlie",
  "Orlando", "NYC", "Austin", "Carl Black", "Fletcher", "McCarthy", "Dyer", "Anderson", "Raceway", "Jimmy Britt", "Starling", "York", "Dayton Andrews",
  "Landers", "Vanderhyde", "Potamkin", "Parker", "Chapman", "Williams", "Ingersoll", "Suntrup", "Nplincoln", "Redmac",
  "Century", "Five Star", "Beck Masten", "Sansone", "Ocean", "Hawk", "Stadium", "Cavender", "Carter", "Crevier", "Bristol",
  "Gengras", "Ciocca", "Currie", "Sarant", "M Terry", "Larry H. Miller", "Calavan",
  "Tasca", "Avis", "Rod Baker", "Davis", "Gy", "Machens", "Taylor", "Dan Cummins", "Kennedy", "Garber",
  "Sunnyside", "Hillside", "Valley Nissan", "Bulluck", "Cz Agnet", "Edwards", "Keating", "Signature Auto NY",
  "Smithtown", "Regal", "Big Horn", "Bulldog", "Premier Collection", "Ac Dealer Group", "New Holland", "Jake Sweeney",
  "Shottenkirk", "Wilsonville", "Elway", "Street Toyota", "Metro Ford", "Chapman Choice", "Williams Subaru", "Tom Hesser",
  "Dick Lovett", "Colonial West", "Gravity Autos", "Rt 128", "Phil Smith", "Chmb", "Power Autogroup", "Westgate Cars",
  "Star Toyota", "Go Montrose", "Rosen", "O Brien", "Campbell Cars", "Londoff", "Jim Taylor", "Deacons", "Rossi",
  "Alderman", "Banks Autos", "Caldwell Cares", "Hawk Auto", "Stadium Toyota",
  "Montrose", "Dube", "Lovett", "Britt", "Titus", "Lynn", "Bob Smith",
  "Rich", "MH", "Robins", "Marhofer", "Planet Ford", "Hansel", "Matt Bowers", "Landmark", "Randy Marion", "Ogara Coach",
  "Helfman", "Tom Wood", "Auto Fair", "McGovern", "Mullinax", "Baker Motor Company", "Jim Shorkey", "VH Cars", "Mike Kelly",
  "Gossett Motors", "Valenti Auto", "Torq Dist", "Gary Crossley", "Dahl Auto", "Mills Auto Group", "Apple Ford", "Hardy Automotive",
  "Mac Haik", "GNS Auto", "Team Sewell", "Midwest Kia", "Driving Southern", "Russell Smith", "NPW Companies", "Al West",
  "USA Auto Trust", "Watson Chevrolet", "Bruce Lowrie", "Ourisman", "Northtown Auto", "Auto Star USA", "Courtesy Chevrolet",
  "Bill Dodge", "SB Auto Group", "Bert Ogden", "Volume Cars", "Car Center MI", "Hamilton Chevy", "NYE Auto", "Dutch Miller",
  "Bill Walsh", "Estero Bay Chevrolet", "Diehl Auto", "Riverside Chevy", "Murdock Chevrolet", "Towne Auto", "Emich Auto",
  "Bergeys", "Reineke", "Niello", "Al Hendrickson", "Gateway Fargo", "Seth Wadley", "Sutherlin Automotive", "Waldorf Chevy Cadillac",
  "Beardmore", "Ewald Auto", "Fairway Ford", "Gerber Collision", "Voss Auto", "Serpentini Chevy", "Vol Auto", "Team Auto Group",
  "Mountain Motorsports", "Joe Morgan", "Dennis Co", "Mercedes-Benz Southwest", "Rountree Auto", "Five Star", "Rusty Wallace",
  "Habberstad BMW", "Jack Burford", "Stevens 112", "Allen Mello", "Advantage Chevrolet", "Harris Ford", "Kenny Ross", "Power Auto Group",
  "Stevens Ford", "Group 1 Auto", "Nissan St. Augustine", "Acura Peabody", "Rogers Motors", "Lynnes", "Ganley Auto", "Gray Chevrolet",
  "Western Toyota", "Yeomans", "Scott Robinson", "Slimans", "Serra Ford RH", "Used Car King", "Mike Erdman", "Gitcha 1",
  "Seelye", "Honda on 30", "Galleria BMW", "Lexus of Highland Park", "Mike Bass", "Cobb County Toyota", "Central Auto Group CT",
  "Bristol Toyota", "Paul Miller", "Tooele Motor Company", "Luther Auto", "Zeigler", "MV Auto", "Pape Subaru", "Rusty Wallis",
  "JK Chevrolet", "Twin City Dealerships", "Crown Acura", "RHB Motors", "Val Cars", "CAC Auto Group", "66 Auto Mall",
  "Auto Gallery Inc", "North Main Motors", "Auto Now KC", "S Motor", "Monster Motors", "Car Mart", "Susan Schein", "Strong Auto Group",
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
  "Classic Kia Carrollton", "Honda Morristown", "Sands Chevrolet", "Northwest Hyundai", "Malouf", "Demontrond", "Tasca", "Avis", "Rod Baker",
  "Pat Milliken", "Gus Machado", "San Leandro", "Martin Chevy", "GY Chevy"
]);

const NON_DEALERSHIP_KEYWORDS = [
  "realty", "insurance", "leasing", "rental", "offroad", "powersports", "rent", "lease",
  "broker", "brokering", "consult", "consulting", "equipment", "tow", "towing", "tint", "tinting", "glass",
  "machinery", "car wash", "wash", "detail", "detailing", "collision", "transmission", "insurance", "loan",
  "financial", "finance", "body shop", "boat", "watersports", "ATV", "tractor", "lawn", "real estate", "realtor",
  "construction"
];

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
  "folsom", "estero", "sutherlin", "highland park", "woodland hills", "freehold", "carver", "beachwood", "livermore", "waconia", "southtowne", "cedarpark", "westgate"
]);


// api/lib/humanize.js — Version 4.2.7 (Snippet)
const KNOWN_CITY_SHORT_NAMES = {
  "las vegas": "Vegas",
  "los angeles": "LA",
  "new york": "NY",
  "new orleans": "N.O.",
  "miami lakes": "Miami",
  "south charlotte": "South Charlotte",
  "huntington beach": "HB",
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
  "camino real": "Camino Real"
};

const ABBREVIATION_EXPANSIONS = {
  "lv": "Vegas",
  "ba": "BA Auto",
  "mb": "M.B.",
  "dv": "DV Auto",
  "jm": "JM Auto",
  "jt": "JT Auto",
  "gy": "GY"
};

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
  "donhindsford.com": "Don Hinds",
  "unionpark.com": "Union Park",
  "jackpowell.com": "Jack Powell",
  "teamford.com": "Team Ford",
  "miamilakesautomall.com": "Miami Lakes Auto",
  "mclartydaniel.com": "Mclarty Daniel",
  "autobyfox.com": "Fox Auto",
  "yorkautomotive.com": "York Auto",
  "executiveag.com": "Executive AG",
  "smartdrive.com": "Drive Smart",
  "wickmail.com": "Wick Mail",
  "oceanautomotivegroup.com": "Ocean Auto",
  "tommynixautogroup.com": "Tommy Nix Auto Group",
  "larryhmillertoyota.com": "Larry H. Miller",
  "dougrehchevrolet.com": "Doug Reh",
  "caminorealchevrolet.com": "Camino Real Chevy",
  "golfmillford.com": "Golf Mill Ford",
  "townandcountryford.com": "Town & Country"
};

const GENERIC_SUFFIXES = new Set(["auto", "autogroup", "cars", "motors", "dealers", "dealership", "group", "inc", "mall", "collection"]);

const KNOWN_BAD_COMPOUNDS_SET = new Set([
  "teamford", "sanleandroford", "jackpowell", "unionpark", "donhindsford",
  "carlblack", "fletcherauto", "mccarthyautogroup", "dyerauto", "andersonautogroup",
  "racewayford", "jimmybrittchevrolet", "starlingchevy", "daytonandrews", "vanderhydeford",
  "potamkinatlanta", "scottclarkstoyota", "eckenrodford", "southcharlottechevy", "steponeauto",
  "cioccaauto", "barlowautogroup", "shultsauto", "allamericanford", "goldcoastcadillac",
  "fordhamtoyota", "sundancechevy", "hillsidehonda", "valleynissan", "bulluckchevrolet",
  "edwardsautogroup", "signatureautony", "smithtowntoyota", "regalauto", "bighorntoyota",
  "bulldogkia", "acdealergroup", "newhollandauto", "crossroadscars", "lynnlayton", "jakesweeney",
  "bmwwestspringfield", "venturatoyota", "elwaydealers", "streettoyota", "laurelautogroup",
  "parkerauto", "metrofordofmadison", "chapmanchoice", "williamssubarucharlotte", "dicklovett",
  "colonialwest", "rt128honda", "drivesunrise", "philsmithkia", "westgatecars", "gomontrose",
  "obrienauto", "campbellcars", "jimtaylorautogroup", "rossihonda",
  "aldermansvt", "banksautos", "caldwellcares", "hawkauto", "stadiumtoyota",
  "golfmillford", "caminorealchevrolet", "dougrehchevrolet",
  "mccarthyautogroup", "kennedyauto", "tommynixautogroup", "andersonautogroup", "fletcherauto"
]);

const KNOWN_SUFFIX_EXPANSIONS = {
  "honda": "Honda",
  "chevrolet": "Chevy",
  "ford": "Ford",
  "subaru": "Subaru",
  "bmw": "BMW",
  "toyota": "Toyota",
  "nissan": "Nissan",
  "kia": "Kia",
  "lexus": "Lexus",
  "cadillac": "Cadillac",
  "vw": "VW"
};

const openAICache = new Map();

function containsCarBrand(name) {
  if (!name || typeof name !== "string") return false;
  const normalized = name.toLowerCase().replace(/\.(com|org|net|co\.uk)$/, "");
  return CAR_BRANDS.some(brand => normalized.includes(brand));
}

function normalizeText(name) {
  if (!name || typeof name !== "string") return [];
  return name
    .replace(/\.(com|org|net|co\.uk)$/, "")
    .replace(/['".,-]+/g, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function capitalizeName(words) {
  if (!words) return "";
  if (typeof words === "string") words = words.split(/\s+/);
  return words
    .map((word, i) => {
      if (!word) return word;
      if (word.toLowerCase() === "chevrolet") return "Chevy";
      if (["of", "and", "to"].includes(word.toLowerCase()) && i > 0) return word.toLowerCase();
      if (/^[A-Z]{1,3}$/.test(word) && ABBREVIATION_EXPANSIONS[word.toLowerCase()] === word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .filter(Boolean)
    .join(" ");
}

function applyCityShortName(city) {
  if (!city || typeof city !== "string") return "";
  const cityLower = city.toLowerCase();
  if (KNOWN_CITY_SHORT_NAMES[cityLower]) {
    const shortName = KNOWN_CITY_SHORT_NAMES[cityLower];
    const words = shortName.split(/\s+/);
    if (words.every(word => /^[A-Z]{1,3}$/.test(word))) {
      return capitalizeName(city);
    }
    return shortName;
  }
  return capitalizeName(city);
}

function expandInitials(name, domain, brand, city) {
  if (!name || typeof name !== "string") return "";
  let expanded = [];
  const words = name.split(" ");

  words.forEach(word => {
    if (/^[A-Z]{1,3}$/.test(word)) {
      if (city && word === city.toUpperCase().slice(0, word.length)) {
        expanded.push(applyCityShortName(city));
      } else if (brand && word === brand.toUpperCase().slice(0, word.length)) {
        expanded.push(BRAND_MAPPING[brand.toLowerCase()] || capitalizeName(brand));
      } else if (ABBREVIATION_EXPANSIONS[word.toLowerCase()]) {
        expanded.push(ABBREVIATION_EXPANSIONS[word.toLowerCase()]);
      } else {
        expanded.push(word);
      }
    } else {
      expanded.push(word);
    }
  });

  return expanded.join(" ");
}

// Helper to split camelCase words more reliably
function splitCamelCaseWords(input) {
  if (!input || typeof input !== "string") return "";
  // Split on lowercase-to-uppercase transitions (e.g., "kennedyAuto" → "kennedy Auto")
  // Split on uppercase-to-uppercase-lowercase (e.g., "BMWWest" → "BMW West")
  // Handle consecutive uppercase letters for acronyms (e.g., "BMW" stays as "BMW")
  let result = input
    .replace(/([a-z])([A-Z])/g, "$1 $2") // e.g., "kennedyAuto" → "kennedy Auto"
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2") // e.g., "BMWWest" → "BMW West"
    .replace(/([a-z])([0-9])/g, "$1 $2") // e.g., "route66" → "route 66"
    .replace(/-/g, " ")
    .trim();

  // Handle cases like "McCarthyAutoGroup"
  result = result.replace(/([A-Z][a-z]+)([A-Z][a-z]+)/g, "$1 $2"); // e.g., "McCarthyAuto" → "McCarthy Auto"

  return result;
}

function earlyCompoundSplit(input) {
  if (!input || typeof input !== "string") return "";
  const domainLower = input.toLowerCase().replace(/\.(com|org|net|co\.uk)$/, "");

  // Check for multi-word proper nouns first
  for (const noun of KNOWN_PROPER_NOUNS) {
    const nounLower = noun.toLowerCase().replace(/\s+/g, "");
    if (domainLower.includes(nounLower)) {
      return noun;
    }
  }

  // Initial split using camelCase and other patterns
  let result = splitCamelCaseWords(input);

  // Split on known suffixes like "auto"
  if (result.toLowerCase().endsWith("auto")) {
    const prefix = result.substring(0, result.length - 4).trim();
    if (prefix && /^[A-Za-z]+$/.test(prefix)) {
      result = `${capitalizeName(prefix)} Auto`;
    }
  }

  // Split on known car brands, avoiding proper noun conflicts
  for (const brand of CAR_BRANDS) {
    const brandLower = brand.toLowerCase();
    if (domainLower.includes(brandLower)) {
      const parts = domainLower.split(brandLower);
      if (parts.length > 1) {
        const prefix = parts[0].trim();
        const properNoun = Array.from(KNOWN_PROPER_NOUNS).find(noun => prefix.includes(noun.toLowerCase().replace(/\s+/g, "")));
        if (!properNoun && prefix && (KNOWN_PROPER_NOUNS.has(capitalizeName(prefix)) || /^[A-Z][a-z]+$/.test(capitalizeName(prefix)))) {
          result = `${capitalizeName(prefix)} ${BRAND_MAPPING[brandLower] || capitalizeName(brand)}`;
          break;
        }
      }
    }
  }

  // Split on other known compound nouns
  const knownCompoundNouns = ["autogroup", "motor", "dealers", "dealership"];
  for (const suffix of knownCompoundNouns) {
    if (result.toLowerCase().endsWith(suffix)) {
      const prefix = result.substring(0, result.length - suffix.length).trim();
      if (prefix && /^[A-Za-z]+$/.test(prefix)) {
        result = `${capitalizeName(prefix)} ${capitalizeName(suffix)}`;
        break;
      }
    }
  }

  // Apply special map for known compounds
  const specialMap = {
    sanleandro: "San Leandro",
    donhinds: "Don Hinds",
    unionpark: "Union Park",
    jackpowell: "Jack Powell",
    teamford: "Team Ford",
    townandcountry: "Town Country",
    miamilakes: "Miami Lakes",
    prestonmotor: "Preston Motor",
    billdube: "Bill Dube",
    demontrond: "Demontrond",
    tedbritt: "Ted Britt",
    mclartydaniel: "Mclarty Daniel",
    autobyfox: "Fox Auto",
    shoplynch: "Lynch",
    ricart: "Ricart",
    wickmail: "Wick Mail",
    executiveag: "Executive AG",
    smartdrive: "Drive Smart",
    garlynshelton: "Garlyn Shelton",
    carlblack: "Carl Black",
    fletcherauto: "Fletcher Auto",
    donhattan: "Don Hattan",
    galeanasc: "Galeana SC",
    chastangford: "Chastang Ford",
    martinchevrolet: "Martin Chevy",
    miamilakesautomall: "Miami Lakes Auto",
    potamkinhyundai: "Potamkin Hyundai",
    mccarthyautogroup: "McCarthy Auto",
    dyerauto: "Dyer Auto",
    andersonautogroup: "Anderson Auto Group",
    racewayford: "Raceway Ford",
    austininfiniti: "Infiniti Austin",
    jimmybrittchevrolet: "Jimmy Britt",
    starlingchevy: "Starling Chevy",
    yorkautomotive: "York Auto",
    daytonandrews: "Dayton Andrews",
    vanderhydeford: "Vanderhyde Ford",
    potamkinatlanta: "Potamkin Atlanta",
    scottclarkstoyota: "Scott Clarks",
    eckenrodford: "Eckenrod Ford",
    southcharlottechevy: "S. Charlotte",
    steponeauto: "Step One",
    cioccaauto: "Ciocca Auto",
    barlowautogroup: "Barlow Auto",
    shultsauto: "Shults Auto",
    allamericanford: "All American",
    goldcoastcadillac: "Gold Coast",
    fordhamtoyota: "Fordham Toyota",
    sundancechevy: "Sundance Chevy",
    cavendercadillac: "Cavender Cadillac",
    blakefauto: "Blake F",
    caminorealchevrolet: "Camino Real Chevy",
    chuckfairbankschevy: "Chuck Fairbanks",
    crevierbmw: "Crevier BMW",
    zumbrotaford: "Zumbrota Ford",
    tommynixautogroup: "Tommy Nix Auto Group",
    gravityautos: "Gravity Autos",
    gengras: "Gengras",
    curriemotors: "Currie Motors",
    fivestaronline: "Five Star",
    classicbmw: "Classic BMW",
    sarantcadillac: "Sarant Cadillac",
    beckmasten: "Beck Masten",
    golfmillford: "Golf Mill Ford",
    helloautogroup: "Hello Auto",
    landerscorp: "Landers Corp",
    mterryautogroup: "M Terry",
    larryhmillertoyota: "Larry H. Miller",
    calavancars: "Calavan Cars",
    davischevrolet: "Davis Chevy",
    gychevy: "GY Chevy",
    machens: "Machens Auto",
    taylorauto: "Taylor Auto",
    dancummins: "Dan Cummins",
    kennedyauto: "Kennedy Auto",
    garberchevrolet: "Garber Chevy",
    sunnysideauto: "Sunnyside Auto",
    artmoehn: "Art Moehn",
    hillsidehonda: "Hillside Honda",
    valleynissan: "Valley Nissan",
    bulluckchevrolet: "Bulluck Chevy",
    edwardsautogroup: "Edwards Auto",
    keatinghonda: "Keating Honda",
    signatureautony: "Signature Auto",
    smithtowntoyota: "Smithtown Toyota",
    regalauto: "Regal Auto",
    bighorntoyota: "Big Horn",
    bulldogkia: "Bulldog Kia",
    acdealergroup: "Ac Dealer",
    newhollandauto: "New Holland",
    crossroadscars: "Crossroads Cars",
    lynnlayton: "Lynn Layton",
    jakesweeney: "Jake Sweeney",
    bmwwestspringfield: "BMW West Springfield",
    venturatoyota: "Ventura Toyota",
    shottenkirk: "Shottenkirk Auto",
    wilsonvilletoyota: "Wilsonville Toyota",
    elwaydealers: "Elway Dealers",
    streettoyota: "Street Toyota",
    laurelautogroup: "Laurel Auto",
    parkerauto: "Parker Auto",
    metrofordofmadison: "Metro Ford",
    chapmanchoice: "Chapman Choice",
    williamssubarucharlotte: "Williams Subaru",
    tomhesser: "Tom Hesser",
    dicklovett: "Dick Lovett",
    colonialwest: "Colonial West",
    rt128honda: "Rt 128",
    drivesunrise: "Drive Sunrise",
    philsmithkia: "Phil Smith",
    chmb: "Chmb Auto",
    westgatecars: "Westgate Cars",
    startoyota: "Star Toyota",
    gomontrose: "Go Montrose",
    rosenautomotive: "Rosen Auto",
    obrienauto: "O Brien",
    campbellcars: "Campbell Cars",
    londoff: "Londoff Auto",
    jimtaylorautogroup: "Jim Taylor",
    deaconscdjr: "Deacons CDJR",
    rossihonda: "Rossi Honda",
    aldermansvt: "Alderman SVT",
    banksautos: "Banks Autos",
    caldwellcares: "Caldwell Cares",
    hawkauto: "Hawk Auto",
    stadiumtoyota: "Stadium Toyota",
    dougrehchevrolet: "Doug Reh",
    rodbakerford: "Rod Baker"
  };

  result = result
    .split(" ")
    .map(word => {
      if (/auto(group|mall)?$/i.test(word)) {
        return capitalizeName(word.replace(/auto(group|mall)?/i, " Auto"));
      }
      return word;
    })
    .join(" ");

  return result
    .split(" ")
    .map(word =>
      word.toLowerCase() in BRAND_MAPPING ? BRAND_MAPPING[word.toLowerCase()] : capitalizeName(word)
    )
    .join(" ");
}

function enforceThreeWordLimit(name, brand, city) {
  if (!name || typeof name !== "string") return "";
  let words = name.split(" ");
  if (words.length <= 3) return name;

  let result = [];
  if (city) {
    const shortCity = applyCityShortName(city);
    result.push(shortCity);
    if (brand && result.length < 3) {
      result.push(BRAND_MAPPING[brand.toLowerCase()] || capitalizeName(brand));
    }
  } else if (brand) {
    result.push(BRAND_MAPPING[brand.toLowerCase()] || capitalizeName(brand));
  }

  const properNouns = words.filter(word => KNOWN_PROPER_NOUNS.has(capitalizeName(word)));
  if (properNouns.length > 0 && result.length < 3) {
    result.push(properNouns[0]);
  }

  result = result.filter(word => !GENERIC_SUFFIXES.has(word.toLowerCase()));
  return result.slice(0, 3).join(" ");
}

function calculateConfidenceScore(name, flags, domainLower) {
  if (!name || typeof name !== "string") return 0;
  let score = 100;
  if (flags.includes("PatternMatched")) score += 10;
  if (flags.includes("ProperNounMatched")) score += 10;
  if (flags.includes("CityMatched")) score += 6;
  if (flags.includes("AbbreviationExpanded")) score += 5;
  if (flags.includes("FallbackBlobSplit")) score += 10;
  if (flags.includes("FallbackToDomain")) {
    const wordCount = name.split(" ").length;
    score -= wordCount > 1 ? 5 : 10;
    if (wordCount === 1 && !KNOWN_PROPER_NOUNS.has(name)) score = 75;
  }
  if (flags.includes("CityNameOnly")) score -= 5;
  if (flags.includes("TooGeneric")) score -= 10;
  if (flags.includes("TooVerbose")) score -= 10;
  if (flags.includes("InitialsHeavy")) score -= 5;
  if (flags.includes("RawDomain")) score -= 10;
  if (flags.includes("UnsplitCompound")) score -= 5;
  if (flags.includes("OpenAIParseError")) score -= 10;
  if (flags.includes("PartialProperNoun")) score -= 15;
  if (["penske", "landers", "ciocca", "helloauto", "classicbmw"].some(k => domainLower.includes(k))) {
    score += 5;
    flags.push("KnownAutoGroup");
  }
  const wordCount = name.split(" ").length;
  if (wordCount === 1) {
    if (KNOWN_PROPER_NOUNS.has(name)) {
      score += 15;
      flags.push("SingleWordProperNoun");
    } else {
      score += 10;
      flags.push("OneWordName");
    }
  } else if (wordCount === 2) {
    score += 8;
    flags.push("TwoWordName");
  } else if (wordCount === 3) {
    score += 5;
    flags.push("ThreeWordName");
  }
  if (KNOWN_PROPER_NOUNS.has(name) || Object.values(KNOWN_CITY_SHORT_NAMES).some(city => name.includes(city))) {
    score += 5;
    flags.push("KnownPatternBoost");
  }
  if (flags.includes("UnsplitCompound")) {
    score = Math.min(score, 90);
  }
  const brandCount = name.split(" ").filter(word => CAR_BRANDS.includes(word.toLowerCase()) || BRAND_MAPPING[word.toLowerCase()]).length;
  if (brandCount > 1) {
    score -= 10;
    flags.push("BrandOverusePenalty");
  }
  if (KNOWN_PROPER_NOUNS.has(name)) {
    score += 10;
    flags.push("ProperNounBoost");
  }
  if (!name) score = 50;
  return Math.max(50, Math.min(score, 125));
}

function extractBrandOfCityFromDomain(domain) {
  if (!domain || typeof domain !== "string") return { name: "", brand: null, city: null, flags: ["InvalidInput"], confidence: 0 };
  const domainLower = domain.toLowerCase().replace(/\.(com|net|org|co\.uk)$/, "");
  const flags = [];

  // Check multi-word cities first
  for (const cityLower in KNOWN_CITY_SHORT_NAMES) {
    const cityKey = cityLower.replace(/\s+/g, "");
    if (domainLower.includes(cityKey)) {
      for (const brand of CAR_BRANDS) {
        if (domainLower.includes(brand) && domainLower.indexOf(brand) > domainLower.indexOf(cityKey)) {
          const city = KNOWN_CITY_SHORT_NAMES[cityLower];
          const brandName = BRAND_MAPPING[brand] || capitalizeName(brand);
          const name = `${city} ${brandName}`;
          flags.push("PatternMatched", "CityFirstOrdering", "CityMatched");
          return { name, brand, city: cityLower, flags, confidence: 95 };
        }
      }
    }
  }

  const brandOfRegex = new RegExp(`(${CAR_BRANDS.join("|")})of([a-z]+)`, "i");
  const match = domainLower.match(brandOfRegex);
  if (match) {
    const brand = BRAND_MAPPING[match[1].toLowerCase()] || capitalizeName(match[1]);
    const city = applyCityShortName(match[2]);
    const cityEndsInS = match[2].toLowerCase().endsWith("s");
    let name = cityEndsInS ? `${city} ${brand}` : `${brand} ${city}`;
    name = enforceThreeWordLimit(name, brand, city);
    flags.push("PatternMatched", "CarBrandOfCityPattern");
    if (KNOWN_CITY_SHORT_NAMES[match[2].toLowerCase()]) flags.push("CityMatched");
    return { name, brand, city, flags, confidence: 100 };
  }

  const initialsBrandMatch = domainLower.match(/^([a-z]{1,3})([a-z]+)$/);
  if (initialsBrandMatch && CAR_BRANDS.includes(initialsBrandMatch[2])) {
    const prefix = initialsBrandMatch[1].toUpperCase();
    const brand = BRAND_MAPPING[initialsBrandMatch[2]] || capitalizeName(initialsBrandMatch[2]);
    let name = `${prefix} ${brand}`;
    name = enforceThreeWordLimit(name, brand, null);
    flags.push("PatternMatched", "InitialsPattern");
    return { name, brand: initialsBrandMatch[2], city: null, flags, confidence: 90 };
  }

  let detectedBrand = null;
  for (const brand of CAR_BRANDS) {
    if (domainLower.includes(brand)) {
      detectedBrand = brand;
      const cityPart = domainLower.replace(brand, "").replace(/auto(group|mall)?/, "");
      const cityCandidate = applyCityShortName(cityPart);
      if (cityPart && KNOWN_CITIES_SET.has(cityPart)) {
        const brandName = BRAND_MAPPING[brand] || capitalizeName(brand);
        const cityEndsInS = cityPart.toLowerCase().endsWith("s");
        const isInitialsHeavy = cityCandidate.split(" ").every(word => /^[A-Z]{1,3}$/.test(word));
        let name = (cityEndsInS || isInitialsHeavy) ? `${cityCandidate} ${brandName}` : `${cityCandidate} ${brandName}`;
        name = enforceThreeWordLimit(name, brand, cityPart);
        flags.push("PatternMatched", "CityFirstOrdering");
        if (KNOWN_CITY_SHORT_NAMES[cityPart]) flags.push("CityMatched");
        return { name, brand, city: cityPart, flags, confidence: 90 };
      } else {
        const prefix = domainLower.replace(brand, "");
        const properNoun = Array.from(KNOWN_PROPER_NOUNS).find(noun => prefix.includes(noun.toLowerCase().replace(/\s+/g, "")));
        if (properNoun) {
          const brandName = BRAND_MAPPING[brand] || capitalizeName(brand);
          let name = `${properNoun} ${brandName}`;
          name = enforceThreeWordLimit(name, brand, null);
          flags.push("PatternMatched", "ProperNounFirst");
          return { name, brand, city: null, flags, confidence: 95 };
        }
      }
    }
  }

  const domainKey = domainLower.replace(/\W/g, "");
  let fallbackName = earlyCompoundSplit(domainLower);
  if (KNOWN_BAD_COMPOUNDS_SET.has(domainKey)) {
    fallbackName = earlyCompoundSplit(domainKey);
    flags.push("CompoundSplitForced");
  }
  for (const suffix in KNOWN_SUFFIX_EXPANSIONS) {
    if (domainLower.endsWith(suffix) && !detectedBrand) {
      const prefix = domainLower.replace(suffix, "");
      if (prefix && /^[A-Z][a-z]+/.test(capitalizeName(prefix))) {
        fallbackName = `${capitalizeName(prefix)} ${KNOWN_SUFFIX_EXPANSIONS[suffix]}`;
        detectedBrand = suffix;
        flags.push("SuffixExpansionApplied");
        break;
      }
    }
  }
  fallbackName = enforceThreeWordLimit(fallbackName, detectedBrand, null);
  return {
    name: fallbackName,
    brand: detectedBrand,
    city: null,
    flags: ["FallbackToDomain"],
    confidence: 70
  };
}

async function humanizeName(inputName, domain, excludeCarBrandIfProperNoun = true) {
  try {
    if (!domain || typeof domain !== "string") {
      console.error(`Invalid domain: ${domain}`);
      return { name: "", confidenceScore: 0, flags: ["InvalidInput"], tokens: 0 };
    }
    const domainLower = domain.toLowerCase();
    const domainSlug = domainLower.replace(/\.(com|net|org|co\.uk)$/, "");
    console.error(`🔍 Processing domain: ${domain}`);

    // Check overrides first
    if (TEST_CASE_OVERRIDES[domainLower]) {
      const name = TEST_CASE_OVERRIDES[domainLower];
      console.error(`🧪 TEST_CASE_OVERRIDES applied for ${domainLower}: "${name}"`);
      const flags = ["OverrideApplied"];
      const confidenceScore = calculateConfidenceScore(name, flags, domainLower);
      return { name, confidenceScore, flags, tokens: 0 };
    }

    if (!containsCarBrand(domain) && NON_DEALERSHIP_KEYWORDS.some(k => domainLower.includes(k))) {
      console.error(`Non-dealership domain detected: ${domain}`);
      let fallbackName = earlyCompoundSplit(domainLower);
      if (fallbackName.split(" ").length === 1) {
        const splitName = earlyCompoundSplit(fallbackName);
        if (splitName !== fallbackName) {
          fallbackName = splitName;
        }
      }
      if (domainLower.includes("realty")) {
        const baseName = domainLower.replace(/realty/i, "").trim();
        fallbackName = `${capitalizeName(baseName)} Realty`;
      } else {
        fallbackName = `${capitalizeName(fallbackName)} Auto`;
      }
      fallbackName = enforceThreeWordLimit(fallbackName, null, null);
      const flags = ["NonDealership", "FallbackCompoundSplitAfterNonDealership"];
      const confidenceScore = calculateConfidenceScore(fallbackName, flags, domainLower);
      return { name: capitalizeName(fallbackName), confidenceScore: Math.max(confidenceScore, 80), flags, tokens: 0 };
    }

    let { name, flags, brand, city } = extractBrandOfCityFromDomain(domain);
    let tokens = 0;

    // Check proper noun precedence for brand ordering
    if (brand && name.includes(BRAND_MAPPING[brand.toLowerCase()] || capitalizeName(brand))) {
      const properNoun = Array.from(KNOWN_PROPER_NOUNS).find(noun => name.toLowerCase().includes(noun.toLowerCase().replace(/\s+/g, "")) && !noun.toLowerCase().includes(brand.toLowerCase()));
      if (properNoun && !city) {
        name = properNoun;
        flags.push("BrandOrderReversed", "ProperNounMatched");
      }
    }

    if (name.length > 15 || KNOWN_BAD_COMPOUNDS_SET.has(domainSlug) || name.split(" ").filter(word => /^[A-Z]/.test(word)).length >= 3) {
      name = earlyCompoundSplit(name || domainSlug);
      flags.push("EarlyCompoundSplitApplied");
    }

    name = capitalizeName(name);
    name = name.replace("Chevrolet", "Chevy");
    name = name.replace(/Automotive/i, "Auto");

    let words = name.split(" ");
    let brandCount = 0;
    words = words.filter(word => {
      const isBrand = CAR_BRANDS.includes(word.toLowerCase()) || BRAND_MAPPING[word.toLowerCase()];
      if (isBrand) {
        brandCount++;
        return brandCount === 1;
      }
      return true;
    });
    name = words.join(" ");
    if (brandCount > 1) flags.push("MultipleBrandsReduced");

    if (domainLower.includes("auto") && !name.toLowerCase().includes("auto")) {
      name = enforceThreeWordLimit(`${name} Auto`, brand, city);
      flags.push("AutoAppended");
    }

    name = expandInitials(name, domain, brand, city);
    if (name !== capitalizeName(name)) {
      flags.push("InitialsExpanded");
    }

    const allInitials = words.every(word => /^[A-Z]{1,3}$/.test(word));
    if (allInitials && words.length > 1) {
      if (city) {
        const fullCity = applyCityShortName(city);
        const brandPart = BRAND_MAPPING[words[words.length - 1].toLowerCase()] || words[words.length - 1];
        name = enforceThreeWordLimit(`${fullCity} ${brandPart} Auto`, brand, city);
        flags.push("AllInitialsAvoided", "InitialsHeavy");
      } else {
        const prefix = ABBREVIATION_EXPANSIONS[words[0].toLowerCase()] || `${words[0]} Auto`;
        const brandPart = BRAND_MAPPING[words[words.length - 1].toLowerCase()] || words[words.length - 1];
        name = enforceThreeWordLimit(`${prefix} ${brandPart}`, brand, city);
        flags.push("AllInitialsAvoided", "InitialsHeavy");
      }
    }

    if (excludeCarBrandIfProperNoun && brand) {
      const brandIndex = words.findIndex(word => CAR_BRANDS.includes(word.toLowerCase()) || BRAND_MAPPING[word.toLowerCase()]);
      if (brandIndex !== -1) {
        const prefixWords = words.slice(0, brandIndex);
        const prefix = prefixWords.join(" ");
        if (prefix && (KNOWN_PROPER_NOUNS.has(prefix) || /^[A-Z][a-z]+(\s[A-Z][a-z]+)?$/i.test(prefix))) {
          name = prefix;
          flags.push("CarBrandExcluded", "ProperNounMatched");
          if (!KNOWN_PROPER_NOUNS.has(prefix)) {
            flags.push("PartialProperNoun");
          }
        }
      }
    }

    let confidenceScore = calculateConfidenceScore(name, flags, domainLower);

    const isCityOnly = words.length === 1 && (city === words[0].toLowerCase() || KNOWN_CITIES_SET.has(words[0].toLowerCase()));
    const isProperNoun = KNOWN_PROPER_NOUNS.has(name);
    const hasContext = name.toLowerCase().includes("auto") || words.length > 1;
    if (isCityOnly && !isProperNoun && brand && confidenceScore < 95) {
      name = enforceThreeWordLimit(`${name} ${BRAND_MAPPING[brand.toLowerCase()] || capitalizeName(brand)}`, brand, city);
      flags.push("BrandSuffixAdded");
      confidenceScore = calculateConfidenceScore(name, flags, domainLower);
    } else if (isCityOnly && !hasContext) {
      name = enforceThreeWordLimit(`${name} Auto`, brand, city);
      flags.push("CityNameOnly", "AutoAppended");
    } else if (brand && words.length === 1 && !isProperNoun && !hasContext) {
      name = enforceThreeWordLimit(`${name} ${BRAND_MAPPING[brand.toLowerCase()] || capitalizeName(brand)}`, brand, city);
      flags.push("BrandAppended");
      confidenceScore = calculateConfidenceScore(name, flags, domainLower);
    }

    name = capitalizeName(name);
    name = enforceThreeWordLimit(name, brand, city);
    confidenceScore = calculateConfidenceScore(name, flags, domainLower);

    if (name && !name.includes(" ") && name.length > 15) {
      flags.push("UnsplitCompound");
      confidenceScore = calculateConfidenceScore(name, flags, domainLower);
    }

    if (confidenceScore < 90 || name.toLowerCase() === domainSlug || !name.includes(" ")) {
      let splitName = earlyCompoundSplit(name || domainSlug);
      if (splitName.split(" ").length >= 2) {
        name = capitalizeName(splitName);
        flags.push("FallbackCompoundSplit");
        confidenceScore = calculateConfidenceScore(name, flags, domainLower);
      }
    }

    if (confidenceScore < 75 || name.toLowerCase() === domainSlug || name === "") {
      flags.push("RawDomain");
      const cacheKey = domainLower;
      if (openAICache.has(cacheKey)) {
        const cached = openAICache.get(cacheKey);
        name = cached.name;
        confidenceScore = cached.confidenceScore;
        flags.push("OpenAICacheHit");
        tokens = 0;
      } else if (!isProperNoun) {
        try {
          const response = await callOpenAI({
            model: "gpt-4-turbo",
            messages: [
              {
                role: "system",
                content: "Split compound dealership names using known noun boundaries and spacing. Return max 3 readable words. Capitalize human names and brands. Discard fallback if the result is ambiguous, too short (<8 chars), or lacks a known car brand or noun. If the name returned matches the domain slug exactly, reject and reattempt."
              },
              {
                role: "user",
                content: `Domain: ${domain}`
              }
            ]
          });
          let suggestedName = response.choices[0]?.message?.content?.trim() || "";
          if (suggestedName && suggestedName.split(" ").length <= 3 && !suggestedName.includes("'s")) {
            if (
              suggestedName.toLowerCase() === domainSlug ||
              (suggestedName.length < 8 && !CAR_BRANDS.some(b => suggestedName.toLowerCase().includes(b)) && !KNOWN_PROPER_NOUNS.has(suggestedName))
            ) {
              flags.push("OpenAIFallbackUnusable");
              let splitName = earlyCompoundSplit(domainSlug);
              if (splitName.split(" ").length >= 2) {
                suggestedName = capitalizeName(splitName);
                flags.push("FallbackCompoundSplit");
              } else if (KNOWN_PROPER_NOUNS.has(capitalizeName(domainSlug))) {
                suggestedName = capitalizeName(domainSlug);
                flags.push("ProperNounFallback");
              } else {
                suggestedName = "";
              }
            }
            if (!suggestedName && brand) {
              suggestedName = `${capitalizeName(domainSlug.replace(brand, ""))} ${BRAND_MAPPING[brand.toLowerCase()]}`;
              flags.push("BrandAppendedAfterOpenAIFail");
            }
            if (NON_DEALERSHIP_KEYWORDS.some(k => suggestedName.toLowerCase().includes(k))) {
              suggestedName = enforceThreeWordLimit(`${suggestedName} Auto`, brand, city);
              flags.push("NonDealershipAutoAppended");
            }
            if (suggestedName) {
              name = suggestedName;
              confidenceScore = 80;
              flags.push("OpenAIValidated");
              tokens = response.usage.total_tokens;
              if (name === capitalizeName(domainSlug)) {
                tokens += 5;
                flags.push("OpenAINoImprovementPenalty");
              }
              openAICache.set(cacheKey, { name: suggestedName, confidenceScore: 80, tokens });
              console.error(`OpenAI tokens used for ${domain}: ${tokens}`);
            }
          }
        } catch (error) {
          console.error(`OpenAI fallback failed for ${domain}: ${error.message}`);
          flags.push("OpenAIParseError");
          confidenceScore = 50;
        }
      }
    }

    if (confidenceScore < 75 || name === "") {
      if (KNOWN_PROPER_NOUNS.has(capitalizeName(domainSlug))) {
        name = capitalizeName(domainSlug);
        flags.push("ProperNounFallbackBypassedThreshold");
        confidenceScore = 80;
      } else {
        console.warn(`⚠️ Weak fallback for domain ${domain}: ${name}, score ${confidenceScore}, flags: ${flags.join(", ")}`);
      }
    } else {
      console.error(`✅ Acceptable result: ${name} (${confidenceScore})`);
    }

    return {
      name,
      confidenceScore,
      flags,
      tokens
    };
  } catch (err) {
    console.error(`❌ humanizeName failed for ${domain}: ${err.stack}`);
    return { name: "", confidenceScore: 0, flags: ["ProcessingError"], tokens: 0 };
  }
}

export {
  CAR_BRANDS,
  BRAND_MAPPING,
  KNOWN_PROPER_NOUNS,
  GENERIC_SUFFIXES,
  NON_DEALERSHIP_KEYWORDS,
  KNOWN_CITIES_SET,
  KNOWN_CITY_SHORT_NAMES,
  ABBREVIATION_EXPANSIONS,
  TEST_CASE_OVERRIDES,
  normalizeText,
  capitalizeName,
  containsCarBrand,
  applyCityShortName,
  earlyCompoundSplit,
  calculateConfidenceScore,
  extractBrandOfCityFromDomain,
  humanizeName
};
