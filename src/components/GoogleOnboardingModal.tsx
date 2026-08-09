import React, { useState } from "react";
import { motion } from "motion/react";
import {
  GraduationCap,
  Building2,
  IdCard,
  AlertCircle,
  ArrowRight,
  LogOut,
  UserCheck,
  BookOpen
} from "lucide-react";
import { User } from "../types";
import { getUsers, updateUserProfile, saveUser } from "../lib/db";

interface GoogleOnboardingModalProps {
  user: User;
  onComplete: (updatedUser: User) => void;
  onLogout: () => void;
}

const COMMON_DEPARTMENTS = [
  "BS Computer Engineering (BSCpE)",
  "BS Computer Science (BSCS)",
  "BS Information Technology (BSIT)",
  "BS Electronics Engineering (BCEE)",
  "BS Electrical Engineering (BSEE)",
  "BS Business Administration (BSBA)",
  "BS Accountancy (BSA)",
  "BS Nursing (BSN)",
  "Bachelor of Elementary Education (BEEd)",
  "Other / Custom Course"
];

export default function GoogleOnboardingModal({
  user,
  onComplete,
  onLogout,
}: GoogleOnboardingModalProps) {
  const initialStudentId = user.id.startsWith("google_") ? "" : user.id;
  const [studentId, setStudentId] = useState(initialStudentId);
  
  const initialDeptIsCustom = user.department && !COMMON_DEPARTMENTS.includes(user.department);
  const [selectedDeptPreset, setSelectedDeptPreset] = useState<string>(
    user.department
      ? COMMON_DEPARTMENTS.includes(user.department)
        ? user.department
        : "Other / Custom Course"
      : COMMON_DEPARTMENTS[0]
  );
  const [customDept, setCustomDept] = useState<string>(initialDeptIsCustom ? user.department || "" : "");
  const [fullName, setFullName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanId = studentId.trim();
    const finalDepartment =
      selectedDeptPreset === "Other / Custom Course"
        ? customDept.trim()
        : selectedDeptPreset.trim();
    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanId) {
      setError("Please enter your official Student ID / Username.");
      return;
    }

    if (!finalDepartment) {
      setError("Please enter or select your Department / Course.");
      return;
    }

    if (!cleanName) {
      setError("Please provide your Full Name.");
      return;
    }

    const existingUsers = getUsers();
    const duplicate = existingUsers.find(
      (u) =>
        u.id.toLowerCase() === cleanId.toLowerCase() &&
        u.uid !== user.uid &&
        u.id.toLowerCase() !== user.id.toLowerCase()
    );

    if (duplicate) {
      setError(`Student ID or Username "${cleanId}" is already registered to another account. Please choose a unique ID.`);
      return;
    }

    setIsSaving(true);
    try {
      const updates: Partial<User> = {
        id: cleanId,
        department: finalDepartment,
        name: cleanName,
        email: cleanEmail || undefined,
      };

      const updatedUser = await updateUserProfile(user, updates);
      saveUser(updatedUser);
      onComplete(updatedUser);
    } catch (err: any) {
      console.error("Error updating profile during onboarding:", err);
      setError(err?.message || "Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 relative">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center overflow-hidden">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-full h-full object-cover rounded-[14px]"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <GraduationCap className="h-6 w-6 text-white" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-200 uppercase tracking-wider">
                  Google Sign-In Connected
                </div>
                <h2 className="text-lg font-black text-white leading-tight">
                  Complete Student Profile
                </h2>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>

          <p className="text-xs text-blue-100 mt-3 leading-relaxed">
            Welcome! To ensure your attendance and grades are correctly recorded by your instructors, please specify your <strong className="text-white">Department / Course</strong> and official <strong className="text-white">Student ID / Username</strong>.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-start gap-2.5"
            >
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Student ID / Username */}
          <div>
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1.5">
              <IdCard className="h-4 w-4 text-blue-500" />
              <span>Student ID / Username</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g. 2024-00123 or student_alex"
              required
              className="w-full p-3 text-xs bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Your official school ID number or unique student username.
            </p>
          </div>

          {/* Department / Course */}
          <div>
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1.5">
              <Building2 className="h-4 w-4 text-teal-500" />
              <span>Department / Course</span>
              <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedDeptPreset}
              onChange={(e) => setSelectedDeptPreset(e.target.value)}
              className="w-full p-3 text-xs bg-white border border-gray-200 rounded-xl text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
            >
              {COMMON_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {selectedDeptPreset === "Other / Custom Course" && (
              <input
                type="text"
                value={customDept}
                onChange={(e) => setCustomDept(e.target.value)}
                placeholder="Type your specific Department or Course name..."
                required
                className="w-full mt-2 p-3 text-xs bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              />
            )}
            <p className="text-[11px] text-gray-500 mt-1">
              Teachers filter students and assign section check-ins based on department.
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1.5">
              <UserCheck className="h-4 w-4 text-green-600" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              required
              className="w-full p-3 text-xs bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
            />
          </div>

          {/* Email Address */}
          <div>
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1.5">
              <BookOpen className="h-4 w-4 text-amber-500" />
              <span>Contact Email</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@school.edu"
              className="w-full p-3 text-xs bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 cursor-pointer transition-all"
            >
              Cancel / Logout
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 sm:flex-none px-6 py-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <span>{isSaving ? "Saving Profile..." : "Complete Setup"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
