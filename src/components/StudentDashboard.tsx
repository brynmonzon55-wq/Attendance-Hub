/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LogOut,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  TrendingUp,
  Award,
  AlertCircle,
  ClipboardList,
  BookOpen,
  Send,
  Hourglass,
  Plus,
  Trash2,
  Settings as SettingsIcon,
  Key,
  RefreshCw
} from "lucide-react";
import { User, AttendanceRecord, AttendanceStatus, StudentStats } from "../types";
import type { AppTheme } from "../App";
import {
  getUsers,
  getAttendanceRecords,
  recordTodayAttendance,
  calculateStudentStats,
  formatDate,
  saveUser,
  deleteOwnAccount,
  changeOwnPassword,
  forceReconnect
} from "../lib/db";

interface StudentDashboardProps {
  user: User;
  onLogout: () => void;
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

const THEME_OPTIONS: { id: AppTheme; label: string; swatch: string }[] = [
  { id: "default", label: "Default Mode", swatch: "bg-gradient-to-br from-white to-gray-200 border border-gray-300" },
  { id: "dark", label: "Dark Mode", swatch: "bg-gradient-to-br from-gray-700 to-gray-900" },
  { id: "void", label: "Void Mode", swatch: "bg-gradient-to-br from-gray-900 to-black" },
  { id: "ghost", label: "Ghost Mode", swatch: "bg-gradient-to-br from-slate-200 to-slate-400" },
  { id: "blood-moon", label: "Blood Moon", swatch: "bg-gradient-to-br from-red-700 to-red-950" },
];

export default function StudentDashboard({ user, onLogout, theme, onThemeChange }: StudentDashboardProps) {
  const [dbUser, setDbUser] = useState<User>(user);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<StudentStats>({
    presentCount: 0,
    absentCount: 0,
    totalDays: 0,
    percentage: 100,
  });

  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>("Present");
  const [notes, setNotes] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [availableSubjects, setAvailableSubjects] = useState<{ teacherName: string; subject: string }[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [dashboardSubject, setDashboardSubject] = useState<string>("");

  // Settings modal state (profile edit, sign out, delete account)
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editNameValue, setEditNameValue] = useState(user.name);
  const [editEmailValue, setEditEmailValue] = useState(user.email || "");
  const [editLocationValue, setEditLocationValue] = useState(user.location || "");
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);

  // Danger zone is tucked away and only expands when explicitly opened
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState("");
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError(null);
    setSettingsSuccess(null);
    const cleanName = editNameValue.trim();
    const cleanEmail = editEmailValue.trim();
    const cleanLocation = editLocationValue.trim();

    if (!cleanName) {
      setSettingsError("Name cannot be empty.");
      return;
    }
    if (!cleanEmail || !cleanLocation) {
      setSettingsError("Email and location are required so your teacher can reach you.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setSettingsError("Please enter a valid email address.");
      return;
    }

    setIsSavingName(true);
    try {
      const allUsers = getUsers();
      const idx = allUsers.findIndex((u) => u.id.toLowerCase() === user.id.toLowerCase());
      if (idx !== -1) {
        const updated = { ...allUsers[idx], name: cleanName, email: cleanEmail, location: cleanLocation };
        saveUser(updated);
        setDbUser(updated);
        setSettingsSuccess("Profile updated.");
      }
    } finally {
      setIsSavingName(false);
    }
  };

  const handleDeleteOwnAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteAccountError(null);
    if (!deleteAccountPassword) {
      setDeleteAccountError("Please enter your password to confirm.");
      return;
    }
    setIsDeletingAccount(true);
    try {
      await deleteOwnAccount(deleteAccountPassword);
      onLogout();
    } catch (err: any) {
      const code = err?.code || err?.message || "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        setDeleteAccountError("Incorrect password.");
      } else {
        setDeleteAccountError("Something went wrong. Please try again.");
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Change password state (Settings, separate from delete-account danger zone)
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);
    setChangePasswordSuccess(null);
    if (!currentPasswordInput || !newPasswordInput) {
      setChangePasswordError("Please fill out both fields.");
      return;
    }
    if (newPasswordInput.length < 6) {
      setChangePasswordError("New password must be at least 6 characters.");
      return;
    }
    setIsChangingPassword(true);
    try {
      await changeOwnPassword(currentPasswordInput, newPasswordInput);
      setChangePasswordSuccess("Password updated.");
      setCurrentPasswordInput("");
      setNewPasswordInput("");
    } catch (err: any) {
      const code = err?.code || err?.message || "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        setChangePasswordError("Current password is incorrect.");
      } else if (code === "auth/weak-password") {
        setChangePasswordError("New password is too weak.");
      } else {
        setChangePasswordError("Something went wrong. Please try again.");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Manual "refresh live connection" fallback
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectMessage, setReconnectMessage] = useState<string | null>(null);
  const handleForceReconnect = () => {
    setIsReconnecting(true);
    setReconnectMessage(null);
    forceReconnect();
    loadData();
    setTimeout(() => {
      setIsReconnecting(false);
      setReconnectMessage("Connection refreshed.");
    }, 600);
  };

  const todayStr = formatDate(new Date());

  const loadData = () => {
    // Get fresh user record from database
    const allUsers = getUsers();
    const freshUser = allUsers.find((u) => u.id.toLowerCase() === user.id.toLowerCase());
    if (freshUser) {
      setDbUser(freshUser);
    }

    // Fetch active subjects from registered verified teachers
    const teachersWithSubjects = allUsers
      .filter((u) => u.role === "teacher" && (u.isApproved === true || u.id.toLowerCase() === "teacher1") && u.subject)
      .map((u) => ({
        teacherName: u.name,
        subject: u.subject as string
      }));
    setAvailableSubjects(teachersWithSubjects);

    const enrolledList = freshUser ? (freshUser.enrolledSubjects || []) : [];
    const studentEnrolledSubjects = teachersWithSubjects.filter((item) =>
      enrolledList.includes(item.subject)
    );

    // Default the class filter to the student's own class once we know it
    // (there's no more "All Classes Combined" view to fall back to).
    let effectiveSubject = dashboardSubject;
    if (!effectiveSubject && studentEnrolledSubjects.length > 0) {
      effectiveSubject = studentEnrolledSubjects[0].subject;
      setDashboardSubject(effectiveSubject);
    }

    const allRecords = getAttendanceRecords();
    const studentRecords = allRecords
      .filter((r) => r.studentId.toLowerCase() === user.id.toLowerCase())
      .sort((a, b) => b.date.localeCompare(a.date));

    // Filter history to the selected class
    const filteredHistory = !effectiveSubject
      ? studentRecords
      : studentRecords.filter((r) => (r.subject || "General Class").toLowerCase() === effectiveSubject!.toLowerCase());

    setHistory(filteredHistory);

    // Find if already recorded today
    const todayLog = studentRecords.find((r) => r.date === todayStr);
    if (todayLog) {
      setTodayRecord(todayLog);
      setSelectedStatus(todayLog.status);
      setNotes(todayLog.notes || "");
      if (todayLog.subject) {
        setSelectedSubject(todayLog.subject);
      }
    } else {
      setTodayRecord(null);
      if (studentEnrolledSubjects.length > 0) {
        setSelectedSubject(studentEnrolledSubjects[0].subject);
      } else {
        setSelectedSubject("");
      }
    }

    // Calculate stats for the selected class
    const calculatedStats = calculateStudentStats(user.id, effectiveSubject || undefined);
    setStats(calculatedStats);
  };

  const handleApplySubject = (subjectName: string) => {
    const allUsers = getUsers();
    const idx = allUsers.findIndex((u) => u.id.toLowerCase() === user.id.toLowerCase());
    if (idx !== -1) {
      const currentApplied = allUsers[idx].appliedSubjects || [];
      if (!currentApplied.includes(subjectName)) {
        const updated = { ...allUsers[idx], appliedSubjects: [...currentApplied, subjectName] };
        saveUser(updated);
        // Update the UI immediately rather than waiting for the Firestore
        // round-trip to come back through the realtime listener - that
        // trip can occasionally lag or land out of order, which is why
        // this used to only show up correctly after a manual refresh.
        setDbUser(updated);
      }
    }
  };

  useEffect(() => {
    loadData();
    const handleDbUpdate = () => {
      loadData();
    };
    window.addEventListener("db_updated", handleDbUpdate);
    return () => {
      window.removeEventListener("db_updated", handleDbUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, dashboardSubject]);

  const handleRecordAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    
    const record = recordTodayAttendance(
      user.id,
      user.name,
      selectedStatus,
      notes.trim() || undefined,
      selectedSubject || "General Class"
    );

    setTodayRecord(record);
    setSuccessMsg(`Attendance successfully logged as ${selectedStatus}!`);
    loadData();

    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  const enrolledList = dbUser.enrolledSubjects || [];
  const studentEnrolledSubjects = availableSubjects.filter((item) =>
    enrolledList.includes(item.subject)
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8" id="student-dashboard">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-ink-soft/10 pb-6">
        <div>
          <span className="px-2.5 py-1 text-xs font-semibold bg-teal-50 text-teal-600 rounded-full border border-teal-100">
            Student Dashboard
          </span>
          <h1 className="text-3xl font-black text-ink tracking-tight mt-2" id="student-welcome-title">
            Hello, {user.name}
          </h1>
          <p className="text-sm text-ink-soft/70 font-sans mt-0.5">
            Student ID: <span className="font-mono font-medium text-ink-soft">{user.id}</span>
          </p>
        </div>

        <div className="self-start md:self-center">
          <button
            onClick={() => {
              setEditNameValue(dbUser.name);
              setEditEmailValue(dbUser.email || "");
              setEditLocationValue(dbUser.location || "");
              setSettingsError(null);
              setSettingsSuccess(null);
              setShowSettingsModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-ink-soft bg-white border border-ink-soft/15 rounded-xl hover:bg-cream-dim/60 hover:text-ink shadow-sm transition-all cursor-pointer"
            id="student-settings-btn"
          >
            <SettingsIcon className="h-4 w-4" /> Settings
          </button>
        </div>
      </div>

      {/* Pending Approval Warning Banner */}
      {!dbUser.isApproved && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex items-start gap-3 shadow-sm"
          id="student-pending-verification-banner"
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold">Account Verification Pending</h4>
            <p className="text-amber-700/90 leading-relaxed">
              Your account is still waiting on a teacher to verify it. You can check in and update your attendance in the meantime - it'll just show as pending until you're approved.
            </p>
          </div>
        </motion.div>
      )}

      {/* Class Switcher Panel */}
      <div className="bg-white border border-ink-soft/10 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4" id="class-focus-container">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-50 text-teal-500 rounded-xl shrink-0">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              Your Class
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                dbUser.isApproved
                  ? "bg-teal-50 text-teal-600 border border-teal-100"
                  : "bg-amber-50 text-amber-700 border border-amber-100 animate-pulse"
              }`}>
                {dbUser.isApproved ? "Verified Profile" : "Pending Verification"}
              </span>
            </h3>
            <p className="text-xs text-ink-soft/50">Switch classes to see your attendance and status for each one</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto self-stretch md:self-center">
          <label htmlFor="dashboard-subject-filter" className="text-xs font-bold text-ink-soft/70 whitespace-nowrap">
            Select Class:
          </label>
          <select
            id="dashboard-subject-filter"
            value={dashboardSubject}
            onChange={(e) => setDashboardSubject(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 text-xs bg-cream-dim/60 border border-ink-soft/15 rounded-xl focus:outline-none focus:border-teal-500 focus:bg-white text-ink font-bold shadow-sm cursor-pointer transition-all"
          >
            {availableSubjects.map((item, idx) => (
              <option key={idx} value={item.subject}>
                {item.subject} (Prof. {item.teacherName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid for Stats and Quick Logging */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Quick Log Attendance */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-ink-soft/10 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-ink flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-teal-500" />
              Today's Attendance
            </h2>

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-teal-50 border border-teal-100 text-teal-700 text-xs rounded-xl flex items-center gap-2"
                id="attendance-success-banner"
              >
                <CheckCircle className="h-4 w-4 shrink-0 text-teal-500" />
                <span>{successMsg}</span>
              </motion.div>
            )}

            <form onSubmit={handleRecordAttendance} className="space-y-5" id="attendance-record-form">
              <div className="bg-cream-dim/60 rounded-xl p-3.5 text-center">
                <span className="text-[10px] font-bold text-ink-soft/50 uppercase tracking-wider block">
                  Current Date
                </span>
                <span className="text-base font-extrabold text-ink block mt-0.5">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                {todayRecord && (
                  <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-ink-soft/70">
                    <Clock className="h-3 w-3" /> Logged at {todayRecord.time}
                  </span>
                )}
              </div>

              {/* Classroom/Subject Selection */}
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-xs font-bold text-ink-soft block">
                  Select Class / Subject
                </label>
                {studentEnrolledSubjects.length > 0 ? (
                  <div className="relative">
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      disabled={!!todayRecord}
                      className="w-full px-3.5 py-2.5 text-xs bg-cream-dim/60 border border-ink-soft/15 rounded-xl focus:outline-none focus:border-teal-500 focus:bg-white text-ink font-medium cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed transition-all"
                    >
                      {studentEnrolledSubjects.map((item, idx) => (
                        <option key={idx} value={item.subject}>
                          {item.subject} ({item.teacherName})
                        </option>
                      ))}
                    </select>
                    {todayRecord && (
                      <p className="text-[10px] text-ink-soft/50 mt-1">
                        Attendance already submitted for this class today.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
                    <p className="text-xs text-amber-800 font-bold flex items-center justify-center gap-1.5">
                      <AlertCircle className="h-4 w-4" /> No Approved Enrolled Classes
                    </p>
                    <p className="text-[11px] text-amber-700/90 leading-relaxed">
                      You must apply and be approved by a teacher before you can submit attendance logs.
                    </p>
                    <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wider mt-1 block">
                      Use the "Class Applications" Panel below
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-ink-soft block">
                  Select Status
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedStatus("Present")}
                    className={`py-3 px-2 rounded-xl border text-xs sm:text-sm font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      selectedStatus === "Present"
                        ? "border-teal-500 bg-teal-50/50 text-teal-600 shadow-sm"
                        : "border-ink-soft/15 bg-white text-ink-soft hover:bg-cream-dim/60"
                    }`}
                    id="set-present-btn"
                  >
                    <CheckCircle className={`h-5 w-5 ${selectedStatus === "Present" ? "text-teal-500" : "text-ink-soft/50"}`} />
                    Present
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStatus("Late")}
                    className={`py-3 px-2 rounded-xl border text-xs sm:text-sm font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      selectedStatus === "Late"
                        ? "border-amber-500 bg-amber-50/50 text-amber-700 shadow-sm"
                        : "border-ink-soft/15 bg-white text-ink-soft hover:bg-cream-dim/60"
                    }`}
                    id="set-late-btn"
                  >
                    <Clock className={`h-5 w-5 ${selectedStatus === "Late" ? "text-amber-500" : "text-ink-soft/50"}`} />
                    Late
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStatus("Absent")}
                    className={`py-3 px-2 rounded-xl border text-xs sm:text-sm font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      selectedStatus === "Absent"
                        ? "border-rose-500 bg-rose-50/50 text-rose-700 shadow-sm"
                        : "border-ink-soft/15 bg-white text-ink-soft hover:bg-cream-dim/60"
                    }`}
                    id="set-absent-btn"
                  >
                    <XCircle className={`h-5 w-5 ${selectedStatus === "Absent" ? "text-rose-500" : "text-ink-soft/50"}`} />
                    Absent
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-soft flex items-center gap-1" htmlFor="attendance-notes">
                  <MessageSquare className="h-3.5 w-3.5 text-ink-soft/50" />
                  Optional Note
                </label>
                <textarea
                  id="attendance-notes"
                  placeholder="e.g. Arrived 5 mins late due to bus lag, doctor's appointment etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full p-3 text-xs bg-cream-dim/60 border border-ink-soft/15 rounded-xl focus:outline-none focus:border-gray-300 focus:bg-white transition-all text-ink resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={studentEnrolledSubjects.length === 0}
                className={`w-full py-3 rounded-full text-sm font-semibold text-white transition-all cursor-pointer bg-teal-500 hover:bg-teal-600 active:bg-teal-700 shadow-teal hover:-translate-y-0.5 flex items-center justify-center gap-1 disabled:opacity-45 disabled:cursor-not-allowed disabled:translate-y-0`}
                id="submit-attendance-btn"
              >
                <ClipboardList className="h-4 w-4" />
                {todayRecord ? "Update Attendance" : "Submit Attendance"}
              </button>
            </form>
          </div>

          {/* Class Applications & Enrollments Card */}
          <div className="bg-white border border-ink-soft/10 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <BookOpen className="h-4.5 w-4.5 text-teal-500" />
              Class Applications
            </h2>
            <p className="text-[11px] text-ink-soft/70 leading-normal">
              To log attendance for a class, apply first. Once your teacher approves you, it'll show up in your check-in list.
            </p>

            <div className="space-y-3">
              {availableSubjects.length === 0 ? (
                <div className="p-4 border border-dashed border-ink-soft/15 rounded-xl text-center text-ink-soft/50 text-[11px]">
                  No classes are available to join yet.
                </div>
              ) : (
                availableSubjects.map((item, idx) => {
                  const isEnrolled = (dbUser.enrolledSubjects || []).includes(item.subject);
                  const isPending = (dbUser.appliedSubjects || []).includes(item.subject);

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-cream-dim/60/50 border border-ink-soft/10 rounded-xl animate-fade-in"
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-ink block">
                          {item.subject}
                        </span>
                        <span className="text-[10px] text-ink-soft/50 block font-medium">
                          Teacher: {item.teacherName}
                        </span>
                      </div>

                      <div>
                        {isEnrolled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold bg-teal-50 text-teal-600 border border-teal-100">
                            <CheckCircle className="h-3 w-3" /> Enrolled
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 animate-pulse">
                            <Hourglass className="h-3 w-3" /> Pending
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApplySubject(item.subject)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-all cursor-pointer shadow-sm shadow-teal-100"
                          >
                            <Plus className="h-3 w-3" /> Apply
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right columns: Stats Cards & Table */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Key Metrics row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            <div className="bg-white border border-ink-soft/10 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-teal-50 text-teal-500 rounded-xl shrink-0">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-medium text-ink-soft/50 block">Present Days</span>
                <span className="text-2xl font-black text-ink block mt-0.5" id="stats-present-count">
                  {stats.presentCount}
                </span>
              </div>
            </div>

            <div className="bg-white border border-ink-soft/10 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-medium text-ink-soft/50 block">Late Days</span>
                <span className="text-2xl font-black text-ink block mt-0.5" id="stats-late-count">
                  {stats.lateCount}
                </span>
              </div>
            </div>

            <div className="bg-white border border-ink-soft/10 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-rose-50 text-rose-500 rounded-xl shrink-0">
                <XCircle className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-medium text-ink-soft/50 block">Absent Days</span>
                <span className="text-2xl font-black text-ink block mt-0.5" id="stats-absent-count">
                  {stats.absentCount}
                </span>
              </div>
            </div>

            <div className="bg-white border border-ink-soft/10 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-violet-50 text-violet-500 rounded-xl shrink-0">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-medium text-ink-soft/50 block">Attendance Rate</span>
                <span className="text-2xl font-black text-ink block mt-0.5" id="stats-percentage">
                  {stats.percentage}%
                </span>
              </div>
            </div>
          </div>

          {/* Progress gauge card */}
          <div className="bg-white border border-ink-soft/10 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-ink flex items-center gap-1.5 mb-4">
              <Award className="h-4.5 w-4.5 text-violet-500" />
              Attendance Overview
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-ink-soft/70">Current Attendance Rating</span>
                <span className="font-bold font-mono text-ink">{stats.percentage}%</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    stats.percentage >= 90
                      ? "bg-teal-500"
                      : stats.percentage >= 75
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${stats.percentage}%` }}
                />
              </div>
              <p className="text-[11px] text-ink-soft/50 font-sans mt-1">
                {stats.percentage >= 90
                  ? "Excellent! You are maintaining an elite attendance record."
                  : stats.percentage >= 75
                  ? "Good progress. Try to attend more consistently to stay above 90%."
                  : "Caution: Your attendance is below the standard minimum requirement (75%)."}
              </p>
            </div>
          </div>

          {/* Attendance History list */}
          <div className="bg-white border border-ink-soft/10 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-ink mb-4">
              Personal Attendance Logs
            </h3>

            {history.length === 0 ? (
              <div className="text-center py-10 text-ink-soft/50 text-sm">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                No attendance records found yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" id="student-history-table">
                  <thead>
                    <tr className="border-b border-ink-soft/10 text-xs text-ink-soft/50 font-bold uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold">Class / Subject</th>
                      <th className="pb-3 font-semibold">Check-in Time</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs text-ink-soft">
                    {history.map((record) => (
                      <tr key={record.id} className="hover:bg-cream-dim/60/50 transition-colors">
                        <td className="py-3.5 font-medium text-ink">
                          {new Date(record.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="py-3.5 font-semibold text-ink-soft">
                          {record.subject || "General Class"}
                        </td>
                        <td className="py-3.5 text-ink-soft/70 font-mono">
                          {record.status !== "Absent" ? record.time : "—"}
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              record.status === "Present"
                                ? "bg-teal-50 text-teal-600 border border-teal-100"
                                : record.status === "Late"
                                ? "bg-amber-50 text-amber-700 border border-amber-100"
                                : "bg-rose-50 text-rose-700 border border-rose-100"
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-ink-soft/70 italic max-w-xs truncate" title={record.notes}>
                          {record.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: SETTINGS */}
      <AnimatePresence>
        {showSettingsModal && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => {
              setShowSettingsModal(false);
              setShowDangerZone(false);
              setDeleteAccountPassword("");
              setDeleteAccountError(null);
              setSettingsError(null);
              setSettingsSuccess(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-ink-soft/10 max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col"
              id="settings-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-teal-500 px-6 py-4 text-white flex items-center justify-between shrink-0">
                <h3 className="font-extrabold text-lg flex items-center gap-1.5">
                  <SettingsIcon className="h-5 w-5" /> Settings
                </h3>
                <button
                  onClick={() => {
                    setShowSettingsModal(false);
                    setShowDangerZone(false);
                    setDeleteAccountPassword("");
                    setDeleteAccountError(null);
                    setSettingsError(null);
                    setSettingsSuccess(null);
                  }}
                  className="text-teal-100 hover:text-white cursor-pointer"
                  aria-label="Close settings"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto">
                {/* Profile section */}
                <form onSubmit={handleSaveName} className="space-y-3">
                  <h4 className="text-xs font-black text-ink-soft uppercase tracking-wide">Profile</h4>
                  {settingsError && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{settingsError}</span>
                    </div>
                  )}
                  {settingsSuccess && (
                    <div className="p-3 bg-teal-50 border border-teal-100 text-teal-600 text-xs rounded-lg flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{settingsSuccess}</span>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink-soft" htmlFor="edit-name">Full Name</label>
                    <input
                      id="edit-name"
                      type="text"
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-ink-soft/15 rounded-xl focus:outline-none focus:border-teal-400 text-ink"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink-soft" htmlFor="edit-email">Email</label>
                    <input
                      id="edit-email"
                      type="email"
                      value={editEmailValue}
                      onChange={(e) => setEditEmailValue(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-ink-soft/15 rounded-xl focus:outline-none focus:border-teal-400 text-ink"
                    />
                    <p className="text-[11px] text-ink-soft/50">Visible to your teacher so they can reach you.</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink-soft" htmlFor="edit-location">Location</label>
                    <input
                      id="edit-location"
                      type="text"
                      value={editLocationValue}
                      onChange={(e) => setEditLocationValue(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-ink-soft/15 rounded-xl focus:outline-none focus:border-teal-400 text-ink"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSavingName}
                    className="px-4 py-2 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded-xl cursor-pointer disabled:opacity-60"
                  >
                    {isSavingName ? "Saving..." : "Save Changes"}
                  </button>
                </form>

                <div className="border-t border-ink-soft/10 pt-4">
                  <h4 className="text-xs font-black text-ink-soft uppercase tracking-wide mb-3">Appearance</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {THEME_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => onThemeChange(opt.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          theme === opt.id
                            ? "border-teal-400 bg-teal-50 text-teal-600"
                            : "border-ink-soft/15 bg-white text-ink-soft hover:bg-cream-dim/60"
                        }`}
                      >
                        <span className={`h-4 w-4 rounded-full shrink-0 ${opt.swatch}`} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-ink-soft/10 pt-4">
                  <h4 className="text-xs font-black text-ink-soft uppercase tracking-wide mb-3">Password</h4>
                  {!showChangePassword ? (
                    <button
                      onClick={() => {
                        setShowChangePassword(true);
                        setChangePasswordError(null);
                        setChangePasswordSuccess(null);
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-ink-soft bg-cream-dim/60 border border-ink-soft/15 rounded-xl hover:bg-cream-dim hover:text-ink transition-all cursor-pointer"
                    >
                      <Key className="h-4 w-4" /> Change Password
                    </button>
                  ) : (
                    <form onSubmit={handleChangePassword} className="space-y-3">
                      {changePasswordError && (
                        <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>{changePasswordError}</span>
                        </div>
                      )}
                      {changePasswordSuccess && (
                        <div className="p-3 bg-teal-50 border border-teal-100 text-teal-600 text-xs rounded-lg flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>{changePasswordSuccess}</span>
                        </div>
                      )}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-ink-soft" htmlFor="current-password">Current Password</label>
                        <input
                          id="current-password"
                          type="password"
                          value={currentPasswordInput}
                          onChange={(e) => setCurrentPasswordInput(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-ink-soft/15 rounded-xl focus:outline-none focus:border-teal-400 text-ink"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-ink-soft" htmlFor="new-password">New Password</label>
                        <input
                          id="new-password"
                          type="password"
                          value={newPasswordInput}
                          onChange={(e) => setNewPasswordInput(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-ink-soft/15 rounded-xl focus:outline-none focus:border-teal-400 text-ink"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isChangingPassword}
                        className="w-full px-4 py-2 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded-xl cursor-pointer disabled:opacity-60"
                      >
                        {isChangingPassword ? "Updating..." : "Update Password"}
                      </button>
                    </form>
                  )}
                </div>

                <div className="border-t border-ink-soft/10 pt-4">
                  <h4 className="text-xs font-black text-ink-soft uppercase tracking-wide mb-3">Connection</h4>
                  <button
                    onClick={handleForceReconnect}
                    disabled={isReconnecting}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-ink-soft bg-cream-dim/60 border border-ink-soft/15 rounded-xl hover:bg-cream-dim hover:text-ink transition-all cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${isReconnecting ? "animate-spin" : ""}`} />
                    {isReconnecting ? "Refreshing..." : "Refresh Live Connection"}
                  </button>
                  {reconnectMessage && (
                    <p className="text-[11px] text-teal-500 mt-1.5 text-center">{reconnectMessage}</p>
                  )}
                  <p className="text-[11px] text-ink-soft/50 mt-1.5">
                    If new data isn't showing up automatically, use this instead of reloading the page.
                  </p>
                </div>

                <div className="border-t border-ink-soft/10 pt-4">
                  <h4 className="text-xs font-black text-ink-soft uppercase tracking-wide mb-3">Account</h4>
                  <button
                    onClick={onLogout}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-ink-soft bg-cream-dim/60 border border-ink-soft/15 rounded-xl hover:bg-cream-dim hover:text-ink transition-all cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>

                {/* Danger zone - tucked away, requires an extra click to reveal */}
                <div className="border-t border-ink-soft/10 pt-4">
                  {!showDangerZone ? (
                    <button
                      onClick={() => setShowDangerZone(true)}
                      className="text-xs font-semibold text-ink-soft/50 hover:text-red-500 cursor-pointer transition-colors"
                    >
                      Advanced options
                    </button>
                  ) : (
                    <form onSubmit={handleDeleteOwnAccount} className="space-y-3">
                      <h4 className="text-xs font-black text-red-600 uppercase tracking-wide">Danger Zone</h4>
                      <p className="text-[11px] text-ink-soft/70">
                        Permanently deletes your account, login, and attendance history. This cannot be undone.
                      </p>
                      {deleteAccountError && (
                        <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>{deleteAccountError}</span>
                        </div>
                      )}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-ink-soft" htmlFor="delete-account-password">
                          Enter your password to confirm
                        </label>
                        <input
                          id="delete-account-password"
                          type="password"
                          value={deleteAccountPassword}
                          onChange={(e) => setDeleteAccountPassword(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-ink-soft/15 rounded-xl focus:outline-none focus:border-red-300 text-ink"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isDeletingAccount}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        {isDeletingAccount ? "Deleting..." : "Permanently Delete My Account"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
