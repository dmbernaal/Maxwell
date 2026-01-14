'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { SmallGhostLogo } from './SmallGhostLogo';
import { User, Search } from 'lucide-react';
import type { UnifiedMarket } from '@/app/lib/markets/types';
import MarketAutocomplete from './MarketAutocomplete';
import { TRENDING_SEARCHES } from '../lib/market-data';

export default function Header() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [marketResults, setMarketResults] = useState<UnifiedMarket[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === '/') {
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

    const handleQuerySelect = (q: string) => {
        setQuery(q);
        handleSearch(q);
    };

    return (
        <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="fixed top-0 left-0 right-0 z-50 px-6 lg:px-10 py-4"
        >
            <div className="max-w-[1200px] mx-auto flex items-center h-full">
                {/* Left: Brand + Search Group */}
                <div className="flex items-center gap-6">
                    {/* Brand */}
                    <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => router.push('/')}>
                        <div className="w-[32px] h-[40px] flex items-center justify-center">
                            <SmallGhostLogo isActive={false} />
                        </div>
                        <span className="text-white font-medium tracking-tight text-[15px]">ZapMarket</span>
                    </div>

                    {/* Search */}
                    <div className="relative w-[320px]">
                        <div className={`
                            flex items-center gap-2.5 px-3 py-2 rounded-md bg-[#141414] transition-all border border-transparent
                            ${isFocused ? 'bg-[#1a1a1a] ring-1 ring-white/10' : 'hover:bg-[#1a1a1a]'}
                        `}>
                            <Search size={14} className="text-white/30 shrink-0" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={query}
                                onChange={(e) => {
                                    handleSearch(e.target.value);
                                    setShowDropdown(true);
                                }}
                                onFocus={() => {
                                    setIsFocused(true);
                                    setShowDropdown(true);
                                }}
                                onBlur={() => {
                                    setIsFocused(false);
                                    setTimeout(() => setShowDropdown(false), 200);
                                }}
                                placeholder="Search markets..."
                                className="flex-1 bg-transparent text-[13px] text-white placeholder-white/30 focus:outline-none"
                            />
                            <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#222] text-[10px] text-white/30 font-mono">
                                /
                            </kbd>
                        </div>

                        <MarketAutocomplete
                            query={query}
                            results={marketResults}
                            trendingQueries={TRENDING_SEARCHES}
                            onSelectMarket={handleMarketSelect}
                            onSelectQuery={handleQuerySelect}
                            isVisible={showDropdown}
                        />
                    </div>
                </div>

                {/* Right: Profile */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="ml-auto w-10 h-10 rounded-md bg-[#141414] hover:bg-[#1a1a1a] flex items-center justify-center text-white/40 hover:text-white transition-all shrink-0"
                >
                    <User size={18} />
                </motion.button>
            </div>
        </motion.header>
    );
}
