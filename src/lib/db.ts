/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, AttendanceRecord, AttendanceStatus, StudentStats, SecurityLog } from "../types";
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

// Record today's attendance for a student
export function recordTodayAttendance(
  studentId: string,
  studentName: string,
  status: AttendanceStatus,
  notes?: string,
  subject?: string
): AttendanceRecord {
  const todayStr = formatDate(new Date());
  const timeStr = formatTime(new Date());
  const records = getAttendanceRecords();

  // Check if attendance already exists for today (with matching subject if provided)
  const existingIndex = records.findIndex(
    (r) => r.studentId.toLowerCase() === studentId.toLowerCase() && 
           r.date === todayStr && 
           (!subject || r.subject === subject)
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
export function calculateStudentStats(studentId: string, subject?: string): StudentStats {
  const records = getAttendanceRecords().filter(
    (r) => r.studentId.toLowerCase() === studentId.toLowerCase() && (!subject || r.subject === subject)
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
