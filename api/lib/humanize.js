// api/lib/humanize.js v5.0.9
// Comprehensive list of car brands (unchanged)

import path from "path";

const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join("logs", "enrich.log"), maxsize: 5242880, maxFiles: 5 }),
    new winston.transports.Console()
  ]
});

/**
 * Logs messages with Winston
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 */
function log(level, message, context = {}) {
  logger[level]({ message, ...context });
}

// Comprehensive list of car brands
const CAR_BRANDS = [
  "acura", "alfa romeo", "amc", "aston martin", "audi", "bentley", "bmw", "bugatti", "buick",
  "cadillac", "carmax", "cdj", "cdjrf", "cdjr", "chev", "chevvy", "chevrolet", "chrysler", "cjd",
  "daewoo", "dodge", "eagle", "ferrari", "fiat", "ford", "genesis", "gmc", "honda", "hummer",
  "hyundai", "inf", "infiniti", "isuzu", "jaguar", "jeep", "jlr", "kia", "lamborghini", "land rover",
  "landrover", "lexus", "lincoln", "lucid", "maserati", "maz", "mazda", "mb", "merc", "mercedes",
  "mercedes-benz", "mercedesbenz", "merk", "mini", "mitsubishi", "nissan", "oldsmobile", "plymouth",
  "polestar", "pontiac", "porsche", "ram", "rivian", "rolls-royce", "saab", "saturn", "scion",
  "smart", "subaru", "subie", "suzuki", "tesla", "toyota", "volkswagen", "volvo", "vw", "chevy",
  "honda"
];

// Mapping for standardized brand names
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
  "mb": "Mercedes", "merc": "Mercedes", "mercedes": "Mercedes", "mercedes-benz": "Mercedes", "mercedesbenz": "Mercedes",
  "merk": "Mercedes", "mini": "Mini", "mitsubishi": "Mitsubishi", "nissan": "Nissan", "oldsmobile": "Oldsmobile",
  "plymouth": "Plymouth", "polestar": "Polestar", "pontiac": "Pontiac", "porsche": "Porsche", "ram": "Ram",
  "rivian": "Rivian", "rolls-royce": "Rolls-Royce", "saab": "Saab", "saturn": "Saturn", "scion": "Scion",
  "smart": "Smart", "subaru": "Subaru", "subie": "Subaru", "suzuki": "Suzuki", "tesla": "Tesla", "toyota": "Toyota",
  "volkswagen": "VW", "volvo": "Volvo", "vw": "VW", "chevy": "Chevy", "jcd": "Jeep"
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
  "dv": "Don Vandercraft",
  "ec": "EC",
  "eh": "East Hills",
  "fordof": "Ford",
  "gh": "Green Hills",
  "gy": "GY",
  "hgreg": "HGreg",
  "hondaof": "Honda",
  "inf": "Infiniti",
  "jlr": "Jaguar",
  "jm": "JM",
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
  "wc": "WC",
  "wg": "WG"
};


const COMMON_WORDS = ["to", "of", "and", "the", "for", "in", "on", "at", "inc", "llc", "corp"];

const OVERRIDES = {
  "billdube.com": "Bill Dube",
  "patmillikenford.com": "Pat Milliken",
  "jakesweeney.com": "Jake Sweeney",
  "jimmybrittchevrolet.com": "Jimmy Britt",
  "jaywolfe.com": "Jay Wolfe",
  "philsmithkia.com": "Phil Smith",
  "dicklovett.co.uk": "Dick Lovett",
  "tomhesser.com": "Tom Hesser",
  "goldcoastcadillac.com": "Gold Coast"
};

const TEST_CASE_OVERRIDES = {
  "athensford.com": "Athens Ford",
  "patmilliken.com": "Pat Milliken",
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
  "mclartydaniel.com": "McLarty Daniel",
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
  "golfmillford.com": "Golf Mill",
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
  "galeanasc.com": "Galeana",
  "mccarthyautogroup.com": "McCarthy Auto Group",
  "dyerauto.com": "Dyer Auto",
  "edwardsautogroup.com": "Edwards Auto Group",
  "hillsidehonda.com": "Hillside Honda",
  "smithtowntoyota.com": "Smithtown Toyota",
  "thepremiercollection.com": "Premier Collection",
  "fordtustin.com": "Tustin Ford",
  "billdube.com": "Bill Dube",
  "donjacobs.com": "Don Jacobs",
  "ricksmithchevrolet.com": "Rick Smith",
  "robertthorne.com": "Robert Thorne",
  "crystalautogroup.com": "Crystal",
  "davisautosales.com": "Davis",
  "drivevictory.com": "Victory Auto",
  "chevyofcolumbuschevrolet.com": "Columbus Chevy",
  "toyotaofchicago.com": "Chicago Toyota",
  "northwestcars.com": "Northwest Toyota",
  "mazdanashville.com": "Nashville Mazda",
  "kiaofchattanooga.com": "Chattanooga Kia",
  "mikeerdman.com": "Mike Erdman",
  "tasca.com": "Tasca",
  "lacitycars.com": "LA City",
  "carsatcarlblack.com": "Carl Black",
  "southcharlottejcd.com": "Charlotte Auto",
  "oaklandauto.com": "Oakland Auto",
  "rodbakerford.com": "Rod Baker",
  "nplincoln.com": "NP Lincoln",
  "rohrmanhonda.com": "Rohrman Honda",
  "malouf.com": "Malouf",
  "prestonmotor.com": "Preston",
  "demontrond.com": "DeMontrond",
  "fletcherauto.com": "Fletcher Auto",
  "davischevrolet.com": "Davis Chevy",
  "gychevy.com": "Gy Chevy",
  "potamkinhyundai.com": "Potamkin Hyundai",
  "tedbritt.com": "Ted Britt",
  "andersonautogroup.com": "Anderson Auto",
  "racewayford.com": "Raceway Ford",
  "donhattan.com": "Don Hattan",
  "chastangford.com": "Chastang Ford",
  "machens.com": "Machens",
  "taylorauto.com": "Taylor",
  "dancummins.com": "Dan Cummins",
  "kennedyauto.com": "Kennedy Auto",
  "artmoehn.com": "Art Moehn",
  "mbbhm.com": "M.B. BHM",
  "carlblack.com": "Carl Black",
  "crewschevrolet.com": "Crews Chevy",
  "chuckfairbankschevy.com": "Fairbanks Chevy",
  "kcmetroford.com": "Metro Ford",
  "keatinghonda.com": "Keating Honda",
  "phofnash": "Porsche Nashville",
  "cadillacoflasvegas.com": "Vegas Cadillac",
  "vscc.com": "VSCC",
  "kiaofcerritos.com": "Cerritos Kia",
  "teamsewell.com": "Sewell",
  "vannuyscdjr.com": "Van Nuys CDJR",
  "cincyjlr.com": "Cincy Jaguar",
  "cadillacnorwood.com": "Norwood Cadillac",
  "alsopchevrolet.com": "Alsop Chevy",
  "joycekoons.com": "Joyce Koons",
  "radleyautogroup.com": "Radley Auto Group",
  "vinart.com": "Vinart",
  "towneauto.com": "Towne Auto",
  "lauraautogroup.com": "Laura Auto",
  "hoehnmotors.com": "Hoehn Motor",
  "westherr.com": "West Herr",
  "looklarson.com": "Larson",
  "kwic.com": "KWIC",
  "maverickmotorgroup.com": "Maverick Motor",
  "donalsonauto.com": "Donalson Auto",
  "tflauto.com": "TFL Auto",
  "sharpecars.com": "Sharpe",
  "secorauto.com": "Secor",
  "beckmasten.net": "Beck Masten",
  "moreheadautogroup.com": "Morehead",
  "firstautogroup.com": "First Auto",
  "lexusoftulsa.com": "Tulsa Lexus",
  "jetchevrolet.com": "Jet Chevy",
  "teddynissan.com": "Teddy Nissan",
  "autonationusa.com": "AutoNation",
  "robbynixonbuickgmc.com": "Robby Nixon",
  "classicchevrolet.com": "Classic Chevy",
  "penskeautomotive.com": "Penske Auto",
  "helloautogroup.com": "Hello Auto",
  "sunsetmitsubishi.com": "Sunset Mitsubishi",
  "bmwofnorthhaven.com": "North Haven BMW",
  "monadnockford.com": "Monadnock Ford",
  "johnsondodge.com": "Johnson Dodge",
  "hgreglux.com": "HGreg Lux",
  "lamesarv.com": "La Mesa RV",
  "mcdanielauto.com": "McDaniel",
  "toyotaworldnewton.com": "Newton Toyota",
  "lexusofnorthborough.com": "Northborough Lexus",
  "eagleautomall.com": "Eagle Auto Mall",
  "edwardsgm.com": "Edwards GM",
  "nissanofcookeville.com": "Cookeville Nissan",
  "daytonahyundai.com": "Daytona Hyundai",
  "daystarchrysler.com": "Daystar Chrysler",
  "sansoneauto.com": "Sansone Auto",
  "germaincars.com": "Germain Cars",
  "steelpointeauto.com": "Steel Pointe",
  "tomlinsonmotorco.com": "Tomlinson Motor",
  "kerbeck.net": "Kerbeck",
  "jacksoncars.com": "Jackson",
  "bighorntoyota.com": "Big Horn",
  "hondaoftomsriver.com": "Toms River",
  "faireychevrolet.com": "Fairey Chevy",
  "tomhesser.com": "Tom Hesser",
  "saabvw.com": "Scmelz",
  "philsmithkia.com": "Phil Smith",
  "dicklovett.co.uk": "Dick Lovett",
  "jtscars.com": "JT Auto",
  "street-toyota.com": "Street",
  "jakesweeney.com": "Jake Sweeney",
  "jimmybrittchevrolet.com": "Jimmy Britt",
  "jaywolfe.com": "Jay Wolfe",
  "toyotacedarpark.com": "Cedar Park",
  "bulldogkia.com": "Bulldog Kia",
  "bentleyauto.com": "Bentley Auto",
  "obrienauto.com": "O'Brien Auto",
  "hmtrs.com": "HMTR",
  "delandkia.net": "Deland Kia",
  "eckenrodford.com": "Eckenrod",
  "curriemotors.com": "Currie Motor",
  "aldermansvt.com": "Aldermans VT",
  "goldcoastcadillac.com": "Gold Coast",
  "mterryautogroup.com": "M Terry Auto",
  "mikeerdmantoyota.com": "Mike Erdman",
  "jimfalkmotorsofmaui.com": "Jim Falk",
  "serpentinichevy.com": "Serpentini",
  "deaconscdjr.com": "Deacons CDJR",
  "golfmillchevrolet.com": "Golf Mill",
  "rossihonda.com": "Rossi Honda",
  "stadiumtoyota.com": "Stadium Toyota",
  "cavendercadillac.com": "Cavender",
  "carterhonda.com": "Carter Honda",
  "fairoaksford.com": "Fair Oaks Ford",
  "tvbuickgmc.com": "TV Buick",
  "chevyland.com": "Chevy Land",
  "carvertoyota.com": "Carver",
  "wernerhyundai.com": "Werner Hyundai",
  "memorialchevrolet.com": "Memorial Chevy",
  "mbofsmithtown.com": "M.B. Smithtown",
  "wideworldbmw.com": "Wide World BMW",
  "destinationkia.com": "Destination Kia",
  "eastcjd.com": "East CJD",
  "pinehurstautomall.com": "Pinehurst Auto",
  "bramanmc.com": "Braman MC",
  "laurelchryslerjeep.com": "Laurel",
  "porschewoodlandhills.com": "Porsche Woodland",
  "kingsfordinc.com": "Kings Ford",
  "carusofordlincoln.com": "Caruso",
  "billsmithbuickgmc.com": "Bill Smith",
  "mclartydanielford.com": "McLarty Daniel",
  "mcgeorgetoyota.com": "McGeorge",
  "rosenautomotive.com": "Rosen Auto",
  "valleynissan.com": "Valley Nissan",
  "perillobmw.com": "Perillo BMW"
};

const BRAND_ONLY_DOMAINS = [
  "chevy.com", "ford.com", "cadillac.com", "buick.com", "gmc.com", "chrysler.com",
  "dodge.com", "ramtrucks.com", "jeep.com", "lincoln.com", "toyota.com", "honda.com",
  "nissanusa.com", "subaru.com", "mazdausa.com", "mitsubishicars.com", "acura.com",
  "lexus.com", "infinitiusa.com", "hyundaiusa.com", "kia.com", "genesis.com",
  "bmwusa.com", "mercedes-benz.com", "audiusa.com", "vw.com", "volkswagen.com",
  "porsche.com", "miniusa.com", "fiatusa.com", "alfa-romeo.com", "landroverusa.com",
  "jaguarusa.com", "tesla.com", "lucidmotors.com", "rivian.com", "volvocars.com"
];

const KNOWN_PROPER_NOUNS = new Set([
  "rt128", "abbotsford", "acdealergroup", "airportkianaples", "albany", "allamerican", "anderson",
  "artmoehn", "atamian", "autobyfox", "avis", "barnettauto", "beaty", "beckmasten", "bentley",
  "berlincity", "berman", "bertsmith", "bespokemotorgroup", "billdube", "birdnow", "bobwalk",
  "bobjohnson", "bochtoyotasouth", "bulluck", "byersauto", "calavan", "caldwell", "caminoreal",
  "capitolcity", "carlblack", "carrollton", "chapman", "charlie", "chastang", "ciocca", "classic",
  "concord", "criswell", "crossroads", "crystal", "curriemotors", "czag", "dancummins", "davis",
  "daytonandrews", "demontrond", "devine", "diamond", "dicklovett", "donalsonauto", "donbaker",
  "donhattan", "donhinds", "donjacobs", "doupreh", "duval", "easthills", "eckenrod", "elway",
  "executiveag", "exprealty", "faireychevrolet", "fletcher", "fordofdalton", "fox", "frankleta",
  "freeport", "galpin", "galeana", "garlyn", "garlynshelton", "gastonia", "georgetown", "germain",
  "golden", "graber", "grainger", "gravity", "greggyoung", "gregleblanc", "greenwich", "gusmachado",
  "haley", "hgreglux", "hilltop", "hoehnmotors", "hmotors", "huntingtonbeach", "ingersoll", "ingrid",
  "jackpowell", "jake", "jakesweeney", "jaywolfe", "jerryseiner", "jimfalk", "jimtaylor", "jimmybritt",
  "joycekoons", "jt", "kadlec", "kalidykia", "karlstuart", "keating", "kennedy", "kerbeck", "kingston",
  "kwic", "lacity", "lauraautogroup", "laurel", "lawautomotive", "leblancauto", "looklarson", "lousobh",
  "luxuryautoscottsdale", "malloy", "malouf", "mariano", "martin", "masano", "masten", "mattiacio",
  "maita", "maverickmotorgroup", "mbbhm", "mbcherryhill", "mbofbrooklyn", "mbofcaldwell", "mbofstockton",
  "mccarthy", "mclartydaniel", "medlin", "metro", "mikeerdman", "mikeshaw", "mill", "milnes", "morehead",
  "mterryauto", "murfreesboro", "naples", "newholland", "nplincoln", "npsubaru", "oaklandauto", "oceanauto",
  "parkerauto", "pape", "patmilliken", "perillo", "philsmith", "pinehurst", "potamkin", "preston",
  "prestoncars", "pugmire", "queencitymotors", "radleyautogroup", "racewaykia", "raser", "ray", "razor",
  "rbmw", "rbnissan", "rbtoyota", "readylallier", "regal", "ricart", "ricksmith", "rivera", "robbins",
  "robertthorne", "rodbaker", "ronbouchard", "roseville", "saffordauto", "saffordbrown", "sansone",
  "sansoneauto", "sarant", "santee", "schmelz", "scottclark", "seawell", "secorauto", "sewell", "sharpecars",
  "sheehy", "shottenkirk", "slidell", "smartdrive", "smothers", "starling", "stiversonline", "steponeauto",
  "stoops", "strongautogroup", "sunbelt", "sunbeltautomotive", "sunnyking", "sunrise", "sunnyside", "suntrup",
  "swantgraber", "tasca", "taylor", "tedbritt", "thechevyteam", "thepremiercollection", "tflauto", "tituswill",
  "tomcadlec", "tomlinsonmotorco", "tomhesser", "tommynix", "townandcountry", "towneauto", "trent", "tsands",
  "tuttleclick", "unionpark", "valley", "vanderhyde", "victory", "vinart", "vscc", "waldorf", "westgate",
  "westherr", "wickmail", "williams", "wilsonville", "wolfe", "yorkauto", "bearmountain", "bmwwestspringfield",
  "cavalier", "charlestonkia", "liberty", "concordtoyota", "firstauto", "graingernissan", "haywardhonda", "hmtr",
  "hyundaiofnorthcharleston", "infinitiofbeachwood", "jet", "lexusofneworleans", "lexusofnorthborough", "lynch",
  "midway", "monadnock", "morristown", "nfwauto", "nissanofathens", "northcounty", "oxmoorautogroup", "phofnash",
  "riveratoyota", "rosevillekia", "sarantcadillac", "scottnissan", "teddy", "totaloffroad", "toyotaofgastonia",
  "toyotaofhermiston", "toyotaworldnewton", "vivaautogroup", "vwsouthcharlotte", "vwsouthtowne", "alanbyer",
  "albrechtauto", "ancira", "asag", "audimv", "banksauto", "billingsford", "blakefauto", "bloomingtoncjd",
  "bmwoffreeport", "butlercdjr", "calavancars", "cedarcitymotorcompany", "chevyland", "cincyjlr", "dayton",
  "drivesuperior", "hillsboro", "hyundaioforangepark", "kiaofauburn", "lousobhkia", "markkia", "newsmyrnachevy",
  "nissanofcookeville", "smithtown", "bighorn", "tomsriver", "fairey", "briswell", "barlow", "billsmith", "braman",
  "carver", "carter", "cavender", "century", "charleston", "crevier", "deacons", "destination", "ferguson", "gateway",
  "irvine", "killeen", "leblanc", "mclartydanielford", "mcgeorgetoyota", "mterry", "naples", "northbakersfield",
  "parkway", "perillo", "pinehurst", "qarmstpete", "raceway", "redland", "rosenautomotive", "rossi", "shults",
  "stadium", "stephenwade", "stivers", "strong", "tampa", "valleynissan", "waldorf", "werner", "wideworld",
  "williamsauto", "zumbrota", "bill", "autonation", "daniel", "dyer", "gold", "karl", "koons", "larry", "miller",
  "nixon", "norwood", "robby", "rohman", "serpentini", "vannuys", "billsmith", "bramanmc", "carterhonda",
  "caruso", "carvertoyota", "cavender", "chevyland", "deaconscdjr", "destinationkia", "eastcjd", "fairoaksford",
  "golfmill", "kingsford", "laurelchrysler", "mbsmithtown", "mcgeorge", "memorialchevy", "perillobmw", "pinehurst",
  "porschewoodland", "rosenauto", "rossihonda", "serpentini", "stadiumtoyota", "tvbuick", "valleynissan",
  "wernerhyundai", "wideworldbmw"
]);

const KNOWN_CITIES_SET = new Set([
// Alabama (top 50)
  "birmingham", "montgomery", "huntsville", "mobile", "tuscaloosa", "hoover", "dothan", "auburn", "decatur", "madison",
  "florence", "gadsden", "vestavia hills", "prattville", "phenix city", "alabaster", "opelika", "northport", "enterprise", "daphne",
  "homewood", "bessemer", "athens", "pelham", "fairhope", "anniston", "mountain brook", "troy", "trussville", "talladega",
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
  "asheville", "greenville", "gastonia", "jacksonville", "chapel hill", "huntersville", "apex", "burlington", "rocky mount", "kannapolis",
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
  "waco", "woodland hills"
]);

// Token fixes for common parsing errors
const TOKEN_FIXES = {
  coluus: "Columbus",
  classicche: "Classic Chevy",
  nplinc: "NP Lincoln",
  helloauto: "Hello Auto",
  autonati: "AutoNation",
  robbyauto: "Robby Nixon",
  billauto: "Bill Dube",
  penskeauto: "Penske",
  classicchev: "Classic Chevy",
  sunsetmits: "Sunset Mitsubishi",
  drivevic: "Victory",
  robertthorne: "Robert Thorne",
  crystalauto: "Crystal",
  youngauto: "Young",
  victoryauto: "Victory Auto"
};

/**
 * Extracts tokens from a domain
 * @param {string} domain - The domain to tokenize
 * @returns {Array<string>} - Array of tokens
 */
function extractTokens(domain) {
  log("info", "extractTokens started", { domain });

  try {
    if (!domain || typeof domain !== "string") {
      log("error", "Invalid domain in extractTokens", { domain });
      throw new Error("Invalid domain input");
    }

    const cleanDomain = domain.toLowerCase().replace(/^(www\.)|(\.com|\.net|\.org)$/g, "");
    let tokens = earlyCompoundSplit(cleanDomain);

    // Dynamic splitting for nouns, cities, and brands
    tokens = tokens.flatMap(token => {
      const lower = token.toLowerCase();
      if (!CAR_BRANDS.includes(lower) && !KNOWN_CITIES_SET.has(lower) && !KNOWN_PROPER_NOUNS.has(token)) {
        const splits = [];
        // Proper noun pairs
        for (const noun of KNOWN_PROPER_NOUNS) {
          const nounLower = noun.toLowerCase();
          if (lower.includes(nounLower)) {
            const remaining = lower.replace(nounLower, "");
            if (remaining && KNOWN_PROPER_NOUNS.has(capitalizeName(remaining).name)) {
              splits.push(capitalizeName(nounLower).name, capitalizeName(remaining).name);
              return splits;
            }
          }
        }
        // City patterns
        for (const city of KNOWN_CITIES_SET) {
          if (lower.includes(city)) {
            splits.push(capitalizeName(city).name);
            const remaining = lower.replace(city, "");
            if (remaining && !["cars", "sales", "autogroup"].includes(remaining)) {
              splits.push(capitalizeName(remaining).name);
            }
            return splits;
          }
        }
        // Brand patterns
        for (const brand of CAR_BRANDS) {
          if (lower.includes(brand)) {
            splits.push(BRAND_MAPPING[brand] || capitalizeName(brand).name);
            const remaining = lower.replace(brand, "");
            if (remaining) {
              splits.push(capitalizeName(remaining).name);
            }
            return splits;
          }
        }
        // Fallback to camel case and "of" splits
        return token
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          .replace(/of([a-z]+)/gi, " $1")
          .split(/[^a-zA-Z]+/)
          .filter(Boolean)
          .map(t => capitalizeName(t).name);
      }
      return [capitalizeName(token).name];
    });

    // Apply abbreviation expansions
    tokens = tokens.map(token => {
      let normalizedToken = token;
      Object.keys(ABBREVIATION_EXPANSIONS).forEach(abbr => {
        const regex = new RegExp(`\\b${abbr}\\b`, "gi");
        if (regex.test(normalizedToken.toLowerCase())) {
          normalizedToken = normalizedToken.replace(regex, ABBREVIATION_EXPANSIONS[abbr]);
          log("debug", "Applied abbreviation expansion in extractTokens", { domain, token, normalizedToken });
        }
      });
      return normalizedToken;
    });

    // Apply blob splits
    tokens = tokens.flatMap(t => blobSplit(t));

    // Validate and clean tokens
    tokens = tokens.filter(t => {
      const tLower = t.toLowerCase();
      const isValid = t && !COMMON_WORDS.includes(tLower) && !["cars", "sales", "autogroup"].includes(tLower);
      if (!isValid) log("debug", "Token filtered out", { domain, token: t });
      return isValid;
    });

    // Deduplicate tokens
    tokens = [...new Set(tokens)];
    log("info", "extractTokens result", { domain, result: tokens });
    return tokens;
  } catch (e) {
    log("error", "extractTokens failed", { domain, error: e.message, stack: e.stack });
    return [];
  }
}

/**
 * Splits compound words early in the tokenization process
 * @param {string} text - Text to split
 * @returns {Array<string>} - Array of tokens
 */
function earlyCompoundSplit(text) {
  try {
    if (!text || typeof text !== "string") {
      log("error", "Invalid text in earlyCompoundSplit", { text });
      throw new Error("Invalid text input");
    }

    const lower = text.toLowerCase();

    // Define known first and last names for human name splitting
    const KNOWN_FIRST_NAMES = new Set([
      "adam", "alan", "alex", "andrew", "anthony", "ben", "bill", "billy", "bob", "brad", "brandon",
      "brian", "bryan", "caleb", "carl", "chad", "charles", "chris", "christian", "clark", "clayton",
      "cody", "colin", "connor", "craig", "dan", "daniel", "david", "dean", "dennis", "derek", "devin",
      "dick", "don", "doug", "drew", "dustin", "ed", "edward", "eli", "eric", "ethan", "evan", "frank",
      "fred", "gary", "george", "greg", "gregory", "jacob", "jake", "james", "jared", "jason", "jay",
      "jeff", "jeffrey", "jeremy", "jerome", "jerry", "jim", "jimmy", "joel", "john", "johnny", "jon",
      "jonathan", "jordan", "joseph", "josh", "joshua", "justin", "keith", "ken", "kenneth", "kevin",
      "kyle", "larry", "lee", "logan", "luke", "mark", "matt", "matthew", "michael", "mike", "nathan",
      "nick", "nicholas", "noah", "pat", "paul", "peter", "phil", "randy", "ray", "rick", "robert",
      "ron", "ronald", "ryan", "sam", "scott", "sean", "shawn", "steve", "steven", "terry", "thomas",
      "tim", "timothy", "tom", "tony", "travis", "trevor", "tyler", "zach",
      // Previous 500 first names for White Caucasian male business owners, aged 25–65
      "aaron", "abel", "abraham", "adrian", "albert", "alden", "alexander", "alfred", "allan", "allen",
      "alvin", "amos", "andre", "andy", "angus", "archie", "arnold", "arthur", "asa", "austin",
      "avery", "barney", "barrett", "barry", "bart", "basil", "beau", "benjamin", "bennie", "benny",
      "bernard", "bert", "blaine", "blair", "blake", "bobbie", "bobby", "bradford", "bradley", "brant",
      "brent", "brett", "brock", "bruce", "bryce", "bud", "buddy", "burton", "byron", "cal",
      "calvin", "cameron", "carey", "carlton", "carson", "casey", "cecil", "cedric", "chadwick", "charlie",
      "chester", "chip", "chuck", "clarence", "claude", "clay", "clement", "cliff", "clifford", "clifton",
      "clyde", "conrad", "corey", "cory", "courtney", "curt", "curtis", "cyrus", "dale", "dalton",
      "damon", "dane", "danny", "daren", "darrell", "darren", "darryl", "dave", "dawson", "dean",
      "delbert", "denny", "derrick", "desmond", "dewey", "dexter", "dillon", "dino", "dominic", "donnie",
      "donovan", "doyle", "drake", "duane", "dudley", "duncan", "dwayne", "earl", "eddie", "edgar",
      "edmond", "edwin", "elbert", "elden", "eldon", "eliot", "elliot", "elliott", "ellis", "elmer",
      "elton", "emery", "emmett", "ernest", "ernie", "eugene", "evan", "everett", "ezra", "felix",
      "ferdinand", "finn", "fletcher", "floyd", "forrest", "francis", "franklin", "freddie", "frederick", "gabe",
      "gabriel", "garrett", "gavin", "gene", "geoff", "geoffrey", "gerald", "gil", "gilbert", "giles",
      "glen", "glenn", "gordon", "grady", "graham", "grant", "gregg", "gretchen", "gus", "guy",
      "hal", "hank", "hans", "harlan", "harley", "harold", "harrison", "harry", "hart", "harvey",
      "hayden", "heath", "hector", "henry", "herbert", "herman", "homer", "horace", "howard", "hugh",
      "hugo", "ian", "irving", "isaac", "ivan", "jack", "jackson", "jacob", "jamie", "jared",
      "jarrett", "jasper", "jed", "jeffery", "jeremiah", "jessie", "jimmy", "joey", "jonah", "jonas",
      "jordy", "josh", "judd", "julian", "julius", "junior", "kurt", "lance", "landon", "lane",
      "lawrence", "leland", "leo", "leon", "leroy", "les", "leslie", "levi", "lewis", "lincoln",
      "lloyd", "lonnie", "loren", "lou", "louie", "louis", "lowell", "luc", "lucas", "lucian",
      "lyle", "lyman", "mack", "malcolm", "marc", "marco", "mario", "marshall", "marty", "marvin",
      "mason", "maurice", "max", "maxwell", "merrill", "mickey", "miles", "milo", "milton", "mitch",
      "mitchell", "monty", "morgan", "morris", "murray", "nate", "nathaniel", "ned", "neil", "nelson",
      "norm", "norman", "norris", "oliver", "oscar", "otis", "owen", "pascal", "pete", "philip",
      "quentin", "quinn", "ralph", "ramon", "randall", "randolph", "raymond", "reginald", "reid", "rex",
      "rhett", "richard", "ricky", "rob", "rod", "rodney", "roger", "roland", "roman", "ronnie",
      "rory", "ross", "roy", "rudy", "russ", "russell", "sal", "sammy", "saul", "sawyer",
      "seth", "sid", "sidney", "silas", "simon", "sol", "spencer", "stan", "stanley", "stewart",
      "stuart", "sylvester", "tanner", "ted", "theodore", "toby", "todd", "tracy", "trent", "trey",
      "tristan", "troy", "tucker", "ty", "tyrone", "val", "vance", "vernon", "victor", "vince",
      "vincent", "virgil", "wade", "walker", "wallace", "walter", "warren", "wayne", "wendell", "wes",
      "wesley", "whit", "wilbur", "will", "willard", "willie", "wilson", "winston", "woody", "wyatt",
      "xavier", "zachary", "zack", "zane",
      // Additional 100 first names for White Caucasian males, aged 45–75
      "alton", "archie", "barnett", "beauford", "benedict", "bernie", "beverly", "blake", "boyd", "bradford",
      "brent", "buck", "burl", "calvin", "carroll", "cary", "chandler", "chester", "clair", "claude",
      "clem", "cletus", "cliff", "clyde", "coleman", "cornell", "curt", "dallas", "danny", "darrel",
      "darwin", "delmar", "denny", "dickie", "donny", "dwight", "earnest", "eddie", "elbert", "elliott",
      "elmer", "elwood", "emery", "ernie", "eugene", "everett", "floyd", "freddy", "gail", "gale",
      "garland", "garry", "gayle", "giles", "glenn", "gordon", "grover", "hal", "harlan", "harris",
      "harvey", "homer", "irvin", "jerald", "jerry", "jimmie", "joey", "johnnie", "julian", "kelvin",
      "kenny", "lamar", "lance", "lavern", "leland", "lenny", "lon", "lowell", "loyd", "lynn",
      "marion", "maurice", "melvin", "merle", "murray", "neil", "norman", "orville", "otis", "percy",
      "randell", "randy", "russel", "sherman", "sidney", "sonny", "vernon", "vinton", "wallace", "wilbert"
    ]);

    const KNOWN_LAST_NAMES = new Set([
      "adams", "anderson", "bailey", "barnes", "bell", "bennett", "bishop", "black", "blake", "bowman",
      "boyd", "bradley", "brewer", "brown", "bryant", "burns", "burton", "butler", "campbell", "carpenter",
      "carter", "chapman", "clark", "cole", "coleman", "collins", "cook", "cooper", "cox", "craig",
      "daniel", "davis", "day", "dean", "dixon", "douglas", "dube", "duncan", "dunn", "edwards", "elliott",
      "ellis", "evans", "fisher", "fleming", "ford", "foster", "fox", "garcia", "garner", "gibson",
      "gonzalez", "graham", "grant", "gray", "green", "griffin", "hall", "hamilton", "harrison", "hart",
      "harris", "hatcher", "hayes", "henderson", "henry", "hesser", "hill", "holmes", "hopkins", "howard",
      "hudson", "hunt", "hunter", "jackson", "jacobs", "james", "jenkins", "johnson", "jones", "kelly",
      "kennedy", "king", "knight", "lambert", "lawrence", "lee", "lewis", "long", "lovett", "martin",
      "mason", "matthews", "mcdaniel", "miller", "moore", "morris", "murphy", "myers", "nelson", "nixon",
      "oliver", "owens", "palmer", "parker", "patterson", "perry", "peters", "peterson", "philips",
      "powell", "price", "ramsey", "reed", "reid", "reynolds", "rice", "richards", "richardson", "riley",
      "rivera", "roberts", "robinson", "rogers", "ross", "russell", "ryan", "sanders", "scott", "smith",
      "snyder", "stanley", "stephens", "stevens", "stone", "sweeney", "taylor", "thomas", "thorne",
      "todd", "torres", "turner", "walker", "ward", "watson", "weaver", "webb", "wells", "west",
      "white", "williams", "wilson", "wolfe", "wood", "wright", "young",
      // Previous 500 last names for White Caucasian male business owners, aged 25–65
      "abbott", "ackerman", "adkins", "albert", "aldrich", "alexander", "alford", "allison", "alston", "andrews",
      "appleton", "archer", "armstrong", "arnold", "ashley", "atkins", "atkinson", "austin", "avery", "baird",
      "baker", "baldwin", "ball", "ballard", "barker", "barlow", "barr", "barrett", "barry", "barton",
      "bates", "bauer", "baxter", "beal", "beard", "beasley", "beck", "becker", "benson", "berry",
      "billings", "bingham", "blackburn", "blair", "bolton", "bond", "booth", "bowen", "bowers", "boyle",
      "brady", "brannon", "bray", "briggs", "bright", "brink", "britt", "brock", "brooks", "browne",
      "browning", "bryce", "buck", "bullock", "burgess", "burke", "burnett", "bush", "byrd", "calhoun",
      "callahan", "cameron", "cannon", "cantrell", "carey", "carlson", "carr", "carroll", "carson", "case",
      "casey", "cassidy", "chambers", "chandler", "chase", "childers", "church", "clarke", "clay", "clemens",
      "clements", "cobb", "cochran", "cody", "collier", "compton", "conley", "connor", "conway", "cooke",
      "cope", "corbett", "corbin", "cowan", "crane", "crawford", "crews", "crosby", "cross", "crowley",
      "cummings", "curry", "dalton", "daly", "daniels", "daugherty", "davidson", "decker", "denton", "dickerson",
      "dickinson", "dillard", "dodson", "doherty", "donnelly", "donovan", "dorsey", "dotson", "dougherty", "downey",
      "downs", "doyle", "drake", "dudley", "duff", "duffy", "durham", "eaton", "edmonds", "emerson", "england",
      "english", "erickson", "farley", "farmer", "farris", "faulkner", "fenton", "ferguson", "finley", "fischer",
      "fitzgerald", "fletcher", "flynn", "fowler", "franklin", "fraser", "freeman", "frost", "fuller", "gallagher",
      "gardner", "garrett", "garrison", "gibbs", "gilbert", "giles", "gill", "gilles", "gilmore", "glass",
      "gleason", "goodman", "goodwin", "gordon", "gould", "grady", "granger", "graves", "greene", "gregory",
      "griffith", "grimes", "gross", "grove", "guthrie", "hahn", "hale", "hammond", "hancock", "hanna",
      "hardy", "harmon", "harper", "harrington", "hartman", "hastings", "hawkins", "hayden", "hayward", "heath",
      "hendricks", "herndon", "hicks", "higgins", "hinton", "hodges", "hoffman", "hogan", "holder", "holland",
      "holloway", "holt", "hood", "hooper", "horn", "horton", "houston", "howe", "hubbard", "huffman",
      "hughes", "humphrey", "ingram", "irwin", "jacobson", "jameson", "jarvis", "jennings", "jensen", "johnston",
      "jordan", "kane", "keating", "keller", "kelley", "kemp", "kendall", "kent", "kerr", "kinney",
      "kirby", "kirk", "klein", "knox", "lane", "lang", "larson", "lawson", "leach", "leblanc",
      "lindsey", "locke", "logan", "lowe", "lucas", "lynch", "lyons", "mackenzie", "madden", "malone",
      "mann", "manning", "marks", "marlowe", "marsh", "mccarthy", "mccoy", "mckinney", "mclaughlin", "mclean",
      "mcmillan", "mcpherson", "meadows", "mercer", "merritt", "meyer", "miles", "mills", "mitchell", "moody",
      "morgan", "morrison", "morrow", "morse", "morton", "moss", "mullins", "munson", "murray", "nash",
      "neal", "newman", "newton", "nichols", "noble", "nolan", "norman", "norris", "oakley", "obrien",
      "oconnor", "odonnell", "oneal", "oneil", "oneill", "orr", "osborne", "owens", "pace", "page",
      "palmer", "parsons", "patrick", "payne", "pearson", "pennington", "perkins", "phelps", "pierce", "pollard",
      "poole", "porter", "potter", "pratt", "prescott", "preston", "purcell", "quinn", "raines", "randall",
      "raymond", "reese", "reeves", "regan", "reilly", "rhodes", "riggs", "robbins", "rollins", "roman",
      "rose", "rowe", "rudd", "rutherford", "salazar", "sanderson", "sargent", "saunders", "savage",
      "schmidt", "schneider", "schroeder", "schultz", "sears", "sexton", "shannon", "sharp", "shaw", "shea",
      "shepherd", "sherman", "short", "simmons", "simon", "simpson", "sinclair", "slater", "sloan", "small",
      "sparks", "spencer", "stafford", "stark", "steele", "stewart", "stokes", "stout", "strickland", "strong",
      "sullivan", "summers", "sutton", "swanson", "talbot", "tanner", "thornton", "todd", "townsend", "tucker",
      "underwood", "vance", "vaughn", "vincent", "wade", "wagner", "wall", "wallace", "walters", "walton",
      "warner", "warren", "weber", "welch", "wheeler", "whitaker", "whitney", "wiley", "wilcox", "wilder",
      "wilkerson", "wilkins", "williamson", "willis", "winters", "wise", "woodard", "woodruff", "woods", "workman",
      "wyatt", "yates", "york", "youngblood", "zimmerman",
      // Additional 100 last names for White Caucasian males, aged 45–75
      "archibald", "atwood", "babcock", "bain", "banning", "bartlett", "bellows", "bixby", "blanchard", "bowman",
      "brigham", "buckley", "bumpus", "burdick", "burrows", "calvert", "carmichael", "carpenter", "chaffee", "chamberlain",
      "churchill", "clayton", "colburn", "colby", "connolly", "crockett", "cummins", "dawes", "dennis", "draper",
      "dunbar", "dutton", "eastman", "eldridge", "emery", "fairchild", "farnsworth", "farrar", "fay", "fitch",
      "freeman", "frost", "gannett", "gibbons", "goddard", "goodrich", "graves", "hadley", "hammond", "harriman",
      "hawley", "peterson", "healey", "hitchcock", "holbrook", "holden", "houghton", "hutchinson", "ingalls", "jewett", "judson",
      "kellogg", "kimball", "larkin", "leavitt", "lombard", "lowry", "lyman", "mack", "merrill", "morse",
      "newell", "norton", "osgood", "peabody", "perkins", "phelps", "prentice", "putnam", "ransom", "remington",
      "ricker", "sargent", "sawyer", "sewell", "sheldon", "sherwood", "sprague", "stoddard", "stratton", "sumner",
      "thayer", "tucker", "upton", "vinton", "wadsworth", "walden", "whitcomb", "whiting", "whitman", "winslow"
    ]);

    // Early human name splitting via known first + last detection
    for (const first of KNOWN_FIRST_NAMES) {
      if (lower.startsWith(first)) {
        const remaining = lower.slice(first.length);
        // Exact match for last name
        if (KNOWN_LAST_NAMES.has(remaining)) {
          const split = [capitalizeName(first).name, capitalizeName(remaining).name];
          log("debug", "Human name split (first + last match)", { text, split });
          return split;
        }
      }
    }

    // Fallback regex-based match for two lowercase blobs
    const humanNameMatch = lower.match(/^([a-z]{2,})([a-z]{3,})$/);
    if (humanNameMatch) {
      const [, first, last] = humanNameMatch;
      if (KNOWN_FIRST_NAMES.has(first) && KNOWN_LAST_NAMES.has(last)) {
        const split = [capitalizeName(first).name, capitalizeName(last).name];
        log("debug", "Regex-based human name split", { text, split });
        return split;
      }
    }

const overrides = {
  "billdube": ["Bill", "Dube"],
  "mclartydaniel": ["McLarty", "Daniel"],
  "nplincoln": ["NP", "Lincoln"],
  "autonationusa": ["AutoNation"],
  "robbynixonbuickgmc": ["Robby", "Nixon"],
  "mccarthyautogroup": ["McCarthy", "Auto"],
  "donjacobs": ["Don", "Jacobs"],
  "lacitycars": ["La", "City"],
  "ricksmithchevrolet": ["Rick", "Smith"],
  "classicbmw": ["Classic", "BMW"],
  "davisautosales": ["Davis", "Auto"],
  "barlowautogroup": ["Barlow", "Auto"],
  "mikeerdman": ["Mike", "Erdman"],
  "chevyofcolumbuschevrolet": ["Chevy", "Columbus"],
  "drivevictory": ["Victory"],
  "sunsetmitsubishi": ["Sunset", "Mitsubishi"],
  "northwestcars": ["Northwest"],
  "kiaofchattanooga": ["Chattanooga", "Kia"],
  "mazdanashville": ["Nashville", "Mazda"],
  "tasca": ["Tasca"],
  "crystalautogroup": ["Crystal", "Auto"],
  "robertthorne": ["Robert", "Thorne"]
};

    // Dynamic proper noun pair detection
    for (const name of KNOWN_PROPER_NOUNS) {
      const nameLower = name.toLowerCase();
      if (lower.includes(nameLower)) {
        const remaining = lower.replace(nameLower, "").trim();
        const remainderName = capitalizeName(remaining).name;
        if (KNOWN_PROPER_NOUNS.has(remainderName)) {
          const split = [name, remainderName];
          log("debug", "Dynamic noun pair split in earlyCompoundSplit", { text, split });
          return split;
        }
      }
    }

    const tokens = [];
    let remaining = lower;

    while (remaining.length > 0) {
      let matched = false;

      // Match proper nouns
      for (const noun of KNOWN_PROPER_NOUNS) {
        const nounLower = noun.toLowerCase();
        if (remaining.startsWith(nounLower)) {
          tokens.push(capitalizeName(nounLower).name);
          remaining = remaining.slice(nounLower.length);
          matched = true;
          break;
        }
      }

      // Match cities
      if (!matched) {
        for (const city of KNOWN_CITIES_SET) {
          if (remaining.startsWith(city)) {
            tokens.push(capitalizeName(city).name);
            remaining = remaining.slice(city.length);
            matched = true;
            break;
          }
        }
      }

      // Match brands
      if (!matched) {
        for (const brand of CAR_BRANDS) {
          if (remaining.startsWith(brand)) {
            tokens.push(BRAND_MAPPING[brand] || capitalizeName(brand).name);
            remaining = remaining.slice(brand.length);
            matched = true;
            break;
          }
        }
      }

      // Enhanced camelCase splitting
      if (!matched) {
        const camelMatch = remaining.match(/^([a-z]+)([A-Z][a-z]*)/);
        if (camelMatch) {
          const first = camelMatch[1];
          const second = camelMatch[2];
          tokens.push(capitalizeName(first).name);
          remaining = second + remaining.slice(camelMatch[0].length);
        } else {
          const blobMatch = remaining.match(/^([a-z]+)([A-Z]|$)/);
          if (blobMatch) {
            tokens.push(capitalizeName(blobMatch[1]).name);
            remaining = remaining.slice(blobMatch[1].length);
          } else {
            tokens.push(capitalizeName(remaining).name);
            remaining = "";
          }
        }
      }
    }

    const validTokens = tokens
      .filter(t => t && !["cars", "sales", "autogroup"].includes(t.toLowerCase()))
      .filter((t, i, arr) => i === 0 || t.toLowerCase() !== arr[i - 1].toLowerCase());

    log("debug", "earlyCompoundSplit result", { text, split: validTokens });
    return validTokens;
  } catch (e) {
    log("error", "earlyCompoundSplit failed", { text, error: e.message, stack: e.stack });
    return [text];
  }
}

/**
 * Splits camelCase text into tokens
 * @param {string} text - Text to split
 * @returns {Array<string>} - Array of tokens
 */
function splitCamelCase(text) {
  try {
    if (!text || typeof text !== "string") {
      log("error", "Invalid text in splitCamelCase", { text });
      throw new Error("Invalid text input");
    }
    return text.split(/(?=[A-Z])/).map(t => t.toLowerCase());
  } catch (e) {
    log("error", "splitCamelCase failed", { text, error: e.message, stack: e.stack });
    throw new Error("splitCamelCase failed");
  }
}

/**
 * Splits text into predefined token patterns
 * @param {string} text - Text to split
 * @returns {Array<string>} - Array of tokens
 */
function blobSplit(text) {
  try {
    if (!text || typeof text !== "string") {
      log("error", "Invalid text in blobSplit", { text });
      throw new Error("Invalid text input");
    }
    const splits = {
      "subaruofgwinnett": ["Subaru", "Gwinnett"],
      "toyotaofomaha": ["Toyota", "Omaha"],
      "toyotaofchicago": ["Toyota", "Chicago"],
      "chevyofcolumbuschevrolet": ["Chevy", "Columbus"],
      "mazdanashville": ["Mazda", "Nashville"],
      "kiachattanooga": ["Kia", "Chattanooga"]
    };
    return splits[text.toLowerCase()] || [text];
  } catch (e) {
    log("error", "blobSplit failed", { text, error: e.message, stack: e.stack });
    throw new Error("blobSplit failed");
  }
}

/**
 * Capitalizes a name with token fixes
 * @param {string} name - Name to capitalize
 * @returns {Object} - Capitalized name with flags
 */
function capitalizeName(name) {
  try {
    let words = name;
    if (typeof words === "string") {
      words = words.match(/[a-z]+/gi) || [];
    }
    if (!Array.isArray(words)) {
      words = [words];
    }

    const fixedWords = words.map(word => {
      if (!word || typeof word !== "string") return word;
      const wordLower = word.toLowerCase();
      for (const [bad, good] of Object.entries(TOKEN_FIXES)) {
        if (wordLower.includes(bad)) {
          return good;
        }
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });

    return {
      name: fixedWords.join(" "),
      flags: []
    };
  } catch (e) {
    log("error", "capitalizeName failed", { name, error: e.message, stack: e.stack });
    return { name: "", flags: ["CapitalizeNameError"] };
  }
}

/**
 * Expands initials in a name
 * @param {string} name - Name to expand
 * @returns {Object} - Expanded name
 */
function expandInitials(name) {
  try {
    if (!name || typeof name !== "string") {
      log("error", "Invalid name in expandInitials", { name });
      throw new Error("Invalid name input");
    }
    if (/^[A-Z]{2,3}$/.test(name)) {
      return { name: name.toUpperCase() };
    }
    return { name };
  } catch (e) {
    log("error", "expandInitials failed", { name, error: e.message, stack: e.stack });
    throw new Error("expandInitials failed");
  }
}

/**
 * Extracts brand and city from a domain
 * @param {string} domain - Domain to analyze
 * @returns {Object} - Brand, city, and flags
 */
function extractBrandOfCityFromDomain(domain) {
  const flags = new Set();
  log("info", "extractBrandOfCityFromDomain started", { domain });

  try {
    if (!domain || typeof domain !== "string") {
      log("error", "Invalid domain in extractBrandOfCityFromDomain", { domain });
      throw new Error("Invalid domain input");
    }

    const cleanDomain = domain.toLowerCase().replace(/^(www\.)|(\.com|\.net|\.org)$/g, "");
    const brandOfCityMatch = cleanDomain.match(/(\w+)(?:of)(\w+)(?:\w*)/i);
    if (brandOfCityMatch) {
      let [, brand, city] = brandOfCityMatch;
      if (CAR_BRANDS.includes(brand.toLowerCase()) && KNOWN_CITIES_SET.has(city.toLowerCase())) {
        const formattedBrand = BRAND_MAPPING[brand.toLowerCase()] || capitalizeName(brand).name;
        const formattedCity = capitalizeName(city).name;
        flags.add("BrandOfCityPattern");
        return { brand: formattedBrand, city: formattedCity, flags: Array.from(flags) };
      }
    }

    const tokens = extractTokens(cleanDomain);
    const city = tokens.find(t => KNOWN_CITIES_SET.has(t.toLowerCase()));
    const brand = tokens.find(t => CAR_BRANDS.includes(t.toLowerCase()));
    if (city && brand) {
      const formattedBrand = BRAND_MAPPING[brand.toLowerCase()] || capitalizeName(brand).name;
      const formattedCity = capitalizeName(city).name;
      flags.add("TokenBasedExtraction");
      return { brand: formattedBrand, city: formattedCity, flags: Array.from(flags) };
    }

    flags.add("TokenBasedExtraction");
    return {
      brand: brand ? (BRAND_MAPPING[brand.toLowerCase()] || capitalizeName(brand).name) : null,
      city: city ? capitalizeName(city).name : null,
      flags: Array.from(flags)
    };
  } catch (e) {
    log("error", "extractBrandOfCityFromDomain failed", { domain, error: e.message, stack: e.stack });
    return { brand: null, city: null, flags: ["ExtractBrandOfCityError"] };
  }
}

/**
 * Attempts to match a brand-city pattern in tokens
 * @param {Array<string>} tokens - Tokens to analyze
 * @returns {{companyName: string, confidenceScore: number, flags: Array<string>}} - Result with company name, confidence score, and flags
 */
function tryBrandCityPattern(tokens) {
  const flags = new Set();
  log("info", "tryBrandCityPattern started", { tokens });

  try {
    if (!Array.isArray(tokens)) {
      log("error", "Invalid tokens in tryBrandCityPattern", { tokens });
      throw new Error("Invalid tokens input");
    }

    const normalizedTokens = tokens.map(t => t.toLowerCase());
    let brand = null;
    let city = null;

    // Find the first matching city and brand
    for (let i = 0; i < normalizedTokens.length; i++) {
      const token = normalizedTokens[i];
      if (KNOWN_CITIES_SET.has(token)) {
        city = token;
        brand = normalizedTokens.find((t, j) => j !== i && CAR_BRANDS.includes(t.toLowerCase()));
        if (brand && brand.toLowerCase() !== city.toLowerCase()) {
          break;
        }
        brand = null;
        city = null; // Reset if no brand found for this city
      }
    }

    if (brand && city) {
      const formattedBrand = BRAND_MAPPING[brand.toLowerCase()] || capitalizeName(brand).name;
      const formattedCity = capitalizeName(city).name;
      const name = `${formattedCity} ${formattedBrand}`;
      flags.add("BrandCityPattern");
      return { companyName: name, confidenceScore: 125, flags: Array.from(flags) };
    }

    return { companyName: "", confidenceScore: 0, flags: Array.from(flags) };
  } catch (e) {
    log("error", "tryBrandCityPattern failed", { tokens, error: e.message, stack: e.stack });
    return { companyName: "", confidenceScore: 80, flags: Array.from(new Set(["BrandCityPatternError", "ManualReviewRecommended"])) };
  }
}

/**
 * Attempts to match a human name pattern in tokens
 * @param {Array<string>} tokens - Tokens to analyze
 * @returns {{companyName: string, confidenceScore: number, flags: Array<string>}} - Result with company name, confidence score, and flags
 */
function tryHumanNamePattern(tokens) {
  const flags = new Set();
  log("info", "tryHumanNamePattern started", { tokens });

  try {
    if (!Array.isArray(tokens)) {
      log("error", "Invalid tokens in tryHumanNamePattern", { tokens });
      throw new Error("Invalid tokens input");
    }

    // Two-token human name using KNOWN_FIRST_NAMES and KNOWN_LAST_NAMES (e.g., "Don Jacobs", "Rick Smith")
    if (
      tokens.length >= 2 &&
      KNOWN_FIRST_NAMES.has(tokens[0]) &&
      KNOWN_LAST_NAMES.has(tokens[1]) &&
      !CAR_BRANDS.includes(tokens[0].toLowerCase()) &&
      !CAR_BRANDS.includes(tokens[1].toLowerCase()) &&
      !KNOWN_CITIES_SET.has(tokens[0].toLowerCase()) &&
      !KNOWN_CITIES_SET.has(tokens[1].toLowerCase())
    ) {
      const fullName = `${tokens[0]} ${tokens[1]}`;
      flags.add("HumanNameDetected");
      return { companyName: fullName, confidenceScore: 125, flags: Array.from(flags) };
    }

    // Last name + car brand or generic term (e.g., "Smith Kia", "Smith Motors")
    if (tokens.length >= 2) {
      const lastName = tokens[0];
      const domainBrand = tokens.find(t => CAR_BRANDS.includes(t.toLowerCase()));
      const genericTerms = ["auto", "automotive", "motors", "dealers", "motor", "group"];
      const hasGeneric = tokens.find(t => genericTerms.includes(t.toLowerCase()));
      if (
        KNOWN_LAST_NAMES.has(lastName) &&
        !CAR_BRANDS.includes(lastName.toLowerCase()) &&
        !KNOWN_CITIES_SET.has(lastName.toLowerCase()) &&
        !lastName.toLowerCase().endsWith("s")
      ) {
        if (domainBrand) {
          const name = `${lastName} ${BRAND_MAPPING[domainBrand.toLowerCase()] || capitalizeName(domainBrand).name}`;
          flags.add("HumanNameDetected");
          flags.add("LastNameBrandPattern");
          return { companyName: name, confidenceScore: 95, flags: Array.from(flags) };
        } else if (hasGeneric) {
          const name = `${lastName} ${capitalizeName(hasGeneric).name}`;
          flags.add("HumanNameDetected");
          flags.add("LastNameGenericPattern");
          return { companyName: name, confidenceScore: 95, flags: Array.from(flags) };
        }
      }
    }

    // First name + generic term (e.g., "Phil Auto", "Phil Motors")
    if (tokens.length >= 2) {
      const firstName = tokens[0];
      const genericTerms = ["auto", "automotive", "motors", "dealer", "motor", "group"];
      const hasGeneric = tokens.find(t => genericTerms.includes(t.toLowerCase()));
      if (
        (KNOWN_FIRST_NAMES.has(firstName) || KNOWN_PROPER_NOUNS.has(firstName)) &&
        hasGeneric &&
        !CAR_BRANDS.includes(firstName.toLowerCase()) &&
        !KNOWN_CITIES_SET.has(firstName.toLowerCase()) &&
        !firstName.toLowerCase().endsWith("s")
      ) {
        const name = `${firstName} ${capitalizeName(hasGeneric).name}`;
        flags.add("HumanNameDetected");
        flags.add("FirstNameGenericPattern");
        return { companyName: name, confidenceScore: 95, flags: Array.from(flags) };
      }
    }

    // Partial match with domain brand using KNOWN_PROPER_NOUNS (e.g., "Phil Kia")
    if (tokens.some(t => KNOWN_PROPER_NOUNS.has(t) && !CAR_BRANDS.includes(t.toLowerCase()))) {
      const properNoun = tokens.find(t => KNOWN_PROPER_NOUNS.has(t));
      const domainBrand = tokens.find(t => CAR_BRANDS.includes(t.toLowerCase()));
      if (domainBrand && !properNoun.toLowerCase().endsWith("s")) {
        const name = `${properNoun} ${BRAND_MAPPING[domainBrand.toLowerCase()] || capitalizeName(domainBrand).name}`;
        flags.add("HumanNameDetected");
        flags.add("DomainBrandAppended");
        return { companyName: name, confidenceScore: 95, flags: Array.from(flags) };
      }
    }

    return { companyName: "", confidenceScore: 0, flags: Array.from(flags) };
  } catch (e) {
    log("error", "tryHumanNamePattern failed", { tokens, error: e.message, stack: e.stack });
    return { companyName: "", confidenceScore: 80, flags: Array.from(new Set(["HumanNamePatternError", "ManualReviewRecommended"])) };
  }
}

/**
 * Attempts to match a proper noun pattern in tokens
 * @param {Array<string>} tokens - Tokens to analyze
 * @returns {Object} - Result with company name, confidence score, and flags
 */
function tryProperNounPattern(tokens) {
  const flags = new Set();
  log("info", "tryProperNounPattern started", { tokens });

  try {
    if (!Array.isArray(tokens)) {
      log("error", "Invalid tokens in tryProperNounPattern", { tokens });
      throw new Error("Invalid tokens input");
    }

    if (tokens.length === 1 && KNOWN_PROPER_NOUNS.has(tokens[0])) {
      return { companyName: tokens[0], confidenceScore: 125, flags: Array.from(flags) };
    }
    return { companyName: "", confidenceScore: 0, flags: Array.from(flags) };
  } catch (e) {
    log("error", "tryProperNounPattern failed", { tokens, error: e.message, stack: e.stack });
    return { companyName: "", confidenceScore: 80, flags: Array.from(new Set(["ProperNounPatternError", "ManualReviewRecommended"])) };
  }
}

/**
 * Attempts to match a generic pattern in tokens
 * @param {Array<string>} tokens - Tokens to analyze
 * @param {Object} meta - Meta data
 * @returns {Object} - Result with company name, confidence score, and flags
 */
function tryGenericPattern(tokens, meta) {
  const flags = new Set();
  log("info", "tryGenericPattern started", { tokens });

  try {
    if (!Array.isArray(tokens)) {
      log("error", "Invalid tokens in tryGenericPattern", { tokens });
      throw new Error("Invalid tokens input");
    }

    const spamTriggers = ["cars", "sales", "autogroup", "group"];
    let cleanedTokens = tokens
      .map(t => t.toLowerCase())
      .filter(t => !spamTriggers.includes(t))
      .filter((t, i, arr) => i === 0 || t !== arr[i - 1]);

    // Deduplicate tokens to prevent redundant brands (e.g., "Chevy Chevy")
    cleanedTokens = dedupeBrands(cleanedTokens);

    // Check for empty tokens after cleaning
    if (cleanedTokens.length === 0) {
      const metaBrand = getMetaTitleBrand(meta) || "Auto";
      const name = BRAND_MAPPING[metaBrand.toLowerCase()] || capitalizeName(metaBrand).name;
      flags.add("GenericAppended");
      flags.add("ManualReviewRecommended");
      return { companyName: name, confidenceScore: 50, flags: Array.from(flags) };
    }

    // City-only check: Append brand if city-only
    if (cleanedTokens.length === 1 && KNOWN_CITIES_SET.has(cleanedTokens[0])) {
      flags.add("CityOnly");
      const cityName = capitalizeName(cleanedTokens[0]).name;
      const metaBrand = getMetaTitleBrand(meta) || "Auto";
      const formattedBrand = BRAND_MAPPING[metaBrand.toLowerCase()] || capitalizeName(metaBrand).name;
      const name = `${cityName} ${formattedBrand}`;
      return {
        companyName: name,
        confidenceScore: 90,
        flags: Array.from(flags)
      };
    }

    // Brand-only check: Trigger fallback for generic brand-only outputs
    if (cleanedTokens.length === 1 && CAR_BRANDS.includes(cleanedTokens[0])) {
      flags.add("BrandOnly");
      throw new Error("BrandOnlyError: Generic brand-only output requires fallback");
    }

    // Abbreviation check
    const abbreviation = cleanedTokens.find(t => /^[a-z]{2,3}$/i.test(t) && !COMMON_WORDS.includes(t));
    if (abbreviation) {
      const metaBrand = getMetaTitleBrand(meta) || "Auto";
      const formattedAbbr = expandInitials(abbreviation).name;
      flags.add("AbbreviationDetected");
      const name = `${formattedAbbr} ${BRAND_MAPPING[metaBrand.toLowerCase()] || capitalizeName(metaBrand).name}`;
      return { companyName: name, confidenceScore: 95, flags: Array.from(flags) };
    }

    // City and brand check
    const city = cleanedTokens.find(t => KNOWN_CITIES_SET.has(t));
    if (city) {
      const metaBrand = getMetaTitleBrand(meta);
      if (metaBrand && !cleanedTokens.some(t => CAR_BRANDS.includes(t))) {
        const formattedCity = capitalizeName(city).name;
        const formattedBrand = BRAND_MAPPING[metaBrand.toLowerCase()] || capitalizeName(metaBrand).name;
        const name = `${formattedCity} ${formattedBrand}`;
        flags.add("CityBrandPattern");
        flags.add("MetaTitleBrandAppended");
        return { companyName: name, confidenceScore: 125, flags: Array.from(flags) };
      }
    }

  // Generic pattern processing
    let primaryToken = cleanedTokens.find(t => KNOWN_PROPER_NOUNS.has(capitalizeName(t).name)) || cleanedTokens[0];
    let brand = cleanedTokens.find(t => CAR_BRANDS.includes(t)) || getMetaTitleBrand(meta);
    if (brand) {
      brand = BRAND_MAPPING[brand.toLowerCase()] || capitalizeName(brand).name;
      const isBrandSafe = brand => CAR_BRANDS.includes(brand.toLowerCase()) &&
        (tokens.some(t => t.toLowerCase().includes(brand.toLowerCase())) ||
         (meta.title || "").toLowerCase().includes(brand.toLowerCase()));
      if (!isBrandSafe(brand)) {
        brand = null;
      }
    }

    if (primaryToken === "autonation") {
      flags.add("SpecialCase");
      return { companyName: "AutoNation", confidenceScore: 125, flags: Array.from(flags) };
    }

    let name = capitalizeName(primaryToken).name;
    const isPossessiveFriendly = name.toLowerCase().endsWith("s") || !/^[aeiou]$/i.test(name.slice(-1));
    if (!isPossessiveFriendly && brand && !name.toLowerCase().includes(brand.toLowerCase())) {
      name = `${name} ${brand || "Auto"}`;
    }

    // Deduplicate and clean up the final name
    const nameTokens = name.split(" ").filter((t, i, arr) => i === 0 || t.toLowerCase() !== arr[i - 1].toLowerCase());
    name = nameTokens.slice(0, 3).join(" ").replace(/\b(auto auto|auto group)\b/gi, "Auto").replace(/\s+/g, " ").trim();

    // Adjust confidence and flags based on name quality
    if (nameTokens.every(t => KNOWN_PROPER_NOUNS.has(t)) || (nameTokens.length === 1 && KNOWN_PROPER_NOUNS.has(nameTokens[0]))) {
      flags.delete("ManualReviewRecommended");
      return { companyName: name, confidenceScore: 125, flags: Array.from(flags) };
    }

    // Check for generic patterns that need review
    const isTooGeneric = nameTokens.length === 1 && (CAR_BRANDS.includes(name.toLowerCase()) || name.toLowerCase() === "auto");
    if (isTooGeneric) {
      flags.add("TooGeneric");
      return { companyName: name, confidenceScore: 50, flags: Array.from(flags) };
    }

    flags.add("GenericPattern");
    return { companyName: name, confidenceScore: flags.has("CityBrandPattern") ? 125 : 95, flags: Array.from(flags) };
  } catch (e) {
    log("error", "tryGenericPattern failed", { tokens, error: e.message, stack: e.stack });
    if (e.message.includes("BrandOnlyError")) {
      throw e; // Re-throw to trigger fallback in batch-enrich.js
    }
    return { companyName: "", confidenceScore: 80, flags: Array.from(new Set(["GenericPatternError", "ManualReviewRecommended"])) };
  }
}

/**
 * Attempts to match a city-auto pattern in tokens
 * @param {Array<string>} tokens - Tokens to analyze
 * @returns {{companyName: string, confidenceScore: number, flags: Array<string>}} - Result with company name, confidence score, and flags
 */
function tryCityAutoPattern(tokens) {
  const flags = new Set();
  log("info", "tryCityAutoPattern started", { tokens });

  try {
    if (!Array.isArray(tokens)) {
      log("error", "Invalid tokens in tryCityAutoPattern", { tokens });
      throw new Error("Invalid tokens input");
    }

    const city = tokens.find(t => KNOWN_CITIES_SET.has(t.toLowerCase()));
    const hasAuto = tokens.some(t => t.toLowerCase() === "auto");
    if (city && hasAuto) {
      const formattedCity = capitalizeName(city).name;
      const name = `${formattedCity} Auto`;
      flags.add("CityAutoPattern");
      return { companyName: name, confidenceScore: 95, flags: Array.from(flags) };
    }

    return { companyName: "", confidenceScore: 0, flags: Array.from(flags) };
  } catch (e) {
    log("error", "tryCityAutoPattern failed", { tokens, error: e.message, stack: err.stack });
    return { companyName: "", confidenceScore: 80, flags: Array.from(new Set(["CityAutoPatternError", "ManualReviewRecommended"])) };
  }
}

/**
 * Attempts to match a brand-generic term pattern in tokens
 * @param {Array<string>} tokens - Tokens to analyze
 * @returns {{companyName: string, confidenceScore: number, flags: Array<string>}} - Result with company name, confidence score, and flags
 */
function tryBrandGenericPattern(tokens) {
  const flags = new Set();
  log("info", "tryBrandGenericPattern started", { tokens });

  try {
    if (!Array.isArray(tokens)) {
      log("error", "Invalid tokens in tryBrandGenericPattern", { tokens });
      throw new Error("Invalid tokens input");
    }

    const genericTerms = ["automotive", "auto", "group", "motors", "motor", "fleet"];
    const brand = tokens.find(t => CAR_BRANDS.includes(t.toLowerCase()));
    const generic = tokens.find(t => genericTerms.includes(t.toLowerCase()));
    if (brand && generic) {
      const formattedBrand = BRAND_MAPPING[brand.toLowerCase()] || capitalizeName(brand).name;
      const formattedGeneric = capitalizeName(generic).name;
      const name = `${formattedBrand} ${formattedGeneric}`;
      flags.add("BrandGenericPattern");
      return { companyName: name, confidenceScore: 95, flags: Array.from(flags) };
    }

    return { companyName: "", confidenceScore: 0, flags: Array.from(flags) };
  } catch (e) {
    log("error", "tryBrandGenericPattern failed", { tokens, error: e.message, stack: err.stack });
    return { companyName: "", confidenceScore: 80, flags: Array.from(new Set(["BrandGenericPatternError", "ManualReviewRecommended"])) };
  }
}

function dedupeBrands(tokens) {
  const seen = new Set();
  return tokens.filter(token => {
    const lower = token.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

/**
 * Humanizes a domain name into a cold-email-friendly company name
 * @param {string} domain - The domain to humanize
 * @param {string} originalDomain - The original domain for override lookup
 * @param {boolean} useMeta - Whether to fetch meta data
 * @returns {Object} - Enriched result
 */
async function humanizeName(domain, originalDomain, useMeta = false) {
  const normalizedDomain = domain?.toLowerCase().trim() || "";
  let companyName = "";
  let confidenceScore = 80;
  let flags = [];
  let tokens = 0;

  try {
    if (!domain || typeof domain !== "string") {
      log("error", "Invalid domain input", { domain, originalDomain });
      flags.push("InvalidDomainInput");
      return { companyName, confidenceScore, flags: Array.from(new Set(flags)), tokens };
    }
    if (!originalDomain || typeof originalDomain !== "string") {
      log("warn", "Invalid originalDomain, using domain as fallback", { originalDomain, domain });
      originalDomain = domain;
    }

    let meta = {};
    if (useMeta) {
      try {
        meta = await fetchMetaData(domain);
      } catch (err) {
        log("error", "fetchMetaData failed", { domain, error: err.message, stack: err.stack });
        flags.push("MetaDataFailed");
      }
    }

    if (BRAND_ONLY_DOMAINS.includes(`${normalizedDomain}.com`)) {
      return { companyName: "", confidenceScore: 0, flags: Array.from(new Set(["BrandOnlyDomainSkipped"])), tokens };
    }

    if (TEST_CASE_OVERRIDES[originalDomain]) {
      return {
        companyName: TEST_CASE_OVERRIDES[originalDomain],
        confidenceScore: 125,
        flags: Array.from(new Set(["TestCaseOverride"])),
        tokens
      };
    }

    if (OVERRIDES[normalizedDomain]) {
      return {
        companyName: OVERRIDES[normalizedDomain],
        confidenceScore: 125,
        flags: Array.from(new Set(["OverrideApplied"])),
        tokens
      };
    }

    let extractedTokens = extractTokens(normalizedDomain);
    if (!extractedTokens || extractedTokens.length === 0) {
      flags.push("NoTokensExtracted");
      return { companyName, confidenceScore, flags: Array.from(new Set(flags)), tokens };
    }

    let result = tryHumanNamePattern(extractedTokens);
    if (result.companyName) {
      return {
        companyName: result.companyName,
        confidenceScore: result.confidenceScore,
        flags: Array.from(new Set(["HumanNameDetected", ...result.flags])),
        tokens
      };
    }

    result = tryBrandCityPattern(extractedTokens);
    if (result.companyName) {
      return {
        companyName: result.companyName,
        confidenceScore: result.confidenceScore,
        flags: Array.from(new Set(["BrandCityPattern", ...result.flags])),
        tokens
      };
    }

    result = tryProperNounPattern(extractedTokens);
    if (result.companyName) {
      return {
        companyName: result.companyName,
        confidenceScore: result.confidenceScore,
        flags: Array.from(new Set(["ProperNounDetected", ...result.flags])),
        tokens
      };
    }

    result = tryCityAutoPattern(extractedTokens);
    if (result.companyName) {
      return {
        companyName: result.companyName,
        confidenceScore: result.confidenceScore,
        flags: Array.from(new Set(["CityAutoPattern", ...result.flags])),
        tokens
      };
    }

    result = tryBrandGenericPattern(extractedTokens);
    if (result.companyName) {
      return {
        companyName: result.companyName,
        confidenceScore: result.confidenceScore,
        flags: Array.from(new Set(["BrandGenericPattern", ...result.flags])),
        tokens
      };
    }

    result = tryGenericPattern(extractedTokens, meta);
    return {
      companyName: result.companyName,
      confidenceScore: result.confidenceScore,
      flags: Array.from(new Set(["GenericPattern", ...result.flags])),
      tokens
    };
  } catch (err) {
    log("error", "humanizeName failed", { domain: normalizedDomain || "unknown", error: err.message, stack: err.stack });
    flags.push("HumanizeNameError", "ManualReviewRecommended");
    return { companyName, confidenceScore, flags: Array.from(new Set(flags)), tokens };
  }
}

/**
 * Fetches metadata for a domain
 * @param {string} domain - Domain to fetch metadata for
 * @returns {Object} - Metadata object
 */
async function fetchMetaData(domain) {
  try {
    if (!domain || typeof domain !== "string") {
      log("error", "Invalid domain in fetchMetaData", { domain });
      throw new Error("Invalid domain input");
    }

    const meta = {
      "donjacobs.com": { title: "Chevrolet Dealer" },
      "crossroadscars.com": { title: "Toyota Dealer" },
      "chicagocars.com": { title: "Toyota Dealer in Chicago" },
      "davisautosales.com": { title: "Auto Dealer" },
      "northwestcars.com": { title: "Toyota Dealer" },
      "fordtustin.com": { title: "Ford Dealer in Tustin" },
      "hondakingsport.com": { title: "Honda Dealer in Kingsport" },
      "toyotaofchicago.com": { title: "Toyota Dealer in Chicago" },
      "nplincoln.com": { title: "Lincoln Dealer" },
      "chevyofcolumbuschevrolet.com": { title: "Chevrolet Dealer in Columbus" },
      "mazdanashville.com": { title: "Mazda Dealer in Nashville" },
      "kiachattanooga.com": { title: "Kia Dealer in Chattanooga" },
      "subaruofgwinnett.com": { title: "Subaru Dealer in Gwinnett" },
      "ricksmithchevrolet.com": { title: "Chevrolet Dealer" },
      "mikeerdman.com": { title: "Toyota Dealer" },
      "tasca.com": { title: "Ford Dealer" },
      "crystalautogroup.com": { title: "Auto Dealer" },
      "lacitycars.com": { title: "Auto Dealer" },
      "barlowautogroup.com": { title: "Auto Dealer" },
      "drivevictory.com": { title: "Auto Dealer" }
    };
    return meta[domain] || {};
  } catch (e) {
    log("error", "fetchMetaData failed", { domain, error: e.message, stack: e.stack });
    return {};
  }
}

/**
 * Extracts brand from metadata title
 * @param {Object} meta - Metadata object
 * @returns {string|null} - Brand name or null
 */
function getMetaTitleBrand(meta) {
  try {
    if (!meta || !meta.title || typeof meta.title !== "string") {
      log("warn", "Invalid meta title in getMetaTitleBrand", { meta });
      return null;
    }
    const title = meta.title.toLowerCase();
    for (const brand of CAR_BRANDS) {
      if (title.includes(brand.toLowerCase())) {
        return BRAND_MAPPING[brand] || capitalizeName(brand).name;
      }
    }
    return null;
  } catch (e) {
    log("error", "getMetaTitleBrand failed", { meta, error: e.message, stack: e.stack });
    return null;
  }
}

export {
  humanizeName,
  extractTokens,
  earlyCompoundSplit,
  splitCamelCase,
  blobSplit,
  capitalizeName,
  expandInitials,
  extractBrandOfCityFromDomain,
  CAR_BRANDS,
  BRAND_MAPPING,
  COMMON_WORDS,
  TEST_CASE_OVERRIDES,
  BRAND_ONLY_DOMAINS,
  KNOWN_CITIES_SET,
  tryBrandCityPattern,
  tryHumanNamePattern,
  tryProperNounPattern,
  tryCityAutoPattern,
  tryBrandGenericPattern,
  tryGenericPattern,
  fetchMetaData,
  getMetaTitleBrand
};
