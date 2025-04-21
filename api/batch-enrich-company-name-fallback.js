// api/company-name-fallback.js
// Fallback logic using OpenAI with caching

import { humanizeName, getMetaTitleBrand, KNOWN_CITIES_SET, capitalizeName, earlyCompoundSplit } from "./lib/humanize.js";
import { callOpenAI } from "./lib/openai.js";
import winston from "winston";
import path from "path";

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

/**
 * Logs messages with Winston
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 */
function log(level, message, context = {}) {
  logger[level]({ message, domain: context.domain || null, ...context });
}

// Comprehensive list of car brands
const CAR_BRANDS = [
  "acura", "alfa romeo", "amc", "aston martin", "audi", "bentley", "bmw", "bugatti", "buick",
  "cadillac", "carmax", "cdj", "cdjrf", "cdjr", "chev", "chevvy", "chevrolet", "chrysler", "cjd",
  "daewoo", "dodge", "eagle", "ferrari", "fiat", "ford", "genesis", "gmc", "honda", "hummer",
  "hyundai", "inf", "infiniti", "isuzu", "jaguar", "jeep", "jlr", "kia", "lamborghini", "land rover",
  "landrover", "lexus", "lincoln", "lucid", "maserati", "mclaren", "maz", "mazda", "mb", "merc", "mercedes",
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
  "volkswagen": "VW", "volvo": "Volvo", "vw": "VW", "chevy": "Chevy"
};

// Abbreviation expansions for normalization
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

// List of brand-only domains to skip
const BRAND_ONLY_DOMAINS = [
  "chevy.com", "ford.com", "cadillac.com", "buick.com", "gmc.com", "chrysler.com",
  "dodge.com", "ramtrucks.com", "jeep.com", "lincoln.com", "toyota.com", "honda.com",
  "nissanusa.com", "subaru.com", "mazdausa.com", "mitsubishicars.com", "acura.com",
  "lexus.com", "infinitiusa.com", "hyundaiusa.com", "kia.com", "genesis.com",
  "bmwusa.com", "mercedes-benz.com", "audiusa.com", "vw.com", "volkswagen.com",
  "porsche.com", "miniusa.com", "fiatusa.com", "alfa-romeo.com", "landroverusa.com",
  "jaguarusa.com", "tesla.com", "lucidmotors.com", "rivian.com", "volvocars.com"
];

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
  "sunsetmitsubishi.com": "Sunset Mitsubishi",
  "sunnysideauto.com": "Sunnyside Chevy",
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

/**
 * Splits merged tokens using earlyCompoundSplit from humanize.js.
 * @param {string} name - The name to split.
 * @returns {string} - The split name.
 */
function splitMergedTokens(name) {
  try {
    if (!name || typeof name !== "string") {
      log("error", "Invalid name in splitMergedTokens", { name });
      return name;
    }

    const splitTokens = earlyCompoundSplit(name);
    const result = splitTokens.join(" ");
    log("debug", "splitMergedTokens result", { name, result });
    return result;
  } catch (e) {
    log("error", "splitMergedTokens failed", { name, error: e.message });
    return name;
  }
}

// Blocklist for spammy patterns
const BLOCKLIST = ["auto auto", "group group", "cars cars", "sales sales"];

// Spammy tokens to filter out
const SPAMMY_TOKENS = ["sales", "autogroup", "cars", "group", "auto"];

// Known proper nouns for noun-pair restoration (subset of KNOWN_PROPER_NOUNS from humanize.js)
const KNOWN_PROPER_NOUNS_ARRAY = [
  "Bill", "Dube", "Don", "Jacobs", "Rick", "Smith", "McLarty", "Daniel", "NP", "Lincoln",
  "Sunset", "Classic", "Tasca", "Davis", "Barlow", "Mike", "Erdman", "AutoNation", "Robby", "Nixon",
  "Robert", "Thorne", "Crystal", "Young", "Victory"
];

// Cache for OpenAI results
const openAICache = new Map();

// Custom error class for fallback failures
class FallbackError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "FallbackError";
    this.details = details;
  }
}

/**
 * Validates OpenAI fallback name to ensure it meets cold-email-safe criteria.
 * @param {Object} result - OpenAI result { name: string, brand: string | null, flagged: boolean }.
 * @param {string} domain - The input domain (e.g., "chevyofcolumbuschevrolet.com").
 * @param {string | null} domainBrand - Brand detected from domain (e.g., "Chevrolet").
 * @returns {Object} - { validatedName: string | null, flags: string[] }.
 */
function validateFallbackName(result, domain, domainBrand) {
  const flags = [];
  let validatedName = result.name?.trim();

  log("info", "validateFallbackName started", { domain, result });

  try {
    // Ensure result is valid
    if (!result || !validatedName || typeof validatedName !== "string") {
      log("warn", "Invalid OpenAI result", { domain, result });
      flags.push("FallbackNameError", "ReviewNeeded");
      return { validatedName: null, flags };
    }

    // Split merged tokens (e.g., "Rodbakerford" → "Rod Baker")
    if (validatedName.split(" ").length === 1) {
      const splitName = splitMergedTokens(validatedName);
      if (splitName !== validatedName) {
        validatedName = splitName;
        log("info", "Merged tokens split", { domain, validatedName });
        flags.push("TokenSplitApplied");
      } else {
        validatedName = capitalizeName(validatedName).name;
      }
    }

    // Check for city-only or brand-only outputs
    if (validatedName) {
      const isBrand = CAR_BRANDS.includes(validatedName.toLowerCase());
      const isCity = KNOWN_CITIES_SET.has(validatedName.toLowerCase());
      const isProper = KNOWN_PROPER_NOUNS_ARRAY.includes(validatedName);
      if (!isProper && (isBrand || isCity)) {
        log("warn", "City-only or brand-only output detected", { domain, name: validatedName });
        flags.push(isBrand ? "BrandOnlyFallback" : "CityOnlyFallback", "ReviewNeeded");
        return { validatedName: null, flags };
      }
    }

    // Enforce domain brand precedence
    if (result.brand && domainBrand && result.brand.toLowerCase() !== domainBrand.toLowerCase()) {
      log("warn", "OpenAI brand mismatch", { domain, openAIBrand: result.brand, domainBrand });
      flags.push("FallbackNameError", "ReviewNeeded");
      return { validatedName: null, flags };
    }

    // Validate brand against CAR_BRANDS
    if (result.brand && !CAR_BRANDS.includes(result.brand.toLowerCase())) {
      log("warn", "OpenAI hallucinated brand", { domain, brand: result.brand });
      flags.push("FallbackNameError", "ReviewNeeded");
      return { validatedName: null, flags };
    }

    // Check for uncapitalized or malformed output
    if (!/^([A-Z][a-z]*\s?){1,3}$/.test(validatedName)) {
      log("warn", "Uncapitalized or malformed OpenAI output", { domain, name: validatedName });
      flags.push("FallbackNameError");
      validatedName = null;
    }

    // Check token count (1–3 words)
    if (validatedName && validatedName.split(" ").length > 3) {
      log("warn", "OpenAI output too long", { domain, name: validatedName });
      flags.push("FallbackNameError");
      validatedName = validatedName.split(" ").slice(0, 3).join(" ");
      flags.push("TokenCountAdjusted");
    }

    // Check for duplicates (e.g., "Kia Kia")
    if (validatedName) {
      const words = validatedName.toLowerCase().split(" ");
      const uniqueWords = new Set(words);
      if (uniqueWords.size !== words.length) {
        log("warn", "Duplicate tokens in OpenAI output", { domain, name: validatedName });
        validatedName = Array.from(uniqueWords).map(t => capitalizeName(t).name).join(" ");
        flags.push("DuplicatesRemoved");
      }
    }

    // Check blocklist
    if (validatedName && BLOCKLIST.includes(validatedName.toLowerCase())) {
      log("warn", "OpenAI output in blocklist", { domain, name: validatedName });
      flags.push("FallbackNameError");
      validatedName = null;
    }

    // Check spammy tokens and flag for review
    if (validatedName) {
      const hasSpammyTokens = SPAMMY_TOKENS.some(token => validatedName.toLowerCase().includes(token));
      const endsWithSpammy = SPAMMY_TOKENS.some(token => validatedName.toLowerCase().endsWith(token));
      if (hasSpammyTokens || endsWithSpammy) {
        log("warn", "OpenAI output contains spammy tokens", { domain, name: validatedName });
        flags.push("FallbackNameError", "ReviewNeeded");
        validatedName = validatedName.split(" ").filter(t => !SPAMMY_TOKENS.includes(t.toLowerCase())).join(" ");
        if (!validatedName) validatedName = null;
      }
    }

    // Check for 3+ brands in name
    if (validatedName) {
      const brandCount = validatedName.split(" ").filter(t => CAR_BRANDS.includes(t.toLowerCase())).length;
      if (brandCount >= 3) {
        log("warn", "Too many brands in OpenAI output", { domain, name: validatedName });
        flags.push("FallbackNameError", "ReviewNeeded");
        validatedName = null;
      }
    }

    // Strip "of", "and", "the" between brand/city pairs
    if (validatedName) {
      const tokens = validatedName.split(" ").filter(t => !["of", "and", "the"].includes(t.toLowerCase()));
      validatedName = tokens.join(" ");
    }

    // Log successful validation
    if (validatedName) {
      log("info", "OpenAI output validated", { domain, name: validatedName });
    }

    return { validatedName, flags };
  } catch (e) {
    log("error", "validateFallbackName failed", { domain, error: e.message, stack: e.stack });
    flags.push("FallbackNameError", "ReviewNeeded");
    return { validatedName: null, flags };
  }
}

/**
 * Fallback logic for low-confidence or failed humanize results
 * @param {string} domain - Domain to enrich
 * @param {Object} meta - Meta data
 * @returns {{companyName: string, confidenceScore: number, flags: Array<string>, tokens: number}} - Enriched result
 */
async function fallbackName(domain, meta = {}) {
  const normalizedDomain = domain?.toLowerCase().trim() || "";
  let companyName = "";
  let confidenceScore = 80;
  let flags = [];
  let tokens = 0;

  try {
    log("info", "Starting fallback processing", { domain: normalizedDomain });

    // Check OVERRIDES first
    if (OVERRIDES[normalizedDomain]) {
      log("info", "Using override", { domain: normalizedDomain, companyName: OVERRIDES[normalizedDomain] });
      return {
        companyName: OVERRIDES[normalizedDomain],
        confidenceScore: 125,
        flags: ["Override"],
        tokens: 0
      };
    }

    if (!normalizedDomain) {
      log("error", "Invalid domain input", { domain: normalizedDomain });
      flags.push("InvalidDomainInput");
      return { companyName, confidenceScore, flags: Array.from(new Set(flags)), tokens };
    }

    if (BRAND_ONLY_DOMAINS.includes(`${normalizedDomain}.com`)) {
      log("info", "Skipping fallback for brand-only domain", { domain: normalizedDomain });
      flags.push("BrandOnlyDomainSkipped");
      return { companyName, confidenceScore: 0, flags: Array.from(new Set(flags)), tokens };
    }

    // Try humanizeName first
    let initialResult;
    try {
      initialResult = await humanizeName(normalizedDomain, normalizedDomain, true);
      flags.push(...initialResult.flags);
      log("info", "humanizeName completed", { domain: normalizedDomain, result: initialResult });
      if (initialResult.confidenceScore >= 95 && !initialResult.flags.includes("ReviewNeeded")) {
        log("info", "Using humanizeName result", { domain: normalizedDomain, companyName: initialResult.companyName });
        return {
          companyName: initialResult.companyName,
          confidenceScore: initialResult.confidenceScore,
          flags: Array.from(new Set(flags)),
          tokens: initialResult.tokens || 0
        };
      }
      companyName = initialResult.companyName || "";
      confidenceScore = initialResult.confidenceScore || 80;
      tokens = initialResult.tokens || 0;
    } catch (error) {
      log("error", "humanizeName failed", { domain: normalizedDomain, error: error.message });
      flags.push("HumanizeNameError");
      initialResult = { companyName: "", confidenceScore: 80, flags: [], tokens: 0 };
    }

    // Enhanced token rescue
    let cleanDomain;
    try {
      cleanDomain = normalizedDomain.replace(/^(www\.)|(\.com|\.net|\.org|\.biz|\.ca|\.co\.uk)$/g, "");
      let extractedTokens = earlyCompoundSplit(cleanDomain);
      tokens = extractedTokens.length;
      extractedTokens = extractedTokens
        .map(t => t.toLowerCase())
        .filter(t => !SPAMMY_TOKENS.includes(t) && t !== "of");

      // Priority 1: Proper noun pair
      const properNounPair = extractedTokens.filter(t => KNOWN_PROPER_NOUNS_ARRAY.includes(capitalizeName(t).name));
      if (properNounPair.length >= 2) {
        const name = properNounPair.slice(0, 2).map(t => capitalizeName(t).name).join(" ");
        log("info", "Proper noun pair rescued", { domain: normalizedDomain, name });
        flags.push("ProperNounRecovered");
        return {
          companyName: name,
          confidenceScore: 125,
          flags: Array.from(new Set(flags)),
          tokens
        };
      }

      // Priority 2: Single proper noun
      const proper = extractedTokens.find(t => KNOWN_PROPER_NOUNS_ARRAY.includes(capitalizeName(t).name));
      if (proper) {
        const formattedProper = capitalizeName(proper).name;
        log("info", "Single proper noun rescued", { domain: normalizedDomain, name: formattedProper });
        flags.push("ProperNounRecovered");
        return {
          companyName: formattedProper,
          confidenceScore: 125,
          flags: Array.from(new Set(flags)),
          tokens
        };
      }

      // Priority 3: City + Brand or Generic
      const city = extractedTokens.find(t => KNOWN_CITIES_SET.has(t.toLowerCase()));
      const domainBrand = CAR_BRANDS.find(b => cleanDomain.includes(b.toLowerCase()));
      const metaBrand = getMetaTitleBrand(meta);
      if (city) {
        if (domainBrand) {
          const formattedCity = capitalizeName(city).name;
          const formattedBrand = BRAND_MAPPING[domainBrand.toLowerCase()] || capitalizeName(domainBrand).name;
          const name = `${formattedCity} ${formattedBrand}`;
          log("info", "City and domain brand applied", { domain: normalizedDomain, name });
          flags.push("CityBrandPattern");
          return {
            companyName: name,
            confidenceScore: 125,
            flags: Array.from(new Set(flags)),
            tokens
          };
        }
        if (metaBrand) {
          const formattedCity = capitalizeName(city).name;
          const formattedBrand = BRAND_MAPPING[metaBrand.toLowerCase()] || capitalizeName(metaBrand).name;
          const name = `${formattedCity} ${formattedBrand}`;
          log("info", "City and meta brand applied", { domain: normalizedDomain, name });
          flags.push("CityBrandPattern", "MetaTitleBrandAppended");
          return {
            companyName: name,
            confidenceScore: 125,
            flags: Array.from(new Set(flags)),
            tokens
          };
        }
        const generic = extractedTokens.find(t => ['auto', 'motors', 'dealers', 'group', 'cares'].includes(t));
        if (generic) {
          const formattedCity = capitalizeName(city).name;
          const formattedGeneric = capitalizeName(generic).name;
          const name = `${formattedCity} ${formattedGeneric}`;
          log("info", "City and generic term applied", { domain: normalizedDomain, name });
          flags.push("CityGenericPattern");
          return {
            companyName: name,
            confidenceScore: 125,
            flags: Array.from(new Set(flags)),
            tokens
          };
        }
        const formattedCity = capitalizeName(city).name;
        log("info", "City-only output", { domain: normalizedDomain, name: formattedCity });
        flags.push("CityOnlyFallback");
        return {
          companyName: formattedCity,
          confidenceScore: 125,
          flags: Array.from(new Set(flags)),
          tokens
        };
      }

      // Priority 4: Brand + Generic
      if (domainBrand && extractedTokens.includes('auto') && !companyName) {
        const formattedBrand = BRAND_MAPPING[domainBrand.toLowerCase()] || capitalizeName(domainBrand).name;
        const name = `${formattedBrand} Auto`;
        log("info", "Brand and generic term applied", { domain: normalizedDomain, name });
        flags.push("BrandGenericMatch");
        return {
          companyName: name,
          confidenceScore: 100,
          flags: Array.from(new Set(flags)),
          tokens
        };
      }
    } catch (error) {
      log("error", "Token rescue failed", { domain: normalizedDomain, error: error.message });
      flags.push("LocalFallbackFailed");
    }

    // Check for brand-only output and enhance with metadata
    if (companyName && CAR_BRANDS.includes(companyName.toLowerCase())) {
      const city = extractedTokens?.find(t => KNOWN_CITIES_SET.has(t.toLowerCase()));
      const inferredBrand = companyName;
      if (city) {
        companyName = `${capitalizeName(city).name} ${inferredBrand}`;
        log("info", "Brand-only output, appending city", { domain: normalizedDomain, name: companyName });
        flags.push("BrandCityAppended");
        confidenceScore = 125;
      } else if (metaBrand) {
        companyName = `${capitalizeName(metaBrand).name} ${inferredBrand}`;
        log("info", "Brand-only output, appending meta brand", { domain: normalizedDomain, name: companyName });
        flags.push("MetaTitleBrandAppended");
        confidenceScore = 100;
      } else {
        log("warn", "Brand-only output", { domain: normalizedDomain, name: companyName });
        flags.push("BrandOnlyFallback", "ReviewNeeded");
        confidenceScore = 50;
      }
    }

    // Final token accuracy pass
    if (companyName) {
      const isProper = companyName.split(" ").every(t => KNOWN_PROPER_NOUNS_ARRAY.includes(t));
      if (!isProper && companyName.split(" ").length === 1) {
        const splitName = splitMergedTokens(companyName);
        if (splitName !== companyName) {
          companyName = splitName;
          log("info", "Final token split applied", { domain: normalizedDomain, name: companyName });
          flags.push("TokenSplitApplied");
          confidenceScore = confidenceScore > 50 ? 55 : confidenceScore;
          flags.push("ReviewNeeded");
        }
      }

      // Cap score for weak fallbacks
      if (companyName.split(" ").length < 2 && !isProper) {
        confidenceScore = Math.min(confidenceScore, 50);
        flags.push("LowTokenVariety", "ReviewNeeded");
      }

      // Possessive-friendly rule
      const POSSESSIVE_SAFE_NAMES = ["Rick Smith", "Don Jacobs", "Bill Dube", "Robby Nixon", "Robert Thorne", "Team"];
      if (!POSSESSIVE_SAFE_NAMES.includes(companyName)) {
        const shouldAppendBrand = (domain, name) => {
          const domainBrand = CAR_BRANDS.find(b => domain.includes(b.toLowerCase()));
          return domainBrand && !name.toLowerCase().includes(domainBrand.toLowerCase());
        };
        if (shouldAppendBrand(normalizedDomain, companyName)) {
          const domainBrand = CAR_BRANDS.find(b => normalizedDomain.includes(b.toLowerCase()));
          const inferredBrand = BRAND_MAPPING[domainBrand.toLowerCase()] || capitalizeName(domainBrand).name;
          companyName = `${companyName} ${inferredBrand}`;
          log("info", "Brand appended for clarity", { domain: normalizedDomain, name: companyName });
          flags.push("BrandAppendedForClarity");
        }
      }
    }

    // Apply abbreviation expansions and brand mapping
    if (companyName) {
      let normalizedName = companyName;
      Object.keys(ABBREVIATION_EXPANSIONS).forEach(abbr => {
        const regex = new RegExp(`\\b${abbr}\\b`, "gi");
        normalizedName = normalizedName.replace(regex, ABBREVIATION_EXPANSIONS[abbr]);
      });
      if (normalizedName.includes("Chevrolet")) {
        normalizedName = normalizedName.replace("Chevrolet", "Chevy");
      }
      if (normalizedName.includes("Mercedes-Benz")) {
        normalizedName = normalizedName.replace("Mercedes-Benz", "M.B.");
      }
      if (normalizedName !== companyName) {
        companyName = normalizedName;
        log("info", "Applied abbreviation and brand normalization", { domain: normalizedDomain, companyName });
        flags.push("NormalizationApplied");
      }
    }

    // OpenAI fallback for spacing/casing only (last resort)
    if (companyName && (companyName.split(" ").length < 2 || /\b[a-z]+[A-Z]/.test(companyName))) {
      const cacheKey = `${normalizedDomain}:${(meta.title || "").toLowerCase().trim()}`;
      if (openAICache.has(cacheKey)) {
        const cached = openAICache.get(cacheKey);
        log("info", "Cache hit", { domain: normalizedDomain, companyName: cached.companyName });
        flags.push("OpenAICacheHit");
        return {
          companyName: cached.companyName,
          confidenceScore: cached.confidenceScore,
          flags: Array.from(new Set([...flags, ...cached.flags])),
          tokens: cached.tokens
        };
      }

      const prompt = `
        Given a name "${companyName}", return a JSON object with the name properly spaced and capitalized.
        Rules:
        - Only fix spacing and casing (e.g., "Jimmybritt" → {"name": "Jimmy Britt", "flagged": false}).
        - Do not add or invent new words (e.g., do not add "Auto", "Group", "Mall").
        - Use title case (e.g., "Rod Baker").
        - Response format: {"name": string, "flagged": boolean}
      `;
      try {
        log("info", "Calling OpenAI for spacing fix", { domain: normalizedDomain });
        const response = await callOpenAI(prompt, {
          model: "gpt-4-turbo",
          max_tokens: 20,
          temperature: 0.2,
          systemMessage: "You are a precise assistant for formatting names. Only adjust spacing and capitalization, do not add new words.",
          response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.output);
        let name = result.name?.trim();
        tokens = response.tokens;

        if (!name || result.flagged) {
          throw new FallbackError("OpenAI spacing fix failed", { domain: normalizedDomain });
        }

        // Extract domainBrand
        const domainBrand = CAR_BRANDS.find(b => normalizedDomain.includes(b.toLowerCase())) || null;

        // Validate OpenAI result
        const { validatedName, flags: validationFlags } = validateFallbackName({ name, brand: null, flagged: false }, normalizedDomain, domainBrand);
        flags.push(...validationFlags);

        // Prevent hallucination
        const originalWords = companyName.toLowerCase().split(/\s+/).filter(word => word);
        const newWords = name.toLowerCase().split(/\s+/).filter(word => word);
        const addedWords = newWords.filter(word => !originalWords.includes(word));
        if (addedWords.length > 0) {
          log("warn", "OpenAI hallucinated words", { domain: normalizedDomain, addedWords });
          flags.push("OpenAIHallucinationDetected", "ReviewNeeded");
        } else if (validatedName) {
          companyName = validatedName;
          confidenceScore = Math.min(confidenceScore + 5, 125);
          flags.push("OpenAISpacingFix");
        } else {
          flags.push("OpenAIFallbackFailed", "ReviewNeeded");
        }

        const finalResult = {
          companyName,
          confidenceScore,
          flags: Array.from(new Set(flags)),
          tokens
        };
        openAICache.set(cacheKey, finalResult);
        return finalResult;
      } catch (error) {
        log("error", "OpenAI spacing fix failed", { domain: normalizedDomain, error: error.message });
        flags.push("OpenAIFallbackFailed", "ReviewNeeded");
      }
    }

    // Final fallback
    if (!companyName) {
      companyName = capitalizeName(cleanDomain.split(/(?=[A-Z])/)[0]).name;
      flags.push("FallbackNameError", "ReviewNeeded");
      confidenceScore = 50;
    }

    const finalResult = {
      companyName,
      confidenceScore,
      flags: Array.from(new Set(flags)),
      tokens
    };

    openAICache.set(`${normalizedDomain}:${(meta.title || "").toLowerCase().trim()}`, finalResult);
    log("info", "Result cached", { domain: normalizedDomain, companyName });
    return finalResult;
  } catch (err) {
    log("error", "fallbackName failed", {
      domain: normalizedDomain || "unknown",
      error: err.message,
      stack: err.stack
    });
    flags.push("FallbackNameError", "ManualReviewRecommended");
    return { companyName, confidenceScore: 50, flags: Array.from(new Set(flags)), tokens };
  }
}

/**
 * Clears OpenAI cache
 */
function clearOpenAICache() {
  openAICache.clear();
  log("info", "OpenAI cache cleared", {});
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
      const result = await fallbackName(lead.domain, { title: lead.metaTitle });
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

export { fallbackName, clearOpenAICache, handler, validateFallbackName };
