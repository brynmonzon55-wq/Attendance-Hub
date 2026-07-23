/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, AttendanceRecord, AttendanceStatus, StudentStats, SecurityLog, ClassRoom, ClassPost, PostComment, AssignmentSubmission } from "../types";
import { db, auth, idToAuthEmail, createUserWithoutSigningIn } from "./firebase";
import { doc, setDoc, deleteDoc, collection, onSnapshot, getDoc } from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser as deleteFirebaseAuthUser,
  updatePassword,
} from "firebase/auth";

// ---------------------------------------------------------------------------
// Real authentication (Firebase Auth). Passwords are never stored in or read
// from Firestore - Firebase hashes and manages them. Firestore only ever
// holds the non-secret profile (name, role, approval status, etc).
// ---------------------------------------------------------------------------

/** Register a new account (self sign-up). Logs the new user in. */
export async function registerUser(
  id: string,
  name: string,
  password: string,
  role: "student" | "teacher",
  extra?: { email?: string; location?: string }
): Promise<User> {
  const authEmail = idToAuthEmail(id);
  const cred = await createUserWithEmailAndPassword(auth, authEmail, password);
  const profile: User = {
    id: id.trim(),
    uid: cred.user.uid,
    name: name.trim(),
    role,
    createdAt: formatDate(new Date()),
    isApproved: false,
    ...(extra?.email ? { email: extra.email.trim() } : {}),
    ...(extra?.location ? { location: extra.location.trim() } : {}),
  };
  await setDoc(doc(db, "users", cred.user.uid), profile);
  return profile;
}

/** Log an existing user in. Throws on bad credentials (see firebase "auth/*" error codes). */
export async function loginUser(id: string, password: string, expectedRole: "student" | "teacher"): Promise<User> {
  const email = idToAuthEmail(id);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, "users", cred.user.uid));
  if (!snap.exists()) {
    await firebaseSignOut(auth);
    throw new Error("profile-missing");
  }
  const profile = snap.data() as User;
  if (profile.role !== expectedRole) {
    await firebaseSignOut(auth);
    throw new Error("wrong-portal");
  }
  return profile;
}

export async function logoutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Lets a signed-in user permanently delete their OWN account. Requires
 * re-entering their password (Firebase requires a "recent login" before
 * allowing account deletion, for safety). Removes their Firestore profile,
 * any attendance records tied to them, and their Firebase Auth login.
 */
export async function deleteOwnAccount(password: string): Promise<void> {
  const current = auth.currentUser;
  if (!current || !current.email) {
    throw new Error("not-signed-in");
  }

  // Re-authenticate - required by Firebase before a sensitive action like
  // account deletion will be allowed.
  const credential = EmailAuthProvider.credential(current.email, password);
  await reauthenticateWithCredential(current, credential);

  // Remove their Firestore profile + any attendance records tied to them
  const users = getUsers();
  const profile = users.find((u) => u.uid === current.uid);
  if (profile) {
    deleteUser(profile.id); // removes Firestore doc + attendance records + local cache
  } else {
    await deleteDoc(doc(db, "users", current.uid));
  }

  // Finally, remove the Firebase Auth login itself
  await deleteFirebaseAuthUser(current);
}

/**
 * Self-service password change. Requires the current password (Firebase
 * requires a "recent login" before allowing this, same as account
 * deletion). This is the primary self-service password recovery path in
 * this app - see the note in LoginForm.tsx about why a traditional
 * "forgot password" email reset isn't available here.
 */
export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
  const current = auth.currentUser;
  if (!current || !current.email) {
    throw new Error("not-signed-in");
  }
  const credential = EmailAuthProvider.credential(current.email, currentPassword);
  await reauthenticateWithCredential(current, credential);
  await updatePassword(current, newPassword);
}

/**
 * Forces the realtime Firestore listeners to reattach from scratch. Used
 * by the manual "Refresh connection" action in Settings, as a fallback in
 * case the live sync ever silently drops (e.g. a network blip) without
 * requiring a full page reload.
 */
export function forceReconnect(): void {
  isListenersAttached = false;
  attachRealtimeListeners();
}

/**
 * Teacher-created student account. Creates the Firebase Auth login AND the
 * Firestore profile, without signing the teacher out (uses a throwaway
 * secondary app instance under the hood - see firebase.ts).
 */
export async function createStudentAccount(
  id: string,
  name: string,
  password: string,
  enrolledSubjects: string[]
): Promise<User> {
  const email = idToAuthEmail(id);
  const uid = await createUserWithoutSigningIn(email, password);
  const profile: User = {
    id: id.trim(),
    uid,
    name: name.trim(),
    role: "student",
    createdAt: formatDate(new Date()),
    isApproved: true,
    enrolledSubjects,
    appliedSubjects: [],
  };
  await setDoc(doc(db, "users", uid), profile);
  return profile;
}

const USERS_KEY = "attendance_system_users";
const ATTENDANCE_KEY = "attendance_system_records";
const SECURITY_LOGS_KEY = "attendance_system_security_logs";
const CLASSES_KEY = "attendance_system_classes";
const POSTS_KEY = "attendance_system_class_posts";
const COMMENTS_KEY = "attendance_system_post_comments";
const SUBMISSIONS_KEY = "attendance_system_assignment_submissions";

// Helper to format date as YYYY-MM-DD
export function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Helper to format time as HH:MM:SS
export function formatTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

// Get dates relative to today
function getRelativeDateString(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysOffset);
  return formatDate(d);
}

// Initial Mock Users
const INITIAL_USERS: User[] = [
  {
    id: "teacher1",
    name: "Head Teacher",
    password: "password",
    role: "teacher",
    createdAt: getRelativeDateString(10),
    isApproved: true,
  },
];

// Initial Attendance Records
const getInitialAttendance = (): AttendanceRecord[] => [];

let isListenersAttached = false;

// Initialize database
export function initDB(): void {
  // Migration: Programmatically remove pre-seeded student101-104 profiles & their logs if they exist
  const usersJson = localStorage.getItem(USERS_KEY);
  if (usersJson) {
    try {
      let users = JSON.parse(usersJson) as User[];
      let updatedUsers = [...users];
      let hasMigrationChange = false;

      // Rename old "Prof. Robert Vance" to "Head Teacher"
      updatedUsers = updatedUsers.map((u) => {
        if (u.id.toLowerCase() === "teacher1" && u.name === "Prof. Robert Vance") {
          hasMigrationChange = true;
          return { ...u, name: "Head Teacher" };
        }
        return u;
      });

      const idsToRemove = ["student101", "student102", "student103", "student104"];
      const filteredUsers = updatedUsers.filter((u) => !idsToRemove.includes(u.id.toLowerCase()));
      if (filteredUsers.length !== users.length || hasMigrationChange) {
        localStorage.setItem(USERS_KEY, JSON.stringify(filteredUsers));
        
        // Also clear any of their records from the attendance table
        const recordsJson = localStorage.getItem(ATTENDANCE_KEY);
        if (recordsJson) {
          const records = JSON.parse(recordsJson) as AttendanceRecord[];
          const filteredRecords = records.filter((r) => !idsToRemove.includes(r.studentId.toLowerCase()));
          localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(filteredRecords));
        }
      }
    } catch (e) {
      console.error("Error running database cleanup migration", e);
    }
  }

  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
  }
  if (!localStorage.getItem(ATTENDANCE_KEY)) {
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(getInitialAttendance()));
  }
  if (!localStorage.getItem(SECURITY_LOGS_KEY)) {
    localStorage.setItem(SECURITY_LOGS_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(CLASSES_KEY)) {
    localStorage.setItem(CLASSES_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(POSTS_KEY)) {
    localStorage.setItem(POSTS_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(COMMENTS_KEY)) {
    localStorage.setItem(COMMENTS_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(SUBMISSIONS_KEY)) {
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify([]));
  }
}

/**
 * Subscribes to live Firestore updates for users/attendance/security-logs.
 *
 * IMPORTANT: this must only be called once the user is actually signed in
 * (Firestore rules require an authenticated session for all reads). If a
 * listener is attached while signed OUT, Firestore immediately rejects it
 * with a permission error - and a Firestore listener that errors out does
 * NOT automatically retry once you later sign in. It just stays dead for
 * the rest of that browser tab's session, which is why the app used to
 * need a full page reload after logging in for anything to refresh live.
 * App.tsx calls this from onAuthStateChanged, once a session is confirmed.
 */
export function attachRealtimeListeners(): void {
  if (isListenersAttached) return;
  isListenersAttached = true;

  // Sync "users" collection from Firestore
  onSnapshot(collection(db, "users"), (snapshot) => {
    const firestoreUsers: User[] = [];
    snapshot.forEach((doc) => {
      firestoreUsers.push(doc.data() as User);
    });

    if (firestoreUsers.length === 0) {
      // If Firestore is empty, let's upload INITIAL_USERS
      INITIAL_USERS.forEach((u) => {
        setDoc(doc(db, "users", u.id.toLowerCase()), u).catch(err => console.error(err));
      });
    } else {
      localStorage.setItem(USERS_KEY, JSON.stringify(firestoreUsers));
      window.dispatchEvent(new Event("db_updated"));
    }
  }, (err) => {
    console.error("Users snapshot error:", err);
    // Allow a future attachRealtimeListeners() call (e.g. after the next
    // successful sign-in) to try again instead of staying permanently dead.
    isListenersAttached = false;
  });

  // Sync "attendance_records" collection from Firestore
  onSnapshot(collection(db, "attendance_records"), (snapshot) => {
    const firestoreRecords: AttendanceRecord[] = [];
    snapshot.forEach((doc) => {
      firestoreRecords.push(doc.data() as AttendanceRecord);
    });

    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(firestoreRecords));
    window.dispatchEvent(new Event("db_updated"));
  }, (err) => {
    console.error("Attendance records snapshot error:", err);
    isListenersAttached = false;
  });

  // Sync "security_logs" collection from Firestore
  onSnapshot(collection(db, "security_logs"), (snapshot) => {
    const firestoreLogs: SecurityLog[] = [];
    snapshot.forEach((doc) => {
      firestoreLogs.push(doc.data() as SecurityLog);
    });

    localStorage.setItem(SECURITY_LOGS_KEY, JSON.stringify(firestoreLogs));
    window.dispatchEvent(new Event("db_updated"));
  }, (err) => {
    console.error("Security logs snapshot error:", err);
    isListenersAttached = false;
  });

  // Sync "classes" collection from Firestore
  onSnapshot(collection(db, "classes"), (snapshot) => {
    const firestoreClasses: ClassRoom[] = [];
    snapshot.forEach((doc) => {
      firestoreClasses.push(doc.data() as ClassRoom);
    });
    localStorage.setItem(CLASSES_KEY, JSON.stringify(firestoreClasses));
    window.dispatchEvent(new Event("db_updated"));
  }, (err) => {
    console.error("Classes snapshot error:", err);
    isListenersAttached = false;
  });

  // Sync "class_posts" collection from Firestore (announcements + assignments)
  onSnapshot(collection(db, "class_posts"), (snapshot) => {
    const firestorePosts: ClassPost[] = [];
    snapshot.forEach((doc) => {
      firestorePosts.push(doc.data() as ClassPost);
    });
    localStorage.setItem(POSTS_KEY, JSON.stringify(firestorePosts));
    window.dispatchEvent(new Event("db_updated"));
  }, (err) => {
    console.error("Class posts snapshot error:", err);
    isListenersAttached = false;
  });

  // Sync "post_comments" collection from Firestore
  onSnapshot(collection(db, "post_comments"), (snapshot) => {
    const firestoreComments: PostComment[] = [];
    snapshot.forEach((doc) => {
      firestoreComments.push(doc.data() as PostComment);
    });
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(firestoreComments));
    window.dispatchEvent(new Event("db_updated"));
  }, (err) => {
    console.error("Post comments snapshot error:", err);
    isListenersAttached = false;
  });

  // Sync "assignment_submissions" collection from Firestore
  onSnapshot(collection(db, "assignment_submissions"), (snapshot) => {
    const firestoreSubmissions: AssignmentSubmission[] = [];
    snapshot.forEach((doc) => {
      firestoreSubmissions.push(doc.data() as AssignmentSubmission);
    });
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(firestoreSubmissions));
    window.dispatchEvent(new Event("db_updated"));
  }, (err) => {
    console.error("Assignment submissions snapshot error:", err);
    isListenersAttached = false;
  });
}

// Users DB methods
export function getUsers(): User[] {
  initDB();
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveUser(user: User): boolean {
  const users = getUsers();
  const exists = users.some((u) => u.id.toLowerCase() === user.id.toLowerCase());
  
  if (exists) {
    // Update user
    const updated = users.map((u) => (u.id.toLowerCase() === user.id.toLowerCase() ? user : u));
    localStorage.setItem(USERS_KEY, JSON.stringify(updated));
  } else {
    // Insert user
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  // Sync to Firestore in background. Accounts created via Firebase Auth are
  // keyed by uid; older/legacy accounts fall back to the lowercased id.
  const docId = user.uid || user.id.toLowerCase();
  setDoc(doc(db, "users", docId), user).catch(err => {
    console.error("Error writing user to Firestore:", err);
  });

  return true;
}

export function deleteUser(id: string): void {
  const users = getUsers();
  const target = users.find((u) => u.id.toLowerCase() === id.toLowerCase());
  const filtered = users.filter((u) => u.id.toLowerCase() !== id.toLowerCase());
  localStorage.setItem(USERS_KEY, JSON.stringify(filtered));

  // Also clean up their attendance records
  const records = getAttendanceRecords();
  const cleanedRecords = records.filter((r) => r.studentId.toLowerCase() !== id.toLowerCase());
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(cleanedRecords));

  // Sync deletion to Firestore in background
  const docId = target?.uid || id.toLowerCase();
  deleteDoc(doc(db, "users", docId)).catch(err => console.error(err));
  
  const recordsToDelete = records.filter((r) => r.studentId.toLowerCase() === id.toLowerCase());
  recordsToDelete.forEach((r) => {
    deleteDoc(doc(db, "attendance_records", r.id)).catch(err => console.error(err));
  });
}

// Attendance DB methods
export function getAttendanceRecords(): AttendanceRecord[] {
  initDB();
  const data = localStorage.getItem(ATTENDANCE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveAttendanceRecord(record: AttendanceRecord): void {
  const records = getAttendanceRecords();
  const index = records.findIndex((r) => r.id === record.id);
  
  if (index !== -1) {
    records[index] = record;
  } else {
    records.push(record);
  }
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));

  // Sync to Firestore in background
  setDoc(doc(db, "attendance_records", record.id), record).catch(err => {
    console.error("Error writing attendance record to Firestore:", err);
  });
}

// Record today's attendance for a student, tagged to a real ClassRoom.
// classId is the source of truth going forward; `subject` is derived from
// the class and kept in sync purely so older code paths that still display
// or export that free-text label (StudentProfile's CSV export, for one)
// keep working without changes.
export function recordTodayAttendance(
  studentId: string,
  studentName: string,
  status: AttendanceStatus,
  notes: string | undefined,
  classId: string
): AttendanceRecord {
  const todayStr = formatDate(new Date());
  const timeStr = formatTime(new Date());
  const records = getAttendanceRecords();
  const cls = getClassById(classId);
  const subject = cls ? (cls.subject || cls.name) : undefined;

  // Match an existing record for today in this class. Records created
  // before classes existed only carry the old `subject` string with no
  // classId - matching on that too means a returning user's history keeps
  // updating in place instead of getting duplicated once they're on the
  // new class-based flow.
  const existingIndex = records.findIndex(
    (r) =>
      r.studentId.toLowerCase() === studentId.toLowerCase() &&
      r.date === todayStr &&
      !!cls &&
      attendanceMatchesClass(r, cls)
  );

  let record: AttendanceRecord;

  if (existingIndex !== -1) {
    // Update existing record
    record = {
      ...records[existingIndex],
      time: timeStr,
      status,
      notes: notes || records[existingIndex].notes,
      subject: subject || records[existingIndex].subject,
      classId,
    };
    records[existingIndex] = record;
  } else {
    // Create new record
    record = {
      id: `rec-${Date.now()}`,
      studentId,
      studentName,
      date: todayStr,
      time: status === "Absent" ? "00:00:00" : timeStr,
      status,
      notes,
      subject,
      classId,
    };
    records.push(record);
  }

  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));

  // Sync to Firestore in background
  setDoc(doc(db, "attendance_records", record.id), record).catch(err => {
    console.error("Error recording attendance to Firestore:", err);
  });

  return record;
}

export function deleteAttendanceRecord(id: string): void {
  const records = getAttendanceRecords();
  const filtered = records.filter((r) => r.id !== id);
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(filtered));

  // Sync delete to Firestore in background
  deleteDoc(doc(db, "attendance_records", id)).catch(err => console.error(err));
}

// Security Logs Keys and Methods

export function getSecurityLogs(): SecurityLog[] {
  initDB();
  const data = localStorage.getItem(SECURITY_LOGS_KEY);
  return data ? JSON.parse(data) : [];
}

export function addSecurityLog(log: Omit<SecurityLog, "id" | "timestamp">): SecurityLog {
  const logs = getSecurityLogs();
  const newLog: SecurityLog = {
    ...log,
    id: `sec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString()
  };
  logs.push(newLog);
  localStorage.setItem(SECURITY_LOGS_KEY, JSON.stringify(logs));

  // Sync to Firestore in background
  setDoc(doc(db, "security_logs", newLog.id), newLog).catch(err => {
    console.error("Error saving security log to Firestore:", err);
  });

  return newLog;
}

export function deleteSecurityLog(id: string): void {
  const logs = getSecurityLogs();
  const filtered = logs.filter((l) => l.id !== id);
  localStorage.setItem(SECURITY_LOGS_KEY, JSON.stringify(filtered));

  // Sync delete to Firestore in background
  deleteDoc(doc(db, "security_logs", id)).catch(err => console.error(err));
}

// Statistics calculations
// Stats for a student, optionally scoped to one class. Records written
// before the classId migration only have the legacy `subject` string, so
// those still count here too (matched against that class's subject/name)
// rather than silently vanishing from a returning user's history.
export function calculateStudentStats(studentId: string, classId?: string): StudentStats {
  const cls = classId ? getClassById(classId) : undefined;
  const records = getAttendanceRecords().filter(
    (r) => r.studentId.toLowerCase() === studentId.toLowerCase() && (!cls || attendanceMatchesClass(r, cls))
  );

  const presentCount = records.filter((r) => r.status === "Present").length;
  const absentCount = records.filter((r) => r.status === "Absent").length;
  const lateCount = records.filter((r) => r.status === "Late").length;
  const totalDays = records.length;
  // Late still counts as attended for the overall rate (they showed up),
  // just tracked separately so punctuality issues are visible.
  const percentage = totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 100;

  return {
    presentCount,
    absentCount,
    lateCount,
    totalDays,
    percentage,
  };
}

// ---------------------------------------------------------------------------
// Classroom feature: classes, stream posts (announcements + assignments),
// comments, and assignment submissions. Same local-first + Firestore-sync
// pattern as everything above - writes go to localStorage immediately and
// to Firestore in the background; onSnapshot listeners above keep every
// open tab in sync.
// ---------------------------------------------------------------------------

function randomJoinCode(): string {
  // Unambiguous charset (no 0/O/1/I) so codes are easy to read aloud/type.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// --- Classes ---

export function getClasses(): ClassRoom[] {
  initDB();
  const data = localStorage.getItem(CLASSES_KEY);
  return data ? JSON.parse(data) : [];
}

export function getClassesForTeacher(teacherId: string): ClassRoom[] {
  return getClasses().filter((c) => c.teacherId.toLowerCase() === teacherId.toLowerCase());
}

export function getClassesForStudent(studentId: string): ClassRoom[] {
  return getClasses().filter((c) => c.studentIds.some((id) => id.toLowerCase() === studentId.toLowerCase()));
}

export function getClassById(classId: string): ClassRoom | undefined {
  return getClasses().find((c) => c.id === classId);
}

function saveClass(cls: ClassRoom): void {
  const classes = getClasses();
  const index = classes.findIndex((c) => c.id === cls.id);
  if (index !== -1) {
    classes[index] = cls;
  } else {
    classes.push(cls);
  }
  localStorage.setItem(CLASSES_KEY, JSON.stringify(classes));
  setDoc(doc(db, "classes", cls.id), cls).catch((err) => {
    console.error("Error writing class to Firestore:", err);
  });
}

export function createClass(name: string, subject: string, teacher: User): ClassRoom {
  // Vanishingly unlikely, but guard against a join-code collision anyway.
  const existingCodes = new Set(getClasses().map((c) => c.joinCode));
  let joinCode = randomJoinCode();
  while (existingCodes.has(joinCode)) {
    joinCode = randomJoinCode();
  }
  const cls: ClassRoom = {
    id: `class-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: name.trim(),
    subject: subject.trim() || undefined,
    teacherId: teacher.id,
    teacherName: teacher.name,
    joinCode,
    createdAt: formatDate(new Date()),
    studentIds: [],
  };
  saveClass(cls);
  return cls;
}

export function regenerateJoinCode(classId: string): ClassRoom | undefined {
  const cls = getClassById(classId);
  if (!cls) return undefined;
  const existingCodes = new Set(getClasses().map((c) => c.joinCode));
  let joinCode = randomJoinCode();
  while (existingCodes.has(joinCode)) {
    joinCode = randomJoinCode();
  }
  const updated = { ...cls, joinCode };
  saveClass(updated);
  return updated;
}

/** Student self-joins a class using the teacher-shared code. */
export function joinClassByCode(code: string, student: User): ClassRoom {
  const cls = getClasses().find((c) => c.joinCode.toLowerCase() === code.trim().toLowerCase());
  if (!cls) {
    throw new Error("invalid-code");
  }
  if (cls.studentIds.some((id) => id.toLowerCase() === student.id.toLowerCase())) {
    return cls; // already a member, nothing to do
  }
  const updated = { ...cls, studentIds: [...cls.studentIds, student.id] };
  saveClass(updated);
  return updated;
}

/** Teacher manually adds an already-registered student by their ID. */
export function addStudentToClass(classId: string, studentId: string): ClassRoom | undefined {
  const cls = getClassById(classId);
  if (!cls) return undefined;
  if (cls.studentIds.some((id) => id.toLowerCase() === studentId.toLowerCase())) {
    return cls;
  }
  const updated = { ...cls, studentIds: [...cls.studentIds, studentId] };
  saveClass(updated);
  return updated;
}

export function removeStudentFromClass(classId: string, studentId: string): ClassRoom | undefined {
  const cls = getClassById(classId);
  if (!cls) return undefined;
  const updated = { ...cls, studentIds: cls.studentIds.filter((id) => id.toLowerCase() !== studentId.toLowerCase()) };
  saveClass(updated);
  return updated;
}

export function deleteClass(classId: string): void {
  const classes = getClasses().filter((c) => c.id !== classId);
  localStorage.setItem(CLASSES_KEY, JSON.stringify(classes));
  deleteDoc(doc(db, "classes", classId)).catch((err) => console.error(err));

  // Cascade: remove this class's posts, their comments, and submissions.
  const posts = getPostsForClass(classId);
  posts.forEach((p) => deletePost(p.id));
}

/** Classmates in a class with their attendance stats, for the roster/classmates view. */
export function getClassmatesWithStats(
  classId: string
): { student: User; stats: StudentStats }[] {
  const cls = getClassById(classId);
  if (!cls) return [];
  const users = getUsers();
  return cls.studentIds
    .map((id) => users.find((u) => u.id.toLowerCase() === id.toLowerCase()))
    .filter((u): u is User => !!u)
    .map((student) => ({
      student,
      stats: calculateStudentStatsForClass(student.id, classId),
    }));
}

/**
 * True if an attendance record belongs to the given class - either tagged
 * directly via classId (every record going forward), or, for records
 * written before that field existed, matched by the legacy free-text
 * subject label. Shared by both dashboards and the Classroom log so
 * pre-migration history doesn't just disappear once classes take over.
 */
export function attendanceMatchesClass(record: AttendanceRecord, cls: ClassRoom): boolean {
  if (record.classId) return record.classId === cls.id;
  const legacySubject = cls.subject || cls.name;
  return !!record.subject && record.subject === legacySubject;
}

export function calculateStudentStatsForClass(studentId: string, classId: string): StudentStats {
  const cls = getClassById(classId);
  const records = getAttendanceRecords().filter(
    (r) => r.studentId.toLowerCase() === studentId.toLowerCase() && !!cls && attendanceMatchesClass(r, cls)
  );
  const presentCount = records.filter((r) => r.status === "Present").length;
  const absentCount = records.filter((r) => r.status === "Absent").length;
  const lateCount = records.filter((r) => r.status === "Late").length;
  const totalDays = records.length;
  const percentage = totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 100;
  return { presentCount, absentCount, lateCount, totalDays, percentage };
}

// --- Stream posts (announcements + assignments) ---

export function getPosts(): ClassPost[] {
  initDB();
  const data = localStorage.getItem(POSTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getPostsForClass(classId: string): ClassPost[] {
  return getPosts()
    .filter((p) => p.classId === classId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createPost(input: Omit<ClassPost, "id" | "createdAt">): ClassPost {
  const post: ClassPost = {
    ...input,
    id: `post-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
  };
  const posts = getPosts();
  posts.push(post);
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  setDoc(doc(db, "class_posts", post.id), post).catch((err) => {
    console.error("Error writing post to Firestore:", err);
  });
  return post;
}

export function deletePost(postId: string): void {
  const posts = getPosts().filter((p) => p.id !== postId);
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  deleteDoc(doc(db, "class_posts", postId)).catch((err) => console.error(err));

  // Cascade: remove this post's comments and submissions too.
  getCommentsForPost(postId).forEach((c) => deleteComment(c.id));
  getSubmissionsForPost(postId).forEach((s) => deleteSubmission(s.id));
}

// --- Comments ---

export function getComments(): PostComment[] {
  initDB();
  const data = localStorage.getItem(COMMENTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getCommentsForPost(postId: string): PostComment[] {
  return getComments()
    .filter((c) => c.postId === postId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function addComment(input: Omit<PostComment, "id" | "createdAt">): PostComment {
  const comment: PostComment = {
    ...input,
    id: `comment-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
  };
  const comments = getComments();
  comments.push(comment);
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
  setDoc(doc(db, "post_comments", comment.id), comment).catch((err) => {
    console.error("Error writing comment to Firestore:", err);
  });
  return comment;
}

export function deleteComment(commentId: string): void {
  const comments = getComments().filter((c) => c.id !== commentId);
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
  deleteDoc(doc(db, "post_comments", commentId)).catch((err) => console.error(err));
}

// --- Assignment submissions ---

export function getSubmissions(): AssignmentSubmission[] {
  initDB();
  const data = localStorage.getItem(SUBMISSIONS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getSubmissionsForPost(postId: string): AssignmentSubmission[] {
  return getSubmissions().filter((s) => s.postId === postId);
}

export function getSubmissionForStudent(postId: string, studentId: string): AssignmentSubmission | undefined {
  return getSubmissions().find(
    (s) => s.postId === postId && s.studentId.toLowerCase() === studentId.toLowerCase()
  );
}

export function submitAssignment(input: Omit<AssignmentSubmission, "id" | "submittedAt">): AssignmentSubmission {
  // Resubmitting replaces the previous submission rather than duplicating it.
  const existing = getSubmissionForStudent(input.postId, input.studentId);
  const submission: AssignmentSubmission = {
    ...input,
    id: existing?.id || `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    submittedAt: new Date().toISOString(),
  };
  const submissions = getSubmissions();
  const index = submissions.findIndex((s) => s.id === submission.id);
  if (index !== -1) {
    submissions[index] = submission;
  } else {
    submissions.push(submission);
  }
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
  setDoc(doc(db, "assignment_submissions", submission.id), submission).catch((err) => {
    console.error("Error writing submission to Firestore:", err);
  });
  return submission;
}

export function deleteSubmission(submissionId: string): void {
  const submissions = getSubmissions().filter((s) => s.id !== submissionId);
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
  deleteDoc(doc(db, "assignment_submissions", submissionId)).catch((err) => console.error(err));
}
