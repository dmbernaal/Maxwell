import React, { useState } from 'react';
import { MaxwellIntelligence } from '@/app/lib/maxwell/types';
import { Copy, Check, ChevronDown, Terminal } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { CornerGridDecoration } from '../primitives/CornerGridDecoration';

interface RawOutputSectionProps {
  data: MaxwellIntelligence;
}

export function RawOutputSection({ data }: RawOutputSectionProps) {
  const { raw } = data;
  const [activeTab, setActiveTab] = useState<'synthesis' | 'adjudication'>('synthesis');
  const [copied, setCopied] = useState(false);

  const content = activeTab === 'synthesis' ? raw.synthesis : raw.adjudication;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-b border-[#2A2A2A] relative overflow-visible">
      <CornerGridDecoration className="absolute -top-[10px] -right-[11px] z-30" />
      <CornerGridDecoration className="absolute -top-[10px] -left-[11px] z-30" />
      
      <div className="h-12 flex items-center justify-between px-6 bg-transparent select-none border-b border-[#2A2A2A]">
        <div className="flex items-center gap-2">
          <ChevronDown className="w-3.5 h-3.5 text-[#FA5D19]" />
          <span className="font-semibold text-[16px] text-white tracking-tight uppercase">Raw Analysis</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('synthesis')}
              className={cn(
                "text-[12px] font-medium transition-colors border-b-2 pb-0.5",
                activeTab === 'synthesis' 
                  ? "text-white border-[#FA5D19]" 
                  : "text-white/30 border-transparent hover:text-white/60"
              )}
            >
              Synthesis
            </button>
            <button
              onClick={() => setActiveTab('adjudication')}
              className={cn(
                "text-[12px] font-medium transition-colors border-b-2 pb-0.5",
                activeTab === 'adjudication' 
                  ? "text-white border-[#FA5D19]" 
                  : "text-white/30 border-transparent hover:text-white/60"
              )}
            >
              Adjudication
            </button>
          </div>

          <div className="w-[1px] h-3 bg-[#2A2A2A]" />

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[12px] text-white/30 hover:text-white transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#FA5D19]" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className="p-6 bg-[#141414] relative overflow-visible">
        <CornerGridDecoration className="absolute -top-[10px] -right-[11px] z-30" />
        <CornerGridDecoration className="absolute -top-[10px] -left-[11px] z-30" />
        
        <div className="max-h-[300px] overflow-y-auto no-scrollbar">
          <pre className="whitespace-pre-wrap font-mono text-[12px] text-white/60 leading-relaxed">
            {content}
          </pre>
        </div>
      </div>
      
      <CornerGridDecoration className="absolute -bottom-[10px] -right-[11px] z-30" />
      <CornerGridDecoration className="absolute -bottom-[10px] -left-[11px] z-30" />
    </div>
  );
}
