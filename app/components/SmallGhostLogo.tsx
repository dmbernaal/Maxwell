'use client';

import { MeshGradient } from "@paper-design/shaders-react";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { GHOST_LOGO_COLORS } from "../lib/ghost-logo-colors";

export function SmallGhostLogo() {
  // State
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [isClient, setIsClient] = useState(false);
  const [isSafariMobile, setIsSafariMobile] = useState(false);

  // Ref for the container to calculate relative position
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Detect Environment & Client
  useEffect(() => {
    setIsClient(true);
    const userAgent = navigator.userAgent;
    // Detect Safari Mobile specifically
    const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
    setIsSafariMobile(isSafari && isMobile);
  }, []);

  // 2. Track Mouse & Calculate Eyes Directly
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate distance from center to mouse
      // Multiply by a factor (e.g., 0.1) to dampen the movement
      const deltaX = (e.clientX - centerX) * 0.1;
      const deltaY = (e.clientY - centerY) * 0.1;

      // Clamp the values so eyes don't leave the face
      const maxOffset = 4;

      // Update state directly - no intermediate 'mousePosition' state
      setEyeOffset({
        x: Math.max(-maxOffset, Math.min(maxOffset, deltaX)),
        y: Math.max(-maxOffset, Math.min(maxOffset, deltaY)),
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <motion.div
      ref={containerRef}
      id="small-ghost-logo"
      className="relative w-full h-full mx-auto"
      // Floating Animation
      animate={{ y: [0, -4, 0], scale: [1, 1.02, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* AMBIENT GLOW - The "Soul" Aura */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] -z-10 rounded-full blur-[40px]"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          background: "radial-gradient(circle at center, rgba(111, 59, 245, 0.5) 0%, rgba(255, 153, 204, 0.2) 40%, transparent 70%)"
        }}
      />

      <svg width="100%" height="100%" viewBox="0 0 48 60" className="w-full h-full overflow-visible drop-shadow-[0_0_15px_rgba(111,59,245,0.3)]">
        <defs>
          {/* THE SHAPE */}
          <clipPath id="ghostClip">
            <path d="M47.5 23V49.5C47.5 56 42.5 60 36 60C32 60 28.5 58 26 55C24 52.5 20.5 52.5 18 55C15.5 57 12.5 58 9 58C3.5 58 0 54 0 49V23C0 10.5 10.5 0 23 0C35.5 0 47.5 10.5 47.5 23Z" />
          </clipPath>

          {/* THE FALLBACK (Safari) */}
          <linearGradient id="fallbackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff99cc" />
            <stop offset="25%" stopColor="#7bbbff" />
            <stop offset="50%" stopColor="#6f3bf5" />
            <stop offset="75%" stopColor="#5b2fcb" />
            <stop offset="100%" stopColor="#26153f" />
          </linearGradient>
        </defs>

        {/* RENDER BODY: Modern Browser (Shader) */}
        {isClient && !isSafariMobile && (
          <foreignObject width="48" height="60" clipPath="url(#ghostClip)">
            <div className="w-full h-full">
              <MeshGradient colors={GHOST_LOGO_COLORS} className="w-full h-full" speed={1} />
            </div>
          </foreignObject>
        )}

        {/* RENDER BODY: Safari/Server (Static) */}
        {(isSafariMobile || !isClient) && (
          <path
            d="M47.5 23V49.5C47.5 56 42.5 60 36 60C32 60 28.5 58 26 55C24 52.5 20.5 52.5 18 55C15.5 57 12.5 58 9 58C3.5 58 0 54 0 49V23C0 10.5 10.5 0 23 0C35.5 0 47.5 10.5 47.5 23Z"
            fill="url(#fallbackGradient)"
          />
        )}

        {/* EYES (Left) */}
        <motion.ellipse
          rx="4" ry="6" fill="white"
          initial={{ cx: 16, cy: 24 }} // Fix initial top-left jump
          animate={{
            cx: 16 + eyeOffset.x,
            cy: 24 + eyeOffset.y,
            ry: [6, 0.5, 6], // Blink
          }}
          transition={{
            cx: { type: "spring", stiffness: 150, damping: 15 }, // Movement physics
            ry: { duration: 0.1, repeat: Infinity, repeatDelay: 2.9 } // Blink timing
          }}
        />

        {/* EYES (Right) */}
        <motion.ellipse
          rx="4" ry="6" fill="white"
          initial={{ cx: 32, cy: 24 }} // Fix initial top-left jump
          animate={{
            cx: 32 + eyeOffset.x,
            cy: 24 + eyeOffset.y,
            ry: [6, 0.5, 6],
          }}
          transition={{
            cx: { type: "spring", stiffness: 150, damping: 15 },
            ry: { duration: 0.1, repeat: Infinity, repeatDelay: 2.9 }
          }}
        />
      </svg>
    </motion.div>
  );
}

