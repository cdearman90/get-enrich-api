// api/company-name-fallback.js
// Fallback logic using OpenAI with caching

import { humanizeName, getMetaTitleBrand, KNOWN_CITIES_SET, capitalizeName, earlyCompoundSplit, KNOWN_PROPER_NOUNS } from "./lib/humanize.js";

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

const KNOWN_GENERIC_BLOBS = {
  "capitalbpg": "BPG Auto",
  "hmtrs": "HMTR Auto",
  "czag": "CZAG Auto",
  "nwh": "NWH Auto",
  "pbg": "PBG Auto",
  "rbm": "RBM Auto",
  "sth": "STH Auto"
};

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

// Blocklist for spammy patterns
const BLOCKLIST = ["auto auto", "group group", "cars cars", "sales sales"];

// Spammy tokens to filter out
const SPAMMY_TOKENS = ["sales", "autogroup", "cars", "group", "auto"];

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
 * Extracts tokens from a domain for fallback processing.
 * @param {string} domain - The cleaned domain (e.g., "jimmybrittchevrolet").
 * @returns {Object} - { tokens: string[], confidenceScore: number, flags: string[] }
 */
function extractTokens(domain) {
  const flags = [];
  let confidenceScore = 80; // Default for token extraction

  if (!domain || typeof domain !== 'string') {
    log('error', 'Invalid domain input in extractTokens', { domain });
    return { tokens: [], confidenceScore: 0, flags: ['InvalidDomainInput'] };
  }

  // Split on separators and camelCase boundaries
  let tokens = domain
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, '$1-$2') // Split camelCase (e.g., "JimmyBritt" → "Jimmy-Britt")
    .split(/[-_]/) // Split on hyphens and underscores
    .filter(token => token && /^[a-z0-9]+$/.test(token)); // Remove empty or invalid tokens

  // Remove suffixes and spammy tokens
  const SUFFIXES = new Set(['llc', 'inc', 'corp', 'co', 'ltd', 'motors', 'auto', 'group']);
  tokens = tokens.filter(token => !SUFFIXES.has(token) && !SPAMMY_TOKENS.includes(token));

  // Cap at 3 tokens for cold-email safety
  if (tokens.length > 3) {
    flags.push('TokenCountAdjusted');
    confidenceScore = Math.min(confidenceScore, 95);
    tokens = tokens.slice(0, 3);
  }

  // Log tokenization details
  log('debug', 'Extracted tokens', {
    domain,
    tokens,
    rawTokenCount: tokens.length,
    confidenceScore,
    flags,
  });

  return { tokens, confidenceScore, flags };
}

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

/**
 * Validates OpenAI fallback name to ensure it meets cold-email-safe criteria.
 * @param {Object} result - OpenAI result { name: string, brand: string | null, flagged: boolean }.
 * @param {string} domain - The input domain (e.g., "chevyofcolumbuschevrolet.com").
 * @param {string | null} domainBrand - Brand detected from domain (e.g., "Chevrolet").
 * @param {number} confidenceScore - Initial confidence score.
 * @returns {Object} - { validatedName: string | null, flags: string[], confidenceScore: number }.
 */
function validateFallbackName(result, domain, domainBrand, confidenceScore = 80) {
  const flags = new Set();
  let validatedName = result.name?.trim();

  log("info", "validateFallbackName started", { domain, result });

  try {
    // Ensure result is valid
    if (!result || !validatedName || typeof validatedName !== "string") {
      log("warn", "Invalid OpenAI result", { domain, result });
      flags.add("FallbackNameError");
      flags.add("ReviewNeeded");
      return { validatedName: null, flags: Array.from(flags), confidenceScore };
    }

    // Define regex pattern for name validation (e.g., "Chicago Auto")
    const pattern = /^([A-Z][a-z]+(?: [A-Z][a-z]+)?)(?: [A-Z][a-z]+)?$/; // Matches "Name", "First Last", or "Name Generic"

    // Split merged tokens
    if (validatedName.split(" ").length === 1) {
      const splitName = splitMergedTokens(validatedName);
      if (splitName !== validatedName) {
        validatedName = splitName;
        log("info", "Merged tokens split", { domain, validatedName });
        flags.add("TokenSplitApplied");
        confidenceScore = Math.min(confidenceScore, 95);
      } else {
        validatedName = capitalizeName(validatedName);
      }
    }

    // Enhanced blob-like name recovery
    if (validatedName && validatedName.length > 12 && !/\s/.test(validatedName)) {
      const lowerName = validatedName.toLowerCase();
      if (properNounsSet.has(lowerName)) { // Fixed: Use precomputed properNounsSet
        validatedName = capitalizeName(validatedName);
        log("info", "Blob-like name recovered as proper noun", { domain, validatedName });
        flags.add("BlobLikeRecovered");
      } else {
        const splitAttempt = validatedName.replace(/([a-z])([A-Z])/g, "$1 $2").split(" ").filter(Boolean);
        if (splitAttempt.length > 1) {
          validatedName = splitAttempt.map(t => capitalizeName(t)).join(" ");
          log("info", "Blob-like name split", { domain, validatedName });
          flags.add("BlobLikeSplit");
          confidenceScore = Math.min(confidenceScore, 95);
        } else {
          log("warn", "Blob-like name detected", { domain, validatedName });
          flags.add("BlobLikeFallback");
          flags.add("ReviewNeeded");
          confidenceScore = Math.min(confidenceScore, 80);
        }
    }

    // Check for city-only or brand-only outputs (allow city + generic)
    if (validatedName) {
      const tokens = validatedName.split(" ");
      const isBrand = CAR_BRANDS.includes(validatedName.toLowerCase());
      const isProper = properNounsSet.has(validatedName.toLowerCase()); // Fixed: Use precomputed properNounsSet
      const hasCity = tokens.some(t => KNOWN_CITIES_SET.has(t.toLowerCase()));
      const genericTerms = ['auto', 'motors', 'dealers', 'group', 'cares', 'cars', 'drive', 'center', 'world'];
      const hasGeneric = tokens.some(t => genericTerms.includes(t.toLowerCase()));

      if (!isProper) {
        if (isBrand) {
          log("warn", "Brand-only output detected", { domain, validatedName });
          flags.add("BrandOnlyFallback");
          flags.add("ReviewNeeded");
          return { validatedName: null, flags: Array.from(flags), confidenceScore };
        }
        if (hasCity && !hasGeneric && tokens.length === 1) {
          log("warn", "City-only output detected", { domain, validatedName });
          flags.add("CityOnlyFallback");
          flags.add("ReviewNeeded");
          return { validatedName: null, flags: Array.from(flags), confidenceScore };
        }
      }
    }

    // Handle brand mismatch
    if (result.brand && domainBrand && result.brand.toLowerCase() !== domainBrand.toLowerCase()) {
      log("warn", "OpenAI brand mismatch, prioritizing domain brand", { domain, openAIBrand: result.brand, domainBrand });
      flags.add("BrandMismatchPenalty");
      confidenceScore = Math.max(confidenceScore - 5, 50); // Reduced penalty
      const words = validatedName.split(" ");
      if (words.some(w => CAR_BRANDS.includes(w.toLowerCase()))) {
        validatedName = words.map(w => CAR_BRANDS.includes(w.toLowerCase()) ? (BRAND_MAPPING[domainBrand.toLowerCase()] || capitalizeName(domainBrand)) : w).join(" ");
        flags.add("DomainBrandApplied");
      }
    }

    // Validate brand against CAR_BRANDS
    if (result.brand && !CAR_BRANDS.includes(result.brand.toLowerCase())) {
      log("warn", "OpenAI hallucinated brand", { domain, brand: result.brand });
      flags.add("FallbackNameError");
      flags.add("ReviewNeeded");
      return { validatedName: null, flags: Array.from(flags), confidenceScore };
    }

    // Check for uncapitalized or malformed output (replace with pattern validation)
    if (validatedName && !pattern.test(validatedName)) {
      log("warn", "Uncapitalized or malformed output", { domain, validatedName });
      flags.add("FallbackNameError");
      flags.add("ReviewNeeded");
      validatedName = null;
    }

    // Check token count (1–3 words)
    if (validatedName && validatedName.split(" ").length > 3) {
      log("warn", "Output too long", { domain, validatedName });
      validatedName = validatedName.split(" ").slice(0, 3).join(" ");
      flags.add("TokenCountAdjusted");
      confidenceScore = Math.min(confidenceScore, 95);
    }

    // Check for duplicates
    if (validatedName) {
      const words = validatedName.toLowerCase().split(" ");
      const uniqueWords = [...new Set(words)];
      if (uniqueWords.length !== words.length) {
        log("warn", "Duplicate tokens in output", { domain, validatedName });
        validatedName = uniqueWords.map(t => capitalizeName(t)).join(" ");
        flags.add("DuplicatesRemoved");
        confidenceScore = Math.min(confidenceScore, 95);
      }
    }

    // Check blocklist
    if (validatedName && BLOCKLIST.includes(validatedName.toLowerCase())) {
      log("warn", "Output in blocklist", { domain, validatedName });
      flags.add("FallbackNameError");
      flags.add("ReviewNeeded");
      validatedName = null;
    }

    // Check spammy tokens (exclude valid generics)
    if (validatedName) {
      const safeGenerics = ['auto', 'motors', 'dealers', 'group', 'cares', 'cars', 'drive', 'center', 'world'];
      const hasSpammyTokens = SPAMMY_TOKENS.some(token => validatedName.toLowerCase().includes(token) && !safeGenerics.includes(token));
      if (hasSpammyTokens) {
        log("warn", "Output contains spammy tokens", { domain, validatedName });
        flags.add("SpammyTokens");
        flags.add("ReviewNeeded");
        validatedName = validatedName.split(" ").filter(t => !SPAMMY_TOKENS.includes(t.toLowerCase()) || safeGenerics.includes(t.toLowerCase())).join(" ");
        if (!validatedName) {
          validatedName = null;
          flags.add("FallbackNameError");
        }
      }
    }

    // Check for 3+ brands
    if (validatedName) {
      const brandCount = validatedName.split(" ").filter(t => CAR_BRANDS.includes(t.toLowerCase())).length;
      if (brandCount >= 3) {
        log("warn", "Too many brands in output", { domain, validatedName });
        flags.add("FallbackNameError");
        flags.add("ReviewNeeded");
        validatedName = null;
      }
    }

    // Log successful validation
    if (validatedName) {
      log("info", "Output validated successfully", { domain, validatedName, confidenceScore, flags: Array.from(flags) });
    }

    return { validatedName, flags: Array.from(flags), confidenceScore };
  } catch (e) {
    log("error", "validateFallbackName failed", { domain, error: e.message, stack: e.stack });
    flags.add("FallbackNameError");
    flags.add("ReviewNeeded");
    return { validatedName: null, flags: Array.from(flags), confidenceScore };
  }
}

/**
 * Fallback logic for low-confidence or failed humanize results
 * @param {string} domain - Domain to enrich
 * @param {string} originalDomain - Original domain for override lookup
 * @param {Object} meta - Meta data
 * @returns {{companyName: string, confidenceScore: number, flags: Array<string>, tokens: number}} - Enriched result
 */
async function fallbackName(domain, originalDomain, meta = {}) {
  const normalizedDomain = domain?.toLowerCase().trim() || "";
  let companyName = "";
  let confidenceScore = 0; // Default to 0 for consistency
  let flags = new Set(['FallbackName']);
  let tokens = 0;

  try {
    log("info", "Starting fallback processing", { domain: normalizedDomain });

    // Define regex pattern for company name validation (e.g., "Chicago Auto")
    const pattern = /^([A-Z][a-z]+(?: [A-Z][a-z]+)?)(?: [A-Z][a-z]+)?$/; // Matches "Name", "First Last", or "Name Generic"

    // Check OVERRIDES first
    if (OVERRIDES[normalizedDomain]) {
      const overrideName = OVERRIDES[normalizedDomain];
      if (!pattern.test(overrideName)) {
        log("warn", "Override name pattern validation failed", { domain: normalizedDomain, companyName: overrideName });
        flags.add("OverridePatternFailed");
        flags.add("ManualReviewRecommended");
        return { companyName: "", confidenceScore: 0, flags: Array.from(flags), tokens: 0 };
      }
      log("info", "Using override", { domain: normalizedDomain, companyName: overrideName });
      return {
        companyName: overrideName,
        confidenceScore: 125,
        flags: ["Override"],
        tokens: 0
      };
    }

    if (!normalizedDomain) {
      log("error", "Invalid domain input", { domain: normalizedDomain });
      flags.add("InvalidDomainInput");
      flags.add("ManualReviewRecommended");
      return { companyName, confidenceScore, flags: Array.from(flags), tokens };
    }

    if (BRAND_ONLY_DOMAINS.includes(`${normalizedDomain}.com`)) {
      log("info", "Skipping fallback for brand-only domain", { domain: normalizedDomain });
      flags.add("BrandOnlyDomainSkipped");
      return { companyName, confidenceScore: 0, flags: Array.from(flags), tokens };
    }

    // Try humanizeName first
    let initialResult;
    try {
      initialResult = await humanizeName(normalizedDomain); // Fixed: Updated call to match new signature
      flags.add(...initialResult.flags);
      log("info", "humanizeName completed", { domain: normalizedDomain, result: initialResult });

      // Adaptive confidence threshold based on token characteristics
      const hasBrand = initialResult.tokens.some(t => CAR_BRANDS.includes(t.toLowerCase()));
      const hasProper = initialResult.tokens.some(t => KNOWN_PROPER_NOUNS.has(t.toLowerCase()));
      const hasCity = initialResult.tokens.some(t => KNOWN_CITIES_SET.has(t.toLowerCase()));
      const confidenceThreshold = (hasBrand || hasCity || hasProper) ? 95 : 80;

      if (initialResult.confidenceScore >= confidenceThreshold && !initialResult.flags.includes("ReviewNeeded")) {
        log("info", "Using humanizeName result", { domain: normalizedDomain, companyName: initialResult.companyName });
        return {
          companyName: initialResult.companyName,
          confidenceScore: initialResult.confidenceScore,
          flags: Array.from(flags),
          tokens: initialResult.tokens || 0
        };
      }
      companyName = initialResult.companyName || "";
      confidenceScore = initialResult.confidenceScore || 0;
      tokens = initialResult.tokens || 0;
    } catch (error) {
      log("error", "humanizeName failed", { domain: normalizedDomain, error: error.message });
      flags.add("HumanizeNameError");
      initialResult = { companyName: "", confidenceScore: 0, flags: [], tokens: 0 };
    }

    // Enhanced token rescue
    let cleanDomain;
    try {
      cleanDomain = normalizedDomain.replace(/^(www\.)|(\.com|\.net|\.org|\.biz|\.ca|\.co\.uk)$/g, "");
      let extractedTokensResult = extractTokens(cleanDomain);
      let extractedTokens = extractedTokensResult.tokens;
      tokens = extractedTokens.length;
      flags.add(...extractedTokensResult.flags);
      confidenceScore = Math.max(confidenceScore, extractedTokensResult.confidenceScore);

      extractedTokens = extractedTokens
        .map(t => t.toLowerCase())
        .filter(t => !SPAMMY_TOKENS.includes(t) && t !== "of");

      // Priority 1: Retry humanizeName with proper noun sequence (support multi-word proper nouns)
      const properNounsSet = new Set(KNOWN_PROPER_NOUNS.map(n => n.toLowerCase()));
      const properNounTokens = extractedTokens.filter(t => properNounsSet.has(t));
      if (properNounTokens.length >= 2) {
        const tempName = properNounTokens.map(t => capitalizeName(t)).join(" ");
        const retryResult = await humanizeName(tempName); // Fixed: Updated call to match new signature
        if (retryResult.confidenceScore >= 95) {
          const validatedName = retryResult.companyName;
          if (!pattern.test(validatedName)) {
            log("warn", "Retry humanizeName result pattern validation failed", { domain: normalizedDomain, companyName: validatedName });
            flags.add("RetryPatternFailed");
          } else {
            log("info", "Retry humanizeName success with proper noun", { domain: normalizedDomain, companyName: validatedName });
            flags.add("RetryHumanizeSuccess");
            return {
              companyName: validatedName,
              confidenceScore: retryResult.confidenceScore,
              flags: Array.from(new Set([...retryResult.flags, ...flags])),
              tokens
            };
          }
        }
      }

      // Priority 2: Single proper noun with conditional brand append
      const singleProper = extractedTokens.find(t => properNounsSet.has(t) && !CAR_BRANDS.includes(t) && !KNOWN_CITIES_SET.has(t));
      if (singleProper) {
        companyName = capitalizeName(singleProper);
        if (!pattern.test(companyName)) {
          log("warn", "Single proper noun pattern validation failed", { domain: normalizedDomain, companyName });
          companyName = "";
        } else {
          confidenceScore = 95;
          flags.add("SingleProperNoun");

          // Append brand only if the name is ambiguous for cold emails (e.g., too generic)
          const domainBrand = CAR_BRANDS.find(b => cleanDomain.includes(b.toLowerCase()));
          if (domainBrand && (companyName.length < 5 || companyName.toLowerCase() === "smith" || companyName.toLowerCase() === "jones")) {
            const formattedBrand = BRAND_MAPPING[domainBrand.toLowerCase()] || capitalizeName(domainBrand);
            const combinedName = `${companyName} ${formattedBrand}`;
            if (!pattern.test(combinedName)) {
              log("warn", "Brand append pattern validation failed", { domain: normalizedDomain, companyName: combinedName });
            } else {
              companyName = combinedName;
              flags.add("BrandAppendedForClarity");
              confidenceScore = 100;
            }
          }

          if (companyName.length > 12 && !/\s/.test(companyName)) {
            flags.add("BlobLikeFallback");
            flags.add("ManualReviewRecommended");
            confidenceScore = 80;
          }
        }
      }

      // Priority 3: City + Brand or Generic (expanded generic terms)
      const city = extractedTokens.find(t => KNOWN_CITIES_SET.has(t.toLowerCase()));
      const domainBrand = CAR_BRANDS.find(b => cleanDomain.includes(b.toLowerCase()));
      const metaBrandResult = getMetaTitleBrand(meta);
      const metaBrand = metaBrandResult ? metaBrandResult.companyName : null;
      if (city) {
        if (domainBrand) {
          const formattedCity = capitalizeName(city);
          const formattedBrand = BRAND_MAPPING[domainBrand.toLowerCase()] || capitalizeName(domainBrand);
          companyName = `${formattedCity} ${formattedBrand}`;
          if (!pattern.test(companyName)) {
            log("warn", "City + domain brand pattern validation failed", { domain: normalizedDomain, companyName });
            companyName = formattedCity;
            flags.add("PatternValidationFailed");
          } else {
            log("info", "City and domain brand applied", { domain: normalizedDomain, companyName });
            flags.add("CityBrandPattern");
            confidenceScore = 125;
          }
        } else if (metaBrand) {
          const formattedCity = capitalizeName(city);
          const formattedBrand = BRAND_MAPPING[metaBrand.toLowerCase()] || capitalizeName(metaBrand);
          companyName = `${formattedCity} ${formattedBrand}`;
          if (!pattern.test(companyName)) {
            log("warn", "City + meta brand pattern validation failed", { domain: normalizedDomain, companyName });
            companyName = formattedCity;
            flags.add("PatternValidationFailed");
          } else {
            log("info", "City and meta brand applied", { domain: normalizedDomain, companyName });
            flags.add("CityBrandPattern");
            flags.add("MetaTitleBrandAppended");
            confidenceScore = metaBrandResult.confidenceScore;
          }
        } else {
          const genericTerms = ['auto', 'motors', 'dealers', 'group', 'cars', 'drive', 'center', 'world'];
          const generic = extractedTokens.find(t => genericTerms.includes(t));
          if (generic) {
            const formattedCity = capitalizeName(city);
            const formattedGeneric = capitalizeName(generic);
            companyName = `${formattedCity} ${formattedGeneric}`;
            if (!pattern.test(companyName)) {
              log("warn", "City + generic pattern validation failed", { domain: normalizedDomain, companyName });
              companyName = formattedCity;
              flags.add("PatternValidationFailed");
            } else {
              log("info", "City and generic term applied", { domain: normalizedDomain, companyName });
              flags.add("CityGenericPattern");
              confidenceScore = 95;
            }
          } else {
            companyName = capitalizeName(city);
            if (!pattern.test(companyName)) {
              log("warn", "City-only pattern validation failed", { domain: normalizedDomain, companyName });
              companyName = "";
              flags.add("PatternValidationFailed");
            } else {
              log("info", "City-only output", { domain: normalizedDomain, companyName });
              flags.add("CityOnlyFallback");
              flags.add("ManualReviewRecommended");
              confidenceScore = 80;
            }
          }
        }
      }

      // Priority 4: Generic Blob or Initials Fallback
      if (!companyName && extractedTokens.length === 1) {
        const token = extractedTokens[0];
        if (KNOWN_GENERIC_BLOBS[token]) {
          companyName = KNOWN_GENERIC_BLOBS[token];
          if (!pattern.test(companyName)) {
            log("warn", "Generic blob pattern validation failed", { domain: normalizedDomain, companyName });
            companyName = "";
            flags.add("PatternValidationFailed");
          } else {
            log("info", "Generic blob mapped", { domain: normalizedDomain, companyName });
            flags.add("GenericBlobMapped");
            confidenceScore = 95;
          }
        } else if (token.length >= 3 && token.length <= 5 && /^[a-zA-Z]+$/.test(token)) {
          const initials = token.toUpperCase();
          companyName = `${initials} Auto`;
          if (!pattern.test(companyName)) {
            log("warn", "Initials pattern validation failed", { domain: normalizedDomain, companyName });
            companyName = "";
            flags.add("PatternValidationFailed");
          } else {
            log("info", "Initials extracted", { domain: normalizedDomain, companyName });
            flags.add("InitialsRecovered");
            confidenceScore = 80;
          }
        }
      }

      // Priority 5: Brand + Generic (expanded generic terms)
      if (domainBrand && !companyName) {
        const genericTerms = ['auto', 'motors', 'dealers', 'group', 'cares', 'cars', 'drive', 'center', 'world'];
        const generic = extractedTokens.find(t => genericTerms.includes(t));
        if (generic) {
          const formattedBrand = BRAND_MAPPING[domainBrand.toLowerCase()] || capitalizeName(domainBrand);
          const formattedGeneric = capitalizeName(generic);
          companyName = `${formattedBrand} ${formattedGeneric}`;
          if (!pattern.test(companyName)) {
            log("warn", "Brand + generic pattern validation failed", { domain: normalizedDomain, companyName });
            companyName = "";
            flags.add("PatternValidationFailed");
          } else {
            log("info", "Brand and generic term applied", { domain: normalizedDomain, companyName });
            flags.add("BrandGenericMatch");
            confidenceScore = 100;
          }
        }
      }

      // Priority 6: Enhanced Metadata Fallback
      if (!companyName && meta.title) {
        const metaResult = getMetaTitleBrand(meta);
        if (metaResult && metaResult.companyName) {
          companyName = metaResult.companyName;
          if (!pattern.test(companyName)) {
            log("warn", "Metadata fallback pattern validation failed", { domain: normalizedDomain, companyName });
            companyName = "";
            flags.add("PatternValidationFailed");
          } else {
            confidenceScore = metaResult.confidenceScore;
            flags.add(...metaResult.flags);
            log("info", "Metadata fallback applied", { domain: normalizedDomain, companyName });
          }
        }
      }
    } catch (error) {
      log("error", "Token rescue failed", { domain: normalizedDomain, error: error.message, stack: error.stack });
      flags.add("LocalFallbackFailed");
      flags.add("ManualReviewRecommended");
    }

    // Optimize OpenAI usage: Skip OpenAI if the name is already well-formed
    if (companyName && pattern.test(companyName) && companyName.split(" ").length >= 2 && !/\b[a-z]+[A-Z]/.test(companyName)) {
      log("info", "Skipping OpenAI fallback due to well-formed name", { domain: normalizedDomain, companyName, confidenceScore });
      const finalResult = {
        companyName,
        confidenceScore,
        flags: Array.from(flags),
        tokens
      };
      openAICache.set(`${normalizedDomain}:${(meta.title || "").toLowerCase().trim()}`, finalResult);
      log("info", "Result cached without OpenAI", { domain: normalizedDomain, companyName });
      return finalResult;
    }

    // OpenAI fallback for spacing/casing (last resort, only if necessary)
    if (companyName && (companyName.split(" ").length < 2 || /\b[a-z]+[A-Z]/.test(companyName))) {
      const cacheKey = `${normalizedDomain}:${(meta.title || "").toLowerCase().trim()}`;
      if (openAICache.has(cacheKey)) {
        const cached = openAICache.get(cacheKey);
        log("info", "Cache hit", { domain: normalizedDomain, companyName: cached.companyName });
        flags.add("OpenAICacheHit");
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

        if (!pattern.test(name)) {
          log("warn", "OpenAI spacing fix pattern validation failed", { domain: normalizedDomain, name });
          throw new FallbackError("OpenAI spacing fix pattern validation failed", { domain: normalizedDomain });
        }

        const domainBrand = CAR_BRANDS.find(b => normalizedDomain.includes(b.toLowerCase())) || null;
        const { validatedName, flags: validationFlags, confidenceScore: updatedConfidence } = validateFallbackName(
          { name, brand: null, flagged: false },
          normalizedDomain,
          domainBrand,
          confidenceScore
        );
        flags.add(...validationFlags);

        if (validatedName) {
          companyName = validatedName;
          confidenceScore = updatedConfidence;
          flags.add("OpenAISpacingFix");
        } else {
          flags.add("OpenAIFallbackFailed");
          flags.add("ManualReviewRecommended");
        }

        const finalResult = {
          companyName,
          confidenceScore,
          flags: Array.from(flags),
          tokens
        };
        openAICache.set(cacheKey, finalResult);
        return finalResult;
      } catch (error) {
        log("error", "OpenAI spacing fix failed", { domain: normalizedDomain, error: error.message, stack: error.stack });
        flags.add("OpenAIFallbackFailed");
        flags.add("ManualReviewRecommended");
      }
    }

    // Final fallback
    if (!companyName) {
      companyName = capitalizeName(cleanDomain.split(/(?=[A-Z])/)[0]);
      if (!pattern.test(companyName)) {
        log("warn", "Final fallback pattern validation failed", { domain: normalizedDomain, companyName });
        companyName = "";
        flags.add("PatternValidationFailed");
      } else {
        flags.add("FinalFallback");
        flags.add("ManualReviewRecommended");
        confidenceScore = 50;
      }
    }

    // Deduplicate output
    if (companyName) {
      const words = companyName.toLowerCase().split(" ");
      const uniqueWords = [...new Set(words)];
      if (uniqueWords.length !== words.length) {
        companyName = uniqueWords.map(t => capitalizeName(t)).join(" ");
        if (!pattern.test(companyName)) {
          log("warn", "Deduplicated output pattern validation failed", { domain: normalizedDomain, companyName });
          companyName = "";
          flags.add("PatternValidationFailed");
        } else {
          confidenceScore = Math.min(confidenceScore, 95);
          flags.add("DuplicatesRemoved");
        }
      }
    }

    // Final validation: Ensure the companyName is non-empty and meets quality standards
    if (!companyName || companyName.length < 3) {
      log("warn", "Final company name is empty or too short", { domain: normalizedDomain, companyName });
      companyName = "";
      confidenceScore = 0;
      flags.add("InvalidFinalName");
      flags.add("ManualReviewRecommended");
    }

    // Final validation: Check for brand-only output
    if (companyName && CAR_BRANDS.includes(companyName.toLowerCase())) {
      companyName = "";
      confidenceScore = 0;
      flags.add("BrandOnlyFallback");
      flags.add("ManualReviewRecommended");
    }

    const finalResult = {
      companyName,
      confidenceScore,
      flags: Array.from(flags),
      tokens
    };

    openAICache.set(`${normalizedDomain}:${(meta.title || "").toLowerCase().trim()}`, finalResult);
    log("info", "Result cached", { domain: normalizedDomain, companyName, confidenceScore, flags: Array.from(flags) });
    return finalResult;
  } catch (err) {
    log("error", "fallbackName failed", {
      domain: normalizedDomain || "unknown",
      error: err.message,
      stack: err.stack
    });
    flags.add("FallbackNameError");
    flags.add("ManualReviewRecommended");
    return { companyName, confidenceScore: 0, flags: Array.from(flags), tokens };
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
      const result = await fallbackName(lead.domain, lead.domain, { title: lead.metaTitle }); // Note: originalDomain is the same as domain since humanizeName signature changed
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
}

export { fallbackName, clearOpenAICache, handler, validateFallbackName };
