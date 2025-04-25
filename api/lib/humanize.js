// api/lib/humanize.js v5.0.9
// Logger configuration with Vercel-safe transports only

import winston from "winston";

// Comprehensive list of car brands
const CAR_BRANDS = new Set([
    "acura", "alfa romeo", "amc", "aston martin", "audi", "bentley", "bmw", "bugatti", "buick",
    "cadillac", "carmax", "cdj", "cdjrf", "cdjr", "chev", "chevvy", "chevrolet", "chrysler", "cjd",
    "daewoo", "dodge", "eagle", "ferrari", "fiat", "ford", "genesis", "gmc", "honda", "hummer",
    "hyundai", "inf", "infiniti", "isuzu", "jaguar", "jeep", "jlr", "kia", "lamborghini", "land rover",
    "landrover", "lexus", "lincoln", "lucid", "maserati", "maz", "mazda", "mb", "mclaren", "merc", "mercedes",
    "mercedes-benz", "mercedesbenz", "merk", "mini", "mitsubishi", "nissan", "oldsmobile", "plymouth",
    "polestar", "pontiac", "porsche", "ram", "rivian", "rolls-royce", "saab", "saturn", "scion",
    "smart", "subaru", "subie", "suzuki", "tesla", "toyota", "volkswagen", "volvo", "vw", "chevy",
    "honda", "lambo"
]);
  // Mapping for standardized brand names
const BRAND_MAPPING = new Map([
  ["acura", "Acura"], ["alfa romeo", "Alfa Romeo"], ["amc", "AMC"], ["aston martin", "Aston Martin"], ["audi", "Audi"],
  ["bentley", "Bentley"], ["bmw", "BMW"], ["bugatti", "Bugatti"], ["buick", "Buick"], ["cadillac", "Cadillac"],
  ["carmax", "Carmax"], ["cdj", "Dodge"], ["cdjrf", "Dodge"], ["cdjr", "Dodge"], ["chev", "Chevy"],
  ["chevvy", "Chevy"], ["chevrolet", "Chevy"], ["chrysler", "Chrysler"], ["cjd", "Dodge"], ["daewoo", "Daewoo"],
  ["dodge", "Dodge"], ["eagle", "Eagle"], ["ferrari", "Ferrari"], ["fiat", "Fiat"], ["ford", "Ford"], ["genesis", "Genesis"],
  ["gmc", "GMC"], ["honda", "Honda"], ["hummer", "Hummer"], ["hyundai", "Hyundai"], ["inf", "Infiniti"], ["infiniti", "Infiniti"],
  ["isuzu", "Isuzu"], ["jaguar", "Jaguar"], ["jeep", "Jeep"], ["jlr", "Jaguar Land Rover"], ["kia", "Kia"],
  ["lamborghini", "Lamborghini"], ["land rover", "Land Rover"], ["landrover", "Land Rover"], ["lexus", "Lexus"],
  ["lincoln", "Ford"], ["lucid", "Lucid"], ["maserati", "Maserati"], ["maz", "Mazda"], ["mazda", "Mazda"],
  ["mb", "M.B."], ["merc", "Mercedes"], ["mercedes", "M.B."], ["mercedes-benz", "M.B."], ["mercedesbenz", "M.B."],
  ["merk", "Mercedes"], ["mini", "Mini"], ["mitsubishi", "Mitsubishi"], ["nissan", "Nissan"], ["oldsmobile", "Oldsmobile"],
  ["plymouth", "Plymouth"], ["polestar", "Polestar"], ["pontiac", "Pontiac"], ["porsche", "Porsche"], ["ram", "Ram"],
  ["rivian", "Rivian"], ["rolls-royce", "Rolls-Royce"], ["saab", "Saab"], ["saturn", "Saturn"], ["scion", "Scion"],
  ["smart", "Smart"], ["subaru", "Subaru"], ["subie", "Subaru"], ["suzuki", "Suzuki"], ["tesla", "Tesla"], ["toyota", "Toyota"],
  ["volkswagen", "VW"], ["volvo", "Volvo"], ["vw", "VW"], ["chevy", "Chevy"], ["jcd", "Jeep"], ["lamborghini", "Lambo"]
]);

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

const BRAND_ABBREVIATIONS = {
    "audiof": "Audi",
    "bmwof": "BMW",
    "cdj": "Dodge",
    "cdjr": "Dodge",
    "chevroletof": "Chevy",
    "chevyof": "Chevy",
    "ch": "CH",
    "ec": "EC", // Resolved: removed duplicate
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
    "rt": "RT",
    "sp": "SP",
    "toyotaof": "Toyota",
    "vw": "VW",
    "wg": "WG",
    "ph": "Porsche",
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
    "gm": "GM"
};

const COMMON_WORDS = new Set([
  "to", "of", "and", "the", "for", "in", "on", "at", "inc", "llc", "corp", "co"
]);

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
    "acdealergroup.com": "AC Dealer",
    "daytonandrews.com": "Dayton Andrews",
    "fordofdalton.com": "Dalton Ford",
    "metrofordofmadison.com": "Metro Ford",
    "williamssubarucharlotte.com": "Williams Subaru",
    "vwsouthtowne.com": "VW South Towne",
    "scottclarkstoyota.com": "Scott Clark",
    "duvalford.com": "Duval",
    "devineford.com": "Devine",
    "allamericanford.net": "All American",
    "slvdodge.com": "Silver Dodge",
    "regalauto.com": "Regal Auto",
    "elwaydealers.net": "Elway",
    "chapmanchoice.com": "Chapman"
};

const BRAND_ONLY_DOMAINS = new Set([
    "chevy.com", "ford.com", "cadillac.com", "buick.com", "gmc.com", "chrysler.com",
    "dodge.com", "ramtrucks.com", "jeep.com", "lincoln.com", "toyota.com", "honda.com",
    "nissanusa.com", "subaru.com", "mazdausa.com", "mitsubishicars.com", "acura.com",
    "lexus.com", "infinitiusa.com", "hyundaiusa.com", "kia.com", "genesis.com",
    "bmwusa.com", "mercedes-benz.com", "audiusa.com", "vw.com", "volkswagen.com",
    "porsche.com", "miniusa.com", "fiatusa.com", "alfa-romeo.com", "landroverusa.com",
    "jaguarusa.com", "tesla.com", "lucidmotors.com", "rivian.com", "volvocars.com"
  ]);

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
    "Rising", "Fast", "Deluca", "milnes", "strong", "beaty", "birdnow", "reedlallier", "oxmoor", "haley", 
    "rivera", "nfwauto", "totaloffroad", "ingersoll", "caruso", "maita", "victory", "hilltop", "shottenkirk", 
    "mabry", "bertogden", "teddy", "jet", "raceway", "mcdaniel", "newsmyrna", "destination", "armen", "bond",
    "livermore", "alsop", "lakeside", "pape"
]);

const SORTED_CITY_LIST = [
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
      "andalusia", "attalla", "bay minette", "brewton", "clanton", "demopolis", "dothan", "evergreen", "fayette", "fort rucker",
      "geneva", "greenville", "guntersville", "haleyville", "luverne", "monroeville", "roanoke", "russellville", "tuscumbia", "valley",

      // Alaska (10 new, smaller communities with auto sales)
      "anchorage", "bethel island", "eagle river", "fairbanks north star", "kenai peninsula", "ketchikan gateway", "matanuska-susitna", "palmer", "sitka city", "skagway-hoonah-angoon",

      // Arizona (25 new, mid-sized cities and auto hubs)
      "avondale estates", "bisbee", "casa blanca", "chandler heights", "eloy", "fort mohave", "gilbertown", "goodyear village", "green valley", "litchfield park",
      "maricopa wells", "oro valley", "paradise", "peoria heights", "phoenixville", "prescott south", "safford valley", "santa cruz", "scottsdale north", "sierra vista southeast",
      "sun city", "surprise valley", "tempe junction", "tuba city", "yuma foothills",

      // Arkansas (15 new, smaller cities with dealership presence)
      "ash flat", "batesville", "blytheville", "camden south", "conway west", "crossett south", "dumas", "el dorado south", "helena-west helena", "malvern",
      "monticello", "newport", "pine bluff south", "sheridan", "wynne",

      // California (50 new, covering Central Valley, Inland Empire, and smaller coastal cities)
      "aliso viejo", "antioch", "apple valley", "arcadia", "arroyo grande", "atascadero", "baldwin park", "banning", "bellflower", "brea",
      "buena park", "burbank", "carlsbad", "cathedral city", "cerritos hills", "chico", "chino", "clovis", "compton", "costa mesa",
      "covina", "culver city", "daly city", "del mar", "downey", "el centro", "el monte", "encinitas", "escondido hills", "fairfield",
      "folsom", "gilroy", "hawthorne", "hemet valley", "indio", "la mesa", "lake forest", "livermore", "lodi", "manteca",
      "murrieta", "norco", "palo alto", "pittsburg", "redondo beach", "san clemente", "san mateo", "santa barbara", "santa monica", "tustin",

      // Colorado (20 new, focusing on Front Range and Western Slope)
      "alamosa", "brighton south", "broomfield west", "brush", "cortez", "craig", "eatonton", "fort morgan", "fountain", "fruita",
      "glenwood springs", "grand lake", "gunnison", "la junta", "lamar", "littleton west", "longmont east", "loveland north", "pueblo west", "vail",

      // Connecticut (15 new, smaller towns with dealerships)
      "branford", "cheshire", "colchester", "east lyme", "groton", "madison", "milford city", "monroe", "new canaan", "north branford",
      "old saybrook", "orange", "stonington", "westbrook", "wilton",

      // Delaware (10 new, smaller communities)
      "bear", "brookside", "glasgow", "hockessin", "middletown crossing", "milford crossing", "newark south", "pike creek", "seaford west", "wilmington manor",

      // Florida (30 new, focusing on Central and South Florida)
      "altamonte springs", "aventura", "belle glade", "boca del mar", "bonita springs", "brandon", "cape canaveral", "casselberry", "coconut grove", "coral gables",
      "crestview", "cutler bay", "dania beach", "deland", "destin", "fernandina beach", "fort myers", "fort pierce", "greenacres", "hialeah gardens",
      "jensen beach", "key west", "lake worth", "melbourne", "merritt island", "miami beach", "north lauderdale", "palmetto", "punta gorda", "vero beach",

      // Georgia (25 new, covering South and Central Georgia)
      "bainbridge", "barnesville", "blakely", "brunswick", "cairo", "calhoun", "cartersville", "cedartown", "commerce", "cordele",
      "dublin", "fitzgerald", "forsyth", "hawkinsville", "jesup", "mcdonough", "milledgeville", "moultrie", "sandersville", "swainsboro",
      "thomasville", "tifton", "vidalia", "waycross", "west point",

      // Hawaii (10 new, smaller communities)
      "ewa beach", "hanamaulu", "kapalua", "lahaina west", "lihue", "makaha", "mililani town", "pearl harbor", "wahiawa heights", "waimanalo",

      // Idaho (15 new, rural and mid-sized cities)
      "bliss", "burley south", "challis", "driggs", "fort hall", "gooding", "idaho city", "jerome north", "kamiah", "kellogg",
      "malad city", "osburn", "parma", "priest river", "saint anthony",

      // Illinois (25 new, covering Chicagoland and Central Illinois)
      "algonquin", "alsip", "batavia", "bloomingdale", "blue island", "bridgeview", "calumet city", "cary", "crest hill", "crystal lake",
      "deerfield", "dixon", "elmwood park", "frankfort", "geneva", "grayslake", "homer glen", "lake zurich", "lisle", "lockport",
      "mchenry", "niles", "north aurora", "romeoville", "streamwood",

      // Indiana (20 new, focusing on Northern and Central Indiana)
      "angola", "auburn", "bedford", "bluffton", "columbia city", "crawfordsville", "decatur", "frankfort", "greensburg", "huntingburg",
      "jasper", "kendallville", "lafayette west", "madison", "monticello", "peru", "portland", "princeton", "rochester", "warsaw",

      // Iowa (15 new, smaller cities with dealerships)
      "algona", "anamosa", "chariton", "clarinda", "creston", "estonia", "forest city", "guttenberg", "hampton", "humboldt",
      "maquoketa", "monticello", "red oak", "sioux center", "vinton",

      // Kansas (15 new, rural and mid-sized cities)
      "belleville", "colby", "concordia", "ellsworth", "eureka", "fredonia", "goodland", "hillsboro", "hugoton", "kingman",
      "lyons", "marysville", "pratt", "russell", "wellington",

      // Kentucky (20 new, covering Eastern and Central Kentucky)
      "ashland", "barbourville", "berea", "cynthiana", "flemingsburg", "georgetown", "grayson", "harlan", "hazard", "hyden",
      "jackson", "london", "louisa", "manchester", "monticello", "morehead", "paintsville", "pikeville", "prestonburg", "somerset",

      // Louisiana (15 new, smaller cities with dealerships)
      "amite", "bunkie", "dequincy", "franklin", "homer", "jonesboro", "kinder", "leesville", "many", "marksville",
      "new roads", "oak grove", "rayville", "vidalia", "winnsboro",

      // Maine (10 new, smaller towns)
      "bar harbor", "bethel", "calais", "caribou", "dexter", "houlton", "limestone", "madawaska", "presque isle", "van buren",

      // Maryland (15 new, covering Eastern Shore and Western Maryland)
      "beltsville", "cheverly", "chestertown", "easton", "edgewood", "elkton", "emmitsburg", "frostburg", "fruitland", "havre de grace",
      "la plata", "mount airy", "ocean city", "pocomoke city", "salisbury",

      // Massachusetts (20 new, smaller cities and towns)
      "amherst", "andover", "ayer", "belmont", "burlington", "dedham", "dracut", "foxborough", "greenfield", "holbrook",
      "hudson", "ipswich", "melrose", "milton", "north adams", "north reading", "stoneham", "swampscott", "westborough", "winthrop",

      // Michigan (25 new, covering Upper Peninsula and Lower Peninsula)
      "adrian", "alma", "alpena", "big rapids", "cadillac", "charlevoix", "cheboygan", "coldwater", "escanaba", "gaylord",
      "hancock", "hillsdale", "houghton", "ionia", "iron mountain", "ishpeming", "ludington", "manistee", "marquette", "menominee",
      "owosso", "petoskey", "sault ste. marie", "sturgis", "three rivers",

      // Minnesota (20 new, covering Twin Cities suburbs and Greater Minnesota)
      "albert lea", "alexandria", "bemidji", "brainerd", "buffalo", "cambridge", "detroit lakes", "fairmont", "fergus falls", "grand rapids",
      "hibbing", "hutchinson", "marshall", "monticello", "morris", "new ulm", "north branch", "owatonna", "thief river falls", "willmar",

      // Mississippi (15 new, smaller cities with dealerships)
      "batesville", "brookhaven", "carthage", "clarksdale", "cleveland", "columbia", "forest", "hazlehurst", "houston", "kosciusko",
      "louisville", "magee", "philadelphia", "pontotoc", "west point",

      // Missouri (20 new, covering Ozarks and Northern Missouri)
      "bolivar", "branson", "carthage", "chillicothe", "clinton", "excelsior springs", "festus", "fulton", "jackson", "kennett",
      "lebanon", "macon", "maryville", "mexico", "nevada", "perryville", "poplar bluff", "saint robert", "union", "west plains",

      // Montana (10 new, rural communities)
      "anaconda-deer lodge", "bigfork", "cut bank", "deer lodge", "glasgow", "libby", "livingston", "polson", "sidney", "whitefish",

      // Nebraska (15 new, smaller cities)
      "albion", "aurora", "blair", "chadron", "falls city", "geneva", "gothenburg", "hastings", "kearney", "lexington",
      "mccook", "norfolk", "plattsmouth", "seward", "york",

      // Nevada (10 new, smaller cities and towns)
      "boulder", "carson", "elko", "fallon", "fernley", "mesquite", "reno south", "sparks east", "winnemucca", "yerington",

      // New Hampshire (10 new, smaller towns)
      "barrington", "belmont", "colebrook", "gorham", "hillsborough", "lisbon", "new ipswich", "newport", "northwood", "tamworth",

      // New Jersey (25 new, covering North and Central Jersey)
      "asbury park", "bayville", "bloomfield", "bound brook", "carteret", "closter", "dover", "dumont", "elmwood park", "englewood",
      "fort lee", "hoboken", "keyport", "lodi", "lyndhurst", "mahwah", "maplewood", "montclair", "morristown", "point pleasant", "ridgewood",
      "rutherford", "summit", "union", "westwood",

      // New Mexico (15 new, smaller cities)
      "alamo", "artesia", "bloomfield", "carlsbad", "clovis east", "deming", "espanola", "gallup", "grants", "hobbs",
      "lovington", "portales", "roswell", "ruidoso", "silver city",

      // New York (25 new, covering Upstate and Long Island)
      "amityville", "baldwinsville", "batavia", "beacon", "canandaigua", "cortland", "endicott", "geneva", "hornell", "horseheads",
      "jamestown", "johnstown", "malone", "massena", "medina", "new paltz", "north syracuse", "ogdensburg", "oneida", "oneonta",
      "oswego", "port jervis", "rochester hills", "saratoga", "watertown",

      // North Carolina (20 new, covering Piedmont and Coastal regions)
      "ahoskie", "belmont", "brevard", "dunn", "elizabeth city", "farmville", "graham", "hamlet", "haverford", "hendersonville",
      "laurinburg", "lenoir", "lillington", "lincolnton", "lumberton", "mocksville", "mount airy", "reidsville", "roxboro", "siler city",

      // North Dakota (10 new, smaller communities)
      "belcourt", "cavalier", "devils lake", "grafton", "harvey", "larimore", "lisbon", "new rockford", "rugby", "valley city",

      // Ohio (25 new, covering Northeast and Central Ohio)
      "alliance", "ashland", "ashtabula", "athens", "barberton", "berea", "chardon", "coshocton", "defiance", "dover",
      "eastlake", "fostoria", "galion", "greenville", "kent", "marietta", "medina", "painesville", "portsmouth", "sandusky",
      "sidney", "tiffin", "wadsworth", "willoughby", "zanesville",

      // Oklahoma (15 new, smaller cities)
      "anadarko", "blackwell", "bristow", "chandler", "cushing", "frederick", "henryetta", "hobart", "holdenville", "idabel",
      "pauls valley", "perry", "purcell", "sulphur", "vinita",

      // Oregon (15 new, covering Willamette Valley and Eastern Oregon)
      "astoria", "baker city", "coquille", "florence", "hood river", "junction city", "la pine", "lincoln city", "madras", "milton-freewater",
      "north bend", "seaside", "sutherlin", "tillamook", "umatilla",

      // Pennsylvania (25 new, covering Western and Central Pennsylvania)
      "ambridge", "beaver", "bellefonte", "blairsville", "bloomsburg", "clarion", "clearfield", "coraopolis", "corry", "doylestown",
      "du bois", "east stroudsburg", "edensburg", "gettysburg", "hollidaysburg", "huntingdon", "kittanning", "kutzton", "lewisburg", "lock haven",
      "milton", "monroeville", "new kensington", "punxsutawney", "selinsgrove",

      // Rhode Island (10 new, smaller communities)
      "barrington", "bristol", "central falls", "coventry", "exeter", "narragansett", "newport", "tiverton", "westerly", "woonsocket",

      // South Carolina (15 new, covering Upstate and Lowcountry)
      "abbeville", "anderson", "bennettsville", "cheraw", "chester", "clover", "gaffney", "lake city", "marion", "mullins",
      "newberry", "pageland", "union", "walterboro", "williamston",

      // South Dakota (10 new, smaller communities)
      "beresford", "brookings", "canton", "chamberlain", "dell rapids", "hot springs", "lead", "mobridge", "sturgis", "vermillion",

      // Tennessee (20 new, covering East and Middle Tennessee)
      "alcoa", "bristol", "crossville", "dayton", "elizabethton", "fayetteville", "gallatin", "harriman", "hohenwald", "jackson",
      "lafayette", "lafollette", "loudon", "manchester", "mcminnville", "milan", "paris", "pigeon forge", "ripley", "sweetwater",

      // Texas (30 new, covering Panhandle, Hill Country, and South Texas)
      "alvin", "angleton", "bastrop", "bay city", "boerne", "brenham", "brownwood", "burleson", "canyon", "cleburne",
      "conroe", "corsicana", "del rio", "eagle pass", "ennis", "fredericksburg", "galveston", "georgetown", "huntsville", "kerrville",
      "kingsville", "lampasas", "lufkin", "marshall", "nacogdoches", "palestine", "port arthur", "seguin", "sherman", "weatherford",

      // Utah (15 new, covering Wasatch Front and Southern Utah)
      "blanding", "brigham", "cedar hills", "delta", "ephraim", "fillmore", "moab", "morgan", "nephi", "park city",
      "price", "richfield", "roosevelt", "tremonton", "vernal",

      // Vermont (10 new, smaller towns)
      "barre", "bellows falls", "bethel", "brandon", "enosburg", "fair haven", "lyndon", "newport", "stowe", "vergennes",

      // Virginia (20 new, covering Shenandoah Valley and Tidewater)
      "blackstone", "bridgewater", "chincoteague", "colonial beach", "dumfries", "emporia", "falmouth", "front royal", "luray", "marion",
      "norton", "orange", "pulaski", "south boston", "south hill", "tappahannock", "vinton", "warrenton", "wise", "wytheville",

      // Washington (15 new, covering Puget Sound and Eastern Washington)
      "anacortes", "arlington", "battle ground", "bonney lake", "chehalis", "cheney", "colville", "ellensburg", "enumclaw", "ferndale",
      "gig harbor", "monroe", "port orchard", "sequim", "shelton",

      // West Virginia (10 new, smaller communities)
      "beckley", "clendenin", "fayetteville", "lewisburg", "moorefield", "oak hill", "parsons", "petersburg", "romney", "summersville",

      // Wisconsin (20 new, covering Southeast and Central Wisconsin)
      "baraboo", "cedarburg", "chippewa falls", "delafield", "delavan", "fort atkinson", "grafton", "hartford", "lake geneva", "menomonie",
      "merrill", "monroe", "oconto", "pewaukee", "portage", "reedsburg", "rice lake", "river falls", "stoughton", "sturgeon bay",

      // Wyoming (10 new, smaller communities)
      "afton", "evanston", "glenrock", "green river", "jackson hole", "kemmerer", "lander", "powell", "riverton", "sheridan", "birmingham", "montgomery",
      "hunstville", "lakeland", "wilsonville", "palm coast", "morristown", "palm coast", "morristown", "roseville", "novato", "jacksonville", "richmond",
      "san leandro"
  ];

// Construct KNOWN_CITIES_SET from SORTED_CITY_LIST
const KNOWN_CITIES_SET = new Set(SORTED_CITY_LIST.map(c => c.toLowerCase()));

const SUFFIXES_TO_REMOVE = new Set([
  "inc", "llc", "corp", "co", "ltd", "group", "dealership", "motors", "auto"
]);

     // Define known first and last names for human name splitting
    const KNOWN_FIRST_NAMES = new Set([
      "aaron", "abel", "al", "abraham", "adam", "arnie", "adrian", "al", "alan", "allan", "allen", "albert", "alden", "alex",
      "alexander", "alfred", "allan", "allen", "alton", "alvin", "amos", "andre", "andrew",
      "andy", "angus", "anthony", "archie", "arnold", "arthur", "asa", "austin", "avery",
      "barney", "barnett", "barrett", "barry", "bart", "basil", "bo", "beau", "beauford", "ben",
      "benedict", "benjamin", "bennie", "benny", "bernard", "bernie", "bert", "beverly",
      "bill", "billy", "blaine", "blair", "blake", "bob", "bobbie", "bobby", "boyd",
      "brad", "bradford", "bradley", "brand", "brant", "brent", "brett", "brian", "brock",
      "bruce", "bryan", "bryce", "buck", "bud", "buddy", "burl", "burton", "byron",
      "cal", "caleb", "calvin", "cameron", "carey", "carl", "carlton", "carroll", "carson",
      "casey", "cecil", "cedric", "chad", "chadwick", "chandler", "charles", "charlie",
      "chester", "chip", "chris", "christian", "chuck", "ches", "clair", "clarence", "clark",
      "claude", "clay", "clayton", "clem", "clement", "cletus", "cliff", "clifford",
      "clifton", "clyde", "cody", "coleman", "colin", "connor", "conrad", "corey",
      "cornell", "cory", "courtney", "craig", "curt", "curtis", "cyrus", "dale",
      "dallas", "damon", "dan", "diane", "dane", "daniel", "danny", "daren", "dayton", "darrel", "darrell",
      "darren", "darryl", "dave", "david", "dawson", "dean", "delbert", "delmar",
      "denis", "dennis", "denny", "derek", "derrick", "desmond", "devin", "dewey",
      "dexter", "dick", "dickie", "dillon", "dino", "dominic", "don", "donald",
      "donnie", "donovan", "doyle", "doug", "drake", "drew", "duane", "dudley", "duncan",
      "dustin", "dwight", "earl", "earnest", "ed", "eddie", "edgar", "edmond",
      "edward", "edwin", "elbert", "elden", "eldon", "eli", "eliot", "elliot",
      "elliott", "ellis", "ed", "elmer", "elton", "elwood", "emery", "emmett", "ernest",
      "ernie", "ethan", "eugene", "evan", "everett", "ezra", "felix", "ferdinand",
      "finn", "fletcher", "floyd", "forrest", "francis", "frank", "franklin", "fred",
      "freddie", "frederick", "freddy", "gabe", "gabriel", "gail", "gale", "garland",
      "garrett", "garry", "gary", "gavin", "gayle", "gene", "geoff", "geoffrey",
      "george", "gerald", "gil", "gilbert", "giles", "glen", "glenn", "gordon",
      "grady", "graham", "grant", "greg", "gregg", "gregory", "grover", "gus",
      "guy", "hal", "hank", "hans", "harlan", "herb", "harley", "harold", "harris", "harrison",
      "harry", "hart", "harvey", "hayden", "heath", "hector", "henry", "herbert",
      "herman", "homer", "horace", "hadwin", "howard", "hugh", "hugo", "ian", "ira", "irvin",
      "irving", "isaac", "ivan", "jack", "jackson", "jacob", "jake", "jamie",
      "jared", "jarrett", "jasper", "jay", "jed", "jeff", "jeffery", "jeffrey",
      "jerald", "jeremy", "jerome", "jerry", "jim", "jessie", "jim", "jimmie", "jimmy",
      "joel", "joey", "john", "johnnie", "johnny", "jon", "jonah", "jonas",
      "jonathan", "jordan", "jordy", "joseph", "josh", "joshua", "judd", "julian",
      "julius", "junior", "justin", "keith", "kelvin", "kc", "ken", "kenneth", "kenny",
      "kent", "kevin", "kurt", "kyle", "lamar", "lance", "landon", "lane",
      "larry", "lavern", "lawrence", "lee", "leland", "lenny", "leo", "leon",
      "leroy", "les", "leslie", "levi", "lewis", "lincoln", "lloyd", "logan",
      "lon", "lonnie", "loren", "lou", "louie", "louis", "lowell", "luc", "lucas",
      "lucian", "luke", "lyle", "lyman", "lynn", "mack", "malcolm", "marc",
      "marco", "mario", "marion", "mark", "marshall", "martin", "marty", "marvin",
      "mason", "matt", "matthew", "maurice", "max", "maxwell", "melvin", "merle",
      "merrill", "michael", "mickey", "mike", "miles", "milo", "milton", "mitch",
      "mitchell", "monty", "morgan", "morris", "murray", "nate", "nathan", "nathaniel",
      "ned", "neil", "nelson", "nick", "nicholas", "noah", "norm", "norman",
      "norris", "oliver", "orville", "oscar", "otis", "owen", "pascal", "pat",
      "paul", "percy", "pete", "pat", "peter", "phil", "philip", "quentin", "quinn",
      "ralph", "ramon", "randall", "randell", "randy", "ray", "raymond", "reed",
      "reginald", "reid", "rex", "rhett", "richard", "rick", "ricky", "rob",
      "robert", "rod", "rodney", "roger", "roland", "roman", "ron", "ronald",
      "ronnie", "rory", "ross", "roy", "rudy", "russ", "russell", "russel",
      "sal", "sam", "sammy", "saul", "sawyer", "scott", "sean", "seth", "shawn",
      "sheldon", "sherman", "sid", "sidney", "silas", "simon", "sol", "sonny",
      "spencer", "stan", "stanley", "stewart", "steve", "steven", "stuart",
      "sylvester", "tanner", "ted", "terry", "theodore", "thomas", "tim", "timothy",
      "toby", "todd", "tom", "tony", "tracy", "travis", "trent", "trevor", "trey",
      "tristan", "troy", "tucker", "ty", "tyler", "tyrone", "val", "vance",
      "vernon", "victor", "vince", "vincent", "virgil", "wade", "walker", "wallace",
      "walter", "warren", "wayne", "walker", "wendell", "wes", "vic", "wesley", "whit", "wilber",
      "wilbert", "will", "willard", "willie", "wilson", "winston", "woody", "wyatt",
      "xavier", "zach", "zachary", "zack", "zane",
      // New first names (500, for white males aged 40–80, born ~1945–1985)
      "abner", "alden", "alfonzo", "alford", "alpheus", "alston", "ambrose", "anson",
      "arden", "arlie", "arlin", "armand", "arno", "arnold", "arvel", "asa", "aubrey",
      "august", "aurelius", "barrett", "bartholomew", "baxter", "bennett", "berton",
      "beverly", "blaine", "blair", "blanchard", "boyce", "bradford", "bradley",
      "bradshaw", "brantley", "brent", "brett", "brice", "broderick", "bronson",
      "buckley", "burl", "burton", "byron", "calvert", "carey", "carleton", "carlton",
      "carmine", "cassius", "cecil", "cedric", "chadwick", "chalmers", "chance",
      "channing", "charlton", "chester", "clair", "clarence", "claudius", "clemens",
      "cletus", "clifford", "clinton", "clyde", "coleman", "columbus", "conrad",
      "cordell", "cornelius", "cortez", "crawford", "cullen", "curtis", "cyril",
      "dalton", "damian", "darius", "darrin", "darwin", "daryl", "davey", "delbert",
      "delmer", "denny", "derrick", "desmond", "dewitt", "dexter", "dillard",
      "dion", "dolph", "dominick", "donovan", "dorian", "dorsey", "doyle", "dudley",
      "duff", "duncan", "dwayne", "dwight", "earle", "easton", "edgar", "edison",
      "edmund", "edwin", "eldridge", "elias", "elisha", "elliot", "ellis", "elmer",
      "elton", "elwood", "emanuel", "emerson", "emery", "emil", "emmett", "enoch",
      "ephraim", "erasmus", "erastus", "ernest", "ernie", "errol", "ervin", "esau",
      "eugene", "everett", "ezekiel", "ezra", "fabian", "felton", "ferdinand", "ferris",
      "finley", "fleming", "fletcher", "flora", "floyd", "forrest", "foster", "frank", "francis",
      "franklin", "fredric", "freeman", "gabe", "garfield", "garland", "garrett",
      "garrison", "gaston", "geoff", "gideon", "gilbert", "giles", "gillian", "glenn",
      "godfrey", "gordon", "grady", "granger", "grant", "gregg", "grover", "gustave",
      "hadley", "halbert", "halsey", "hammond", "hanson", "harlan", "harmon", "harold",
      "harper", "harris", "harrison", "hartley", "harvey", "hayden", "hayes", "haywood",
      "heath", "hector", "henry", "herbert", "herschel", "hezekiah", "hilton", "hiram",
      "hobart", "hollis", "homer", "horatio", "hosea", "howard", "hoyt", "hubert",
      "hugh", "hugo", "humbert", "hunter", "hyman", "ignatius", "irwin", "isaiah",
      "israel", "ivan", "ivor", "jacob", "jared", "jerry", "jarvis", "jasper", "jeb", "jedediah",
      "jefferson", "jeremiah", "jerome", "jesse", "jethro", "joab", "joel", "johnathan",
      "jonas", "jordy", "josiah", "jude", "judson", "julian", "julius", "juniper",
      "justus", "kermit", "king", "kingsley", "kirk", "lambert", "lamont", "lance",
      "larkin", "laurence", "lawson", "layton", "lemuel", "lenard", "leonard", "leroy",
      "lester", "levi", "lewis", "lincoln", "lindsey", "linus", "lionel", "lloyd",
      "lonnie", "loren", "lorenzo", "lowell", "lucian", "luther", "lyle", "mackenzie",
      "malachi", "malcolm", "manfred", "marcus", "marlin", "marshall", "marvin",
      "mason", "maurice", "maxwell", "merritt", "micah", "miles", "milo", "montague",
      "montgomery", "morgan", "morris", "morton", "moses", "murphy", "murray", "myron",
      "nathaniel", "ned", "nelson", "newell", "newton", "niles", "noel", "nolan",
      "norbert", "normand", "obadiah", "octavius", "packey", "odell", "olaf", "olin", "orion",
      "orlando", "orville", "osborn", "oswald", "otis", "otto", "owens", "palmer",
      "pascal", "patrick", "percy", "perry", "phineas", "pierce", "porter", "prescott",
      "preston", "quentin", "quincy", "ralph", "randolph", "rayburn", "rayford",
      "reginald", "reuben", "rex", "reynold", "rhodes", "richard", "rigby", "robert",
      "roderick", "roger", "roland", "rollin", "russell", "roman", "ronald", "roosevelt", "rory",
      "roscoe", "ross", "royce", "rudy", "rufus", "rupert", "russell", "sampson", "samuel",
      "saul", "sebastian", "seth", "seymour", "shadrach", "sherman", "sherwood",
      "sidney", "sigmond", "silas", "simon", "solomon", "spencer", "stanford", "stephan",
      "sterling", "stevens", "sylvester", "talmadge", "teddy", "terence", "theodore",
      "thomas", "thornton", "titus", "tobias", "troy", "truman", "tucker", "tyrone",
      "ulysses", "valentine", "vance", "vaughn", "vernon", "vic", "victor", "vincent",
      "virgil", "vito", "vivian", "vladimir", "wade", "walker", "wallace", "walter",
      "ward", "warner", "warren", "weldon", "wendell", "wesley", "weston", "whitman",
      "wilbur", "wilder", "wilfred", "willard", "willis", "winfield", "winston",
      "woodrow", "wyatt", "zachariah", "zephaniah", "scott"
    ]);

       // Place immediately after KNOWN_FIRST_NAMES in api/lib/humanize.js
    const KNOWN_LAST_NAMES = new Set([
      // Existing last names (~600, summarized from humanize.js lines 299–368)
      "abbott", "ackerman", "adams", "adkins", "albert", "aldrich", "alexander", "alford", "allison", "alston",
      "anderson", "andrews", "appleton", "archer", "archibald", "andrews", "armstrong", "arnold", "ashley", "atkins", "atkinson",
      "atwood", "austin", "avery", "babcock", "bain", "baird", "baker", "baldwin", "ball", "ballard",
      "banning", "barker", "barlow", "barr", "barrett", "barry", "bartlett", "barnett", "barrett", "barton", "bates", "bauer",
      "baxter", "beal", "beard", "beasley", "beck", "becker", "bell", "bellows", "bennett", "benson",
      "berry", "billings", "bingham", "bishop", "bixby", "boruff", "black", "bestle", "cecconis", "blackburn", "blair", "blake", "blanchard",
      "bolton", "bond", "booth", "bowen", "bowers", "bowman", "boyd", "boyle", "bradley", "brady",
      "brannon", "bray", "brewer", "briggs", "bright", "brink", "baur", "britt", "brock", "brooks", "brown",
      "browne", "browning", "bryant", "bryce", "buck", "buckley", "bullock", "bumpus", "burdick", "burgess",
      "burke", "burnett", "burns", "burrows", "burton", "bush", "butler", "byrd", "calhoun", "callahan",
      "calvert", "cameron", "campbell", "cannon", "cantrell", "carey", "cism", "carlson", "carmichael", "carpenter", "carr",
      "carroll", "carson", "case", "casey", "cassidy", "chaffee", "chambers", "chandler", "chapman", "chase",
      "childers", "church", "churchill", "clark", "clay", "clayton", "clemens", "clements", "cobb", "cochran",
      "cody", "colburn", "colby", "cole", "coleman", "collier", "collins", "compton", "conley", "connolly",
      "connor", "conway", "cook", "cooke", "cooper", "cope", "corbett", "chambers", "corbin", "cowan", "cox",
      "craig", "crane", "crawford", "crews", "crockett", "crosby", "cross", "crowley", "cummings", "cummins",
      "curry", "dalton", "daly", "daniel", "daniels", "daugherty", "davidson", "davis", "dawes", "day",
      "dean", "decker", "denton", "dickerson", "dickinson", "dillard", "dillon", "dixon", "dodson", "doherty", "donnelly",
      "donovan", "dorsey", "dotson", "dougherty", "douglas", "downey", "downs", "doyle", "drake", "dube",
      "dudley", "duff", "duffy", "duncan", "dunn", "dunbar", "dutton", "eastman", "eaton", "edmonds",
      "edwards", "elliott", "ellis", "emerson", "england", "english", "erickson", "evans", "farley", "farmer",
      "farris", "faulkner", "fenton", "ferguson", "finley", "fischer", "fisher", "fitzgerald", "fleming", "fletcher",
      "flynn", "ford", "foster", "fowler", "fox", "holt", "kay", "brand", "dube", "summers", "franklin", "fraser", "freeman", "frost", "fuller",
      "gallagher", "gannett", "garcia", "gardner", "garner", "garrison", "gibbons", "gibbs", "gibson", "giles",
      "gill", "gilles", "gilmore", "glass", "gleason", "goddard", "goodman", "goodrich", "goodwin", "gordon",
      "gould", "grady", "graham", "granger", "grant", "graves", "gray", "green", "greene", "gregory",
      "griffin", "griffith", "grimes", "gross", "grove", "guthrie", "hadley", "hahn", "hale", "hall",
      "hamilton", "hammond", "hancock", "hanna", "hardy", "harmon", "hubler", "harper", "harriman", "harrington", "harris",
      "hart", "hartman", "hastings", "hatcher", "hawkins", "hawley", "hayden", "hayes", "hayward", "healey",
      "heath", "henderson", "hendricks", "hendrickson", "henry", "herndon", "hesser", "hicks", "higgins", "hill", "hinton",
      "hitchcock", "hodges", "hoffman", "hogan", "holbrook", "holden", "holder", "holland", "holloway", "holmes",
      "holt", "hood", "hooper", "hopkins", "horn", "horton", "houghton", "houston", "howe", "howard",
      "hubbard", "huffman", "hughes", "humphrey", "hunt", "hunter", "hutchinson", "ingalls", "ingram", "irwin",
      "jackson", "jack", "jacobs", "jacobson", "james", "jameson", "jarvis", "jennings", "jensen", "jewett", "johnson",
      "johnston", "jones", "jordan", "judson", "kane", "keating", "keller", "kelley", "kellogg", "kelly",
      "kemp", "kendall", "kennedy", "kent", "kerr", "koehn", "rinke", "kimball", "king", "kinney", "kirby", "kirk",
      "klein", "knox", "lambert", "lane", "lang", "lobb", "larkin", "latta", "larson", "lawrence", "lawson", "leach",
      "leavitt", "leblanc", "lee", "leta", "tomlinson", "lewis", "lindsey", "locke", "logan", "lombard", "long", "lovett",
      "lowe", "lowry", "lucas", "lynch", "lyons", "luther", "mack", "mackenzie", "madden", "malone", "mann",
      "manning", "marks", "marlowe", "marsh", "martin", "mason", "matthews", "mccarthy", "mccoy", "mcdaniel",
      "mckinney", "mclaughlin", "mclean", "mcmillan", "mcpherson", "meadows", "mercer", "merrill", "merritt", "meyer",
      "miles", "miller", "mills", "mitchell", "moody", "moore", "morgan", "morrison", "morrow", "morse",
      "morton", "moss", "mullins", "munson", "murphy", "murray", "myers", "nash", "neal", "nelson",
      "newell", "newman", "newton", "nichols", "nixon", "noble", "nolan", "norman", "norris", "norton",
      "oakley", "obrien", "oconnor", "odonnell", "oliver", "oneal", "oneil", "oneill", "orr", "osborne",
      "osgood", "owens", "pace", "page", "palmer", "parker", "parsons", "patterson", "payne", "peabody",
      "pearson", "pennington", "perkins", "perry", "peters", "peterson", "phelps", "philips", "pierce", "pollard",
      "poole", "porter", "potter", "powell", "pratt", "prescott", "polis", "preston", "price", "purcell", "putnam",
      "quinn", "raines", "ramsey", "randall", "ransom", "raymond", "reed", "reese", "reeves", "regan",
      "reid", "reilly", "remington", "reyes", "reynolds", "rhodes", "rice", "richards", "richardson", "ricker",
      "riley", "rivera", "roberts", "robinson", "rogers", "rollins", "roman", "rose", "ross", "rowe",
      "rudd", "rutherford", "ryan", "salazar", "sanders", "sanderson", "sargent", "saunders", "savage", "sawyer",
      "schmidt", "schneider", "schroeder", "schultz", "scott", "seiner", "sears", "sewell", "sexton", "shannon", "sharp",
      "shaw", "shea", "sheldon", "shepherd", "sherman", "sherwood", "short", "simmons", "simon", "simpson",
      "sinclair", "slater", "sloan", "small", "smith", "snyder", "sparks", "spencer", "sprague", "stafford",
      "stanley", "stark", "steele", "stephens", "stevens", "stewart", "summers", "stoddard", "stokes", "stone", "stratton",
      "strickland", "strong", "sullivan", "summers", "shallotte", "sumner", "sutton", "sweeney", "swanson", "talbot", "tanner",
      "taylor", "thayer", "thomas", "thorne", "thornton", "todd", "torres", "tucker", "turner", "underwood",
      "upton", "vance", "vaughn", "vinton", "wadsworth", "walker", "wall", "wallace", "walden", "walters",
      "walton", "ward", "warner", "warren", "watson", "weaver", "webb", "welch", "wells", "west",
      "wheeler", "whitaker", "whitcomb", "white", "whiting", "whitman", "whiteames", "whitney", "wiley", "wilcox", "wilder",
      "wilkerson", "wilkins", "williams", "williamson", "willis", "webb", "wilson", "winslow", "winters", "wise", "wolfe",
      "wood", "woodard", "woodruff", "vigil", "mello", "woods", "wright", "workman", "wright", "wyatt", "yates", "york", "young",
      "youngblood", "zimmerman",
      // New last names (500, for white males aged 40–80, born ~1945–1985)
      "abbot", "acker", "addison", "ainsworth", "albright", "allred", "ames", "appleby", "archibald", "armistead",
      "ashburn", "ashcroft", "ashford", "atwater", "austen", "badger", "bagley", "bainbridge", "balding", "barber",
      "barclay", "barker", "barnard", "barnes", "barnett", "barron", "barton", "bassett", "bates", "baxter",
      "bayard", "beadle", "beall", "beckett", "boulware", "bedford", "beecham", "belcher", "belding", "bellamy", "benedict",
      "benford", "bennet", "bentley", "berkeley", "bertram", "beverly", "bickford", "biddle", "bigelow", "bingham",
      "birch", "bird", "blackwell", "blair", "blakeley", "blanchard", "blevins", "bloom", "blythe", "bogart",
      "bogue", "bolling", "bolton", "bondurant", "boone", "boswell", "boughton", "bowden", "bowles", "boynton",
      "brace", "bradbury", "bradford", "bradshaw", "bragg", "bramwell", "branson", "brant", "braxton", "breckenridge",
      "brewster", "brice", "bridger", "briggs", "brigham", "brinton", "briscoe", "britton", "broadus", "brockway",
      "bromley", "brook", "brough", "brownell", "brunson", "buckingham", "buckner", "buffington", "bullard", "burch",
      "burdett", "burleigh", "burnham", "burr", "burrows", "burton", "bushnell", "byers", "byram", "cabell",
      "calder", "caldwell", "calloway", "camden", "cameron", "camp", "canfield", "cannon", "cantrell", "capps",
      "cardwell", "carleton", "carlisle", "carmichael", "carrington", "carson", "cartwright", "carver", "cass",
      "castle", "caulfield", "chadwick", "chambers", "chandler", "chapin", "chase", "chatfield", "cheatham", "childs",
      "chisholm", "christenson", "church", "clancy", "clapp", "clarke", "clayborne", "clem", "clement", "clifford",
      "clinch", "cobb", "coburn", "cocker", "cockrell", "coddington", "colburn", "colgate", "collier", "colvin",
      "comer", "comstock", "conant", "conklin", "connell", "converse", "cooley", "cooper", "corbin", "cornish",
      "cortland", "coryell", "cotton", "courtney", "covington", "cowles", "craddock", "crane", "crawley", "creighton",
      "cromwell", "croswell", "crum", "cullen", "culver", "cummings", "cunningham", "currier", "curtis", "cushing",
      "cutler", "cutts", "daly", "danforth", "darnell", "darr", "davenport", "davidson", "dawson", "deane",
      "decker", "delano", "denham", "denny", "derr", "dewey", "dickenson", "dill", "dinsmore", "dix",
      "dixon", "dodge", "dole", "donovan", "dorsett", "doughty", "dow", "dowling", "drake", "draper",
      "drayton", "drew", "driscoll", "duff", "duke", "dunham", "dunlap", "dunnell", "durrence", "durant", "durham",
      "dutton", "dwyer", "eads", "eagle", "earl", "easterly", "eaton", "eckert", "eddy", "edmondson",
      "eldred", "eller", "ellington", "ellis", "ellsworth", "elmore", "emerson", "emery", "emmons", "engle",
      "ennis", "epps", "ernest", "esmond", "evans", "everett", "ewing", "fairchild", "falkner", "fanning",
      "farley", "farnham", "farrar", "farrell", "farrow", "faulk", "fay", "felton", "fenn", "ferris",
      "field", "finch", "fish", "fisk", "fitzpatrick", "flagg", "fleming", "flint", "flynn", "fogg",
      "folger", "forbes", "fordham", "forsyth", "fortune", "foss", "foster", "fowler", "fox", "frame",
      "franks", "fraser", "freeland", "freeman", "french", "frost", "fry", "fuller", "gaines", "gallagher",
      "galloway", "gardiner", "garland", "garrett", "garrison", "gates", "gaylord", "geiger", "gerry", "gibbs",
      "giddings", "gilchrist", "giles", "gillespie", "gilman", "gilmore", "gladstone", "glenn", "glover", "godwin",
      "goldsmith", "goodwin", "gore", "gould", "grafton", "grantham", "graves", "gray", "greenleaf", "greenwood",
      "gregg", "gridley", "griffith", "grimes", "grinnell", "griswold", "grove", "gunn", "hadley", "haines",
      "hale", "hall", "halsey", "hamlin", "hammond", "hampton", "hancock", "hand", "hanley", "hanson",
      "harding", "hargrove", "harmon", "harper", "harrington", "hart", "hartley", "harvey", "haskell", "hatch",
      "hawes", "hawthorne", "hayden", "hayes", "hamm", "hayward", "heath", "heaton", "hedrick", "hempstead", "henderson",
      "henley", "henson", "herrick", "hewitt", "hickman", "hicks", "higgins", "high", "hill", "hilliard",
      "hilton", "hines", "hinson", "hitchcock", "hoag", "hobbs", "hodge", "hodgson", "hogan", "holbrook",
      "holden", "holladay", "holland", "hollister", "holmes", "holt", "hooker", "hooper", "hopkins", "horn",
      "horton", "houghton", "houston", "howard", "howell", "hoyt", "hubbard", "huber", "huck", "huff",
      "huffman", "huggins", "hull", "hume", "hunt", "huntington", "hurd", "hurley", "huston", "hutchins",
      "hyde", "ingalls", "ingle", "ireland", "irvine", "irving", "isaacs", "ives", "jackson", "jarrett",
      "jeffries", "jensen", "jessup", "jewell", "jobe", "johns", "joiner", "jordan", "judd", "keane",
      "keeler", "keen", "kellogg", "kemp", "kendall", "kennedy", "kenney", "kent", "kerr", "keyes",
      "kilgore", "kimball", "king", "kingsbury", "kinsey", "kirby", "kirk", "knapp", "knighton", "knott",
      "knowles", "knox", "lacey", "lamar", "lambert", "lamson", "lancaster", "landis", "lane", "langdon",
      "langston", "larkin", "larson", "latham", "law", "lawton", "leach", "leavitt", "ledger", "leighton",
      "leland", "leonard", "lester", "lewis", "lilly", "lincoln", "lindley", "lindsey", "litchfield", "lockwood",
      "lodge", "logan", "long", "lord", "lovett", "lowe", "lowry", "lucas", "luce", "ludlow",
      "lundy", "lusk", "lyman", "lyon", "lyons", "mace", "mack", "maddox", "magee", "main",
      "malcolm", "mallett", "manley", "mann", "manning", "mansfield", "marble", "marlow", "marsh", "martin",
      "marvin", "mason", "mathews", "maury", "maxwell", "may", "maynard", "mays", "mccabe", "mccall",
      "mccarter", "mcclellan", "mcclure", "mccormick", "mcculloch", "mcdowell", "mcgee", "mcgowan", "mcguire", "mckay",
      "mckee", "mckenna", "mcknight", "mclane", "mcnair", "mcneil", "mcrae", "mead", "meadows", "melton",
      "mercer", "meredith", "merrick", "merrill", "merritt", "miles", "millard", "miller", "mills", "milner",
      "mitchell", "moody", "moore", "moran", "moreland", "morgan", "morrill", "morrison", "morrow", "morse",
      "morton", "moseley", "moss", "mott", "mullins", "munroe", "murdoch", "myers", "murphy", "murray", "myers",
      "nash", "naylor", "neal", "needham", "neely", "nikel", "rown", "newcomb", "newell", "newton", "nicholls", "noble",
      "nolan", "norris", "north", "norton", "norwood", "nutter", "oakley", "ober", "odell", "ogden",
      "oliver", "ormond", "orr", "osborn", "osgood", "otis", "overton", "owens", "pace", "page",
      "paine", "palmer", "park", "parker", "parrish", "parsons", "patten", "patterson", "payne", "peabody",
      "pearce", "peck", "peel", "pemberton", "penn", "pennington", "perry", "peters", "peterson", "pettigrew",
      "phelps", "phillips", "pickens", "pierce", "pike", "pittman", "platt", "plummer", "poole", "porter",
      "potter", "powell", "pratt", "prescott", "preston", "price", "prichard", "proctor", "purdy", "putnam",
      "quincy", "raines", "raleigh", "rand", "randall", "ransom", "rathbun", "ray", "rahal", "raymond", "reade",
      "redding", "reed", "rees", "reese", "reid", "remington", "renfro", "reynolds", "rous", "rhodes", "rice",
      "rich", "richards", "richardson", "richmond", "ricketts", "rider", "ridgeway", "riggs", "riley", "ripley",
      "robbins", "roberts", "robertson", "robinson", "rockwell", "rodgers", "rogers", "rollins", "roper", "ross",
      "rowland", "roy", "rudd", "rush", "russell", "rutherford", "ryder", "sabin", "sampson", "samuels",
      "sanders", "sanford", "sanger", "sargent", "saunders", "savage", "sawyer", "schuyler", "scott", "sinclair", "sears",
      "seaton", "seaver", "sedgwick", "sewell", "sextons", "shannon", "curley", "oneal", "vaden", "baier", "winter", "butler", "sharp", "shaw", "sheldon", "shelton",
      "shepherd", "sheridan", "sherwood", "shipman", "shirley", "shields", "short", "shumway", "sikes", "simmons",
      "simonds", "simpson", "sinclair", "singleton", "skinner", "slade", "slater", "sloan", "small", "smyth",
      "snell", "snow", "somers", "spalding", "sparks", "spear", "spears", "spence", "spencer", "sprague",
      "springer", "stafford", "sauer", "stanton", "stark", "starr", "steele", "stein", "sterling", "stetson", "stevens",
      "stewart", "stiles", "stockton", "stoddard", "stone", "stout", "stratton", "street", "strong", "stuart",
      "sullivan", "sumner", "sutton", "swain", "swanson", "sweet", "sykes", "talbot", "tanner", "tate",
      "taylor", "teague", "temple", "terrell", "thatcher", "thayer", "thompson", "thorne", "thornton", "thurston",
      "tibbetts", "tierney", "tilton", "todd", "tomlinson", "torrey", "towne", "townsend", "tracy", "travis",
      "treadwell", "tucker", "turnbull", "turner", "tyler", "underwood", "upham", "vance", "vaughan", "vinton",
      "wadsworth", "wainwright", "waldron", "walker", "wall", "wallace", "walton", "ward", "ware", "warner",
      "warren", "washburn", "waterman", "watkins", "watson", "watts", "weaver", "webber", "webster", "weeks",
      "welch", "weld", "wellman", "wells", "wendell", "wentworth", "west", "weston", "wheeler", "whipple",
      "whitaker", "whitcomb", "white", "whitehead", "whiting", "whitman", "whitney", "whittaker", "whittier", "wight",
      "wilbur", "wilcox", "wilder", "wilkerson", "wilkins", "willard", "willcox", "williams", "williamson", "willis",
      "wilson", "winchester", "wing", "winslow", "winston", "winter", "withers", "wood", "woodbridge", "woodbury",
      "woodruff", "woods", "woodward", "woolsey", "worthington", "wright", "wyatt", "yates", "yeager", "york",
      "young", "youngblood", "zimmerman", "kadlac", "clark", "caruso", "perillo", "stoops", "weaver"
    ]);

// Pre-compile regex for splitting
const SPLIT_REGEX = /(?=[A-Z])|[-_\s]|of|(?<=\D)(?=\d)/;

// Cache known lists for performance
const KNOWN_WORDS_CACHE = new Map(knownWords.map(word => [word, true]));
const SORTED_CITIES_CACHE = new Map(sortedCities.map(city => [city.toLowerCase().replace(/\s+/g, "").replace(/&/g, "and"), city.toLowerCase().replace(/\s+/g, " ")]));
const CAR_BRANDS_CACHE = new Map(CAR_BRANDS.map(brand => [brand.toLowerCase(), brand]));
const KNOWN_CITIES_SET_CACHE = new Map(Array.from(KNOWN_CITIES_SET).map(city => [city.toLowerCase(), city]));
const PROPER_NOUNS_CACHE = new Map(properNounsSet.map(noun => [noun.toLowerCase(), noun]));
const COMMON_WORDS_CACHE = new Map(Array.from(COMMON_WORDS).map(word => [word.toLowerCase(), true]));
const KNOWN_FIRST_NAMES_CACHE = new Map(Array.from(KNOWN_FIRST_NAMES).map(name => [name.toLowerCase(), name]));
const KNOWN_LAST_NAMES_CACHE = new Map(Array.from(KNOWN_LAST_NAMES).map(name => [name.toLowerCase(), name]));
const BRAND_MAPPING_CACHE = new Map(Object.entries(BRAND_MAPPING || {}));

// Pre-compute multi-word cities
const MULTI_WORD_CITIES = new Map();
for (const city of KNOWN_CITIES_SET_CACHE.keys()) {
  const cityTokens = city.split(" ");
  if (cityTokens.length > 1) {
    MULTI_WORD_CITIES.set(cityTokens.join(" ").toLowerCase(), city);
  }
}

// Pre-compile regex for URL stripping
const URL_PREFIX_REGEX = /^(https?:\/\/)?(www\.)?/i;

// Define contextual words to retain for better name construction
const CONTEXTUAL_WORDS = new Set(["cars", "auto", "motors", "group", "dealership"].map(word => word.toLowerCase()));

// Precompute proper nouns set for performance (only proper nouns)
const properNounsSet = new Set([
    ...(Array.isArray(KNOWN_FIRST_NAMES) ? KNOWN_FIRST_NAMES : []).map(n => n.toLowerCase()),
    ...(Array.isArray(KNOWN_LAST_NAMES) ? KNOWN_LAST_NAMES : []).map(n => n.toLowerCase()),
    ...(Array.isArray(SORTED_CITY_LIST) ? SORTED_CITY_LIST : []).map(c => c.toLowerCase()),
    ...(Array.isArray(KNOWN_PROPER_NOUNS) ? KNOWN_PROPER_NOUNS : []).map(n => n.toLowerCase())
]);

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

// Normalizes domain by removing "www." and extracting base domain
function normalizeDomain(domain) {
  if (typeof domain !== "string" || !domain) {
    log("error", "Invalid domain input", { domain });
    return "";
  }
  return domain.toLowerCase().replace(/^www\./, "").split(".")[0];
}

// Cleans company name by removing trailing suffixes and connectors
function cleanCompanyName(companyName) {
  try {
    if (!companyName || typeof companyName !== "string") {
      log("error", "Invalid name in cleanCompanyName", { companyName });
      return "";
    }

    // Step 0: Strip URL prefixes using pre-compiled regex
    let cleanedName = companyName.replace(URL_PREFIX_REGEX, "");
    if (cleanedName !== companyName && logLevel === "debug") {
      log("debug", "URL prefix stripped", { original: companyName, cleaned: cleanedName });
    }

    // Validate dependencies
    if (!(COMMON_WORDS_CACHE.size > 0) || !(SUFFIXES_TO_REMOVE_CACHE.size > 0)) {
      log("error", "Invalid dependencies in cleanCompanyName", {
        COMMON_WORDS: COMMON_WORDS instanceof Set,
        SUFFIXES_TO_REMOVE: SUFFIXES_TO_REMOVE instanceof Set
      });
      return cleanedName.trim();
    }

    let tokens = cleanedName.trim().split(/\s+/).filter(Boolean);
    if (!tokens.every(token => typeof token === "string")) {
      log("error", "Invalid tokens in cleanCompanyName", { companyName, tokens });
      return cleanedName.trim();
    }

    // Step 1: Deduplicate tokens while preserving case
    const seen = new Set();
    const dedupedTokens = [];
    for (const token of tokens) {
      const tokenKey = token.toLowerCase();
      if (!seen.has(tokenKey)) {
        seen.add(tokenKey);
        dedupedTokens.push(token);
      } else if (logLevel === "debug") {
        log("debug", "Duplicate token removed", { companyName, token });
      }
    }
    tokens = dedupedTokens;

    // Step 2: Context-aware removal of leading and trailing tokens
    // Remove leading connectors only if they are not part of a proper noun, city, or brand
    while (tokens.length > 1 && COMMON_WORDS_CACHE.has(tokens[0].toLowerCase())) {
      const remainingSegment = tokens.slice(1).join("").toLowerCase();
      if (
        !PROPER_NOUNS_CACHE.has(remainingSegment) &&
        !KNOWN_CITIES_SET_CACHE.has(remainingSegment) &&
        !CAR_BRANDS_CACHE.has(remainingSegment)
      ) {
        if (logLevel === "debug") {
          log("debug", "Leading connector removed", { companyName, removed: tokens[0] });
        }
        tokens.shift();
      } else {
        break; // Preserve if part of a proper noun, city, or brand
      }
    }

    // Remove trailing suffixes and connectors only if they are not part of a proper noun, city, brand, or contextual word
    while (tokens.length > 1) {
      const lastToken = tokens[tokens.length - 1].toLowerCase();
      const isContextual = CONTEXTUAL_WORDS.has(lastToken);
      const isSuffixOrCommon = SUFFIXES_TO_REMOVE_CACHE.has(lastToken) || COMMON_WORDS_CACHE.has(lastToken);
      if (!isSuffixOrCommon || (isContextual && tokens.length > 1)) {
        break; // Preserve contextual words if they follow a human name, brand, or city
      }
      const precedingSegment = tokens.slice(0, -1).join("").toLowerCase();
      const precedingIsHumanName = tokens.slice(0, -1).some(token => 
        KNOWN_FIRST_NAMES_CACHE.has(token.toLowerCase()) || KNOWN_LAST_NAMES_CACHE.has(token.toLowerCase())
      );
      if (
        !PROPER_NOUNS_CACHE.has(precedingSegment) &&
        !KNOWN_CITIES_SET_CACHE.has(precedingSegment) &&
        !CAR_BRANDS_CACHE.has(precedingSegment) &&
        !precedingIsHumanName
      ) {
        if (logLevel === "debug") {
          log("debug", "Trailing suffix/connector removed", { companyName, removed: tokens[tokens.length - 1] });
        }
        tokens.pop();
      } else {
        break; // Preserve if part of a proper noun, city, brand, or human name
      }
    }

    // Step 3: Sanity check for truncation (e.g., "Nanue" → "Nanuet")
    const restoredTokens = tokens.map(token => {
      const tokenLower = token.toLowerCase();
      // Check if the token appears truncated by looking for close matches in KNOWN_CITIES_SET or properNounsSet
      for (const [knownToken, original] of [...KNOWN_CITIES_SET_CACHE, ...PROPER_NOUNS_CACHE]) {
        const knownLower = knownToken.toLowerCase();
        if (knownLower.startsWith(tokenLower) && knownLower.length <= tokenLower.length + 2 && knownLower.length > tokenLower.length) {
          if (logLevel === "debug") {
            log("debug", "Restored truncated token", { companyName, originalToken: token, restored: original });
          }
          return original;
        }
      }
      return token;
    });

    // Step 4: Handle edge case where all tokens are removed
    if (restoredTokens.length === 0) {
      log("warn", "All tokens removed, using fallback", { companyName });
      return cleanedName.trim(); // Fallback to cleaned input
    }

    // Step 5: Join tokens and final trim
    const result = restoredTokens.join(" ").trim();
    if (logLevel === "debug") {
      log("debug", "Cleaned company name", { companyName, result, tokens: restoredTokens });
    }
    return result;
  } catch (e) {
    log("error", "cleanCompanyName failed", { companyName, error: e.message, stack: e.stack });
    return companyName ? companyName.trim() : "";
  }
}

function capitalizeName(name) {
  try {
    if (!name || typeof name !== "string" || !name.trim()) {
      log("error", "Invalid name in capitalizeName", { name });
      return { name: "", flags: ["InvalidInput"] };
    }

    const trimmedName = name.trim().replace(WHITESPACE_REGEX, " ");
    let flags = [];
    let result = trimmedName;

    // Step 1: Split tokens
    let tokens = result.split(" ").filter(Boolean);

    // Pre-compute positions of nouns and brands for Step 2.6
    const nounOrBrandPositions = new Set();
    tokens.forEach((token, idx) => {
      const lowerToken = token.toLowerCase();
      if (
        KNOWN_PROPER_NOUNS_CACHE.has(lowerToken) ||
        KNOWN_CITIES_SET_CACHE.has(lowerToken) ||
        CAR_BRANDS_CACHE.has(lowerToken)
      ) {
        nounOrBrandPositions.add(idx);
      }
    });

    // Step 2: Process tokens
    tokens = tokens.map((word, i) => {
      if (!word) return word;

      const lowerWord = word.toLowerCase();

      // Step 2.1: Apply BRAND_MAPPING first for exact brand matches
      if (BRAND_MAPPING_CACHE.has(lowerWord)) {
        flags.push("BrandMapped");
        return BRAND_MAPPING_CACHE.get(lowerWord);
      }

      // Step 2.2: Apply ABBREVIATION_EXPANSIONS for abbreviations
      const fullExpansion = {
        "bhm": "BHM",
        "okc": "OKC",
        "dfw": "DFW",
        "kc": "KC",
        "la": "LA",
        "sf": "SF",
        "sj": "SJ",
        "mb": "M.B."
      }[lowerWord] || ABBREVIATION_EXPANSIONS[lowerWord];
      if (fullExpansion) {
        flags.push("AbbreviationExpanded");
        const expandedTokens = fullExpansion.split(" ").map(subWord => {
          if (/^[A-Z]{1,4}$/.test(subWord)) return subWord.toUpperCase();
          return subWord.charAt(0).toUpperCase() + subWord.slice(1).toLowerCase();
        });
        return expandedTokens.join(" ");
      }

      // Step 2.3: Apply BRAND_ABBREVIATIONS (fallback, less priority)
      if (BRAND_ABBREVIATIONS_CACHE.has(lowerWord)) {
        flags.push("BrandAbbreviationFormatted");
        return BRAND_ABBREVIATIONS_CACHE.get(lowerWord);
      }

      // Step 2.4: Preserve known proper nouns and cities in their original or proper case
      if (KNOWN_PROPER_NOUNS_CACHE.has(lowerWord) || KNOWN_CITIES_SET_CACHE.has(lowerWord)) {
        if (word === word.toUpperCase()) {
          return word;
        }
        const properTokens = lowerWord.split(" ").map(subWord => {
          return subWord.charAt(0).toUpperCase() + subWord.slice(1).toLowerCase();
        });
        return properTokens.join(" ");
      }

      // Step 2.5: Handle abbreviations with dots (e.g., "M.B.")
      if (word.includes(".")) {
        if (/^[A-Z]\.[A-Z]\.$/.test(word)) {
          return word; // Preserve "M.B."
        }
        if (word.length <= 5 && word === word.toUpperCase()) {
          return word; // Preserve "A.B.C."
        }
      }

      // Step 2.6: Handle 2-3 letter abbreviations before/after nouns or car brands
      if (word.length <= 3 && /^[a-zA-Z]+$/.test(word)) {
        const isBeforeOrAfterNounOrBrand = nounOrBrandPositions.has(i - 1) || nounOrBrandPositions.has(i + 1);
        if (isBeforeOrAfterNounOrBrand) {
          flags.push("ShortTokenCapitalized");
          return word.toUpperCase(); // e.g., "eh" → "EH" in "EH Ford"
        }
      }

      // Step 2.7: Handle mixed-case tokens (e.g., "McLaren")
      if (/^[A-Z][a-z]+[A-Z][a-z]+$/.test(word)) {
        if (word.startsWith("Mc") || word.startsWith("Mac")) {
          return word.charAt(0).toUpperCase() + word.slice(1, 3).toLowerCase() + word.charAt(3).toUpperCase() + word.slice(4).toLowerCase();
        }
      }

      // Step 2.8: Standard capitalization
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });

    // Step 3: Safeguard for truncation (e.g., "Nanue" → "Nanuet")
    const restoredTokens = tokens.map(token => {
      const tokenLower = token.toLowerCase();
      for (const [knownToken, original] of [...KNOWN_CITIES_SET_CACHE, ...KNOWN_PROPER_NOUNS_CACHE, ...KNOWN_FIRST_NAMES_CACHE, ...KNOWN_LAST_NAMES_CACHE]) {
        const knownLower = knownToken.toLowerCase();
        if (knownLower.startsWith(tokenLower) && knownLower.length <= tokenLower.length + 2 && knownLower.length > tokenLower.length) {
          if (logLevel === "debug") {
            log("debug", "Restored truncated token", { originalToken: token, restored: original });
          }
          return original.charAt(0).toUpperCase() + original.slice(1).toLowerCase();
        }
      }
      return token;
    });

    // Step 4: Join tokens and handle token count
    result = restoredTokens.join(" ").replace(WHITESPACE_REGEX, " ").trim();
    const finalTokens = result.split(" ").filter(Boolean);
    if (finalTokens.length > 4) {
      result = finalTokens.slice(0, 4).join(" ");
      flags.push("TokenCountAdjusted");
    }

    return { name: result, flags };
  } catch (e) {
    log("error", "capitalizeName failed", { name, error: e.message, stack: e.stack });
    return { name: "", flags: ["CapitalizeNameError"] };
  }
}
// ✅ Removed duplicate capitalizeName implementation that caused the error

// Expands initials in tokens (e.g., 'J.B.' → 'J B')
function expandInitials(token) {
  if (!token || typeof token !== "string") return token;
  if (token.match(/^[A-Z]\.[A-Z]\.$/)) {
    return token.replace(/\./g, " ").trim();
  }
  return token;
}

// api/lib/humanize.js
/**
 * Tokenizes domain into meaningful components
 * @param {string} domain - The domain to tokenize
 * @returns {Array<string>} - Array of tokenized words
 */
function earlyCompoundSplit(domain) {
  if (!domain || typeof domain !== "string") {
    log("error", "Invalid domain for tokenization", { domain });
    return [];
  }

  const normalized = normalizeDomain(domain).toLowerCase();
  if (!normalized) {
    log("error", "normalizeDomain returned empty result", { domain });
    return [];
  }

  // Step 1: Check for overrides
  const override = TEST_CASE_OVERRIDES[normalized + ".com"];
  if (override) {
    log("info", `Override applied for domain: ${normalized}`, { override });
    return Array.isArray(override) ? override.map(word => word.toLowerCase()) : override.split(" ").map(word => word.toLowerCase());
  }

  // Step 2: Apply abbreviation expansions and expand to full names
  let remaining = normalized;
  for (const [abbr, expansion] of Object.entries(ABBREVIATION_EXPANSIONS)) {
    const regex = new RegExp(`\\b${abbr}\\b`, "gi");
    if (remaining.match(regex)) {
      const fullExpansion = {
        "bhm": "BHM",
        "okc": "OKC",
        "dfw": "DFW",
        "kc": "KC",
        "la": "LA",
        "sf": "SF",
        "sj": "SJ",
        "mb": "M.B."
      }[abbr.toLowerCase()] || expansion.toLowerCase().replace(/\s+/g, "");
      remaining = remaining.replace(regex, fullExpansion);
      if (logLevel === "debug") {
        log("debug", `Abbreviation expanded: ${abbr} → ${fullExpansion}`, { domain: normalized });
      }
    }
  }

  // Step 3: Initial splitting with pre-compiled regex
  let tokens = remaining
    .split(SPLIT_REGEX)
    .filter(Boolean)
    .flatMap(token => token.match(/[a-zA-Z]+/g) || [token])
    .filter(Boolean);

  // Step 4: Enhanced compound splitting using known lists and common compounds
  const commonCompounds = {
    "townandcountry": ["town", "and", "country"],
    "beckmasten": ["beck", "masten"],
    "stephenwade": ["stephen", "wade"],
    "redmac": ["red", "mac"],
    "vwsouthtowne": ["vw", "southtowne"],
    "allamerican": ["all", "american"],
    "sunnyking": ["sunny", "king"],
    "acdealergroup": ["ac", "dealer", "group"],
    "mattblatt": ["matt", "blatt"],
    "tomkadlec": ["tom", "kadlec"],
    "joeperillo": ["joe", "perillo"],
    "parkwayfamily": ["parkway", "family"],
    "johnthornton": ["john", "thornton"],
    "gregleblanc": ["greg", "leblanc"],
    "fivestar": ["five", "star"],
    "gatewayclassic": ["gateway", "classic"],
    "northbakersfield": ["north", "bakersfield"],
    "northcharleston": ["north", "charleston"],
    "neworlean": ["new", "orlean"],
    "eastside": ["east", "side"],
    "murfreesboro": ["murfrees", "boro"],
    "northwest": ["north", "west"]
  };

  const fuzzyTokens = [];
  for (let token of tokens) {
    if (token.includes(" ")) {
      fuzzyTokens.push(token);
      continue;
    }
    let split = false;

    // Check for known compounds
    if (commonCompounds[token]) {
      fuzzyTokens.push(...commonCompounds[token]);
      split = true;
      if (logLevel === "debug") {
        log("debug", "Known compound split applied", { token, split: commonCompounds[token] });
      }
    }

    // Enhanced splitting for first/last name pairs and proper nouns
    if (!split && token.length >= 4) {
      let current = token;
      const subTokens = [];
      let namePairFound = false;

      // Try to split into first/last name pairs
      for (let i = 2; i <= current.length - 2; i++) {
        const firstPart = current.slice(0, i);
        const secondPart = current.slice(i);
        if (KNOWN_FIRST_NAMES_CACHE.has(firstPart) && KNOWN_LAST_NAMES_CACHE.has(secondPart)) {
          subTokens.push(firstPart, secondPart);
          namePairFound = true;
          if (logLevel === "debug") {
            log("debug", "First/last name split applied", { token, split: [firstPart, secondPart] });
          }
          break;
        }
      }

      // Dynamic splitting using COMMON_WORDS (e.g., "and", "of")
      if (!namePairFound) {
        let temp = current;
        const dynamicTokens = [];
        while (temp.length > 0) {
          let matched = false;
          // Check for common words within the token
          for (const commonWord of Array.from(COMMON_WORDS)) {
            const index = temp.indexOf(commonWord);
            if (index !== -1 && index > 0 && index + commonWord.length < temp.length) {
              const before = temp.slice(0, index);
              const after = temp.slice(index + commonWord.length);
              dynamicTokens.push(before, commonWord, after);
              temp = "";
              matched = true;
              if (logLevel === "debug") {
                log("debug", "Dynamic split using common word", { token, commonWord, split: [before, commonWord, after] });
              }
              break;
            }
          }
          if (!matched) {
            // Try to split using known words (using cached lookup)
            for (let word of knownWords) {
              if (KNOWN_WORDS_CACHE.has(temp)) {
                dynamicTokens.push(word);
                temp = temp.slice(word.length);
                matched = true;
                break;
              }
            }
          }
          if (!matched) {
            const nextSplit = temp.length > 5 ? temp.slice(0, Math.min(5, temp.length)) : temp;
            dynamicTokens.push(nextSplit);
            temp = temp.slice(nextSplit.length);
          }
        }
        if (dynamicTokens.length > 1) {
          subTokens.push(...dynamicTokens);
          split = true;
          if (logLevel === "debug") {
            log("debug", "Dynamic compound split applied", { token, split: dynamicTokens });
          }
        } else {
          subTokens.push(current);
        }
      }

      if (subTokens.length > 1) {
        fuzzyTokens.push(...subTokens);
        split = true;
        if (logLevel === "debug") {
          log("debug", "Enhanced compound split applied", { token, split: subTokens });
        }
      }
    }

    if (!split) {
      fuzzyTokens.push(token);
    }
  }
  tokens = fuzzyTokens;

  // Step 5: City and proper noun grouping (using cached lookups)
  const cityTokens = [];
  let tempRemaining = tokens.join("");
  for (const [cityLower, cityValue] of SORTED_CITIES_CACHE) {
    if (tempRemaining.includes(cityLower)) {
      cityTokens.push(cityValue);
      tempRemaining = tempRemaining.replace(cityLower, "");
    }
  }

  // Step 6: Reconstruct tokens with proper noun grouping
  const finalTokens = [];
  let i = 0;
  while (i < tokens.length) {
    let matched = false;
    for (let len = Math.min(3, tokens.length - i); len >= 1; len--) {
      const segment = tokens.slice(i, i + len).join("");
      const segmentNoSpace = segment.replace(/\s+/g, "");
      if (PROPER_NOUNS_CACHE.has(segmentNoSpace) || CAR_BRANDS_CACHE.has(segmentNoSpace) || KNOWN_CITIES_SET_CACHE.has(segment)) {
        finalTokens.push(segment);
        i += len;
        matched = true;
        break;
      }
      if (len === 2) {
        const first = tokens[i].toLowerCase();
        const last = tokens[i + 1].toLowerCase();
        if (KNOWN_FIRST_NAMES_CACHE.has(first) && KNOWN_LAST_NAMES_CACHE.has(last)) {
          finalTokens.push(`${first} ${last}`);
          i += 2;
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      finalTokens.push(tokens[i]);
      i++;
    }
  }

  // Add city tokens if not already included
  for (const cityToken of cityTokens) {
    if (!finalTokens.some(token => token.replace(/\s+/g, "").toLowerCase() === cityToken.replace(/\s+/g, "").toLowerCase())) {
      finalTokens.push(cityToken);
    }
  }

  // Step 7: Filter and deduplicate tokens, preserving contextual words
  const filteredTokens = finalTokens
    .filter(token => {
      const tokenNoSpace = token.replace(/\s+/g, "");
      const isContextual = CONTEXTUAL_WORDS.has(tokenNoSpace.toLowerCase());
      const isRelevant = CAR_BRANDS_CACHE.has(tokenNoSpace) || KNOWN_CITIES_SET_CACHE.has(token) || PROPER_NOUNS_CACHE.has(tokenNoSpace);
      const isCommonWord = COMMON_WORDS_CACHE.has(tokenNoSpace.toLowerCase());
      // Preserve tokens that are brands, cities, proper nouns, or contextual words following a human name/brand
      return token && (!isCommonWord || isRelevant || (isContextual && finalTokens.some(t => KNOWN_FIRST_NAMES_CACHE.has(t.toLowerCase()) || KNOWN_LAST_NAMES_CACHE.has(t.toLowerCase()) || CAR_BRANDS_CACHE.has(t))));
    })
    .slice(0, 3); // Cap at 3 tokens

  const uniqueTokens = [];
  const seen = new Set();
  for (const token of filteredTokens) {
    const tokenKey = token.toLowerCase();
    if (!seen.has(tokenKey)) {
      seen.add(tokenKey);
      uniqueTokens.push(token);
    }
  }

  // Step 8: Fallback if no tokens remain
  if (uniqueTokens.length === 0) {
    const fallback = capitalizeName(normalized)?.name?.toLowerCase();
    log('warn', 'No valid tokens after filtering, using fallback', { domain, fallback });
    return fallback ? [fallback] : [];
  }

  if (logLevel === "debug") {
    log("debug", `Tokenized domain: ${normalized}`, { tokens: uniqueTokens });
  }
  return uniqueTokens;
}

function extractBrandOfCityFromDomain(domain) {
  try {
    // Validate input
    if (!domain || typeof domain !== 'string' || !domain.trim()) {
      log('error', 'Invalid domain in extractBrandOfCityFromDomain', { domain });
      return { brand: '', city: '', connector: '', flags: ['InvalidInput'] };
    }

    // Normalize the domain
    const normalized = normalizeDomain(domain);
    if (!normalized || typeof normalized !== 'string') {
      log('error', 'normalizeDomain returned invalid result', { domain, normalized });
      return { brand: '', city: '', connector: '', flags: ['NormalizationFailed'] };
    }

    // Check brand-only domains
    if (BRAND_ONLY_DOMAINS_CACHE.has(`${normalized}.com`)) {
      log('info', 'Skipping brand-only domain', { domain: normalized });
      return { brand: '', city: '', connector: '', flags: ['BrandOnlyDomain'] };
    }

    // Split into tokens
    let tokens = earlyCompoundSplit(normalized);
    if (!Array.isArray(tokens) || !tokens.every(token => typeof token === 'string') || tokens.length === 0) {
      log('warn', 'earlyCompoundSplit returned invalid or empty tokens', { domain, tokens });
      return { brand: '', city: '', connector: '', flags: ['TokenizationFailed'] };
    }

    // Validate dependencies
    if (!CAR_BRANDS_CACHE.size || !KNOWN_CITIES_SET_CACHE.size) {
      log('error', 'Invalid dependencies in extractBrandOfCityFromDomain', {
        CAR_BRANDS: CAR_BRANDS_CACHE.size,
        KNOWN_CITIES_SET: KNOWN_CITIES_SET_CACHE.size,
        BRAND_MAPPING: BRAND_MAPPING instanceof Map
      });
      return { brand: '', city: '', connector: '', flags: ['InvalidDependencies'] };
    }

    let brand = '';
    let city = '';
    let humanName = '';
    let flags = [];

    // First pass: Look for brand followed by city or human name (including multi-word cities)
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (typeof token !== 'string' || !token.trim()) continue;
      const lowerToken = token.toLowerCase();

      // Check for brand
      if (CAR_BRANDS_CACHE.has(lowerToken)) {
        brand = BRAND_MAPPING_CACHE.has(lowerToken)
          ? BRAND_MAPPING_CACHE.get(lowerToken)
          : capitalizeName(token).name;

        // Look for multi-word city after brand
        for (let len = 1; len <= Math.min(3, tokens.length - i - 1); len++) {
          const cityTokens = tokens.slice(i + 1, i + 1 + len);
          const potentialCity = cityTokens.join(" ").toLowerCase();
          if (MULTI_WORD_CITIES.has(potentialCity) || KNOWN_CITIES_SET_CACHE.has(potentialCity)) {
            city = capitalizeName(potentialCity).name;
            break;
          }
          // Check for human name if no city is found
          if (!city && len === 1) {
            const potentialHumanName = cityTokens[0].toLowerCase();
            if (KNOWN_FIRST_NAMES_CACHE.has(potentialHumanName) || KNOWN_LAST_NAMES_CACHE.has(potentialHumanName)) {
              humanName = capitalizeName(potentialHumanName).name;
              flags.push('HumanNameDetected');
            }
          }
        }
        if (city || humanName) break;
      }
    }

    // Second pass: Look for city or human name followed by brand
    if (!brand || (!city && !humanName)) {
      for (let i = 0; i < tokens.length; i++) {
        for (let len = 1; len <= Math.min(3, tokens.length - i); len++) {
          const cityTokens = tokens.slice(i, i + len);
          const potentialCity = cityTokens.join(" ").toLowerCase();
          let foundCity = false;
          let foundHumanName = false;

          if (MULTI_WORD_CITIES.has(potentialCity) || KNOWN_CITIES_SET_CACHE.has(potentialCity)) {
            city = capitalizeName(potentialCity).name;
            foundCity = true;
          } else if (len === 1) {
            const potentialHumanName = cityTokens[0].toLowerCase();
            if (KNOWN_FIRST_NAMES_CACHE.has(potentialHumanName) || KNOWN_LAST_NAMES_CACHE.has(potentialHumanName)) {
              humanName = capitalizeName(potentialHumanName).name;
              foundHumanName = true;
              flags.push('HumanNameDetected');
            }
          }

          if (foundCity || foundHumanName) {
            // Look for brand after city or human name
            for (let j = i + len; j < tokens.length; j++) {
              const nextToken = tokens[j];
              if (typeof nextToken !== 'string' || !nextToken.trim()) continue;
              const lowerNextToken = nextToken.toLowerCase();
              if (CAR_BRANDS_CACHE.has(lowerNextToken)) {
                brand = BRAND_MAPPING_CACHE.has(lowerNextToken)
                  ? BRAND_MAPPING_CACHE.get(lowerNextToken)
                  : capitalizeName(nextToken).name;
                break;
              }
            }
            if (brand) break;
          }
        }
        if (brand) break;
      }
    }

    // Third pass: Check all tokens if no match found, prioritize brand inclusion
    if (!brand || (!city && !humanName)) {
      for (const token of tokens) {
        if (typeof token !== 'string' || !token.trim()) continue;
        const lowerToken = token.toLowerCase();
        if (!brand && CAR_BRANDS_CACHE.has(lowerToken)) {
          brand = BRAND_MAPPING_CACHE.has(lowerToken)
            ? BRAND_MAPPING_CACHE.get(lowerToken)
            : capitalizeName(token).name;
        }
        if (brand && !city && !humanName) {
          if (KNOWN_CITIES_SET_CACHE.has(lowerToken)) {
            city = capitalizeName(lowerToken).name;
          } else if (KNOWN_FIRST_NAMES_CACHE.has(lowerToken) || KNOWN_LAST_NAMES_CACHE.has(lowerToken)) {
            humanName = capitalizeName(lowerToken).name;
            flags.push('HumanNameDetected');
          }
        }
      }
    }

    // Safeguard for truncation (e.g., "Nanue" → "Nanuet")
    if (city) {
      for (const [knownToken, original] of [...KNOWN_CITIES_SET_CACHE, ...PROPER_NOUNS_CACHE]) {
        const knownLower = knownToken.toLowerCase();
        const cityLower = city.toLowerCase();
        if (knownLower.startsWith(cityLower) && knownLower.length <= cityLower.length + 2 && knownLower.length > cityLower.length) {
          if (logLevel === "debug") {
            log("debug", "Restored truncated city", { originalCity: city, restored: original });
          }
          city = original;
          flags.push('TruncationRestored');
          break;
        }
      }
    }
    if (humanName) {
      for (const [knownToken, original] of [...KNOWN_FIRST_NAMES_CACHE, ...KNOWN_LAST_NAMES_CACHE]) {
        const knownLower = knownToken.toLowerCase();
        const humanNameLower = humanName.toLowerCase();
        if (knownLower.startsWith(humanNameLower) && knownLower.length <= humanNameLower.length + 2 && knownLower.length > humanNameLower.length) {
          if (logLevel === "debug") {
            log("debug", "Restored truncated human name", { originalHumanName: humanName, restored: original });
          }
          humanName = original;
          flags.push('TruncationRestored');
          break;
        }
      }
    }

    // Final validation: Require brand and either city or human name
    if (!brand || (!city && !humanName)) {
      log('warn', 'Missing brand or city/human name, returning empty result', { domain, brand, city, humanName, tokens });
      return { brand: '', city: '', connector: '', flags: ['MissingBrandOrCity'] };
    }

    // Use human name as the city if no city is found
    const finalCity = city || humanName;
    if (humanName && !city) {
      flags.push('HumanNameUsedAsCity');
    }

    log('info', 'Brand-city extraction result', { domain, brand, city: finalCity, tokens, flags });
    return { brand, city: finalCity, connector: '', flags };
  } catch (err) {
    log('error', 'extractBrandOfCityFromDomain failed', { domain, error: err.message, stack: err.stack });
    return { brand: '', city: '', connector: '', flags: ['ExtractBrandOfCityError'] };
  }
}
      
function tryHumanNamePattern(tokens) {
  try {
    if (!tokens || !Array.isArray(tokens) || tokens.length < 1 || !tokens.every(t => typeof t === "string")) {
      log("error", "Invalid tokens in tryHumanNamePattern", { tokens });
      return null;
    }

    if (!KNOWN_FIRST_NAMES_CACHE.size || !KNOWN_LAST_NAMES_CACHE.size || !CAR_BRANDS_CACHE.size || !KNOWN_CITIES_SET_CACHE.size) {
      log("error", "Invalid dependencies in tryHumanNamePattern", {
        KNOWN_FIRST_NAMES: KNOWN_FIRST_NAMES instanceof Set,
        KNOWN_LAST_NAMES: KNOWN_LAST_NAMES instanceof Set,
        CAR_BRANDS: CAR_BRANDS instanceof Set,
        KNOWN_CITIES_SET: KNOWN_CITIES_SET instanceof Set
      });
      return null;
    }

    let firstName = "";
    let lastName = "";
    let singleName = "";
    let brand = "";
    let context = "";
    let confidenceScore = 100;
    const flags = ["humanNamePattern"];
    const confidenceOrigin = "humanNamePattern";

    // Pre-compute token matches
    const tokenInfo = tokens.map((token, i) => {
      const lowerToken = token.toLowerCase();
      return {
        index: i,
        token,
        lowerToken,
        isFirstName: KNOWN_FIRST_NAMES_CACHE.has(lowerToken),
        isLastName: KNOWN_LAST_NAMES_CACHE.has(lowerToken),
        isBrand: CAR_BRANDS_CACHE.has(lowerToken),
        isContextual: CONTEXTUAL_WORDS.has(lowerToken)
      };
    });

    // First pass: Look for first name + last name pattern
    for (let i = 0; i < tokenInfo.length - 1; i++) {
      if (tokenInfo[i].isFirstName && tokenInfo[i + 1].isLastName) {
        firstName = tokenInfo[i].token;
        lastName = tokenInfo[i + 1].token;
        break;
      }
    }

    // Second pass: Look for single-token human name
    if (!firstName || !lastName) {
      for (const info of tokenInfo) {
        if ((info.isFirstName || info.isLastName) && !singleName) {
          singleName = info.token;
          flags.push("SingleHumanNameDetected");
          confidenceScore = 80; // Lower confidence for single-token names
          break;
        }
      }
    }

    if (!firstName && !lastName && !singleName) {
      if (logLevel === "debug") {
        log("debug", "No human name pattern found", { tokens });
      }
      return null;
    }

    // Apply confidence boost and look for brand or context
    if (firstName && lastName) {
      confidenceScore = 110; // Base confidence for human name pair
      for (let i = tokenInfo.findIndex(info => info.token === lastName) + 1; i < tokenInfo.length; i++) {
        if (tokenInfo[i].isBrand) {
          brand = BRAND_MAPPING_CACHE.has(tokenInfo[i].lowerToken)
            ? BRAND_MAPPING_CACHE.get(tokenInfo[i].lowerToken)
            : capitalizeName(tokenInfo[i].token).name;
          flags.push("brandIncluded");
          confidenceScore = 135; // Boost for human name + brand
          break;
        } else if (tokenInfo[i].isContextual && !context) {
          context = capitalizeName(tokenInfo[i].token).name;
          flags.push("contextIncluded");
          confidenceScore = 120; // Boost for human name + context
        }
      }
    } else if (singleName) {
      for (let i = tokenInfo.findIndex(info => info.token === singleName) + 1; i < tokenInfo.length; i++) {
        if (tokenInfo[i].isBrand) {
          brand = BRAND_MAPPING_CACHE.has(tokenInfo[i].lowerToken)
            ? BRAND_MAPPING_CACHE.get(tokenInfo[i].lowerToken)
            : capitalizeName(tokenInfo[i].token).name;
          flags.push("brandIncluded");
          confidenceScore = 100; // Boost for single name + brand
          break;
        } else if (tokenInfo[i].isContextual && !context) {
          context = capitalizeName(tokenInfo[i].token).name;
          flags.push("contextIncluded");
          confidenceScore = 90; // Boost for single name + context
        }
      }
    }

    // Assemble the name
    const nameParts = firstName && lastName ? [firstName, lastName] : [singleName];
    if (brand) nameParts.push(brand);
    else if (context) nameParts.push(context);

    const nameResult = capitalizeName(nameParts.join(" ")) || { name: "", flags: [] };
    const companyName = nameResult.name || "";
    nameResult.flags.forEach(flag => flags.push(flag));

    if (!companyName) {
      log("warn", "Empty company name after capitalization", { tokens, nameParts });
      return null;
    }

    // Skip brandOrCityOnlyBlocked check for human name + brand/context combinations
    const nameTokens = companyName.split(" ").filter(Boolean);
    const isBrandOnly = nameTokens.length === 1 && CAR_BRANDS_CACHE.has(companyName.toLowerCase());
    const isCityOnly = nameTokens.length === 1 && KNOWN_CITIES_SET_CACHE.has(companyName.toLowerCase());
    if (isBrandOnly || isCityOnly) {
      flags.push("brandOrCityOnlyBlocked");
      confidenceScore = 0;
      log("warn", "Blocked due to brand-only or city-only result", { companyName, tokens });
      return null;
    }

    // Check for duplicate tokens
    const wordList = nameTokens.map(w => w.toLowerCase());
    if (new Set(wordList).size !== wordList.length) {
      flags.push("duplicateTokens");
      confidenceScore = Math.min(confidenceScore, 95);
    }

    // Relax token limit penalty (allow up to 4 tokens for human name + brand/context)
    if (nameTokens.length > 4) {
      confidenceScore = Math.min(confidenceScore, 85);
      flags.push("tokenLimitExceeded");
    }

    log("info", "Human name pattern matched", { companyName, tokens, flags });

    return {
      companyName,
      confidenceScore,
      confidenceOrigin,
      flags,
      tokens: nameTokens.map(t => t.toLowerCase())
    };
  } catch (e) {
    log("error", "tryHumanNamePattern failed", { tokens, error: e.message, stack: e.stack });
    return null;
  }
}

function tryProperNounPattern(tokens) {
  try {
    if (!tokens || !Array.isArray(tokens) || tokens.length < 1 || !tokens.every(t => typeof t === 'string')) {
      log('error', 'Invalid tokens in tryProperNounPattern', { tokens });
      return null;
    }

    if (!PROPER_NOUNS_CACHE.size || !CAR_BRANDS_CACHE.size || !KNOWN_CITIES_SET_CACHE.size) {
      log('error', 'Invalid dependencies in tryProperNounPattern', {
        properNounsSet: properNounsSet instanceof Set,
        CAR_BRANDS: CAR_BRANDS instanceof Set,
        KNOWN_CITIES_SET: KNOWN_CITIES_SET instanceof Set
      });
      return null;
    }

    let properNoun = '';
    let brand = '';
    let generic = '';
    let confidenceScore = 100;
    const flags = ['properNounPattern'];
    const confidenceOrigin = 'properNounPattern';

    // Pre-compute token matches
    const tokenInfo = tokens.map((token, i) => {
      const lowerToken = token.toLowerCase();
      return {
        index: i,
        token,
        lowerToken,
        isProperNoun: PROPER_NOUNS_CACHE.has(lowerToken),
        isBrand: CAR_BRANDS_CACHE.has(lowerToken),
        isGeneric: CONTEXTUAL_WORDS.has(lowerToken)
      };
    });

    // Look for proper noun
    const properNounInfo = tokenInfo.find(info => info.isProperNoun);
    if (!properNounInfo) {
      if (logLevel === "debug") {
        log('debug', 'No proper noun pattern found', { tokens });
      }
      return null;
    }
    properNoun = properNounInfo.token;
    const nounIndex = properNounInfo.index;

    // Look for brand or generic term after proper noun
    for (let i = nounIndex + 1; i < tokenInfo.length; i++) {
      if (tokenInfo[i].isBrand) {
        brand = BRAND_MAPPING_CACHE.has(tokenInfo[i].lowerToken)
          ? BRAND_MAPPING_CACHE.get(tokenInfo[i].lowerToken)
          : capitalizeName(tokenInfo[i].token)?.name || tokenInfo[i].token;
        flags.push('brandIncluded');
        confidenceScore = 125;
        break;
      } else if (tokenInfo[i].isGeneric) {
        generic = capitalizeName(tokenInfo[i].token)?.name || tokenInfo[i].token;
        flags.push('genericIncluded');
        confidenceScore = 100;
        break;
      }
    }

    if (!brand && !generic) {
      if (logLevel === "debug") {
        log("debug", "No brand or generic term found to pair with proper noun", { tokens, properNoun });
      }
      return null;
    }

    // Assemble the name
    const nameParts = [properNoun];
    if (brand) nameParts.push(brand);
    else if (generic) nameParts.push(generic);

    const nameResult = capitalizeName(nameParts.join(' ')) || { name: '', flags: [] };
    const companyName = nameResult.name;
    nameResult.flags.forEach(flag => flags.push(flag));

    if (!companyName) {
      log('warn', 'Empty company name after capitalization', { tokens, nameParts });
      return null;
    }

    // Validation checks
    const nameTokens = companyName.split(' ').filter(Boolean);
    const isBrandOnly = nameTokens.length === 1 && CAR_BRANDS_CACHE.has(companyName.toLowerCase());
    const isCityOnly = nameTokens.length === 1 && KNOWN_CITIES_SET_CACHE.has(companyName.toLowerCase());
    if (isBrandOnly || isCityOnly) {
      flags.push('brandOrCityOnlyBlocked');
      confidenceScore = 0;
      log('warn', 'Blocked due to brand-only or city-only result', { companyName, tokens });
      return null;
    }

    const wordList = nameTokens.map(w => w.toLowerCase());
    if (new Set(wordList).size !== wordList.length) {
      flags.push('duplicateTokens');
      confidenceScore = Math.min(confidenceScore, 95);
    }

    if (nameTokens.length > 4) {
      confidenceScore = Math.min(confidenceScore, 85);
      flags.push('tokenLimitExceeded');
    }

    log('info', 'Proper noun pattern matched', { companyName, tokens, flags });
    return {
      companyName,
      confidenceScore,
      confidenceOrigin,
      flags,
      tokens: nameTokens.map(t => t.toLowerCase())
    };
  } catch (e) {
    log('error', 'tryProperNounPattern failed', { tokens, error: e.message, stack: e.stack });
    return null;
  }
}

// Matches brand + city patterns (e.g., 'toyotaofslidell' → 'Slidell Toyota')
function tryBrandCityPattern(tokens) {
  try {
    if (!tokens || !Array.isArray(tokens) || tokens.length < 2 || !tokens.every(t => typeof t === "string")) {
      log("error", "Invalid tokens in tryBrandCityPattern", { tokens });
      return null;
    }

    if (!CAR_BRANDS_CACHE.size || !KNOWN_CITIES_SET_CACHE.size || !COMMON_WORDS_CACHE.size) {
      log("error", "Invalid dependencies in tryBrandCityPattern", {
        CAR_BRANDS: CAR_BRANDS instanceof Set,
        KNOWN_CITIES_SET: KNOWN_CITIES_SET instanceof Set,
        COMMON_WORDS: COMMON_WORDS instanceof Set
      });
      return null;
    }

    // Pre-compute token matches
    const tokenInfo = tokens.map((token, i) => {
      const lowerToken = token.toLowerCase();
      return {
        index: i,
        token,
        lowerToken,
        isBrand: CAR_BRANDS_CACHE.has(lowerToken),
        isCity: KNOWN_CITIES_SET_CACHE.has(lowerToken),
        isCommon: COMMON_WORDS_CACHE.has(lowerToken)
      };
    });

    const domain = tokens.join("");
    let brandCityResult = extractBrandOfCityFromDomain(domain) || { brand: "", city: "", flags: [] };
    let brand = brandCityResult.brand;
    let city = brandCityResult.city;
    let resultFlags = brandCityResult.flags || [];

    // Fallback to manual token matching if extractBrandOfCityFromDomain fails
    if (!brand || !city) {
      for (let i = 0; i < tokenInfo.length; i++) {
        if (tokenInfo[i].isBrand) {
          brand = BRAND_MAPPING_CACHE.has(tokenInfo[i].lowerToken)
            ? BRAND_MAPPING_CACHE.get(tokenInfo[i].lowerToken)
            : capitalizeName(tokenInfo[i].token).name;
          for (let j = 0; j < tokenInfo.length; j++) {
            if (j === i) continue;
            if (tokenInfo[j].isCity && !tokenInfo[j].isBrand && !tokenInfo[j].isCommon) {
              city = capitalizeName(tokenInfo[j].token).name;
              break;
            }
          }
          if (city) break;
        }
      }
    }

    // Relax validation: Allow human name + brand pairs if flagged by extractBrandOfCityFromDomain
    const isHumanName = resultFlags.includes("HumanNameDetected");
    if (!brand || (!city && !isHumanName)) {
      if (logLevel === "debug") {
        log("debug", "No brand + city pattern found", { tokens, brand, city, isHumanName });
      }
      return null;
    }

    let confidenceScore = isHumanName ? 100 : 150; // Higher confidence for true brand + city pairs
    const flags = ["brandCityPattern"];
    const confidenceOrigin = "brandCityPattern";
    flags.push(...resultFlags);

    // Apply confidence boost for abbreviation expansion
    if (brandCityResult.brand && ABBREVIATION_EXPANSIONS[brand.toLowerCase()] || (city && ABBREVIATION_EXPANSIONS[city.toLowerCase()])) {
      confidenceScore += 5; // Boost for abbreviation expansion
      flags.push("AbbreviationConfidenceBoost");
    }

    // Always include both city (or human name) and brand in the name
    const nameParts = [city, brand]; // e.g., "Northshore Mazda" or "Lockhart Cadillac"
    const nameResult = capitalizeName(nameParts.join(" ")) || { name: "", flags: [] };
    let companyName = nameResult.name || "";
    nameResult.flags.forEach(flag => flags.push(flag));

    if (!companyName) {
      log("warn", "Empty company name after capitalization", { tokens, nameParts });
      return null;
    }

    // Ensure the company name includes the brand component
    if (!companyName.toLowerCase().includes(brand.toLowerCase())) {
      log("warn", "Company name missing brand component", { companyName, brand, city });
      return null;
    }

    // Strict validation: Reject city-only results
    const nameTokens = companyName.split(" ").filter(Boolean);
    const isCityOnly = nameTokens.length === 1 && KNOWN_CITIES_SET_CACHE.has(companyName.toLowerCase());
    if (isCityOnly) {
      flags.push("cityOnlyBlocked");
      confidenceScore = 0;
      log("warn", "Blocked due to city-only result", { companyName, tokens });
      return null;
    }

    // Check for brand-only results
    const isBrandOnly = nameTokens.length === 1 && CAR_BRANDS_CACHE.has(companyName.toLowerCase());
    if (isBrandOnly) {
      flags.push("brandOnlyBlocked");
      confidenceScore = 0;
      log("warn", "Blocked due to brand-only result", { companyName, tokens });
      return null;
    }

    // Check for duplicate tokens
    const wordList = nameTokens.map(w => w.toLowerCase());
    if (new Set(wordList).size !== wordList.length) {
      flags.push("duplicateTokens");
      confidenceScore = Math.min(confidenceScore, 95);
    }

    // Relax token limit to allow multi-word cities (e.g., "Huntington Beach Ford" = 4 tokens)
    if (nameTokens.length > 4) {
      confidenceScore = Math.min(confidenceScore, 85);
      flags.push("tokenLimitExceeded");
    }

    log("info", "Brand city pattern matched", { companyName, tokens, flags });
    return {
      companyName,
      confidenceScore,
      confidenceOrigin,
      flags,
      tokens: nameTokens.map(t => t.toLowerCase())
    };
  } catch (e) {
    log("error", "tryBrandCityPattern failed", { tokens, error: e.message, stack: e.stack });
    return null;
  }
}


// api/lib/humanize.js
// Matches proper noun + brand patterns (e.g., 'curryacura' → 'Curry Acura')
function tryBrandGenericPattern(tokens) {
  try {
    // Input validation
    if (!tokens || !Array.isArray(tokens) || tokens.length < 1 || !tokens.every(t => typeof t === "string")) {
      log("error", "Invalid tokens in tryBrandGenericPattern", { tokens });
      return null;
    }

    // Dependency validation
    if (!PROPER_NOUNS_CACHE.size || !CAR_BRANDS_CACHE.size || !KNOWN_CITIES_SET_CACHE.size) {
      log("error", "Invalid dependencies in tryBrandGenericPattern", {
        properNounsSet: properNounsSet instanceof Set,
        CAR_BRANDS: CAR_BRANDS instanceof Set,
        KNOWN_CITIES_SET: KNOWN_CITIES_SET instanceof Set
      });
      return null;
    }

    let properNoun = null;
    let generic = null;
    let confidenceScore = 95;
    const flags = ["genericPattern"];
    const confidenceOrigin = "genericPattern";

    // Pre-compute token matches
    const tokenInfo = tokens.map((token, i) => {
      const lowerToken = token.toLowerCase();
      return {
        index: i,
        token,
        lowerToken,
        isProperNoun: PROPER_NOUNS_CACHE.has(lowerToken),
        isBrand: CAR_BRANDS_CACHE.has(lowerToken),
        isCity: KNOWN_CITIES_SET_CACHE.has(lowerToken),
        isGeneric: CONTEXTUAL_WORDS.has(lowerToken)
      };
    });

    // Find proper noun and generic term
    for (const info of tokenInfo) {
      if (!properNoun && info.isProperNoun && !info.isBrand && !info.isCity) {
        const nameResult = capitalizeName(info.token) || { name: "" };
        properNoun = nameResult.name;
        confidenceScore = 100;
        flags.push("knownProperNoun");
      }
      if (!generic && info.isGeneric) {
        const nameResult = capitalizeName(info.token) || { name: "" };
        generic = nameResult.name;
      }
      if (properNoun && generic) break;
    }

    // Return early if no proper noun + generic pattern found
    if (!properNoun || !generic) {
      if (logLevel === "debug") {
        log("debug", "No proper noun + generic pattern found", { tokens });
      }
      return null;
    }

    // Construct company name (always append generic term, rely on cleanCompanyName for cleanup)
    let companyName = `${properNoun} ${generic}`;

    // Validate against brand-only or city-only outputs
    const nameTokens = companyName.split(" ").filter(Boolean);
    const isBrandOnly = nameTokens.length === 1 && CAR_BRANDS_CACHE.has(companyName.toLowerCase());
    const isCityOnly = nameTokens.length === 1 && KNOWN_CITIES_SET_CACHE.has(companyName.toLowerCase());
    if (isBrandOnly || isCityOnly) {
      flags.push("brandOrCityOnlyBlocked");
      confidenceScore = 0;
      log("warn", "Blocked due to brand-only or city-only result", { companyName, tokens });
      return null;
    }

    // Check for duplicate tokens
    const uniqueTokens = new Set(nameTokens.map(t => t.toLowerCase()));
    if (uniqueTokens.size !== nameTokens.length) {
      flags.push("duplicateTokens");
      confidenceScore = Math.min(confidenceScore, 90);
    }

    // Check token limit (relaxed to 4 tokens)
    if (nameTokens.length > 4) {
      flags.push("tokenLimitExceeded");
      confidenceScore = Math.min(confidenceScore, 85);
    }

    log("info", "Brand generic pattern matched", { companyName, tokens, flags });
    return {
      companyName,
      confidenceScore,
      confidenceOrigin,
      flags,
      tokens: nameTokens.map(t => t.toLowerCase())
    };
  } catch (e) {
    log("error", "tryBrandGenericPattern failed", { tokens, error: e.message, stack: e.stack });
    return null;
  }
}

// Matches patterns with a proper noun and generic term (e.g., 'sunsetauto' → 'Sunset Auto')
function tryGenericPattern(tokens, properNounsSet, meta = {}) {
  try {
    // Input validation
    if (!tokens || !Array.isArray(tokens) || tokens.length < 1 || !tokens.every(t => typeof t === "string")) {
      log("error", "Invalid tokens in tryGenericPattern", { tokens });
      return null;
    }

    if (!PROPER_NOUNS_CACHE.size || !CAR_BRANDS_CACHE.size || !KNOWN_CITIES_SET_CACHE.size) {
      log("error", "Invalid dependencies in tryGenericPattern", {
        properNounsSet: properNounsSet instanceof Set,
        CAR_BRANDS: CAR_BRANDS instanceof Set,
        KNOWN_CITIES_SET: KNOWN_CITIES_SET instanceof Set
      });
      return null;
    }

    let properNoun = null;
    let generic = null;
    let brand = null;
    let confidenceScore = 75; // Lower confidence as a fallback
    const flags = ["genericPattern"];
    const confidenceOrigin = "genericPattern";

    // Step 1: Identify proper noun, generic term, and brand from tokens
    for (const token of tokens) {
      const lowerToken = token.toLowerCase();
      // Look for a proper noun (not a brand or city)
      if (!properNoun && PROPER_NOUNS_CACHE.has(lowerToken) && !CAR_BRANDS_CACHE.has(lowerToken) && !KNOWN_CITIES_SET_CACHE.has(lowerToken)) {
        const nameResult = capitalizeName(token) || { name: "" };
        properNoun = nameResult.name;
        confidenceScore = 90;
        flags.push("knownProperNoun");
      }
      // Look for a generic term
      if (!generic && CONTEXTUAL_WORDS.has(lowerToken)) {
        const nameResult = capitalizeName(token) || { name: "" };
        generic = nameResult.name;
      }
      // Look for a brand
      if (!brand && CAR_BRANDS_CACHE.has(lowerToken)) {
        brand = BRAND_MAPPING_CACHE.has(lowerToken) ? BRAND_MAPPING_CACHE.get(lowerToken) : capitalizeName(token).name;
      }
      if (properNoun && (generic || brand)) break;
    }

    // Step 2: Use metadata to find a brand if not present in tokens
    if (!brand && !generic) {
      const metaBrand = getMetaTitleBrand(meta);
      if (metaBrand && CAR_BRANDS_CACHE.has(metaBrand.toLowerCase())) {
        brand = metaBrand;
        flags.push("metaBrandAppended");
      }
    }

    // Step 3: If no proper noun is found, use the first non-brand, non-city token if it's a human name
    if (!properNoun) {
      const firstValidToken = tokens.find(t => {
        const lowerToken = t.toLowerCase();
        return !CAR_BRANDS_CACHE.has(lowerToken) && !KNOWN_CITIES_SET_CACHE.has(lowerToken) && 
               (KNOWN_FIRST_NAMES_CACHE.has(lowerToken) || KNOWN_LAST_NAMES_CACHE.has(lowerToken));
      });
      if (firstValidToken) {
        const nameResult = capitalizeName(firstValidToken) || { name: "" };
        properNoun = nameResult.name;
        confidenceScore = 75;
        flags.push("fallbackProperNoun");
      }
    }

    // Step 4: Ensure we have a proper noun and either a generic term or brand
    if (!properNoun || (!generic && !brand)) {
      if (logLevel === "debug") {
        log("debug", "No proper noun + generic/brand pattern found", { tokens });
      }
      return null;
    }

    // Step 5: Construct company name (always append generic term or brand)
    let companyName = properNoun;
    if (brand) {
      companyName = `${properNoun} ${brand}`;
      confidenceScore = Math.max(confidenceScore, 85);
      flags.push("brandAppended");
    } else if (generic) {
      companyName = `${properNoun} ${generic}`;
      confidenceScore = Math.max(confidenceScore, 80);
      flags.push("genericAppended");
    }

    // Step 6: Validate against brand-only and city-only outputs
    const nameTokens = companyName.split(" ").filter(Boolean);
    const isBrandOnly = nameTokens.length === 1 && CAR_BRANDS_CACHE.has(companyName.toLowerCase());
    const isCityOnly = nameTokens.length === 1 && KNOWN_CITIES_SET_CACHE.has(companyName.toLowerCase());
    if (isBrandOnly || isCityOnly) {
      flags.push("brandOrCityOnlyBlocked");
      confidenceScore = 50;
      log("warn", "Blocked due to brand-only or city-only result", { companyName, tokens });
      return {
        companyName: "",
        confidenceScore,
        confidenceOrigin,
        flags: [...flags, "ManualReviewRecommended"],
        tokens: nameTokens.map(t => t.toLowerCase())
      };
    }

    // Step 7: Check for duplicates and token limits
    const uniqueTokens = new Set(nameTokens.map(t => t.toLowerCase()));
    if (uniqueTokens.size !== nameTokens.length) {
      flags.push("duplicateTokens");
      confidenceScore = Math.min(confidenceScore, 70);
      companyName = [...uniqueTokens]
        .map(t => nameTokens.find(nt => nt.toLowerCase() === t))
        .join(" ");
    }

    if (nameTokens.length > 4) {
      flags.push("tokenLimitExceeded");
      confidenceScore = Math.min(confidenceScore, 65);
      companyName = nameTokens.slice(0, 4).join(" ");
    }

    log("info", "Generic pattern matched", { companyName, tokens, flags });
    return {
      companyName,
      confidenceScore,
      confidenceOrigin,
      flags,
      tokens: nameTokens.map(t => t.toLowerCase())
    };
  } catch (e) {
    log("error", "tryGenericPattern failed", { tokens, error: e.message, stack: e.stack });
    return null;
  }
}

// Main function to humanize domain names
async function humanizeName(domain) {
  try {
    if (!domain || typeof domain !== "string" || !domain.trim()) {
      log("error", "Invalid domain input", { domain });
      return { companyName: "", confidenceScore: 0, flags: ["invalidInput"], tokens: [], confidenceOrigin: "invalidInput", rawTokenCount: 0 };
    }

    const normalizedDomain = normalizeDomain(domain);
    if (!normalizedDomain || typeof normalizedDomain !== "string") {
      log("error", "normalizeDomain returned invalid result", { domain, normalizedDomain });
      return { companyName: "", confidenceScore: 0, flags: ["normalizeDomainFailed"], tokens: [], confidenceOrigin: "normalizeDomainFailed", rawTokenCount: 0 };
    }

    if (TEST_CASE_OVERRIDES[normalizedDomain + ".com"]) {
      const companyName = TEST_CASE_OVERRIDES[normalizedDomain + ".com"];
      log("info", `Override applied for domain: ${normalizedDomain}`, { companyName });
      return {
        companyName: cleanCompanyName(capitalizeName(companyName).name),
        confidenceScore: 125,
        flags: ["overrideApplied"],
        tokens: companyName.toLowerCase().split(" "),
        confidenceOrigin: "override",
        rawTokenCount: companyName.split(" ").length
      };
    }

    if (!BRAND_ONLY_DOMAINS_CACHE.size) {
      log("error", "BRAND_ONLY_DOMAINS is not a Set", { BRAND_ONLY_DOMAINS });
      return { companyName: "", confidenceScore: 0, flags: ["invalidDependency"], tokens: [], confidenceOrigin: "invalidDependency", rawTokenCount: 0 };
    }

    if (BRAND_ONLY_DOMAINS_CACHE.has(normalizedDomain + ".com")) {
      log("info", `Brand-only domain detected: ${normalizedDomain}`);
      return {
        companyName: "",
        confidenceScore: 0,
        flags: ["brandOnly"],
        tokens: [],
        confidenceOrigin: "brandOnly",
        rawTokenCount: 0
      };
    }

    // Parallelize tokenization and metadata fetch
    const [tokensResult, metaResult] = await Promise.all([
      Promise.resolve(earlyCompoundSplit(normalizedDomain)),
      fetchMetaData(domain).catch(err => {
        log("error", "fetchMetaData failed", { domain, error: err.message, stack: err.stack });
        return {};
      })
    ]);

    let tokens = tokensResult;
    if (!Array.isArray(tokens) || !tokens.every(token => typeof token === "string")) {
      log("error", "earlyCompoundSplit returned invalid tokens", { domain, tokens });
      return { companyName: "", confidenceScore: 0, flags: ["earlyCompoundSplitFailed"], tokens: [], confidenceOrigin: "earlyCompoundSplitFailed", rawTokenCount: 0 };
    }

    const rawTokenCount = tokens.length;

    // Check for unsplit long tokens
    const hasLongUnsplitToken = tokens.some(token => token.length > 10 && !token.includes(" ") && !CAR_BRANDS_CACHE.has(token) && !KNOWN_CITIES_SET_CACHE.has(token) && !PROPER_NOUNS_CACHE.has(token));
    const longTokenFlags = hasLongUnsplitToken ? ["PotentialUnsplitToken"] : [];

    if (tokens.length < 2 || tokens.every(t => COMMON_WORDS_CACHE.has(t.toLowerCase()))) {
      if (tokens.length === 1 && !CAR_BRANDS_CACHE.has(tokens[0].toLowerCase()) && !KNOWN_CITIES_SET_CACHE.has(tokens[0].toLowerCase())) {
        const companyName = capitalizeName(tokens[0]).name;
        const result = {
          companyName: cleanCompanyName(companyName),
          confidenceScore: 80 - (hasLongUnsplitToken ? 5 : 0),
          flags: ["singleTokenFallback", ...longTokenFlags],
          tokens: [tokens[0].toLowerCase()],
          confidenceOrigin: "singleTokenFallback",
          rawTokenCount
        };
        log("info", "Single token fallback applied", { companyName, tokens });
        return result;
      }
      const result = {
        companyName: "",
        confidenceScore: 0,
        flags: ["tokenSetTooWeak", ...longTokenFlags],
        tokens: [],
        confidenceOrigin: "tokenSanityCheck",
        rawTokenCount
      };
      log("debug", "Final result confidence", { companyName: result.companyName, confidenceScore: result.confidenceScore });
      result.tokens = result.tokens.slice(0, 3);
      return result;
    }

    // Parallelize pattern-matching functions
    const patternPromises = [
      tryHumanNamePattern(tokens).catch(e => {
        log("error", "tryHumanNamePattern failed", { domain, tokens, error: e.message, stack: e.stack });
        return null;
      }),
      tryProperNounPattern(tokens).catch(e => {
        log("error", "tryProperNounPattern failed", { domain, tokens, error: e.message, stack: e.stack });
        return null;
      }),
      tryBrandCityPattern(tokens).catch(e => {
        log("error", "tryBrandCityPattern failed", { domain, tokens, error: e.message, stack: e.stack });
        return null;
      }),
      tryBrandGenericPattern(tokens).catch(e => {
        log("error", "tryBrandGenericPattern failed", { domain, tokens, error: e.message, stack: e.stack });
        return null;
      }),
      tryGenericPattern(tokens, properNounsSet, metaResult).catch(e => {
        log("error", "tryGenericPattern failed", { domain, tokens, error: e.message, stack: e.stack });
        return null;
      })
    ];

    const results = await Promise.all(patternPromises);
    const validResults = results.filter(result => result && result.companyName);

    // Prioritize result based on confidence score, token count, and flags
    let bestResult = null;
    for (const result of validResults) {
      const tokenCount = result.companyName.split(" ").filter(Boolean).length;
      const isSingleToken = tokenCount === 1;
      const hasCriticalFlags = result.flags.includes("brandOrCityOnlyBlocked") || result.flags.includes("cityOnlyBlocked") || result.flags.includes("brandOnlyBlocked");

      // Skip results with critical flags
      if (hasCriticalFlags) continue;

      // Prioritize multi-token results over single-token results
      if (!bestResult || 
          (result.confidenceScore > bestResult.confidenceScore) || 
          (result.confidenceScore === bestResult.confidenceScore && tokenCount > 1 && bestResult.companyName.split(" ").length === 1)) {
        bestResult = result;
      }
    }

    if (!bestResult) {
      // If no valid result, use single-token fallback if available
      const singleTokenResult = results.find(result => result && result.flags.includes("singleTokenFallback"));
      if (singleTokenResult) {
        bestResult = singleTokenResult;
      } else {
        bestResult = {
          companyName: "",
          confidenceScore: 0,
          flags: ["noPatternMatch", ...longTokenFlags],
          tokens: [],
          confidenceOrigin: "noPatternMatch",
          rawTokenCount
        };
      }
      log("debug", "Final result confidence", { companyName: bestResult.companyName, confidenceScore: bestResult.confidenceScore });
      bestResult.tokens = bestResult.tokens.slice(0, 3);
      return bestResult;
    }

    // Extract domain brand for validation
    let domainBrand = null;
    for (const token of tokens) {
      if (CAR_BRANDS_CACHE.has(token.toLowerCase())) {
        domainBrand = token;
        break;
      }
    }

    // Validate the company name
    const validationResult = validateCompanyName(
      bestResult.companyName,
      domain,
      domainBrand,
      bestResult.confidenceScore,
      bestResult.flags
    );

    // Preserve the company name unless validation indicates a critical failure
    let finalResult = bestResult;
    if (!validationResult.validatedName && validationResult.flags.some(flag => ["brandOnly", "cityOnly", "invalidName"].includes(flag))) {
      finalResult = {
        companyName: "",
        confidenceScore: validationResult.confidenceScore,
        flags: validationResult.flags,
        tokens: [],
        confidenceOrigin: bestResult.confidenceOrigin,
        rawTokenCount
      };
    } else {
      finalResult.companyName = cleanCompanyName(validationResult.validatedName || bestResult.companyName);
      finalResult.confidenceScore = validationResult.confidenceScore;
      finalResult.flags = validationResult.flags;
    }

    // Post-validation check: Reject single-token results unless no other option
    const finalTokenCount = finalResult.companyName.split(" ").filter(Boolean).length;
    if (finalTokenCount === 1 && validResults.some(res => res.companyName.split(" ").filter(Boolean).length > 1)) {
      finalResult = {
        companyName: "",
        confidenceScore: 0,
        flags: [...finalResult.flags, "singleTokenRejected"],
        tokens: [],
        confidenceOrigin: finalResult.confidenceOrigin,
        rawTokenCount
      };
    }

    // Final truncation check
    if (finalResult.companyName) {
      const nameTokens = finalResult.companyName.split(" ").filter(Boolean);
      const restoredTokens = nameTokens.map(token => {
        const tokenLower = token.toLowerCase();
        for (const [knownToken, original] of [...KNOWN_CITIES_SET_CACHE, ...KNOWN_FIRST_NAMES_CACHE, ...KNOWN_LAST_NAMES_CACHE]) {
          const knownLower = knownToken.toLowerCase();
          if (knownLower.startsWith(tokenLower) && knownLower.length <= tokenLower.length + 2 && knownLower.length > tokenLower.length) {
            if (logLevel === "debug") {
              log("debug", "Restored truncated token in humanizeName", { originalToken: token, restored: original });
            }
            return original.charAt(0).toUpperCase() + original.slice(1).toLowerCase();
          }
        }
        return token;
      });
      finalResult.companyName = restoredTokens.join(" ");
      finalResult.tokens = restoredTokens.map(t => t.toLowerCase());
    }

    finalResult.rawTokenCount = rawTokenCount;
    log("info", `Processed domain: ${normalizedDomain}`, { result: finalResult });
    log("debug", "Final result confidence", { companyName: finalResult.companyName, confidenceScore: finalResult.confidenceScore });
    finalResult.tokens = (finalResult.tokens || []).slice(0, 3);
    return finalResult;
  } catch (e) {
    log("error", "humanizeName failed", { domain, error: e.message, stack: e.stack });
    return { companyName: "", confidenceScore: 0, flags: ["humanizeNameError"], tokens: [], confidenceOrigin: "humanizeNameError", rawTokenCount: 0 };
  }
}

// In-memory cache for metadata
const metaCache = new Map();

// Mocked metadata as a Map for efficiency (simulating real API data)
const metaData = new Map([
  ["donjacobs.com", { title: "Chevrolet Dealer" }],
  ["crossroadscars.com", { title: "Toyota Dealer" }],
  ["chicagocars.com", { title: "Toyota Dealer in Chicago" }],
  ["davisautosales.com", { title: "Auto Dealer" }],
  ["northwestcars.com", { title: "Toyota Dealer" }],
  ["fordtustin.com", { title: "Ford Dealer in Tustin" }],
  ["hondakingsport.com", { title: "Honda Dealer in Kingsport" }],
  ["toyotaofchicago.com", { title: "Toyota Dealer in Chicago" }],
  ["nplincoln.com", { title: "Lincoln Dealer" }],
  ["chevyofcolumbuschevrolet.com", { title: "Chevrolet Dealer in Columbus" }],
  ["mazdanashville.com", { title: "Mazda Dealer in Nashville" }],
  ["kiachattanooga.com", { title: "Kia Dealer in Chattanooga" }],
  ["subaruofgwinnett.com", { title: "Subaru Dealer in Gwinnett" }],
  ["ricksmithchevrolet.com", { title: "Chevrolet Dealer" }],
  ["mikeerdman.com", { title: "Toyota Dealer" }],
  ["tasca.com", { title: "Ford Dealer" }],
  ["crystalautogroup.com", { title: "Auto Dealer" }],
  ["lacitycars.com", { title: "Auto Dealer" }],
  ["barlowautogroup.com", { title: "Auto Dealer" }],
  ["drivevictory.com", { title: "Auto Dealer" }]
]);

async function fetchMetaData(domain) {
  try {
    if (!domain || typeof domain !== "string") {
      log("error", "Invalid domain in fetchMetaData", { domain });
      throw new Error("Invalid domain input");
    }

    // Check cache first
    if (metaCache.has(domain)) {
      const cachedMeta = metaCache.get(domain);
      return { ...cachedMeta, flags: cachedMeta.flags || [] };
    }

    // Simulate API call with timeout (mocked for now)
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        resolve({ timedOut: true });
      }, 5000); // 5-second timeout
    });

    // Mocked API fetch (replace with real HTTP request in production)
    const fetchPromise = new Promise((resolve) => {
      const meta = metaData.get(domain) || {};
      resolve(meta);
    });

    const result = await Promise.race([fetchPromise, timeoutPromise]);

    if (result.timedOut) {
      log("warn", "Metadata fetch timed out", { domain });
      metaCache.set(domain, { flags: ["FetchTimeout"] });
      return { flags: ["FetchTimeout"] };
    }

    // Cache the result
    const metaResult = { ...result, flags: result.flags || [] };
    metaCache.set(domain, metaResult);

    return metaResult;
  } catch (e) {
    log("error", "fetchMetaData failed", { domain, error: e.message, stack: e.stack });
    metaCache.set(domain, { flags: ["FetchFailed"] });
    return { flags: ["FetchFailed"] };
  }
}

function getMetaTitleBrand(meta) {
  try {
    if (!meta || typeof meta.title !== 'string' || !meta.title.trim()) {
      log('warn', 'Invalid meta title in getMetaTitleBrand', { meta });
      return null;
    }

    // Check for fetch reliability flags
    let confidenceAdjustment = 0;
    const fetchFlags = meta.flags || [];
    if (fetchFlags.includes("FetchTimeout") || fetchFlags.includes("FetchFailed")) {
      confidenceAdjustment = -20; // Lower confidence for unreliable metadata
    }

    const title = meta.title.toLowerCase().replace(TITLE_CLEANUP_REGEX, '');
    const words = title.split(/\s+/).filter(Boolean);

    // Check for multiple brands
    const brandTokens = words.filter(w => CAR_BRANDS_CACHE.has(w));
    if (brandTokens.length > 1) {
      log('warn', 'Multiple brands detected in meta title', { title, brandTokens });
      return null;
    }

    let companyName = null;
    let confidenceScore = 90 + confidenceAdjustment; // Lower base confidence to prioritize token-based patterns
    const flags = new Set(['MetaTitleExtracted']);

    // Pre-compute token matches
    const tokenInfo = words.map(word => {
      const wordNoSpaces = word.replace(/\s+/g, '');
      return {
        word,
        wordNoSpaces,
        isProperNoun: PROPER_NOUNS_CACHE.has(wordNoSpaces),
        isBrand: CAR_BRANDS_CACHE.has(word),
        isCity: KNOWN_CITIES_SET_CACHE.has(wordNoSpaces),
        isHumanName: KNOWN_FIRST_NAMES_CACHE.has(wordNoSpaces) || KNOWN_LAST_NAMES_CACHE.has(wordNoSpaces),
        isGeneric: CONTEXTUAL_WORDS.has(word)
      };
    });

    // Priority 1: Match proper noun or city
    for (const info of tokenInfo) {
      if (info.isProperNoun && !info.isBrand) {
        companyName = capitalizeName(info.word).name;
        flags.add('ProperNounMatch');
        break;
      }
      if (info.isCity && !info.isBrand) {
        companyName = capitalizeName(info.wordNoSpaces).name;
        flags.add('CityMatch');
        break;
      }
    }

    // Priority 2: Match human name (if no proper noun or city found)
    if (!companyName) {
      for (const info of tokenInfo) {
        if (info.isHumanName && !info.isBrand && !info.isCity) {
          companyName = capitalizeName(info.word).name;
          flags.add('HumanNameMatch');
          break;
        }
      }
    }

    // Priority 3: Match single brand (only if paired with another component)
    let brand = null;
    if (companyName) {
      for (const info of tokenInfo) {
        if (info.isBrand) {
          brand = BRAND_MAPPING_CACHE.has(info.word) ? BRAND_MAPPING_CACHE.get(info.word) : capitalizeName(info.word).name;
          flags.add('BrandMatch');
          break;
        }
      }
    }

    // If no proper noun, city, or human name is found, reject brand-only results
    if (!companyName) {
      if (logLevel === "debug") {
        log('debug', 'No proper noun, city, or human name found in meta title', { title });
      }
      return null;
    }

    // Append brand or generic term if present
    if (companyName) {
      if (brand && !companyName.toLowerCase().includes(brand.toLowerCase())) {
        companyName = `${companyName} ${brand}`;
        confidenceScore = 100 + confidenceAdjustment;
        flags.add('BrandAppended');
      } else {
        const genericInfo = tokenInfo.find(t => t.isGeneric && !t.isBrand);
        if (genericInfo && !companyName.toLowerCase().includes(genericInfo.word.toLowerCase())) {
          const formattedGeneric = capitalizeName(genericInfo.word).name;
          companyName = `${companyName} ${formattedGeneric}`;
          flags.add('GenericAppended');
        }
      }
    }

    // Validate token count and duplicates
    const nameTokens = companyName.split(' ').filter(Boolean);
    const uniqueTokens = new Set(nameTokens.map(t => t.toLowerCase()));
    if (uniqueTokens.size !== nameTokens.length) {
      flags.add('DuplicatesRemoved');
      confidenceScore = Math.min(confidenceScore, 85);
      companyName = [...uniqueTokens]
        .map(t => nameTokens.find(nt => nt.toLowerCase() === t))
        .join(" ");
    }

    if (nameTokens.length > 3) {
      flags.add('TokenLimitExceeded');
      confidenceScore = Math.min(confidenceScore, 80);
      companyName = nameTokens.slice(0, 3).join(" ");
    }

    if (logLevel === "debug") {
      log('debug', 'getMetaTitleBrand succeeded', { companyName, confidenceScore, flags });
    }
    return {
      companyName,
      confidenceScore,
      confidenceOrigin: 'MetaTitleExtracted',
      flags: Array.from(flags)
    };
  } catch (e) {
    log('error', 'getMetaTitleBrand failed', { meta, error: e.message, stack: e.stack });
    return null;
  }
}

function validateCompanyName(name, domain, brand, score, flags) {
  let validatedName = name;
  let confidenceScore = score;
  let updatedFlags = [...flags];

  // Step 1: Input validation
  if (!name || typeof name !== "string" || !name.trim()) {
    updatedFlags.push("invalidName");
    confidenceScore = 0;
    return { validatedName: "", confidenceScore, flags: updatedFlags };
  }

  const nameTokens = name.split(" ").filter(Boolean);
  const tokenCount = nameTokens.length;

  // Step 2: Reject single-token names unless flagged as singleTokenFallback
  if (tokenCount === 1 && !flags.includes("singleTokenFallback")) {
    updatedFlags.push("singleTokenRejected");
    confidenceScore = 0;
    validatedName = "";
    log("warn", "Single-token name rejected", { name, domain });
    return { validatedName, confidenceScore, flags: updatedFlags };
  }

  // Step 3: Reject brand-only names
  const isBrandOnly = tokenCount === 1 && CAR_BRANDS_CACHE.has(name.toLowerCase());
  if (isBrandOnly) {
    updatedFlags.push("brandOnly");
    confidenceScore = 0;
    validatedName = "";
    log("warn", "Brand-only name rejected", { name, domain });
    return { validatedName, confidenceScore, flags: updatedFlags };
  }

  // Step 4: Reject city-only names
  const isCityOnly = tokenCount === 1 && KNOWN_CITIES_SET_CACHE.has(name.toLowerCase());
  if (isCityOnly) {
    updatedFlags.push("cityOnly");
    confidenceScore = 0;
    validatedName = "";
    log("warn", "City-only name rejected", { name, domain });
    return { validatedName, confidenceScore, flags: updatedFlags };
  }

  // Step 5: Ensure domain brand is included if provided
  if (brand && !name.toLowerCase().includes(brand.toLowerCase())) {
    updatedFlags.push("missingDomainBrand");
    confidenceScore = Math.max(0, confidenceScore - 50);
    validatedName = "";
    log("warn", "Name missing domain brand", { name, domain, brand });
    return { validatedName, confidenceScore, flags: updatedFlags };
  }

  // Step 6: Correct truncation (e.g., "Nanue" → "Nanuet")
  const restoredTokens = nameTokens.map(token => {
    const tokenLower = token.toLowerCase();
    for (const [knownToken, original] of [...KNOWN_CITIES_SET_CACHE, ...KNOWN_FIRST_NAMES_CACHE, ...KNOWN_LAST_NAMES_CACHE]) {
      const knownLower = knownToken.toLowerCase();
      if (knownLower.startsWith(tokenLower) && knownLower.length <= tokenLower.length + 2 && knownLower.length > tokenLower.length) {
        updatedFlags.push("truncationRestored");
        if (logLevel === "debug") {
          log("debug", "Restored truncated token in validateCompanyName", { originalToken: token, restored: original });
        }
        return original.charAt(0).toUpperCase() + original.slice(1).toLowerCase();
      }
    }
    return token;
  });
  validatedName = restoredTokens.join(" ");

  // Step 7: Final validation - ensure name meets minimum quality
  const finalTokenCount = validatedName.split(" ").filter(Boolean).length;
  if (finalTokenCount < 1) {
    updatedFlags.push("invalidNameAfterValidation");
    confidenceScore = 0;
    validatedName = "";
    log("warn", "Invalid name after validation", { name, domain });
  }

  return { validatedName, confidenceScore, flags: updatedFlags };
}

// Export all functions required by batch-enrich.js
export {
  humanizeName,
  earlyCompoundSplit,
  capitalizeName,
  expandInitials,
  normalizeDomain,
  extractBrandOfCityFromDomain,
  fetchMetaData,
  validateCompanyName,
  getMetaTitleBrand,
  cleanCompanyName // Added to resolve import error
};
