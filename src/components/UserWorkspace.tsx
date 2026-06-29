import React, { useState, useRef } from "react";
import { 
  Search, Upload, FileSpreadsheet, Download, RefreshCw, 
  CheckCircle, AlertCircle, HelpCircle, ArrowRight, ListFilter, Trash2, Play,
  TrendingUp, Rocket, Layers, ChevronDown, ChevronUp, Database
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import { IndustrialCategory, UserClassificationResult } from "../types";
import { classifyIndustry, classifyBatch } from "../matchHelper";

interface UserWorkspaceProps {
  categories: IndustrialCategory[];
}

const SAMPLE_INPUTS = [
  "โรงงานผลิตประกอบรถยนต์และชิ้นส่วนอะไหล่แท้",
  "ร้านจำหน่ายเค้ก คุกกี้ และเบเกอรี่โฮมเมดทุกประเภท",
  "วิสาหกรรมชุมชนแปรรูปทุเรียน ทุเรียนทอด และผลไม้อบแห้ง",
  "บริษัทผลิตสายไฟและขั้วต่อแผงวงจรอิเล็กทรอนิกส์ส่งออก",
  "โรงงานผลิตปูนซีเมนต์สำเร็จรูปสำหรับงานโครงสร้างขนาดใหญ่",
  "วิสาหกิจชุมชนต้มยาสมุนไพรและผลิตหน้ากากอนามัยป้องกันโรค"
];

const DIRECTORY_INDUSTRIES = [
  // --- First S-Curve ---
  {
    name: "อุตสาหกรรมยานยนต์สมัยใหม่",
    group: "First S-curve",
    subcategoriesCount: 1,
    businessesCount: 2,
    subcategories: ["ยานยนต์ไฟฟ้าและชิ้นส่วนอะไหล่ประสิทธิภาพสูง"],
    keywords: ["รถยนต์ไฟฟ้า", "EV", "แบตเตอรี่ยานยนต์ไฟฟ้า", "มอเตอร์ไฟฟ้า", "สถานีชาร์จรถยนต์ไฟฟ้า", "ชิ้นส่วนยานยนต์สมัยใหม่", "ประกอบรถยนต์", "อะไหล่รถยนต์", "ยางรถยนต์"],
    icon: "trending-up"
  },
  {
    name: "อุตสาหกรรมอิเล็กทรอนิกส์อัจฉริยะ",
    group: "First S-curve",
    subcategoriesCount: 2,
    businessesCount: 3,
    subcategories: ["ระบบอิเล็กทรอนิกส์อัจฉริยะ", "เซมิคอนดักเตอร์และชิ้นส่วนอิเล็กทรอนิกส์ต้นน้ำ"],
    keywords: ["ไมโครชิป", "แผงวงจรพิมพ์", "เซ็นเซอร์อัจฉริยะ", "ไอโอที", "IoT", "สมาร์ทโฮม", "ระบบสมองกลฝังตัว", "แผ่นเวเฟอร์", "เซมิคอนดักเตอร์"],
    icon: "trending-up"
  },
  {
    name: "อุตสาหกรรมการเกษตรและเทคโนโลยีชีวภาพ",
    group: "First S-curve",
    subcategoriesCount: 1,
    businessesCount: 3,
    subcategories: ["เทคโนโลยีชีวภาพและการเกษตรแม่นยำ"],
    keywords: ["เกษตรแม่นยำ", "ปรับปรุงพันธุ์พืช", "ปุ๋ยชีวภาพ", "สารสกัดจากธรรมชาติ", "จุลินทรีย์", "เกษตรอัจฉริยะ", "เพาะเลี้ยงเนื้อเยื่อ", "โรงเรือนอัจฉริยะ"],
    icon: "trending-up"
  },
  {
    name: "อุตสาหกรรมการแปรรูปอาหาร",
    group: "First S-curve",
    subcategoriesCount: 1,
    businessesCount: 2,
    subcategories: ["อาหารแปรรูปและอาหารอนาคตมูลค่าสูง"],
    keywords: ["อาหารเพื่อสุขภาพ", "โปรตีนจากพืช", "อาหารอนาคต", "แปรรูปผลไม้", "อาหารแช่แข็ง", "อาหารกระป๋อง", "เบเกอรี่", "น้ำผลไม้", "เครื่องดื่มบำรุงสุขภาพ"],
    icon: "trending-up"
  },
  {
    name: "อุตสาหกรรมท่องเที่ยวกลุ่มรายได้ดีและการท่องเที่ยวเชิงสุขภาพ",
    group: "First S-curve",
    subcategoriesCount: 4,
    businessesCount: 8,
    subcategories: ["การท่องเที่ยวเชิงการแพทย์", "เวลเนสรีสอร์ทและสปา", "การท่องเที่ยวเชิงวัฒนธรรมและธรรมชาติ", "ธุรกิจเรือสำราญเพื่อการท่องเที่ยว"],
    keywords: ["สปาเพื่อสุขภาพ", "โฮมสเตย์เชิงอนุรักษ์", "ท่องเที่ยวเชิงการแพทย์", "ล่องเรือสำราญ", "รีสอร์ทสุขภาพ", "การท่องเที่ยวเชิงวัฒนธรรม", "เวลเนส", "Wellness"],
    icon: "trending-up"
  },

  // --- New S-Curve ---
  {
    name: "อุตสาหกรรมหุ่นยนต์เพื่อการอุตสาหกรรม",
    group: "New S-curve",
    subcategoriesCount: 1,
    businessesCount: 2,
    subcategories: ["ระบบอัตโนมัติและระบบหุ่นยนต์ช่วยผลิต"],
    keywords: ["แขนกล", "หุ่นยนต์อุตสาหกรรม", "ระบบอัตโนมัติ", "Automation", "AGV", "หุ่นยนต์ลำเลียง", "เครื่องจักรกลอัตโนมัติ", "ระบบสายพานอัจฉริยะ", "นิวเมติกส์"],
    icon: "rocket"
  },
  {
    name: "อุตสาหกรรมการบินและโลจิสติกส์",
    group: "New S-curve",
    subcategoriesCount: 1,
    businessesCount: 5,
    subcategories: ["ศูนย์ซ่อมบำรุงอากาศยานและการขนส่งเชิงพาณิชย์"],
    keywords: ["ศูนย์ซ่อมบำรุงอากาศยาน", "ชิ้นส่วนเครื่องบิน", "คลังสินค้าอัจฉริยะ", "การขนส่งทางอากาศ", "โดรนเพื่อการขนส่ง", "โลจิสติกส์การบิน", "ขนส่งด่วน"],
    icon: "rocket"
  },
  {
    name: "อุตสาหกรรมการแพทย์ครบวงจร",
    group: "New S-curve",
    subcategoriesCount: 3,
    businessesCount: 5,
    subcategories: ["เครื่องมือทางการแพทย์นวัตกรรมสูง", "น้ำยาตรวจวิเคราะห์ทางห้องปฏิบัติการ", "ยาชีวภาพและบริการการแพทย์ทางไกล"],
    keywords: ["เครื่องมือแพทย์", "น้ำยาตรวจวิเคราะห์ทางการแพทย์", "บริการทางการแพทย์ทางไกล", "Telemedicine", "ผลิตยาชีววัตถุ", "ข้อเข่าเทียม", "วัสดุฝังในทางการแพทย์"],
    icon: "rocket"
  },
  {
    name: "อุตสาหกรรมเชื้อเพลิงชีวภาพและเคมีชีวภาพ",
    group: "New S-curve",
    subcategoriesCount: 2,
    businessesCount: 4,
    subcategories: ["พลังงานหมุนเวียนชีวภาพ", "พลาสติกย่อยสลายได้ทางชีวภาพและผลิตภัณฑ์สิ่งแวดล้อม"],
    keywords: ["ไบโอดีเซล", "เอทานอล", "พลาสติกย่อยสลายได้", "Bioplastic", "เคมีภัณฑ์ชีวภาพ", "น้ำมันเครื่องบินชีวภาพ", "Bio-jet fuel", "สารลดแรงตึงผิวชีวภาพ"],
    icon: "rocket"
  },
  {
    name: "อุตสาหกรรมดิจิทัล",
    group: "New S-curve",
    subcategoriesCount: 1,
    businessesCount: 3,
    subcategories: ["ซอฟต์แวร์ คลาวด์คอมพิวติ้ง และเทคโนโลยีปัญญาประดิษฐ์"],
    keywords: ["ซอฟต์แวร์ประยุกต์", "คลาวด์คอมพิวติ้ง", "Cloud", "ปัญญาประดิษฐ์", "AI", "ดาต้าเซ็นเตอร์", "Data Center", "แอปพลิเคชันมือถือ", "ความปลอดภัยไซเบอร์", "Cybersecurity", "บล็อกเชน", "Blockchain"],
    icon: "rocket"
  },

  // --- Other Industries ---
  {
    name: "อุตสาหกรรมสิ่งทอและเครื่องนุ่งห่ม",
    group: "Other",
    subcategoriesCount: 1,
    businessesCount: 2,
    subcategories: ["ผลิตภัณฑ์สิ่งทอและเครื่องนุ่งห่มสำเร็จรูป"],
    keywords: ["เสื้อผ้าสำเร็จรูป", "ทอผ้าไหม", "เส้นด้าย", "กระเป๋าหนัง", "เครื่องหนัง"],
    icon: "layers"
  },
  {
    name: "อุตสาหกรรมวัสดุก่อสร้าง",
    group: "Other",
    subcategoriesCount: 1,
    businessesCount: 3,
    subcategories: ["วัสดุและอุปกรณ์งานโครงสร้าง"],
    keywords: ["ปูนซีเมนต์", "อิฐบล็อก", "เหล็กเส้น", "กระจกอาคาร"],
    icon: "layers"
  },
  {
    name: "อุตสาหกรรมเคมีภัณฑ์และพลาสติก",
    group: "Other",
    subcategoriesCount: 1,
    businessesCount: 2,
    subcategories: ["เคมีภัณฑ์การเกษตรและบรรจุภัณฑ์พลาสติก"],
    keywords: ["ขวดพลาสติก", "ปุ๋ยเคมี", "สีทาบ้าน", "เรซิน"],
    icon: "layers"
  },
  {
    name: "อุตสาหกรรมอัญมณีและเครื่องประดับ",
    group: "Other",
    subcategoriesCount: 1,
    businessesCount: 2,
    subcategories: ["เครื่องประดับและอัญมณีเจียระไน"],
    keywords: ["อัญมณี", "เพชรพลอย", "ทองรูปพรรณ", "เครื่องประดับเงิน"],
    icon: "layers"
  },
  {
    name: "อุตสาหกรรมกระดาษและงานพิมพ์",
    group: "Other",
    subcategoriesCount: 1,
    businessesCount: 1,
    subcategories: ["ผลิตภัณฑ์กระดาษและสิ่งพิมพ์บรรจุภัณฑ์"],
    keywords: ["กล่องกระดาษ", "โรงพิมพ์", "กระดาษลูกฟูก"],
    icon: "layers"
  },
  {
    name: "อุตสาหกรรมผลิตภัณฑ์ไม้และเครื่องเรือน",
    group: "Other",
    subcategoriesCount: 1,
    businessesCount: 2,
    subcategories: ["เฟอร์นิเจอร์ไม้แปรรูปและเครื่องเรือนประกอบ"],
    keywords: ["เฟอร์นิเจอร์ไม้", "ไม้แปรรูป", "ตู้เตียงไม้"],
    icon: "layers"
  },
  {
    name: "อุตสาหกรรมโลหะการและผลิตภัณฑ์โลหะ",
    group: "Other",
    subcategoriesCount: 1,
    businessesCount: 3,
    subcategories: ["โลหะภัณฑ์และโครงสร้างโลหะประดิษฐ์"],
    keywords: ["โครงเหล็ก", "อลูมิเนียม", "งานหล่อโลหะ"],
    icon: "layers"
  },
  {
    name: "อุตสาหกรรมเซรามิกและกระจก",
    group: "Other",
    subcategoriesCount: 1,
    businessesCount: 2,
    subcategories: ["ผลิตภัณฑ์เครื่องปั้นดินเผาและกระจกแปรรูป"],
    keywords: ["ถ้วยชามเซรามิก", "กระเบื้องปูพื้น", "กระจกนิรภัย"],
    icon: "layers"
  },
  {
    name: "อุตสาหกรรมพลังงานและสาธารณูปโภค",
    group: "Other",
    subcategoriesCount: 1,
    businessesCount: 2,
    subcategories: ["การผลิตไฟฟ้าและระบบสาธารณูปโภคพื้นฐาน"],
    keywords: ["โซลาร์เซลล์", "โรงไฟฟ้า", "น้ำประปา"],
    icon: "layers"
  },
  {
    name: "อุตสาหกรรมบรรจุภัณฑ์",
    group: "Other",
    subcategoriesCount: 1,
    businessesCount: 2,
    subcategories: ["บรรจุภัณฑ์โลหะ แก้ว และวัสดุผสม"],
    keywords: ["กระป๋องอลูมิเนียม", "ขวดแก้ว", "กล่องลูกฟูกบรรจุภัณฑ์"],
    icon: "layers"
  },
  {
    name: "อุตสาหกรรมการศึกษาและวิจัย",
    group: "Other",
    subcategoriesCount: 1,
    businessesCount: 2,
    subcategories: ["บริการฝึกอบรมและสถาบันค้นคว้าวิจัยนวัตกรรม"],
    keywords: ["สถาบันกวดวิชา", "ศูนย์วิจัย", "หลักสูตรฝึกอบรม"],
    icon: "layers"
  },
  {
    name: "อุตสาหกรรมขนส่งและบริการโลจิสติกส์ทั่วไป",
    group: "Other",
    subcategoriesCount: 1,
    businessesCount: 3,
    subcategories: ["บริการขนส่งสินค้าทางบกและคลังสินค้าพัสดุ"],
    keywords: ["รถบรรทุกรับจ้าง", "ส่งพัสดุด่วน", "เช่าคลังสินค้า"],
    icon: "layers"
  },
  {
    name: "อุตสาหกรรมค้าปลีกและบริการอื่นๆ",
    group: "Other",
    subcategoriesCount: 2,
    businessesCount: 4,
    subcategories: ["ธุรกิจแฟรนไชส์ ค้าปลีก และบริการส่วนบุคคล"],
    keywords: ["ร้านสะดวกซื้อ", "ร้านทำผม", "บริการซักอบรีด", "ซูเปอร์มาร์เก็ต"],
    icon: "layers"
  }
];

export default function UserWorkspace({ categories }: UserWorkspaceProps) {
  const [manualInput, setManualInput] = useState<string>("");
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [results, setResults] = useState<UserClassificationResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("All");
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showFeedback = (text: string, type: "success" | "error" | "info") => {
    setFeedback({ text, type });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  // S-Curve Industry Directory States
  const [dirSearch, setDirSearch] = useState<string>("");
  const [dirTab, setDirTab] = useState<"All" | "First S-curve" | "New S-curve" | "Other">("All");
  const [expandedIndustry, setExpandedIndustry] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    setIsLoading(true);
    setUploadedFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to json array of arrays
        const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        
        // Flatten and clean rows to find industrial names / descriptions
        const linesToProcess: string[] = [];
        
        for (const row of rawRows) {
          if (!row || row.length === 0) continue;
          // Take the first 1-2 columns if they have strings
          const primaryText = row[0]?.toString().trim() || "";
          const secondaryText = row[1]?.toString().trim() || "";
          
          if (primaryText && isNaN(Number(primaryText)) && primaryText.length > 2) {
            linesToProcess.push(primaryText);
          } else if (secondaryText && isNaN(Number(secondaryText)) && secondaryText.length > 2) {
            linesToProcess.push(secondaryText);
          }
        }

        // Limit to 500 rows for smooth client-side processing
        const slicedLines = linesToProcess.slice(0, 500);
        const classificationResults = classifyBatch(slicedLines, categories);
        
        setResults(classificationResults);
      } catch (err) {
        console.error("Error parsing file: ", err);
        showFeedback("ไม่สามารถอ่านไฟล์นี้ได้ โปรดตรวจสอบว่าเป็นไฟล์ .csv หรือ .xlsx ที่ถูกต้อง", "error");
      } finally {
        setIsLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Manual input submission
  const handleManualClassify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;

    setIsLoading(true);
    // Split input by newlines to classify multiple items at once
    const lines = manualInput
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const classificationResults = classifyBatch(lines, categories);
    setResults(classificationResults);
    setIsLoading(false);
  };

  const clearResults = () => {
    setResults([]);
    setUploadedFileName(null);
    setManualInput("");
  };

  // Export results to Excel/CSV
  const exportResults = (format: "xlsx" | "csv") => {
    if (results.length === 0) return;

    const dataToExport = results.map((r, index) => ({
      "No": index + 1,
      "ข้อความที่วิเคราะห์ (Input Text)": r.inputText,
      "คำสำคัญที่ค้นพบ (Matched Keyword)": r.matchedKeyword || "-",
      "ประเภทอุตสาหกรรม (Category)": r.matchedCategory,
      "อุตสาหกรรมเป้าหมาย": r.matchedTargetIndustry || "-",
      "ประเภทอุตสาหกรรมหมวดใหญ่": r.matchedMajorCategory || "-",
      "หมวดย่อย": r.matchedSubCategoryCode || "-",
      "ประเภทอุตสาหกรรม/ธุรกิจ ที่รองรับ ( ประเภทอุตสาหกรรมหมวดย่อย )": r.matchedSubCategory || "-",
      "ความแม่นยำ (Confidence)": 
        r.confidence === "High" ? "สูง (ตรงตัว)" : 
        r.confidence === "Medium" ? "ปานกลาง" : 
        r.confidence === "Low" ? "ต่ำ (ใกล้เคียง)" : "อุตสาหกรรมทั่วไป"
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ผลการวิเคราะห์");

    if (format === "xlsx") {
      XLSX.writeFile(wb, "industrial_grouping_results.xlsx");
    } else {
      XLSX.writeFile(wb, "industrial_grouping_results.csv", { bookType: "csv" });
    }
  };

  // Filtered results
  const filteredResults = results.filter((res) => {
    const matchesSearch = 
      res.inputText.toLowerCase().includes(searchFilter.toLowerCase()) ||
      res.matchedCategory.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (res.matchedTargetIndustry || "").toLowerCase().includes(searchFilter.toLowerCase()) ||
      (res.matchedMajorCategory || "").toLowerCase().includes(searchFilter.toLowerCase()) ||
      (res.matchedSubCategoryCode || "").toLowerCase().includes(searchFilter.toLowerCase()) ||
      (res.matchedSubCategory || "").toLowerCase().includes(searchFilter.toLowerCase());

    const matchesConfidence = 
      confidenceFilter === "All" || 
      res.confidence === confidenceFilter;

    return matchesSearch && matchesConfidence;
  });

  return (
    <div className="space-y-8">
      {/* Search and Upload Section in 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Manual Key-in */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">ค้นหาและจัดกลุ่มด้วยตนเอง (Manual Classification)</h3>
                <p className="text-xs text-slate-400">กรอกข้อความ บรรยายลักษณะกิจการ หรือชื่อโรงงาน (รองรับทีละหลายบรรทัด)</p>
              </div>
            </div>

            <form onSubmit={handleManualClassify} className="space-y-4">
              <textarea
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="ตัวอย่างเช่น:&#10;โรงงานประกอบชิ้นส่วนรถยนต์และล้ออะไหล่&#10;แปรรูปอาหารกระป๋องและผลไม้ทอดอบกรอบ&#10;รับผลิตเสื้อยืด กางเกง และสิ่งทอ"
                className="w-full h-44 p-4 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none font-sans placeholder-slate-400"
              />

              {/* Sample Inputs Trigger Buttons */}
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2">คลิกเพื่อลองใช้ข้อความตัวอย่าง:</p>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_INPUTS.slice(0, 3).map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setManualInput(sample)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-100 text-slate-600 transition-all text-left truncate max-w-full"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6 flex justify-end gap-3">
            {manualInput && (
              <button
                type="button"
                onClick={() => setManualInput("")}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                ล้างข้อมูล
              </button>
            )}
            <button
              onClick={handleManualClassify}
              disabled={!manualInput.trim() || isLoading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md hover:shadow-indigo-200/50 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              <span>ประมวลผลทันที</span>
            </button>
          </div>
        </motion.div>

        {/* Right Column: File Upload */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">อัปโหลดไฟล์ข้อมูล (.xlsx, .csv)</h3>
                <p className="text-xs text-slate-400">นำเข้าไฟล์รายชื่อโรงงานหรือกิจการ เพื่อจัดกลุ่มแบบปริมาณมากในครั้งเดียว</p>
              </div>
            </div>

            {/* Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={`w-full h-44 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-indigo-500 bg-indigo-50/50"
                  : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <FileSpreadsheet className="w-11 h-11 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-700">ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
              <p className="text-xs text-slate-400 mt-1">รองรับไฟล์ Excel (.xlsx, .xls) และ CSV (.csv) สูงสุด 500 แถว</p>
            </div>

            {uploadedFileName && (
              <div className="mt-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-indigo-700 font-semibold">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                  <span>ไฟล์ล่าสุด: {uploadedFileName}</span>
                </div>
                <button
                  onClick={() => setUploadedFileName(null)}
                  className="text-slate-400 hover:text-rose-500 font-bold"
                >
                  ล้างไฟล์
                </button>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6 flex justify-between items-center text-xs text-slate-400 font-medium">
            <span>* คอลัมน์ที่ 1 หรือ 2 ในไฟล์ควรเป็นข้อมูลข้อความยาวเพื่อใช้จับคู่</span>
            <span className="text-indigo-600 font-bold hover:underline cursor-pointer" onClick={() => {
              // Trigger a basic mock template download
              const ws = XLSX.utils.json_to_sheet([
                { "ชื่อสถานประกอบการ / ลักษณะการดำเนินงาน": "โรงงานแปรรูปผลไม้อบแห้งและทุเรียนกรอบ" },
                { "ชื่อสถานประกอบการ / ลักษณะการดำเนินงาน": "รับผลิตและซ่อมแซมอะไหล่รถยนต์ประเภทท่อไอเสีย" },
                { "ชื่อสถานประกอบการ / ลักษณะการดำเนินงาน": "บริษัททอผ้าไหมไทยและตัดเย็บกางเกงสำเร็จรูป" }
              ]);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Template_ค้นหา");
              XLSX.writeFile(wb, "industrial_template_search.xlsx");
            }}>ดาวน์โหลดไฟล์ตัวอย่าง</span>
          </div>
        </motion.div>

      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mr-3" />
          <span className="font-semibold text-slate-600">กำลังประมวลผลข้อมูลจัดกลุ่มประเภทอุตสาหกรรม...</span>
        </div>
      )}

      {/* Results Section */}
      <AnimatePresence>
        {results.length > 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 p-6 space-y-6"
          >
            {/* Results Title & Download Tools */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <span>ผลการจับคู่และวิเคราะห์ประเภทอุตสาหกรรม</span>
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold">
                    ประมวลผลสำเร็จ {results.length} แถว
                  </span>
                </h3>
                <p className="text-xs text-slate-400">คัดกรองข้อมูลอุตสาหกรรมแบบ Real-time เปรียบเทียบกับคำสำคัญในฐานข้อมูล</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={clearResults}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>ล้างข้อมูลผลลัพธ์</span>
                </button>

                <div className="h-5 w-[1px] bg-slate-200 mx-1" />

                <button
                  onClick={() => exportResults("xlsx")}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลด Excel (.xlsx)</span>
                </button>

                <button
                  onClick={() => exportResults("csv")}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลด CSV (.csv)</span>
                </button>
              </div>
            </div>

            {/* Confidence Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-emerald-50/50 border border-emerald-100/50 p-4 rounded-2xl">
                <p className="text-[10px] uppercase font-bold text-emerald-600">ความแม่นยำสูง (High)</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">
                  {results.filter(r => r.confidence === "High").length} <span className="text-xs font-semibold">รายการ</span>
                </p>
              </div>
              <div className="bg-blue-50/50 border border-blue-100/50 p-4 rounded-2xl">
                <p className="text-[10px] uppercase font-bold text-blue-600">ความแม่นยำปานกลาง (Medium)</p>
                <p className="text-2xl font-black text-blue-700 mt-1">
                  {results.filter(r => r.confidence === "Medium").length} <span className="text-xs font-semibold">รายการ</span>
                </p>
              </div>
              <div className="bg-amber-50/50 border border-amber-100/50 p-4 rounded-2xl">
                <p className="text-[10px] uppercase font-bold text-amber-600">ความแม่นยำต่ำ (Low)</p>
                <p className="text-2xl font-black text-amber-700 mt-1">
                  {results.filter(r => r.confidence === "Low").length} <span className="text-xs font-semibold">รายการ</span>
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                <p className="text-[10px] uppercase font-bold text-slate-500">อุตสาหกรรมทั่วไป (Not Found)</p>
                <p className="text-2xl font-black text-slate-600 mt-1">
                  {results.filter(r => r.confidence === "Not Found").length} <span className="text-xs font-semibold">รายการ</span>
                </p>
              </div>
            </div>

            {/* Filter and Search Table Control */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="ค้นหาข้อความ หรือประเภทกลุ่มอุตสาหกรรมในตารางผลลัพธ์..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-slate-400" />
                <select
                  value={confidenceFilter}
                  onChange={(e) => setConfidenceFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="All">ทุกระดับความแม่นยำ</option>
                  <option value="High">สูง (ตรงตัว)</option>
                  <option value="Medium">ปานกลาง</option>
                  <option value="Low">ต่ำ (ใกล้เคียง)</option>
                  <option value="Not Found">อุตสาหกรรมทั่วไป</option>
                </select>
              </div>
            </div>

            {/* Results Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    <th className="py-3.5 px-3 text-xs font-bold text-slate-500 w-12 text-center">No.</th>
                    <th className="py-3.5 px-3 text-xs font-bold text-slate-500">ข้อมูลที่กรอกเข้ามา (Input Text)</th>
                    <th className="py-3.5 px-3 text-xs font-bold text-slate-500">คำสำคัญหลักที่จับคู่ (Matched Keyword)</th>
                    <th className="py-3.5 px-3 text-xs font-bold text-slate-500">ประเภทอุตสาหกรรม (Category)</th>
                    <th className="py-3.5 px-3 text-xs font-bold text-slate-500">อุตสาหกรรมเป้าหมาย</th>
                    <th className="py-3.5 px-3 text-xs font-bold text-slate-500">ประเภทอุตสาหกรรมหมวดใหญ่</th>
                    <th className="py-3.5 px-3 text-xs font-bold text-slate-500 w-16 text-center">หมวดย่อย</th>
                    <th className="py-3.5 px-3 text-xs font-bold text-slate-500">ประเภทอุตสาหกรรม/ธุรกิจ ที่รองรับ (ประเภทอุตสาหกรรมหมวดย่อย)</th>
                    <th className="py-3.5 px-3 text-xs font-bold text-slate-500 w-32 text-center">ความแม่นยำ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResults.length > 0 ? (
                    filteredResults.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 transition-colors text-xs text-slate-700">
                        <td className="py-4 px-3 font-semibold text-slate-400 text-center">{index + 1}</td>
                        <td className="py-4 px-3 font-medium max-w-xs truncate" title={item.inputText}>
                          {item.inputText}
                        </td>
                        <td className="py-4 px-3 font-mono text-slate-500">
                          {item.matchedKeyword && item.matchedKeyword !== "-" ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-600 font-semibold">
                              {item.matchedKeyword}
                            </span>
                          ) : (
                            <span className="text-slate-300 italic">-</span>
                          )}
                        </td>
                        <td className="py-4 px-3 font-bold text-slate-800">
                          {item.matchedCategory}
                        </td>
                        <td className="py-4 px-3 text-indigo-700 font-medium">
                          {item.matchedTargetIndustry || <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-4 px-3 text-slate-600">
                          {item.matchedMajorCategory || <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-4 px-3 text-center text-slate-500 font-mono">
                          {item.matchedSubCategoryCode || <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-4 px-3 text-slate-500">
                          {item.matchedSubCategory || <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-4 px-3 text-center">
                          {item.confidence === "High" && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full font-bold text-[10px]">
                              <CheckCircle className="w-3 h-3" />
                              <span>สูง (ตรงตัว)</span>
                            </span>
                          )}
                          {item.confidence === "Medium" && (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-bold text-[10px]">
                              <CheckCircle className="w-3 h-3" />
                              <span>ปานกลาง</span>
                            </span>
                          )}
                          {item.confidence === "Low" && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full font-bold text-[10px]">
                              <AlertCircle className="w-3 h-3" />
                              <span>ต่ำ (เทียบเคียง)</span>
                            </span>
                          )}
                          {item.confidence === "Not Found" && (
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full font-bold text-[10px]">
                              <HelpCircle className="w-3 h-3" />
                              <span>อุตสาหกรรมทั่วไป</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400 font-medium">
                        ไม่พบข้อมูลตามคำค้นหาหรือระดับความแม่นยำที่คุณเลือก
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- THAILAND S-CURVE TARGET INDUSTRIES DIRECTORY --- */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="space-y-6 pt-6 border-t border-slate-100"
      >
        {/* KPI Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md shadow-slate-100/50 flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400">กลุ่มอุตสาหกรรมทั้งหมด</span>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800">23</span>
              <span className="text-xs text-slate-400 font-semibold">กลุ่มอุตสาหกรรม</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md shadow-slate-100/50 flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400">หมวดย่อยทั้งหมด</span>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800">38</span>
              <span className="text-xs text-slate-400 font-semibold">หมวดใหญ่/ย่อย</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md shadow-slate-100/50 flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400">ประเภทธุรกิจทั้งหมด</span>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800">84</span>
              <span className="text-xs text-slate-400 font-semibold">ประเภทธุรกิจอ้างอิง</span>
            </div>
          </div>
        </div>

        {/* Search & Tabs Controls */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md shadow-slate-100/50 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">ทำเนียบบัญชีกลุ่มอุตสาหกรรมเป้าหมาย (S-Curve & Target Industries)</h3>
              <p className="text-xs text-slate-400">ระบบจำแนกและค้นหารายละเอียดอุตสาหกรรมตามนโยบายขับเคลื่อนเศรษฐกิจของประเทศไทย</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={dirSearch}
                onChange={(e) => setDirSearch(e.target.value)}
                placeholder="ค้นหากลุ่มอุตสาหกรรมหรือประเภทธุรกิจ..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {(["All", "First S-curve", "New S-curve", "Other"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDirTab(tab)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                    dirTab === tab
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  {tab === "All" && "ทั้งหมด"}
                  {tab === "First S-curve" && "First S-curve"}
                  {tab === "New S-curve" && "New S-curve"}
                  {tab === "Other" && "Other"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid List of Industries */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {DIRECTORY_INDUSTRIES.filter((ind) => {
            const matchesTab = dirTab === "All" || ind.group === dirTab;
            const cleanQuery = dirSearch.trim().toLowerCase();
            const matchesQuery = 
              !cleanQuery ||
              ind.name.toLowerCase().includes(cleanQuery) ||
              ind.group.toLowerCase().includes(cleanQuery) ||
              ind.subcategories.some(sub => sub.toLowerCase().includes(cleanQuery)) ||
              ind.keywords.some(kw => kw.toLowerCase().includes(cleanQuery));
            return matchesTab && matchesQuery;
          }).map((ind, index) => {
            const isExpanded = expandedIndustry === ind.name;
            const isFirstSCurve = ind.group === "First S-curve";
            const isNewSCurve = ind.group === "New S-curve";

            const iconBg = isFirstSCurve
              ? "bg-indigo-50"
              : isNewSCurve
                ? "bg-emerald-50"
                : "bg-indigo-50/40";

            const badgeStyle = isFirstSCurve
              ? "bg-indigo-50/60 text-indigo-700 border-indigo-100"
              : isNewSCurve
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-slate-100 text-slate-600 border-slate-200";

            return (
              <motion.div
                key={ind.name}
                layout="position"
                onClick={() => setExpandedIndustry(isExpanded ? null : ind.name)}
                className="bg-white p-5 rounded-3xl border border-slate-100 hover:border-slate-200/80 shadow-md shadow-slate-100/30 hover:shadow-xl hover:shadow-slate-100/40 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                        {ind.icon === "trending-up" && <TrendingUp className="w-5 h-5 text-indigo-600" />}
                        {ind.icon === "rocket" && <Rocket className="w-5 h-5 text-emerald-600" />}
                        {ind.icon === "layers" && <Layers className="w-5 h-5 text-indigo-500" />}
                      </div>

                      {/* Info */}
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-slate-800 text-sm leading-snug">{ind.name}</h4>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${badgeStyle}`}>
                            {ind.group}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {ind.subcategoriesCount} หมวดใหญ่ · {ind.businessesCount} ประเภทธุรกิจ
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-slate-300 hover:text-slate-500 shrink-0 mt-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded Content (Subcategories, Matching Keywords) */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden mt-4 pt-4 border-t border-slate-50 space-y-3.5 text-xs text-slate-600"
                        onClick={(e) => e.stopPropagation()} // Prevent closing card on inner clicks
                      >
                        {/* Subcategories */}
                        <div>
                          <p className="font-bold text-slate-700 mb-1">หมวดหมู่ย่อยและลักษณะกิจกรรม:</p>
                          <ul className="list-disc pl-4 space-y-1 text-slate-500 text-[11px] font-medium leading-relaxed">
                            {ind.subcategories.map((sub, idx) => (
                              <li key={idx}>{sub}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Keyword Matches */}
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Database className="w-3.5 h-3.5 text-slate-400" />
                            <p className="font-bold text-slate-700">คำสำคัญสำหรับสืบค้น (Keyword Matches):</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {ind.keywords.map((kw, idx) => (
                              <button
                                key={idx}
                                onClick={() => setManualInput(kw)}
                                className="bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 text-[10px] px-2.5 py-1 rounded-lg text-slate-600 hover:text-indigo-700 font-medium transition-all"
                                title="คลิกเพื่อนำคำนี้ไปกรอกสืบค้นด้านบน"
                              >
                                {kw}
                              </button>
                            ))}
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1.5 font-semibold">* คลิกคำสำคัญ เพื่อนำไปกรอกข้อมูลด้านบนในการจำแนกประเภททันที</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Toast Feedback Notification */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-xs font-semibold border ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                : feedback.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-100"
                : "bg-indigo-50 text-indigo-800 border-indigo-100"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
