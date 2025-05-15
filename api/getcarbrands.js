import { callOpenAI } from "./lib/openai.js";
import winston from "winston";

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

// Brand aliases for token analysis
const brandAliases = {
  "Chevy": ["chevrolet", "chevy"],
  "Chrysler": ["chrysler", "cdjr"],
  "Ford": ["ford"],
  "Mercedes": ["mercedes", "mb"],
  "Honda": ["honda"],
  "Toyota": ["toyota"],
  "Nissan": ["nissan"],
  "Hyundai": ["hyundai"],
  "BMW": ["bmw"],
  "Volkswagen": ["volkswagen", "vw"],
  "Buick": ["buick"],
  "GMC": ["gmc"],
  "Acura": ["acura"],
  "Audi": ["audi"],
  "Bentley": ["bentley"],
  "Cadillac": ["cadillac"],
  "Infiniti": ["infiniti"],
  "Kia": ["kia"],
  "Lexus": ["lexus"],
  "Mazda": ["mazda"],
  "Mitsubishi": ["mitsubishi"],
  "Porsche": ["porsche"],
  "Subaru": ["subaru"],
  "Volvo": ["volvo"]
};

// Known dealerships (503 entries, updated with tedbritt.com and masano.com)
const knownDealerships = {
  "500autogroup": "Chevy",
  "a1toyota": "Toyota",
  "abernethychrysler": "Chrysler",
  "acadianadodge": "Dodge",
  "acdealergroup": "Chrysler",
  "aclexus": "Lexus",
  "acmenissan": "Nissan",
  "actontoyota": "Toyota",
  "acura4me": "Acura",
  "acuraofbayshore": "Acura",
  "acuraofjackson": "Acura",
  "acuraofmemphis": "Acura",
  "acuraofocean": "Acura",
  "acuraofwestchester": "Acura",
  "adventuresubaru": "Subaru",
  "adventureautogroup": "Chevy",
  "airporthonda": "Honda",
  "airportkianaples": "Kia",
  "airportmarinahonda": "Honda",
  "akinsonline": "Ford",
  "alamotoyota": "Toyota",
  "albanyfordsubaru": "Subaru",
  "albrechtauto": "Chrysler",
  "alexandriatoyota": "Toyota",
  "alhendricksontoyota": "Toyota",
  "allanvigilford": "Ford",
  "allenmello": "Chrysler",
  "allstarautogroup": "Chevy",
  "alpine-usa": "Chrysler",
  "americanchevrolet": "Chevy",
  "ancira": "Chrysler",
  "andersonautogroup": "GMC",
  "anderson-auto": "Chevy",
  "andersonautomotive": "Chevy",
  "andymohr": "Ford",
  "annapolissubaru": "Subaru",
  "antoninoacura": "Acura",
  "appleford": "Ford",
  "applegatechev": "Chevy",
  "applewood": "Chevy",
  "arceneauxford": "Ford",
  "armencars": "Chevy",
  "armstrongvw": "VW",
  "arrowford": "Ford",
  "arrigoautogroup": "Chrysler",
  "asag": "Chrysler",
  "ascensionhonda": "Honda",
  "ashlandfordchrysler": "Chrysler",
  "atamian": "Honda",
  "atlanticdodge": "Dodge",
  "atlanticsubaru": "Subaru",
  "auburnhonda": "Honda",
  "auburnjeep": "Jeep",
  "auburntoyota": "Toyota",
  "audibeaverton": "Audi",
  "audicentralhouston": "Audi",
  "audiconcord": "Audi",
  "audidallas": "Audi",
  "audiexchange": "Audi",
  "audifletcherjones": "Audi",
  "audifortworth": "Audi",
  "audifremont": "Audi",
  "audigilbert": "Audi",
  "audigrapevine": "Audi",
  "audimv": "Audi",
  "audinaples": "Audi",
  "audinashua": "Audi",
  "audinorthshore": "Audi",
  "audiofbirmingham": "Audi",
  "audiofsmithtown": "Audi",
  "audiofwallingford": "Audi",
  "audiqueens": "Audi",
  "austininfiniti": "Infiniti",
  "austinsubaru": "Subaru",
  "autobahnmotors": "Mercedes",
  "autofair": "Ford",
  "autolenders": "Chrysler",
  "automotiveavenuesnj": "Chevy",
  "autostarusa": "Chrysler",
  "autobyfox": "Ford",
  "aventuracjdr": "Jeep",
  "avisford": "Ford",
  "axioauto": "Chrysler",
  "bachmanautogroup": "Chevy",
  "baldhill": "Chrysler",
  "ballardtrucks": "Chrysler",
  "banksautos": "Chrysler",
  "barlowautogroup": "Chrysler",
  "barnettauto": "Chrysler",
  "baronbmw": "BMW",
  "bassbunch": "Chrysler",
  "bayouford": "Ford",
  "baywayautogroup": "Chevy",
  "baywaylincoln": "Lincoln",
  "beachautomotive": "Chevy",
  "beatychevrolet": "Chevy",
  "beavertoyota": "Toyota",
  "beavertoninfiniti": "Infiniti",
  "beckmasten": "Buick",
  "behlmann": "Chevy",
  "belknapsubaru": "Subaru",
  "bellevuenissan": "Nissan",
  "bellinghamnissan": "Nissan",
  "bennaford": "Ford",
  "bensonspartanburg": "Chrysler",
  "bentleynaples": "Bentley",
  "bentleyauto": "Bentley",
  "berkeleyhonda": "Honda",
  "berlincity": "Ford",
  "berman": "Nissan",
  "bertogden": "Chrysler",
  "bertsmith": "Porsche",
  "bessemerford": "Ford",
  "bettenbaker": "Chrysler",
  "bettenhyundai": "Hyundai",
  "beverlyhillsporsche": "Porsche",
  "bevsmithtoyota": "Toyota",
  "bianchihonda": "Honda",
  "bienerford": "Ford",
  "bigbendchevroletbuick": "Buick",
  "biggersmazda": "Mazda",
  "bigjoeauto": "Chevy",
  "bighorntoyota": "Toyota",
  "billboruff": "Chrysler",
  "billbrandtford": "Ford",
  "billdube": "Hyundai",
  "billholtgm": "GMC",
  "billingsford": "Ford",
  "billingsleyusa": "Lincoln",
  "billkaynissan": "Nissan",
  "billsmithbuickgmc": "Buick",
  "billsummers": "Chrysler",
  "bighorntoyota": "Toyota",
  "bladechevy": "Chevy",
  "blakefauto": "Chrysler",
  "bleecker": "Chrysler",
  "bloomingtonacurasubaru": "Acura",
  "bloomingtoncjd": "Chrysler",
  "bloomingtonford": "Ford",
  "blossomchevy": "Chevy",
  "blueprintengines": "Chrysler",
  "bobbrownauto": "Chrysler",
  "bobjohnsonchevy": "Chevy",
  "bobsmithbmw": "BMW",
  "bobsmithtoyota": "Toyota",
  "bobtomesford": "Ford",
  "bobbyrahal": "Chrysler",
  "bobbyrahalbmw": "BMW",
  "bochtoyotasouth": "Toyota",
  "bodwellauto": "Chrysler",
  "bomnin": "Chrysler",
  "borgmanfordmazda": "Ford",
  "bournivaljeep": "Jeep",
  "bowmanchevy": "Chevy",
  "boylebuickgmc": "Buick",
  "bramanhondapb": "Honda",
  "bramanmc": "Ram",
  "brandonford": "Ford",
  "bravoautos": "Chrysler",
  "brinsonford": "Ford",
  "bristoltoyota": "Toyota",
  "broncomotors": "Ford",
  "bronxhonda": "Honda",
  "brogdenauto": "Chrysler",
  "brownmotors": "Chrysler",
  "brownsvilletoyota": "Toyota",
  "buchanansubaru": "Subaru",
  "buckalewchevrolet": "Chevy",
  "budclary": "Chrysler",
  "budschrysler": "Chrysler",
  "bulldogkia": "Kia",
  "bunnin": "Chrysler",
  "burnsbuickgmc": "Buick",
  "burnshyundai": "Hyundai",
  "butlercdj": "Dodge",
  "butteauto": "Chrysler",
  "bwalkauto": "Chrysler",
  "byersauto": "Chrysler",
  "cabraljeep": "Jeep",
  "cadillacnorwood": "Cadillac",
  "cadillacofbellevue": "Cadillac",
  "cagaustin": "Chevy",
  "caldwellcares": "Chrysler",
  "caldwellchrysler": "Chrysler",
  "caldwellcountry": "Chrysler",
  "calavancars": "Kia",
  "camelbackdifference": "Chrysler",
  "caminorealchevrolet": "Chevy",
  "campbellcars": "Chrysler",
  "capitalbpg": "Chrysler",
  "capitolauto": "Chevy",
  "capitolchevy": "Chevy",
  "capitolcityhonda": "Honda",
  "capitolfordnm": "Ford",
  "careyfordohio": "Ford",
  "carhop": "Chrysler",
  "carlhogantoyota": "Toyota",
  "carlblack": "GMC",
  "carlsensubaru": "Subaru",
  "carolinanissan": "Nissan",
  "carouselnissan": "Nissan",
  "carpros": "Honda",
  "carstoreusa": "Chrysler",
  "cartersubaru": "Subaru",
  "carterseattle": "Chrysler",
  "carusofordlincoln": "Ford",
  "castlerockautoplex": "Lexus",
  "cavalierford": "Ford",
  "cavaliermazda": "Mazda",
  "cavendercadillac": "Cadillac",
  "cdjrofalbertville": "Chrysler",
  "cecilmotors": "Chrysler",
  "centennialsubaru": "Subaru",
  "centennialtoyota": "Toyota",
  "centralcadillac": "Cadillac",
  "century3kia": "Kia",
  "centuryauto": "Chevy",
  "centurywestbmw": "BMW",
  "championerie": "Chrysler",
  "championfordlincoln": "Ford",
  "chapmanautogroup": "Chrysler",
  "chapmanchoice": "Chrysler",
  "charlesbarker": "Chrysler",
  "charlieobaugh": "Chrysler",
  "charlieshonda": "Honda",
  "charlestonkia": "Kia",
  "charper": "Chevy",
  "chasechevrolet": "Chevy",
  "chastangford": "Ford",
  "cherryhillnissan": "Nissan",
  "chesrown": "Chrysler",
  "chevyland": "Chevy",
  "chevyofcolumbus": "Chevy",
  "chevyexchange": "Chevy",
  "chevyman": "Chevy",
  "chevytownusa": "Chevy",
  "chicagowheel": "Chrysler",
  "chrisauffenberg": "Chrysler",
  "chrisnikel": "Chrysler",
  "chryslerwinona": "Chrysler",
  "chuckfairbankschevy": "Chevy",
  "chuckolsonchev": "Chevy",
  "cincyjlr": "Jaguar",
  "cioccasubaru": "Subaru",
  "circlebmw": "BMW",
  "cityautomall": "Chrysler",
  "citykia": "Kia",
  "citysidesubaru": "Subaru",
  "citytoyota": "Toyota",
  "cityvwchicago": "VW",
  "clarkcars": "Chrysler",
  "clarkchevrolet": "Chevy",
  "classicatlanta": "Chrysler",
  "classicchevrolet": "Chevy",
  "classichonda": "Honda",
  "classickiacarrollton": "Kia",
  "classicmazda": "Mazda",
  "classictoyotatyler": "Toyota",
  "clawsontruckcenter": "Chrysler",
  "clevelandford": "Ford",
  "clevelandporsche": "Porsche",
  "clickliberty": "Chrysler",
  "cloningerford": "Ford",
  "coastalaves": "Chrysler",
  "coastauto": "Chrysler",
  "coastlinecdjr": "Chrysler",
  "cobbcountytoyota": "Toyota",
  "coconutpointford": "Ford",
  "cogginbuickgmc": "GMC",
  "coggindelandhyundai": "Hyundai",
  "colemanautos": "Chrysler",
  "colonialchevrolet": "Chevy",
  "colonialgmc": "GMC",
  "colonialmazda": "Mazda",
  "colonialnissan": "Nissan",
  "colonialtoyotact": "Toyota",
  "colonial-west": "Chevy",
  "columbiahonda": "Honda",
  "columbusautosource": "Mercedes",
  "competitionsubaru": "Subaru",
  "concordhonda": "Honda",
  "concordiachevybuick": "Buick",
  "concordtoyota": "Toyota",
  "conleysubaru": "Subaru",
  "contecadillac": "Cadillac",
  "continentalautogroup": "Chevy",
  "continentaltoyota": "Toyota",
  "cookevillehonda": "Honda",
  "coopermotor": "Chrysler",
  "cooperautogroup": "Chevy",
  "copelandchevrolet": "Chevy",
  "copplecars": "Chrysler",
  "coronanissan": "Nissan",
  "corwinauto": "Chrysler",
  "coulternissan": "Nissan",
  "countrysidechevy": "Chevy",
  "courtesycarcity": "Chrysler",
  "courtesychev": "Chevy",
  "covertauto": "Chrysler",
  "crainteam": "Chevy",
  "crestag": "Chrysler",
  "crevierbmw": "BMW",
  "criswellauto": "Chevy",
  "croninauto": "Chrysler",
  "crosscreekcars": "Chrysler",
  "crossroadscars": "Chrysler",
  "crowncadillac": "Cadillac",
  "crownjeep": "Jeep",
  "curryacura": "Acura",
  "curryhonda": "Honda",
  "currytoyota": "Toyota",
  "czag": "Chrysler",
  "dahlauto": "Ford",
  "dancummins": "Chrysler",
  "danburyauto": "Chrysler",
  "danvaden": "Chevy",
  "darcars": "Chrysler",
  "darlings": "Ford",
  "davewrightauto": "Nissan",
  "davischevrolet": "Chevy",
  "davidsonautonet": "Chrysler",
  "dayschevrolet": "Chevy",
  "daystarchrysler": "Chrysler",
  "daytonadodge": "Dodge",
  "daytonanissan": "Nissan",
  "daytonandrews": "Chrysler",
  "daasw": "Chrysler",
  "deaconscdjr": "Dodge",
  "deeryford": "Ford",
  "deienchevrolet": "Chevy",
  "delacyford": "Ford",
  "delandauto": "Chrysler",
  "delandkia": "Kia",
  "dellaauto": "Honda",
  "delraybuickgmc": "Buick",
  "demontrond": "Buick",
  "dennisdillon": "Nissan",
  "denooyerchevrolet": "Chevy",
  "depaula": "Chrysler",
  "destinationkia": "Kia",
  "devoeauto": "Chrysler",
  "dfwaudi": "Audi",
  "diamondbuickgmc": "Buick",
  "dianesauerchevy": "Chevy",
  "diersford": "Ford",
  "difeokia": "Kia",
  "dimmitt": "Chrysler",
  "diplomatmotors": "Chrysler",
  "diverchev": "Chevy",
  "dodgecityofmckinney": "Dodge",
  "doengeschoice": "Chrysler",
  "donalsonauto": "Chrysler",
  "donfranklinauto": "Ford",
  "donhattan": "Chevy",
  "donhindsford": "Ford",
  "donjacobs": "BMW",
  "donjacobsbmw": "BMW",
  "donjacksonlm": "Chrysler",
  "donk": "Chrysler",
  "donmiller": "Chrysler",
  "dormancadillac-gmc": "Cadillac",
  "dorschfordkia": "Ford",
  "doughenry": "Chrysler",
  "dougs": "Chrysler",
  "dowautogroup": "Chrysler",
  "dublintoyota": "Toyota",
  "duncanchevrolet": "Chevy",
  "dunningtoyota": "Toyota",
  "dutchmillerauto": "Chrysler",
  "dutchsauto": "Chrysler",
  "duvalacura": "Acura",
  "duvalford": "Ford",
  "dyerauto": "Chrysler",
  "eaglechevyky": "Chevy",
  "easleymitsubishi": "Mitsubishi",
  "easleynissan": "Nissan",
  "eastcjd": "Dodge",
  "eastsidesubaru": "Subaru",
  "eastwestlincoln": "Lincoln",
  "easyhonda": "Honda",
  "eckenrodford": "Ford",
  "edkoehn": "Chrysler",
  "edmondhyundai": "Hyundai",
  "edrinke": "Chrysler",
  "edwardsautogroup": "Chevy",
  "edwardsautogroup": "Chevy",
  "edwardsgm": "Chrysler",
  "eideford": "Ford",
  "elderdodge": "Dodge",
  "elderhyundai": "Hyundai",
  "eldermitsubishi": "Mitsubishi",
  "elginsuperauto": "Chrysler",
  "elkinschevrolet": "Chevy",
  "elkomotorco": "Chrysler",
  "elmhurstbmw": "BMW",
  "emmertmotors": "Chevy",
  "empirenissan": "Nissan",
  "epicchevrolet": "Chevy",
  "eskridge": "Chrysler",
  "evergreenchevrolet": "Chevy",
  "evergreenford": "Ford",
  "evergreensubaru": "Subaru",
  "executiveag": "Chrysler",
  "executivehonda": "Honda",
  "expresswayjeep": "Jeep",
  "extonnissan": "Nissan",
  "faireychevrolet": "Chevy",
  "fairwayfordevans": "Ford",
  "farlandcars": "Chrysler",
  "farrishcars": "Chrysler",
  "faulknerhyundai": "Hyundai",
  "feeny": "Chrysler",
  "fergusondeal": "Chrysler",
  "fergusonchallenge": "Chrysler",
  "fernandezhonda": "Honda",
  "fernelius": "Chrysler",
  "fiehrermotors": "Chrysler",
  "fieldsauto": "Chrysler",
  "fivestar": "Ford",
  "fivestaronline": "Ford",
  "fjaudi": "Audi",
  "flemington": "Chevy",
  "flemingtonbmw": "BMW",
  "flowershonda": "Honda",
  "fontananissan": "Nissan",
  "fordfairfield": "Ford",
  "fordhamtoyota": "Ford",
  "fordlincolncharlotte": "Ford",
  "fordlincolnofcookeville": "Ford",
  "fordnashville": "Ford",
  "formulanissan": "Nissan",
  "fortcollinsdcj": "Chrysler",
  "fortcollinskia": "Kia",
  "fortmyersinfiniti": "Infiniti",
  "frankbeck": "Chrysler",
  "frankleta": "Honda",
  "fredlaverycompany": "Chrysler",
  "fredechevrolet": "Chevy",
  "fredychevy": "Chevy",
  "freeholdautos": "Chrysler",
  "freeholdcars": "Chrysler",
  "freeholddodgesubaru": "Subaru",
  "freeholdjeep": "Jeep",
  "fremonthyundai": "Hyundai",
  "fresnolexus": "Lexus",
  "fresnochrysler": "Chrysler",
  "friendshipauto": "Chrysler",
  "friendlyhondacuse": "Honda",
  "friendlykia": "Kia",
  "fultonford": "Ford",
  "gaithersburgmazda": "Mazda",
  "gainesvillenissan": "Nissan",
  "galpin": "Ford",
  "garberbuick": "Buick",
  "garberchevrolet": "Chevy",
  "garciacars": "Chevy",
  "gardenstatehonda": "Honda",
  "garlynshelton": "Chrysler",
  "garrettmotors": "Chrysler",
  "garyforceacura": "Acura",
  "garyforcehonda": "Honda",
  "gatewayclassiccars": "Chevy",
  "gatewaykia": "Kia",
  "gaultauto": "Chrysler",
  "gebauto": "Chrysler",
  "genelatta": "Chrysler",
  "gengras": "Chrysler",
  "georgechevy": "Chevy",
  "georgewhiteames": "Chrysler",
  "geraldauto": "Ford",
  "gilchristauto": "Chrysler",
  "gillelandchevrolet": "Chevy",
  "gillespiemotors": "Ford",
  "givemethevin": "Chrysler",
  "glendaledcj": "Chrysler",
  "goldcoastcadillac": "Cadillac",
  "goldencircle": "Ford",
  "goldsteinauto": "Chrysler",
  "golling": "Ford",
  "goodsonacura": "Acura",
  "gornoford": "Ford",
  "gosscars": "Chrysler",
  "gossettmotors": "Chrysler",
  "graingerhonda": "Honda",
  "graingernissan": "Nissan",
  "grandsubaru": "Subaru",
  "granitesubaru": "Subaru",
  "grantspasstoyota": "Toyota",
  "graysonhyundai": "Hyundai",
  "greencc": "Chevy",
  "greenautogroup": "Chrysler",
  "greghublerchevy": "Chevy",
  "gregsweet": "Chrysler",
  "grevechrysler": "Chrysler",
  "greshamford": "Ford",
  "griffinnissan": "Nissan",
  "griffithford": "Ford",
  "grubbs": "Chrysler",
  "grubbsauto": "Chrysler",
  "guelphhyundai": "Hyundai",
  "guntersvillechevrolet": "Chevy",
  "gusmachadoford": "Ford",
  "gychevy": "Chevy",
  "habberstadbmw": "BMW",
  "haciendaford": "Ford",
  "hadwin-white": "Subaru",
  "haggertyautogroup": "Chevy",
  "haleyauto": "Chrysler",
  "halleenkia": "Kia",
  "hamiltonchevy": "Chevy",
  "hananiaautos": "Chrysler",
  "hannerchevrolet": "Chevy",
  "hanselauto": "BMW",
  "hanselford": "Ford",
  "happyhyundai": "Hyundai",
  "harbor-hyundai": "Hyundai",
  "hardeeford": "Ford",
  "hardin": "Chrysler",
  "hardyautomotive": "Chevy",
  "harperinfiniti": "Infiniti",
  "hartfordtoyota": "Ford",
  "harvestchevy": "Chevy",
  "hawkinsbestprice": "Chrysler",
  "hawkauto": "Chrysler",
  "hawthornechevrolet": "Chevy",
  "haywardhonda": "Honda",
  "heartlandcdjr": "Chrysler",
  "hedrickschevy": "Chevy",
  "hemetcdjr": "Chrysler",
  "herbchambers": "Chrysler",
  "herbconnolly": "Chevy",
  "heritagecadillac": "Cadillac",
  "hessertchevy": "Chevy",
  "hessertoyota": "Toyota",
  "hgreglux": "Porsche",
  "hickorytoyota": "Toyota",
  "hileyhuntsville": "Mazda",
  "hiltonheadlexus": "Lexus",
  "hindererhonda": "Honda",
  "hodgessubaru": "Subaru",
  "hollerhonda": "Honda",
  "hollerhyundai": "Hyundai",
  "hollychevrolet": "Chevy",
  "holmanhonda": "Honda",
  "holmesmotors": "Chrysler",
  "homerskeltonford": "Ford",
  "homangmripon": "Chevy",
  "hondacarsofaiken": "Honda",
  "hondakingsport": "Honda",
  "hondamarin": "Honda",
  "hondamorristown": "Honda",
  "hondaofcolumbia": "Honda",
  "hondaofgainesville": "Honda",
  "hondaoflincoln": "Honda",
  "hondaofpasadena": "Honda",
  "hondaofwatertown": "Honda",
  "hondasanmarcos": "Honda",
  "hondavillage": "Honda",
  "horneautogroup": "Chrysler",
  "hornekia": "Kia",
  "hornenissanyuma": "Nissan",
  "housechevrolet": "Chevy",
  "houseredwing": "Chevy",
  "huvaere": "Chrysler",
  "hugginshonda": "Honda",
  "hugheshonda": "Honda",
  "huntauto": "Chrysler",
  "huntingtonbeachford": "Ford",
  "huntingtonhyundai": "Hyundai",
  "huntingtonjeep": "Jeep",
  "hustoncars": "Chrysler",
  "huttignissan": "Nissan",
  "hyundaicityny": "Hyundai",
  "hyundaiofnorthcharleston": "Hyundai",
  "hyundaioforangepark": "Hyundai",
  "idehonda": "Honda",
  "ikehonda": "Honda",
  "ilderton": "Chrysler",
  "infiniti-bloomington": "Infiniti",
  "infinitibhm": "Infiniti",
  "infinitiofbeachwood": "Infiniti",
  "infinitiofgwinnett": "Infiniti",
  "infinitioflexington": "Infiniti",
  "infinitiofnashua": "Infiniti",
  "infinitiofnaperville": "Infiniti",
  "infinitioftucson": "Infiniti",
  "infinitiofwestchester": "Infiniti",
  "ingersollauto": "Chrysler",
  "invergrovehyundai": "Hyundai",
  "irajack": "Chrysler",
  "irvinebmw": "BMW",
  "irwincars": "Chrysler",
  "islandacura": "Acura",
  "islandautogroup": "Chevy",
  "jackson": "Chrysler",
  "jacksonautomotive": "Chrysler",
  "jacksonsubaru": "Subaru",
  "jaguarhartford": "Jaguar",
  "jaguarlandrover": "Jaguar",
  "jaffarian": "Chrysler",
  "jamescdjr": "Chrysler",
  "jansenchevrolet": "Chevy",
  "jasonlewisautomotive": "Chrysler",
  "jaxcjd": "Chrysler",
  "jclewis": "Ford",
  "jcroffroad": "Chrysler",
  "jeffdeals": "Chevy",
  "jeffperrygm": "Chrysler",
  "jenkinsandwynne": "Ford",
  "jenkinsford": "Ford",
  "jerryseiner": "Chrysler",
  "jerrysmithcars": "Chrysler",
  "jessupautoplaza": "Chrysler",
  "jetchevrolet": "Chevy",
  "jimbaier": "Chrysler",
  "jimbutlermaserati": "Maserati",
  "jimclick": "Chrysler",
  "jimcurley": "Chrysler",
  "jimfalkmotorsofmaui": "Chrysler",
  "jimkeras": "Chrysler",
  "jimmybrittchevrolet": "Chevy",
  "jimmybrittcdjr": "Chrysler",
  "jimnortontoyota": "Toyota",
  "jimonealford": "Ford",
  "jimwinterauto": "Chrysler",
  "jmlexus": "Lexus",
  "joebowmanautoplaza": "Chrysler",
  "joececconischryslercomplex": "Chrysler",
  "joecs": "Chrysler",
  "joemahanford": "Ford",
  "johnelwaycadillac": "Cadillac",
  "johnsondodge": "Dodge",
  "johnsinclairauto": "Chrysler",
  "johnsonbrosford": "Ford",
  "johnsoncityford": "Ford",
  "jonesauto": "Chevy",
  "joneschev": "Chevy",
  "jorns": "Chrysler",
  "josephbuickgmc": "Buick",
  "josephcadillac": "Cadillac",
  "joycehonda": "Honda",
  "joycekoons": "Chrysler",
  "jtscars": "Chrysler",
  "kainford": "Ford",
  "kamaainamotors": "Chrysler",
  "kamaainanissan": "Nissan",
  "karlchevrolet": "Chevy",
  "kcsummers": "Toyota",
  "keatinghonda": "Honda",
  "keatingnissan": "Nissan",
  "kellerchevrolet": "Chevy",
  "kenbarrett": "Chrysler",
  "kenlyford": "Ford",
  "kennedyauto": "Chrysler",
  "kentchevrolet": "Chevy",
  "kerbeck": "Cadillac",
  "kerrychevrolet": "Chevy",
  "kerrynissan": "Nissan",
  "keycadillac": "Cadillac",
  "keycars": "Chrysler",
  "kchev": "Chevy",
  "kiaofalhambra": "Kia",
  "kiaofauburn": "Kia",
  "kiaofaugusta": "Kia",
  "kiaoffargo": "Kia",
  "kiaoflagrange": "Kia",
  "kiaoflincoln": "Kia",
  "kiaofstreetsboro": "Kia",
  "kimsnobull": "Chrysler",
  "kingsfordinc": "Ford",
  "kingskia": "Kia",
  "kingsnissan": "Nissan",
  "kingstonnissan": "Nissan",
  "kitchenerhonda": "Honda",
  "kleinauto": "Chrysler",
  "kriegerford": "Ford",
  "kunescountry": "Chrysler",
  "kurabe-america": "Chrysler",
  "kylecurrance": "Chrysler",
  "lacarguy": "Chrysler",
  "lafontaine": "Chrysler",
  "lagrangetoyota": "Toyota",
  "lakeautogroup": "Chevy",
  "lakecharlestoyota": "Toyota",
  "lakenormaninfiniti": "Infiniti",
  "lakesideford": "Ford",
  "lakewoodford": "Ford",
  "lambonb": "Mercedes",
  "landroverdallas": "Land Rover",
  "larryhillis": "Chrysler",
  "larsonford": "Ford",
  "lascoford": "Ford",
  "laurelnissan": "Nissan",
  "laurelchryslerjeep": "Chrysler",
  "lawtonkia": "Kia",
  "leblancauto": "Toyota",
  "lebrunnissan": "Nissan",
  "leecdjr": "Chrysler",
  "leehyundai": "Hyundai",
  "legacybuickgmc": "Buick",
  "legendnissan": "Nissan",
  "leithcars": "Chrysler",
  "lenstoler": "Ford",
  "lesterglenn": "Chrysler",
  "levittownford": "Ford",
  "lexuscarlsbad": "Lexus",
  "lexusofchestersprings": "Lexus",
  "lexusofdayton": "Lexus",
  "lexusofglendale": "Lexus",
  "lexusofhenderson": "Lexus",
  "lexusofhuntsville": "Lexus",
  "lexusoflakeway": "Lexus",
  "lexusoflouisville": "Lexus",
  "lexusofmemphis": "Lexus",
  "lexusofmobile": "Lexus",
  "lexusofneworleans": "Lexus",
  "lexusofnorthborough": "Lexus",
  "lexusofqueens": "Lexus",
  "lexusofroute10": "Lexus",
  "lexussantamonica": "Lexus",
  "lexusknoxville": "Lexus",
  "lexusoftacoma": "Lexus",
  "lexusoftowson": "Lexus",
  "lexusoflasvegas": "Lexus",
  "lilliston": "Ford",
  "lindsayacura": "Acura",
  "lindsayhonda": "Honda",
  "lockhartcadillac": "Cadillac",
  "lodihonda": "Honda",
  "lodotruck": "Chrysler",
  "londoff": "Chevy",
  "loveford": "Ford",
  "loveringvolvo": "Volvo",
  "lujack": "Honda",
  "luterileyhonda": "Honda",
  "lynchtoyota": "Toyota",
  "machaikford": "Ford",
  "maherchevrolet": "Chevy",
  "mahwahhonda": "Honda",
  "maitacars": "Chevy",
  "malloy": "Hyundai",
  "malloyford": "Ford",
  "manahawkinkia": "Kia",
  "manchesterhonda": "Honda",
  "mandalcdjr": "Chrysler",
  "mannchrysler": "Chrysler",
  "mariettatoyota": "Toyota",
  "marinacura": "Acura",
  "marinocjd": "Chrysler",
  "marinechevy": "Chevy",
  "marionsubaru": "Subaru",
  "markhammazda": "Mazda",
  "markkia": "Kia",
  "marlboronissan": "Nissan",
  "martinhonda": "Honda",
  "martinmazda": "Mazda",
  "mastria": "Nissan",
  "mathewsford": "Ford",
  "mattblattkia": "Kia",
  "matthewsmotors": "Chrysler",
  "maxbmwmotorcycles": "BMW",
  "maxieprice": "Chrysler",
  "maxwellford": "Ford",
  "mazdaofbedford": "Mazda",
  "mazdaofroswell": "Mazda",
  "mazdaofwooster": "Mazda",
  "mazdaclt": "Mazda",
  "mbcoralgables": "Mercedes",
  "mbcutlerbay": "Mercedes",
  "mbofdanbury": "Mercedes",
  "mbfm": "Mercedes",
  "mbofhagerstown": "Mercedes",
  "mbmnj": "Mercedes",
  "mbofmc": "Mercedes",
  "mbofselma": "Mercedes",
  "mbofsmithtown": "Mercedes",
  "mbtemecula": "Mercedes",
  "mbwestminster": "Mercedes",
  "mbwinstonsalem": "Mercedes",
  "mccaddon": "Chrysler",
  "mccormickmotors": "Chrysler",
  "mcdanielauto": "Chevy",
  "mcdonaldag": "Chrysler",
  "mcdonaldautomotive": "Chrysler",
  "mcgeecars": "Chrysler",
  "mcgovernauto": "Chevy",
  "mcgrathauto": "Chevy",
  "mcguirechevy": "Chevy",
  "mclartydaniel": "Chrysler",
  "mclarenphiladelphia": "McLaren",
  "mclarenphiladelphia": "McLaren",
  "medlincars": "Ford",
  "megelchevy": "Chevy",
  "melloy": "Chrysler",
  "memorialchevrolet": "Chevy",
  "meritchev": "Chevy",
  "metroacura": "Acura",
  "emetroford": "Ford",
  "miamiacura": "Acura",
  "miamilakesautomall": "Jeep",
  "midlandshonda": "Honda",
  "midwayfordmiami": "Ford",
  "mikeandersonchevy": "Chevy",
  "mikecalverttoyota": "Toyota",
  "mikeerdmantoyota": "Toyota",
  "mikemolsteadmotors": "Chrysler",
  "millsautogroup": "Chevy",
  "millschevy": "Chevy",
  "minchinbpg": "Buick",
  "mohawkchevrolet": "Chevy",
  "mohawkhonda": "Honda",
  "monumentchevrolet": "Monument Chevy",
  "moonhonda": "Honda",
  "moorebuick": "Buick",
  "morachevbuick": "Buick",
  "morganautogroup": "Chrysler",
  "motionautogroup": "Chrysler",
  "mountainstatestoyota": "Toyota",
  "moyernissan": "Nissan",
  "mullinaxford": "Ford",
  "musiccityhonda": "Honda",
  "mvauto": "Chrysler",
  "mymetrohonda": "Honda",
  "myedisonnissan": "Nissan",
  "myhappyhyundai": "Hyundai",
  "myhudsonnissan": "Nissan",
  "nadalcapital": "Chrysler",
  "naplesdodge": "Dodge",
  "naplesluxuryimports": "Chrysler",
  "nationwidemotors": "Chrysler",
  "nelsoncars": "Chrysler",
  "nelsonmazda": "Mazda",
  "nemerford": "Ford",
  "newhollandauto": "Chrysler",
  "newportlexus": "Lexus",
  "newsmyrnachevy": "Chevy",
  "nfwauto": "Chrysler",
  "nickchevrolet": "Chevy",
  "nissanofanderson": "Nissan",
  "nissanofathens": "Nissan",
  "nissancity": "Nissan",
  "nissaneasley": "Nissan",
  "nissanofec": "Nissan",
  "nissanofhendersonville": "Nissan",
  "nissanofmiddletown": "Nissan",
  "nissanofmurfreesboro": "Nissan",
  "nissanofnewnan": "Nissan",
  "94nissan": "Nissan",
  "northbakersfieldtoyota": "Toyota",
  "northcentralford": "Ford",
  "northcountyford": "Ford",
  "northcutt": "Chrysler",
  "northlandnissan": "Nissan",
  "northparknissan": "Nissan",
  "northpointcjd": "Chrysler",
  "northshoremazda": "Mazda",
  "northshoretoyota": "Toyota",
  "northtownauto": "Chrysler",
  "northwestdodge": "Dodge",
  "northwesthyundai": "Hyundai",
  "npcdjr": "Chrysler",
  "npmazda": "Mazda",
  "npsubaru": "Subaru",
  "nucar": "Chevy",
  "nwhcars": "Chrysler",
  "nwjeep": "Jeep",
  "nyeauto": "Chevy",
  "oakridgenissan": "Nissan",
  "oakwoodnissan": "Nissan",
  "obrienauto": "Chevy",
  "obrienteam": "Chrysler",
  "oceanautomotivegroup": "Chevy",
  "odanielauto": "Ford",
  "odonnellhonda": "Honda",
  "ofallonbuickgmc": "Buick",
  "olatheford": "Ford",
  "olathetoyota": "Toyota",
  "onesubaru": "Subaru",
  "onetoyota": "Toyota",
  "openroad": "Chrysler",
  "oregans": "Chevy",
  "ourisman": "Chrysler",
  "ourismanva": "Chrysler",
  "oxmoorautogroup": "Chevy",
  "ozarkchev": "Chevy",
  "packeywebb": "Ford",
  "palmetto57": "Nissan",
  "palmbayford": "Ford",
  "palmcoastford": "Ford",
  "papasdodge": "Dodge",
  "papesubaru": "Subaru",
  "papik": "Chrysler",
  "pappastoyota": "Toyota",
  "paragonacura": "Acura",
  "paragonhonda": "Honda",
  "parischevrolet": "Chevy",
  "parkavebmw": "BMW",
  "parkchryslerjeep": "Jeep",
  "parksofgainesville": "Chrysler",
  "parkwayfamily": "Mazda",
  "parkwayofwilmington": "Chrysler",
  "patlobbtoyota": "Toyota",
  "patmillikenford": "Ford",
  "patpeck": "Honda",
  "paulmiller": "Chrysler",
  "pcautomall": "Chrysler",
  "peakeram": "Ram",
  "pearsontoyotascion": "Toyota",
  "pedersentoyota": "Toyota",
  "pellegrinopbg": "Chrysler",
  "pennyrileford": "Ford",
  "pensacolahonda": "Honda",
  "penskeautomotive": "Chevy",
  "pepe": "Cadillac",
  "perkinsmotors": "Chrysler",
  "permiantoyota": "Toyota",
  "petersontoyota": "Toyota",
  "phillydrive": "Chrysler",
  "philmeadorsubaru": "Subaru",
  "philsmithacura": "Acura",
  "philsmithkia": "Kia",
  "piazzahonda": "Honda",
  "piazzamazda": "Mazda",
  "piazzanissan": "Nissan",
  "pinebeltauto": "Chevy",
  "pinehurstautomall": "Chrysler",
  "pinesford": "Ford",
  "pioneerchevy": "Chevy",
  "planetdodge": "Dodge",
  "plazacadillac": "Cadillac",
  "plazainfiniti": "Infiniti",
  "porscheoflivermore": "Porsche",
  "porscheofmelbourne": "Porsche",
  "porschesouthorlando": "Porsche",
  "porschewoodlandhills": "Porsche",
  "portcitynissan": "Nissan",
  "portjeffchryslerjeep": "Jeep",
  "portlandvolvo": "Volvo",
  "postoaktoyota": "Toyota",
  "potamkinhyundai": "Hyundai",
  "powerautogroup": "Chrysler",
  "powerofbowser": "Chrysler",
  "prestigeimports": "Chrysler",
  "prestigesubaru": "Subaru",
  "prestoncars": "Chrysler",
  "prestonmotor": "Chrysler",
  "pricemotorsales": "Chrysler",
  "principleauto": "Chrysler",
  "prpseats": "Chrysler",
  "prostrollo": "Chevy",
  "purdygroupusa": "Chrysler",
  "putnamauto": "Chrysler",
  "putnamgm": "GMC",
  "qarmstpete": "Chrysler",
  "qualitysubaru": "Subaru",
  "qualitytoyota": "Toyota",
  "raabeford": "Ford",
  "racewayford": "Ford",
  "radleyauto": "Chevy",
  "raffertysubaru": "Subaru",
  "rallyeacura": "Acura",
  "rallyelexus": "Lexus",
  "ramseyacura": "Acura",
  "randolphbuick": "Buick",
  "rayvarnerford": "Ford",
  "rbhonda": "Honda",
  "rbmofatlanta": "Mercedes",
  "reddingkia": "Kia",
  "reddingsubaru": "Subaru",
  "redmac": "Chrysler",
  "redriverford": "Ford",
  "reedlallier": "Chevy",
  "reedmantoll": "Chrysler",
  "regalauto": "Chrysler",
  "reidsvillenissan": "Nissan",
  "reliablenissan": "Nissan",
  "resslermotors": "Chrysler",
  "rexchevy": "Chevy",
  "rhodeschevy": "Chevy",
  "riceautomotive": "Chrysler",
  "richmondbmwmidlothian": "BMW",
  "richmondford": "Ford",
  "rickroushhonda": "Honda",
  "rickweaver": "Buick",
  "righttoyota": "Toyota",
  "rileymazda": "Mazda",
  "risingfastmotorcars": "Chrysler",
  "rivardbuickgmc": "Buick",
  "riveratoyota": "Toyota",
  "riverdalechryslerjeep": "Jeep",
  "riversidehasit": "Chrysler",
  "rizzacars": "Chevy",
  "rlchrysler": "Chrysler",
  "roberthorneford": "Ford",
  "robertsmotors": "Chrysler",
  "robertsrobinson": "Chrysler",
  "rochestertoyota": "Toyota",
  "rockhonda": "Honda",
  "rockhillbuickgmc": "Buick",
  "rocklandnissan": "Nissan",
  "rockville-audi": "Audi",
  "rockwalldodge": "Dodge",
  "rodenrothmotors": "Chrysler",
  "rodmanford": "Ford",
  "rogerbeasley": "Mazda",
  "rogersmotors": "Chevy",
  "ronbouchardsautostores": "Chrysler",
  "ronwestphal": "Chevy",
  "ronniewatkinsford": "Ford",
  "rosevillekia": "Kia",
  "rosenthalacura": "Acura",
  "rosnerchevrolet": "Chevy",
  "rosnertoyota": "Toyota",
  "roswellinfiniti": "Infiniti",
  "roushhonda": "Honda",
  "route22honda": "Honda",
  "royalhonda": "Honda",
  "royalmoore": "Mazda",
  "rudolphcars": "Chevy",
  "rudyluthertoyota": "Toyota",
  "russellbarnett": "Chrysler",
  "ryanauto": "Chrysler",
  "ryansubaru": "Subaru",
  "saccucci": "Honda",
  "saffordauto": "Ford",
  "samleman": "Chrysler",
  "samscismfordlm": "Ford",
  "sandschevrolet": "Chevy",
  "sandskia": "Kia",
  "sangogmc": "GMC",
  "santantford": "Ford",
  "saratogahonda": "Honda",
  "sarantcadillac": "Cadillac",
  "sawyerschevy": "Chevy",
  "sbautogroup": "Chrysler",
  "sbnissan": "Nissan",
  "scenicmotors": "Ford",
  "schallerauto": "Chrysler",
  "schimmergm": "Chevrolet",
  "schomp": "BMW",
  "schultzfordlincoln": "Ford",
  "schwieterscars": "Chevy",
  "sentryautogroup": "Chevy",
  "serrachampaign": "Chrysler",
  "serramontehonda": "Honda",
  "serramontesubaru": "Subaru",
  "serranashville": "Chrysler",
  "serranissan": "Nissan",
  "serrafordfh": "Ford",
  "serrawhelan": "Chevy",
  "sethwadley": "Chrysler",
  "sewickleycars": "Chrysler",
  "seymourford": "Ford",
  "sfbenz": "Mercedes",
  "sfhonda": "Honda",
  "sftoyota": "Toyota",
  "sharpautos": "Chrysler",
  "sharpnackdirect": "Chrysler",
  "sheehy": "Ford",
  "shepardcars": "Chrysler",
  "shermandodge": "Dodge",
  "sherwoodchevrolet": "Chevy",
  "shivelymotors": "Chrysler",
  "shoplakeviewford": "Ford",
  "shoplynch": "Chevy",
  "shopnapleton": "Chrysler",
  "shoptruauto": "Ford",
  "shopuslast": "Chevy",
  "sierramotors": "Chrysler",
  "siouxcityford": "Ford",
  "siouxfallsford": "Ford",
  "sirwalter": "Chrysler",
  "sjinfiniti": "Infiniti",
  "skbuickgmc": "Buick",
  "skylineforddirect": "Ford",
  "sloaneautos": "Toyota",
  "smartdrive": "Smart",
  "smford": "Ford",
  "smithhavenauto": "Chrysler",
  "smithtownacura": "Acura",
  "smythevolvo": "Volvo",
  "snethkamp": "Chrysler",
  "sonju": "Chrysler",
  "southcharlottechevy": "Chevy",
  "southlanddodge": "Dodge",
  "southpointauto": "Chevy",
  "southtacomamazda": "Mazda",
  "southtownmotors": "Chrysler",
  "southwestmotors": "Chrysler",
  "spady": "Chrysler",
  "spokanehyundai": "Hyundai",
  "sportautomotive": "Porsche",
  "springfieldhyundai": "Hyundai",
  "stadiumgm": "GMC",
  "stadiumtoyota": "Toyota",
  "stanleysubaru": "Subaru",
  "stanmcnabb": "Chrysler",
  "starlingchevy": "Chevy",
  "statewideford": "Ford",
  "steadporsche": "Porsche",
  "steetpontemazda": "Mazda",
  "sterlingmccallacura": "Acura",
  "stevenscreekcjd": "Dodge",
  "stevenscreeksubaru": "Subaru",
  "steveschevrolet": "Chevy",
  "stevinsonauto": "Chrysler",
  "stillwellford": "Ford",
  "stingraychevrolet": "Chevy",
  "stiversonline": "Ford",
  "stocktonhonda": "Honda",
  "stonemountainvw": "VW",
  "stonescars": "Chrysler",
  "stowassergmc": "GMC",
  "stnt": "Chrysler",
  "subarugeorgetown": "Subaru",
  "subaruofcherryhill": "Subaru",
  "subaruofmorristown": "Subaru",
  "subaruofwakefield": "Subaru",
  "subaruofwinchester": "Subaru",
  "subarustamford": "Ford",
  "subaruworldnewton": "Subaru",
  "sullivanbrothers": "Nissan",
  "sullivancadillac": "Cadillac",
  "summervilleford": "Ford",
  "summitmazda": "Mazda",
  "sunbeltautomotive": "Chrysler",
  "sunnysideauto": "Chevy",
  "sunsetimports": "Porsche",
  "suntrup": "Hyundai",
  "suntrupbuickgmc": "Buick",
  "suntrupford": "Ford",
  "superiorcars": "Chrysler",
  "sutherlinautomotive": "Ford",
  "sutherlandchevy": "Chevy",
  "suttonacura": "Acura",
  "swope": "Chrysler",
  "symdon": "Chrysler",
  "szottauto": "Chrysler",
  "tameron": "Honda",
  "tasca": "Ford",
  "taylor": "Chrysler",
  "taylorauto": "Chrysler",
  "teamautomotive": "Chevy",
  "teamford": "Ford",
  "teamhonda": "Honda",
  "teamsewell": "Lexus",
  "teamtoyotaon41": "Toyota",
  "tedbritt": "Ford",
  "tegelerchevrolet": "Chevy",
  "temeculahyundai": "Hyundai",
  "tennesonnissan": "Nissan",
  "terryvillechevy": "Chevy",
  "tetonmotors": "Chevy",
  "tfsmh": "Ford",
  "theaudiconnection": "Audi",
  "thechevyteam": "Chevy",
  "thepremiercollection": "Bentley",
  "thinkbeardmore": "Chrysler",
  "thinkmidway": "Chrysler",
  "thoroughbrednissan": "Nissan",
  "thompson": "Chevy",
  "thompsonautomotive": "Chevy",
  "thurstonhonda": "Honda",
  "tituswill": "Chevy",
  "tomgill": "Chevy",
  "tomhesser": "Chevy",
  "tomkadlec": "Honda",
  "tommynixautogroup": "Chrysler",
  "tomroush": "Chrysler",
  "tomwilliamsbmw": "BMW",
  "tonygroup": "Honda",
  "topyamerica": "Chrysler",
  "tothakron": "Buick",
  "towneauto": "Ford",
  "toyotaofboerne": "Toyota",
  "toyotaofbristol": "Toyota",
  "toyotaofbrookhaven": "Toyota",
  "toyotaofdecatur": "Toyota",
  "toyotaofelcajon": "Toyota",
  "toyotaofgastonia": "Toyota",
  "toyotaofgreensburg": "Toyota",
  "toyotaofhackensack": "Toyota",
  "toyotaofhermiston": "Toyota",
  "toyotaofkilleen": "Toyota",
  "toyotaofkingsport": "Toyota",
  "toyotaofmurfreesboro": "Toyota",
  "toyotaofnaperville": "Toyota",
  "toyotaofolympia": "Toyota",
  "toyotaofpullman": "Toyota",
  "toyotaofredlands": "Toyota",
  "toyotaofrenton": "Toyota",
  "toyotaofseattle": "Toyota",
  "toyotaofstockton": "Toyota",
  "toyotaofvictoria": "Toyota",
  "toyotaofriverside": "Toyota",
  "toyotavacaville": "Toyota",
  "toyotawc": "Toyota",
  "toyotaplace": "Toyota",
  "toyotasunnyvale": "Toyota",
  "tracymazda": "Mazda",
  "transitowne": "Chrysler",
  "treasurecoastlexus": "Lexus",
  "trent": "Chrysler",
  "trilakesmotors": "Chrysler",
  "troncalli": "Subaru",
  "tucsonsubaru": "Subaru",
  "tulley": "BMW",
  "tustinlexus": "Lexus",
  "tuscaloosachevrolet": "Chevy",
  "tuscaloosahyundai": "Hyundai",
  "tuscaloosatoyota": "Toyota",
  "twincitybuick": "Buick",
  "twinsbuickgmc": "Buick",
  "tworiversford": "Ford",
  "tynans": "Chrysler",
  "umanskymotorcars": "Chrysler",
  "universitydodge": "Dodge",
  "universitymazdakia": "Kia",
  "usedvwaudi": "Audi",
  "valenciaacura": "Acura",
  "valleydodge": "Dodge",
  "valleyhonda": "Honda",
  "valleynissan": "Nissan",
  "valley-bmw": "BMW",
  "vanceford": "Ford",
  "vannuyscdjr": "Dodge",
  "vara": "Chrysler",
  "vatland": "Honda",
  "vbacura": "Acura",
  "venicetoyota": "Toyota",
  "veracadillac": "Cadillac",
  "veramotors": "Chrysler",
  "verneide": "Chrysler",
  "verneidegm": "Chrysler",
  "vicbaileyauto": "Chrysler",
  "vicmyers": "Chrysler",
  "victorchevrolet": "Chevy",
  "victorychevroletbuick": "Buick",
  "victorychevycharlotte": "Chevy",
  "victorysandusky": "Chevy",
  "victoryshallotte": "Chrysler",
  "victorytoyota": "Toyota",
  "victorytoyotacanton": "Toyota",
  "vinart": "Honda",
  "viti": "Chrysler",
  "volvo-oc": "Volvo",
  "volvoofbend": "Volvo",
  "volvodanvers": "Volvo",
  "vosscadillac": "Cadillac",
  "vwbrandon": "VW",
  "waconiadodge": "Dodge",
  "wagnercadillac": "Cadillac",
  "waldorfchevycadillac": "Cadillac",
  "walkerautomotive": "Chevy",
  "walkerchevrolet": "Chevy",
  "walkerford": "Ford",
  "walkerjones": "Chevy",
  "walnutcreekford": "Ford",
  "wantzchevrolet": "Chevy",
  "washingtonchevy": "Chevy",
  "washingtonford": "Ford",
  "watsonchevy": "Chevy",
  "weatherfordbmw": "BMW",
  "webbcars": "Chevy",
  "weikertford": "Ford",
  "weircanyonacura": "Acura",
  "weirsbuickgmc": "Buick",
  "wellesleytoyota": "Toyota",
  "wellesleymazda": "Mazda",
  "wesfinch": "Chevy",
  "westherr": "Ford",
  "westgatecars": "Chrysler",
  "westlie": "Ford",
  "westmetroauto": "Chrysler",
  "westsidechevrolet": "Chevy",
  "westsidehyundai": "Hyundai",
  "westsidevw": "VW",
  "wheelersgm": "GMC",
  "whitakerauto": "Chrysler",
  "whhonda": "Honda",
  "whiteplainsnissan": "Nissan",
  "whiterivertoyota": "Toyota",
  "wideworldbmw": "BMW",
  "wilkinscars": "Chrysler",
  "williamsonchrysler": "Chrysler",
  "wilsonvillechevy": "Chevy",
  "wilsonvillesubaru": "Subaru",
  "wilsonvilletoyota": "Toyota",
  "winchevrolet": "Chevy",
  "winchester-mitsubishi": "Mitsubishi",
  "windychevy": "Chevy",
  "winnerauto": "Chrysler",
  "wolfchasenissan": "Nissan",
  "wolfchasehyundai": "Hyundai",
  "wollamchevy": "Chevy",
  "woodburynissan": "Nissan",
  "woodhamsford": "Ford",
  "woodmennissan": "Nissan",
  "woltzwindford": "Ford",
  "wowwoodys": "Chrysler",
  "wrightcars": "Chrysler",
  "wrightdeal": "Chevy",
  "wyattjohnson": "Chrysler",
  "yatesbuickgmc": "Buick",
  "yorkautomotive": "Chrysler",
  "yorkkia": "Kia",
  "youngbuickgmc": "Buick",
  "youngchev": "Chevy",
  "youngsubaru": "Subaru",
  "zeiglerchevy": "Chevy",
  "zumbrotaford": "Ford",
    "nazarethford": "Ford",
  "nelsoncars": "Chrysler",
  "newhollandauto": "Chrysler",
  "newportlexus": "Lexus",
  "newsmyrnachevy": "Chevy",
  "nfwauto": "Chrysler",
  "nickchevrolet": "Chevy",
  "nissanofanderson": "Nissan",
  "nissanofathens": "Nissan",
  "nissancity": "Nissan",
  "nissaneasley": "Nissan",
  "nissanofec": "Nissan",
  "nissanofhendersonville": "Nissan",
  "nissanofmiddletown": "Nissan",
  "nissanofmurfreesboro": "Nissan",
  "nissanofnewnan": "Nissan",
  "94nissan": "Nissan",
  "northbakersfieldtoyota": "Toyota",
  "northcentralford": "Ford",
  "northcountyford": "Ford",
  "northcutt": "Chrysler",
  "northlandnissan": "Nissan",
  "northparknissan": "Nissan",
  "northpointcjd": "Chrysler",
  "northshoremazda": "Mazda",
  "northshoretoyota": "Toyota",
  "northtownauto": "Chrysler",
  "northwestdodge": "Dodge",
  "northwesthyundai": "Hyundai",
  "npcdjr": "Chrysler",
  "npmazda": "Mazda",
  "npsubaru": "Subaru",
  "nucar": "Chevy",
  "nwhcars": "Chrysler",
  "nwjeep": "Jeep",
  "nyeauto": "Chevy",
  "oakridgenissan": "Nissan",
  "oakwoodnissan": "Nissan",
  "obrienauto": "Chevy",
  "obrienteam": "Chrysler",
  "oceanautomotivegroup": "Chevy",
  "odanielauto": "Ford",
  "odonnellhonda": "Honda",
  "ofallonbuickgmc": "Buick",
  "olatheford": "Ford",
  "olathetoyota": "Toyota",
  "onesubaru": "Subaru",
  "onetoyota": "Toyota",
  "openroad": "Chrysler",
  "oregans": "Chevy",
  "ourisman": "Chrysler",
  "ourismanva": "Chrysler",
  "oxmoorautogroup": "Chevy",
  "ozarkchev": "Chevy",
  "packeywebb": "Ford",
  "palmetto57": "Nissan",
  "palmbayford": "Ford",
  "palmcoastford": "Ford",
  "papasdodge": "Dodge",
  "papesubaru": "Subaru",
  "papik": "Chrysler",
  "pappastoyota": "Toyota",
  "paragonacura": "Acura",
  "paragonhonda": "Honda",
  "parischevrolet": "Chevy",
  "parkavebmw": "BMW",
  "parkchryslerjeep": "Jeep",
  "parksofgainesville": "Chrysler",
  "parkwayfamily": "Mazda",
  "parkwayofwilmington": "Chrysler",
  "patlobbtoyota": "Toyota",
  "patmillikenford": "Ford",
  "patpeck": "Honda",
  "paulmiller": "Chrysler",
  "pcautomall": "Chrysler",
  "peakeram": "Ram",
  "pearsontoyotascion": "Toyota",
  "pedersentoyota": "Toyota",
  "pellegrinopbg": "Chrysler",
  "pennyrileford": "Ford",
  "pensacolahonda": "Honda",
  "penskeautomotive": "Chevy",
  "pepe": "Cadillac",
  "perkinsmotors": "Chrysler",
  "permiantoyota": "Toyota",
  "petersontoyota": "Toyota",
  "phillydrive": "Chrysler",
  "philmeadorsubaru": "Subaru",
  "philsmithacura": "Acura",
  "philsmithkia": "Kia",
  "piazzahonda": "Honda",
  "piazzamazda": "Mazda",
  "piazzanissan": "Nissan",
  "pinebeltauto": "Chevy",
  "pinehurstautomall": "Chrysler",
  "pinesford": "Ford",
  "pioneerchevy": "Chevy",
  "planetdodge": "Dodge",
  "plazacadillac": "Cadillac",
  "plazainfiniti": "Infiniti",
  "porscheoflivermore": "Porsche",
  "porscheofmelbourne": "Porsche",
  "porschesouthorlando": "Porsche",
  "porschewoodlandhills": "Porsche",
  "portcitynissan": "Nissan",
  "portjeffchryslerjeep": "Jeep",
  "portlandvolvo": "Volvo",
  "postoaktoyota": "Toyota",
  "potamkinhyundai": "Hyundai",
  "powerautogroup": "Chrysler",
  "powerofbowser": "Chrysler",
  "prestigeimports": "Chrysler",
  "prestigesubaru": "Subaru",
  "prestoncars": "Chrysler",
  "prestonmotor": "Chrysler",
  "pricemotorsales": "Chrysler",
  "principleauto": "Chrysler",
  "prpseats": "Chrysler",
  "prostrollo": "Chevy",
  "purdygroupusa": "Chrysler",
  "putnamauto": "Chrysler",
  "putnamgm": "GMC",
  "qarmstpete": "Chrysler",
  "qualitysubaru": "Subaru",
  "qualitytoyota": "Toyota",
  "raabeford": "Ford",
  "racewayford": "Ford",
  "radleyauto": "Chevy",
  "raffertysubaru": "Subaru",
  "rallyeacura": "Acura",
  "rallyelexus": "Lexus",
  "ramseyacura": "Acura",
  "randolphbuick": "Buick",
  "rayvarnerford": "Ford",
  "rbhonda": "Honda",
  "rbmofatlanta": "Mercedes",
  "reddingkia": "Kia",
  "reddingsubaru": "Subaru",
  "redmac": "Chrysler",
  "redriverford": "Ford",
  "reedlallier": "Chevy",
  "reedmantoll": "Chrysler",
  "regalauto": "Chrysler",
  "reidsvillenissan": "Nissan",
  "reliablenissan": "Nissan",
  "resslermotors": "Chrysler",
  "rexchevy": "Chevy",
  "rhodeschevy": "Chevy",
  "riceautomotive": "Chrysler",
  "richmondbmwmidlothian": "BMW",
  "richmondford": "Ford",
  "rickroushhonda": "Honda",
  "rickweaver": "Buick",
  "righttoyota": "Toyota",
  "rileymazda": "Mazda",
  "risingfastmotorcars": "Chrysler",
  "rivardbuickgmc": "Buick",
  "riveratoyota": "Toyota",
  "riverdalechryslerjeep": "Jeep",
  "riversidehasit": "Chrysler",
  "rizzacars": "Chevy",
  "rlchrysler": "Chrysler",
  "roberthorneford": "Ford",
  "robertsmotors": "Chrysler",
  "robertsrobinson": "Chrysler",
  "rochestertoyota": "Toyota",
  "rockhonda": "Honda",
  "rockhillbuickgmc": "Buick",
  "rocklandnissan": "Nissan",
  "rockville-audi": "Audi",
  "rockwalldodge": "Dodge",
  "rodenrothmotors": "Chrysler",
  "rodmanford": "Ford",
  "rogerbeasley": "Mazda",
  "rogersdabbs": "Chevy",
  "rogersmotors": "Chevy",
  "ronbouchardsautostores": "Chrysler",
  "ronwestphal": "Chevy",
  "ronniewatkinsford": "Ford",
  "rosevillekia": "Kia",
  "rosenthalacura": "Acura",
  "rosnerchevrolet": "Chevy",
  "rosnertoyota": "Toyota",
  "roswellinfiniti": "Infiniti",
  "roushhonda": "Honda",
  "route22honda": "Honda",
  "royalhonda": "Honda",
  "royalmoore": "Mazda",
  "rudolphcars": "Chevy",
  "rudyluthertoyota": "Toyota",
  "russellbarnett": "Chrysler",
  "ryanauto": "Chrysler",
  "ryansubaru": "Subaru",
  "saccucci": "Honda",
  "saffordauto": "Ford",
  "samleman": "Chrysler",
  "samscismfordlm": "Ford",
  "sandschevrolet": "Chevy",
  "sandskia": "Kia",
  "sangogmc": "GMC",
  "santantford": "Ford",
  "saratogahonda": "Honda",
  "sarantcadillac": "Cadillac",
  "sawyerschevy": "Chevy",
  "sbautogroup": "Chrysler",
  "sbnissan": "Nissan",
  "scenicmotors": "Ford",
  "schallerauto": "Chrysler",
  "schimmergm": "Chevrolet",
  "schomp": "BMW",
  "schultzfordlincoln": "Ford",
  "schwieterscars": "Chevy",
  "sentryautogroup": "Chevy",
  "serrachampaign": "Chrysler",
  "serramontehonda": "Honda",
  "serramontesubaru": "Subaru",
  "serranashville": "Chrysler",
  "serranissan": "Nissan",
  "serrafordfh": "Ford",
  "serrawhelan": "Chevy",
  "sethwadley": "Chrysler",
  "sewickleycars": "Chrysler",
  "seymourford": "Ford",
  "sfbenz": "Mercedes",
  "sfhonda": "Honda",
  "sftoyota": "Toyota",
  "sharpautos": "Chrysler",
  "sharpnackdirect": "Chrysler",
  "sheehy": "Ford",
  "shepardcars": "Chrysler",
  "shermandodge": "Dodge",
  "sherwoodchevrolet": "Chevy",
  "shivelymotors": "Chrysler",
  "shoplakeviewford": "Ford",
  "shoplynch": "Chevy",
  "shopnapleton": "Chrysler",
  "shoptruauto": "Ford",
  "shopuslast": "Chevy",
  "sierramotors": "Chrysler",
  "siouxcityford": "Ford",
  "siouxfallsford": "Ford",
  "sirwalter": "Chrysler",
  "sjinfiniti": "Infiniti",
  "skbuickgmc": "Buick",
  "skylineforddirect": "Ford",
  "sloaneautos": "Toyota",
  "smartdrive": "Smart",
  "smford": "Ford",
  "smithhavenauto": "Chrysler",
  "smithtownacura": "Acura",
  "smythevolvo": "Volvo",
  "snethkamp": "Chrysler",
  "sonju": "Chrysler",
  "southcharlottechevy": "Chevy",
  "southlanddodge": "Dodge",
  "southpointauto": "Chevy",
  "southtacomamazda": "Mazda",
  "southtownmotors": "Chrysler",
  "southwestmotors": "Chrysler",
  "spady": "Chrysler",
  "spokanehyundai": "Hyundai",
  "sportautomotive": "Porsche",
  "springfieldhyundai": "Hyundai",
  "stadiumgm": "GMC",
  "stadiumtoyota": "Toyota",
  "stanleysubaru": "Subaru",
  "stanmcnabb": "Chrysler",
  "starlingchevy": "Chevy",
  "statewideford": "Ford",
  "steadporsche": "Porsche",
  "steetpontemazda": "Mazda",
  "sterlingmccallacura": "Acura",
  "stevenscreekcjd": "Dodge",
  "stevenscreeksubaru": "Subaru",
  "steveschevrolet": "Chevy",
  "stevinsonauto": "Chrysler",
  "stillwellford": "Ford",
  "stingraychevrolet": "Chevy",
  "stiversonline": "Ford",
  "stocktonhonda": "Honda",
  "stonemountainvw": "VW",
  "stonescars": "Chrysler",
  "stowassergmc": "GMC",
  "stnt": "Chrysler",
  "subarugeorgetown": "Subaru",
  "subaruofcherryhill": "Subaru",
  "subaruofmorristown": "Subaru",
  "subaruofwakefield": "Subaru",
  "subaruofwinchester": "Subaru",
  "subarustamford": "Ford",
  "subaruworldnewton": "Subaru",
  "sullivanbrothers": "Nissan",
  "sullivancadillac": "Cadillac",
  "summervilleford": "Ford",
  "summitmazda": "Mazda",
  "sunbeltautomotive": "Chrysler",
  "sunnysideauto": "Chevy",
  "sunsetimports": "Porsche",
  "suntrup": "Hyundai",
  "suntrupbuickgmc": "Buick",
  "suntrupford": "Ford",
  "superiorcars": "Chrysler",
  "sutherlinautomotive": "Ford",
  "sutherlandchevy": "Chevy",
  "suttonacura": "Acura",
  "swope": "Chrysler",
  "symdon": "Chrysler",
  "szottauto": "Chrysler",
  "tameron": "Honda",
  "tasca": "Ford",
  "taylor": "Chrysler",
  "taylorauto": "Chrysler",
  "teamautomotive": "Chevy",
  "teamford": "Ford",
  "teamhonda": "Honda",
  "teamsewell": "Lexus",
  "teamtoyotaon41": "Toyota",
  "tedbritt": "Ford",
  "tegelerchevrolet": "Chevy",
  "temeculahyundai": "Hyundai",
  "tennesonnissan": "Nissan",
  "terryvillechevy": "Chevy",
  "tetonmotors": "Chevy",
  "tfsmh": "Ford",
  "theaudiconnection": "Audi",
  "thechevyteam": "Chevy",
  "thepremiercollection": "Bentley",
  "thinkbeardmore": "Chrysler",
  "thinkmidway": "Chrysler",
  "thoroughbrednissan": "Nissan",
  "thompson": "Chevy",
  "thompsonautomotive": "Chevy",
  "thurstonhonda": "Honda",
  "tituswill": "Chevy",
  "tomgill": "Chevy",
  "tomhesser": "Chevy",
  "tomkadlec": "Honda",
  "tommynixautogroup": "Chrysler",
  "tomroush": "Chrysler",
  "tomwilliamsbmw": "BMW",
  "tonygroup": "Honda",
  "topyamerica": "Chrysler",
  "tothakron": "Buick",
  "towneauto": "Ford",
  "toyotaofboerne": "Toyota",
  "toyotaofbristol": "Toyota",
  "toyotaofbrookhaven": "Toyota",
  "toyotaofdecatur": "Toyota",
  "toyotaofelcajon": "Toyota",
  "toyotaofgastonia": "Toyota",
  "toyotaofgreensburg": "Toyota",
  "toyotaofhackensack": "Toyota",
  "toyotaofhermiston": "Toyota",
  "toyotaofkilleen": "Toyota",
  "toyotaofkingsport": "Toyota",
  "toyotaofmurfreesboro": "Toyota",
  "toyotaofnaperville": "Toyota",
  "toyotaofolympia": "Toyota",
  "toyotaofpullman": "Toyota",
  "toyotaofredlands": "Toyota",
  "toyotaofrenton": "Toyota",
  "toyotaofseattle": "Toyota",
  "toyotaofstockton": "Toyota",
  "toyotaofvictoria": "Toyota",
  "toyotaofriverside": "Toyota",
  "toyotavacaville": "Toyota",
  "toyotawc": "Toyota",
  "toyotaplace": "Toyota",
  "toyotasunnyvale": "Toyota",
  "tracymazda": "Mazda",
  "transitowne": "Chrysler",
  "treasurecoastlexus": "Lexus",
  "trent": "Chrysler",
  "trilakesmotors": "Chrysler",
  "troncalli": "Subaru",
  "tucsonsubaru": "Subaru",
  "tulley": "BMW",
  "tustinlexus": "Lexus",
  "tuscaloosachevrolet": "Chevy",
  "tuscaloosahyundai": "Hyundai",
  "tuscaloosatoyota": "Toyota",
  "twincitybuick": "Buick",
  "twinsbuickgmc": "Buick",
  "tworiversford": "Ford",
  "tynans": "Chrysler",
  "umanskymotorcars": "Chrysler",
  "universitydodge": "Dodge",
  "universitymazdakia": "Kia",
  "usedvwaudi": "Audi",
  "valenciaacura": "Acura",
  "valleydodge": "Dodge",
  "valleyhonda": "Honda",
  "valleynissan": "Nissan",
  "valley-bmw": "BMW",
  "vanceford": "Ford",
  "vannuyscdjr": "Dodge",
  "vara": "Chrysler",
  "vatland": "Honda",
  "vbacura": "Acura",
  "venicetoyota": "Toyota",
  "veracadillac": "Cadillac",
  "veramotors": "Chrysler",
  "verneide": "Chrysler",
  "verneidegm": "Chrysler",
  "vicbaileyauto": "Chrysler",
  "vicmyers": "Chrysler",
  "victorchevrolet": "Chevy",
  "victorychevroletbuick": "Buick",
  "victorychevycharlotte": "Chevy",
  "victorysandusky": "Chevy",
  "victoryshallotte": "Chrysler",
  "victorytoyota": "Toyota",
  "victorytoyotacanton": "Toyota",
  "vinart": "Honda",
  "viti": "Chrysler",
  "volvo-oc": "Volvo",
  "volvoofbend": "Volvo",
  "volvodanvers": "Volvo",
  "vosscadillac": "Cadillac",
  "vwbrandon": "VW",
  "waconiadodge": "Dodge",
  "wagnercadillac": "Cadillac",
  "waldorfchevycadillac": "Cadillac",
  "walkerautomotive": "Chevy",
  "walkerchevrolet": "Chevy",
  "walkerford": "Ford",
  "walkerjones": "Chevy",
  "walnutcreekford": "Ford",
  "wantzchevrolet": "Chevy",
  "washingtonchevy": "Chevy",
  "washingtonford": "Ford",
  "watsonchevy": "Chevy",
  "weatherfordbmw": "BMW",
  "webbcars": "Chevy",
  "weikertford": "Ford",
  "weircanyonacura": "Acura",
  "weirsbuickgmc": "Buick",
  "wellesleytoyota": "Toyota",
  "wellesleymazda": "Mazda",
  "wesfinch": "Chevy",
  "4porsche": "Porsche",
  "abbotsfordvw": "Ford",
  "acura4me": "Acura",
  "adventurecars": "Chrysler",
  "alanbyervolvo": "Volvo",
  "alanwebbautogroup": "Chrysler",
  "alhendricksontoyota": "Toyota",
  "allenmello": "Chrysler",
  "alpine-usa": "Chrysler",
  "andersonsubaru": "Subaru",
  "applewood": "Chevy",
  "armstrongvw": "VW",
  "artmoehn": "Chevy", // From log, row 52, Vercel: Chevy
  "asag": "Chrysler",
  "atzenhoffer": "Chrysler", // From log, row 578, add despite Vercel "unknown"
  "audifremont": "Audi",
  "audinaples": "Audi",
  "audismithtown": "Audi",
  "autolenders": "Chrysler",
  "autoplaza": "Chrysler",
  "averygreenehonda": "Honda",
  "baldhill": "Chrysler",
  "bellinghamtoyota": "Toyota",
  "bermudamotors": "Chrysler",
  "bertogden": "Chrysler",
  "bespokemotorgroup": "Chrysler", // From log, row 605, add generic Chrysler
  "bighorntoyota": "Toyota",
  "billkidds": "Chrysler",
  "birdnow": "Chrysler", // From log, row 417, add generic Chrysler
  "bloomingtonacurasubaru": "Acura",
  "bmwdarien": "BMW",
  "bmwofcolumbia": "BMW",
  "bmwofwilmington": "BMW",
  "bomnin": "Chrysler",
  "brogden": "Chrysler",
  "brownmotors": "Chrysler",
  "budclary": "Chrysler",
  "burnsvillehyundai": "Hyundai",
  "butteauto": "Chrysler",
  "calavancars": "Kia", // From log, row 373, 395
  "cambridge-motors": "Chrysler",
  "camelbackdifference": "Chrysler",
  "capitolchevy": "Chevy",
  "careyfordohio": "Ford",
  "carlock": "Chrysler",
  "carlockcars": "Chrysler",
  "cdjrofalbertville": "Chrysler",
  "centurytrucks": "Chrysler", // From log, row 210, add generic Chrysler
  "charlieobaugh": "Chrysler",
  "charliesmm": "Chrysler", // From log, row 612, add generic Chrysler
  "chevroletofbellevue": "Chevy",
  "chevroletofpuentehills": "Chevy",
  "chryslerwinona": "Chrysler",
  "cioccasubaru": "Subaru",
  "cityautomall": "Chrysler",
  "clark": "Chrysler",
  "cloningerford": "Ford",
  "coconutpointford": "Ford",
  "coggindelandhyundai": "Hyundai",
  "colemanautos": "Chrysler",
  "colonial-west": "Chevy",
  "continentalautogroup": "Chevy",
  "continentaltoyota": "Toyota",
  "copplecars": "Chrysler", // From log, row 504
  "cornhuskerauto": "Chrysler", // From log, row 592, add generic Chrysler
  "corwinford": "Ford",
  "countyford": "Ford",
  "crest": "Chrysler",
  "croninauto": "Chrysler",
  "crownautomotive": "Chrysler",
  "ctcautogroup": "Chrysler",
  "curriemotors": "Chevy",
  "czag": "Chrysler",
  "danburyauto": "Chrysler",
  "davesinclair": "Ford",
  "davidsonautonet": "Chrysler",
  "daystarcdjr": "Chrysler",
  "delucasales": "Chrysler",
  "denneymotorsales": "Chrysler",
  "dicklovett": "BMW", // From log, row 128, Vercel: BMW
  "dolanautogroup": "Chrysler",
  "donalsonauto": "Chrysler", // From log, row 609
  "donk": "Chrysler",
  "donmiller": "Chrysler",
  "dorschel": "Chrysler",
  "dowlingford": "Ford",
  "drivedag": "Chrysler", // From log, row 369, add generic Chrysler
  "drivedana": "Chrysler",
  "drivingssouthern": "Chrysler",
  "dutchmillerauto": "Chrysler",
  "dutchsauto": "Chrysler",
  "edwardsgm": "Chrysler", // From log, row 526
  "elginsuperauto": "Chrysler",
  "epicchevrolet": "Chevy",
  "fckerbeck": "Chrysler",
  "fergusondeal": "Chrysler", // From log, rows 411, 449, 536
  "fiehrer": "Chrysler",
  "fivestar": "Ford",
  "fordhamtoyota": "Ford",
  "freedomautogroup": "Chrysler",
  "gainesvillehonda": "Honda",
  "garberlinwood": "Chrysler",
  "gebauto": "Chrysler",
  "germain": "Chrysler", // From log, row 422, add generic Chrysler
  "germainmotorco": "Chrysler", // From log, row 454, add generic Chrysler
  "gilchristautomotive": "Chrysler",
  "gilescars": "Chrysler",
  "golfmillford": "Ford",
  "gortsemamotors": "Chrysler",
  "grangermotors": "Chrysler",
  "greenwoodautomotive": "Chrysler",
  "gregleblanc": "Chrysler", // From log, row 500, add generic Chrysler
  "groteauto": "Chrysler",
  "gunterauto": "Chrysler",
  "gunthermotors": "Chrysler",
  "haggerty": "Chevy",
  "hawthornechevrolet": "Chevy",
  "helenamotors": "Chrysler",
  "heritageautogrp": "Chrysler", // From log, row 510, add generic Chrysler
  "hoehnmotors": "Chrysler", // From log, row 558, add generic Chrysler
  "hoganmotors": "Chrysler",
  "holmanhonda": "Honda",
  "holmesmotors": "Chrysler",
  "homerskeltonford": "Ford",
  "hondaoftomsriver": "Honda",
  "hondaweatherford": "Honda",
  "ingersollauto": "Chrysler", // From log, row 442
  "jacksoncars": "Chrysler", // From log, row 580
  "jessupautoplaza": "Chrysler",
  "jimnortontoyota": "Toyota",
  "joececconischryslercomplex": "Chrysler",
  "joecs": "Chrysler",
  "joeperillo": "BMW", // From log, row 459, Vercel: BMW
  "johnsinclairauto": "Chrysler",
  "johnthornton": "Chrysler", // From log, row 515, add generic Chrysler
  "jorns": "Chrysler",
  "kellerdeal": "Chrysler", // From log, row 598, add generic Chrysler
  "kendallnissan": "Nissan",
  "kennyross": "Chrysler",
  "kerbeck": "Cadillac", // From log, row 618
  "keyauto": "Chrysler",
  "knoepfler": "Chevy",
  "kurabe-america": "Chrysler",
  "kwic": "Chrysler", // From log, row 509, add generic Chrysler
  "lamesarv": "Chrysler", // From log, row 633, add generic Chrysler
  "landmarkautomotive": "Chrysler",
  "lauraautogroup": "Chrysler",
  "lesterglenn": "Chrysler",
  "lexusescondido": "Lexus",
  "limbaughtoyota": "Toyota",
  "luteriley": "Honda",
  "mackgrubbshyundai": "Hyundai",
  "marianoriverahonda": "Honda",
  "markleymotors": "Chrysler",
  "masano": "Toyota",
  "matthewsmotors": "Chrysler",
  "mattiaciogroup": "Chrysler", // From log, row 625, Vercel: Chrysler
  "maverickmotorgroup": "Chrysler", // From log, row 607, add generic Chrysler
  "mccormickmotors": "Chrysler",
  "michaelhohl": "Chrysler",
  "mikemolsteadmotors": "Chrysler",
  "milnes": "Ford", // From log, row 406, Vercel: Ford
  "montroseautogroup": "Chrysler",
  "moreheadautogroup": "Chevy",
  "mshonda": "Honda",
  "nadalcapital": "Chrysler",
  "northcountyford": "Ford",
  "northwesthyundai": "Hyundai",
  "ourismanva": "Chrysler",
  "pattersoncars": "Chrysler",
  "pechelesautomotive": "Chrysler",
  "powerofbowser": "Chrysler",
  "premiercadillac": "Cadillac",
  "premiersubaruoffremont": "Subaru",
  "rhinelandergm": "GMC",
  "robersonmotors": "Chrysler",
  "rohrmanauto": "Chrysler", // From log, row 513, add generic Chrysler
  "route1usa": "Chrysler", // From log, row 573, add generic Chrysler
  "sandschevrolet": "Chevy",
  "santantford": "Ford",
  "scarff-ford": "Ford",
  "secorauto": "Chrysler", // From log, row 589, add generic Chrysler
  "sendellmotors": "Subaru", // Prior verified
  "serpentinichevy": "Chevy",
  "sharpautos": "Chrysler",
  "sharpecars": "Chrysler", // From log, row 579, add generic Chrysler
  "sheppardmotors": "Chrysler",
  "shopsubaru": "Subaru",
  "smailauto": "Chrysler",
  "smotherseuropean": "Mercedes", // From log, row 483, Vercel: Mercedes
  "solomonauto": "Chrysler",
  "southwestmotors": "Chrysler",
  "stcharlescdj": "Chrysler",
  "sunnyking": "Ford", // From log, row 437, Vercel: Ford
  "tflauto": "Chrysler", // From log, row 610, add generic Chrysler
  "toyotaknoxville": "Toyota",
  "toyotaofnewnan": "Toyota",
  "tracylangston": "Ford",
  "trilakesmotors": "Chrysler",
  "trustandrew": "Chrysler",
  "tsands": "Chrysler", // From log, row 600, add generic Chrysler
  "unionpark": "Honda",
  "valentiauto": "Chrysler",
  "vbacura": "Acura",
  "vicbaileyauto": "Chrysler",
  "victoryshallotte": "Chrysler",
  "vtaig": "Chrysler",
  "vwbrandon": "VW",
  "vscc": "Chrysler", // From log, row 379, add generic Chrysler
  "wagnermotors": "Chrysler",
  "westphalchevy": "Chevy",
  "wickmail": "Chrysler", // From log, row 191, add generic Chrysler
  "whiteplainsnissan": "Nissan",
  "woosterdodgejeep": "Chrysler",
  "worldwidevintageautos": "Chrysler",
  "youngerauto": "Chrysler",
   "vbacura": "Acura",
  "vicbaileyauto": "Chrysler",
  "victoryshallotte": "Chrysler",
  "vwbrandon": "VW",
  "vscc": "Chrysler", // From log, row 379, add generic Chrysler
  "wagnermotors": "Chrysler",
  "westphalchevy": "Chevy",
  "wickmail": "Chrysler", // From log, row 191, add generic Chrysler
  "whiteplainsnissan": "Nissan",
  "woosterdodgejeep": "Chrysler", // Jeep and Dodge are Chrysler brands
  "worldwidevintageautos": "Chrysler",
  "youngerauto": "Chrysler",
  "taylorchevy": "Chevy", // Verified: Taylor Chevrolet (web ID: 1)
  "mbofmemphis": "Mercedes", // M.B. clearly indicates Mercedes-Benz
  "acuracarland": "Acura", // Clearly Acura from domain
  "stokeshondacars": "Honda", // Clearly Honda from domain
  "lexusomaha": "Lexus", // Clearly Lexus from domain
  "hubcityford": "Ford", // Clearly Ford from domain
  "toyotaofcoolsprings": "Toyota", // Clearly Toyota from domain
  "lexusoftulsa": "Lexus", // Clearly Lexus from domain
  "bridgewaterchevy": "Chevy", // Clearly Chevy from domain
  "worthharley-davidson": "Harley-Davidson", // Clearly Harley-Davidson from domain
  "lexusoflincoln": "Lexus", // Clearly Lexus from domain
  "legendshonda": "Honda", // Clearly Honda from domain
  "stillmanvolvocars": "Volvo", // Clearly Volvo from domain
  "northshoretoyota": "Toyota", // Clearly Toyota from domain
  "everettchevy": "Chevy", // Clearly Chevy from domain
  "conyersnissan": "Nissan", // Clearly Nissan from domain
  "statelinesubaru": "Subaru", // Clearly Subaru from domain
  "herndonchevy": "Chevy", // Clearly Chevy from domain
  "toyotaofstamford": "Toyota", // Clearly Toyota from domain
  "franklinford": "Ford", // Clearly Ford from domain
  "murdockchev": "Chevy", // Clearly Chevy from domain
  "vanceford": "Ford", // Clearly Ford from domain
  "brynerchevy": "Chevy", // Clearly Chevy from domain
  "toyotaofwatertown": "Toyota", // Clearly Toyota from domain
  "loganvilleford": "Ford", // Clearly Ford from domain
  "clementford": "Ford", // Clearly Ford from domain
  "stokestoyotahiltonhead": "Toyota", // Clearly Toyota from domain
  "bluespringsford": "Ford", // Clearly Ford from domain
  "garyromehyundai": "Hyundai", // Clearly Hyundai from domain
  "reliablenissan": "Nissan", // Clearly Nissan from domain
  "tworiversford": "Ford", // Clearly Ford from domain
  "smarttoyotaqc": "Toyota", // Clearly Toyota from domain
  "raffertysubaru": "Subaru", // Clearly Subaru from domain
  "toyotaofcleveland": "Toyota", // Clearly Toyota from domain
  "sunmotorcars": "Mercedes", // Clearly Mercedes from domain
  "pinegarchevrolet": "Chevy", // Clearly Chevy from domain
  "minutemanvw": "VW", // Clearly VW from domain
  "redriverchevy": "Chevy", // Clearly Chevy from domain
  "pittstoyota": "Toyota", // Clearly Toyota from domain
  "pitrebuickgmc": "Buick", // Clearly Buick from domain
  "donthorntonvw": "VW", // Clearly VW from domain
  "lexusofneworleans": "Lexus", // Clearly Lexus from domain
  "teamhonda": "Honda", // Clearly Honda from domain
  "keffervw": "VW", // Clearly VW from domain
  "bmwofnorthhaven": "BMW", // Clearly BMW from domain
  "fordofwestmemphis": "Ford", // Clearly Ford from domain
  "vannyorktoyota": "Toyota", // Clearly Toyota from domain
  "idahohonda": "Honda", // Clearly Honda from domain
  "northpointcjd": "Chrysler", // Clearly Chrysler (CJD = Chrysler Jeep Dodge)
  "mbokc": "Mercedes", // M.B. clearly indicates Mercedes-Benz
  "gmofwv": "GM", // Clearly GM from domain
  "wolfchasehonda": "Honda", // Clearly Honda from domain
  "adventuresubaru": "Subaru", // Clearly Subaru from domain
  "wilsonvillesubaru": "Subaru", // Clearly Subaru from domain
  "tonydivinotoyota": "Toyota", // Clearly Toyota from domain
  "teamtoyota": "Toyota", // Clearly Toyota from domain
  "megelchevy": "Chevy", // Clearly Chevy from domain
  "beavertoninfiniti": "Infiniti", // Clearly Infiniti from domain
  "tetontoyota": "Toyota", // Clearly Toyota from domain
  "stamfordford": "Ford", // Clearly Ford from domain
  "twinpineford": "Ford", // Clearly Ford from domain
  "hugheshonda": "Honda", // Clearly Honda from domain
  "berteranissan": "Nissan", // Clearly Nissan from domain
  "lesonchevy": "Chevy", // Clearly Chevy from domain
  "lakenormaninfiniti": "Infiniti", // Clearly Infiniti from domain
  "springfieldhyundai": "Hyundai", // Clearly Hyundai from domain
  "unioncountykia": "Kia", // Clearly Kia from domain
  "appleford": "Ford", // Clearly Ford from domain
  "suntrupbuickgmc": "Buick", // Clearly Buick from domain
  "piazzahyundai": "Hyundai", // Clearly Hyundai from domain
  "olathedcj": "Chrysler", // Clearly Chrysler (DCJ = Dodge Chrysler Jeep)
  "hondaofwatertown": "Honda", // Clearly Honda from domain
  "jallentoyota": "Toyota", // Clearly Toyota from domain
  "route24auto": "Chrysler", // Route 24 Auto includes Chrysler Jeep Dodge (from previous list context)
  "sales": "Ford", // Clearly Ford from domain (fordlincolncharlotte)
  "paramuschevy": "Chevy", // Clearly Chevy from domain
  "hornekia": "Kia", // Clearly Kia from domain
  "libertysubaru": "Subaru", // Clearly Subaru from domain
  "cellaford": "Ford", // Clearly Ford from domain
  "okobojigmtoyota": "Toyota", // Clearly Toyota from domain
  "sandersonlincoln": "Lincoln", // Clearly Lincoln from domain
  "bmwofmurray": "BMW", // Clearly BMW from domain
  "airporthonda": "Honda", // Clearly Honda from domain
  "davisacura": "Acura", // Clearly Acura from domain
  "springfieldacura": "Acura", // Clearly Acura from domain
  "mercedesofbuckhead": "Mercedes", // Clearly Mercedes from domain
  "dyeranddyervolvo": "Volvo", // Clearly Volvo from domain
  "toyotasouthatlanta": "Toyota", // Clearly Toyota from domain
  "stonecresthonda": "Honda", // Clearly Honda from domain
  "highdeserthd": "Harley-Davidson", // Clearly Harley-Davidson from domain
  "hamptontoyota": "Toyota", // Clearly Toyota from domain
  "toyotaofnorthcharlotte": "Toyota", // Clearly Toyota from domain
  "infinitiofdenver": "Infiniti", // Clearly Infiniti from domain
  "lincolnoftroy": "Lincoln", // Clearly Lincoln from domain
  "coxtoyota": "Toyota", // Clearly Toyota from domain
  "johnwieseford": "Ford", // Clearly Ford from domain
  "washingtonchevy": "Chevy", // Clearly Chevy from domain
  "headquarternissan": "Nissan", // Clearly Nissan from domain
  "roweford": "Ford", // Clearly Ford from domain
  "hillsboroford": "Ford", // Clearly Ford from domain
  "corp": "Chevy", // Clearly Chevy from domain (shaheenchevrolet)
  "huntersvilleford": "Ford", // Clearly Ford from domain
  "rivertownford": "Ford", // Clearly Ford from domain
  "colonialhyundaipa": "Hyundai", // Clearly Hyundai from domain
  "thebestchevy": "Chevy", // Clearly Chevy from domain
  "gatewaykia": "Kia", // Clearly Kia from domain
  "northgeorgiatoyota": "Toyota", // Clearly Toyota from domain
  "townandcountrytoyota": "Toyota", // Clearly Toyota from domain
  "vwsouthcharlotte": "VW", // Clearly VW from domain
  "bochtoyotasouth": "Toyota", // Clearly Toyota from domain
  "pappastoyota": "Toyota", // Clearly Toyota from domain
  "oceanhonda": "Honda", // Clearly Honda from domain
  "stevewhitevwaudi": "VW", // Clearly VW from domain
  "brightonford": "Ford", // Clearly Ford from domain
  "jackmaddenford": "Ford", // Clearly Ford from domain
  "nissanofportland": "Nissan", // Clearly Nissan from domain
  "maplewoodtoyota": "Toyota", // Clearly Toyota from domain
  "mastriasubaru": "Subaru", // Clearly Subaru from domain
  "shultsford": "Ford", // Clearly Ford from domain
  "hawthornechevrolet": "Chevy", // Clearly Chevy from domain
  "billpagehonda": "Honda", // Clearly Honda from domain
  "aafordnj": "Ford", // Clearly Ford from domain
  "autohaus": "Mercedes", // Autohaus typically indicates Mercedes-Benz
  "prestigecadillac": "Cadillac", // Clearly Cadillac from domain
  "omahamercedes": "Mercedes", // Clearly Mercedes from domain
  "starlincoln": "Lincoln", // Clearly Lincoln from domain
  "jimsipalakia": "Kia", // Clearly Kia from domain
  "lexusofcherryhill": "Lexus", // Clearly Lexus from domain
  "cioccasubaru": "Subaru", // Clearly Subaru from domain
  "camelbacktoyota": "Toyota", // Clearly Toyota from domain
  "lindquistford": "Ford", // Clearly Ford from domain
  "subaruofmorristown": "Subaru", // Clearly Subaru from domain
  "hiltonheadhonda": "Honda", // Clearly Honda from domain
  "dorschfordkia": "Ford", // Clearly Ford from domain
  "precisionacura": "Acura", // Clearly Acura from domain
  "joycehonda": "Honda", // Clearly Honda from domain
  "piazzaacura": "Acura", // Clearly Acura from domain
  "fortmillhyundai": "Hyundai", // Clearly Hyundai from domain
  "diersford": "Ford", // Clearly Ford from domain
  "airportjeep": "Chrysler", // Jeep is a Chrysler brand
  "markjacobsontoyota": "Toyota", // Clearly Toyota from domain
  "route22honda": "Honda", // Clearly Honda from domain
  "prestigevolvo": "Volvo", // Clearly Volvo from domain
  "pinebeltcars": "Chrysler", // Pine Belt includes Chrysler Jeep Dodge (from previous list context)
  "bellaudi": "Audi", // Clearly Audi from domain
  "southerndevilhd": "Harley-Davidson", // Clearly Harley-Davidson from domain
  "campbellfordlincoln": "Ford", // Clearly Ford from domain
  "randallford": "Ford", // Clearly Ford from domain
  "butlertoyota": "Toyota", // Clearly Toyota from domain
  "avondaletoyota": "Toyota", // Clearly Toyota from domain
  "garnetford": "Ford", // Clearly Ford from domain
  "valdostatoyota": "Toyota", // Clearly Toyota from domain
  "charlestonkia": "Kia", // Clearly Kia from domain
  "kefferhyundai": "Hyundai", // Clearly Hyundai from domain
  "applegatechev": "Chevy", // Clearly Chevy from domain
  "millschevy": "Chevy", // Clearly Chevy from domain
  "deanhonda": "Honda", // Clearly Honda from domain
  "budweisermotors": "Chrysler", // Budweiser Motors includes Chrysler Jeep Dodge (from previous list context)
  "jimtaylorford": "Ford", // Clearly Ford from domain
  "roeschford": "Ford", // Clearly Ford from domain
  "nazarethford": "Ford", // Clearly Ford from domain
  "billutterford": "Ford", // Clearly Ford from domain
  "toycenford": "Ford", // Clearly Ford from domain
  "planetforddallas": "Ford", // Clearly Ford from domain
  "angelakrauseford": "Ford", // Clearly Ford from domain
  "nsford": "Ford", // Clearly Ford from domain
  "greatsouthhd": "Harley-Davidson", // Clearly Harley-Davidson from domain
  "myindyford": "Ford", // Clearly Ford from domain
  "hyundaicfl": "Hyundai", // Clearly Hyundai from domain
  "spford": "Ford", // Clearly Ford from domain
  "crestcadillactx": "Cadillac", // Clearly Cadillac from domain
  "mangoldford": "Ford", // Clearly Ford from domain
  "vwsaintaug": "VW", // Clearly VW from domain
  "boggusford": "Ford", // Clearly Ford from domain
  "dorianford": "Ford", // Clearly Ford from domain
  "allstarford": "Ford", // Clearly Ford from domain
  "machaikford": "Ford", // Clearly Ford from domain
  "bozardford": "Ford", // Clearly Ford from domain
  "midwaydodge": "Chrysler", // Dodge is a Chrysler brand
  "shamaleyford": "Ford", // Clearly Ford from domain
  "machaikchevy": "Chevy", // Clearly Chevy from domain
  "montrosefordnissan": "Ford", // Clearly Ford from domain
  "woodyandersonford": "Ford", // Clearly Ford from domain
  "northparklexus": "Lexus", // Clearly Lexus from domain
  "duvalford": "Ford", // Clearly Ford from domain
  "bkford": "Ford", // Clearly Ford from domain
  "infinitiofmelbourne": "Infiniti", // Clearly Infiniti from domain
  "fortcollinsnissan": "Nissan", // Clearly Nissan from domain
  "alsopchevrolet": "Chevy", // Clearly Chevy from domain
  "carouselnissan": "Nissan", // Clearly Nissan from domain
  "jaxcjd": "Chrysler", // Clearly Chrysler (CJD = Chrysler Jeep Dodge)
  "heritagechevy": "Chevy", // Clearly Chevy from domain
  "thecollection": "Porsche", // The Collection includes Porsche (verified from web ID: 2)
  "westonbuickgmc": "Buick", // Clearly Buick from domain
  "stanleysubaru": "Subaru", // Clearly Subaru from domain
  "putnamchrysler": "Chrysler", // Clearly Chrysler from domain
  "mbofscottsdale": "Mercedes", // M.B. clearly indicates Mercedes-Benz
  "lexusofhenderson": "Lexus", // Clearly Lexus from domain
  "bladechevy": "Chevy", // Clearly Chevy from domain
  "lovehonda": "Honda", // Clearly Honda from domain
  "blossomchevy": "Chevy", // Clearly Chevy from domain
  "npmazda": "Mazda", // Clearly Mazda from domain
  "myhudsonnissan": "Nissan", // Clearly Nissan from domain
  "classichonda": "Honda", // Clearly Honda from domain
  "toyotasunnyvale": "Toyota", // Clearly Toyota from domain
  "hondavillage": "Honda", // Clearly Honda from domain
  "fernandezhonda": "Honda", // Clearly Honda from domain
  "capitolchevy": "Chevy", // Clearly Chevy from domain
  "bronxhonda": "Honda", // Clearly Honda from domain
  "hondamarin": "Honda", // Clearly Honda from domain
  "premiersubaruoffremont": "Subaru", // Clearly Subaru from domain
  "audiofsmithtown": "Audi", // Clearly Audi from domain
  "beverlyhillsporsche": "Porsche", // Clearly Porsche from domain
  "sandschevrolet": "Chevy", // Clearly Chevy from domain
  "columbiahonda": "Honda", // Clearly Honda from domain
  "monumentchevrolet": "Chevy", // Clearly Chevy from domain
  "davischevrolet": "Chevy", // Clearly Chevy from domain
  "landroverdallas": "Land Rover", // Clearly Land Rover from domain
  "sussexhonda": "Honda", // Clearly Honda from domain
  "rockhonda": "Honda", // Clearly Honda from domain
  "getahonda": "Honda", // Clearly Honda from domain
  "valleyhonda": "Honda", // Clearly Honda from domain
  "flowershonda": "Honda", // Clearly Honda from domain
  "graingerhonda": "Honda", // Clearly Honda from domain
  "royalhonda": "Honda", // Clearly Honda from domain
  "bayouford": "Ford", // Clearly Ford from domain
  "tomwilliamsbmw": "BMW", // Clearly BMW from domain
  "lexusofglendale": "Lexus", // Clearly Lexus from domain
  "kenlyford": "Ford", // Clearly Ford from domain
  "olathetoyota": "Toyota", // Clearly Toyota from domain
  "kingsford": "Ford", // Clearly Ford from domain
  "auburntoyota": "Toyota", // Clearly Toyota from domain
  "hardeeford": "Ford", // Clearly Ford from domain
  "billkaynissan": "Nissan", // Clearly Nissan from domain
  "matthewsfordba": "Ford", // Clearly Ford from domain
  "countyford": "Ford", // Clearly Ford from domain
  "mackgrubbshyundai": "Hyundai", // Clearly Hyundai from domain
  "gpi": "BMW", // Clearly BMW from domain (bmwofcolumbia)
  "marinacura": "Acura", // Clearly Acura from domain
  "currytoyota": "Toyota", // Clearly Toyota from domain
  "infinitiofnaperville": "Infiniti", // Clearly Infiniti from domain
  "larsonford": "Ford", // Clearly Ford from domain
  "bmwofbrooklyn": "BMW", // Clearly BMW from domain
  "nissanofhendersonville": "Nissan", // Clearly Nissan from domain
  "qualitytoyota": "Toyota", // Clearly Toyota from domain
  "lakesideford": "Ford", // Clearly Ford from domain
  "arceneauxford": "Ford", // Clearly Ford from domain
  "oakridgenissan": "Nissan", // Clearly Nissan from domain
  "victorychevycharlotte": "Chevy", // Clearly Chevy from domain
  "smithtownacura": "Acura", // Clearly Acura from domain
  "epicchevrolet": "Chevy", // Clearly Chevy from domain
  "clarkchevrolet": "Chevy", // Clearly Chevy from domain
  "gillelandchevrolet": "Chevy", // Clearly Chevy from domain
  "bmwoffreeport": "BMW", // Clearly BMW from domain
  "averygreenehonda": "Honda", // Clearly Honda from domain
  "alamotoyota": "Toyota", // Clearly Toyota from domain
  "chevyofcolumbus": "Chevy", // Clearly Chevy from domain
  "rhodeschevy": "Chevy", // Clearly Chevy from domain
  "homerskeltonford": "Ford", // Clearly Ford from domain
  "rochestertoyota": "Toyota", // Clearly Toyota from domain
  "bmwofnashville": "BMW", // Clearly BMW from domain
  "kendalltoyota": "Toyota", // Clearly Toyota from domain
  "hondaofpasadena": "Honda", // Clearly Honda from domain
  "palmbayford": "Ford", // Clearly Ford from domain
  "hondaofgainesville": "Honda", // Clearly Honda from domain
  "racewayford": "Ford", // Clearly Ford from domain
  "planetford": "Ford", // Clearly Ford from domain
  "planethonda": "Honda", // Clearly Honda from domain
  "limbaughtoyota": "Toyota", // Clearly Toyota from domain
  "musiccityhonda": "Honda", // Clearly Honda from domain
  "gychevy": "Chevy", // Clearly Chevy from domain
  "marianoriverahonda": "Honda", // Clearly Honda from domain
  "subaruofcherryhill": "Subaru", // Clearly Subaru from domain
  "roswellinfiniti": "Infiniti", // Clearly Infiniti from domain
  "midwaymotors": "Ford", // Clearly Ford from domain (from previous list context)
  "bobbrownauto": "Chevy", // Bob Brown includes Chevrolet (from previous list context)
  "serrawhelan": "Chevy", // Serra includes Chevrolet (from previous list context)
  "serramontehonda": "Honda", // Clearly Honda from domain
  "bobjohnsonchevy": "Chevy", // Clearly Chevy from domain
  "marinechevy": "Chevy", // Clearly Chevy from domain
  "mikeandersonchevy": "Chevy", // Clearly Chevy from domain
  "lexusofroute10": "Lexus", // Clearly Lexus from domain
  "helfmanford": "Ford", // Clearly Ford from domain
  "porschesouthorlando": "Porsche", // Clearly Porsche from domain
  "lahondaworld": "Honda", // Clearly Honda from domain
  "toyotaofpullman": "Toyota", // Clearly Toyota from domain
  "route22honda": "Honda", // Clearly Honda from domain
  "newhollandauto": "Chrysler", // New Holland includes Chrysler (from previous list context)
  "gardenstatehonda": "Honda", // Clearly Honda from domain
  "fortbendtoyota": "Toyota", // Clearly Toyota from domain
  "joemahanford": "Ford", // Clearly Ford from domain
  "piazzamazda": "Mazda", // Clearly Mazda from domain
  "capitolfordnm": "Ford", // Clearly Ford from domain
  "a1toyota": "Toyota", // Clearly Toyota from domain
  "raabeford": "Ford", // Clearly Ford from domain
  "freewaytoyota": "Toyota", // Clearly Toyota from domain
  "billbrandtford": "Ford", // Clearly Ford from domain
  "toyotaofbrookhaven": "Toyota", // Clearly Toyota from domain
  "94nissan": "Nissan", // Clearly Nissan from domain
  "roberthorneford": "Ford", // Clearly Ford from domain
  "coconutpointford": "Ford", // Clearly Ford from domain
  "drivebedford": "Ford", // Clearly Ford from domain (from previous list context)
  "rhinelandergm": "GM", // Clearly GM from domain
  "bobsmithtoyota": "Toyota", // Clearly Toyota from domain
  "johnsoncityford": "Ford", // Clearly Ford from domain
  "donhindsford": "Ford", // Clearly Ford from domain
  "palmcoastford": "Ford", // Clearly Ford from domain
  "cartersubaru": "Subaru", // Clearly Subaru from domain
  "midwayfordmiami": "Ford", // Clearly Ford from domain
  "kainford": "Ford", // Clearly Ford from domain
  "northcentralford": "Ford", // Clearly Ford from domain
  "rayvarnerford": "Ford", // Clearly Ford from domain
  "friendlyhondacuse": "Honda", // Clearly Honda from domain
  "piazzahonda": "Honda", // Clearly Honda from domain
  "lexusoftacoma": "Lexus", // Clearly Lexus from domain
  "chuckolsonchev": "Chevy", // Clearly Chevy from domain
  "bmwwest": "BMW", // Clearly BMW from domain
  "hondaoftomsriver": "Honda", // Clearly Honda from domain
  "gaudinford": "Ford", // Clearly Ford from domain
  "toyotaofnaperville": "Toyota", // Clearly Toyota from domain
  "bobtomesford": "Ford", // Clearly Ford from domain
  "bmwofmontgomery": "BMW", // Clearly BMW from domain
  "toyotaofseattle": "Toyota", // Clearly Toyota from domain
  "pinesford": "Ford", // Clearly Ford from domain
  "mikeerdmantoyota": "Toyota", // Clearly Toyota from domain
  "mikecalverttoyota": "Toyota", // Clearly Toyota from domain
  "serrachampaign": "Chrysler", // Serra includes Chrysler (from previous list context)
  "bevsmithtoyota": "Toyota", // Clearly Toyota from domain
  "patmillikenford": "Ford", // Clearly Ford from domain
  "siouxfallsford": "Ford", // Clearly Ford from domain
  "gusmachadoford": "Ford", // Clearly Ford from domain
  "borgmanfordmazda": "Ford", // Clearly Ford from domain
  "hyundaicityny": "Hyundai", // Clearly Hyundai from domain
  "parkwaytoyotaboston": "Toyota", // Clearly Toyota from domain
  "teamtoyotaon41": "Toyota", // Clearly Toyota from domain
  "victorytoyotacanton": "Toyota", // Clearly Toyota from domain
  "toyotaofdecatur": "Toyota", // Clearly Toyota from domain
  "nissankendall": "Nissan", // Clearly Nissan from domain
  "toyotaofhermiston": "Toyota", // Clearly Toyota from domain
  "siouxcityford": "Ford", // Clearly Ford from domain
  "brinsonford": "Ford", // Clearly Ford from domain
  "riveratoyota": "Toyota", // Clearly Toyota from domain
  "actontoyota": "Toyota", // Clearly Toyota from domain
  "rodmanford": "Ford", // Clearly Ford from domain
  "toyotaofelcajon": "Toyota", // Clearly Toyota from domain
  "colonialtoyotact": "Toyota", // Clearly Toyota from domain
  "bramanhondapb": "Honda", // Clearly Honda from domain
  "hondaoflisle": "Honda", // Clearly Honda from domain
  "fordnashville": "Ford", // Clearly Ford from domain
  "postoaktoyota": "Toyota", // Clearly Toyota from domain
  "bennaford": "Ford", // Clearly Ford from domain
  "subaruworldnewton": "Subaru", // Clearly Subaru from domain
  "lascoford": "Ford", // Clearly Ford from domain
  "serrafordfh": "Ford", // Clearly Ford from domain
  "pacifichonda": "Honda", // Clearly Honda from domain
  "morristownchevrolet": "Chevy", // Clearly Chevy from domain
  "deanhyundai": "Hyundai" // Clearly Hyundai from domain (deanhyundai.edealerhub)
};

// Winston logger setup
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Robust tokenization function
function tokenizeDomain(domain) {
  if (!domain) {
    logger.warn("Domain is undefined or empty", { timestamp: new Date().toISOString() });
    return ["none"];
  }
  const tokens = domain.toLowerCase().replace(/\..*$/, "").split(/[^a-z0-9]/);
  const brandTokens = [];
  for (const token of tokens) {
    for (const [brand, aliases] of Object.entries(brandAliases)) {
      if (aliases.includes(token)) {
        brandTokens.push(brand.toLowerCase());
      }
    }
  }
  return brandTokens.length > 0 ? brandTokens : tokens.filter(t => !["auto", "cars", "deal", "group", "metro"].includes(t)) || ["none"];
}

export default async function handler(req, res) {
  logger.info("Endpoint /api/getcarbrands hit successfully", { timestamp: new Date().toISOString() });

  // Validate request
  if (req.method !== "POST" || !req.body.domain) {
    logger.error(`Invalid request: Method=${req.method}, Domain=${req.body.domain || "missing"}`, { timestamp: new Date().toISOString() });
    return res.status(400).json({ error: "Invalid request: POST method with domain in body required" });
  }

  // Extract and sanitize inputs
  const domain = req.body.domain.toLowerCase().trim();
  const tokens = req.body.tokens && Array.isArray(req.body.tokens) ? req.body.tokens : tokenizeDomain(domain);
  const companyName = req.body.companyName || "unknown"; // Use companyName from GAS payload

  logger.info(`Processing domain: ${domain}`, { timestamp: new Date().toISOString() });
  logger.info(`Domain tokens: ${JSON.stringify(tokens)}`, { timestamp: new Date().toISOString() });
  logger.info(`Company name: ${companyName}`, { timestamp: new Date().toISOString() });

  try {
    // Step 1: Check domain tokens for direct brand match (local fallback)
    let primaryBrand = null;
    let confidence = 0;
    for (const token of tokens) {
      for (const [brand, aliases] of Object.entries(brandAliases)) {
        if (aliases.includes(token.toLowerCase())) {
          primaryBrand = brand.toLowerCase();
          confidence = 90;
          logger.info(`Token-based match for domain ${domain}: ${primaryBrand} (Confidence: ${confidence}%)`, { timestamp: new Date().toISOString() });
          break;
        }
      }
      if (primaryBrand) break;
    }

    // Step 2: Known Dealerships Lookup
    if (!primaryBrand) {
      const dealership = domain.replace(/\..*$/, "");
      if (knownDealerships[dealership]) {
        primaryBrand = knownDealerships[dealership].toLowerCase();
        confidence = 95;
        logger.info(`Known dealership match for domain ${domain}: ${primaryBrand} (Confidence: ${confidence}%)`, { timestamp: new Date().toISOString() });
      }
    }

    // Step 3: Company Name Analysis
    if (!primaryBrand && companyName !== "unknown") {
      const companyLower = companyName.toLowerCase();
      for (const brand of CAR_BRANDS) {
        if (companyLower.includes(brand.toLowerCase())) {
          primaryBrand = brand.toLowerCase();
          confidence = 85;
          logger.info(`Company name match for domain ${domain}: ${primaryBrand} (Confidence: ${confidence}%)`, { timestamp: new Date().toISOString() });
          break;
        }
      }
    }

    // Step 4: OpenAI Fallback if no direct match
    if (!primaryBrand) {
      const prompt = `Identify the primary car brand sold by the dealership for the domain "${domain}" with tokens [${tokens.join(", ")}] and company name "${companyName}". Follow these steps to ensure accuracy, exhaust all public sources, and avoid incorrect brand assignments:

1. **Token Analysis**: Check tokens for explicit brand names or aliases (e.g., "honda" in "unionparkhonda.com" → Honda, "chevy" in "gychevy.com" → Chevy). Use brand aliases: ${JSON.stringify(brandAliases)}. Prioritize exact or alias matches. Ignore generic terms like "auto," "cars," "deal," "group," "metro."

2. **Known Dealerships Lookup**: Check the knownDealerships mapping: ${JSON.stringify(knownDealerships)}. For example, "tedbritt.com" → Ford, "masano.com" → Toyota, "westherr.com" → Ford, "sheehy.com" → Ford, "frankleta.com" → Honda.

3. **Company Name Analysis**: If no match in tokens or knownDealerships, check the company name "${companyName}" for explicit brand names or aliases (e.g., "Masano Toyota" → Toyota). Prioritize exact or alias matches.

4. **Public Source Verification**: If no match in tokens, knownDealerships, or company name, exhaustively check public sources to identify the primary brand:
   - Visit the dealership's website using variations (e.g., "https://${domain}", "https://www.${domain}", "http://${domain}") and analyze the homepage, inventory, "About Us," or branding for the most prominent brand.
   - Search recent X posts mentioning the dealership or company name (e.g., "@${domain.replace(/\..*$/, "")}", "${companyName}") for brand references.
   - Query industry listings and review sites (e.g., Cars.com, DealerRater, Edmunds, AutoTrader) for the dealership’s primary brand, cross-referencing "${companyName}" (e.g., "Masano Auto" → Toyota).
   - If initial website attempts fail, retry with alternative URLs or search for the dealership via Google (e.g., "${companyName} car dealership").

5. **Multi-Brand Dealerships**: If multiple brands are sold, select the primary brand based on:
   - Prominence on the website (e.g., logo, main inventory, URL emphasis).
   - Frequency and context in X posts or industry listings.
   - Explicit association with the company name (e.g., "Ted Britt" → Ford for prominence).
   Examples: "penskeautomotive.com" → Chevy, "mclartydaniel.com" → Chrysler, "tedbritt.com" → Ford.

6. **Non-Dealership Check**: If the domain is not a car dealership (e.g., real estate, media, equipment), return "unknown". Examples: "exprealty.com" → unknown (real estate), "wickmail.com" → unknown (email service), "centurytrucks.com" → unknown (truck equipment).

7. **Accuracy and Exhaustion**: Only assign a brand if explicitly verified through tokens, knownDealerships, company name, or public sources. Do not guess or assume brands (e.g., do not assign "Chevy" to Buick/GMC dealers unless Chevrolet is confirmed primary). If no clear primary brand is found after exhausting all sources, return "unknown". Log verification challenges (e.g., inaccessible website, ambiguous branding) for review.

8. **Error Handling**: If inputs are missing (e.g., undefined tokens, empty companyName), proceed to public source verification. If API errors occur (e.g., rate limits, timeouts), suggest retrying after a delay. Do not fail silently.

Respond with only the verified brand name (e.g., Toyota, Chevy) or "unknown". Shorten "Chevrolet" to "Chevy". Ensure the brand is in: ${CAR_BRANDS.join(", ")}. Use exact capitalization (e.g., "Honda", not "honda").`;

      // Log prompt and options for debugging
      logger.info(`Prompt for OpenAI: ${prompt.substring(0, 500)}...`, { timestamp: new Date().toISOString() });
      logger.info(`OpenAI options: ${JSON.stringify({ model: "gpt-4-turbo", max_tokens: 10, temperature: 0.3, systemMessage: "Respond with only the car brand name or 'unknown', nothing else.", retries: 3, timeoutMs: 45000, backoffMs: 2000 })}`, { timestamp: new Date().toISOString() });

      // Validate prompt
      if (typeof prompt !== "string") {
        logger.error(`Invalid prompt type for domain ${domain}: ${typeof prompt}, value: ${JSON.stringify(prompt)}`, { timestamp: new Date().toISOString() });
        return res.status(500).json({ error: "Invalid prompt format" });
      }

      const openAIResult = await callOpenAI({
        prompt,
        model: "gpt-4-turbo",
        max_tokens: 10,
        temperature: 0.3,
        systemMessage: "Respond with only the car brand name or 'unknown', nothing else.",
        retries: 3,
        timeoutMs: 45000,
        backoffMs: 2000
      });

      if (openAIResult.error) {
        logger.error(`OpenAI error for domain ${domain}: ${openAIResult.error}`, { timestamp: new Date().toISOString() });
        primaryBrand = knownDealerships[domain.replace(/\..*$/, "")] || "unknown";
        confidence = primaryBrand === "unknown" ? 50 : 95;
      } else {
        const brand = openAIResult.output.trim().toLowerCase();
        logger.info(`OpenAI response for domain ${domain}: ${brand}`, { timestamp: new Date().toISOString() });
        if (CAR_BRANDS.map(b => b.toLowerCase()).includes(brand)) {
          primaryBrand = brand;
          confidence = brand === "unknown" ? 50 : 95;
        } else {
          primaryBrand = BRAND_MAPPING[brand] ? BRAND_MAPPING[brand].toLowerCase() : "unknown";
          confidence = primaryBrand === "unknown" ? 50 : 95;
        }
      }
    }

    // Finalize response
    if (primaryBrand && confidence >= 50 && primaryBrand !== "unknown") {
      const standardizedBrand = CAR_BRANDS.find(b => b.toLowerCase() === primaryBrand) || 
        primaryBrand.charAt(0).toUpperCase() + primaryBrand.slice(1).toLowerCase();
      logger.info(`Brand match found for domain ${domain}: ${standardizedBrand} (Confidence: ${confidence}%)`, { timestamp: new Date().toISOString() });
      return res.status(200).json({ brand: standardizedBrand, confidence });
    }

    logger.info(`No brand match for domain ${domain} (Confidence: ${confidence}%)`, { timestamp: new Date().toISOString() });
    return res.status(200).json({ brand: "unknown", confidence });
  } catch (error) {
    logger.error(`Error processing domain ${domain}: ${error.message}`, { timestamp: new Date().toISOString() });
    return res.status(500).json({ error: `Failed to process domain: ${error.message}` });
  }
}
