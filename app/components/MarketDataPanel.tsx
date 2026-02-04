'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createChart, IChartApi, ISeriesApi, AreaSeries, LineSeries, ColorType, LineStyle, Time, MouseEventParams, MismatchDirection, LineWidth } from 'lightweight-charts';
import { ExternalLink, ChevronDown, Clock, BarChart3, Activity, Layers, ArrowUpRight } from 'lucide-react';
import type { UnifiedMarket, UnifiedMarketDetail, PricePoint, MarketOutcome, OrderBook, OutcomePriceHistory } from '@/app/lib/markets/types';
import { PolymarketLogo, KalshiLogo, PLATFORM_COLORS } from './icons/PlatformIcons';
import { CornerGridDecoration } from './maxwell/primitives/CornerGridDecoration';

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
    <div className="border-t border-border-base">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 text-left group hover:bg-white/[0.02] transition-colors px-4"
      >
        <span className="text-[10px] font-medium uppercase tracking-wider text-white/40 font-mono group-hover:text-white/40 transition-colors select-none">
          {title}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-white/40 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="pb-4 px-4 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

function StatsRow({ market }: { market: UnifiedMarket }) {
  return (
    <div className="flex items-center justify-start gap-8 px-4 py-3 border-b border-border-base">
      <div className="flex flex-col items-start">
        <span className="text-[10px] font-medium uppercase tracking-wider text-white/40 font-mono mb-1 select-none">Vol</span>
        <span className="text-[13px] font-mono tabular-nums text-[#EDEDED] tracking-tight">${formatCompact(market.volume)}</span>
      </div>
      <div className="flex flex-col items-start">
        <span className="text-[10px] font-medium uppercase tracking-wider text-white/40 font-mono mb-1 select-none">24h</span>
        <span className="text-[13px] font-mono tabular-nums text-[#EDEDED] tracking-tight">
          {market.volume24h > 0 ? `$${formatCompact(market.volume24h)}` : '-'}
        </span>
      </div>
      <div className="flex flex-col items-start">
        <span className="text-[10px] font-medium uppercase tracking-wider text-white/40 font-mono mb-1 select-none">Liq</span>
        <span className="text-[13px] font-mono tabular-nums text-[#EDEDED] tracking-tight">
          {market.liquidity && market.liquidity > 0 ? `$${formatCompact(market.liquidity)}` : '-'}
        </span>
      </div>
      <div className="flex flex-col items-start">
        <span className="text-[10px] font-medium uppercase tracking-wider text-white/40 font-mono mb-1 select-none">End</span>
        <span className="text-[13px] font-mono tabular-nums text-[#EDEDED] tracking-tight">
          {formatTimeRemaining(new Date(market.endDate))}
        </span>
      </div>
    </div>
  );
}

function SpreadDisplay({ market }: { market: UnifiedMarket }) {
  if (!market.yesBid || !market.yesAsk) return null;

  const spread = Math.round((market.yesAsk - market.yesBid) * 100);

  return (
    <div className="flex items-center gap-4 text-[11px] font-mono py-2 px-4 border-t border-border-base">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-white/40 font-mono select-none">Bid</span>
        <span className="text-emerald-400 tabular-nums">{Math.round(market.yesBid * 100)}¢</span>
      </div>
      <div className="w-px h-3 bg-white/[0.08]" />
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-white/40 font-mono select-none">Ask</span>
        <span className="text-rose-400 tabular-nums">{Math.round(market.yesAsk * 100)}¢</span>
      </div>
      <div className="w-px h-3 bg-white/[0.08]" />
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-[10px] font-medium uppercase tracking-wider text-white/40 font-mono select-none">Spread</span>
        <span className="text-white/40 tabular-nums">{spread}¢</span>
      </div>
    </div>
  );
}

function OutcomesList({ outcomes, brandColor, outcomeColors }: { outcomes: MarketOutcome[]; brandColor: string; outcomeColors?: Map<string, string> }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sortedOutcomes = [...outcomes].sort((a, b) => b.price - a.price);

  const INITIAL_SHOW = 4;
  const hasMore = sortedOutcomes.length > INITIAL_SHOW;
  const displayedOutcomes = isExpanded ? sortedOutcomes : sortedOutcomes.slice(0, INITIAL_SHOW);
  const hiddenCount = sortedOutcomes.length - INITIAL_SHOW;

  return (
    <div className="py-3 px-4 border-t border-border-base">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-medium uppercase tracking-wider text-white/40 font-mono select-none">
          Outcomes
        </span>
        <span className="text-[10px] font-mono text-white/40 select-none">
          {sortedOutcomes.length} Total
        </span>
      </div>
      <div className="space-y-1">
        {displayedOutcomes.map((outcome, idx) => {
          const pct = Math.round(outcome.price * 100);
          const barWidth = outcome.price * 100;
          const outcomeColor = outcomeColors?.get(outcome.name) || brandColor;

          return (
            <div key={outcome.name} className="group flex flex-col p-2 rounded-md hover:bg-white/[0.08] transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-[10px] font-mono text-white/40 w-4 shrink-0 select-none">
                    {idx + 1}
                  </span>
                  <span className="text-[13px] font-medium text-white/90 truncate font-sans">
                    {outcome.name}
                  </span>
                </div>
                <span className="text-[13px] font-mono tabular-nums text-white">
                  {pct}%
                </span>
              </div>

              <div className="h-1.5 w-full bg-white/[0.08] rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: outcomeColor
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 text-center text-[10px] text-white/30 hover:text-white/50 transition-colors mt-2"
        >
          <span>{isExpanded ? 'Show Less' : `Show ${hiddenCount} More`}</span>
        </button>
      )}
    </div>
  );
}

function hasOrderBook(market: UnifiedMarket | UnifiedMarketDetail): market is UnifiedMarketDetail & { orderBook: OrderBook } {
  return 'orderBook' in market &&
    market.orderBook !== undefined &&
    market.orderBook.bids.length > 0 &&
    market.orderBook.asks.length > 0;
}

function OrderBookDisplay({ orderBook }: { orderBook: OrderBook }) {
  const maxLevels = 5;
  const bids = orderBook.bids.slice(0, maxLevels);
  const asks = orderBook.asks.slice(0, maxLevels);

  const maxBidSize = Math.max(...bids.map(([, size]) => size), 1);
  const maxAskSize = Math.max(...asks.map(([, size]) => size), 1);
  const maxSize = Math.max(maxBidSize, maxAskSize);

  if (bids.length === 0 && asks.length === 0) return null;

  return (
    <div className="border-t border-border-base py-3 px-4">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-3 h-3 text-white/40" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-white/40 font-mono select-none">
          Order Book
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-0.5">
          <div className="flex justify-between text-[10px] font-medium uppercase tracking-wider text-white/40 font-mono px-1 mb-1.5 select-none">
            <span>Bid</span>
            <span>Size</span>
          </div>
          {bids.map(([price, size], i) => (
            <div key={`bid-${i}`} className="relative group hover:bg-white/[0.08] transition-colors rounded-sm overflow-hidden">
              <div
                className="absolute inset-y-0 right-0 bg-emerald-500/[0.06]"
                style={{ width: `${(size / maxSize) * 100}%` }}
              />
              <div className="relative flex justify-between items-center px-1.5 py-0.5 text-[10px] font-mono">
                <span className="text-emerald-400/90 tabular-nums">{Math.round(price * 100)}¢</span>
                <span className="text-white/40 tabular-nums">{formatCompact(size)}</span>
              </div>
            </div>
          ))}
          {bids.length === 0 && (
            <div className="text-[10px] text-white/40 text-center py-2 italic">Empty</div>
          )}
        </div>

        <div className="space-y-0.5">
          <div className="flex justify-between text-[10px] font-medium uppercase tracking-wider text-white/40 font-mono px-1 mb-1.5 select-none">
            <span>Ask</span>
            <span>Size</span>
          </div>
          {asks.map(([price, size], i) => (
            <div key={`ask-${i}`} className="relative group hover:bg-white/[0.08] transition-colors rounded-sm overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-rose-500/[0.06]"
                style={{ width: `${(size / maxSize) * 100}%` }}
              />
              <div className="relative flex justify-between items-center px-1.5 py-0.5 text-[10px] font-mono">
                <span className="text-rose-400/90 tabular-nums">{Math.round(price * 100)}¢</span>
                <span className="text-white/40 tabular-nums">{formatCompact(size)}</span>
              </div>
            </div>
          ))}
          {asks.length === 0 && (
            <div className="text-[10px] text-white/40 text-center py-2 italic">Empty</div>
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
      const maxPoints = 150;
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
    const maxPoints = 150;
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
        textColor: 'rgba(255, 255, 255, 0.4)',
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        fontSize: 10,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)', style: LineStyle.Solid },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.2, bottom: 0.1 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: timeRange === '1D',
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: {
        vertLine: { color: 'rgba(255, 255, 255, 0.1)', width: 1, style: LineStyle.Dashed, labelVisible: false },
        horzLine: { visible: false, labelVisible: false },
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
          lineWidth: 1 as LineWidth,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 3,
          crosshairMarkerBackgroundColor: seriesColor,
          crosshairMarkerBorderColor: '#121214',
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
          hour: 'numeric',
          minute: '2-digit',
        });

        container.style.display = 'block';
        const pointX = param.point.x;
        const chartWidth = chartContainerRef.current?.clientWidth || 0;
        const isRightHalf = pointX > chartWidth * 0.5;
        const tooltipOffset = isRightHalf ? -12 : 12;

        container.innerHTML = `
          <div style="position:absolute;top:0;left:${pointX}px;transform:translateX(-50%);margin-top:-20px;font-size:10px;font-family:ui-monospace,monospace;color:rgba(255,255,255,0.4);white-space:nowrap;background:#0A0A0A;padding:2px 4px;border-radius:2px;border:1px solid rgba(255,255,255,0.08);">
            ${timeStr}
          </div>
          ${tooltipData.map(t => `
            <div style="position:absolute;left:${pointX + tooltipOffset}px;top:${t.y}px;transform:translateY(-50%) ${isRightHalf ? 'translateX(-100%)' : ''};z-index:10;display:flex;align-items:center;gap:4px;pointer-events:none;">
              <div style="width:6px;height:6px;border-radius:50%;background:${t.color};box-shadow:0 0 4px ${t.color}40;"></div>
              <span style="font-size:10px;font-family:ui-monospace,monospace;color:rgba(255,255,255,0.7);">${t.name}</span>
              <span style="font-size:10px;font-family:ui-monospace,monospace;color:#fff;font-weight:500;">${t.value.toFixed(1)}%</span>
            </div>
          `).join('')}
        `;
      });

    } else if (singleOutcomeData.length > 0) {
      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: brandColor,
        lineWidth: 1 as LineWidth,
        topColor: `${brandColor}33`,
        bottomColor: `${brandColor}00`,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 3,
        crosshairMarkerBackgroundColor: brandColor,
        crosshairMarkerBorderColor: '#0A0A0A',
        lastValueVisible: false,
        priceLineVisible: false,
        priceFormat: {
          type: 'custom',
          formatter: (price: number) => `${price.toFixed(0)}%`,
        },
      });
      areaSeries.setData(singleOutcomeData);

      seriesRefs.current.push({
        series: areaSeries as unknown as ISeriesApi<'Line'>,
        name: market.outcomes[0]?.name || 'Yes',
        color: brandColor,
      });

      chart.subscribeCrosshairMove((param: MouseEventParams<Time>) => {
        const container = tooltipContainerRef.current;
        if (!container) return;

        if (!param.point || param.logical === undefined || param.point.x < 0) {
          container.style.display = 'none';
          return;
        }

        const logicalIndex = param.logical;
        const series = seriesRefs.current[0].series;
        const data = series.dataByIndex(logicalIndex, MismatchDirection.NearestLeft);

        if (!data || !('value' in data)) {
          container.style.display = 'none';
          return;
        }

        const value = data.value as number;
        const y = series.priceToCoordinate(value);
        if (y === null) return;

        const time = param.time as number;
        const date = new Date(time * 1000);
        const timeStr = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });

        container.style.display = 'block';
        const pointX = param.point.x;

        container.innerHTML = `
          <div style="position:absolute;top:0;left:${pointX}px;transform:translateX(-50%);margin-top:-20px;font-size:10px;font-family:ui-monospace,monospace;color:rgba(255,255,255,0.4);white-space:nowrap;background:#0A0A0A;padding:2px 4px;border-radius:2px;border:1px solid rgba(255,255,255,0.08);">
            ${timeStr}
          </div>
          <div style="position:absolute;left:${pointX}px;top:${y}px;transform:translate(-50%, -150%);z-index:10;display:flex;flex-col;align-items:center;pointer-events:none;">
            <div style="background:${brandColor};color:#000;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;box-shadow:0 2px 4px rgba(0,0,0,0.2);">
              ${value.toFixed(1)}%
            </div>
            <div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:4px solid ${brandColor};"></div>
          </div>
        `;
      });
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
      <div className="py-8 flex flex-col items-center justify-center text-white/40">
        <Activity className="w-8 h-8 mb-2 opacity-50" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-white/40 font-mono">No Price History</span>
      </div>
    );
  }

  return (
    <div className="py-4 px-4">
      <div className="flex items-center justify-between mb-4">
        {hasMultiHistory && multiOutcomeData.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {multiOutcomeData.map(outcome => (
              <div key={outcome.outcomeName} className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: outcome.color }}
                />
                <span className="text-[10px] text-white/50 font-medium">
                  {outcome.outcomeName}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/40 font-mono">
              Price Action
            </span>
          </div>
        )}

        <div className="flex bg-white/[0.04] rounded-md p-0.5">
          {(['1D', '1W', '1M', 'ALL'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2 py-0.5 rounded-[3px] text-[10px] font-mono transition-all ${timeRange === range
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-white/30 hover:text-white/50'
                }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[240px] w-full group cursor-crosshair">
        <div ref={chartContainerRef} className="h-full w-full" />
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
    <div className="relative w-full bg-white/[0.02] border border-border-base rounded-md overflow-hidden flex flex-col h-full shadow-[0_0_0_1px_rgba(0,0,0,1)]">
      <CornerGridDecoration className="absolute -top-[10px] -right-[11px] z-30 opacity-30" />
      <CornerGridDecoration className="absolute -top-[10px] -left-[11px] z-30 opacity-30" />
      
      <div className="flex items-center justify-between px-3 py-3 bg-transparent border-b border-border-base">
        <div className="flex items-center gap-2">
          <div
            className="p-1 rounded bg-white/5"
            style={{ color: brandColor }}
          >
            {isPoly ? <PolymarketLogo className="w-3 h-3" /> : <KalshiLogo className="w-3 h-3" />}
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/40 font-mono select-none">
            {platformName} Terminal
          </span>
        </div>

        <a
          href={market.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/40 hover:text-white/40 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="overflow-y-auto overflow-x-hidden flex-1 scrollbar-none">
        <div className="px-4 py-4">
          {market.category && market.category !== 'Uncategorized' && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/40 font-mono mb-2 block select-none">
              {market.category}
            </span>
          )}
          <h2 className="text-sm font-medium text-white/90 leading-relaxed font-sans">
            {market.title}
          </h2>
        </div>

        <StatsRow market={market} />

        <PriceChart market={market} brandColor={brandColor} />

        {isMultiOption && (
          <OutcomesList outcomes={market.outcomes} brandColor={brandColor} outcomeColors={outcomeColors} />
        )}

        <SpreadDisplay market={market} />

        {hasOrderBook(market) && (
          <OrderBookDisplay orderBook={market.orderBook} />
        )}

        <div className="border-t border-border-base">
          {market.description && (
            <CollapsibleSection
              title={market.rules ? "Description" : "Description & Rules"}
              defaultOpen
            >
              <p className="text-sm text-white/60 leading-relaxed font-sans">
                {market.description}
              </p>
            </CollapsibleSection>
          )}

          {market.rules && (
            <CollapsibleSection title="Rules">
              <p className="text-xs text-white/40 leading-relaxed whitespace-pre-wrap font-mono">
                {market.rules}
              </p>
            </CollapsibleSection>
          )}

          {market.resolutionSource && (
            <CollapsibleSection title="Source">
              <div className="flex items-center gap-2 text-xs text-white/40 font-mono bg-white/[0.02] p-2 rounded">
                <ExternalLink className="w-3 h-3" />
                <span className="truncate">{market.resolutionSource}</span>
              </div>
            </CollapsibleSection>
          )}
        </div>
      </div>
      
      <CornerGridDecoration className="absolute -bottom-[10px] -right-[11px] z-30 opacity-30" />
      <CornerGridDecoration className="absolute -bottom-[10px] -left-[11px] z-30 opacity-30" />
    </div>
  );
}
