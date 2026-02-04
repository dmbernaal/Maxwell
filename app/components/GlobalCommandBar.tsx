'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    Bell,
    Settings,
    ChevronRight,
    Zap,
    Command
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { UnifiedMarket } from '@/app/lib/markets/types';
import { SmallGhostLogo } from './SmallGhostLogo';
import MarketAutocomplete from './MarketAutocomplete';

interface GlobalCommandBarProps {
    market?: UnifiedMarket;
}

export function GlobalCommandBar({ market }: GlobalCommandBarProps) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [marketResults, setMarketResults] = useState<UnifiedMarket[]>([]);
    const [topMarkets, setTopMarkets] = useState<UnifiedMarket[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const displayMarkets = query ? marketResults : topMarkets;

    useEffect(() => {
        setSelectedIndex(-1);
    }, [query, marketResults, topMarkets]);

    // Fetch Top Markets
    useEffect(() => {
        const fetchTopMarkets = async () => {
            try {
                const res = await fetch('/api/markets?limit=5&sort=volume');
                if (res.ok) {
                    const data = await res.json();
                    setTopMarkets(data.markets || []);
                }
            } catch (e) {
                console.error("Failed to fetch top markets", e);
            }
        };
        fetchTopMarkets();
    }, []);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === '/' || (e.metaKey && e.key === 'k')) {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSearch = async (searchQuery: string) => {
        setQuery(searchQuery);
        if (!searchQuery) {
            setMarketResults([]);
            return;
        }

        try {
            const res = await fetch(`/api/markets?q=${encodeURIComponent(searchQuery)}&limit=5`);
            if (res.ok) {
                const data = await res.json();
                setMarketResults(data.markets || []);
            }
        } catch (e) {
            console.error("Failed to fetch market suggestions", e);
        }
    };

    const handleMarketSelect = (market: UnifiedMarket) => {
        setShowDropdown(false);
        setQuery('');
        router.push(`/markets/${market.id}`);
    };

    return (
        <header className="h-16 bg-[#111111] border-b border-[#2A2A2A] flex items-center justify-between px-6 sticky top-0 z-50 shrink-0 w-full">

            <div className="flex items-center h-full">
                <div className="flex items-center gap-3 pr-5 border-r border-[#2A2A2A] h-full mr-5 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => router.push('/')}> 
                    <div className="w-8 h-8 flex items-center justify-center">
                        <SmallGhostLogo isActive={false} />
                    </div>
                    <span className="font-semibold text-[15px] tracking-tight text-white">ZapMarket</span>
                </div>

                <div className="flex items-center gap-2 text-[12px] text-[#525252]">
                    <span className="hover:text-[#737373] transition-colors cursor-pointer font-medium" onClick={() => router.push('/')}>Markets</span>
                    {market && (
                        <>
                            <ChevronRight className="w-4 h-4 text-[#2A2A2A]" />
                            <span className="text-[#737373] truncate max-w-[300px] font-medium">
                                {market.title}
                            </span>
                        </>
                    )}
                </div>
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
                <div className="relative group w-[520px]">
                    <div className={cn(
                        "relative h-10 bg-[#1A1A1A] border rounded-lg flex items-center px-4 transition-all duration-150",
                        isFocused
                            ? "bg-[#1F1F1F] border-[#3A3A3A]"
                            : "border-[#2A2A2A] hover:border-[#3A3A3A]"
                    )}>
                        <Search className={cn("w-4 h-4 mr-3 transition-colors", isFocused ? "text-white" : "text-[#525252]")} />

                        <input
                            ref={searchInputRef}
                            type="text"
                            value={query}
                            onChange={(e) => {
                                handleSearch(e.target.value);
                                setShowDropdown(true);
                            }}
                            onKeyDown={(e) => {
                                if (!showDropdown || displayMarkets.length === 0) return;

                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setSelectedIndex(prev =>
                                        prev < displayMarkets.length - 1 ? prev + 1 : prev
                                    );
                                } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                                } else if (e.key === 'Enter' && selectedIndex >= 0) {
                                    e.preventDefault();
                                    handleMarketSelect(displayMarkets[selectedIndex]);
                                } else if (e.key === 'Escape') {
                                    setShowDropdown(false);
                                    setSelectedIndex(-1);
                                }
                            }}
                            onFocus={() => {
                                setIsFocused(true);
                                setShowDropdown(true);
                            }}
                            onBlur={() => {
                                setIsFocused(false);
                                setTimeout(() => {
                                    setShowDropdown(false);
                                    setSelectedIndex(-1);
                                }, 200);
                            }}
                            placeholder="Search markets..."
                            className="flex-1 bg-transparent text-[13px] text-white placeholder-[#525252] focus:outline-none"
                        />

                        <div className="ml-auto flex items-center gap-1.5">
                            <kbd className="h-6 px-2 bg-[#222222] border border-[#2A2A2A] rounded-md text-[11px] font-mono text-[#525252] flex items-center gap-1">
                                <Command className="w-3 h-3" />
                                <span>K</span>
                            </kbd>
                        </div>
                    </div>

                    <MarketAutocomplete
                        query={query}
                        results={marketResults}
                        topMarkets={topMarkets}
                        onSelectMarket={handleMarketSelect}
                        isVisible={showDropdown}
                        selectedIndex={selectedIndex}
                    />
                </div>
            </div>

            <div className="flex items-center h-full">
                <div className="flex items-center gap-1 pr-4 border-r border-[#2A2A2A] h-full mr-4">
                    <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#1A1A1A] text-[#525252] hover:text-[#737373] transition-all">
                        <Bell className="w-[18px] h-[18px]" />
                    </button>

                    <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#1A1A1A] text-[#525252] hover:text-[#737373] transition-all">
                        <Settings className="w-[18px] h-[18px]" />
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] hover:border-[#3A3A3A] hover:bg-[#222222] transition-all cursor-pointer"></div>
                </div>
            </div>

        </header>
    );
}
