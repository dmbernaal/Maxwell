import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { MaxwellIntelligence } from '@/app/lib/maxwell/types';
import { cn } from '@/app/lib/utils';

interface IntelligenceSummaryProps {
  intelligence: MaxwellIntelligence;
}

export function IntelligenceSummary({ intelligence }: IntelligenceSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!intelligence?.raw?.adjudication) return null;

  return (
    <div className="w-full border-t border-[#2A2A2A]">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full h-10 flex items-center justify-between px-4 bg-transparent hover:bg-[#1A1A1A] transition-colors group select-none"
      >
        <div className="flex items-center gap-2">
          <div className={cn(
            "text-[#525252] transition-transform duration-200",
            isExpanded ? "rotate-90 text-[#A3A3A3]" : "group-hover:text-[#737373]"
          )}>
            <ChevronRight className="w-3 h-3" />
          </div>
          <span className="text-[11px] font-medium text-[#666666] group-hover:text-[#A3A3A3] transition-colors uppercase tracking-wider">
            Analysis
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...props }) => <h1 className="text-sm font-medium mb-3 text-white" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-xs font-medium mb-2 mt-4 text-[#A3A3A3] uppercase tracking-wider" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-xs font-medium mb-2 mt-3 text-white" {...props} />,
                    p: ({ node, ...props }) => <p className="text-[13px] text-[#A3A3A3] leading-6 mb-3 font-sans" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-3 space-y-1" {...props} />,
                    li: ({ node, ...props }) => <li className="text-[#A3A3A3] pl-1 text-[13px] font-sans" {...props} />,
                    strong: ({ node, ...props }) => <strong className="text-white font-medium" {...props} />,
                  }}
                >
                  {intelligence.raw.adjudication}
                </ReactMarkdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
