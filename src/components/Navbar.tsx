import { User } from "firebase/auth";
import { Factory, ShieldAlert, LogIn, LogOut, Settings, Layers } from "lucide-react";
import { motion } from "motion/react";

interface NavbarProps {
  user: User | null;
  isAdmin: boolean;
  activeTab: "user" | "admin";
  setActiveTab: (tab: "user" | "admin") => void;
  onLogin: () => void;
  onLogout: () => void;
}

export default function Navbar({
  user,
  isAdmin,
  activeTab,
  setActiveTab,
  onLogin,
  onLogout,
}: NavbarProps) {
  return (
    <header className="w-full bg-white/80 backdrop-blur-md border-b border-indigo-100 sticky top-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo and App Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span>BU Industry <span className="text-indigo-600">Classifier</span></span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                v1.0
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              ระบบจัดกลุ่มประเภทอุตสาหกรรมอัจฉริยะ (Bangkok University)
            </p>
          </div>
        </div>

        {/* Tab Selection & User Info */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Navigation Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab("user")}
              className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all duration-300 flex items-center gap-2 ${
                activeTab === "user"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>ผู้ใช้งานทั่วไป (Search)</span>
            </button>

            <button
              onClick={() => {
                if (user && isAdmin) {
                  setActiveTab("admin");
                } else {
                  onLogin();
                }
              }}
              className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all duration-300 flex items-center gap-2 ${
                activeTab === "admin"
                  ? "bg-white text-violet-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>ผู้ดูแลระบบ (Admin)</span>
              {!isAdmin && (
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              )}
            </button>
          </div>

          {/* User Auth Info / Button */}
          {user ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 pl-3 border-l border-slate-200"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "Admin"}
                  className="w-9 h-9 rounded-full border-2 border-violet-400 shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm">
                  {user.displayName?.charAt(0) || "A"}
                </div>
              )}
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-slate-700 leading-tight">
                  {user.displayName || "ผู้ดูแลระบบ"}
                </p>
                <p className="text-[10px] text-slate-400 leading-none">
                  {user.email}
                </p>
              </div>

              <button
                onClick={onLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                title="ออกจากระบบ"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <button
              onClick={onLogin}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md hover:from-violet-700 hover:to-indigo-700 transition-all flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>เข้าสู่ระบบ @bu.ac.th</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
