'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Clock, Info } from 'lucide-react';
import type { UnifiedMarket } from '@/app/lib/markets/types';
import { PolymarketLogo, KalshiLogo } from './icons/PlatformIcons';

interface MarketDataPanelProps {
  market: UnifiedMarket;
}

const generateChartData = (currentOdds: number) => {
  const data = [];
  let price = currentOdds;
  const now = new Date();
  
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const drift = (currentOdds - price) * 0.1;
    const noise = (Math.random() - 0.5) * 4;
    price = Math.max(1, Math.min(99, price + drift + noise));
    
    data.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: Math.round(price)
    });
  }
  
  data[data.length - 1].price = currentOdds;
  return data;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#18151d] border border-white/10 p-2 rounded-lg shadow-xl">
        <p className="text-[10px] text-white/40 mb-1">{label}</p>
        <p className="text-sm font-mono font-bold text-white">
          {payload[0].value}%
        </p>
      </div>
    );
  }
  return null;
};

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}K`;
  return `$${volume.toFixed(0)}`;
}

export default function MarketDataPanel({ market }: MarketDataPanelProps) {
  const isPoly = market.platform === 'polymarket';
  const accentColor = isPoly ? 'text-blue-400' : 'text-emerald-400';
  const strokeColor = isPoly ? '#60a5fa' : '#34d399';
  const fillColor = isPoly ? 'url(#colorBlue)' : 'url(#colorEmerald)';
  
  const odds = Math.round(market.yesPrice * 100);
  const formattedVolume = formatVolume(market.volume);
  const chartData = generateChartData(odds);

  return (
    <div className="flex flex-col h-full bg-[#120F14] overflow-y-auto custom-scrollbar">
      <div className="p-6 md:p-8 pb-0">
        <div className="flex items-center gap-2 mb-4">
          <div className={`p-1.5 rounded-lg ${isPoly ? 'bg-blue-500/10' : 'bg-emerald-500/10'}`}>
            {isPoly ? <PolymarketLogo className="w-4 h-4" /> : <KalshiLogo className="w-4 h-4" />}
          </div>
          <span className="text-xs font-mono uppercase tracking-widest text-white/40">
            {market.platform} Market
          </span>
        </div>
        
        <h1 className="text-2xl md:text-3xl font-medium text-white mb-6 leading-tight">
          {market.title}
        </h1>

        <div className="flex items-end justify-between mb-8">
          <div>
            <div className={`text-5xl md:text-6xl font-mono font-bold tracking-tighter ${accentColor}`}>
              {odds}<span className="text-2xl opacity-50">%</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="flex items-center gap-1 text-emerald-400 text-sm font-medium">
                <ArrowUpRight size={14} />
                +2.4%
              </span>
              <span className="text-white/20 text-sm">24h Change</span>
            </div>
          </div>
          
          <div className="text-right">
             <div className="text-sm text-white/40 mb-1">Volume</div>
             <div className="text-xl font-mono text-white">{formattedVolume}</div>
          </div>
        </div>
      </div>

      <div className="h-[300px] w-full px-4 mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorEmerald" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke={strokeColor} 
              strokeWidth={2}
              fill={fillColor} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="px-6 md:px-8 space-y-8 pb-12">
        <div>
           <h3 className="text-[11px] uppercase tracking-[0.2em] text-white/40 font-medium mb-4">
             Order Book Depth
           </h3>
           <div className="grid grid-cols-2 gap-px bg-white/5 rounded-lg overflow-hidden border border-white/5">
             <div className="bg-[#18151d] p-3">
               <div className="text-xs text-white/30 mb-2 text-center">Buy (Yes)</div>
               <div className="space-y-1">
                 {[1, 2, 3].map((i) => (
                   <div key={i} className="flex justify-between text-xs font-mono relative">
                     <span className="text-white/80 z-10">{odds - i}¢</span>
                     <span className="text-white/40 z-10">{(10 - i * 2)}k</span>
                     <div 
                       className="absolute right-0 top-0 bottom-0 bg-emerald-500/10" 
                       style={{ width: `${60 - i * 10}%` }}
                     />
                   </div>
                 ))}
               </div>
             </div>
             <div className="bg-[#18151d] p-3">
               <div className="text-xs text-white/30 mb-2 text-center">Sell (No)</div>
                <div className="space-y-1">
                 {[1, 2, 3].map((i) => (
                   <div key={i} className="flex justify-between text-xs font-mono relative">
                     <span className="text-white/80 z-10">{odds + i}¢</span>
                     <span className="text-white/40 z-10">{(8 - i * 1.5)}k</span>
                     <div 
                       className="absolute left-0 top-0 bottom-0 bg-rose-500/10" 
                       style={{ width: `${50 - i * 8}%` }}
                     />
                   </div>
                 ))}
               </div>
             </div>
           </div>
        </div>

        <div>
           <h3 className="text-[11px] uppercase tracking-[0.2em] text-white/40 font-medium mb-4 flex items-center gap-2">
             <Info size={12} />
             Resolution Rules
           </h3>
           <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white/60 leading-relaxed">
             <p>
               This market resolves to "Yes" if the event occurs as specified by the reporting agency. 
               Resolution is based on official data released by the governing body.
               <br/><br/>
               <span className="text-white/30 text-xs">
                 Market closes on {new Date(Date.now() + 86400000 * 4).toLocaleDateString()}
               </span>
             </p>
           </div>
        </div>
      </div>
    </div>
  );
}
