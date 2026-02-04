import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/app/lib/utils';
import { ExecutionPhase, PhaseDurations } from '@/app/lib/maxwell/types';
import { ContinuousProgress } from './primitives/ContinuousProgress';

export interface ResearchProgressProps {
  phase: ExecutionPhase;
  phaseDurations: PhaseDurations;
  phaseStartTimes: Record<string, number>;
  sourceCount?: number;
  verificationProgress?: { current: number; total: number } | null;
  className?: string;
}

const VERBS_WHIMSICAL = [
  'Brewing', 'Cooking', 'Noodling', 'Sketching', 'Tinkering',
  'Weaving', 'Mixing', 'Gathering', 'Polishing', 'Sparkling',
  'Spinning', 'Sifting', 'Baking', 'Gardening', 'Painting',
];

const VERBS_CLASSIC = [
  'Pondering', 'Synthesizing', 'Cogitating', 'Discovering', 'Exploring',
  'Reticulating', 'Marinating', 'Crunching', 'Composing', 'Sculpting',
  'Harvesting', 'Hacking', 'Scheming',
];

const VERBS_DEEP = [
  'Contemplating', 'Deliberating', 'Ruminating', 'Reasoning', 'Analyzing',
  'Calculating', 'Orchestrating', 'Formulating', 'Deciphering', 'Unraveling',
  'Meditating', 'Envisioning', 'Deconstructing', 'Mapping', 'Navigating',
];

const VERBS_TECHNICAL = [
  'Triangulating', 'Parsing', 'Indexing', 'Traversing', 'Scrutinizing',
  'Grokking', 'Iterating', 'Compiling', 'Modulating', 'Oscillating',
  'Permutating', 'Quantizing',
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getVerbPoolForTime(elapsedSeconds: number): string[] {
  if (elapsedSeconds < 20) {
    return [...VERBS_WHIMSICAL, ...VERBS_CLASSIC];
  } else if (elapsedSeconds < 60) {
    return [...VERBS_CLASSIC, ...VERBS_DEEP];
  } else if (elapsedSeconds < 120) {
    return [...VERBS_DEEP, ...VERBS_TECHNICAL];
  } else {
    return [...VERBS_DEEP, ...VERBS_TECHNICAL, ...VERBS_CLASSIC];
  }
}

export function ResearchProgress({
  phase,
  phaseStartTimes,
  sourceCount = 0,
  verificationProgress,
  className,
}: ResearchProgressProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [currentVerb, setCurrentVerb] = useState('Thinking');
  const usedVerbsRef = useRef<Set<string>>(new Set());
  const lastMoodRef = useRef<number>(0);

  const getNextVerb = useCallback((elapsedSeconds: number) => {
    const currentMood = elapsedSeconds < 20 ? 0 : elapsedSeconds < 60 ? 1 : elapsedSeconds < 120 ? 2 : 3;
    
    if (currentMood !== lastMoodRef.current) {
      usedVerbsRef.current.clear();
      lastMoodRef.current = currentMood;
    }

    const pool = getVerbPoolForTime(elapsedSeconds);
    const available = pool.filter(v => !usedVerbsRef.current.has(v));
    
    if (available.length === 0) {
      usedVerbsRef.current.clear();
      const shuffled = shuffleArray(pool);
      usedVerbsRef.current.add(shuffled[0]);
      return shuffled[0];
    }
    
    const shuffled = shuffleArray(available);
    usedVerbsRef.current.add(shuffled[0]);
    return shuffled[0];
  }, []);

  useEffect(() => {
    const startTime = phaseStartTimes['decomposition'];
    if (!startTime || phase === 'complete' || phase === 'idle' || phase === 'error') return;

    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 30);

    return () => clearInterval(interval);
  }, [phaseStartTimes, phase]);

  const elapsedMsRef = useRef(0);
  
  useEffect(() => {
    elapsedMsRef.current = elapsedMs;
  }, [elapsedMs]);

  useEffect(() => {
    if (phase === 'complete' || phase === 'idle' || phase === 'error') return;

    setCurrentVerb(getNextVerb(0));

    const interval = setInterval(() => {
      const elapsed = elapsedMsRef.current / 1000;
      setCurrentVerb(getNextVerb(elapsed));
    }, 2500 + Math.random() * 1000);

    return () => clearInterval(interval);
  }, [phase, getNextVerb]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const h = Math.floor((ms % 1000) / 10);
    return `${m}:${s.toString().padStart(2, '0')}.${h.toString().padStart(2, '0')}`;
  };

  const getDetail = () => {
    if (phase === 'search' && sourceCount > 0) {
      return `${sourceCount} sources`;
    }
    if (phase === 'verification' && verificationProgress && verificationProgress.total > 0) {
      return `${verificationProgress.current}/${verificationProgress.total} claims`;
    }
    return null;
  };

  const detail = getDetail();

  return (
    <div className={cn("flex flex-col h-full w-full min-h-[240px] relative", className)}>
      <ContinuousProgress phase={phase} />

      <div className="flex-1 flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentVerb}
              initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="flex flex-col items-center gap-2"
            >
              <span className="text-[14px] font-medium tracking-tight text-shimmer">
                {currentVerb}...
              </span>
              {detail && (
                <span className="text-[11px] text-white/40 font-mono">
                  {detail}
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <span className="text-[11px] font-mono text-white/25 tabular-nums tracking-wide">
          {formatTime(elapsedMs)}
        </span>
      </div>
    </div>
  );
}
