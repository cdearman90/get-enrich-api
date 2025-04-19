// api/batch-enrich.js v4.2.48
// Batch orchestration for domain enrichment

import {
  humanizeName,
  extractBrandOfCityFromDomain,
  capitalizeName,
  expandInitials,
  earlyCompoundSplit
} from "./lib/humanize.js";
import { fallbackName, clearOpenAICache } from "./batch-enrich-company-name-fallback.js";
import winston from "winston";
import path from "path";
import fs from "fs";
import { buffer } from "micro";

// Disable Vercel's default body parser for manual parsing in vercel dev mode
export const config = {
  api: {
    bodyParser: false
  }
};

// Initialize Winston logger
const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join("logs", "enrich.log"),
      maxsize: 5242880,
      maxFiles: 5
    }),
    new winston.transports.Console()
  ]
});

// Ensure logs directory exists
const logDir = path.join(process.cwd(), "logs");
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    logger.info("Created logs directory", { logDir });
  }
} catch (err) {
  logger.error("Failed to create logs directory", { error: err.message, stack: err.stack });
}

// Log server startup
logger.info("Module loading started", { version: "4.2.48" });

// Verify dependencies
const dependencies = {
  humanizeName: typeof humanizeName === "function",
  extractBrandOfCityFromDomain: typeof extractBrandOfCityFromDomain === "function",
  capitalizeName: typeof capitalizeName === "function",
  expandInitials: typeof expandInitials === "function",
  earlyCompoundSplit: typeof earlyCompoundSplit === "function",
  fallbackName: typeof fallbackName === "function",
  clearOpenAICache: typeof clearOpenAICache === "function"
};
logger.debug("Dependency check", { dependencies });

// Concurrency limiter
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

const limit = pLimit(5);
const domainCache = new Map();
const processedDomains = new Set();

const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1000;

const BRAND_ONLY_DOMAINS = [
  "chevy.com", "ford.com", "cadillac.com", "buick.com", "gmc.com", "chrysler.com",
  "dodge.com", "ramtrucks.com", "jeep.com", "lincoln.com", "toyota.com", "honda.com",
  "nissanusa.com", "subaru.com", "mazdausa.com", "mitsubishicars.com", "acura.com",
  "lexus.com", "infinitiusa.com", "hyundaiusa.com", "kia.com", "genesis.com",
  "bmwusa.com", "mercedes-benz.com", "audiusa.com", "vw.com", "volkswagen.com",
  "porsche.com", "miniusa.com", "fiatusa.com", "alfa-romeo.com", "landroverusa.com",
  "jaguarusa.com", "tesla.com", "lucidmotors.com", "rivian.com", "volvocars.com"
];

// Local constants for extractBrandOfCityFromDomain (not exported)
const CAR_BRANDS = [
  'acura', 'alfa romeo', 'amc', 'aston martin', 'audi', 'bentley', 'bmw', 'bugatti', 'buick',
  'cadillac', 'carmax', 'cdj', 'cdjrf', 'cdjr', 'chev', 'chevvy', 'chevrolet', 'chrysler', 'cjd', 'daewoo',
  'dodge', 'eagle', 'ferrari', 'fiat', 'ford', 'genesis', 'gmc', 'honda', 'hummer', 'hyundai', 'inf', 'infiniti',
  'isuzu', 'jaguar', 'jeep', 'jlr', 'kia', 'lamborghini', 'land rover', 'landrover', 'lexus', 'lincoln', 'lucid',
  'maserati', 'maz', 'mazda', 'mb', 'merc', 'mercedes', 'mercedes-benz', 'mercedesbenz', 'merk', 'mini',
  'mitsubishi', 'nissan', 'oldsmobile', 'plymouth', 'polestar', 'pontiac', 'porsche', 'ram', 'rivian',
  'rolls-royce', 'saab', 'saturn', 'scion', 'smart', 'subaru', 'subie', 'suzuki', 'tesla', 'toyota',
  'volkswagen', 'volvo', 'vw', 'chevy', 'honda'
];

const KNOWN_CITIES_SET = new Set([
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
  "shottenkirk", "riverview", "northwest", "southwest", "downtown", "uptown", "midtown", "athens", "miami", "miamilakes", "columbia", "charlotte", "southcharlotte", "stuart", "devine",
  "brooklyn", "henderson", "lasvegas", "kingston", "irvine", "chattanooga", "lakewood", "waconia",
  "deland", "taylor", "edwards", "keating", "athens", "houston", "greenwich", "slidell", "brooklyn", "caldwell", "killeen", "brookhaven", "miami", "charlotte", "tampa", "manhattan",
  "auburn", "westchester", "centralhouston", "lagrange", "alhambra", "chicago", "naples", "stockton",
  "orlando", "gwinnett", "wakefield", "selma", "madison", "hemet", "san leandro", "union park"
]);

/**
 * Calls fallback logic using fallbackName
 * @param {string} domain - Domain to enrich
 * @param {number} rowNum - Row number
 * @param {Object} meta - Meta data
 * @returns {Object} - Fallback result
 */
async function callFallbackAPI(domain, rowNum, meta = {}) {
  logger.debug("callFallbackAPI started", { domain, rowNum });

  try {
    if (BRAND_ONLY_DOMAINS.includes(`${domain.toLowerCase()}.com`)) {
      logger.info("Brand-only domain skipped in callFallbackAPI", { domain });
      return {
        domain,
        companyName: "",
        confidenceScore: 0,
        flags: Array.from(new Set(["BrandOnlyDomainSkipped"])),
        tokens: 0,
        rowNum
      };
    }

    let lastError;
    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        logger.debug(`Attempt ${attempt} to call fallback`, { domain, attempt });
        const fallback = await fallbackName(domain, { title: meta.title });

        logger.debug("Fallback result", { domain, fallback });
        return {
          domain,
          companyName: fallback.companyName,
          confidenceScore: fallback.confidenceScore,
          flags: Array.from(new Set([...fallback.flags, "FallbackAPIUsed"])),
          tokens: fallback.tokens || 0,
          rowNum
        };
      } catch (error) {
        lastError = error;
        logger.warn(`Fallback attempt ${attempt} failed`, { domain, error: error.message, stack: error.stack });
        if (attempt < RETRY_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }
    logger.error("Fallback exhausted retries", { domain, error: lastError.message, stack: lastError.stack });
    let local;
    try {
      logger.debug("Attempting local humanizeName", { domain });
      local = await humanizeName(domain, domain, true);
      logger.debug("Local humanizeName result", { domain, result: local });
    } catch (humanizeError) {
      logger.error("Local humanizeName failed", { domain, error: humanizeError.message, stack: humanizeError.stack });
      local = { companyName: "", confidenceScore: 80, flags: ["InvalidHumanizeResponse"], tokens: 0 };
    }

    if (!local.companyName || typeof local.companyName !== "string") {
      local.companyName = "";
      local.flags = [...(local.flags || []), "InvalidHumanizeResponse"];
    }

    if (!local.companyName || local.confidenceScore < 75) {
      const splitName = earlyCompoundSplit(domain.split(".")[0]);
      local.companyName = capitalizeName(splitName).name || "";
      local.confidenceScore = 80;
      local.flags = [...(local.flags || []), "LocalCompoundSplit"];
      logger.debug("Local compound split result", { domain, result: local });
    }

    return {
      domain,
      companyName: local.companyName,
      confidenceScore: local.confidenceScore,
      flags: Array.from(new Set([...(local.flags || []), "FallbackAPIFailed", "LocalFallbackUsed"])),
      tokens: local.tokens || 0,
      rowNum,
      error: lastError.message
    };
  } catch (err) {
    logger.error("callFallbackAPI failed", { domain, rowNum, error: err.message, stack: err.stack });
    return {
      domain,
      companyName: "",
      confidenceScore: 80,
      flags: Array.from(new Set(["FallbackAPIFailed", "ManualReviewRecommended"])),
      tokens: 0,
      rowNum
    };
  }
}

/**
 * Validates leads array
 * @param {Array} leads - Array of lead objects
 * @returns {Object} - Validated leads and errors
 */
function validateLeads(leads) {
  const validatedLeads = [];
  const validationErrors = [];

  try {
    if (!Array.isArray(leads)) {
      logger.warn("Leads is not an array", { leads: JSON.stringify(leads) });
      validationErrors.push("Leads is not an array");
      return { validatedLeads, validationErrors };
    }

    leads.forEach((lead, i) => {
      if (!lead || typeof lead !== "object") {
        logger.warn(`Index ${i} not object`, { lead: JSON.stringify(lead) });
        validationErrors.push(`Index ${i} not object`);
        return;
      }
      const domain = (lead.domain || "").trim().toLowerCase();
      if (!domain) {
        logger.warn(`Index ${i} missing domain`, { lead: JSON.stringify(lead) });
        validationErrors.push(`Index ${i} missing domain`);
        return;
      }
      validatedLeads.push({
        domain,
        rowNum: Number.isInteger(lead.rowNum) ? lead.rowNum : i + 1,
        metaTitle: typeof lead.metaTitle === "string" ? lead.metaTitle : undefined
      });
    });
    logger.debug("validateLeads completed", { validatedLeadsCount: validatedLeads.length, validationErrors });
    return { validatedLeads, validationErrors };
  } catch (err) {
    logger.error("validateLeads failed", { error: err.message, stack: err.stack, leads: JSON.stringify(leads) });
    validationErrors.push("Validation error");
    return { validatedLeads, validationErrors };
  }
}

export default async function handler(req, res) {
  let body = null;
  try {
    // Validate VERCEL_AUTH_TOKEN
    const authToken = process.env.VERCEL_AUTH_TOKEN;
    const authHeader = req.headers.authorization;
    logger.info(`Received auth header: ${authHeader}, Expected: Bearer ${authToken}`);
    if (!authHeader || authHeader !== `Bearer ${authToken}`) {
      logger.warn("Unauthorized request", { authHeader, expected: `Bearer ${authToken}` });
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "Invalid or missing authorization token",
        details: "Please provide a valid Bearer token in the Authorization header"
      });
    }

    logger.debug("Handler started", { method: req.method });

    if (req.method !== "POST") {
      logger.warn("Invalid method, expected POST", { method: req.method });
      return res.status(405).json({ error: "Method not allowed, use POST" });
    }

    // Safely access req.body with manual parsing for vercel dev mode
    try {
      const rawBody = await buffer(req);
      logger.debug("Raw body received", { rawBody: rawBody.toString() });
      body = JSON.parse(rawBody.toString() || "{}");
      logger.debug("Parsed body", { bodyLength: JSON.stringify(body).length, body: JSON.stringify(body) });
    } catch (err) {
      logger.error("Failed to parse request body", { error: err.message, stack: err.stack });
      return res.status(400).json({ error: "Invalid JSON body", details: err.message });
    }

    if (!body || (Object.keys(body).length === 0 && body.constructor === Object)) {
      logger.warn("Empty body detected", {});
      return res.status(400).json({ error: "Empty body" });
    }

    const leads = body.leads || body.leadList || body.domains || body;
    logger.debug("Extracted leads", { leadCount: Array.isArray(leads) ? leads.length : 0, leads: JSON.stringify(leads) });

    const { validatedLeads, validationErrors } = validateLeads(leads);
    logger.debug("Validated leads", { validatedLeads: validatedLeads.length, validationErrors });

    if (validatedLeads.length === 0) {
      logger.warn("No valid leads", { validationErrors });
      return res.status(400).json({ error: "No valid leads", details: validationErrors });
    }

    const successful = [];
    const manualReviewQueue = [];
    const fallbackTriggers = [];
    let totalTokens = 0;

    const processLead = async (lead) => {
      const { domain, rowNum, metaTitle } = lead;
      const domainKey = domain.toLowerCase();
      logger.debug("Processing lead", { domain, rowNum });

      try {
        // Check cache for duplicates
        if (processedDomains.has(domainKey)) {
          const cached = domainCache.get(domainKey);
          if (cached) {
            logger.debug("Using cached result", { domain: domainKey, cached });
            return {
              domain,
              companyName: cached.companyName,
              confidenceScore: cached.confidenceScore,
              flags: Array.from(new Set([...cached.flags, "DuplicateSkipped"])),
              tokens: 0,
              rowNum
            };
          }
        }

        let finalResult = { companyName: "", confidenceScore: 80, flags: [], tokens: 0 };
        let tokensUsed = 0;

        let brandDetected = null;
        let cityDetected = null;
        try {
          logger.debug("Calling extractBrandOfCityFromDomain", { domain: domainKey });
          const match = extractBrandOfCityFromDomain(domainKey);
          brandDetected = match.brand || null;
          cityDetected = match.city || null;
          logger.debug("extractBrandOfCityFromDomain result", { domain: domainKey, brandDetected, cityDetected });
        } catch (error) {
          logger.error("extractBrandOfCityFromDomain failed", { domain: domainKey, error: error.message, stack: error.stack });
        }

        if (BRAND_ONLY_DOMAINS.includes(`${domainKey}.com`)) {
          logger.debug("Brand-only domain skipped", { domain: domainKey });
          finalResult = {
            companyName: "",
            confidenceScore: 0,
            flags: ["BrandOnlyDomainSkipped"],
            tokens: 0
          };
        } else {
          let humanizeError = null;
          let initialResult = null;
          for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
            try {
              logger.debug(`Attempt ${attempt} to humanize domain`, { domain });
              initialResult = await humanizeName(domain, domain, !!metaTitle);
              logger.debug("humanizeName result", { domain, result: initialResult });
              finalResult = {
                companyName: initialResult.companyName || "",
                confidenceScore: initialResult.confidenceScore || 80,
                flags: Array.from(new Set(initialResult.flags || [])),
                tokens: initialResult.tokens || 0
              };
              tokensUsed = initialResult.tokens || 0;
              humanizeError = null;
              break;
            } catch (error) {
              if (error.message.includes("BrandOnlyError")) {
                logger.info(`Retrying fallback for ${domain} due to ${error.message}`);
                try {
                  // Retry with relaxed possessive rules
                  initialResult = await humanizeName(domain, domain, !!metaTitle, false);
                  initialResult.flags.push("FallbackTriggered");
                  finalResult = {
                    companyName: initialResult.companyName || "",
                    confidenceScore: initialResult.confidenceScore || 80,
                    flags: Array.from(new Set(initialResult.flags || [])),
                    tokens: initialResult.tokens || 0
                  };
                  tokensUsed = initialResult.tokens || 0;
                  humanizeError = null;
                  break;
                } catch (retryErr) {
                  logger.warn(`Fallback retry failed for ${domain}`, { error: retryErr.message, stack: retryErr.stack });
                  humanizeError = retryErr;
                }
              } else {
                humanizeError = error;
                logger.warn(`Humanize attempt ${attempt} failed`, { domain, error: error.message, stack: error.stack });
              }
              if (attempt < RETRY_ATTEMPTS) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
              }
            }
          }

          if (finalResult.flags.includes("BrandOnlyDomainSkipped")) {
            logger.debug("Skipping further fallback due to BrandOnlyDomainSkipped", { domain });
          } else if (humanizeError || finalResult.confidenceScore < 100 || finalResult.flags.includes("ManualReviewRecommended")) {
            logger.debug("Calling fallback API", { domain });
            const meta = metaTitle ? { title: metaTitle } : {};
            const fallback = await callFallbackAPI(domain, rowNum, meta);
            finalResult = {
              companyName: fallback.companyName,
              confidenceScore: fallback.confidenceScore,
              flags: Array.from(new Set([...fallback.flags, "FallbackAPIUsed"])),
              tokens: fallback.tokens
            };
            tokensUsed += fallback.tokens;
            logger.debug("Fallback API result", { domain, result: finalResult });

            // Populate fallbackTriggers
            if (humanizeError || finalResult.flags.includes("FallbackAPIUsed")) {
              fallbackTriggers.push({
                domain,
                rowNum,
                reason: humanizeError ? (humanizeError.message.includes("BrandOnlyError") ? "BrandOnlyError" : "HumanizeFailed") : "LowConfidence",
                details: {
                  error: humanizeError ? humanizeError.message : null,
                  primary: {
                    companyName: initialResult?.companyName || "",
                    confidenceScore: initialResult?.confidenceScore || 0,
                    flags: initialResult?.flags || []
                  },
                  fallback: {
                    companyName: finalResult.companyName,
                    confidenceScore: finalResult.confidenceScore,
                    flags: finalResult.flags
                  },
                  brand: brandDetected,
                  city: cityDetected
                },
                tokens: tokensUsed
              });
            }
          }

          if (finalResult.flags.includes("ManualReviewRecommended")) {
            logger.debug("Adding to manualReviewQueue", { domain, companyName: finalResult.companyName });
            manualReviewQueue.push({
              domain,
              companyName: finalResult.companyName,
              confidenceScore: finalResult.confidenceScore,
              flags: finalResult.flags,
              rowNum
            });
          }
        }

              if (finalResult.companyName && finalResult.companyName.split(" ").every(w => /^[A-Z]{1,3}$/.test(w))) {
          logger.debug("Expanding initials", { domain, companyName: finalResult.companyName });
          const expandedName = expandInitials(finalResult.companyName);
          if (expandedName && expandedName.name !== finalResult.companyName) {
            finalResult.companyName = expandedName.name;
            finalResult.flags = Array.from(new Set([...finalResult.flags, "InitialsExpandedLocally"]));
            finalResult.confidenceScore -= 5;
          }
          logger.debug("Expanded initials result", { domain, result: finalResult });
        }

        domainCache.set(domainKey, {
          companyName: finalResult.companyName,
          confidenceScore: finalResult.confidenceScore,
          flags: finalResult.flags
        });
        processedDomains.add(domainKey);

        totalTokens += tokensUsed;
        return {
          domain,
          companyName: finalResult.companyName,
          confidenceScore: finalResult.confidenceScore,
          flags: finalResult.flags,
          tokens: tokensUsed,
          rowNum
        };
      } catch (err) {
        logger.error("processLead failed", { domain, rowNum, error: err.message, stack: err.stack });
        return {
          domain,
          companyName: "",
          confidenceScore: 80,
          flags: Array.from(new Set(["EnrichmentFailed", "ManualReviewRecommended"])),
          tokens: 0,
          rowNum
        };
      }
    };

    const results = await Promise.all(validatedLeads.map(lead => limit(() => processLead(lead))));
    successful.push(...results);

    logger.info("Handler completed successfully", {});
    return res.status(200).json({
      successful,
      manualReviewQueue,
      fallbackTriggers,
      totalTokens,
      partial: results.some(r => r.flags.includes("EnrichmentFailed")),
      fromFallback: fallbackTriggers.length > 0
    });
  } catch (error) {
    logger.error("Handler error", {
      error: error.message,
      stack: error.stack,
      body: body ? JSON.stringify(body).slice(0, 1000) : "null"
    });
    return res.status(500).json({
      error: "Internal server error",
      confidenceScore: 80,
      flags: Array.from(new Set(["BatchEnrichmentFailed", "ManualReviewRecommended"])),
      tokens: 0
    });
  }
}

/**
 * Resets processed domains and caches
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} - JSON response
 */
export const resetProcessedDomains = async (req, res) => {
  logger.info("Resetting processed domains", {});
  try {
    processedDomains.clear();
    domainCache.clear();
    clearOpenAICache();
    logger.info("Processed domains and OpenAI cache reset", {});
    return res.status(200).json({ message: "Processed domains and OpenAI cache reset" });
  } catch (err) {
    logger.error("resetProcessedDomains failed", { error: err.message, stack: err.stack });
    return res.status(500).json({ error: "Failed to reset caches" });
  }
};

logger.info("Module loading completed", {});
