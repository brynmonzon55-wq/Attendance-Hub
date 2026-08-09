import { useEffect, useState, useMemo } from "react";
import {
  Plus, ArrowLeft, Check, Users, MessageSquare,
  Paperclip, Calendar, Trash2, Send, X, FileText, Megaphone, UserPlus, UserMinus,
  Activity, ClipboardCheck, Copy, School, BookOpen, Clock, Search,
  AlertTriangle, ShieldAlert, CheckCircle2, ChevronRight, UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, ClassRoom, ClassPost, PostComment, AssignmentSubmission, AttendanceRecord, AttendanceStatus } from "../types";
import {
  getClassesForTeacher, getClassesForStudent, getClassById, createClass,
  addStudentToClass, removeStudentFromClass, joinClassByCode,
  deleteClass, getPostsForClass, createPost, deletePost, getCommentsForPost,
  addComment, getSubmissionsForPost, getSubmissionForStudent, submitAssignment,
  getClassmatesWithStats, getUsers, getAttendanceRecords, saveAttendanceRecord, attendanceMatchesClass, formatDate,
} from "../lib/db";

const MAX_ATTACHMENT_BYTES = 700 * 1024; // stored inline in Firestore docs

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Subject Color Scheme & Icon helper for daylight register aesthetic */
function getSubjectTheme(subject?: string) {
  const s = (subject || "").toLowerCase();
  if (s.includes("math") || s.includes("calc") || s.includes("alg") || s.includes("geom")) {
    return {
      gradient: "from-blue-600/10 via-blue-600/5 to-gray-50",
      badgeBg: "bg-blue-50 text-blue-600 border-blue-200",
      accentHex: "#00f0ff",
      icon: "📐",
    };
  }
  if (s.includes("sci") || s.includes("phys") || s.includes("chem") || s.includes("bio")) {
    return {
      gradient: "from-green-600/10 via-green-600/5 to-gray-50",
      badgeBg: "bg-green-50 text-green-600 border-green-200",
      accentHex: "#10b981",
      icon: "🧬",
    };
  }
  if (s.includes("tech") || s.includes("comp") || s.includes("code") || s.includes("prog") || s.includes("cs")) {
    return {
      gradient: "from-blue-600/10 via-blue-600/5 to-gray-50",
      badgeBg: "bg-blue-50 text-blue-600 border-blue-200",
      accentHex: "#8b5cf6",
      icon: "💻",
    };
  }
  if (s.includes("lit") || s.includes("eng") || s.includes("read") || s.includes("lang")) {
    return {
      gradient: "from-amber-500/10 via-amber-500/5 to-gray-50",
      badgeBg: "bg-amber-50 text-amber-600 border-amber-200",
      accentHex: "#f59e0b",
      icon: "📚",
    };
  }
  if (s.includes("hist") || s.includes("soc") || s.includes("geog") || s.includes("civic")) {
    return {
      gradient: "from-red-500/10 via-red-500/5 to-gray-50",
      badgeBg: "bg-red-50 text-red-500 border-red-200",
      accentHex: "#f43f5e",
      icon: "🏛️",
    };
  }
  return {
    gradient: "from-blue-600/10 via-blue-600/5 to-gray-50",
    badgeBg: "bg-blue-50 text-blue-600 border-blue-200",
    accentHex: "#d946ef",
    icon: "🏫",
  };
}

interface ClassroomProps {
  currentUser: User;
  onOpenAttendance?: (classId: string) => void;
}

export default function Classroom({ currentUser, onOpenAttendance }: ClassroomProps) {
  const isTeacher = currentUser.role === "teacher";
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [, setRefreshTick] = useState(0);
  const bumpRefresh = () => setRefreshTick((n) => n + 1);

  const load = () => {
    setClasses(isTeacher ? getClassesForTeacher(currentUser.id) : getClassesForStudent(currentUser.id));
  };

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("db_updated", handler);
    return () => window.removeEventListener("db_updated", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  const selectedClass = selectedClassId ? getClassById(selectedClassId) : undefined;

  if (selectedClass) {
    return (
      <ClassDetail
        currentUser={currentUser}
        cls={selectedClass}
        onBack={() => setSelectedClassId(null)}
        onDeleted={() => { setSelectedClassId(null); load(); }}
        onChanged={bumpRefresh}
        onOpenAttendance={onOpenAttendance}
      />
    );
  }

  return (
    <ClassList
      currentUser={currentUser}
      classes={classes}
      onOpen={(id) => setSelectedClassId(id)}
      onChanged={load}
    />
  );
}

// ---------------------------------------------------------------------------
// 1. ClassList: Course Sections Grid & Join / Create Controls
// ---------------------------------------------------------------------------

function ClassList({
  currentUser,
  classes,
  onOpen,
  onChanged,
}: {
  currentUser: User;
  classes: ClassRoom[];
  onOpen: (id: string) => void;
  onChanged: () => void;
}) {
  const isTeacher = currentUser.role === "teacher";
  const [showCreate, setShowCreate] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCreate = () => {
    if (!name.trim()) {
      setError("Class section name is required.");
      return;
    }
    createClass(name, subject, currentUser);
    onChanged();
    setName("");
    setSubject("");
    setShowCreate(false);
    setError("");
  };

  const handleJoin = () => {
    if (!joinCodeInput.trim()) {
      setError("Please enter a class join code.");
      return;
    }
    try {
      joinClassByCode(joinCodeInput, currentUser);
      onChanged();
      setJoinCodeInput("");
      setShowJoinModal(false);
      setError("");
    } catch {
      setError("Invalid or expired class join code. Check with your teacher.");
    }
  };

  const copyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-bold mb-1">
            <School className="h-3.5 w-3.5" />
            <span>Course Sections & Academic Subjects</span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            {isTeacher ? "Your Teaching Sections" : "Enrolled Class Sections"}
          </h2>
          <p className="text-xs font-medium text-gray-400 max-w-xl">
            {isTeacher
              ? "Manage distinct subject sections, post announcements, issue assignments, and track attendance per course section."
              : "Access your enrolled subjects, section feeds, homework submissions, and attendance logs."}
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 shrink-0">
          {isTeacher ? (
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Section</span>
            </button>
          ) : (
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <School className="h-4 w-4" />
              <span>Join Class by Code</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {classes.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 text-blue-600 flex items-center justify-center mx-auto border border-gray-200">
            <BookOpen className="h-8 w-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-gray-900">No active class sections found</h3>
            <p className="text-xs text-gray-400">
              {isTeacher
                ? "Get started by creating your first course section above (e.g., Grade 10 - Mathematics)."
                : "Ask your teacher for a class join code or to add your student ID to their section."}
            </p>
          </div>
          {isTeacher ? (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="h-4 w-4" /> Create First Section
            </button>
          ) : (
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <School className="h-4 w-4" /> Enter Join Code
            </button>
          )}
        </div>
      )}

      {/* Class Section Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {classes.map((cls) => {
          const theme = getSubjectTheme(cls.subject);
          const studentCount = cls.studentIds.length;
          const stats = getClassmatesWithStats(cls.id);
          const totalDays = stats.reduce((acc, curr) => acc + curr.stats.totalDays, 0);
          const totalPresents = stats.reduce((acc, curr) => acc + curr.stats.presentCount, 0);
          const avgAttendance = totalDays > 0 ? Math.round((totalPresents / totalDays) * 100) : 100;

          return (
            <motion.div
              key={cls.id}
              whileHover={{ y: -4, scale: 1.01 }}
              onClick={() => onOpen(cls.id)}
              className={`bg-gradient-to-b ${theme.gradient} border border-gray-200 hover:border-blue-300 rounded-3xl p-5 shadow-sm transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden`}
            >
              <div className="space-y-4">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xl">{theme.icon}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${theme.badgeBg}`}>
                        {cls.subject || "General Subject"}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                      {cls.name}
                    </h3>
                  </div>

                  <div className="p-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 group-hover:text-gray-900 group-hover:border-blue-300 transition-all shrink-0">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>

                {/* Sub Metadata */}
                <div className="text-xs text-gray-400 space-y-1">
                  {!isTeacher && (
                    <p className="flex items-center gap-1.5 text-gray-500 font-semibold">
                      <Users className="h-3.5 w-3.5 text-blue-600" />
                      <span>Instructor: {cls.teacherName}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-[11px] pt-1">
                    <span className="inline-flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 font-bold">
                      <Users className="h-3 w-3 text-blue-600" /> {studentCount} Enrolled
                    </span>
                    <span className="inline-flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200 text-green-600 font-bold">
                      <Activity className="h-3 w-3 text-green-600" /> {avgAttendance}% Health
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer with Join Code Widget */}
              <div className="pt-4 mt-4 border-t border-gray-200 flex items-center justify-between gap-2 text-xs">
                <button
                  onClick={(e) => copyCode(cls.joinCode, e)}
                  className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 hover:border-blue-300 text-blue-600 font-mono text-[11px] font-bold flex items-center gap-1.5 transition-all"
                  title="Click to copy section join code"
                >
                  <Copy className="h-3 w-3 text-blue-600" />
                  <span>{copiedCode === cls.joinCode ? "Copied!" : `Code: ${cls.joinCode}`}</span>
                </button>

                <span className="text-[11px] font-bold text-blue-600 group-hover:underline flex items-center gap-1">
                  View Stream & Roster &rarr;
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Create Section Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={() => setShowCreate(false)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-gray-200 rounded-3xl shadow-2xl p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <School className="h-5 w-5 text-blue-600" /> Create Course Section
              </h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-900"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Section / Class Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Grade 10 - Section Alpha"
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl bg-white border border-gray-200 text-gray-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Subject / Course Title</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Mathematics / Computer Science"
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl bg-white border border-gray-200 text-gray-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-500 font-bold">{error}</p>}

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-sm"
              >
                Create Section
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Join Section Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center p-4 z-50" onClick={() => setShowJoinModal(false)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-gray-200 rounded-3xl shadow-2xl p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <School className="h-5 w-5 text-blue-600" /> Join Class Section
              </h3>
              <button onClick={() => setShowJoinModal(false)} className="text-gray-400 hover:text-gray-900"><X className="h-5 w-5" /></button>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Class Join Code</label>
              <input
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. MATH101-X9"
                className="w-full px-3.5 py-2.5 text-xs font-mono font-bold tracking-widest rounded-xl bg-white border border-gray-200 text-blue-600 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-gray-400 mt-1">Ask your teacher for the 6-character join code.</p>
            </div>

            {error && <p className="text-xs text-red-500 font-bold">{error}</p>}

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleJoin}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-sm"
              >
                Join Section
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. ClassDetail: Section View with Sub-Tabs (Stream, Attendance, Assignments, Roster)
// ---------------------------------------------------------------------------

function ClassDetail({
  currentUser,
  cls,
  onBack,
  onDeleted,
  onChanged,
  onOpenAttendance,
}: {
  currentUser: User;
  cls: ClassRoom;
  onBack: () => void;
  onDeleted: () => void;
  onChanged: () => void;
  onOpenAttendance?: (classId: string) => void;
}) {
  const isTeacher = currentUser.role === "teacher";
  const [tab, setTab] = useState<"stream" | "attendance" | "assignments" | "roster">("stream");
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [atRiskCount, setAtRiskCount] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const today = formatDate(new Date());
      setTodayRecords(getAttendanceRecords().filter((r) => r.date === today && attendanceMatchesClass(r, cls)));
      if (isTeacher) {
        const below = getClassmatesWithStats(cls.id).filter((row) => row.stats.totalDays > 0 && row.stats.percentage < 75);
        setAtRiskCount(below.length);
      }
    };
    refresh();
    window.addEventListener("db_updated", refresh);
    return () => window.removeEventListener("db_updated", refresh);
  }, [cls.id, isTeacher]);

  const presentT = todayRecords.filter((r) => r.status === "Present").length;
  const lateT = todayRecords.filter((r) => r.status === "Late").length;
  const absentT = todayRecords.filter((r) => r.status === "Absent").length;
  const myToday = !isTeacher ? todayRecords.find((r) => r.studentId.toLowerCase() === currentUser.id.toLowerCase()) : undefined;

  const theme = getSubjectTheme(cls.subject);

  const copyJoinCode = () => {
    navigator.clipboard.writeText(cls.joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDeleteClass = () => {
    if (!confirm(`Delete section "${cls.name}"? This removes the section, posts, homework, and logs permanently.`)) return;
    deleteClass(cls.id);
    onDeleted();
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" /> Back to All Course Sections
      </button>

      {/* Hero Banner Header Card */}
      <div className={`bg-gradient-to-r ${theme.gradient} border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden space-y-6`}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl">{theme.icon}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${theme.badgeBg}`}>
                {cls.subject || "General Section"}
              </span>
              <button
                onClick={copyJoinCode}
                className="px-3 py-1 rounded-full bg-white border border-gray-200 hover:border-blue-300 text-blue-600 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5 text-blue-600" />
                <span>{copiedCode ? "Copied!" : `Join Code: ${cls.joinCode}`}</span>
              </button>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{cls.name}</h1>
            <p className="text-xs text-gray-500 font-medium">
              Teacher: <span className="font-bold text-gray-900">{cls.teacherName}</span> &bull; Enrolled: <span className="font-bold text-gray-900">{cls.studentIds.length} Students</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isTeacher && (
              <>
                <button
                  onClick={() => setTab("attendance")}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-sm flex items-center gap-2 cursor-pointer transition-all"
                >
                  <ClipboardCheck className="h-4 w-4" /> Mark Attendance
                </button>
                <button
                  onClick={handleDeleteClass}
                  title="Delete Section"
                  className="p-2.5 rounded-xl bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 border border-gray-200 transition-all cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Today's Section Attendance Health Bar */}
        <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-500">Today's Attendance:</span>
            {isTeacher ? (
              <>
                <span className="px-2.5 py-1 rounded-lg bg-green-50 border border-green-200 text-green-600 font-bold">
                  {presentT} Present
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 font-bold">
                  {lateT} Late
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-500 font-bold">
                  {absentT} Absent
                </span>
                <span className="text-gray-400 text-[11px]">of {cls.studentIds.length} students</span>
              </>
            ) : myToday ? (
              <span className={`px-3 py-1 rounded-lg border font-extrabold ${
                myToday.status === "Present" ? "bg-green-50 border-green-200 text-green-600" : myToday.status === "Late" ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-red-50 border-red-200 text-red-500"
              }`}>
                Your Status: {myToday.status}
              </span>
            ) : (
              <span className="text-gray-400">Not recorded yet today</span>
            )}
          </div>

          {isTeacher && atRiskCount > 0 && (
            <div className="flex items-center gap-1.5 text-red-500 font-bold text-xs bg-red-50 px-3 py-1 rounded-lg border border-red-200">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{atRiskCount} student(s) below 75% attendance</span>
            </div>
          )}
        </div>
      </div>

      {/* Sub Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        {[
          { id: "stream", label: "Class Feed & Activity", icon: Activity },
          { id: "attendance", label: "Section Attendance Sheet", icon: ClipboardCheck },
          { id: "assignments", label: "Assignments & Submissions", icon: FileText },
          { id: "roster", label: "Enrolled Roster", icon: Users, count: cls.studentIds.length },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-50 border border-gray-200 text-gray-400 hover:text-gray-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full bg-gray-100 text-[10px] font-mono text-gray-500">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SUB TAB CONTENTS */}
      {tab === "stream" && <ClassLog currentUser={currentUser} cls={cls} />}
      {tab === "attendance" && <SectionAttendanceSheet cls={cls} currentUser={currentUser} />}
      {tab === "assignments" && <PostsPanel currentUser={currentUser} cls={cls} filterType="assignment" />}
      {tab === "roster" && <Classmates cls={cls} isTeacher={isTeacher} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Section Attendance Sheet (Direct In-Class Section Attendance Marker)
// ---------------------------------------------------------------------------

function SectionAttendanceSheet({ cls, currentUser }: { cls: ClassRoom; currentUser: User }) {
  const isTeacher = currentUser.role === "teacher";
  const todayStr = formatDate(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [students, setStudents] = useState(getClassmatesWithStats(cls.id));
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    const records = getAttendanceRecords().filter((r) => r.date === selectedDate && attendanceMatchesClass(r, cls));
    const initialMap: Record<string, AttendanceStatus> = {};
    records.forEach((r) => {
      initialMap[r.studentId.toLowerCase()] = r.status;
    });
    setStatuses(initialMap);
    setStudents(getClassmatesWithStats(cls.id));
  }, [cls, selectedDate]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (!isTeacher) return;
    setStatuses((prev) => ({ ...prev, [studentId.toLowerCase()]: status }));
  };

  const markAllPresent = () => {
    if (!isTeacher) return;
    const nextMap: Record<string, AttendanceStatus> = {};
    students.forEach(({ student }) => {
      nextMap[student.id.toLowerCase()] = "Present";
    });
    setStatuses(nextMap);
  };

  const handleSave = () => {
    if (!isTeacher) return;
    students.forEach(({ student }) => {
      saveAttendanceRecord({
        id: `${cls.id}_${student.id}_${selectedDate}`,
        studentId: student.id,
        studentName: student.name,
        date: selectedDate,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: statuses[student.id.toLowerCase()] || "Present",
        subject: cls.subject || cls.name,
        classId: cls.id,
      });
    });
    setSavedMsg("Attendance successfully recorded for this section!");
    setTimeout(() => setSavedMsg(""), 3000);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-blue-600" /> Section Attendance Log
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Mark daily attendance for enrolled students in <span className="text-gray-900 font-bold">{cls.name}</span>.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-white border border-gray-200 text-gray-900 focus:outline-none focus:border-blue-500 [color-scheme:light]"
          />

          {isTeacher && (
            <>
              <button
                onClick={markAllPresent}
                className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-green-600 font-bold text-xs transition-colors cursor-pointer"
              >
                Mark All Present
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-extrabold text-xs shadow-sm cursor-pointer"
              >
                Save Attendance
              </button>
            </>
          )}
        </div>
      </div>

      {savedMsg && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-600 text-xs font-bold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {students.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-xs">No students enrolled in this section yet.</div>
      ) : (
        <div className="space-y-2">
          {students.map(({ student, stats }) => {
            const currentStatus = statuses[student.id.toLowerCase()] || "Present";
            return (
              <div
                key={student.id}
                className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0">
                    {student.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{student.name}</p>
                    <p className="text-[11px] text-gray-400">
                      ID: {student.id} &bull; Overall: {stats.percentage}%
                    </p>
                  </div>
                </div>

                {isTeacher ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(["Present", "Late", "Absent"] as AttendanceStatus[]).map((st) => {
                      const active = currentStatus === st;
                      const colors =
                        st === "Present"
                          ? active
                            ? "bg-green-600 text-white font-extrabold"
                            : "bg-white text-gray-400 hover:text-green-600 border border-gray-200"
                          : st === "Late"
                          ? active
                            ? "bg-amber-500 text-gray-900 font-extrabold"
                            : "bg-white text-gray-400 hover:text-amber-500 border border-gray-200"
                          : active
                          ? "bg-red-500 text-white font-extrabold"
                          : "bg-white text-gray-400 hover:text-red-500 border border-gray-200";

                      return (
                        <button
                          key={st}
                          onClick={() => handleStatusChange(student.id, st)}
                          className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${colors}`}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold ${
                      currentStatus === "Present"
                        ? "bg-green-50 border border-green-200 text-green-600"
                        : currentStatus === "Late"
                        ? "bg-amber-50 border border-amber-200 text-amber-600"
                        : "bg-red-50 border border-red-200 text-red-500"
                    }`}
                  >
                    {currentStatus}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. ClassLog (Combined Feed & Composer)
// ---------------------------------------------------------------------------

type LogEntry =
  | { kind: "post"; ts: number; post: ClassPost }
  | { kind: "attendance"; ts: number; date: string; present: number; late: number; absent: number; total: number; records: AttendanceRecord[] };

function buildAttendanceEntries(cls: ClassRoom): LogEntry[] {
  const records = getAttendanceRecords().filter((r) => attendanceMatchesClass(r, cls));
  const byDate = new Map<string, AttendanceRecord[]>();
  records.forEach((r) => {
    byDate.set(r.date, [...(byDate.get(r.date) || []), r]);
  });
  return Array.from(byDate.entries()).map(([date, recs]) => ({
    kind: "attendance" as const,
    ts: new Date(`${date}T12:00:00`).getTime(),
    date,
    present: recs.filter((r) => r.status === "Present").length,
    late: recs.filter((r) => r.status === "Late").length,
    absent: recs.filter((r) => r.status === "Absent").length,
    total: recs.length,
    records: recs,
  }));
}

function ClassLog({ currentUser, cls }: { currentUser: User; cls: ClassRoom }) {
  const isTeacher = currentUser.role === "teacher";
  const [posts, setPosts] = useState<ClassPost[]>(getPostsForClass(cls.id));
  const [attendanceEntries, setAttendanceEntries] = useState<LogEntry[]>(() => buildAttendanceEntries(cls));
  const [showComposer, setShowComposer] = useState(false);
  const [postType, setPostType] = useState<"announcement" | "assignment">("announcement");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [attachment, setAttachment] = useState<{ name: string; dataUrl: string } | null>(null);
  const [fileError, setFileError] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setPosts(getPostsForClass(cls.id));
      setAttendanceEntries(buildAttendanceEntries(cls));
    };
    refresh();
    window.addEventListener("db_updated", refresh);
    return () => window.removeEventListener("db_updated", refresh);
  }, [cls.id]);

  const handleFile = async (file: File | undefined) => {
    setFileError("");
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setFileError("File is too large (max ~700KB). Try a smaller image or file.");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setAttachment({ name: file.name, dataUrl });
  };

  const resetComposer = () => {
    setTitle("");
    setContent("");
    setDueDate("");
    setAttachment(null);
    setFileError("");
    setShowComposer(false);
  };

  const handlePost = () => {
    if (posting) return;
    if (!content.trim() && !title.trim()) return;
    setPosting(true);
    createPost({
      classId: cls.id,
      type: postType,
      authorId: currentUser.id,
      authorName: currentUser.name,
      title: postType === "assignment" ? title.trim() : undefined,
      content: content.trim(),
      dueDate: postType === "assignment" && dueDate ? dueDate : undefined,
      attachmentName: attachment?.name,
      attachmentDataUrl: attachment?.dataUrl,
    });
    setPosts(getPostsForClass(cls.id));
    resetComposer();
    setPosting(false);
  };

  const entries: LogEntry[] = [
    ...posts.map((post) => ({ kind: "post" as const, ts: new Date(post.createdAt).getTime(), post })),
    ...attendanceEntries,
  ].sort((a, b) => b.ts - a.ts);

  return (
    <div className="space-y-4">
      {isTeacher && !showComposer && (
        <div className="bg-white border border-gray-200 rounded-3xl p-4 flex gap-3">
          <button
            onClick={() => { setPostType("announcement"); setShowComposer(true); }}
            className="flex-1 inline-flex items-center justify-center gap-2 text-xs font-extrabold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 py-3 rounded-2xl transition-all cursor-pointer"
          >
            <Megaphone className="h-4 w-4" /> Post Announcement
          </button>
          <button
            onClick={() => { setPostType("assignment"); setShowComposer(true); }}
            className="flex-1 inline-flex items-center justify-center gap-2 text-xs font-extrabold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 py-3 rounded-2xl transition-all cursor-pointer"
          >
            <FileText className="h-4 w-4" /> Create Assignment
          </button>
        </div>
      )}

      {isTeacher && showComposer && (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h4 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
              {postType === "assignment" ? <FileText className="h-4 w-4 text-blue-600" /> : <Megaphone className="h-4 w-4 text-blue-600" />}
              {postType === "assignment" ? "New Class Homework / Assignment" : "New Class Announcement"}
            </h4>
            <button onClick={resetComposer} className="text-gray-400 hover:text-gray-900"><X className="h-4 w-4" /></button>
          </div>

          {postType === "assignment" && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Assignment Title (e.g., Chapter 4 Calculus Problem Set)"
              className="w-full px-4 py-2.5 text-xs font-bold rounded-xl bg-white border border-gray-200 text-gray-900 focus:outline-none focus:border-blue-500"
            />
          )}

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={postType === "assignment" ? "Write submission guidelines & instructions..." : "Share an update with your class..."}
            rows={3}
            className="w-full px-4 py-2.5 text-xs font-medium rounded-xl bg-white border border-gray-200 text-gray-900 focus:outline-none focus:border-blue-500 resize-none"
          />

          <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
            <div className="flex items-center gap-4 flex-wrap">
              {postType === "assignment" && (
                <label className="text-xs font-bold text-gray-500 inline-flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-blue-600" /> Due Date:
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-gray-200 text-gray-900 focus:outline-none focus:border-blue-500 [color-scheme:light]"
                  />
                </label>
              )}

              <label className="text-xs font-bold text-gray-500 inline-flex items-center gap-1.5 cursor-pointer hover:text-blue-600">
                <Paperclip className="h-3.5 w-3.5 text-blue-600" />
                <span>{attachment ? attachment.name : "Attach File / Image"}</span>
                <input type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
              </label>

              {attachment && (
                <button onClick={() => setAttachment(null)} className="text-xs text-red-500 font-bold">Remove</button>
              )}
            </div>

            <button
              onClick={handlePost}
              disabled={posting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-sm cursor-pointer"
            >
              {posting ? "Posting..." : "Publish to Class"}
            </button>
          </div>

          {fileError && <p className="text-xs text-red-500 font-bold">{fileError}</p>}
        </div>
      )}

      {entries.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-3xl p-10 text-center space-y-2">
          <Megaphone className="h-8 w-8 text-gray-400 mx-auto" />
          <p className="text-xs text-gray-400">No activity logged in this section yet.</p>
        </div>
      )}

      {entries.map((entry) =>
        entry.kind === "post" ? (
          <PostCard
            key={entry.post.id}
            post={entry.post}
            currentUser={currentUser}
            isTeacher={isTeacher}
            onDeleted={() => setPosts(getPostsForClass(cls.id))}
          />
        ) : (
          <AttendanceLogCard key={`attendance-${entry.date}`} entry={entry} isTeacher={isTeacher} currentUser={currentUser} />
        )
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. PostsPanel (Announcements / Assignments Feed Component)
// ---------------------------------------------------------------------------

export function PostsPanel({
  currentUser,
  cls,
  filterType,
  emptyText,
}: {
  currentUser: User;
  cls: ClassRoom | undefined;
  filterType: "announcement" | "assignment";
  emptyText?: string;
}) {
  const isTeacher = currentUser.role === "teacher";
  const [posts, setPosts] = useState<ClassPost[]>(cls ? getPostsForClass(cls.id) : []);

  useEffect(() => {
    if (cls) setPosts(getPostsForClass(cls.id));
  }, [cls]);

  const filtered = posts.filter((p) => p.type === filterType);

  return (
    <div className="space-y-4">
      {filtered.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-3xl p-10 text-center space-y-2">
          <FileText className="h-8 w-8 text-gray-400 mx-auto" />
          <p className="text-xs text-gray-400">
            {emptyText || `No ${filterType}s posted yet for this course section.`}
          </p>
        </div>
      ) : (
        filtered.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUser={currentUser}
            isTeacher={isTeacher}
            onDeleted={() => cls && setPosts(getPostsForClass(cls.id))}
          />
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. PostCard (Card item for announcements and assignments)
// ---------------------------------------------------------------------------

function PostCard({
  post,
  currentUser,
  isTeacher,
  onDeleted,
}: {
  post: ClassPost;
  currentUser: User;
  isTeacher: boolean;
  onDeleted: () => void;
}) {
  const isAssignment = post.type === "assignment";
  const [comments, setComments] = useState<PostComment[]>(getCommentsForPost(post.id));
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>(isAssignment ? getSubmissionsForPost(post.id) : []);
  const [commentText, setCommentText] = useState("");
  const [submitText, setSubmitText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitAttachment, setSubmitAttachment] = useState<{ name: string; dataUrl: string } | null>(null);
  const [fileError, setFileError] = useState("");

  const mySubmission = !isTeacher && isAssignment ? getSubmissionForStudent(post.id, currentUser.id) : undefined;

  const handleComment = () => {
    if (!commentText.trim()) return;
    addComment({
      postId: post.id,
      authorId: currentUser.id,
      authorName: currentUser.name,
      content: commentText.trim(),
    });
    setComments(getCommentsForPost(post.id));
    setCommentText("");
  };

  const handleFile = async (file: File | undefined) => {
    setFileError("");
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setFileError("File too large (max ~700KB).");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setSubmitAttachment({ name: file.name, dataUrl });
  };

  const handleSubmitWork = () => {
    submitAssignment({
      postId: post.id,
      studentId: currentUser.id,
      studentName: currentUser.name,
      content: submitText.trim(),
      attachmentName: submitAttachment?.name,
      attachmentDataUrl: submitAttachment?.dataUrl,
    });
    setSubmissions(getSubmissionsForPost(post.id));
    setShowSubmitForm(false);
    setSubmitText("");
    setSubmitAttachment(null);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                isAssignment
                  ? "bg-blue-50 text-blue-600 border-blue-200"
                  : "bg-blue-50 text-blue-600 border-blue-200"
              }`}
            >
              {isAssignment ? "Assignment / Homework" : "Announcement"}
            </span>
            <span className="text-[11px] text-gray-400 font-medium">{timeAgo(post.createdAt)}</span>
          </div>

          {post.title && <h4 className="text-base font-extrabold text-gray-900">{post.title}</h4>}
          <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">{post.content}</p>

          {post.dueDate && (
            <p className="text-xs font-bold text-amber-500 flex items-center gap-1 mt-1">
              <Clock className="h-3.5 w-3.5" /> Due: {formatDate(new Date(post.dueDate))}
            </p>
          )}

          {post.attachmentDataUrl && (
            <div className="pt-2">
              <a
                href={post.attachmentDataUrl}
                download={post.attachmentName || "attachment"}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-blue-600 text-xs font-bold hover:border-blue-300 transition-all"
              >
                <Paperclip className="h-3.5 w-3.5 text-blue-600" />
                <span>Download Attachment ({post.attachmentName})</span>
              </a>
            </div>
          )}
        </div>

        {isTeacher && (
          <button
            onClick={() => { deletePost(post.id); onDeleted(); }}
            className="p-2 rounded-xl bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-500 border border-gray-200 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Student Submission Controls */}
      {isAssignment && !isTeacher && (
        <div className="pt-3 border-t border-gray-200">
          {mySubmission ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between gap-2 text-xs">
              <span className="text-green-600 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-600" /> Turned in on {formatDate(new Date(mySubmission.submittedAt))}
              </span>
            </div>
          ) : (
            <div>
              {!showSubmitForm ? (
                <button
                  onClick={() => setShowSubmitForm(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md cursor-pointer"
                >
                  Turn In Homework
                </button>
              ) : (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                  <textarea
                    value={submitText}
                    onChange={(e) => setSubmitText(e.target.value)}
                    placeholder="Add student submission notes..."
                    rows={2}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-gray-200 text-gray-900 focus:outline-none"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5 cursor-pointer hover:text-blue-600">
                      <Paperclip className="h-3.5 w-3.5 text-blue-600" />
                      <span>{submitAttachment ? submitAttachment.name : "Attach File"}</span>
                      <input type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                    </label>

                    <div className="flex gap-2">
                      <button onClick={() => setShowSubmitForm(false)} className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-500 font-bold text-xs">Cancel</button>
                      <button onClick={handleSubmitWork} className="px-4 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs">Submit</button>
                    </div>
                  </div>
                  {fileError && <p className="text-xs text-red-500 font-bold">{fileError}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Teacher View Submissions */}
      {isAssignment && isTeacher && (
        <div className="pt-2">
          <button
            onClick={() => setShowSubmissions((v) => !v)}
            className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
          >
            {submissions.length} Turn-in Submission(s) {showSubmissions ? "▲" : "▼"}
          </button>

          {showSubmissions && (
            <div className="mt-3 space-y-2">
              {submissions.length === 0 ? (
                <p className="text-xs text-gray-500">No student work submitted yet.</p>
              ) : (
                submissions.map((s) => (
                  <div key={s.id} className="p-3 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-bold text-gray-900">{s.studentName}</p>
                      {s.content && <p className="text-gray-400">{s.content}</p>}
                    </div>
                    {s.attachmentDataUrl && (
                      <a href={s.attachmentDataUrl} download={s.attachmentName} className="text-blue-600 hover:underline flex items-center gap-1">
                        <Paperclip className="h-3.5 w-3.5" /> Download
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Comments Section */}
      <div className="pt-3 border-t border-gray-200">
        <button
          onClick={() => setShowComments((v) => !v)}
          className="text-xs font-bold text-gray-400 hover:text-gray-900 flex items-center gap-1.5 cursor-pointer"
        >
          <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
          <span>{comments.length} Class Comment(s)</span>
        </button>

        {showComments && (
          <div className="mt-3 space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-600">{c.authorName}</span>
                  <span className="text-[10px] text-gray-500">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-gray-500">{c.content}</p>
              </div>
            ))}

            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                placeholder="Add a class comment..."
                className="flex-1 px-3.5 py-2 text-xs font-medium rounded-xl bg-white border border-gray-200 text-gray-900 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleComment}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7. Attendance Log Card item
// ---------------------------------------------------------------------------

function AttendanceLogCard({ entry }: { entry: LogEntry & { kind: "attendance" }; isTeacher: boolean; currentUser: User }) {
  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-green-50 text-green-600 border border-green-200">
          Daily Attendance Recorded
        </span>
        <span className="text-xs text-gray-400 font-bold">{entry.date}</span>
      </div>

      <div className="flex items-center gap-3 text-xs flex-wrap">
        <span className="px-3 py-1 rounded-xl bg-green-50 border border-green-200 text-green-600 font-extrabold">
          {entry.present} Present
        </span>
        <span className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 font-extrabold">
          {entry.late} Late
        </span>
        <span className="px-3 py-1 rounded-xl bg-red-50 border border-red-200 text-red-500 font-extrabold">
          {entry.absent} Absent
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 8. Classmates / Roster Management
// ---------------------------------------------------------------------------

function Classmates({ cls, isTeacher }: { cls: ClassRoom; isTeacher: boolean }) {
  const [rows, setRows] = useState(getClassmatesWithStats(cls.id));
  const [addId, setAddId] = useState("");
  const [addError, setAddError] = useState("");

  useEffect(() => {
    const refresh = () => setRows(getClassmatesWithStats(cls.id));
    refresh();
    window.addEventListener("db_updated", refresh);
    return () => window.removeEventListener("db_updated", refresh);
  }, [cls.id]);

  const handleAdd = () => {
    const trimmed = addId.trim();
    if (!trimmed) return;
    const match = getUsers().find((u) => u.role === "student" && u.id.toLowerCase() === trimmed.toLowerCase());
    if (!match) {
      setAddError("No student registered with that ID.");
      return;
    }
    addStudentToClass(cls.id, match.id);
    setRows(getClassmatesWithStats(cls.id));
    setAddId("");
    setAddError("");
  };

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" /> Enrolled Section Roster
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Students currently enrolled in <span className="text-gray-900 font-bold">{cls.name}</span>.
          </p>
        </div>

        {isTeacher && (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={addId}
              onChange={(e) => setAddId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Enter Student ID (e.g. student101)"
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white border border-gray-200 text-gray-900 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleAdd}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md cursor-pointer"
            >
              Enroll Student
            </button>
          </div>
        )}
      </div>

      {addError && <p className="text-xs text-red-500 font-bold">{addError}</p>}

      {rows.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-xs">No students enrolled in this section yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map(({ student, stats }) => (
            <div
              key={student.id}
              className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 font-black text-sm flex items-center justify-center shrink-0">
                  {student.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{student.name}</p>
                  <p className="text-[11px] text-gray-400">
                    Attendance: <span className="text-green-600 font-bold">{stats.percentage}%</span> &bull; ({stats.presentCount}P / {stats.lateCount}L / {stats.absentCount}A)
                  </p>
                </div>
              </div>

              {isTeacher && (
                <button
                  onClick={() => { removeStudentFromClass(cls.id, student.id); setRows(getClassmatesWithStats(cls.id)); }}
                  className="p-2 rounded-xl bg-white hover:bg-red-50 text-gray-500 hover:text-red-500 border border-gray-200 cursor-pointer"
                  title="Remove student from section"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 9. ClassesPanel Export for flat standalone views
// ---------------------------------------------------------------------------

export function ClassesPanel({ currentUser }: { currentUser: User }) {
  return <Classroom currentUser={currentUser} />;
}
