import React, { useState } from 'react';
import { MaxwellIntelligence, ExecutionPhase, PhaseDurations } from '@/app/lib/maxwell/types';
import { PanelFrame } from './primitives/PanelFrame';
import { SectionDivider } from './primitives/SectionDivider';
import { SkeletonBlock } from './primitives/SkeletonBlock';
import { HeaderSection } from './sections/HeaderSection';
import { AssessmentSection } from './sections/AssessmentSection';
import { OutcomesSection } from './sections/OutcomesSection';
import { ThesisSection } from './sections/ThesisSection';
import { ResolutionRiskSection } from './sections/ResolutionRiskSection';
import { SourcesSection } from './sections/SourcesSection';
import { ErrorPanel } from './ErrorPanel';
import { EmptyPanel } from './EmptyPanel';
import { SourcesModal } from './modals/SourcesModal';
import { RawAnalysisModal } from './modals/RawAnalysisModal';
import { ResearchProgress } from './ResearchProgress';
import { Terminal, Database } from 'lucide-react';

interface IntelligencePanelProps {
  data: MaxwellIntelligence | null;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
  phase?: ExecutionPhase;
  sourceCount?: number;
  verificationProgress?: { current: number; total: number } | null;
  phaseDurations?: PhaseDurations;
  phaseStartTimes?: Record<string, number>;
}

export function IntelligencePanel({
  data,
  isLoading = false,
  error = null,
  onRetry,
  className,
  phase,
  sourceCount,
  verificationProgress,
  phaseDurations,
  phaseStartTimes,
}: IntelligencePanelProps) {
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [showRawModal, setShowRawModal] = useState(false);

  if (error) {
    return <ErrorPanel error={error} onRetry={onRetry} />;
  }

  if (isLoading) {
    if (phase && phaseDurations && phaseStartTimes) {
      return (
        <ResearchProgress
          phase={phase}
          phaseDurations={phaseDurations}
          phaseStartTimes={phaseStartTimes}
          sourceCount={sourceCount}
          verificationProgress={verificationProgress}
          className={className}
        />
      );
    }
    
    return (
      <PanelFrame>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="text-amber-500 font-bold">⚡ MAXWELL</div>
              <SkeletonBlock width="100px" height="16px" variant="text" />
            </div>
            <SkeletonBlock width="60px" height="16px" variant="text" />
          </div>
          <SkeletonBlock width="100%" height="32px" variant="waveform" />
        </div>

        <SectionDivider />

        <div className="mb-6">
          <SkeletonBlock width="120px" height="12px" variant="text" className="mb-4" />
          <div className="flex items-center justify-between mb-3">
            <SkeletonBlock width="150px" height="20px" variant="block" />
            <SkeletonBlock width="80px" height="20px" variant="block" />
          </div>
          <SkeletonBlock width="100%" height="8px" variant="block" className="mb-4" />
          <SkeletonBlock width="80%" height="16px" variant="text" className="mb-2" />
          <SkeletonBlock width="60%" height="16px" variant="text" />
        </div>

        <SectionDivider />

        <div className="mb-6">
          <SkeletonBlock width="120px" height="12px" variant="text" className="mb-4" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <SkeletonBlock width="40%" height="16px" variant="text" />
                <SkeletonBlock width="60px" height="16px" variant="text" />
              </div>
              <SkeletonBlock width="100%" height="24px" variant="block" />
            </div>
          ))}
        </div>

        <SectionDivider />

        <div className="mb-6">
          <SkeletonBlock width="120px" height="12px" variant="text" className="mb-4" />
          {[...Array(2)].map((_, i) => (
            <div key={i} className="mb-4 p-3 border border-white/10 rounded-sm">
              <div className="flex items-center justify-between mb-2">
                <SkeletonBlock width="100px" height="16px" variant="text" />
                <SkeletonBlock width="50px" height="12px" variant="text" />
              </div>
              <SkeletonBlock width="90%" height="16px" variant="text" className="mb-2" />
              <SkeletonBlock width="100%" height="6px" variant="block" />
            </div>
          ))}
        </div>

        <SectionDivider />

        <div className="mb-6">
          <SkeletonBlock width="120px" height="12px" variant="text" className="mb-4" />
          <div className="flex items-center gap-3 mb-3">
            <SkeletonBlock width="60px" height="24px" variant="block" />
            <SkeletonBlock width="40px" height="16px" variant="text" />
          </div>
          <SkeletonBlock width="100%" height="8px" variant="block" className="mb-3" />
          <SkeletonBlock width="70%" height="16px" variant="text" />
        </div>

        <SectionDivider />

        <div>
          <SkeletonBlock width="120px" height="12px" variant="text" className="mb-4" />
          <div className="flex items-center justify-between mb-2">
            <SkeletonBlock width="100px" height="16px" variant="text" />
            <SkeletonBlock width="80px" height="16px" variant="text" />
          </div>
          <SkeletonBlock width="100%" height="6px" variant="block" />
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 text-center">
          <span className="font-mono text-xs text-white/40 animate-pulse">
            Analyzing market...
          </span>
        </div>
      </PanelFrame>
    );
  }

  if (!data) {
    return <EmptyPanel />;
  }

  return (
    <>
      <PanelFrame className={className}>
        <HeaderSection data={data} />

        <SectionDivider className="mb-6" />

        <AssessmentSection data={data} />

        <SectionDivider className="my-6" />

        <OutcomesSection data={data} />

        <SectionDivider className="my-6" />

        <div className="space-y-1">
          <ThesisSection data={data} />
          <ResolutionRiskSection data={data} />
          <SourcesSection
            data={data}
            onViewAll={() => setShowSourcesModal(true)}
          />
        </div>

        <div className="pt-6 mt-4 flex items-center justify-between opacity-30 hover:opacity-100 transition-opacity duration-300">
           <div className="flex gap-4">
              <button
                onClick={() => setShowRawModal(true)}
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono hover:text-white transition-colors"
              >
                <Terminal className="w-3 h-3" />
                <span>Raw Output</span>
              </button>

              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono cursor-help" title={`Model: ${data.modelUsed}`}>
                <Database className="w-3 h-3" />
                <span>{data.modelUsed}</span>
              </div>
           </div>

           <div className="text-[10px] font-mono tabular-nums">
              {data.pipelineDurationMs}ms
           </div>
        </div>
      </PanelFrame>

      <SourcesModal
        isOpen={showSourcesModal}
        onClose={() => setShowSourcesModal(false)}
        data={data}
      />

      <RawAnalysisModal
        isOpen={showRawModal}
        onClose={() => setShowRawModal(false)}
        data={data}
      />
    </>
  );
}
