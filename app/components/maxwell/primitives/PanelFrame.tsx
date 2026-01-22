import React from 'react';
import { cn } from '@/app/lib/utils';
import { motion, useReducedMotion } from 'framer-motion';

interface PanelFrameProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export function PanelFrame({
  children,
  className = '',
  hoverable = true,
}: PanelFrameProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        'relative group w-full bg-[#0a0a0a]',
        hoverable && !shouldReduceMotion ? 'panel-frame-hover' : '',
        className
      )}
    >
      <motion.div
        className="corner absolute top-0 left-0 w-3 h-3 border-l border-t border-white/20"
        initial={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}
        whileHover={hoverable ? { borderColor: 'rgba(255, 255, 255, 0.5)' } : undefined}
        transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
      />
      <motion.div
        className="corner absolute top-0 right-0 w-3 h-3 border-r border-t border-white/20"
        initial={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}
        whileHover={hoverable ? { borderColor: 'rgba(255, 255, 255, 0.5)' } : undefined}
        transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
      />
      <motion.div
        className="corner absolute bottom-0 left-0 w-3 h-3 border-l border-b border-white/20"
        initial={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}
        whileHover={hoverable ? { borderColor: 'rgba(255, 255, 255, 0.5)' } : undefined}
        transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
      />
      <motion.div
        className="corner absolute bottom-0 right-0 w-3 h-3 border-r border-b border-white/20"
        initial={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}
        whileHover={hoverable ? { borderColor: 'rgba(255, 255, 255, 0.5)' } : undefined}
        transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
      />
      <div className="p-6 relative z-10">
        {children}
      </div>
    </div>
  );
}
