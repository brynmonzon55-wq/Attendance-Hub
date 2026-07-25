import React from "react";
import { motion } from "motion/react";
import type { AppTheme } from "../App";

interface AnimatedThemeBackgroundProps {
  theme: AppTheme;
}

// Generate deterministic floating particles
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  size: (i % 4 === 0 ? 5 : i % 3 === 0 ? 4 : i % 2 === 0 ? 3 : 2.5),
  color: i % 3 === 0 ? "rgba(0, 240, 255, 0.75)" : i % 2 === 0 ? "rgba(236, 72, 153, 0.75)" : "rgba(168, 85, 247, 0.75)",
  initialX: (i * 13 + 7) % 100,
  initialY: (i * 17 + 11) % 100,
  duration: 10 + (i % 8) * 2.5,
  delay: (i * 0.6) % 6,
  yOffset: -100 - (i % 5) * 30,
  xOffset: (i % 2 === 0 ? 30 : -30),
}));

export default function AnimatedThemeBackground({ theme }: AnimatedThemeBackgroundProps) {
  const isDarker = theme === "dark";

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* 1. Animated Rotating Ambient Glowing Blobs */}
      <motion.div
        animate={{
          x: [0, 60, -40, 0],
          y: [0, -50, 40, 0],
          scale: [1, 1.25, 0.95, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className={`absolute -top-32 -left-32 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full transition-all duration-700 pointer-events-none max-w-full ${
          isDarker
            ? "bg-cyan-500/15 blur-[140px]"
            : "bg-cyan-400/25 blur-[110px]"
        }`}
      />

      <motion.div
        animate={{
          x: [0, -70, 50, 0],
          y: [0, 60, -30, 0],
          scale: [1, 0.9, 1.2, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className={`absolute top-1/4 -right-32 w-[320px] sm:w-[550px] h-[320px] sm:h-[550px] rounded-full transition-all duration-700 pointer-events-none max-w-full ${
          isDarker
            ? "bg-fuchsia-600/15 blur-[150px]"
            : "bg-fuchsia-500/25 blur-[120px]"
        }`}
      />

      <motion.div
        animate={{
          x: [0, 50, -60, 0],
          y: [0, -40, 50, 0],
          scale: [1, 1.15, 0.85, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
        className={`absolute -bottom-32 left-1/3 w-[380px] sm:w-[650px] h-[380px] sm:h-[650px] rounded-full transition-all duration-700 pointer-events-none max-w-full ${
          isDarker
            ? "bg-purple-900/25 blur-[160px]"
            : "bg-purple-600/25 blur-[130px]"
        }`}
      />

      <motion.div
        animate={{
          opacity: [0.3, 0.7, 0.3],
          scale: [0.9, 1.1, 0.9],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className={`absolute top-1/2 left-10 w-[280px] sm:w-[450px] h-[280px] sm:h-[450px] rounded-full transition-all duration-700 pointer-events-none max-w-full ${
          isDarker
            ? "bg-indigo-900/20 blur-[130px]"
            : "bg-indigo-500/20 blur-[100px]"
        }`}
      />

      {/* 2. Floating Neon Dust Particles */}
      {PARTICLES.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{
            x: `${particle.initialX}vw`,
            y: `${particle.initialY}vh`,
            opacity: 0.2,
          }}
          animate={{
            y: [`${particle.initialY}vh`, `${particle.initialY - 35}vh`, `${particle.initialY}vh`],
            x: [`${particle.initialX}vw`, `${particle.initialX + (particle.id % 2 === 0 ? 5 : -5)}vw`, `${particle.initialX}vw`],
            opacity: isDarker ? [0.3, 0.9, 0.3] : [0.2, 0.8, 0.2],
            scale: [1, 1.4, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            boxShadow: `0 0 ${isDarker ? "14px" : "10px"} ${particle.color}`,
          }}
        />
      ))}

      {/* 3. Radiant Center Beacon Glow */}
      <motion.div
        animate={{
          opacity: isDarker ? [0.45, 0.7, 0.45] : [0.65, 0.9, 0.65],
          scale: [0.95, 1.05, 0.95],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[850px] h-[320px] sm:h-[480px] rounded-full transition-all duration-700 pointer-events-none ${
          isDarker
            ? "bg-gradient-to-r from-cyan-600/15 via-fuchsia-600/20 to-purple-800/15 blur-[130px]"
            : "bg-gradient-to-r from-cyan-500/25 via-fuchsia-500/30 to-indigo-500/25 blur-[110px]"
        }`}
      />
    </div>
  );
}



