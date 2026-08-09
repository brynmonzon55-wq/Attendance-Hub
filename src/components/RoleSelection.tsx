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
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/20">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-[38px] sm:text-5xl md:text-6xl font-black tracking-tight text-gray-900 font-display mb-2 leading-none">
            Attendance Hub
          </h1>
          <p className="text-gray-500 font-medium text-xs sm:text-sm md:text-base max-w-md mx-auto">
            Select your portal to log in
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 w-full">
          {/* Student Role */}
          <motion.button
            whileHover={{ y: -4, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={() => onSelectRole("student")}
            className="flex flex-row sm:flex-col items-center justify-between sm:justify-center text-left sm:text-center p-5 sm:p-8 min-h-[100px] sm:min-h-[auto] bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
            id="select-student-btn"
          >
            <div className="flex flex-row sm:flex-col items-center gap-4 sm:gap-0">
              <div className="p-3 sm:p-4 bg-blue-50 rounded-xl sm:rounded-2xl text-blue-600 sm:mb-4 group-hover:bg-blue-100 transition-colors shrink-0">
                <GraduationCap className="h-7 w-7 sm:h-10 sm:w-10" />
              </div>
              <div>
                <h3 className="text-lg sm:text-2xl font-black text-gray-900 font-display sm:mb-2 group-hover:text-blue-600 transition-colors">
                  Student
                </h3>
                <p className="text-[11px] sm:text-sm text-gray-500 hidden sm:block mb-6 max-w-[230px] leading-relaxed font-medium">
                  Check in for active classes, track attendance records, and turn in assignments.
                </p>
                <p className="text-[11px] text-gray-500 sm:hidden font-medium">
                  Check in & track records
                </p>
              </div>
            </div>
            <span className="inline-flex items-center justify-center text-[11px] sm:text-xs font-bold text-white bg-blue-600 group-hover:bg-blue-700 px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-full transition-colors sm:w-full sm:max-w-[200px] shrink-0">
              Portal <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-0.5 sm:ml-1 stroke-[3]" />
            </span>
          </motion.button>

          {/* Teacher Role */}
          <motion.button
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ duration: 0.15 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectRole("teacher")}
            className="flex flex-row sm:flex-col items-center justify-between sm:justify-center text-left sm:text-center p-5 sm:p-8 min-h-[100px] sm:min-h-[auto] bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-teal-300 transition-all cursor-pointer group"
            id="select-teacher-btn"
          >
            <div className="flex flex-row sm:flex-col items-center gap-4 sm:gap-0">
              <div className="p-3 sm:p-4 bg-teal-50 rounded-xl sm:rounded-2xl text-teal-600 sm:mb-4 group-hover:bg-teal-100 transition-colors shrink-0">
                <Briefcase className="h-7 w-7 sm:h-10 sm:w-10" />
              </div>
              <div>
                <h3 className="text-lg sm:text-2xl font-black text-gray-900 font-display sm:mb-2 group-hover:text-teal-600 transition-colors">
                  Teacher
                </h3>
                <p className="text-[11px] sm:text-sm text-gray-500 hidden sm:block mb-6 max-w-[230px] leading-relaxed font-medium">
                  Create classrooms, manage live attendance, approve enrollments, and post tasks.
                </p>
                <p className="text-[11px] text-gray-500 sm:hidden font-medium">
                  Classrooms & attendance
                </p>
              </div>
            </div>
            <span className="inline-flex items-center justify-center text-[11px] sm:text-xs font-bold text-white bg-teal-600 group-hover:bg-teal-700 px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-full transition-colors sm:w-full sm:max-w-[200px] shrink-0">
              Portal <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-0.5 sm:ml-1 stroke-[3]" />
            </span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
