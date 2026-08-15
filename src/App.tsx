import { useState, useEffect } from "react";
import { User, UserRole } from "./types";
import { initDB, logoutUser, attachRealtimeListeners } from "./lib/db";
import { auth, db } from "./lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Maximize2, Minimize2, Palette, Moon, Sun } from "lucide-react";
import RoleSelection from "./components/RoleSelection";
import LoginForm from "./components/LoginForm";
import StudentDashboard from "./components/StudentDashboard";
import TeacherDashboard from "./components/TeacherDashboard";
import GoogleOnboardingModal from "./components/GoogleOnboardingModal";
import AnimatedThemeBackground from "./components/AnimatedThemeBackground";
import ThemeSelector from "./components/ThemeSelector";

export type AppTheme = "default" | "spring" | "summer" | "autumn" | "winter";
export type AppThemeMode = "night" | "day";

const THEME_STORAGE_KEY = "attendance_system_theme";
const THEME_MODE_STORAGE_KEY = "attendance_system_theme_mode";
const PERF_MODE_STORAGE_KEY = "attendance_perf_mode";

function getStoredTheme(): AppTheme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (
    stored === "default" ||
    stored === "spring" ||
    stored === "summer" ||
    stored === "autumn" ||
    stored === "winter"
  ) {
    return stored as AppTheme;
  }
  return "default";
}

function getStoredThemeMode(): AppThemeMode {
  const stored = localStorage.getItem(THEME_MODE_STORAGE_KEY);
  if (stored === "night" || stored === "day") {
    return stored as AppThemeMode;
  }
  return "night"; // Default to Night mode
}

function getStoredPerformanceMode(): boolean {
  return localStorage.getItem(PERF_MODE_STORAGE_KEY) === "true";
}

export default function App() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [theme, setTheme] = useState<AppTheme>(getStoredTheme);
  const [themeMode, setThemeMode] = useState<AppThemeMode>(getStoredThemeMode);
  const [performanceMode, setPerformanceMode] = useState<boolean>(getStoredPerformanceMode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

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
    document.documentElement.classList.remove(
      "theme-default",
      "theme-darker",
      "theme-spring",
      "theme-summer",
      "theme-autumn",
      "theme-winter",
      "mode-night",
      "mode-day",
      "dark"
    );
    document.documentElement.classList.add(`theme-${theme}`);
    document.documentElement.classList.add(`mode-${themeMode}`);
    document.documentElement.classList.add("dark");
  }, [theme, themeMode]);

  // Explicit theme pick handler
  const handleThemeChange = (newTheme: AppTheme) => {
    setTheme(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  // Explicit night / day mode toggle handler
  const handleThemeModeChange = (newMode: AppThemeMode) => {
    setThemeMode(newMode);
    localStorage.setItem(THEME_MODE_STORAGE_KEY, newMode);
  };

  const togglePerformanceMode = () => {
    setPerformanceMode((prev) => {
      const next = !prev;
      localStorage.setItem(PERF_MODE_STORAGE_KEY, String(next));
      return next;
    });
  };

  const toggleThemeMode = () => {
    const nextMode: AppThemeMode = themeMode === "night" ? "day" : "night";
    handleThemeModeChange(nextMode);
  };

  useEffect(() => {
    // Initialize Database
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-cyan-400 font-bold font-display animate-pulse">Loading Attendance Hub...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] text-ink selection:bg-cyan-500/30 selection:text-cyan-300 antialiased font-sans flex flex-col justify-between relative overflow-x-hidden" id="app-root">
      <AnimatedThemeBackground theme={theme} mode={themeMode} performanceMode={performanceMode} />

      {/* Top Floating Utility Header: Theme Quick Switcher, Night/Day Mode & Fullscreen Mode */}
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 flex items-center gap-2">
        {/* Quick Theme Switcher Pill Button */}
        <div className="relative">
          <button
            onClick={() => setShowThemePicker(!showThemePicker)}
            title="Switch Theme Environment"
            className="p-2 sm:p-2.5 rounded-xl bg-slate-900/80 border border-white/10 hover:border-cyan-400/50 text-slate-300 hover:text-cyan-300 backdrop-blur-md transition-all shadow-lg hover:shadow-cyan-500/20 active:scale-95 group cursor-pointer flex items-center gap-1.5"
            aria-label="Theme Environment Switcher"
          >
            <Palette className="w-4 h-4 transition-transform group-hover:rotate-12" />
            <span className="hidden md:inline text-xs font-black capitalize">{theme}</span>
          </button>

          {/* Popover Theme Selector Dropdown */}
          {showThemePicker && (
            <div className="absolute top-12 right-0 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-slate-900/95 border border-white/20 rounded-2xl p-3.5 shadow-2xl backdrop-blur-2xl z-50 space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                <span className="text-[11px] font-black uppercase text-cyan-400 font-display">Environment & Mode</span>
                <button
                  onClick={() => setShowThemePicker(false)}
                  className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded-lg hover:bg-white/10"
                >
                  Close
                </button>
              </div>
              <ThemeSelector
                currentTheme={theme}
                themeMode={themeMode}
                onSelectTheme={(newTheme) => {
                  handleThemeChange(newTheme);
                  setShowThemePicker(false);
                }}
                onThemeModeChange={handleThemeModeChange}
                variant="compact"
              />
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-200">⚡ Smooth Performance Mode</span>
                  <span className="text-[9px] text-slate-400">Reduces particle load for instant speed</span>
                </div>
                <button
                  type="button"
                  onClick={togglePerformanceMode}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    performanceMode
                      ? "bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(0,240,255,0.4)]"
                      : "bg-slate-800 text-slate-400 border border-white/10 hover:text-white"
                  }`}
                >
                  {performanceMode ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Day / Night Toggle Pill */}
        <button
          onClick={toggleThemeMode}
          title={`Switch to ${themeMode === "night" ? "Day" : "Night"} Mode (${theme} theme)`}
          className="p-2 sm:p-2.5 rounded-xl bg-slate-900/80 border border-white/10 hover:border-cyan-400/50 text-slate-300 hover:text-cyan-300 backdrop-blur-md transition-all shadow-lg hover:shadow-cyan-500/20 active:scale-95 group cursor-pointer flex items-center gap-1.5"
          aria-label="Toggle Night/Day Mode"
        >
          {themeMode === "night" ? (
            <Moon className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
          )}
          <span className="hidden sm:inline text-xs font-bold capitalize">
            {themeMode === "night" ? "Night" : "Day"}
          </span>
        </button>

        {/* Floating Fullscreen Mode Toggle */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          className="p-2 sm:p-2.5 rounded-xl bg-slate-900/80 border border-white/10 hover:border-cyan-400/50 text-slate-300 hover:text-cyan-300 backdrop-blur-md transition-all shadow-lg hover:shadow-cyan-500/20 active:scale-95 group cursor-pointer"
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 transition-transform group-hover:scale-110" />
          ) : (
            <Maximize2 className="w-4 h-4 transition-transform group-hover:scale-110" />
          )}
        </button>
      </div>

      <main className="flex-grow flex flex-col justify-center relative z-10 w-full">
        {selectedRole === null && (
          <RoleSelection
            onSelectRole={(role) => setSelectedRole(role)}
            theme={theme}
            themeMode={themeMode}
          />
        )}

        {selectedRole !== null && currentUser === null && (
          <LoginForm
            role={selectedRole}
            onBack={() => setSelectedRole(null)}
            onLoginSuccess={(user) => setCurrentUser(user)}
            theme={theme}
            themeMode={themeMode}
          />
        )}

        {currentUser !== null && currentUser.role === "student" && (
          <StudentDashboard
            user={currentUser}
            onLogout={handleLogout}
            theme={theme}
            onThemeChange={handleThemeChange}
            themeMode={themeMode}
            onThemeModeChange={handleThemeModeChange}
          />
        )}

        {currentUser !== null && currentUser.role === "teacher" && (
          <TeacherDashboard
            user={currentUser}
            onLogout={handleLogout}
            theme={theme}
            onThemeChange={handleThemeChange}
            themeMode={themeMode}
            onThemeModeChange={handleThemeModeChange}
          />
        )}

        {/* Modal requiring students who signed in with Google to enter their Student ID and Department/Course */}
        {needsStudentOnboarding && currentUser && (
          <GoogleOnboardingModal
            user={currentUser}
            onComplete={(updated) => setCurrentUser(updated)}
            onLogout={handleLogout}
          />
        )}
      </main>

      <footer className="py-2.5 sm:py-3 mb-2 sm:mb-3 border-t border-white/10 text-center text-[10px] sm:text-xs text-slate-300 font-medium font-sans relative z-10 backdrop-blur-md bg-slate-950/40 shrink-0 pb-[calc(10px+env(safe-area-inset-bottom))]">
        &copy; {new Date().getFullYear()} Attendance Hub &bull; Made by Bryn Monzon
      </footer>
    </div>
  );
}

