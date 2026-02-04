'use client';

import React, { useEffect, useRef } from 'react';
import { createNoise3D } from 'simplex-noise';

const DORMANT_CHARS = " ·+:*=%@#";

export function DormantAscii({ className, style, speed = 0.005 }: { className?: string; style?: React.CSSProperties; speed?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const noise3D = createNoise3D();
    let time = 0;
    let animationFrameId: number;
    
    const rows = 60; 
    const cols = 140; 
    
    const render = () => {
      if (!containerRef.current) return;
      
      let output = '';
      const charAspect = 0.6;
      const visualRatio = (cols * charAspect) / rows;

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const nx = x * 0.015;
          const ny = y * 0.03; 
          const nt = time * 0.15;
          
          let u = (x - cols / 2) / (cols / 2);
          let v = (y - rows / 2) / (rows / 2);
          
          const d = Math.sqrt(Math.pow(u * visualRatio, 2) + v * v);
          
          const noise = noise3D(nx, ny, nt);
          let norm = (noise + 1) / 2;
          
          const mask = Math.max(0, 1 - Math.pow(d / 0.85, 2.5));
          norm = norm * mask;
          
          if (norm < 0.25) {
             output += ' ';
          } else {
             const charIndex = Math.floor(norm * DORMANT_CHARS.length);
             const char = DORMANT_CHARS[Math.max(0, Math.min(charIndex, DORMANT_CHARS.length - 1))];
             output += char;
          }
        }
        output += '\n';
      }
      
      containerRef.current.textContent = output;
      time += speed;
      animationFrameId = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [speed]);

  return (
    <div 
      ref={containerRef}
      className={`text-[#525252] font-mono select-none absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-25 ${className}`}
      style={{ 
        whiteSpace: 'pre', 
        fontSize: '9px',
        lineHeight: '9px',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        maskImage: 'radial-gradient(circle at center, black 30%, transparent 70%)',
        ...style
      }}
    />
  );
}
