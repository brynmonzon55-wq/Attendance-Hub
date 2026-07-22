/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { User, UserRole } from "./types";
import { initDB, logoutUser, attachRealtimeListeners } from "./lib/db";
import { auth, db } from "./lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import RoleSelection from "./components/RoleSelection";
import LoginForm from "./components/LoginForm";
import StudentDashboard from "./components/StudentDashboard";
import TeacherDashboard from "./components/TeacherDashboard";

export type AppTheme = "default" | "dark" | "void" | "ghost" | "blood-moon";

const THEME_STORAGE_KEY = "attendance_system_theme";

function getStoredTheme(): AppTheme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "default" || stored === "dark" || stored === "void" || stored === "ghost" || stored === "blood-moon") {
    // The person has explicitly picked a theme before - always respect that,
    // even if it happens to be "default" while their system is in dark mode.
    return stored;
  }
  // No explicit choice saved yet - default to the phone/browser's own
  // dark mode setting instead of always forcing the light theme.
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "default";
}

export default function App() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [theme, setTheme] = useState<AppTheme>(getStoredTheme);

  useEffect(() => {
    // Apply the theme filter to <html> itself (not an inner wrapper div).
    // Applying `filter` to a wrapper makes that wrapper the containing
    // block for any position:fixed descendants (like modals), which
    // breaks them the moment the page scrolls horizontally at all - they
    // drift instead of staying pinned to the real viewport. Putting the
    // filter on <html> avoids that entirely since it IS the viewport.
    const root = document.documentElement;
    root.classList.remove("theme-dark", "theme-void", "theme-ghost", "theme-blood-moon");
    if (theme !== "default") {
      root.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  useEffect(() => {
    // Keep following the phone/browser's dark-mode setting live, but only
    // for as long as the person hasn't explicitly picked a theme
    // themselves - an explicit choice always wins from then on.
    if (localStorage.getItem(THEME_STORAGE_KEY)) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? "dark" : "default");
    };
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  // Explicit theme pick from Settings - this is what actually gets
  // remembered as the person's own choice, overriding system preference.
  const handleThemeChange = (newTheme: AppTheme) => {
    setTheme(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  useEffect(() => {
    // Initialize the Database (seed with mock student and logs if first time)
    initDB();

    // Restore the session on page refresh - Firebase Auth keeps you signed
    // in across reloads by default, we just need to re-fetch the profile.
    // This also fires right after a fresh login/registration, which is
    // also the correct, single moment to start listening for live
    // Firestore updates - subscribing any earlier (while signed out)
    // causes Firestore to reject the listener outright, and it never
    // recovers on its own even once you do sign in afterward.
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

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-sm text-coral-700/60 font-semibold font-display">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream text-ink selection:bg-coral-100 selection:text-coral-700 antialiased font-sans flex flex-col justify-between" id="app-root">
      <main className="flex-grow flex flex-col">
        {selectedRole === null && (
          <RoleSelection onSelectRole={(role) => setSelectedRole(role)} />
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

      <footer className="py-6 border-t border-coral-100/60 bg-cream text-center text-xs text-ink-soft/60 font-medium font-sans">
        &copy; {new Date().getFullYear()} Attendance Hub &bull; Designed by Team ByteForce
      </footer>
    </div>
  );
}

