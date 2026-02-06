import React, { useState } from 'react';
import { PanelFrame } from './primitives/PanelFrame';
import { motion, useReducedMotion } from 'framer-motion';

interface ErrorPanelProps {
  error: Error;
  onRetry?: () => void;
}

export function ErrorPanel({ error, onRetry }: ErrorPanelProps) {
  const shouldReduceMotion = useReducedMotion();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <PanelFrame>
      <div
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[#FA5D19] font-bold">⚡ MAXWELL</span>
            <span className="text-white/60 font-mono text-xs">⚠ ERROR</span>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
          >
            <div className="w-3 h-3 rounded-full bg-[#FA5D19]" />
          </motion.div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">
            Analysis failed
          </h3>
          <p className="text-sm text-gray-400">
            Unable to complete research. This may be a temporary issue.
          </p>
        </div>

        <details className="mb-6 font-mono text-xs text-gray-500">
          <summary
            className="cursor-pointer hover:text-gray-400 select-none"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? '▼' : '▶'} [Technical details]
          </summary>
          <motion.div
            initial={false}
            animate={{
              height: showDetails ? 'auto' : 0,
              opacity: showDetails ? 1 : 0,
            }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            className="overflow-hidden"
          >
            <pre className="bg-black/50 p-3 mt-2 rounded-sm border border-white/5 overflow-x-auto">
              {error.message}
              {error.stack && '\n\n' + error.stack}
            </pre>
          </motion.div>
        </details>

        {onRetry && (
          <motion.button
            onClick={onRetry}
            className="w-full font-mono text-sm bg-[#FA5D19]/20 hover:bg-[#FA5D19]/30
                       text-[#FA5D19] px-4 py-3 rounded-sm
                       transition-all-200"
            whileHover={!shouldReduceMotion ? { scale: 1.02 } : undefined}
            whileTap={!shouldReduceMotion ? { scale: 0.98 } : undefined}
            aria-label="Retry analysis"
          >
            [Retry] (Enter)
          </motion.button>
        )}

        <div className="mt-4 text-center">
          <span className="font-mono text-xs text-white/30">
            Press <kbd className="bg-white/10 px-1 rounded">Enter</kbd> to retry
          </span>
        </div>
      </div>
    </PanelFrame>
  );
}
