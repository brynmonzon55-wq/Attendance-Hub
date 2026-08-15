import { motion } from "motion/react";
import { GraduationCap, Briefcase, ChevronRight } from "lucide-react";
import { UserRole } from "../types";
import type { AppTheme, AppThemeMode } from "../App";

interface RoleSelectionProps {
  onSelectRole: (role: UserRole) => void;
  onQuickTestLogin?: (role: UserRole) => void;
  theme?: AppTheme;
  themeMode?: AppThemeMode;
}

function getRoleCardThemeStyles(theme: AppTheme = "default", mode: AppThemeMode = "night") {
  const isNight = mode === "night";

  switch (theme) {
    case "spring":
      return {
        cardBg: isNight ? "bg-[#06100c]/85" : "bg-slate-900/80",
        student: {
          border: isNight ? "border-pink-500/40 hover:border-pink-400" : "border-pink-400/50 hover:border-pink-300",
          shadow: "shadow-[0_0_25px_rgba(244,114,182,0.2)] hover:shadow-[0_0_40px_rgba(244,114,182,0.4)]",
          iconBg: "bg-pink-500/20 group-hover:bg-pink-500/30",
          iconColor: "text-pink-400",
          iconGlow: "drop-shadow-[0_0_12px_rgba(244,114,182,0.7)]",
          titleHover: "group-hover:text-pink-300",
          buttonBg: "bg-gradient-to-r from-pink-400 to-rose-300 group-hover:from-pink-300 group-hover:to-rose-200 shadow-[0_0_18px_rgba(244,114,182,0.5)]",
        },
        teacher: {
          border: isNight ? "border-emerald-500/40 hover:border-emerald-400" : "border-emerald-400/50 hover:border-emerald-300",
          shadow: "shadow-[0_0_25px_rgba(52,211,153,0.2)] hover:shadow-[0_0_40px_rgba(52,211,153,0.4)]",
          iconBg: "bg-emerald-500/20 group-hover:bg-emerald-500/30",
          iconColor: "text-emerald-400",
          iconGlow: "drop-shadow-[0_0_12px_rgba(52,211,153,0.7)]",
          titleHover: "group-hover:text-emerald-300",
          buttonBg: "bg-gradient-to-r from-emerald-400 to-teal-300 group-hover:from-emerald-300 group-hover:to-teal-200 shadow-[0_0_18px_rgba(52,211,153,0.5)]",
        },
      };

    case "summer":
      return {
        cardBg: isNight ? "bg-[#040b17]/85" : "bg-slate-900/80",
        student: {
          border: isNight ? "border-amber-500/40 hover:border-amber-400" : "border-amber-400/50 hover:border-amber-300",
          shadow: "shadow-[0_0_25px_rgba(251,191,36,0.2)] hover:shadow-[0_0_40px_rgba(251,191,36,0.4)]",
          iconBg: "bg-amber-500/20 group-hover:bg-amber-500/30",
          iconColor: "text-amber-400",
          iconGlow: "drop-shadow-[0_0_12px_rgba(251,191,36,0.7)]",
          titleHover: "group-hover:text-amber-300",
          buttonBg: "bg-gradient-to-r from-amber-400 to-yellow-300 group-hover:from-amber-300 group-hover:to-yellow-200 shadow-[0_0_18px_rgba(251,191,36,0.5)]",
        },
        teacher: {
          border: isNight ? "border-sky-500/40 hover:border-sky-400" : "border-sky-400/50 hover:border-sky-300",
          shadow: "shadow-[0_0_25px_rgba(56,189,248,0.2)] hover:shadow-[0_0_40px_rgba(56,189,248,0.4)]",
          iconBg: "bg-sky-500/20 group-hover:bg-sky-500/30",
          iconColor: "text-sky-400",
          iconGlow: "drop-shadow-[0_0_12px_rgba(56,189,248,0.7)]",
          titleHover: "group-hover:text-sky-300",
          buttonBg: "bg-gradient-to-r from-sky-400 to-blue-300 group-hover:from-sky-300 group-hover:to-blue-200 shadow-[0_0_18px_rgba(56,189,248,0.5)]",
        },
      };

    case "autumn":
      return {
        cardBg: isNight ? "bg-[#0e0502]/85" : "bg-slate-900/80",
        student: {
          border: isNight ? "border-orange-500/40 hover:border-orange-400" : "border-orange-400/50 hover:border-orange-300",
          shadow: "shadow-[0_0_25px_rgba(249,115,22,0.2)] hover:shadow-[0_0_40px_rgba(249,115,22,0.4)]",
          iconBg: "bg-orange-500/20 group-hover:bg-orange-500/30",
          iconColor: "text-orange-400",
          iconGlow: "drop-shadow-[0_0_12px_rgba(249,115,22,0.7)]",
          titleHover: "group-hover:text-orange-300",
          buttonBg: "bg-gradient-to-r from-orange-400 to-amber-300 group-hover:from-orange-300 group-hover:to-amber-200 shadow-[0_0_18px_rgba(249,115,22,0.5)]",
        },
        teacher: {
          border: isNight ? "border-red-500/40 hover:border-red-400" : "border-red-400/50 hover:border-red-300",
          shadow: "shadow-[0_0_25px_rgba(239,68,68,0.2)] hover:shadow-[0_0_40px_rgba(239,68,68,0.4)]",
          iconBg: "bg-red-500/20 group-hover:bg-red-500/30",
          iconColor: "text-red-400",
          iconGlow: "drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]",
          titleHover: "group-hover:text-red-300",
          buttonBg: "bg-gradient-to-r from-red-400 to-orange-300 group-hover:from-red-300 group-hover:to-orange-200 shadow-[0_0_18px_rgba(239,68,68,0.5)]",
        },
      };

    case "winter":
      return {
        cardBg: isNight ? "bg-[#030814]/85" : "bg-slate-900/80",
        student: {
          border: isNight ? "border-sky-500/40 hover:border-sky-400" : "border-sky-400/50 hover:border-sky-300",
          shadow: "shadow-[0_0_25px_rgba(56,189,248,0.2)] hover:shadow-[0_0_40px_rgba(56,189,248,0.4)]",
          iconBg: "bg-sky-500/20 group-hover:bg-sky-500/30",
          iconColor: "text-sky-300",
          iconGlow: "drop-shadow-[0_0_12px_rgba(56,189,248,0.7)]",
          titleHover: "group-hover:text-sky-200",
          buttonBg: "bg-gradient-to-r from-sky-300 to-cyan-200 group-hover:from-sky-200 group-hover:to-cyan-100 shadow-[0_0_18px_rgba(56,189,248,0.5)]",
        },
        teacher: {
          border: isNight ? "border-indigo-500/40 hover:border-indigo-400" : "border-indigo-400/50 hover:border-indigo-300",
          shadow: "shadow-[0_0_25px_rgba(129,140,248,0.2)] hover:shadow-[0_0_40px_rgba(129,140,248,0.4)]",
          iconBg: "bg-indigo-500/20 group-hover:bg-indigo-500/30",
          iconColor: "text-indigo-300",
          iconGlow: "drop-shadow-[0_0_12px_rgba(129,140,248,0.7)]",
          titleHover: "group-hover:text-indigo-200",
          buttonBg: "bg-gradient-to-r from-indigo-400 to-sky-300 group-hover:from-indigo-300 group-hover:to-sky-200 shadow-[0_0_18px_rgba(129,140,248,0.5)]",
        },
      };

    case "default":
    default:
      return {
        cardBg: isNight ? "bg-slate-900/85" : "bg-slate-900/75",
        student: {
          border: "border-cyan-400/50 hover:border-cyan-300",
          shadow: "shadow-[0_0_25px_rgba(0,240,255,0.25)] hover:shadow-[0_0_40px_rgba(0,240,255,0.45)]",
          iconBg: "bg-cyan-500/20 group-hover:bg-cyan-500/30",
          iconColor: "text-cyan-400",
          iconGlow: "drop-shadow-[0_0_12px_rgba(0,240,255,0.7)]",
          titleHover: "group-hover:text-cyan-300",
          buttonBg: "bg-gradient-to-r from-cyan-400 to-teal-300 group-hover:from-cyan-300 group-hover:to-teal-200 shadow-[0_0_18px_rgba(0,240,255,0.5)]",
        },
        teacher: {
          border: "border-fuchsia-400/50 hover:border-fuchsia-300",
          shadow: "shadow-[0_0_25px_rgba(217,70,239,0.25)] hover:shadow-[0_0_40px_rgba(217,70,239,0.45)]",
          iconBg: "bg-fuchsia-500/20 group-hover:bg-fuchsia-500/30",
          iconColor: "text-fuchsia-400",
          iconGlow: "drop-shadow-[0_0_12px_rgba(217,70,239,0.7)]",
          titleHover: "group-hover:text-fuchsia-300",
          buttonBg: "bg-gradient-to-r from-fuchsia-400 via-pink-400 to-fuchsia-300 group-hover:from-fuchsia-300 group-hover:to-pink-200 shadow-[0_0_18px_rgba(217,70,239,0.5)]",
        },
      };
  }
}

export default function RoleSelection({
  onSelectRole,
  theme = "default",
  themeMode = "night",
}: RoleSelectionProps) {
  const styles = getRoleCardThemeStyles(theme, themeMode);

  return (
    <div className="flex flex-1 items-center justify-center px-4 sm:px-8 py-6 my-auto max-w-full">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-2xl mx-auto flex flex-col items-center gap-6 sm:gap-8"
        id="role-selection-card"
      >
        <div className="text-center">
          <h1 className="text-[38px] sm:text-5xl md:text-6xl font-black tracking-tight font-display mb-1.5 leading-none theme-title-gradient">
            Attendance Hub
          </h1>
          <p className="text-slate-300/80 font-medium text-xs sm:text-sm md:text-base max-w-md mx-auto">
            Select your portal to log in
          </p>
        </div>

        {/* Role Portal Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[18px] sm:gap-6 w-full max-w-2xl">
          {/* Student Role */}
          <motion.button
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.12 }}
            onClick={() => onSelectRole("student")}
            className={`flex flex-row sm:flex-col items-center justify-between sm:justify-center text-left sm:text-center p-[18px] sm:p-8 min-h-[96px] sm:min-h-[auto] ${styles.cardBg} border ${styles.student.border} rounded-2xl sm:rounded-3xl ${styles.student.shadow} transition-all cursor-pointer group backdrop-blur-2xl`}
            id="select-student-btn"
          >
            <div className="flex flex-row sm:flex-col items-center gap-3.5 sm:gap-0">
              <div className={`p-3 sm:p-4 ${styles.student.iconBg} rounded-xl sm:rounded-2xl ${styles.student.iconColor} sm:mb-3.5 group-hover:scale-110 transition-all shadow-[0_0_20px_rgba(0,240,255,0.35)] shrink-0`}>
                <GraduationCap className={`h-6.5 w-6.5 sm:h-10 sm:w-10 ${styles.student.iconColor} ${styles.student.iconGlow}`} />
              </div>
              <div>
                <h3 className={`text-lg sm:text-2xl font-black text-white font-display sm:mb-1.5 ${styles.student.titleHover} transition-colors drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]`}>
                  Student
                </h3>
                <p className="text-[11px] sm:text-sm text-slate-300/80 hidden sm:block mb-6 max-w-[230px] leading-relaxed font-medium">
                  Check in for active classes, track attendance records, and turn in assignments.
                </p>
                <p className="text-[11px] text-slate-300/80 sm:hidden font-medium">
                  Check in & track records
                </p>
              </div>
            </div>
            <span className={`inline-flex items-center justify-center text-[11px] sm:text-xs font-black text-slate-950 ${styles.student.buttonBg} px-3.5 py-2.5 sm:px-5 sm:py-2.5 rounded-full sm:w-full sm:max-w-[200px] transition-all shrink-0`}>
              Portal <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-0.5 sm:ml-1 stroke-[3]" />
            </span>
          </motion.button>

          {/* Teacher Role */}
          <motion.button
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.12 }}
            onClick={() => onSelectRole("teacher")}
            className={`flex flex-row sm:flex-col items-center justify-between sm:justify-center text-left sm:text-center p-[18px] sm:p-8 min-h-[96px] sm:min-h-[auto] ${styles.cardBg} border ${styles.teacher.border} rounded-2xl sm:rounded-3xl ${styles.teacher.shadow} transition-all cursor-pointer group backdrop-blur-2xl`}
            id="select-teacher-btn"
          >
            <div className="flex flex-row sm:flex-col items-center gap-3.5 sm:gap-0">
              <div className={`p-3 sm:p-4 ${styles.teacher.iconBg} rounded-xl sm:rounded-2xl ${styles.teacher.iconColor} sm:mb-3.5 group-hover:scale-110 transition-all shadow-[0_0_20px_rgba(217,70,239,0.35)] shrink-0`}>
                <Briefcase className={`h-6.5 w-6.5 sm:h-10 sm:w-10 ${styles.teacher.iconColor} ${styles.teacher.iconGlow}`} />
              </div>
              <div>
                <h3 className={`text-lg sm:text-2xl font-black text-white font-display sm:mb-1.5 ${styles.teacher.titleHover} transition-colors drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]`}>
                  Teacher
                </h3>
                <p className="text-[11px] sm:text-sm text-slate-300/80 hidden sm:block mb-6 max-w-[230px] leading-relaxed font-medium">
                  Create classrooms, manage live attendance, approve enrollments, and post tasks.
                </p>
                <p className="text-[11px] text-slate-300/80 sm:hidden font-medium">
                  Classrooms & attendance
                </p>
              </div>
            </div>
            <span className={`inline-flex items-center justify-center text-[11px] sm:text-xs font-black text-slate-950 ${styles.teacher.buttonBg} px-3.5 py-2.5 sm:px-5 sm:py-2.5 rounded-full sm:w-full sm:max-w-[200px] transition-all shrink-0`}>
              Portal <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-0.5 sm:ml-1 stroke-[3]" />
            </span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

