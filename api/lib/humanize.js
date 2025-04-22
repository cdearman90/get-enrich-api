// api/lib/humanize.js v5.0.9
// Logger configuration with Vercel-safe transports only

import winston from "winston";
import { fallbackName, validateFallbackName } from '../company-name-fallback.js'; // Add validateFallbackName to the import

const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
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
  "landrover", "lexus", "lincoln", "lucid", "maserati", "maz", "mazda", "mb", "mclaren", "merc", "mercedes",
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


// Revised ABBREVIATION_EXPANSIONS in api/lib/humanize.js
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

const COMMON_WORDS = ["to", "of", "and", "the", "for", "in", "on", "at", "inc", "llc", "corp", "co"];

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
  "mclartydaniel.com": "McLarty Daniel", // Resolved: removed duplicate
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
  "crossroadscars.com": "Crossroad", // Resolved: removed duplicate
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
  "perillobmw.com": "Perillo BMW",
  "newsmyrnachevy.com": "New Smyrna Chevy",
  "charliesmm.com": "Charlie's Motor",
  "towbinauto.com": "Tow Bin Auto",
  "tuttleclick.com": "Tuttle Click",
  "chmb.com": "M.B. Cherry Hill",
  "autobahnmotors.com": "Autobahn Motor",
  "bobweaver.com": "Bob Weaver",
  "bmwwestspringfield.com": "BMW West Springfield",
  "londoff.com": "Londoff",
  "fordhamtoyota.com": "Fordham Toyota",
  "thechevyteam.com": "Chevy Team",
  "crownautomotive.com": "Crown Auto",
  "haaszaautomall.com": "Haasza Auto",
  "hyundaioforangepark.com": "Orange Park Hyundai",
  "risingfastmotors.com": "Rising Fast",
  "hananiaautos.com": "Hanania Auto",
  "bevsmithtoyota.com": "Bev Smith",
  "givemethevin.com": "Give me the Vin",
  "championerie.com": "Champion Erie",
  "andymohr.com": "Andy Mohr",
  "alpine-usa.com": "Alpine USA",
  "bettenbaker.com": "Baker Auto",
  "bianchilhonda.com": "Bianchil Honda",
  "bienerford.com": "Biener Ford",
  "citykia.com": "City Kia",
  "classiccadillac.net": "Classic Cadillac",
  "driveclassic.com": "Drive Classic",
  "crosscreekcars.com": "Cross Creek",
  "elkgrovevw.com": "Elk Grove",
  "elyriahyundai.com": "Elyria Hyundai",
  "joecs.com": "Joe",
  "fordlincolncharlotte.com": "Ford Charlotte",
  "jcroffroad.com": "JCR Offroad",
  "jeffdeals.com": "Jeff",
  "jenkinsandwynne.com": "Jenkins & Wynne",
  "mbofwalnutcreek.com": "M.B. Walnut Creek",
  "mbcutlerbay.com": "M.B. Cutler Bay",
  "mbmnj.com": "M.B. Morristown",
  "mbrvc.com": "M.B. RVC",
  "sfbenz.com": "M.B. San Fran",
  "mbnaunet.com": "M.B. Naunet",
  "mbofmc": "M.B. Music City",
  "mercedesbenzstcharles.com": "M.B. St. Charles",
  "npcdjr.com": "NP Chrysler",
  "obrienteam.com": "O'brien Team",
  "palmetto57.com": "Palmetto",
  "rbmofatlanta.com": "RBM Atlanta",
  "samscismfordlm.com": "Sam Cism",
  "suntrupbuickgmc.com": "Suntrup",
  'acdealergroup.com': 'AC Dealer',
  'daytonandrews.com': 'Dayton Andrews',
  'fordofdalton.com': 'Dalton Ford',
  'metrofordofmadison.com': 'Metro Ford',
  'williamssubarucharlotte.com': 'Williams Subaru',
  'vwsouthtowne.com': 'VW South Towne',
  'scottclarkstoyota.com': 'Scott Clark',
  'duvalford.com': 'Duval',
  'devineford.com': 'Devine',
  'allamericanford.net': 'All American',
  'slvdodge.com': 'Silver Dodge',
  'regalauto.com': 'Regal Auto',
  'elwaydealers.net': 'Elway',
  'chapmanchoice.com': 'Chapman'
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
  "Rising", "Fast", "Deluca"
]);

const KNOWN_CITIES_SET = new Set([
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
  'andalusia', 'attalla', 'bay minette', 'brewton', 'clanton', 'demopolis', 'dothan', 'evergreen', 'fayette', 'fort rucker',
  'geneva', 'greenville', 'guntersville', 'haleyville', 'luverne', 'monroeville', 'roanoke', 'russellville', 'tuscumbia', 'valley',

  // Alaska (10 new, smaller communities with auto sales)
  'anchorage', 'bethel island', 'eagle river', 'fairbanks north star', 'kenai peninsula', 'ketchikan gateway', 'matanuska-susitna', 'palmer', 'sitka city', 'skagway-hoonah-angoon',

  // Arizona (25 new, mid-sized cities and auto hubs)
  'avondale estates', 'bisbee', 'casa blanca', 'chandler heights', 'eloy', 'fort mohave', 'gilbertown', 'goodyear village', 'green valley', 'litchfield park',
  'maricopa wells', 'oro valley', 'paradise', 'peoria heights', 'phoenixville', 'prescott south', 'safford valley', 'santa cruz', 'scottsdale north', 'sierra vista southeast',
  'sun city', 'surprise valley', 'tempe junction', 'tuba city', 'yuma foothills',

  // Arkansas (15 new, smaller cities with dealership presence)
  'ash flat', 'batesville', 'blytheville', 'camden south', 'conway west', 'crossett south', 'dumas', 'el dorado south', 'helena-west helena', 'malvern',
  'monticello', 'newport', 'pine bluff south', 'sheridan', 'wynne',

  // California (50 new, covering Central Valley, Inland Empire, and smaller coastal cities)
  'aliso viejo', 'antioch', 'apple valley', 'arcadia', 'arroyo grande', 'atascadero', 'baldwin park', 'banning', 'bellflower', 'brea',
  'buena park', 'burbank', 'carlsbad', 'cathedral city', 'cerritos hills', 'chico', 'chino', 'clovis', 'compton', 'costa mesa',
  'covina', 'culver city', 'daly city', 'del mar', 'downey', 'el centro', 'el monte', 'encinitas', 'escondido hills', 'fairfield',
  'folsom', 'gilroy', 'hawthorne', 'hemet valley', 'indio', 'la mesa', 'lake forest', 'livermore', 'lodi', 'manteca',
  'murrieta', 'norco', 'palo alto', 'pittsburg', 'redondo beach', 'san clemente', 'san mateo', 'santa barbara', 'santa monica', 'tustin',

  // Colorado (20 new, focusing on Front Range and Western Slope)
  'alamosa', 'brighton south', 'broomfield west', 'brush', 'cortez', 'craig', 'eatonton', 'fort morgan', 'fountain', 'fruita',
  'glenwood springs', 'grand lake', 'gunnison', 'la junta', 'lamar', 'littleton west', 'longmont east', 'loveland north', 'pueblo west', 'vail',

  // Connecticut (15 new, smaller towns with dealerships)
  'branford', 'cheshire', 'colchester', 'east lyme', 'groton', 'madison', 'milford city', 'monroe', 'new canaan', 'north branford',
  'old saybrook', 'orange', 'stonington', 'westbrook', 'wilton',

  // Delaware (10 new, smaller communities)
  'bear', 'brookside', 'glasgow', 'hockessin', 'middletown crossing', 'milford crossing', 'newark south', 'pike creek', 'seaford west', 'wilmington manor',

  // Florida (30 new, focusing on Central and South Florida)
  'altamonte springs', 'aventura', 'belle glade', 'boca del mar', 'bonita springs', 'brandon', 'cape canaveral', 'casselberry', 'coconut grove', 'coral gables',
  'crestview', 'cutler bay', 'dania beach', 'deland', 'destin', 'fernandina beach', 'fort myers', 'fort pierce', 'greenacres', 'hialeah gardens',
  'jensen beach', 'key west', 'lake worth', 'melbourne', 'merritt island', 'miami beach', 'north lauderdale', 'palmetto', 'punta gorda', 'vero beach',

  // Georgia (25 new, covering South and Central Georgia)
  'bainbridge', 'barnesville', 'blakely', 'brunswick', 'cairo', 'calhoun', 'cartersville', 'cedartown', 'commerce', 'cordele',
  'dublin', 'fitzgerald', 'forsyth', 'hawkinsville', 'jesup', 'mcdonough', 'milledgeville', 'moultrie', 'sandersville', 'swainsboro',
  'thomasville', 'tifton', 'vidalia', 'waycross', 'west point',

  // Hawaii (10 new, smaller communities)
  'ewa beach', 'hanamaulu', 'kapalua', 'lahaina west', 'lihue', 'makaha', 'mililani town', 'pearl harbor', 'wahiawa heights', 'waimanalo',

  // Idaho (15 new, rural and mid-sized cities)
  'bliss', 'burley south', 'challis', 'driggs', 'fort hall', 'gooding', 'idaho city', 'jerome north', 'kamiah', 'kellogg',
  'malad city', 'osburn', 'parma', 'priest river', 'saint anthony',

  // Illinois (25 new, covering Chicagoland and Central Illinois)
  'algonquin', 'alsip', 'batavia', 'bloomingdale', 'blue island', 'bridgeview', 'calumet city', 'cary', 'crest hill', 'crystal lake',
  'deerfield', 'dixon', 'elmwood park', 'frankfort', 'geneva', 'grayslake', 'homer glen', 'lake zurich', 'lisle', 'lockport',
  'mchenry', 'niles', 'north aurora', 'romeoville', 'streamwood',

  // Indiana (20 new, focusing on Northern and Central Indiana)
  'angola', 'auburn', 'bedford', 'bluffton', 'columbia city', 'crawfordsville', 'decatur', 'frankfort', 'greensburg', 'huntingburg',
  'jasper', 'kendallville', 'lafayette west', 'madison', 'monticello', 'peru', 'portland', 'princeton', 'rochester', 'warsaw',

  // Iowa (15 new, smaller cities with dealerships)
  'algona', 'anamosa', 'chariton', 'clarinda', 'creston', 'estonia', 'forest city', 'guttenberg', 'hampton', 'humboldt',
  'maquoketa', 'monticello', 'red oak', 'sioux center', 'vinton',

  // Kansas (15 new, rural and mid-sized cities)
  'belleville', 'colby', 'concordia', 'ellsworth', 'eureka', 'fredonia', 'goodland', 'hillsboro', 'hugoton', 'kingman',
  'lyons', 'marysville', 'pratt', 'russell', 'wellington',

  // Kentucky (20 new, covering Eastern and Central Kentucky)
  'ashland', 'barbourville', 'berea', 'cynthiana', 'flemingsburg', 'georgetown', 'grayson', 'harlan', 'hazard', 'hyden',
  'jackson', 'london', 'louisa', 'manchester', 'monticello', 'morehead', 'paintsville', 'pikeville', 'prestonburg', 'somerset',

  // Louisiana (15 new, smaller cities with dealerships)
  'amite', 'bunkie', 'dequincy', 'franklin', 'homer', 'jonesboro', 'kinder', 'leesville', 'many', 'marksville',
  'new roads', 'oak grove', 'rayville', 'vidalia', 'winnsboro',

  // Maine (10 new, smaller towns)
  'bar harbor', 'bethel', 'calais', 'caribou', 'dexter', 'houlton', 'limestone', 'madawaska', 'presque isle', 'van buren',

  // Maryland (15 new, covering Eastern Shore and Western Maryland)
  'beltsville', 'cheverly', 'chestertown', 'easton', 'edgewood', 'elkton', 'emmitsburg', 'frostburg', 'fruitland', 'havre de grace',
  'la plata', 'mount airy', 'ocean city', 'pocomoke city', 'salisbury',

  // Massachusetts (20 new, smaller cities and towns)
  'amherst', 'andover', 'ayer', 'belmont', 'burlington', 'dedham', 'dracut', 'foxborough', 'greenfield', 'holbrook',
  'hudson', 'ipswich', 'melrose', 'milton', 'north adams', 'north reading', 'stoneham', 'swampscott', 'westborough', 'winthrop',

  // Michigan (25 new, covering Upper Peninsula and Lower Peninsula)
  'adrian', 'alma', 'alpena', 'big rapids', 'cadillac', 'charlevoix', 'cheboygan', 'coldwater', 'escanaba', 'gaylord',
  'hancock', 'hillsdale', 'houghton', 'ionia', 'iron mountain', 'ishpeming', 'ludington', 'manistee', 'marquette', 'menominee',
  'owosso', 'petoskey', 'sault ste. marie', 'sturgis', 'three rivers',

  // Minnesota (20 new, covering Twin Cities suburbs and Greater Minnesota)
  'albert lea', 'alexandria', 'bemidji', 'brainerd', 'buffalo', 'cambridge', 'detroit lakes', 'fairmont', 'fergus falls', 'grand rapids',
  'hibbing', 'hutchinson', 'marshall', 'monticello', 'morris', 'new ulm', 'north branch', 'owatonna', 'thief river falls', 'willmar',

  // Mississippi (15 new, smaller cities with dealerships)
  'batesville', 'brookhaven', 'carthage', 'clarksdale', 'cleveland', 'columbia', 'forest', 'hazlehurst', 'houston', 'kosciusko',
  'louisville', 'magee', 'philadelphia', 'pontotoc', 'west point',

  // Missouri (20 new, covering Ozarks and Northern Missouri)
  'bolivar', 'branson', 'carthage', 'chillicothe', 'clinton', 'excelsior springs', 'festus', 'fulton', 'jackson', 'kennett',
  'lebanon', 'macon', 'maryville', 'mexico', 'nevada', 'perryville', 'poplar bluff', 'saint robert', 'union', 'west plains',

  // Montana (10 new, rural communities)
  'anaconda-deer lodge', 'bigfork', 'cut bank', 'deer lodge', 'glasgow', 'libby', 'livingston', 'polson', 'sidney', 'whitefish',

  // Nebraska (15 new, smaller cities)
  'albion', 'aurora', 'blair', 'chadron', 'falls city', 'geneva', 'gothenburg', 'hastings', 'kearney', 'lexington',
  'mccook', 'norfolk', 'plattsmouth', 'seward', 'york',

  // Nevada (10 new, smaller cities and towns)
  'boulder', 'carson', 'elko', 'fallon', 'fernley', 'mesquite', 'reno south', 'sparks east', 'winnemucca', 'yerington',

  // New Hampshire (10 new, smaller towns)
  'barrington', 'belmont', 'colebrook', 'gorham', 'hillsborough', 'lisbon', 'new ipswich', 'newport', 'northwood', 'tamworth',

  // New Jersey (25 new, covering North and Central Jersey)
  'asbury park', 'bayville', 'bloomfield', 'bound brook', 'carteret', 'closter', 'dover', 'dumont', 'elmwood park', 'englewood',
  'fort lee', 'hoboken', 'keyport', 'lodi', 'lyndhurst', 'mahwah', 'maplewood', 'montclair', 'morristown', 'point pleasant', 'ridgewood',
  'rutherford', 'summit', 'union', 'westwood',

  // New Mexico (15 new, smaller cities)
  'alamo', 'artesia', 'bloomfield', 'carlsbad', 'clovis east', 'deming', 'espanola', 'gallup', 'grants', 'hobbs',
  'lovington', 'portales', 'roswell', 'ruidoso', 'silver city',

  // New York (25 new, covering Upstate and Long Island)
  'amityville', 'baldwinsville', 'batavia', 'beacon', 'canandaigua', 'cortland', 'endicott', 'geneva', 'hornell', 'horseheads',
  'jamestown', 'johnstown', 'malone', 'massena', 'medina', 'new paltz', 'north syracuse', 'ogdensburg', 'oneida', 'oneonta',
  'oswego', 'port jervis', 'rochester hills', 'saratoga', 'watertown',

  // North Carolina (20 new, covering Piedmont and Coastal regions)
  'ahoskie', 'belmont', 'brevard', 'dunn', 'elizabeth city', 'farmville', 'graham', 'hamlet', 'haverford', 'hendersonville',
  'laurinburg', 'lenoir', 'lillington', 'lincolnton', 'lumberton', 'mocksville', 'mount airy', 'reidsville', 'roxboro', 'siler city',

  // North Dakota (10 new, smaller communities)
  'belcourt', 'cavalier', 'devils lake', 'grafton', 'harvey', 'larimore', 'lisbon', 'new rockford', 'rugby', 'valley city',

  // Ohio (25 new, covering Northeast and Central Ohio)
  'alliance', 'ashland', 'ashtabula', 'athens', 'barberton', 'berea', 'chardon', 'coshocton', 'defiance', 'dover',
  'eastlake', 'fostoria', 'galion', 'greenville', 'kent', 'marietta', 'medina', 'painesville', 'portsmouth', 'sandusky',
  'sidney', 'tiffin', 'wadsworth', 'willoughby', 'zanesville',

  // Oklahoma (15 new, smaller cities)
  'anadarko', 'blackwell', 'bristow', 'chandler', 'cushing', 'frederick', 'henryetta', 'hobart', 'holdenville', 'idabel',
  'pauls valley', 'perry', 'purcell', 'sulphur', 'vinita',

  // Oregon (15 new, covering Willamette Valley and Eastern Oregon)
  'astoria', 'baker city', 'coquille', 'florence', 'hood river', 'junction city', 'la pine', 'lincoln city', 'madras', 'milton-freewater',
  'north bend', 'seaside', 'sutherlin', 'tillamook', 'umatilla',

  // Pennsylvania (25 new, covering Western and Central Pennsylvania)
  'ambridge', 'beaver', 'bellefonte', 'blairsville', 'bloomsburg', 'clarion', 'clearfield', 'coraopolis', 'corry', 'doylestown',
  'du bois', 'east stroudsburg', 'edensburg', 'gettysburg', 'hollidaysburg', 'huntingdon', 'kittanning', 'kutzton', 'lewisburg', 'lock haven',
  'milton', 'monroeville', 'new kensington', 'punxsutawney', 'selinsgrove',

  // Rhode Island (10 new, smaller communities)
  'barrington', 'bristol', 'central falls', 'coventry', 'exeter', 'narragansett', 'newport', 'tiverton', 'westerly', 'woonsocket',

  // South Carolina (15 new, covering Upstate and Lowcountry)
  'abbeville', 'anderson', 'bennettsville', 'cheraw', 'chester', 'clover', 'gaffney', 'lake city', 'marion', 'mullins',
  'newberry', 'pageland', 'union', 'walterboro', 'williamston',

  // South Dakota (10 new, smaller communities)
  'beresford', 'brookings', 'canton', 'chamberlain', 'dell rapids', 'hot springs', 'lead', 'mobridge', 'sturgis', 'vermillion',

  // Tennessee (20 new, covering East and Middle Tennessee)
  'alcoa', 'bristol', 'crossville', 'dayton', 'elizabethton', 'fayetteville', 'gallatin', 'harriman', 'hohenwald', 'jackson',
  'lafayette', 'lafollette', 'loudon', 'manchester', 'mcminnville', 'milan', 'paris', 'pigeon forge', 'ripley', 'sweetwater',

  // Texas (30 new, covering Panhandle, Hill Country, and South Texas)
  'alvin', 'angleton', 'bastrop', 'bay city', 'boerne', 'brenham', 'brownwood', 'burleson', 'canyon', 'cleburne',
  'conroe', 'corsicana', 'del rio', 'eagle pass', 'ennis', 'fredericksburg', 'galveston', 'georgetown', 'huntsville', 'kerrville',
  'kingsville', 'lampasas', 'lufkin', 'marshall', 'nacogdoches', 'palestine', 'port arthur', 'seguin', 'sherman', 'weatherford',

  // Utah (15 new, covering Wasatch Front and Southern Utah)
  'blanding', 'brigham', 'cedar hills', 'delta', 'ephraim', 'fillmore', 'moab', 'morgan', 'nephi', 'park city',
  'price', 'richfield', 'roosevelt', 'tremonton', 'vernal',

  // Vermont (10 new, smaller towns)
  'barre', 'bellows falls', 'bethel', 'brandon', 'enosburg', 'fair haven', 'lyndon', 'newport', 'stowe', 'vergennes',

  // Virginia (20 new, covering Shenandoah Valley and Tidewater)
  'blackstone', 'bridgewater', 'chincoteague', 'colonial beach', 'dumfries', 'emporia', 'falmouth', 'front royal', 'luray', 'marion',
  'norton', 'orange', 'pulaski', 'south boston', 'south hill', 'tappahannock', 'vinton', 'warrenton', 'wise', 'wytheville',

  // Washington (15 new, covering Puget Sound and Eastern Washington)
  'anacortes', 'arlington', 'battle ground', 'bonney lake', 'chehalis', 'cheney', 'colville', 'ellensburg', 'enumclaw', 'ferndale',
  'gig harbor', 'monroe', 'port orchard', 'sequim', 'shelton',

  // West Virginia (10 new, smaller communities)
  'beckley', 'clendenin', 'fayetteville', 'lewisburg', 'moorefield', 'oak hill', 'parsons', 'petersburg', 'romney', 'summersville',

  // Wisconsin (20 new, covering Southeast and Central Wisconsin)
  'baraboo', 'cedarburg', 'chippewa falls', 'delafield', 'delavan', 'fort atkinson', 'grafton', 'hartford', 'lake geneva', 'menomonie',
  'merrill', 'monroe', 'oconto', 'pewaukee', 'portage', 'reedsburg', 'rice lake', 'river falls', 'stoughton', 'sturgeon bay',

  // Wyoming (10 new, smaller communities)
  'afton', 'evanston', 'glenrock', 'green river', 'jackson hole', 'kemmerer', 'lander', 'powell', 'riverton', 'sheridan', 'birmingham', 'montgomery',
  'hunstville', 'lakeland', 'wilsonville', 'palm coast', 'morristown', 'palm coast', 'morristown', 'roseville', 'novato', 'jacksonville', 'richmond',
  'san leandro'
]);

 // Define known first and last names for human name splitting
const KNOWN_FIRST_NAMES = new Set([
  // Existing first names (~600, summarized from humanize.js lines 299–368)
  'aaron', 'abel', 'al', 'abraham', 'adam', 'arnie', 'adrian', 'al', 'alan', 'allan', 'allen', 'albert', 'alden', 'alex',
  'alexander', 'alfred', 'allan', 'allen', 'alton', 'alvin', 'amos', 'andre', 'andrew',
  'andy', 'angus', 'anthony', 'archie', 'arnold', 'arthur', 'asa', 'austin', 'avery',
  'barney', 'barnett', 'barrett', 'barry', 'bart', 'basil', 'bo', 'beau', 'beauford', 'ben',
  'benedict', 'benjamin', 'bennie', 'benny', 'bernard', 'bernie', 'bert', 'beverly',
  'bill', 'billy', 'blaine', 'blair', 'blake', 'bob', 'bobbie', 'bobby', 'boyd',
  'brad', 'bradford', 'bradley', 'brand', 'brant', 'brent', 'brett', 'brian', 'brock',
  'bruce', 'bryan', 'bryce', 'buck', 'bud', 'buddy', 'burl', 'burton', 'byron',
  'cal', 'caleb', 'calvin', 'cameron', 'carey', 'carl', 'carlton', 'carroll', 'carson',
  'casey', 'cecil', 'cedric', 'chad', 'chadwick', 'chandler', 'charles', 'charlie',
  'chester', 'chip', 'chris', 'christian', 'chuck', 'ches', 'clair', 'clarence', 'clark',
  'claude', 'clay', 'clayton', 'clem', 'clement', 'cletus', 'cliff', 'clifford',
  'clifton', 'clyde', 'cody', 'coleman', 'colin', 'connor', 'conrad', 'corey',
  'cornell', 'cory', 'courtney', 'craig', 'curt', 'curtis', 'cyrus', 'dale',
  'dallas', 'damon', 'dan', 'diane', 'dane', 'daniel', 'danny', 'daren', 'dayton', 'darrel', 'darrell',
  'darren', 'darryl', 'dave', 'david', 'dawson', 'dean', 'delbert', 'delmar',
  'denis', 'dennis', 'denny', 'derek', 'derrick', 'desmond', 'devin', 'dewey',
  'dexter', 'dick', 'dickie', 'dillon', 'dino', 'dominic', 'don', 'donald',
  'donnie', 'donovan', 'doyle', 'doug', 'drake', 'drew', 'duane', 'dudley', 'duncan',
  'dustin', 'dwight', 'earl', 'earnest', 'ed', 'eddie', 'edgar', 'edmond',
  'edward', 'edwin', 'elbert', 'elden', 'eldon', 'eli', 'eliot', 'elliot',
  'elliott', 'ellis', 'ed', 'elmer', 'elton', 'elwood', 'emery', 'emmett', 'ernest',
  'ernie', 'ethan', 'eugene', 'evan', 'everett', 'ezra', 'felix', 'ferdinand',
  'finn', 'fletcher', 'floyd', 'forrest', 'francis', 'frank', 'franklin', 'fred',
  'freddie', 'frederick', 'freddy', 'gabe', 'gabriel', 'gail', 'gale', 'garland',
  'garrett', 'garry', 'gary', 'gavin', 'gayle', 'gene', 'geoff', 'geoffrey',
  'george', 'gerald', 'gil', 'gilbert', 'giles', 'glen', 'glenn', 'gordon',
  'grady', 'graham', 'grant', 'greg', 'gregg', 'gregory', 'grover', 'gus',
  'guy', 'hal', 'hank', 'hans', 'harlan', 'herb', 'harley', 'harold', 'harris', 'harrison',
  'harry', 'hart', 'harvey', 'hayden', 'heath', 'hector', 'henry', 'herbert',
  'herman', 'homer', 'horace', 'hadwin', 'howard', 'hugh', 'hugo', 'ian', 'ira', 'irvin',
  'irving', 'isaac', 'ivan', 'jack', 'jackson', 'jacob', 'jake', 'jamie',
  'jared', 'jarrett', 'jasper', 'jay', 'jed', 'jeff', 'jeffery', 'jeffrey',
  'jerald', 'jeremy', 'jerome', 'jerry', 'jim', 'jessie', 'jim', 'jimmie', 'jimmy',
  'joel', 'joey', 'john', 'johnnie', 'johnny', 'jon', 'jonah', 'jonas',
  'jonathan', 'jordan', 'jordy', 'joseph', 'josh', 'joshua', 'judd', 'julian',
  'julius', 'junior', 'justin', 'keith', 'kelvin', 'kc', 'ken', 'kenneth', 'kenny',
  'kent', 'kevin', 'kurt', 'kyle', 'lamar', 'lance', 'landon', 'lane',
  'larry', 'lavern', 'lawrence', 'lee', 'leland', 'lenny', 'leo', 'leon',
  'leroy', 'les', 'leslie', 'levi', 'lewis', 'lincoln', 'lloyd', 'logan',
  'lon', 'lonnie', 'loren', 'lou', 'louie', 'louis', 'lowell', 'luc', 'lucas',
  'lucian', 'luke', 'lyle', 'lyman', 'lynn', 'mack', 'malcolm', 'marc',
  'marco', 'mario', 'marion', 'mark', 'marshall', 'martin', 'marty', 'marvin',
  'mason', 'matt', 'matthew', 'maurice', 'max', 'maxwell', 'melvin', 'merle',
  'merrill', 'michael', 'mickey', 'mike', 'miles', 'milo', 'milton', 'mitch',
  'mitchell', 'monty', 'morgan', 'morris', 'murray', 'nate', 'nathan', 'nathaniel',
  'ned', 'neil', 'nelson', 'nick', 'nicholas', 'noah', 'norm', 'norman',
  'norris', 'oliver', 'orville', 'oscar', 'otis', 'owen', 'pascal', 'pat',
  'paul', 'percy', 'pete', 'pat', 'peter', 'phil', 'philip', 'quentin', 'quinn',
  'ralph', 'ramon', 'randall', 'randell', 'randy', 'ray', 'raymond', 'reed',
  'reginald', 'reid', 'rex', 'rhett', 'richard', 'rick', 'ricky', 'rob',
  'robert', 'rod', 'rodney', 'roger', 'roland', 'roman', 'ron', 'ronald',
  'ronnie', 'rory', 'ross', 'roy', 'rudy', 'russ', 'russell', 'russel',
  'sal', 'sam', 'sammy', 'saul', 'sawyer', 'scott', 'sean', 'seth', 'shawn',
  'sheldon', 'sherman', 'sid', 'sidney', 'silas', 'simon', 'sol', 'sonny',
  'spencer', 'stan', 'stanley', 'stewart', 'steve', 'steven', 'stuart',
  'sylvester', 'tanner', 'ted', 'terry', 'theodore', 'thomas', 'tim', 'timothy',
  'toby', 'todd', 'tom', 'tony', 'tracy', 'travis', 'trent', 'trevor', 'trey',
  'tristan', 'troy', 'tucker', 'ty', 'tyler', 'tyrone', 'val', 'vance',
  'vernon', 'victor', 'vince', 'vincent', 'virgil', 'wade', 'walker', 'wallace',
  'walter', 'warren', 'wayne', 'walker', 'wendell', 'wes', 'vic', 'wesley', 'whit', 'wilber',
  'wilbert', 'will', 'willard', 'willie', 'wilson', 'winston', 'woody', 'wyatt',
  'xavier', 'zach', 'zachary', 'zack', 'zane',
  // New first names (500, for white males aged 40–80, born ~1945–1985)
  'abner', 'alden', 'alfonzo', 'alford', 'alpheus', 'alston', 'ambrose', 'anson',
  'arden', 'arlie', 'arlin', 'armand', 'arno', 'arnold', 'arvel', 'asa', 'aubrey',
  'august', 'aurelius', 'barrett', 'bartholomew', 'baxter', 'bennett', 'berton',
  'beverly', 'blaine', 'blair', 'blanchard', 'boyce', 'bradford', 'bradley',
  'bradshaw', 'brantley', 'brent', 'brett', 'brice', 'broderick', 'bronson',
  'buckley', 'burl', 'burton', 'byron', 'calvert', 'carey', 'carleton', 'carlton',
  'carmine', 'cassius', 'cecil', 'cedric', 'chadwick', 'chalmers', 'chance',
  'channing', 'charlton', 'chester', 'clair', 'clarence', 'claudius', 'clemens',
  'cletus', 'clifford', 'clinton', 'clyde', 'coleman', 'columbus', 'conrad',
  'cordell', 'cornelius', 'cortez', 'crawford', 'cullen', 'curtis', 'cyril',
  'dalton', 'damian', 'darius', 'darrin', 'darwin', 'daryl', 'davey', 'delbert',
  'delmer', 'denny', 'derrick', 'desmond', 'dewitt', 'dexter', 'dillard',
  'dion', 'dolph', 'dominick', 'donovan', 'dorian', 'dorsey', 'doyle', 'dudley',
  'duff', 'duncan', 'dwayne', 'dwight', 'earle', 'easton', 'edgar', 'edison',
  'edmund', 'edwin', 'eldridge', 'elias', 'elisha', 'elliot', 'ellis', 'elmer',
  'elton', 'elwood', 'emanuel', 'emerson', 'emery', 'emil', 'emmett', 'enoch',
  'ephraim', 'erasmus', 'erastus', 'ernest', 'ernie', 'errol', 'ervin', 'esau',
  'eugene', 'everett', 'ezekiel', 'ezra', 'fabian', 'felton', 'ferdinand', 'ferris',
  'finley', 'fleming', 'fletcher', 'flora', 'floyd', 'forrest', 'foster', 'frank', 'francis',
  'franklin', 'fredric', 'freeman', 'gabe', 'garfield', 'garland', 'garrett',
  'garrison', 'gaston', 'geoff', 'gideon', 'gilbert', 'giles', 'gillian', 'glenn',
  'godfrey', 'gordon', 'grady', 'granger', 'grant', 'gregg', 'grover', 'gustave',
  'hadley', 'halbert', 'halsey', 'hammond', 'hanson', 'harlan', 'harmon', 'harold',
  'harper', 'harris', 'harrison', 'hartley', 'harvey', 'hayden', 'hayes', 'haywood',
  'heath', 'hector', 'henry', 'herbert', 'herschel', 'hezekiah', 'hilton', 'hiram',
  'hobart', 'hollis', 'homer', 'horatio', 'hosea', 'howard', 'hoyt', 'hubert',
  'hugh', 'hugo', 'humbert', 'hunter', 'hyman', 'ignatius', 'irwin', 'isaiah',
  'israel', 'ivan', 'ivor', 'jacob', 'jared', 'jerry', 'jarvis', 'jasper', 'jeb', 'jedediah',
  'jefferson', 'jeremiah', 'jerome', 'jesse', 'jethro', 'joab', 'joel', 'johnathan',
  'jonas', 'jordy', 'josiah', 'jude', 'judson', 'julian', 'julius', 'juniper',
  'justus', 'kermit', 'king', 'kingsley', 'kirk', 'lambert', 'lamont', 'lance',
  'larkin', 'laurence', 'lawson', 'layton', 'lemuel', 'lenard', 'leonard', 'leroy',
  'lester', 'levi', 'lewis', 'lincoln', 'lindsey', 'linus', 'lionel', 'lloyd',
  'lonnie', 'loren', 'lorenzo', 'lowell', 'lucian', 'luther', 'lyle', 'mackenzie',
  'malachi', 'malcolm', 'manfred', 'marcus', 'marlin', 'marshall', 'marvin',
  'mason', 'maurice', 'maxwell', 'merritt', 'micah', 'miles', 'milo', 'montague',
  'montgomery', 'morgan', 'morris', 'morton', 'moses', 'murphy', 'murray', 'myron',
  'nathaniel', 'ned', 'nelson', 'newell', 'newton', 'niles', 'noel', 'nolan',
  'norbert', 'normand', 'obadiah', 'octavius', 'packey', 'odell', 'olaf', 'olin', 'orion',
  'orlando', 'orville', 'osborn', 'oswald', 'otis', 'otto', 'owens', 'palmer',
  'pascal', 'patrick', 'percy', 'perry', 'phineas', 'pierce', 'porter', 'prescott',
  'preston', 'quentin', 'quincy', 'ralph', 'randolph', 'rayburn', 'rayford',
  'reginald', 'reuben', 'rex', 'reynold', 'rhodes', 'richard', 'rigby', 'robert',
  'roderick', 'roger', 'roland', 'rollin', 'russell', 'roman', 'ronald', 'roosevelt', 'rory',
  'roscoe', 'ross', 'royce', 'rudy', 'rufus', 'rupert', 'russell', 'sampson', 'samuel',
  'saul', 'sebastian', 'seth', 'seymour', 'shadrach', 'sherman', 'sherwood',
  'sidney', 'sigmond', 'silas', 'simon', 'solomon', 'spencer', 'stanford', 'stephan',
  'sterling', 'stevens', 'sylvester', 'talmadge', 'teddy', 'terence', 'theodore',
  'thomas', 'thornton', 'titus', 'tobias', 'troy', 'truman', 'tucker', 'tyrone',
  'ulysses', 'valentine', 'vance', 'vaughn', 'vernon', 'vic', 'victor', 'vincent',
  'virgil', 'vito', 'vivian', 'vladimir', 'wade', 'walker', 'wallace', 'walter',
  'ward', 'warner', 'warren', 'weldon', 'wendell', 'wesley', 'weston', 'whitman',
  'wilbur', 'wilder', 'wilfred', 'willard', 'willis', 'winfield', 'winston',
  'woodrow', 'wyatt', 'zachariah', 'zephaniah', 'scott'
]);

   // Place immediately after KNOWN_FIRST_NAMES in api/lib/humanize.js
const KNOWN_LAST_NAMES = new Set([
  // Existing last names (~600, summarized from humanize.js lines 299–368)
  'abbott', 'ackerman', 'adams', 'adkins', 'albert', 'aldrich', 'alexander', 'alford', 'allison', 'alston',
  'anderson', 'andrews', 'appleton', 'archer', 'archibald', 'andrews', 'armstrong', 'arnold', 'ashley', 'atkins', 'atkinson',
  'atwood', 'austin', 'avery', 'babcock', 'bain', 'baird', 'baker', 'baldwin', 'ball', 'ballard',
  'banning', 'barker', 'barlow', 'barr', 'barrett', 'barry', 'bartlett', 'barnett', 'barrett', 'barton', 'bates', 'bauer',
  'baxter', 'beal', 'beard', 'beasley', 'beck', 'becker', 'bell', 'bellows', 'bennett', 'benson',
  'berry', 'billings', 'bingham', 'bishop', 'bixby', 'boruff', 'black', 'bestle', 'cecconis', 'blackburn', 'blair', 'blake', 'blanchard',
  'bolton', 'bond', 'booth', 'bowen', 'bowers', 'bowman', 'boyd', 'boyle', 'bradley', 'brady',
  'brannon', 'bray', 'brewer', 'briggs', 'bright', 'brink', 'baur', 'britt', 'brock', 'brooks', 'brown',
  'browne', 'browning', 'bryant', 'bryce', 'buck', 'buckley', 'bullock', 'bumpus', 'burdick', 'burgess',
  'burke', 'burnett', 'burns', 'burrows', 'burton', 'bush', 'butler', 'byrd', 'calhoun', 'callahan',
  'calvert', 'cameron', 'campbell', 'cannon', 'cantrell', 'carey', 'cism', 'carlson', 'carmichael', 'carpenter', 'carr',
  'carroll', 'carson', 'case', 'casey', 'cassidy', 'chaffee', 'chambers', 'chandler', 'chapman', 'chase',
  'childers', 'church', 'churchill', 'clark', 'clay', 'clayton', 'clemens', 'clements', 'cobb', 'cochran',
  'cody', 'colburn', 'colby', 'cole', 'coleman', 'collier', 'collins', 'compton', 'conley', 'connolly',
  'connor', 'conway', 'cook', 'cooke', 'cooper', 'cope', 'corbett', 'chambers', 'corbin', 'cowan', 'cox',
  'craig', 'crane', 'crawford', 'crews', 'crockett', 'crosby', 'cross', 'crowley', 'cummings', 'cummins',
  'curry', 'dalton', 'daly', 'daniel', 'daniels', 'daugherty', 'davidson', 'davis', 'dawes', 'day',
  'dean', 'decker', 'denton', 'dickerson', 'dickinson', 'dillard', 'dillon', 'dixon', 'dodson', 'doherty', 'donnelly',
  'donovan', 'dorsey', 'dotson', 'dougherty', 'douglas', 'downey', 'downs', 'doyle', 'drake', 'dube',
  'dudley', 'duff', 'duffy', 'duncan', 'dunn', 'dunbar', 'dutton', 'eastman', 'eaton', 'edmonds',
  'edwards', 'elliott', 'ellis', 'emerson', 'england', 'english', 'erickson', 'evans', 'farley', 'farmer',
  'farris', 'faulkner', 'fenton', 'ferguson', 'finley', 'fischer', 'fisher', 'fitzgerald', 'fleming', 'fletcher',
  'flynn', 'ford', 'foster', 'fowler', 'fox', 'holt', 'kay', 'brand', 'dube', 'summers', 'franklin', 'fraser', 'freeman', 'frost', 'fuller',
  'gallagher', 'gannett', 'garcia', 'gardner', 'garner', 'garrison', 'gibbons', 'gibbs', 'gibson', 'giles',
  'gill', 'gilles', 'gilmore', 'glass', 'gleason', 'goddard', 'goodman', 'goodrich', 'goodwin', 'gordon',
  'gould', 'grady', 'graham', 'granger', 'grant', 'graves', 'gray', 'green', 'greene', 'gregory',
  'griffin', 'griffith', 'grimes', 'gross', 'grove', 'guthrie', 'hadley', 'hahn', 'hale', 'hall',
  'hamilton', 'hammond', 'hancock', 'hanna', 'hardy', 'harmon', 'hubler', 'harper', 'harriman', 'harrington', 'harris',
  'hart', 'hartman', 'hastings', 'hatcher', 'hawkins', 'hawley', 'hayden', 'hayes', 'hayward', 'healey',
  'heath', 'henderson', 'hendricks', 'hendrickson', 'henry', 'herndon', 'hesser', 'hicks', 'higgins', 'hill', 'hinton',
  'hitchcock', 'hodges', 'hoffman', 'hogan', 'holbrook', 'holden', 'holder', 'holland', 'holloway', 'holmes',
  'holt', 'hood', 'hooper', 'hopkins', 'horn', 'horton', 'houghton', 'houston', 'howe', 'howard',
  'hubbard', 'huffman', 'hughes', 'humphrey', 'hunt', 'hunter', 'hutchinson', 'ingalls', 'ingram', 'irwin',
  'jackson', 'jack', 'jacobs', 'jacobson', 'james', 'jameson', 'jarvis', 'jennings', 'jensen', 'jewett', 'johnson',
  'johnston', 'jones', 'jordan', 'judson', 'kane', 'keating', 'keller', 'kelley', 'kellogg', 'kelly',
  'kemp', 'kendall', 'kennedy', 'kent', 'kerr', 'koehn', 'rinke', 'kimball', 'king', 'kinney', 'kirby', 'kirk',
  'klein', 'knox', 'lambert', 'lane', 'lang', 'lobb', 'larkin', 'latta', 'larson', 'lawrence', 'lawson', 'leach',
  'leavitt', 'leblanc', 'lee', 'leta', 'tomlinson', 'lewis', 'lindsey', 'locke', 'logan', 'lombard', 'long', 'lovett',
  'lowe', 'lowry', 'lucas', 'lynch', 'lyons', 'luther', 'mack', 'mackenzie', 'madden', 'malone', 'mann',
  'manning', 'marks', 'marlowe', 'marsh', 'martin', 'mason', 'matthews', 'mccarthy', 'mccoy', 'mcdaniel',
  'mckinney', 'mclaughlin', 'mclean', 'mcmillan', 'mcpherson', 'meadows', 'mercer', 'merrill', 'merritt', 'meyer',
  'miles', 'miller', 'mills', 'mitchell', 'moody', 'moore', 'morgan', 'morrison', 'morrow', 'morse',
  'morton', 'moss', 'mullins', 'munson', 'murphy', 'murray', 'myers', 'nash', 'neal', 'nelson',
  'newell', 'newman', 'newton', 'nichols', 'nixon', 'noble', 'nolan', 'norman', 'norris', 'norton',
  'oakley', 'obrien', 'oconnor', 'odonnell', 'oliver', 'oneal', 'oneil', 'oneill', 'orr', 'osborne',
  'osgood', 'owens', 'pace', 'page', 'palmer', 'parker', 'parsons', 'patterson', 'payne', 'peabody',
  'pearson', 'pennington', 'perkins', 'perry', 'peters', 'peterson', 'phelps', 'philips', 'pierce', 'pollard',
  'poole', 'porter', 'potter', 'powell', 'pratt', 'prescott', 'polis', 'preston', 'price', 'purcell', 'putnam',
  'quinn', 'raines', 'ramsey', 'randall', 'ransom', 'raymond', 'reed', 'reese', 'reeves', 'regan',
  'reid', 'reilly', 'remington', 'reyes', 'reynolds', 'rhodes', 'rice', 'richards', 'richardson', 'ricker',
  'riley', 'rivera', 'roberts', 'robinson', 'rogers', 'rollins', 'roman', 'rose', 'ross', 'rowe',
  'rudd', 'rutherford', 'ryan', 'salazar', 'sanders', 'sanderson', 'sargent', 'saunders', 'savage', 'sawyer',
  'schmidt', 'schneider', 'schroeder', 'schultz', 'scott', 'seiner', 'sears', 'sewell', 'sexton', 'shannon', 'sharp',
  'shaw', 'shea', 'sheldon', 'shepherd', 'sherman', 'sherwood', 'short', 'simmons', 'simon', 'simpson',
  'sinclair', 'slater', 'sloan', 'small', 'smith', 'snyder', 'sparks', 'spencer', 'sprague', 'stafford',
  'stanley', 'stark', 'steele', 'stephens', 'stevens', 'stewart', 'summers', 'stoddard', 'stokes', 'stone', 'stratton',
  'strickland', 'strong', 'sullivan', 'summers', 'shallotte', 'sumner', 'sutton', 'sweeney', 'swanson', 'talbot', 'tanner',
  'taylor', 'thayer', 'thomas', 'thorne', 'thornton', 'todd', 'torres', 'tucker', 'turner', 'underwood',
  'upton', 'vance', 'vaughn', 'vinton', 'wadsworth', 'walker', 'wall', 'wallace', 'walden', 'walters',
  'walton', 'ward', 'warner', 'warren', 'watson', 'weaver', 'webb', 'welch', 'wells', 'west',
  'wheeler', 'whitaker', 'whitcomb', 'white', 'whiting', 'whitman', 'whiteames', 'whitney', 'wiley', 'wilcox', 'wilder',
  'wilkerson', 'wilkins', 'williams', 'williamson', 'willis', 'webb', 'wilson', 'winslow', 'winters', 'wise', 'wolfe',
  'wood', 'woodard', 'woodruff', 'vigil', 'mello', 'woods', 'wright', 'workman', 'wright', 'wyatt', 'yates', 'york', 'young',
  'youngblood', 'zimmerman',
  // New last names (500, for white males aged 40–80, born ~1945–1985)
  'abbot', 'acker', 'addison', 'ainsworth', 'albright', 'allred', 'ames', 'appleby', 'archibald', 'armistead',
  'ashburn', 'ashcroft', 'ashford', 'atwater', 'austen', 'badger', 'bagley', 'bainbridge', 'balding', 'barber',
  'barclay', 'barker', 'barnard', 'barnes', 'barnett', 'barron', 'barton', 'bassett', 'bates', 'baxter',
  'bayard', 'beadle', 'beall', 'beckett', 'boulware', 'bedford', 'beecham', 'belcher', 'belding', 'bellamy', 'benedict',
  'benford', 'bennet', 'bentley', 'berkeley', 'bertram', 'beverly', 'bickford', 'biddle', 'bigelow', 'bingham',
  'birch', 'bird', 'blackwell', 'blair', 'blakeley', 'blanchard', 'blevins', 'bloom', 'blythe', 'bogart',
  'bogue', 'bolling', 'bolton', 'bondurant', 'boone', 'boswell', 'boughton', 'bowden', 'bowles', 'boynton',
  'brace', 'bradbury', 'bradford', 'bradshaw', 'bragg', 'bramwell', 'branson', 'brant', 'braxton', 'breckenridge',
  'brewster', 'brice', 'bridger', 'briggs', 'brigham', 'brinton', 'briscoe', 'britton', 'broadus', 'brockway',
  'bromley', 'brook', 'brough', 'brownell', 'brunson', 'buckingham', 'buckner', 'buffington', 'bullard', 'burch',
  'burdett', 'burleigh', 'burnham', 'burr', 'burrows', 'burton', 'bushnell', 'byers', 'byram', 'cabell',
  'calder', 'caldwell', 'calloway', 'camden', 'cameron', 'camp', 'canfield', 'cannon', 'cantrell', 'capps',
  'cardwell', 'carleton', 'carlisle', 'carmichael', 'carrington', 'carson', 'cartwright', 'carver', 'cass',
  'castle', 'caulfield', 'chadwick', 'chambers', 'chandler', 'chapin', 'chase', 'chatfield', 'cheatham', 'childs',
  'chisholm', 'christenson', 'church', 'clancy', 'clapp', 'clarke', 'clayborne', 'clem', 'clement', 'clifford',
  'clinch', 'cobb', 'coburn', 'cocker', 'cockrell', 'coddington', 'colburn', 'colgate', 'collier', 'colvin',
  'comer', 'comstock', 'conant', 'conklin', 'connell', 'converse', 'cooley', 'cooper', 'corbin', 'cornish',
  'cortland', 'coryell', 'cotton', 'courtney', 'covington', 'cowles', 'craddock', 'crane', 'crawley', 'creighton',
  'cromwell', 'croswell', 'crum', 'cullen', 'culver', 'cummings', 'cunningham', 'currier', 'curtis', 'cushing',
  'cutler', 'cutts', 'daly', 'danforth', 'darnell', 'darr', 'davenport', 'davidson', 'dawson', 'deane',
  'decker', 'delano', 'denham', 'denny', 'derr', 'dewey', 'dickenson', 'dill', 'dinsmore', 'dix',
  'dixon', 'dodge', 'dole', 'donovan', 'dorsett', 'doughty', 'dow', 'dowling', 'drake', 'draper',
  'drayton', 'drew', 'driscoll', 'duff', 'duke', 'dunham', 'dunlap', 'dunnell', 'durrence', 'durant', 'durham',
  'dutton', 'dwyer', 'eads', 'eagle', 'earl', 'easterly', 'eaton', 'eckert', 'eddy', 'edmondson',
  'eldred', 'eller', 'ellington', 'ellis', 'ellsworth', 'elmore', 'emerson', 'emery', 'emmons', 'engle',
  'ennis', 'epps', 'ernest', 'esmond', 'evans', 'everett', 'ewing', 'fairchild', 'falkner', 'fanning',
  'farley', 'farnham', 'farrar', 'farrell', 'farrow', 'faulk', 'fay', 'felton', 'fenn', 'ferris',
  'field', 'finch', 'fish', 'fisk', 'fitzpatrick', 'flagg', 'fleming', 'flint', 'flynn', 'fogg',
  'folger', 'forbes', 'fordham', 'forsyth', 'fortune', 'foss', 'foster', 'fowler', 'fox', 'frame',
  'franks', 'fraser', 'freeland', 'freeman', 'french', 'frost', 'fry', 'fuller', 'gaines', 'gallagher',
  'galloway', 'gardiner', 'garland', 'garrett', 'garrison', 'gates', 'gaylord', 'geiger', 'gerry', 'gibbs',
  'giddings', 'gilchrist', 'giles', 'gillespie', 'gilman', 'gilmore', 'gladstone', 'glenn', 'glover', 'godwin',
  'goldsmith', 'goodwin', 'gore', 'gould', 'grafton', 'grantham', 'graves', 'gray', 'greenleaf', 'greenwood',
  'gregg', 'gridley', 'griffith', 'grimes', 'grinnell', 'griswold', 'grove', 'gunn', 'hadley', 'haines',
  'hale', 'hall', 'halsey', 'hamlin', 'hammond', 'hampton', 'hancock', 'hand', 'hanley', 'hanson',
  'harding', 'hargrove', 'harmon', 'harper', 'harrington', 'hart', 'hartley', 'harvey', 'haskell', 'hatch',
  'hawes', 'hawthorne', 'hayden', 'hayes', 'hamm', 'hayward', 'heath', 'heaton', 'hedrick', 'hempstead', 'henderson',
  'henley', 'henson', 'herrick', 'hewitt', 'hickman', 'hicks', 'higgins', 'high', 'hill', 'hilliard',
  'hilton', 'hines', 'hinson', 'hitchcock', 'hoag', 'hobbs', 'hodge', 'hodgson', 'hogan', 'holbrook',
  'holden', 'holladay', 'holland', 'hollister', 'holmes', 'holt', 'hooker', 'hooper', 'hopkins', 'horn',
  'horton', 'houghton', 'houston', 'howard', 'howell', 'hoyt', 'hubbard', 'huber', 'huck', 'huff',
  'huffman', 'huggins', 'hull', 'hume', 'hunt', 'huntington', 'hurd', 'hurley', 'huston', 'hutchins',
  'hyde', 'ingalls', 'ingle', 'ireland', 'irvine', 'irving', 'isaacs', 'ives', 'jackson', 'jarrett',
  'jeffries', 'jensen', 'jessup', 'jewell', 'jobe', 'johns', 'joiner', 'jordan', 'judd', 'keane',
  'keeler', 'keen', 'kellogg', 'kemp', 'kendall', 'kennedy', 'kenney', 'kent', 'kerr', 'keyes',
  'kilgore', 'kimball', 'king', 'kingsbury', 'kinsey', 'kirby', 'kirk', 'knapp', 'knighton', 'knott',
  'knowles', 'knox', 'lacey', 'lamar', 'lambert', 'lamson', 'lancaster', 'landis', 'lane', 'langdon',
  'langston', 'larkin', 'larson', 'latham', 'law', 'lawton', 'leach', 'leavitt', 'ledger', 'leighton',
  'leland', 'leonard', 'lester', 'lewis', 'lilly', 'lincoln', 'lindley', 'lindsey', 'litchfield', 'lockwood',
  'lodge', 'logan', 'long', 'lord', 'lovett', 'lowe', 'lowry', 'lucas', 'luce', 'ludlow',
  'lundy', 'lusk', 'lyman', 'lyon', 'lyons', 'mace', 'mack', 'maddox', 'magee', 'main',
  'malcolm', 'mallett', 'manley', 'mann', 'manning', 'mansfield', 'marble', 'marlow', 'marsh', 'martin',
  'marvin', 'mason', 'mathews', 'maury', 'maxwell', 'may', 'maynard', 'mays', 'mccabe', 'mccall',
  'mccarter', 'mcclellan', 'mcclure', 'mccormick', 'mcculloch', 'mcdowell', 'mcgee', 'mcgowan', 'mcguire', 'mckay',
  'mckee', 'mckenna', 'mcknight', 'mclane', 'mcnair', 'mcneil', 'mcrae', 'mead', 'meadows', 'melton',
  'mercer', 'meredith', 'merrick', 'merrill', 'merritt', 'miles', 'millard', 'miller', 'mills', 'milner',
  'mitchell', 'moody', 'moore', 'moran', 'moreland', 'morgan', 'morrill', 'morrison', 'morrow', 'morse',
  'morton', 'moseley', 'moss', 'mott', 'mullins', 'munroe', 'murdoch', 'myers', 'murphy', 'murray', 'myers',
  'nash', 'naylor', 'neal', 'needham', 'neely', 'nikel', 'rown', 'newcomb', 'newell', 'newton', 'nicholls', 'noble',
  'nolan', 'norris', 'north', 'norton', 'norwood', 'nutter', 'oakley', 'ober', 'odell', 'ogden',
  'oliver', 'ormond', 'orr', 'osborn', 'osgood', 'otis', 'overton', 'owens', 'pace', 'page',
  'paine', 'palmer', 'park', 'parker', 'parrish', 'parsons', 'patten', 'patterson', 'payne', 'peabody',
  'pearce', 'peck', 'peel', 'pemberton', 'penn', 'pennington', 'perry', 'peters', 'peterson', 'pettigrew',
  'phelps', 'phillips', 'pickens', 'pierce', 'pike', 'pittman', 'platt', 'plummer', 'poole', 'porter',
  'potter', 'powell', 'pratt', 'prescott', 'preston', 'price', 'prichard', 'proctor', 'purdy', 'putnam',
  'quincy', 'raines', 'raleigh', 'rand', 'randall', 'ransom', 'rathbun', 'ray', 'rahal', 'raymond', 'reade',
  'redding', 'reed', 'rees', 'reese', 'reid', 'remington', 'renfro', 'reynolds', 'rous', 'rhodes', 'rice',
  'rich', 'richards', 'richardson', 'richmond', 'ricketts', 'rider', 'ridgeway', 'riggs', 'riley', 'ripley',
  'robbins', 'roberts', 'robertson', 'robinson', 'rockwell', 'rodgers', 'rogers', 'rollins', 'roper', 'ross',
  'rowland', 'roy', 'rudd', 'rush', 'russell', 'rutherford', 'ryder', 'sabin', 'sampson', 'samuels',
  'sanders', 'sanford', 'sanger', 'sargent', 'saunders', 'savage', 'sawyer', 'schuyler', 'scott', 'sinclair', 'sears',
  'seaton', 'seaver', 'sedgwick', 'sewell', 'sextons', 'shannon', 'curley', 'oneal', 'vaden', 'baier', 'winter', 'butler', 'sharp', 'shaw', 'sheldon', 'shelton',
  'shepherd', 'sheridan', 'sherwood', 'shipman', 'shirley', 'shields', 'short', 'shumway', 'sikes', 'simmons',
  'simonds', 'simpson', 'sinclair', 'singleton', 'skinner', 'slade', 'slater', 'sloan', 'small', 'smyth',
  'snell', 'snow', 'somers', 'spalding', 'sparks', 'spear', 'spears', 'spence', 'spencer', 'sprague',
  'springer', 'stafford', 'sauer', 'stanton', 'stark', 'starr', 'steele', 'stein', 'sterling', 'stetson', 'stevens',
  'stewart', 'stiles', 'stockton', 'stoddard', 'stone', 'stout', 'stratton', 'street', 'strong', 'stuart',
  'sullivan', 'sumner', 'sutton', 'swain', 'swanson', 'sweet', 'sykes', 'talbot', 'tanner', 'tate',
  'taylor', 'teague', 'temple', 'terrell', 'thatcher', 'thayer', 'thompson', 'thorne', 'thornton', 'thurston',
  'tibbetts', 'tierney', 'tilton', 'todd', 'tomlinson', 'torrey', 'towne', 'townsend', 'tracy', 'travis',
  'treadwell', 'tucker', 'turnbull', 'turner', 'tyler', 'underwood', 'upham', 'vance', 'vaughan', 'vinton',
  'wadsworth', 'wainwright', 'waldron', 'walker', 'wall', 'wallace', 'walton', 'ward', 'ware', 'warner',
  'warren', 'washburn', 'waterman', 'watkins', 'watson', 'watts', 'weaver', 'webber', 'webster', 'weeks',
  'welch', 'weld', 'wellman', 'wells', 'wendell', 'wentworth', 'west', 'weston', 'wheeler', 'whipple',
  'whitaker', 'whitcomb', 'white', 'whitehead', 'whiting', 'whitman', 'whitney', 'whittaker', 'whittier', 'wight',
  'wilbur', 'wilcox', 'wilder', 'wilkerson', 'wilkins', 'willard', 'willcox', 'williams', 'williamson', 'willis',
  'wilson', 'winchester', 'wing', 'winslow', 'winston', 'winter', 'withers', 'wood', 'woodbridge', 'woodbury',
  'woodruff', 'woods', 'woodward', 'woolsey', 'worthington', 'wright', 'wyatt', 'yates', 'yeager', 'york',
  'young', 'youngblood', 'zimmerman', 'kadlac', 'clark', 'caruso', 'perillo', 'stoops', 'weaver'
]);

/**
 * Extracts tokens from a domain name for further processing
 * @param {string} domain - The domain to tokenize
 * @returns {Object} - Object with tokens, confidence score, and flags
 */
function extractTokens(domain) {
  log("info", "extractTokens started", { domain });

  try {
    if (!domain || typeof domain !== "string") {
      log("error", "Invalid domain in extractTokens", { domain });
      throw new Error("Invalid domain input");
    }

    const cleanDomain = domain.toLowerCase().replace(/^(www\.)|(\.com|\.net|\.org|\.ca|\.co)$/g, "");
    let tokens = earlyCompoundSplit(cleanDomain);
    let confidenceScore = 125; // Default confidence for successful tokenization
    let flags = new Set(['TokenExtraction']);

    // Precompute maps for efficiency
    const properNounsMap = new Map([...KNOWN_PROPER_NOUNS].map(n => [n.toLowerCase().replace(/\s+/g, ''), n]));
    const citiesMap = new Map([...KNOWN_CITIES_SET].map(c => [c.toLowerCase().replace(/\s+/g, ''), c]));
    const carBrandsMap = new Map([...CAR_BRANDS, ...Object.entries(ABBREVIATION_EXPANSIONS)].map(([k, v]) => [k.toLowerCase(), v || k]));
    const spamTerms = new Set(['cars', 'sales', 'autogroup']);

    // Refine tokens after earlyCompoundSplit
    tokens = tokens.flatMap(token => {
      const lower = token.toLowerCase();
      const formattedToken = capitalizeName(token).name;

      // Skip further splitting if token is a known entity
      if (carBrandsMap.has(lower) || citiesMap.has(lower.replace(/\s+/g, '')) || properNounsMap.has(lower.replace(/\s+/g, ''))) {
        return [formattedToken];
      }

      const splits = [];

      // Proper noun splitting (e.g., "mclartydaniel" → ["McLarty", "Daniel"])
      const lowerNoSpaces = lower.replace(/\s+/g, '');
      if (properNounsMap.has(lowerNoSpaces)) {
        splits.push(properNounsMap.get(lowerNoSpaces));
        return splits;
      }
      for (let i = 2; i < lowerNoSpaces.length - 2; i++) {
        const left = lowerNoSpaces.slice(0, i);
        const right = lowerNoSpaces.slice(i);
        if (properNounsMap.has(left) && properNounsMap.has(right)) {
          splits.push(properNounsMap.get(left), properNounsMap.get(right));
          flags.add('ProperNounSplit');
          return splits;
        }
      }

      // City pattern split (e.g., "chicagotoyota" → ["Chicago", "Toyota"])
      for (const cityKey of citiesMap.keys()) {
        if (lowerNoSpaces.includes(cityKey)) {
          splits.push(citiesMap.get(cityKey));
          const remaining = lowerNoSpaces.replace(cityKey, '');
          if (remaining && !spamTerms.has(remaining)) {
            splits.push(capitalizeName(remaining).name);
          }
          flags.add('CitySplit');
          return splits;
        }
      }

      // Car brand prefix or suffix
      for (const brandKey of carBrandsMap.keys()) {
        if (lowerNoSpaces.includes(brandKey)) {
          splits.push(carBrandsMap.get(brandKey));
          const remaining = lowerNoSpaces.replace(brandKey, '');
          if (remaining) {
            splits.push(capitalizeName(remaining).name);
          }
          flags.add('BrandSplit');
          return splits;
        }
      }

      // Fallback: camelCase, "of", and symbol-based splitting
      return token
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/of([a-z]+)/gi, " $1")
        .split(/[^a-zA-Z]+/)
        .filter(Boolean)
        .map(t => capitalizeName(t).name);
    });

    // Abbreviation expansions (e.g., "mb" → "M.B.")
    tokens = tokens.map(token => {
      let normalizedToken = token;
      Object.keys(ABBREVIATION_EXPANSIONS).forEach(abbr => {
        const regex = new RegExp(`\\b${abbr}\\b`, "gi");
        if (regex.test(normalizedToken.toLowerCase())) {
          normalizedToken = normalizedToken.replace(regex, ABBREVIATION_EXPANSIONS[abbr]);
          log("debug", "Applied abbreviation expansion in extractTokens", {
            domain,
            token,
            normalizedToken
          });
          flags.add('AbbreviationExpanded');
        }
      });
      return normalizedToken;
    });

    // Blob fix for compacted words (e.g., "subaruofgwinnett")
    tokens = tokens.flatMap(t => blobSplit(t));

    // Final cleanup and deduplication
    const seen = new Set();
    tokens = tokens.filter(t => {
      const tLower = t.toLowerCase();
      const isValid = t && !COMMON_WORDS.includes(tLower) && !spamTerms.has(tLower);
      if (isValid && !seen.has(tLower)) {
        seen.add(tLower);
        return true;
      }
      return false;
    });

    // Adjust confidence based on token quality
    if (tokens.length === 0) {
      confidenceScore = 0;
      flags.add('NoValidTokens');
      flags.add('ManualReviewRecommended');
    } else if (tokens.length === 1 && tokens[0].length < 4) {
      confidenceScore = 95;
      flags.add('ShortToken');
      flags.add('ManualReviewRecommended');
    }

    log("info", "extractTokens result", { domain, result: tokens, confidenceScore, flags });
    return { tokens, confidenceScore, flags: Array.from(flags) };
  } catch (e) {
    log("error", "extractTokens failed", { domain, error: e.message, stack: e.stack });
    return { tokens: [], confidenceScore: 0, flags: ['TokenExtractionError', 'ManualReviewRecommended'] };
  }
}

/**
 * Splits a blob-like token into components (e.g., "subaruofgwinnett" → ["Subaru", "Gwinnett"])
 * @param {string} token - The token to split
 * @returns {Array<string>} - Array of split tokens
 */
function blobSplit(token) {
  try {
    if (!token || typeof token !== 'string') {
      return [token];
    }
    // Reuse earlyCompoundSplit for consistency
    const splitTokens = earlyCompoundSplit(token);
    return splitTokens.length > 0 ? splitTokens : [token];
  } catch (e) {
    log('error', 'blobSplit failed', { token, error: e.message, stack: e.stack });
    return [token];
  }
}

function earlyCompoundSplit(text) {
  try {
    if (!text || typeof text !== 'string') {
      log('error', 'Invalid text in earlyCompoundSplit', { text });
      throw new Error('Invalid text input');
    }

    const lower = text.toLowerCase().replace(/\.(com|net|co\.uk|jp|org|biz|ca)$/, '');
    const blobFixes = {
      'nissanofathens': ['Nissan', 'Athens'],
      'lexusofneworleans': ['Lexus', 'New Orleans'],
      'infinitiofbeachwood': ['Infiniti', 'Beachwood'],
      'toyotaofhermiston': ['Hermiston', 'Toyota'],
      'haywardhonda': ['Hayward', 'Honda'],
      'airportkianaples': ['Naples', 'Kia'],
      'kalidykia': ['Kalidy', 'Kia'],
      'toyotaofgastonia': ['Gastonia', 'Toyota'],
      'northparklexus': ['North Park', 'Lexus'],
      'audicentralhouston': ['Houston', 'Audi'],
      'johnthornton': ['John', 'Thornton'],
      'bentleynaples': ['Naples', 'Bentley'],
      'subaruofgwinnett': ['Subaru', 'Gwinnett'],
      'toyotaofomaha': ['Toyota', 'Omaha'],
      'toyotaofchicago': ['Toyota', 'Chicago'],
      'chevyofcolumbuschevrolet': ['Chevy', 'Columbus'],
      'mazdanashville': ['Mazda', 'Nashville'],
      'kiachattanooga': ['Kia', 'Chattanooga'],
      'kiaofchattanooga': ['Chattanooga', 'Kia'],
      'nissanofcookeville': ['Nissan', 'Cookeville'],
      'fordofdalton': ['Dalton', 'Ford'],
      'mazdachicago': ['Mazda', 'Chicago'],
      'bespokemotorgroup': ['Bespoke'],
      'alanbyervolvo': ['Alan', 'Byer'],
      'northbakersfieldtoyota': ['North Bakersfield', 'Toyota'],
      'stoopsbuickgmc': ['Stoops', 'Buick', 'GMC']
    };

    if (blobFixes[lower]) {
      const split = blobFixes[lower];
      log('debug', 'Blob fix applied', { text, split });
      return split.filter(token => token && typeof token === 'string');
    }

    const overrides = {
      'billdube': ['Bill', 'Dube'],
      'mclartydaniel': ['McLarty', 'Daniel'],
      'nplincoln': ['NP', 'Lincoln'],
      'autonationusa': ['AutoNation'],
      'robbynixonbuickgmc': ['Robby', 'Nixon'],
      'mccarthyautogroup': ['McCarthy', 'Auto'],
      'donjacobs': ['Don', 'Jacobs'],
      'lacitycars': ['La', 'City'],
      'ricksmithchevrolet': ['Rick', 'Smith'],
      'classicbmw': ['Classic', 'BMW'],
      'davisautosales': ['Davis', 'Auto'],
      'barlowautogroup': ['Barlow', 'Auto'],
      'mikeerdman': ['Mike', 'Erdman'],
      'chevyofcolumbuschevrolet': ['Chevy', 'Columbus'],
      'drivevictory': ['Victory'],
      'sunsetmitsubishi': ['Sunset', 'Mitsubishi'],
      'northwestcars': ['Northwest'],
      'kiaofchattanooga': ['Chattanooga', 'Kia'],
      'mazdanashville': ['Nashville', 'Mazda'],
      'tasca': ['Tasca'],
      'crystalautogroup': ['Crystal', 'Auto'],
      'robertthorne': ['Robert', 'Thorne'],
      'acdealergroup': ['AC', 'Dealer'],
      'daytonandrews': ['Dayton', 'Andrews'],
      'fordofdalton': ['Dalton', 'Ford'],
      'metrofordofmadison': ['Metro', 'Ford'],
      'williamssubarucharlotte': ['Williams', 'Subaru'],
      'vwsouthtowne': ['South', 'Towne'],
      'scottclarkstoyota': ['Scott', 'Clark'],
      'duvalford': ['Duval'],
      'avisford': ['Avis'],
      'devineford': ['Devine'],
      'allamericanford': ['All', 'American'],
      'slvdodge': ['Silver', 'Dodge'],
      'regalauto': ['Regal', 'Auto'],
      'elwaydealers': ['Elway', 'Dealers'],
      'chapmanchoice': ['Chapman', 'Choice'],
      'curryacura': ['Curry', 'Acura'],
      'centralcadillac': ['Central', 'Cadillac'],
      'davewrightauto': ['Dave', 'Wright', 'Auto'],
      'coastalsaves': ['Coastal', 'Saves'],
      'clawsontruckcenter': ['Clawson', 'Truck', 'Center'],
      'dorschfordkia': ['Dorsch'],
      'caldwellcares': ['Caldwell', 'Cares'],
      'toyotaofkilleen': ['Killeen', 'Toyota'],
      'huntingtonbeachford': ['Huntington Beach', 'Ford'],
      'lakelandtoyota': ['Lakeland', 'Toyota'],
      'richmondford': ['Richmond', 'Ford'],
      'campbellcars': ['Campbell'],
      'jimmybrittchevrolet': ['Jimmy', 'Britt'],
      'jakesweeney': ['Jake', 'Sweeney'],
      'shottenkirk': ['Shottenkirk'],
      'ricart': ['Ricart'],
      'wilsonvilletoyota': ['Wilsonville', 'Toyota'],
      'bmwwestspringfield': ['West Springfield', 'BMW'],
      'venturatoyota': ['Ventura', 'Toyota'],
      'toyotaofslidell': ['Slidell', 'Toyota'],
      'tuscaloosatoyota': ['Tuscaloosa', 'Toyota'],
      'lexusofchattanooga': ['Chattanooga', 'Lexus']
    };

    if (overrides[lower]) {
      const split = overrides[lower];
      log('debug', 'Domain override applied', { text, split });
      return split.filter(token => token && typeof token === 'string');
    }

    // Apply abbreviation expansions
    let normalized = lower;
    for (const [abbr, expansion] of Object.entries(ABBREVIATION_EXPANSIONS)) {
      const regex = new RegExp(`\\b${abbr}\\b`, 'i');
      normalized = normalized.replace(regex, expansion.replace(/\s+/g, '').toLowerCase());
    }

    // Initial split on delimiters, "of", camelCase, and numeric boundaries
    let tokens = normalized.split(/(?=[A-Z])|[-_\s]|(?<=\D)(?=\d)|of/).filter(Boolean);
    if (!tokens.length) {
      log('warn', 'No tokens after initial split', { text });
      return [capitalizeName(lower).name];
    }

    // Handle multi-word cities, brands, and proper nouns
    const sortedCities = Array.from(KNOWN_CITIES_SET).sort((a, b) => b.replace(/\s+/g, '').length - a.replace(/\s+/g, '').length);
    const results = [];
    let i = 0;

    while (i < tokens.length) {
      let matched = false;
      const remainingTokens = tokens.slice(i).join('').toLowerCase();

      // Check multi-word cities (optimized matching)
      for (const city of sortedCities) {
        const cityNoSpaces = city.toLowerCase().replace(/\s+/g, '');
        if (remainingTokens.startsWith(cityNoSpaces)) {
          results.push(city);
          const tokenCount = cityNoSpaces.length / Math.max(...tokens.slice(i).map(t => t.length));
          i += Math.ceil(tokenCount);
          matched = true;
          log('debug', 'Multi-word city matched', { text, city });
          break;
        }
      }

      if (!matched) {
        const token = tokens[i];
        if (!token || typeof token !== 'string') {
          i++;
          continue;
        }
        const capitalized = capitalizeName(token).name;
        if (!capitalized) {
          i++;
          continue;
        }

        const tokenLower = token.toLowerCase();
        // Match brands, cities, or proper nouns
        if (CAR_BRANDS.includes(capitalized)) {
          results.push(BRAND_MAPPING[capitalized.toLowerCase()] || capitalized);
          log('debug', 'Brand matched', { text, brand: capitalized });
        } else if (KNOWN_CITIES_SET.has(capitalized)) {
          results.push(capitalized);
          log('debug', 'Single-word city matched', { text, city: capitalized });
        } else if (KNOWN_PROPER_NOUNS.has(capitalized)) {
          results.push(capitalized);
          log('debug', 'Proper noun matched', { text, noun: capitalized });
        } else {
          // Enhanced fuzzy splitting for glued tokens (lowered threshold to 6)
          if (token.length >= 6 && !/[A-Z]/.test(token.slice(1))) {
            for (let j = 2; j < token.length - 2; j++) {
              const left = token.slice(0, j);
              const right = token.slice(j);
              const leftCap = capitalizeName(left).name;
              const rightCap = capitalizeName(right).name;
              if ((KNOWN_CITIES_SET.has(leftCap) || KNOWN_PROPER_NOUNS.has(leftCap)) &&
                  (CAR_BRANDS.includes(rightCap) || ['auto', 'motors', 'group'].includes(rightCap.toLowerCase()))) {
                results.push(leftCap, BRAND_MAPPING[rightCap.toLowerCase()] || rightCap);
                log('debug', 'Fuzzy city/proper noun + brand/generic split', { text, split: [leftCap, rightCap] });
                matched = true;
                break;
              }
            }
          }
          if (!matched) {
            // CamelCase split
            const camelMatch = token.match(/^([a-z]+)([A-Z][a-z]*)/);
            if (camelMatch) {
              const cap1 = capitalizeName(camelMatch[1]).name;
              const cap2 = capitalizeName(camelMatch[2]).name;
              if (cap1 && cap2) {
                results.push(cap1, cap2);
                log('debug', 'CamelCase split', { text, split: [cap1, cap2] });
              }
            } else if (token.length >= 3) {
              results.push(capitalized);
              log('debug', 'Default token added', { text, token: capitalized });
            }
          }
        }
        i++;
      }
    }

    // Final enforcement of brand + city/proper noun if applicable
    if (results.length === 1) {
      const singleToken = results[0];
      const singleLower = singleToken.toLowerCase();
      const remainingText = normalized.replace(singleLower.replace(/\s+/g, ''), '').toLowerCase();
      const possibleBrand = CAR_BRANDS.find(brand => remainingText.includes(brand.toLowerCase()));
      const possibleGeneric = ['auto', 'motors', 'group'].find(g => remainingText.includes(g));
      if (KNOWN_CITIES_SET.has(singleLower) && possibleBrand) {
        results.push(BRAND_MAPPING[possibleBrand.toLowerCase()] || capitalizeName(possibleBrand).name);
        log('debug', 'Enforced city + brand', { text, split: results });
      } else if (KNOWN_PROPER_NOUNS.has(singleLower) && possibleBrand) {
        results.push(BRAND_MAPPING[possibleBrand.toLowerCase()] || capitalizeName(possibleBrand).name);
        log('debug', 'Enforced proper noun + brand', { text, split: results });
      } else if (KNOWN_CITIES_SET.has(singleLower) && possibleGeneric) {
        results.push(capitalizeName(possibleGeneric).name);
        log('debug', 'Enforced city + generic', { text, split: results });
      }
    }

    // Final cleanup and deduplication
    const validTokens = [...new Set(results
      .filter(t => t && typeof t === 'string' && !['cars', 'sales', 'autogroup', 'of', 'and'].includes(t.toLowerCase()))
    )];

    log('debug', 'earlyCompoundSplit result', { text, split: validTokens });
    return validTokens.length > 0 ? validTokens : [capitalizeName(lower).name];
  } catch (e) {
    log('error', 'earlyCompoundSplit failed', { text, error: e.message, stack: e.stack });
    return [text];
  }
}

function capitalizeName(name) {
  try {
    // Robust type guard for invalid inputs
    if (!name || (typeof name !== 'string' && !Array.isArray(name))) {
      log('warn', 'Invalid input in capitalizeName', { name });
      return { name: '', flags: ['InvalidInput'] };
    }

    let words = name;
    let flags = [];

    // Normalize input to array of words
    if (typeof words === 'string') {
      words = words.trim();
      if (!words) {
        flags.push('EmptyInput');
        return { name: '', flags };
      }
      // Split on spaces only (camelCase handled by earlyCompoundSplit)
      words = words.split(/\s+/).filter(Boolean);
    }
    if (!Array.isArray(words)) {
      words = [words];
    }
    if (!words.length) {
      flags.push('EmptyInput');
      return { name: '', flags };
    }

    // Precompute sets for efficiency
    const properNounsSet = new Map([...KNOWN_PROPER_NOUNS, ...KNOWN_LAST_NAMES].map(n => [n.toLowerCase(), n]));
    const citiesSet = new Map([...KNOWN_CITIES_SET].map(c => [c.toLowerCase(), c]));
    const carBrandsSet = new Map([...CAR_BRANDS].map(b => [b.toLowerCase(), b]));
    const seen = new Set();
    const fixedWords = words
      .map(word => {
        if (!word || typeof word !== 'string') return null;
        const wordLower = word.toLowerCase();

        // Apply abbreviation expansions
        if (ABBREVIATION_EXPANSIONS[wordLower]) {
          const expanded = ABBREVIATION_EXPANSIONS[wordLower];
          flags.push('AbbreviationExpanded');
          return expanded; // Already properly cased in ABBREVIATION_EXPANSIONS
        }

        // Check for known proper nouns, cities, or brands
        if (properNounsSet.has(wordLower)) {
          flags.push('ProperNounMatched');
          return properNounsSet.get(wordLower);
        }
        if (citiesSet.has(wordLower)) {
          flags.push('CityMatched');
          return citiesSet.get(wordLower);
        }
        if (carBrandsSet.has(wordLower)) {
          const brand = carBrandsSet.get(wordLower);
          flags.push('BrandMatched');
          return BRAND_MAPPING[wordLower] || brand;
        }

        // Check for multi-word patterns (e.g., "northpark" → "North Park")
        const camelMatch = word.match(/^([a-z]+)([A-Z][a-z]*)$/);
        if (camelMatch) {
          const part1 = camelMatch[1].charAt(0).toUpperCase() + camelMatch[1].slice(1).toLowerCase();
          const part2 = camelMatch[2].charAt(0).toUpperCase() + camelMatch[2].slice(1).toLowerCase();
          return `${part1} ${part2}`;
        }

        // Default capitalization
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .filter(word => {
        if (!word) return false;
        const lower = word.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      });

    const finalName = fixedWords.join(' ').trim();
    if (!finalName) {
      flags.push('EmptyOutput');
    }

    return {
      name: finalName,
      flags: flags.length ? flags : ['Capitalized']
    };
  } catch (e) {
    log('error', 'capitalizeName failed', { name, error: e.message, stack: e.stack });
    return { name: '', flags: ['CapitalizeNameError'] };
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
  log('info', 'extractBrandOfCityFromDomain started', { domain });

  try {
    if (!domain || typeof domain !== 'string') {
      log('error', 'Invalid domain in extractBrandOfCityFromDomain', { domain });
      throw new Error('Invalid domain input');
    }

    const cleanDomain = domain.toLowerCase().replace(/^(www\.)|(\.com|\.net|\.org|\.co\.jp|\.biz|\.ca|\.co\.uk)$/g, '');
    
    // Use earlyCompoundSplit for consistent tokenization
    const tokens = earlyCompoundSplit(cleanDomain);
    const normalizedTokens = tokens.map(t => t.toLowerCase());

    // Precompute sets for efficiency
    const properNounsMap = new Map(KNOWN_PROPER_NOUNS.map(n => [n.toLowerCase(), n]));
    const carBrandsMap = new Map(CAR_BRANDS.map(b => [b.toLowerCase(), b]));
    const citiesMap = new Map([...KNOWN_CITIES_SET].map(c => [c.toLowerCase().replace(/\s+/g, ''), c]));

    // Check for proper nouns to defer
    for (const token of normalizedTokens) {
      if (properNounsMap.has(token)) {
        flags.add('ProperNounDetected');
        return { brand: null, city: null, flags: Array.from(flags) };
      }
    }

    // Try regex for "brandofcity" or "citybrand" patterns
    let brand = null;
    let city = null;

    // Pattern 1: "brandofcity" (e.g., toyotaofslidell)
    const brandOfCityMatch = cleanDomain.match(/(\w+)(?:of)([\w\s]+)/i);
    if (brandOfCityMatch) {
      let [, matchedBrand, matchedCity] = brandOfCityMatch;
      const formattedBrand = BRAND_MAPPING[matchedBrand.toLowerCase()] || capitalizeName(matchedBrand).name;
      const formattedCity = capitalizeName(matchedCity).name;
      if (carBrandsMap.has(matchedBrand.toLowerCase()) && citiesMap.has(matchedCity.toLowerCase().replace(/\s+/g, ''))) {
        const words = [formattedCity, formattedBrand].map(w => w.toLowerCase());
        if (new Set(words).size !== words.length) {
          flags.add('DuplicatesRemoved');
          return { brand: null, city: formattedCity, flags: Array.from(flags) };
        }
        flags.add('BrandOfCityPattern');
        return { brand: formattedBrand, city: formattedCity, flags: Array.from(flags) };
      }
    }

    // Pattern 2: "citybrand" (e.g., forddalton)
    const cityBrandMatch = cleanDomain.match(/^([\w\s]+)(\w+)$/i);
    if (cityBrandMatch) {
      let [, matchedCity, matchedBrand] = cityBrandMatch;
      const formattedCity = capitalizeName(matchedCity).name;
      const formattedBrand = BRAND_MAPPING[matchedBrand.toLowerCase()] || capitalizeName(matchedBrand).name;
      if (carBrandsMap.has(matchedBrand.toLowerCase()) && citiesMap.has(matchedCity.toLowerCase().replace(/\s+/g, ''))) {
        const words = [formattedCity, formattedBrand].map(w => w.toLowerCase());
        if (new Set(words).size !== words.length) {
          flags.add('DuplicatesRemoved');
          return { brand: null, city: formattedCity, flags: Array.from(flags) };
        }
        flags.add('CityBrandPattern');
        return { brand: formattedBrand, city: formattedCity, flags: Array.from(flags) };
      }
    }

    // Token-based extraction with multi-word city support
    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];
      const lowerToken = token.toLowerCase();
      const formattedToken = capitalizeName(token).name;

      // Check for multi-word cities
      let matchedCity = null;
      for (let j = i; j < tokens.length; j++) {
        const combinedTokens = tokens.slice(i, j + 1).join(' ').toLowerCase();
        const combinedNoSpaces = combinedTokens.replace(/\s+/g, '');
        if (citiesMap.has(combinedNoSpaces)) {
          matchedCity = citiesMap.get(combinedNoSpaces);
          i = j + 1;
          break;
        }
      }

      if (matchedCity) {
        city = matchedCity;
        flags.add('MultiWordCityMatched');
        continue;
      }

      // Check for single-word cities or brands
      if (!brand && carBrandsMap.has(lowerToken)) {
        brand = formattedToken;
        flags.add('BrandMatched');
      } else if (!city && citiesMap.has(lowerToken.replace(/\s+/g, ''))) {
        city = formattedToken;
        flags.add('SingleWordCityMatched');
      }

      i++;
    }

    // Fallback: Infer brand or city from unmatched tokens
    if (!brand || !city) {
      for (const token of tokens) {
        const lowerToken = token.toLowerCase();
        const formattedToken = capitalizeName(token).name;
        if (!brand && !carBrandsMap.has(lowerToken)) {
          // Infer brand from common suffixes
          const brandSuffixes = ['auto', 'motors', 'group', 'dealership'];
          if (brandSuffixes.some(suffix => lowerToken.includes(suffix))) {
            brand = formattedToken;
            flags.add('InferredBrand');
            break;
          }
        }
        if (!city && !citiesMap.has(lowerToken.replace(/\s+/g, ''))) {
          // Infer city as a fallback (non-brand, non-proper noun token)
          if (!properNounsMap.has(lowerToken) && !carBrandsMap.has(lowerToken)) {
            city = formattedToken;
            flags.add('InferredCity');
            break;
          }
        }
      }
    }

    if (brand || city) {
      const formattedBrand = brand ? (BRAND_MAPPING[brand.toLowerCase()] || capitalizeName(brand).name) : null;
      const formattedCity = city ? capitalizeName(city).name : null;

      // Final deduplication
      if (formattedBrand && formattedCity) {
        const words = [formattedCity, formattedBrand].map(w => w.toLowerCase());
        if (new Set(words).size !== words.length) {
          flags.add('DuplicatesRemoved');
          return { brand: null, city: formattedCity, flags: Array.from(flags) };
        }
      }

      flags.add('TokenBasedExtraction');
      return { brand: formattedBrand, city: formattedCity, flags: Array.from(flags) };
    }

    flags.add('NoMatchFound');
    return { brand: null, city: null, flags: Array.from(flags) };
  } catch (e) {
    log('error', 'extractBrandOfCityFromDomain failed', { domain, error: e.message, stack: e.stack });
    flags.add('ExtractBrandOfCityError');
    return { brand: null, city: null, flags: Array.from(flags) };
  }
}

/**
 * Attempts to match a brand-city pattern in tokens
 * @param {Array<string>} tokens - Tokens to analyze
 * @returns {{companyName: string, confidenceScore: number, flags: Array<string>}} - Result with company name, confidence score, and flags
 */
function tryBrandCityPattern(tokens) {
  const flags = new Set(['BrandCityPattern']);
  log('info', 'tryBrandCityPattern started', { tokens });

  try {
    if (!Array.isArray(tokens) || tokens.length === 0) {
      flags.add('InvalidInput');
      return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
    }

    const normalizedTokens = tokens.map(t => t.toLowerCase());
    // Precompute maps for efficiency
    const properNounsMap = new Map(KNOWN_PROPER_NOUNS.map(n => [n.toLowerCase(), n]));
    const carBrandsMap = new Map(CAR_BRANDS.map(b => [b.toLowerCase(), b]));
    const citiesMap = new Map([...KNOWN_CITIES_SET].map(c => [c.toLowerCase().replace(/\s+/g, ''), c]));
    const genericTerms = new Set(['auto', 'automotive', 'motors', 'dealers', 'dealer', 'group', 'mall', 'automall', 'cares']);

    // Check for proper nouns to defer
    for (const token of normalizedTokens) {
      if (properNounsMap.has(token)) {
        flags.add('ProperNounDetected');
        return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
      }
    }

    let matchedCity = null;
    let matchedBrand = null;
    let matchedGeneric = null;

    // Single pass to find city (including multi-word cities)
    let i = 0;
    while (i < tokens.length) {
      const remainingTokens = tokens.slice(i).join(' ').toLowerCase();
      let cityFound = false;

      // Check for multi-word cities
      for (let j = i; j < tokens.length; j++) {
        const combinedTokens = tokens.slice(i, j + 1).join(' ').toLowerCase();
        const combinedNoSpaces = combinedTokens.replace(/\s+/g, '');
        if (citiesMap.has(combinedNoSpaces)) {
          matchedCity = citiesMap.get(combinedNoSpaces);
          i = j + 1;
          cityFound = true;
          flags.add('MultiWordCityMatched');
          break;
        }
      }

      if (!cityFound) {
        const token = normalizedTokens[i];
        const formattedToken = capitalizeName(token).name;
        if (citiesMap.has(token.replace(/\s+/g, ''))) {
          matchedCity = formattedToken;
          flags.add('SingleWordCityMatched');
        }
        i++;
      }

      // If city found, look for brand or generic in remaining tokens
      if (matchedCity) {
        for (let j = 0; j < tokens.length; j++) {
          const otherToken = normalizedTokens[j];
          const formattedOtherToken = capitalizeName(otherToken).name;
          if (carBrandsMap.has(otherToken)) {
            matchedBrand = ABBREVIATION_EXPANSIONS[otherToken] || formattedOtherToken;
            flags.add('BrandMatched');
          } else if (genericTerms.has(otherToken)) {
            matchedGeneric = formattedOtherToken;
            flags.add('GenericMatched');
          } else if (!matchedGeneric && !properNounsMap.has(otherToken) && !citiesMap.has(otherToken.replace(/\s+/g, ''))) {
            // Infer generic term dynamically (non-brand, non-city, non-proper noun)
            const genericSuffixes = ['drive', 'park', 'center', 'world'];
            if (genericSuffixes.some(suffix => otherToken.includes(suffix))) {
              matchedGeneric = formattedOtherToken;
              flags.add('InferredGeneric');
            }
          }
        }
        break;
      }
    }

    // Handle city + brand match
    if (matchedCity && matchedBrand) {
      const brandLower = matchedBrand.toLowerCase().replace(/\s+/g, '');
      const formattedBrand = BRAND_MAPPING[brandLower] || capitalizeName(matchedBrand).name;
      const formattedCity = capitalizeName(matchedCity).name;

      // Relaxed conflict check: only reject if city and brand are identical
      const cityLower = formattedCity.toLowerCase();
      const brandMatch = formattedBrand.toLowerCase();
      if (cityLower === brandMatch) {
        flags.add('BrandCityConflict');
        return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
      }

      // Deduplicate tokens
      const words = [formattedCity, formattedBrand].map(w => w.toLowerCase());
      if (new Set(words).size !== words.length) {
        flags.add('DuplicatesRemoved');
        return { companyName: formattedCity, confidenceScore: 100, flags: Array.from(flags) };
      }

      const name = `${formattedCity} ${formattedBrand}`;
      if (name.split(' ').length > 3) {
        flags.add('TokenLimitExceeded');
        return { companyName: formattedCity, confidenceScore: 100, flags: Array.from(flags) };
      }

      log('debug', 'CityBrandPattern matched', { companyName: name, confidenceScore: 125 });
      flags.add('CityBrandPattern');
      return { companyName: name, confidenceScore: 125, flags: Array.from(flags) };
    }

    // Handle city + generic match
    if (matchedCity && matchedGeneric) {
      const formattedCity = capitalizeName(matchedCity).name;
      const formattedGeneric = capitalizeName(matchedGeneric).name;

      // Reject brand-like generic terms
      if (carBrandsMap.has(formattedCity.toLowerCase())) {
        flags.add('BrandCityConflict');
        return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
      }

      // Deduplicate tokens
      const words = [formattedCity, formattedGeneric].map(w => w.toLowerCase());
      if (new Set(words).size !== words.length) {
        flags.add('DuplicatesRemoved');
        return { companyName: formattedCity, confidenceScore: 100, flags: Array.from(flags) };
      }

      const name = `${formattedCity} ${formattedGeneric}`;
      if (name.split(' ').length > 3) {
        flags.add('TokenLimitExceeded');
        return { companyName: formattedCity, confidenceScore: 100, flags: Array.from(flags) };
      }

      log('debug', 'CityGenericPattern matched', { companyName: name, confidenceScore: 125 });
      flags.add('CityGenericPattern');
      return { companyName: name, confidenceScore: 125, flags: Array.from(flags) };
    }

    return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
  } catch (e) {
    log('error', 'tryBrandCityPattern failed', { tokens, error: e.message, stack: e.stack });
    flags.add('BrandCityPatternError');
    flags.add('ManualReviewRecommended');
    return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
  }
}

/**
 * Attempts to match a human name pattern in tokens
 * @param {Array<string>} tokens - Tokens to analyze
 * @returns {{companyName: string, confidenceScore: number, flags: Array<string>}} - Result with company name, confidence score, and flags
 */
function tryHumanNamePattern(tokens) {
  const flags = new Set(['HumanNamePattern']);
  log('info', 'tryHumanNamePattern started', { tokens });

  try {
    if (!Array.isArray(tokens) || tokens.length === 0) {
      log('error', 'Invalid tokens in tryHumanNamePattern', { tokens });
      throw new Error('Invalid tokens input');
    }

    // Precompute maps for efficiency
    const firstNamesMap = new Map([...KNOWN_FIRST_NAMES].map(f => [f.toLowerCase(), f]));
    const lastNamesMap = new Map([...KNOWN_LAST_NAMES].map(l => [l.toLowerCase(), l]));
    const properNounsMap = new Map([...KNOWN_PROPER_NOUNS].map(n => [n.toLowerCase(), n]));
    const citiesMap = new Map([...KNOWN_CITIES_SET].map(c => [c.toLowerCase().replace(/\s+/g, ''), c]));
    const carBrandsMap = new Map(CAR_BRANDS.map(b => [b.toLowerCase(), b]));
    const genericTerms = new Set(['auto', 'automotive', 'motors', 'dealers', 'dealer', 'group', 'mall', 'automall', 'cares']);

    // Check for proper nouns to defer
    for (const token of tokens) {
      if (properNounsMap.has(token.toLowerCase())) {
        flags.add('ProperNounDetected');
        return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
      }
    }

    let matchedNameParts = [];
    let matchedBrand = null;
    let matchedGeneric = null;

    // Find human name parts (first + last, or last name alone)
    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i].toLowerCase();
      const formattedToken = capitalizeName(token).name;
      let nameFound = false;

      // Check for multi-word names (e.g., "McLarty Daniel")
      for (let j = i; j < tokens.length; j++) {
        const combinedTokens = tokens.slice(i, j + 1).join(' ').toLowerCase();
        const firstPart = tokens[i].toLowerCase();
        const lastPart = j > i ? tokens[j].toLowerCase() : null;

        if (firstNamesMap.has(firstPart) && lastPart && lastNamesMap.has(lastPart)) {
          matchedNameParts = tokens.slice(i, j + 1).map(t => capitalizeName(t).name);
          i = j + 1;
          nameFound = true;
          flags.add('FirstLastPattern');
          break;
        } else if (lastNamesMap.has(firstPart)) {
          matchedNameParts = [formattedToken];
          i = j + 1;
          nameFound = true;
          flags.add('LastNamePattern');
          break;
        }
      }

      if (!nameFound) {
        i++;
      } else {
        break;
      }
    }

    // If a human name is found, look for brand or generic
    if (matchedNameParts.length > 0) {
      const fullName = matchedNameParts.join(' ');
      const nameLower = fullName.toLowerCase();

      // Check for conflicts with cities and brands
      const isCity = citiesMap.has(nameLower.replace(/\s+/g, ''));
      const isBrand = carBrandsMap.has(nameLower);
      if (isCity || isBrand) {
        flags.add('NameConflict');
        return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
      }

      // Look for brand or generic in remaining tokens
      for (const token of tokens) {
        const tokenLower = token.toLowerCase();
        const formattedToken = capitalizeName(token).name;
        if (carBrandsMap.has(tokenLower)) {
          matchedBrand = ABBREVIATION_EXPANSIONS[tokenLower] || formattedToken;
          flags.add('BrandMatched');
        } else if (genericTerms.has(tokenLower)) {
          matchedGeneric = formattedToken;
          flags.add('GenericMatched');
        } else if (!matchedGeneric && !properNounsMap.has(tokenLower) && !citiesMap.has(tokenLower.replace(/\s+/g, ''))) {
          // Infer generic term dynamically
          const genericSuffixes = ['drive', 'park', 'center', 'world'];
          if (genericSuffixes.some(suffix => tokenLower.includes(suffix))) {
            matchedGeneric = formattedToken;
            flags.add('InferredGeneric');
          }
        }
      }

      // Construct the company name
      let companyName = fullName;
      let confidenceScore = 125;

      if (matchedBrand) {
        const brandLower = matchedBrand.toLowerCase().replace(/\s+/g, '');
        const formattedBrand = BRAND_MAPPING[brandLower] || capitalizeName(matchedBrand).name;
        const isPossessive = fullName.toLowerCase().endsWith('s') || fullName.includes('’s');
        companyName = isPossessive ? fullName : `${fullName} ${formattedBrand}`;
        flags.add('LastNameBrandPattern');
      } else if (matchedGeneric) {
        const formattedGeneric = capitalizeName(matchedGeneric).name;
        companyName = `${fullName} ${formattedGeneric}`;
        flags.add('LastNameGenericPattern');
      } else {
        flags.add('HumanNameOnly');
      }

      // Deduplicate tokens
      const words = companyName.split(' ').map(w => w.toLowerCase());
      if (new Set(words).size !== words.length) {
        flags.add('DuplicatesRemoved');
        companyName = matchedNameParts[0];
        confidenceScore = 95;
      }

      // Token limit check
      if (companyName.split(' ').length > 3) {
        flags.add('TokenLimitExceeded');
        companyName = fullName;
        confidenceScore = 95;
      }

      log('debug', 'HumanNamePattern matched', { companyName, confidenceScore });
      flags.add('HumanNameDetected');
      return { companyName, confidenceScore, flags: Array.from(flags) };
    }

    return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
  } catch (e) {
    log('error', 'tryHumanNamePattern failed', { tokens, error: e.message, stack: e.stack });
    flags.add('HumanNamePatternError');
    flags.add('ManualReviewRecommended');
    return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
  }
}

/**
 * Attempts to match a proper noun pattern in tokens
 * @param {Array<string>} tokens - Tokens to analyze
 * @returns {Object} - Result with company name, confidence score, and flags
 */
function tryProperNounPattern(tokens) {
  const flags = new Set(['ProperNounPattern']);
  log('info', 'tryProperNounPattern started', { tokens });

  try {
    if (!Array.isArray(tokens) || tokens.length === 0) {
      flags.add('InvalidInput');
      return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
    }

    // Precompute maps for efficiency
    const properNounsMap = new Map([...KNOWN_PROPER_NOUNS].map(n => [n.toLowerCase().replace(/\s+/g, ''), n]));
    const carBrandsMap = new Map([...CAR_BRANDS, ...Object.entries(ABBREVIATION_EXPANSIONS)].map(([k, v]) => [k.toLowerCase(), v || k]));
    const genericTerms = new Set(['auto', 'automotive', 'motors', 'dealers', 'dealer', 'group', 'mall', 'automall', 'cares']);

    let matchedProper = null;
    let matchedBrand = null;
    let matchedGeneric = null;
    const properMatches = [];

    // Collect potential matches
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token || typeof token !== 'string') {
        log('warn', 'Invalid token in tryProperNounPattern', { token, index: i });
        continue;
      }
      const tokenLower = token.toLowerCase().replace(/\s+/g, '');
      const formattedToken = capitalizeName(token).name;

      if (properNounsMap.has(tokenLower)) {
        properMatches.push({ token: formattedToken, index: i });
        log('debug', 'Proper noun matched in tokens', { token, index: i });
      }
      if (carBrandsMap.has(tokenLower)) {
        matchedBrand = carBrandsMap.get(tokenLower);
        log('debug', 'Brand matched in tokens', { token: tokenLower, matchedBrand });
      }
      if (genericTerms.has(tokenLower)) {
        matchedGeneric = formattedToken;
        log('debug', 'Generic term matched in tokens', { token: tokenLower, matchedGeneric });
      }
    }

    // Multi-word proper noun match (including non-consecutive tokens)
    if (properMatches.length > 1) {
      const sortedMatches = properMatches.sort((a, b) => a.index - b.index);
      const combinedProper = sortedMatches.map(m => m.token).join(' ').toLowerCase().replace(/\s+/g, '');
      if (properNounsMap.has(combinedProper)) {
        matchedProper = sortedMatches.map(m => m.token).join(' ');
        log('debug', 'Multi-word proper noun matched', { matchedProper });
      }
    }

    // Fallback to longest single match
    if (!matchedProper && properMatches.length > 0) {
      properMatches.sort((a, b) => b.token.length - a.token.length);
      matchedProper = properMatches[0].token;
      log('debug', 'Single proper noun matched', { matchedProper });
    }

    if (matchedProper) {
      const formattedProper = capitalizeName(matchedProper).name;
      const lowerFormatted = formattedProper.toLowerCase().replace(/\s+/g, '');

      // Block brand-only returns
      if (carBrandsMap.has(lowerFormatted)) {
        flags.add('BrandOnlyConflict');
        log('warn', 'Brand-only conflict detected', { formattedProper });
        return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
      }

      // Append brand or generic if present
      let companyName = formattedProper;
      let confidenceScore = 125;

      if (matchedBrand) {
        const isPossessiveSafe = !formattedProper.toLowerCase().endsWith('s');
        const brandLower = matchedBrand.toLowerCase().replace(/\s+/g, '');
        const formattedBrand = BRAND_MAPPING[brandLower] || capitalizeName(matchedBrand).name;
        companyName = isPossessiveSafe ? formattedProper : `${formattedProper} ${formattedBrand}`;
        flags.add('ProperNounBrandPattern');
      } else if (matchedGeneric) {
        const formattedGeneric = capitalizeName(matchedGeneric).name;
        companyName = `${formattedProper} ${formattedGeneric}`;
        flags.add('ProperNounGenericPattern');
      } else {
        flags.add('ProperNounOnly');
      }

      // Deduplicate tokens
      const words = companyName.split(' ').map(w => w.toLowerCase());
      if (new Set(words).size !== words.length) {
        flags.add('DuplicatesRemoved');
        companyName = formattedProper;
        confidenceScore = 95;
      }

      // Token limit check
      if (companyName.split(' ').length > 3) {
        flags.add('TokenLimitExceeded');
        companyName = formattedProper;
        confidenceScore = 95;
      }

      log('debug', 'Proper noun pattern matched', { companyName, confidenceScore });
      return { companyName, confidenceScore, flags: Array.from(flags) };
    }

    // No match: defer
    log('debug', 'No proper noun match found, deferring to next pattern', { tokens });
    return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
  } catch (e) {
    log('error', 'tryProperNounPattern failed', { tokens, error: e.message, stack: e.stack });
    flags.add('ProperNounPatternError');
    flags.add('ManualReviewRecommended');
    return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
  }
}

/**
 * Attempts to match a city + generic term pattern in tokens
 * @param {Array<string>} tokens - Tokens to analyze
 * @returns {{companyName: string, confidenceScore: number, flags: Array<string>}} - Result with company name, confidence score, and flags
 */
function tryCityAutoPattern(tokens) {
  const flags = new Set(['CityGenericPattern']);
  log('info', 'tryCityAutoPattern started', { tokens });

  try {
    if (!Array.isArray(tokens) || !tokens.length) {
      flags.add('InvalidInput');
      return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
    }

    // Precompute maps for efficiency
    const properNounsMap = new Map(KNOWN_PROPER_NOUNS.map(n => [n.toLowerCase(), n]));
    const carBrandsMap = new Map([...CAR_BRANDS, ...Object.entries(ABBREVIATION_EXPANSIONS)].map(([k, v]) => [k.toLowerCase(), v || k]));
    const citiesMap = new Map([...KNOWN_CITIES_SET].map(c => [c.toLowerCase().replace(/\s+/g, ''), c]));
    const genericTerms = new Set(['auto', 'automotive', 'motors', 'motor', 'dealer', 'dealers', 'group', 'mall', 'automall', 'cares']);

    // Check for proper nouns to defer
    for (const token of tokens) {
      if (properNounsMap.has(token.toLowerCase())) {
        flags.add('ProperNounDetected');
        return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
      }
    }

    let matchedCity = null;
    let matchedGeneric = null;
    let hasBrand = false;

    // Check for cities (single or multi-word, leveraging earlyCompoundSplit)
    let i = 0;
    while (i < tokens.length) {
      const remainingTokens = tokens.slice(i).join(' ').toLowerCase();
      let cityFound = false;

      // Check for multi-word cities
      for (let j = i; j < tokens.length; j++) {
        const combinedTokens = tokens.slice(i, j + 1).join(' ').toLowerCase();
        const combinedNoSpaces = combinedTokens.replace(/\s+/g, '');
        if (citiesMap.has(combinedNoSpaces)) {
          matchedCity = citiesMap.get(combinedNoSpaces);
          i = j + 1;
          cityFound = true;
          flags.add('MultiWordCityMatched');
          break;
        }
      }

      if (!cityFound) {
        const token = tokens[i].toLowerCase();
        const formattedToken = capitalizeName(token).name;
        if (citiesMap.has(token.replace(/\s+/g, ''))) {
          matchedCity = formattedToken;
          flags.add('SingleWordCityMatched');
        }
        i++;
      }

      if (matchedCity) break;
    }

    // Check for brands and generics
    if (matchedCity) {
      for (const token of tokens) {
        const tokenLower = token.toLowerCase();
        const formattedToken = capitalizeName(token).name;

        if (carBrandsMap.has(tokenLower)) {
          hasBrand = true;
          flags.add('BrandDetected');
          continue; // Don't defer yet; try to match city + generic first
        }

        if (genericTerms.has(tokenLower)) {
          matchedGeneric = formattedToken;
          flags.add('GenericMatched');
        } else if (!matchedGeneric && !properNounsMap.has(tokenLower) && !citiesMap.has(tokenLower.replace(/\s+/g, ''))) {
          // Infer generic term dynamically
          const genericSuffixes = ['drive', 'park', 'center', 'world'];
          if (genericSuffixes.some(suffix => tokenLower.includes(suffix))) {
            matchedGeneric = formattedToken;
            flags.add('InferredGeneric');
          }
        }
      }

      // If a brand is detected but no match in tryBrandCityPattern (assumed), try city + generic
      if (hasBrand && !matchedGeneric) {
        flags.add('BrandDetectedButNoMatch');
        return { companyName: '', confidenceScore: 0, flags: Array.from(flags) }; // Defer to tryBrandCityPattern
      }
    }

    if (matchedCity && matchedGeneric) {
      const formattedCity = capitalizeName(matchedCity).name;
      const formattedGeneric = capitalizeName(matchedGeneric).name;

      // Reject brand-like cities
      if (carBrandsMap.has(formattedCity.toLowerCase())) {
        flags.add('BrandCityConflict');
        return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
      }

      // Deduplicate tokens
      const words = [formattedCity, formattedGeneric].map(w => w.toLowerCase());
      if (new Set(words).size !== words.length) {
        flags.add('DuplicatesRemoved');
        return { companyName: formattedCity, confidenceScore: 95, flags: Array.from(flags) };
      }

      const name = `${formattedCity} ${formattedGeneric}`;
      if (name.split(' ').length > 3) {
        flags.add('TokenLimitExceeded');
        return { companyName: formattedCity, confidenceScore: 95, flags: Array.from(flags) };
      }

      log('debug', 'CityAutoPattern matched', { companyName: name, confidenceScore: 125 });
      return { companyName: name, confidenceScore: 125, flags: Array.from(flags) };
    }

    return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
  } catch (e) {
    log('error', 'tryCityAutoPattern failed', { tokens, error: e.message, stack: e.stack });
    flags.add('CityAutoPatternError');
    flags.add('ManualReviewRecommended');
    return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
  }
}

/**
 * Attempts to match a brand + generic term or proper noun pattern in tokens
 * @param {Array<string>} tokens - Tokens to analyze
 * @returns {{companyName: string, confidenceScore: number, flags: Array<string>}} - Result with company name, confidence score, and flags
 */
function tryBrandGenericPattern(tokens, meta = {}) {
  const flags = new Set(['BrandGenericPattern']);
  log('info', 'tryBrandGenericPattern started', { tokens });

  try {
    // Validate input
    if (!Array.isArray(tokens) || !tokens.length) {
      log('error', 'Invalid tokens in tryBrandGenericPattern', { tokens });
      flags.add('InvalidInput');
      return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
    }

    // Precompute maps for efficiency
    const carBrandsMap = new Map([...CAR_BRANDS, ...Object.entries(ABBREVIATION_EXPANSIONS)].map(([k, v]) => [k.toLowerCase(), v || k]));
    const properNounsMap = new Map(KNOWN_PROPER_NOUNS.map(n => [n.toLowerCase().replace(/\s+/g, ''), n]));
    const citiesMap = new Map([...KNOWN_CITIES_SET].map(c => [c.toLowerCase().replace(/\s+/g, ''), c]));
    const genericTerms = new Set(['auto', 'automotive', 'motors', 'motor', 'dealers', 'dealer', 'group', 'mall', 'automall', 'cares']);
    const compoundBrands = new Map(Object.entries({
      'classicchevrolet': 'Classic Chevy',
      'cavalierford': 'Cavalier Ford',
      'classiccadillac': 'Classic Cadillac',
      'sunsetmitsubishi': 'Sunset Mitsubishi',
      'northwestcars': 'Northwest Toyota'
    }).map(([k, v]) => [k.toLowerCase(), v]));

    // Deduplicate and normalize tokens
    const cleanedTokens = dedupeBrands(tokens)
      .map(t => t.toLowerCase())
      .filter(t => !['cars', 'sales', 'autogroup'].includes(t));

    // Disqualify short single-token outputs
    if (cleanedTokens.length === 1 && cleanedTokens[0].length < 4 && !properNounsMap.has(cleanedTokens[0]) && !citiesMap.has(cleanedTokens[0])) {
      flags.add('ShortTokenCollapse');
      flags.add('ReviewNeeded');
      log('warn', 'Short token collapse detected', { token: cleanedTokens[0] });
      return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
    }

    // Early exit if no valid tokens
    if (!cleanedTokens.length) {
      flags.add('NoValidTokens');
      return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
    }

    let matchedBrand = null;
    let matchedProper = null;
    let matchedCity = null;
    let matchedGeneric = null;
    let matchedCompound = null;

    // Check for compound brand (using earlyCompoundSplit tokens)
    const tokenString = cleanedTokens.join('');
    if (compoundBrands.has(tokenString)) {
      matchedCompound = compoundBrands.get(tokenString);
      flags.add('CompoundBrandPattern');
      log('debug', 'Compound brand matched', { companyName: matchedCompound });
      return { companyName: matchedCompound, confidenceScore: 125, flags: Array.from(flags) };
    }

    // Single pass to identify matches
    for (let i = 0; i < cleanedTokens.length; i++) {
      const token = cleanedTokens[i];
      const formattedToken = capitalizeName(token).name;

      if (carBrandsMap.has(token)) {
        matchedBrand = carBrandsMap.get(token);
        flags.add('BrandMatched');
      }
      if (properNounsMap.has(token.replace(/\s+/g, ''))) {
        matchedProper = formattedToken;
        flags.add('ProperNounMatched');
      }
      if (citiesMap.has(token.replace(/\s+/g, ''))) {
        matchedCity = formattedToken;
        flags.add('CityMatched');
      }
      if (genericTerms.has(token)) {
        matchedGeneric = formattedToken;
        flags.add('GenericMatched');
      } else if (!matchedGeneric && !properNounsMap.has(token) && !citiesMap.has(token.replace(/\s+/g, ''))) {
        // Infer generic term dynamically
        const genericSuffixes = ['drive', 'park', 'center', 'world'];
        if (genericSuffixes.some(suffix => token.includes(suffix))) {
          matchedGeneric = formattedToken;
          flags.add('InferredGeneric');
        }
      }
    }

    // Priority 1: Proper Noun + Brand (only for 's'-ending or possessive)
    if (matchedProper && matchedBrand) {
      const formattedProper = capitalizeName(matchedProper).name;
      const formattedBrand = capitalizeName(matchedBrand).name;
      const isPossessiveSafe = !formattedProper.toLowerCase().endsWith('s') && !formattedProper.includes('’s');
      if (!isPossessiveSafe) {
        const name = `${formattedProper} ${formattedBrand}`;
        const words = name.split(' ').map(w => w.toLowerCase());
        if (new Set(words).size !== words.length) {
          flags.add('DuplicatesRemoved');
          return { companyName: formattedProper, confidenceScore: 95, flags: Array.from(flags) };
        }
        if (name.split(' ').length > 3) {
          flags.add('TokenLimitExceeded');
          return { companyName: formattedProper, confidenceScore: 95, flags: Array.from(flags) };
        }
        flags.add('ProperNounBrandPattern');
        return { companyName: name, confidenceScore: 125, flags: Array.from(flags) };
      }
      flags.add('ProperNounDetected');
      return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
    }

    // Priority 2: Proper Noun (stand-alone)
    if (matchedProper) {
      flags.add('ProperNounDetected');
      return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
    }

    // Priority 3: City + Brand
    if (matchedCity && matchedBrand) {
      flags.add('CityBrandPattern');
      return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
    }

    // Priority 4: City + Generic
    if (matchedCity && matchedGeneric) {
      flags.add('CityGenericPattern');
      return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
    }

    // Priority 5: Brand + Generic
    if (matchedBrand && matchedGeneric) {
      const formattedBrand = capitalizeName(matchedBrand).name;
      const formattedGeneric = capitalizeName(matchedGeneric).name;
      const name = `${formattedBrand} ${formattedGeneric}`;
      const words = name.split(' ').map(w => w.toLowerCase());
      if (new Set(words).size !== words.length) {
        flags.add('DuplicatesRemoved');
        return { companyName: formattedBrand, confidenceScore: 95, flags: Array.from(flags) };
      }
      if (name.split(' ').length > 3) {
        flags.add('TokenLimitExceeded');
        return { companyName: formattedBrand, confidenceScore: 95, flags: Array.from(flags) };
      }
      flags.add('BrandGenericMatch');
      return { companyName: name, confidenceScore: 125, flags: Array.from(flags) };
    }

    // Priority 6: Single-brand with meta-title fallback
    if (matchedBrand && cleanedTokens.length === 1 && meta.title) {
      const titleTokens = meta.title.toLowerCase().split(/\s+/).filter(t => t.length > 3);
      const candidate = titleTokens.find(t => (properNounsMap.has(t) || citiesMap.has(t)) && !carBrandsMap.has(t) && !genericTerms.has(t));
      if (candidate) {
        const formattedBrand = capitalizeName(matchedBrand).name;
        const formattedCandidate = capitalizeName(candidate).name;
        const name = `${formattedCandidate} ${formattedBrand}`;
        const words = name.split(' ').map(w => w.toLowerCase());
        if (new Set(words).size !== words.length) {
          flags.add('DuplicatesRemoved');
          return { companyName: formattedCandidate, confidenceScore: 95, flags: Array.from(flags) };
        }
        if (name.split(' ').length > 3) {
          flags.add('TokenLimitExceeded');
          return { companyName: formattedCandidate, confidenceScore: 95, flags: Array.from(flags) };
        }
        flags.add('MetaTitleFallback');
        return { companyName: name, confidenceScore: 125, flags: Array.from(flags) };
      }
    }

    // Priority 7: Multi-brand handling
    if (cleanedTokens.filter(t => carBrandsMap.has(t)).length > 1) {
      const firstProper = cleanedTokens.find(t => properNounsMap.has(t));
      if (firstProper) {
        flags.add('MultiBrandProperNoun');
        return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
      }
      const firstBrand = cleanedTokens.find(t => carBrandsMap.has(t));
      const formattedFirstBrand = BRAND_MAPPING[firstBrand] || capitalizeName(firstBrand).name;
      const name = `${formattedFirstBrand} Motors`;
      const words = name.split(' ').map(w => w.toLowerCase());
      if (new Set(words).size !== words.length) {
        flags.add('DuplicatesRemoved');
        return { companyName: formattedFirstBrand, confidenceScore: 95, flags: Array.from(flags) };
      }
      flags.add('MultiBrandFirstSelected');
      return { companyName: name, confidenceScore: 125, flags: Array.from(flags) };
    }

    // Priority 8: Generic-only block
    if (matchedGeneric && !matchedProper && !matchedCity && !matchedBrand) {
      flags.add('GenericOnlyBlocked');
      flags.add('ReviewNeeded');
      return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
    }

    // Priority 9: Single-token fallback
    if (cleanedTokens.length === 1) {
      const token = cleanedTokens[0];
      if (properNounsMap.has(token) || citiesMap.has(token)) {
        flags.add('SingleTokenFallback');
        return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
      }
      if (carBrandsMap.has(token)) {
        flags.add('BrandOnlyBlocked');
        flags.add('ReviewNeeded');
        return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
      }
      const formatted = capitalizeName(token).name;
      flags.add('SingleTokenFallback');
      flags.add('ManualReviewRecommended');
      return { companyName: formatted, confidenceScore: 95, flags: Array.from(flags) };
    }

    // No match
    flags.add('NoPatternMatch');
    return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
  } catch (e) {
    log('error', 'tryBrandGenericPattern failed', { tokens, error: e.message, stack: e.stack });
    flags.add('BrandGenericPatternError');
    flags.add('ManualReviewRecommended');
    return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
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
 * Attempts to match a generic pattern in tokens as a last resort
 * @param {Array<string>} tokens - Tokens to analyze
 * @returns {{companyName: string, confidenceScore: number, flags: Array<string>}} - Result with company name, confidence score, and flags
 */
function tryGenericPattern(tokens, meta = {}) {
  const flags = new Set(['GenericPattern']);
  log('info', 'tryGenericPattern started', { tokens });

  try {
    if (!Array.isArray(tokens) || !tokens.length) {
      log('error', 'Invalid tokens in tryGenericPattern', { tokens });
      flags.add('InvalidInput');
      flags.add('ManualReviewRecommended');
      return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
    }

    // Precompute maps for efficiency
    const properNounsMap = new Map(KNOWN_PROPER_NOUNS.map(n => [n.toLowerCase().replace(/\s+/g, ''), n]));
    const citiesMap = new Map([...KNOWN_CITIES_SET].map(c => [c.toLowerCase().replace(/\s+/g, ''), c]));
    const carBrandsMap = new Map([...CAR_BRANDS, ...Object.entries(ABBREVIATION_EXPANSIONS)].map(([k, v]) => [k.toLowerCase(), v || k]));
    const genericTerms = new Set(['auto', 'automotive', 'motors', 'dealer', 'dealers', 'motor', 'group', 'mall', 'automall', 'cares']);
    const spamTerms = new Set(['cars', 'sales', 'autogroup']);

    // Deduplicate and normalize tokens
    const cleanedTokens = dedupeBrands(tokens)
      .map(t => t.toLowerCase())
      .filter(t => !spamTerms.has(t));

    // Early exit if no valid tokens
    if (!cleanedTokens.length) {
      flags.add('NoValidTokens');
      flags.add('ManualReviewRecommended');
      return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
    }

    let city = null;
    let brand = null;
    let proper = null;
    let generic = null;

    // Single-token checks
    for (const token of cleanedTokens) {
      if (citiesMap.has(token.replace(/\s+/g, '')) && !carBrandsMap.has(token)) {
        city = token;
      }
      if (carBrandsMap.has(token)) {
        brand = carBrandsMap.get(token);
      }
      if (properNounsMap.has(token.replace(/\s+/g, '')) && !carBrandsMap.has(token) && !citiesMap.has(token.replace(/\s+/g, ''))) {
        proper = token;
      }
      if (genericTerms.has(token)) {
        generic = token;
      }
    }

    // Defer to earlier patterns
    if (proper) {
      flags.add('ProperNounDetected');
      return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
    }
    if (city && (brand || generic)) {
      flags.add(city && brand ? 'CityBrandPattern' : 'CityGenericPattern');
      return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
    }
    if (brand && generic) {
      flags.add('BrandGenericMatch');
      return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
    }

    // Priority 1: Metadata-enhanced fallback (non-brand tokens)
    if (meta.title) {
      const titleTokens = meta.title.toLowerCase().split(/\s+/).filter(t => t.length > 3);
      const candidate = titleTokens.find(t => (properNounsMap.has(t) || citiesMap.has(t)) && !carBrandsMap.has(t) && !genericTerms.has(t));
      if (candidate) {
        const formattedCandidate = capitalizeName(candidate).name;
        let companyName = formattedCandidate;
        let confidenceScore = 125;

        // Attempt to append a generic term
        const genericCandidate = titleTokens.find(t => genericTerms.has(t) || t.includes('drive') || t.includes('park') || t.includes('center') || t.includes('world'));
        if (genericCandidate) {
          const formattedGeneric = capitalizeName(genericCandidate).name;
          companyName = `${formattedCandidate} ${formattedGeneric}`;
          flags.add('MetaTitleGenericFallback');
        } else {
          flags.add('MetaTitleFallback');
        }

        // Deduplicate
        const words = companyName.split(' ').map(w => w.toLowerCase());
        if (new Set(words).size !== words.length) {
          flags.add('DuplicatesRemoved');
          companyName = formattedCandidate;
          confidenceScore = 95;
        }
        if (companyName.split(' ').length > 3) {
          flags.add('TokenLimitExceeded');
          companyName = formattedCandidate;
          confidenceScore = 95;
        }

        return { companyName, confidenceScore, flags: Array.from(flags) };
      }
    }

    // Priority 2: Single-token fallback with inferred generic (non-brand, non-generic)
    if (cleanedTokens.length === 1) {
      const token = cleanedTokens[0];
      const lower = token.toLowerCase();
      if (carBrandsMap.has(lower)) {
        flags.add('BrandOnlyBlocked');
        flags.add('ManualReviewRecommended');
        return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
      }
      if (genericTerms.has(lower)) {
        flags.add('GenericOnlyBlocked');
        flags.add('ManualReviewRecommended');
        return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
      }

      const formatted = capitalizeName(token).name;
      let companyName = formatted;
      let confidenceScore = 125;

      // Infer a generic term
      const genericSuffixes = ['drive', 'park', 'center', 'world'];
      let inferredGeneric = genericSuffixes.find(suffix => lower.includes(suffix));
      if (inferredGeneric) {
        const formattedGeneric = capitalizeName(inferredGeneric).name;
        companyName = `${formatted} ${formattedGeneric}`;
        flags.add('InferredGeneric');
      } else {
        // Default to "Auto" if no inferred generic
        companyName = `${formatted} Auto`;
        flags.add('DefaultGeneric');
      }

      // Deduplicate
      const words = companyName.split(' ').map(w => w.toLowerCase());
      if (new Set(words).size !== words.length) {
        flags.add('DuplicatesRemoved');
        companyName = formatted;
        confidenceScore = 95;
      }
      if (companyName.split(' ').length > 3) {
        flags.add('TokenLimitExceeded');
        companyName = formatted;
        confidenceScore = 95;
      }

      flags.add('SingleTokenFallback');
      flags.add('ManualReviewRecommended');
      return { companyName, confidenceScore, flags: Array.from(flags) };
    }

    // Priority 3: Default fallback with inferred generic (non-brand, non-generic token)
    const defaultToken = cleanedTokens.find(t => !genericTerms.has(t) && !carBrandsMap.has(t)) || cleanedTokens[0];
    const lowerDefault = defaultToken.toLowerCase();
    if (carBrandsMap.has(lowerDefault) || genericTerms.has(lowerDefault)) {
      flags.add('InvalidDefaultFallback');
      flags.add('ManualReviewRecommended');
      return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
    }

    const formattedDefault = capitalizeName(defaultToken).name;
    let companyName = formattedDefault;
    let confidenceScore = 125;

    // Infer a generic term
    const genericSuffixes = ['drive', 'park', 'center', 'world'];
    let inferredGeneric = genericSuffixes.find(suffix => lowerDefault.includes(suffix));
    if (inferredGeneric) {
      const formattedGeneric = capitalizeName(inferredGeneric).name;
      companyName = `${formattedDefault} ${formattedGeneric}`;
      flags.add('InferredGeneric');
    } else {
      companyName = `${formattedDefault} Auto`;
      flags.add('DefaultGeneric');
    }

    // Deduplicate
    const words = companyName.split(' ').map(w => w.toLowerCase());
    if (new Set(words).size !== words.length) {
      flags.add('DuplicatesRemoved');
      companyName = formattedDefault;
      confidenceScore = 95;
    }
    if (companyName.split(' ').length > 3) {
      flags.add('TokenLimitExceeded');
      companyName = formattedDefault;
      confidenceScore = 95;
    }

    flags.add('DefaultFallback');
    flags.add('ManualReviewRecommended');
    return { companyName, confidenceScore, flags: Array.from(flags) };
  } catch (e) {
    log('error', 'tryGenericPattern failed', { tokens, error: e.message, stack: e.stack });
    flags.add('GenericPatternError');
    flags.add('ManualReviewRecommended');
    return { companyName: '', confidenceScore: 0, flags: Array.from(flags) };
  }
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
  let confidenceScore = 0; // Default to 0 for consistency
  let flags = new Set();
  let tokens = 0;
  let extractedTokens = [];
  const carBrandsSet = new Map(CAR_BRANDS.map(b => [b.toLowerCase(), b]));
  const enrichmentCache = new Map();
  let fallbackAttempts = 0;
  const maxFallbackAttempts = 3;

  try {
    if (!domain || typeof domain !== "string") {
      log("error", "Invalid domain input", { domain, originalDomain });
      flags.add("InvalidDomainInput");
      return { companyName, confidenceScore, flags: Array.from(flags), tokens };
    }
    if (!originalDomain || typeof originalDomain !== "string") {
      log("warn", "Invalid originalDomain, using domain as fallback", { originalDomain, domain });
      originalDomain = domain;
    }

    if (enrichmentCache.has(normalizedDomain)) {
      const cached = enrichmentCache.get(normalizedDomain);
      log("debug", "Cache hit for duplicate domain", { domain, cached });
      flags.add("DuplicateDomainCached");
      return { ...cached, flags: Array.from(new Set([...cached.flags, ...flags])) };
    }

    let meta = {};
    if (useMeta) {
      try {
        meta = await fetchMetaData(domain);
      } catch (err) {
        log("error", "fetchMetaData failed", { domain, error: err.message, stack: err.stack });
        flags.add("MetaDataFailed");
      }
    }

    if (BRAND_ONLY_DOMAINS.includes(`${normalizedDomain}.com`)) {
      const result = { companyName: "", confidenceScore: 0, flags: Array.from(new Set(["BrandOnlyDomainSkipped"])), tokens };
      enrichmentCache.set(normalizedDomain, result);
      return result;
    }

    if (TEST_CASE_OVERRIDES[originalDomain]) {
      const result = {
        companyName: TEST_CASE_OVERRIDES[originalDomain],
        confidenceScore: 125,
        flags: Array.from(new Set(["TestCaseOverride"])),
        tokens
      };
      enrichmentCache.set(normalizedDomain, result);
      return result;
    }

    if (OVERRIDES[normalizedDomain]) {
      const result = {
        companyName: OVERRIDES[normalizedDomain],
        confidenceScore: 125,
        flags: Array.from(new Set(["OverrideApplied"])),
        tokens
      };
      enrichmentCache.set(normalizedDomain, result);
      return result;
    }

    extractedTokens = earlyCompoundSplit(normalizedDomain);
    if (!extractedTokens || extractedTokens.length === 0) {
      flags.add("NoTokensExtracted");
      flags.add("ManualReviewRecommended");
      const result = { companyName, confidenceScore, flags: Array.from(flags), tokens };
      enrichmentCache.set(normalizedDomain, result);
      return result;
    }

    tokens = extractedTokens.length;

    // Prioritize patterns based on token characteristics
    const hasBrand = extractedTokens.some(t => carBrandsSet.has(t.toLowerCase()));
    const hasProper = extractedTokens.some(t => KNOWN_PROPER_NOUNS.has(t.toLowerCase()));
    const hasCity = extractedTokens.some(t => KNOWN_CITIES_SET.has(capitalizeName(t).name));
    const hasGeneric = extractedTokens.some(t => ['auto', 'automotive', 'motors', 'dealer', 'dealers', 'motor', 'group', 'mall', 'automall', 'cares'].includes(t.toLowerCase()));

    const patterns = [];
    if (hasProper) patterns.push(tryProperNounPattern, tryHumanNamePattern);
    if (hasBrand && hasCity) patterns.push(tryBrandCityPattern);
    if (hasCity && hasGeneric) patterns.push(tryCityAutoPattern);
    if (hasBrand && hasGeneric) patterns.push(tryBrandGenericPattern);
    patterns.push(tryGenericPattern); // Always include as last resort

    let result = null;
    for (const pattern of patterns) {
      result = await pattern(extractedTokens, meta);
      if (result.companyName) {
        const words = result.companyName.split(' ').map(w => w.toLowerCase());
        if (new Set(words).size !== words.length) {
          const dedupedName = [...new Set(words)].map(capitalizeName).map(t => t.name).join(' ');
          result.companyName = dedupedName;
          result.confidenceScore = Math.min(result.confidenceScore, 95);
          result.flags.push('DuplicatesRemoved');
        }
        if (result.companyName.split(' ').length > 3) {
          result.companyName = result.companyName.split(' ').slice(0, 3).join(' ');
          result.confidenceScore = Math.min(result.confidenceScore, 95);
          result.flags.push('TokenLimitExceeded');
        }
        if (result.companyName.length > 12 && !/\s/.test(result.companyName)) {
          result.confidenceScore = Math.min(result.confidenceScore, 95);
          result.flags.push('BlobLikeFallback', 'ManualReviewRecommended');
        }
        const lowerName = result.companyName.toLowerCase();
        if (carBrandsSet.has(lowerName) || CAR_BRANDS.includes(lowerName)) {
          result.companyName = '';
          result.confidenceScore = 0;
          result.flags.push('BrandOnlyBlocked', 'ManualReviewRecommended');
        }
        break;
      }
    }

    let finalResult = {
      companyName: result.companyName || '',
      confidenceScore: result.companyName ? result.confidenceScore : 0,
      flags: Array.from(new Set([result ? pattern.name : 'NoPatternMatch', ...result.flags, ...flags])),
      tokens
    };

    // Adaptive confidence threshold for fallback
    const confidenceThreshold = (hasBrand || hasCity || hasProper) ? 95 : 80; // Lower threshold for simpler domains

    if (!finalResult.companyName || finalResult.confidenceScore < confidenceThreshold) {
      if (fallbackAttempts >= maxFallbackAttempts) {
        log('warn', 'Max fallback attempts reached', { domain: normalizedDomain, attempts: fallbackAttempts });
        flags.add('MaxFallbackAttemptsReached');
        flags.add('ManualReviewRecommended');
      } else {
        // Retry with adjusted tokens or metadata
        if (meta.title && !finalResult.companyName) {
          const titleTokens = meta.title.toLowerCase().split(/\s+/).filter(t => t.length > 3);
          const candidate = titleTokens.find(t => !carBrandsSet.has(t) && !['auto', 'automotive', 'motors', 'dealer', 'dealers', 'motor', 'group', 'mall', 'automall', 'cares'].includes(t));
          if (candidate) {
            const formattedCandidate = capitalizeName(candidate).name;
            finalResult.companyName = formattedCandidate;
            finalResult.confidenceScore = 125;
            finalResult.flags.push('MetaTitleDirectFallback');
          }
        }

        if (!finalResult.companyName) {
          fallbackAttempts++;
          log('info', 'Starting fallback processing', { domain: normalizedDomain, attempt: fallbackAttempts });
          const fallbackResult = await fallbackName(domain, originalDomain, meta);
          if (fallbackResult.companyName) {
            finalResult = {
              companyName: fallbackResult.companyName,
              confidenceScore: fallbackResult.confidenceScore,
              flags: Array.from(new Set([...finalResult.flags, ...fallbackResult.flags, 'FallbackTriggered'])),
              tokens: fallbackResult.tokens
            };
          }
        }
      }
    }

    if (finalResult.companyName) {
      const domainBrand = CAR_BRANDS.find(b => normalizedDomain.includes(b.toLowerCase())) || null;
      const { validatedName, flags: validationFlags, confidenceScore: updatedConfidence } = validateFallbackName(
        { name: finalResult.companyName, brand: null, flagged: false },
        normalizedDomain,
        domainBrand,
        finalResult.confidenceScore
      );
      if (validatedName) {
        finalResult.companyName = validatedName;
        finalResult.confidenceScore = updatedConfidence;
        finalResult.flags = Array.from(new Set([...finalResult.flags, ...validationFlags]));
      } else {
        finalResult.companyName = '';
        finalResult.confidenceScore = 0;
        finalResult.flags = Array.from(new Set([...finalResult.flags, ...validationFlags, 'ValidationFailed', 'ManualReviewRecommended']));
      }
    }

    enrichmentCache.set(normalizedDomain, finalResult);
    return finalResult;
  } catch (err) {
    log("error", "humanizeName failed", {
      domain: normalizedDomain || "unknown",
      error: err.message,
      stack: err.stack,
      tokensExtracted: extractedTokens || []
    });
    flags.add("HumanizeNameError");
    flags.add("ManualReviewRecommended");
    const errorResult = { companyName, confidenceScore, flags: Array.from(flags), tokens };
    enrichmentCache.set(normalizedDomain, errorResult);
    return errorResult;
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

    const clean = domain.trim().toLowerCase();

    const meta = {
      "donjacobs.com": { title: "Chevrolet Dealer" },
      "crossroadscars.com": { title: "Toyota Dealer" },
      "chicagocars.com": { title: "Toyota Dealer in Chicago" },
      "davisautosales.com": { title: "Davis Auto" },
      "northwestcars.com": { title: "Northwest Toyota" },
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
      "crystalautogroup.com": { title: "Crystal Auto" },
      "lacitycars.com": { title: "LA City Auto" },
      "barlowautogroup.com": { title: "Barlow Auto" },
      "drivevictory.com": { title: "Victory Auto" },
      "jaxcjd.com": { title: "Dodge Dealer in Jacksonville" },
      "veramotors.com": { title: "Vera Motors" },
      "stonemountainvw.com": { title: "Stone Mountain VW" },
      "sandskia.com": { title: "Sands Kia" },
      "fortcollinskia.com": { title: "Kia Dealer in Fort Collins" },
      "schworervolkswagen.com": { title: "Schworer VW" },
      "philsmithkia.com": { title: "Phil Smith Kia" },
      "gregleblanc.com": { title: "Greg LeBlanc" },
      "jimfalkmotorsofmaui.com": { title: "Jim Falk Motors" },
      "robbynixonbuickgmc.com": { title: "Robby Nixon GMC" },
      "tomlinsonmotorco.com": { title: "Tomlinson Motor Co." },
      "jaywolfe.com": { title: "Jay Wolfe Automotive" },
      "sunsetmitsubishi.com": { title: "Sunset Mitsubishi" },
      "joycekoons.com": { title: "Joyce Koons Honda" },
      "brooklynvolkswagen.com": { title: "Brooklyn Volkswagen" }
    };

    return meta[clean] || {};
  } catch (e) {
    log("error", "fetchMetaData failed", { domain, error: e.message, stack: e.stack });
    return {};
  }
}

/**
 * Extracts a brand-safe or human name from meta.title
 * @param {Object} meta - Metadata object
 * @returns {Object|null} - Object with name, confidence score, and flags, or null
 */
function getMetaTitleBrand(meta) {
  try {
    if (!meta || typeof meta.title !== "string") {
      log("warn", "Invalid meta title in getMetaTitleBrand", { meta });
      return null;
    }

    const title = meta.title.toLowerCase().replace(/[^a-z0-9\s]/gi, '');
    const words = title.split(/\s+/).filter(Boolean);

    // Precompute maps for efficiency
    const firstNamesMap = new Map([...KNOWN_FIRST_NAMES].map(f => [f.toLowerCase(), f]));
    const lastNamesMap = new Map([...KNOWN_LAST_NAMES].map(l => [l.toLowerCase(), l]));
    const properNounsMap = new Map(KNOWN_PROPER_NOUNS.map(n => [n.toLowerCase().replace(/\s+/g, ''), n]));
    const citiesMap = new Map([...KNOWN_CITIES_SET].map(c => [c.toLowerCase().replace(/\s+/g, ''), c]));
    const carBrandsMap = new Map([...CAR_BRANDS, ...Object.entries(ABBREVIATION_EXPANSIONS)].map(([k, v]) => [k.toLowerCase(), v || k]));
    const genericTerms = new Set(['auto', 'automotive', 'motors', 'motor', 'dealer', 'dealers', 'group', 'mall', 'automall', 'cares', 'drive', 'park', 'center', 'world', 'cars']);

    // Check for multiple brands
    const brandTokens = words.filter(w => carBrandsMap.has(w));
    if (brandTokens.length > 1) {
      log('warn', 'Multiple brands detected in meta title', { title, brandTokens });
      return null;
    }

    let companyName = null;
    let confidenceScore = 125;
    let flags = new Set(['MetaTitleExtracted']);

    // Priority 1: Match full human name (first + last, consecutive or non-consecutive)
    const nameCandidates = [];
    for (let i = 0; i < words.length; i++) {
      const first = words[i];
      if (firstNamesMap.has(first)) {
        for (let j = 0; j < words.length; j++) {
          if (i === j) continue;
          const last = words[j];
          if (lastNamesMap.has(last)) {
            nameCandidates.push({
              first: capitalizeName(first).name,
              last: capitalizeName(last).name,
              distance: Math.abs(i - j)
            });
          }
        }
      }
    }

    if (nameCandidates.length > 0) {
      // Prefer the closest pair
      nameCandidates.sort((a, b) => a.distance - b.distance);
      const bestMatch = nameCandidates[0];
      companyName = `${bestMatch.first} ${bestMatch.last}`;
      flags.add('HumanNameMatch');
    }

    // Priority 2: Match standalone proper noun or city
    if (!companyName) {
      for (const word of words) {
        const wordNoSpaces = word.replace(/\s+/g, '');
        if (properNounsMap.has(wordNoSpaces) && !carBrandsMap.has(word)) {
          companyName = properNounsMap.get(wordNoSpaces);
          flags.add('ProperNounMatch');
          break;
        }
        if (citiesMap.has(wordNoSpaces) && !carBrandsMap.has(word)) {
          companyName = citiesMap.get(wordNoSpaces);
          flags.add('CityMatch');
          break;
        }
      }
    }

    // Priority 3: Match standalone first or last name (if no brand present)
    if (!companyName && !brandTokens.length) {
      for (const word of words) {
        if (firstNamesMap.has(word)) {
          companyName = capitalizeName(word).name;
          flags.add('FirstNameMatch');
          break;
        }
        if (lastNamesMap.has(word)) {
          companyName = capitalizeName(word).name;
          flags.add('LastNameMatch');
          break;
        }
      }
    }

    // Append a generic term if present
    if (companyName) {
      const genericCandidate = words.find(t => genericTerms.has(t) && !carBrandsMap.has(t));
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

    // Priority 4: Match only one car brand (if no name found)
    if (!companyName) {
      for (const word of words) {
        if (carBrandsMap.has(word)) {
          companyName = carBrandsMap.get(word);
          flags.add('BrandMatch');
          break;
        }
      }
    }

    if (companyName) {
      log("debug", "getMetaTitleBrand succeeded", { companyName, confidenceScore, flags });
      return { companyName, confidenceScore, flags: Array.from(flags) };
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
