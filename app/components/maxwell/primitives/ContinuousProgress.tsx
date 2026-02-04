import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ExecutionPhase } from '@/app/lib/maxwell/types';
import { cn } from '@/app/lib/utils';

interface ContinuousProgressProps {
  phase: ExecutionPhase;
  className?: string;
}

const PHASE_RANGES: Record<string, [number, number]> = {
  idle: [0, 0],
  decomposition: [0, 18],
  search: [18, 45],
  synthesis: [45, 65],
  verification: [65, 82],
  adjudication: [82, 94],
  presenter: [94, 99],
  complete: [100, 100],
  error: [100, 100],
};

const PHASE_DURATIONS_SECONDS: Record<string, number> = {
  idle: 0,
  decomposition: 2.5,
  search: 6,
  synthesis: 5,
  verification: 4,
  adjudication: 3,
  presenter: 2,
  complete: 0,
  error: 0,
};

export function ContinuousProgress({ phase, className }: ContinuousProgressProps) {
  const progressValue = useMotionValue(0);
  const smoothProgress = useSpring(progressValue, { stiffness: 100, damping: 20, mass: 0.8 });
  const width = useTransform(smoothProgress, (v) => `${Math.max(0, Math.min(100, v))}%`);
  
  const phaseStartTimeRef = useRef<number>(Date.now());
  const previousPhaseRef = useRef<ExecutionPhase>(phase);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (phase !== previousPhaseRef.current) {
      phaseStartTimeRef.current = Date.now();
      previousPhaseRef.current = phase;
    }
  }, [phase]);

  useEffect(() => {

    if (phase === 'idle') {
      progressValue.set(0);
      return;
    }

    if (phase === 'complete' || phase === 'error') {
      progressValue.set(100);
      return;
    }

    const [phaseStart, phaseEnd] = PHASE_RANGES[phase] || [0, 0];
    const phaseDuration = PHASE_DURATIONS_SECONDS[phase] || 5;
    const phaseRange = phaseEnd - phaseStart;

    const animate = () => {
      const elapsed = (Date.now() - phaseStartTimeRef.current) / 1000;
      const t = elapsed / phaseDuration;
      const eased = 1 - Math.pow(1 - Math.min(t, 0.92), 3);
      const newProgress = phaseStart + (phaseRange * eased);
      progressValue.set(newProgress);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [phase, progressValue]);

  const isActive = phase !== 'idle' && phase !== 'complete' && phase !== 'error';

  return (
    <div className={cn("relative w-full h-[3px] bg-white/[0.04] overflow-visible", className)}>
      <motion.div
        style={{ width }}
        className="absolute top-0 left-0 h-full"
      >
        <div 
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.08), rgba(255,255,255,0.25), rgba(255,255,255,0.95))' }}
        />
        
        <div 
          className="absolute right-0 top-1/2 -translate-y-1/2 w-20 h-[6px] blur-[5px]"
          style={{ background: 'linear-gradient(to left, rgba(255,255,255,0.9), rgba(255,255,255,0.3), transparent)' }}
        />
        
        <div 
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-[3px] rounded-full bg-white translate-x-[1px]"
          style={{ boxShadow: '0 0 6px 2px rgba(255,255,255,0.95), 0 0 12px 4px rgba(255,255,255,0.5), 0 0 24px 8px rgba(255,255,255,0.2)' }}
        />
      </motion.div>

      {isActive && (
        <motion.div
          className="absolute top-0 left-0 h-full w-[60px] bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{ x: ['0%', '2000%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </div>
  );
}
