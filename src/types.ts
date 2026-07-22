/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "student" | "teacher";

export type AttendanceStatus = "Present" | "Absent" | "Late";

export interface User {
  id: string; // This is the username/unique ID
  uid?: string; // Firebase Auth UID (also the Firestore doc id) - present on accounts created via Firebase Auth
  name: string;
  password?: string; // Legacy field only - no longer written for new accounts, kept optional for old seed data
  role: UserRole;
  createdAt: string;
  isApproved?: boolean; // New student accounts start as false, pre-seeded starts as true
  subject?: string; // For teachers, the active subject they teach (e.g. Mathematics, Science)
  appliedSubjects?: string[]; // List of subject names applied for but not yet approved
  enrolledSubjects?: string[]; // List of subject names currently enrolled/approved in
  email?: string; // Contact email (students) so teachers can reach them
  location?: string; // Student's location, visible to teachers
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  status: AttendanceStatus;
  notes?: string;
  subject?: string; // The subject class this attendance was marked for
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  usernameAttempted: string;
  details: string;
  type: "Impersonation Attempt" | "Invalid Registration" | "Unauthorized Access";
}

export interface StudentStats {
  presentCount: number;
  absentCount: number;
  lateCount: number;
  totalDays: number;
  percentage: number;
}
