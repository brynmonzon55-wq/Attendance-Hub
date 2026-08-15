import React from "react";
import type { AppTheme, AppThemeMode } from "../App";

interface AnimatedThemeBackgroundProps {
  theme: AppTheme;
  mode?: AppThemeMode;
  performanceMode?: boolean;
}

// -------------------------------------------------------------
// 1. NIGHT STARS (Optimized count: 16 lightweight stars)
// -------------------------------------------------------------
const NIGHT_STARS = Array.from({ length: 16 }, (_, i) => {
  const size = (i % 2 === 0 ? 2 : 1.5);
  const left = `${(i * 23 + 7) % 94}%`;
  const top = `${(i * 31 + 11) % 90}%`;
  const duration = `${3.0 + (i % 3) * 1.5}s`;
  const delay = `${(i * 0.5) % 3}s`;

  return { id: i, size, left, top, duration, delay };
});

// -------------------------------------------------------------
// 2. CYBERPUNK PARTICLES (Optimized count: 8 sleek particles)
// -------------------------------------------------------------
const CYBERPUNK_COLORS = [
  "#00f0ff",
  "#ff007f",
  "#a855f7",
  "#06b6d4",
];

const CYBERPUNK_PARTICLES = Array.from({ length: 8 }, (_, i) => {
  const size = 3 + (i % 3);
  const color = CYBERPUNK_COLORS[i % CYBERPUNK_COLORS.length];
  const left = `${(i * 27 + 9) % 92}%`;
  const top = `${(i * 37 + 15) % 85}%`;
  const duration = `${6.0 + (i % 3) * 2.0}s`;
  const delay = `${(i * 0.6) % 3}s`;
  const xMove = i % 2 === 0 ? "20px" : "-20px";
  const yMove = "-30px";

  return { id: i, size, color, left, top, duration, delay, xMove, yMove };
});

// -------------------------------------------------------------
// 3. SPRING SAKURA PETALS (Optimized count: 10 petals, GPU translate3d)
// -------------------------------------------------------------
const SPRING_PETAL_COLORS = [
  "#f472b6",
  "#fb7185",
  "#fca5a5",
  "#fda4af",
];

const SPRING_PETALS = Array.from({ length: 10 }, (_, i) => {
  const size = 12 + (i % 3) * 4;
  const color = SPRING_PETAL_COLORS[i % SPRING_PETAL_COLORS.length];
  const left = `${(i * 21 + 5) % 94}%`;
  const duration = `${9.0 + (i % 4) * 2.5}s`;
  const delay = `${(i * 0.8) % 6}s`;
  const swayDist = i % 2 === 0 ? "35px" : "-35px";
  const rotStart = (i * 45) % 360;

  return { id: i, size, color, left, duration, delay, swayDist, rotStart };
});

// -------------------------------------------------------------
// 4. SUMMER FIREFLIES (Optimized count: 8 fireflies)
// -------------------------------------------------------------
const SUMMER_FIREFLY_COLORS = [
  "#fbbf24",
  "#fde047",
  "#86efac",
  "#38bdf8",
];

const SUMMER_FIREFLIES = Array.from({ length: 8 }, (_, i) => {
  const size = 4 + (i % 3) * 2;
  const color = SUMMER_FIREFLY_COLORS[i % SUMMER_FIREFLY_COLORS.length];
  const left = `${(i * 25 + 8) % 92}%`;
  const top = `${(i * 33 + 12) % 85}%`;
  const duration = `${5.0 + (i % 3) * 1.8}s`;
  const delay = `${(i * 0.5) % 3}s`;
  const xMove = i % 2 === 0 ? "18px" : "-18px";
  const yMove = "-28px";

  return { id: i, size, color, left, top, duration, delay, xMove, yMove };
});

// -------------------------------------------------------------
// 5. AUTUMN MAPLE LEAVES (Optimized count: 10 leaves, GPU translate3d)
// -------------------------------------------------------------
const AUTUMN_LEAF_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#b45309",
];

const AUTUMN_LEAVES = Array.from({ length: 10 }, (_, i) => {
  const size = 14 + (i % 3) * 5;
  const color = AUTUMN_LEAF_COLORS[i % AUTUMN_LEAF_COLORS.length];
  const left = `${(i * 23 + 6) % 94}%`;
  const duration = `${10.0 + (i % 4) * 2.5}s`;
  const delay = `${(i * 0.9) % 7}s`;
  const swayDist = i % 2 === 0 ? "40px" : "-40px";
  const rotStart = (i * 60) % 360;

  return { id: i, size, color, left, duration, delay, swayDist, rotStart };
});

// -------------------------------------------------------------
// 6. WINTER SNOWFLAKES (Optimized count: 14 snowflakes, GPU translate3d)
// -------------------------------------------------------------
const WINTER_SNOWFLAKES = Array.from({ length: 14 }, (_, i) => {
  const isCrystalline = i % 4 === 0;
  const size = isCrystalline ? 14 : 4 + (i % 3) * 2;
  const left = `${(i * 17 + 4) % 96}%`;
  const duration = `${8.0 + (i % 4) * 2.0}s`;
  const delay = `${(i * 0.7) % 6}s`;
  const swayDist = i % 2 === 0 ? "25px" : "-25px";
  const opacity = 0.5 + (i % 3) * 0.2;

  return { id: i, isCrystalline, size, left, duration, delay, swayDist, opacity };
});

function AnimatedThemeBackgroundComponent({
  theme,
  mode = "night",
  performanceMode = false,
}: AnimatedThemeBackgroundProps) {
  const activeTheme = (theme === ("dark" as any) ? "default" : theme) || "default";
  const isNight = mode === "night";

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none"
      style={{
        contain: "strict",
        willChange: "transform",
      }}
    >
      {/* 
        HARDWARE-ACCELERATED KEYFRAMES:
        Strictly uses transform3d and opacity for 100% GPU compositor execution.
        Zero layout recalculations or CPU repaints.
      */}
      <style>{`
        /* 1. Starlight Twinkle (GPU Opacity Only) */
        @keyframes starTwinkleFast {
          0%, 100% { opacity: 0.25; transform: translate3d(0,0,0) scale(0.9); }
          50% { opacity: 0.9; transform: translate3d(0,0,0) scale(1.15); }
        }

        /* 2. Cyberpunk Particles */
        @keyframes cyberParticleFast {
          0%, 100% {
            transform: translate3d(0, 0, 0);
            opacity: 0.35;
          }
          50% {
            transform: translate3d(var(--px), var(--py), 0);
            opacity: 0.85;
          }
        }

        /* 3. Spring Sakura Flutter (Pure GPU translate3d from top -50px to bottom 105vh) */
        @keyframes sakuraFallGPU {
          0% {
            transform: translate3d(0, -40px, 0) rotate(var(--rot));
            opacity: 0;
          }
          10% {
            opacity: 0.85;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translate3d(var(--sway), 105vh, 0) rotate(calc(var(--rot) + 270deg));
            opacity: 0;
          }
        }

        /* 4. Summer Firefly Pulse */
        @keyframes fireflyFast {
          0%, 100% {
            transform: translate3d(0, 0, 0);
            opacity: 0.25;
          }
          50% {
            transform: translate3d(var(--px), var(--py), 0);
            opacity: 0.95;
          }
        }

        /* 5. Autumn Leaf Fall (Pure GPU translate3d) */
        @keyframes leafFallGPU {
          0% {
            transform: translate3d(0, -40px, 0) rotate(var(--rot));
            opacity: 0;
          }
          12% {
            opacity: 0.9;
          }
          88% {
            opacity: 0.8;
          }
          100% {
            transform: translate3d(var(--sway), 105vh, 0) rotate(calc(var(--rot) + 360deg));
            opacity: 0;
          }
        }

        /* 6. Winter Snowfall (Pure GPU translate3d) */
        @keyframes snowFallGPU {
          0% {
            transform: translate3d(0, -30px, 0);
            opacity: 0;
          }
          10% {
            opacity: var(--op);
          }
          90% {
            opacity: var(--op);
          }
          100% {
            transform: translate3d(var(--sway), 105vh, 0);
            opacity: 0;
          }
        }
      `}</style>

      {/* ------------------------------------------------------------- */}
      {/* GLOBAL NIGHT MODE STARS (Rendered when not in reduced performance mode) */}
      {/* ------------------------------------------------------------- */}
      {isNight && !performanceMode && (
        <>
          {NIGHT_STARS.map((s) => (
            <div
              key={`star-${s.id}`}
              className="absolute rounded-full bg-white pointer-events-none"
              style={{
                left: s.left,
                top: s.top,
                width: `${s.size}px`,
                height: `${s.size}px`,
                opacity: 0.6,
                animation: `starTwinkleFast ${s.duration} ease-in-out infinite ${s.delay}`,
                willChange: "transform, opacity",
              }}
            />
          ))}
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. CYBERPUNK THEME BACKGROUND */}
      {/* ------------------------------------------------------------- */}
      {/* 1. CYBERPUNK THEME BACKGROUND (NEON ELECTRIC MOTES) */}
      {/* ------------------------------------------------------------- */}
      {activeTheme === "default" && (
        <>
          {/* Day Mode Luminous Atmosphere */}
          {!isNight && (
            <>
              <div className="absolute -top-20 -left-20 w-[300px] sm:w-[420px] h-[300px] sm:h-[420px] rounded-full blur-2xl bg-cyan-500/20" />
              <div className="absolute top-1/3 -right-20 w-[280px] sm:w-[380px] h-[280px] sm:h-[380px] rounded-full blur-2xl bg-fuchsia-600/20" />
              <div className="absolute bottom-10 left-1/3 w-[300px] h-[300px] rounded-full blur-2xl bg-purple-600/15" />
            </>
          )}

          {/* Lightweight Floating Particles */}
          {!performanceMode &&
            CYBERPUNK_PARTICLES.map((p) => (
              <div
                key={p.id}
                className="absolute rounded-full pointer-events-none"
                style={{
                  left: p.left,
                  top: p.top,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  backgroundColor: p.color,
                  animation: `cyberParticleFast ${p.duration} ease-in-out infinite ${p.delay}`,
                  ["--px" as string]: p.xMove,
                  ["--py" as string]: p.yMove,
                  willChange: "transform, opacity",
                }}
              />
            ))}
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. SPRING THEME BACKGROUND (SAKURA BLOSSOMS) */}
      {/* ------------------------------------------------------------- */}
      {activeTheme === "spring" && (
        <>
          {/* Day Mode Cherry Blossom Sunbeams */}
          {!isNight && (
            <>
              <div className="absolute -top-16 -left-16 w-[340px] h-[340px] rounded-full blur-2xl bg-pink-500/25" />
              <div className="absolute top-1/3 -right-16 w-[320px] h-[320px] rounded-full blur-2xl bg-emerald-500/20" />
              <div className="absolute bottom-0 left-1/4 w-[360px] h-[260px] rounded-full blur-2xl bg-rose-400/20" />
            </>
          )}

          {/* Falling Sakura Petals via GPU translate3d */}
          {!performanceMode &&
            SPRING_PETALS.map((p) => (
              <div
                key={p.id}
                className="absolute top-0 pointer-events-none"
                style={{
                  left: p.left,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  color: p.color,
                  animation: `sakuraFallGPU ${p.duration} linear infinite ${p.delay}`,
                  ["--sway" as string]: p.swayDist,
                  ["--rot" as string]: `${p.rotStart}deg`,
                  willChange: "transform, opacity",
                }}
              >
                <svg viewBox="0 0 24 24" className="w-full h-full opacity-85">
                  <path
                    d="M12 2C15 5 21 8 20 15 C19 20 15 22 12 20 C9 22 5 20 4 15 C3 8 9 5 12 2 Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
            ))}
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. SUMMER THEME BACKGROUND (FIREFLIES & SUNBEAMS) */}
      {/* ------------------------------------------------------------- */}
      {activeTheme === "summer" && (
        <>
          {/* Day Mode Sunburst Glow (Only in Day mode, never in Night mode) */}
          {!isNight && (
            <>
              <div className="absolute -top-20 -right-20 w-[420px] h-[420px] rounded-full blur-2xl bg-amber-400/30" />
              <div className="absolute bottom-0 -left-16 w-[360px] h-[300px] rounded-full blur-2xl bg-cyan-500/25" />
            </>
          )}

          {/* Fireflies / Sun Sparkles */}
          {!performanceMode &&
            SUMMER_FIREFLIES.map((s) => (
              <div
                key={s.id}
                className="absolute rounded-full pointer-events-none"
                style={{
                  left: s.left,
                  top: s.top,
                  width: `${s.size}px`,
                  height: `${s.size}px`,
                  backgroundColor: s.color,
                  animation: `fireflyFast ${s.duration} ease-in-out infinite ${s.delay}`,
                  ["--px" as string]: s.xMove,
                  ["--py" as string]: s.yMove,
                  willChange: "transform, opacity",
                }}
              />
            ))}
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. AUTUMN THEME BACKGROUND (FALLING MAPLE LEAVES) */}
      {/* ------------------------------------------------------------- */}
      {activeTheme === "autumn" && (
        <>
          {/* Day Mode Golden Harvest Light */}
          {!isNight && (
            <>
              <div className="absolute -top-16 -left-16 w-[360px] h-[360px] rounded-full blur-2xl bg-orange-600/25" />
              <div className="absolute top-1/2 -right-16 w-[340px] h-[340px] rounded-full blur-2xl bg-red-600/20" />
              <div className="absolute bottom-0 left-1/3 w-[380px] h-[260px] rounded-full blur-2xl bg-amber-500/25" />
            </>
          )}

          {/* Falling Autumn Leaves via GPU translate3d */}
          {!performanceMode &&
            AUTUMN_LEAVES.map((l) => (
              <div
                key={l.id}
                className="absolute top-0 pointer-events-none"
                style={{
                  left: l.left,
                  width: `${l.size}px`,
                  height: `${l.size}px`,
                  color: l.color,
                  animation: `leafFallGPU ${l.duration} ease-in-out infinite ${l.delay}`,
                  ["--sway" as string]: l.swayDist,
                  ["--rot" as string]: `${l.rotStart}deg`,
                  willChange: "transform, opacity",
                }}
              >
                <svg viewBox="0 0 24 24" className="w-full h-full opacity-85">
                  <path
                    d="M12 2 L13.8 6.5 L18.5 4.5 L16 9 L21.5 11 L16 13.5 L18 19 L13.2 16 L12 22 L10.8 16 L6 19 L8 13.5 L2.5 11 L8 9 L5.5 4.5 L10.2 6.5 Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
            ))}
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. WINTER THEME BACKGROUND (FALLING SNOWFLAKES) */}
      {/* ------------------------------------------------------------- */}
      {activeTheme === "winter" && (
        <>
          {/* Day Mode Arctic Glacier Light */}
          {!isNight && (
            <>
              <div className="absolute -top-20 -left-20 w-[380px] h-[380px] rounded-full blur-2xl bg-sky-400/25" />
              <div className="absolute top-1/3 -right-20 w-[340px] h-[340px] rounded-full blur-2xl bg-indigo-500/20" />
              <div className="absolute bottom-0 left-1/4 w-[380px] h-[280px] rounded-full blur-2xl bg-cyan-300/20" />
            </>
          )}

          {/* Falling Snowflakes via GPU translate3d */}
          {!performanceMode &&
            WINTER_SNOWFLAKES.map((s) => (
              <div
                key={s.id}
                className="absolute top-0 pointer-events-none"
                style={{
                  left: s.left,
                  width: `${s.size}px`,
                  height: `${s.size}px`,
                  animation: `snowFallGPU ${s.duration} linear infinite ${s.delay}`,
                  ["--sway" as string]: s.swayDist,
                  ["--op" as string]: s.opacity,
                  willChange: "transform, opacity",
                }}
              >
                {s.isCrystalline ? (
                  <svg viewBox="0 0 24 24" className="w-full h-full text-sky-200/90">
                    <path
                      d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14M12 5l-2-2m4 0l-2 2M12 19l-2 2m4 0l-2-2M5 12l-2-2m0 4l2-2M19 12l2-2m0 4l-2-2"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                ) : (
                  <div className="w-full h-full rounded-full bg-white/80" />
                )}
              </div>
            ))}
        </>
      )}
    </div>
  );
}

const AnimatedThemeBackground = React.memo(AnimatedThemeBackgroundComponent);
export default AnimatedThemeBackground;

