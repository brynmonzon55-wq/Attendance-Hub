import React from "react";
import type { AppTheme } from "../App";

interface AnimatedThemeBackgroundProps {
  theme: AppTheme;
}

function AnimatedThemeBackgroundComponent({ theme }: AnimatedThemeBackgroundProps) {
  const isDark = theme === "dark";

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden z-0 select-none transition-colors duration-500 ${
        isDark ? "bg-slate-900" : "bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100"
      }`}
    >
      {/* Subtle mesh gradient for light mode */}
      {!isDark && (
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-slate-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50" />
        </div>
      )}

      {/* Dark mode subtle gradient */}
      {isDark && (
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-900/30 rounded-full mix-blend-screen filter blur-3xl opacity-30" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-slate-800 rounded-full mix-blend-screen filter blur-3xl opacity-30" />
        </div>
      )}
    </div>
  );
}

const AnimatedThemeBackground = React.memo(AnimatedThemeBackgroundComponent);
export default AnimatedThemeBackground;
