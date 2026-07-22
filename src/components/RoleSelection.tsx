/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { GraduationCap, Briefcase, ChevronRight } from "lucide-react";
import { UserRole } from "../types";

interface RoleSelectionProps {
  onSelectRole: (role: UserRole) => void;
}

export default function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4 bg-mesh">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl"
        id="role-selection-card"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-coral-700 font-display mb-3">
            Attendance Hub
          </h1>
          <p className="text-ink-soft/70 font-sans text-sm md:text-base">
            Welcome! Select your role to continue.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Student Role */}
          <motion.button
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectRole("student")}
            className="flex flex-col items-center justify-center text-center p-8 bg-white border border-teal-100/60 rounded-3xl shadow-sm hover:shadow-teal transition-all cursor-pointer group"
            id="select-student-btn"
          >
            <div className="p-4 bg-teal-50 rounded-2xl text-teal-500 mb-4 group-hover:bg-teal-100 transition-colors">
              <GraduationCap className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-ink font-display mb-1">Student</h3>
            <p className="text-xs text-ink-soft/70 mb-6 max-w-[180px]">
              Check in for class and see how your attendance is looking.
            </p>
            <span className="inline-flex items-center text-xs font-semibold text-teal-600 group-hover:text-teal-700 bg-teal-50 group-hover:bg-teal-100 px-3 py-1.5 rounded-full transition-colors">
              Continue as Student <ChevronRight className="h-4 w-4 ml-1" />
            </span>
          </motion.button>

          {/* Teacher Role */}
          <motion.button
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectRole("teacher")}
            className="flex flex-col items-center justify-center text-center p-8 bg-white border border-violet-100/60 rounded-3xl shadow-sm hover:shadow-violet transition-all cursor-pointer group"
            id="select-teacher-btn"
          >
            <div className="p-4 bg-violet-50 rounded-2xl text-violet-500 mb-4 group-hover:bg-violet-100 transition-colors">
              <Briefcase className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-ink font-display mb-1">Teacher</h3>
            <p className="text-xs text-ink-soft/70 mb-6 max-w-[180px]">
              Manage your class roster and keep track of daily attendance.
            </p>
            <span className="inline-flex items-center text-xs font-semibold text-violet-500 group-hover:text-violet-600 bg-violet-50 group-hover:bg-violet-100 px-3 py-1.5 rounded-full transition-colors">
              Continue as Teacher <ChevronRight className="h-4 w-4 ml-1" />
            </span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
