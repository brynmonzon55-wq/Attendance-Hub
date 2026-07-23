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
  subject?: string; // Legacy free-text subject label, kept for old records
  classId?: string; // Which ClassRoom this attendance belongs to (new records)
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

// ---------------------------------------------------------------------------
// Classroom feature: a teacher runs one or more ClassRoom "sections", each
// with its own roster, join code, stream of posts, and attendance records
// (tagged via AttendanceRecord.classId above).
// ---------------------------------------------------------------------------

export interface ClassRoom {
  id: string;
  name: string; // e.g. "Grade 10 - Section A"
  subject?: string; // e.g. "Mathematics"
  teacherId: string; // User.id of the owning teacher
  teacherName: string;
  joinCode: string; // short code students can enter to join
  createdAt: string;
  studentIds: string[]; // User.id of enrolled students
}

export type ClassPostType = "announcement" | "assignment";

export interface ClassPost {
  id: string;
  classId: string;
  type: ClassPostType;
  authorId: string;
  authorName: string;
  title?: string; // assignments use this as the assignment title
  content: string; // announcement body or assignment instructions
  createdAt: string;
  dueDate?: string; // assignments only, YYYY-MM-DD
  attachmentName?: string;
  attachmentDataUrl?: string; // small file/photo attachments, base64 data URL
}

export interface PostComment {
  id: string;
  postId: string;
  classId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface AssignmentSubmission {
  id: string;
  postId: string;
  classId: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  content?: string;
  attachmentName?: string;
  attachmentDataUrl?: string;
}
