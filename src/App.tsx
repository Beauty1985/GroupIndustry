import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import { 
  ShieldAlert, Sparkles, LogIn, CheckCircle2, HelpCircle, 
  Layers, Github, ExternalLink, HelpCircle as InfoIcon,
  Database, RefreshCw, FileCode, Check, X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { auth, db, googleProvider, OperationType, handleFirestoreError } from "./firebase";
import { IndustrialCategory, AdminProfile } from "./types";
import { DEFAULT_CATEGORIES } from "./defaultCategories";
import Navbar from "./components/Navbar";
import UserWorkspace from "./components/UserWorkspace";
import AdminWorkspace from "./components/AdminWorkspace";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"user" | "admin">("user");
  const [categories, setCategories] = useState<IndustrialCategory[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [showDeploymentGuide, setShowDeploymentGuide] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showFeedback = (text: string, type: "success" | "error" | "info") => {
    setFeedback({ text, type });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  // 1. Listen for categories in Firestore in Real-time
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "industrial_categories"),
      (snapshot) => {
        const items: IndustrialCategory[] = [];
        snapshot.forEach((doc) => {
          items.push(doc.data() as IndustrialCategory);
        });

        // If firestore is empty, use our local default categories catalog
        if (items.length > 0) {
          setCategories(items.sort((a, b) => b.updatedAt - a.updatedAt));
        } else {
          setCategories(DEFAULT_CATEGORIES);
        }
      },
      (error) => {
        console.warn("Firestore categories loaded with fallback due to rules or connection:", error);
        setCategories(DEFAULT_CATEGORIES);
        handleFirestoreError(error, OperationType.LIST, "industrial_categories");
      }
    );

    return () => unsub();
  }, []);

  // 2. Listen for Auth State Changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currUser) => {
      setIsLoadingAuth(true);
      setAuthError(null);

      if (currUser) {
        // Enforce Google Authentication limited to @bu.ac.th
        const email = currUser.email || "";
        const isBuDomain = email.endsWith("@bu.ac.th");

        // FOR DEVELOPMENT PREVIEW ONLY: Let the main developer email pass as admin
        // Currently walailuk.p@bu.ac.th is the user, which is already a @bu.ac.th domain!
        if (isBuDomain) {
          setIsAdmin(true);
          setUser(currUser);

          // DATA PRIVACY RULE: Save admin profile to Firestore only for authorized Admins
          try {
            const adminProfile: AdminProfile = {
              uid: currUser.uid,
              email: currUser.email!,
              displayName: currUser.displayName || "Admin",
              photoURL: currUser.photoURL || undefined,
              role: "admin",
              createdAt: Date.now(),
            };
            await setDoc(doc(db, "admins", currUser.uid), adminProfile);
          } catch (err) {
            console.error("Error writing admin profile:", err);
            // Non-blocking: log the error instead of throwing to prevent blocking the login loading state
          }
        } else {
          // If not @bu.ac.th domain, deny access, show error and sign out
          setAuthError("สิทธิ์การเข้าถึงสำหรับผู้ดูแลระบบถูกจำกัดเฉพาะผู้ใช้ที่มีอีเมล @bu.ac.th เท่านั้น");
          setIsAdmin(false);
          setUser(null);
          await signOut(auth);
        }
      } else {
        setIsAdmin(false);
        setUser(null);
      }
      setIsLoadingAuth(false);
    });

    return () => unsub();
  }, []);

  // 3. Google Login Trigger
  const handleLogin = async () => {
    setAuthError(null);
    setIsLoadingAuth(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Login failed:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setAuthError("เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อลงชื่อเข้าใช้งาน โปรดลองอีกครั้ง");
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // 4. Logout Trigger
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveTab("user");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // 5. Seed Firestore with Defaults
  const seedDefaultData = async () => {
    if (!user || !isAdmin) return;
    setIsSeeding(true);
    try {
      for (const cat of DEFAULT_CATEGORIES) {
        const cleanCat = {
          ...cat,
          updatedBy: user.email || "System Seed",
          updatedAt: Date.now()
        };
        await setDoc(doc(db, "industrial_categories", cat.id), cleanCat);
      }
      showFeedback("นำเข้าฐานข้อมูลอ้างอิงเริ่มต้นเรียบร้อยแล้ว!", "success");
    } catch (err) {
      console.error("Error seeding default data:", err);
      handleFirestoreError(err, OperationType.WRITE, "industrial_categories");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col justify-between">
      <div>
        {/* Main Header / Navigation */}
        <Navbar
          user={user}
          isAdmin={isAdmin}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />

        {/* Hero Announcement/Landing Panel */}
        <div className="bg-gradient-to-br from-indigo-50 via-indigo-50/20 to-white py-10 px-6 border-b border-indigo-100">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            
            {/* Title & Banner Info */}
            <div className="md:col-span-2 space-y-4">
              <div className="inline-flex items-center gap-1.5 bg-indigo-100/60 border border-indigo-200 text-indigo-700 text-xs px-3 py-1 rounded-full font-bold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                <span>ระบบสืบค้นและคัดแยกกลุ่มอุตสาหกรรมด้วยเทคนิคจับคู่คำสำคัญ (Keyword Matching Engine)</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight leading-tight">
                จัดประเภทอุตสาหกรรมได้ถูกต้องและ <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-700">
                  แม่นยำรวดเร็วแบบ Real-time
                </span>
              </h2>
              <p className="text-slate-500 text-sm max-w-2xl leading-relaxed">
                ช่วยคัดกรองข้อมูลอุตสาหกรรมในทันทีจากการพิมพ์ชื่อหรือรายละเอียดลักษณะงาน 
                หรืออัปโหลดไฟล์ Excel/CSV บัญชีรายชื่อกิจการ เพื่อประมวลผลจัดกลุ่มหลัก 
                สอดรับกับหลักเกณฑ์และมาตรฐานอุตสาหกรรมของประเทศไทย
              </p>
            </div>

            {/* Micro Stats Card */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xl shadow-indigo-100/40 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">ฐานข้อมูลอ้างอิงหลัก</span>
                <Database className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="my-3">
                <p className="text-4xl font-black text-slate-800">{categories.length}</p>
                <p className="text-xs text-slate-400 font-semibold mt-1">คำสำคัญและหมวดหมู่ถูกบันทึกในฐานข้อมูล</p>
              </div>
              <div className="text-[10px] bg-slate-50 p-2.5 rounded-xl text-slate-500 border border-slate-100 leading-normal">
                {categories === DEFAULT_CATEGORIES ? (
                  <span className="text-amber-600 font-semibold flex items-center gap-1">
                    ⚠️ ใช้ฐานข้อมูลสำรองภายในแอป (Local Fallback)
                  </span>
                ) : (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    🟢 เชื่อมต่อข้อมูล Cloud Firestore Real-time สำเร็จ
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Workspace Display Area */}
        <main className="max-w-7xl mx-auto px-6 py-10">
          <AnimatePresence mode="wait">
            
            {/* 1. General User View */}
            {activeTab === "user" && (
              <motion.div
                key="user-view"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
              >
                <UserWorkspace categories={categories} />
              </motion.div>
            )}

            {/* 2. Admin Workspace (Logged In & Authorized) */}
            {activeTab === "admin" && user && isAdmin && (
              <motion.div
                key="admin-view"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
              >
                {/* Admin Intro with Seed Option */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-indigo-50/50 border border-indigo-100 p-4 rounded-3xl mb-6 text-xs gap-4">
                  <div className="flex items-center gap-2.5 text-indigo-800">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="font-bold">ลงชื่อเข้าใช้งานเป็นผู้ดูแลระบบสำเร็จ: {user.email}</p>
                      <p className="text-[10px] text-indigo-500 font-medium">คุณสามารถเพิ่ม แก้ไข ลบ และนำเข้าข้อมูลอุตสาหกรรมในระบบคลาวด์ได้ทันที</p>
                    </div>
                  </div>
                  
                  {/* Option to Seed Database if currently empty or fallback */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={seedDefaultData}
                      disabled={isSeeding}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSeeding ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Database className="w-3.5 h-3.5" />
                      )}
                      <span>ติดตั้งข้อมูลตัวอย่างลง Firestore (Seed Database)</span>
                    </button>
                  </div>
                </div>

                <AdminWorkspace
                  categories={categories}
                  user={user}
                  refreshCategories={async () => {}} // Snapshot takes care of it in real-time
                />
              </motion.div>
            )}

            {/* 3. Admin Authentication Request (If choosing Admin tab but not logged in) */}
            {activeTab === "admin" && (!user || !isAdmin) && (
              <motion.div
                key="admin-login-view"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="max-w-md mx-auto text-center bg-white p-8 rounded-3xl border border-slate-100 shadow-2xl space-y-6 my-10"
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-md">
                  <ShieldAlert className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-800">จำกัดเฉพาะผู้ดูแลระบบ</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    หน้าจอนี้สำหรับเจ้าหน้าที่ในการอัปโหลดไฟล์ Master Database และแก้ไขรายชื่อประเภทอุตสาหกรรม 
                    ระบบจำกัดการเข้าใช้งานผ่านบัญชี Google ภายใต้โดเมนสถาบันการศึกษา <strong className="text-indigo-600">@bu.ac.th</strong> เท่านั้น
                  </p>
                </div>

                {authError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-600 font-semibold text-left">
                    {authError}
                  </div>
                )}

                <button
                  onClick={handleLogin}
                  disabled={isLoadingAuth}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold hover:shadow-lg hover:shadow-indigo-200 text-xs transition-all flex items-center justify-center gap-2.5"
                >
                  {isLoadingAuth ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  <span>ลงชื่อเข้าใช้งานด้วย Google (@bu.ac.th)</span>
                </button>

                <div className="border-t border-slate-100 pt-5">
                  <button
                    onClick={() => setActiveTab("user")}
                    className="text-xs text-indigo-600 font-bold hover:underline"
                  >
                    กลับสู่หน้าหลักสำหรับผู้ใช้งานทั่วไป
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* Modern Responsive Footer & Tech Spec */}
      <footer className="bg-white border-t border-slate-100 py-10 px-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-bold text-slate-700">Client-Side Architecture (Netlify & GitHub Ready)</p>
            </div>
            <p className="text-[11px] text-slate-400 max-w-xl leading-normal">
              แอปพลิเคชันนี้ออกแบบตามสถาปัตยกรรมไร้เซิร์ฟเวอร์ (Serverless) ทำงานได้โดยสมบูรณ์ผ่านเว็บเบราว์เซอร์ของผู้ใช้ 
              เชื่อมต่อโดยตรงกับ Firebase Firestore Spark Plan โดยไม่มีการใช้ Cloud Run ในการประมวลผลปลายทาง 
              รองรับการซิงค์รหัสต้นฉบับกับ GitHub และดีพลอยบน Netlify ได้ทันที
            </p>
          </div>

          {/* Guidelines info regarding Google Workspace APIs */}
          <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl max-w-md text-xs">
            <div className="flex items-start gap-2.5 text-indigo-800 leading-normal">
              <InfoIcon className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-0.5">💡 ข้อแนะนำสำหรับการเชื่อมต่อ Workspace อื่นๆ</p>
                <p className="text-[10px] text-indigo-600">
                  หากท่านต้องการขยายระบบให้เชื่อมต่อกับบริการ Gmail หรือ Google Calendar เพื่อแจ้งเตือนอัตโนมัติ 
                  โปรดเลือกใช้งานผ่าน <strong className="underline">Google Sheets</strong> และ <strong className="underline">Google Apps Script</strong> ทดแทนระบบคลาวด์เซิร์ฟเวอร์ เพื่อความเรียบง่ายและเสถียรในแผนบริการฟรี
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Small Attribution */}
        <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 gap-4">
          <p>© 2026 ระบบคัดแยกอุตสาหกรรมอัตโนมัติ. มหาวิทยาลัยกรุงเทพ. สงวนลิขสิทธิ์.</p>
          <div className="flex items-center gap-3">
            <span className="hover:text-slate-600 cursor-pointer flex items-center gap-1" onClick={() => setShowDeploymentGuide(true)}>
              <FileCode className="w-3.5 h-3.5" /> คู่มือการดีพลอย Netlify / GitHub
            </span>
            <span>|</span>
            <span>Firestore Database: feedback-6a95d</span>
          </div>
        </div>
      </footer>

      {/* Deployment Guide Modal */}
      <AnimatePresence>
        {showDeploymentGuide && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="bg-white rounded-3xl p-6 max-w-xl w-full border border-slate-100 shadow-2xl relative space-y-4"
            >
              <button
                onClick={() => setShowDeploymentGuide(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-800">🚀 ขั้นตอนการ Deploy ลง Netlify & Sync กับ GitHub</h4>
                <p className="text-xs text-slate-400">ระบบของท่านเขียนขึ้นในแบบ Client-side SPA ซึ่งเหมาะสำหรับการโฮสต์ฟรีมากที่สุด</p>
              </div>

              <div className="space-y-3.5 text-xs text-slate-600 leading-normal">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="font-bold text-slate-800 mb-1">ขั้นตอนที่ 1: ซิงค์รหัสต้นฉบับขึ้น GitHub</p>
                  <p className="text-[11px] text-slate-500">สร้าง Repository ใหม่บน GitHub และอัปโหลดไฟล์ทั้งหมดจากโฟลเดอร์นี้ยกเว้นโฟลเดอร์ build/dist</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="font-bold text-slate-800 mb-1">ขั้นตอนที่ 2: เชื่อมโยงกับ Netlify</p>
                  <p className="text-[11px] text-slate-500">ล็อกอินเข้าสู่ Netlify เลือก "Add new site" แล้วคลิก "Import from GitHub" จากนั้นเลือก Repository ของแอปนี้</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="font-bold text-slate-800 mb-1">ขั้นตอนที่ 3: ตั้งค่าคำสั่ง Build</p>
                  <ul className="list-disc pl-4 text-[11px] text-slate-500 space-y-1 mt-1">
                    <li>Build Command: <code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700">npm run build</code></li>
                    <li>Publish Directory: <code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700">dist</code></li>
                  </ul>
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <p className="font-bold text-indigo-800 mb-1">⚠️ คำแนะนำสำคัญเกี่ยวกับ Google OAuth</p>
                  <p className="text-[11px] text-indigo-600">
                    หลังจากดีพลอยลง Netlify แล้ว ให้นำ URL ของเว็บไซต์ที่ได้ ไปเพิ่มใน Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains เพื่อให้อีเมลแอดมิน @bu.ac.th สามารถเข้าสู่ระบบบนเว็บจริงได้สำเร็จ
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowDeploymentGuide(false)}
                  className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-900 transition-colors text-xs"
                >
                  เข้าใจแล้ว
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
