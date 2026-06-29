import React, { useState, useRef, useEffect } from "react";
import { 
  Plus, Edit, Trash2, Upload, FileSpreadsheet, Download, RefreshCw, 
  CheckCircle, AlertTriangle, Search, X, Check, Save, ArrowLeft,
  Users, Shield, UserPlus, Mail, Database
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import { User } from "firebase/auth";
import { collection, doc, setDoc, deleteDoc, writeBatch, onSnapshot, query, orderBy } from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "../firebase";
import { IndustrialCategory, AdminProfile } from "../types";

interface AdminWorkspaceProps {
  categories: IndustrialCategory[];
  user: User;
  refreshCategories: () => Promise<void>;
}

export default function AdminWorkspace({
  categories,
  user,
  refreshCategories,
}: AdminWorkspaceProps) {
  const [adminSubTab, setAdminSubTab] = useState<"database" | "admins">("database");
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);

  // Admin management forms and states
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [editingAdminUid, setEditingAdminUid] = useState<string | null>(null);
  const [adminFormEmail, setAdminFormEmail] = useState("");
  const [adminFormDisplayName, setAdminFormDisplayName] = useState("");
  const [deleteConfirmAdminUid, setDeleteConfirmAdminUid] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Real-time listener for admins
  useEffect(() => {
    const q = query(collection(db, "admins"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: AdminProfile[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as AdminProfile);
      });
      setAdmins(items);
      setIsLoadingAdmins(false);
    }, (error) => {
      console.error("Error listening to admins list:", error);
      setIsLoadingAdmins(false);
    });

    return () => unsubscribe();
  }, []);

  // Admin Management Functions
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminFormEmail.trim() || !adminFormDisplayName.trim()) return;

    const email = adminFormEmail.trim().toLowerCase();
    if (!email.endsWith("@bu.ac.th")) {
      showFeedback("จำกัดเฉพาะอีเมลสถาบัน @bu.ac.th เท่านั้น", "error");
      return;
    }

    setIsLoading(true);
    try {
      const uid = `manual-${Date.now()}`;
      const newAdmin: AdminProfile = {
        uid,
        email,
        displayName: adminFormDisplayName.trim(),
        role: "admin",
        createdAt: Date.now(),
      };

      await setDoc(doc(db, "admins", uid), newAdmin);
      showFeedback(`แต่งตั้งผู้ดูแลระบบใหม่ (${newAdmin.displayName}) เรียบร้อยแล้ว`, "success");
      
      setAdminFormEmail("");
      setAdminFormDisplayName("");
      setIsAddingAdmin(false);
    } catch (err) {
      console.error("Error adding admin:", err);
      handleFirestoreError(err, OperationType.CREATE, "admins");
      showFeedback("เกิดข้อผิดพลาดในการแต่งตั้งผู้ดูแลระบบ", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAdminEdit = async (uid: string) => {
    if (!adminFormDisplayName.trim()) return;

    setIsLoading(true);
    try {
      await setDoc(doc(db, "admins", uid), {
        displayName: adminFormDisplayName.trim(),
      }, { merge: true });

      showFeedback("แก้ไขข้อมูลผู้ดูแลระบบเรียบร้อยแล้ว", "success");
      setEditingAdminUid(null);
      setAdminFormDisplayName("");
    } catch (err) {
      console.error("Error updating admin:", err);
      handleFirestoreError(err, OperationType.UPDATE, `admins/${uid}`);
      showFeedback("เกิดข้อผิดพลาดในการแก้ไขข้อมูล", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAdmin = async (uid: string) => {
    if (uid === user.uid) {
      showFeedback("คุณไม่สามารถลบสิทธิ์บัญชีผู้ดูแลระบบของตัวเองได้", "error");
      setDeleteConfirmAdminUid(null);
      return;
    }

    setIsLoading(true);
    try {
      await deleteDoc(doc(db, "admins", uid));
      showFeedback("ยกเลิกสิทธิ์ผู้ดูแลระบบเรียบร้อยแล้ว", "success");
    } catch (err) {
      console.error("Error deleting admin:", err);
      handleFirestoreError(err, OperationType.DELETE, `admins/${uid}`);
      showFeedback("เกิดข้อผิดพลาดในการยกเลิกสิทธิ์", "error");
    } finally {
      setIsLoading(false);
      setDeleteConfirmAdminUid(null);
    }
  };

  const showFeedback = (text: string, type: "success" | "error" | "info") => {
    setFeedback({ text, type });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  // Form states
  const [formKeyword, setFormKeyword] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formTargetIndustry, setFormTargetIndustry] = useState("");
  const [formMajorCategory, setFormMajorCategory] = useState("");
  const [formSubCategoryCode, setFormSubCategoryCode] = useState("");
  const [formSubCategory, setFormSubCategory] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter categories
  const filteredCategories = categories.filter(
    (cat) =>
      (cat.keyword || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cat.categoryName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cat.targetIndustry || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cat.majorCategory || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cat.subCategoryCode || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cat.subCategory || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Add category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCategory.trim()) return;

    setIsLoading(true);
    try {
      const id = `cat-${Date.now()}`;
      const newCategory: IndustrialCategory = {
        id,
        keyword: formKeyword.trim() || "",
        categoryName: formCategory.trim(),
        targetIndustry: formTargetIndustry.trim() || "",
        majorCategory: formMajorCategory.trim() || "",
        subCategoryCode: formSubCategoryCode.trim() || "",
        subCategory: formSubCategory.trim() || "",
        updatedBy: user.email || "Unknown Admin",
        updatedAt: Date.now(),
      };

      await setDoc(doc(db, "industrial_categories", id), newCategory);
      await refreshCategories();
      
      // Reset form
      setFormKeyword("");
      setFormCategory("");
      setFormTargetIndustry("");
      setFormMajorCategory("");
      setFormSubCategoryCode("");
      setFormSubCategory("");
      setIsAdding(false);
    } catch (err) {
      console.error("Error adding category:", err);
      handleFirestoreError(err, OperationType.CREATE, `industrial_categories/${formKeyword}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Edit category trigger
  const startEdit = (cat: IndustrialCategory) => {
    setEditingId(cat.id);
    setFormKeyword(cat.keyword || "");
    setFormCategory(cat.categoryName);
    setFormTargetIndustry(cat.targetIndustry || "");
    setFormMajorCategory(cat.majorCategory || "");
    setFormSubCategoryCode(cat.subCategoryCode || "");
    setFormSubCategory(cat.subCategory || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormKeyword("");
    setFormCategory("");
    setFormTargetIndustry("");
    setFormMajorCategory("");
    setFormSubCategoryCode("");
    setFormSubCategory("");
  };

  // Save edit
  const handleSaveEdit = async (id: string) => {
    if (!formCategory.trim()) return;

    setIsLoading(true);
    try {
      const updatedCategory = {
        keyword: formKeyword.trim() || "",
        categoryName: formCategory.trim(),
        targetIndustry: formTargetIndustry.trim() || "",
        majorCategory: formMajorCategory.trim() || "",
        subCategoryCode: formSubCategoryCode.trim() || "",
        subCategory: formSubCategory.trim() || "",
        updatedBy: user.email || "Unknown Admin",
        updatedAt: Date.now(),
      };

      await setDoc(doc(db, "industrial_categories", id), updatedCategory, { merge: true });
      await refreshCategories();
      cancelEdit();
    } catch (err) {
      console.error("Error updating category:", err);
      handleFirestoreError(err, OperationType.UPDATE, `industrial_categories/${id}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete category
  const handleDeleteCategory = async (id: string) => {
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, "industrial_categories", id));
      await refreshCategories();
      showFeedback("ลบข้อมูลคำสำคัญเรียบร้อยแล้ว", "success");
    } catch (err) {
      console.error("Error deleting category:", err);
      handleFirestoreError(err, OperationType.DELETE, `industrial_categories/${id}`);
      showFeedback("เกิดข้อผิดพลาดในการลบข้อมูล", "error");
    } finally {
      setIsLoading(false);
      setDeleteConfirmId(null);
    }
  };

  // Clear all database entries
  const handleClearAllDatabase = async () => {
    setIsLoading(true);
    setImportStatus("กำลังเคลียร์ฐานข้อมูลทั้งหมด...");
    try {
      let batch = writeBatch(db);
      let count = 0;
      for (const cat of categories) {
        batch.delete(doc(db, "industrial_categories", cat.id));
        count++;
        // Firestore batch has a limit of 500 operations
        if (count % 500 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }
      if (count % 500 !== 0) {
        await batch.commit();
      }
      showFeedback(`เคลียร์ฐานข้อมูลทั้งหมดเรียบร้อยแล้ว จำนวน ${count} รายการ`, "success");
      await refreshCategories();
    } catch (err: any) {
      console.error("Error clearing database:", err);
      showFeedback(`เกิดข้อผิดพลาดในการเคลียร์ฐานข้อมูล: ${err.message || "ล้มเหลว"}`, "error");
    } finally {
      setIsLoading(false);
      setImportStatus(null);
      setShowClearAllConfirm(false);
    }
  };

  // Import bulk database via CSV/Excel
  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    setIsLoading(true);
    setImportStatus("กำลังอ่านและแปลงข้อมูลไฟล์...");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const rawRows = XLSX.utils.sheet_to_json<any>(worksheet);

        if (rawRows.length === 0) {
          throw new Error("ไม่พบแถวข้อมูลในไฟล์");
        }

        setImportStatus(`พบข้อมูลทั้งหมด ${rawRows.length} รายการ กำลังเขียนลงฐานข้อมูล...`);

        // We will perform writes in chunks of 250 rows to avoid firestore timeout/limitations
        const batchSize = 250;
        let successCount = 0;

        for (let i = 0; i < rawRows.length; i += batchSize) {
          const chunk = rawRows.slice(i, i + batchSize);
          const batch = writeBatch(db);

          for (const row of chunk) {
            // Read columns with flexible names matching the spreadsheet columns in the target image
            const keyword = (
              row["คำสำคัญหลัก (Keyword)"] ||
              row["คำสำคัญหลัก"] ||
              row["คำสำคัญ"] ||
              row["Keyword"] ||
              row["keyword"] ||
              ""
            )?.toString().trim();

            const categoryName = (
              row["ประเภทอุตสาหกรรม (Category)"] ||
              row["ประเภทอุตสาหกรรม"] ||
              row["กลุ่มอุตสาหกรรม"] ||
              row["Category"] ||
              row["category"] ||
              ""
            )?.toString().trim();

            const targetIndustry = (
              row["อุตสาหกรรมเป้าหมาย"] ||
              row["TargetIndustry"] ||
              row["target_industry"] ||
              ""
            )?.toString().trim();

            const majorCategory = (
              row["ประเภทอุตสาหกรรมหมวดใหญ่"] ||
              row["MajorCategory"] ||
              row["major_category"] ||
              ""
            )?.toString().trim();

            const subCategoryCode = (
              row["หมวดย่อย"] ||
              row["SubCategoryCode"] ||
              row["sub_category_code"] ||
              ""
            )?.toString().trim();

            const subCategory = (
              row["ประเภทอุตสาหกรรม/ธุรกิจ ที่รองรับ ( ประเภทอุตสาหกรรมหมวดย่อย )"] ||
              row["ประเภทอุตสาหกรรม/ธุรกิจ ที่รองรับ"] ||
              row["กลุ่มย่อย"] ||
              row["SubCategory"] ||
              row["sub_category"] ||
              ""
            )?.toString().trim();

            // Category name must exist to import a classification row
            if (categoryName) {
              const cleanId = `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
              const docRef = doc(db, "industrial_categories", cleanId);
              batch.set(docRef, {
                id: cleanId,
                keyword: keyword || "",
                categoryName,
                targetIndustry: targetIndustry || "",
                majorCategory: majorCategory || "",
                subCategoryCode: subCategoryCode || "",
                subCategory: subCategory || "",
                updatedBy: user.email || "Bulk Import",
                updatedAt: Date.now(),
              });
              successCount++;
            }
          }

          await batch.commit();
        }

        setImportStatus(null);
        showFeedback(`นำเข้าข้อมูลเรียบร้อยแล้วทั้งหมด ${successCount} รายการ!`, "success");
        await refreshCategories();
      } catch (err: any) {
        console.error("Error bulk importing:", err);
        showFeedback(`เกิดข้อผิดพลาดในการนำเข้าไฟล์: ${err.message || "โครงสร้างไฟล์ไม่ถูกต้อง"}`, "error");
        setImportStatus(null);
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Export database to Excel template/backup
  const handleExportDatabase = () => {
    if (categories.length === 0) return;

    const dataToExport = categories.map((cat, index) => ({
      "No": index + 1,
      "คำสำคัญหลัก (Keyword)": cat.keyword || "",
      "ประเภทอุตสาหกรรม (Category)": cat.categoryName || "",
      "อุตสาหกรรมเป้าหมาย": cat.targetIndustry || "",
      "ประเภทอุตสาหกรรมหมวดใหญ่": cat.majorCategory || "",
      "หมวดย่อย": cat.subCategoryCode || "",
      "ประเภทอุตสาหกรรม/ธุรกิจ ที่รองรับ ( ประเภทอุตสาหกรรมหมวดย่อย )": cat.subCategory || "",
      "ผู้แก้ไขล่าสุด (Updated By)": cat.updatedBy || "-",
      "วันที่แก้ไขล่าสุด": new Date(cat.updatedAt).toLocaleDateString("th-TH"),
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ฐานข้อมูลอุตสาหกรรม");
    XLSX.writeFile(wb, "industrial_classification_database.xlsx");
  };

  // Download Import Template
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        "No": 1,
        "คำสำคัญหลัก (Keyword)": "รถยนต์ไฟฟ้า",
        "ประเภทอุตสาหกรรม (Category)": "อุตสาหกรรมยานยนต์สมัยใหม่",
        "อุตสาหกรรมเป้าหมาย": "First S-curve",
        "ประเภทอุตสาหกรรมหมวดใหญ่": "การผลิต (Manufacturing)",
        "หมวดย่อย": "29",
        "ประเภทอุตสาหกรรม/ธุรกิจ ที่รองรับ ( ประเภทอุตสาหกรรมหมวดย่อย )": "การผลิตยานยนต์ รถพ่วงและรถกึ่งพ่วง (Manufacture of motor vehicles, trailers and semi-trailers)"
      },
      {
        "No": 2,
        "คำสำคัญหลัก (Keyword)": "แปรรูปผลไม้",
        "ประเภทอุตสาหกรรม (Category)": "อุตสาหกรรมการแปรรูปอาหาร",
        "อุตสาหกรรมเป้าหมาย": "First S-curve",
        "ประเภทอุตสาหกรรมหมวดใหญ่": "การผลิต (Manufacturing)",
        "หมวดย่อย": "10",
        "ประเภทอุตสาหกรรม/ธุรกิจ ที่รองรับ ( ประเภทอุตสาหกรรมหมวดย่อย )": "การผลิตผลิตภัณฑ์อาหาร (Production of food products)"
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_นำเข้า");
    XLSX.writeFile(wb, "industrial_import_template.xlsx");
  };

  return (
    <div className="space-y-6">
      
      {/* Tab Selectors for Admin Functions */}
      <div className="bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap gap-6 items-center justify-between">
        <div className="flex border-b border-slate-50 gap-6">
          <button
            onClick={() => setAdminSubTab("database")}
            className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              adminSubTab === "database"
                ? "border-indigo-600 text-indigo-600 font-extrabold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Database className="w-4 h-4" />
            <span>จัดการฐานข้อมูลจำแนกอุตสาหกรรม</span>
          </button>
          <button
            onClick={() => setAdminSubTab("admins")}
            className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              adminSubTab === "admins"
                ? "border-indigo-600 text-indigo-600 font-extrabold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>จัดการสิทธิ์และรายชื่อผู้ดูแลระบบ</span>
            <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
              {admins.length}
            </span>
          </button>
        </div>

        <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-indigo-500" />
          <span>ระดับสิทธิ์สูงสุด (Root Authorized)</span>
        </div>
      </div>

      {adminSubTab === "database" && (
        <div className="space-y-6">
          {/* Header and Bulk Operations Card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">ระบบจัดการฐานข้อมูล (Staff Database Management)</h2>
            <p className="text-xs text-slate-400 mt-1">
              แก้ไข ลบ เพิ่ม ข้อมูลประเภทอุตสาหกรรม เพื่อให้ระบบจัดกลุ่มหลักอ้างอิงได้อย่างสม่ำเสมอและแม่นยำ
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={downloadTemplate}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              ดาวน์โหลดเทมเพลตนำเข้า
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>นำเข้าไฟล์ข้อมูล Excel/CSV</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleBulkImport}
              className="hidden"
            />

            <button
              onClick={handleExportDatabase}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออกข้อมูลทั้งหมด (.xlsx)</span>
            </button>

            {categories.length > 0 && (
              <button
                onClick={() => setShowClearAllConfirm(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>เคลียร์ข้อมูลทั้งหมด</span>
              </button>
            )}

            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-md hover:bg-indigo-700 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มคำสำคัญใหม่</span>
            </button>
          </div>
        </div>

        {/* Bulk Action Loading Progress */}
        {importStatus && (
          <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
            <p className="text-xs font-semibold text-indigo-700">{importStatus}</p>
          </div>
        )}
      </div>

      {/* Add New Form (Modal/Inline) */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl border-2 border-indigo-100 shadow-2xl p-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <h3 className="font-bold text-slate-800 text-base">เพิ่มข้อมูลคำสำคัญ (New Industrial Keyword)</h3>
              <button
                onClick={() => setIsAdding(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">คำสำคัญหลัก (Keyword) - ไม่บังคับ</label>
                <input
                  type="text"
                  value={formKeyword}
                  onChange={(e) => setFormKeyword(e.target.value)}
                  placeholder="เช่น รถยนต์ไฟฟ้า, แปรรูปผลไม้"
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">ประเภทอุตสาหกรรม (Category Name) *</label>
                <input
                  type="text"
                  required
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="เช่น อุตสาหกรรมยานยนต์สมัยใหม่"
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">อุตสาหกรรมเป้าหมาย (Target Industry)</label>
                <input
                  type="text"
                  value={formTargetIndustry}
                  onChange={(e) => setFormTargetIndustry(e.target.value)}
                  placeholder="เช่น First S-curve, New S-curve"
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">ประเภทอุตสาหกรรมหมวดใหญ่ (Major Category)</label>
                <input
                  type="text"
                  value={formMajorCategory}
                  onChange={(e) => setFormMajorCategory(e.target.value)}
                  placeholder="เช่น การผลิต (Manufacturing)"
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">หมวดย่อย (Sub Category Code)</label>
                <input
                  type="text"
                  value={formSubCategoryCode}
                  onChange={(e) => setFormSubCategoryCode(e.target.value)}
                  placeholder="เช่น 29, 30"
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">ประเภทอุตสาหกรรม/ธุรกิจ ที่รองรับ (Sub Category Description)</label>
                <input
                  type="text"
                  value={formSubCategory}
                  onChange={(e) => setFormSubCategory(e.target.value)}
                  placeholder="เช่น การผลิตยานยนต์ รถพ่วง..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>

              <div className="md:col-span-3 border-t border-slate-100 pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Database Table Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 p-6 space-y-5">
        
        {/* Table Filter Control */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาตามคำสำคัญ หรือ ชื่อกลุ่มหมวดหมู่อุตสาหกรรมหลัก..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>
          <p className="text-xs text-slate-400 font-bold">
            ข้อมูลทั้งหมด: {categories.length} รายการ (พบ {filteredCategories.length} รายการ)
          </p>
        </div>

        {/* Database Grid/Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-3 px-3 text-xs font-bold text-slate-500 w-12 text-center">No.</th>
                <th className="py-3 px-3 text-xs font-bold text-slate-500">คำสำคัญหลัก (Keyword)</th>
                <th className="py-3 px-3 text-xs font-bold text-slate-500">ประเภทอุตสาหกรรม (Category)</th>
                <th className="py-3 px-3 text-xs font-bold text-slate-500">อุตสาหกรรมเป้าหมาย</th>
                <th className="py-3 px-3 text-xs font-bold text-slate-500">ประเภทอุตสาหกรรมหมวดใหญ่</th>
                <th className="py-3 px-3 text-xs font-bold text-slate-500 w-16 text-center">หมวดย่อย</th>
                <th className="py-3 px-3 text-xs font-bold text-slate-500">ประเภทอุตสาหกรรม/ธุรกิจ ที่รองรับ (ประเภทอุตสาหกรรมหมวดย่อย)</th>
                <th className="py-3 px-3 text-xs font-bold text-slate-500">ผู้แก้ไขล่าสุด (Updated By)</th>
                <th className="py-3 px-3 text-xs font-bold text-slate-500 text-center w-28">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((cat, idx) => {
                  const isEditing = editingId === cat.id;
                  return (
                    <tr key={cat.id} className="hover:bg-slate-50/40 transition-colors text-xs text-slate-700">
                      <td className="py-3 px-3 text-center font-semibold text-slate-400">{idx + 1}</td>
                      
                      {/* Keyword Cell */}
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {isEditing ? (
                          <input
                            type="text"
                            value={formKeyword}
                            onChange={(e) => setFormKeyword(e.target.value)}
                            className="w-full p-2 rounded-lg border border-indigo-300 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                          />
                        ) : (
                          cat.keyword ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-700 font-mono text-[11px]">
                              {cat.keyword}
                            </span>
                          ) : (
                            <span className="text-slate-300 italic">-</span>
                          )
                        )}
                      </td>

                      {/* Category Name Cell */}
                      <td className="py-3 px-3 font-bold text-slate-700">
                        {isEditing ? (
                          <input
                            type="text"
                            value={formCategory}
                            onChange={(e) => setFormCategory(e.target.value)}
                            className="w-full p-2 rounded-lg border border-indigo-300 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                          />
                        ) : (
                          cat.categoryName
                        )}
                      </td>

                      {/* Target Industry Cell */}
                      <td className="py-3 px-3 text-indigo-700 font-medium">
                        {isEditing ? (
                          <input
                            type="text"
                            value={formTargetIndustry}
                            onChange={(e) => setFormTargetIndustry(e.target.value)}
                            className="w-full p-2 rounded-lg border border-indigo-300 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                          />
                        ) : (
                          cat.targetIndustry || <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Major Category Cell */}
                      <td className="py-3 px-3 text-slate-600">
                        {isEditing ? (
                          <input
                            type="text"
                            value={formMajorCategory}
                            onChange={(e) => setFormMajorCategory(e.target.value)}
                            className="w-full p-2 rounded-lg border border-indigo-300 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                          />
                        ) : (
                          cat.majorCategory || <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Sub Category Code Cell */}
                      <td className="py-3 px-3 text-center text-slate-500 font-mono">
                        {isEditing ? (
                          <input
                            type="text"
                            value={formSubCategoryCode}
                            onChange={(e) => setFormSubCategoryCode(e.target.value)}
                            className="w-full p-2 rounded-lg border border-indigo-300 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none text-center"
                          />
                        ) : (
                          cat.subCategoryCode || <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Sub-category Cell */}
                      <td className="py-3 px-3 text-slate-500">
                        {isEditing ? (
                          <input
                            type="text"
                            value={formSubCategory}
                            onChange={(e) => setFormSubCategory(e.target.value)}
                            className="w-full p-2 rounded-lg border border-indigo-300 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                          />
                        ) : (
                          cat.subCategory || <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Updated By Cell */}
                      <td className="py-3 px-3 text-slate-400">
                        <p className="font-semibold truncate max-w-[120px]">{cat.updatedBy || "-"}</p>
                        <p className="text-[9px] mt-0.5">
                          {new Date(cat.updatedAt).toLocaleDateString("th-TH")}
                        </p>
                      </td>

                      {/* Actions Cell */}
                      <td className="py-3 px-3 text-center">
                        {isEditing ? (
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleSaveEdit(cat.id)}
                              className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                              title="บันทึก"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors"
                              title="ยกเลิก"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => startEdit(cat)}
                              className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                              title="แก้ไข"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(cat.id)}
                              className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                              title="ลบ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400 font-medium">
                    ไม่พบข้อมูลคำสำคัญในตารางฐานข้อมูลหลัก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

      {adminSubTab === "admins" && (
        <div className="space-y-6 animate-fade-in">
          {/* Admin Management Header Card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold">
                  <Shield className="w-3.5 h-3.5" />
                  <span>รายชื่อผู้ถือสิทธิ์ Admin</span>
                </div>
                <h1 className="text-lg font-black text-slate-800 tracking-tight">
                  ระบบจัดการรายชื่อและสิทธิ์ผู้ดูแลระบบ (Admin Permissions)
                </h1>
                <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                  ผู้ดูแลระบบที่มีรายชื่อในส่วนนี้จะได้รับอนุญาตให้ล็อกอินและดำเนินการจัดการหมวดหมู่คำสำคัญหลักในฐานข้อมูลระบบจัดประเภทได้ทันที
                </p>
              </div>

              <div>
                <button
                  onClick={() => {
                    setIsAddingAdmin(!isAddingAdmin);
                    setEditingAdminUid(null);
                    setAdminFormEmail("");
                    setAdminFormDisplayName("");
                  }}
                  className="w-full md:w-auto px-5 py-3 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isAddingAdmin ? (
                    <>
                      <X className="w-4 h-4" />
                      <span>ปิดฟอร์มแต่งตั้ง</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>แต่งตั้งผู้ดูแลระบบใหม่</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Add / Edit Admin Form */}
          <AnimatePresence>
            {isAddingAdmin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-gradient-to-tr from-slate-50 to-indigo-50/20 border border-indigo-100/50 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-xs">
                      ระบุข้อมูลเพื่อแต่งตั้งเป็นผู้ดูแลระบบคนใหม่
                    </h3>
                  </div>

                  <form onSubmit={handleAddAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500">
                        อีเมลบัญชีผู้ใช้ (ต้องลงท้ายด้วย @bu.ac.th) *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={adminFormEmail}
                          onChange={(e) => setAdminFormEmail(e.target.value)}
                          placeholder="example@bu.ac.th"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500">
                        ชื่อ-นามสกุล / ชื่อแสดงผลผู้ดูแลระบบ *
                      </label>
                      <div className="relative">
                        <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={adminFormDisplayName}
                          onChange={(e) => setAdminFormDisplayName(e.target.value)}
                          placeholder="ระบุชื่อแสดงตนในระบบบันทึกข้อมูล"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2 border-t border-indigo-100/50 pt-4 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsAddingAdmin(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 transition-colors flex items-center gap-1.5"
                      >
                        {isLoading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Shield className="w-3.5 h-3.5" />
                        )}
                        <span>แต่งตั้งสิทธิ์ผู้ดูแลระบบ</span>
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Admins Table/Grid Card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 p-6 space-y-4">
            <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <span>รายชื่อผู้ถือสิทธิ์ที่มีอยู่ในระบบปัจจุบัน ({admins.length} รายการ)</span>
            </h3>

            {isLoadingAdmins ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2">
                <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
                <p className="text-xs text-slate-400 font-bold">กำลังดึงรายชื่อผู้ดูแลระบบ...</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-50 rounded-2xl">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 w-12 text-center">ลำดับ</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500">ชื่อผู้ดูแลระบบ</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500">อีเมล</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500">ระดับสิทธิ์ (Role)</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500">วันที่สร้าง / แต่งตั้ง</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 text-center w-28">จัดการสิทธิ์</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {admins.map((adm, index) => {
                      const isEditing = editingAdminUid === adm.uid;
                      const isCurrentUser = adm.uid === user.uid;

                      return (
                        <tr key={adm.uid} className={`hover:bg-slate-50/40 transition-colors text-xs text-slate-700 ${isCurrentUser ? "bg-indigo-50/10" : ""}`}>
                          <td className="py-4 px-4 text-center font-semibold text-slate-400">{index + 1}</td>
                          
                          <td className="py-4 px-4 font-bold text-slate-800">
                            {isEditing ? (
                              <input
                                type="text"
                                value={adminFormDisplayName}
                                onChange={(e) => setAdminFormDisplayName(e.target.value)}
                                className="w-full p-2 rounded-lg border border-indigo-300 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                              />
                            ) : (
                              <div className="flex items-center gap-2.5">
                                {adm.photoURL ? (
                                  <img
                                    src={adm.photoURL}
                                    alt={adm.displayName}
                                    referrerPolicy="no-referrer"
                                    className="w-7 h-7 rounded-full border border-slate-100"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center text-[11px] uppercase shadow-sm shadow-indigo-100 shrink-0">
                                    {adm.displayName ? adm.displayName.substring(0, 2) : "AD"}
                                  </div>
                                )}
                                <div className="space-y-0.5">
                                  <span className="font-bold text-slate-800">{adm.displayName}</span>
                                  {isCurrentUser && (
                                    <span className="ml-2 inline-flex items-center text-[9px] font-extrabold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                                      คุณ (You)
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-4 font-mono text-slate-600">{adm.email}</td>

                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full font-bold text-[10px] uppercase">
                              <Shield className="w-3 h-3 text-indigo-500" />
                              <span>{adm.role}</span>
                            </span>
                          </td>

                          <td className="py-4 px-4 text-slate-400">
                            {adm.createdAt ? new Date(adm.createdAt).toLocaleDateString("th-TH", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            }) : "-"}
                          </td>

                          <td className="py-4 px-4 text-center">
                            {isEditing ? (
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => handleSaveAdminEdit(adm.uid)}
                                  className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                                  title="บันทึก"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingAdminUid(null);
                                    setAdminFormDisplayName("");
                                  }}
                                  className="p-1.5 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors"
                                  title="ยกเลิก"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingAdminUid(adm.uid);
                                    setAdminFormDisplayName(adm.displayName);
                                  }}
                                  className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                                  title="แก้ไขชื่อ"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmAdminUid(adm.uid)}
                                  disabled={isCurrentUser}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    isCurrentUser
                                      ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                                      : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                                  }`}
                                  title={isCurrentUser ? "ไม่สามารถลบตัวเองได้" : "ยกเลิกสิทธิ์"}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

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
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl p-6 space-y-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 shadow-sm">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-extrabold text-slate-800 text-sm">ยืนยันการลบข้อมูล</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    คุณต้องการลบคำสำคัญและหมวดหมู่อุตสาหกรรมนี้ออกจากระบบใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-50 pt-4">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => handleDeleteCategory(deleteConfirmId)}
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>ลบข้อมูล</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Admin Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmAdminUid && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl p-6 space-y-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 shadow-sm">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-extrabold text-slate-800 text-sm">ยกเลิกสิทธิ์ผู้ดูแลระบบ</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    คุณแน่ใจหรือไม่ว่าต้องการยกเลิกสิทธิ์ผู้ดูแลระบบของบุคคลนี้? การดำเนินการนี้จะระงับสิทธิ์ในการเข้าถึงและแก้ไขฐานข้อมูลทันที
                  </p>
                  {admins.find(a => a.uid === deleteConfirmAdminUid) && (
                    <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100/50 text-xs text-rose-800 space-y-0.5 font-semibold">
                      <p>ชื่อ: {admins.find(a => a.uid === deleteConfirmAdminUid)?.displayName}</p>
                      <p>อีเมล: {admins.find(a => a.uid === deleteConfirmAdminUid)?.email}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-50 pt-4">
                <button
                  onClick={() => setDeleteConfirmAdminUid(null)}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => handleDeleteAdmin(deleteConfirmAdminUid)}
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>ยืนยันถอดถอนสิทธิ์</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear All Confirmation Modal */}
      <AnimatePresence>
        {showClearAllConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl p-6 space-y-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-sm">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-extrabold text-slate-800 text-sm">แจ้งเตือน: ยืนยันการเคลียร์ข้อมูลทั้งหมด</h3>
                  <p className="text-xs text-rose-600 font-bold leading-relaxed">
                    คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลคำสำคัญอ้างอิงทั้งหมดในฐานข้อมูลจำนวน {categories.length} รายการ?
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    การดำเนินการนี้จะล้างข้อมูลทั้งหมดในตาราง และไม่สามารถกู้คืนกลับมาได้ โปรดตรวจสอบให้แน่ใจว่าคุณได้ส่งออก (Export) ข้อมูลสำรองไว้แล้วก่อนดำเนินการ
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  onClick={() => setShowClearAllConfirm(false)}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  ยกเลิกการเคลียร์
                </button>
                <button
                  onClick={handleClearAllDatabase}
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>ยืนยันเคลียร์ข้อมูลทั้งหมด</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
