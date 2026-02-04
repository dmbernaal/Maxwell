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
      <div className="relative z-10 overflow-visible">
        {children}
      </div>
    </div>
  );
}
