import { useState, useEffect } from "react";
import { User, UserRole } from "./types";
import { initDB, logoutUser, attachRealtimeListeners, loginUser } from "./lib/db";
import { auth, db } from "./lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Maximize2, Minimize2 } from "lucide-react";
import RoleSelection from "./components/RoleSelection";
import LoginForm from "./components/LoginForm";
import StudentDashboard from "./components/StudentDashboard";
import TeacherDashboard from "./components/TeacherDashboard";
import GoogleOnboardingModal from "./components/GoogleOnboardingModal";
import AnimatedThemeBackground from "./components/AnimatedThemeBackground";

export type AppTheme = "default" | "dark";

const THEME_STORAGE_KEY = "attendance_system_theme";

function getStoredTheme(): AppTheme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "default" || stored === "dark") {
    return stored;
  }
  return "default";
}

export default function App() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [theme, setTheme] = useState<AppTheme>(getStoredTheme);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.log(err));
    } else {
      document.exitFullscreen().catch((err) => console.log(err));
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle("theme-darker", theme === "dark");
    document.documentElement.classList.toggle("theme-default", theme === "default");
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const handleThemeChange = (newTheme: AppTheme) => {
    setTheme(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  useEffect(() => {
    initDB();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        attachRealtimeListeners();
        try {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (snap.exists()) {
            const profile = snap.data() as User;
            setCurrentUser(profile);
            setSelectedRole(profile.role);
          }
        } catch (err) {
          console.error("Error restoring session:", err);
        }
      }
      setCheckingSession(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedRole(null);
    logoutUser().catch((err) => console.error("Error signing out:", err));
  };

  const needsStudentOnboarding =
    currentUser !== null &&
    currentUser.role === "student" &&
    (!currentUser.department ||
      !currentUser.department.trim() ||
      currentUser.id.startsWith("google_"));

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="text-sm text-blue-600 font-semibold font-display animate-pulse tracking-tight">
          Loading Attendance Hub...
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-[100dvh] selection:bg-blue-100 selection:text-blue-900 antialiased font-sans flex flex-col justify-between relative overflow-x-hidden ${
        theme === "dark"
          ? "bg-slate-900 text-slate-100"
          : "bg-[#f8f9fa] text-gray-900"
      }`}
      id="app-root"
    >
      <AnimatedThemeBackground theme={theme} />

      {/* Floating Fullscreen Toggle */}
      <button
        onClick={toggleFullscreen}
        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        className={`fixed top-3 right-3 sm:top-4 sm:right-4 z-50 p-2 sm:p-2.5 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 group cursor-pointer ${
          theme === "dark"
            ? "bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600"
            : "bg-white border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300"
        }`}
        aria-label="Toggle Fullscreen"
      >
        {isFullscreen ? (
          <Minimize2 className="w-4 h-4 transition-transform group-hover:scale-110" />
        ) : (
          <Maximize2 className="w-4 h-4 transition-transform group-hover:scale-110" />
        )}
      </button>

      <main className="flex-grow flex flex-col justify-center relative z-10 w-full">
        {selectedRole === null && (
          <RoleSelection
            onSelectRole={(role) => setSelectedRole(role)}
          />
        )}

        {selectedRole !== null && currentUser === null && (
          <LoginForm
            role={selectedRole}
            onBack={() => setSelectedRole(null)}
            onLoginSuccess={(user) => setCurrentUser(user)}
          />
        )}

        {currentUser !== null && currentUser.role === "student" && (
          <StudentDashboard user={currentUser} onLogout={handleLogout} theme={theme} onThemeChange={handleThemeChange} />
        )}

        {currentUser !== null && currentUser.role === "teacher" && (
          <TeacherDashboard user={currentUser} onLogout={handleLogout} theme={theme} onThemeChange={handleThemeChange} />
        )}

        {needsStudentOnboarding && currentUser && (
          <GoogleOnboardingModal
            user={currentUser}
            onComplete={(updated) => setCurrentUser(updated)}
            onLogout={handleLogout}
          />
        )}
      </main>

      <footer className={`py-2.5 sm:py-3 mb-2 sm:mb-3 border-t text-center text-[10px] sm:text-xs font-medium font-sans relative z-10 shrink-0 pb-[calc(10px+env(safe-area-inset-bottom))] ${
        theme === "dark"
          ? "border-slate-800 text-slate-500"
          : "border-gray-200 text-gray-400"
      }`}>
        &copy; {new Date().getFullYear()} Attendance Hub &bull; Made by Bryn Monzon
      </footer>
    </div>
  );
}
