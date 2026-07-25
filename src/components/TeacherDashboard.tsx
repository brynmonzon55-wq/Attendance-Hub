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
  ShieldAlert,
  Settings as SettingsIcon,
  Clock,
  Eye,
  X,
  Megaphone,
  FileText,
  Paperclip,
  Send,
  Award,
  Upload,
  Moon,
  Sun,
  Zap,
  MessageSquare
} from "lucide-react";
import {
  User,
  AttendanceRecord,
  AttendanceStatus,
  StudentStats,
  SecurityLog,
  ClassPost,
  PostComment,
  AssignmentSubmission
} from "../types";
import type { AppTheme } from "../App";
import StudentProfile from "./StudentProfile";
import AnimatedThemeBackground from "./AnimatedThemeBackground";
import SettingsTab from "./SettingsTab";
import UserAvatar from "./UserAvatar";
import {
  getUsers,
  saveUser,
  deleteUser,
  getAttendanceRecords,
  saveAttendanceRecord,
  deleteAttendanceRecord,
  calculateStudentStats,
  formatDate,
  formatTime,
  getSecurityLogs,
  deleteSecurityLog,
  getAnnouncements,
  getAssignments,
  createPost,
  deletePost,
  getCommentsForPost,
  addComment,
  getSubmissionsForPost,
  gradeSubmission,
  createUserByAdmin,
  updateUserApprovalStatus,
  changeOwnPassword,
} from "../lib/db";

interface TeacherDashboardProps {
  user: User;
  onLogout: () => void;
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

export default function TeacherDashboard({ user, onLogout, theme, onThemeChange }: TeacherDashboardProps) {
  // DB States
  const [students, setStudents] = useState<User[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [dbUser, setDbUser] = useState<User>(user);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);

  // Tab State
  const [activeTab, setActiveTab] = useState<"roster" | "attendance" | "announcements" | "assignments" | "reports" | "settings">("roster");
  const [viewingStudent, setViewingStudent] = useState<User | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");

  // Attendance Sheet State
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [statusFilter, setStatusFilter] = useState<"All" | "Present" | "Late" | "Absent">("All");

  // Edit / Add Student Modal State
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentId, setNewStudentId] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentPassword, setNewStudentPassword] = useState("");
  const [addStudentError, setAddStudentError] = useState<string | null>(null);

  const [studentToEdit, setStudentToEdit] = useState<User | null>(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentEmail, setEditStudentEmail] = useState("");
  const [editStudentLocation, setEditStudentLocation] = useState("");

  const [studentToDelete, setStudentToDelete] = useState<{ id: string; name: string } | null>(null);

  // Announcements Form State
  const [announcements, setAnnouncements] = useState<ClassPost[]>([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annSubject, setAnnSubject] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annAttachmentName, setAnnAttachmentName] = useState("");
  const [annAttachmentDataUrl, setAnnAttachmentDataUrl] = useState("");
  const [showCreateAnnModal, setShowCreateAnnModal] = useState(false);
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, PostComment[]>>({});
  const [newCommentInput, setNewCommentInput] = useState("");

  // Assignments & Grading State
  const [assignments, setAssignments] = useState<ClassPost[]>([]);
  const [assTitle, setAssTitle] = useState("");
  const [assSubject, setAssSubject] = useState("");
  const [assContent, setAssContent] = useState("");
  const [assDueDate, setAssDueDate] = useState("");
  const [assMaxPoints, setAssMaxPoints] = useState(100);
  const [assAttachmentName, setAssAttachmentName] = useState("");
  const [assAttachmentDataUrl, setAssAttachmentDataUrl] = useState("");
  const [showCreateAssModal, setShowCreateAssModal] = useState(false);

  // Grading Modal State
  const [selectedAssignmentForGrading, setSelectedAssignmentForGrading] = useState<ClassPost | null>(null);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<AssignmentSubmission[]>([]);
  const [gradingSubmission, setGradingSubmission] = useState<AssignmentSubmission | null>(null);
  const [gradeInputScore, setGradeInputScore] = useState<string | number>("");
  const [gradeInputFeedback, setGradeInputFeedback] = useState("");

  const loadDatabase = () => {
    const allUsers = getUsers();
    const freshUser = allUsers.find((u) => u.id.toLowerCase() === user.id.toLowerCase());
    if (freshUser) setDbUser(freshUser);

    const studentList = allUsers.filter((u) => u.role === "student");
    setStudents(studentList);

    const records = getAttendanceRecords();
    setAttendanceRecords(records);

    const logs = getSecurityLogs();
    setSecurityLogs(logs);

    setAnnouncements(getAnnouncements());
    setAssignments(getAssignments());
  };

  useEffect(() => {
    loadDatabase();
    const handleDbUpdate = () => loadDatabase();
    window.addEventListener("db_updated", handleDbUpdate);
    return () => window.removeEventListener("db_updated", handleDbUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  // Handle Approve / Verify student
  const handleToggleApproval = async (student: User) => {
    await updateUserApprovalStatus(student.id, !student.isApproved);
    loadDatabase();
  };

  // Add new student account
  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddStudentError(null);
    if (!newStudentId.trim() || !newStudentName.trim() || !newStudentPassword.trim()) {
      setAddStudentError("Please complete all fields.");
      return;
    }
    try {
      await createUserByAdmin(newStudentId, newStudentName, newStudentPassword, "student");
      setNewStudentId("");
      setNewStudentName("");
      setNewStudentPassword("");
      setShowAddStudentModal(false);
      loadDatabase();
    } catch (err: any) {
      setAddStudentError("Error creating account. ID may already exist.");
    }
  };

  // Edit Student
  const handleSaveStudentEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToEdit) return;
    saveUser({
      ...studentToEdit,
      name: editStudentName.trim(),
      email: editStudentEmail.trim() || undefined,
      location: editStudentLocation.trim() || undefined,
    });
    setStudentToEdit(null);
    loadDatabase();
  };

  // Delete Student
  const handleConfirmDeleteStudent = () => {
    if (!studentToDelete) return;
    deleteUser(studentToDelete.id);
    setStudentToDelete(null);
    loadDatabase();
  };

  // Log attendance for a student on selected date
  const handleSetStudentAttendance = (student: User, status: AttendanceStatus) => {
    const existing = attendanceRecords.find(
      (r) => r.studentId.toLowerCase() === student.id.toLowerCase() && r.date === selectedDate
    );

    const record: AttendanceRecord = {
      id: existing?.id || `rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      studentId: student.id,
      studentName: student.name,
      date: selectedDate,
      time: formatTime(new Date()),
      status,
    };

    saveAttendanceRecord(record);
    loadDatabase();
  };

  const handleAnnFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("File size exceeds 3MB limit.");
      return;
    }
    setAnnAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => setAnnAttachmentDataUrl(evt.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAssFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("File size exceeds 3MB limit.");
      return;
    }
    setAssAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => setAssAttachmentDataUrl(evt.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Post Announcement
  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annContent.trim()) return;

    createPost({
      type: "announcement",
      authorId: user.id,
      authorName: dbUser.name,
      title: annTitle.trim() || "Announcement",
      subject: annSubject.trim() || "General",
      content: annContent.trim(),
      attachmentName: annAttachmentName || undefined,
      attachmentDataUrl: annAttachmentDataUrl || undefined,
    });

    setAnnTitle("");
    setAnnSubject("");
    setAnnContent("");
    setAnnAttachmentName("");
    setAnnAttachmentDataUrl("");
    setShowCreateAnnModal(false);
    loadDatabase();
  };

  // Post Assignment
  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assTitle.trim() || !assContent.trim()) return;

    createPost({
      type: "assignment",
      authorId: user.id,
      authorName: dbUser.name,
      title: assTitle.trim(),
      subject: assSubject.trim() || "General",
      content: assContent.trim(),
      dueDate: assDueDate || formatDate(new Date(Date.now() + 86400000 * 7)),
      maxPoints: Number(assMaxPoints) || 100,
      attachmentName: assAttachmentName || undefined,
      attachmentDataUrl: assAttachmentDataUrl || undefined,
    });

    setAssTitle("");
    setAssSubject("");
    setAssContent("");
    setAssDueDate("");
    setAssMaxPoints(100);
    setAssAttachmentName("");
    setAssAttachmentDataUrl("");
    setShowCreateAssModal(false);
    loadDatabase();
  };

  // Open Submissions List for an Assignment
  const handleOpenGradingModal = (assignment: ClassPost) => {
    setSelectedAssignmentForGrading(assignment);
    const subs = getSubmissionsForPost(assignment.id);
    setAssignmentSubmissions(subs);
  };

  // Open Grade Submission Modal
  const handleStartGrade = (sub: AssignmentSubmission) => {
    setGradingSubmission(sub);
    setGradeInputScore(sub.score || "");
    setGradeInputFeedback(sub.feedback || "");
  };

  // Save Grade
  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;

    gradeSubmission(gradingSubmission.id, gradeInputScore, gradeInputFeedback);
    setGradingSubmission(null);
    if (selectedAssignmentForGrading) {
      setAssignmentSubmissions(getSubmissionsForPost(selectedAssignmentForGrading.id));
    }
    loadDatabase();
  };

  // Attachment upload handler
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setName: (n: string) => void,
    setUrl: (u: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("File exceeds 3MB limit.");
      return;
    }
    setName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => setUrl(evt.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Toggle comments
  const handleToggleComments = (postId: string) => {
    if (expandedCommentsPostId === postId) {
      setExpandedCommentsPostId(null);
    } else {
      setExpandedCommentsPostId(postId);
      setCommentsMap((prev) => ({ ...prev, [postId]: getCommentsForPost(postId) }));
    }
  };

  // Post comment
  const handleAddComment = (postId: string) => {
    if (!newCommentInput.trim()) return;
    addComment({
      postId,
      authorId: user.id,
      authorName: dbUser.name,
      content: newCommentInput.trim(),
    });
    setNewCommentInput("");
    setCommentsMap((prev) => ({ ...prev, [postId]: getCommentsForPost(postId) }));
  };

  // Filtered Students
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative min-h-screen pb-16 pt-4 sm:pt-6 px-2.5 sm:px-6 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      <AnimatedThemeBackground theme={theme} />

      <div className="relative z-10 space-y-4 sm:space-y-6 w-full min-w-0">
        {/* Header Bar */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-cream rounded-3xl border border-ink-soft/10 p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 min-w-0 overflow-hidden"
        >
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar name={dbUser.name} avatarUrl={dbUser.avatarUrl} role="teacher" size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold bg-violet-50 text-violet-600 rounded-full border border-violet-200 shrink-0">
                  Teacher Portal
                </span>
                <span className="text-xs font-mono text-ink-soft/70 truncate">ID: {user.id}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight mt-0.5 truncate">
                Welcome, {dbUser.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            {/* Theme Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onThemeChange(theme === "dark" ? "default" : "dark")}
              className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                theme === "dark"
                  ? "bg-black/80 text-fuchsia-300 border-fuchsia-500/50 hover:bg-slate-900 shadow-[0_0_15px_rgba(217,70,239,0.3)]"
                  : "bg-slate-900/90 text-cyan-300 border-cyan-500/50 hover:bg-slate-800 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              }`}
              title="Switch Theme Mode"
            >
              {theme === "dark" ? (
                <>
                  <Moon className="h-4 w-4 shrink-0 text-fuchsia-400 drop-shadow-[0_0_6px_rgba(217,70,239,0.8)]" />
                  <span className="hidden sm:inline font-mono">Obsidian Neon</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 shrink-0 text-cyan-400 drop-shadow-[0_0_6px_rgba(0,240,255,0.8)]" />
                  <span className="hidden sm:inline font-mono">Cyber Neon</span>
                </>
              )}
            </motion.button>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs font-bold text-coral-600 bg-coral-50 border border-coral-200 rounded-xl hover:bg-coral-100 transition-all cursor-pointer shadow-sm shrink-0"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </motion.div>

        {/* Navigation Tabs - Responsive Grid on Mobile, Flex Row on Desktop */}
        <div className="bg-cream/80 backdrop-blur-xl p-1.5 rounded-2xl border border-ink-soft/10 shadow-lg grid grid-cols-2 sm:grid-cols-3 md:flex md:items-center md:justify-start gap-1.5 max-w-full">
          {[
            { id: "roster", label: "Student Roster", icon: Users },
            { id: "attendance", label: "Attendance Sheet", icon: Calendar },
            { id: "announcements", label: "Announcements", icon: Megaphone, count: announcements.length },
            { id: "assignments", label: "Assignments & Grading", icon: FileText, count: assignments.length },
            { id: "reports", label: "Reports & Logs", icon: FileSpreadsheet },
            { id: "settings", label: "Settings", icon: SettingsIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex items-center justify-center md:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer w-full md:w-auto ${
                  isActive ? "text-violet-600" : "text-ink-soft hover:text-ink"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="teacherActiveTabPill"
                    className="absolute inset-0 bg-violet-500/15 border border-violet-500/30 rounded-xl"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="h-4 w-4 relative z-10 shrink-0" />
                <span className="relative z-10 truncate">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="relative z-10 px-1.5 py-0.2 text-[10px] font-extrabold bg-violet-500 text-white rounded-full shrink-0">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: STUDENT ROSTER */}
        {activeTab === "roster" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 sm:space-y-6 min-w-0"
          >
            <div className="bg-slate-900/80 border border-slate-700/60 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4 min-w-0 overflow-hidden backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0 bg-slate-950/80 px-3.5 py-2.5 rounded-2xl border border-slate-700/60 focus-within:border-fuchsia-400 focus-within:shadow-[0_0_15px_rgba(217,70,239,0.3)] transition-all">
                  <Search className="h-5 w-5 text-fuchsia-400 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search students by name or ID..."
                    className="w-full text-xs font-semibold bg-transparent border-0 focus:bg-transparent focus:outline-none focus:ring-0 text-white placeholder-slate-400"
                  />
                </div>

                <button
                  onClick={() => setShowAddStudentModal(true)}
                  className="px-4 py-2.5 text-xs font-extrabold text-white bg-fuchsia-500 hover:bg-fuchsia-400 rounded-xl cursor-pointer shadow-md shadow-fuchsia-500/20 flex items-center justify-center gap-2 shrink-0 transition-all"
                >
                  <UserPlus className="h-4 w-4" /> <span>Add Student</span>
                </button>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="p-8 sm:p-12 text-center text-slate-400 space-y-2">
                  <Users className="h-10 w-10 mx-auto text-slate-500" />
                  <p className="text-sm font-bold text-white">No students registered.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0">
                  {filteredStudents.map((st, idx) => {
                    const stStats = calculateStudentStats(st.id);
                    return (
                      <motion.div
                        key={st.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="bg-slate-950/70 border border-slate-700/60 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between space-y-3 min-w-0 hover:border-fuchsia-500/40 transition-all"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono font-bold text-slate-400 truncate">
                              ID: {st.id}
                            </span>
                            <button
                              onClick={() => handleToggleApproval(st)}
                              className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full border cursor-pointer shrink-0 ${
                                st.isApproved
                                  ? "bg-teal-500/20 text-teal-300 border-teal-500/40"
                                  : "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                              }`}
                            >
                              {st.isApproved ? "Verified" : "Approve Pending"}
                            </button>
                          </div>
                          <h3 className="text-base font-black text-ink mt-1 truncate">{st.name}</h3>
                        </div>

                        <div className="p-2.5 bg-cream rounded-xl text-xs flex justify-between font-mono gap-1">
                          <span>Punctuality: <strong>{stStats.percentage}%</strong></span>
                          <span>Attended: <strong>{stStats.presentCount}</strong></span>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1 border-t border-ink-soft/10">
                          <button
                            onClick={() => setViewingStudent(st)}
                            className="flex-1 py-1.5 text-xs font-bold text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" /> Profile
                          </button>
                          <button
                            onClick={() => {
                              setStudentToEdit(st);
                              setEditStudentName(st.name);
                              setEditStudentEmail(st.email || "");
                              setEditStudentLocation(st.location || "");
                            }}
                            className="p-1.5 text-ink-soft hover:text-ink bg-white rounded-lg border border-ink-soft/15 cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setStudentToDelete({ id: st.id, name: st.name })}
                            className="p-1.5 text-coral-600 hover:text-coral-700 bg-coral-50 rounded-lg border border-coral-200 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 2: DAILY ATTENDANCE SHEET */}
        {activeTab === "attendance" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 sm:space-y-6 min-w-0"
          >
            <div className="bg-slate-900/80 border border-slate-700/60 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4 sm:space-y-5 min-w-0 overflow-hidden backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-700/60 pb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-fuchsia-400 shrink-0" />
                  <h2 className="text-base sm:text-lg font-black text-white">Daily Attendance Sheet</h2>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <label className="text-xs font-bold text-slate-300">Date:</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 text-xs font-mono font-bold bg-slate-950/80 border border-slate-700/60 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="overflow-x-auto min-w-0">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/60 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="pb-3 px-3 whitespace-nowrap">Student</th>
                      <th className="pb-3 px-3 whitespace-nowrap">ID</th>
                      <th className="pb-3 px-3 whitespace-nowrap">Recorded Status</th>
                      <th className="pb-3 px-3 text-right whitespace-nowrap">Quick Mark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {students.map((st) => {
                      const log = attendanceRecords.find(
                        (r) => r.studentId.toLowerCase() === st.id.toLowerCase() && r.date === selectedDate
                      );

                      return (
                        <tr key={st.id} className="hover:bg-fuchsia-500/5 transition-colors">
                          <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <UserAvatar name={st.name} avatarUrl={st.avatarUrl} role="student" size="sm" />
                              <span>{st.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">{st.id}</td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {log ? (
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold whitespace-nowrap ${
                                  log.status === "Present"
                                    ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-[0_0_10px_rgba(20,184,166,0.2)]"
                                    : log.status === "Late"
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                                    : "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                                }`}
                              >
                                {log.status}
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">Not logged</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex gap-1">
                              <button
                                onClick={() => handleSetStudentAttendance(st, "Present")}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border cursor-pointer ${
                                  log?.status === "Present"
                                    ? "bg-teal-500 text-white border-teal-600"
                                    : "bg-white text-teal-700 border-teal-200 hover:bg-teal-50"
                                }`}
                              >
                                Present
                              </button>
                              <button
                                onClick={() => handleSetStudentAttendance(st, "Late")}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border cursor-pointer ${
                                  log?.status === "Late"
                                    ? "bg-amber-500 text-white border-amber-600"
                                    : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50"
                                }`}
                              >
                                Late
                              </button>
                              <button
                                onClick={() => handleSetStudentAttendance(st, "Absent")}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border cursor-pointer ${
                                  log?.status === "Absent"
                                    ? "bg-coral-500 text-white border-coral-600"
                                    : "bg-white text-coral-700 border-coral-200 hover:bg-coral-50"
                                }`}
                              >
                                Absent
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: ANNOUNCEMENTS */}
        {activeTab === "announcements" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black text-ink flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-violet-500" />
                Course Announcements
              </h2>
              <button
                onClick={() => setShowCreateAnnModal(true)}
                className="px-4 py-2 text-xs font-extrabold text-white bg-violet-500 hover:bg-violet-600 rounded-xl cursor-pointer shadow-md shadow-violet-500/20 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Post Announcement
              </button>
            </div>

            {announcements.length === 0 ? (
              <div className="bg-cream border border-ink-soft/10 rounded-3xl p-12 text-center text-ink-soft/60 space-y-2">
                <Megaphone className="h-10 w-10 mx-auto text-ink-soft/30" />
                <p className="text-sm font-bold text-ink">No announcements posted yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((post) => (
                  <div
                    key={post.id}
                    className="bg-cream border border-ink-soft/10 rounded-3xl p-6 shadow-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-violet-50 text-violet-700 rounded-full border border-violet-200">
                          {post.subject || "General"}
                        </span>
                        <h3 className="text-base font-black text-ink">{post.title}</h3>
                      </div>
                      <button
                        onClick={() => {
                          deletePost(post.id);
                          loadDatabase();
                        }}
                        className="p-1.5 text-coral-600 hover:bg-coral-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="text-xs text-ink/90 font-sans leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </p>

                    {post.attachmentDataUrl && (
                      <div className="p-3 bg-white/60 border border-ink-soft/10 rounded-xl flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-1.5">
                          <Paperclip className="h-4 w-4 text-violet-500" />
                          {post.attachmentName || "Attachment"}
                        </span>
                        <a
                          href={post.attachmentDataUrl}
                          download={post.attachmentName || "attachment"}
                          className="px-3 py-1 text-xs font-extrabold text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100"
                        >
                          Download
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 4: ASSIGNMENTS & GRADING */}
        {activeTab === "assignments" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black text-ink flex items-center gap-2">
                <FileText className="h-5 w-5 text-violet-500" />
                Assignments & Student Submissions
              </h2>
              <button
                onClick={() => setShowCreateAssModal(true)}
                className="px-4 py-2 text-xs font-extrabold text-white bg-violet-500 hover:bg-violet-600 rounded-xl cursor-pointer shadow-md shadow-violet-500/20 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Create Assignment
              </button>
            </div>

            {assignments.length === 0 ? (
              <div className="bg-cream border border-ink-soft/10 rounded-3xl p-12 text-center text-ink-soft/60 space-y-2">
                <FileText className="h-10 w-10 mx-auto text-ink-soft/30" />
                <p className="text-sm font-bold text-ink">No assignments created yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {assignments.map((assignment) => {
                  const subs = getSubmissionsForPost(assignment.id);
                  const gradedCount = subs.filter((s) => s.status === "Graded").length;

                  return (
                    <div
                      key={assignment.id}
                      className="bg-cream border border-ink-soft/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-violet-50 text-violet-700 rounded-full border border-violet-200">
                            Due: {assignment.dueDate || "N/A"}
                          </span>
                          <span className="text-xs font-mono font-bold text-ink-soft">
                            Max Points: {assignment.maxPoints || 100}
                          </span>
                        </div>

                        <h3 className="text-base font-black text-ink">{assignment.title}</h3>
                        <p className="text-xs text-ink/80 font-sans line-clamp-3">
                          {assignment.content}
                        </p>
                      </div>

                      <div className="p-3 bg-white/60 border border-ink-soft/10 rounded-2xl flex items-center justify-between text-xs font-bold">
                        <span>
                          Submissions: <strong>{subs.length}</strong> ({gradedCount} graded)
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenGradingModal(assignment)}
                            className="px-3 py-1.5 text-xs font-extrabold text-violet-600 bg-violet-50 border border-violet-200 rounded-xl hover:bg-violet-100 cursor-pointer"
                          >
                            Review & Grade
                          </button>
                          <button
                            onClick={() => {
                              deletePost(assignment.id);
                              loadDatabase();
                            }}
                            className="p-1.5 text-coral-600 hover:bg-coral-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 5: REPORTS & SECURITY LOGS */}
        {activeTab === "reports" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-slate-900/80 border border-slate-700/60 rounded-3xl p-6 shadow-xl space-y-4 backdrop-blur-xl">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-fuchsia-400" />
                Security & Audit Event Logs
              </h2>

              {securityLogs.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No security alerts logged.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-700/60 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                        <th className="pb-3 px-3 whitespace-nowrap">Time</th>
                        <th className="pb-3 px-3 whitespace-nowrap">Event Type</th>
                        <th className="pb-3 px-3 whitespace-nowrap">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60">
                      {securityLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-fuchsia-500/5 transition-colors">
                          <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">{log.timestamp}</td>
                          <td className="py-3 px-3 font-bold text-fuchsia-400 whitespace-nowrap">{log.type}</td>
                          <td className="py-3 px-3 text-slate-200">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 6: SETTINGS */}
        {activeTab === "settings" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <SettingsTab
              currentUser={dbUser}
              onLogout={onLogout}
              theme={theme}
              onThemeChange={onThemeChange}
              onProfileUpdated={loadDatabase}
            />
          </motion.div>
        )}

        {/* CREATE ANNOUNCEMENT MODAL */}
        <AnimatePresence>
          {showCreateAnnModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <div className="bg-cream border border-ink-soft/15 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
                <div className="flex justify-between items-center border-b border-ink-soft/10 pb-3">
                  <h3 className="font-black text-base text-ink">New Course Announcement</h3>
                  <button onClick={() => setShowCreateAnnModal(false)}>
                    <X className="h-5 w-5 text-ink-soft" />
                  </button>
                </div>

                <form onSubmit={handleCreateAnnouncement} className="space-y-3">
                  <input
                    type="text"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="Announcement Title..."
                    required
                    className="w-full p-3 text-xs bg-white/70 border border-ink-soft/15 rounded-xl text-ink"
                  />
                  <input
                    type="text"
                    value={annSubject}
                    onChange={(e) => setAnnSubject(e.target.value)}
                    placeholder="Subject Category (e.g. Computer Science)..."
                    className="w-full p-3 text-xs bg-white/70 border border-ink-soft/15 rounded-xl text-ink"
                  />
                  <textarea
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    placeholder="Announcement details..."
                    rows={4}
                    required
                    className="w-full p-3 text-xs bg-white/70 border border-ink-soft/15 rounded-xl text-ink resize-none"
                  />

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateAnnModal(false)}
                      className="px-4 py-2 text-xs font-bold text-ink-soft bg-white border border-ink-soft/15 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-extrabold text-white bg-violet-500 rounded-xl hover:bg-violet-600"
                    >
                      Publish Announcement
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CREATE ASSIGNMENT MODAL */}
        <AnimatePresence>
          {showCreateAssModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <div className="bg-cream border border-ink-soft/15 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
                <div className="flex justify-between items-center border-b border-ink-soft/10 pb-3">
                  <h3 className="font-black text-base text-ink">New Assignment</h3>
                  <button onClick={() => setShowCreateAssModal(false)}>
                    <X className="h-5 w-5 text-ink-soft" />
                  </button>
                </div>

                <form onSubmit={handleCreateAssignment} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-ink-soft block mb-1">Assignment Title</label>
                    <input
                      type="text"
                      value={assTitle}
                      onChange={(e) => setAssTitle(e.target.value)}
                      placeholder="e.g. Chapter 4 Calculus Homework"
                      required
                      className="w-full p-3 text-xs font-semibold bg-white/80 border border-ink-soft/15 rounded-xl text-ink"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-ink-soft block mb-1">Subject Tag</label>
                      <input
                        type="text"
                        value={assSubject}
                        onChange={(e) => setAssSubject(e.target.value)}
                        placeholder="e.g. Mathematics"
                        className="w-full p-2.5 text-xs bg-white/80 border border-ink-soft/15 rounded-xl text-ink"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-ink-soft block mb-1">Due Date</label>
                      <input
                        type="date"
                        value={assDueDate}
                        onChange={(e) => setAssDueDate(e.target.value)}
                        className="w-full p-2.5 text-xs bg-white/80 border border-ink-soft/15 rounded-xl text-ink font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-ink-soft block mb-1">Max Points</label>
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={assMaxPoints}
                        onChange={(e) => setAssMaxPoints(Number(e.target.value))}
                        className="w-full p-2.5 text-xs bg-white/80 border border-ink-soft/15 rounded-xl text-ink font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-ink-soft block mb-1">Instructions & Guidelines</label>
                    <textarea
                      value={assContent}
                      onChange={(e) => setAssContent(e.target.value)}
                      placeholder="Detailed instructions for students..."
                      rows={4}
                      required
                      className="w-full p-3 text-xs bg-white/80 border border-ink-soft/15 rounded-xl text-ink resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-ink-soft block">Attach File / Reference Document (Optional)</label>
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-2 text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded-xl hover:bg-violet-100 cursor-pointer flex items-center gap-1.5 transition-all">
                        <Paperclip className="h-4 w-4" />
                        <span>{assAttachmentName ? "Change File" : "Choose File"}</span>
                        <input type="file" onChange={handleAssFileChange} className="hidden" />
                      </label>
                      {assAttachmentName && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                          <Paperclip className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate max-w-[160px]">{assAttachmentName}</span>
                          <button
                            type="button"
                            onClick={() => { setAssAttachmentName(""); setAssAttachmentDataUrl(""); }}
                            className="text-emerald-700 hover:text-coral-600 ml-1 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-ink-soft/10">
                    <button
                      type="button"
                      onClick={() => setShowCreateAssModal(false)}
                      className="px-4 py-2 text-xs font-bold text-ink-soft bg-white border border-ink-soft/15 rounded-xl hover:bg-black/5 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-extrabold text-white bg-violet-500 rounded-xl hover:bg-violet-600 shadow-md shadow-violet-500/20 cursor-pointer flex items-center gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" /> Publish Assignment
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GRADING SUBMISSIONS MODAL */}
        <AnimatePresence>
          {selectedAssignmentForGrading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
            >
              <div className="bg-cream border border-ink-soft/15 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl my-8">
                <div className="flex justify-between items-center border-b border-ink-soft/10 pb-3">
                  <div>
                    <h3 className="font-black text-base text-ink">
                      Submissions: {selectedAssignmentForGrading.title}
                    </h3>
                  </div>
                  <button onClick={() => setSelectedAssignmentForGrading(null)}>
                    <X className="h-5 w-5 text-ink-soft" />
                  </button>
                </div>

                {assignmentSubmissions.length === 0 ? (
                  <p className="text-xs text-ink-soft/60 italic p-6 text-center">
                    No student submissions received yet for this assignment.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {assignmentSubmissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-4 bg-white/70 border border-ink-soft/10 rounded-2xl space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between font-bold text-ink">
                          <span>{sub.studentName}</span>
                          <span
                            className={`px-2 py-0.5 text-[10px] rounded-full border ${
                              sub.status === "Graded"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {sub.status === "Graded" ? `Graded (${sub.score})` : "Pending Grade"}
                          </span>
                        </div>

                        <p className="text-ink-soft bg-cream/80 p-3 rounded-xl whitespace-pre-wrap font-sans">
                          {sub.content || "No text provided"}
                        </p>

                        {sub.attachmentDataUrl && (
                          <div className="flex justify-end">
                            <a
                              href={sub.attachmentDataUrl}
                              download={sub.attachmentName || "student-file"}
                              className="px-3 py-1 text-[11px] font-extrabold text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100"
                            >
                              Download File ({sub.attachmentName})
                            </a>
                          </div>
                        )}

                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => handleStartGrade(sub)}
                            className="px-3.5 py-1.5 text-xs font-extrabold text-white bg-violet-500 hover:bg-violet-600 rounded-xl cursor-pointer"
                          >
                            {sub.status === "Graded" ? "Update Grade" : "Grade Submission"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GRADE INPUT SUB-MODAL */}
        <AnimatePresence>
          {gradingSubmission && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4"
            >
              <div className="bg-cream border border-ink-soft/15 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                <div className="flex justify-between items-center border-b border-ink-soft/10 pb-3">
                  <h3 className="font-black text-sm text-ink">
                    Grade {gradingSubmission.studentName}
                  </h3>
                  <button onClick={() => setGradingSubmission(null)}>
                    <X className="h-5 w-5 text-ink-soft" />
                  </button>
                </div>

                <form onSubmit={handleSaveGrade} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-ink-soft block mb-1">
                      Score / Grade (e.g. 95 or A):
                    </label>
                    <input
                      type="text"
                      value={gradeInputScore}
                      onChange={(e) => setGradeInputScore(e.target.value)}
                      placeholder="e.g. 95 / 100"
                      required
                      className="w-full p-2.5 text-xs bg-white/70 border border-ink-soft/15 rounded-xl text-ink font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-ink-soft block mb-1">
                      Teacher Feedback Note:
                    </label>
                    <textarea
                      value={gradeInputFeedback}
                      onChange={(e) => setGradeInputFeedback(e.target.value)}
                      placeholder="Great job! Excellent problem analysis..."
                      rows={3}
                      className="w-full p-2.5 text-xs bg-white/70 border border-ink-soft/15 rounded-xl text-ink resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setGradingSubmission(null)}
                      className="px-4 py-2 text-xs font-bold text-ink-soft bg-white border border-ink-soft/15 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer"
                    >
                      Save Grade
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* VIEW STUDENT PROFILE MODAL */}
        {viewingStudent && (
          <StudentProfile student={viewingStudent} onClose={() => setViewingStudent(null)} />
        )}
      </div>
    </div>
  );
}
