import { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Mail,
  Download,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  Home,
  Globe,
  Share2,
  GraduationCap
} from "lucide-react";
import { User, AttendanceRecord, AttendanceStatus } from "../types";
import { getAttendanceRecords, calculateStudentStats, formatDate } from "../lib/db";
import UserAvatar from "./UserAvatar";

interface StudentProfileProps {
  student: User;
  onBack?: () => void;
  onClose?: () => void;
}

const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const STATUS_RANK: Record<AttendanceStatus, number> = { Absent: 3, Late: 2, Present: 1 };

// Builds a Mon-first calendar grid of day numbers (null = empty leading/trailing cell)
function getMonthGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // convert Sun-first to Mon-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function StudentProfile({ student, onBack, onClose }: StudentProfileProps) {
  useEffect(() => {
    // Smoothly scroll down to the profile view when opened
    const timer = setTimeout(() => {
      const el = document.getElementById("student-profile");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [student.id]);

  const handleClose = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (onClose) onClose();
    else if (onBack) onBack();
  };
  const [monthOffset, setMonthOffset] = useState(0);

  // Real attendance history for this student
  const allRecords = useMemo(
    () => getAttendanceRecords().filter((r) => r.studentId.toLowerCase() === student.id.toLowerCase()),
    [student.id]
  );

  const stats = useMemo(() => calculateStudentStats(student.id), [student.id, allRecords.length]);

  const now = new Date();
  const todayStr = formatDate(now);
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    allRecords.forEach((r) => {
      const existing = map.get(r.date);
      if (!existing || STATUS_RANK[r.status] > STATUS_RANK[existing.status]) {
        map.set(r.date, r);
      }
    });
    return map;
  }, [allRecords]);

  const cells = getMonthGrid(year, month);

  // Current streak
  const streak = useMemo(() => {
    const dates = Array.from(new Set(allRecords.map((r) => r.date))).sort().reverse();
    let count = 0;
    for (const date of dates) {
      const dayRecords = allRecords.filter((r) => r.date === date);
      const worst = dayRecords.some((r) => r.status === "Absent")
        ? "Absent"
        : dayRecords.some((r) => r.status === "Late")
        ? "Late"
        : "Present";
      if (worst === "Absent") break;
      count++;
    }
    return count;
  }, [allRecords]);

  const subjectBreakdown = useMemo(() => {
    const map = new Map<string, { absences: number; late: number }>();
    allRecords.forEach((r) => {
      const subject = r.subject || "General";
      const entry = map.get(subject) || { absences: 0, late: 0 };
      if (r.status === "Absent") entry.absences++;
      if (r.status === "Late") entry.late++;
      map.set(subject, entry);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].absences - a[1].absences || b[1].late - a[1].late);
  }, [allRecords]);

  const handleExport = () => {
    const header = "Date,Time,Status,Subject,Notes\n";
    const rows = allRecords
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => [r.date, r.time, r.status, r.subject || "", (r.notes || "").replace(/,/g, ";")].join(","))
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${student.id}-attendance-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusCellClass: Record<AttendanceStatus, string> = {
    Present: "bg-teal-100 text-teal-700",
    Late: "bg-coral-100 text-coral-700",
    Absent: "bg-rose-100 text-rose-700",
  };

  const social = student.socialAccounts || {};
  const hasSocials = Boolean(social.facebook || social.twitter || social.linkedin || social.github || social.instagram);

  return (
    <div className="space-y-6" id="student-profile">
      <button
        onClick={handleClose}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
        id="profile-back-btn"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Roster
      </button>

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center gap-5"
      >
        <UserAvatar name={student.name} avatarUrl={student.avatarUrl} role={student.role} size="2xl" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900 font-display truncate">{student.name}</h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                student.isApproved
                  ? "bg-teal-950/80 text-teal-300 border border-teal-500/40"
                  : "bg-amber-950/80 text-amber-300 border border-amber-500/40"
              }`}
            >
              {student.isApproved ? "Verified" : "Pending"}
            </span>
          </div>
          <p className="text-xs text-gray-500/60 font-mono mt-0.5">Student ID: #{student.id}</p>
          {student.department && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold">
              <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
              <span>{student.department}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3">
            <div>
              <p className="text-[10px] font-bold text-gray-500/50 uppercase tracking-wide">Attendance Rate</p>
              <p className="text-lg font-bold text-teal-400 font-display">{stats.percentage}%</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500/50 uppercase tracking-wide">Current Streak</p>
              <p className="text-lg font-bold text-coral-400 font-display">
                {streak} {streak === 1 ? "Day" : "Days"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          {student.email && (
            <a
              href={`mailto:${student.email}`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-teal-300 bg-teal-950/80 hover:bg-teal-900/80 border border-teal-500/40 rounded-full transition-all cursor-pointer"
              id="profile-contact-btn"
            >
              <Mail className="h-3.5 w-3.5" /> Email
            </a>
          )}
          {student.phone && (
            <a
              href={`tel:${student.phone}`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 rounded-full transition-all cursor-pointer"
            >
              <Phone className="h-3.5 w-3.5" /> Call
            </a>
          )}
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-full shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer"
            id="profile-export-btn"
          >
            <Download className="h-3.5 w-3.5" /> Export Report
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white border border-ink-soft/10 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-gray-900 font-display">Attendance Calendar</h3>
            <div className="flex items-center gap-1 bg-cream-dim/60 rounded-full px-1 py-1">
              <button
                onClick={() => setMonthOffset((m) => m - 1)}
                className="p-1.5 rounded-full hover:bg-white transition-colors cursor-pointer"
                id="calendar-prev-btn"
              >
                <ChevronLeft className="h-4 w-4 text-gray-500" />
              </button>
              <span className="text-xs font-bold text-gray-900 px-2 min-w-[110px] text-center">{monthLabel}</span>
              <button
                onClick={() => setMonthOffset((m) => m + 1)}
                className="p-1.5 rounded-full hover:bg-white transition-colors cursor-pointer"
                id="calendar-next-btn"
              >
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center mb-2">
            {WEEKDAY_LABELS.map((d) => (
              <span key={d} className="text-[10px] font-bold text-gray-500/50">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const record = recordsByDate.get(dateStr);
              const isToday = dateStr === todayStr;
              const isFuture = dateStr > todayStr;
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-xl flex items-center justify-center text-xs font-semibold ${
                    isFuture ? "text-gray-500/30" : record ? statusCellClass[record.status] : "bg-cream-dim/60 text-gray-500/40"
                  } ${isToday ? "ring-2 ring-blue-500" : ""}`}
                  title={record ? `${record.status}${record.subject ? " · " + record.subject : ""}` : undefined}
                >
                  {day}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-ink-soft/10">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500/70">
              <span className="h-2 w-2 rounded-full bg-teal-500" /> Present
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500/70">
              <span className="h-2 w-2 rounded-full bg-coral-500" /> Late
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500/70">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Absent
            </span>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Profile Details (Address, Email, Phone, Location) */}
          <div className="bg-white border border-ink-soft/10 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900 font-display flex items-center gap-2">
              <Home className="h-4 w-4 text-blue-600" />
              <span>Contact & Address Info</span>
            </h3>

            <div className="space-y-3 text-xs">
              {student.email && (
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-gray-200/50">
                  <Mail className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500/60">Email Address</p>
                    <a href={`mailto:${student.email}`} className="font-bold text-gray-900 dark:text-gray-700 hover:text-teal-600 truncate block">
                      {student.email}
                    </a>
                  </div>
                </div>
              )}

              {student.phone && (
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-gray-200/50">
                  <Phone className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500/60">Phone Number</p>
                    <a href={`tel:${student.phone}`} className="font-bold text-gray-900 dark:text-gray-700 hover:text-blue-600 truncate block">
                      {student.phone}
                    </a>
                  </div>
                </div>
              )}

              {student.address && (
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-gray-200/50">
                  <Home className="h-4 w-4 text-coral-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500/60">Residential Address</p>
                    <p className="font-bold text-gray-900 dark:text-gray-700 leading-snug">{student.address}</p>
                  </div>
                </div>
              )}

              {student.department && (
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-gray-200/50">
                  <GraduationCap className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500/60">Department / Course</p>
                    <p className="font-bold text-gray-900 dark:text-gray-700 leading-snug">{student.department}</p>
                  </div>
                </div>
              )}

              {!student.email && !student.phone && !student.address && !student.department && (
                <p className="text-xs text-gray-500/50 italic">No contact or academic details configured yet.</p>
              )}
            </div>
          </div>

          {/* Connected Social Media Accounts */}
          <div className="bg-white border border-ink-soft/10 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900 font-display flex items-center gap-2">
              <Share2 className="h-4 w-4 text-teal-500" />
              <span>Social Accounts</span>
            </h3>

            {hasSocials ? (
              <div className="grid grid-cols-1 gap-2 text-xs">
                {social.facebook && (
                  <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl flex items-center justify-between">
                    <span className="font-extrabold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5" /> Facebook
                    </span>
                    <span className="font-semibold text-gray-500 truncate max-w-[160px]">{social.facebook}</span>
                  </div>
                )}
                {social.twitter && (
                  <div className="p-2.5 bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 rounded-xl flex items-center justify-between">
                    <span className="font-extrabold text-sky-700 dark:text-sky-300 flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5" /> Twitter / X
                    </span>
                    <span className="font-semibold text-gray-500 truncate max-w-[160px]">{social.twitter}</span>
                  </div>
                )}
                {social.linkedin && (
                  <div className="p-2.5 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl flex items-center justify-between">
                    <span className="font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5" /> LinkedIn
                    </span>
                    <span className="font-semibold text-gray-500 truncate max-w-[160px]">{social.linkedin}</span>
                  </div>
                )}
                {social.github && (
                  <div className="p-2.5 bg-slate-100 dark:bg-gray-50 border border-slate-200 dark:border-gray-200 rounded-xl flex items-center justify-between">
                    <span className="font-extrabold text-gray-800 dark:text-gray-700 flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5" /> GitHub
                    </span>
                    <span className="font-semibold text-gray-500 truncate max-w-[160px]">{social.github}</span>
                  </div>
                )}
                {social.instagram && (
                  <div className="p-2.5 bg-pink-50/60 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-900/40 rounded-xl flex items-center justify-between">
                    <span className="font-extrabold text-pink-700 dark:text-pink-300 flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5" /> Instagram
                    </span>
                    <span className="font-semibold text-gray-500 truncate max-w-[160px]">{social.instagram}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500/50 italic">No social media profiles connected yet.</p>
            )}
          </div>

          <div className="bg-white border border-ink-soft/10 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 font-display mb-4">Subject Absences</h3>
            {subjectBreakdown.length === 0 ? (
              <p className="text-xs text-gray-500/50">No attendance records yet for this student.</p>
            ) : (
              <div className="space-y-3">
                {subjectBreakdown.map(([subject, { absences, late }]) => {
                  const width = Math.min(100, (absences + late) * 20);
                  return (
                    <div key={subject}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-gray-900">{subject}</span>
                        <span
                          className={`font-bold ${
                            absences > 0 ? "text-rose-600" : late > 0 ? "text-coral-600" : "text-gray-500/50"
                          }`}
                        >
                          {absences > 0 ? `${absences} Absence${absences > 1 ? "s" : ""}` : late > 0 ? `${late} Late` : "0 Absences"}
                        </span>
                      </div>
                      <div className="h-1.5 bg-cream-dim rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${absences > 0 ? "bg-rose-500" : late > 0 ? "bg-coral-500" : "bg-teal-500"}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
