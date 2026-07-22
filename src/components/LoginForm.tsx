/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Key, User as UserIcon, LogIn, AlertCircle, Sparkles, Mail, MapPin } from "lucide-react";
import { UserRole, User } from "../types";
import { getUsers, addSecurityLog, registerUser, loginUser } from "../lib/db";

interface LoginFormProps {
  role: UserRole;
  onBack: () => void;
  onLoginSuccess: (user: User) => void;
}

export default function LoginForm({ role, onBack, onLoginSuccess }: LoginFormProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    // Initialize DB connection so listeners trigger immediately
    getUsers(); 
    const handleDbUpdate = () => {
      setTick(t => t + 1);
    };
    window.addEventListener("db_updated", handleDbUpdate);
    return () => {
      window.removeEventListener("db_updated", handleDbUpdate);
    };
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPasswordNote, setShowForgotPasswordNote] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    const cleanPassword = password;
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanLocation = location.trim();

    if (!cleanUsername || !cleanPassword) {
      setError("Please fill out all required fields.");
      return;
    }

    if (isRegister && !cleanName) {
      setError("Please provide your full name for registration.");
      return;
    }

    if (isRegister && isStudent && (!cleanEmail || !cleanLocation)) {
      setError("Please provide your email and location so your teacher can reach you.");
      return;
    }

    if (isRegister && cleanEmail && !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (isRegister && cleanPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegister) {
        // Sign-up flow - creates a real Firebase Auth account. Password is
        // hashed and stored by Firebase, never written to Firestore.
        const newUser = await registerUser(cleanUsername, cleanName, cleanPassword, role, {
          email: isStudent ? cleanEmail : undefined,
          location: isStudent ? cleanLocation : undefined,
        });
        onLoginSuccess(newUser);
      } else {
        // Login flow - a student trying the Teacher portal will simply fail
        // to authenticate there (their account has role "student"), but we
        // still want the friendlier, logged message for that case.
        const users = getUsers();
        if (role === "teacher") {
          const potentialStudent = users.find(
            (u) => u.id.toLowerCase() === cleanUsername.toLowerCase() && u.role === "student"
          );
          if (potentialStudent) {
            addSecurityLog({
              usernameAttempted: cleanUsername,
              type: "Impersonation Attempt",
              details: `Student user "${potentialStudent.name}" (${potentialStudent.id}) tried to log in as a teacher. Access was blocked.`
            });
            setError("Access Denied: You are registered as a Student. Student accounts are prohibited from accessing the Teacher dashboard.");
            setIsSubmitting(false);
            return;
          }
        }

        const matchedUser = await loginUser(cleanUsername, cleanPassword, role);
        onLoginSuccess(matchedUser);
      }
    } catch (err: any) {
      const code = err?.code || err?.message || "";
      if (role === "teacher" && !isRegister) {
        addSecurityLog({
          usernameAttempted: cleanUsername,
          type: "Unauthorized Access",
          details: `Failed teacher login attempt for ID "${cleanUsername}".`
        });
      }
      if (code === "auth/email-already-in-use") {
        setError(`This ${role === "student" ? "Student ID" : "Teacher ID"} is already registered.`);
      } else if (code === "wrong-portal") {
        setError(`This ID is registered under the other role. Please use the correct login page.`);
      } else if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setError(`Invalid ${role === "student" ? "Student ID" : "Teacher ID"} or password.`);
      } else if (code === "auth/weak-password") {
        setError("Password is too weak. Please use at least 6 characters.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStudent = role === "student";

  return (
    <div className="flex min-h-[85vh] items-center justify-center p-4 bg-mesh">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`w-full max-w-md bg-white border rounded-3xl shadow-lg overflow-hidden ${isStudent ? "border-teal-100/60 shadow-teal" : "border-violet-100/60 shadow-violet"}`}
        id="login-container"
      >
        {/* Card Header with Theme color based on role */}
        <div
          className={`px-8 py-6 text-white ${
            isStudent ? "bg-teal-500" : "bg-violet-500"
          } relative overflow-hidden`}
        >
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-10">
            <Sparkles className="h-40 w-40" />
          </div>

          <button
            onClick={onBack}
            className="inline-flex items-center text-xs font-medium text-white/80 hover:text-white transition-colors mb-4 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg cursor-pointer"
            id="back-role-btn"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Choose Role
          </button>

          <h2 className="text-2xl font-bold tracking-tight font-display">
            {isRegister ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="text-xs text-white/80 mt-1 font-sans">
            {isStudent ? "Student Login" : "Teacher Login"}
          </p>
        </div>

        {/* Form area */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5" id="login-form">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl flex items-start gap-2.5"
              id="login-error-banner"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {isRegister && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700" htmlFor="reg-name">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="reg-name"
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-cream-dim/50 border border-ink-soft/15 rounded-2xl focus:outline-none focus:border-coral-400 focus:bg-white transition-all text-ink"
                />
                <UserIcon className="absolute left-3 top-3 h-4.5 w-4.5 text-gray-400" />
              </div>
            </div>
          )}

          {isRegister && isStudent && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700" htmlFor="reg-email">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="reg-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-cream-dim/50 border border-ink-soft/15 rounded-2xl focus:outline-none focus:border-coral-400 focus:bg-white transition-all text-ink"
                  />
                  <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-gray-400" />
                </div>
                <p className="text-[11px] text-gray-400">So your teacher can reach you. You can change this later in Settings.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700" htmlFor="reg-location">
                  Location <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="reg-location"
                    type="text"
                    placeholder="e.g. Makati City, Philippines"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-cream-dim/50 border border-ink-soft/15 rounded-2xl focus:outline-none focus:border-coral-400 focus:bg-white transition-all text-ink"
                  />
                  <MapPin className="absolute left-3 top-3 h-4.5 w-4.5 text-gray-400" />
                </div>
              </div>
            </>
          )}


          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700" htmlFor="login-username">
              {isStudent ? "Student ID / Username" : "Teacher ID / Username"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="login-username"
                type="text"
                placeholder={isStudent ? "student101" : "teacher1"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-cream-dim/50 border border-ink-soft/15 rounded-2xl focus:outline-none focus:border-coral-400 focus:bg-white transition-all text-ink"
              />
              <UserIcon className="absolute left-3 top-3 h-4.5 w-4.5 text-gray-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-gray-700" htmlFor="login-password">
                Password <span className="text-red-500">*</span>
              </label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordNote((v) => !v)}
                  className="text-[11px] font-semibold text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-cream-dim/50 border border-ink-soft/15 rounded-2xl focus:outline-none focus:border-coral-400 focus:bg-white transition-all text-ink"
              />
              <Key className="absolute left-3 top-3 h-4.5 w-4.5 text-gray-400" />
            </div>
            {!isRegister && showForgotPasswordNote && (
              <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-2.5 leading-relaxed">
                There's no self-service email reset for this app. If you're logged in elsewhere, change it from
                Settings once you're in. Otherwise, ask {isStudent ? "your teacher" : "another verified teacher"} -
                they can remove your account so you can register again with a new password.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 text-sm font-semibold text-white rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 ${
              isStudent
                ? "bg-teal-500 hover:bg-teal-600 active:bg-teal-700 shadow-teal"
                : "bg-violet-500 hover:bg-violet-600 active:bg-violet-700 shadow-violet"
            }`}
            id="login-submit-btn"
          >
            <LogIn className="h-4 w-4" />
            {isSubmitting ? "Please wait..." : isRegister ? "Register & Enter" : "Sign In"}
          </button>

          <div className="pt-2 border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
                setUsername("");
                setPassword("");
                setName("");
              }}
              className={`text-xs font-medium cursor-pointer ${
                isStudent ? "text-teal-500 hover:text-teal-600" : "text-violet-500 hover:text-violet-600"
              }`}
              id="toggle-register-btn"
            >
              {isRegister
                ? "Already registered? Sign in here"
                : "Don't have an account? Sign up here"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
