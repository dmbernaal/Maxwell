'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createChart, IChartApi, ISeriesApi, AreaSeries, LineSeries, ColorType, LineStyle, Time, MouseEventParams, MismatchDirection } from 'lightweight-charts';
import { ExternalLink, ChevronDown, TrendingUp, TrendingDown, Clock, BarChart3 } from 'lucide-react';
import type { UnifiedMarket, UnifiedMarketDetail, PricePoint, MarketOutcome, OrderBook, OutcomePriceHistory } from '@/app/lib/markets/types';
import { PolymarketLogo, KalshiLogo, PLATFORM_COLORS } from './icons/PlatformIcons';

interface MarketDataPanelProps {
  market: UnifiedMarket | UnifiedMarketDetail;
}

type TimeRange = '1D' | '1W' | '1M' | 'ALL';

function hasRealPriceHistory(market: UnifiedMarket | UnifiedMarketDetail): market is UnifiedMarketDetail {
  return 'priceHistory' in market && Array.isArray((market as UnifiedMarketDetail).priceHistory) && (market as UnifiedMarketDetail).priceHistory.length > 0;
}

function hasMultiOutcomePriceHistory(market: UnifiedMarket | UnifiedMarketDetail): market is UnifiedMarketDetail & { outcomePriceHistories: OutcomePriceHistory[] } {
  return 'outcomePriceHistories' in market && 
    Array.isArray((market as UnifiedMarketDetail).outcomePriceHistories) && 
    ((market as UnifiedMarketDetail).outcomePriceHistories?.length ?? 0) > 0;
}

function filterByTimeRange(priceHistory: PricePoint[], range: TimeRange): PricePoint[] {
  const now = Date.now();
  const ranges: Record<TimeRange, number> = {
    '1D': 24 * 60 * 60 * 1000,
    '1W': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000,
    'ALL': Infinity,
  };
  
  const cutoff = now - ranges[range];
  return priceHistory.filter(p => p.timestamp >= cutoff);
}

function formatCompact(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toFixed(0);
}

function formatTimeRemaining(endDate: Date): string {
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  
  if (diff <= 0) return 'Closed';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 30) {
    return endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (days > 0) return `${days}d`;
  return `${hours}h`;
}



function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 text-left group"
      >
        <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium group-hover:text-white/50 transition-colors">
          {title}
        </span>
        <ChevronDown 
          className={`w-3.5 h-3.5 text-white/20 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      {isOpen && (
        <div className="pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

function BinaryHero({ market, brandColor }: { market: UnifiedMarket; brandColor: string }) {
  const odds = Math.round(market.yesPrice * 100);
  const priceChange = market.previousPrice 
    ? ((market.yesPrice - market.previousPrice) / market.previousPrice) * 100 
    : null;
  
  return (
    <div className="mb-8">
      <div className="flex items-baseline gap-3">
        <span 
          className="text-6xl lg:text-7xl font-mono font-bold tracking-tighter"
          style={{ color: brandColor }}
        >
          {odds}
        </span>
        <span className="text-2xl text-white/20 font-mono">%</span>
        {priceChange !== null && (
          <span className={`flex items-center gap-0.5 text-sm font-mono ${priceChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {priceChange >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(1)}%
          </span>
        )}
      </div>
      <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">
        Yes probability
      </span>
    </div>
  );
}

function OutcomesList({ outcomes, brandColor, outcomeColors }: { outcomes: MarketOutcome[]; brandColor: string; outcomeColors?: Map<string, string> }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sortedOutcomes = [...outcomes].sort((a, b) => b.price - a.price);
  const topPrice = sortedOutcomes[0]?.price || 0;
  
  const INITIAL_SHOW = 6;
  const hasMore = sortedOutcomes.length > INITIAL_SHOW;
  const displayedOutcomes = isExpanded ? sortedOutcomes : sortedOutcomes.slice(0, INITIAL_SHOW);
  const hiddenCount = sortedOutcomes.length - INITIAL_SHOW;
  
  return (
    <div className="mb-6">
      <span className="text-[10px] uppercase tracking-widest text-white/25 font-medium block mb-3">
        Outcomes ({sortedOutcomes.length})
      </span>
      <div className="space-y-1">
        {displayedOutcomes.map((outcome, idx) => {
          const pct = Math.round(outcome.price * 100);
          const isLeading = outcome.price === topPrice && idx === 0;
          const barWidth = Math.max(4, (outcome.price / topPrice) * 100);
          const outcomeColor = outcomeColors?.get(outcome.name);
          const hasChartColor = !!outcomeColor;
          
          return (
            <div key={outcome.name} className="group">
              <div className="flex items-center justify-between gap-4 py-1">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {hasChartColor ? (
                    <div 
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: outcomeColor }}
                    />
                  ) : (
                    <span className={`text-[11px] font-mono w-5 shrink-0 ${isLeading ? 'text-white/50' : 'text-white/20'}`}>
                      {idx + 1}.
                    </span>
                  )}
                  <span className={`text-[13px] truncate ${isLeading ? 'text-white font-medium' : 'text-white/60'}`}>
                    {outcome.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-16 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${barWidth}%`,
                        backgroundColor: hasChartColor ? outcomeColor : (isLeading ? brandColor : 'rgba(255,255,255,0.2)'),
                      }}
                    />
                  </div>
                  <span className={`text-[13px] font-mono w-10 text-right tabular-nums ${isLeading ? 'text-white' : 'text-white/50'}`}>
                    {pct}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 text-[11px] font-mono text-white/40 hover:text-white/60 transition-colors flex items-center gap-1"
        >
          {isExpanded ? (
            <>Show less</>
          ) : (
            <>Show {hiddenCount} more</>
          )}
          <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
}

function MatchupHero({ market, brandColor }: { market: UnifiedMarket; brandColor: string }) {
  const outcomes = market.outcomes.slice(0, 2);
  const topOutcome = outcomes.reduce((a, b) => a.price > b.price ? a : b);
  
  return (
    <div className="mb-8">
      <div className="space-y-3">
        {outcomes.map((outcome) => {
          const pct = Math.round(outcome.price * 100);
          const isLeading = outcome === topOutcome;
          
          return (
            <div key={outcome.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div 
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: isLeading ? brandColor : 'rgba(255,255,255,0.2)' }}
                />
                <span className={`text-base truncate ${isLeading ? 'text-white font-medium' : 'text-white/60'}`}>
                  {outcome.name}
                </span>
              </div>
              <span 
                className={`text-2xl font-mono font-bold tabular-nums ${isLeading ? '' : 'text-white/40'}`}
                style={{ color: isLeading ? brandColor : undefined }}
              >
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatsRow({ market }: { market: UnifiedMarket }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-white/40 mb-6">
      <span>${formatCompact(market.volume)} vol</span>
      {market.volume24h > 0 && (
        <span>${formatCompact(market.volume24h)} 24h</span>
      )}
      {market.liquidity && market.liquidity > 0 && (
        <span>${formatCompact(market.liquidity)} liq</span>
      )}
      {market.openInterest && market.openInterest > 0 && (
        <span>{formatCompact(market.openInterest)} OI</span>
      )}
      <span className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {formatTimeRemaining(new Date(market.endDate))}
      </span>
    </div>
  );
}

function SpreadDisplay({ market }: { market: UnifiedMarket }) {
  if (!market.yesBid || !market.yesAsk) return null;
  
  const spread = Math.round((market.yesAsk - market.yesBid) * 100);
  
  return (
    <div className="flex items-center gap-6 text-[11px] font-mono mb-6 py-3 px-4 rounded-lg bg-white/[0.03]">
      <div>
        <span className="text-white/30 mr-2">Bid</span>
        <span className="text-emerald-400">{Math.round(market.yesBid * 100)}¢</span>
      </div>
      <div>
        <span className="text-white/30 mr-2">Ask</span>
        <span className="text-rose-400">{Math.round(market.yesAsk * 100)}¢</span>
      </div>
      <div>
        <span className="text-white/30 mr-2">Spread</span>
        <span className="text-white/60">{spread}¢</span>
      </div>
    </div>
  );
}

function hasOrderBook(market: UnifiedMarket | UnifiedMarketDetail): market is UnifiedMarketDetail & { orderBook: OrderBook } {
  return 'orderBook' in market && 
    market.orderBook !== undefined && 
    market.orderBook.bids.length > 0 && 
    market.orderBook.asks.length > 0;
}

function OrderBookDisplay({ orderBook, brandColor }: { orderBook: OrderBook; brandColor: string }) {
  const maxLevels = 5;
  const bids = orderBook.bids.slice(0, maxLevels);
  const asks = orderBook.asks.slice(0, maxLevels);
  
  const maxBidSize = Math.max(...bids.map(([, size]) => size), 1);
  const maxAskSize = Math.max(...asks.map(([, size]) => size), 1);
  const maxSize = Math.max(maxBidSize, maxAskSize);
  
  if (bids.length === 0 && asks.length === 0) return null;
  
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-3.5 h-3.5 text-white/20" />
        <span className="text-[10px] uppercase tracking-widest text-white/20 font-medium">
          Order Book
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] text-white/30 font-mono px-2 mb-1">
            <span>Price</span>
            <span>Size</span>
          </div>
          {bids.map(([price, size], i) => (
            <div key={`bid-${i}`} className="relative">
              <div 
                className="absolute inset-y-0 right-0 bg-emerald-500/10 rounded-sm"
                style={{ width: `${(size / maxSize) * 100}%` }}
              />
              <div className="relative flex justify-between items-center px-2 py-1 text-[11px] font-mono">
                <span className="text-emerald-400">{Math.round(price * 100)}¢</span>
                <span className="text-white/50">{formatCompact(size)}</span>
              </div>
            </div>
          ))}
          {bids.length === 0 && (
            <div className="text-[10px] text-white/20 text-center py-2">No bids</div>
          )}
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] text-white/30 font-mono px-2 mb-1">
            <span>Price</span>
            <span>Size</span>
          </div>
          {asks.map(([price, size], i) => (
            <div key={`ask-${i}`} className="relative">
              <div 
                className="absolute inset-y-0 left-0 bg-rose-500/10 rounded-sm"
                style={{ width: `${(size / maxSize) * 100}%` }}
              />
              <div className="relative flex justify-between items-center px-2 py-1 text-[11px] font-mono">
                <span className="text-rose-400">{Math.round(price * 100)}¢</span>
                <span className="text-white/50">{formatCompact(size)}</span>
              </div>
            </div>
          ))}
          {asks.length === 0 && (
            <div className="text-[10px] text-white/20 text-center py-2">No asks</div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TooltipData {
  name: string;
  value: number;
  color: string;
  y: number;
}

interface SeriesInfo {
  series: ISeriesApi<'Line'>;
  name: string;
  color: string;
}

function PriceChart({ market, brandColor }: { market: UnifiedMarket | UnifiedMarketDetail; brandColor: string }) {
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const tooltipContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<SeriesInfo[]>([]);
  
  const hasHistory = hasRealPriceHistory(market);
  const hasMultiHistory = hasMultiOutcomePriceHistory(market);
  
  const multiOutcomeData = useMemo(() => {
    if (!hasMultiHistory) return [];
    return market.outcomePriceHistories.map(outcome => {
      const filtered = filterByTimeRange(outcome.history, timeRange);
      const maxPoints = 100;
      const step = Math.max(1, Math.floor(filtered.length / maxPoints));
      const sampled = filtered.filter((_, i, arr) => i % step === 0 || i === arr.length - 1);
      
      return {
        ...outcome,
        data: sampled.map(point => ({
          time: Math.floor(point.timestamp / 1000) as Time,
          value: point.price * 100,
        })),
      };
    });
  }, [market, timeRange, hasMultiHistory]);
  
  const singleOutcomeData = useMemo(() => {
    if (!hasHistory || hasMultiHistory) return [];
    const filtered = filterByTimeRange(market.priceHistory, timeRange);
    const maxPoints = 100;
    const step = Math.max(1, Math.floor(filtered.length / maxPoints));
    const sampled = filtered.filter((_, i, arr) => i % step === 0 || i === arr.length - 1);
    
    return sampled.map(point => ({
      time: Math.floor(point.timestamp / 1000) as Time,
      value: point.price * 100,
    }));
  }, [market, timeRange, hasHistory, hasMultiHistory]);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    if (!hasHistory && !hasMultiHistory) return;
    
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.2)',
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        fontSize: 10,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)', style: LineStyle.Solid },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: timeRange === '1D',
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: {
        vertLine: { color: 'rgba(255, 255, 255, 0.2)', width: 1, style: LineStyle.Solid, labelVisible: false },
        horzLine: { visible: false },
      },
      handleScale: false,
      handleScroll: false,
    });
    
    seriesRefs.current = [];
    
    if (hasMultiHistory && multiOutcomeData.length > 0) {
      multiOutcomeData.forEach(outcome => {
        if (outcome.data.length === 0) return;
        const seriesColor = outcome.color || brandColor;
        const series = chart.addSeries(LineSeries, {
          color: seriesColor,
          lineWidth: 2,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 4,
          crosshairMarkerBackgroundColor: seriesColor,
          crosshairMarkerBorderColor: seriesColor,
          lastValueVisible: false,
          priceLineVisible: false,
          priceFormat: {
            type: 'custom',
            formatter: (price: number) => `${price.toFixed(0)}%`,
          },
        });
        series.setData(outcome.data);
        
        seriesRefs.current.push({
          series: series as ISeriesApi<'Line'>,
          name: outcome.outcomeName,
          color: seriesColor,
        });
      });
      
      chart.subscribeCrosshairMove((param: MouseEventParams<Time>) => {
        const container = tooltipContainerRef.current;
        if (!container) return;
        
        if (!param.point || param.logical === undefined || param.point.x < 0) {
          container.style.display = 'none';
          return;
        }
        
        const tooltipData: TooltipData[] = [];
        const logicalIndex = param.logical;
        
        seriesRefs.current.forEach(({ series, name, color }) => {
          const data = series.dataByIndex(logicalIndex, MismatchDirection.NearestLeft);
          if (data && 'value' in data) {
            const value = data.value as number;
            const y = series.priceToCoordinate(value);
            if (y !== null) {
              tooltipData.push({ name, value, color, y });
            }
          }
        });
        
        if (tooltipData.length === 0) {
          container.style.display = 'none';
          return;
        }
        
        tooltipData.sort((a, b) => a.y - b.y);
        
        const time = param.time as number;
        const date = new Date(time * 1000);
        const timeStr = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
        
        container.style.display = 'block';
        const pointX = param.point.x;
        const chartWidth = chartContainerRef.current?.clientWidth || 0;
        const isRightHalf = pointX > chartWidth * 0.5;
        const tooltipOffset = isRightHalf ? -12 : 12;
        const tooltipAlign = isRightHalf ? 'right' : 'left';
        const tooltipTransform = isRightHalf ? 'translateX(-100%) translateY(-50%)' : 'translateY(-50%)';
        
        container.innerHTML = `
          <div style="position:absolute;top:0;left:${pointX}px;transform:translateX(-50%);font-size:10px;font-family:ui-monospace,monospace;color:rgba(255,255,255,0.5);white-space:nowrap;">
            ${timeStr}
          </div>
          ${tooltipData.map(t => `
            <div style="position:absolute;left:${pointX + tooltipOffset}px;top:${t.y}px;transform:${tooltipTransform};white-space:nowrap;">
              <div style="background:${t.color};color:#000;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:500;">
                ${t.name} ${t.value.toFixed(1)}%
              </div>
            </div>
          `).join('')}
        `;
      });
    } else if (singleOutcomeData.length > 0) {
      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: brandColor,
        lineWidth: 2,
        topColor: `${brandColor}33`,
        bottomColor: `${brandColor}00`,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: brandColor,
        crosshairMarkerBorderColor: brandColor,
        lastValueVisible: false,
        priceLineVisible: false,
        priceFormat: {
          type: 'custom',
          formatter: (price: number) => `${price.toFixed(0)}%`,
        },
      });
      areaSeries.setData(singleOutcomeData);
    }
    
    chart.timeScale().fitContent();
    chartRef.current = chart;
    
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);
    
    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [hasHistory, hasMultiHistory, multiOutcomeData, singleOutcomeData, brandColor, timeRange]);

  if (!hasHistory && !hasMultiHistory) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-3.5 h-3.5 text-white/20" />
          <span className="text-[10px] uppercase tracking-widest text-white/20 font-medium">
            Price History
          </span>
        </div>
        <div className="h-[280px] flex items-center justify-center rounded-lg bg-white/[0.02]">
          <span className="text-xs text-white/20">No price history available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {hasMultiHistory && multiOutcomeData.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
          {multiOutcomeData.map(outcome => (
            <div key={outcome.outcomeName} className="flex items-center gap-1.5">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: outcome.color }}
              />
              <span className="text-[11px] text-white/60 truncate max-w-[120px]">
                {outcome.outcomeName}
              </span>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-white/20" />
          <span className="text-[10px] uppercase tracking-widest text-white/20 font-medium">
            Price History
          </span>
        </div>
        <div className="flex gap-1">
          {(['1D', '1W', '1M', 'ALL'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                timeRange === range 
                  ? 'bg-white/10 text-white/70' 
                  : 'text-white/30 hover:text-white/50'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      
      <div className="relative">
        <div ref={chartContainerRef} className="h-[280px] w-full" />
        <div 
          ref={tooltipContainerRef} 
          className="absolute inset-0 pointer-events-none"
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}

export default function MarketDataPanel({ market }: MarketDataPanelProps) {
  const isPoly = market.platform === 'polymarket';
  const brandColor = isPoly ? PLATFORM_COLORS.polymarket : PLATFORM_COLORS.kalshi;
  const platformName = isPoly ? 'Polymarket' : 'Kalshi';
  
  const isMultiOption = market.marketType === 'multi-option' && market.outcomes.length > 2;
  const isMatchup = market.marketType === 'matchup' || (market.outcomes.length === 2 && !market.outcomes.some(o => o.name.toLowerCase() === 'yes'));
  const isBinary = market.marketType === 'binary' || (!isMultiOption && !isMatchup);

  const outcomeColors = useMemo(() => {
    if (!hasMultiOutcomePriceHistory(market)) return undefined;
    const colorMap = new Map<string, string>();
    market.outcomePriceHistories.forEach(outcome => {
      if (outcome.color) {
        colorMap.set(outcome.outcomeName, outcome.color);
      }
    });
    return colorMap.size > 0 ? colorMap : undefined;
  }, [market]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] overflow-y-auto overflow-x-hidden pb-6">
      <div className="flex items-center justify-between py-4">
        <a 
          href={market.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 group"
        >
          <div 
            className="p-1.5 rounded-md bg-white/5 group-hover:bg-white/10 transition-colors"
            style={{ color: brandColor }}
          >
            {isPoly ? <PolymarketLogo className="w-3.5 h-3.5" /> : <KalshiLogo className="w-3.5 h-3.5" />}
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/30 group-hover:text-white/50 transition-colors">
            {platformName}
          </span>
          <ExternalLink className="w-2.5 h-2.5 text-white/20 group-hover:text-white/40 transition-colors" />
        </a>
        
        {market.category && market.category !== 'Uncategorized' && (
          <span className="text-[10px] uppercase tracking-widest text-white/20 font-medium">
            {market.category}
          </span>
        )}
      </div>

      <div className="flex items-start gap-4 mb-6">
        {market.imageUrl && (
          <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/5 shrink-0">
            <img 
              src={market.imageUrl} 
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.parentElement!.style.display = 'none';
              }}
            />
          </div>
        )}
        <h1 className="text-xl lg:text-2xl font-medium text-white/90 leading-tight tracking-tight">
          {market.title}
        </h1>
      </div>

      <StatsRow market={market} />

      <PriceChart market={market} brandColor={brandColor} />

      {isBinary && <BinaryHero market={market} brandColor={brandColor} />}
      {isMatchup && <MatchupHero market={market} brandColor={brandColor} />}
      {isMultiOption && <OutcomesList outcomes={market.outcomes} brandColor={brandColor} outcomeColors={outcomeColors} />}

      <SpreadDisplay market={market} />

      {hasOrderBook(market) && (
        <OrderBookDisplay orderBook={market.orderBook} brandColor={brandColor} />
      )}

      <div className="mt-4 space-y-1">
        {market.description && (
          <CollapsibleSection 
            title={market.rules ? "Description" : "Description & Resolution Rules"} 
            defaultOpen
          >
            <p className="text-sm text-white/40 leading-relaxed">
              {market.description}
            </p>
          </CollapsibleSection>
        )}

        {market.rules && (
          <CollapsibleSection title="Resolution Rules">
            <p className="text-xs text-white/30 leading-relaxed whitespace-pre-wrap font-mono">
              {market.rules}
            </p>
          </CollapsibleSection>
        )}

        {market.resolutionSource && (
          <CollapsibleSection title="Resolution Source">
            <p className="text-sm text-white/40">
              {market.resolutionSource}
            </p>
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}
