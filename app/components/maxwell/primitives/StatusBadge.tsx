import React from 'react';
import { cn } from '@/app/lib/utils';

export type StatusColor = 'emerald' | 'rose' | 'amber' | 'zinc' | 'blue' | 'orange';

interface StatusBadgeProps {
  label: string;
  color: StatusColor;
  className?: string;
}

const DOT_COLORS: Record<StatusColor, string> = {
  emerald: 'bg-emerald-400',
  rose: 'bg-rose-400',
  amber: 'bg-amber-400',
  zinc: 'bg-zinc-400',
  blue: 'bg-blue-400',
  orange: 'bg-orange-400',
};

const TEXT_COLORS: Record<StatusColor, string> = {
  emerald: 'text-emerald-400',
  rose: 'text-rose-400',
  amber: 'text-amber-400',
  zinc: 'text-zinc-400',
  blue: 'text-blue-400',
  orange: 'text-orange-400',
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
