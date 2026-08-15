import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LogOut,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  Settings as SettingsIcon,
  MessageSquare,
  ClipboardList,
  BookOpen,
  Megaphone,
  FileText,
  Upload,
  Paperclip,
  Send,
  Search,
  CheckCircle2,
  Award,
  Key,
  X,
  Eye,
  UserCheck,
  Zap,
  TrendingUp,
  Moon,
  Sun,
  Image as ImageIcon,
  GraduationCap,
  MapPin,
  Mail,
  School
} from "lucide-react";
import { User, AttendanceRecord, AttendanceStatus, StudentStats, ClassPost, PostComment, AssignmentSubmission } from "../types";
import type { AppTheme, AppThemeMode } from "../App";
import AnimatedThemeBackground from "./AnimatedThemeBackground";
import SettingsTab from "./SettingsTab";
import UserAvatar from "./UserAvatar";
import StudentProfile from "./StudentProfile";
import TeacherProfile from "./TeacherProfile";
import DailyCheckinsTab from "./DailyCheckinsTab";
import Classroom from "./Classroom";
import {
  getUsers,
  getAttendanceRecords,
  recordTodayAttendance,
  calculateStudentStats,
  formatDate,
  deleteOwnAccount,
  changeOwnPassword,
  forceReconnect,
  getAnnouncements,
  getAssignments,
  getCommentsForPost,
  addComment,
  getSubmissionForStudent,
  submitAssignment,
} from "../lib/db";

interface StudentDashboardProps {
  user: User;
  onLogout: () => void;
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  themeMode?: AppThemeMode;
  onThemeModeChange?: (mode: AppThemeMode) => void;
}

export default function StudentDashboard({
  user,
  onLogout,
  theme,
  onThemeChange,
  themeMode = "night",
  onThemeModeChange,
}: StudentDashboardProps) {
  // DB & State
  const [dbUser, setDbUser] = useState<User>(user);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<StudentStats>({
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    totalDays: 0,
    percentage: 100,
  });

  const [activeTab, setActiveTab] = useState<"classes" | "attendance" | "checkins" | "announcements" | "assignments" | "faculty" | "settings">("classes");
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [viewingStudent, setViewingStudent] = useState<User | null>(null);
  const [viewingTeacher, setViewingTeacher] = useState<User | null>(null);

  // Teacher Filter & Selector state
  const [teachers, setTeachers] = useState<User[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("all");

  // Daily attendance state
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>("Present");
  const [notes, setNotes] = useState("");
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Announcements state
  const [announcements, setAnnouncements] = useState<ClassPost[]>([]);
  const [announcementSearch, setAnnouncementSearch] = useState("");
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, PostComment[]>>({});
  const [newCommentInput, setNewCommentInput] = useState("");

  // Assignments state
  const [assignments, setAssignments] = useState<ClassPost[]>([]);
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState<"All" | "Pending" | "Submitted" | "Graded">("All");
  const [selectedAssignmentForSubmission, setSelectedAssignmentForSubmission] = useState<ClassPost | null>(null);
  const [submissionsMap, setSubmissionsMap] = useState<Record<string, AssignmentSubmission | undefined>>({});

  // Submission Form State
  const [submissionText, setSubmissionText] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentDataUrl, setAttachmentDataUrl] = useState("");
  const [isSubmittingWork, setIsSubmittingWork] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);

  // Profile & Settings modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [editEmailValue, setEditEmailValue] = useState("");
  const [editLocationValue, setEditLocationValue] = useState("");

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);

  const todayStr = formatDate(new Date());

  const loadData = () => {
    const allUsers = getUsers();
    setAllStudents(allUsers.filter((u) => u.role === "student"));
    const freshUser = allUsers.find((u) => u.id.toLowerCase() === user.id.toLowerCase());
    if (freshUser) {
      setDbUser(freshUser);
    }

    // Attendance
    const allRecords = getAttendanceRecords();
    setAllAttendanceRecords(allRecords);
    const studentRecords = allRecords
      .filter((r) => r.studentId.toLowerCase() === user.id.toLowerCase())
      .sort((a, b) => b.date.localeCompare(a.date));

    setHistory(studentRecords);

    const logToday = studentRecords.find((r) => r.date === todayStr);
    if (logToday) {
      setTodayRecord(logToday);
      setSelectedStatus(logToday.status);
      setNotes(logToday.notes || "");
    } else {
      setTodayRecord(null);
    }

    const calculatedStats = calculateStudentStats(user.id);
    setStats(calculatedStats);

    // Announcements & Assignments
    const ann = getAnnouncements();
    setAnnouncements(ann);

    const ass = getAssignments();
    setAssignments(ass);

    // Load Teachers
    const teacherUsers = allUsers.filter((u) => u.role === "teacher");
    const teacherMap = new Map<string, User>();
    teacherUsers.forEach((t) => {
      const key = (t.id || t.uid || "").toLowerCase();
      if (key) teacherMap.set(key, t);
    });

    const posts = [...ann, ...ass];
    posts.forEach((p) => {
      const key = (p.authorId || "").toLowerCase();
      if (key && !teacherMap.has(key)) {
        teacherMap.set(key, {
          id: p.authorId,
          name: p.authorName || "Teacher",
          role: "teacher",
          createdAt: p.createdAt,
          subject: p.subject || "General Education",
        });
      }
    });

    setTeachers(Array.from(teacherMap.values()));

    // Map student submissions
    const subMap: Record<string, AssignmentSubmission | undefined> = {};
    ass.forEach((post) => {
      subMap[post.id] = getSubmissionForStudent(post.id, user.id);
    });
    setSubmissionsMap(subMap);
  };

  useEffect(() => {
    loadData();
    const handleDbUpdate = () => {
      loadData();
    };
    window.addEventListener("db_updated", handleDbUpdate);
    return () => window.removeEventListener("db_updated", handleDbUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  // Attendance submit
  const handleRecordAttendance = (e: React.FormEvent) => {
    e.preventDefault();

    const customSubjectTag =
      selectedTeacherId !== "all" && selectedTeacher ? selectedTeacher.subject || selectedTeacher.name : undefined;

    const record = recordTodayAttendance(
      user.id,
      user.name,
      selectedStatus,
      notes.trim() || undefined,
      undefined,
      customSubjectTag
    );
    setTodayRecord(record);
    setShowCelebration(true);
    setSuccessMsg(`Attendance logged as ${selectedStatus}${customSubjectTag ? ` (${customSubjectTag})` : ""}!`);
    loadData();

    setTimeout(() => {
      setShowCelebration(false);
    }, 3000);
  };

  // Toggle comment section
  const handleToggleComments = (postId: string) => {
    if (expandedCommentsPostId === postId) {
      setExpandedCommentsPostId(null);
    } else {
      setExpandedCommentsPostId(postId);
      const comments = getCommentsForPost(postId);
      setCommentsMap((prev) => ({ ...prev, [postId]: comments }));
    }
  };

  // Submit comment
  const handleAddComment = (postId: string) => {
    if (!newCommentInput.trim()) return;
    addComment({
      postId,
      authorId: user.id,
      authorName: dbUser.name,
      content: newCommentInput.trim(),
    });
    setNewCommentInput("");
    const updated = getCommentsForPost(postId);
    setCommentsMap((prev) => ({ ...prev, [postId]: updated }));
  };

  // Handle file attachment upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("File size exceeds 3MB limit.");
      return;
    }

    setAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      setAttachmentDataUrl(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Open submission modal
  const handleOpenSubmissionModal = (assignment: ClassPost) => {
    setSelectedAssignmentForSubmission(assignment);
    const existing = submissionsMap[assignment.id];
    if (existing) {
      setSubmissionText(existing.content || "");
      setAttachmentName(existing.attachmentName || "");
      setAttachmentDataUrl(existing.attachmentDataUrl || "");
    } else {
      setSubmissionText("");
      setAttachmentName("");
      setAttachmentDataUrl("");
    }
    setSubmissionSuccess(null);
  };

  // Submit assignment work
  const handleSubmitWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentForSubmission) return;

    setIsSubmittingWork(true);
    submitAssignment({
      postId: selectedAssignmentForSubmission.id,
      studentId: user.id,
      studentName: dbUser.name,
      content: submissionText,
      attachmentName: attachmentName || undefined,
      attachmentDataUrl: attachmentDataUrl || undefined,
    });

    setIsSubmittingWork(false);
    setSubmissionSuccess("Assignment submitted successfully!");
    loadData();

    setTimeout(() => {
      setSubmissionSuccess(null);
      setSelectedAssignmentForSubmission(null);
    }, 1800);
  };

  // Password update handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);
    setChangePasswordSuccess(null);
    if (!currentPasswordInput || !newPasswordInput) {
      setChangePasswordError("Please fill out both fields.");
      return;
    }
    try {
      await changeOwnPassword(currentPasswordInput, newPasswordInput);
      setChangePasswordSuccess("Password updated successfully.");
      setCurrentPasswordInput("");
      setNewPasswordInput("");
    } catch (err: any) {
      setChangePasswordError("Failed to update password. Please check your current password.");
    }
  };

  // Selected Teacher Object
  const selectedTeacher = teachers.find(
    (t) =>
      (t.id || "").toLowerCase() === selectedTeacherId.toLowerCase() ||
      (t.uid || "").toLowerCase() === selectedTeacherId.toLowerCase()
  );

  const isPostFromSelectedTeacher = (p: ClassPost) => {
    if (selectedTeacherId === "all" || !selectedTeacher) return true;
    const authorMatch =
      p.authorId?.toLowerCase() === selectedTeacherId.toLowerCase() ||
      (selectedTeacher.uid && p.authorId?.toLowerCase() === selectedTeacher.uid.toLowerCase()) ||
      p.authorName?.toLowerCase() === selectedTeacher.name.toLowerCase();

    const teacherSubjects = selectedTeacher.subject
      ? selectedTeacher.subject.split(',').map((s) => s.trim().toLowerCase())
      : [];

    const subjectMatch =
      teacherSubjects.length > 0 &&
      p.subject &&
      teacherSubjects.includes(p.subject.toLowerCase());

    return authorMatch || subjectMatch;
  };

  // Filtered lists
  const filteredAnnouncements = announcements.filter((p) => {
    if (!isPostFromSelectedTeacher(p)) return false;
    return (
      p.title?.toLowerCase().includes(announcementSearch.toLowerCase()) ||
      p.content.toLowerCase().includes(announcementSearch.toLowerCase()) ||
      p.subject?.toLowerCase().includes(announcementSearch.toLowerCase())
    );
  });

  const filteredAssignments = assignments.filter((p) => {
    if (!isPostFromSelectedTeacher(p)) return false;
    const matchQuery =
      p.title?.toLowerCase().includes(assignmentSearch.toLowerCase()) ||
      p.content.toLowerCase().includes(assignmentSearch.toLowerCase()) ||
      p.subject?.toLowerCase().includes(assignmentSearch.toLowerCase());

    if (!matchQuery) return false;

    const sub = submissionsMap[p.id];
    if (assignmentFilter === "Pending") return !sub;
    if (assignmentFilter === "Submitted") return sub && sub.status !== "Graded";
    if (assignmentFilter === "Graded") return sub && sub.status === "Graded";
    return true;
  });

  // Filtered Attendance & Stats for selected teacher
  const displayHistory = history.filter((r) => {
    if (selectedTeacherId === "all" || !selectedTeacher) return true;
    const teacherSubjects = selectedTeacher.subject
      ? selectedTeacher.subject.split(',').map((s) => s.trim().toLowerCase())
      : [];
    if (r.subject && teacherSubjects.includes(r.subject.toLowerCase())) return true;
    if (r.subject && r.subject.toLowerCase() === selectedTeacher.name.toLowerCase()) return true;
    return false;
  });

  const presentCount = displayHistory.filter((r) => r.status === "Present").length;
  const absentCount = displayHistory.filter((r) => r.status === "Absent").length;
  const lateCount = displayHistory.filter((r) => r.status === "Late").length;
  const totalDays = displayHistory.length;
  const percentage = totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 100;

  const displayStats: StudentStats =
    selectedTeacherId === "all"
      ? stats
      : {
          presentCount,
          absentCount,
          lateCount,
          totalDays,
          percentage,
        };

  return (
    <div className="relative min-h-screen pb-16 pt-4 sm:pt-6 px-2.5 sm:px-6 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      <div className="relative z-10 space-y-4 sm:space-y-6 w-full min-w-0">
        {/* Top Navbar Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-cream rounded-3xl border border-ink-soft/10 p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 min-w-0 overflow-hidden"
        >
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar name={dbUser.name} avatarUrl={dbUser.avatarUrl} role="student" size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold bg-teal-50 text-teal-600 rounded-full border border-teal-200 shrink-0">
                  Student Portal
                </span>
                <span className="text-xs font-mono text-ink-soft/70 truncate">ID: {user.id}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight mt-0.5 truncate">
                Hello, {dbUser.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end flex-wrap">
            {/* Theme Cycle Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const themes: AppTheme[] = ["default", "spring", "summer", "autumn", "winter"];
                const next = themes[(themes.indexOf(theme) + 1) % themes.length];
                onThemeChange(next);
              }}
              className="p-2 sm:p-2.5 rounded-xl border border-white/20 bg-slate-900/90 hover:bg-slate-800 text-white flex items-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-lg"
              title="Click to cycle themes"
            >
              <Zap className="h-4 w-4 text-cyan-400 shrink-0" />
              <span className="capitalize font-mono font-bold text-xs">{theme === "default" ? "Cyberpunk" : theme}</span>
            </motion.button>

            {/* Quick Night / Day Mode Toggle */}
            {onThemeModeChange && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onThemeModeChange(themeMode === "night" ? "day" : "night")}
                className="p-2 sm:p-2.5 rounded-xl border border-white/20 bg-slate-900/90 hover:bg-slate-800 text-white flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-lg"
                title={`Switch to ${themeMode === "night" ? "Day" : "Night"} Mode`}
              >
                {themeMode === "night" ? (
                  <Moon className="h-4 w-4 text-cyan-400 shrink-0" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-400 shrink-0" />
                )}
                <span className="capitalize font-mono font-bold text-xs">
                  {themeMode === "night" ? "Night" : "Day"}
                </span>
              </motion.button>
            )}

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
        <div className="bg-cream/80 backdrop-blur-xl p-1.5 rounded-2xl border border-ink-soft/10 shadow-lg grid grid-cols-2 sm:flex sm:items-center sm:justify-start gap-1.5 max-w-full">
          <button
            onClick={() => setActiveTab("classes")}
            className={`relative flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 text-xs font-bold rounded-xl transition-colors cursor-pointer w-full sm:w-auto ${
              activeTab === "classes" ? "text-teal-600" : "text-ink-soft hover:text-ink"
            }`}
          >
            {activeTab === "classes" && (
              <motion.div
                layoutId="studentActiveTabPill"
                className="absolute inset-0 bg-teal-500/15 border border-teal-500/30 rounded-xl"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <School className="h-4 w-4 relative z-10 shrink-0" />
            <span className="relative z-10 truncate">My Classes</span>
          </button>

          <button
            onClick={() => setActiveTab("attendance")}
            className={`relative flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 text-xs font-bold rounded-xl transition-colors cursor-pointer w-full sm:w-auto ${
              activeTab === "attendance" ? "text-teal-600" : "text-ink-soft hover:text-ink"
            }`}
          >
            {activeTab === "attendance" && (
              <motion.div
                layoutId="studentActiveTabPill"
                className="absolute inset-0 bg-teal-500/15 border border-teal-500/30 rounded-xl"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <ClipboardList className="h-4 w-4 relative z-10 shrink-0" />
            <span className="relative z-10 truncate">Attendance</span>
          </button>

          <button
            onClick={() => setActiveTab("checkins")}
            className={`relative flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 text-xs font-bold rounded-xl transition-colors cursor-pointer w-full sm:w-auto ${
              activeTab === "checkins" ? "text-teal-600" : "text-ink-soft hover:text-ink"
            }`}
          >
            {activeTab === "checkins" && (
              <motion.div
                layoutId="studentActiveTabPill"
                className="absolute inset-0 bg-teal-500/15 border border-teal-500/30 rounded-xl"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <UserCheck className="h-4 w-4 relative z-10 shrink-0" />
            <span className="relative z-10 truncate">Attendance Sheet</span>
          </button>

          <button
            onClick={() => setActiveTab("announcements")}
            className={`relative flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 text-xs font-bold rounded-xl transition-colors cursor-pointer w-full sm:w-auto ${
              activeTab === "announcements" ? "text-teal-600" : "text-ink-soft hover:text-ink"
            }`}
          >
            {activeTab === "announcements" && (
              <motion.div
                layoutId="studentActiveTabPill"
                className="absolute inset-0 bg-teal-500/15 border border-teal-500/30 rounded-xl"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <Megaphone className="h-4 w-4 relative z-10 shrink-0" />
            <span className="relative z-10 truncate">Announcements</span>
            {filteredAnnouncements.length > 0 && (
              <span className="relative z-10 ml-0.5 px-1.5 py-0.2 text-[10px] font-extrabold bg-teal-500 text-white rounded-full shrink-0">
                {filteredAnnouncements.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("assignments")}
            className={`relative flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 text-xs font-bold rounded-xl transition-colors cursor-pointer w-full sm:w-auto ${
              activeTab === "assignments" ? "text-teal-600" : "text-ink-soft hover:text-ink"
            }`}
          >
            {activeTab === "assignments" && (
              <motion.div
                layoutId="studentActiveTabPill"
                className="absolute inset-0 bg-teal-500/15 border border-teal-500/30 rounded-xl"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <FileText className="h-4 w-4 relative z-10 shrink-0" />
            <span className="relative z-10 truncate">Assignments</span>
            {filteredAssignments.length > 0 && (
              <span className="relative z-10 ml-0.5 px-1.5 py-0.2 text-[10px] font-extrabold bg-teal-500 text-white rounded-full shrink-0">
                {filteredAssignments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("faculty")}
            className={`relative flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 text-xs font-bold rounded-xl transition-colors cursor-pointer w-full sm:w-auto ${
              activeTab === "faculty" ? "text-teal-600" : "text-ink-soft hover:text-ink"
            }`}
          >
            {activeTab === "faculty" && (
              <motion.div
                layoutId="studentActiveTabPill"
                className="absolute inset-0 bg-teal-500/15 border border-teal-500/30 rounded-xl"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <GraduationCap className="h-4 w-4 relative z-10 shrink-0" />
            <span className="relative z-10 truncate">Faculty Directory</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`relative flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 text-xs font-bold rounded-xl transition-colors cursor-pointer w-full sm:w-auto ${
              activeTab === "settings" ? "text-teal-600" : "text-ink-soft hover:text-ink"
            }`}
          >
            {activeTab === "settings" && (
              <motion.div
                layoutId="studentActiveTabPill"
                className="absolute inset-0 bg-teal-500/15 border border-teal-500/30 rounded-xl"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <SettingsIcon className="h-4 w-4 relative z-10 shrink-0" />
            <span className="relative z-10 truncate">Settings</span>
          </button>
        </div>

        {/* Teacher / Class Selector Bar */}
        {activeTab !== "settings" && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-cream/90 backdrop-blur-xl border border-ink-soft/10 rounded-2xl p-3.5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 rounded-xl shrink-0">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-ink-soft/60">
                    Switch Teacher / Class View
                  </span>
                  {selectedTeacherId !== "all" && (
                    <span className="px-2 py-0.2 text-[10px] font-bold bg-violet-500 text-white rounded-full">
                      Filtered View
                    </span>
                  )}
                </div>
                {selectedTeacherId !== "all" && selectedTeacher && (
                  <p className="text-xs sm:text-sm font-extrabold text-ink truncate mt-0.5">
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <span>Viewing Feed of: </span>
                      <span className="text-violet-600 dark:text-violet-400 font-black">
                        {selectedTeacher?.name}
                      </span>
                      {selectedTeacher?.subject && (
                        <span className="px-2 py-0.5 text-[10px] bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 rounded-lg border border-violet-200 dark:border-violet-800">
                          {selectedTeacher.subject}
                        </span>
                      )}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto shrink-0">
              <label htmlFor="teacher-select" className="text-xs font-bold text-ink-soft hidden sm:inline shrink-0">
                Teacher:
              </label>
              <select
                id="teacher-select"
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full md:w-auto px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-ink-soft/20 rounded-xl text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
              >
                <option value="all">All Teachers & Classes</option>
                {teachers.map((t, idx) => (
                  <option key={`${t.id || t.uid || 'teacher'}-${idx}`} value={t.id || t.uid}>
                    {t.name} {t.subject ? `(${t.subject})` : ""}
                  </option>
                ))}
              </select>

              {selectedTeacher && (
                <button
                  onClick={() => setViewingTeacher(selectedTeacher)}
                  className="px-3 py-2 text-xs font-bold text-violet-600 dark:text-violet-300 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/80 border border-violet-200 dark:border-violet-800/80 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
                  id="view-selected-teacher-profile-btn"
                >
                  <GraduationCap className="h-3.5 w-3.5 text-violet-500" />
                  <span>Teacher Profile</span>
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 0: MY CLASSES & SECTIONS */}
        {activeTab === "classes" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-w-0"
          >
            <Classroom currentUser={user} />
          </motion.div>
        )}

        {/* TAB 1: ATTENDANCE & STATS */}
        {activeTab === "attendance" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Quick Check-In Form */}
            <div className="lg:col-span-1 space-y-4 sm:space-y-6 min-w-0">
              <div className="bg-cream border border-ink-soft/10 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4 sm:space-y-5 relative overflow-hidden min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base sm:text-lg font-black text-ink flex items-center gap-2 truncate">
                    <Calendar className="h-5 w-5 text-teal-500 shrink-0" />
                    Daily Check-In
                  </h2>
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold bg-teal-50 text-teal-600 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-teal-100 shrink-0">
                    {todayStr}
                  </span>
                </div>

                {/* Celebratory Banner */}
                <AnimatePresence>
                  {showCelebration && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="p-3 sm:p-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-2xl shadow-lg flex items-center gap-2.5 sm:gap-3"
                    >
                      <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-xs sm:text-sm">Checked In!</h4>
                        <p className="text-[11px] sm:text-xs opacity-90 truncate">{successMsg}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleRecordAttendance} className="space-y-3 sm:space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-ink-soft block">
                      Select Status for Today:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedStatus("Present")}
                        className={`py-2.5 px-1 sm:py-3 sm:px-2 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          selectedStatus === "Present"
                            ? "border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                            : "border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:text-white"
                        }`}
                      >
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
                        <span>Present</span>
                      </motion.button>

                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedStatus("Late")}
                        className={`py-2.5 px-1 sm:py-3 sm:px-2 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          selectedStatus === "Late"
                            ? "border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                            : "border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:text-white"
                        }`}
                      >
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
                        <span>Late</span>
                      </motion.button>

                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedStatus("Absent")}
                        className={`py-2.5 px-1 sm:py-3 sm:px-2 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          selectedStatus === "Absent"
                            ? "border-rose-400 bg-rose-500/20 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                            : "border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:text-white"
                        }`}
                      >
                        <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-rose-400" />
                        <span>Absent</span>
                      </motion.button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">
                      Optional Note:
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Arrived 5 mins late due to traffic"
                      rows={2}
                      className="w-full p-2.5 sm:p-3 text-xs bg-slate-950/80 border border-slate-700/80 rounded-2xl focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,240,255,0.3)] text-white placeholder-slate-400 resize-none transition-all"
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    className="w-full py-3 sm:py-3.5 rounded-2xl text-xs font-extrabold text-white bg-teal-500 hover:bg-teal-600 shadow-lg shadow-teal-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{todayRecord ? "Update Today's Status" : "Log Attendance Now"}</span>
                  </motion.button>
                </form>
              </div>

              {/* Stats Overview */}
              <div className="bg-cream border border-ink-soft/10 rounded-3xl p-4 sm:p-6 shadow-xl space-y-3 sm:space-y-4 min-w-0 overflow-hidden">
                <h3 className="text-sm font-black text-ink flex items-center gap-2">
                  <TrendingUp className="h-4.5 w-4.5 text-teal-500 shrink-0" />
                  <span>Attendance Record Summary</span>
                </h3>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 min-w-0">
                  <div className="p-2.5 sm:p-3.5 bg-teal-500/10 rounded-2xl border border-teal-500/20 text-center min-w-0">
                    <span className="text-[10px] font-bold text-teal-300 block uppercase tracking-normal sm:tracking-wider truncate">
                      Present
                    </span>
                    <span className="text-lg sm:text-xl font-black text-teal-400 mt-0.5 block">
                      {displayStats.presentCount}
                    </span>
                  </div>

                  <div className="p-2.5 sm:p-3.5 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-center min-w-0">
                    <span className="text-[10px] font-bold text-amber-300 block uppercase tracking-normal sm:tracking-wider truncate">
                      Late
                    </span>
                    <span className="text-lg sm:text-xl font-black text-amber-400 mt-0.5 block">
                      {displayStats.lateCount}
                    </span>
                  </div>

                  <div className="p-2.5 sm:p-3.5 bg-coral-500/10 rounded-2xl border border-coral-500/20 text-center min-w-0">
                    <span className="text-[10px] font-bold text-coral-300 block uppercase tracking-normal sm:tracking-wider truncate">
                      Absent
                    </span>
                    <span className="text-lg sm:text-xl font-black text-coral-400 mt-0.5 block">
                      {displayStats.absentCount}
                    </span>
                  </div>

                  <div className="p-2.5 sm:p-3.5 bg-violet-500/10 rounded-2xl border border-violet-500/20 text-center min-w-0">
                    <span className="text-[10px] font-bold text-violet-300 block uppercase tracking-normal sm:tracking-wider truncate">
                      Punctuality Rate
                    </span>
                    <span className="text-lg sm:text-xl font-black text-violet-400 mt-0.5 block">
                      {displayStats.percentage}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Attendance History Table */}
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-700/60 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4 min-w-0 overflow-hidden backdrop-blur-xl">
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-cyan-400 shrink-0" />
                <span>Attendance Log History</span>
              </h2>

              {displayHistory.length === 0 ? (
                <div className="p-10 text-center text-slate-400 space-y-2">
                  <ClipboardList className="h-8 w-8 mx-auto text-slate-500" />
                  <p className="text-xs font-semibold">No attendance logged for this view yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-700/60 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                        <th className="pb-3 px-3 whitespace-nowrap">Date</th>
                        <th className="pb-3 px-3 whitespace-nowrap">Time</th>
                        <th className="pb-3 px-3 whitespace-nowrap">Subject / Class</th>
                        <th className="pb-3 px-3 whitespace-nowrap">Status</th>
                        <th className="pb-3 px-3 whitespace-nowrap">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60">
                      {displayHistory.map((record) => (
                        <tr key={record.id} className="hover:bg-cyan-500/5 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-white whitespace-nowrap">{record.date}</td>
                          <td className="py-3 px-3 text-slate-300 font-mono whitespace-nowrap">{record.time}</td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="px-2.5 py-1 bg-violet-500/20 text-violet-300 font-extrabold text-[10px] rounded-lg border border-violet-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)] whitespace-nowrap inline-block">
                              {record.subject || "General Class"}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold whitespace-nowrap ${
                                record.status === "Present"
                                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-[0_0_10px_rgba(20,184,166,0.2)]"
                                  : record.status === "Late"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                                  : "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                              }`}
                            >
                              {record.status === "Present" && <CheckCircle className="h-3.5 w-3.5" />}
                              {record.status === "Late" && <Clock className="h-3.5 w-3.5" />}
                              {record.status === "Absent" && <XCircle className="h-3.5 w-3.5" />}
                              {record.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-300 italic max-w-xs truncate font-medium">
                            {record.notes || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 2: DAILY CHECK-INS */}
        {activeTab === "checkins" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <DailyCheckinsTab
              currentUser={dbUser}
              allStudents={allStudents}
              attendanceRecords={allAttendanceRecords}
              onSelectStudent={(st) => setViewingStudent(st)}
            />
          </motion.div>
        )}

        {/* TAB 3: ANNOUNCEMENTS */}
        {activeTab === "announcements" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Search Bar */}
            <div className="bg-cream border border-ink-soft/10 rounded-2xl p-4 shadow-lg flex items-center gap-3">
              <Search className="h-5 w-5 text-teal-500 shrink-0" />
              <input
                type="text"
                value={announcementSearch}
                onChange={(e) => setAnnouncementSearch(e.target.value)}
                placeholder="Search announcements by title or content..."
                className="w-full text-xs font-semibold bg-transparent !border-none !outline-none focus:!bg-transparent focus:!outline-none focus:!border-none focus:!ring-0 text-ink placeholder-ink-soft/50"
                style={{ border: "none", outline: "none", boxShadow: "none" }}
              />
            </div>

            {filteredAnnouncements.length === 0 ? (
              <div className="bg-cream border border-ink-soft/10 rounded-3xl p-12 text-center text-ink-soft/60 space-y-2">
                <Megaphone className="h-10 w-10 mx-auto text-ink-soft/30" />
                <p className="text-sm font-bold text-ink">No announcements found.</p>
                <p className="text-xs">Check back later for course updates from your teachers.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredAnnouncements.map((post, idx) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-cream border border-ink-soft/10 rounded-3xl p-6 shadow-xl space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ink-soft/10 pb-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-teal-950/80 text-teal-300 rounded-full border border-teal-500/40">
                            Announcement
                          </span>
                          <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-indigo-950/80 text-indigo-300 rounded-full border border-indigo-500/40 flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            Teacher: {post.authorName || teachers.find((t) => t.id === post.authorId)?.name || "Faculty"}
                          </span>
                          {post.subject && (
                            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-violet-950/80 text-violet-300 rounded-full border border-violet-500/40">
                              {post.subject}
                            </span>
                          )}
                        </div>
                        <h2 className="text-lg font-black text-ink tracking-tight mt-1">
                          {post.title || "Course Announcement"}
                        </h2>
                      </div>
                      <span className="text-xs font-mono text-ink-soft/60">
                        {new Date(post.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed text-ink/90 whitespace-pre-wrap font-sans">
                      {post.content}
                    </p>

                    {/* Attachment preview if any */}
                    {post.attachmentDataUrl && (
                      post.attachmentDataUrl.startsWith("data:image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(post.attachmentName || "") ? (
                        <div className="mt-3 overflow-hidden rounded-2xl border border-ink-soft/15 bg-slate-950/20 max-w-lg">
                          <img
                            src={post.attachmentDataUrl}
                            alt={post.attachmentName || "Attached photo"}
                            className="max-h-72 w-full object-cover rounded-t-2xl hover:opacity-95 transition-opacity cursor-pointer"
                            onClick={() => window.open(post.attachmentDataUrl, "_blank")}
                          />
                          <div className="p-2.5 bg-white/80 dark:bg-slate-900/80 flex items-center justify-between text-xs font-bold text-ink dark:text-slate-200">
                            <span className="flex items-center gap-1.5 truncate">
                              <ImageIcon className="h-4 w-4 text-teal-500 shrink-0" />
                              <span className="truncate">{post.attachmentName || "Attached Photo"}</span>
                            </span>
                            <a
                              href={post.attachmentDataUrl}
                              download={post.attachmentName || "photo.png"}
                              className="px-3 py-1 text-[11px] font-extrabold text-teal-600 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 transition-all cursor-pointer"
                            >
                              Download Photo
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-white/60 border border-ink-soft/15 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-ink truncate">
                            <Paperclip className="h-4 w-4 text-teal-500 shrink-0" />
                            <span className="truncate">{post.attachmentName || "Attachment"}</span>
                          </div>
                          <a
                            href={post.attachmentDataUrl}
                            download={post.attachmentName || "attachment"}
                            className="px-3 py-1 text-xs font-extrabold text-teal-600 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 transition-all cursor-pointer shrink-0"
                          >
                            Download
                          </a>
                        </div>
                      )
                    )}

                    {/* Comment Thread Trigger */}
                    <div className="pt-2 flex items-center justify-between border-t border-ink-soft/10">
                      <span className="text-xs font-medium text-ink-soft">
                        Posted by <strong className="text-ink">{post.authorName}</strong>
                      </span>

                      <button
                        onClick={() => handleToggleComments(post.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-violet-300 bg-violet-500/20 border border-violet-500/40 rounded-xl hover:bg-violet-500/30 transition-all cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Comments
                      </button>
                    </div>

                    {/* Expanded Comments */}
                    {expandedCommentsPostId === post.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="p-4 bg-white/60 border border-ink-soft/10 rounded-2xl space-y-3"
                      >
                        <h4 className="text-xs font-extrabold text-ink">Discussion</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {(commentsMap[post.id] || []).length === 0 ? (
                            <p className="text-[11px] text-ink-soft/50 italic">No comments yet. Start the conversation!</p>
                          ) : (
                            (commentsMap[post.id] || []).map((c) => (
                              <div key={c.id} className="p-2.5 bg-cream/80 rounded-xl text-xs space-y-0.5">
                                <div className="flex items-center justify-between font-bold text-ink text-[11px]">
                                  <span>{c.authorName}</span>
                                  <span className="text-[10px] font-mono text-ink-soft/50">
                                    {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                                <p className="text-ink-soft">{c.content}</p>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newCommentInput}
                            onChange={(e) => setNewCommentInput(e.target.value)}
                            placeholder="Write a comment..."
                            className="w-full px-3 py-2 text-xs bg-cream border border-ink-soft/15 rounded-xl focus:outline-none focus:border-teal-500 text-ink"
                            onKeyDown={(e) => e.key === "Enter" && handleAddComment(post.id)}
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            className="px-3.5 py-2 text-xs font-bold text-white bg-teal-500 rounded-xl hover:bg-teal-600 cursor-pointer"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 3: ASSIGNMENTS */}
        {activeTab === "assignments" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Search & Filter Header */}
            <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-xl">
              <div className="flex items-center gap-3 flex-1 bg-slate-950/80 px-3.5 py-2.5 rounded-xl border border-slate-700/60 focus-within:border-cyan-400 focus-within:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all">
                <Search className="h-5 w-5 text-cyan-400 shrink-0" />
                <input
                  type="text"
                  value={assignmentSearch}
                  onChange={(e) => setAssignmentSearch(e.target.value)}
                  placeholder="Search assignments by title..."
                  className="w-full text-xs font-semibold bg-transparent !border-none !outline-none focus:!bg-transparent focus:!outline-none focus:!border-none focus:!ring-0 text-white placeholder-slate-400"
                  style={{ border: "none", outline: "none", boxShadow: "none" }}
                />
              </div>

              <div className="flex items-center gap-1.5 self-start md:self-center">
                {(["All", "Pending", "Submitted", "Graded"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setAssignmentFilter(st)}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      assignmentFilter === st
                        ? "bg-cyan-400 text-slate-950 font-black shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                        : "bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-500"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {filteredAssignments.length === 0 ? (
              <div className="bg-cream border border-ink-soft/10 rounded-3xl p-12 text-center text-ink-soft/60 space-y-2">
                <FileText className="h-10 w-10 mx-auto text-ink-soft/30" />
                <p className="text-sm font-bold text-ink">No assignments found.</p>
                <p className="text-xs">Your teacher has not posted any assignments in this view yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredAssignments.map((assignment, idx) => {
                  const sub = submissionsMap[assignment.id];
                  const isGraded = sub?.status === "Graded";
                  const isSubmitted = !!sub;

                  return (
                    <motion.div
                      key={assignment.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-cream border border-ink-soft/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                                isGraded
                                  ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                                  : isSubmitted
                                  ? "bg-teal-950/80 text-teal-300 border-teal-500/40"
                                  : "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                              }`}
                            >
                              {isGraded ? "Graded" : isSubmitted ? "Submitted" : "Pending"}
                            </span>

                            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-indigo-950/80 text-indigo-300 rounded-full border border-indigo-500/40 flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" />
                              Teacher: {assignment.authorName || teachers.find((t) => t.id === assignment.authorId)?.name || "Faculty"}
                            </span>

                            {assignment.subject && (
                              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-violet-950/80 text-violet-300 rounded-full border border-violet-500/40">
                                {assignment.subject}
                              </span>
                            )}
                          </div>

                          {assignment.dueDate && (
                            <span className="text-[11px] font-mono font-bold text-ink-soft">
                              Due: {assignment.dueDate}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-black text-ink">{assignment.title}</h3>
                        <p className="text-xs text-ink/80 leading-relaxed font-sans line-clamp-3">
                          {assignment.content}
                        </p>
                      </div>

                      {/* Grade feedback display if graded */}
                      {isGraded && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs space-y-1">
                          <div className="flex items-center justify-between font-extrabold text-emerald-800">
                            <span className="flex items-center gap-1">
                              <Award className="h-4 w-4 text-emerald-600" /> Grade Received:
                            </span>
                            <span className="text-sm font-mono">{sub.score} / {assignment.maxPoints || 100}</span>
                          </div>
                          {sub.feedback && (
                            <p className="text-[11px] text-emerald-700/90 italic">
                              "{sub.feedback}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* Submit Action Button */}
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleOpenSubmissionModal(assignment)}
                        className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                          isGraded
                            ? "bg-emerald-500/15 text-emerald-700 border border-emerald-300 hover:bg-emerald-500/25"
                            : isSubmitted
                            ? "bg-teal-500/15 text-teal-700 border border-teal-300 hover:bg-teal-500/25"
                            : "bg-teal-500 text-white hover:bg-teal-600 shadow-md shadow-teal-500/20"
                        }`}
                      >
                        <Upload className="h-4 w-4" />
                        {isGraded ? "View Submission" : isSubmitted ? "View / Re-submit Work" : "Submit Assignment"}
                      </motion.button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 5: FACULTY DIRECTORY */}
        {activeTab === "faculty" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-cream border border-ink-soft/10 rounded-3xl p-6 shadow-xl space-y-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-violet-500" />
                <h2 className="text-xl font-black text-ink font-display">Faculty Directory</h2>
              </div>
              <p className="text-xs text-ink-soft">
                Connect with your teachers, check subjects, and view verified profile credentials.
              </p>
            </div>

            {teachers.length === 0 ? (
              <div className="text-center py-12 bg-white border border-ink-soft/10 rounded-3xl p-6">
                <GraduationCap className="h-10 w-10 text-ink-soft/40 mx-auto mb-2" />
                <p className="text-sm font-bold text-ink">No faculty accounts found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teachers.map((t, idx) => (
                  <motion.div
                    key={`${t.id || t.uid || 'teacher'}-${idx}`}
                    whileHover={{ y: -2 }}
                    className="bg-white border border-ink-soft/10 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={t.name} avatarUrl={t.avatarUrl} role="teacher" size="lg" />
                          <div>
                            <h3 className="font-bold text-sm text-ink">{t.name}</h3>
                            <p className="text-[11px] text-ink-soft font-mono">@{t.id}</p>
                          </div>
                        </div>

                        {t.isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-50 text-teal-700 border border-teal-200">
                            <CheckCircle2 className="h-3 w-3 text-teal-500" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="h-3 w-3 text-amber-500" /> Pending
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs">
                        {t.subject && (
                          <div className="flex items-start gap-2 text-ink-soft">
                            <BookOpen className="h-3.5 w-3.5 text-violet-500 shrink-0 mt-0.5" />
                            <div className="flex flex-wrap gap-1">
                              {t.subject.split(',').map((sub, sIdx) => (
                                <span key={sIdx} className="bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300 px-2 py-0.5 rounded-md text-[11px] font-bold border border-violet-200 dark:border-violet-700/50">
                                  {sub.trim()}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {t.location && (
                          <div className="flex items-center gap-2 text-ink-soft">
                            <MapPin className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                            <span>{t.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-ink-soft/10 flex items-center justify-between gap-2">
                      {t.email ? (
                        <a
                          href={`mailto:${t.email}`}
                          className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1"
                        >
                          <Mail className="h-3.5 w-3.5" /> Email
                        </a>
                      ) : (
                        <span className="text-[10px] text-ink-soft/50 italic">No email</span>
                      )}

                      <button
                        onClick={() => setViewingTeacher(t)}
                        className="px-3 py-1.5 text-xs font-extrabold text-violet-300 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                      >
                        <GraduationCap className="h-3.5 w-3.5" /> View Profile
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 4: SETTINGS */}
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
              onProfileUpdated={loadData}
            />
          </motion.div>
        )}
        <AnimatePresence>
          {selectedAssignmentForSubmission && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-cream border border-ink-soft/15 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-5 my-8"
              >
                <div className="flex items-center justify-between border-b border-ink-soft/10 pb-4">
                  <div>
                    <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-teal-50 text-teal-600 rounded-full border border-teal-200">
                      Assignment Submission
                    </span>
                    <h2 className="text-lg font-black text-ink mt-1">
                      {selectedAssignmentForSubmission.title}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedAssignmentForSubmission(null)}
                    className="p-1.5 text-ink-soft hover:text-ink rounded-full hover:bg-black/5 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-3.5 bg-white/60 border border-ink-soft/10 rounded-2xl text-xs space-y-1">
                  <h4 className="font-bold text-ink">Instructions:</h4>
                  <p className="text-ink-soft/90 leading-relaxed font-sans">
                    {selectedAssignmentForSubmission.content}
                  </p>
                </div>

                {submissionSuccess && (
                  <div className="p-3 bg-teal-950/80 border border-teal-500/40 text-teal-300 text-xs font-bold rounded-xl flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-teal-400" />
                    <span>{submissionSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleSubmitWork} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-ink-soft block">
                      Your Solution / Work Description:
                    </label>
                    <textarea
                      value={submissionText}
                      onChange={(e) => setSubmissionText(e.target.value)}
                      placeholder="Type your response or answers here..."
                      rows={5}
                      required
                      className="w-full p-3 text-xs bg-white/70 border border-ink-soft/15 rounded-2xl focus:outline-none focus:border-teal-500 text-ink resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-ink-soft block">
                      Attach File / Photo (optional):
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="px-4 py-2.5 text-xs font-extrabold text-teal-300 bg-teal-950/80 border border-teal-500/40 hover:bg-teal-900/80 rounded-xl cursor-pointer transition-all flex items-center gap-1.5">
                        <Paperclip className="h-4 w-4" />
                        Choose File
                        <input
                          type="file"
                          onChange={handleFileChange}
                          className="hidden"
                          accept="image/*,.pdf,.doc,.docx,.txt"
                        />
                      </label>
                      <span className="text-xs font-mono text-ink-soft truncate">
                        {attachmentName || "No file attached"}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-ink-soft/10">
                    <button
                      type="button"
                      onClick={() => setSelectedAssignmentForSubmission(null)}
                      className="px-4 py-2.5 text-xs font-bold text-ink-soft bg-white border border-ink-soft/15 rounded-xl hover:bg-black/5 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingWork}
                      className="px-5 py-2.5 text-xs font-extrabold text-white bg-teal-500 rounded-xl hover:bg-teal-600 cursor-pointer shadow-md shadow-teal-500/20 flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Submit Assignment
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* VIEW STUDENT PROFILE SECTION */}
        {viewingStudent && (
          <div className="pt-8 mt-10 border-t border-slate-700/60">
            <StudentProfile student={viewingStudent} onClose={() => setViewingStudent(null)} />
          </div>
        )}

        {/* VIEW TEACHER PROFILE SECTION */}
        {viewingTeacher && (
          <div className="pt-8 mt-10 border-t border-slate-700/60">
            <TeacherProfile
              teacher={viewingTeacher}
              currentUser={dbUser}
              onClose={() => setViewingTeacher(null)}
              onSelectStudent={(s) => setViewingStudent(s)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
