import React, { useState } from 'react';
import { MaxwellIntelligence, ExecutionPhase, PhaseDurations } from '@/app/lib/maxwell/types';
import { PanelFrame } from './primitives/PanelFrame';
import { SectionDivider } from './primitives/SectionDivider';
import { SkeletonBlock } from './primitives/SkeletonBlock';
import { AssessmentSection } from './sections/AssessmentSection';
import { OutcomesSection } from './sections/OutcomesSection';
import { ThesisSection } from './sections/ThesisSection';
import { ResolutionRiskSection } from './sections/ResolutionRiskSection';
import { SourcesSection } from './sections/SourcesSection';
import { ErrorPanel } from './ErrorPanel';
import { EmptyPanel } from './EmptyPanel';
import { RawOutputSection } from './sections/RawOutputSection';
import { SourcesModal } from './modals/SourcesModal';
import { ResearchProgress } from './ResearchProgress';
import { Terminal, Database } from 'lucide-react';
import { cn } from '@/app/lib/utils';

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

  if (error) {
    return <ErrorPanel error={error} onRetry={onRetry} />;
  }

  if (isLoading) {
    return (
      <EmptyPanel 
        isLoading={true}
        phase={phase}
        phaseDurations={phaseDurations}
        phaseStartTimes={phaseStartTimes}
        sourceCount={sourceCount}
        verificationProgress={verificationProgress}
      />
    );
  }

  if (!data) {
    return <EmptyPanel onGenerate={onRetry} />;
  }

  return (
    <>
      <PanelFrame className={cn("bg-[#111111] !p-0 divide-y divide-[#2A2A2A]", className)}>
        <div className="border-b border-[#2A2A2A]">
          <AssessmentSection data={data} />
        </div>

        <OutcomesSection data={data} />

        <div className="divide-y divide-[#2A2A2A] overflow-visible">
          <ThesisSection data={data} />
          <ResolutionRiskSection data={data} />
          
          <div className="border-t border-[#2A2A2A]">
            <SourcesSection
              data={data}
              onViewAll={() => setShowSourcesModal(true)}
            />
          </div>
          
          <RawOutputSection data={data} />
        </div>
      </PanelFrame>

      <SourcesModal
        isOpen={showSourcesModal}
        onClose={() => setShowSourcesModal(false)}
        data={data}
      />
    </>
  );
}
