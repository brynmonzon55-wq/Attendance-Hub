import { useState, useEffect } from "react";
import { User, UserRole } from "./types";
import { initDB, logoutUser, attachRealtimeListeners, loginUser } from "./lib/db";
import { auth, db } from "./lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import RoleSelection from "./components/RoleSelection";
import LoginForm from "./components/LoginForm";
import StudentDashboard from "./components/StudentDashboard";
import TeacherDashboard from "./components/TeacherDashboard";
import AnimatedThemeBackground from "./components/AnimatedThemeBackground";

export type AppTheme = "default" | "dark";

const THEME_STORAGE_KEY = "attendance_system_theme";

function getStoredTheme(): AppTheme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "default" || stored === "dark") {
    return stored;
  }
  return "dark";
}

export default function App() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [theme, setTheme] = useState<AppTheme>(getStoredTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("theme-darker", theme === "dark");
    document.documentElement.classList.toggle("theme-default", theme === "default");
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Explicit theme pick from Settings
  const handleThemeChange = (newTheme: AppTheme) => {
    setTheme(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  useEffect(() => {
    // Initialize the Database
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

  const handleQuickTestLogin = async (role: UserRole) => {
    try {
      const demoId = role === "student" ? "student101" : "teacher1";
      const demoPass = role === "student" ? "student103" : "teacher123";
      const user = await loginUser(demoId, demoPass, role);
      setCurrentUser(user);
      setSelectedRole(role);
    } catch (err) {
      console.error("Error logging in via quick test:", err);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-cyan-400 font-bold font-display animate-pulse">Loading Attendance Hub...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] text-ink selection:bg-cyan-500/30 selection:text-cyan-300 antialiased font-sans flex flex-col justify-between relative overflow-x-hidden" id="app-root">
      <AnimatedThemeBackground theme={theme} />

      <main className="flex-grow flex flex-col justify-center relative z-10 w-full">
        {selectedRole === null && (
          <RoleSelection
            onSelectRole={(role) => setSelectedRole(role)}
            onQuickTestLogin={handleQuickTestLogin}
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
      </main>

      <footer className="py-2.5 sm:py-3 mb-2 sm:mb-3 border-t border-white/10 text-center text-[10px] sm:text-xs text-slate-400/60 font-medium font-sans relative z-10 backdrop-blur-md bg-slate-950/30 shrink-0 opacity-60 pb-[calc(10px+env(safe-area-inset-bottom))]">
        &copy; {new Date().getFullYear()} Attendance Hub &bull; Neon Edition by Bryn Monzon
      </footer>
    </div>
  );
}

