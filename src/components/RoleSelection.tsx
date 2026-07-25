/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { GraduationCap, Briefcase, ChevronRight } from "lucide-react";
import { UserRole } from "../types";

interface RoleSelectionProps {
  onSelectRole: (role: UserRole) => void;
  onQuickTestLogin?: (role: UserRole) => void;
}

export default function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 sm:px-8 py-3 my-auto max-w-full -translate-y-3 sm:-translate-y-6">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-2xl mx-auto flex flex-col items-center"
        id="role-selection-card"
      >
        <div className="text-center mb-[24px] sm:mb-9">
          <h1 className="text-[38px] sm:text-5xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-purple-400 font-display mb-1.5 leading-none drop-shadow-[0_0_30px_rgba(0,240,255,0.5)]">
            Attendance Hub
          </h1>
          <p className="text-slate-300/80 font-medium text-xs sm:text-sm md:text-base max-w-md mx-auto">
            Select your portal to log in
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[18px] sm:gap-6 w-full">
          {/* Student Role */}
          <motion.button
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.12 }}
            onClick={() => onSelectRole("student")}
            className="flex flex-row sm:flex-col items-center justify-between sm:justify-center text-left sm:text-center p-[18px] sm:p-8 min-h-[96px] sm:min-h-[auto] bg-slate-900/75 border border-cyan-400/50 rounded-2xl sm:rounded-3xl shadow-[0_0_25px_rgba(0,240,255,0.25)] hover:shadow-[0_0_40px_rgba(0,240,255,0.45)] hover:border-cyan-300 transition-all cursor-pointer group backdrop-blur-2xl"
            id="select-student-btn"
          >
            <div className="flex flex-row sm:flex-col items-center gap-3.5 sm:gap-0">
              <div className="p-3 sm:p-4 bg-cyan-500/20 rounded-xl sm:rounded-2xl text-cyan-400 sm:mb-3.5 group-hover:bg-cyan-500/30 group-hover:scale-110 transition-all shadow-[0_0_20px_rgba(0,240,255,0.35)] shrink-0">
                <GraduationCap className="h-6.5 w-6.5 sm:h-10 sm:w-10 text-cyan-400 drop-shadow-[0_0_12px_rgba(0,240,255,0.7)]" />
              </div>
              <div>
                <h3 className="text-lg sm:text-2xl font-black text-white font-display sm:mb-1.5 group-hover:text-cyan-300 transition-colors drop-shadow-[0_0_12px_rgba(0,240,255,0.6)]">
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
            <span className="inline-flex items-center justify-center text-[11px] sm:text-xs font-black text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-300 group-hover:from-cyan-300 group-hover:to-teal-200 px-3.5 py-2.5 sm:px-5 sm:py-2.5 rounded-full shadow-[0_0_18px_rgba(0,240,255,0.5)] sm:w-full sm:max-w-[200px] transition-all shrink-0">
              Portal <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-0.5 sm:ml-1 stroke-[3]" />
            </span>
          </motion.button>

          {/* Teacher Role */}
          <motion.button
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.12 }}
            onClick={() => onSelectRole("teacher")}
            className="flex flex-row sm:flex-col items-center justify-between sm:justify-center text-left sm:text-center p-[18px] sm:p-8 min-h-[96px] sm:min-h-[auto] bg-slate-900/75 border border-fuchsia-400/50 rounded-2xl sm:rounded-3xl shadow-[0_0_25px_rgba(217,70,239,0.25)] hover:shadow-[0_0_40px_rgba(217,70,239,0.45)] hover:border-fuchsia-300 transition-all cursor-pointer group backdrop-blur-2xl"
            id="select-teacher-btn"
          >
            <div className="flex flex-row sm:flex-col items-center gap-3.5 sm:gap-0">
              <div className="p-3 sm:p-4 bg-fuchsia-500/20 rounded-xl sm:rounded-2xl text-fuchsia-400 sm:mb-3.5 group-hover:bg-fuchsia-500/30 group-hover:scale-110 transition-all shadow-[0_0_20px_rgba(217,70,239,0.35)] shrink-0">
                <Briefcase className="h-6.5 w-6.5 sm:h-10 sm:w-10 text-fuchsia-400 drop-shadow-[0_0_12px_rgba(217,70,239,0.7)]" />
              </div>
              <div>
                <h3 className="text-lg sm:text-2xl font-black text-white font-display sm:mb-1.5 group-hover:text-fuchsia-300 transition-colors drop-shadow-[0_0_12px_rgba(217,70,239,0.6)]">
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
            <span className="inline-flex items-center justify-center text-[11px] sm:text-xs font-black text-slate-950 bg-gradient-to-r from-fuchsia-400 via-pink-400 to-fuchsia-300 group-hover:from-fuchsia-300 group-hover:to-pink-200 px-3.5 py-2.5 sm:px-5 sm:py-2.5 rounded-full shadow-[0_0_18px_rgba(217,70,239,0.5)] sm:w-full sm:max-w-[200px] transition-all shrink-0">
              Portal <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-0.5 sm:ml-1 stroke-[3]" />
            </span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

