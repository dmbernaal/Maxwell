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
      return 'border-brand-accent/30';
    }

    if (delta.significance === 'HIGH') {
      return 'border-brand-accent/40';
    }

    return 'border-brand-accent/20';
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
