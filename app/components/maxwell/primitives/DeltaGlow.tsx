import React from 'react';
import { cn } from '@/app/lib/utils';
import { motion, useReducedMotion } from 'framer-motion';

interface DeltaGlowProps {
  children: React.ReactNode;
  delta?: {
    significance: 'HIGH' | 'MEDIUM' | 'LOW';
    color: 'cyan' | 'amber' | 'green';
  };
  className?: string;
}

export function DeltaGlow({ children, delta, className }: DeltaGlowProps) {
  const shouldReduceMotion = useReducedMotion();

  const getGlowClass = () => {
    if (!delta) return '';

    if (shouldReduceMotion) {
      return delta.color === 'amber'
        ? 'border-amber-500/40'
        : 'border-cyan-500/40';
    }

    if (delta.significance === 'HIGH') {
      return delta.color === 'amber'
        ? 'edge-glow-amber'
        : 'edge-glow-cyan';
    }

    return delta.color === 'amber'
      ? 'border-amber-500/30'
      : 'border-cyan-500/30';
  };

  return (
    <motion.div
      className={cn(
        'rounded-sm border',
        getGlowClass(),
        className
      )}
    >
      {children}
    </motion.div>
  );
}
