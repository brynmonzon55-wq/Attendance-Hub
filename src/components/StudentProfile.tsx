/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Mail,
  Download,
  Award,
  ShieldCheck,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { User, AttendanceRecord, AttendanceStatus } from "../types";
import { getAttendanceRecords, calculateStudentStats, formatDate } from "../lib/db";

interface StudentProfileProps {
  student: User;
  onBack: () => void;
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

export default function StudentProfile({ student, onBack }: StudentProfileProps) {
  const [monthOffset, setMonthOffset] = useState(0);

  // Real attendance history for this student, pulled from the same live-synced
  // Firestore-backed store the rest of the app uses.
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
      // A student can have more than one class logged on the same day - show
      // whichever status is most notable (Absent > Late > Present) on the cell.
      const existing = map.get(r.date);
      if (!existing || STATUS_RANK[r.status] > STATUS_RANK[existing.status]) {
        map.set(r.date, r);
      }
    });
    return map;
  }, [allRecords]);

  const cells = getMonthGrid(year, month);

  // Current streak: walk backward from the most recent logged day; stops at
  // the first Absent. Late still counts as "showed up".
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

  // Achievements are derived entirely from real logged records - nothing here is mocked.
  const achievements = useMemo(() => {
    const list: { icon: typeof Award; title: string; detail: string; color: "teal" | "coral" | "violet" }[] = [];
    const currentMonthPrefix = todayStr.slice(0, 7);
    const thisMonthRecords = allRecords.filter((r) => r.date.startsWith(currentMonthPrefix));

    if (thisMonthRecords.length >= 3 && thisMonthRecords.every((r) => r.status === "Present")) {
      list.push({
        icon: Award,
        title: "Perfect Month",
        detail: `100% attendance in ${now.toLocaleDateString("en-US", { month: "long" })}`,
        color: "teal",
      });
    }

    const earlyCount = allRecords.filter((r) => r.status !== "Absent" && r.time && r.time < "08:00:00").length;
    if (earlyCount >= 5) {
      list.push({
        icon: ShieldCheck,
        title: "Early Bird",
        detail: `Checked in before 8AM ${earlyCount} times`,
        color: "coral",
      });
    }

    if (stats.totalDays >= 5 && stats.percentage >= 90) {
      list.push({
        icon: Sparkles,
        title: "Consistent Star",
        detail: `${stats.percentage}% overall attendance rate`,
        color: "violet",
      });
    }

    return list;
  }, [allRecords, stats, now, todayStr]);

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

  const colorMap: Record<string, string> = {
    teal: "bg-teal-50 text-teal-600",
    coral: "bg-coral-50 text-coral-700",
    violet: "bg-violet-50 text-violet-500",
  };

  return (
    <div className="space-y-6" id="student-profile">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-500 hover:text-violet-700 transition-colors cursor-pointer"
        id="profile-back-btn"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Roster
      </button>

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-violet-100/60 rounded-3xl p-6 shadow-violet flex flex-col md:flex-row md:items-center gap-5"
      >
        <div className="h-20 w-20 rounded-2xl bg-violet-50 text-violet-500 flex items-center justify-center text-2xl font-bold font-display shrink-0">
          {student.name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-ink font-display truncate">{student.name}</h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                student.isApproved
                  ? "bg-teal-50 text-teal-600 border border-teal-100"
                  : "bg-amber-50 text-amber-700 border border-amber-100"
              }`}
            >
              {student.isApproved ? "Verified" : "Pending"}
            </span>
          </div>
          <p className="text-xs text-ink-soft/60 font-mono mt-0.5">Student ID: #{student.id}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3">
            <div>
              <p className="text-[10px] font-bold text-ink-soft/50 uppercase tracking-wide">Attendance Rate</p>
              <p className="text-lg font-bold text-teal-600 font-display">{stats.percentage}%</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-ink-soft/50 uppercase tracking-wide">Current Streak</p>
              <p className="text-lg font-bold text-coral-600 font-display">
                {streak} {streak === 1 ? "Day" : "Days"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          {student.email && (
            <a
              href={`mailto:${student.email}`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-100 rounded-full transition-all cursor-pointer"
              id="profile-contact-btn"
            >
              <Mail className="h-3.5 w-3.5" /> Contact
            </a>
          )}
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-violet-500 hover:bg-violet-600 rounded-full shadow-violet hover:-translate-y-0.5 transition-all cursor-pointer"
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
            <h3 className="text-lg font-bold text-ink font-display">Attendance Calendar</h3>
            <div className="flex items-center gap-1 bg-cream-dim/60 rounded-full px-1 py-1">
              <button
                onClick={() => setMonthOffset((m) => m - 1)}
                className="p-1.5 rounded-full hover:bg-white transition-colors cursor-pointer"
                id="calendar-prev-btn"
              >
                <ChevronLeft className="h-4 w-4 text-ink-soft" />
              </button>
              <span className="text-xs font-bold text-ink px-2 min-w-[110px] text-center">{monthLabel}</span>
              <button
                onClick={() => setMonthOffset((m) => m + 1)}
                className="p-1.5 rounded-full hover:bg-white transition-colors cursor-pointer"
                id="calendar-next-btn"
              >
                <ChevronRight className="h-4 w-4 text-ink-soft" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center mb-2">
            {WEEKDAY_LABELS.map((d) => (
              <span key={d} className="text-[10px] font-bold text-ink-soft/50">
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
                    isFuture ? "text-ink-soft/30" : record ? statusCellClass[record.status] : "bg-cream-dim/60 text-ink-soft/40"
                  } ${isToday ? "ring-2 ring-violet-400" : ""}`}
                  title={record ? `${record.status}${record.subject ? " · " + record.subject : ""}` : undefined}
                >
                  {day}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-ink-soft/10">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-soft/70">
              <span className="h-2 w-2 rounded-full bg-teal-500" /> Present
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-soft/70">
              <span className="h-2 w-2 rounded-full bg-coral-500" /> Late
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-soft/70">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Absent
            </span>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="bg-white border border-ink-soft/10 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-ink font-display mb-4">Success Moments</h3>
            {achievements.length === 0 ? (
              <p className="text-xs text-ink-soft/50">Achievements will appear here as attendance history builds up.</p>
            ) : (
              <div className="space-y-3">
                {achievements.map((a, i) => {
                  const Icon = a.icon;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${colorMap[a.color]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">{a.title}</p>
                        <p className="text-[11px] text-ink-soft/60">{a.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white border border-ink-soft/10 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-ink font-display mb-4">Subject Absences</h3>
            {subjectBreakdown.length === 0 ? (
              <p className="text-xs text-ink-soft/50">No attendance records yet for this student.</p>
            ) : (
              <div className="space-y-3">
                {subjectBreakdown.map(([subject, { absences, late }]) => {
                  const width = Math.min(100, (absences + late) * 20);
                  return (
                    <div key={subject}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-ink">{subject}</span>
                        <span
                          className={`font-bold ${
                            absences > 0 ? "text-rose-600" : late > 0 ? "text-coral-600" : "text-ink-soft/50"
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

          {student.location && (
            <div className="bg-white border border-ink-soft/10 rounded-3xl p-5 shadow-sm flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-ink-soft/50 shrink-0 mt-0.5" />
              <p className="text-xs text-ink-soft/70">{student.location}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
