import React from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, Zap, Layers, Scale, Sparkles } from 'lucide-react';
import type { ExecutionConfig } from '../../lib/maxwell/configFactory';

interface PlanningCardProps {
    config: ExecutionConfig;
}

export function PlanningCard({ config }: PlanningCardProps) {
    // Map complexity to visual elements
    const getModeDetails = (complexity: string) => {
        switch (complexity) {
            case 'simple':
                return {
                    icon: Zap,
                    label: 'Speed Mode',
                    desc: 'Optimized for velocity',
                    color: 'text-emerald-400' // Subtle accent
                };
            case 'deep_research':
                return {
                    icon: BrainCircuit,
                    label: 'Deep Research',
                    desc: 'Maximum depth & verification',
                    color: 'text-violet-400' // Brand accent
                };
            case 'standard':
            default:
                return {
                    icon: Layers,
                    label: 'Standard Mode',
                    desc: 'Balanced analysis',
                    color: 'text-blue-400' // Subtle accent
                };
        }
    };

    const mode = getModeDetails(config.complexity);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mb-6"
        >
            {/* Obsidian Card Container */}
            <div className="relative overflow-hidden rounded-xl border border-white/5 bg-[#18151d] p-5">

                {/* Subtle Gradient Glow (Top Right) */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 blur-[50px] rounded-full pointer-events-none" />

                {/* Header Section */}
                <div className="relative z-10 flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div>
                            <h3 className="text-sm font-medium text-white/90 tracking-tight">
                                {mode.label}
                            </h3>
                            <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider mt-0.5">
                                {mode.desc}
                            </p>
                        </div>
                    </div>

                    {/* Complexity Badge */}
                    <div className="px-2 py-1 rounded border border-white/5 bg-white/[0.02]">
                        <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">
                            {config.complexity.replace('_', ' ')}
                        </span>
                    </div>
                </div>

                {/* Reasoning Text */}
                <div className="relative z-10 mb-6 pl-3 border-l border-white/10 ml-1">
                    <p className="text-[13px] text-white/60 leading-relaxed font-light italic">
                        "{config.reasoning}"
                    </p>
                </div>

                {/* Technical Grid */}
                <div className="relative z-10 grid grid-cols-2 gap-px bg-white/5 border border-white/5 rounded-lg overflow-hidden">
                    {/* Cell 1: Model */}
                    <div className="bg-[#18151d] p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles size={10} className="text-white/20" />
                            <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider">
                                Model
                            </span>
                        </div>
                        <span className="text-xs font-mono text-white/80 truncate block">
                            {config.synthesisModel.split('/').pop()}
                        </span>
                    </div>

                    {/* Cell 2: Search Depth */}
                    <div className="bg-[#18151d] p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Layers size={10} className="text-white/20" />
                            <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider">
                                Depth
                            </span>
                        </div>
                        <span className="text-xs font-mono text-white/80">
                            {config.resultsPerQuery} results/q
                        </span>
                    </div>

                    {/* Cell 3: Verification */}
                    <div className="bg-[#18151d] p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Scale size={10} className="text-white/20" />
                            <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider">
                                Verify
                            </span>
                        </div>
                        <span className="text-xs font-mono text-white/80">
                            {config.verificationConcurrency}x parallel
                        </span>
                    </div>

                    {/* Cell 4: Max Claims */}
                    <div className="bg-[#18151d] p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2.5 h-2.5 rounded-full border border-white/20 flex items-center justify-center text-[6px] text-white/40 font-mono">
                                #
                            </div>
                            <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider">
                                Claims
                            </span>
                        </div>
                        <span className="text-xs font-mono text-white/80">
                            Max {config.maxClaimsToVerify}
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
