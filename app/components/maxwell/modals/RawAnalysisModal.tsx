import React, { useState } from 'react';
import { MaxwellIntelligence } from '@/app/lib/maxwell/types';
import { X, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/app/lib/utils';

interface RawAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: MaxwellIntelligence;
}

export function RawAnalysisModal({ isOpen, onClose, data }: RawAnalysisModalProps) {
  const { raw } = data;
  const [activeTab, setActiveTab] = useState<'synthesis' | 'adjudication'>('synthesis');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const content = activeTab === 'synthesis' ? raw.synthesis : raw.adjudication;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab('synthesis')}
              className={cn(
                "text-[13px] font-medium transition-colors pb-1 border-b-2",
                activeTab === 'synthesis' 
                  ? "text-white border-brand-accent" 
                  : "text-white/40 border-transparent hover:text-white/80"
              )}
            >
              Synthesis
            </button>
            <button
              onClick={() => setActiveTab('adjudication')}
              className={cn(
                "text-[13px] font-medium transition-colors pb-1 border-b-2",
                activeTab === 'adjudication' 
                  ? "text-white border-brand-accent" 
                  : "text-white/40 border-transparent hover:text-white/80"
              )}
            >
              Adjudication
            </button>
          </div>

          <div className="flex items-center gap-2">
             <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-white/10 rounded-sm transition-colors text-white/60 hover:text-white flex items-center gap-2 text-[11px]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-brand-accent" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <div className="w-[1px] h-4 bg-white/10 mx-1" />
            <button 
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded-sm transition-colors text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 bg-[#111]">
          <pre className="whitespace-pre-wrap font-mono text-[12px] text-white/70 leading-relaxed">
            {content}
          </pre>
        </div>
      </motion.div>
    </div>
  );
}