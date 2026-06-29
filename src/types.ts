export interface IndustrialCategory {
  id: string;
  keyword: string; // คำสำคัญหลัก (Keyword)
  categoryName: string; // ประเภทอุตสาหกรรม (Category) (e.g. "อุตสาหกรรมยานยนต์สมัยใหม่")
  targetIndustry?: string; // อุตสาหกรรมเป้าหมาย (e.g. "First S-curve" or "New S-curve")
  majorCategory?: string; // ประเภทอุตสาหกรรมหมวดใหญ่ (e.g. "การผลิต (Manufacturing)")
  subCategoryCode?: string; // หมวดย่อย (e.g. "29", "30")
  subCategory?: string; // ประเภทอุตสาหกรรม/ธุรกิจ ที่รองรับ ( ประเภทอุตสาหกรรมหมวดย่อย )
  updatedBy?: string; // admin email
  updatedAt: number; // timestamp in ms
}

export interface AdminProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: "admin";
  createdAt: number; // timestamp in ms
}

export interface UserClassificationResult {
  inputText: string;
  matchedKeyword: string;
  matchedCategory: string;
  matchedTargetIndustry?: string;
  matchedMajorCategory?: string;
  matchedSubCategoryCode?: string;
  matchedSubCategory?: string;
  isCustomFallback?: boolean; // if match wasn't direct, did we categorize it using intelligent matching?
  confidence: "High" | "Medium" | "Low" | "Not Found";
}
