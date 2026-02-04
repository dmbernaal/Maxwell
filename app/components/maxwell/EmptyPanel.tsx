import React from 'react';
import { CornerGridDecoration } from './primitives/CornerGridDecoration';
import { DormantAscii } from './primitives/DormantAscii';
import { ExecutionPhase, PhaseDurations } from '@/app/lib/maxwell/types';
import { ResearchProgress } from './ResearchProgress';

interface EmptyPanelProps {
  onGenerate?: () => void;
  isLoading?: boolean;
  phase?: ExecutionPhase;
  phaseDurations?: PhaseDurations;
  phaseStartTimes?: Record<string, number>;
  sourceCount?: number;
  verificationProgress?: { current: number; total: number } | null;
}

export function EmptyPanel({ 
  onGenerate,
  isLoading = false,
  phase,
  phaseDurations,
  phaseStartTimes,
  sourceCount,
  verificationProgress
}: EmptyPanelProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && onGenerate) {
        onGenerate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onGenerate]);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#111111] overflow-hidden">
      <CornerGridDecoration className="-top-[10px] -left-[11px] z-30" />
      <CornerGridDecoration className="-top-[10px] -right-[11px] z-30" />
      <CornerGridDecoration className="-bottom-[10px] -left-[11px] z-30" />
      <CornerGridDecoration className="-bottom-[10px] -right-[11px] z-30" />

      <div className="flex-1 flex flex-col items-center justify-center p-12 relative overflow-hidden">
        <DormantAscii speed={isLoading ? 0.02 : 0.005} />

        {isLoading && phase && phaseDurations && phaseStartTimes ? (
          <div className="absolute inset-0 z-20">
            <ResearchProgress 
              phase={phase}
              phaseDurations={phaseDurations}
              phaseStartTimes={phaseStartTimes}
              sourceCount={sourceCount}
              verificationProgress={verificationProgress}
              className="h-full"
            />
          </div>
        ) : (
          <>
            <h3 className="text-lg font-medium text-white mb-2 relative z-10">
              No analysis available
            </h3>
            <p className="text-sm text-[#737373] mb-8 max-w-sm text-center leading-relaxed relative z-10">
              Generate an intelligence report to see Maxwell's analysis of this market.
            </p>

            {onGenerate && (
              <button
                onClick={onGenerate}
                className="group relative z-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FA5D19] hover:bg-[#EA580C] text-white shadow-lg shadow-orange-900/20 transition-all duration-200"
              >
                <span className="text-[12px] font-semibold tracking-wide">Generate Analysis</span>
                <span className="text-[10px] font-mono text-white/60 bg-black/10 px-1.5 py-0.5 rounded ml-1">
                  ⏎
                </span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
