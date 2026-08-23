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
  Palette,
  MessageSquare,
  Image as ImageIcon,
  GraduationCap,
  CheckCircle2,
  Mail,
  MapPin,
  Building2,
  BookOpen,
  RefreshCw,
  School,
  Copy
} from "lucide-react";
import {
  User,
  AttendanceRecord,
  AttendanceStatus,
  StudentStats,
  SecurityLog,
  ClassPost,
  PostComment,
  AssignmentSubmission,
  ClassRoom
} from "../types";
import type { AppTheme, AppThemeMode } from "../App";
import StudentProfile from "./StudentProfile";
import TeacherProfile from "./TeacherProfile";
import AnimatedThemeBackground from "./AnimatedThemeBackground";
import SettingsTab from "./SettingsTab";
import UserAvatar from "./UserAvatar";
import DailyCheckinsTab from "./DailyCheckinsTab";
import Classroom from "./Classroom";
import ClassMessenger, { openDirectMessage } from "./ClassMessenger";
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
  verifyCurrentPassword,
  addSecurityLog,
  getClassesForTeacher,
  createClass,
  addStudentToClass,
  removeStudentFromClass,
  getUnreadDirectMessagesCount,
} from "../lib/db";

interface TeacherDashboardProps {
  user: User;
  onLogout: () => void;
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  themeMode?: AppThemeMode;
  onThemeModeChange?: (mode: AppThemeMode) => void;
}

export default function TeacherDashboard({
  user,
  onLogout,
  theme,
  onThemeChange,
  themeMode = "night",
  onThemeModeChange,
}: TeacherDashboardProps) {
  // DB States
  const [students, setStudents] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [dbUser, setDbUser] = useState<User>(user);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);

  // Class Sections State
  const [teacherClasses, setTeacherClasses] = useState<ClassRoom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [showCreateSectionModal, setShowCreateSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionSubject, setNewSectionSubject] = useState("");
  const [createSectionError, setCreateSectionError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<"roster" | "teachers" | "checkins" | "announcements" | "assignments" | "reports" | "messenger" | "settings">("roster");
  const [unreadMessengerCount, setUnreadMessengerCount] = useState<number>(0);
  const [viewingStudent, setViewingStudent] = useState<User | null>(null);
  const [viewingTeacherProfile, setViewingTeacherProfile] = useState<User | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");

  // Teacher Tab States
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [teacherStatusFilter, setTeacherStatusFilter] = useState<"All" | "Verified" | "Pending">("All");

  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [newTeacherId, setNewTeacherId] = useState("");
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherPassword, setNewTeacherPassword] = useState("");
  const [newTeacherSubject, setNewTeacherSubject] = useState("");
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [addTeacherError, setAddTeacherError] = useState<string | null>(null);

  const [teacherToEdit, setTeacherToEdit] = useState<User | null>(null);
  const [editTeacherName, setEditTeacherName] = useState("");
  const [editTeacherSubject, setEditTeacherSubject] = useState("");
  const [editTeacherEmail, setEditTeacherEmail] = useState("");

  const [teacherToDelete, setTeacherToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState<string | null>(null);
  const [isDeletingTeacher, setIsDeletingTeacher] = useState(false);

  // Pending Verification / Revocation Password Action State
  const [pendingTeacherAction, setPendingTeacherAction] = useState<{
    teacher: User;
    action: "verify" | "revoke";
  } | null>(null);
  const [actionPassword, setActionPassword] = useState("");
  const [actionPasswordError, setActionPasswordError] = useState<string | null>(null);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  // Attendance Sheet State
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [statusFilter, setStatusFilter] = useState<"All" | "Present" | "Late" | "Absent">("All");

  // Edit / Add Student Modal State
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentId, setNewStudentId] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentPassword, setNewStudentPassword] = useState("");
  const [addStudentClassId, setAddStudentClassId] = useState<string>("none");
  const [addStudentError, setAddStudentError] = useState<string | null>(null);
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);

  const [studentToEdit, setStudentToEdit] = useState<User | null>(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentEmail, setEditStudentEmail] = useState("");

  const [studentToDelete, setStudentToDelete] = useState<{ id: string; name: string } | null>(null);

  // Announcements Form State
  const [announcements, setAnnouncements] = useState<ClassPost[]>([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annSubject, setAnnSubject] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annClassId, setAnnClassId] = useState<string>("all");
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
  const [assClassId, setAssClassId] = useState<string>("all");
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

    const teacherList = allUsers.filter((u) => u.role === "teacher");
    setTeachers(teacherList);

    const records = getAttendanceRecords();
    setAttendanceRecords(records);

    const logs = getSecurityLogs();
    setSecurityLogs(logs);

    setAnnouncements(getAnnouncements());
    setAssignments(getAssignments());

    setTeacherClasses(getClassesForTeacher(user.id));
    setUnreadMessengerCount(getUnreadDirectMessagesCount(user.id));
  };

  const selectedClass = selectedClassId !== "all" ? teacherClasses.find((c) => c.id === selectedClassId) : undefined;

  const sectionStudents = selectedClassId === "all" || !selectedClass
    ? students
    : students.filter((s) => selectedClass.studentIds.includes(s.id));

  const filteredAttendanceRecords = selectedClassId === "all" || !selectedClass
    ? attendanceRecords
    : attendanceRecords.filter((r) =>
        r.classId === selectedClass.id || sectionStudents.some((s) => s.id.toLowerCase() === r.studentId.toLowerCase())
      );

  const filteredAnnouncements = selectedClassId === "all" || !selectedClass
    ? announcements
    : announcements.filter((a) => {
        if (!a.classId || a.classId === "all") return true;
        if (a.classId === selectedClass.id) return true;
        if (selectedClass.subject && a.subject) {
          return a.subject.toLowerCase() === selectedClass.subject.toLowerCase();
        }
        return false;
      });

  const filteredAssignments = selectedClassId === "all" || !selectedClass
    ? assignments
    : assignments.filter((a) => {
        if (!a.classId || a.classId === "all") return true;
        if (a.classId === selectedClass.id) return true;
        if (selectedClass.subject && a.subject) {
          return a.subject.toLowerCase() === selectedClass.subject.toLowerCase();
        }
        return false;
      });

  const handleCreateSection = () => {
    if (!newSectionName.trim()) {
      setCreateSectionError("Class section name is required.");
      return;
    }
    const newCls = createClass(newSectionName.trim(), newSectionSubject.trim(), dbUser);
    loadDatabase();
    setSelectedClassId(newCls.id);
    setNewSectionName("");
    setNewSectionSubject("");
    setShowCreateSectionModal(false);
    setCreateSectionError(null);
  };

  useEffect(() => {
    loadDatabase();
    const handleDbUpdate = () => loadDatabase();
    const handleOpenMessenger = () => {
      setActiveTab("messenger");
    };

    window.addEventListener("db_updated", handleDbUpdate);
    window.addEventListener("open_messenger", handleOpenMessenger);

    return () => {
      window.removeEventListener("db_updated", handleDbUpdate);
      window.removeEventListener("open_messenger", handleOpenMessenger);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  // Confirm teacher verification / revocation after password confirmation
  const handleConfirmTeacherAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingTeacherAction) return;
    setActionPasswordError(null);
    if (!actionPassword) {
      setActionPasswordError("Please enter your account password.");
      return;
    }
    setIsVerifyingPassword(true);

    try {
      const isValid = await verifyCurrentPassword(actionPassword);
      if (!isValid) {
        setActionPasswordError("Incorrect password. Please enter your valid account password.");
        setIsVerifyingPassword(false);
        return;
      }

      const { teacher, action } = pendingTeacherAction;
      await updateUserApprovalStatus(teacher.id, action === "verify");
      addSecurityLog({
        usernameAttempted: dbUser.id,
        type: "Verification Status Changed",
        details: `Teacher ${dbUser.name} (${dbUser.id}) ${action === "verify" ? "verified" : "revoked verification for"} teacher ${teacher.name} (${teacher.id}).`
      });

      setPendingTeacherAction(null);
      setActionPassword("");
      loadDatabase();
    } catch (err: any) {
      setActionPasswordError(err?.message || "Password verification failed. Please try again.");
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  // Add new teacher account
  const handleAddTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddTeacherError(null);
    if (!newTeacherId.trim() || !newTeacherName.trim() || !newTeacherPassword.trim()) {
      setAddTeacherError("Please complete Teacher ID, Full Name, and Password.");
      return;
    }
    try {
      await createUserByAdmin(newTeacherId, newTeacherName, newTeacherPassword, "teacher", {
        subject: newTeacherSubject.trim() || "General Education",
        email: newTeacherEmail.trim() || undefined,
      });
      setNewTeacherId("");
      setNewTeacherName("");
      setNewTeacherPassword("");
      setNewTeacherSubject("");
      setNewTeacherEmail("");
      setShowAddTeacherModal(false);
      loadDatabase();
    } catch (err: any) {
      setAddTeacherError("Error creating teacher account. ID may already exist.");
    }
  };

  // Edit Teacher
  const handleSaveTeacherEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherToEdit) return;
    saveUser({
      ...teacherToEdit,
      name: editTeacherName.trim(),
      subject: editTeacherSubject.trim() || undefined,
      email: editTeacherEmail.trim() || undefined,
    });
    setTeacherToEdit(null);
    loadDatabase();
  };

  // Delete Teacher
  const handleConfirmDeleteTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherToDelete) return;
    setDeletePasswordError(null);
    if (!deletePassword) {
      setDeletePasswordError("Please enter your account password.");
      return;
    }
    setIsDeletingTeacher(true);

    try {
      const isValid = await verifyCurrentPassword(deletePassword);
      if (!isValid) {
        setDeletePasswordError("Incorrect password. Please enter your valid account password.");
        setIsDeletingTeacher(false);
        return;
      }

      deleteUser(teacherToDelete.id);
      addSecurityLog({
        usernameAttempted: dbUser.id,
        type: "Account Deleted",
        details: `Teacher ${dbUser.name} deleted teacher account ${teacherToDelete.name} (${teacherToDelete.id}).`
      });
      setTeacherToDelete(null);
      setDeletePassword("");
      setDeletePasswordError(null);
      loadDatabase();
    } catch (err: any) {
      setDeletePasswordError(err?.message || "Password verification failed. Please try again.");
    } finally {
      setIsDeletingTeacher(false);
    }
  };

  // Handle Approve / Verify student
  const handleToggleApproval = async (student: User) => {
    await updateUserApprovalStatus(student.id, !student.isApproved);
    loadDatabase();
  };

  // Add new student account
  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddStudentError(null);
    const cleanId = newStudentId.trim();
    const cleanName = newStudentName.trim();
    const cleanPass = newStudentPassword.trim();

    if (!cleanId || !cleanName || !cleanPass) {
      setAddStudentError("Please complete all required fields.");
      return;
    }

    if (cleanPass.length < 6) {
      setAddStudentError("Password must be at least 6 characters long.");
      return;
    }

    setIsCreatingStudent(true);
    try {
      const newStudent = await createUserByAdmin(cleanId, cleanName, cleanPass, "student");
      
      if (addStudentClassId && addStudentClassId !== "none") {
        addStudentToClass(addStudentClassId, newStudent.id);
      }

      setNewStudentId("");
      setNewStudentName("");
      setNewStudentPassword("");
      setAddStudentClassId("none");
      setShowAddStudentModal(false);
      loadDatabase();
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || "";
      if (msg.includes("already-in-use") || msg.includes("already exist")) {
        setAddStudentError("A student with this ID or username already exists.");
      } else if (msg.includes("weak-password")) {
        setAddStudentError("Password is too weak. Please use at least 6 characters.");
      } else {
        setAddStudentError(msg || "Error creating student account. Please try again.");
      }
    } finally {
      setIsCreatingStudent(false);
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
      classId: selectedClass?.id,
    };

    saveAttendanceRecord(record);
    loadDatabase();
  };

  const handleAnnFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
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

    const targetClass = teacherClasses.find((c) => c.id === annClassId);

    createPost({
      type: "announcement",
      authorId: user.id,
      authorName: dbUser.name,
      title: annTitle.trim() || "Announcement",
      subject: annSubject.trim() || targetClass?.subject || selectedClass?.subject || "General",
      content: annContent.trim(),
      classId: annClassId,
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

    const targetClass = teacherClasses.find((c) => c.id === assClassId);

    createPost({
      type: "assignment",
      authorId: user.id,
      authorName: dbUser.name,
      title: assTitle.trim(),
      subject: assSubject.trim() || targetClass?.subject || selectedClass?.subject || "General",
      content: assContent.trim(),
      dueDate: assDueDate || formatDate(new Date(Date.now() + 86400000 * 7)),
      maxPoints: Number(assMaxPoints) || 100,
      classId: assClassId,
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
  const filteredStudents = sectionStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative min-h-screen pb-16 pt-4 sm:pt-6 px-2.5 sm:px-6 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
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

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end flex-wrap">
            {/* Theme Cycle Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const themes: AppTheme[] = ["default", "sakura", "spring", "summer", "autumn", "winter"];
                const next = themes[(themes.indexOf(theme) + 1) % themes.length];
                onThemeChange(next);
              }}
              className="p-2 sm:p-2.5 rounded-xl border border-white/20 bg-slate-900/90 hover:bg-slate-800 text-white flex items-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-lg"
              title="Click to cycle themes"
            >
              <Palette className="h-4 w-4 text-cyan-400 shrink-0" />
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

        {/* Switch Class Section Selector Bar */}
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-cream/90 backdrop-blur-xl border border-ink-soft/10 rounded-2xl p-3.5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 rounded-xl shrink-0">
              <School className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-ink-soft/60">
                  Switch Class Section View
                </span>
                {selectedClassId !== "all" && (
                  <span className="px-2 py-0.2 text-[10px] font-bold bg-violet-500 text-white rounded-full">
                    Filtered View
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-extrabold text-ink truncate mt-0.5">
                {selectedClassId === "all" ? (
                  <span className="text-teal-600 dark:text-teal-400">
                    Viewing combined roster & feed for All Class Sections ({teacherClasses.length} section{teacherClasses.length === 1 ? "" : "s"})
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span>Viewing Section: </span>
                    <span className="text-violet-600 dark:text-violet-400 font-black">
                      {selectedClass?.name}
                    </span>
                    {selectedClass?.subject && (
                      <span className="px-2 py-0.5 text-[10px] bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 rounded-lg border border-violet-200 dark:border-violet-800">
                        {selectedClass.subject}
                      </span>
                    )}
                    {selectedClass?.joinCode && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedClass.joinCode);
                          setCopiedCode(selectedClass.joinCode);
                          setTimeout(() => setCopiedCode(null), 2000);
                        }}
                        className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 rounded-lg border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-200 transition-all cursor-pointer flex items-center gap-1"
                        title="Click to copy join code"
                      >
                        <Copy className="h-3 w-3 text-cyan-400" />
                        <span>{copiedCode === selectedClass.joinCode ? "Copied!" : `Code: ${selectedClass.joinCode}`}</span>
                      </button>
                    )}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto shrink-0">
            <label htmlFor="teacher-class-select" className="text-xs font-bold text-ink-soft hidden sm:inline shrink-0">
              Section:
            </label>
            <select
              id="teacher-class-select"
              value={selectedClassId}
              onChange={(e) => {
                if (e.target.value === "__create__") {
                  setShowCreateSectionModal(true);
                } else {
                  setSelectedClassId(e.target.value);
                }
              }}
              className="w-full md:w-auto px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-ink-soft/20 rounded-xl text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
            >
              <option value="all">All Class Sections</option>
              {teacherClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.subject ? `(${c.subject})` : ""} — {c.studentIds.length} Students
                </option>
              ))}
              <option value="__create__">+ Create New Class Section...</option>
            </select>

            <button
              onClick={() => setShowCreateSectionModal(true)}
              className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>New Section</span>
            </button>
          </div>
        </motion.div>

        {/* Navigation Tabs - Responsive Grid on Mobile, Flex Row on Desktop */}
        <div className="bg-cream/80 backdrop-blur-xl p-1.5 rounded-2xl border border-ink-soft/10 shadow-lg grid grid-cols-2 sm:grid-cols-3 md:flex md:items-center md:justify-start gap-1.5 max-w-full">
          {[
            { id: "roster", label: "Student Roster", icon: Users, count: sectionStudents.length },
            {
              id: "teachers",
              label: "Teachers",
              icon: GraduationCap,
              count: teachers.filter((t) => !t.isApproved).length,
              badgeColor: "bg-amber-500",
            },
            { id: "checkins", label: "Attendance Sheet", icon: UserCheck },
            { id: "announcements", label: "Announcements", icon: Megaphone, count: filteredAnnouncements.length },
            { id: "assignments", label: "Assignments & Grading", icon: FileText, count: filteredAssignments.length },
            { id: "reports", label: "Reports & Logs", icon: FileSpreadsheet },
            {
              id: "messenger",
              label: "Class Messenger",
              icon: MessageSquare,
              count: unreadMessengerCount > 0 ? unreadMessengerCount : undefined,
              badgeColor: "bg-violet-500",
            },
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
                  <span className={`relative z-10 px-1.5 py-0.2 text-[10px] font-extrabold ${tab.badgeColor || "bg-violet-500"} text-white rounded-full shrink-0`}>
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
                    className="w-full text-xs font-semibold bg-transparent !border-none !outline-none focus:!bg-transparent focus:!outline-none focus:!border-none focus:!ring-0 text-white placeholder-slate-400"
                    style={{ border: "none", outline: "none", boxShadow: "none" }}
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
                            className="flex-1 py-1.5 text-xs font-bold text-violet-300 bg-violet-500/20 border border-violet-500/40 rounded-lg hover:bg-violet-500/30 cursor-pointer flex items-center justify-center gap-1 transition-all"
                          >
                            <Eye className="h-3.5 w-3.5" /> Profile
                          </button>
                          <button
                            onClick={() => openDirectMessage(st.id)}
                            className="px-2.5 py-1.5 text-xs font-bold text-violet-300 bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/40 rounded-lg cursor-pointer transition-all flex items-center gap-1"
                            title={`Direct message ${st.name}`}
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-violet-400" />
                            <span>DM</span>
                          </button>
                          <button
                            onClick={() => {
                              setStudentToEdit(st);
                              setEditStudentName(st.name);
                              setEditStudentEmail(st.email || "");
                            }}
                            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 rounded-lg border border-slate-700 cursor-pointer transition-colors"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setStudentToDelete({ id: st.id, name: st.name })}
                            className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/20 rounded-lg border border-rose-500/30 cursor-pointer transition-colors"
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

        {/* TAB 2: TEACHERS & VERIFICATION */}
        {activeTab === "teachers" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Banner if Current Teacher is Pending Verification */}
            {!dbUser.isApproved && (
              <div className="bg-amber-950/80 border border-amber-500/40 p-4 rounded-2xl flex items-center gap-3 text-amber-200 text-xs font-semibold shadow-lg">
                <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
                <div>
                  <span className="font-extrabold text-amber-300 block text-sm">Account Pending Verification</span>
                  Your teacher account is waiting for approval by fellow faculty members. Once verified, your status badge will update across the portal.
                </div>
              </div>
            )}

            {/* Metric Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div
                onClick={() => setTeacherStatusFilter("All")}
                className="bg-slate-900/80 border border-slate-700/60 p-4 rounded-2xl backdrop-blur-xl cursor-pointer hover:border-violet-500/60 transition-all"
              >
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total Teachers</span>
                  <GraduationCap className="h-4 w-4 text-violet-400" />
                </div>
                <p className="text-2xl font-black text-white font-display">{teachers.length}</p>
              </div>

              <div
                onClick={() => setTeacherStatusFilter("Verified")}
                className="bg-slate-900/80 border border-teal-500/30 p-4 rounded-2xl backdrop-blur-xl cursor-pointer hover:border-teal-500/60 transition-all"
              >
                <div className="flex items-center justify-between text-teal-300 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Verified Teachers</span>
                  <CheckCircle2 className="h-4 w-4 text-teal-400" />
                </div>
                <p className="text-2xl font-black text-teal-400 font-display">
                  {teachers.filter((t) => t.isApproved).length}
                </p>
              </div>

              <div
                onClick={() => setTeacherStatusFilter("Pending")}
                className="bg-slate-900/80 border border-amber-500/30 p-4 rounded-2xl backdrop-blur-xl cursor-pointer hover:border-amber-500/60 transition-all"
              >
                <div className="flex items-center justify-between text-amber-300 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Pending Verification</span>
                  <Clock className="h-4 w-4 text-amber-400" />
                </div>
                <p className="text-2xl font-black text-amber-400 font-display">
                  {teachers.filter((t) => !t.isApproved).length}
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-700/60 p-4 rounded-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Your Status</span>
                  <UserCheck className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                      dbUser.isApproved
                        ? "bg-teal-950/80 text-teal-300 border border-teal-500/40"
                        : "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    {dbUser.isApproved ? "Verified Teacher" : "Pending Approval"}
                  </span>
                </div>
              </div>
            </div>

            {/* Controls Header: Search, Status Filter, Add Teacher Button */}
            <div className="bg-slate-900/80 border border-slate-700/60 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-xl space-y-4">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search */}
                <div className="flex items-center gap-3 flex-1 bg-slate-950/80 px-3.5 py-2.5 rounded-2xl border border-slate-700/60 focus-within:border-violet-400 focus-within:shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all">
                  <Search className="h-5 w-5 text-violet-400 shrink-0" />
                  <input
                    type="text"
                    value={teacherSearchQuery}
                    onChange={(e) => setTeacherSearchQuery(e.target.value)}
                    placeholder="Search teachers by name, ID, or subject..."
                    className="w-full text-xs font-semibold bg-transparent !border-none !outline-none focus:!bg-transparent focus:!outline-none focus:!border-none focus:!ring-0 text-white placeholder-slate-400"
                  />
                  {teacherSearchQuery && (
                    <button onClick={() => setTeacherSearchQuery("")}>
                      <X className="h-4 w-4 text-slate-400 hover:text-white" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                  {(["All", "Pending", "Verified"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setTeacherStatusFilter(st)}
                      className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all shrink-0 cursor-pointer ${
                        teacherStatusFilter === st
                          ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                      }`}
                    >
                      {st === "All" ? "All Faculty" : st === "Pending" ? "Pending Approval" : "Verified Only"}
                    </button>
                  ))}
                </div>

                {/* Add Teacher Button */}
                <button
                  onClick={() => setShowAddTeacherModal(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Add Teacher Account</span>
                </button>
              </div>

              {/* Teacher Cards Grid */}
              {(() => {
                const filteredTeachers = teachers.filter((t) => {
                  const q = teacherSearchQuery.trim().toLowerCase();
                  const matchesQuery =
                    !q ||
                    t.name.toLowerCase().includes(q) ||
                    t.id.toLowerCase().includes(q) ||
                    (t.subject && t.subject.toLowerCase().includes(q)) ||
                    (t.email && t.email.toLowerCase().includes(q));
                  if (teacherStatusFilter === "Verified") return matchesQuery && t.isApproved;
                  if (teacherStatusFilter === "Pending") return matchesQuery && !t.isApproved;
                  return matchesQuery;
                });

                if (filteredTeachers.length === 0) {
                  return (
                    <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-slate-800/80">
                      <GraduationCap className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-300">No teacher accounts found</p>
                      <p className="text-xs text-slate-500 mt-1">Try resetting your search query or status filter.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {filteredTeachers.map((t, idx) => {
                      const isMe = t.id.toLowerCase() === dbUser.id.toLowerCase();
                      return (
                        <div
                          key={`${t.id || t.uid || 'teacher'}-${idx}`}
                          className={`bg-slate-950/70 border rounded-2xl p-4 space-y-3.5 transition-all relative ${
                            !t.isApproved
                              ? "border-amber-500/40 bg-amber-950/10"
                              : "border-slate-800 hover:border-violet-500/40"
                          }`}
                        >
                          {/* Header: Avatar, Info, Status Badge */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <UserAvatar name={t.name} avatarUrl={t.avatarUrl} size="md" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-extrabold text-sm text-white">{t.name}</h4>
                                  {isMe && (
                                    <span className="px-2 py-0.2 text-[9px] font-black uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-500/40 rounded-full">
                                      You
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-mono font-semibold text-slate-400">ID: {t.id}</p>
                              </div>
                            </div>

                            {/* Verification Status Badge */}
                            <div>
                              {t.isApproved ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-teal-950/80 text-teal-300 border border-teal-500/40">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" /> Verified Teacher
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-950/80 text-amber-300 border border-amber-500/40 animate-pulse">
                                  <Clock className="h-3.5 w-3.5 text-amber-400" /> Pending Approval
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Details Pills / Meta */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {t.subject && (
                              <div className="flex items-start gap-2 text-slate-300 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 sm:col-span-2">
                                <BookOpen className="h-3.5 w-3.5 text-violet-400 shrink-0 mt-0.5" />
                                <div className="flex flex-wrap gap-1 min-w-0">
                                  {t.subject.split(',').map((sub, sIdx) => (
                                    <span key={sIdx} className="bg-violet-950/80 text-violet-300 px-2 py-0.5 rounded text-[11px] font-semibold border border-violet-800/40">
                                      {sub.trim()}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {t.email && (
                              <div className="flex items-center gap-2 text-slate-300 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 sm:col-span-2">
                                <Mail className="h-3.5 w-3.5 text-fuchsia-400 shrink-0" />
                                <a href={`mailto:${t.email}`} className="hover:underline text-fuchsia-300 truncate">
                                  {t.email}
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Action Toolbar */}
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                            <div className="text-[10px] text-slate-500 font-mono">
                              Joined: {t.createdAt || "N/A"}
                            </div>

                            <div className="flex items-center gap-2">
                              {/* DM Faculty Button */}
                              {t.id.toLowerCase() !== dbUser.id.toLowerCase() && (
                                <button
                                  onClick={() => openDirectMessage(t.id)}
                                  className="px-2.5 py-1.5 text-xs font-extrabold text-violet-300 bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/40 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                                  title={`Direct message ${t.name}`}
                                >
                                  <MessageSquare className="h-3.5 w-3.5 text-violet-400" />
                                  <span>DM</span>
                                </button>
                              )}

                              {/* View Profile Button */}
                              <button
                                onClick={() => setViewingTeacherProfile(t)}
                                className="px-3 py-1.5 text-xs font-extrabold text-violet-300 bg-violet-950/80 hover:bg-violet-900 border border-violet-500/40 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                                id={`view-teacher-profile-${t.id}`}
                              >
                                <GraduationCap className="h-3.5 w-3.5 text-violet-400" />
                                <span>View Profile</span>
                              </button>

                              {/* Quick Approve / Verify Button if pending */}
                              {!t.isApproved && (
                                <button
                                  onClick={() => {
                                    setPendingTeacherAction({
                                      teacher: t,
                                      action: "verify",
                                    });
                                    setActionPassword("");
                                    setActionPasswordError(null);
                                  }}
                                  className="px-2.5 py-1.5 text-xs font-extrabold rounded-xl bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/30 transition-all flex items-center gap-1 cursor-pointer"
                                  title="Verify Teacher"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Verify
                                </button>
                              )}

                              {/* Edit Details */}
                              <button
                                onClick={() => {
                                  setTeacherToEdit(t);
                                  setEditTeacherName(t.name);
                                  setEditTeacherSubject(t.subject || "");
                                  setEditTeacherEmail(t.email || "");
                                }}
                                className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all cursor-pointer"
                                title="Edit Details"
                              >
                                <Edit className="h-4 w-4" />
                              </button>

                              {/* Delete Account (Only if not self) */}
                              {!isMe && (
                                <button
                                  onClick={() => setTeacherToDelete({ id: t.id, name: t.name })}
                                  className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 rounded-xl border border-rose-800/40 transition-all cursor-pointer"
                                  title="Delete Teacher Account"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
        {activeTab === "checkins" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <DailyCheckinsTab
              currentUser={dbUser}
              allStudents={sectionStudents}
              attendanceRecords={filteredAttendanceRecords}
              onSelectStudent={(st) => setViewingStudent(st)}
            />
          </motion.div>
        )}

        {/* TAB 4: ANNOUNCEMENTS */}
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
                onClick={() => {
                  setAnnClassId(selectedClassId);
                  if (selectedClass?.subject) setAnnSubject(selectedClass.subject);
                  setShowCreateAnnModal(true);
                }}
                className="px-4 py-2 text-xs font-extrabold text-white bg-violet-500 hover:bg-violet-600 rounded-xl cursor-pointer shadow-md shadow-violet-500/20 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Post Announcement
              </button>
            </div>

            {filteredAnnouncements.length === 0 ? (
              <div className="bg-cream border border-ink-soft/10 rounded-3xl p-12 text-center text-ink-soft/60 space-y-2">
                <Megaphone className="h-10 w-10 mx-auto text-ink-soft/30" />
                <p className="text-sm font-bold text-ink">No announcements posted for this section yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAnnouncements.map((post) => (
                  <div
                    key={post.id}
                    className="bg-cream border border-ink-soft/10 rounded-3xl p-6 shadow-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-violet-500/20 text-violet-300 rounded-full border border-violet-500/40">
                          {!post.classId || post.classId === "all"
                            ? "🌐 All Sections"
                            : `📚 ${teacherClasses.find((c) => c.id === post.classId)?.name || "Section"}`}
                        </span>
                        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-slate-800 text-slate-300 rounded-full border border-slate-700">
                          {post.subject || "General"}
                        </span>
                        <h3 className="text-base font-black text-ink">{post.title}</h3>
                      </div>
                      <button
                        onClick={() => {
                          deletePost(post.id);
                          loadDatabase();
                        }}
                        className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg cursor-pointer transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="text-xs text-ink/90 font-sans leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </p>

                    {post.attachmentDataUrl && (
                      post.attachmentDataUrl.startsWith("data:image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(post.attachmentName || "") ? (
                        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-950/40 max-w-lg">
                          <img
                            src={post.attachmentDataUrl}
                            alt={post.attachmentName || "Attached photo"}
                            className="max-h-72 w-full object-cover rounded-t-2xl hover:opacity-95 transition-opacity cursor-pointer"
                            onClick={() => window.open(post.attachmentDataUrl, "_blank")}
                          />
                          <div className="p-2.5 bg-slate-900/90 flex items-center justify-between text-xs font-bold text-slate-200">
                            <span className="flex items-center gap-1.5 truncate">
                              <ImageIcon className="h-4 w-4 text-violet-400 shrink-0" />
                              <span className="truncate">{post.attachmentName || "Attached Photo"}</span>
                            </span>
                            <a
                              href={post.attachmentDataUrl}
                              download={post.attachmentName || "photo.png"}
                              className="px-3 py-1 text-[11px] font-extrabold text-white bg-violet-600 hover:bg-violet-500 rounded-lg shadow-sm transition-all"
                            >
                              Download Photo
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-900/80 border border-slate-700/60 rounded-xl flex items-center justify-between text-xs font-bold text-slate-200">
                          <span className="flex items-center gap-1.5 truncate">
                            <Paperclip className="h-4 w-4 text-violet-400 shrink-0" />
                            <span className="truncate">{post.attachmentName || "Attachment"}</span>
                          </span>
                          <a
                            href={post.attachmentDataUrl}
                            download={post.attachmentName || "attachment"}
                            className="px-3 py-1 text-xs font-extrabold text-white bg-violet-600 hover:bg-violet-500 rounded-lg shrink-0 shadow-sm transition-all"
                          >
                            Download
                          </a>
                        </div>
                      )
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
                <FileText className="h-5 w-5 text-violet-400" />
                Assignments & Student Submissions
              </h2>
              <button
                onClick={() => {
                  setAssClassId(selectedClassId);
                  if (selectedClass?.subject) setAssSubject(selectedClass.subject);
                  setShowCreateAssModal(true);
                }}
                className="px-4 py-2 text-xs font-extrabold text-white bg-violet-600 hover:bg-violet-500 rounded-xl cursor-pointer shadow-md shadow-violet-600/30 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Create Assignment
              </button>
            </div>

            {filteredAssignments.length === 0 ? (
              <div className="bg-cream border border-ink-soft/10 rounded-3xl p-12 text-center text-ink-soft/60 space-y-2">
                <FileText className="h-10 w-10 mx-auto text-ink-soft/30" />
                <p className="text-sm font-bold text-ink">No assignments created for this section yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredAssignments.map((assignment) => {
                  const subs = getSubmissionsForPost(assignment.id);
                  const gradedCount = subs.filter((s) => s.status === "Graded").length;

                  return (
                    <div
                      key={assignment.id}
                      className="bg-cream border border-ink-soft/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-violet-500/20 text-violet-300 rounded-full border border-violet-500/40">
                              {!assignment.classId || assignment.classId === "all"
                                ? "🌐 All Sections"
                                : `📚 ${teacherClasses.find((c) => c.id === assignment.classId)?.name || "Section"}`}
                            </span>
                            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-slate-800 text-slate-300 rounded-full border border-slate-700">
                              Due: {assignment.dueDate || "N/A"}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-400">
                            Max Points: {assignment.maxPoints || 100}
                          </span>
                        </div>

                        <h3 className="text-base font-black text-ink">{assignment.title}</h3>
                        <p className="text-xs text-ink/80 font-sans line-clamp-3">
                          {assignment.content}
                        </p>
                      </div>

                      <div className="p-3 bg-slate-900/80 border border-slate-700/70 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-200">
                        <span>
                          Submissions: <strong className="text-white">{subs.length}</strong> ({gradedCount} graded)
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenGradingModal(assignment)}
                            className="px-3.5 py-1.5 text-xs font-extrabold text-white bg-violet-600 hover:bg-violet-500 rounded-xl shadow-md shadow-violet-600/30 cursor-pointer transition-all flex items-center gap-1"
                          >
                            Review & Grade
                          </button>
                          <button
                            onClick={() => {
                              deletePost(assignment.id);
                              loadDatabase();
                            }}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg cursor-pointer transition-colors"
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

        {/* TAB 6: CLASS MESSENGER */}
        {activeTab === "messenger" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-slate-900/80 border border-slate-700/60 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 font-display">
                    <MessageSquare className="h-5 w-5 text-violet-400" />
                    Class Messenger & Direct Messages
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-sans">
                    Real-time 1-on-1 direct messaging and classroom communications with students and faculty.
                  </p>
                </div>
              </div>

              <ClassMessenger
                currentUser={dbUser}
                mode="embedded"
                theme={theme}
                themeMode={themeMode}
              />
            </div>
          </motion.div>
        )}

        {/* TAB 7: SETTINGS */}
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
                  <div>
                    <label className="block text-[10px] font-bold text-ink-soft dark:text-slate-300 mb-1">
                      Target Class Section
                    </label>
                    <select
                      value={annClassId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAnnClassId(val);
                        if (val !== "all") {
                          const cls = teacherClasses.find((c) => c.id === val);
                          if (cls?.subject) setAnnSubject(cls.subject);
                        }
                      }}
                      className="w-full p-2.5 text-xs font-semibold bg-white/90 dark:bg-slate-800/90 border border-ink-soft/20 dark:border-slate-700 rounded-xl text-ink dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    >
                      <option value="all">🌐 All Class Sections (Broadcast to all students)</option>
                      {teacherClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                          📚 Section: {c.name} {c.subject ? `(${c.subject})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <input
                    type="text"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="Announcement Title..."
                    required
                    className="w-full p-3 text-xs font-medium bg-white/90 dark:bg-slate-800/90 border border-ink-soft/20 dark:border-slate-700 rounded-xl text-ink dark:text-slate-100 placeholder:text-ink-soft/50 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                  <input
                    type="text"
                    value={annSubject}
                    onChange={(e) => setAnnSubject(e.target.value)}
                    placeholder="Subject Category (e.g. Computer Science)..."
                    className="w-full p-3 text-xs font-medium bg-white/90 dark:bg-slate-800/90 border border-ink-soft/20 dark:border-slate-700 rounded-xl text-ink dark:text-slate-100 placeholder:text-ink-soft/50 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                  <textarea
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    placeholder="Announcement details..."
                    rows={4}
                    required
                    className="w-full p-3 text-xs font-medium bg-white/90 dark:bg-slate-800/90 border border-ink-soft/20 dark:border-slate-700 rounded-xl text-ink dark:text-slate-100 placeholder:text-ink-soft/50 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                  />

                  {/* File / Photo Resource Attachment */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-[11px] font-bold text-ink-soft dark:text-slate-300">
                      Classroom Resource / Photo Attachment
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-800/40 cursor-pointer transition-colors">
                        <Paperclip className="h-4 w-4" />
                        <span>{annAttachmentName ? "Change Attachment" : "Attach File or Photo"}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt,.zip"
                          onChange={handleAnnFileChange}
                          className="hidden"
                        />
                      </label>
                      {annAttachmentName && (
                        <button
                          type="button"
                          onClick={() => {
                            setAnnAttachmentName("");
                            setAnnAttachmentDataUrl("");
                          }}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                          title="Remove attachment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {annAttachmentName && (
                      <div className="mt-1.5 p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-between text-xs font-bold text-violet-700 dark:text-violet-300">
                        <span className="truncate">📎 {annAttachmentName}</span>
                      </div>
                    )}
                    {annAttachmentDataUrl?.startsWith("data:image/") && (
                      <div className="mt-2 relative max-w-xs rounded-xl overflow-hidden border border-violet-500/30 shadow-md">
                        <img
                          src={annAttachmentDataUrl}
                          alt="Resource Preview"
                          className="max-h-36 w-full object-cover"
                        />
                      </div>
                    )}
                  </div>

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
                    <label className="block text-[10px] font-bold text-ink-soft dark:text-slate-300 mb-1">
                      Target Class Section
                    </label>
                    <select
                      value={assClassId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAssClassId(val);
                        if (val !== "all") {
                          const cls = teacherClasses.find((c) => c.id === val);
                          if (cls?.subject) setAssSubject(cls.subject);
                        }
                      }}
                      className="w-full p-2.5 text-xs font-semibold bg-white/90 dark:bg-slate-800/90 border border-ink-soft/20 dark:border-slate-700 rounded-xl text-ink dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    >
                      <option value="all">🌐 All Class Sections (Broadcast to all students)</option>
                      {teacherClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                          📚 Section: {c.name} {c.subject ? `(${c.subject})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-ink-soft block mb-1">Assignment Title</label>
                    <input
                      type="text"
                      value={assTitle}
                      onChange={(e) => setAssTitle(e.target.value)}
                      placeholder="e.g. Chapter 4 Calculus Homework"
                      required
                      className="w-full p-3 text-xs font-semibold bg-white/90 dark:bg-slate-800/90 border border-ink-soft/20 dark:border-slate-700 rounded-xl text-ink dark:text-slate-100 placeholder:text-ink-soft/50 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
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
                        className="w-full p-2.5 text-xs bg-white/90 dark:bg-slate-800/90 border border-ink-soft/20 dark:border-slate-700 rounded-xl text-ink dark:text-slate-100 placeholder:text-ink-soft/50 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-ink-soft block mb-1">Due Date</label>
                      <input
                        type="date"
                        value={assDueDate}
                        onChange={(e) => setAssDueDate(e.target.value)}
                        className="w-full p-2.5 text-xs bg-white/90 dark:bg-slate-800/90 border border-ink-soft/20 dark:border-slate-700 rounded-xl text-ink dark:text-slate-100 font-mono [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-violet-500/50"
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
                        className="w-full p-2.5 text-xs bg-white/90 dark:bg-slate-800/90 border border-ink-soft/20 dark:border-slate-700 rounded-xl text-ink dark:text-slate-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/50"
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
                      className="w-full p-3 text-xs bg-white/90 dark:bg-slate-800/90 border border-ink-soft/20 dark:border-slate-700 rounded-xl text-ink dark:text-slate-100 placeholder:text-ink-soft/50 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
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
                              className="px-3 py-1 text-[11px] font-extrabold text-white bg-violet-600 hover:bg-violet-500 rounded-lg shadow-sm transition-all"
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

        {/* ADD TEACHER MODAL */}
        <AnimatePresence>
          {showAddTeacherModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-white">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-violet-400" />
                    <h3 className="font-extrabold text-base text-white">Add New Teacher Account</h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddTeacherModal(false);
                      setAddTeacherError(null);
                    }}
                  >
                    <X className="h-5 w-5 text-slate-400 hover:text-white" />
                  </button>
                </div>

                {addTeacherError && (
                  <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                    <span>{addTeacherError}</span>
                  </div>
                )}

                <form onSubmit={handleAddTeacherSubmit} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Teacher ID / Username <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTeacherId}
                      onChange={(e) => setNewTeacherId(e.target.value)}
                      placeholder="e.g. teacher4 or prof_smith"
                      required
                      className="w-full p-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-violet-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Full Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTeacherName}
                      onChange={(e) => setNewTeacherName(e.target.value)}
                      placeholder="e.g. Dr. Eleanor Vance"
                      required
                      className="w-full p-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-violet-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Password <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTeacherPassword}
                      onChange={(e) => setNewTeacherPassword(e.target.value)}
                      placeholder="e.g. teacher123"
                      required
                      className="w-full p-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-violet-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Subject(s) / Specialization(s)</label>
                    <input
                      type="text"
                      value={newTeacherSubject}
                      onChange={(e) => setNewTeacherSubject(e.target.value)}
                      placeholder="e.g. Mathematics, Computer Science, Physics"
                      className="w-full p-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-violet-400 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">For multiple subjects, separate with commas (e.g. DCPE, DCS, Computer Engineering).</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={newTeacherEmail}
                      onChange={(e) => setNewTeacherEmail(e.target.value)}
                      placeholder="e.g. eleanor.vance@school.edu"
                      className="w-full p-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-violet-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddTeacherModal(false);
                        setAddTeacherError(null);
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 rounded-xl border border-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-extrabold text-white bg-violet-600 hover:bg-violet-500 rounded-xl shadow-lg shadow-violet-600/30 cursor-pointer"
                    >
                      Create Teacher Account
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* EDIT TEACHER MODAL */}
        <AnimatePresence>
          {teacherToEdit && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-white">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Edit className="h-5 w-5 text-violet-400" />
                    <h3 className="font-extrabold text-base text-white">Edit Faculty Details</h3>
                  </div>
                  <button onClick={() => setTeacherToEdit(null)}>
                    <X className="h-5 w-5 text-slate-400 hover:text-white" />
                  </button>
                </div>

                <form onSubmit={handleSaveTeacherEdit} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editTeacherName}
                      onChange={(e) => setEditTeacherName(e.target.value)}
                      required
                      className="w-full p-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-violet-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Subject(s) / Specialization(s)</label>
                    <input
                      type="text"
                      value={editTeacherSubject}
                      onChange={(e) => setEditTeacherSubject(e.target.value)}
                      placeholder="e.g. Mathematics, Computer Science, Physics"
                      className="w-full p-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-violet-400 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Separate multiple subjects with commas.</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editTeacherEmail}
                      onChange={(e) => setEditTeacherEmail(e.target.value)}
                      placeholder="teacher@school.edu"
                      className="w-full p-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-violet-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setTeacherToEdit(null)}
                      className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 rounded-xl border border-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-extrabold text-white bg-violet-600 hover:bg-violet-500 rounded-xl shadow-lg shadow-violet-600/30 cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DELETE TEACHER MODAL */}
        <AnimatePresence>
          {teacherToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-white">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-rose-400">
                    <Trash2 className="h-5 w-5" />
                    <h3 className="font-extrabold text-base">Delete Teacher Account</h3>
                  </div>
                  <button
                    onClick={() => {
                      setTeacherToDelete(null);
                      setDeletePassword("");
                      setDeletePasswordError(null);
                    }}
                  >
                    <X className="h-5 w-5 text-slate-400 hover:text-white" />
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Are you sure you want to permanently delete the teacher account for{" "}
                    <strong className="text-white">{teacherToDelete.name}</strong> ({teacherToDelete.id})? This action cannot be undone.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    For security verification, please enter your password to authorize account deletion.
                  </p>
                </div>

                {deletePasswordError && (
                  <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                    <span>{deletePasswordError}</span>
                  </div>
                )}

                <form onSubmit={handleConfirmDeleteTeacher} className="space-y-4 pt-1">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Your Account Password <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => {
                        setDeletePassword(e.target.value);
                        setDeletePasswordError(null);
                      }}
                      placeholder="Enter your password..."
                      required
                      autoFocus
                      className="w-full p-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-rose-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setTeacherToDelete(null);
                        setDeletePassword("");
                        setDeletePasswordError(null);
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 rounded-xl border border-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isDeletingTeacher}
                      className="px-5 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/30 cursor-pointer disabled:opacity-50"
                    >
                      {isDeletingTeacher ? "Verifying & Deleting..." : "Yes, Delete Account"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CONFIRM TEACHER VERIFY / REVOKE ACTION WITH PASSWORD MODAL */}
        <AnimatePresence>
          {pendingTeacherAction && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-white">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert
                      className={`h-5 w-5 ${
                        pendingTeacherAction.action === "verify" ? "text-teal-400" : "text-amber-400"
                      }`}
                    />
                    <h3 className="font-extrabold text-base text-white">
                      {pendingTeacherAction.action === "verify" ? "Verify Teacher Account" : "Revoke Teacher Verification"}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setPendingTeacherAction(null);
                      setActionPassword("");
                      setActionPasswordError(null);
                    }}
                  >
                    <X className="h-5 w-5 text-slate-400 hover:text-white" />
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Are you sure you want to{" "}
                    <strong
                      className={
                        pendingTeacherAction.action === "verify"
                          ? "text-teal-300 font-extrabold"
                          : "text-amber-300 font-extrabold"
                      }
                    >
                      {pendingTeacherAction.action === "verify"
                        ? "verify and grant official status to"
                        : "revoke verification for"}
                    </strong>{" "}
                    <span className="text-white font-extrabold">{pendingTeacherAction.teacher.name}</span> (ID:{" "}
                    <span className="font-mono text-slate-300">{pendingTeacherAction.teacher.id}</span>)?
                  </p>
                  <p className="text-[11px] text-slate-400">
                    For security verification, please enter your password to authorize this action.
                  </p>
                </div>

                {actionPasswordError && (
                  <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                    <span>{actionPasswordError}</span>
                  </div>
                )}

                <form onSubmit={handleConfirmTeacherAction} className="space-y-4 pt-1">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Your Account Password <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="password"
                      value={actionPassword}
                      onChange={(e) => {
                        setActionPassword(e.target.value);
                        setActionPasswordError(null);
                      }}
                      placeholder="Enter your password..."
                      required
                      autoFocus
                      className="w-full p-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-violet-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setPendingTeacherAction(null);
                        setActionPassword("");
                        setActionPasswordError(null);
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 rounded-xl border border-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isVerifyingPassword}
                      className={`px-5 py-2 text-xs font-extrabold text-white rounded-xl shadow-lg cursor-pointer flex items-center gap-2 ${
                        pendingTeacherAction.action === "verify"
                          ? "bg-teal-600 hover:bg-teal-500 shadow-teal-600/30"
                          : "bg-amber-600 hover:bg-amber-500 shadow-amber-600/30"
                      }`}
                    >
                      {isVerifyingPassword ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Verifying...
                        </>
                      ) : pendingTeacherAction.action === "verify" ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Confirm & Verify Teacher
                        </>
                      ) : (
                        <>
                          <X className="h-3.5 w-3.5" /> Confirm & Revoke Verification
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* CREATE CLASS SECTION MODAL */}
          {showCreateSectionModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-white">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <School className="h-5 w-5 text-violet-400" />
                    <h3 className="font-extrabold text-base text-white">Create New Class Section</h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateSectionModal(false);
                      setCreateSectionError(null);
                    }}
                  >
                    <X className="h-5 w-5 text-slate-400 hover:text-white" />
                  </button>
                </div>

                <div className="space-y-4">
                  {createSectionError && (
                    <div className="p-3 bg-rose-950/80 border border-rose-500/40 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{createSectionError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Section Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Grade 10 - Section Alpha"
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Course / Subject Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Algebra & Geometry (Optional)"
                      value={newSectionSubject}
                      onChange={(e) => setNewSectionSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Once created, a unique 6-character Join Code will automatically be generated for this section so your students can enroll directly!
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateSectionModal(false);
                      setCreateSectionError(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateSection}
                    className="px-5 py-2 text-xs font-extrabold text-white bg-violet-600 hover:bg-violet-500 rounded-xl shadow-lg shadow-violet-600/30 flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Section</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ADD STUDENT MODAL */}
        <AnimatePresence>
          {showAddStudentModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-white">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-fuchsia-400" />
                    <h3 className="font-extrabold text-base text-white">Add New Student Account</h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddStudentModal(false);
                      setAddStudentError(null);
                    }}
                  >
                    <X className="h-5 w-5 text-slate-400 hover:text-white" />
                  </button>
                </div>

                {addStudentError && (
                  <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                    <span>{addStudentError}</span>
                  </div>
                )}

                <form onSubmit={handleAddStudentSubmit} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Student ID / Username <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newStudentId}
                      onChange={(e) => setNewStudentId(e.target.value)}
                      placeholder="e.g. student101 or alex_r"
                      required
                      className="w-full p-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-fuchsia-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Full Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      placeholder="e.g. Alex Rivera"
                      required
                      className="w-full p-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-fuchsia-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Password <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newStudentPassword}
                      onChange={(e) => setNewStudentPassword(e.target.value)}
                      placeholder="At least 6 characters (e.g. pass123)"
                      required
                      className="w-full p-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-fuchsia-400 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Firebase Auth requires passwords to be at least 6 characters long.</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Assign to Course Section (Optional)
                    </label>
                    <select
                      value={addStudentClassId}
                      onChange={(e) => setAddStudentClassId(e.target.value)}
                      className="w-full p-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-fuchsia-400 focus:outline-none"
                    >
                      <option value="none">None (Unassigned / General Roster)</option>
                      {teacherClasses.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} {cls.subject ? `(${cls.subject})` : ""} - Code: {cls.joinCode}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddStudentModal(false);
                        setAddStudentError(null);
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 rounded-xl border border-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingStudent}
                      className="px-5 py-2 text-xs font-extrabold text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl shadow-lg shadow-fuchsia-600/30 cursor-pointer flex items-center gap-1.5"
                    >
                      {isCreatingStudent ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Creating Account...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5" /> Create Student Account
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* EDIT STUDENT MODAL */}
        <AnimatePresence>
          {studentToEdit && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-white">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Edit className="h-5 w-5 text-fuchsia-400" />
                    <h3 className="font-extrabold text-base text-white">Edit Student Details</h3>
                  </div>
                  <button onClick={() => setStudentToEdit(null)}>
                    <X className="h-5 w-5 text-slate-400 hover:text-white" />
                  </button>
                </div>

                <form onSubmit={handleSaveStudentEdit} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editStudentName}
                      onChange={(e) => setEditStudentName(e.target.value)}
                      required
                      className="w-full p-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-fuchsia-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editStudentEmail}
                      onChange={(e) => setEditStudentEmail(e.target.value)}
                      placeholder="student@school.edu"
                      className="w-full p-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-fuchsia-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setStudentToEdit(null)}
                      className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 rounded-xl border border-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-extrabold text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl shadow-lg shadow-fuchsia-600/30 cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DELETE STUDENT MODAL */}
        <AnimatePresence>
          {studentToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-white">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-rose-400">
                    <Trash2 className="h-5 w-5" />
                    <h3 className="font-extrabold text-base">Delete Student Account</h3>
                  </div>
                  <button onClick={() => setStudentToDelete(null)}>
                    <X className="h-5 w-5 text-slate-400 hover:text-white" />
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Are you sure you want to permanently delete the student account for{" "}
                  <strong className="text-white">{studentToDelete.name}</strong> ({studentToDelete.id})? This action cannot be undone.
                </p>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setStudentToDelete(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 rounded-xl border border-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteStudent}
                    className="px-5 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/30 cursor-pointer"
                  >
                    Yes, Delete Account
                  </button>
                </div>
              </div>
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
        {viewingTeacherProfile && (
          <div className="pt-8 mt-10 border-t border-slate-700/60">
            <TeacherProfile
              teacher={viewingTeacherProfile}
              currentUser={dbUser}
              onClose={() => setViewingTeacherProfile(null)}
              onVerifyToggle={(t) => {
                setPendingTeacherAction({
                  teacher: t,
                  action: t.isApproved ? "revoke" : "verify",
                });
                setActionPassword("");
                setActionPasswordError(null);
              }}
              onEdit={(t) => {
                setTeacherToEdit(t);
                setEditTeacherName(t.name);
                setEditTeacherSubject(t.subject || "");
                setEditTeacherEmail(t.email || "");
              }}
              onDelete={(t) => setTeacherToDelete({ id: t.id, name: t.name })}
              onSelectStudent={(s) => setViewingStudent(s)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
