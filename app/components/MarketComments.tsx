'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MessageSquare, ThumbsUp, TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import { MarketComment, Platform } from '@/app/lib/markets/types';
import { getMarketComments } from '@/app/actions/market-data';

interface MarketCommentsProps {
  marketId: string;
  platform: Platform;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function SentimentBadge({ sentiment }: { sentiment?: 'bullish' | 'bearish' | 'neutral' }) {
  if (!sentiment) return null;
  
  const config = {
    bullish: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: TrendingUp, label: 'Bullish' },
    bearish: { color: 'text-rose-400', bg: 'bg-rose-400/10', icon: TrendingDown, label: 'Bearish' },
    neutral: { color: 'text-white/40', bg: 'bg-white/5', icon: Minus, label: 'Neutral' },
  };
  
  const style = config[sentiment];
  const Icon = style.icon;
  
  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium ${style.color} ${style.bg}`}>
      <Icon className="w-3 h-3" />
      {style.label}
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 60;
  const height = 20;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MarketComments({ marketId, platform }: MarketCommentsProps) {
  const [comments, setComments] = useState<MarketComment[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (platform !== 'polymarket') return;
    
    
    
async function load() {
      setLoading(true);
      try {
        console.log('🐛 CLIENT: Calling getMarketComments with:', marketId);
        const data = await getMarketComments(marketId);
        console.log('🐛 CLIENT: Received comments:', data.length);
        setComments(data);
      } catch (err) {
        console.error('Failed to fetch comments', err);
      } finally {
        setLoading(false);
      }
    }
    
    load();
  }, [marketId, platform]);

const sentimentStats = useMemo(() => {
    if (comments.length === 0) return null;
    
    const bullish = comments.filter(c => c.sentiment === 'bullish').length;
    const bearish = comments.filter(c => c.sentiment === 'bearish').length;
    const total = bullish + bearish;
    
    if (total === 0) return null;
    
    const score = Math.round((bullish / total) * 100);
    const label = score > 60 ? 'Bullish' : score < 40 ? 'Bearish' : 'Neutral';
    const color = score > 60 ? '#34d399' : score < 40 ? '#fb7185' : '#a1a1aa';
    
    const sparklineData = Array.from({ length: 10 }, () => Math.random() * 100);
    
    return { score, label, color, sparklineData };
  }, [comments]);

  if (platform !== 'polymarket') {
    return null;
  }

  if (loading && comments.length === 0) {
    return (
      <div className="mt-8">
        <div className="h-4 w-24 bg-white/5 rounded mb-4 animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-white/5 shrink-0 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="mt-8 pt-6 border-t border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">
            Market Intelligence
          </span>
        </div>
        <p className="text-[13px] text-white/20">
          No comments available for this market
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 pt-6 border-t border-white/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">
            Market Intelligence
          </span>
          <span className="text-[10px] text-white/20 font-mono">
            {comments.length}
          </span>
        </div>
        
        {sentimentStats ? (
          <div className="flex items-center gap-3">
            <Sparkline data={sentimentStats.sparklineData} color={sentimentStats.color} />
            <span 
              className="text-[10px] font-mono font-medium"
              style={{ color: sentimentStats.color }}
            >
              {sentimentStats.score}% {sentimentStats.label}
            </span>
          </div>
        ) : null}
      </div>

      <div className="space-y-5">
        {comments.slice(0, 10).map(comment => (
          <div key={comment.id} className="group">
            <div className="flex items-start gap-3">
              {comment.avatarUrl ? (
                <img 
                  src={comment.avatarUrl} 
                  alt={comment.username}
                  className="w-6 h-6 rounded-full object-cover shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-[9px] text-white/50 font-mono">
                  {comment.username.slice(0, 2).toUpperCase()}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-white/70 group-hover:text-white/90 transition-colors truncate max-w-[120px]">
                      {comment.username}
                    </span>
                    <span className="text-[10px] text-white/20 font-mono">
                      {formatTimeAgo(comment.timestamp)}
                    </span>
                    <SentimentBadge sentiment={comment.sentiment} />
                  </div>
                  
                  {comment.likes > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-white/20">
                      <ThumbsUp className="w-2.5 h-2.5" />
                      {comment.likes}
                    </div>
                  )}
                </div>
                
                <p className="text-[13px] text-white/50 leading-relaxed group-hover:text-white/70 transition-colors break-words">
                  {comment.text}
                </p>
                
                {comment.replyCount > 0 && (
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/20 group-hover:text-white/30 transition-colors">
                    <div className="w-3 h-[1px] bg-white/10" />
                    <MessageSquare className="w-2.5 h-2.5" />
                    {comment.replyCount} replies
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {comments.length > 10 && (
        <a 
          href={`https://polymarket.com/market/${marketId.replace('poly:', '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-6 text-center text-[10px] text-white/30 hover:text-white/50 transition-colors flex items-center justify-center gap-1.5"
        >
          View all {comments.length} comments on Polymarket
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      )}
    </div>
  );
}