/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LogOut,
  Users,
  CheckCircle,
  XCircle,
  Search,
  UserPlus,
  Trash2,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Edit,
  Plus,
  UserCheck,
  TrendingUp,
  Filter,
  Activity,
  ShieldAlert,
  Globe,
  Sliders,
  BookOpen,
  UserMinus,
  Settings as SettingsIcon,
  ChevronDown,
  Key,
  RefreshCw,
  Clock,
  Eye
} from "lucide-react";
import { User, AttendanceRecord, AttendanceStatus, StudentStats, SecurityLog, ClassRoom } from "../types";
import type { AppTheme } from "../App";
import StudentProfile from "./StudentProfile";
import Classroom from "./Classroom";
import {
  getUsers,
  saveUser,
  deleteUser,
  getAttendanceRecords,
  saveAttendanceRecord,
  deleteAttendanceRecord,
  calculateStudentStats,
  attendanceMatchesClass,
  formatDate,
  getSecurityLogs,
  deleteSecurityLog,
  deleteOwnAccount,
  changeOwnPassword,
  forceReconnect,
  getClassesForTeacher,
  createClass,
  addStudentToClass,
  removeStudentFromClass,
} from "../lib/db";

const ACTIVE_CLASS_STORAGE_PREFIX = "attendance_active_class_";

interface TeacherDashboardProps {
  user: User;
  onLogout: () => void;
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

const THEME_OPTIONS: { id: AppTheme; label: string; swatch: string }[] = [
  { id: "default", label: "Glass", swatch: "bg-gradient-to-br from-violet-400 via-teal-400 to-coral-400" },
  { id: "dark", label: "Blood Moon", swatch: "bg-gradient-to-br from-neutral-900 via-red-900 to-black" },
];

export default function TeacherDashboard({ user, onLogout, theme, onThemeChange }: TeacherDashboardProps) {
  // DB States
  const [students, setStudents] = useState<User[]>([]);
  const [faculty, setFaculty] = useState<User[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [dbUser, setDbUser] = useState<User>(user);

  const isApprovedUser = dbUser.isApproved === true || dbUser.id.toLowerCase() === "teacher1";

  // Tab State
  const [activeTab, setActiveTab] = useState<"roster" | "audit" | "reports" | "security" | "faculty" | "classes">("roster");
  const [viewingStudent, setViewingStudent] = useState<User | null>(null);

  // Active class: which of this teacher's ClassRooms attendance actions
  // (roster, daily sheet, reports) apply to right now. Replaces the old
  // free-text "subject" field - classes are real, shareable, multi-section
  // entities instead of one string per teacher account.
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [activeClassId, setActiveClassId] = useState<string>(
    () => localStorage.getItem(ACTIVE_CLASS_STORAGE_PREFIX + user.id) || ""
  );
  const activeClass = classes.find((c) => c.id === activeClassId);

  const handleSelectActiveClass = (id: string) => {
    setActiveClassId(id);
    localStorage.setItem(ACTIVE_CLASS_STORAGE_PREFIX + user.id, id);
  };

  // Creating a class right where a new teacher first needs one (the empty
  // Roster tab), instead of sending them off to a separate "Classes"
  // destination first - class creation should feel like a normal action,
  // not a gate you have to clear before the rest of the app opens up.
  const [inlineClassName, setInlineClassName] = useState("");
  const [inlineClassSubject, setInlineClassSubject] = useState("");
  const [inlineClassError, setInlineClassError] = useState<string | null>(null);
  const handleCreateClassInline = () => {
    if (!inlineClassName.trim()) {
      setInlineClassError("Class name is required.");
      return;
    }
    const created = createClass(inlineClassName, inlineClassSubject, user);
    handleSelectActiveClass(created.id);
    loadDatabase();
    setInlineClassName("");
    setInlineClassSubject("");
    setInlineClassError(null);
  };

  // Quick "add student by ID" on the Roster tab (mirrors the same control
  // in the Classes tab's roster view) so managing who's in the active
  // class doesn't require switching tabs.
  const [addStudentIdInput, setAddStudentIdInput] = useState("");
  const [addStudentError, setAddStudentError] = useState<string | null>(null);
  const handleAddStudentToActiveClass = () => {
    const trimmed = addStudentIdInput.trim();
    if (!trimmed || !activeClassId) return;
    const match = getUsers().find((u) => u.role === "student" && u.id.toLowerCase() === trimmed.toLowerCase());
    if (!match) {
      setAddStudentError("No student found with that ID.");
      return;
    }
    addStudentToClass(activeClassId, match.id);
    loadDatabase();
    setAddStudentIdInput("");
    setAddStudentError(null);
  };

  // Security Log State
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);

  // Roster Filters and Form State
  const [searchQuery, setSearchQuery] = useState("");

  // Daily Audit Filters and Manual Log Form State
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [statusFilter, setStatusFilter] = useState<"All" | "Present" | "Late" | "Absent">("All");
  const [showLogModal, setShowLogModal] = useState(false);
  const [logStudentId, setLogStudentId] = useState("");
  const [logStatus, setLogStatus] = useState<AttendanceStatus>("Present");
  const [logNotes, setLogNotes] = useState("");
  const [logError, setLogError] = useState<string | null>(null);

  // Custom Delete Student Modal state (replacing window.confirm)
  const [studentToDelete, setStudentToDelete] = useState<{ id: string; name: string } | null>(null);

  // Edit student info modal state
  const [studentToEdit, setStudentToEdit] = useState<User | null>(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentEmail, setEditStudentEmail] = useState("");
  const [editStudentLocation, setEditStudentLocation] = useState("");
  const [editStudentError, setEditStudentError] = useState<string | null>(null);
  const [isSavingStudent, setIsSavingStudent] = useState(false);

  const openEditStudent = (student: User) => {
    setStudentToEdit(student);
    setEditStudentName(student.name);
    setEditStudentEmail(student.email || "");
    setEditStudentLocation(student.location || "");
    setEditStudentError(null);
  };

  const handleSaveStudentEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToEdit) return;
    const cleanName = editStudentName.trim();
    const cleanEmail = editStudentEmail.trim();
    const cleanLocation = editStudentLocation.trim();

    if (!cleanName) {
      setEditStudentError("Name cannot be empty.");
      return;
    }
    if (cleanEmail && !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setEditStudentError("Please enter a valid email address.");
      return;
    }

    setIsSavingStudent(true);
    const allUsers = getUsers();
    const idx = allUsers.findIndex((u) => u.id.toLowerCase() === studentToEdit.id.toLowerCase());
    if (idx !== -1) {
      const updated = { ...allUsers[idx], name: cleanName, email: cleanEmail, location: cleanLocation };
      saveUser(updated);
      loadDatabase();
    }
    setIsSavingStudent(false);
    setStudentToEdit(null);
  };

  // Settings modal state (profile edit, sign out, delete account)
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editNameValue, setEditNameValue] = useState(user.name);
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
    if (!cleanName) {
      setSettingsError("Name cannot be empty.");
      return;
    }
    setIsSavingName(true);
    try {
      const allUsers = getUsers();
      const idx = allUsers.findIndex((u) => u.id.toLowerCase() === user.id.toLowerCase());
      if (idx !== -1) {
        const updated = { ...allUsers[idx], name: cleanName };
        allUsers[idx] = updated;
        localStorage.setItem("attendance_system_users", JSON.stringify(allUsers));
        saveUser(updated);
        loadDatabase();
        setSettingsSuccess("Name updated.");
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

  // Manual "refresh live connection" fallback, in case the realtime sync
  // ever silently drops (e.g. a network blip) without needing a full page
  // reload.
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectMessage, setReconnectMessage] = useState<string | null>(null);
  const handleForceReconnect = () => {
    setIsReconnecting(true);
    setReconnectMessage(null);
    forceReconnect();
    loadDatabase();
    setTimeout(() => {
      setIsReconnecting(false);
      setReconnectMessage("Connection refreshed.");
    }, 600);
  };

  // Load all records
  const loadDatabase = () => {
    const allUsers = getUsers();
    const studentList = allUsers.filter((u) => u.role === "student");
    setStudents(studentList);

    const facultyList = allUsers.filter((u) => u.role === "teacher");
    setFaculty(facultyList);

    const records = getAttendanceRecords();
    setAttendanceRecords(records);

    const logs = getSecurityLogs();
    setSecurityLogs(logs);

    const freshUser = allUsers.find((u) => u.id.toLowerCase() === user.id.toLowerCase());
    if (freshUser) {
      setDbUser(freshUser);
    }

    const teacherClasses = getClassesForTeacher(user.id);
    setClasses(teacherClasses);
    // Keep the active class valid: if nothing's picked yet, or the
    // previously-active class was deleted, fall back to the first class.
    setActiveClassId((current) => {
      if (current && teacherClasses.some((c) => c.id === current)) return current;
      const fallback = teacherClasses[0]?.id || "";
      if (fallback) localStorage.setItem(ACTIVE_CLASS_STORAGE_PREFIX + user.id, fallback);
      return fallback;
    });
  };

  useEffect(() => {
    loadDatabase();
    const handleDbUpdate = () => {
      loadDatabase();
    };
    window.addEventListener("db_updated", handleDbUpdate);
    return () => {
      window.removeEventListener("db_updated", handleDbUpdate);
    };
  }, []);

  // Handler: Remove Student Trigger (using custom modal)
  const handleRemoveStudent = (id: string, name: string) => {
    setStudentToDelete({ id, name });
  };

  const executeRemoveStudent = () => {
    if (studentToDelete && activeClassId) {
      removeStudentFromClass(activeClassId, studentToDelete.id);
      loadDatabase();
      setStudentToDelete(null);
    }
  };

  // Handler: Approve Student Profile
  const handleApproveStudent = (id: string) => {
    const allUsers = getUsers();
    const userIndex = allUsers.findIndex((u) => u.id.toLowerCase() === id.toLowerCase());
    if (userIndex !== -1) {
      allUsers[userIndex] = { ...allUsers[userIndex], isApproved: true };
      localStorage.setItem("attendance_system_users", JSON.stringify(allUsers));
      saveUser(allUsers[userIndex]);
      loadDatabase();
    }
  };

  // Handler: Approve Faculty Member
  const handleApproveFaculty = (id: string) => {
    if (!isApprovedUser) return;
    const allUsers = getUsers();
    const userIndex = allUsers.findIndex((u) => u.id.toLowerCase() === id.toLowerCase());
    if (userIndex !== -1) {
      allUsers[userIndex] = { ...allUsers[userIndex], isApproved: true };
      localStorage.setItem("attendance_system_users", JSON.stringify(allUsers));
      saveUser(allUsers[userIndex]);
      loadDatabase();
    }
  };

  // Handler: Delete Faculty Member
  const handleDeleteFaculty = (id: string) => {
    if (!isApprovedUser) return;
    if (id.toLowerCase() === dbUser.id.toLowerCase()) {
      alert("Error: You cannot delete your own logged-in account.");
      return;
    }
    if (window.confirm(`Are you sure you want to permanently remove teacher account "${id}"?`)) {
      deleteUser(id);
      loadDatabase();
    }
  };

  // Handler: Save Attendance Override / Manual Log
  const handleSaveAttendanceOverride = (e: React.FormEvent) => {
    e.preventDefault();
    setLogError(null);

    if (!logStudentId) {
      setLogError("Please select a student.");
      return;
    }

    const matchedStudent = students.find((s) => s.id === logStudentId);
    if (!matchedStudent) {
      setLogError("Invalid student selected.");
      return;
    }

    // Check if record for this student and date already exists
    const existingIndex = attendanceRecords.findIndex(
      (r) => r.studentId.toLowerCase() === logStudentId.toLowerCase() && r.date === selectedDate && (!activeClass || attendanceMatchesClass(r, activeClass))
    );

    const recordId = existingIndex !== -1 ? attendanceRecords[existingIndex].id : `rec-${Date.now()}`;
    const nowTime = new Date().toTimeString().split(" ")[0]; // HH:MM:SS

    const updatedRecord: AttendanceRecord = {
      id: recordId,
      studentId: logStudentId,
      studentName: matchedStudent.name,
      date: selectedDate,
      time: logStatus === "Absent" ? "00:00:00" : nowTime,
      status: logStatus,
      notes: logNotes.trim() || undefined,
      subject: activeClass ? (activeClass.subject || activeClass.name) : "General Class",
      classId: activeClassId || undefined,
    };

    saveAttendanceRecord(updatedRecord);
    loadDatabase();

    // Reset
    setLogStudentId("");
    setLogNotes("");
    setShowLogModal(false);
  };

  // Handler: Quick Override toggle in line - cycles Present -> Late -> Absent -> Present
  const handleQuickStatusToggle = (record: AttendanceRecord) => {
    const cycle: Record<AttendanceStatus, AttendanceStatus> = {
      Present: "Late",
      Late: "Absent",
      Absent: "Present",
    };
    const nextStatus: AttendanceStatus = cycle[record.status];
    const nowTime = new Date().toTimeString().split(" ")[0];

    const updated: AttendanceRecord = {
      ...record,
      status: nextStatus,
      time: nextStatus === "Absent" ? "00:00:00" : nowTime,
      notes: `Toggled by teacher (${user.name})`,
    };

    saveAttendanceRecord(updated);
    loadDatabase();
  };

  // Handler: Create missing attendance directly from row
  const handleMarkDirect = (student: User, status: AttendanceStatus) => {
    const nowTime = new Date().toTimeString().split(" ")[0];
    const newRec: AttendanceRecord = {
      id: `rec-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      date: selectedDate,
      time: status === "Absent" ? "00:00:00" : nowTime,
      status,
      notes: `Recorded by teacher (${user.name})`,
      subject: activeClass ? (activeClass.subject || activeClass.name) : "General Class",
      classId: activeClassId || undefined,
    };

    saveAttendanceRecord(newRec);
    loadDatabase();
  };

  // Computations
  // 1. Statistics for Today
  const todayDateStr = selectedDate;
  const todayLogs = attendanceRecords.filter((r) => r.date === todayDateStr && (!activeClass || attendanceMatchesClass(r, activeClass)));
  const presentToday = todayLogs.filter((r) => r.status === "Present").length;
  const lateToday = todayLogs.filter((r) => r.status === "Late").length;
  const absentToday = todayLogs.filter((r) => r.status === "Absent").length;
  const checkedInCount = todayLogs.length;
  
  const todayAttendanceRate =
    checkedInCount > 0 ? Math.round(((presentToday + lateToday) / checkedInCount) * 100) : 0;

  // Students enrolled in the active class (real ClassRoom roster - joined
  // by code or added by ID, both instant, no approval step)
  const enrolledStudents = activeClass
    ? students.filter((s) => activeClass.studentIds.some((id) => id.toLowerCase() === s.id.toLowerCase()))
    : [];

  // Filter enrolled students based on search
  const filteredStudents = enrolledStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Daily Audit Log mapping
  const dailySheet = enrolledStudents.map((student) => {
    const log = attendanceRecords.find(
      (r) => r.studentId.toLowerCase() === student.id.toLowerCase() && r.date === selectedDate && (!activeClass || attendanceMatchesClass(r, activeClass))
    );
    return {
      student,
      record: log || null,
    };
  });

  // Filter Daily sheet based on selected status filter
  const filteredDailySheet = dailySheet.filter(({ record }) => {
    if (statusFilter === "All") return true;
    if (statusFilter === "Present") return record?.status === "Present";
    if (statusFilter === "Late") return record?.status === "Late";
    if (statusFilter === "Absent") return record === null || record.status === "Absent";
    return true;
  });

  // Historical Attendance Trend for last 5 days (Bar chart calculations)
  const getTrendData = () => {
    const days = [4, 3, 2, 1, 0];
    return days.map((offset) => {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      const dateStr = formatDate(d);

      const logs = attendanceRecords.filter((r) => r.date === dateStr && (!activeClass || attendanceMatchesClass(r, activeClass)));
      const present = logs.filter((r) => r.status === "Present" || r.status === "Late").length;
      const total = logs.length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;

      return {
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        rate,
        present,
        total,
      };
    });
  };

  const trendData = getTrendData();

  if (viewingStudent) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-cream rounded-3xl border border-ink-soft/10 shadow-xl p-4 md:p-8">
          <StudentProfile student={viewingStudent} onBack={() => setViewingStudent(null)} />
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="max-w-6xl mx-auto px-4 py-8">
    <div className="bg-cream rounded-3xl border border-ink-soft/10 shadow-xl p-4 md:p-8 space-y-8" id="teacher-dashboard">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-ink-soft/10 pb-6">
        <div className="min-w-0">
          <span className="px-2.5 py-1 text-xs font-semibold bg-violet-50 text-violet-600 rounded-full border border-violet-100">
            Teacher Dashboard
          </span>
          <h1 className="text-3xl font-black text-ink tracking-tight mt-2 break-words" id="teacher-welcome-title">
            Welcome, {user.name}
          </h1>
          <p className="text-sm text-ink-soft/70 font-sans mt-0.5">
            Role: <span className="font-semibold text-ink-soft">Teacher</span>
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {classes.length > 0 ? (
              <div className="inline-flex items-center gap-1.5 bg-violet-500 rounded-lg pl-3 pr-1.5 py-1 shadow-sm">
                <BookOpen className="h-3.5 w-3.5 text-white shrink-0" />
                <label className="sr-only" htmlFor="active-class-select">Active class</label>
                <select
                  id="active-class-select"
                  value={activeClassId}
                  onChange={(e) => handleSelectActiveClass(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white cursor-pointer focus:outline-none appearance-none pr-1"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id} className="text-ink">
                      {c.name}{c.subject ? ` · ${c.subject}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-amber-100 text-amber-800 rounded-lg">
                <BookOpen className="h-3.5 w-3.5" /> No classes yet
              </span>
            )}
            <button
              onClick={() => setActiveTab("classes")}
              className="inline-flex items-center gap-1 text-xs font-bold text-violet-500 hover:text-violet-700 hover:bg-violet-50 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
            >
              <Sliders className="h-3 w-3" /> {classes.length > 0 ? "Manage classes" : "Create a class"}
            </button>
          </div>
        </div>

        <div className="self-start md:self-center">
          <button
            onClick={() => {
              setEditNameValue(user.name);
              setSettingsError(null);
              setShowSettingsModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-ink-soft bg-white border border-ink-soft/15 rounded-xl hover:bg-cream-dim/60 hover:text-ink shadow-sm transition-all cursor-pointer"
            id="teacher-settings-btn"
          >
            <SettingsIcon className="h-4 w-4" /> Settings
          </button>
        </div>
      </div>

      {/* Pending Approval Banner */}
      {!isApprovedUser && (
        <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-5 flex flex-col sm:flex-row items-start gap-4 animate-pulse" id="unverified-faculty-alert">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-xl shrink-0">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-amber-900">
              Account Pending Verification
            </h3>
            <p className="text-xs text-amber-700 leading-relaxed">
              Your account hasn't been verified by another teacher yet. Until then, you can look around, but you can't approve students, edit logs, manage other teacher accounts, or open a class for check-ins.
            </p>
            <p className="text-[10px] text-amber-600 font-mono">
              Ask another verified teacher to approve you from the <strong>Teachers</strong> tab.
            </p>
          </div>
        </div>
      )}

      {/* Stats Highlight Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5" id="teacher-stats-grid">
        <div className="bg-white border border-ink-soft/10 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-violet-50 text-violet-500 rounded-xl shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-ink-soft/50 block">Total Roster</span>
            <span className="text-2xl font-black text-ink block mt-0.5" id="metric-total-students">
              {students.length} Students
            </span>
          </div>
        </div>

        <div className="bg-white border border-ink-soft/10 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-teal-50 text-teal-500 rounded-xl shrink-0">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-ink-soft/50 block">Present Today</span>
            <span className="text-2xl font-black text-ink block mt-0.5" id="metric-present-today">
              {presentToday} logged
            </span>
          </div>
        </div>

        <div className="bg-white border border-ink-soft/10 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-ink-soft/50 block">Late Today</span>
            <span className="text-2xl font-black text-ink block mt-0.5" id="metric-late-today">
              {lateToday} logged
            </span>
          </div>
        </div>

        <div className="bg-white border border-ink-soft/10 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-500 rounded-xl shrink-0">
            <XCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-ink-soft/50 block">Absent Today</span>
            <span className="text-2xl font-black text-ink block mt-0.5" id="metric-absent-today">
              {absentToday} logs
            </span>
          </div>
        </div>

        <div className="bg-white border border-ink-soft/10 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-ink-soft/50 block">Today's Rate</span>
            <span className="text-2xl font-black text-ink block mt-0.5" id="metric-attendance-rate">
              {todayAttendanceRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Navigation - dropdown on mobile (no horizontal scrolling to fight
          with), tab bar on larger screens where it actually fits. */}
      <div className="sm:hidden">
        <label className="sr-only" htmlFor="mobile-tab-select">Section</label>
        <div className="relative">
          <select
            id="mobile-tab-select"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as typeof activeTab)}
            className="w-full pl-4 pr-11 py-3 text-sm font-bold text-ink bg-white border-2 border-violet-100 rounded-xl focus:outline-none focus:border-violet-400 shadow-sm appearance-none cursor-pointer"
          >
            <option value="roster">
              Class Roster ({enrolledStudents.length})
            </option>
            <option value="classes">Classes</option>
            <option value="audit">Daily Sheet & Overrides</option>
            <option value="reports">Performance Reports</option>
            <option value="security">
              Security Logs{securityLogs.length > 0 ? ` (${securityLogs.length})` : ""}
            </option>
            <option value="faculty">
              Teachers{faculty.filter((f) => !f.isApproved).length > 0 ? ` \u2022 ${faculty.filter((f) => !f.isApproved).length} pending` : ""}
            </option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-violet-500" />
        </div>
      </div>

      <div className="hidden sm:flex border-b border-ink-soft/10 gap-6" id="teacher-tabs-nav">
        <button
          onClick={() => setActiveTab("roster")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === "roster"
              ? "border-violet-500 text-violet-500"
              : "border-transparent text-ink-soft/50 hover:text-ink-soft"
          }`}
          id="tab-roster-btn"
        >
          Class Roster ({enrolledStudents.length})
        </button>
        <button
          onClick={() => setActiveTab("classes")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "classes"
              ? "border-violet-500 text-violet-500"
              : "border-transparent text-ink-soft/50 hover:text-ink-soft"
          }`}
          id="tab-classes-btn"
        >
          Classes
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "audit"
              ? "border-violet-500 text-violet-500"
              : "border-transparent text-ink-soft/50 hover:text-ink-soft"
          }`}
          id="tab-audit-btn"
        >
          Daily Sheet & Overrides
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "reports"
              ? "border-violet-500 text-violet-500"
              : "border-transparent text-ink-soft/50 hover:text-ink-soft"
          }`}
          id="tab-reports-btn"
        >
          Performance Reports
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === "security"
              ? "border-violet-500 text-violet-500"
              : "border-transparent text-ink-soft/50 hover:text-ink-soft"
          }`}
          id="tab-security-btn"
        >
          Security Logs
          {securityLogs.length > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-[9px] font-black bg-rose-500 text-white rounded-full animate-pulse">
              {securityLogs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("faculty")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === "faculty"
              ? "border-violet-500 text-violet-500"
              : "border-transparent text-ink-soft/50 hover:text-ink-soft"
          }`}
          id="tab-faculty-btn"
        >
          Teachers
          {faculty.filter((f) => !f.isApproved).length > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-[9px] font-black bg-amber-500 text-white rounded-full animate-pulse">
              {faculty.filter((f) => !f.isApproved).length}
            </span>
          )}
        </button>
      </div>

      {/* Render Active Tab */}
      <div className="space-y-6" id="active-tab-container">

        {/* TAB: CLASSES (Google-Classroom-style sections) */}
        {activeTab === "classes" && (
          <Classroom
            currentUser={user}
            onOpenAttendance={(id) => {
              handleSelectActiveClass(id);
              setActiveTab("roster");
            }}
          />
        )}

        {/* TAB 1: STUDENT ROSTER */}
        {activeTab === "roster" && !activeClass && classes.length === 0 && (
          <div className="bg-white rounded-2xl border border-ink-soft/10 p-8 space-y-4 max-w-md mx-auto text-center">
            <BookOpen className="h-8 w-8 mx-auto text-violet-300" />
            <div>
              <h3 className="font-bold text-ink">Create your first class</h3>
              <p className="text-sm text-ink-soft/70 mt-1">
                A class holds its own roster, attendance, and stream. You can create more later.
              </p>
            </div>
            <div className="text-left space-y-2.5">
              <input
                value={inlineClassName}
                onChange={(e) => setInlineClassName(e.target.value)}
                placeholder="Class name, e.g. Grade 10 - Section A"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-ink-soft/15 focus:outline-none focus:border-violet-400 bg-white"
              />
              <input
                value={inlineClassSubject}
                onChange={(e) => setInlineClassSubject(e.target.value)}
                placeholder="Subject (optional), e.g. Mathematics"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-ink-soft/15 focus:outline-none focus:border-violet-400 bg-white"
              />
              {inlineClassError && <p className="text-xs text-coral-600 font-semibold">{inlineClassError}</p>}
              <button
                onClick={handleCreateClassInline}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-violet-500 hover:bg-violet-600 text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-violet transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Create class
              </button>
            </div>
          </div>
        )}
        {activeTab === "roster" && !activeClass && classes.length > 0 && (
          <div className="bg-white rounded-2xl border border-ink-soft/10 p-10 text-center space-y-3">
            <BookOpen className="h-8 w-8 mx-auto text-violet-300" />
            <p className="text-sm text-ink-soft/70">Pick a class from the switcher above to see its roster.</p>
          </div>
        )}
        {activeTab === "roster" && activeClass && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search students by name or unique ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-ink-soft/15 rounded-xl focus:outline-none focus:border-violet-400 text-ink shadow-sm"
                  id="student-search-input"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-soft/50" />
              </div>
              {/* Add student to active class by ID - joining is instant now, no approval step */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Add student by ID"
                  value={addStudentIdInput}
                  onChange={(e) => { setAddStudentIdInput(e.target.value); setAddStudentError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleAddStudentToActiveClass()}
                  className="px-3.5 py-2 text-xs bg-white border border-ink-soft/15 rounded-xl focus:outline-none focus:border-violet-400 text-ink shadow-sm w-40"
                  id="roster-add-student-input"
                />
                <button
                  onClick={handleAddStudentToActiveClass}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-white bg-violet-500 hover:bg-violet-600 rounded-xl transition-all cursor-pointer shrink-0"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>
            {addStudentError && <p className="text-xs text-rose-600 font-semibold">{addStudentError}</p>}

            {/* Students table */}
            <div className="bg-white border border-ink-soft/10 rounded-2xl overflow-hidden shadow-sm">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-16 text-ink-soft/50 text-sm">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  No students in this class yet. Share the join code from the Classes tab, or add one by ID above.
                </div>
              ) : (
                <>
                  {/* Mobile: stacked cards */}
                  <div className="sm:hidden divide-y divide-gray-50">
                    {filteredStudents.map((student) => (
                      <div key={student.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-ink text-sm truncate">{student.name}</p>
                            <p className="font-mono text-xs text-violet-500 font-bold">{student.id}</p>
                          </div>
                          {student.isApproved ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-600 border border-teal-100 shrink-0">
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 animate-pulse shrink-0">
                              Pending
                            </span>
                          )}
                        </div>
                        {(student.email || student.location) && (
                          <div className="text-xs text-ink-soft/70 space-y-0.5">
                            {student.email && <div className="text-ink-soft">{student.email}</div>}
                            {student.location && <div className="text-[11px] text-ink-soft/50">{student.location}</div>}
                          </div>
                        )}
                        <p className="text-[11px] text-ink-soft/50">Registered {student.createdAt}</p>
                        <div className="flex gap-2 pt-1">
                          {!student.isApproved && (
                            <button
                              onClick={() => handleApproveStudent(student.id)}
                              disabled={!isApprovedUser}
                              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 border border-teal-100 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <UserCheck className="h-3.5 w-3.5" /> Approve
                            </button>
                          )}
                          <button
                            onClick={() => setViewingStudent(student)}
                            className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-100 rounded-lg transition-all cursor-pointer"
                            id={`view-profile-btn-${student.id}`}
                          >
                            <Eye className="h-3.5 w-3.5" /> Profile
                          </button>
                          <button
                            onClick={() => openEditStudent(student)}
                            disabled={!isApprovedUser}
                            className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-100 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleRemoveStudent(student.id, student.name)}
                            disabled={!isApprovedUser}
                            className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-100 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <UserMinus className="h-3.5 w-3.5" /> Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop/tablet: table */}
                  <div className="hidden sm:block overflow-x-auto scroll-shadow-x">
                  <table className="w-full text-left border-collapse" id="roster-table">
                    <thead>
                      <tr className="bg-cream-dim/60 border-b border-ink-soft/10 text-[10px] text-ink-soft/50 font-extrabold uppercase tracking-wider">
                        <th className="px-6 py-3.5 font-semibold">Student ID (Username)</th>
                        <th className="px-6 py-3.5 font-semibold">Full Name</th>
                        <th className="px-6 py-3.5 font-semibold">Contact</th>
                        <th className="px-6 py-3.5 font-semibold">Registration Date</th>
                        <th className="px-6 py-3.5 font-semibold">Status</th>
                        <th className="px-6 py-3.5 font-semibold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs text-ink-soft">
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-cream-dim/60/50 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-violet-500">
                            {student.id}
                          </td>
                          <td className="px-6 py-4 font-semibold text-ink">
                            <button
                              onClick={() => setViewingStudent(student)}
                              className="hover:text-violet-600 hover:underline transition-colors cursor-pointer text-left"
                              id={`profile-link-${student.id}`}
                            >
                              {student.name}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-ink-soft/70">
                            {student.email || student.location ? (
                              <div className="space-y-0.5">
                                {student.email && <div className="text-ink-soft">{student.email}</div>}
                                {student.location && <div className="text-[11px] text-ink-soft/50">{student.location}</div>}
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-ink-soft/70">
                            {student.createdAt}
                          </td>
                          <td className="px-6 py-4">
                            {student.isApproved ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-600 border border-teal-100">
                                Verified Student
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 animate-pulse">
                                Pending Verification
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                            {!student.isApproved && (
                              <button
                                onClick={() => handleApproveStudent(student.id)}
                                disabled={!isApprovedUser}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 border border-teal-100 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                title={!isApprovedUser ? "Verification Required" : "Verify this student profile"}
                              >
                                <UserCheck className="h-3 w-3" /> Approve
                              </button>
                            )}
                            <button
                              onClick={() => setViewingStudent(student)}
                              className="inline-flex p-1.5 text-violet-500 hover:bg-violet-50 rounded-lg transition-colors cursor-pointer"
                              aria-label={`View ${student.name}'s profile`}
                              title="View profile"
                              id={`view-profile-btn-desktop-${student.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEditStudent(student)}
                              disabled={!isApprovedUser}
                              className="inline-flex p-1.5 text-violet-500 hover:bg-violet-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label={`Edit ${student.name}'s info`}
                              title={!isApprovedUser ? "Verification Required" : "Edit student info"}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveStudent(student.id, student.name)}
                              disabled={!isApprovedUser}
                              className="inline-flex p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label={`Remove ${student.name} from this class`}
                              title={!isApprovedUser ? "Verification Required" : "Remove student from this subject class"}
                            >
                              <UserMinus className="h-4.5 w-4.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DAILY SHEET & AUDIT OVERRIDES */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              
              {/* Date selection & Filter */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4.5 w-4.5 text-violet-500" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white border border-ink-soft/15 rounded-xl focus:outline-none focus:border-violet-400 text-ink font-semibold shadow-sm"
                    id="audit-date-picker"
                  />
                </div>

                <div className="flex items-center gap-1.5 border border-ink-soft/10 bg-cream-dim/60/50 p-1 rounded-xl">
                  <button
                    onClick={() => setStatusFilter("All")}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      statusFilter === "All"
                        ? "bg-white text-ink shadow-sm"
                        : "text-ink-soft/50 hover:text-ink-soft"
                    }`}
                  >
                    All Students
                  </button>
                  <button
                    onClick={() => setStatusFilter("Present")}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      statusFilter === "Present"
                        ? "bg-white text-teal-500 shadow-sm"
                        : "text-ink-soft/50 hover:text-ink-soft"
                    }`}
                  >
                    Present Today
                  </button>
                  <button
                    onClick={() => setStatusFilter("Late")}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      statusFilter === "Late"
                        ? "bg-white text-amber-600 shadow-sm"
                        : "text-ink-soft/50 hover:text-ink-soft"
                    }`}
                  >
                    Late Today
                  </button>
                  <button
                    onClick={() => setStatusFilter("Absent")}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      statusFilter === "Absent"
                        ? "bg-white text-rose-600 shadow-sm"
                        : "text-ink-soft/50 hover:text-ink-soft"
                    }`}
                  >
                    Absent Today
                  </button>
                </div>
              </div>

              {/* Manual Override Log Button */}
              <button
                onClick={() => {
                  if (!isApprovedUser) {
                    alert("Verification Required: Unverified teachers cannot record manual overrides.");
                    return;
                  }
                  setLogError(null);
                  setShowLogModal(true);
                }}
                disabled={!isApprovedUser}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-violet-500 hover:bg-violet-600 rounded-full shadow-violet hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                id="open-override-btn"
                title={!isApprovedUser ? "Verification Required" : "Add manual override log"}
              >
                <Plus className="h-4 w-4" /> Add Manual Log
              </button>
            </div>

            {/* Attendance matrix sheet table */}
            <div className="bg-white border border-ink-soft/10 rounded-2xl overflow-hidden shadow-sm">
              {filteredDailySheet.length === 0 ? (
                <div className="text-center py-16 text-ink-soft/50 text-sm">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  No matching student attendance records found for {selectedDate}.
                </div>
              ) : (
                <>
                  {/* Mobile: stacked cards */}
                  <div className="sm:hidden divide-y divide-gray-50">
                    {filteredDailySheet.map(({ student, record }) => (
                      <div key={student.id} className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-ink text-sm truncate">{student.name}</p>
                            <p className="font-mono text-xs text-ink-soft/50">{student.id}</p>
                          </div>
                          {record ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                record.status === "Present"
                                  ? "bg-teal-50 text-teal-600 border border-teal-100"
                                  : record.status === "Late"
                                  ? "bg-amber-50 text-amber-700 border border-amber-100"
                                  : "bg-rose-50 text-rose-700 border border-rose-100"
                              }`}
                            >
                              {record.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-ink-soft/50 shrink-0">
                              Unmarked
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-ink-soft/70">
                          <span>{selectedDate}</span>
                          {record && record.status !== "Absent" && (
                            <span className="font-mono">{record.time}</span>
                          )}
                        </div>
                        {record?.notes && (
                          <p className="text-xs text-ink-soft/70 italic">{record.notes}</p>
                        )}
                        <div className="pt-1">
                          {record ? (
                            <button
                              onClick={() => handleQuickStatusToggle(record)}
                              disabled={!isApprovedUser}
                              className="w-full inline-flex items-center justify-center gap-1 text-xs font-bold text-violet-500 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-2 rounded-lg transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                            >
                              <Edit className="h-3.5 w-3.5" /> Toggle Status
                            </button>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleMarkDirect(student, "Present")}
                                disabled={!isApprovedUser}
                                className="flex-1 text-xs font-extrabold text-teal-500 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-2 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Present
                              </button>
                              <button
                                onClick={() => handleMarkDirect(student, "Late")}
                                disabled={!isApprovedUser}
                                className="flex-1 text-xs font-extrabold text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-2 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Late
                              </button>
                              <button
                                onClick={() => handleMarkDirect(student, "Absent")}
                                disabled={!isApprovedUser}
                                className="flex-1 text-xs font-extrabold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-2 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Absent
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop/tablet: table */}
                  <div className="hidden sm:block overflow-x-auto scroll-shadow-x">
                  <table className="w-full text-left border-collapse" id="audit-logs-table">
                    <thead>
                      <tr className="bg-cream-dim/60 border-b border-ink-soft/10 text-[10px] text-ink-soft/50 font-extrabold uppercase tracking-wider">
                        <th className="px-6 py-3.5 font-semibold">Student ID</th>
                        <th className="px-6 py-3.5 font-semibold">Full Name</th>
                        <th className="px-6 py-3.5 font-semibold">Date</th>
                        <th className="px-6 py-3.5 font-semibold">Log Time</th>
                        <th className="px-6 py-3.5 font-semibold">Status</th>
                        <th className="px-6 py-3.5 font-semibold">Comments / Notes</th>
                        <th className="px-6 py-3.5 font-semibold text-center">Quick Override</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs text-ink-soft">
                      {filteredDailySheet.map(({ student, record }) => (
                        <tr key={student.id} className="hover:bg-cream-dim/60/50 transition-colors">
                          <td className="px-6 py-4 font-mono text-ink-soft/70">
                            {student.id}
                          </td>
                          <td className="px-6 py-4 font-semibold text-ink">
                            {student.name}
                          </td>
                          <td className="px-6 py-4 font-mono font-medium text-ink-soft/70">
                            {selectedDate}
                          </td>
                          <td className="px-6 py-4 font-mono text-ink-soft/70">
                            {record && record.status !== "Absent" ? record.time : "—"}
                          </td>
                          <td className="px-6 py-4">
                            {record ? (
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  record.status === "Present"
                                    ? "bg-teal-50 text-teal-600 border border-teal-100"
                                    : record.status === "Late"
                                    ? "bg-amber-50 text-amber-700 border border-amber-100"
                                    : "bg-rose-50 text-rose-700 border border-rose-100"
                                }`}
                              >
                                {record.status}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-ink-soft/50">
                                Unmarked (Absent)
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-ink-soft/70 italic max-w-xs truncate">
                            {record?.notes || "—"}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {record ? (
                              <button
                                onClick={() => handleQuickStatusToggle(record)}
                                disabled={!isApprovedUser}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-500 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                                title={!isApprovedUser ? "Verification Required" : "Cycle status: Present -> Late -> Absent"}
                              >
                                <Edit className="h-3 w-3" /> Toggle
                              </button>
                            ) : (
                              <div className="flex justify-center gap-1.5">
                                <button
                                  onClick={() => handleMarkDirect(student, "Present")}
                                  disabled={!isApprovedUser}
                                  className="text-[10px] font-extrabold text-teal-500 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                  title={!isApprovedUser ? "Verification Required" : "Mark as present"}
                                >
                                  Present
                                </button>
                                <button
                                  onClick={() => handleMarkDirect(student, "Late")}
                                  disabled={!isApprovedUser}
                                  className="text-[10px] font-extrabold text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                  title={!isApprovedUser ? "Verification Required" : "Mark as late"}
                                >
                                  Late
                                </button>
                                <button
                                  onClick={() => handleMarkDirect(student, "Absent")}
                                  disabled={!isApprovedUser}
                                  className="text-[10px] font-extrabold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                  title={!isApprovedUser ? "Verification Required" : "Mark as absent"}
                                >
                                  Absent
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PERFORMANCE REPORTS */}
        {activeTab === "reports" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Visual Trend Chart */}
            <div className="lg:col-span-1 bg-white border border-ink-soft/10 rounded-2xl p-6 shadow-sm flex flex-col">
              <h3 className="text-base font-bold text-ink flex items-center gap-1.5 mb-2">
                <Activity className="h-5 w-5 text-violet-500" />
                Attendance Trend
              </h3>
              <p className="text-xs text-ink-soft/70 mb-6">
                Average attendance rate over the last 5 days.
              </p>

              {/* Custom SVG Bar Chart */}
              <div className="flex-1 min-h-[220px] flex items-end justify-between px-2 pt-4 relative">
                {/* Horizontal guide lines */}
                <div className="absolute inset-x-0 bottom-0 h-full flex flex-col justify-between pointer-events-none text-[9px] text-gray-300 font-mono">
                  <div className="border-t border-dashed border-ink-soft/10 w-full pt-1">100%</div>
                  <div className="border-t border-dashed border-ink-soft/10 w-full pt-1">75%</div>
                  <div className="border-t border-dashed border-ink-soft/10 w-full pt-1">50%</div>
                  <div className="border-t border-dashed border-ink-soft/10 w-full pt-1">25%</div>
                  <div className="border-t border-ink-soft/15 w-full" />
                </div>

                {trendData.map((data, idx) => (
                  <div key={idx} className="flex flex-col items-center flex-1 group z-10">
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded font-semibold transition-opacity pointer-events-none">
                      {data.rate}% ({data.present}/{data.total})
                    </div>
                    {/* Bar */}
                    <div className="w-8 sm:w-10 bg-gray-100 rounded-t-lg overflow-hidden h-[150px] flex items-end">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          data.rate >= 80 ? "bg-violet-500" : data.rate >= 60 ? "bg-amber-400" : "bg-rose-400"
                        }`}
                        style={{ height: `${data.rate}%` }}
                      />
                    </div>
                    {/* Label */}
                    <span className="text-[10px] font-bold text-ink-soft/70 mt-2 font-mono">
                      {data.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Student attendance reports list */}
            <div className="lg:col-span-2 bg-white border border-ink-soft/10 rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-ink flex items-center gap-1.5 mb-2">
                <FileSpreadsheet className="h-5 w-5 text-teal-500" />
                Student Attendance Summary
              </h3>
              <p className="text-xs text-ink-soft/70 mb-4">
                Total aggregate records and percentage attendance for individual students.
              </p>

              {enrolledStudents.length === 0 ? (
                <div className="text-center py-10 text-ink-soft/50 text-sm">
                  No student records to compile.
                </div>
              ) : (
                <>
                  {/* Mobile: stacked cards */}
                  <div className="sm:hidden divide-y divide-gray-50">
                    {enrolledStudents.map((student) => {
                      const sStats = calculateStudentStats(student.id, activeClassId);
                      return (
                        <div key={student.id} className="py-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-ink text-sm truncate">{student.name}</p>
                              <p className="font-mono text-xs text-ink-soft/50">{student.id}</p>
                            </div>
                            <span
                              className={`text-sm font-mono font-black shrink-0 ${
                                sStats.percentage >= 90
                                  ? "text-teal-500"
                                  : sStats.percentage >= 75
                                  ? "text-amber-600"
                                  : "text-rose-500"
                              }`}
                            >
                              {sStats.percentage}%
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-teal-500 font-bold">{sStats.presentCount} Present</span>
                            <span className="text-amber-600 font-bold">{sStats.lateCount} Late</span>
                            <span className="text-rose-500 font-bold">{sStats.absentCount} Absent</span>
                          </div>
                          <p className="text-[11px] text-ink-soft/50">{sStats.totalDays} total cycles logged</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop/tablet: table */}
                  <div className="hidden sm:block overflow-x-auto scroll-shadow-x">
                  <table className="w-full text-left border-collapse" id="reports-table">
                    <thead>
                      <tr className="border-b border-ink-soft/10 text-[10px] text-ink-soft/50 font-extrabold uppercase tracking-wider">
                        <th className="px-4 pb-3 font-semibold">Student ID</th>
                        <th className="px-4 pb-3 font-semibold">Full Name</th>
                        <th className="px-4 pb-3 font-semibold text-center">Present</th>
                        <th className="px-4 pb-3 font-semibold text-center">Late</th>
                        <th className="px-4 pb-3 font-semibold text-center">Absent</th>
                        <th className="px-4 pb-3 font-semibold text-center">Total Cycles</th>
                        <th className="px-4 pb-3 font-semibold text-right">Attendance Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs text-ink-soft">
                      {enrolledStudents.map((student) => {
                        const sStats = calculateStudentStats(student.id, activeClassId);
                        return (
                          <tr key={student.id} className="hover:bg-cream-dim/60/50 transition-colors">
                            <td className="px-4 py-3.5 font-mono text-ink-soft/70">{student.id}</td>
                            <td className="px-4 py-3.5 font-semibold text-ink">{student.name}</td>
                            <td className="px-4 py-3.5 text-center font-bold text-teal-500">{sStats.presentCount}</td>
                            <td className="px-4 py-3.5 text-center font-bold text-amber-600">{sStats.lateCount}</td>
                            <td className="px-4 py-3.5 text-center font-bold text-rose-500">{sStats.absentCount}</td>
                            <td className="px-4 py-3.5 text-center text-ink-soft/70">{sStats.totalDays}</td>
                            <td className="px-4 py-3.5 text-right font-mono font-bold">
                              <span
                                className={`inline-flex items-center gap-1 ${
                                  sStats.percentage >= 90
                                    ? "text-teal-500"
                                    : sStats.percentage >= 75
                                    ? "text-amber-600"
                                    : "text-rose-500"
                                }`}
                              >
                                {sStats.percentage}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SECURITY AUDIT TRAIL */}
        {activeTab === "security" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-ink-soft/10 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in"
            id="security-audit-container"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-ink-soft/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-rose-500" />
                  Impersonation & Access Reports
                </h3>
                <p className="text-xs text-ink-soft/70 mt-1">
                  Chronological records of students attempting to access administrative hubs or unauthorized activities.
                </p>
              </div>

              {securityLogs.length > 0 && (
                <button
                  onClick={() => {
                    if (!isApprovedUser) {
                      alert("Verification Required: Unverified teachers cannot clear security logs.");
                      return;
                    }
                    if (window.confirm("Are you sure you want to clear all security logs?")) {
                      securityLogs.forEach(l => deleteSecurityLog(l.id));
                      loadDatabase();
                    }
                  }}
                  disabled={!isApprovedUser}
                  className="px-3.5 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!isApprovedUser ? "Verification Required" : "Clear all logs"}
                >
                  Clear All Logs
                </button>
              )}
            </div>

            {securityLogs.length === 0 ? (
              <div className="text-center py-12 text-ink-soft/50 text-sm">
                <CheckCircle className="h-10 w-10 mx-auto mb-3 text-teal-500" />
                <h4 className="font-bold text-ink-soft">System Secure</h4>
                <p className="text-xs text-ink-soft/50 mt-1">
                  No unauthorized access or student impersonation attempts have been detected.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile: stacked cards */}
                <div className="sm:hidden divide-y divide-gray-50">
                  {securityLogs.map((log) => (
                    <div key={log.id} className="py-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-rose-600 font-mono text-sm">{log.usernameAttempted}</span>
                        <button
                          onClick={() => {
                            if (!isApprovedUser) {
                              alert("Verification Required: Unverified teachers cannot delete log entries.");
                              return;
                            }
                            deleteSecurityLog(log.id);
                            loadDatabase();
                          }}
                          disabled={!isApprovedUser}
                          className="p-1.5 text-ink-soft/50 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                          aria-label="Delete log entry"
                          title={!isApprovedUser ? "Verification Required" : "Delete Log Entry"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                        {log.type}
                      </span>
                      <p className="text-xs text-ink-soft leading-relaxed">{log.details}</p>
                      <p className="text-[11px] text-ink-soft/50 font-mono">
                        {new Date(log.timestamp).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        })}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Desktop/tablet: table */}
                <div className="hidden sm:block overflow-x-auto scroll-shadow-x">
                <table className="w-full text-left border-collapse" id="security-logs-table">
                  <thead>
                    <tr className="border-b border-ink-soft/10 text-[10px] text-ink-soft/50 font-extrabold uppercase tracking-wider">
                      <th className="px-4 pb-3 font-semibold">Timestamp</th>
                      <th className="px-4 pb-3 font-semibold">Username/ID Attempted</th>
                      <th className="px-4 pb-3 font-semibold">Violation Type</th>
                      <th className="px-4 pb-3 font-semibold">Report Details</th>
                      <th className="px-4 pb-3 font-semibold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs text-ink-soft">
                    {securityLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-rose-50/20 transition-colors">
                        <td className="px-4 py-3.5 text-ink-soft/50 font-mono">
                          {new Date(log.timestamp).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                          })}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-rose-600 font-mono">
                          {log.usernameAttempted}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            {log.type}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-ink-soft leading-relaxed max-w-md">
                          {log.details}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => {
                              if (!isApprovedUser) {
                                alert("Verification Required: Unverified teachers cannot delete log entries.");
                                return;
                              }
                              deleteSecurityLog(log.id);
                              loadDatabase();
                            }}
                            disabled={!isApprovedUser}
                            className="p-1.5 text-ink-soft/50 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label="Delete log entry"
                            title={!isApprovedUser ? "Verification Required" : "Delete Log Entry"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* TAB 5: FACULTY BOARD */}
        {activeTab === "faculty" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-ink-soft/10 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in"
            id="faculty-board-container"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-ink-soft/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                  <Globe className="h-5 w-5 text-violet-500" />
                  Teachers
                </h3>
                <p className="text-xs text-ink-soft/70 mt-1">
                  Approve new teacher accounts and manage existing ones.
                </p>
              </div>
            </div>

            {/* Mobile: stacked cards */}
            <div className="sm:hidden divide-y divide-gray-50">
              {faculty.map((member) => (
                <div key={member.id} className="py-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink text-sm truncate flex items-center gap-1.5 flex-wrap">
                        {member.name}
                        {member.id.toLowerCase() === dbUser.id.toLowerCase() && (
                          <span className="text-[9px] font-black bg-violet-50 text-violet-500 border border-violet-100 rounded px-1.5 py-0.5">You</span>
                        )}
                      </p>
                      <p className="font-mono text-xs text-violet-500 font-bold">{member.id}</p>
                    </div>
                    {(member.isApproved === true || member.id.toLowerCase() === "teacher1") ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-600 border border-teal-100 shrink-0">
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 animate-pulse shrink-0">
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-soft/70 space-y-1">
                    <p>
                      {member.subject ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-ink">
                          <BookOpen className="h-3 w-3 text-violet-500" /> {member.subject}
                        </span>
                      ) : (
                        <span className="text-ink-soft/50 italic">No subject configured</span>
                      )}
                    </p>
                    <p className="text-ink-soft/50">Registered {member.createdAt || "N/A"}</p>
                  </div>
                  {!(member.isApproved === true || member.id.toLowerCase() === "teacher1") && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleApproveFaculty(member.id)}
                        disabled={!isApprovedUser}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 border border-teal-100 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <UserCheck className="h-3.5 w-3.5" /> Verify
                      </button>
                      <button
                        onClick={() => handleDeleteFaculty(member.id)}
                        disabled={!isApprovedUser || member.id.toLowerCase() === dbUser.id.toLowerCase()}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop/tablet: table */}
            <div className="hidden sm:block overflow-x-auto scroll-shadow-x">
              <table className="w-full text-left border-collapse" id="faculty-table">
                <thead>
                  <tr className="border-b border-ink-soft/10 text-[10px] text-ink-soft/50 font-extrabold uppercase tracking-wider">
                    <th className="px-4 pb-3 font-semibold">Teacher ID (Username)</th>
                    <th className="px-4 pb-3 font-semibold">Full Name</th>
                    <th className="px-4 pb-3 font-semibold">Active Subject Class</th>
                    <th className="px-4 pb-3 font-semibold">Registration Date</th>
                    <th className="px-4 pb-3 font-semibold">Verification Status</th>
                    <th className="px-4 pb-3 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs text-ink-soft">
                  {faculty.map((member) => (
                    <tr key={member.id} className="hover:bg-cream-dim/60/50 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-violet-500">
                        {member.id}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-ink">
                        {member.name} {member.id.toLowerCase() === dbUser.id.toLowerCase() && <span className="text-[9px] font-black bg-violet-50 text-violet-500 border border-violet-100 rounded px-1.5 py-0.5 ml-1">You</span>}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-ink-soft">
                        {member.subject ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink">
                            <BookOpen className="h-3 w-3 text-violet-500" /> {member.subject}
                          </span>
                        ) : (
                          <span className="text-ink-soft/50 italic">None Configured</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-ink-soft/50 font-mono">
                        {member.createdAt || "N/A"}
                      </td>
                      <td className="px-4 py-3.5">
                        {(member.isApproved === true || member.id.toLowerCase() === "teacher1") ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-600 border border-teal-100">
                            Verified Teacher
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 animate-pulse">
                            Pending Verification
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Approve/Verify Button */}
                          {!(member.isApproved === true || member.id.toLowerCase() === "teacher1") && (
                            <button
                              onClick={() => handleApproveFaculty(member.id)}
                              disabled={!isApprovedUser}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 border border-teal-100 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              title={isApprovedUser ? "Verify this teacher account" : "You must be a verified teacher to approve accounts"}
                            >
                              <UserCheck className="h-3 w-3" /> Verify
                            </button>
                          )}

                          {/* Delete/Remove Button - ONLY shown for unverified pending profiles to protect registered faculty */}
                          {!(member.isApproved === true || member.id.toLowerCase() === "teacher1") && (
                            <button
                              onClick={() => handleDeleteFaculty(member.id)}
                              disabled={!isApprovedUser || member.id.toLowerCase() === dbUser.id.toLowerCase()}
                              className="p-1.5 text-ink-soft/50 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title={
                                !isApprovedUser 
                                  ? "You must be a verified teacher to delete accounts" 
                                  : member.id.toLowerCase() === dbUser.id.toLowerCase() 
                                  ? "You cannot delete yourself" 
                                  : "Remove this pending teacher account"
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
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
              <div className="bg-violet-500 px-6 py-4 text-white flex items-center justify-between shrink-0">
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
                  className="text-violet-100 hover:text-white cursor-pointer"
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
                      className="w-full px-3 py-2 text-xs border border-ink-soft/15 rounded-xl focus:outline-none focus:border-violet-400 text-ink"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSavingName}
                    className="px-4 py-2 text-xs font-bold text-white bg-violet-500 hover:bg-violet-600 rounded-xl cursor-pointer disabled:opacity-60"
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
                            ? "border-violet-400 bg-violet-50 text-violet-600"
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
                          className="w-full px-3 py-2 text-xs border border-ink-soft/15 rounded-xl focus:outline-none focus:border-violet-400 text-ink"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-ink-soft" htmlFor="new-password">New Password</label>
                        <input
                          id="new-password"
                          type="password"
                          value={newPasswordInput}
                          onChange={(e) => setNewPasswordInput(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-ink-soft/15 rounded-xl focus:outline-none focus:border-violet-400 text-ink"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isChangingPassword}
                        className="w-full px-4 py-2 text-xs font-bold text-white bg-violet-500 hover:bg-violet-600 rounded-xl cursor-pointer disabled:opacity-60"
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
                        Permanently deletes your account, login, and all associated data. This cannot be undone.
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

      {/* MODAL 2: ADD MANUAL LOG / OVERRIDE */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-ink-soft/10 max-w-md w-full overflow-hidden"
              id="manual-log-modal"
            >
              <div className="bg-violet-500 px-6 py-4 text-white">
                <h3 className="font-extrabold text-lg flex items-center gap-1.5">
                  <UserCheck className="h-5 w-5" /> Add Manual Log
                </h3>
                <p className="text-xs text-violet-100 mt-1">
                  Record attendance for any student for the selected date: <span className="font-bold">{selectedDate}</span>
                </p>
              </div>

              <form onSubmit={handleSaveAttendanceOverride} className="p-6 space-y-4" id="manual-log-form">
                {logError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{logError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-soft" htmlFor="log-student">Select Student Profile *</label>
                  <select
                    id="log-student"
                    value={logStudentId}
                    onChange={(e) => setLogStudentId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-ink-soft/15 rounded-xl focus:outline-none focus:border-violet-400 text-ink bg-white"
                  >
                    <option value="">-- Choose student --</option>
                    {enrolledStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-soft">Status *</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setLogStatus("Present")}
                      className={`py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        logStatus === "Present"
                          ? "border-teal-500 bg-teal-50 text-teal-600"
                          : "border-ink-soft/15 bg-white text-ink-soft/70 hover:bg-cream-dim/60"
                      }`}
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogStatus("Late")}
                      className={`py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        logStatus === "Late"
                          ? "border-amber-500 bg-amber-50 text-amber-700"
                          : "border-ink-soft/15 bg-white text-ink-soft/70 hover:bg-cream-dim/60"
                      }`}
                    >
                      Late
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogStatus("Absent")}
                      className={`py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        logStatus === "Absent"
                          ? "border-rose-500 bg-rose-50 text-rose-700"
                          : "border-ink-soft/15 bg-white text-ink-soft/70 hover:bg-cream-dim/60"
                      }`}
                    >
                      Absent
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-soft" htmlFor="log-notes">Admin Notes / Remarks</label>
                  <input
                    id="log-notes"
                    type="text"
                    placeholder="e.g. Medical excuse sheet submitted, late bus check"
                    value={logNotes}
                    onChange={(e) => setLogNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-ink-soft/15 rounded-xl focus:outline-none focus:border-violet-400 text-ink"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowLogModal(false)}
                    className="px-4 py-2 text-xs font-bold text-ink-soft/70 hover:text-ink-soft cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-violet-500 hover:bg-violet-600 rounded-xl cursor-pointer"
                  >
                    Record Log
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL: EDIT STUDENT INFO */}
        {studentToEdit && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-ink-soft/10 max-w-md w-full overflow-hidden"
              id="edit-student-modal"
            >
              <div className="bg-violet-500 px-6 py-4 text-white">
                <h3 className="font-extrabold text-lg flex items-center gap-1.5">
                  <Edit className="h-5 w-5" /> Edit Student Info
                </h3>
                <p className="text-xs text-violet-100 mt-1 font-mono">{studentToEdit.id}</p>
              </div>

              <form onSubmit={handleSaveStudentEdit} className="p-6 space-y-4">
                {editStudentError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{editStudentError}</span>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-soft" htmlFor="edit-student-name">Full Name</label>
                  <input
                    id="edit-student-name"
                    type="text"
                    value={editStudentName}
                    onChange={(e) => setEditStudentName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-ink-soft/15 rounded-xl focus:outline-none focus:border-violet-400 text-ink"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-soft" htmlFor="edit-student-email">Email</label>
                  <input
                    id="edit-student-email"
                    type="email"
                    value={editStudentEmail}
                    onChange={(e) => setEditStudentEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-ink-soft/15 rounded-xl focus:outline-none focus:border-violet-400 text-ink"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-soft" htmlFor="edit-student-location">Location</label>
                  <input
                    id="edit-student-location"
                    type="text"
                    value={editStudentLocation}
                    onChange={(e) => setEditStudentLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-ink-soft/15 rounded-xl focus:outline-none focus:border-violet-400 text-ink"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setStudentToEdit(null)}
                    className="px-4 py-2 text-xs font-bold text-ink-soft/70 hover:text-ink-soft cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingStudent}
                    className="px-4 py-2 text-xs font-bold text-white bg-violet-500 hover:bg-violet-600 rounded-xl cursor-pointer disabled:opacity-60"
                  >
                    {isSavingStudent ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL 3: CUSTOM REMOVAL CONFIRMATION */}
        {studentToDelete && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-ink-soft/10 max-w-sm w-full overflow-hidden"
              id="delete-student-modal"
            >
              <div className="bg-amber-600 px-6 py-4 text-white">
                <h3 className="font-extrabold text-lg flex items-center gap-1.5">
                  <UserMinus className="h-5 w-5" /> Remove Student from Class?
                </h3>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 text-xs rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
                  <div className="space-y-1">
                    <p className="font-bold">This student will lose access to class check-ins.</p>
                    <p className="leading-relaxed">
                      This will remove <strong>{studentToDelete.name} ({studentToDelete.id})</strong> from the class roster <strong>{activeClass?.name || "this class"}</strong>. If this is a mistake, they can rejoin with the class join code.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStudentToDelete(null)}
                    className="px-4 py-2 text-xs font-bold text-ink-soft/70 hover:text-ink-soft bg-cream-dim/60 hover:bg-cream-dim border border-ink-soft/15 rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={executeRemoveStudent}
                    className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md shadow-amber-100 cursor-pointer transition-all"
                    id="confirm-delete-student-btn"
                  >
                    Remove Student
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
