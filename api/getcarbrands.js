import { callOpenAI } from "./lib/openai.js";
import winston from 'winston';

// List of car brands (aligned with GAS Constants.gs)
const CAR_BRANDS = [
  "acura", "alfa romeo", "amc", "aston martin", "audi", "bentley", "bmw", "bugatti", "buick",
  "cadillac", "carmax", "cdj", "cdjrf", "cdjr", "chev", "chevvy", "chevrolet", "chrysler", "cjd",
  "daewoo", "dodge", "eagle", "ferrari", "fiat", "ford", "genesis", "gmc", "honda", "hummer",
  "hyundai", "inf", "infiniti", "isuzu", "jaguar", "jeep", "jlr", "kia", "lamborghini", "land rover",
  "landrover", "lexus", "lincoln", "lucid", "maserati", "maz", "mazda", "mb", "merc", "mercedes",
  "mercedes-benz", "mercedesbenz", "merk", "mini", "mitsubishi", "nissan", "oldsmobile", "plymouth",
  "polestar", "pontiac", "porsche", "ram", "rivian", "rolls-royce", "saab", "saturn", "scion", "smart",
  "subaru", "subie", "suzuki", "tesla", "toyota", "volkswagen", "volvo", "vw", "chevy", "honda",
  "suby", "subi", "chr", "chry", "niss", "toy", "hyund", "mercbenz", "benzo", "aud", "por", "volks",
  "jagu", "landrov", "lex", "infinit", "mitsu", "vinfast", "fisker", "mopar", "gma", "cad", "bui",
  "lin", "mazd", "rolls", "chevr", "chevrol", "audis", "bm", "mercben", "toyt", "hyu", "nis", "sub",
  "infinitiy", "kias", "vol", "porsch", "jagr", "landr", "byd", "stellantis", "jcdr", "cdjrs", "gmcad"
];

// BRAND_MAPPING (aligned with GAS, single-brand mappings only)
const BRAND_MAPPING = {
  "acura": "Acura", "alfa romeo": "Alfa Romeo", "amc": "AMC", "aston martin": "Aston Martin", "audi": "Audi",
  "aud": "Audi", "audis": "Audi", "bentley": "Bentley", "bmw": "BMW", "bm": "BMW", "bugatti": "Bugatti",
  "buick": "Buick", "bui": "Buick", "cadillac": "Cadillac", "cad": "Cadillac", "carmax": "Carmax",
  "cdj": "Chrysler", "cdjrf": "Chrysler", "cdjr": "Chrysler", "cdjrs": "Chrysler", "chev": "Chevrolet",
  "chevvy": "Chevrolet", "chevrolet": "Chevrolet", "chevr": "Chevrolet", "chevrol": "Chevrolet",
  "schevy": "Chevrolet", "chevy": "Chevrolet", "chrysler": "Chrysler", "chr": "Chrysler", "chry": "Chrysler",
  "cjd": "Chrysler", "jcdr": "Chrysler", "cdjrs": "Chrysler", "daewoo": "Daewoo", "dodge": "Dodge",
  "eagle": "Eagle", "ferrari": "Ferrari", "fiat": "Fiat", "ford": "Ford", "genesis": "Genesis", "gmc": "GMC",
  "gma": "GMC", "gmcad": "GMC", "honda": "Honda", "hondaof": "Honda", "hummer": "Hummer", "hyundai": "Hyundai",
  "hyund": "Hyundai", "hyu": "Hyundai", "inf": "Infiniti", "infiniti": "Infiniti", "infinit": "Infiniti",
  "infinitiy": "Infiniti", "infinitiof": "Infiniti", "isuzu": "Isuzu", "jaguar": "Jaguar", "jagu": "Jaguar",
  "jagr": "Jaguar", "jaguarof": "Jaguar", "jeep": "Jeep", "jcd": "Jeep", "jlr": "Jaguar", "jcdr": "Jeep",
  "kia": "Kia", "kias": "Kia", "lamborghini": "Lamborghini", "land rover": "Land Rover", "landrover": "Land Rover",
  "landrov": "Land Rover", "landr": "Land Rover", "landroverof": "Land Rover", "lexus": "Lexus", "lex": "Lexus",
  "lexusof": "Lexus", "lincoln": "Lincoln", "lin": "Lincoln", "lucid": "Lucid", "maserati": "Maserati",
  "mazda": "Mazda", "maz": "Mazda", "mazd": "Mazda", "mb": "Mercedes-Benz", "merc": "Mercedes-Benz",
  "mercedes": "Mercedes-Benz", "mercedes-benz": "Mercedes-Benz", "mercedesbenz": "Mercedes-Benz",
  "mercbenz": "Mercedes-Benz", "mercben": "Mercedes-Benz", "merk": "Mercedes-Benz", "benzo": "Mercedes-Benz",
  "mercedesof": "Mercedes-Benz", "mini": "Mini", "mitsubishi": "Mitsubishi", "mitsu": "Mitsubishi",
  "nissan": "Nissan", "niss": "Nissan", "nis": "Nissan", "nissanof": "Nissan", "oldsmobile": "Oldsmobile",
  "plymouth": "Plymouth", "polestar": "Polestar", "pontiac": "Pontiac", "porsche": "Porsche", "por": "Porsche",
  "porsch": "Porsche", "ram": "Ram", "rivian": "Rivian", "rolls-royce": "Rolls-Royce", "rolls": "Rolls-Royce",
  "saab": "Saab", "saturn": "Saturn", "scion": "Scion", "smart": "Smart", "subaru": "Subaru", "subie": "Subaru",
  "suby": "Subaru", "subi": "Subaru", "sub": "Subaru", "subaruof": "Subaru", "suzuki": "Suzuki", "tesla": "Tesla",
  "toyota": "Toyota", "toy": "Toyota", "toyt": "Toyota", "toyotaof": "Toyota", "volkswagen": "Volkswagen",
  "volks": "Volkswagen", "vw": "Volkswagen", "vwof": "Volkswagen", "volvo": "Volvo", "vol": "Volvo",
  "vinfast": "VinFast", "fisker": "Fisker", "mopar": "Chrysler", "byd": "BYD", "stellantis": "Chrysler",
  "bmwof": "BMW", "fordof": "Ford", "audiof": "Audi"
};

// Winston logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

export default async function handler(req, res) {
  logger.info("Endpoint /api/getcarbrands hit successfully", { timestamp: new Date().toISOString() });
  if (req.method !== "POST" || !req.body.domain) {
    logger.error(`Invalid request: Method=${req.method}, Domain=${req.body.domain || 'missing'}`, { timestamp: new Date().toISOString() });
    return res.status(400).json({ error: "Invalid request: POST method with domain in body required" });
  }

  const domain = req.body.domain.toLowerCase().trim();
  const tokens = req.body.tokens || domain.toLowerCase().replace(/^(www\.)/, '').replace(/\..*$/, '').split(/[-_.]/);
  const context = req.body.context || {};
  logger.info(`Processing domain: ${domain}`, { timestamp: new Date().toISOString() });
  logger.info(`Domain tokens: ${JSON.stringify(tokens)}`, { timestamp: new Date().toISOString() });

  try {
    // Step 1: Check domain tokens for direct brand match (local fallback)
    let primaryBrand = null;
    let confidence = 0;
    for (const brand of CAR_BRANDS) {
      if (tokens.some(token => token.includes(brand))) {
        primaryBrand = brand;
        confidence = 75; // Local fallback confidence
        logger.info(`Local fallback brand match for domain ${domain}: ${primaryBrand} (Confidence: ${confidence}%)`, { timestamp: new Date().toISOString() });
        break;
      }
    }

    // Step 2: Secondary fallback: Known dealership patterns
    if (!primaryBrand) {
    const knownDealerships = {
    "unionpark": "Honda",
    "penskeautomotive": "Chevy",
    "miamilakesautomall": "Jeep",
    "ricart": "Ford",
    "malouf": "Ford",
    "westherr": "Ford",
    "sheehy": "Ford",
    "frankleta": "Honda",
    "towneauto": "Ford",
    "lauraautogroup": "Chrysler",
    "leblancauto": "Toyota",
    "jackpowell": "Chrysler",
    "prestonmotor": "Chrysler",
    "billdube": "Hyundai",
    "demontrond": "Buick",
    "carlblack": "GMC",
    "fletcherauto": "Chrysler",
    "tasca": "Ford",
    "mccarthyautogroup": "Chevy",
    "dyerauto": "Chrysler",
    "andersonautogroup": "GMC",
    "mclartydaniel": "Chrysler",
    "autobyfox": "Ford",
    "geraldauto": "Ford",
    "donhattan": "Chevy",
    "galeanasc": "Chrysler",
    "machens": "Ford",
    "taylorauto": "Chrysler",
    "dancummins": "Chrysler",
    "kennedyauto": "Chrysler",
    "tommynixautogroup": "Chrysler",
    "shoplynch": "Chevy",
    "czag": "Chrysler",
    "scottclark": "Toyota",
    "edwardsautogroup": "Chevy",
    "signatureautony": "Chrysler",
    "regalauto": "Chrysler",
    "thepremiercollection": "Bentley",
    "drivesuperior": "Chrysler",
    "acdealergroup": "Chrysler",
    "jaywolfe": "Toyota",
    "newhollandauto": "Chrysler",
    "crossroadscars": "Chrysler",
    "lynnlayton": "Chevy",
    "jakesweeney": "Chevy",
    "yorkautomotive": "Chrysler",
    "shottenkirk": "Chevy",
    "daytonandrews": "Chrysler",
    "landerscorp": "Chevy",
    "elwaydealers": "Chrysler",
    "potamkinatlanta": "Hyundai",
    "parkerauto": "Chrysler",
    "chapmanchoice": "Chrysler",
    "swantgraber": "Ford",
    "atamian": "Honda",
    "saabvw": "Volkswagen",
    "colonial-west": "Chevy",
    "gravityautos": "Chrysler",
    "drivesunrise": "Chrysler",
    "philsmithkia": "Kia",
    "mterryautogroup": "Chrysler",
    "jtscars": "Chrysler",
    "powerautogroup": "Chrysler",
    "westgatecars": "Chrysler",
    "gomontrose": "Chrysler",
    "tuttleclick": "Chrysler",
    "rosenautomotive": "Chrysler",
    "executiveag": "Chrysler",
    "obrienauto": "Chevy",
    "helloautogroup": "Chrysler",
    "steponeauto": "Chrysler",
    "barlowautogroup": "Chrysler",
    "hmtrs": "Chevy",
    "shultsauto": "Ford",
    "sewell": "Lexus",
    "londoff": "Chevy",
    "malloy": "Hyundai",
    "campbellcars": "Chrysler",
    "redmac": "Chrysler",
    "jimtaylorautogroup": "Chrysler",
    "suntrup": "Hyundai",
    "nplincoln": "Lincoln",
    "beckmasten": "Buick",
    "sansoneauto": "Chrysler",
    "findlayauto": "Chevy",
    "barnettauto": "Chrysler",
    "gengras": "Chrysler",
    "cioccaauto": "Chrysler",
    "williamsautoworld": "Chevy",
    "tomhesser": "Chevy",
    "pinehurstautomall": "Chrysler",
    "chevyland": "Chevy",
    "cedarcitymotorcompany": "Chrysler",
    "albrechtauto": "Chrysler",
    "qarmstpete": "Chrysler",
    "parkwayfamily": "Mazda",
    "jimfalkmotorsofmaui": "Chrysler",
    "freeholdcars": "Chrysler",
    "curriemotors": "Chevy",
    "hawkauto": "Chrysler",
    "blakefauto": "Chrysler",
    "tituswill": "Chevy",
    "millsautogroup": "Chevy",
    "berman": "Nissan",
    "billingsford": "Ford",
    "queencitymotorsonline": "Lincoln",
    "porschebrooklyn": "Porsche",
    "dvbmw": "BMW",
    "elkomotorco": "Chrysler",
    "diamondbuickgmc": "Buick",
    "cooperautogroup": "Chevy",
    "allstarautogroup": "Chevy",
    "pilsonauto": "Chrysler",
    "jonesauto": "Chevy",
    "audiqueens": "Audi",
    "autobahnmotors": "Mercedes",
    "volvoofbend": "Volvo",
    "hondaoflisle": "Honda",
    "prostrollo": "Chevy",
    "mattiaccio": "Chrysler",
    "castlerockautoplex": "Lexus",
    "schomp": "BMW",
    "rockhillbuickgmc": "Buick",
    "pinegarhonda": "Honda",
    "lousobhhonda": "Honda",
    "porschechandler": "Porsche",
    "spreen": "Mazda",
    "classicgalveston": "Chevy",
    "morreyvolvo": "Volvo",
    "midtownmotors": "Chrysler",
    "platinumautogroupinc": "Chrysler",
    "haaszautomall": "Chrysler",
    "aldermansvt": "Chevy",
    "banksautos": "Chrysler",
    "gatewayclassiccars": "Chevy",
    "hgreglux": "Porsche",
    "airportkianaples": "Kia",
    "haywardhonda": "Honda",
    "audimv": "Audi",
    "lousobhkia": "Kia",
    "johnsondodge": "Dodge",
    "hileyhuntsville": "Mazda",
    "porscheredwoodcity": "Porsche",
    "infinitiofnashua": "Infiniti",
    "4porsche": "Porsche",
    "elkgrovevw": "Volkswagen",
    "diplomatmotors": "Chrysler",
    "patpeck": "Honda",
    "mclarennb": "McLaren",
    "clevelandporsche": "Porsche",
    "porscheofarlington": "Porsche",
    "porschelarchmont": "Porsche",
    "porschepittsburgh": "Porsche",
    "porschesouthorlando": "Porsche",
    "porschewoodlandhills": "Porsche",
    "portlandvolvo": "Volvo",
    "pugmire": "Ford",
    "rizzacars": "Chevy",
    "rlchrysler": "Chrysler",
    "rogerbeasley": "Mazda",
    "rogersmotors": "Chevy",
    "ronwestphal": "Chevy",
    "ronniewatkinsford": "Ford",
    "golling": "Ford",
    "roswellinfiniti": "Infiniti",
    "route22honda": "Honda",
    "royalmoore": "Mazda",
    "rudolphcars": "Chevy",
    "saccucci": "Honda",
    "scenicmotors": "Ford",
    "schwieterscars": "Chevy",
    "serrawhelan": "Chevy",
    "sthmotors": "Chevy",
    "silveiraautos": "Chevy",
    "southpointauto": "Chevy",
    "sportautomotive": "Porsche",
    "stcharlescdj": "Chrysler",
    "stcharlesauto": "Chevy",
    "sullivanbrothers": "Nissan",
    "susqauto": "Chrysler",
    "tameron": "Honda",
    "teamautomotive": "Chevy",
    "thompsonautomotive": "Chevy",
    "tomkadlec": "Honda",
    "troncalli": "Subaru",
    "tulley": "BMW",
    "twincitybuick": "Buick",
    "danvaden": "Chevy",
    "drivevictory": "Chrysler",
    "victorysandusky": "Chevy",
    "wesfinch": "Chevy",
    "wilkinscars": "Chevy",
    "griecocars": "Chrysler",
    "yatesbuickgmc": "Buick",
    "mbofcenterville": "Mercedes",
    "joneschevrolet": "Chevy",
    "hardyautomotive": "Chevy",
    "bachmanautogroup": "Chevy",
    "andymohr": "Ford",
    "sscdjr": "Chrysler",
    "mbhuntington": "Mercedes",
    "centuryauto": "Chevy",
    "capitolauto": "Chevy",
    "lakeautogroup": "Chevy",
    "mbnanuet": "Mercedes",
    "hindererhonda": "Honda",
    "lexusoftowson": "Lexus",
    "dahlauto": "Ford",
    "mastria": "Nissan",
    "berlincity": "Ford",
    "loveringvolvo": "Volvo",
    "mcgovernauto": "Chevy",
    "countrysidechevy": "Chevy",
    "classicchevrolet": "Chevy",
    "cagaustin": "Chevy",
    "bmwofridgefield": "BMW",
    "legacybuickgmc": "Buick",
    "chevytownusa": "Chevy",
    "mblouisville": "Mercedes",
    "competitionsubaru": "Subaru",
    "maitacars": "Chevy",
    "mbfaustin": "Mercedes",
    "wynneford": "Ford",
    "radleyauto": "Chevy",
    "hondacarsofaiken": "Honda",
    "youngautomotive": "Chevy",
    "autofair": "Ford",
    "darcars": "Chrysler",
    "fredechevrolet": "Chevy",
    "circlebmw": "BMW",
    "edmondhyundai": "Hyundai",
    "emmertmotors": "Chevy",
    "jeffdeals": "Chevy",
    "ikehonda": "Honda",
    "kriegerford": "Ford",
    "mazdaofbedford": "Mazda",
    "paragonhonda": "Honda",
    "newsmyrnachevy": "Chevy",
    "treasurecoastlexus": "Lexus",
    "cherryhillnissan": "Nissan",
    "audiexchange": "Audi",
    "patlobbtoyota": "Toyota",
    "flemington": "Chevy",
    "elmhurstbmw": "BMW",
    "lakesidetoyota": "Toyota",
    "mbzno": "Mercedes",
    "martinchevrolet": "Chevy",
    "farlandcars": "Chrysler",
    "performancetoyotastore": "Toyota",
    "mcgrathauto": "Chevy",
    "goldencircle": "Ford",
    "delacyford": "Ford",
    "giambalvo": "Mazda",
    "bmwnyc": "BMW",
    "albanyfordsubaru": "Subaru",
    "santanford": "Ford",
    "bowmanchevy": "Chevy",
    "rbmofalpharetta": "BMW",
    "sloaneautos": "Toyota",
    "mcdanielauto": "Chevy",
    "springfieldford": "Ford",
    "garyforcehonda": "Honda",
    "keycars": "Chrysler",
    "lexusofhuntsville": "Lexus",
    "tejastoyota": "Toyota",
    "hanselauto": "BMW",
    "herbconnolly": "Chevy",
    "jclewis": "Ford",
    "charper": "Chevy",
    "diverchev": "Chevy",
    "tetonmotors": "Chevy",
    "jenkinsandwynne": "Ford",
    "midlandshonda": "Honda",
    "grappone": "Ford",
    "tfsmh": "Ford",
    "prestigegarland": "Ford",
    "deeryford": "Ford",
    "kellyauto": "Chrysler",
    "coastalsaves": "Chevy",
    "lakewoodtoyota": "Toyota",
    "lagrangetoyota": "Toyota",
    "lehmanvolvocarsyork": "Volvo",
    "mountainstatestoyota": "Toyota",
    "cobbcountytoyota": "Toyota",
    "onetoyota": "Toyota",
    "gornoford": "Ford",
    "taylor": "Chrysler",
    "mymetrohonda": "Honda",
    "classictoyotatyler": "Toyota",
    "dublintoyota": "Toyota",
    "reidsvillenissan": "Nissan",
    "ancira": "Chrysler",
    "lilliston": "Ford",
    "akinsonline": "Ford",
    "extonnissan": "Nissan",
    "legendnissan": "Nissan",
    "glendaledcj": "Chrysler",
    "elderdodge": "Dodge",
    "snethkamp": "Chrysler",
    "papasdodge": "Dodge",
    "lenstoler": "Ford",
    "smford": "Ford",
    "goldsteinauto": "Chrysler",
    "ilderton": "Chrysler",
    "farrishcars": "Chrysler",
    "walkerautomotive": "Chevy",
    "auburnhonda": "Honda",
    "kcsummers": "Toyota",
    "larryhillis": "Chrysler",
    "lujack": "Honda",
    "nucar": "Chevy",
    "aventuracjdr": "Jeep",
    "stgautogroup": "Chevy",
    "krausefamilyford": "Ford",
    "budschrysler": "Chrysler",
    "butlercdj": "Dodge",
    "mullinaxford": "Ford",
    "automotiveavenuesnj": "Chevy",
    "boylebuickgmc": "Buick",
    "petersontoyota": "Toyota",
    "kendalldcjr": "Chrysler",
    "hendersonchevrolet": "Chevy",
    "stevenscreekcjd": "Dodge",
    "vacavilledodge": "Dodge",
    "sangogmc": "GMC",
    "wrightdeal": "Chevy",
    "burnsbuickgmc": "Buick",
    "crainteam": "Chevy",
    "bleecker": "Chrysler",
    "rivardbuickgmc": "Buick",
    "easyhonda": "Honda",
    "fresnochrysler": "Chrysler",
    "morachevbuick": "Buick",
    "sunsetimports": "Porsche",
    "maguirecars": "Chevy",
    "speedcraft": "Volkswagen",
    "sutherlinautomotive": "Ford",
    "shaverauto": "Chevy",
    "webbcars": "Chevy",
    "acadianadodge": "Dodge",
    "thompson": "Chevy",
    "looklarson": "Chrysler",
    "garciacars": "Chevy",
    "princeauto": "Chevy",
    "diehlauto": "Ford",
    "odanielauto": "Ford",
    "buylewis": "Chevy",
    "beachautomotive": "Chevy",
    "ourismancars": "Chrysler",
    "norrisautogroup": "Chevy",
    "saveatsterling": "Ford",
    "hiesterautomotive": "Chevy",
    "rohrich": "Toyota",
    "lockhartcadillac": "Cadillac",
    "lexusofkendall": "Lexus",
    "nyeauto": "Chevy",
    "mercedesfarmington": "Mercedes",
    "mbofmodesto": "Mercedes",
    "mbontario": "Mercedes",
    "behlmann": "Chevy",
    "keatingnissan": "Nissan",
    "pinebeltauto": "Chevy",
    "davewrightauto": "Nissan",
    "ashlandfordchrysler": "Chrysler",
    "houseredwing": "Chevy",
    "bigjoeauto": "Chevy",
    "clevelandford": "Ford",
    "shopuslast": "Chevy",
    "walkerford": "Ford",
    "volvocarsnorthmiami": "Volvo",
    "carpros": "Honda",
    "rickweaver": "Buick",
    "davesinclair": "Ford",
    "fivestaronline": "Ford",
    "mbobr": "Mercedes",
    "thinkbeardmore": "Chevy",
    "mbofwf": "Mercedes",
    "jordanford": "Ford",
    "mbofmc": "Mercedes",
    "mbofwalnutcreek": "Mercedes",
    "mbwhiteplains": "Mercedes",
    "sfbenz": "Mercedes",
    "tonygroup": "Honda",
    "sportdurst": "Chrysler",
    "cityvwchicago": "Volkswagen",
    "jaguarhartford": "Jaguar",
    "donfranklinauto": "Ford",
    "walkerjones": "Chevy",
    "oregans": "Chevy",
    "biggersmazda": "Mazda",
    "gaithersburgmazda": "Mazda",
    "bournivaljeep": "Jeep",
    "meadelexus": "Lexus",
    "tothakron": "Buick",
    "tracymazda": "Mazda",
    "metrowestsubaru": "Subaru",
    "eldermitsubishi": "Mitsubishi",
    "citysidesubaru": "Subaru",
    "audinaples": "Audi",
    "lafontaine": "Chrysler",
    "rkautogroup": "Chevy",
    "baywayautogroup": "Chevy",
    "royalautogroup": "Chevy",
    "greencc": "Chevy",
    "sentryautogroup": "Chevy",
    "della": "Honda",
    "elcentromotors": "Chevy",
    "moyernissan": "Nissan",
    "oxendale": "Chevy",
    "colussy": "Chevy",
    "boyerautogroup": "Chevy",
    "baumannautogroup": "Chevy",
    "northparknissan": "Nissan",
    "elderhyundai": "Hyundai",
    "guelphhyundai": "Hyundai",
    "deien": "Chevy",
    "coulternissan": "Nissan",
    "firstautogroup": "Chevy",
    "obrienteam": "Chevy",
    "hudsonautogroup": "Chevy",
    "islandautogroup": "Chevy",
    "keimchevy": "Chevy",
    "hollychevrolet": "Chevy",
    "faireychevrolet": "Chevy",
    "applegatechev": "Chevy"
};
      for (const [dealership, brand] of Object.entries(knownDealerships)) {
        if (tokens.some(token => token.includes(dealership))) {
          primaryBrand = brand.toLowerCase();
          confidence = 75;
          logger.info(`Local fallback (dealership pattern) for domain ${domain}: ${primaryBrand} (Confidence: ${confidence}%)`, { timestamp: new Date().toISOString() });
          break;
        }
      }
    }

    // Step 3: Predictive fallback: Infer brands based on domain patterns
    if (!primaryBrand) {
      if (tokens.some(token => token.includes("auto")) && tokens.some(token => token.includes("group"))) {
        primaryBrand = "chevrolet"; // Common pattern for multi-brand dealerships
        confidence = 70;
        logger.info(`Predictive fallback for domain ${domain}: ${primaryBrand} (Confidence: ${confidence}%)`, { timestamp: new Date().toISOString() });
      }
    }

    // Step 4: OpenAI Fallback if no direct match
    if (!primaryBrand) {
      const knownBrands = context.knownBrands || CAR_BRANDS;
      const prompt = `Identify the primary car brand sold by the dealership for the domain "${domain}" with tokens [${domainTokens.join(', ')}] and company name "${companyName}". Follow these steps strictly to ensure accuracy and exhaust all public sources before returning "unknown":

1. **Token Analysis**: Check tokens for explicit brand names or aliases (e.g., "honda" in "unionparkhonda.com" → Honda, "chevy" in "gychevy.com" → Chevy). Use the provided brand aliases: ${JSON.stringify(brandAliases)}. Prioritize exact or alias matches. Ignore generic terms like "auto," "cars," "deal," "group."

2. **Known Dealerships Lookup**: If no brand is found in tokens, check the knownDealerships mapping: ${JSON.stringify(knownDealerships)}. For example, "westherr.com" → Ford, "sheehy.com" → Ford, "frankleta.com" → Honda, "lauraautogroup.com" → Chrysler, "leblancauto.com" → Toyota.

3. **Public Source Verification**: If no match in tokens or knownDealerships, exhaustively check public sources to identify the primary brand:
   - Visit the dealership's website (e.g., "https://${domain}") and analyze the homepage, inventory, or "About Us" section for the most prominent brand.
   - Search recent X posts mentioning the dealership (e.g., "@${domain.replace(/\..*$/, '')}") for brand references.
   - Query industry listings or review sites (e.g., Cars.com, DealerRater) for the dealership’s primary brand.
   - Cross-reference the company name "${companyName}" for consistency (e.g., "Tasca" → Ford).

4. **Multi-Brand Dealerships**: If the dealership sells multiple brands, select the primary brand based on:
   - Prominence on the website (e.g., featured in logo, main inventory, or URL).
   - Frequency in X posts or listings.
   - Explicit association with the company name (e.g., "Penske Automotive" → Chevy for prominence).
   Examples: "penskeautomotive.com" → Chevy, "mclartydaniel.com" → Chrysler.

5. **Non-Dealership Check**: If the domain is not a car dealership (e.g., real estate, media), return "unknown". Examples: "exprealty.com" → unknown (real estate), "wickmail.com" → unknown (email service), "centurytrucks.com" → unknown (truck equipment).

6. **Accuracy Requirement**: Only assign a brand if verified through tokens, knownDealerships, or public sources. Do not guess or assume brands (e.g., do not assign "Chevy" to Buick/GMC dealers unless Chevrolet is explicitly primary). If no clear primary brand is found after exhausting all sources, return "unknown".

Respond with only the verified brand name (e.g., Toyota, Chevy) or "unknown". Shorten "Chevrolet" to "Chevy". Ensure the brand is in: ${carBrands.join(', ')}. Use exact capitalization (e.g., "Honda", not "honda").`;
      const openAIResult = await callOpenAI(prompt, {
        model: "gpt-4-turbo",
        max_tokens: 10,
        temperature: 0.3,
        systemMessage: "Respond with only the car brand name or 'unknown', nothing else.",
        retries: 2,
        timeoutMs: 12000 // Increased from 9000ms
      });

      if (openAIResult.error) {
        logger.error(`OpenAI error for domain ${domain}: ${openAIResult.error}`, { timestamp: new Date().toISOString() });
        throw new Error(`OpenAI error: ${openAIResult.error}`);
      }

      logger.info(`OpenAI result for domain ${domain}: ${JSON.stringify(openAIResult)}`, { timestamp: new Date().toISOString() });
      const brand = openAIResult.output.toLowerCase();
      logger.info(`OpenAI response for domain ${domain}: ${brand}`, { timestamp: new Date().toISOString() });

      if (CAR_BRANDS.includes(brand)) {
        primaryBrand = brand;
        confidence = brand === "unknown" ? 50 : 95;
      } else {
        for (const [key, mappedBrand] of Object.entries(BRAND_MAPPING)) {
          if (brand === key) {
            primaryBrand = mappedBrand.toLowerCase();
            confidence = 95;
            break;
          }
        }
      }

      if (!primaryBrand) {
        confidence = brand === "unknown" ? 50 : 0;
        // Retry local fallback if OpenAI returns "unknown"
        if (brand === "unknown") {
          for (const brand of CAR_BRANDS) {
            if (tokens.some(token => token.includes(brand))) {
              primaryBrand = brand;
              confidence = 75;
              logger.info(`Local fallback after OpenAI "unknown" for domain ${domain}: ${primaryBrand} (Confidence: ${confidence}%)`, { timestamp: new Date().toISOString() });
              break;
            }
          }
        }
      }
    }

    // Finalize response
    if (primaryBrand && confidence >= 50) {
      const standardizedBrand = BRAND_MAPPING[primaryBrand] || primaryBrand.charAt(0).toUpperCase() + primaryBrand.slice(1).toLowerCase();
      logger.info(`Brand match found for domain ${domain}: ${standardizedBrand} (Confidence: ${confidence}%)`, { timestamp: new Date().toISOString() });
      return res.status(200).json({ brand: standardizedBrand, confidence });
    }

    logger.info(`No brand match for domain ${domain} (Confidence: ${confidence}%)`, { timestamp: new Date().toISOString() });
    return res.status(200).json({ brand: "", confidence });
  } catch (error) {
    logger.error(`Error processing domain ${domain}: ${error.message}`, { timestamp: new Date().toISOString() });
    return res.status(500).json({ error: `Failed to process domain: ${error.message}` });
  }
}
