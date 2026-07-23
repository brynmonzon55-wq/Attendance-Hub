import { useEffect, useState } from "react";
import {
  Plus, ArrowLeft, Check, Users, MessageSquare,
  Paperclip, Calendar, Trash2, Send, X, FileText, Megaphone, UserPlus, UserMinus,
  Activity, ListChecks, ChevronDown, ChevronRight, AlertTriangle, ClipboardCheck
} from "lucide-react";
import { User, ClassRoom, ClassPost, PostComment, AssignmentSubmission, AttendanceRecord } from "../types";
import {
  getClassesForTeacher, getClassesForStudent, getClassById, createClass,
  addStudentToClass, removeStudentFromClass,
  deleteClass, getPostsForClass, createPost, deletePost, getCommentsForPost,
  addComment, getSubmissionsForPost, getSubmissionForStudent, submitAssignment,
  getClassmatesWithStats, getUsers, getAttendanceRecords, attendanceMatchesClass, formatDate,
} from "../lib/db";

const MAX_ATTACHMENT_BYTES = 700 * 1024; // stored inline in Firestore docs - keep small

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

interface ClassroomProps {
  currentUser: User;
  // Lets the host dashboard (teacher) jump straight to the attendance-taking
  // tab for a given class, e.g. from a "Take attendance" button in the
  // class header - keeps Classroom from being an island cut off from the
  // rest of the app.
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
// List of classes + create (teacher) / join (student)
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
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [error, setError] = useState("");

  const handleCreate = () => {
    if (!name.trim()) {
      setError("Class name is required.");
      return;
    }
    createClass(name, subject, currentUser);
    onChanged();
    setName("");
    setSubject("");
    setShowCreate(false);
    setError("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-ink">Classes</h2>
          <p className="text-sm text-ink-soft/70 mt-0.5">
            {isTeacher ? "Manage your class sections, announcements, and assignments." : "Your joined classes, announcements, and assignments."}
          </p>
        </div>
        <div className="flex gap-2">
          {isTeacher && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 bg-violet-500 hover:bg-violet-600 text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-violet transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Create class
            </button>
          )}
        </div>
      </div>

      {classes.length === 0 && (
        <div className="bg-white rounded-2xl border border-ink-soft/10 p-10 text-center">
          <p className="text-sm text-ink-soft/70">
            {isTeacher
              ? "You haven't created a class yet."
              : "You haven't been added to a class yet. Ask your teacher to add you by your student ID."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((c) => (
          <button
            key={c.id}
            onClick={() => onOpen(c.id)}
            className="text-left bg-white rounded-2xl border border-ink-soft/10 p-5 hover:border-violet-300 transition-colors cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-3">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-ink group-hover:text-violet-600 transition-colors">{c.name}</h3>
            {c.subject && <p className="text-xs text-ink-soft/60 mt-0.5">{c.subject}</p>}
            <div className="flex items-center justify-between mt-4 text-xs text-ink-soft/60">
              <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {c.studentIds.length} students</span>
              {!isTeacher && <span>{c.teacherName}</span>}
            </div>
          </button>
        ))}
      </div>

      {/* Create class modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl border border-ink-soft/10 shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-ink">Create a class</h3>
              <button onClick={() => setShowCreate(false)} className="text-ink-soft/50 hover:text-ink cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            <label className="text-xs font-bold text-ink-soft/70 block mb-1">Class name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Grade 10 - Section A"
              className="w-full mb-3 px-3.5 py-2.5 text-sm rounded-xl border border-ink-soft/15 focus:outline-none focus:border-violet-400 bg-white"
            />
            <label className="text-xs font-bold text-ink-soft/70 block mb-1">Subject (optional)</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Mathematics"
              className="w-full mb-4 px-3.5 py-2.5 text-sm rounded-xl border border-ink-soft/15 focus:outline-none focus:border-violet-400 bg-white"
            />
            {error && <p className="text-xs text-coral-600 font-semibold mb-3">{error}</p>}
            <button
              onClick={handleCreate}
              className="w-full bg-violet-500 hover:bg-violet-600 text-white text-sm font-bold py-2.5 rounded-full shadow-violet transition-colors cursor-pointer"
            >
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// A single class: header, tabs for Stream / Classmates
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
  const [tab, setTab] = useState<"log" | "roster">("log");

  // Today's attendance snapshot for this class - the thing that makes this
  // page an Attendance Hub class page and not a generic message board.
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [atRiskCount, setAtRiskCount] = useState(0);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cls.id]);

  const presentT = todayRecords.filter((r) => r.status === "Present").length;
  const lateT = todayRecords.filter((r) => r.status === "Late").length;
  const absentT = todayRecords.filter((r) => r.status === "Absent").length;
  const myToday = !isTeacher ? todayRecords.find((r) => r.studentId.toLowerCase() === currentUser.id.toLowerCase()) : undefined;

  const handleDeleteClass = () => {
    if (!confirm(`Delete "${cls.name}"? This removes the class, its log, and all submissions. This can't be undone.`)) return;
    deleteClass(cls.id);
    onDeleted();
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft/70 hover:text-ink cursor-pointer">
        <ArrowLeft className="h-4 w-4" /> Back to classes
      </button>

      <div className="bg-white rounded-2xl border border-ink-soft/10 p-5 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-black text-ink">{cls.name}</h2>
            {cls.subject && <p className="text-sm text-ink-soft/60">{cls.subject}</p>}
            {!isTeacher && <p className="text-xs text-ink-soft/50 mt-1">Taught by {cls.teacherName}</p>}
          </div>
          {isTeacher && (
            <button onClick={handleDeleteClass} title="Delete class" className="p-2.5 rounded-full hover:bg-coral-50 text-coral-500 cursor-pointer shrink-0">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Today's attendance snapshot - the primary hero content now,
            instead of the join code. */}
        <div className="flex items-center gap-2 flex-wrap">
          {isTeacher ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full">
                {presentT} present
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">
                {lateT} late
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-coral-700 bg-coral-50 px-3 py-1.5 rounded-full">
                {absentT} absent
              </span>
              <span className="text-xs text-ink-soft/50">today, of {cls.studentIds.length} students</span>
              {onOpenAttendance && (
                <button
                  onClick={() => onOpenAttendance(cls.id)}
                  className="inline-flex items-center gap-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-violet transition-colors cursor-pointer ml-auto"
                >
                  <ClipboardCheck className="h-3.5 w-3.5" /> Take attendance
                </button>
              )}
            </>
          ) : myToday ? (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
                myToday.status === "Present" ? "text-teal-700 bg-teal-50" : myToday.status === "Late" ? "text-amber-700 bg-amber-50" : "text-coral-700 bg-coral-50"
              }`}
            >
              You: {myToday.status} today
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-soft/60 bg-cream-dim px-3 py-1.5 rounded-full">
              Not checked in today
            </span>
          )}
          {!isTeacher && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-soft/60 bg-cream-dim px-3 py-1.5 rounded-full">
              <Users className="h-3.5 w-3.5" /> {cls.studentIds.length} classmates
            </span>
          )}
        </div>

      </div>

      {isTeacher && atRiskCount > 0 && (
        <div className="flex items-center gap-2 bg-coral-50 border border-coral-100 rounded-xl px-4 py-3 text-xs font-bold text-coral-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {atRiskCount} student{atRiskCount === 1 ? " is" : "s are"} below 75% attendance in this class.
          <button onClick={() => setTab("roster")} className="underline underline-offset-2 hover:text-coral-800 cursor-pointer ml-auto shrink-0">
            View roster
          </button>
        </div>
      )}

      <div className="flex border-b border-ink-soft/10 gap-6">
        <button
          onClick={() => setTab("log")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer inline-flex items-center gap-1.5 ${
            tab === "log" ? "border-violet-500 text-violet-500" : "border-transparent text-ink-soft/50 hover:text-ink-soft"
          }`}
        >
          <Activity className="h-4 w-4" /> Class Log
        </button>
        <button
          onClick={() => setTab("roster")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer inline-flex items-center gap-1.5 ${
            tab === "roster" ? "border-violet-500 text-violet-500" : "border-transparent text-ink-soft/50 hover:text-ink-soft"
          }`}
        >
          <Users className="h-4 w-4" /> Roster
        </button>
      </div>

      {tab === "log" && <ClassLog currentUser={currentUser} cls={cls} />}
      {tab === "roster" && <Classmates cls={cls} isTeacher={isTeacher} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Class Log: a unified, chronological feed of announcements, assignments,
// AND real attendance events for this class - the thing that makes this
// page belong to an attendance app instead of being a copy of Classroom's
// Stream tab.
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
      setFileError("File is too large (max ~700KB). Try a smaller image or a linked doc instead.");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setAttachment({ name: file.name, dataUrl });
  };

  const [posting, setPosting] = useState(false);

  const resetComposer = () => {
    setTitle("");
    setContent("");
    setDueDate("");
    setAttachment(null);
    setFileError("");
    setShowComposer(false);
  };

  const handlePost = () => {
    if (posting) return; // guard against rapid double-clicks
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
    // The localStorage write above is synchronous - refresh straight from it
    // instead of waiting for the Firestore round-trip (which is what the
    // "db_updated" event fires on). Waiting on that event made posting feel
    // unresponsive enough that clicking again created real duplicate posts.
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
        <div className="bg-white rounded-2xl border border-ink-soft/10 p-4 flex gap-2">
          <button
            onClick={() => { setPostType("announcement"); setShowComposer(true); }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-bold text-ink-soft/70 hover:text-violet-600 hover:bg-violet-50 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            <Megaphone className="h-4 w-4" /> Announcement
          </button>
          <button
            onClick={() => { setPostType("assignment"); setShowComposer(true); }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-bold text-ink-soft/70 hover:text-coral-600 hover:bg-coral-50 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            <FileText className="h-4 w-4" /> Assignment
          </button>
        </div>
      )}

      {isTeacher && showComposer && (
        <div className="bg-white rounded-2xl border border-ink-soft/10 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-ink text-sm">
              {postType === "assignment" ? "New assignment" : "New announcement"}
            </h4>
            <button onClick={resetComposer} className="text-ink-soft/50 hover:text-ink cursor-pointer"><X className="h-4 w-4" /></button>
          </div>
          {postType === "assignment" && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Assignment title"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-ink-soft/15 focus:outline-none focus:border-coral-400"
            />
          )}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={postType === "assignment" ? "Instructions..." : "Share something with your class..."}
            rows={3}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-ink-soft/15 focus:outline-none focus:border-violet-400 resize-none"
          />
          <div className="flex items-center gap-3 flex-wrap">
            {postType === "assignment" && (
              <label className="text-xs font-bold text-ink-soft/70 inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Due
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-lg border border-ink-soft/15 focus:outline-none focus:border-coral-400"
                />
              </label>
            )}
            <label className="text-xs font-bold text-ink-soft/70 inline-flex items-center gap-1.5 cursor-pointer hover:text-violet-600">
              <Paperclip className="h-3.5 w-3.5" /> {attachment ? attachment.name : "Attach file/photo"}
              <input type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
            {attachment && (
              <button onClick={() => setAttachment(null)} className="text-xs text-coral-600 font-semibold cursor-pointer">Remove</button>
            )}
          </div>
          {fileError && <p className="text-xs text-coral-600 font-semibold">{fileError}</p>}
          <button
            onClick={handlePost}
            disabled={posting}
            className="inline-flex items-center gap-1.5 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-violet transition-colors cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" /> {posting ? "Posting..." : "Post"}
          </button>
        </div>
      )}

      {entries.length === 0 && (
        <div className="bg-white rounded-2xl border border-ink-soft/10 p-10 text-center">
          <p className="text-sm text-ink-soft/70">Nothing here yet. Announcements, assignments, and attendance will show up as they happen.</p>
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
// PostsPanel: a flat, single-purpose feed of just announcements OR just
// assignments for one class - no attendance mixed in, no type picker (the
// caller decides the type). This is what powers the top-level
// "Announcements" / "Assignments" tabs so teachers and students don't have
// to drill into a separate Classes section to see them.
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
  const isAssignment = filterType === "assignment";
  const [posts, setPosts] = useState<ClassPost[]>(cls ? getPostsForClass(cls.id) : []);
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [attachment, setAttachment] = useState<{ name: string; dataUrl: string } | null>(null);
  const [fileError, setFileError] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!cls) {
      setPosts([]);
      return;
    }
    const refresh = () => setPosts(getPostsForClass(cls.id));
    refresh();
    window.addEventListener("db_updated", refresh);
    return () => window.removeEventListener("db_updated", refresh);
  }, [cls?.id]);

  if (!cls) {
    return (
      <div className="bg-white rounded-2xl border border-ink-soft/10 p-10 text-center">
        <p className="text-sm text-ink-soft/70">
          Pick a class from the switcher above to see its {isAssignment ? "assignments" : "announcements"}.
        </p>
      </div>
    );
  }

  const handleFile = async (file: File | undefined) => {
    setFileError("");
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setFileError("File is too large (max ~700KB). Try a smaller image or a linked doc instead.");
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
    if (posting) return; // guard against rapid double-clicks
    if (!content.trim() && !title.trim()) return;
    setPosting(true);
    createPost({
      classId: cls.id,
      type: filterType,
      authorId: currentUser.id,
      authorName: currentUser.name,
      title: isAssignment ? title.trim() : undefined,
      content: content.trim(),
      dueDate: isAssignment && dueDate ? dueDate : undefined,
      attachmentName: attachment?.name,
      attachmentDataUrl: attachment?.dataUrl,
    });
    // Same synchronous-refresh fix as the unified log: read straight back
    // from localStorage instead of waiting on the "db_updated" event so a
    // second click can't fire while the first post is still "in flight".
    setPosts(getPostsForClass(cls.id));
    resetComposer();
    setPosting(false);
  };

  const filteredPosts = posts
    .filter((p) => p.type === filterType)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-4">
      {isTeacher && !showComposer && (
        <button
          onClick={() => setShowComposer(true)}
          className="w-full bg-white rounded-2xl border border-ink-soft/10 p-4 inline-flex items-center justify-center gap-1.5 text-sm font-bold text-ink-soft/70 hover:text-violet-600 hover:bg-violet-50/60 transition-colors cursor-pointer"
        >
          {isAssignment ? <FileText className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
          New {isAssignment ? "assignment" : "announcement"}
        </button>
      )}

      {isTeacher && showComposer && (
        <div className="bg-white rounded-2xl border border-ink-soft/10 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-ink text-sm">
              {isAssignment ? "New assignment" : "New announcement"}
            </h4>
            <button onClick={resetComposer} className="text-ink-soft/50 hover:text-ink cursor-pointer"><X className="h-4 w-4" /></button>
          </div>
          {isAssignment && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Assignment title"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-ink-soft/15 focus:outline-none focus:border-coral-400"
            />
          )}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isAssignment ? "Instructions..." : "Share something with your class..."}
            rows={3}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-ink-soft/15 focus:outline-none focus:border-violet-400 resize-none"
          />
          <div className="flex items-center gap-3 flex-wrap">
            {isAssignment && (
              <label className="text-xs font-bold text-ink-soft/70 inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Due
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-lg border border-ink-soft/15 focus:outline-none focus:border-coral-400"
                />
              </label>
            )}
            <label className="text-xs font-bold text-ink-soft/70 inline-flex items-center gap-1.5 cursor-pointer hover:text-violet-600">
              <Paperclip className="h-3.5 w-3.5" /> {attachment ? attachment.name : "Attach file/photo"}
              <input type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
            {attachment && (
              <button onClick={() => setAttachment(null)} className="text-xs text-coral-600 font-semibold cursor-pointer">Remove</button>
            )}
          </div>
          {fileError && <p className="text-xs text-coral-600 font-semibold">{fileError}</p>}
          <button
            onClick={handlePost}
            disabled={posting}
            className="inline-flex items-center gap-1.5 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-violet transition-colors cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" /> {posting ? "Posting..." : "Post"}
          </button>
        </div>
      )}

      {filteredPosts.length === 0 && (
        <div className="bg-white rounded-2xl border border-ink-soft/10 p-10 text-center">
          <p className="text-sm text-ink-soft/70">
            {emptyText || (isAssignment ? "No assignments yet." : "No announcements yet.")}
          </p>
        </div>
      )}

      {filteredPosts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUser={currentUser}
          isTeacher={isTeacher}
          onDeleted={() => setPosts(getPostsForClass(cls.id))}
        />
      ))}
    </div>
  );
}

function AttendanceLogCard({
  entry,
  isTeacher,
  currentUser,
}: {
  entry: Extract<LogEntry, { kind: "attendance" }>;
  isTeacher: boolean;
  currentUser: User;
}) {
  const [expanded, setExpanded] = useState(false);
  const rate = entry.total > 0 ? Math.round(((entry.present + entry.late) / entry.total) * 100) : 0;
  const mine = !isTeacher ? entry.records.find((r) => r.studentId.toLowerCase() === currentUser.id.toLowerCase()) : undefined;
  const absentees = entry.records.filter((r) => r.status === "Absent");

  return (
    <div className="bg-teal-50/40 rounded-2xl border border-teal-100 p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
          <ListChecks className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-bold text-ink">Attendance taken</p>
            <span className="text-xs text-ink-soft/50">
              {new Date(`${entry.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </div>
          <p className="text-sm text-ink-soft/80 mt-1">
            {entry.present} present &bull; {entry.late} late &bull; {entry.absent} absent{" "}
            <span className="text-ink-soft/50">({rate}%)</span>
          </p>
          {mine && (
            <p
              className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full mt-2 ${
                mine.status === "Present" ? "text-teal-700 bg-teal-100" : mine.status === "Late" ? "text-amber-700 bg-amber-100" : "text-coral-700 bg-coral-100"
              }`}
            >
              You: {mine.status}
            </p>
          )}
          {isTeacher && absentees.length > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs font-bold text-coral-600 hover:text-coral-700 mt-2 inline-flex items-center gap-1 cursor-pointer"
            >
              {absentees.length} absent {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          )}
          {expanded && (
            <div className="mt-2 space-y-1">
              {absentees.map((r) => (
                <p key={r.id} className="text-xs text-ink-soft/70">{r.studentName}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, currentUser, isTeacher, onDeleted }: { post: ClassPost; currentUser: User; isTeacher: boolean; onDeleted: () => void }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>(getCommentsForPost(post.id));
  const [commentText, setCommentText] = useState("");
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>(getSubmissionsForPost(post.id));
  const mySubmission = !isTeacher ? getSubmissionForStudent(post.id, currentUser.id) : undefined;
  const [submitText, setSubmitText] = useState("");
  const [submitAttachment, setSubmitAttachment] = useState<{ name: string; dataUrl: string } | null>(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [fileError, setFileError] = useState("");

  useEffect(() => {
    const refresh = () => {
      setComments(getCommentsForPost(post.id));
      setSubmissions(getSubmissionsForPost(post.id));
    };
    window.addEventListener("db_updated", refresh);
    return () => window.removeEventListener("db_updated", refresh);
  }, [post.id]);

  const handleComment = () => {
    if (!commentText.trim()) return;
    addComment({ postId: post.id, classId: post.classId, authorId: currentUser.id, authorName: currentUser.name, content: commentText.trim() });
    setComments(getCommentsForPost(post.id));
    setCommentText("");
  };

  const handleFile = async (file: File | undefined) => {
    setFileError("");
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setFileError("File is too large (max ~700KB).");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setSubmitAttachment({ name: file.name, dataUrl });
  };

  const handleSubmit = () => {
    if (!submitText.trim() && !submitAttachment) return;
    submitAssignment({
      postId: post.id,
      classId: post.classId,
      studentId: currentUser.id,
      studentName: currentUser.name,
      content: submitText.trim() || undefined,
      attachmentName: submitAttachment?.name,
      attachmentDataUrl: submitAttachment?.dataUrl,
    });
    setSubmissions(getSubmissionsForPost(post.id));
    setSubmitText("");
    setSubmitAttachment(null);
    setShowSubmitForm(false);
  };

  const isAssignment = post.type === "assignment";

  return (
    <div className="bg-white rounded-2xl border border-ink-soft/10 p-5">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isAssignment ? "bg-coral-50 text-coral-600" : "bg-violet-50 text-violet-600"}`}>
          {isAssignment ? <FileText className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-bold text-ink">{post.authorName}</p>
            <span className="text-xs text-ink-soft/50">{timeAgo(post.createdAt)}</span>
          </div>
          {isAssignment && post.title && <p className="font-bold text-ink mt-1">{post.title}</p>}
          {post.content && <p className="text-sm text-ink-soft/80 mt-1 whitespace-pre-wrap">{post.content}</p>}
          {isAssignment && post.dueDate && (
            <p className="inline-flex items-center gap-1 text-xs font-bold text-coral-600 bg-coral-50 px-2.5 py-1 rounded-full mt-2">
              <Calendar className="h-3 w-3" /> Due {post.dueDate}
            </p>
          )}
          {post.attachmentDataUrl && (
            <a
              href={post.attachmentDataUrl}
              download={post.attachmentName}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 bg-violet-50 px-2.5 py-1.5 rounded-full mt-2 hover:bg-violet-100"
            >
              <Paperclip className="h-3 w-3" /> {post.attachmentName || "Attachment"}
            </a>
          )}

          {/* Assignment: submit (student) / view submissions (teacher) */}
          {isAssignment && !isTeacher && (
            <div className="mt-3">
              {mySubmission ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">
                    <Check className="h-3 w-3" /> Submitted {timeAgo(mySubmission.submittedAt)}
                  </span>
                  <button onClick={() => setShowSubmitForm(true)} className="text-xs font-bold text-ink-soft/60 hover:text-ink cursor-pointer">Resubmit</button>
                </div>
              ) : (
                !showSubmitForm && (
                  <button
                    onClick={() => setShowSubmitForm(true)}
                    className="inline-flex items-center gap-1.5 bg-coral-500 hover:bg-coral-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-coral transition-colors cursor-pointer"
                  >
                    Submit assignment
                  </button>
                )
              )}
              {showSubmitForm && (
                <div className="mt-2 space-y-2 bg-cream-dim rounded-xl p-3">
                  <textarea
                    value={submitText}
                    onChange={(e) => setSubmitText(e.target.value)}
                    placeholder="Add a note (optional)..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-ink-soft/15 focus:outline-none focus:border-coral-400 resize-none bg-white"
                  />
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-ink-soft/70 inline-flex items-center gap-1.5 cursor-pointer hover:text-coral-600">
                      <Paperclip className="h-3.5 w-3.5" /> {submitAttachment ? submitAttachment.name : "Attach file"}
                      <input type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                    </label>
                    <button onClick={handleSubmit} className="text-xs font-bold text-white bg-coral-500 hover:bg-coral-600 px-3 py-1.5 rounded-full cursor-pointer">Submit</button>
                    <button onClick={() => setShowSubmitForm(false)} className="text-xs font-bold text-ink-soft/60 cursor-pointer">Cancel</button>
                  </div>
                  {fileError && <p className="text-xs text-coral-600 font-semibold">{fileError}</p>}
                </div>
              )}
            </div>
          )}

          {isAssignment && isTeacher && (
            <div className="mt-3">
              <button
                onClick={() => setShowSubmissions((v) => !v)}
                className="text-xs font-bold text-violet-600 hover:text-violet-700 cursor-pointer"
              >
                {submissions.length} submission{submissions.length === 1 ? "" : "s"} {showSubmissions ? "▲" : "▼"}
              </button>
              {showSubmissions && (
                <div className="mt-2 space-y-2">
                  {submissions.length === 0 && <p className="text-xs text-ink-soft/60">No submissions yet.</p>}
                  {submissions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between bg-cream-dim rounded-lg px-3 py-2">
                      <div>
                        <p className="text-xs font-bold text-ink">{s.studentName}</p>
                        {s.content && <p className="text-xs text-ink-soft/70">{s.content}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-ink-soft/50">{timeAgo(s.submittedAt)}</span>
                        {s.attachmentDataUrl && (
                          <a href={s.attachmentDataUrl} download={s.attachmentName} className="text-violet-600 hover:text-violet-700">
                            <Paperclip className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Comments */}
          <div className="mt-3 pt-3 border-t border-ink-soft/10">
            <button
              onClick={() => setShowComments((v) => !v)}
              className="text-xs font-bold text-ink-soft/60 hover:text-ink inline-flex items-center gap-1 cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5" /> {comments.length} comment{comments.length === 1 ? "" : "s"}
            </button>
            {showComments && (
              <div className="mt-2 space-y-2">
                {comments.map((c) => (
                  <div key={c.id} className="text-xs bg-cream-dim rounded-lg px-3 py-2">
                    <span className="font-bold text-ink">{c.authorName}</span>{" "}
                    <span className="text-ink-soft/50">{timeAgo(c.createdAt)}</span>
                    <p className="text-ink-soft/80 mt-0.5">{c.content}</p>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleComment()}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-ink-soft/15 focus:outline-none focus:border-violet-400"
                  />
                  <button onClick={handleComment} className="text-violet-600 hover:text-violet-700 cursor-pointer"><Send className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </div>
        </div>
        {isTeacher && (
          <button onClick={() => { deletePost(post.id); onDeleted(); }} title="Delete post" className="text-ink-soft/30 hover:text-coral-500 cursor-pointer shrink-0">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Classmates: roster with attendance stats for this class, teacher can
// add/remove students.
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
      setAddError("No student found with that ID.");
      return;
    }
    addStudentToClass(cls.id, match.id);
    setRows(getClassmatesWithStats(cls.id));
    setAddId("");
    setAddError("");
  };

  return (
    <div className="space-y-4">
      {isTeacher && (
        <div className="bg-white rounded-2xl border border-ink-soft/10 p-4 flex items-center gap-2 flex-wrap">
          <UserPlus className="h-4 w-4 text-violet-500 shrink-0" />
          <input
            value={addId}
            onChange={(e) => setAddId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Add student by ID"
            className="flex-1 min-w-[160px] px-3.5 py-2 text-sm rounded-xl border border-ink-soft/15 focus:outline-none focus:border-violet-400"
          />
          <button onClick={handleAdd} className="text-sm font-bold text-white bg-violet-500 hover:bg-violet-600 px-4 py-2 rounded-full cursor-pointer">
            Add
          </button>
          {addError && <p className="text-xs text-coral-600 font-semibold w-full">{addError}</p>}
        </div>
      )}

      {rows.length === 0 && (
        <div className="bg-white rounded-2xl border border-ink-soft/10 p-10 text-center">
          <p className="text-sm text-ink-soft/70">No students in this class yet.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rows.map(({ student, stats }) => (
          <div key={student.id} className="bg-white rounded-2xl border border-ink-soft/10 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center text-xs font-bold shrink-0">
                {student.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink truncate">{student.name}</p>
                <p className="text-xs text-ink-soft/60">{stats.percentage}% attendance &bull; {stats.presentCount}P / {stats.lateCount}L / {stats.absentCount}A</p>
              </div>
            </div>
            {isTeacher && (
              <button
                onClick={() => { removeStudentFromClass(cls.id, student.id); setRows(getClassmatesWithStats(cls.id)); }}
                title="Remove from class"
                className="text-ink-soft/30 hover:text-coral-500 cursor-pointer shrink-0"
              >
                <UserMinus className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
