import React from 'react';
import { cn } from '@/app/lib/utils';
import { motion, useReducedMotion } from 'framer-motion';

const WAVEFORM_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

interface WaveformSignatureProps {
  active?: boolean;
  className?: string;
}

export function WaveformSignature({ active = true, className }: WaveformSignatureProps) {
  const shouldReduceMotion = useReducedMotion();

  // Static waveform for reduced motion
  if (shouldReduceMotion || !active) {
    return (
      <div className={cn("font-mono text-[10px] tracking-tighter text-white/60 flex select-none", className)}>
        {WAVEFORM_CHARS.map((char, i) => (
          <span key={i} className="inline-block">
            {char}
          </span>
        ))}
        {' ▁▂▃▄▅▆▇█'}
      </div>
    );
  }

  // Animated waveform with CSS pulse + Motion staggered entrance
  return (
    <div className={cn("font-mono text-[10px] tracking-tighter text-white/60 flex select-none", className)}>
      {WAVEFORM_CHARS.map((char, i) => (
        <motion.span
          key={i}
          className="inline-block waveform-pulse"
          initial={{ opacity: 0.6, scale: 0.9 }}
          animate={{
            opacity: 0.4 + (i / 7) * 0.6,
            scale: 1,
          }}
          transition={{
            duration: 0.5,
            delay: i * 0.05,
          }}
        >
          {char}
        </motion.span>
      ))}
      <motion.span
        className="inline-block"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        {' ▁▂▃▄▅▆▇█'}
      </motion.span>
    </div>
  );
}
