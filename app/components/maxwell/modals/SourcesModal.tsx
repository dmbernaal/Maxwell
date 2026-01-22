import React from 'react';
import { MaxwellIntelligence } from '@/app/lib/maxwell/types';
import { X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: MaxwellIntelligence;
}

export function SourcesModal({ isOpen, onClose, data }: SourcesModalProps) {
  const { raw } = data;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-3xl bg-[#0a0a0a] border border-white/10 rounded-lg shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a0a]">
          <h2 className="text-[14px] font-medium text-white tracking-wide">
            Source Analysis ({raw.allSources.length})
          </h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-sm transition-colors text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4">
          {raw.allSources.map((source, i) => (
            <div key={i} className="flex gap-4 group">
               <div className="flex-shrink-0 w-8 text-right font-mono text-[11px] text-white/30 pt-1">
                  [{i + 1}]
               </div>
               <div className="flex-1 space-y-1.5 pb-4 border-b border-white/5 last:border-0 last:pb-0">
                  <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[13px] text-[#4ade80] hover:underline flex items-center gap-2 w-fit"
                  >
                    {source.title}
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                  <p className="text-[11px] font-mono text-white/40">{new URL(source.url).hostname}</p>
                  <p className="text-[13px] text-white/70 leading-relaxed">
                    {source.snippet}
                  </p>
               </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
