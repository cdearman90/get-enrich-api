// lib/humanize.js
const COMMON_WORDS = [
  "llc", "inc", "corporation", "corp",
  "plaza", "superstore", "mall", "center", "group", "dealership", "sales",
  "auto", "motors", "motor", "automotive", "shop",
  "classic", "prime", "elite", "premier", "luxury", "select", "pro", "top", "best", "first", "great", "new", "used"
];

const CAR_BRANDS = [
  "ford", "toyota", "bmw", "chevrolet", "gmc", "lexus", "mercedes", "benz",
  "honda", "nissan", "hyundai", "kia", "volkswagen", "audi", "porsche", "subaru"
];

const KNOWN_PROPER_NOUNS = [
  "athens", "crossroads", "dallas", "houston", "paris", "memphis", "nashville"
];

const KNOWN_CITIES_SET = new Set([]); // Excluded for brevity

const normalizeText = (name) => {
  if (!name || typeof name !== "string") return [];
  return name
    .replace(/['".,-]+/g, '')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(word => word);
};

const capitalizeName = (words) => {
  return words
    .map((word, i) => {
      if (["of", "the", "to"].includes(word.toLowerCase()) && i !== 0) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ")
    .replace(/Mccarthy/g, "McCarthy")
    .replace(/Mclarty/g, "McLarty");
};

const extractDomainWords = (domain) => {
  let base = domain.replace(/\.com$/, '');
  let words = base.split(/([a-z])([A-Z])/g).filter(word => word && !COMMON_WORDS.includes(word.toLowerCase()));
  if (words.length === 1) {
    let word = words[0];
    for (let brand of CAR_BRANDS) {
      if (word.toLowerCase().includes(brand)) {
        words = word.toLowerCase().split(brand).filter(w => w);
        break;
      }
    }
  }
  return words;
};

const containsCarBrand = (name) => {
  const nameLower = name.toLowerCase();
  return CAR_BRANDS.some(brand => nameLower === brand || nameLower.includes(brand));
};

const removeCarBrands = (words) => {
  const result = [];
  for (let word of words) {
    let cleanedWord = word.toLowerCase();
    let foundBrand = false;
    for (let brand of CAR_BRANDS) {
      if (cleanedWord.includes(brand)) {
        cleanedWord = cleanedWord.replace(brand, "").trim();
        foundBrand = true;
      }
    }
    if (cleanedWord && !foundBrand) {
      result.push(word);
    } else if (cleanedWord) {
      result.push(cleanedWord);
    }
  }
  return result;
};

const fitsPossessive = (name) => {
  const lastWord = name.split(/\s+/).pop().toLowerCase();
  return !["motors", "sales", "auto"].includes(lastWord);
};

const endsWithS = (name) => {
  return name.toLowerCase().endsWith("s");
};

const isPossessiveFriendly = (name) => {
  const nameLower = name.toLowerCase();
  return !/^[A-Z]{2,5}$/.test(name) && // Not all uppercase
         !nameLower.endsWith("group") && // Avoid "Group" endings
         !nameLower.endsWith("auto") && // Avoid "Auto" endings
         name.split(/\s+/).length >= 2; // Prefer multi-word names
};

const isProperName = (words) => {
  if (words.length === 2) {
    return words.every(word => /^[A-Z][a-z]+$/.test(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()));
  }
  return false;
};

const isPossibleAbbreviation = (word) => {
  const wordLower = word.toLowerCase();
  return /^[A-Z]{2,5}$/.test(word) || // All uppercase, 2-5 characters
         wordLower.length <= 5 || // Short length
         wordLower.startsWith("mb") || // Known Mercedes-Benz abbreviation
         wordLower.includes("bhm"); // Known Birmingham abbreviation
};

const computeConfidenceScore = (name, domain, flags) => {
  try {
    let score = 50;
    const domainWords = extractDomainWords(domain).map(w => w.toLowerCase());
    const nameWords = name.toLowerCase().split(/\s+/);

    const domainBase = domain.replace(/\.com$/, "").toLowerCase();
    const nameLower = name.toLowerCase();
    const matchesDomain = domainWords.some(dw => nameWords.some(nw => nw.includes(dw) && nw.length > 3));
    const isDomainMatch = nameLower === domainBase;
    const hasCarBrand = containsCarBrand(name);
    const allCommonWords = nameWords.every(word => COMMON_WORDS.includes(word));
    const isGenericWithCarBrand = domainWords.length === 2 && 
                                 domainWords.some(word => CAR_BRANDS.includes(word)) && 
                                 domainWords.some(word => COMMON_WORDS.includes(word));

    if (matchesDomain && !isDomainMatch) score += 30;
    if (isDomainMatch && hasCarBrand) score -= 20;
    if (isGenericWithCarBrand && hasCarBrand) score += 20;
    if (nameWords.length === 1) score -= 20;
    else if (nameWords.length === 2) score += 10;
    else if (nameWords.length > 3) score -= 10;
    if (!hasCarBrand) score += 10;
    if (fitsPossessive(name)) score += 10;
    if (allCommonWords) score -= 30;

    if (flags.includes("TooGeneric")) score -= 40;
    if (flags.includes("PossibleAbbreviation")) score -= 30;
    if (flags.includes("Unexpanded")) score -= 10;
    if (flags.includes("BrandIncluded")) score -= 40;
    if (flags.includes("PossessiveAmbiguity")) score -= 20;
    if (flags.includes("CityNameOnly")) score -= 40;
    if (flags.includes("NotPossessiveFriendly")) score -= 20;

    if (isProperName(nameWords)) score += 20;

    return Math.max(10, Math.min(100, score));
  } catch (err) {
    console.error(`Error in computeConfidenceScore for domain ${domain}: ${err.message}`);
    return 0;
  }
};

export const humanizeName = (inputName, domain) => {
  try {
    let words = normalizeText(inputName || domain);
    console.log(`Before brand removal for ${domain}: ${words.join(" ")}`);
    const originalWords = [...words];
    words = removeCarBrands(words);
    console.log(`After brand removal for ${domain}: ${words.join(" ")}`);

    words = words.filter(word => word.length > 2 || /^[A-Z]{2,}$/.test(word));
    if (words.length > 3) words = words.slice(0, 3);
    if (words.length === 0) words = extractDomainWords(domain).slice(0, 2);

    let name = capitalizeName(words);
    if (!name) {
      name = capitalizeName(extractDomainWords(domain).slice(0, 2));
    }
    const flags = [];

    const nameLower = name.toLowerCase();
    const isGenericWithCarBrand = originalWords.length === 2 && 
                                 originalWords.some(word => CAR_BRANDS.includes(word.toLowerCase())) && 
                                 originalWords.some(word => COMMON_WORDS.includes(word.toLowerCase()));
    if (words.length === 1 && (words[0].length <= 4 || COMMON_WORDS.includes(words[0].toLowerCase())) && !isGenericWithCarBrand) {
      flags.push("TooGeneric");
    }
    if (words.every(word => COMMON_WORDS.includes(word.toLowerCase())) && !isGenericWithCarBrand) {
      flags.push("TooGeneric");
    }
    if (words.some(isPossibleAbbreviation)) flags.push("PossibleAbbreviation");
    if (/^[A-Z]{2,}$/.test(words[0])) flags.push("Unexpanded");
    if (containsCarBrand(name) || originalWords.some(word => CAR_BRANDS.includes(word.toLowerCase()))) {
      flags.push("BrandIncluded");
    }
    if (endsWithS(name) && !KNOWN_PROPER_NOUNS.includes(nameLower)) flags.push("PossessiveAmbiguity");
    if (words.length === 1 && KNOWN_CITIES_SET.has(nameLower)) {
      flags.push("CityNameOnly");
    } else if (words.length === 2 && KNOWN_CITIES_SET.has(words.join(" ").toLowerCase())) {
      flags.push("CityNameOnly");
    }
    if (!isPossessiveFriendly(name)) flags.push("NotPossessiveFriendly");

    let confidenceScore = computeConfidenceScore(name, domain, flags);
    if (isProperName(words)) confidenceScore += 20;
    return { name, confidenceScore, flags };
  } catch (err) {
    console.error(`Error in humanizeName for domain ${domain}: ${err.message}`);
    return { name: "", confidenceScore: 0, flags: ["ProcessingError"] };
  }
};
