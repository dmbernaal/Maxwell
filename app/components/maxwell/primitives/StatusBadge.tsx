import React from 'react';
import { cn } from '@/app/lib/utils';

export type StatusColor = 'default' | 'accent';

interface StatusBadgeProps {
  label: string;
  color: StatusColor;
  className?: string;
}

const DOT_COLORS: Record<StatusColor, string> = {
  default: 'bg-white/40',
  accent: 'bg-[#FA5D19]',
};

const TEXT_COLORS: Record<StatusColor, string> = {
  default: 'text-white/60',
  accent: 'text-white/60',
};

export function StatusBadge({ label, color, className }: StatusBadgeProps) {
  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]", DOT_COLORS[color])} />
      <span className="text-[10px] font-medium uppercase tracking-wider text-white/60 font-mono">
        {label}
      </span>
    </div>
  );
}
