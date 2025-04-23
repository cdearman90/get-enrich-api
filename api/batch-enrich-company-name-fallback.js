import { kv } from "@vercel/kv"; // Add KV import
import { callOpenAI } from "./lib/openai.js";
import winston from "winston";

// Configure Winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

const KNOWN_CITIES = new Set([
  // Alabama
  "birmingham", "montgomery", "huntsville", "mobile", "hackensack", "tuscaloosa",
  "hoover", "dothan", "auburn", "decatur", "madison", "florence",
  "gadsden", "vestavia hills", "prattville", "phenix city", "alabaster", "opelika",
  "northport", "enterprise", "daphne", "homewood", "bessemer", "athens",
  "pelham", "fairhope", "anniston", "mountain brook", "troy", "trussville",
  "talladega", "selma", "oxford", "alexander city", "millbrook", "helena",
  "sylacauga", "scottsboro", "hueytown", "gardendale", "foley", "jasper",
  "cullman", "prichard", "irondale", "eufaula", "saraland", "fort payne",
  "albertville", "ozark", "wetumpka",
  // Alaska
  "anchorage", "juneau", "fairbanks", "ketchikan", "sitka", "wasilla",
  "kenai", "kodiak", "bethel", "palmer", "homer", "soldotna",
  "valdez", "nome", "barrow", "kotzebue", "seward", "cordova",
  "dillingham", "petersburg", "wrangell", "north pole", "delta junction", "hoonah",
  "unalaska", "craig", "metlakatla", "skagway", "king cove", "sand point",
  "klawock", "seldovia", "togiak", "mountain village", "emmonak", "akutan",
  "gambell", "alakanuk", "st marys", "shaktoolik", "koyuk", "hooper bay",
  "st paul", "chevak", "kivalina", "kwethluk", "mekoryuk", "napakiak",
  "savoonga", "quinhagak",
  // Arizona
  "phoenix", "tucson", "mesa", "chandler", "gilbert", "glendale",
  "scottsdale", "peoria", "tempe", "surprise", "yuma", "avondale",
  "goodyear", "flagstaff", "buckeye", "casa grande", "lake havasu city", "maricopa",
  "sierra vista", "prescott", "bullhead city", "apache junction", "prescott valley", "marana",
  "el mirage", "queen creek", "kingman", "san luis", "sahuarita", "florence",
  "fountain hills", "nogales", "douglas", "eloy", "payson", "somerton",
  "paradise valley", "coolidge", "cottonwood", "camp verde", "chito valley", "show low",
  "safford", "sedona", "winslow", "globe", "page", "tolleson",
  "wickenburg", "youngtown",
  // Arkansas
  "little rock", "fort smith", "fayetteville", "springdale", "jonesboro", "north little rock",
  "conway", "rogers", "bentonville", "pine bluff", "hot springs", "benton",
  "sherwood", "texarkana", "russellville", "bella vista", "west memphis", "paragould",
  "cabot", "searcy", "van buren", "el dorado", "maumelle", "bryant",
  "siloam springs", "jacksonville", "forrest city", "harrison", "mountain home", "magnolia",
  "hope", "centerton", "stuttgart", "arkadelphia", "greenwood", "clarksville",
  "heber springs", "mena", "osceola", "lowell", "beebe", "morrilton",
  "de queen", "farmington", "alma", "berryville", "white hall", "warren",
  "crossett", "camden",
  // California
  "los angeles", "san diego", "san jose", "san francisco", "fresno", "sacramento",
  "long beach", "oakland", "bakersfield", "anaheim", "santa ana", "riverside",
  "stockton", "chula vista", "irvine", "fremont", "san bernardino", "modesto",
  "oxnard", "fontana", "huntington beach", "glendale", "santa clarita", "garden grove",
  "santa rosa", "southbay", "oceanside", "rancho cucamonga", "ontario", "elk grove",
  "corona", "hayward", "lancaster", "palmdale", "sunnyvale", "pomona",
  "escondido", "torrance", "pasadena", "orange", "fullerton", "thousand oaks",
  "visalia", "simi valley", "concord", "roseville", "santa clara", "vallejo",
  "victorville", "berkeley", "cerritos", "redlands", "redwoodcity", "coralgables",
  "newportbeach", "paloalto", "santabarbara", "naperville", "huntington", "pleasanton",
  "burlingame", "westmont", "roswell",
  // Colorado
  "denver", "colorado springs", "aurora", "fort collins", "lakewood", "thornton",
  "arvada", "westminster", "pueblo", "centennial", "boulder", "greeley",
  "longmont", "loveland", "broomfield", "grand junction", "castle rock", "commerce city",
  "parker", "littleton", "northglenn", "brighton", "englewood", "wheat ridge",
  "lafayette", "windsor", "erie", "golden", "louisville", "sheridan",
  "montrose", "durango", "canon city", "greenwood village", "sterling", "lone tree",
  "johnstown", "superior", "fruitvale", "steamboat springs", "federal heights", "firestone",
  "fort lupton", "trinidad", "woodland park", "aspen", "avon", "glendale",
  "delta", "rifle",
  // Connecticut
  "bridgeport", "new haven", "stamford", "hartford", "waterbury", "norwalk",
  "danbury", "new britain", "west hartford", "greenwich", "fairfield", "hamden",
  "bristol", "meriden", "manchester", "west haven", "milford", "stratford",
  "east hartford", "middletown", "wallingford", "southington", "shelton", "norwich",
  "torrington", "trumbull", "naugatuck", "newington", "vernon", "windsor",
  "westport", "east haven", "new london", "wethersfield", "farmington", "ridgefield",
  "new milford", "simsbury", "watertown", "guilford", "south windsor", "north haven",
  "darien", "ansonia", "windsor locks", "rocky hill", "plainville", "brookfield",
  "wolcott", "seymour",
  // Delaware
  "wilmington", "dover", "newark", "middletown", "smyrna", "milford",
  "seaford", "georgetown", "elsmere", "new castle", "millsboro", "laurel",
  "harrington", "camden", "clayton", "lewes", "milton", "selbyville",
  "townsend", "ocean view", "bridgeville", "delmar", "delaware city", "felton",
  "wyoming", "blades", "greenwood", "frederica", "south bethany", "cheswold",
  "millville", "dagsboro", "frankford", "bethany beach", "newport", "rehoboth beach",
  "ellendale", "fenwick island", "ardsley", "slaughter beach", "houston", "dewey beach",
  "bowers", "magnolia", "south bowers", "little creek", "odessa", "claymont",
  "ardentown", "kentmere",
  // Idaho
  "boise", "meridian", "nampa", "idaho falls", "pocatello", "caldwell",
  "coeur dalene", "twin falls", "lewiston", "post falls", "rexburg", "moscow",
  "eagle", "kuna", "ammon", "chubbuck", "hayden", "mountain home",
  "blackfoot", "garden city", "jerome", "burley", "star", "sandpoint",
  "rathdrum", "hailey", "payette", "emmett", "middleton", "weiser",
  "preston", "fruitland", "shelley", "buhl", "rigby", "american falls",
  "lincoln", "st anthony", "gooding", "kimberly", "filer", "salmon",
  "grangeville", "soda springs", "ketchum", "mccall", "homedale", "bonners ferry",
  "dalton gardens", "victor",
  // Illinois
  "chicago", "aurora", "naperville", "joliet", "rockford", "springfield",
  "elgin", "peoria", "waukegan", "cicero", "champaign", "bloomington",
  "decatur", "arlington heights", "evanston", "schaumburg", "bolingbrook", "palatine",
  "skokie", "des plaines", "orland park", "tinley park", "oak lawn", "berwyn",
  "mount prospect", "wheaton", "normal", "hoffman estates", "oak park", "downers grove",
  "glenview", "belleville", "elmhurst", "dekalb", "moline", "urbana",
  "buffalo grove", "bartlett", "hanover park", "carpentersville", "wheeling", "park ridge",
  "addison", "northbrook", "elk grove village", "danville", "gurnee", "mundelein",
  "oswego", "highland park",
  // Indiana
  "indianapolis", "fort wayne", "evansville", "south bend", "carmel", "fishers",
  "bloomington", "hammond", "gary", "lafayette", "muncie", "noblesville",
  "terre haute", "greenwood", "kokomo", "anderson", "elkhart", "west lafayette",
  "mishawaka", "lawrence", "jeffersonville", "columbus", "westfield", "new albany",
  "portage", "richmond", "valparaiso", "goshen", "michigan city", "zionsville",
  "merrillville", "crown point", "schererville", "hobart", "east chicago", "marion",
  "plainfield", "highland", "munster", "granger", "franklin", "clarksville",
  "seymour", "griffith", "dyer", "shelbyville", "logansport", "vincennes",
  "huntington", "lebanon",
  // Iowa
  "des moines", "cedar rapids", "davenport", "sioux city", "iowa city", "waterloo",
  "ames", "west des moines", "council bluffs", "dubuque", "ankeny", "urbandale",
  "cedar falls", "marion", "bettendorf", "mason city", "clinton", "burlington",
  "ottumwa", "fort dodge", "muscatine", "coralville", "johnston", "clive",
  "newton", "indianola", "altoona", "norwalk", "boone", "spencer",
  "storm lake", "carroll", "le mars", "fairfield", "grinnell", "perry",
  "mount pleasant", "denison", "webster city", "decorah", "clear lake", "knoxville",
  "charles city", "atlantic", "creston", "estonia", "oskaloosa", "waverly",
  "cherokee", "centerville",
  // Kansas
  "wichita", "overland park", "kansas city", "olathe", "topeka", "lawrence",
  "shawnee", "manhattan", "lenexa", "salina", "hutchinson", "leavenworth",
  "leawood", "dodge city", "garden city", "emporia", "derby", "junction city",
  "prairie village", "liberal", "hays", "pittsburg", "newton", "gardner",
  "great bend", "mcpherson", "el dorado", "ottawa", "winfield", "arkansas city",
  "andover", "lansing", "merriam", "haysville", "atchison", "parsons",
  "coffeyville", "chanute", "independence", "augusta", "fort scott", "wellington",
  "mission", "park city", "bonner springs", "valley center", "beloit", "roeland park",
  "abilene", "eudora",
  // Kentucky
  "louisville", "lexington", "bowling green", "owensboro", "covington", "richmond",
  "georgetown", "florence", "hopkinsville", "nicholasville", "elizabethtown", "henderson",
  "frankfort", "independence", "jeffersontown", "paducah", "radcliff", "ashland",
  "madisonville", "murray", "erlanger", "winchester", "st matthews", "danville",
  "fort thomas", "newport", "shively", "shelbyville", "glasgow", "berea",
  "mount washington", "shepherdsville", "bardstown", "campbellsville", "lawrenceburg", "paris",
  "versailles", "alexandria", "harrodsburg", "pikeville", "london", "franklin",
  "mayfield", "middlesboro", "corbin", "burlington", "oak grove", "maysville",
  "morehead", "hazard",
  // Louisiana
  "new orleans", "baton rouge", "shreveport", "lafayette", "lake charles", "kenner",
  "bossier city", "monroe", "alexandria", "houma", "hammond", "slidell",
  "gonzales", "zachary", "new iberia", "laplace", "thibodaux", "pineville",
  "crowley", "baker", "sulphur", "west monroe", "gretna", "harvey",
  "opelousas", "ruston", "natchitoches", "deridder", "morgan city", "abbeville",
  "bogalusa", "mandeville", "bastrop", "eunice", "jennings", "denham springs",
  "westwego", "minden", "covington", "port allen", "marksville", "franklin",
  "patterson", "donaldsonville", "oakdale", "plaquemine", "winona", "cityside", "tallulah", "ville platte",
  "springhill", "winnfield", "neworleans",
  // Maine
  "portland", "lewiston", "bangor", "south portland", "auburn", "biddeford",
  "sanford", "saco", "westbrook", "augusta", "waterville", "brewer",
  "presque isle", "bath", "caribou", "old town", "rockland", "ellsworth",
  "belfast", "gardiner", "calais", "hallowell", "eastport", "machias",
  "bar harbor", "camden", "millinocket", "skowhegan", "madawaska", "boothbay harbor",
  "orono", "farmington", "kittery", "rumford", "mexico", "paris",
  "norway", "fort kent", "lincoln", "dover-foxcroft", "berwick", "buxton",
  "freeport", "topsham", "yarmouth", "kennebunk", "falmouth", "bridgton",
  "houlton", "pittsfield",
  // Maryland
  "baltimore", "columbia", "germantown", "silver spring", "waldorf", "glen burnie",
  "ellicott city", "dundalk", "rockville", "bethesda", "frederick", "gaithersburg",
  "towson", "bowie", "aspin hill", "wheaton", "bel air", "north bethesda",
  "montgomery village", "odenton", "catonsville", "hagerstown", "annapolis", "potomac",
  "north laurel", "severn", "essex", "hanover", "st charles", "clinton",
  "laurel", "south laurel", "college park", "greenbelt", "cumberland", "hyattsville",
  "takoma park", "westminster", "langley park", "camp springs", "east riverdale", "landover",
  "olney", "seabrook", "arnold", "largo", "fairland", "arbutus",
  "lake shore", "aberdeen",
  // Massachusetts
  "boston", "worcester", "springfield", "cambridge", "lowell", "brockton",
  "new bedford", "quincy", "lynn", "fall river", "newton", "somerville",
  "lawrence", "framingham", "waltham", "haverhill", "malden", "medford",
  "taunton", "chicopee", "weymouth", "revere", "peabody", "methuen",
  "barnstable", "pittsfield", "attleboro", "arlington", "everett", "salem",
  "westfield", "leominster", "fitchburg", "holyoke", "beverly", "marlborough",
  "woburn", "chelsea", "braintree", "natick", "randolph", "watertown",
  "franklin", "north attleborough", "gloucester", "northampton", "agawam", "west springfield",
  "gardner", "belmont", "northborough",
  // Michigan
  "detroit", "grand rapids", "warren", "sterling heights", "ann arbor", "lansing",
  "flint", "dearborn", "livonia", "troy", "westland", "farmington hills",
  "kalamazoo", "wyoming", "southfield", "rochester hills", "taylor", "royal oak",
  "st clair shores", "pontiac", "dearborn heights", "novi", "battle creek", "saginaw",
  "kentwood", "east lansing", "redford", "roseville", "muskegon", "portage",
  "midland", "lincoln park", "holland", "bay city", "jackson", "eastpointe",
  "madison heights", "oak park", "southgate", "burton", "port huron", "northville",
  "garden city", "inkster", "allen park", "ferndale", "wyandotte", "mount pleasant",
  "traverse city", "hamtramck",
  // Minnesota
  "minneapolis", "st paul", "rochester", "duluth", "bloomington", "brooklyn park",
  "plymouth", "maple grove", "woodbury", "st cloud", "eden prairie", "lakeville",
  "eagan", "blaine", "coon rapids", "burnsville", "minnetonka", "apple valley",
  "edina", "st louis park", "mankato", "moorhead", "shakopee", "maplewood",
  "cottage grove", "inver grove heights", "richfield", "andover", "brooklyn center", "savage",
  "fridley", "oakdale", "chaska", "ramsey", "prior lake", "shoreview",
  "winona", "chanhassen", "white bear lake", "champlin", "elk river", "faribault",
  "rosemount", "crystal", "farmington", "hastings", "new brighton", "golden valley",
  "lino lakes", "northfield",
  // Mississippi
  "jackson", "gulfport", "southaven", "biloxi", "hattiesburg", "olive branch",
  "tupelo", "meridian", "greenville", "madison", "clinton", "pearl",
  "horn lake", "oxford", "brandon", "starkville", "ridgeland", "columbus",
  "vicksburg", "pascagoula", "gautier", "laurel", "hernando", "long beach",
  "natchez", "corinth", "diberville", "greenwood", "ocean springs", "moss point",
  "mccomb", "grenada", "brookhaven", "cleveland", "byram", "yazoo city",
  "west point", "picayune", "petal", "indianola", "new albany", "flowood",
  "bay st louis", "canton", "booneville", "senatobia", "holly springs", "amory",
  "kosciusko", "richland",
  // Missouri
  "kansas city", "st louis", "springfield", "columbia", "independence", "lees summit",
  "ofallon", "st joseph", "st charles", "st peters", "blue springs", "florissant",
  "joplin", "chesterfield", "jefferson city", "cape girardeau", "wildwood", "university city",
  "ballwin", "raytown", "liberty", "wentzville", "mehlville", "kirkwood",
  "maryland heights", "hazelwood", "gladstone", "grandview", "belton", "webster groves",
  "sedalia", "ferguson", "arnold", "affton", "nixa", "warrensburg",
  "rolla", "ozark", "raymore", "creve coeur", "farmington", "manchester",
  "kirksville", "hannibal", "poplar bluff", "sikeston", "lemay", "concord",
  "clayton", "branson",
  // Montana
  "billings", "missoula", "great falls", "bozeman", "butte", "helena",
  "kalispell", "havre", "anaconda", "miles city", "belgrade", "livingston",
  "laurel", "whitefish", "sidney", "lewistown", "glendive", "columbia falls",
  "polson", "hamilton", "dillon", "hardin", "shelby", "glasgow",
  "deer lodge", "cut bank", "libby", "wolf point", "conrad", "malta",
  "east helena", "colstrip", "three forks", "red lodge", "ronan", "baker",
  "choteau", "manhattan", "plentywood", "eureka", "roundup", "forsyth",
  "thompson falls", "big timber", "townsend", "stevensville", "browning", "west yellowstone",
  "white sulphur springs", "lolo",
  // Nebraska
  "omaha", "lincoln", "bellevue", "grand island", "kearney", "fremont",
  "hastings", "north platte", "norfolk", "columbus", "papillion", "la vista",
  "scottsbluff", "south sioux city", "beatrice", "lexington", "gering", "alliance",
  "blair", "york", "mccook", "nebraska city", "seward", "sidney",
  "crete", "plattsmouth", "schuyler", "ralston", "wayne", "holdrege",
  "chadron", "ogallala", "wahoo", "aurora", "falls city", "cozad",
  "fairbury", "oneill", "broken bow", "gothenburg", "west point", "minden",
  "central city", "david city", "valentine", "ashland", "kimball", "madison",
  "st paul", "milford",
  // Nevada
  "las vegas", "henderson", "reno", "north las vegas", "sparks", "carson city",
  "fernley", "elko", "mesquite", "boulder city", "fallon", "winnemucca",
  "west wendover", "ely", "yerington", "carlin", "lovelock", "wells",
  "caliente", "tonopah", "round mountain", "pioche", "eureka", "virginia city",
  "goldfield", "hawthorne", "laughlin", "pahrump", "incline village", "dayton",
  "spring creek", "sun valley", "silver springs", "gardnerville", "minden", "battle mountain",
  "jackpot", "overton", "moapa valley", "panaca", "alamo", "amargosa valley",
  "beatty", "gabbs", "henderson valley", "indian springs", "logandale", "mesquite heights",
  "nellis afb", "sloan",
  // New Hampshire
  "manchester", "nashua", "concord", "dover", "rochester", "keene",
  "portsmouth", "laconia", "lebanon", "claremont", "somersworth", "berlin",
  "franklin", "durham", "hampton", "exeter", "merrimack", "londonderry",
  "hudson", "milford", "newmarket", "swanzey", "pembroke", "plymouth",
  "littleton", "conway", "newport", "farmington", "jaffrey", "raymond",
  "goffstown", "peterborough", "barrington", "epping", "kingston", "rindge",
  "northfield", "hinsdale", "winchester", "hooksett", "bristol", "gilford",
  "belfast", "deerfield", "north conway", "wolfeboro", "meredith", "hanover",
  "henniker", "charlestown", "bedford",
  // New Jersey
  "newark", "jersey city", "paterson", "elizabeth", "lakewood", "edison",
  "woodbridge", "toms river", "hamilton", "trenton", "clifton", "camden",
  "brick", "cherry hill", "passaic", "middletown", "union city", "old bridge",
  "gloucester township", "north bergen", "vineland", "bayonne", "piscataway", "new brunswick",
  "perth amboy", "east orange", "west new york", "plainfield", "hackensack", "sayreville",
  "kearny", "linden", "north brunswick", "atlantic city", "howell", "ewing",
  "long branch", "westfield", "garfield", "egg harbor", "west orange", "orange",
  "pennsauken", "fair lawn", "bergenfield", "paramus", "livingston", "millville",
  "nutley", "rahway", "freehold",
  // New Mexico
  "albuquerque", "las cruces", "rio rancho", "santa fe", "roswell", "farmington",
  "clovis", "hobbs", "alamogordo", "carlsbad", "gallup", "deming",
  "los lunas", "chaparral", "sunland park", "las vegas", "portales", "artesia",
  "lovington", "española", "silver city", "bernalillo", "ruidoso", "aztec",
  "bloomfield", "truth or consequences", "anthony", "los ranchos de albuquerque", "taos", "el cerro",
  "placitas", "tucumcari", "raton", "belen", "corrales", "grants",
  "eldorado at santa fe", "north valley", "kirtland", "socorro", "lee acres", "paradise hills",
  "shiprock", "white rock", "la cienega", "bosque farms", "milan", "holloman afb",
  "zuni pueblo", "peralta",
  // New York
  "new york", "buffalo", "rochester", "yonkers", "syracuse", "albany",
  "new rochelle", "mount vernon", "schenectady", "utica", "white plains", "hempstead",
  "troy", "niagara falls", "binghamton", "freeport", "valley stream", "long beach",
  "north tonawanda", "spring valley", "rome", "ithaca", "poughkeepsie", "north hempstead",
  "elmira", "lindenhurst", "auburn", "watertown", "glen cove", "saratoga springs",
  "middletown", "kingston", "peekskill", "lockport", "plattsburgh", "corning",
  "lackawanna", "west babylon", "north bay shore", "ossining", "uniondale", "amsterdam",
  "north massapequa", "north bellmore", "massapequa", "huntington station", "east meadow", "central islip",
  "farmingdale", "port chester", "brooklyn",
  // North Carolina
  "charlotte", "raleigh", "greensboro", "durham", "winston-salem", "fayetteville",
  "cary", "wilmington", "high point", "concord", "asheville", "greenville",
  "gastonia", "jacksonville", "chapel hill", "huntersville", "apex", "burlington",
  "rocky mount", "kannapolis", "mooresville", "wake forest", "wilson", "sanford",
  "hickory", "matthews", "monroe", "salisbury", "new bern", "goldsboro",
  "cornelius", "garner", "thomasville", "statesville", "morrisville", "kernersville",
  "lumberton", "kinston", "carrboro", "asheboro", "clemmons", "lexington",
  "elizabeth city", "boone", "hope mills", "clayton", "henderson", "eden",
  "laurinburg", "albemarle", "southcharlotte",
  // North Dakota
  "fargo", "bismarck", "grand forks", "minot", "west fargo", "williston",
  "dickinson", "mandan", "jamestown", "wahpeton", "devils lake", "valley city",
  "grafton", "beulah", "rugby", "lisbon", "carrington", "hazen",
  "bottineau", "langdon", "mayville", "harvey", "bowman", "tioga",
  "garrison", "stanley", "new town", "cavalier", "park river", "new rockford",
  "rolla", "sibley", "cooperstown", "larimore", "casselton", "washburn",
  "ellendale", "crosby", "surrey", "hetlinger", "wishek", "lakota",
  "dunseith", "mohall", "lamoure", "kenmare", "mott", "beach",
  "underwood", "velva",
  // Ohio
  "columbus", "cleveland", "cincinnati", "toledo", "akron", "dayton",
  "parma", "canton", "youngstown", "lorain", "hamilton", "springfield",
  "kettering", "elyria", "lakewood", "cuyahoga falls", "middletown", "euclid",
  "newark", "mansfield", "mentor", "beavercreek", "cleveland heights", "strongsville",
  "dublin", "fairfield", "findlay", "warren", "lancaster", "lima",
  "hubber heights", "westerville", "marion", "grove city", "reynoldsburg", "delaware",
  "brunswick", "upper arlington", "stow", "north olmsted", "gahanna", "westlake",
  "north royalton", "massillon", "north ridgeville", "mason", "fairborn", "bowling green",
  "garfield heights", "shaker heights", "beachwood",
  // Oklahoma
  "oklahoma city", "tulsa", "norman", "broken arrow", "edmond", "lawton",
  "moore", "midwest city", "stillwater", "enid", "muskogee", "bartlesville",
  "owasso", "shawnee", "yukon", "ardmore", "ponca city", "duncan",
  "del city", "bixby", "sapulpa", "altus", "bethany", "sand springs",
  "claremore", "chickasha", "mcalester", "mustang", "jenks", "el reno",
  "ada", "durant", "tahlequah", "elgin", "woodward", "elk city",
  "okmulgee", "choctaw", "weatherford", "guymon", "guthrie", "warr acres",
  "coweta", "pryor creek", "wagoner", "miami", "sallisaw", "cushing",
  "seminole", "poteau",
  // Oregon
  "portland", "eugene", "salem", "gresham", "hillsboro", "beaverton",
  "bend", "medford", "springfield", "corvallis", "albany", "tigard",
  "lake oswego", "keizer", "grants pass", "oregon city", "mcminnville", "redmond",
  "tualatin", "west linn", "woodburn", "forest grove", "newberg", "roseburg",
  "wilsonville", "klamath falls", "ashland", "milwaukie", "sherwood", "happy valley",
  "central point", "canby", "hermiston", "pendleton", "troutdale", "coos bay",
  "the dalles", "lebanon", "st helens", "dallas", "la grande", "cornelius",
  "gladstone", "ontario", "newport", "monmouth", "damascus", "prineville",
  "cottage grove", "silverton",
  // Pennsylvania
  "philadelphia", "pittsburgh", "allentown", "erie", "reading", "scranton",
  "bethlehem", "lancaster", "harrisburg", "york", "altoona", "wilkes-barre",
  "chester", "williamsport", "easton", "lebanon", "hazelton", "new castle",
  "johnstown", "mckeesport", "west mifflin", "chambersburg", "carlisle", "hanover",
  "pottsville", "greensburg", "natrona heights", "washington", "butler", "indiana",
  "meadville", "uniontown", "oil city", "beaver falls", "sharon", "coatesville",
  "st marys", "lower burrell", "hermitage", "aliquippa", "sunbury", "bloomsburg",
  "lock haven", "warren", "jeannette", "latrobe", "bradford", "lewistown",
  "connellsville", "tamaqua",
  // Rhode Island
  "providence", "warwick", "cranston", "pawtucket", "east providence", "woonsocket",
  "coventry", "cumberland", "north providence", "south kingstown", "west warwick", "johnston",
  "north kingstown", "bristol", "lincoln", "smithfield", "central falls", "portsmouth",
  "barrington", "middletown", "burrillville", "tiverton", "narragansett", "east greenwich",
  "north smithfield", "valley falls", "warren", "scituate", "glocester", "hopkinton",
  "charlestown", "richmond", "exeter", "west greenwich", "jamestown", "foster",
  "little compton", "new shoreham", "block island", "kingston", "wakefield", "peace dale",
  "carolina", "hope valley", "ashaway", "bradford", "greene", "wyoming",
  "chepachet", "pascoag",
  // South Carolina
  "charleston", "columbia", "north charleston", "mount pleasant", "rock hill", "greenville",
  "summerville", "goose creek", "sumter", "hilton head island", "florence", "spartanburg",
  "myrtle beach", "aiken", "anderson", "mauldin", "greenwood", "north augusta",
  "easley", "simpsonville", "hanahan", "lexington", "conway", "west columbia",
  "north myrtle beach", "clemson", "orangeburg", "cayce", "bluffton", "beaufort",
  "irmo", "fort mill", "port royal", "forest acres", "newberry", "laurens",
  "camden", "lancaster", "georgetown", "hartsville", "york", "union",
  "seneca", "tega cay", "gaffney", "clinton", "bennettsville", "marion",
  "dillon", "darlington",
  // South Dakota
  "sioux falls", "rapid city", "aberdeen", "brookings", "watertown", "mitchell",
  "yankton", "pierre", "huron", "spearfish", "vermillion", "brandon",
  "box elder", "madison", "sturgis", "belle fourche", "harrisburg", "tea",
  "dell rapids", "mobridge", "canton", "hot springs", "milbank", "lead",
  "north sioux city", "winner", "chamberlain", "sisseton", "flandreau", "redfield",
  "fort pierre", "beresford", "elks point", "red river", "springfield", "custer", "webster",
  "parkston", "salem", "gregory", "eagle butte", "miller", "clear lake",
  "platte", "garretson", "de smet", "britton", "lemmon", "mission",
  "tyndall", "gettyburg",
  // Tennessee
  "memphis", "nashville", "knoxville", "chattanooga", "clarksville", "murfreesboro",
  "franklin", "jackson", "johnson city", "bartlett", "hendersonville", "kingsport",
  "collierville", "smyrna", "cleveland", "brentwood", "germantown", "columbia",
  "la vergne", "gallatin", "cookeville", "oak ridge", "morristown", "bristol",
  "farragut", "shelbyville", "east ridge", "tullahoma", "spring hill", "maryville",
  "dyersburg", "sevierville", "athens", "greeneville", "lebanon", "dickson",
  "mcminnville", "soddy-daisy", "lakeland", "red bank", "martin", "union city",
  "lawrenceburg", "paris", "crossville", "clinton", "springfield", "covington",
  "millington", "pulaski",
  // Texas
  "houston", "san antonio", "dallas", "austin", "fort worth", "el paso",
  "arlington", "corpus christi", "plano", "laredo", "lubbock", "garland",
  "irving", "amarillo", "grand prairie", "brownsville", "mckinney", "frisco",
  "pasadena", "killeen", "mcallen", "mesquite", "midland", "denton",
  "carrollton", "round rock", "abilene", "pearland", "richardson", "odessa",
  "sugar land", "beaumont", "waco", "lewisville", "tyler", "league city",
  "college station", "edinburg", "san angelo", "allen", "wichita falls", "north richland hills",
  "longview", "mission", "pharr", "bryan", "baytown", "temple",
  "missouri city", "flower mound", "centralhouston",
// Utah
  "salt lake city", "west valley city", "provo", "west jordan", "orem", "sandy",
  "st george", "ogden", "layton", "south jordan", "lehi", "millcreek",
  "taylorsville", "logan", "murray", "draper", "bountiful", "riverton",
  "herriman", "spanish fork", "roy", "pleasant grove", "kearns", "tooele",
  "cottonwood heights", "springville", "cedar city", "midvale", "kaysville", "holladay",
  "american fork", "clearfield", "syracuse", "south salt lake", "farmington", "saratoga springs",
  "washington", "clinton", "north ogden", "payson", "north salt lake", "brigham city",
  "highland", "centerville", "hurricane", "south ogden", "heber", "west haven",
  "kanab", "eagle mountain",
  // Vermont
  "burlington", "south burlington", "rutland", "barre", "montpelier", "winooski",
  "st albans", "newport", "vergennes", "middlebury", "bennington", "brattleboro",
  "hartford", "milton", "essex junction", "williston", "springfield", "jericho",
  "swanton", "northfield", "waterbury", "fair haven", "randolph", "morristown",
  "johnson", "lyndonville", "rockingham", "hardwick", "shelburne", "enosburg falls",
  "richford", "ludlow", "windsor", "poultney", "manchester center", "west rutland",
  "woodstock", "proctorsville", "white river junction", "west brattleboro", "orleans", "newport center",
  "north bennington", "east montpelier", "bristol", "albany", "chester", "wilder",
  "derby center", "saxtons river", "killeen",
  // Virginia
  "virginia beach", "norfolk", "chesapeake", "richmond", "newport news", "alexandria",
  "hampton", "roanoke", "portsmouth", "suffolk", "lynchburg", "harrisonburg",
  "leesburg", "charlottesville", "danville", "manassas", "petersburg", "fredericksburg",
  "winchester", "salem", "staunton", "herndon", "hopewell", "fairfax",
  "christiansburg", "colonial heights", "radford", "culpeper", "vienna", "williamsburg",
  "front royal", "warrenton", "martinsville", "falls church", "poquoson", "abingdon",
  "bristol", "covington", "manassas park", "waynesboro", "purcellville", "galax",
  "lexington", "buena vista", "bedford", "farmville", "strasburg", "bluefield",
  "richlands", "big stone gap",
  // Washington
  "seattle", "spokane", "tacoma", "vancouver", "bellevue", "kent",
  "everett", "renton", "spokane valley", "federal way", "yakima", "kirkland",
  "bellingham", "kennewick", "auburn", "pasco", "marysville", "sammamish",
  "redmond", "lakewood", "richland", "shoreline", "olympia", "lacey",
  "burien", "bothell", "edmonds", "puyallup", "bremerton", "lynnwood",
  "issaquah", "longview", "mount vernon", "wenatchee", "pullman", "des moines",
  "lake stevens", "sea-tac", "mercer island", "bainbridge island", "moses lake", "camas",
  "tukwila", "mukilteo", "oak harbor", "east wenatchee", "union gap", "mill creek",
  "snohomish", "port angeles",
  // West Virginia
  "charleston", "huntington", "morgantown", "parkersburg", "wheeling", "weirton",
  "fairmont", "martinsburg", "beckley", "clarksburg", "south charleston", "st albans",
  "vienna", "bluefield", "moundsville", "bridgeport", "oak hill", "dunbar",
  "elkins", "nitro", "hurricane", "princeton", "charles town", "buckhannon",
  "keyser", "new martinsville", "ranson", "point pleasant", "weston", "barboursville",
  "ravenswood", "summersville", "ripley", "kenova", "welch", "follansbee",
  "bethany", "williamson", "madison", "logan", "mullens", "kingwood",
  "paden city", "chester", "spencer", "shinnston", "philippi", "richwood",
  "williamstown", "montgomery", "salem", "rainelle", "mcmachan", "alderon",
  "marmet",
  // Wisconsin
  "milwaukee", "madison", "green bay", "kenosha", "racine", "appleton",
  "waukesha", "eau claire", "oshkosh", "janesville", "west allis", "la crosse",
  "sheboygan", "wausau", "fond du lac", "new berlin", "wauwatosa", "brookfield",
  "beloit", "greenfield", "menomonee falls", "oak creek", "manitowoc", "west bend",
  "sun prairie", "superior", "stevens point", "neenah", "fitchburg", "muskego",
  "watertown", "de pere", "mequon", "south milwaukee", "cudahy", "wisconsin rapids",
  "ashwaubenon", "howard", "middleton", "menasha", "weston", "beaver dam",
  "oconomowoc", "kaukauna", "marshfield", "wisconsin dells", "platteville", "whitewater",
  "verona", "allouez", "lake geneva",
  // Wyoming
  "cheyenne", "casper", "laramie", "gillette", "rock springs", "sheridan",
  "green river", "evanston", "riverton", "jackson", "cody", "rawlins",
  "lander", "torrington", "douglas", "powell", "worland", "buffalo",
  "wheatland", "newcastle", "mills", "thermopolis", "kemmerer", "afton",
  "greybull", "glenrock", "lovell", "lyman", "pinedale", "star valley ranch",
  "mountain view", "sundance", "basin", "saratoga", "pine bluffs", "guernsey",
  "wright", "moorcroft", "upton", "encampment", "dubois", "alpine",
  "bar nunn", "hanna", "diamondville", "shoshoni", "burlington", "cowley",
  "byron", "big piney",
  // Additional cities/regions from domains
  "riverview", "northwest", "southwest", "downtown", "uptown", "midtown",
  "miamilakes", "westchester", "alhambra", "san leandro", "union park", "ventura",
  "sterling", "hemet", "selma", "wakefield", "gwinnett", "deland",
  "waconia", "lakewood", "brookhaven", "caldwell", "manhattan", "beachwood",
  "bedford", "cookeville", "newton", "northborough", "cuyahoga", "dalton",
  "elyria", "milwaukee", "pinehurst", "st petersburg", "woodland hills", "melbourne",
  "vero beach", "fort myers", "pensacola", "tallahassee", "new smyrna beach", "st pete beach",
  "palm coast", "san marcos", "nashua", "beaverton", "auburn", "fort worth", "freeport", "delray", "DFW", "goodson", "garden state", "bhm", "jax"
]);

const BRAND_MAPPING = {
    "acura": "Acura", "alfa romeo": "Alfa Romeo", "amc": "AMC", "aston martin": "Aston Martin", "audi": "Audi",
    "bentley": "Bentley", "bmw": "BMW", "bugatti": "Bugatti", "buick": "Buick", "cadillac": "Cadillac",
    "carmax": "Carmax", "cdj": "Dodge", "cdjrf": "Dodge", "cdjr": "Dodge", "chev": "Chevy",
    "chevvy": "Chevy", "chevrolet": "Chevy", "chrysler": "Chrysler", "cjd": "Dodge", "daewoo": "Daewoo",
    "dodge": "Dodge", "eagle": "Eagle", "ferrari": "Ferrari", "fiat": "Fiat", "ford": "Ford", "genesis": "Genesis",
    "gmc": "GMC", "honda": "Honda", "hummer": "Hummer", "hyundai": "Hyundai", "inf": "Infiniti", "infiniti": "Infiniti",
    "isuzu": "Isuzu", "jaguar": "Jaguar", "jeep": "Jeep", "jlr": "Jaguar Land Rover", "kia": "Kia",
    "lamborghini": "Lambo", "land rover": "Land Rover", "landrover": "Land Rover", "lexus": "Lexus",
    "lincoln": "Ford", "lucid": "Lucid", "maserati": "Maserati", "maz": "Mazda", "mazda": "Mazda",
    "mb": "Mercedes", "merc": "Mercedes", "mercedes": "Mercedes", "mercedes-benz": "Mercedes", "mercedesbenz": "Mercedes", "merk": "Mercedes",
    "mini": "Mini", "mitsubishi": "Mitsubishi", "nissan": "Nissan", "oldsmobile": "Oldsmobile", "plymouth": "Plymouth",
    "polestar": "Polestar", "pontiac": "Pontiac", "porsche": "Porsche", "ram": "Ram", "rivian": "Rivian",
    "rolls-royce": "Rolls-Royce", "saab": "Saab", "saturn": "Saturn", "scion": "Scion", "smart": "Smart",
    "subaru": "Subaru", "subie": "Subaru", "suzuki": "Suzuki", "tesla": "Tesla", "toyota": "Toyota",
    "volkswagen": "VW", "volvo": "Volvo", "vw": "VW", "chevy": "Chevy", "jcd": "Jeep",
      "suby": "Subaru", // Variant of "subie", common in domains like "subytoyota.com"
  "subi": "Subaru", // Additional variant for "Subaru", e.g., "subiauto.com"
  "chr": "Chrysler", // Abbreviation, e.g., "chrdealer.com"
  "chry": "Chrysler", // Common shorthand, e.g., "chryjeep.com"
  "niss": "Nissan", // Abbreviation, e.g., "nissdeal.com"
  "toy": "Toyota", // Abbreviation, e.g., "toyauto.com"
  "hyund": "Hyundai", // Abbreviation, e.g., "hyundsales.com"
  "mercbenz": "Mercedes", // Concatenated variant, e.g., "mercbenzdealer.com"
  "benzo": "Mercedes", // Slang variant, e.g., "benzodeals.com"
  "aud": "Audi", // Abbreviation, e.g., "audsales.com"
  "por": "Porsche", // Abbreviation, e.g., "pordealer.com"
  "volks": "VW", // Abbreviation, e.g., "volksauto.com"
  "jagu": "Jaguar", // Abbreviation, e.g., "jagusales.com"
  "landrov": "Land Rover", // Abbreviation, e.g., "landrovdeal.com"
  "lex": "Lexus", // Abbreviation, e.g., "lexauto.com"
  "infinit": "Infiniti", // Variant, e.g., "infinitcars.com"
  "mitsu": "Mitsubishi", // Abbreviation, e.g., "mitsuauto.com"
  "vinfast": "VinFast", // Newer EV brand, e.g., "vinfastusa.com"
  "fisker": "Fisker", // Newer EV brand, e.g., "fiskerdealer.com"
  "mopar": "Mopar", // Chrysler parts/service brand, e.g., "mopardealer.com"
  "gma": "GMC", // Abbreviation, e.g., "gmauto.com"
  "cad": "Cadillac", // Abbreviation, e.g., "caddealer.com"
  "bui": "Buick", // Abbreviation, e.g., "buiauto.com"
  "lin": "Lincoln", // Abbreviation, e.g., "lindealer.com"
  "mazd": "Mazda", // Abbreviation, e.g., "mazdsales.com"
  "maz": "Mazda",
  "rolls": "Rolls-Royce", // Abbreviation, e.g., "rollsdealer.com"
    "chevr": "Chevy", // Abbreviation, e.g., "chevrdealer.com"
    "chevrol": "Chevy", // Partial variant, e.g., "chevrolauto.com"
    "audis": "Audi", // Plural variant, e.g., "audissales.com"
    "bm": "BMW", // Short abbreviation, e.g., "bmdealer.com"
    "mercben": "Mercedes", // Concatenated variant, e.g., "mercbenauto.com"
    "toyt": "Toyota", // Abbreviation, e.g., "toytcars.com"
    "hyu": "Hyundai", // Short abbreviation, e.g., "hyuauto.com"
    "nis": "Nissan", // Short abbreviation, e.g., "nisdealer.com"
    "sub": "Subaru", // Short abbreviation, e.g., "subauto.com"
    "infinitiy": "Infiniti", // Typo variant, e.g., "infinitiycars.com"
    "kias": "Kia", // Plural variant, e.g., "kiassales.com"
    "vol": "Volvo", // Short abbreviation, e.g., "voldealer.com"
    "porsch": "Porsche", // Partial variant, e.g., "porschauto.com"
    "jagr": "Jaguar", // Abbreviation, e.g., "jagrauto.com"
    "landr": "Land Rover", // Short abbreviation, e.g., "landrauto.com"
    "byd": "BYD", // Emerging EV brand, e.g., "byddealer.com"
    "stellantis": "Stellantis", // Parent company, e.g., "stellantisauto.com"
    "jcdr": "Jeep", // Multi-brand, e.g., "jcdrauto.com"
    "cdjrs": "Chrysler", // Multi-brand, e.g., "cdjrsdealer.com"
    "gmcad": "GMC", // Multi-brand, e.g., "gmcadauto.com"
    "schevy": "chevy",
    "chev": "chevrolet",
    "hondaof": "honda",
    "hmtrs": "hmtr",
    "infinitiof": "infiniti",
    "hondaof": "honda",
    "infinitibhm": ["infiniti", "bhm"],
    "infinitiofgwinnett": ["infiniti", "gwinnett"],
    "infinitioflexington": ["infiniti", "lexington"],
    "infinitioftucson": ["infiniti", "tucson"],
    "jmlexus": ["JM", "Lexus"],
    "toyotaof": ["Toyota"],
    "bmwof": ["BMW"],
    "fordof": ["Ford"],
    "mercedesof": ["M.B."],
    "lexusof": ["Lexus"],
    "nissanof": ["Nissan"],
    "chev": ["Chevy"],
    "audiof": ["Audi"],
    "subaruof": ["Subaru"],
    "vwof": ["VW"],
    "jaguarof": ["Jaguar"],
    "landroverof": ["Land Rover"],
    "arrowford": ["arrow", "ford"],
     "arrowford": ["arrow", "ford"],
  "ascensionhonda": ["ascension", "honda"],
  "ashlandfordchrysler": ["ashland", "ford", "chrysler"],
  "bmwofbrooklyn": ["bmw", "brooklyn"],
  "bmwoffreeport": ["bmw", "freeport"],
  "bmwofnashville": ["bmw", "nashville"],
  "billbrandtford": ["billbrandt", "ford"],
  "bobbrownauto": ["bobbrown", "auto"],
  "blossomchevy": ["blossom", "chevy"],
  "gpi.bmwofcolumbia": ["gpi", "bmw", "columbia"],
  "delandkia": ["deland", "kia"],
  "dellaauto": ["della", "auto"],
  "easleymitsubishi": ["easley", "mitsubishi"],
  "eastwestlincoln": ["eastwest", "lincoln"],
  "dyerauto": ["dyer", "auto"],
  "elderdodge": ["elder", "dodge"],
  "elderhyundai": ["elder", "hyundai"],
  "eldermitsubishi": ["elder", "mitsubishi"],
  "elkinschevrolet": ["elkins", "chevrolet"],
  "epicchevrolet": ["epic", "chevrolet"],
  "executivehonda": ["executive", "honda"],
  "extonnissan": ["exton", "nissan"],
  "faireychevrolet": ["fairey", "chevrolet"],
  "fairwayfordevans": ["fairway", "ford", "evans"],
  "fordfairfield": ["ford", "fairfield"],
  "fordlincolnofcookeville": ["ford", "lincoln", "cookeville"],
  "farlandcars": ["farland", "cars"],
  "friendshipauto": ["friendship", "auto"],
  "goldencircle": ["goldencircle", "auto"],
  "nazarethford": ["nazareth", "ford"],
  "fortbendtoyota": ["fortbend", "toyota"],
  "frankleta": ["frank", "leta"],
  "fremonthyundai": ["fremont", "hyundai"],
  "fresnochrysler": ["fresno", "chrysler"],
  "friendlyhondacuse": ["friendly", "honda", "cuse"],
  "gillelandchevrolet": ["gilleland", "chevrolet"],
  "glendaledcj": ["glendale", "dodge"],
  "goldcoastcadillac": ["goldcoast", "cadillac"],
  "garyforceacura": ["garyforce", "acura"],
  "garyforcehonda": ["garyforce", "honda"],
  "graingernissan": ["grainger", "nissan"],
  "nissanofanderson": ["nissan", "anderson"],
  "grandsubaru": ["grand", "subaru"],
  "grantspasstoyota": ["grantspass", "toyota"],
  "easleymitsubishi.com": ["Easley"],
  "dellaauto.net": ["Della"],
  "hardyautomotive.com": ["Hardy"],
  "homangmripon.com": ["Homan"],
  "landroverdallas.com": ["Land Rover Dallas"],
  "hyundaicityny.com": ["Hyundai City"],
  "griecocars.com": ["Grieco Chevy"],
  "hessertchevy.com": ["Hessert Chevy"],
  "serramontehonda.com": ["Serramonte Honda"],
  "darcars": ["darcars"], // For row 2976
  "audiexchange": ["audi", "exchange"], // For row 2994
  "diverchev": ["diver", "chevy"], // For rows 3047, 3049
  "toyotaknoxville": ["toyota", "knoxville"], // For row 3045
  "springfieldford": ["springfield", "ford"] // For rows 3025, 3027
  };

const OVERRIDES = {
   "athensford.com": "Athens Ford", "patmilliken.com": "Pat Milliken", "gusmachadoford.com": "Gus Machado", "geraldauto.com": "Gerald Auto", "mbofbrooklyn.com": "M.B. Brooklyn", "karlchevroletstuart.com": "Karl Stuart",
  "kiaoflagrange.com": "Lagrange Kia", "toyotaofgreenwich.com": "Greenwich Toyota", "sanleandroford.com": "San Leandro Ford", "donhindsford.com": "Don Hinds Ford", "unionpark.com": "Union Park", "jackpowell.com": "Jack Powell",
  "teamford.com": "Team Ford", "miamilakesautomall.com": "Miami Lakes Auto", "mclartydaniel.com": "McLarty Daniel", "autobyfox.com": "Fox Auto", "yorkautomotive.com": "York Auto", "executiveag.com": "Executive AG",
  "smartdrive.com": "Smart Drive", "wickmail.com": "Wick Mail", "oceanautomotivegroup.com": "Ocean Auto", "tommynixautogroup.com": "Tommy Nix", "larryhmillertoyota.com": "Larry H. Miller", "dougrehchevrolet.com": "Doug Reh",
  "caminorealchevrolet.com": "Camino Real Chevy", "golfmillford.com": "Golf Mill", "townandcountryford.com": "Town & Country", "czag.net": "CZAG Auto", "signatureautony.com": "Signature Auto", "sunnysideauto.com": "Sunnyside Chevy",
  "exprealty.com": "Exp Realty", "drivesuperior.com": "Drive Superior", "powerautogroup.com": "Power Auto Group", "crossroadscars.com": "Crossroad", "onesubaru.com": "One Subaru", "vanderhydeford.net": "Vanderhyde Ford",
  "mbusa.com": "M.B. USA", "gomontrose.com": "Go Montrose", "ehchevy.com": "East Hills Chevy", "shoplynch.com": "Lynch", "austininfiniti.com": "Austin Infiniti", "martinchevrolet.com": "Martin Chevy",
  "garberchevrolet.com": "Garber Chevy", "bulluckchevrolet.com": "Bulluck Chevy", "scottclark.com": "Scott Clark", "newhollandauto.com": "New Holland", "lynnlayton.com": "Lynn Layton", "landerscorp.com": "Landers",
  "parkerauto.com": "Parker Auto", "laurelautogroup.com": "Laurel Auto", "rt128honda.com": "RT128", "subaruofwakefield.com": "Subaru Wakefield", "lexusofchattanooga.com": "Lexus Chattanooga", "planet-powersports.net": "Planet Power",
  "garlynshelton.com": "Garlyn Shelton", "saffordbrown.com": "Safford Brown", "saffordauto.com": "Safford Auto", "npsubaru.com": "NP Subaru", "prestoncars.com": "Preston", "toyotaofredlands.com": "Toyota Redland",
  "lexusoflakeway.com": "Lexus Lakeway", "robbinstoyota.com": "Robbin Toyota", "swantgraber.com": "Swant Graber", "sundancechevy.com": "Sundance Chevy", "steponeauto.com": "Step One Auto", "capital-honda.com": "Capital Honda",
  "tituswill.com": "Titus-Will", "galeanasc.com": "Galeana", "mccarthyautogroup.com": "McCarthy Auto Group", "dyerauto.com": "Dyer Auto", "edwardsautogroup.com": "Edwards Auto Group", "hillsidehonda.com": "Hillside Honda",
  "smithtowntoyota.com": "Smithtown Toyota", "thepremiercollection.com": "Premier Collection", "fordtustin.com": "Tustin Ford", "billdube.com": "Bill Dube", "donjacobs.com": "Don Jacobs", "ricksmithchevrolet.com": "Rick Smith",
  "robertthorne.com": "Robert Thorne", "crystalautogroup.com": "Crystal", "davisautosales.com": "Davis", "drivevictory.com": "Victory Auto", "chevyofcolumbuschevrolet.com": "Columbus Chevy", "toyotaofchicago.com": "Chicago Toyota",
  "northwestcars.com": "Northwest Toyota", "mazdanashville.com": "Nashville Mazda", "kiaofchattanooga.com": "Chattanooga Kia", "mikeerdman.com": "Mike Erdman", "tasca.com": "Tasca", "lacitycars.com": "LA City",
  "carsatcarlblack.com": "Carl Black", "southcharlottejcd.com": "Charlotte Auto", "oaklandauto.com": "Oakland Auto", "rodbakerford.com": "Rod Baker", "nplincoln.com": "NP Lincoln", "rohrmanhonda.com": "Rohrman Honda",
  "malouf.com": "Malouf", "prestonmotor.com": "Preston", "demontrond.com": "DeMontrond", "fletcherauto.com": "Fletcher Auto", "davischevrolet.com": "Davis Chevy", "gychevy.com": "Gy Chevy",
  "potamkinhyundai.com": "Potamkin Hyundai", "tedbritt.com": "Ted Britt", "andersonautogroup.com": "Anderson Auto", "racewayford.com": "Raceway Ford", "donhattan.com": "Don Hattan", "chastangford.com": "Chastang Ford",
  "machens.com": "Machens", "taylorauto.com": "Taylor", "dancummins.com": "Dan Cummins", "kennedyauto.com": "Kennedy Auto", "artmoehn.com": "Art Moehn", "mbbhm.com": "M.B. BHM",
  "carlblack.com": "Carl Black", "crewschevrolet.com": "Crews Chevy", "chuckfairbankschevy.com": "Fairbanks Chevy", "kcmetroford.com": "Metro Ford", "keatinghonda.com": "Keating Honda", "phofnash.com": "Porsche Nashville",
  "cadillacoflasvegas.com": "Vegas Cadillac", "vscc.com": "VSCC", "kiaofcerritos.com": "Cerritos Kia", "teamsewell.com": "Sewell", "vannuyscdjr.com": "Van Nuys CDJR", "cincyjlr.com": "Cincy Jaguar",
  "cadillacnorwood.com": "Norwood Cadillac", "alsopchevrolet.com": "Alsop Chevy", "joycekoons.com": "Joyce Koons", "radleyautogroup.com": "Radley Auto Group", "vinart.com": "Vinart", "towneauto.com": "Towne Auto",
  "lauraautogroup.com": "Laura Auto", "hoehnmotors.com": "Hoehn Motor", "westherr.com": "West Herr", "looklarson.com": "Larson", "kwic.com": "KWIC", "maverickmotorgroup.com": "Maverick Motor",
  "donalsonauto.com": "Donalson Auto", "tflauto.com": "TFL Auto", "sharpecars.com": "Sharpe", "secorauto.com": "Secor", "beckmasten.net": "Beck Masten", "moreheadautogroup.com": "Morehead",
  "firstautogroup.com": "First Auto", "lexusoftulsa.com": "Tulsa Lexus", "jetchevrolet.com": "Jet Chevy", "teddynissan.com": "Teddy Nissan", "autonationusa.com": "AutoNation", "robbynixonbuickgmc.com": "Robby Nixon",
  "classicchevrolet.com": "Classic Chevy", "penskeautomotive.com": "Penske Auto", "helloautogroup.com": "Hello Auto", "sunsetmitsubishi.com": "Sunset Mitsubishi", "bmwofnorthhaven.com": "North Haven BMW", "monadnockford.com": "Monadnock Ford",
  "johnsondodge.com": "Johnson Dodge", "hgreglux.com": "HGreg Lux", "lamesarv.com": "La Mesa RV", "mcdanielauto.com": "McDaniel", "toyotaworldnewton.com": "Newton Toyota", "lexusofnorthborough.com": "Northborough Lexus",
  "eagleautomall.com": "Eagle Auto Mall", "edwardsgm.com": "Edwards GM", "nissanofcookeville.com": "Cookeville Nissan", "daytonahyundai.com": "Daytona Hyundai", "daystarchrysler.com": "Daystar Chrysler", "sansoneauto.com": "Sansone Auto",
  "germaincars.com": "Germain Cars", "steelpointeauto.com": "Steel Pointe", "tomlinsonmotorco.com": "Tomlinson Motor", "kerbeck.net": "Kerbeck", "jacksoncars.com": "Jackson", "bighorntoyota.com": "Big Horn",
  "hondaoftomsriver.com": "Toms River", "faireychevrolet.com": "Fairey Chevy", "tomhesser.com": "Tom Hesser", "saabvw.com": "Scmelz", "philsmithkia.com": "Phil Smith", "dicklovett.co.uk": "Dick Lovett",
  "jtscars.com": "JT Auto", "street-toyota.com": "Street", "jakesweeney.com": "Jake Sweeney", "toyotacedarpark.com": "Cedar Park", "bulldogkia.com": "Bulldog Kia", "bentleyauto.com": "Bentley Auto",
  "obrienauto.com": "O'Brien Auto", "hmtrs.com": "HMTR", "delandkia.net": "Deland Kia", "eckenrodford.com": "Eckenrod", "curriemotors.com": "Currie Motor", "aldermansvt.com": "Aldermans VT",
  "goldcoastcadillac.com": "Gold Coast", "mterryautogroup.com": "M Terry Auto", "mikeerdmantoyota.com": "Mike Erdman", "jimfalkmotorsofmaui.com": "Jim Falk", "serpentinichevy.com": "Serpentini", "deaconscdjr.com": "Deacons CDJR",
  "golfmillchevrolet.com": "Golf Mill", "rossihonda.com": "Rossi Honda", "stadiumtoyota.com": "Stadium Toyota", "cavendercadillac.com": "Cavender", "carterhonda.com": "Carter Honda", "fairoaksford.com": "Fair Oaks Ford",
  "tvbuickgmc.com": "TV Buick", "chevyland.com": "Chevy Land", "carvertoyota.com": "Carver", "wernerhyundai.com": "Werner Hyundai", "memorialchevrolet.com": "Memorial Chevy", "mbofsmithtown.com": "M.B. Smithtown",
  "wideworldbmw.com": "Wide World BMW", "destinationkia.com": "Destination Kia", "eastcjd.com": "East CJD", "pinehurstautomall.com": "Pinehurst Auto", "bramanmc.com": "Braman MC", "laurelchryslerjeep.com": "Laurel",
  "porschewoodlandhills.com": "Porsche Woodland", "kingsfordinc.com": "Kings Ford", "carusofordlincoln.com": "Caruso", "billsmithbuickgmc.com": "Bill Smith", "mclartydanielford.com": "McLarty Daniel", "mcgeorgetoyota.com": "McGeorge",
  "rosenautomotive.com": "Rosen Auto", "valleynissan.com": "Valley Nissan", "perillobmw.com": "Perillo BMW", "newsmyrnachevy.com": "New Smyrna Chevy", "charliesmm.com": "Charlie's Motor", "towbinauto.com": "Tow Bin Auto",
  "tuttleclick.com": "Tuttle Click", "chmb.com": "M.B. Cherry Hill", "autobahnmotors.com": "Autobahn Motor", "bobweaver.com": "Bob Weaver", "bmwwestspringfield.com": "BMW West Springfield", "londoff.com": "Londoff",
  "fordhamtoyota.com": "Fordham Toyota", "thechevyteam.com": "Chevy Team", "crownautomotive.com": "Crown Auto", "haaszautomall.com": "Haasz Auto", "hyundaioforangepark.com": "Orange Park Hyundai", "risingfastmotors.com": "Rising Fast",
  "hananiaautos.com": "Hanania Auto", "bevsmithtoyota.com": "Bev Smith", "givemethevin.com": "Give me the Vin", "championerie.com": "Champion Erie", "andymohr.com": "Andy Mohr", "alpine-usa.com": "Alpine USA",
  "bettenbaker.com": "Baker Auto", "bianchilhonda.com": "Bianchil Honda", "bienerford.com": "Biener Ford", "citykia.com": "City Kia", "classiccadillac.net": "Classic Cadillac", "driveclassic.com": "Drive Classic",
  "crosscreekcars.com": "Cross Creek", "elkgrovevw.com": "Elk Grove", "elyriahyundai.com": "Elyria Hyundai", "joecs.com": "Joe", "fordlincolncharlotte.com": "Ford Charlotte", "jcroffroad.com": "JCR Offroad",
  "jeffdeals.com": "Jeff", "jenkinsandwynne.com": "Jenkins & Wynne", "mbofwalnutcreek.com": "M.B. Walnut Creek", "mbcutlerbay.com": "M.B. Cutler Bay", "mbmnj.com": "M.B. Morristown", "mbrvc.com": "M.B. RVC",
  "sfbenz.com": "M.B. San Fran", "mbnaunet.com": "M.B. Naunet", "mbofmc.com": "M.B. Music City", "mercedesbenzstcharles.com": "M.B. St. Charles", "npcdjr.com": "NP Chrysler", "obrienteam.com": "O'brien Team",
  "palmetto57.com": "Palmetto", "rbmofatlanta.com": "RBM Atlanta", "samscismfordlm.com": "Sam Cism", "suntrupbuickgmc.com": "Suntrup", "acdealergroup.com": "AC Dealer", "daytonandrews.com": "Dayton Andrews",
  "fordofdalton.com": "Dalton Ford", "metrofordofmadison.com": "Metro Ford", "williamssubarucharlotte.com": "Williams Subaru", "vwsouthtowne.com": "VW South Towne", "scottclarkstoyota.com": "Scott Clark", "duvalford.com": "Duval",
  "devineford.com": "Devine", "allamericanford.net": "All American", "slvdodge.com": "Silver Dodge", "regalauto.com": "Regal Auto", "elwaydealers.net": "Elway", "chapmanchoice.com": "Chapman",
  "jimmybrittchevrolet.com": "Jimmy Britt", "toyotaofslidell.net": "Slidell Toyota", "venturatoyota.com": "Ventura Toyota", "tuscaloosatoyota.com": "Tuscaloosa Toyota", "lakelandtoyota.com": "Lakeland Toyota", "wilsonvilletoyota.com": "Wilsonville Toyota",
  "ricart.com": "Ricart Auto", "kingstonnissan.net": "Kingston Nissan", "richmondford.com": "Richmond Ford", "avisford.com": "Avis Ford", "butlerhonda.com": "Butler Honda", "classicbmw.com": "Classic BMW",
  "masano.com": "Masano Auto", "huntingtonbeachford.com": "Huntington Beach Ford", "jaywolfe.com": "Jay Wolfe", "pugmire.com": "Pugmire Auto", "starlingchevy.com": "Starling Chevy", "shottenkirk.com": "Shottenkirk Auto",
  "potamkinatlanta.com": "Potamkin Atlanta", "atamian.com": "Atamian Auto", "colonial-west.com": "Colonial West", "gravityautos.com": "Gravity Auto", "drivesunrise.com": "Drive Sunrise", "subaruofgwinnett.com": "Subaru Gwinnett",
  "hondakingsport.com": "Kingsport Honda", "galpin.com": "Galpin Auto", "irvinebmw.com": "Irvine BMW", "southcharlottechevy.com": "South Charlotte Chevy", "cioccaauto.com": "Ciocca Auto", "barlowautogroup.com": "Barlow Auto",
  "shultsauto.com": "Shults Auto", "sewell.com": "Sewell Auto", "malloy.com": "Malloy Auto", "mbofhenderson.com": "M.B. Henderson", "campbellcars.com": "Campbell Auto", "redmac.net": "Redmac Auto",
  "lakewoodford.net": "Lakewood Ford", "waconiadodge.com": "Waconia Dodge", "westgatecars.com": "Westgate Auto", "startoyota.net": "Star Toyota", "alanbyervolvo.com": "Alan Byer", "bearmtnadi.com": "Bear Mountain",
  "prostrollo.com": "Prostrollo", "mattiaciogroup.com": "Mattiaccio", "bespokemotorgroup.com": "Bespoke Motor", "lexusedison.com": "Lexus Edison", "bennaford.com": "Benna Ford", "mbofselma.com": "M.B. Selma",
  "evergreenchevrolet.com": "Evergreen Chevy", "mclarenphiladelphia.com": "Mclaren Philadelphia", "haaszautomall.com": "Haasz Auto", "johnsinclairauto.com": "John Sinclair", "southtownmotors.com": "Southtown Motor", "clevelandporsche.com": "Cleveland Porsche",
  "airportkianaples.com": "Airport Kia Naples", "audimv.com": "Audi MV", "lousobhkia.com": "Lou Sobh", "mcgrathauto.com": "McGrath Auto", "hileyhuntsville.com": "Hiley Huntsville", "porscheredwoodcity.com": "Porsche Redwood City",
  "infinitiofnashua.com": "Infiniti Nashua", "diplomatmotors.com": "Diplomat Motor", "patpeck.com": "Pat Peck", "carstoreusa.com": "Car Store USA", "mbcoralgables.com": "M.B. Coral Gables", "risingfastmotorcars.com": "Rising Fast Motor",
  "bentleynaples.com": "Bentley Naples", "veramotors.com": "Vera Motor", "sutherlinautomotive.com": "Sutherlin Auto", "rogerbeasley.com": "Roger Beasley", "grubbsauto.com": "Grubbs Auto", "dmautoleasing.com": "DM Auto",
  "group1auto.com": "Group 1 Auto", "peterboulwaretoyota.com": "Peter Boulware", "principleauto.com": "Principle Auto", "mbso.com": "M.B. SO", "audidallas.com": "Audi Dallas", "abernethychrysler.com": "Abernethy Chrysler",
  "acuraofbayshore.com": "Acura Bayshore", "acuraofjackson.com": "Acura Jackson", "acuraofmemphis.com": "Acura Memphis", "acuraofwestchester.com": "Acura Westchester", "acuraofhuntington.com": "Acura Huntington", "acuraofpleasanton.com": "Acura Pleasanton",
  "mbofburlingame.com": "M.B. Burlingame", "mbofwestmont.com": "M.B. Westmont", "toyotaofnaperville.com": "Naperville Toyota", "kiaofirvine.com": "Irvine Kia", "thinkmidway.com": "Think Midway", "pinegarchevrolet.com": "Pinegar Chevy",
  "suntruphyundai.com": "Suntrup Hyundai", "gravityautosroswell.com": "Gravity Roswell", "newportbeachlexus.com": "Lexus Newport Beach", "paloaltoaudi.com": "Audi Palo Alto", "santabarbarahonda.com": "Santa Barbara Honda", "jimtaylorautogroup.com": "Jim Taylor",
  "ricartford.com": "Ricart Ford", "byerschevrolet.com": "Byers Chevy", "mohrautomotive.com": "Mohr Auto", "vosschevrolet.com": "Voss Chevy", "akinsford.com": "Akins Ford", "weaverautos.com": "Weaver Auto",
  "lexusofneworleans.com": "Lexus New Orleans",
  "hyundaiofnorthcharleston.com": "Hyundai North Charleston",
  "toyotaofgastonia.com": "Toyota Gastonia",
  "butlercdj.com": "Butler Dodge",
  "stoopsbuickgmc.com": "Stoops",
  "northparklexus.com": "North Park Lexus",
  "statewideford.com": "Statewide Ford",
  "naplesdodge.com": "Naples Dodge",
  "hillsboroford.com": "Hillsboro Ford",
  "infinitiofbeachwood.com": "Infiniti Beachwood",
  "toyotaofmurfreesboro.com": "Toyota Murfreesboro",
  "kiadm.com": "Kia DM",
  "palmcoastford.com": "Palm Coast Ford",
  "rosevillekia.com": "Roseville Kia",
  "jimtaylorautogroup.com": "Jim Taylor",
  "suntrup.com": "Suntrup",
  "sewell.com": "Sewell",
  "rudyluthertoyota.com": "Rudy Luther",
  "buckeyeford.com": "Buckeye Ford",
  "sandschevrolet.com": "Sands Chevy",
  "papesubaru.com": "Pape Subaru",
  "medlincars.com": "Medlin",
  "mikeshawkia.com": "Mike Shaw",
  "mbofstockton.com": "M.B. Stockton",
  "nfwauto.com": "NFW Auto",
  "vivaautogroup.com": "Viva Auto",
  // Additional domains from previous mappings not included in the new list
  "wilsonvilletoyota.com": "Wilsonville Toyota",
  "classickiacarrollton.com": "Kia Carrollton",
  "audicentralhouston.com": "Audi Houston",
  "eastsidesubaru.com": "East Side Subaru",
  "northcountyford.com": "North County Ford",
  "midwayfordmiami.com": "Midway Ford",
  "kiaofauburn.com": "Kia Auburn",
    "alsopchevrolet.com": "Alsop Chevy",
  "cavalierford.com": "Cavalier Ford",
  "northbakersfieldtoyota.com": "North Bakersfield Toyota",
  "rudyluthertoyota.com": "Rudy Luther",
  "heritageautogrp.com": "Heritage Auto",
  "haleyauto.com": "Haley", // Chose "Haley" to avoid "Auto" conflict with car brand rule
  "rohrmanauto.com": "Rohr Man",
  "sandschevrolet.com": "Sands Chevy",
  "metro-toyota.com": "Metro Toyota",
  "toyotaofrockwall.com": "Toyota Rockwall",
  "rosevillekia.com": "Roseville Kia",
  "novatochevrolet.com": "Novato Chevy",
  "sjinfiniti.com": "SJ Infiniti",
  "goldenwestoil.com": "Golden West",
  "saveatsterling.com": "Saveat Sterling",
  "worldkiajoliet.com": "Kia Joliet",
  "mabryautogroup.com": "Mabry Auto",
  "venicetoyota.com": "Venice Toyota",
  "copplecars.com": "Copple",
  "airportmarinehonda.com": "Airport Honda",
  "anderson-auto.net": "Anderson Auto",
  "audicentralhouston.com": "Audi Houston",
  "carlblack.com": "Carl Black",
  "lexusoftulsa.com": "Tulsa Lexus",
  "fergusondeal.com": "Ferguson Deal",
  "duvalford": "Duval", // Corrected from 'Duval Ford'
  "reddingsubaru": "Redding Subaru",
  "irvinebmw": "Irvine BMW",
  "waconiadodge": "Waconia Dodge",
  "eastsidesubaru": "East Side Subaru",
  "braunability.com": "Braun Ability", // Row 1214–1215, unchanged (descriptive, no brand)
  "brinsonford.com": "Brinson", // Row 1219–1220, was "Brinson Ford"
  "bunnin.com": "Bunnin", // Row 1212, was "Bunnin Auto"
  "atzenhofferchevrolet.com": "Atzenhoffer", // Row 1217, was "Atzenhoffer Chevy"
  "bodwellchryslerjeepdodge.com": "Bodwell", // Row 1213, was "Bodwell Chrysler"
  "empirenissan.com": "Empire", // Row 1396, was "Empire Nissan"
  "bobbyrahal.com": "Bobby Rahal", // Row 1207, unchanged (first/last name)
  "bochtoyotasouth.com": "Boch", // Row 1208, was "Boch Toyota South"
  "bowmanchevy.com": "Bowman", // Row 1209, was "Bowman Chevy"
  "boylebuickgmc.com": "Boyle", // Row 1210, was "Boyle Buick GMC" (chose no brand)
  "bridgewaterchevrolet.com": "Bridgewater Chevy", // Row 1216, unchanged (city-based, brand needed for clarity)
  "buchanansubaru.com": "Buchanan", // Row 1218, was "Buchanan Subaru"
  "buckalewchevrolet.com": "Buckalew", // Row 1221, was "Buckalew Chevy"
  "burnschevrolet.com": "Burns", // Row 1222, was "Burns Chevy"
  "butlerford.com": "Butler", // Row 1223, was "Butler Ford"
  "byerssubaru.com": "Byers", // Row 1224, was "Byers Subaru"
  "cabralchryslerjeepdodgeram.com": "Cabral", // Row 1225, was "Cabral Chrysler" (chose no brand)
  "caldwellauto.com": "Caldwell", // Row 1226, was "Caldwell Auto"
  "campbellauto.com": "Campbell", // Row 1228, was "Campbell Auto"
  "carlblackchevrolet.com": "Carl Black", // Row 1229, was "Carl Black Chevy"
  "carlsenchevrolet.com": "Carlsen", // Row 1230, was "Carlsen Chevy"
  "carolinaford.com": "Carolina", // Row 1232, was "Carolina Ford"
  "carterhonda.com": "Carter", // Row 1233, was "Carter Honda"
  "carusohyundai.com": "Caruso", // Row 1235, was "Caruso Hyundai"
  "cavenderchevrolet.com": "Cavender", // Row 1236, was "Cavender Chevy"
  "centennialtoyota.com": "Centennial", // Row 1237, was "Centennial Toyota"
  "chapmanchevrolet.com": "Chapman", // Row 1238, was "Chapman Chevy"
  "charlesclarkchevrolet.com": "Charles Clark", // Row 1239, was "Charles Clark Chevy"
  "chasechevrolet.com": "Chase", // Row 1240, was "Chase Chevy"
  "chesrownchevrolet.com": "Chesrown", // Row 1241, was "Chesrown Chevy"
  "chrisleithchevrolet.com": "Chris Leith", // Row 1242, was "Chris Leith Chevy"
  "cioccachevrolet.com": "Ciocca", // Row 1243, was "Ciocca Chevy"
  "classiccadillacatlanta.com": "Classic", // Row 1244, was "Classic Cadillac"
  "clawsonhonda.com": "Clawson", // Row 1245, was "Clawson Honda"
  "colemanchevrolet.com": "Coleman", // Row 1246, was "Coleman Chevy"
  "colonialhyundai.com": "Colonial", // Row 1247, was "Colonial Hyundai"
  "columbiatoyota.com": "Columbia", // Row 1248, was "Columbia Toyota"
  "conleycdj.com": "Conley", // Row 1249, was "Conley Chrysler"
  "copplechevroletgmc.com": "Copple", // Row 1250, was "Copple Chevy GMC" (chose no brand)
  "corwinford.com": "Corwin", // Row 1251, was "Corwin Ford"
  "coultercadillacbuickgmc.com": "Coulter", // Row 1252, was "Coulter Cadillac" (chose no brand)
  "covertchevrolet.com": "Covert", // Row 1253, was "Covert Chevy"
  "crownchryslerdodgejeep.com": "Crown", // Row 1254, was "Crown Chrysler"
  "cumminschryslerdodgejeep.com": "Cummins", // Row 1257, was "Cummins Chrysler"
  "darlingchevrolet.com": "Darling", // Row 1270, was "Darling Chevy"
  "davidsonchevrolet.com": "Davidson", // Row 1271, was "Davidson Chevy"
  "davisautogroup.com": "Davis Auto", // Row 1272, was "Davis Auto" (ends in "s", brand needed)
  "dayschevrolet.com": "Days Chevy", // Row 1273, was "Days Chevy" (ends in "s", brand needed)
  "daytonandrews.com": "Dayton Andrews", // Row 1274, unchanged (first/last name)
"chapmanchoice.com": "Chapman", // Rows 1258–1267, LastNameBrandPattern, standardized name
  "deerychevrolet.com": "Deery", // Row 1275, LastNameBrandPattern
  "deienchevrolet.com": "Deien", // Row 1276, LastNameBrandPattern
  "delrayhonda.com": "Delray", // Row 1277, CityBrandPattern
  "denneychevrolet.com": "Denney", // Row 1278, LastNameBrandPattern
  "dillonford.com": "Dillon", // Row 1279, LastNameBrandPattern
  "denooyerchevrolet.com": "Denooyer", // Row 1280, LastNameBrandPattern
  "depaulachevrolet.com": "Depaula", // Row 1281, LastNameBrandPattern
  "diersford.com": "Diers", // Row 1282, LastNameBrandPattern
  "difeochevrolet.com": "Difeo", // Row 1283, LastNameBrandPattern
  "doengesford.com": "Doenges", // Row 1284, LastNameBrandPattern
  "dormanproducts.com": "Dorman", // Row 1285, LastNameBrandPattern
  "dorschford.com": "Dorsch", // Row 1286, LastNameBrandPattern
  "dougschevrolet.com": "Dougs", // Row 1287, FirstNameBrandPattern (ends in "s", no brand)
  "duncanchevrolet.com": "Duncan", // Row 1288, LastNameBrandPattern
  "duvalhonda.com": "Duval", // Row 1289, LastNameBrandPattern
  "dyerchevrolet.com": "Dyer", // Row 1290, LastNameBrandPattern
  "eaglehonda.com": "Eagle", // Row 1291, DescriptiveAutoPattern
  "edchevrolet.com": "Ed", // Row 1292, FirstNameBrandPattern
  "eideford.com": "Eide", // Row 1293, LastNameBrandPattern
  "elderford.com": "Elder", // Row 1294, LastNameBrandPattern
  "eskridgechevrolet.com": "Eskridge", // Row 1295, LastNameBrandPattern
  "estlechevrolet.com": "Estle", // Row 1296, LastNameBrandPattern
  "evergreenford.com": "Evergreen", // Row 1297, DescriptiveAutoPattern
  "farrishchryslerjeepdodge.com": "Farrish", // Row 1298, LastNameBrandPattern
  "faulknerchevrolet.com": "Faulkner", // Row 1299, LastNameBrandPattern
  "feenychryslerdodgejeep.com": "Feeny", // Row 1300, LastNameBrandPattern
  "fergusonchevrolet.com": "Ferguson", // Row 1301, LastNameBrandPattern
  "fivestarford.com": "Five Star", // Row 1302, DescriptiveAutoPattern
  "gatewaychevrolet.com": "Gateway", // Row 1303, DescriptiveAutoPattern
  "goldsteinchryslerjeepdodge.com": "Goldstein", // Row 1304, LastNameBrandPattern
  "graberford.com": "Graber", // Row 1305, LastNameBrandPattern
  "graingerhonda.com": "Grainger", // Row 1306, LastNameBrandPattern
  "greggyoungchevrolet.com": "Gregg Young", // Row 1307, FirstNameBrandPattern
  "haggertyford.com": "Haggerty", // Row 1308, LastNameBrandPattern
  "halleenchevrolet.com": "Halleen", // Row 1309, LastNameBrandPattern
  "hannerchevrolet.com": "Hanner", // Row 1310, LastNameBrandPattern
  "hardinchevrolet.com": "Hardin", // Row 1311, LastNameBrandPattern
  "hileyhuntsville.com": "Hiley", // Row 1312, LastNameBrandPattern
  "hodgesmazda.com": "Hodges", // Row 1313, LastNameBrandPattern
  "hollerhyundai.com": "Holler", // Row 1314, LastNameBrandPattern
  "hornechevrolet.com": "Horne", // Row 1315, LastNameBrandPattern
  "housechevrolet.com": "House", // Row 1316, LastNameBrandPattern
  "huberchevrolet.com": "Huber", // Row 1317, LastNameBrandPattern
  "hugginschevrolet.com": "Huggin", // Row 1318, LastNameBrandPattern
  "huntchevrolet.com": "Hunt Chevy", // Row 1319, LastNameBrandPattern
  "idechevrolet.com": "Ide Chevy", // Row 1320, LastNameBrandPattern
  "ingersollchevrolet.com": "Ingersoll", // Row 1321, LastNameBrandPattern
  "irwinchevrolet.com": "Irwin", // Row 1322, LastNameBrandPattern
  "jacobschevrolet.com": "Jacobs Chevy", // Row 1323, LastNameBrandPattern
  "bmwofelcajon.com": "BMW El Cajon",
  "berlincity.com": "Berlin City Motors",
  "carhop.com": "Carhop",
  "billboruff.com": "Bill Boruff",
  "calavanauto.com": "Calavan",
  "bloomingtoncjd.com": "Bloomington Chrysler",
  "vacavillegmc.com": "Vacaville GMC",
  "budschevy.com": "Buds Chevy",
  "southwestmotors.com": "Southwest Motors",
  "griffinauto.com": "Griffin",
  "highlandchevy.com": "Highland Chevy",
  "riveroakschrysler.com": "River Oaks Chrysler",
  "starkeychevrolet.com": "Starkey Chevy",
  "meridianford.com": "Meridian Ford",
  "loneoakchevrolet.com": "Lone Oak Chevy",
  "palmettoford.com": "Palmetto Ford",
  "saddlecreekauto.com": "Saddle Creek Auto",
  "keystonechevrolet.com": "Keystone Chevy",
  "deserttoyota.com": "Desert Toyota",
  "canyoncreektoyota.com": "Canyon Creek Toyota",
  "mbofstockton.com": "M.B. Stockton",
  "mbofwalnutcreek.com": "M.B. Walnut Creek",
  "mbcoralgables.com": "M.B. Coral Gables",
  "mbwinstonsalem.com": "M.B. Winston Salem",
  "prpseats.com": "PRP Seats",
  "putnamauto.com": "Putnam",
  "putnamgm.com": "Putnam",
  "rallyeacura.com": "Rally",
  "resslermotors.com": "Ressler",
  "huvaere.com": "Huvaere",
  "greenautogroup.com": "Green",
  "brogdenauto.com": "Brogden",
  "robertsmotors.com": "Roberts",
  "rosenthalacura.com": "Rosenthal Acura",
  "hannerchevrolet.com": "Hanner Chevy",
  "myhappyhyundai.com": "Happy Hyundai",
  "harbor-hyundai.com": "Harbor Hyundai",
  "hardin.com": "Hardin",
  "hemetcdjr.com": "Hemet",
  "heritagecadillac.com":"Heritage Cadillac",
  "hodgessubaru.com": "Hodges Subaru",
  "hmtrs.com": "HMTR",
  "hondamorristown.com": "Morristown Honda",
  "hondasanmarcos.com": "San Marcos Honda",
  "hedrickschevy.com": "Hedrick",
  "hondaoflincoln.com": "Lincoln Honda",
  "hillsidehonda.com": "Hillside",
  "hondakingsport.com": "Kingsport",
  "newhollandauto.com": "New Holland",
  "hollerhonda.com": "Holler Honda",
  "hollerhyundai.com": "Holler Hyundai",
  "infinitibhm.com": "Infiniti Birmingham",
  "infinitiofgwinnett.com": "Gwinnett Infiniti",
  "infinitioflexington.com": "Lexington Infiniti",
  "infinitioftucson.com": "Tucson Infiniti",
  "jlrfairfield.com": "Fairfield",
  "jamescdjr.com": "James Chrysler",
  "aclexus.com": "Lexus Atlantic City",
  "arrowheadmb.com": "M.B. Arrowhead",
  "bhbenz.com": "M.B. Beverly Hills",
  "bloomingtonacurasubaru.com": "Bloomington Acura",
  "calabasasmbz.net": "M.B. Calabasas",
  "chevystore.com": "Chevy Store",
  "chmb.com": "M.B. Cherry Hill",
  "clickliberty.com": "Click Liberty",
  "eideford.com": "Eide Ford",
  "elderhyundai.com": "Elder",
  "elkgroveacura.com": "Elk Grove Acura",
  "elkgrovedodge.com": "Elk Grove Dodge",
  "elkgrovevw.com": "Elk Grove VW",
  "elyriahyundai.com": "Elyria Hyundai",
  "empirenissan.com": "Empire Nissan",
  "emetroford.com": "Metro Ford",
  "formulanissan.com": "Formula Nissan",
  "fortcollinsdcj.com": "Fort Collins Chrysler",
  "fortcollinskia.com": "Fort Collins Kia",
  "frankbeck.info": "Frank Beck",
  "fredlaverycompany.com": "Fred Lavery",
  "freeholdautos.com": "Freehold Auto",
  "freeholddodgesubaru.com": "Freehold Dodge Subaru",
  "freeholdjeep.com": "Freehold Jeep",
  "gardenstatehonda.com": "Garden State Honda",
  "garrettmotors.com": "Garrett Motors",
  "gatewaykia.com": "Gateway Kia",
  "gaultauto.com": "Gault Auto",
  "genelatta.com": "Gene Latta",
  "georgechevy.com": "George Chevrolet",
  "georgewhiteames.com": "George White Ames",
  "graysonhyundai.com": "Grayson Hyundai",
  "greencc.com": "Green Chevrolet",
  "greghublerchevy.com": "Greg Hubler Chevrolet",
  "greshamford.com": "Gresham Ford",
  "grevechrysler.com": "Greve Chrysler",
  "griffinnissan.com": "Griffin Nissan",
  "guntersvillechevrolet.com": "Guntersville Chevrolet",
  "haciendaford.com": "Hacienda Ford",
  "hadwin-white.com": "Hadwin White",
  "haleyauto.com": "Haley Auto",
  "halleenkia.com": "Halleen Kia",
  "hamiltonchevy.com": "Hamilton Chevrolet",
  "hannerchevrolet.com": "Hanner Chevrolet",
  "heritagecadillac.com": "Heritage Cadillac",
  "hickorytoyota.com": "Hickory Toyota",
  "hillsidehonda.com": "Hillside Honda",
  "hiltonheadlexus.com": "Hilton Head Lexus",
  "hodgessubaru.com": "Hodges Subaru",
  "hollerhonda.com": "Holler Honda",
  "hollerhyundai.com": "Holler Hyundai",
  "hondaofgainesville.com": "Gainesville Honda",
  "hondaoflincoln.com": "Lincoln Honda",
  "hondaofwatertown.com": "Watertown Honda",
  "hondakingsport.com": "Kingsport Honda",
  "hondamorristown.com": "Morristown Honda",
  "hondasanmarcos.com": "San Marcos Honda",
  "horneautogroup.com": "Horne Auto",
  "housechevrolet.com": "House Chevrolet",
  "hubermotorcars.com": "Huber Motor",
  "hugginshonda.com": "Huggins Honda",
  "hugheshonda.com": "Hughes Honda",
  "huntauto.com": "Hunt Auto",
  "huntingtonhyundai.com": "Huntington Hyundai",
  "huntingtonjeep.com": "Huntington Jeep",
  "hustoncars.com": "Huston",
  "infinitibhm.com": "Infiniti Birmingham",
  "infinitiofgwinnett.com": "Infiniti Gwinnett",
  "infinitioflexington.com": "Infiniti Lexington",
  "infinitioftucson.com": "Infiniti Tucson",
  "jamescdjr.com": "James Chrysler",
  "jlrfairfield.com": "Fairfield Jeep",
  "leecdjr.com": "Lee Chrysler",
  "leehyundai.com": "Lee Hyundai",
  "legendnissan.com": "Legend Nissan",
  "levittownford.com": "Levittown Ford",
  "lexuscarlsbad.com": "Lexus Carlsbad",
  "lexusofchestersprings.com": "Lexus Chester Springs",
  "lexusofdayton.com": "Lexus Dayton",
  "lexusofglendale.com": "Lexus Glendale",
  "lexusofhenderson.com": "Lexus of Henderson",
  "lexusoflakeway.com": "Lexus of Lakeway",
  "lexusoflouisville.com": "Lexus Louisville",
  "lexusoflasvegas.com": "Lexus Vegas",
  "lexusofmemphis.com": "Lexus Memphis",
  "lexusofmobile.com": "Lexus Mobile",
  "lexusofqueens.com": "Lexus Queens",
  "lexussantamonica.com": "Lexus Santa Monica",
  "libertyauto.com": "Liberty Auto",
  "lincolnindustries.com": "Lincoln Industry",
  "lindquistford.com": "Lindquist",
  "lindsayacura.com": "Lindsay",
  "lindsayhonda.com": "Lindsay",
  "lockhartcadillac.com": "Lockhart Cadillac",
  "lodihonda.com": "Lodi Honda",
  "lodotruck.it": "Lodo Truck",
  "loveford.com": "Love Ford",
  "loveringvolvo.com": "Lovering",
  "lutherfamilybuickgmc.com": "Luther Family",
  "lutherhopkinshonda.com": "Luther Hopkins",
  "magcars.com": "MAG",
  "mahwahhonda.com": "Mahwah",
  "maitacars.com": "Maita",
  "malouf.com": "Malouf",
  "manahawkinkia.com": "Manahawkin Kia",
  "manchesterhonda.com": "Manchester Honda",
  "mandalcdjr.com": "Mandal Chrysler",
  "mannchrysler.com": "Mann Chrysler",
  "mariettatoyota.com": "Marietta Toyota",
  "marinocjd.com": "Marino Chrysler",
  "marionsubaru.com": "Marion Subaru",
  "markhammazda.ca": "Markham Mazda",
  "marlboronissan.com": "Marlboro Nissan",
  "martinchevrolet.com": "Martin Chevy",
  "martinhonda.com": "Martin Honda",
  "martinmazda.com": "Martin Mazda",
  "mathewsford.com": "Mathews Ford",
  "maxwellford.com": "Maxwell Ford",
  "mazdaofroswell.com": "Mazda Roswell",
  "mazdaofwooster.com": "Mazda Wooster",
  "mbbr.com": "M.B. Baton Rouge",
  "mbbhm.com": "M.B. Birmingham",
  "mbcincy.com": "M.B. Cincinnati",
  "mbcoralgables.com": "M.B. Coral Gables",
  "mbcutlerbay.com": "M.B. Cutler Bay",
  "mbencino.com": "M.B. Encino",
  "mbfm.com": "M.B. Fort Myers",
  "mbmnj.com": "M.B. Morristown",
  "mbofbrooklyn.com": "M.B. Brooklyn",
  "mbofdanbury.com": "M.B. Danbury",
  "mbofhagerstown.com": "M.B. Hagerstown",
  "mbofhenderson.com": "M.B. Henderson",
  "mbofmc.com": "M.B. McKinney",
  "mbofmodesto.com": "M.B. Modesto",
  "mbofselma.com": "M.B. Selma",
  "mbofsmithtown.com": "M.B. Smithtown",
  "mbofstockton.com": "M.B. Stockton",
  "mbofwalnutcreek.com": "M.B. Walnut Creek",
  "mblouisville.com": "M.B. Louisville",
  "mbloveland.com": "M.B. Loveland",
  "mbnanuet.com": "M.B. Nanuet",
  "mbokc.com": "M.B. Oklahoma City",
  "mbontario.com": "M.B. Ontario",
  "mbrvc.com": "M.B. Rancho Cucamonga",
  "mbtemecula.com": "M.B. Temecula",
  "mbwestminster.com": "M.B. Westminster",
  "mbwhiteplains.com": "M.B. White Plains",
  "mbwinstonsalem.com": "M.B. Winston Salem",
  "mccaddon.com": "McCaddon",
  "mcdonaldag.com": "McDonald Auto",
  "mcdonaldautomotive.com": "McDonald Auto",
  "mcgeecars.com": "McGee",
  "mcgrathauto.com": "McGrath",
  "mcguirechevy.com": "McGuire Chevy",
  "mclartydaniel.com": "McLarty Daniel",
  "meadelexus.com": "Meade",
  "medlincars.com": "Medlin",
  "melloyhonda.com": "Melloy",
  "mercedesbenzstcharles.com": "M.B. St Charles",
  "metroacura.com": "Metro Acura",
  "miamilakesautomall.com": "Miami Lakes Auto",
  "mikebellchevrolet.com": "Mike Bell Chevrolet",
  "millschevy.com": "Mills Chevy",
  "minchinbpg.com": "Minchin Buick",
  "mohawkhonda.com": "Mohawk Honda",
  "molletoyota.com": "Molle Toyota",
  "monumentchevrolet.com": "Monument Chevy",
  "moonhonda.com": "Moon Honda",
  "motionautogroup.com": "Motion",
  "moyernissan.com": "Moyer",
  "mullinaxford.com": "Mullinax",
  "myhudsonnissan.com": "Hudson Nissan",
  "naplesluxuryimports.com": "Naples Luxury Imports",
  "ncbcg.com": "North County Buick",
  "nelsoncars.com": "Nelson",
  "nemerford.com": "Nemer Ford",
  "newportlexus.com": "Newport Lexus",
  "nickchevrolet.com": "Nick Chevy",
  "nissancity.com": "Nissan City",
  "nissanofmiddletown.com": "Nissan Middletown",
  "nissanofmurfreesboro.com": "Nissan Murfreesboro",
  "northbakersfieldtoyota.com": "Bakersfield Toyota",
  "northcuttauto.com": "Northcutt Auto",
  "northpointcjd.com": "North Point Chrysler",
  "northshoremazda.net": "North Shore Mazda",
  "northshoretoyota.com": "North Shore Toyota",
  "northtownauto.com": "Northtown Auto",
  "npcdjr.com": "NP Chrysler",
  "sfbenz.com": "M.B. San Francisco",
  "steadcadillac.com": "Stead Cadillac",
  "usedvwaudi.com": "Used VW Audi",
  "victoryshallotte.com": "Victory Shallotte",
  "westsidevw.com": "Westside VW",
  "brogdenauto.com": "Brogden",
  "contecadillac.com": "Conte Cadillac",
  "getahonda.net": "Get A Honda",
  "golling.com": "Golling",
  "greenautogroup.com": "Green Auto",
  "hondahawaii.com": "Hawaii Honda",
  "huvaere.com": "Huvaere",
  "jeffperrygm.com": "Jeff Perry",
  "lincolnoftampa.com": "Lincoln Tampa",
  "mbofwestchester.com": "M.B. Westchester",
  "northwestdodge.com": "NW Dodge",
  "nwhcars.com": "NW Honda",
  "nwjeep.com": "NW Jeep",
  "nyeauto.com": "NYE Auto",
  "oaklandacura.com": "Oakland Acura",
  "oakwoodnissan.com": "Oakwood Nissan",
  "obrienteam.com": "O'Brien Team",
  "ozarkchev.com": "Ozark Chevy",
  "packeywebbford.com": "Packey Webb",
  "palmetto57.com": "Palmetto Nissan",
  "papesubaru.com": "Pape Subaru",
  "papik.com": "Papik Motor",
  "pappastoyota.com": "Pappa Toyota",
  "paragonacura.com": "Paragon Acura",
  "paragonhonda.com": "Paragon Honda",
  "parischevrolet.com": "Paris Chevy",
  "parkavebmw.com": "Park Ave BMW",
  "parkchryslerjeep.com": "Park Chrysler",
  "parksofgainesville.com": "Parks Gainesville",
  "parkwayfamily.com": "Parkway Family",
  "patlobbtoyota.com": "Pat Lobb",
  "pearsontoyotascion.com": "Pearson",
  "pedersentoyota.com": "Pedersen",
  "pellegrinopbg.com": "Pellegrino",
  "penskeautomotive.com": "Penske Auto",
  "pepecadillac.com": "Pepe Cadillac",
  "philmeadorsubaru.com": "Phil Meador",
  "pinebeltauto.com": "Pine Belt",
  "pioneerchevy.com": "Pioneer Chevy",
  "planetdodge.com": "Planet Dodge",
  "plazacadillac.com": "Plaza Cadillac",
  "plazainfiniti.com": "Plaza Infiniti",
  "porscheoflivermore.com": "Porsche Livermore",
  "porscheofmelbourne.com": "Porsche Melbourne",
  "porschesouthorlando.com": "Porsche South Orlando",
  "portcitynissan.com": "Port City Nissan",
  "portjeffchryslerjeep.com": "Port Jeff Chrsyler",
  "powerautogroup.com": "Power Auto",
  "prestigeimports.net": "Prestige Import",
  "prestigesubaru.com": "Prestige Subaru",
  "prestonmotor.com": "Preston Motor",
  "prpseats.com": "PRP Auto",
  "putnamauto.com": "Putnam",
  "putnamgm.com": "Putnam",
  "raabeford.com": "Raabe",
  "rallyeacura.com": "Rallye Acura",
  "ramseyacura.com": "Ramsey Acura",
  "rbmofatlanta.com": "RBM Atlanta",
  "reddingkia.com": "Redding Kia",
  "redriverford.com": "Red River Ford",
  "regalauto.com": "Regal Auto",
  "resslermotors.com": "Ressler",
  "rexchevrolet.com": "Rex Chevy",
  "riceautomotive.com": "Rice Auto",
  "rickroushhonda.com": "Rick Roush",
  "righttoyota.com": "Right Toyota",
  "rileymazda.com": "Riley Mazda",
  "rivardbuickgmc.com": "Rivard Buick",
  "robertsmotors.com": "Roberts Motors",
  "rocklandnissan.com": "Rockland Nissan",
  "rockville-audi.com": "Rockville Audi",
  "rodenrothmotors.com": "Rodenroth",
  "rosenthalacura.com": "Rosenthal Acura",
  "rosevillekia.com": "Roseville Kia",
  "roushhonda.com": "Roush Honda",
  "rudyluthertoyota.com": "Rudy Luther",
  "russellbarnett.com": "Russell Barnett",
  "ryanchevrolet.com": "Ryan Chevy",
  "saccucci.com": "Saccucci",
  "saffordauto.com": "Safford",
  "samscismfordlm.com": "Sam Scism",
  "sandskia.com": "Sands Kia",
  "sandschevrolet.com": "Sands Chevrolet",
  "sarantcadillac.com": "Sarant Cadillac",
  "saratogahonda.com": "Saratoga Honda",
  "sawyerschevy.com": "Sawyer Chevy",
  "sbautogroup.com": "SB Auto",
  "scenicmotors.com": "Scenic",
  "schimmergm.com": "Schimmer GM",
  "schomp.com": "Schomp",
  "schultzfordlincoln.com": "Schultz Ford",
  "sendellmotors.com": "Sendell",
  "sentryautogroup.com": "Sentry Auto",
  "serramontesubaru.com": "Serramonte Subaru",
  "serranashville.com": "Serra Nashville",
  "sethwadley.com": "Seth Wadley",
  "sewickleycars.com": "Sewickley",
  "seymourford.com": "Seymour",
  "sharpautos.com": "Sharp",
  "sharpnackdirect.com": "Sharpnack",
  "shepardcars.com": "Shepard",
  "sherwoodchevrolet.com": "Sherwood Chevy",
  "shottenkirk.com": "Shottenkirk",
  "sierramotors.net": "Sierra Motor",
  "skbuickgmc.com": "SK Buick",
  "smford.com": "SM Ford",
  "sthmotors.com": "STH Motor",
  "toyotaofboerne.com": "Toyota Boerne",
  "toyotaofgreensburg.com": "Toyota Greensburg",
  "toyotaofkilleen.com": "Toyota Killeen",
  "toyotaofkingsport.com": "Toyota Kingsport",
  "toyotaofwatertown.com": "Toyota Watertown",
  "toyotaofstockton.com": "Toyota Stockton",
  "tuscaloosachevrolet.com": "Tuscaloosa Chevy",
  "tuscaloosahyundai.com": "Tuscaloosa Hyundai",
  "danvaden.com": "Dan Vaden",
  "transitowne.com": "Transit Towne",
  "arrowford.com": "Arrow Ford",
  "ascensionhonda.com": "Ascension",
  "ashlandfordchrysler.com": "Ashland Ford",
  "bmwofbrooklyn.com": "BMW Brooklyn",
  "bmwoffreeport.com": "BMW Freeport",
  "bmwofnashville.com": "BMW Nashville",
  "billbrandtford.com": "Bill Brandt",
  "bobbrownauto.com": "Bob Brown",
  "blossomchevy.com": "Blossom Chevy",
  "gpi.bmwofcolumbia.com": "BMW Columbia",
  "delandkia.net": "Deland Kia",
  "dyerauto.com": "Dyer Auto",
  "elderdodge.com": "Elder",
  "elderhyundai.com": "Elder",
  "eldermitsubishi.com": "Elder",
  "faireychevrolet.com": "Fairey",
  "fordlincolnofcookeville.com": "Ford Cookeville",
  "gomontrose.com": "Go Montrose",
  "greencc.com": "Green Chevy",
  "goldcoastcadillac.com": "Gold Coast",
  "graingerhonda.com": "Grainger",
  "geraldauto.com": "Gerald",
  "gregsweet.com": "Greg Sweet",
  "rhinelandergm.com": "Rhinelander GM", // Rows 2737, 2738: NoBrand, NoPattern, Vercel 90%
  "leblancauto.com": "LeBlanc", // Row 2723: NoBrand, Vercel 95%
  "pricemotorsales.com": "Price", // Row 2724: NoBrand, Vercel 80%
  "radleyauto.com": "Radley", // Row 2729: NoBrand, Vercel 90%
  "rallyelexus.com": "Rallye", // Row 2732: Vercel 100%
  "reddingsubaru.com": "Redding Subaru", // Row 2734: Vercel 100%
  "rickweaver.com": "Rick Weaver", // Row 2741: NoBrand, Vercel 90%
  "rizzacars.com": "Rizza Chicago", // Row 2745: NoBrand, Vercel 100%
  "riversidehasit.com": "Riverside Has It", // Row 2744: NoBrand, Vercel 80%
  "robertsrobinson.com": "Roberts Robinson", // Row 2748: NoBrand, Vercel 100%
  "royalmoore.com": "Royal Moore", // Row 2762: NoBrand, Vercel 90%
  "rudolphcars.com": "Rudolph Auto", // Row 2763: NoBrand, NoResult, Vercel 70%
  "schwieterscars.com": "Schwieter", // Row 2777: NoBrand, Vercel 90%
  "serrawhelan.com": "Serra Whelan", // Row 2780: NoBrand, Vercel 90%
  "silveiraautos.com": "Silveira", // Row 2784: NoBrand, InvalidNameType, Vercel 90%
  "snethkamp.com": "Snethkamp", // Row 2790: NoBrand, Vercel 90%
  "southpointauto.com": "Southpoint", // Row 2792: NoBrand, InvalidNameType, Vercel 90%
  "stcharlescdj.com": "St Charles Chrysler", // Row 2796: NoBrand, NoResult, Vercel 70%
  "stcharlesauto.com": "St Charles Auto", // Row 2797: NoBrand, NoResult, Vercel 70%
  "stanmcnabb.com": "Stan McNabb", // Row 2799: NoBrand, Vercel 90%
  "rlchrysler.com": "Rl Chrysler", // Row 2747: Repetitive name (Chrysler Chrysler)
  "sfhonda.com": "SF Honda", // Row 2768: Repetitive name (Honda Honda)
  "sbnissan.com": "SB Nissan", // Row 2772: Repetitive name (Nissan Nissan)
  "sbhyundai.com": "SB Hyundai", // Row 2791: Repetitive name (Hyundai Hyundai)
  "toyotaofdecatur.com": "Decatur Toyota", // Row 2779: Repetitive name (Toyota Toyota)
  "autofair.com": "Auto Fair",
  "sscdjr.com": "SS Chrysler",
  "wilkinscars.com": "Wilkins",
  "mastria.com": "Mastria",
  "cagaustin.com": "CAG Austin",
  "mbofaustin.com": "M.B. Austin",
  "griecocars.com": "Grieco",
  "centuryauto.com": "Century",
  "capitolauto.com": "Capitol",
  "lakeautogroup.com": "Lake Auto",
  "bachmanautogroup.com": "Bachman Auto",
  "hardyautomotive.com": "Hardy Auto",
  "dahlauto.com": "Dahl Auto",
  "mcgovernauto.com": "McGovern",
  "jimnortontoyota.com": "Jim Norton", // Row 2972
  "circlebmw.com": "Circle BMW", // Row 2978
  "cherryhillnissan.com": "Cherry Hill Nissan", // Row 2993
  "santanford.com": "Santan Ford", // Row 3013
  "jclewis.com": "JC Lewis", // Row 3044
  "dublintoyota.com": "Dublin Toyota", // Row 3083
  "papasdodge.com": "Papa Dodge", // Row 3097
  "lillistonauto.com": "Lilliston", // Row 3088
  "akinsonline.com": "Atkinson", // Row 3089
  "goldsteinauto.com": "Goldstein", // Row 3101
  "larryhillis.com": "Larry Hillis", // Row 3112
  "speedcraft.com": "Speedcraft", // Row 3153
  "shaverauto.com": "Shaver", // Row 3155
  "webbcars.com": "Webb", // Row 3156
  "thompsonautomotive.com": "Thompson", // Row 3160
  "sloaneautos.com": "Sloane", // Rows 3165, 3181
  "garciacars.com": "Garcia", // Rows 3166, 3167
  "princeauto.com": "Prince", // Row 3169
  "diehlauto.com": "Diehl", // Rows 3170, 3189
  "odanielauto.com": "ODaniel", // Row 3171
  "buylewis.com": "Lewis Auto", // Rows 3173, 3184
  "andersonautomotive.com": "Anderson", // Row 3176
  "beachautomotive.com": "Beach Auto", // Row 3177
  "ourismancars.com": "Ourisman", // Row 3178
  "norrisautogroup.com": "Norris", // Rows 3179, 3194
  "hiesterautomotive.com": "Hiester", // Row 3182
  "rohrich.com": "Rohrich", // Rows 3183, 3188
  "kellyauto.com": "Kelly Auto", // Row 3193
  "boulevard4u.com": "Boulevard 4U", // Row 3200
  "behlmann.com": "Behlmann", // Row 3204
  "davewrightauto.com": "Dave Wright", // Row 3208
  "houseredwing.com": "House Redwing" // Row 3210
};

const CAR_BRANDS = new Set([
  "acura", "alfa romeo", "amc", "aston martin", "audi", "bentley", "bmw", "bugatti", "buick",
  "cadillac", "carmax", "cdj", "cdjrf", "cdjr", "chev", "chevvy", "chevrolet", "chrysler", "cjd", "daewoo",
  "dodge", "eagle", "ferrari", "fiat", "ford", "genesis", "gmc", "honda", "hummer", "hyundai", "inf", "infiniti",
  "isuzu", "jaguar", "jeep", "jlr", "kia", "lamborghini", "land rover", "landrover", "lexus", "lincoln", "lucid",
  "maserati", "maz", "mazda", "mb", "merc", "mercedes", "mercedes-benz", "mercedesbenz", "merk", "mini",
  "mitsubishi", "nissan", "oldsmobile", "plymouth", "polestar", "pontiac", "porsche", "ram", "rivian",
  "rolls-royce", "saab", "saturn", "scion", "smart", "subaru", "subie", "suzuki", "tesla", "toyota",
  "volkswagen", "volvo", "vw", "chevy", "honda"
]);

  const KNOWN_LAST_NAMES = new Set([
    "abbott", "ackerman", "adams", "addison", "adkins", "ainsworth",
    "albert", "albright", "aldrich", "alexander", "alford", "allison",
    "alston", "anderson", "appleby", "appleton", "archer", "archibald",
    "armistead", "armstrong", "arnold", "ashburn", "ashcroft", "ashford",
    "ashley", "atkins", "atkinson", "atwood", "austen", "austin",
    "avery", "babcock", "badger", "bagley", "bain", "bainbridge",
    "baird", "baker", "balding", "baldwin", "ball", "ballard",
    "banning", "barber", "barclay", "barker", "barnard", "barnes",
    "barlow", "barr", "barnett", "barron", "barry", "bartlett",
    "barton", "bassett", "bates", "bauer", "baxter", "bayard",
    "beadle", "beal", "beall", "beard", "beasley", "beck",
    "beckett", "becker", "bedford", "beecham", "belcher", "belding",
    "bell", "bellamy", "bellows", "benedict", "benford", "bennet",
    "bennett", "benson", "berkeley", "berry", "bertram", "beverly",
    "bickford", "biddle", "bigelow", "billings", "bingham", "birch",
    "bird", "bishop", "bixby", "black", "blackburn", "blackwell",
    "blair", "blake", "blakeley", "blanchard", "blevins", "bloom",
    "blythe", "bogart", "bogue", "bolling", "bolton", "bond",
    "bondurant", "boone", "booth", "boswell", "boughton", "bowden",
    "bowen", "bowers", "bowles", "bowman", "boyd", "boyle",
    "boynton", "brace", "bradbury", "bradford", "bradley", "bradshaw",
    "brady", "bragg", "bramwell", "brannon", "branson", "brant",
    "braxton", "bray", "breckenridge", "brewer", "brewster", "brice",
    "bridger", "briggs", "brigham", "bright", "brink", "brinton",
    "briscoe", "brock", "brockway", "bromley", "brook", "brooks",
    "brough", "brown", "browne", "browning", "brownell", "brunson",
    "bryant", "bryce", "buck", "buckingham", "buckley", "buckner",
    "buffington", "bullard", "bullock", "bumpus", "burch", "burdett",
    "burdick", "burgess", "burke", "burleigh", "burnett", "burnham",
    "burns", "burr", "burrows", "burton", "bush", "bushnell",
    "butler", "byers", "byram", "byrd", "cabell", "calder",
    "calhoun", "callahan", "calloway", "calvert", "cameron", "camp",
    "campbell", "canfield", "cannon", "cantrell", "capps", "cardwell",
    "carey", "carleton", "carlisle", "carmichael", "carr", "carrington",
    "carroll", "carson", "cartwright", "caruso", "carver", "case",
    "casey", "cass", "cassidy", "castle", "caulfield", "chadwick",
    "chaffee", "chambers", "chandler", "chapin", "chapman", "chase",
    "chatfield", "cheatham", "childers", "childs", "chisholm", "church",
    "churchill", "clancy", "clapp", "clark", "clarke", "clay",
    "clayborne", "clayton", "clem", "clemens", "clements", "clinch",
    "cobb", "coburn", "cochran", "cocker", "cockrell", "coddington",
    "cody", "colburn", "colby", "colgate", "collier", "collins",
    "colvin", "comer", "compton", "comstock", "conant", "conklin",
    "conley", "connell", "connolly", "connor", "converse", "conway",
    "cook", "cooke", "cooley", "cooper", "cope", "corbett",
    "corbin", "cornish", "cortland", "coryell", "cotton", "courtney",
    "cowan", "cox", "craig", "crane", "crawford", "creighton",
    "crews", "crockett", "cromwell", "croswell", "crum", "cullen",
    "culver", "cummings", "cummins", "cunningham", "currier", "curry",
    "curtis", "cushing", "cutler", "cutts", "daly", "danforth",
    "daniel", "daniels", "darnell", "darr", "daugherty", "davenport",
    "davidson", "davis", "dawes", "dawson", "day", "dean",
    "deane", "decker", "delano", "denham", "denny", "denton",
    "derr", "dewey", "dickerson", "dickinson", "dillard", "dillon",
    "dinsmore", "dix", "dixon", "dodson", "doherty", "donnelly",
    "donovan", "dorsett", "doughty", "douglas", "dow", "downey",
    "downs", "doyle", "drake", "draper", "drayton", "drew",
    "driscoll", "dube", "dudley", "duff", "duffy", "duke",
    "duncan", "dunham", "dunlap", "dunn", "dunnell", "durance",
    "durant", "durham", "dutton", "dwyer", "eads", "eagle",
    "earl", "eastman", "easterly", "eaton", "eckert", "eddy",
    "edmonds", "edmondson", "edwards", "eldred", "eller", "elliott",
    "ellington", "ellis", "ellsworth", "elmore", "emerson", "emery",
    "emmons", "engle", "england", "english", "ennis", "epps",
    "erickson", "ernest", "esmond", "evans", "everett", "ewing",
    "fairchild", "falkner", "fanning", "farley", "farnham", "farrar",
    "farrell", "farrow", "faulk", "faulkner", "fay", "fenton",
    "ferguson", "field", "finch", "finley", "fish", "fischer",
    "fisher", "fisk", "fitzgerald", "fitzpatrick", "flagg", "fleming",
    "flint", "flynn", "fogg", "folger", "forbes", "forsyth",
    "fortune", "foss", "foster", "fowler", "fox", "frame",
    "franklin", "franks", "fraser", "freeland", "freeman", "french",
    "frost", "fry", "fuller", "gaines", "gallagher", "galloway",
    "gardiner", "gardner", "garland", "garner", "garrison", "gates",
    "gaylord", "geiger", "gerry", "gibbons", "gibbs", "giddings",
    "gilbert", "gilchrist", "giles", "gill", "gillespie", "gilles",
    "gilman", "gilmore", "gladstone", "glass", "gleason", "glenn",
    "glover", "goddard", "godwin", "goldsmith", "goodman", "goodrich",
    "goodwin", "gore", "gould", "grafton", "grady", "granger",
    "grant", "grantham", "graves", "gray", "green", "greenleaf",
    "greenwood", "gregg", "gregory", "gridley", "griffin", "griffith",
    "grimes", "grinnell", "griswold", "grove", "gunn", "guthrie",
    "hadley", "hahn", "haines", "hale", "hall", "halsey",
    "hamilton", "hamlin", "hammond", "hampton", "hancock", "hand",
    "hanley", "hanna", "hanson", "harding", "hardy", "hargrove",
    "harmon", "harper", "harriman", "harrington", "harris", "hart",
    "hartley", "harvey", "haskell", "hastings", "hatch", "hatcher",
    "hawes", "hawkins", "hawley", "hawthorne", "hayden", "hayes",
    "hayward", "healey", "heath", "heaton", "hedrick", "hempstead",
    "henderson", "hendricks", "hendrickson", "henley", "henry", "henson",
    "herndon", "herrick", "hesser", "hewitt", "hickman", "hicks",
    "higgins", "high", "hill", "hilliard", "hinton", "hitchcock",
    "hoag", "hobbs", "hodges", "hodgson", "hoffman", "hogan",
    "holbrook", "holden", "holder", "holland", "holladay", "hollister",
    "holmes", "holt", "hood", "hooker", "hooper", "hopkins",
    "horn", "horton", "houghton", "howe", "howell", "hoyt",
    "hubbard", "huber", "huck", "huff", "huffman", "huggins",
    "hughes", "hull", "humphrey", "hume", "hunt", "hunter",
    "huntington", "hurd", "hurley", "huston", "hutchins", "hutchinson",
    "hyde", "ingalls", "ingle", "ingram", "ireland", "irvine",
    "irving", "irwin", "isaacs", "ives", "jackson", "jacobs",
    "jacobson", "james", "jameson", "jarrett", "jarvis", "jeffries",
    "jennings", "jensen", "jessup", "jewett", "jobe", "johns",
    "johnson", "johnston", "joiner", "jones", "jordan", "judd",
    "judson", "kane", "keane", "keating", "keeler", "keen",
    "keller", "kelley", "kellogg", "kelly", "kemp", "kendall",
    "kennedy", "kenney", "kent", "kerr", "keyes", "kilgore",
    "kimball", "king", "kingsbury", "kinney", "kirby", "kirk",
    "klein", "knapp", "knight", "knighton", "knott", "knox",
    "lacey", "lamar", "lambert", "lamson", "lane", "lang",
    "langdon", "langston", "larkin", "larson", "latham", "latta",
    "law", "lawson", "lawton", "leach", "leavitt", "leblanc",
    "ledger", "lee", "leighton", "leland", "lena", "leonard",
    "lester", "lewis", "lilly", "lindley", "lindsey", "litchfield",
    "locke", "lockwood", "lodge", "logan", "lombard", "long",
    "lord", "lovett", "lowe", "lowry", "lucas", "luce",
    "ludlow", "lundy", "lusk", "lyman", "lynch", "lyon",
    "lyons", "mace", "mack", "mackenzie", "madden", "maddox",
    "magee", "main", "malcolm", "mallett", "malone", "manley",
    "mann", "manning", "mansfield", "marble", "marlow", "marsh",
    "martin", "marvin", "mason", "mathews", "matthews", "maury",
    "maxwell", "may", "maynard", "mays", "mccabe", "mccall",
    "mccarter", "mccarthy", "mcclellan", "mcclure", "mccormick", "mccoy",
    "mcculloch", "mcdaniel", "mcdowell", "mcgee", "mcgowan", "mcguire",
    "mckay", "mckee", "mckenna", "mckinney", "mcknight", "mclane",
    "mclaughlin", "mclean", "mcmillan", "mcnair", "mcneil", "mcpherson",
    "mcrae", "mead", "meadows", "melton", "mercer", "meredith",
    "merrick", "merrill", "merritt", "meyer", "miles", "millard",
    "miller", "mills", "milner", "mitchell", "moody", "moore",
    "moran", "moreland", "morgan", "morrill", "morrison", "morrow",
    "morse", "morton", "moseley", "moss", "mott", "mullins",
    "munroe", "munson", "murdoch", "murphy", "murray", "myers",
    "nash", "naylor", "neal", "needham", "neely", "nelson",
    "newcomb", "newell", "newman", "newton", "nicholls", "nichols",
    "nikel", "nixon", "noble", "nolan", "norris", "norton",
    "norwood", "nutter", "oakley", "ober", "odell", "ogden",
    "oliver", "oneal", "oneil", "oneill", "ormond", "orr",
    "osborne", "osgood", "otis", "overton", "owens", "pace",
    "page", "paine", "palmer", "parker", "parrish", "parsons",
    "patten", "patterson", "payne", "peabody", "pearce", "peck",
    "peel", "pemberton", "penn", "pennington", "perkins", "perry",
    "peters", "peterson", "pettigrew", "phelps", "philips", "phillips",
    "pickens", "pierce", "pike", "pittman", "platt", "plummer",
    "poole", "porter", "potter", "powell", "pratt", "prescott",
    "preston", "price", "prichard", "proctor", "purcell", "purdy",
    "putnam", "quinn", "raines", "raleigh", "ramsey", "rand",
    "randall", "ransom", "rathbun", "ray", "raymond", "reade",
    "redding", "reed", "reese", "reeves", "regan", "reid",
    "reilly", "remington", "renfro", "reyes", "reynolds", "rhodes",
    "rice", "rich", "richards", "richardson", "ricker", "riley",
    "rivera", "roberts", "robinson", "rockwell", "rodgers", "rogers",
    "rollins", "roman", "roper", "rose", "ross", "rowe",
    "rudd", "rutherford", "ryan", "sabin", "salazar", "sampson",
    "samuels", "sanders", "sanderson", "sanford", "sanger", "sargent",
    "saunders", "savage", "sawyer", "schmidt", "schneider", "schroeder",
    "schultz", "schuyler", "scott", "sears", "seaton", "seaver",
    "sedgwick", "seiner", "sewell", "sextons", "shannon", "sharp",
    "shaw", "shea", "sheldon", "shelton", "shepherd", "sheridan",
    "sherman", "sherwood", "shipman", "shirley", "shields", "short",
    "shumway", "sikes", "simmons", "simonds", "simpson", "sinclair",
    "skinner", "slade", "slater", "sloan", "small", "smith",
    "smyth", "snell", "snow", "somers", "spalding", "sparks",
    "spear", "spears", "spence", "spencer", "sprague", "springer",
    "stafford", "stanton", "stark", "starr", "steele", "stein",
    "sterling", "stetson", "stevens", "stewart", "stiles", "stockton",
    "stoddard", "stone", "stout", "stratton", "street", "strong",
    "stuart", "sullivan", "sumner", "sutton", "swain", "swanson",
    "sweet", "sykes", "talbot", "tanner", "tate", "taylor",
    "teague", "temple", "terrell", "thatcher", "thayer", "thomas",
    "thorne", "thornton", "thurston", "tibbetts", "tierney", "tilton",
    "todd", "tomlinson", "torres", "torrey", "towne", "townsend",
    "tracy", "travis", "treadwell", "tucker", "turnbull", "turner",
    "tyler", "underwood", "upham", "upton", "vance", "vaughan",
    "vinton", "wadsworth", "wainwright", "waldron", "walker", "wall",
    "wallace", "walton", "ward", "ware", "warner", "warren",
    "washburn", "waterman", "watkins", "watson", "watts", "weaver",
    "webber", "webster", "weeks", "welch", "weld", "wellman",
    "wells", "wendell", "wentworth", "wheeler", "whipple", "whitaker",
    "whitcomb", "white", "whitehead", "whiting", "whitman", "whitney",
    "whittaker", "whittier", "wight", "wilbur", "wilcox", "wilder",
    "wilkerson", "wilkins", "willard", "williams", "williamson", "willis",
    "wilson", "winchester", "wing", "winslow", "winston", "winter",
    "withers", "wood", "woodbridge", "woodbury", "woodruff", "woods",
    "woodward", "woolsey", "worthington", "wright", "wyatt", "yates",
    "yeager", "york", "young", "youngblood", "zimmerman", "allen",
    "beasley", "boulware", "cism", "harris", "lewis", "mohr",
    "thompson", "kadlec", "clark", "perillo", "stoops", "weaver",
    "sinclair", "abbot", "acker", "addison", "albright", "allred",
    "ames", "appleby", "ashburn", "ashcroft", "ashford", "atwater",
    "austen", "badger", "bagley", "bainbridge", "balding", "barber",
    "barclay", "barnard", "barnes", "barron", "barton", "bassett",
    "baxter", "bayard", "beadle", "beall", "beckett", "bedford",
    "beecham", "belcher", "belding", "bellamy", "benedict", "benford",
    "bennet", "bentley", "berkeley", "bertram", "beverly", "bickford",
    "biddle", "bigelow", "birch", "bird", "blackwell", "blair",
    "blakeley", "blevins", "bloom", "blythe", "bogart", "bogue",
    "bolling", "bondurant", "boone", "boswell", "boughton", "bowden",
    "bowles", "boynton", "brace", "bradbury", "bradshaw", "bragg",
    "bramwell", "branson", "brant", "braxton", "breckenridge", "brewster",
    "brice", "bridger", "brigham", "brinton", "briscoe", "britton",
    "broadus", "brockway", "bromley", "brook", "brough", "brownell",
    "brunson", "buckingham", "buckner", "buffington", "bullard", "burch",
    "burleigh", "burnham", "burr", "bushnell", "byers", "byram",
    "cabell", "calder", "calloway", "carleton", "carlisle", "carrington",
    "carver", "cass", "castle", "caulfield", "chadwick", "chapin",
    "chatfield", "cheatham", "childs", "chisholm", "christenson", "church",
    "clancy", "clapp", "clayborne", "clem", "clement", "clifford",
    "cobb", "coburn", "cocker", "cockrell", "coddington", "colburn",
    "colgate", "colvin", "comer", "comstock", "conant", "conklin",
    "converse", "cooley", "cornish", "cortland", "coryell", "cotton",
    "covington", "cowles", "craddock", "crane", "crawley", "creighton",
    "cromwell", "croswell", "crum", "cullen", "culver", "currier",
    "cushing", "cutler", "cutts", "danforth", "darnell", "darr",
    "davenport", "dawson", "deane", "delano", "denham", "denny",
    "derr", "dickenson", "dill", "dinsmore", "dix", "dole",
    "dorsett", "doughty", "dow", "dowling", "draper", "drayton",
    "drew", "driscoll", "duff", "duke", "dunham", "dunlap",
    "dunnell", "durrence", "durant", "durham", "dutton", "dwyer",
    "eads", "eagle", "earl", "easterly", "eckert", "eddy",
    "edmondson", "eldred", "eller", "ellington", "ellsworth", "elmore",
    "emery", "emmons", "engle", "ennis", "epps", "evans",
    "everett", "ewing", "fairchild", "falkner", "fanning", "farnham",
    "farrar", "farrell", "farrow", "faulk", "fay", "felton",
    "fenn", "ferris", "field", "finch", "fish", "fisk",
    "fitzpatrick", "flagg", "flint", "fogg", "folger", "forbes",
    "fordham", "forsyth", "fortune", "foss", "frame", "franks",
    "fraser", "freeland", "french", "frost", "fry", "gaines",
    "galloway", "gardiner", "garrett", "garrison", "gates", "gaylord",
    "geiger", "gerry", "giddings", "gilchrist", "gilman", "gladstone",
    "glover", "godwin", "goldsmith", "gore", "gould", "grantham",
    "greenleaf", "greenwood", "gridley", "griffith", "grimes", "grinnell",
    "griswold", "gunn", "haines", "halsey", "hamlin", "hampton",
    "hand", "hanley", "harding", "hargrove", "harrington", "hartley",
    "haskell", "hatch", "hawes", "hawthorne", "hayden", "hayes",
    "heath", "heaton", "hedrick", "hempstead", "henley", "henson",
    "hewitt", "hickman", "high", "hilliard", "hines", "hinson",
    "hoag", "hobbs", "hodge", "hodgson", "holladay", "hollister",
    "hooker", "huston", "hutchins", "hyde", "ingle", "ireland",
    "irvine", "irving", "isaacs", "ives", "jarrett", "jeffries",
    "jensen", "jessup", "jewell", "jobe", "joiner", "judd",
    "keane", "keeler", "keen", "kenney", "keyes", "kilgore",
    "kingsbury", "kinsey", "knighton", "knott", "knowles", "lacey",
    "lamar", "lamson", "landis", "langdon", "langston", "latham",
    "ledger", "leighton", "lilly", "lindley", "litchfield", "lockwood",
    "lodge", "luce", "ludlow", "lundy", "lusk", "mace",
    "maddox", "magee", "main", "mallett", "manley", "mansfield",
    "marble", "marlow", "marvin", "mason", "mathews", "maury",
    "may", "maynard", "mays", "mccall", "mccarter", "mcclellan",
    "mcclure", "mcculloch", "mcdowell", "mcgowan", "mckay", "mckenna",
    "mcknight", "mclane", "mcnair", "mcneil", "mcrae", "mead",
    "melton", "meredith", "merrick", "miles", "millard", "milner",
    "moody", "moran", "moreland", "morrill", "morrow", "morse",
    "moseley", "moss", "mott", "munroe", "murdoch", "naylor",
    "needham", "neely", "nicholls", "nutter", "ober", "ogden",
    "ormond", "osborn", "overton", "pace", "paine", "parrish",
    "patten", "pearce", "peck", "peel", "pemberton", "penn",
    "pettigrew", "phillips", "pickens", "pike", "pittman", "platt",
    "plummer", "prichard", "proctor", "purdy", "raines", "raleigh",
    "rand", "ransom", "rathbun", "reade", "redding", "rees",
    "renfro", "ricketts", "rider", "ridgeway", "riggs", "ripley",
    "robbins", "robertson", "rockwell", "roper", "rowland", "roy",
    "rush", "ryder", "sabin", "samuels", "sanford", "sanger",
    "saunders", "schuyler", "seaton", "seaver", "sedgwick", "shields",
    "shirley", "shumway", "sikes", "simonds", "singleton", "skinner",
    "slade", "small", "snell", "snow", "somers", "spalding",
    "spear", "spears", "springer", "stafford", "stanton", "starr",
    "stein", "stiles", "stockton", "sweet", "sykes", "tate",
    "teague", "temple", "terrell", "thatcher", "thurston", "tibbetts",
    "tierney", "tilton", "torrey", "towne", "townsend", "treadwell",
    "turnbull", "tyler", "upham", "vaughan", "wainwright", "waldron",
    "ware", "weeks", "weston", "whipple", "whitehead", "whittier",
    "wight", "willcox", "worthington", "yeager", "allen", "beasley",
    "boulware", "cism", "harris", "lewis", "mohr", "thompson",
    "kadlec", "clark", "perillo", "stoops", "weaver", "sinclair",
    "abbot", "acker", "addison", "albright", "allred", "ames",
    "appleby", "ashburn", "ashcroft", "ashford", "atwater", "austen",
    "badger", "bagley", "bainbridge", "balding", "barber", "barclay",
    "barnard", "barnes", "barron", "barton", "bassett", "baxter",
    "bayard", "beadle", "beall", "beckett", "bedford", "beecham",
    "belcher", "belding", "bellamy", "benedict", "benford", "bennet",
    "bentley", "berkeley", "bertram", "beverly", "bickford", "biddle",
    "bigelow", "birch", "bird", "blackwell", "blair", "blakeley",
    "blevins", "bloom", "blythe", "bogart", "bogue", "bolling",
    "bondurant", "boone", "boswell", "boughton", "bowden", "bowles",
    "boynton", "brace", "bradbury", "bradshaw", "bragg", "bramwell",
    "branson", "brant", "braxton", "breckenridge", "brewster", "brice",
    "bridger", "brigham", "brinton", "briscoe", "britton", "broadus",
    "brockway", "bromley", "brook", "brough", "brownell", "brunson",
    "buckingham", "buckner", "buffington", "bullard", "burch", "burleigh",
    "burnham", "burr", "bushnell", "byram", "cabell", "calder",
    "calloway", "carleton", "carlisle", "carrington", "carver", "cass",
    "castle", "caulfield", "chadwick", "chapin", "chatfield", "cheatham",
    "childs", "chisholm", "christenson", "church", "clancy", "clapp",
    "clayborne", "clem", "clement", "clifford", "cobb", "coburn",
    "cocker", "cockrell", "coddington", "colburn", "colgate", "colvin",
    "comer", "comstock", "conant", "conklin", "converse", "cooley",
    "cornish", "cortland", "coryell", "cotton", "covington", "cowles",
    "craddock", "crane", "crawley", "creighton", "cromwell", "croswell",
    "crum", "cullen", "culver", "currier", "cushing", "cutler",
    "cutts", "danforth", "darnell", "darr", "davenport", "dawson",
    "deane", "delano", "denham", "denny", "derr", "dickenson",
    "dill", "dinsmore", "dix", "dole", "dorsett", "doughty",
    "dow", "dowling", "draper", "drayton", "drew", "driscoll",
    "duff", "duke", "dunham", "dunlap", "dunnell", "durrence",
    "durant", "durham", "dutton", "dwyer", "eads", "eagle",
    "earl", "easterly", "eckert", "eddy", "edmondson", "eldred",
    "eller", "ellington", "ellsworth", "elmore", "emery", "emmons",
    "engle", "ennis", "epps", "evans", "everett", "ewing",
    "fairchild", "falkner", "fanning", "farnham", "farrar", "farrell",
    "farrow", "faulk", "fay", "felton", "fenn", "ferris",
    "field", "finch", "fish", "fisk", "fitzpatrick", "flagg",
    "flint", "fogg", "folger", "forbes", "fordham", "forsyth",
    "fortune", "foss", "frame", "franks", "fraser", "freeland",
    "french", "frost", "fry", "gaines", "galloway", "gardiner",
    "garrett", "garrison", "gates", "gaylord", "geiger", "gerry",
    "giddings", "gilchrist", "gilman", "gladstone", "glover", "godwin",
    "goldsmith", "gore", "gould", "grantham", "greenleaf", "greenwood",
    "gridley", "griffith", "grimes", "grinnell", "griswold", "gunn",
    "haines", "halsey", "hamlin", "hampton", "hand", "hanley",
    "harding", "hargrove", "harrington", "hartley", "haskell", "hatch",
    "hawes", "hawthorne", "hayden", "hayes", "heath", "heaton",
    "hedrick", "hempstead", "henley", "henson", "hewitt", "hickman",
    "high", "hilliard", "hines", "hinson", "hoag", "hobbs",
    "hodge", "hodgson", "holladay", "hollister", "hooker", "huston",
    "hutchins", "hyde", "ingle", "ireland", "irvine", "irving",
    "isaacs", "ives", "jarrett", "jeffries", "jensen", "jessup",
    "jewell", "jobe", "joiner", "judd", "keane", "keeler",
    "keen", "kenney", "keyes", "kilgore", "kingsbury", "kinsey",
    "knighton", "knott", "knowles", "lacey", "lamar", "lamson",
    "landis", "langdon", "langston", "latham", "ledger", "leighton",
    "lilly", "lindley", "litchfield", "lockwood", "lodge", "luce",
    "ludlow", "lundy", "lusk", "mace", "maddox", "magee",
    "main", "mallett", "manley", "mansfield", "marble", "marlow",
    "marvin", "mason", "mathews", "maury", "may", "maynard",
    "mays", "mccall", "mccarter", "mcclellan", "mcclure", "mcculloch",
    "mcdowell", "mcgowan", "mckay", "mckenna", "mcknight", "mclane",
    "mcnair", "mcneil", "mcrae", "mead", "melton", "meredith",
    "merrick", "miles", "millard", "milner", "moody", "moran",
    "moreland", "morrill", "morrow", "morse", "moseley", "moss",
    "mott", "munroe", "murdoch", "naylor", "needham", "neely",
    "nicholls", "nutter", "ober", "ogden", "ormond", "osborn",
    "overton", "pace", "paine", "parrish", "patten", "pearce",
    "peck", "peel", "pemberton", "penn", "pettigrew", "phillips",
    "pickens", "pike", "pittman", "platt", "plummer", "prichard",
    "proctor", "purdy", "raines", "raleigh", "rand", "ransom",
    "rathbun", "reade", "redding", "rees", "renfro", "ricketts",
    "rider", "ridgeway", "riggs", "ripley", "robbins", "robertson",
    "rockwell", "roper", "rowland", "roy", "rush", "ryder",
    "sabin", "samuels", "sanford", "sanger", "saunders", "schuyler",
    "seaton", "seaver", "sedgwick", "shields", "shirley", "shumway",
    "sikes", "simonds", "singleton", "skinner", "slade", "small",
    "snell", "snow", "somers", "spalding", "spear", "spears",
    "springer", "stafford", "stanton", "starr", "stein", "stiles",
    "stockton", "sweet", "sykes", "tate", "teague", "temple",
    "terrell", "thatcher", "thurston", "tibbetts", "tierney", "tilton",
    "torrey", "towne", "townsend", "treadwell", "turnbull", "tyler",
    "upham", "vaughan", "wainwright", "waldron", "ware", "weeks",
    "whipple", "whitehead", "whittier", "wight", "worthington", "yeager",
    "allen", "beasley", "boulware", "cism", "harris", "lewis",
    "mohr", "kadlec", "clark", "perillo", "stoops", "weaver",
    "sinclair", "abbot", "acker", "addison", "albright", "allred",
    "ames", "appleby", "ashburn", "ashcroft", "ashford", "atwater",
    "austen", "badger", "bagley", "bainbridge", "balding", "barber",
    "barclay", "barnard", "barnes", "barron", "barton", "bassett",
    "baxter", "bayard", "beadle", "beall", "beckett", "bedford",
    "beecham", "belcher", "belding", "bellamy", "benedict", "benford",
    "bennet", "bentley", "berkeley", "bertram", "beverly", "bickford",
    "biddle", "bigelow", "birch", "bird", "blackwell", "blair",
    "blakeley", "blevins", "bloom", "blythe", "bogart", "bogue",
    "bolling", "bondurant", "boone", "boswell", "boughton", "bowden",
    "bowles", "boynton", "brace", "bradbury", "bradshaw", "bragg",
    "bramwell", "branson", "brant", "braxton", "breckenridge", "brewster",
    "brice", "bridger", "brigham", "brinton", "briscoe", "britton",
    "broadus", "brockway", "bromley", "brook", "brough", "brownell",
    "brunson", "buckingham", "buckner", "buffington", "bullard", "burch",
    "burleigh", "burnham", "burr", "bushnell", "byram", "cabell",
    "calder", "calloway", "carleton", "carlisle", "carrington", "carver",
    "cass", "castle", "caulfield", "chadwick", "chapin", "chatfield",
    "cheatham", "childs", "chisholm", "christenson", "church", "clancy",
    "clapp", "clayborne", "clem", "clement", "clifford", "cobb",
    "coburn", "cocker", "cockrell", "coddington", "colburn", "colgate",
    "colvin", "comer", "comstock", "conant", "conklin", "converse",
    "cooley", "cornish", "cortland", "coryell", "cotton", "covington",
    "cowles", "craddock", "crane", "crawley", "creighton", "cromwell",
    "croswell", "crum", "cullen", "culver", "currier", "cushing",
    "cutler", "cutts", "danforth", "darnell", "darr", "davenport",
    "dawson", "deane", "delano", "denham", "denny", "derr",
    "dickenson", "dill", "dinsmore", "dix", "dole", "dorsett",
    "doughty", "dow", "dowling", "draper", "drayton", "drew",
    "driscoll", "duff", "duke", "dunham", "dunlap", "dunnell",
    "durrence", "durant", "durham", "dutton", "dwyer", "eads",
    "eagle", "earl", "easterly", "eckert", "eddy", "edmondson",
    "eldred", "eller", "ellington", "ellsworth", "elmore", "emery",
    "emmons", "engle", "ennis", "epps", "evans", "everett",
    "ewing", "fairchild", "falkner", "fanning", "farnham", "farrar",
    "farrell", "farrow", "faulk", "fay", "felton", "fenn",
    "ferris", "field", "finch", "fish", "fisk", "fitzpatrick",
    "flagg", "flint", "fogg", "folger", "forbes", "fordham",
    "forsyth", "fortune", "foss", "frame", "franks", "fraser",
    "freeland", "french", "frost", "fry", "gaines", "galloway",
    "gardiner", "garrett", "garrison", "gates", "gaylord", "geiger",
    "gerry", "giddings", "gilchrist", "gilman", "gladstone", "glover",
    "godwin", "goldsmith", "gore", "gould", "grantham", "greenleaf",
    "greenwood", "gridley", "griffith", "grimes", "grinnell", "griswold",
    "gunn", "haines", "halsey", "hamlin", "hampton", "hand",
    "hanley", "harding", "hargrove", "harrington", "hartley", "haskell",
    "hatch", "hawes", "hawthorne", "hayden", "hayes", "heath",
    "heaton", "hedrick", "hempstead", "henley", "henson", "hewitt",
    "hickman", "high", "hilliard", "hines", "hinson", "hoag",
    "hobbs", "hodge", "hodgson", "holladay", "hollister", "hooker",
    "huston", "hutchins", "hyde", "ingle", "ireland", "irvine",
    "irving", "isaacs", "ives", "jarrett", "jeffries", "jensen",
    "jessup", "jewell", "jobe", "joiner", "judd", "keane",
    "keeler", "keen", "kenney", "keyes", "kilgore", "kingsbury",
    "kinsey", "knighton", "knott", "knowles", "lacey", "lamar",
    "lamson", "landis", "langdon", "langston", "latham", "ledger",
    "leighton", "lilly", "lindley", "litchfield", "lockwood", "lodge",
    "luce", "ludlow", "lundy", "lusk", "mace", "maddox",
    "magee", "main", "mallett", "manley", "mansfield", "marble",
    "marlow", "marvin", "mason", "mathews", "maury", "may",
    "maynard", "mays", "mccall", "mccarter", "mcclellan", "mcclure",
    "mcculloch", "mcdowell", "mcgowan", "mckay", "mckenna", "mcknight",
    "mclane", "mcnair", "mcneil", "mcrae", "mead", "melton",
    "meredith", "merrick", "miles", "millard", "milner", "moody",
    "moran", "moreland", "morrill", "morrow", "morse", "moseley",
    "moss", "mott", "munroe", "murdoch", "naylor", "needham",
    "neely", "nicholls", "nutter", "ober", "ogden", "ormond",
    "osborn", "overton", "pace", "paine", "parrish", "patten",
    "pearce", "peck", "peel", "pemberton", "penn", "pettigrew",
    "phillips", "pickens", "pike", "pittman", "platt", "plummer",
    "prichard", "proctor", "purdy", "raines", "raleigh", "rand",
    "ransom", "rathbun", "reade", "redding", "rees", "renfro",
    "ricketts", "rider", "ridgeway", "riggs", "ripley", "robbins",
    "robertson", "rockwell", "roper", "rowland", "roy", "rush",
    "ryder", "sabin", "samuels", "sanford", "sanger", "saunders",
    "schuyler", "seaton", "seaver", "sedgwick", "shields", "shirley",
    "shumway", "sikes", "simonds", "singleton", "skinner", "slade",
    "small", "snell", "snow", "somers", "spalding", "spear",
    "spears", "springer", "stafford", "stanton", "starr", "stein",
    "stiles", "stockton", "sweet", "sykes", "tate", "teague",
    "temple", "terrell", "thatcher", "thurston", "tibbetts", "tierney",
    "tilton", "torrey", "towne", "townsend", "treadwell", "turnbull",
    "tyler", "upham", "vaughan", "wainwright", "waldron", "ware",
    "weeks", "whipple", "whitehead", "whittier", "wight", "worthington",
    "yeager", "alden", "allman", "ambrose", "arden", "arnett", "asher",
    "atherton", "avery", "bacon", "baines", "baldwin", "bannister",
    "barnett", "barrow", "barton", "beard", "becker", "beecher",
    "benson", "berringer", "betts", "bland", "blevins", "blythe",
    "bolton", "bosworth", "bowen", "bradford", "brady", "brandt",
    "brewer", "bridges", "brighton", "brockton", "brooks", "browne",
    "bryson", "burden", "burkett", "burns", "byrne", "caldwell",
    "callahan", "carroll", "carson", "carter", "carver", "chadwick",
    "chambers", "chapman", "chester", "clifford", "colby", "coleman",
    "conley", "conrad", "corbin", "coulter", "craven", "crosby",
    "crowe", "cummings", "dalton", "daly", "danner", "darby",
    "darnell", "davies", "dawson", "deacon", "denning", "denton",
    "devereaux", "dickson", "dolan", "donahue", "draper", "drury",
    "duffy", "dunbar", "durand", "dyer", "eastwood", "eaton",
    "eddy", "elliot", "emmett", "evers", "fallon", "farmer",
    "farnsworth", "fenton", "finney", "fitch", "fleming", "forrest",
    "foss", "fowler", "freeman", "frost", "fuller", "gaines",
    "garner", "gentry", "gibson", "giles", "goodman", "goodwin",
    "grady", "granger", "graves", "grayson", "gresham", "grimes",
    "grover", "hale", "hammond", "hancock", "harden", "harlow",
    "harper", "hartman", "haven", "hawkins", "hays", "henson",
    "hodges", "holden", "holland", "holloway", "holt", "hooper",
    "hopper", "horton", "howe", "hoyle", "hudson", "hume",
    "humphries", "hurst", "hutton", "ingram", "irwin", "jarvis",
    "jennings", "joyner", "keaton", "keller", "kemp", "kendrick",
    "kerr", "kimble", "kincaid", "kirby", "knowles", "lambert",
    "landry", "langley", "larson", "lawson", "leach", "lester",
    "locke", "lowe", "lowry", "maddox", "mallory", "manning",
    "markham", "marlow", "marston", "mayfield", "mcbride", "mccain",
    "mcdowell", "mcfadden", "mcginnis", "mckee", "mcknight", "mclean",
    "mercer", "merritt", "middleton", "monroe", "moody", "morrow",
    "mullins", "nolan", "osborn", "pace", "parrish",
    "Abbey", "Ackerly", "Adair", "Alcorn", "Aldridge", "Alton",
    "Amos", "Archer", "Arden", "Armstrong", "Atkins", "Axton",
    "Babcock", "Bainbridge", "Baldwin", "Bannister", "Barrett", "Barrow",
    "Bateson", "Bauer", "Baxley", "Beaman", "Beaumont", "Beckwith",
    "Beech", "Benson", "Berkley", "Berryman", "Bexley", "Biddle",
    "Bingham", "Blakely", "Bland", "Bolton", "Bosworth", "Bowman",
    "Bradbury", "Braden", "Branson", "Brenton", "Brewster", "Briggs",
    "Brinkley", "Brockman", "Brody", "Brookman", "Brough", "Bryant",
    "Buckley", "Burden", "Burkett", "Burnett", "Burrows", "Byers",
    "Calder", "Calloway", "Calvin", "Carlisle", "Carmody", "Carson",
    "Cartwright", "Carver", "Cason", "Cassidy", "Chandler", "Chapman",
    "Chester", "Clancy", "Clayton", "Cleary", "Clement", "Cline",
    "Cochran", "Coffey", "Colby", "Colton", "Connelly", "Conrad",
    "Corbin", "Coulter", "Craven", "Crawford", "Crosby", "Crowley",
    "Cullen", "Curran", "Dalton", "Danner", "Darby", "Darnell",
    "Davies", "Dawson", "Deacon", "Denning", "Denton", "Devereaux",
    "Dickson", "Dolan", "Donahue", "Donovan", "Doran", "Dowling",
    "Drury", "Duffy", "Dunbar", "Durand", "Dyer", "Eastwood",
    "Eaton", "Eddy", "Elliot", "Emmett", "Evers", "Fallon",
    "Farmer", "Farnsworth", "Fenton", "Finney", "Fitch", "Fleming",
    "Forrest", "Foss", "Fowler", "Freeman", "Frost", "Fuller",
    "Gaines", "Garner", "Garrett", "Gentry", "Gibson", "Giles",
    "Goodman", "Goodwin", "Grady", "Granger", "Graves", "Grayson",
    "Gresham", "Grimes", "Grover", "Hale", "Hammond", "Hancock",
    "Harden", "Harlow", "Harper", "Hartman", "Haven", "Hawkins",
    "Hays", "Henson", "Hodges", "Holden", "Holland", "Holloway",
    "Holt", "Hooper", "Hopper", "Horton", "Howe", "Hoyle",
    "Hudson", "Hume", "Humphries", "Hurst", "Hutton", "Ingram",
    "Irwin", "Jarvis", "Jennings", "Joyner", "Keaton", "Keller",
    "Kemp", "Kendrick", "Kerr", "Kimble", "Kincaid", "Kirby",
    "Knowles", "Lambert", "Landry", "Langley", "Larson", "Lawson",
    "Leach", "Lester", "Locke", "Lowe", "Lowry", "Maddox",
    "Mallory", "Manning", "Markham", "Marlow", "Marston", "Mayfield",
    "McBride", "McCain", "McDowell", "McFadden", "McGinnis", "McKee",
    "McKnight", "McLean", "Mercer", "Merritt", "Middleton", "Monroe",
    "Moody", "Morrow", "Mullins", "Nolan", "Osborn", "Pace",
    "Parrish", "Patterson", "Payne", "Pearce", "Peck", "Perkins",
    "Phelps", "Pierce", "Pierson", "Plummer", "Porter", "Potter",
    "Pratt", "Preston", "Purdy", "Quincy", "Raines", "Raleigh",
    "Ramsey", "Randall", "Ransom", "Rayburn", "Redding", "Reese",
    "Regan", "Reid", "Renfro", "Reyes", "Rhodes", "Rivers",
    "Robbins", "Rollins", "Roper", "Rowan", "Rudd", "Rushing",
    "Ryder", "Sampson", "Sanders", "Sargent", "Saunders", "Saxon",
    "Saylor", "Schmitt", "Sears", "Sexton", "Shaffer", "Shea",
    "Shepard", "Sherwood", "Shields", "Shore", "Simms", "Slater",
    "Sloan", "Sparks", "Spear", "Spence", "Stafford", "Stanton",
    "Steele", "Sterling", "Stokes", "Stratton", "Strong", "Sumner",
    "Swain", "Talbot", "Tanner", "Tate", "Thatcher", "Thayer",
    "Tipton", "Titus", "Todd", "Trent", "Tucker", "Turnbull",
    "Underwood", "Vance", "Vaughn", "Vernon", "Vickers", "Wade",
    "Walden", "Waller", "Walsh", "Walton", "Ward", "Warner",
    "Waters", "Watkins", "Watt", "Weaver", "Webster", "Welch",
    "Weldon", "Wentworth", "Wheeler", "Whitley", "Whitman", "Whitten",
    "Wiley", "Wilkins", "Willard", "Williamson", "Willis", "Winton",
    "Wise", "Wolfe", "Woodard", "Woodcock", "Woodson", "Wren",
    "Wyatt", "Yancey", "Yates", "Yeager", "York", "Zane",
      "Ainsley", "Alcott", "Allerton", "Almond", "Alston", "Arbuckle",
    "Ashwood", "Avery", "Bain", "Baldock", "Barfield", "Barker",
    "Barringer", "Barton", "Baxendale", "Beauchamp", "Beckham", "Bedell",
    "Belton", "Beresford", "Birkett", "Blackmore", "Blakemore", "Bliss",
    "Bloor", "Blyth", "Boden", "Boggess", "Bohn", "Borden",
    "Bostwick", "Bowyer", "Bradburn", "Braddock", "Bramble", "Branson",
    "Bratton", "Braxton", "Brayden", "Brecken", "Brenton", "Brewton",
    "Bridgeman", "Brightman", "Brisco", "Britt", "Brockett", "Bromfield",
    "Brookfield", "Broomfield", "Broughton", "Buckman", "Bulmer", "Burchfield",
    "Burford", "Burnley", "Burrell", "Burridge", "Busby", "Bushby",
    "Cade", "Calaway", "Calderwood", "Calkins", "Callis", "Camfield",
    "Canning", "Carden", "Carman", "Carrick", "Carrollton", "Carston",
    "Cartwright", "Cary", "Castell", "Caudle", "Challis", "Chambers",
    "Channing", "Chapple", "Charlton", "Chatham", "Chauncey", "Cheshire",
    "Chesterfield", "Chilton", "Clare", "Claxton", "Clayburn", "Cleaver",
    "Clegg", "Clifton", "Clymer", "Coates", "Cobham", "Cockburn",
    "Coggins", "Collingwood", "Collison", "Combes", "Conroy", "Coombs",
    "Copeland", "Copperfield", "Corby", "Cordell", "Cornwell", "Cottrell",
    "Covey", "Cowden", "Crandall", "Crane", "Cranston", "Crayton",
    "Creed", "Cresswell", "Crichton", "Crocker", "Crosley", "Croston",
    "Culbertson", "Cuthbert", "Dade", "Daggett", "Dakin", "Dallin",
    "Dandridge", "Danvers", "Darlington", "Darrow", "Daventry", "Dawley",
    "Dayton", "Deering", "Denby", "Denison", "Dennison", "Dever",
    "Dewhurst", "Dillingham", "Dimmock", "Dinsdale", "Dixon", "Dobbins",
    "Dodd", "Donovan", "Dorr", "Dorset", "Draycott", "Drinker",
    "Duckworth", "Dudgeon", "Dunstan", "Durnford", "Eades", "Eakins",
    "Earley", "Easton", "Eccleston", "Eddington", "Edgecomb", "Edgerton",
    "Elbert", "Elgin", "Ellwood", "Elston", "Elwood", "Emery",
    "Englefield", "Ennis", "Erskine", "Esson", "Etheridge", "Everard",
    "Fairbanks", "Fairburn", "Fairfax", "Fallows", "Farnham", "Farrington",
    "Faulk", "Fawcett", "Fay", "Fell", "Fenwick", "Ferris",
    "Fielder", "Findlay", "Firth", "Fleming", "Flintoff", "Follett",
    "Forbes", "Fortescue", "Fothergill", "Fowles", "Frampton", "Frisby",
    "Fulton", "Furman", "Gadsden", "Gage", "Gainsford", "Gale",
    "Gallant", "Gannett", "Garfield", "Garnett", "Garrard", "Garth",
    "Gatlin", "Gault", "Geddes", "Gentry", "Gibb", "Gideon",
    "Giffard", "Giles", "Gilford", "Gilliam", "Glanville", "Glossop",
    "Godric", "Goldthorp", "Gore", "Gosling", "Grafton", "Grantham",
    "Graydon", "Greaves", "Greenfield", "Gregson", "Grenville", "Grice",
    "Grimshaw", "Grindall", "Grisby", "Grove", "Gunnell", "Guthrie",
    "Hackett", "Haddon", "Hadleigh", "Haldane", "Hale", "Hales",
    "Hambleton", "Hampson", "Hankins", "Hansford", "Harcourt", "Harding",
    "Harford", "Hargreaves", "Harland", "Harlow", "Harmsworth", "Harriman",
    "Harrow", "Hartwell", "Harwood", "Hassell", "Hathaway", "Havelock",
    "Haworth", "Hayden", "Haywood", "Heald", "Hearn", "Heathcote",
    "Hedge", "Hedges", "Helms", "Hendon", "Henley", "Henshaw",
    "Hervey", "Hewson", "Hext", "Hickox", "Higginbotham", "Hildreth",
    "Hinchcliffe", "Hinton", "Hirst", "Hobson", "Hodgkins", "Holcroft",
    "Holland", "Hollingsworth", "Hollowell", "Holmes", "Holt", "Holton",
    "Honeycutt", "Hopewell", "Hopwood", "Horsley", "Horton", "Houghton",
    "Howarth", "Hudd", "Hume", "Humphreys", "Hunnicutt", "Hutchings",
    "Hyland", "Ingham", "Ingleby", "Irvine", "Irving", "Isham",
    "Isherwood", "Ives", "Jagger", "Jardine", "Jasper", "Jepson",
    "Jervis", "Judd", "Kearns", "Keeling", "Keen", "Kemble",
    "Kennett", "Kensington", "Kerridge", "Kershaw", "Ketton", "Kidd",
    "Kilburn", "Kimber", "Kingsley", "Kinsley", "Kirton", "Knaggs",
    "Kneale", "Lacy", "Laird", "Lambert", "Landon", "Langford",
    "Langton", "Larkin", "Latham", "Laurie", "Lawton", "Layton",
    "Leach", "Leavitt", "Leighton", "Lester", "Lethbridge", "Lever",
    "Lidstone", "Lightfoot", "Linden", "Lindley", "Linton", "Lister",
    "Littleton", "Lockett", "Longworth", "Loring", "Lovell", "Lowden",
    "Lowther", "Ludlow", "Lundy", "Lunn", "Luton", "Lyle",
    "Lyman", "Mace", "Maddocks", "Maitland", "Mallory", "Malton",
    "Maple", "Marwood", "Matlock", "Maunder", "Mawson", "Mayhew",
    "McAllister", "McBain", "McCartan", "McCarty", "McCulloch", "McDade",
    "McEwen", "McFarlane", "McGarry", "McGill", "McGrath", "McIntyre",
    "McKellar", "McLaren", "McLennan", "McNally", "McShane", "McTaggart",
    "Meadows", "Medley", "Mellor", "Mercer", "Merry", "Merton",
    "Metcalf", "Milburn", "Millington", "Milner", "Moffat", "Montague",
    "Morley", "Morpeth", "Morrice", "Mortimer", "Moss", "Mott",
    "Mould", "Muir", "Murchison", "Murdock", "Murrin", "Naylor",
    "Nesbit", "Nettleton", "Newbold", "Newby", "Newman", "Niblett",
    "Niles", "Noble", "Norbury", "Norris", "Northcote", "Norton",
    "Norwood", "Nutter", "Oakden", "Odell", "Ogden", "Oldham",
    "Orr", "Osborne", "Osgood", "Overton", "Oxley", "Packwood",
    "Paine", "Palmer", "Parkin", "Parr", "Parrott", "Parsons",
    "Pate", "Patten", "Paxton", "Payton", "Peacock", "Peel",
    "Pendleton", "Penrose", "Perrin", "Pettit", "Phipps", "Pickard",
    "Pike", "Pinder", "Pinkerton", "Pitman", "Pollock", "Poole",
    "Poulton", "Powell", "Prentice", "Prescott", "Preston", "Pritchard",
    "Proctor", "Pryor", "Purvis", "Quinton", "Radcliffe", "Ramsay",
    "Ranson", "Ratcliff", "Raven", "Rawlins", "Rawson", "Redfern",
    "Redman", "Reeve", "Renwick", "Rhodes", "Richmond", "Riddell",
    "Ridley", "Rigby", "Rimmer", "Rippin", "Risley", "Ritchie",
    "Roach", "Robson", "Roderick", "Rodwell", "Roffe", "Rolfe",
    "Roper", "Rowell", "Rowlands", "Roxby", "Royle", "Ruddock",
    "Rush", "Rushton", "Rust", "Rutter", "Ryder", "Sampson",
    "Sanderson", "Sands", "Satterthwaite", "Saxton", "Scofield", "Seabrook",
    "Seddon", "Selby", "Selwyn", "Seward", "Shackleton", "Sharman",
    "Shawcross", "Sheldrake", "Shelton", "Sheppard", "Sherbourne", "Sherwin",
    "Shields", "Shipton", "Shore", "Shuttleworth", "Sidney", "Silvester",
    "Simcox", "Simmonds", "Simpson", "Sinclair", "Sisson", "Slater",
    "Smalley", "Smart", "Smethurst", "Snape", "Snowden", "Somers",
    "Southworth", "Sowden", "Speight", "Spence", "Spencer", "Spicer",
    "Spooner", "Sprague", "Spring", "Spurgeon", "Squire", "Stacey",
    "Stamper", "Stanfield", "Staniforth", "Stannard", "Stansfield", "Stanton",
    "Starkey", "Stead", "Stedman", "Steel", "Stephens", "Sterne",
    "Stockdale", "Stokes", "Storr", "Stott", "Stratford", "Street",
    "Stretton", "Strickland", "Stubbings", "Sturdy", "Sudbury", "Sutcliffe",
    "Sutton", "Swales", "Swann", "Sykes", "Symonds", "Tabor",
    "Tait", "Tanner", "Tansley", "Tapley", "Tarrant", "Tasker",
    "Tate", "Tattersall", "Tayler", "Teasdale", "Templeton", "Thacker",
    "Thane", "Thatcher", "Thorp", "Thurlow", "Tice", "Tidwell",
    "Tilley", "Tindall", "Tinker", "Tipton", "Tisdale", "Toland",
    "Toller", "Tomkins", "Toomey", "Torrance", "Towle", "Townley",
    "Tracey", "Trafford", "Travers", "Travis", "Treadwell", "Trent",
    "Trevor", "Trigg", "Truman", "Tuck", "Tully", "Turpin",
    "Tuttle", "Underhill", "Upton", "Usher", "Vale", "Vaughan",
    "Venables", "Venn", "Vernon", "Vickers", "Vine", "Waddington",
    "Wade", "Wadsworth", "Wainwright", "Wakefield", "Waldron", "Wallis",
    "Walpole", "Walters", "Walton", "Wardle", "Waring", "Warne",
    "Warr", "Warrington", "Warwick", "Waterhouse", "Watkin", "Watt",
    "Weaver", "Webb", "Webster", "Weld", "Wellborn", "Weller",
    "Wentworth", "Westbrook", "Westcott", "Wetherby", "Whaley", "Wharton",
    "Wheaton", "Wheeler", "Wheelwright", "Whitby", "Whitelaw", "Whitfield",
    "Whitlock", "Whitmore", "Whitt", "Wickham", "Wicks", "Wilcox",
    "Wilding", "Wilkerson", "Will", "Willoughby", "Wilmot", "Wilton",
    "Winfield", "Wingfield", "Winsor", "Winterbourne", "Winthrop", "Winton",
    "Withers", "Withey", "Woolley", "Wooten", "Worsley", "Wren",
    "Wroe", "Wyatt", "Wylie", "Yardley", "Yates", "Yeoman",
    "Younger", "Zouch",
    "atzenhoffer", // From atzenhofferchevrolet.com (row 1217)
    "bodwell", // From bodwellchryslerjeepdodge.com (row 1213)
    "braun", // From braunability.com (rows 1214–1215)
    "brinson", // From brinsonford.com (rows 1219–1220)
    "buckalew", // From buckalewchevrolet.com (row 1221)
    "bunnin", // From bunnin.com (row 1212)
    "cabral", // From cabralchryslerjeepdodgeram.com (row 1225)
    "caruso", // From carusohyundai.com (row 1235)
    "cavender", // From cavenderchevrolet.com (row 1236)
    "chesrown", // From chesrownchevrolet.com (row 1241)
    "ciocca", // From cioccachevrolet.com (row 1243), also in KNOWN_PROPER_NOUNS
    "clawson", // From clawsonhonda.com (row 1245)
    "coleman", // From colemanchevrolet.com (row 1246)
    "conley", // From conleycdj.com (row 1249)
    "copple", // From copplechevroletgmc.com (row 1250)
    "corwin", // From corwinford.com (row 1251)
    "coulter", // From coultercadillacbuickgmc.com (row 1252)
    "covert", // From covertchevrolet.com (row 1253)
    "cummins", // From cumminschryslerdodgejeep.com (row 1257)
    "darling", // From darlingchevrolet.com (row 1270)
    "deery", // From deerychevrolet.com (row 1275)
    "deien", // From deienchevrolet.com (row 1276)
    "denney", // From denneychevrolet.com (row 1278)
    "denooyer", // From denooyerchevrolet.com (row 1280)
    "depaula", // From depaulachevrolet.com (row 1281)
    "difeo", // From difeochevrolet.com (row 1283)
    "doenges", // From doengesford.com (row 1284)
    "dorman", // From dormanproducts.com (row 1285)
    "dorsch", // From dorschford.com (row 1286)
    "duncan", // From duncanchevrolet.com (row 1288)
    "duval", // From duvalhonda.com (row 1289)
    "dyer", // From dyerchevrolet.com (row 1290)
    "eide", // From eideford.com (row 1293)
    "elder", // From elderford.com (row 1294)
    "eskridge", // From eskridgechevrolet.com (row 1295)
    "estle", // From estlechevrolet.com (row 1296)
    "farrish", // From farrishchryslerjeepdodge.com (row 1298)
    "faulkner", // From faulknerchevrolet.com (row 1299)
    "feeny", // From feenychryslerdodgejeep.com (row 1300)
    "ferguson", // From fergusonchevrolet.com (row 1301)
    "goldstein", // From goldsteinchryslerjeepdodge.com (row 1304)
    "graber", // From graberford.com (row 1305)
    "grainger", // From graingerhonda.com (row 1306)
    "haggerty", // From haggertyford.com (row 1308)
    "halleen", // From halleenchevrolet.com (row 1309)
    "hanner", // From hannerchevrolet.com (row 1310)
    "hardin", // From hardinchevrolet.com (row 1311)
    "hiley", // From hileyhuntsville.com (row 1312)
    "holler", // From hollerhyundai.com (row 1314)
    "horne",
    "house", // From housechevrolet.com (row 1316)
    "huber", // From huberchevrolet.com (row 1317)
    "huggins", // From hugginschevrolet.com (row 1318)
    "hunt", // From huntchevrolet.com (row 1319)
    "ide", // From idechevrolet.com (row 1320)
    "ingersoll", // From ingersollchevrolet.com (row 1321)
    "irwin", // From irwinchevrolet.com (row 1322)
    "jacobs", // From jacobschevrolet.com (row 1323)
    "rahal", // From bobbyrahal.com (row 1207)
    "leith", // From chrisleithchevrolet.com (row 1242)
    "black", // From carlblackchevrolet.com (row 1229)
    "carlsen", // From carlsenchevrolet.com (row 1230)
    "charles", // From charlesclarkchevrolet.com (row 1239)
    "chase", // From chasechevrolet.com (row 1240)
    "ardmore", // From dealership naming trends (e.g., Ardmore Toyota)
    "barrington", // From regional dealership names
    "bartow", // From Bartow Ford
    "beauregard", // From regional surnames
    "bedell", // From dealership naming trends
    "benton", // From Benton Nissan
    "berkley", // From regional surnames
    "bradley", // From Bradley Chevrolet
    "brannon", // From Brannon Honda
    "brewer", // From Brewer Chrysler
    "buckner", // From Buckner Ford
    "burkett", // From Burkett Dodge
    "calloway", // From Calloway Chrysler
    "cantrell", // From Cantrell Chevy
    "cardinal", // From Cardinal Buick
    "carmichael", // From Carmichael Ford
    "carrington", // From Carrington Toyota
    "cassidy", // From Cassidy Chrysler
    "caudill", // From Caudill Honda
    "chatham", // From Chatham Parkway Toyota
    "childress", // From Childress Chevy
    "clanton", // From Clanton Chrysler
    "clements", // From Clements Subaru
    "coburn", // From Coburn Ford
    "collier", // From Collier Jeep
    "compton", // From Compton Dodge
    "connolly", // From Connolly Buick
    "corbett", // From Corbett Chrysler
    "crawford", // From Crawford Chevy
    "creighton", // From Creighton Honda
    "crockett", // From Crockett Subaru
    "crosby", // From Crosby Nissan
    "culpepper", // From Culpepper Ford
    "curran", // From Curran Chevy
    "cushman", // From Cushman Chrysler
    "dalton" // From Dalton Toyota
  ]);

const KNOWN_PROPER_NOUNS = new Set([
  "rt128", "abbots", "billings", "two", "rivers", "whitaker", "woodmen", "zeigler", "west", "metro", "topy", "america", "stone", "mountain", "stnt", "vance", "jones", "walker", "wagner", "weatherford", "waldorf", "weir canyon", "weirs", "van", "syckle", "village", "patterson", "advantage", "ac", "anderson", "art", "moehn",
  "atamian", "fox", "arnie bauer", "avis", "barnett", "beck", "masten",
  "berman", "bert", "smith", "rosenthal", "bill", "oneal", "jason", "lewis", "dube", "bird",
  "now", "bob", "walk", "johnson", "bowman", "boch", "bulluck", "goss", "hadwin",
  "byers", "calavan", "camino real", "kent", "carl", "capitol", "carl", "black",
  "carrollton", "charlie", "chastang", "winter", "ciocca", "classic", "criswell",
  "crossroads", "crystal", "kyle durrence", "currie", "czag", "dan", "cummins", "andrews",
  "demontrond", "devine", "dick", "lovett", "donalson", "don",
  "baker", "hattan", "hinds", "jacobs", "doupreh", "duval", "ide",
  "eckenrod", "elway", "executive", "prestige", "garland", "krieger", "ag", "exprealty", "fairey",
  "fletcher", "frank", "leta", "galpin", "galeana", "garlyn shelton",
  "germain", "graber", "grainger", "chuck", "fairbanks", "gravity", "gregg", "young",
  "greg", "leblanc", "gus", "machado", "hgreg", "hoehn",
  "hmotors", "ingersoll", "greg", "hubler", "fairfield", "ingrid", "jack", "powell", "jake",
  "sweeney", "jay", "wolfe", "jerry", "seiner", "jim",
  "falk", "taylor", "jimmy", "britt", "joyce", "koons", "dorman", "fred", "lavery", "gault", "gateway", "george", "white",
  "jt", "kadlec", "kalidy", "betten", "baker", "bodwell", "biener", "betten", "carlsen", "cavalier", "karl", "stuart", "keating", "charles", "barker", "copple", "corwin", "daytona", "deery", "deland", "denney",
  "kennedy", "kerbeck", "kwic", "city", "laura", "law",
  "look", "larson", "lou", "sobh", "malouf", "mariano", "martin",
  "masano", "mattiacio", "maverick", "mbbhm", "caldwell", "stockton",
  "mccarthy", "mclarty", "daniel", "metro", "mikeerdman", "mike",
  "shaw", "mill", "morehead", "mterry", "new holland", "np",
  "oakland", "pat", "milliken", "phil", "potamkin", "preston",
  "pugmire", "radley", "raser", "ray", "razor", "rbmw",
  "rb", "ready", "lallier", "regal", "ricart", "rick",
  "rivera", "robbins", "robert", "thorne", "rod", "gossett",
  "ron", "bouchard", "safford", "brown", "sansone", "schmelz",
  "scott", "clark", "seawell", "secor", "sewell", "sharpe",
  "sheehy", "shottenkirk", "smart", "smothers", "starling", "stiverson",
  "line", "step one", "sunbelt", "sunny", "king", "suntrup",
  "swant", "tasca", "tedbritt", "team", "premier collection", "tfl",
  "titus", "will", "tom", "cadlec", "tomlinson", "hesser",
  "tommynix", "country", "trent", "tsands", "tuttle", "click",
  "union", "vander", "hyde", "vinart", "vscc", "westgate",
  "herr", "wickmail", "bear mountain", "cavalier", "liberty", "hmtr",
  "nola", "lynch", "monadnock", "viva", "alan", "byer",
  "ancira", "asag", "mv", "banks", "blake", "offreeport",
  "chevyland", "superior", "mark", "news", "my", "big horn",
  "briswell", "barlow", "braman", "carver", "carter", "cavender",
  "century", "crevier", "deacons", "ferguson", "gateway", "mcgeorge",
  "qarm", "st pete", "redland", "rosen", "rossi", "shults",
  "stadium", "stephen", "wade", "stivers", "werner", "zumbrota",
  "nation", "dyer", "gold", "larry", "miller", "nixon",
  "norwood", "robby", "rohman", "serpentini", "vannuys", "bramanmc",
  "fair oaks", "golf mill", "kingsford", "smithtown", "memorial", "perillo",
  "woodland", "tv", "wide world", "kadlac", "adesa", "advantage",
  "adventure", "allen", "amc", "andean", "ardmore", "arnie",
  "bauer", "atlantic", "axio", "baldhill", "ballard", "behlmann",
  "bettengm", "big", "bleecker", "bobby", "rahal", "bodwell",
  "boulevard", "bowman", "brandon", "braun", "ability", "bronco",
  "brown", "buckeye", "bunnin", "butler", "carhop", "chester",
  "nikel", "chris", "clawson", "coast", "coastal", "save",
  "saves", "colemean", "collection", "colonial", "central", "rockwall",
  "rohrman", "joliet", "novato", "ogden", "sands", "new smyrna",
  "used", "preowned", "fort", "rogers", "dabbs", "sharp",
  "atzen", "hoffer", "west", "rudy", "luther", "saveat",
  "stockton", "corn", "husker", "husky", "route1", "keller",
  "deal", "elk", "whitetail", "cooper", "streetside", "daniels",
  "nadal", "lisle", "plaza", "midway", "think", "bespoke",
  "rising", "fast", "abernethy", "hiley", "principle", "vera", "sutherlin",
  "diplomat", "coral", "gables", "bayshore", "jackson", "westchester", "memphis",
  "peter", "boulware", "group1auto", "gengra", "dm", "leasing", "roger", "beasley", "mbso",
  "feeny", "fernandez", "fiesta", "fernelious", "tower", "formula",
  "fishers", "firkins", "fields", "challenge", "class", "first",
  "eide", "elkgrove", "exton", "evergreen", "faulkner", "farrish",
  "elder", "diamond", "dorman", "chevyman", "westside", "southside",
  "eastside", "dorsch", "diers", "denooyer", "days", "davis",
  "darling", "davidson", "devoe", "covert", "curry", "courtesy",
  "coulter", "corwin", "conley", "concordia", "competition", "countryside",
  "cityside", "chase", "chapman", "carlsen", "captitol", "burns",
  "boardman", "brinson", "buchanan", "bridgewater", "boyle", "boch",
  "blueprint", "blossom", "bertera", "pacific", "piazza", "alpine",
  "rocky mountain", "apple", "american", "champion", "airport", "adventures",
  "acadian", "purdy", "albrecht", "benna", "bespoke", "fenton",
  "goldstein", "crown", "royal", "fivestar", "summit", "granuto",
  "titanium", "worktrux", "fordham", "platinum", "true", "morrey",
  "elyria", "star", "galveston", "pinegar", "queens", "jessup",
  "tracy", "biggers", "big", "norris", "rockhill", "lockhart",
  "rich", "roh", "ourisman", "grieco", "aventura", "cecil",
  "sango", "vacaville", "stevens creek", "bud", "kendall", "legend",
  "direct", "skyline", "garland", "prestige", "grappone", "teton",
  "midland", "arrow", "tejas", "sloane", "delaca", "farland",
  "golden", "emmert", "lobb", "price", "ike", "edmond",
  "frede", "fair", "lux", "luxury", "quality", "pristine",
  "premier", "best", "open road", "grantspass", "grubbs", "friendship",
  "heritage", "peabody", "pape", "lakeside", "alsop", "livermore",
  "bond", "armen", "destination", "newsmyrna", "mcdaniel", "raceway",
  "jet", "teddy", "bert", "ogden", "mabry", "hilltop", "victory",
  "maita", "caruso", "ingersoll", "total", "offroad", "rivera",
  "haley", "oxmoor", "reed", "lallier", "bird", "now", "beaty", "strong",
  "milnes", "deluca", "fast", "hanania", "haasza", "weaver",
  "biddle", "akins", "voss", "mohr", "andy", "andrew",
  "trust", "motorcity", "bachman", "billingsley", "bill", "holt",
  "bayou", "bayway", "atzenhoffer", "arceneaux", "applegate", "arrowhead",
  "exchange", "antonino", "falls", "schworer", "beardmore", "paddock",
  "sunset", "woldwide", "huttig", "young", "wollam", "windy",
  "winn", "wantz", "whitaker", "wolf", "woodbury", "woodhams",
  "woodmen", "winchester", "wheelers", "weirs", "walker", "wagner",
  "waconia", "village", "vera", "university", "valencia", "umansky",
  "twins", "troncalli", "transit", "thoroughbred", "topy", "sutton",
  "superior", "sussex", "stones", "stillwell", "southland", "philly",
  "statewide", "stringwray", "stingray", "sullivan", "stowasser", "simms",
  "stanley", "sth", "sands", "sm", "scenic", "schimmer",
  "schultz", "sendell", "shepard", "sierra", "sentry", "rockland",
  "rodenroth", "rosenthal", "ryan", "roush", "rice", "prp",
  "putnam", "ramsey", "rivard", "brogden", "getahonda", "green",
  "roberts", "riley", "redding", "ressler", "right", "rally",
  "pioneer", "pellegrino", "pederson", "planet", "rabbe", "imports",
  "plaza", "pappas", "obrien", "odonnell", "northtown", "parks",
  "parkave", "pearson", "conte", "paragon", "northshore", "nwh",
  "mullinax", "nelson", "emetro", "nick", "mohawk", "monument",
  "motion", "moyer", "mullina", "moon", "stead", "mills",
  "mag", "huber", "mcguire", "meadel", "medlin", "matthews",
  "marion", "marlboro", "maxwell", "mann", "mandal", "manahawkin",
  "maher", "machaik", "lodi", "linquist", "lindsay", "lake",
  "lebrun", "kitchener", "klein", "kunes", "kerry", "prestige",
  "kings", "key", "kamaaina", "bowman", "joseph", "megel",
  "spady", "haggerty", "jenkins", "irwin", "barge", "huggins",
  "hughes", "hodges", "ide", "house", "horne", "holler",
  "hunt", "hendricks", "heartland", "harbor", "hardy", "gossett",
  "halleen", "hanner", "hardin", "hacienda", "grands", "granite",
  "grayson", "greve", "goss", "goodson", "grand", "garber",
  "garrett", "gault", "interstate", "rudy", "luther", "jim",
  "taylor", "mike", "shaw", "county", "side", "pape",
  "medlin", "viva", "suntrup", "nfw", "copple", "airport",
  "heritage", "navato", "golden", "west", "north", "east",
  "west", "south", "roseville", "mabry", "fivestar", "silver", "lake",
  "banks", "starling", "mills", "crystal", "joyce", "midway",
  "dag", "power", "autonation", "silverstar", "wilsonville", "billingsley",
  "crown", "thompson", "silver", "star", "galveston", "pinegar",
  "queens", "jessup", "tracy", "biggers", "bigjoe", "norris",
  "thornton", "milliken", "shelbyville", "premier", "burnsville", "wesley",
  "kennesaw", "slidell", "gwinnett", "waconia", "lake", "star",
    "alliance", // e.g., dealership groups
  "anchor", // regional branding
  "apex", // modern dealership names
  "asbury", // dealership group
  "aurora", // geographic/dealership name
  "autohaus", // German-style dealerships
  "avenue", // e.g., Park Avenue
  "badger", // regional branding
  "bayside", // coastal dealerships
  "beacon", // dealership branding
  "benson", // owner/dealership name
  "bluff", // geographic term
  "bright", // branding term
  "brook", // geographic term
  "bulldog", // from bulldogkia.com
  "canyon", // geographic term
  "capital", // e.g., Capitol City
  "cascade", // regional term
  "choice", // from chapmanchoice.com
  "clover", // dealership branding
  "commerce", // business-oriented term
  "compass", // modern branding
  "cornerstone", // dealership branding
  "crest", // geographic/branding
  "delta", // regional term
  "denver", // city-based branding
  "desert", // regional term
  "destiny", // modern branding
  "diamond", // premium branding
  "dixie", // regional term
  "eagle", // dealership branding
  "edge", // modern branding
  "elite", // premium dealerships
  "emerald", // branding term
  "empire", // from empirenissan.com
  "encore", // modern branding
  "endeavor", // dealership branding
  "epic", // modern branding
  "expressway", // location-based
  "falcon", // dealership branding
  "frontier", // regional branding
  "fusion", // modern branding
  "gator", // regional branding
  "glacier", // geographic term
  "grandview", // location-based
  "greenway", // location-based
  "griffin", // owner/dealership name
  "grove", // geographic term
  "harbor", // coastal branding
  "haven", // dealership branding
  "highland", // geographic term
  "horizon", // branding term
  "ignite", // modern branding
  "infinity", // premium branding
  "interstate", // location-based
  "jewel", // premium branding
  "junction", // location-based
  "keystone", // dealership branding
  "laguna", // coastal/regional
  "landmark", // dealership branding
  "legacy", // dealership branding
  "liberty", // from liberty dealerships
  "lone", // regional term
  "magnolia", // regional term
  "mainstream", // dealership branding
  "majestic", // premium branding
  "marina", // coastal branding
  "matrix", // modern branding
  "meadow", // geographic term
  "meridian", // geographic/branding
  "metroplex", // urban branding
  "midway", // location-based
  "milestone", // dealership branding
  "monarch", // premium branding
  "mountain", // geographic term
  "noble", // premium branding
  "northwest", // regional term
  "oasis", // dealership branding
  "orbit", // modern branding
  "pacific", // regional term
  "palace", // premium branding
  "bayway",
  "panorama", // geographic/branding
  "parkway", // location-based
  "pinnacle", // premium branding
  "plains", // regional term
  "platinum", // premium branding
  "prairie", // regional term
  "prime", // dealership branding
  "pro", // modern branding
  "pulse", // modern branding
  "radiant", // branding term
  "ridge", // geographic term
  "river", // geographic term
  "royal", // premium branding
  "saddle", // regional term
  "sage", // dealership branding
  "shore", // coastal branding
  "silver", // premium branding
  "sky", // branding term
  "southwest", // regional term
  "summit", // dealership branding
  "valley", // geographic term
  "abernathy", "alamo", "allred", "alto", "amarillo", "archer", "aspen", "aston",
  "atwood", "auburn", "avalon", "baird", "barrett", "barton", "belknap", "beltway",
  "berlin", "bexar", "blanchard", "bledsoe", "boulder", "brady", "breckenridge",
  "brighton", "brock", "caldwell", "carson", "chandler", "charleston", "cheyenne",
  "clifton", "cobb", "colton", "conway", "cortez", "crestview", "crosby", "dalton",
  "davenport", "dawson", "dayton", "decatur", "denton", "dover", "drake", "durango",
  "eastwood", "elgin", "elliot", "emerson", "everett", "fairview", "fargo", "fleming",
  "fremont", "gaines", "garland", "gibson", "glendale", "grady", "greer", "hampton",
  "hancock", "harlan", "harrington", "haven", "hawthorne", "hickory", "holloway",
  "homer", "hudson", "hurst", "irvine", "jasper", "jefferson", "kearney", "knox",
  "lakeland", "langston", "lansing", "lawson", "lexington", "lincoln", "logan",
  "madison", "marlow", "meadow", "brook", "mercer", "mesa", "montgomery", "newman",
  "ogden", "prescott", "redwood", "reno", "riverside", "sterling", "torrance",
  "vanguard", "westwood", "Gwinnett", "Dekalb", "Fulton", "Cobb",
    "Flemington", "Princeton", "Trenton", "Freehold",
    "Hilton Head", "Beaufort", "Bluffton", "Savannah",
    "Hemet", "Temecula", "Murrieta", "Riverside",
    "Morristown", "Knoxville", "Johnson City", "Chattanooga",
    "Gainesville", "Ocala", "Jacksonville", "Tallahassee",
    "Lincoln", "Omaha", "Grand Island", "Kearney",
    "San Marcos", "New Braunfels", "Austin", "San Antonio",
    "Watertown", "Syracuse", "Utica", "Rochester",
    "Hudson", "Albany", "Poughkeepsie", "Kingston",
        "Firkins", "Flemington", "First Class", "FJ", "Fishers", "Fivestar",
    "Fred", "Lavery", "Freehold", "Frank", "Beck", "Fort Collins", "Folsom", "Fontana",
    "Formula", "George", "White", "Gene", "Latta", "Garden State", "Gault", "Hilton", "Head",
    "Hemet", "Heartland", "Hedrick", "Hacienda", "Halleen", "Hanner",
    "Harbor", "Hardin", "Huggins", "Hughes", "Hunt", "Huntington",
    "Huston", "Ide", "Beachwood", "BHM", "Kingsport", "Morristown",
    "Gainesville", "San Marcos", "Watertown", "Horne", "House", "Chambers",
    "Heritage", "HMTR", "Hillside", "Granite", "Grayson", "Greve",
    "Goodson", "Goss", "Goldstein", "Gerald", "Gilchrist", "Gillespie",
    "Gaines", "Gateway", "Hadwin", "White", "Haley", "Hamilton",
    "Ames", "Latta", "Erst", "Habberstad", "Birmingham", "Grand",
    "Grainger", "Galeana", "Galpin", "Garber", "George", "Collins",
    "Frey", "Baxter", "Sterling", "Patterson", "Crestmont", "Marino",
    "Vaughn", "Holland", "Sterne", "Brighton", "Carson", "Denton",
    "Elliot", "Fairview", "Greer", "Hampton", "Knox", "Madison",
    "Mercer", "Newman", "Prescott", "Torrance", "Vanguard", "Westwood",
    "Allred", "Baird", "Conway", "Dalton",
      "albany",
  "atlanta",
  "aurora",
  "autohaus",
  "avenue",
  "badger",
  "bayside",
  "beacon",
  "birmingham",
  "bluffton",
  "carmax",
  "concord",
  "dallas",
  "danvers",
  "daytona",
  "delray",
  "detroit",
  "durham",
  "easton",
  "edison",
  "evansville",
  "fort",
  "greenville",
  "hartford",
  "hawaii",
  "houston",
  "irving",
  "jersey",
  "lancaster",
  "lisbon",
  "lithia",
  "louisville",
  "manchester",
  "miami",
  "mobile",
  "naples",
  "nashville",
  "newark",
  "norfolk",
  "orlando",
  "palm",
  "penske",
  "peoria",
  "phoenix",
  "raleigh",
  "roanoke",
  "sacramento",
  "santa",
  "seattle",
  "sonic",
  "springfield",
  "tampa",
  "tucson",
  "weston",
  "wilmington",
  "winston",
  "Chuck",
  "Fairbanks",
  "sewell",
  "Woodland",
  "Hills",
  "Saveat",
  "Sterling",
  "La Grange",
  "VSCC",
  "Memorial",
  "smithtown",
  "towne",
  "tampa",
  "North Haven",
  "reed",
  "lallier",
  "oxmoor",
  "haley",
  "nfw",
  "stockton",
  "total",
  "offroad",
  "bakersfield",
  "auburn",
  "victory",
  "midway",
  "bill",
  "smith",
  "joe",
  "perillo",
  "parkway",
  "family",
  "gastonia",
  "butler",
  "trent",
  "dm",
  "palm coast",
  "roseville",
  "mike shaw",
  "werner",
  "sbh",
  "jet",
  "hoehn",
  "north",
  "county",
  "destination",
  "alsop",
  "mcdaniel",
  "route 1",
  "usa",
  "atzenhoffer",
  "hawthorne",
  "raceway",
  "sharpe",
  "golden",
  "west",
  "larson",
  "leblanc",
  "laura",
  "kalidy",
  "keller",
  "t sands",
  "west herr",
  "frank",
  "leta",
  "h greg",
  "airport",
  "hayward",
  "mv",
  "lou",
  "sobh",
  "johnson",
  "queen",
  "city",
  "star",
  "go",
  "montrose",
  "fox",
  "elk",
  "findlay",
  "penske",
  "garlyn",
  "shelton",
  "edwards",
  "rockhill",
  "nadal",
  "jack",
  "daniels",
  "streetside",
  "m tetty",
  "mike",
  "erdman",
  "doug",
  "reh",
  "NP Lincoln",
  "suntrup",
  "tru",
  "fivestar",
  "berman",
  "laurel",
  "tyler",
  "londoff",
  "worktrux",
  "pinehurst",
  "tv",
  "alderman",
  "banks",
  "caldwell",
  "summit",
  "group 1",
  "braman",
  "fenton",
  "hawk",
  "stadium",
  "redlands",
  "giles",
  "crossroad",
  "richmond",
  "metro",
  "zumbrota",
  "hiley",
  "redwood",
  "safford",
  "norwood",
  "anderson",
  "germain",
  "jerry",
  "seiner",
  "karl",
  "stuart",
  "al",
  "hendrickson",
  "andy",
  "mohr",
  "anna",
  "polis",
  "armen",
  "arnie",
  "bauer",
  "atlantic",
  "piazza",
  "vic",
  "myers",
  "fletcher",
  "jones",
  "gilbert",
  "grapevine",
  "austin",
  "beach",
  "beardmore",
  "beaver",
  "beaverton",
  "beck",
  "masten",
  "berlin",
  "bloomington",
  "blossom",
  "darien",
  "bobby",
  "rahal",
  "boch",
  "braun",
  "brinson",
  "bronco",
  "burns",
  "byers",
  "cabral",
  "ches",
  "rown",
  "colonial",
  "columbia",
  "competition",
  "concord",
  "conley",
  "cookeville",
  "crown",
  "davidson",
  "darling",
  "dan",
  "cummins",
  "crosscreek",
  "denooyer",
  "depaula",
  "dennis",
  "dillon",
  "curry",
  "dier",
  "dife",
  "mckinney",
  "don",
  "jacobs",
  "dorman",
  "koehn",
  "ed",
  "rinke",
  "eide",
  "elder",
  "elk",
  "grove",
  "eskridge",
  "evergreen",
  "bob",
  "estle",
  "expressway",
  "exton",
  "fields",
  "freehold",
  "friendly",
  "galpin",
  "galeana",
  "hardin",
  "holler",
  "hodges",
  "kingsport",
  "morristown",
  "gainesville",
  "hh",
  "greve",
  "griffin",
  "guntersville",
  "habberstad",
  "hadwin",
  "white",
  "halleen",
  "hansel",
  "herb",
  "chambers",
  "heritage",
  "hardy",
  "hanner",
  "hendricks",
  "new",
  "holland",
  "san marcos",
  "house",
  "hudson",
  "huggins",
  "hughes",
  "ira",
  "jack",
  "irwin",
  "jackson",
  "jaffarian",
  "fairfield",
  "james",
  "jansen",
  "jeff",
  "jenkens",
  "wynne",
  "spady",
  "haggerty",
  "winter",
  "curley",
  "click",
  "jm",
  "jones",
  "megel",
  "kennedy",
  "joe",
  "bowman",
  "joyce",
  "koons",
  "jt",
  "hambra",
  "augusta",
  "norman",
  "fontaine",
  "lake",
  "charles",
  "lebrun",
  "lee",
  "legend",
  "levit",
  "town",
  "carlsbad",
  "lindsay",
  "lindquist",
  "lockhart",
  "maita",
  "mana",
  "hawkin",
  "manchester",
  "matthews",
  "meade",
  "mcguire",
  "mcgee",
  "cutler",
  "bay",
  "MB BHM",
  "minchin",
  "nemer",
  "victory",
  "shallotte",
  "mullina",
  "nelson",
  "middletown",
  "odonnell",
  "oakland",
  "oakwood",
  "obrien",
  "ozark",
  "paragon",
  "pioneer",
  "golling",
  "rodenroth",
  "rivard",
  "brogden",
  "riley",
  "roush",
  "russell",
  "barnett",
  "sir",
  "walter",
  "steve",
  "quick",
  "stevens",
  "creek",
  "sioux",
  "falls",
  "sentry",
  "schultz",
  "schimmer",
  "scenic",
  "sawyer",
  "statewide",
  "stanley",
  "southland",
  "stingray",
  "sussex",
  "tasca",
  "szott",
  "terryville",
  "philly",
  "drive",
  "troncalli",
  "dan",
  "vaden",
  "van",
  "syckle",
  "vara",
  "vera",
  "twins",
  "tulley",
  "valley",
  "deluca",
  "young",
  "wes",
  "finch",
  "well",
  "esley",
  "weatherford",
  "walker",
  "jones",
  "wantz",
  "waldorf",
  "younger",
  "woody",
  "huttig",
  "king",
  "world",
  "newton",
  "ashland",
  "freeway",
  "freeport",
  "starwood",
  "sarant",
  "midtown",
  "crews",
  "kingston",
  "sundance",
  "auto star",
  "gravity",
  "al hambra",
  "lou",
  "sobh",
  "monadnock",
  "morehead",
  "alan",
  "byer",
  "elk",
  "bedford",
  "platinum",
  "tyler",
  "fenton",
  "tommy",
  "nix",
  "diplomat",
  "coast",
  "taylor",
  "chastang",
  "art",
  "moehn",
  "garber",
  "bev",
  "smith",
  "principle",
  "acadiana",
  "airport",
  "arrow",
  "ascension",
  "ashland",
  "bill",
  "brandt",
  "bob",
  "brown",
  "blossom",
  "gpi",
  "brooklyn",
  "freeport",
  "nashville",
  "deland",
  "della",
  "easley",
  "dyer",
  "deland",
  "della",
  "easley",
  "kain",
  "hessert",
  "dyer",
  "elder",
  "elkins",
  "epic",
  "executive",
  "exton",
  "fairey",
  "fairway",
  "evans",
  "fairfield",
  "farland",
  "friendship",
  "golden",
  "coast",
  "island",
  "circle",
  "nazareth",
  "fortbend",
  "frank",
  "leta",
  "fremont",
  "fresno",
  "cuse",
  "gilleland",
  "glendale",
  "gary",
  "force",
  "grainger",
  "anderson",
  "grand",
  "grants",
  "pass",
  "Verneide",
  "wes finch",
  "wilkins",
  "mastria",
  "grieco",
  "hardy",
  "bachman",
  "century",
  "capitol",
  "lakeauto",
  "team",
  "hinderer",
  "dahl",
  "mcgovern",
  "cagaust",
  "Emmert", // For emmertmotors.com (row 2982)
  "Lute",
  "riley", // For luterileyhonda.com (row 3017)
  "Schaller", // For schallerauto.com (row 3018)
  "Hansel", // For hanselauto.com (row 3042)
  "Connolly", // For herbconnolly.com (row 3043)
  "Charper", // For charper.com (row 3046)
  "fernandez",
  "bronx",
  "marin",
  "sands",
  "monument",
  "royal",
  "rock",
  "bald",
  "hill",
  "flower",
  "golden",
  "circle",
  "bayou",
  "tom",
  "williams",
  "kenly",
  "alan",
  "webb",
  "olathe",
  "hardee",
  "billy",
  "kay",
  "matthew",
  "county",
  "mack",
  "grubbs",
  "permian",
  "keras",
  "scarff",
  "seth",
  "wadley",
  "jerry",
  "smith",
  "shively",
  "weikert",
  "clark",
  "dutch",
  "miller",
  "markley",
  "charper",
  "dana",
  "mullinax",
  "mastria",
  "lester",
  "glenn",
  "alamo",
  "charlie",
  "obaugh",
  "arrow",
  "kendall",
  "holmes",
  "york",
  "malloy",
  "sunnyvale",
  "papik",
  "grote",
  "music",
  "city",
  "wagner",
  "sheppard",
  "sunbelt",
  "maxie",
  "price",
  "bob",
  "brown",
  "serra",
  "whelan",
  "tom",
  "gill",
  "gunter",
  "limbaugh",
  "planet",
  "bomnin",
  "landmark",
  "mariano",
  "rivera",
  "serra",
  "monte",
  "university",
  "chris",
  "auffenberg",
  "gilchrist",
  "mike",
  "anderson",
  "dorschel",
  "route22",
  "capitol",
  "raabe",
  "bill",
  "brandt",
  "mcfarland",
  "94 Nissan",
  "robert",
  "thorne",
  "coconut",
  "point",
  "drive",
  "bedford",
  "victory",
  "johnson",
  "city",
  "carter",
  "stuart",
  "powell",
  "well",
  "esley",
  "ron",
  "bouchard",
  "rhine",
  "lander",
  "ray",
  "varner",
  "diffee",
  "olympia",
  "pine",
  "ourisman",
  "oxendale",
  "butte",
  "don",
  "miller",
  "don",
  "hinds",
  "central",
  "walnut",
  "creek",
  "serra",
  "benna",
  "frede",
  "braman",
  "hoehn",
  "sioux",
  "hermiston",
  "bob",
  "ferrando",
  "crest",
  "acton",
  "traver",
  "rivera",
  "kenny",
  "ross",
  "el cajon",
  "rodman",
  "todd",
  "wenzel",
  "bill",
  "holt",
  "sam",
  "leman",
  "mccormick",
  "bolle",
  "dutch",
  "miller",
  "homer",
  "skelton",
  "wyatt",
  "johnson",
  "quality",
  "jerry",
  "smith",
  "sussex",
  "bauman",
  "schwieter",
  "continental",
  "ozark",
  "valentia",
  "mohawk",
  "love",
  "albrecht",
  "hessert",
  "hudson",
  "island",
  "applegate",
  "hawkins",
  "cavendar",
  "dolan",
  "driving",
  "southern",
  "carousel",
  "smythe",
  "copeland",
  "keim",
  "coulter",
  "guelph",
  "colussy",
  "metro",
  "toth",
  "tracy",
  "eastside",
  "el centro",
  "soloman",
  "moyer",
  "oxendale",
  "spokane",
  "boyer",
  "hartford",
  "o regans",
  "speedcraft",
  "o daniel",
  "rivard",
  "crain",
  "bleecker",
  "lilliston",
  "reidsville",
  "papa",
  "larry",
  "hillis",
  "cecil",
  "lu",
  "jack",
  "aventura",
  "ilderton",
  "ancira",
  "akin",
  "my",
  "metro",
  "nucar",
  "dublin",
  "grappone",
  "gorno",
  "teton",
  "malouf",
  "es condido",
  "sloane",
  "gary",
  "force",
  "tejas",
  "peabody",
  "boerne",
  "connolly",
  "diver",
  "patt",
  "lobb",
  "performance",
  "giam",
  "balvo",
  "circle",
  "flemington",
  "wilkin",
  "rudolph",
  "ray",
  "varner",
  "rallye",
  "roswell",
  "rizza",
  "ronnie",
  "watkins",
  "paul",
  "miller",
  "pinebelt",
  "conte",
  "parkway",
  "oakridge",
  "ofallon",
  "mike",
  "calvert",
  "arrigo",
  "morgan",
  "mountain",
  "state",
  "central",
  "white",
  "plains",
  "maxie",
  "price",
  "mendota",
  "mcgrath",
  "leith",
  "lute",
  "riley",
  "jim",
  "norton",
  "joseph",
  "homer",
  "skelton",
  "hinderer",
  "helfman",
  "harper",
  "herb",
  "chambers",
  "gilleland",
  "don",
  "jackson",
  "donk",
  "edison",
  "fields",
  "dave",
  "wright",
  "coastal",
  "bob",
  "tomes",
  "big",
  "bend",
  "armstrong",
  "randy",
  "curnow",
  "huttig",
  "junction",
  "zeigler",
  "stevinson",
  "street",
  "ponte",
  "kc",
  "summers",
  "ken",
  "barrett",
  "key",
  "jim",
  "curley",
  "baier",
  "winter",
  "bowman",
  "habberstad",
  "gillespie",
  "folsom",
  "fontana",
  "joe",
  "cecco",
  "dife",
  "don",
  "jacobs",
  "doug",
  "henry",
  "eagle",
  "ed",
  "rinke",
  "coleman",
  "chris",
  "nikel",
  "brian",
  "harris",
  "bertera",
  "ballard",
  "bass",
  "bunch",
  "bristol",
  "acme",
  "abbot",
  "castle",
  "rock",
  "elko",
  "dag",
  "hermiston",
  "pape",
  "cedar",
  "brookhaven",
  "georgetown",
  "gm",
  "gaudin",
  "tomes",
  "calver",
  "borgman",
  "geb",
  "mossy",
  "superstore",
  "ferrando",
  "kurabe",
  "america",
  "todd",
  "wenzel",
  "ngk",
  "spark",
  "plug",
  "lasco",
  "pacific",
  "colonial",
  "capitol",
  "kenny",
  "ross",
  "pc",
  "butte",
  "serra",
  "94",
  "trilake",
  "ron",
  "bouchard",
  "miller",
  "well",
  "esley",
  "piazza",
  "diffee",
  "toms",
  "river",
  "palm",
  "coast",
  "bedford",
  "ronnie",
  "watkins",
  "reed",
  "mantoll",
  "tacoma",
  "sunbelt",
  "brown",
  "carter",
  "helfman",
  "hanania",
  "route22",
  "power",
  "bowser",
  "garden",
  "state",
  "fort",
  "bend",
  "midway",
  "cherry",
  "hill",
  "bury",
  "malloy",
  "limbaugh",
  "rice",
  "sharp",
  "landmark",
  "holmes",
  "epic",
  "donk",
  "roberson",
  "pecheles",
  "dunning",
  "arceneaux",
  "helena",
  "fieher",
  "epic",
  "dutch",
  "keras",
  "marin",
  "flowers",
  "bald",
  "copel",
  "dolan",
  "conyer",
  "smythe",
  "bachman",
  "smail",
  "bauman",
  "freedom",
  "valenti",
  "driving",
  "southern",
  "eastern",
  "northern",
  "western",
  "bellingham",
  "holly",
  "guelph",
  "bournival",
  "hartford",
  "roh",
  "rich",
  "grieco",
  "alexandria",
  "schaller"
]);

// @ts-ignore: Environment variables are set at runtime in Vercel
const VERCEL_AUTH_TOKEN = process.env.VERCEL_AUTH_TOKEN;
// @ts-ignore: Environment variables are set at runtime in Vercel
const VERCEL_AUTOMATION_BYPASS_SECRET = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
// @ts-ignore: Environment variables are set at runtime in Vercel
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!VERCEL_AUTH_TOKEN || !VERCEL_AUTOMATION_BYPASS_SECRET || !OPENAI_API_KEY) {
  logger.error("Missing environment variables", {
    missing: {
      VERCEL_AUTH_TOKEN: !VERCEL_AUTH_TOKEN,
      VERCEL_AUTOMATION_BYPASS_SECRET: !VERCEL_AUTOMATION_BYPASS_SECRET,
      OPENAI_API_KEY: !OPENAI_API_KEY
    }
  });
  throw new Error("Missing required environment variables");
}

// Rate limiting for OpenAI (20 requests/minute for safety)
const RATE_LIMIT_MS = 3000; // 3 seconds between requests
let lastRequestTime = 0;

// @ts-ignore: rateLimit is defined and used in this file
async function rateLimit() {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < RATE_LIMIT_MS) {
    const delay = RATE_LIMIT_MS - timeSinceLast;
    // @ts-ignore: setTimeout is a Node.js global
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  lastRequestTime = Date.now();
}

// Basic name regex (alphanumeric, spaces, hyphens, 2+ chars)
const NAME_REGEX = /^[a-zA-Z0-9\s-]{2,}$/;

// Ported buildPrompt logic (includes OVERRIDES examples)
function buildPrompt(domain, fallbackName, city, brand, rowNum, tokens) {
  // Validate global OVERRIDES
  try {
    if (typeof OVERRIDES === "undefined" || typeof OVERRIDES !== "object") {
      throw new Error("OVERRIDES not initialized as an object");
    }
  } catch (err) {
    logger.error(`Error accessing OVERRIDES in buildPrompt for row ${rowNum}: ${err.message}`, { rowNum });
    return {
      generated_name: "",
      generated_confidence: 0,
      generated_reasoning: `Failed to access OVERRIDES: ${err.message}`,
      fallback_confidence: 0,
      fallback_reasoning: "Constants error",
      flags: ["ConstantsError", "ReviewNeeded"]
    };
  }

  const cleanDomain = domain.trim().toLowerCase().replace(/^(www\.)/, "");
  const cleanFallbackName = fallbackName ? fallbackName.trim().replace(/[^a-zA-Z\s]/g, "") : "[None]";
  const cleanCity = city && city !== "unknown" ? city.trim().replace(/[^a-zA-Z\s]/g, "") : "";
  let cleanBrand = brand && brand !== "unknown" ? brand.trim().replace(/[^a-zA-Z\s]/g, "") : "";

  // Validate brand
  if (cleanBrand && !CAR_BRANDS.has(cleanBrand.toLowerCase()) && !BRAND_MAPPING[cleanBrand.toLowerCase()]) {
    logger.warn(`Invalid brand in prompt: ${cleanBrand}`, { rowNum, domain: cleanDomain });
    cleanBrand = "";
  }

  // Define domainTokens
  const domainTokens = cleanDomain.replace(/\..*$/, "").split(/[-_.]/);

  // Select up to 10 relevant OVERRIDES examples
  const overrideExamples = Object.entries(OVERRIDES)
    .filter(([d]) => domainTokens.some(t => d.toLowerCase().includes(t)))
    .slice(0, 10)
    .map(([d, n]) => `Domain: ${d}, Name: ${n}`)
    .join("\n") || Object.entries(OVERRIDES)
      .slice(0, 10)
      .map(([d, n]) => `Domain: ${d}, Name: ${n}`)
      .join("\n") || "[No Overrides]";

  // Use GAS-provided tokens, fall back to domainTokens if invalid
  const cleanTokens = Array.isArray(tokens) ? tokens
    .filter(t => typeof t === "string" && /^[a-zA-Z]{2,}$/.test(t.toLowerCase()))
    .map(t => t.toLowerCase()) : domainTokens.filter(t => /^[a-zA-Z]{2,}$/.test(t));
  const tokenString = cleanTokens.length > 0 ? cleanTokens.join(", ") : "[No Tokens]";

  return `
You are an expert in generating company names for automotive dealerships. Given the domain, tokens, city, and optional brand, generate a concise company name (1–2 words preferred) that adheres to the following rules and examples. Use the provided constants and scoring rules to ensure accuracy and brevity, suitable for cold email communication. Prioritize proper nouns, first/last name pairs, and domain tokens, while avoiding concatenated names, unwanted suffixes (e.g., Auto, Motors, World), and city inclusion unless explicitly indicated by domain tokens.

Inputs:
Row Number: ${rowNum}
Domain: ${cleanDomain}
Tokens: ${tokenString}
Fallback Name: ${cleanFallbackName}
City: ${cleanCity}
Brand: ${cleanBrand}
Override Examples:
${overrideExamples}

Positive Examples:
- Domain: graingernissan.com, Name: Grainger
- Domain: calavancars.com, Name: Calavan
- Domain: napleshonda.com, Name: Naples Honda
- Domain: vwofnaples.com, Name: Naples VW
- Domain: jimbaier.com, Name: Jim Baier
- Domain: jimclick.com, Name: Jim Click
- Domain: gunthermotors.com, Name: Gunther Motors
- Domain: autolenders.com, Name: Auto Lenders
- Domain: depaula.com, Name: DePaula // Added: Single-word proper noun example
- Domain: smith.com, Name: Smith // Added: Single-word last name example
- Domain: fishersimports.com Name: Fishers Import

Negative Examples:
- Domain: jimbutlermaserati.com, Avoid: Jimbutlermaserati
- Domain: maherchevrolet.com, Avoid: Maherchevrolet
- Domain: manahawkinkia.com, Avoid: Manahawkinkia
- Domain: findlayauto.com, Avoid: Las Vegas Auto Findlay
- Domain: papechevrolet.com, Avoid: Saco Chevrolet
- Domain: williamsautoworld.com, Avoid: Lansing Auto World
- Domain: sarantcadillac.com, Avoid: Valley Stream Cadillac
- Domain: fivestaronline.net, Avoid: Milledgeville Auto
- Domain: gengras.com, Avoid: Bristol Auto
- Domain: hawkauto.com, Avoid: Chicago Auto
- Domain: berman.com, Avoid: Barrington Motors
- Domain: jimbaier.com, Avoid: Jim Baier Motors
- Domain: fishersimports.com Name: Fishers Porsche 

Scoring Rules:
- Base: 70 for generated name with proper noun match, 70 for fallback.
- +20: Brand + city match (name includes city + car brand, only if city is in domain tokens).
- +20: First/Last name match (e.g., "Jim Butler").
- +20: Proper noun match (capitalized tokens, e.g., person/place).
- +10: Domain match (name reflects domain tokens).
- +10: Multi-token name (2–3 tokens, e.g., "Grainger Nissan").
- +15: Single-token proper noun (e.g., "Halleen").
- +10: Single-token last name with brand in domain (e.g., "Grainger").
- +10: Brand detected in name (matches brand in domain tokens or OVERRIDES/BRAND_MAPPING).
- -25: City match penalty (apply only if city is the first proper noun and not in domain tokens).
- -20: Concatenated name (e.g., "Jimbutlermaserati").
- +5: Possessive friendly for cold email sentences (i.e. [Company]'s CRM isn't broken-it's bleeding.)
- -5: Auto with car brand (e.g., "BMW Auto").
- -5: Short token (<3 chars, except "Auto").
- -5: Long token (≥8 chars).
- -10: Ambiguous single token (e.g., "North").
- -15: Duplicate tokens (e.g., "Lincoln Lincoln").
- -5: More than 3 tokens.
- -5: Names with "Motors", "Auto World", "Cars", "Auto Sales", "Auto Group" unless in domain tokens or proper noun phrase.
- -10: City-only names (e.g., "Birmingham Auto Sales").
- 0: Brand-only, generic-only names.

Instructions:
1. **Generate a concise name (1–2 words preferred)**:
   - Prioritize single-token proper nouns (e.g., "Grainger") or first/last name pairs (e.g., "Sam Leman") from KNOWN_PROPER_NOUNS, KNOWN_FIRST_NAMES, KNOWN_LAST_NAMES.
   - If tokens include a first/last name pair (e.g., "sam", "leman"), return only the pair (e.g., "Sam Leman"), excluding cities or suffixes unless explicitly in domain tokens.
   - If brand is provided or in domain tokens (e.g., "nissan"), include it (e.g., "Naples Nissan") only if city or proper noun is also present.
   - Avoid suffixes like "Auto", "Motors", "World" unless part of OVERRIDES or domain explicitly indicates (e.g., "gunthermotors.com" → "Gunther Motors").

2. **Handle proper noun and first/last name overlaps**:
   - If tokens like "sam", "leman", "todd", "wenzel" appear in both KNOWN_PROPER_NOUNS and KNOWN_FIRST_NAMES/KNOWN_LAST_NAMES, prioritize first/last name pairs (e.g., "Sam Leman", "Todd Wenzel") over multi-token proper nouns (e.g., "Leman Sam").
   - Check for proper noun matches only if first/last name pairs are not detected.

3. **Avoid city inclusion unless in domain**:
   - Exclude city (e.g., ${cleanCity}) unless it appears in domain tokens (e.g., "napleshonda.com" → "Naples Honda").
   - Apply -25 penalty if city is included as the first proper noun and not in domain tokens.

4. **Respect OVERRIDES and BRAND_MAPPING**:
   - Use OVERRIDES if provided (e.g., ${overrideExamples}).
   - Map "chevrolet" to "Chevy" per BRAND_MAPPING.

5. **Avoid common pitfalls**:
   - Prevent concatenated names (e.g., "Samleman", "Toddwenzel") by splitting tokens into proper nouns or first/last names.
   - Exclude GENERIC_TERMS and SUFFIXES_TO_REMOVE unless part of a valid brand or OVERRIDES.
   - Avoid long tokens (≥8 chars) or short tokens (<3 chars, except "Auto" if valid).
   - Don't mistake brand mapping abbreviations (fishersimports.com should not recognize "por" as Porsche, resulting in Fishers Porsche. The name should be Fisher Import.) 
6. **Scoring**:
   - Calculate confidence using the scoring rules.
   - Ensure minimum 60% confidence and NAME_REGEX compliance.
   - Return name with highest score, prioritizing brevity and positive example patterns.

Output Format:
{
  "generated_name": string,
  "generated_confidence": number,
  "generated_reasoning": string,
  "fallback_confidence": number,
  "fallback_reasoning": string,
  "flags": string[]
}
`;
}

export default async function handler(req, res) {
  const { domain, city, brand, rowNum, batchId, fallbackName, tokens } = req.body;

  // Validate inputs
  if (!domain || typeof domain !== "string") {
    logger.error("Invalid domain", { rowNum, domain, batchId });
    return res.status(400).json({
      name: "",
      confidence: 0,
      brand: "",
      flags: ["InvalidInput", "ReviewNeeded"],
      error: "Domain is required and must be a string"
    });
  }

  // Sanitize inputs
  const sanitizedDomain = domain.toLowerCase().trim().replace(/^(www\.)/, "");
  const sanitizedCity = city && typeof city === "string" ? city.toLowerCase().trim().replace(/[^a-zA-Z\s]/g, "") : "";
  let sanitizedBrand = brand && typeof brand === "string" ? brand.toLowerCase().trim().replace(/[^a-zA-Z\s]/g, "") : "";
  const sanitizedFallbackName = fallbackName && typeof fallbackName === "string" ? fallbackName.trim().replace(/[^a-zA-Z\s]/g, "") : "";

  // Validate brand
  if (sanitizedBrand && !CAR_BRANDS.has(sanitizedBrand.toLowerCase()) && !BRAND_MAPPING[sanitizedBrand.toLowerCase()]) {
    logger.warn(`Invalid brand: ${sanitizedBrand}`, { rowNum, domain: sanitizedDomain, batchId });
    sanitizedBrand = "";
  }

  // Process GAS-provided tokens
  const sanitizedTokens = Array.isArray(tokens) ? tokens.filter(t => typeof t === "string" && /^[a-zA-Z]{2,}$/.test(t.toLowerCase())).map(t => t.toLowerCase()) : [];
  if (!sanitizedTokens.length) {
    logger.warn("No valid tokens provided", { rowNum, domain: sanitizedDomain, batchId });
  }

  // Check OVERRIDES for direct match
  if (OVERRIDES[sanitizedDomain]) {
    logger.info("Override match found", {
      rowNum,
      domain: sanitizedDomain,
      name: OVERRIDES[sanitizedDomain],
      batchId
    });
    return res.status(200).json({
      name: OVERRIDES[sanitizedDomain],
      confidence: 100,
      brand: sanitizedBrand,
      flags: ["OverrideMatch"]
    });
  }

  // Check Vercel KV cache
  const cacheKey = `vercel_${sanitizedDomain}_${sanitizedCity}_${sanitizedBrand}`;
  let cachedResult = null;
  try {
    cachedResult = await kv.get(cacheKey);
    if (cachedResult) {
      logger.info("Cache hit", {
        rowNum,
        domain: sanitizedDomain,
        cacheKey,
        batchId
      });
      return res.status(200).json({
        ...cachedResult,
        brand: sanitizedBrand,
        flags: [...(cachedResult.flags || []), "CachedVercel"]
      });
    }
  } catch (kvError) {
    logger.warn(`KV error: ${kvError.message}`, { rowNum, domain: sanitizedDomain, batchId });
  }

  try {
    // Rate limit OpenAI calls
    await rateLimit();

    const prompt = buildPrompt(sanitizedDomain, sanitizedFallbackName, sanitizedCity, sanitizedBrand, rowNum, sanitizedTokens);

    // Explicit try-catch for OpenAI call
    let openAiResponse;
    try {
      openAiResponse = await callOpenAI(prompt, {
        model: "gpt-3.5-turbo",
        max_tokens: 250,
        temperature: 0.4,
        retries: 3,
        timeoutMs: 10000
      });
    } catch (openAiError) {
      logger.error("OpenAI call failed", {
        rowNum,
        domain: sanitizedDomain,
        error: openAiError.message,
        batchId
      });
      let fallbackGeneratedName = "";
      if (sanitizedBrand && sanitizedCity && sanitizedTokens.includes(sanitizedCity)) {
        const cityName = sanitizedCity.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
        const brandName = BRAND_MAPPING[sanitizedBrand.toLowerCase()] || sanitizedBrand.charAt(0).toUpperCase() + sanitizedBrand.slice(1);
        fallbackGeneratedName = `${cityName} ${brandName}`;
      } else {
        const primaryToken = sanitizedTokens.find(t => {
          const lowerT = t.toLowerCase();
          if (KNOWN_LAST_NAMES instanceof Set) {
            return KNOWN_LAST_NAMES.has(lowerT) || KNOWN_PROPER_NOUNS.has(lowerT);
          } else if (Array.isArray(KNOWN_LAST_NAMES)) {
            return KNOWN_LAST_NAMES.includes(lowerT) || KNOWN_PROPER_NOUNS.includes(lowerT);
          }
          return false;
        }) || sanitizedTokens[0];
        fallbackGeneratedName = primaryToken ?
          (sanitizedBrand ?
            `${primaryToken.charAt(0).toUpperCase() + primaryToken.slice(1)} ${BRAND_MAPPING[sanitizedBrand.toLowerCase()] || sanitizedBrand.charAt(0).toUpperCase() + sanitizedBrand.slice(1)}` :
            `${primaryToken.charAt(0).toUpperCase() + primaryToken.slice(1)} Auto`) : "";
      }
      return res.status(200).json({
        name: fallbackGeneratedName,
        confidence: fallbackGeneratedName ? 70 : 0,
        brand: sanitizedBrand,
        flags: ["OpenAIError", "FallbackGenerated", sanitizedBrand ? "BrandMatch" : "AutoMatch", "ReviewNeeded"],
        error: openAiError.message
      });
    }

    // Handle OpenAI errors
    if (openAiResponse.error) {
      logger.error("OpenAI call failed", {
        rowNum,
        domain: sanitizedDomain,
        error: openAiResponse.error,
        batchId
      });
      let fallbackGeneratedName = "";
      if (sanitizedBrand && sanitizedCity && sanitizedTokens.includes(sanitizedCity)) {
        const cityName = sanitizedCity.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
        const brandName = BRAND_MAPPING[sanitizedBrand.toLowerCase()] || sanitizedBrand.charAt(0).toUpperCase() + sanitizedBrand.slice(1);
        fallbackGeneratedName = `${cityName} ${brandName}`;
      } else {
        const primaryToken = sanitizedTokens.find(t => {
          const lowerT = t.toLowerCase();
          if (KNOWN_LAST_NAMES instanceof Set) {
            return KNOWN_LAST_NAMES.has(lowerT) || KNOWN_PROPER_NOUNS.has(lowerT);
          } else if (Array.isArray(KNOWN_LAST_NAMES)) {
            return KNOWN_LAST_NAMES.includes(lowerT) || KNOWN_PROPER_NOUNS.includes(lowerT);
          }
          return false;
        }) || sanitizedTokens[0];
        fallbackGeneratedName = primaryToken ?
          (sanitizedBrand ?
            `${primaryToken.charAt(0).toUpperCase() + primaryToken.slice(1)} ${BRAND_MAPPING[sanitizedBrand.toLowerCase()] || sanitizedBrand.charAt(0).toUpperCase() + sanitizedBrand.slice(1)}` :
            `${primaryToken.charAt(0).toUpperCase() + primaryToken.slice(1)} Auto`) : "";
      }
      return res.status(200).json({
        name: fallbackGeneratedName,
        confidence: fallbackGeneratedName ? 70 : 0,
        brand: sanitizedBrand,
        flags: ["OpenAIError", "FallbackGenerated", sanitizedBrand ? "BrandMatch" : "AutoMatch", "ReviewNeeded"],
        error: openAiResponse.error
      });
    }

    let result;
    try {
      const trimmedOutput = openAiResponse.output.trim();
      if (!trimmedOutput.startsWith("{") || !trimmedOutput.endsWith("}")) {
        logger.error("OpenAI response is not JSON-like", {
          rowNum,
          domain: sanitizedDomain,
          response: trimmedOutput,
          batchId
        });
        let fallbackGeneratedName = "";
        if (sanitizedBrand && sanitizedCity && sanitizedTokens.includes(sanitizedCity)) {
          const cityName = sanitizedCity.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
          const brandName = BRAND_MAPPING[sanitizedBrand.toLowerCase()] || sanitizedBrand.charAt(0).toUpperCase() + sanitizedBrand.slice(1);
          fallbackGeneratedName = `${cityName} ${brandName}`;
        } else {
          const primaryToken = sanitizedTokens.find(t => {
            const lowerT = t.toLowerCase();
            if (KNOWN_LAST_NAMES instanceof Set) {
              return KNOWN_LAST_NAMES.has(lowerT) || KNOWN_PROPER_NOUNS.has(lowerT);
            } else if (Array.isArray(KNOWN_LAST_NAMES)) {
              return KNOWN_LAST_NAMES.includes(lowerT) || KNOWN_PROPER_NOUNS.includes(lowerT);
            }
            return false;
          }) || sanitizedTokens[0];
          fallbackGeneratedName = primaryToken ?
            (sanitizedBrand ?
              `${primaryToken.charAt(0).toUpperCase() + primaryToken.slice(1)} ${BRAND_MAPPING[sanitizedBrand.toLowerCase()] || sanitizedBrand.charAt(0).toUpperCase() + sanitizedBrand.slice(1)}` :
              `${primaryToken.charAt(0).toUpperCase() + primaryToken.slice(1)} Auto`) : "";
        }
        return res.status(200).json({
          name: fallbackGeneratedName,
          confidence: fallbackGeneratedName ? 70 : 0,
          brand: sanitizedBrand,
          flags: ["InvalidOpenAIResponse", "FallbackGenerated", sanitizedBrand ? "BrandMatch" : "AutoMatch", "ReviewNeeded"],
          error: "OpenAI response is not valid JSON"
        });
      }
      result = JSON.parse(trimmedOutput);
    } catch (parseErr) {
      logger.error("Failed to parse OpenAI JSON response", {
        rowNum,
        domain: sanitizedDomain,
        error: parseErr.message,
        response: openAiResponse.output,
        batchId
      });
      let fallbackGeneratedName = "";
      if (sanitizedBrand && sanitizedCity && sanitizedTokens.includes(sanitizedCity)) {
        const cityName = sanitizedCity.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
        const brandName = BRAND_MAPPING[sanitizedBrand.toLowerCase()] || sanitizedBrand.charAt(0).toUpperCase() + sanitizedBrand.slice(1);
        fallbackGeneratedName = `${cityName} ${brandName}`;
      } else {
        const primaryToken = sanitizedTokens.find(t => {
          const lowerT = t.toLowerCase();
          if (KNOWN_LAST_NAMES instanceof Set) {
            return KNOWN_LAST_NAMES.has(lowerT) || KNOWN_PROPER_NOUNS.has(lowerT);
          } else if (Array.isArray(KNOWN_LAST_NAMES)) {
            return KNOWN_LAST_NAMES.includes(lowerT) || KNOWN_PROPER_NOUNS.includes(lowerT);
          }
          return false;
        }) || sanitizedTokens[0];
        fallbackGeneratedName = primaryToken ?
          (sanitizedBrand ?
            `${primaryToken.charAt(0).toUpperCase() + primaryToken.slice(1)} ${BRAND_MAPPING[sanitizedBrand.toLowerCase()] || sanitizedBrand.charAt(0).toUpperCase() + sanitizedBrand.slice(1)}` :
            `${primaryToken.charAt(0).toUpperCase() + primaryToken.slice(1)} Auto`) : "";
      }
      return res.status(200).json({
        name: fallbackGeneratedName,
        confidence: fallbackGeneratedName ? 70 : 0,
        brand: sanitizedBrand,
        flags: ["InvalidOpenAIResponse", "FallbackGenerated", sanitizedBrand ? "BrandMatch" : "AutoMatch", "ReviewNeeded"],
        error: "Failed to parse OpenAI JSON response"
      });
    }

    // Validate response structure and handle empty names
    if (
      !result ||
      typeof result.generated_name !== "string" ||
      result.generated_name.trim() === "" ||
      typeof result.generated_confidence !== "number" ||
      result.generated_confidence < 0 || result.generated_confidence > 100 ||
      typeof result.fallback_confidence !== "number" ||
      result.fallback_confidence < 0 || result.fallback_confidence > 100 ||
      typeof result.generated_reasoning !== "string" ||
      result.generated_reasoning.trim() === "" ||
      typeof result.fallback_reasoning !== "string" ||
      result.fallback_reasoning.trim() === "" ||
      !Array.isArray(result.flags) ||
      result.flags.some(f => typeof f !== "string")
    ) {
      logger.warn("Invalid OpenAI response format", {
        rowNum,
        domain: sanitizedDomain,
        response: result,
        batchId
      });
      let fallbackGeneratedName = "";
      if (sanitizedBrand && sanitizedCity && sanitizedTokens.includes(sanitizedCity)) {
        const cityName = sanitizedCity.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
        const brandName = BRAND_MAPPING[sanitizedBrand.toLowerCase()] || sanitizedBrand.charAt(0).toUpperCase() + sanitizedBrand.slice(1);
        fallbackGeneratedName = `${cityName} ${brandName}`;
      } else {
        const primaryToken = sanitizedTokens.find(t => {
          const lowerT = t.toLowerCase();
          if (KNOWN_LAST_NAMES instanceof Set) {
            return KNOWN_LAST_NAMES.has(lowerT) || KNOWN_PROPER_NOUNS.has(lowerT);
          } else if (Array.isArray(KNOWN_LAST_NAMES)) {
            return KNOWN_LAST_NAMES.includes(lowerT) || KNOWN_PROPER_NOUNS.includes(lowerT);
          }
          return false;
        }) || sanitizedTokens[0];
        fallbackGeneratedName = primaryToken ?
          (sanitizedBrand ?
            `${primaryToken.charAt(0).toUpperCase() + primaryToken.slice(1)} ${BRAND_MAPPING[sanitizedBrand.toLowerCase()] || sanitizedBrand.charAt(0).toUpperCase() + sanitizedBrand.slice(1)}` :
            `${primaryToken.charAt(0).toUpperCase() + primaryToken.slice(1)} Auto`) : "";
      }
      return res.status(200).json({
        name: fallbackGeneratedName,
        confidence: fallbackGeneratedName ? 70 : 0,
        brand: sanitizedBrand,
        flags: ["InvalidOpenAIResponse", "FallbackGenerated", sanitizedBrand ? "BrandMatch" : "AutoMatch", "ReviewNeeded"],
        error: "OpenAI response missing required fields, empty, or invalid"
      });
    }

    // Handle empty or zero-confidence names
    if (!result.generated_name.trim() || result.generated_confidence === 0) {
      let fallbackGeneratedName = "";
      if (sanitizedBrand && sanitizedCity && sanitizedTokens.includes(sanitizedCity)) {
        const cityName = sanitizedCity.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
        const brandName = BRAND_MAPPING[sanitizedBrand.toLowerCase()] || sanitizedBrand.charAt(0).toUpperCase() + sanitizedBrand.slice(1);
        fallbackGeneratedName = `${cityName} ${brandName}`;
      } else {
        const primaryToken = sanitizedTokens.find(t => {
          const lowerT = t.toLowerCase();
          if (KNOWN_LAST_NAMES instanceof Set) {
            return KNOWN_LAST_NAMES.has(lowerT) || KNOWN_PROPER_NOUNS.has(lowerT);
          } else if (Array.isArray(KNOWN_LAST_NAMES)) {
            return KNOWN_LAST_NAMES.includes(lowerT) || KNOWN_PROPER_NOUNS.includes(lowerT);
          }
          return false;
        }) || sanitizedTokens[0];
        fallbackGeneratedName = primaryToken ?
          (sanitizedBrand ?
            `${primaryToken.charAt(0).toUpperCase() + primaryToken.slice(1)} ${BRAND_MAPPING[sanitizedBrand.toLowerCase()] || sanitizedBrand.charAt(0).toUpperCase() + sanitizedBrand.slice(1)}` :
            `${primaryToken.charAt(0).toUpperCase() + primaryToken.slice(1)} Auto`) : "";
      }
      result = {
        generated_name: fallbackGeneratedName,
        generated_confidence: fallbackGeneratedName ? 70 : 0,
        generated_reasoning: `Generated fallback name using city '${sanitizedCity}' and brand '${sanitizedBrand}'`,
        fallback_confidence: result.fallback_confidence,
        fallback_reasoning: result.fallback_reasoning,
        flags: ["FallbackGenerated", sanitizedBrand ? "BrandMatch" : "AutoMatch"]
      };
      logger.info("Generated fallback name for invalid OpenAI response", {
        rowNum,
        domain: sanitizedDomain,
        generated_name: fallbackGeneratedName,
        batchId
      });
    }

    // Updated name validation
    const nameTokens = result.generated_name.split(/\s+/).filter(t => t.length > 0);
    const domainTokens = sanitizedDomain.replace(/\..*$/, "").split(/[-_.]/);
    const isValidName = NAME_REGEX.test(result.generated_name) &&
      (nameTokens.length > 1 ||
        OVERRIDES[sanitizedDomain] ||
        KNOWN_PROPER_NOUNS.has(result.generated_name.toLowerCase()) ||
        KNOWN_LAST_NAMES.has(result.generated_name.toLowerCase())) &&
      nameTokens.some(t =>
        CAR_BRANDS.has(t.toLowerCase()) ||
        KNOWN_PROPER_NOUNS.has(t.toLowerCase()) ||
        KNOWN_CITIES.has(t.toLowerCase()) ||
        domainTokens.includes(t.toLowerCase())
      );

    if (!isValidName) {
      logger.warn("Invalid or generic generated name", {
        rowNum,
        domain: sanitizedDomain,
        generated_name: result.generated_name,
        batchId
      });
      let fallbackGeneratedName = "";
      if (sanitizedBrand && sanitizedCity && sanitizedTokens.includes(sanitizedCity)) {
        const cityName = sanitizedCity.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
        const brandName = BRAND_MAPPING[sanitizedBrand.toLowerCase()] || sanitizedBrand.charAt(0).toUpperCase() + sanitizedBrand.slice(1);
        fallbackGeneratedName = `${cityName} ${brandName}`;
      } else {
        const primaryToken = sanitizedTokens.find(t =>
          KNOWN_PROPER_NOUNS.has(t.toLowerCase()) || KNOWN_LAST_NAMES.has(t.toLowerCase())) ||
          domainTokens[0];
        fallbackGeneratedName = primaryToken ?
          `${primaryToken.charAt(0).toUpperCase() + primaryToken.slice(1)} ${sanitizedBrand || "Auto"}` : "";
      }
      result = {
        generated_name: fallbackGeneratedName,
        generated_confidence: fallbackGeneratedName ? 70 : 0,
        generated_reasoning: `Generated fallback name due to invalid or generic name: city '${sanitizedCity}', brand '${sanitizedBrand}'`,
        fallback_confidence: result.fallback_confidence,
        fallback_reasoning: result.fallback_reasoning,
        flags: ["InvalidName", "FallbackGenerated", sanitizedBrand ? "BrandMatch" : "AutoMatch", "ReviewNeeded"]
      };
    }

    // Log OpenAI reasoning for debugging
    logger.info("OpenAI response details", {
      rowNum,
      domain: sanitizedDomain,
      generated_name: result.generated_name,
      generated_confidence: result.generated_confidence,
      generated_reasoning: result.generated_reasoning,
      batchId
    });

    // Updated name selection
    const confidenceThreshold = 0;
    const fallbackGeneratedName = sanitizedTokens.find(t => KNOWN_PROPER_NOUNS.has(t.toLowerCase())) || domainTokens[0] || "";
    const dynamicFallbackName = sanitizedFallbackName ||
      (fallbackGeneratedName ?
        `${fallbackGeneratedName.charAt(0).toUpperCase() + fallbackGeneratedName.slice(1)} ${sanitizedBrand || "Auto"}` : "");
    const selectedName = result.generated_confidence >= result.fallback_confidence + confidenceThreshold &&
      NAME_REGEX.test(result.generated_name) &&
      (result.generated_name.split(/\s+/).some(t => CAR_BRANDS.has(t.toLowerCase()) || KNOWN_PROPER_NOUNS.has(t.toLowerCase())) || OVERRIDES[sanitizedDomain])
      ? result.generated_name
      : dynamicFallbackName;
    const selectedConfidence = result.generated_confidence >= result.fallback_confidence + confidenceThreshold ?
      result.generated_confidence :
      (dynamicFallbackName ? 70 : 0);
    const selectedFlags = [
      result.generated_confidence >= result.fallback_confidence + confidenceThreshold ? "OpenAIMatch" : "FallbackMatch",
      selectedName.split(/\s+/).length > 1 ? "MultiToken" : "SingleToken",
      ...(result.flags || [])
    ];

    // Cache high-confidence results
    if (selectedConfidence >= 75 && isValidName) {
      try {
        await kv.set(cacheKey, {
          name: selectedName,
          confidence: selectedConfidence,
          brand: sanitizedBrand,
          flags: selectedFlags
        }, { ex: 7 * 24 * 60 * 60 });
        logger.info("Cached result", { rowNum, domain: sanitizedDomain, cacheKey, batchId });
      } catch (kvError) {
        logger.warn(`Failed to cache: ${kvError.message}`, { rowNum, domain: sanitizedDomain, batchId });
      }
    }

    logger.info("Enrichment successful", {
      rowNum,
      domain: sanitizedDomain,
      city: sanitizedCity,
      brand: sanitizedBrand,
      generated_name: result.generated_name,
      generated_confidence: result.generated_confidence,
      fallback_name: sanitizedFallbackName,
      fallback_confidence: result.fallback_confidence,
      selected_name: selectedName,
      selected_confidence: selectedConfidence,
      flags: selectedFlags,
      batchId
    });

    return res.status(200).json({
      name: selectedName,
      confidence: selectedConfidence,
      brand: sanitizedBrand,
      flags: selectedFlags
    });
  } catch (error) {
    logger.error("Enrichment failed", {
      rowNum,
      domain: sanitizedDomain,
      city: sanitizedCity,
      brand: sanitizedBrand,
      error: error.message,
      batchId
    });
    let fallbackGeneratedName = "";
    if (sanitizedBrand && sanitizedCity && sanitizedTokens.includes(sanitizedCity)) {
      const cityName = sanitizedCity.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
      const brandName = BRAND_MAPPING[sanitizedBrand.toLowerCase()] || sanitizedBrand.charAt(0).toUpperCase() + sanitizedBrand.slice(1);
      fallbackGeneratedName = `${cityName} ${brandName}`;
    } else {
      const primaryToken = sanitizedTokens.find(t => {
        const lowerT = t.toLowerCase();
        if (KNOWN_LAST_NAMES instanceof Set) {
          return KNOWN_LAST_NAMES.has(lowerT) || KNOWN_PROPER_NOUNS.has(lowerT);
        } else if (Array.isArray(KNOWN_LAST_NAMES)) {
          return KNOWN_LAST_NAMES.includes(lowerT) || KNOWN_PROPER_NOUNS.includes(lowerT);
        }
        return false;
      }) || sanitizedTokens[0];
      fallbackGeneratedName = primaryToken ?
        (sanitizedBrand ?
          `${primaryToken.charAt(0).toUpperCase() + primaryToken.slice(1)} ${BRAND_MAPPING[sanitizedBrand.toLowerCase()] || sanitizedBrand.charAt(0).toUpperCase() + sanitizedBrand.slice(1)}` :
          `${primaryToken.charAt(0).toUpperCase() + primaryToken.slice(1)} Auto`) : "";
    }
    return res.status(200).json({
      name: fallbackGeneratedName,
      confidence: fallbackGeneratedName ? 70 : 0,
      brand: sanitizedBrand,
      flags: ["EnrichmentError", "FallbackGenerated", sanitizedBrand ? "BrandMatch" : "AutoMatch", "ReviewNeeded"],
      error: error.message
    });
  }
}
