import React from "react";
import type { AppTheme } from "../App";

interface AnimatedThemeBackgroundProps {
  theme: AppTheme;
}

const COLORS = [
  "rgba(0, 240, 255, 0.85)",
  "rgba(236, 72, 153, 0.85)",
  "rgba(168, 85, 247, 0.85)",
  "rgba(20, 184, 166, 0.85)",
  "rgba(245, 158, 11, 0.85)",
];

// 12 High-efficiency, smooth floating particles on GPU compositor layer
const PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const size = (i % 3) + 3; // 3px to 5px
  const color = COLORS[i % COLORS.length];
  const left = `${(i * 29 + 11) % 92}%`;
  const top = `${(i * 37 + 17) % 88}%`;
  const duration = `${6.0 + (i % 4) * 1.5}s`;
  const delay = `${(i * 0.4) % 3}s`;
  const xMove = i % 2 === 0 ? "20px" : "-20px";
  const yMove = "-35px";

  return {
    id: i,
    size,
    color,
    left,
    top,
    duration,
    delay,
    xMove,
    yMove,
  };
});

function AnimatedThemeBackgroundComponent({ theme }: AnimatedThemeBackgroundProps) {
  const isDarker = theme === "dark";

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none transform-gpu gpu-smooth">
      {/* 100% GPU-accelerated CSS Keyframes for zero main-thread JS frame-drops */}
      <style>{`
        @keyframes ambientBlob1 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(35px, -25px, 0) scale(1.08); }
        }
        @keyframes ambientBlob2 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-35px, 25px, 0) scale(1.06); }
        }
        @keyframes ambientPulse {
          0%, 100% { opacity: ${isDarker ? "0.45" : "0.65"}; transform: translate3d(-50%, -50%, 0) scale(0.96); }
          50% { opacity: ${isDarker ? "0.75" : "0.85"}; transform: translate3d(-50%, -50%, 0) scale(1.04); }
        }
        @keyframes fastParticleFloat {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(0.85);
            opacity: ${isDarker ? "0.3" : "0.25"};
          }
          50% {
            transform: translate3d(var(--px), var(--py), 0) scale(1.25);
            opacity: ${isDarker ? "0.85" : "0.75"};
          }
        }
      `}</style>

      {/* Radiant Glowing Ambient Blobs */}
      <div
        className={`absolute -top-24 -left-24 w-[320px] sm:w-[480px] h-[320px] sm:h-[480px] rounded-full pointer-events-none blur-2xl ${
          isDarker ? "bg-cyan-500/12" : "bg-cyan-400/18"
        }`}
        style={{
          animation: "ambientBlob1 14s ease-in-out infinite",
        }}
      />
      <div
        className={`absolute top-1/4 -right-24 w-[300px] sm:w-[440px] h-[300px] sm:h-[440px] rounded-full pointer-events-none blur-2xl ${
          isDarker ? "bg-fuchsia-600/12" : "bg-fuchsia-500/18"
        }`}
        style={{
          animation: "ambientBlob2 16s ease-in-out infinite 1.5s",
        }}
      />

      {/* 12 Fast & Vibrant GPU Floating Neon Particles */}
      {PARTICLES.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.left,
            top: p.top,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            boxShadow: `0 0 6px ${p.color}`,
            animation: `fastParticleFloat ${p.duration} ease-in-out infinite ${p.delay}`,
            ["--px" as string]: p.xMove,
            ["--py" as string]: p.yMove,
          }}
        />
      ))}

      {/* Radiant Center Accent Glow */}
      <div
        className={`absolute top-1/2 left-1/2 w-[500px] sm:w-[680px] h-[260px] sm:h-[380px] rounded-full pointer-events-none blur-2xl ${
          isDarker
            ? "bg-gradient-to-r from-cyan-600/12 via-fuchsia-600/15 to-purple-800/12"
            : "bg-gradient-to-r from-cyan-500/18 via-fuchsia-500/20 to-indigo-500/18"
        }`}
        style={{
          animation: "ambientPulse 9s ease-in-out infinite",
        }}
      />
    </div>
  );
}

const AnimatedThemeBackground = React.memo(AnimatedThemeBackgroundComponent);
export default AnimatedThemeBackground;
