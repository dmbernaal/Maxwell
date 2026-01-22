import React from 'react';
import { cn } from '@/app/lib/utils';

interface FactorStrengthBarProps {
  strength: 'HIGH' | 'MEDIUM' | 'LOW';
  className?: string;
  color?: string; // Hex or tailwind class
}

export function FactorStrengthBar({ strength, className, color = 'text-[#e8e8e8]' }: FactorStrengthBarProps) {
  const getBlocks = () => {
    switch (strength) {
      case 'HIGH': return { filled: 8, total: 10 };
      case 'MEDIUM': return { filled: 5, total: 10 };
      case 'LOW': return { filled: 2, total: 10 };
      default: return { filled: 0, total: 10 };
    }
  };

  const { filled, total } = getBlocks();

  return (
    <div className={cn("font-mono text-[10px] tracking-tight flex items-center", className)}>
      <span className={cn("mr-2 font-medium w-[45px]", color)}>{strength}</span>
      <div className="flex text-[8px]">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={i < filled ? color : "text-white/10"}>
            █
          </span>
        ))}
      </div>
    </div>
  );
}
