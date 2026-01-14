'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

import MarketDataPanel from '../../components/MarketDataPanel';
import { MarketIntelligencePanel } from '../../components/maxwell/MarketIntelligencePanel';
import { MOCK_MARKETS } from '../../lib/market-data';
import { useMaxwell } from '../../hooks/use-maxwell';
import { SmallGhostLogo } from '../../components/SmallGhostLogo';

type Params = Promise<{ id: string }>;

export default function MarketDetailPage(props: { params: Params }) {
  const params = use(props.params);
  const router = useRouter();
  const maxwell = useMaxwell();
  
  const market = MOCK_MARKETS.find(m => m.id === params.id);
  const [hasStartedAnalysis, setHasStartedAnalysis] = useState(false);

  useEffect(() => {
    if (market && !hasStartedAnalysis && maxwell.phase === 'idle') {
      setHasStartedAnalysis(true);
      const query = `Analyze the prediction market: "${market.title}". giving a probability verdict and key evidence.`;
      maxwell.search(query);
    }
  }, [market, maxwell, hasStartedAnalysis]);

  if (!market) {
    return (
      <div className="min-h-screen bg-[#120F14] flex items-center justify-center text-white/40 font-mono">
        Market not found
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#120F14] text-white flex flex-col md:flex-row overflow-hidden">
      
      <div className="md:hidden p-4 border-b border-white/5 flex items-center justify-between bg-[#120F14] z-20">
        <button 
          onClick={() => router.back()}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="w-8 h-8">
           <SmallGhostLogo isActive={maxwell.phase !== 'idle' && maxwell.phase !== 'complete'} />
        </div>
      </div>

      <div className="flex-1 md:flex-[1.4] h-[50vh] md:h-screen overflow-hidden border-r border-white/5 relative z-10">
        
        <motion.button 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => router.back()}
          className="hidden md:flex absolute top-6 left-6 z-50 p-2.5 rounded-full bg-[#18151d]/80 backdrop-blur-md border border-white/10 hover:border-white/20 text-white/40 hover:text-white transition-all group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
        </motion.button>

        <MarketDataPanel market={market} />
      </div>

      <div className="flex-1 h-[50vh] md:h-screen bg-[#18151d] relative z-20 shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
        <MarketIntelligencePanel 
          phase={maxwell.phase}
          subQueries={maxwell.subQueries}
          searchMetadata={maxwell.searchMetadata}
          sources={maxwell.sources}
          verification={maxwell.verification}
          verificationProgress={maxwell.verificationProgress}
          phaseDurations={maxwell.phaseDurations}
          phaseStartTimes={maxwell.phaseStartTimes}
          events={maxwell.events}
          answer={maxwell.answer}
          adjudication={maxwell.adjudication}
          config={maxwell.config}
          onQuery={(q) => maxwell.search(q)}
        />
      </div>

    </main>
  );
}
