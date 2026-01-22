import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Circle, Loader2, Clock } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { ExecutionPhase, PhaseDurations } from '@/app/lib/maxwell/types';
import { PanelFrame } from './primitives/PanelFrame';

interface ResearchProgressProps {
  phase: ExecutionPhase;
  phaseDurations: PhaseDurations;
  phaseStartTimes: Record<string, number>;
  sourceCount?: number;
  verificationProgress?: { current: number; total: number } | null;
  className?: string;
}

const PHASES: { id: keyof Omit<PhaseDurations, 'total'>; label: string }[] = [
  { id: 'decomposition', label: 'Planning research' },
  { id: 'search', label: 'Searching sources' },
  { id: 'synthesis', label: 'Analyzing findings' },
  { id: 'verification', label: 'Verifying claims' },
  { id: 'adjudication', label: 'Forming verdict' },
  { id: 'presenter', label: 'Preparing report' },
];

export function ResearchProgress({
  phase,
  phaseDurations,
  phaseStartTimes,
  sourceCount = 0,
  verificationProgress,
  className,
}: ResearchProgressProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startTime = phaseStartTimes['decomposition'];
    if (!startTime || phase === 'complete' || phase === 'idle' || phase === 'error') return;

    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [phaseStartTimes, phase]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getPhaseStatus = (stepId: ExecutionPhase) => {
    const phaseOrder = PHASES.map((p) => p.id as ExecutionPhase);
    const currentIndex = phaseOrder.indexOf(phase);
    const stepIndex = phaseOrder.indexOf(stepId);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const getStepDetail = (stepId: ExecutionPhase) => {
    if (stepId === 'search' && sourceCount > 0) {
      return `(${sourceCount} found)`;
    }
    if (stepId === 'verification' && verificationProgress && verificationProgress.total > 0) {
      return `(${verificationProgress.current}/${verificationProgress.total})`;
    }
    return '';
  };

  return (
    <PanelFrame className={cn("min-h-[300px] flex flex-col justify-between", className)}>
      <div>
        <div className="flex items-center gap-2 mb-6">
          <div className="text-amber-500 font-bold tracking-tight flex items-center gap-2">
            <span className="animate-pulse">⚡</span> MAXWELL
          </div>
          <div className="h-px bg-white/10 flex-1" />
          <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
            Intelligence Pipeline
          </div>
        </div>

        <div className="space-y-4 font-mono text-sm">
          {PHASES.map((step) => {
            const status = getPhaseStatus(step.id);
            const isCompleted = status === 'completed';
            const isActive = status === 'active';
            const detail = getStepDetail(step.id);
            const duration = phaseDurations[step.id];

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center justify-between transition-all duration-300",
                  isActive ? "text-amber-500" : isCompleted ? "text-emerald-500" : "text-white/20"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-4 flex justify-center">
                    {isCompleted ? (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </motion.div>
                    ) : isActive ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Circle className="w-2 h-2 fill-current opacity-40" />
                    )}
                  </div>
                  <span className={cn("tracking-tight", isActive && "font-medium")}>
                    {step.label} <span className="opacity-60 text-xs ml-1 font-normal">{detail}</span>
                  </span>
                </div>

                <div className="text-xs opacity-50 tabular-nums">
                  {isCompleted && duration && formatDuration(duration)}
                  {isActive && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-xs font-mono text-white/40">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>Elapsed time</span>
          </div>
          <span className="tabular-nums text-white/60">
            {formatTime(elapsedMs)}
          </span>
        </div>
      </div>
    </PanelFrame>
  );
}
