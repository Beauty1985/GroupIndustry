import { IndustrialCategory, UserClassificationResult } from "./types";

/**
 * Classifies an input description text into an industrial category using a keyword database.
 */
export function classifyIndustry(
  inputText: string,
  categories: IndustrialCategory[]
): UserClassificationResult {
  const normalizedInput = inputText.trim();
  if (!normalizedInput) {
    return {
      inputText,
      matchedKeyword: "-",
      matchedCategory: "ไม่พบประเภท (ข้อมูลว่าง)",
      confidence: "Not Found",
    };
  }

  // 1. Direct longest-match substring strategy.
  // We look for any keyword in the DB that is fully contained in the user's input text.
  // We sort keywords by length descending so that more specific phrases are matched first.
  const substringMatches = categories
    .filter((cat) => {
      const kw = cat.keyword.toLowerCase().trim();
      return normalizedInput.toLowerCase().includes(kw);
    })
    .sort((a, b) => b.keyword.length - a.keyword.length);

  if (substringMatches.length > 0) {
    const bestMatch = substringMatches[0];
    return {
      inputText,
      matchedKeyword: bestMatch.keyword,
      matchedCategory: bestMatch.categoryName,
      matchedTargetIndustry: bestMatch.targetIndustry,
      matchedMajorCategory: bestMatch.majorCategory,
      matchedSubCategoryCode: bestMatch.subCategoryCode,
      matchedSubCategory: bestMatch.subCategory,
      confidence: "High",
    };
  }

  // 2. Token/Word-based similarity matching (Medium confidence)
  // Split the input by whitespace, punctuation, or common Thai delimiters.
  const tokens = normalizedInput
    .toLowerCase()
    .split(/[\s,，、/\\|\-]+/)
    .filter((t) => t.length > 1);

  for (const token of tokens) {
    // See if any category keyword is contained in this token or vice-versa
    const tokenMatches = categories.filter((cat) => {
      const kw = (cat.keyword || "").toLowerCase().trim();
      return kw && (kw.includes(token) || token.includes(kw));
    });

    if (tokenMatches.length > 0) {
      // Sort by keyword length
      tokenMatches.sort((a, b) => (b.keyword || "").length - (a.keyword || "").length);
      const bestMatch = tokenMatches[0];
      return {
        inputText,
        matchedKeyword: bestMatch.keyword,
        matchedCategory: bestMatch.categoryName,
        matchedTargetIndustry: bestMatch.targetIndustry,
        matchedMajorCategory: bestMatch.majorCategory,
        matchedSubCategoryCode: bestMatch.subCategoryCode,
        matchedSubCategory: bestMatch.subCategory,
        isCustomFallback: true,
        confidence: "Medium",
      };
    }
  }

  // 3. Fallback character-level substring matching (Low confidence)
  // Check if any keyword shares at least 4 common characters with the input
  let bestLowMatch: IndustrialCategory | null = null;
  let bestScore = 0;

  for (const cat of categories) {
    const kw = (cat.keyword || "").toLowerCase().trim();
    if (!kw) continue;
    // Simple overlap of characters
    let commonChars = 0;
    const kwSet = new Set(kw.split(""));
    for (const char of normalizedInput.toLowerCase()) {
      if (kwSet.has(char)) {
        commonChars++;
      }
    }
    const score = commonChars / kw.length;
    if (score > 0.6 && score > bestScore) {
      bestScore = score;
      bestLowMatch = cat;
    }
  }

  if (bestLowMatch && bestScore > 0.7) {
    return {
      inputText,
      matchedKeyword: bestLowMatch.keyword,
      matchedCategory: bestLowMatch.categoryName,
      matchedTargetIndustry: bestLowMatch.targetIndustry,
      matchedMajorCategory: bestLowMatch.majorCategory,
      matchedSubCategoryCode: bestLowMatch.subCategoryCode,
      matchedSubCategory: bestLowMatch.subCategory,
      isCustomFallback: true,
      confidence: "Low",
    };
  }

  // 4. Default Not Found
  return {
    inputText,
    matchedKeyword: "-",
    matchedCategory: "อุตสาหกรรมทั่วไป (ไม่พบประเภทที่จับคู่ได้โดยตรง)",
    matchedSubCategory: "โปรดติดต่อผู้ดูแลระบบเพื่อเพิ่มคำสำคัญนี้",
    confidence: "Not Found",
  };
}

/**
 * Parses CSV or plain text lines, classifies each line, and returns results.
 */
export function classifyBatch(
  lines: string[],
  categories: IndustrialCategory[]
): UserClassificationResult[] {
  return lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => classifyIndustry(line, categories));
}
