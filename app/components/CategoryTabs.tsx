'use client';

import React, { useRef, useEffect, useState } from 'react';

interface CategoryTabsProps {
  categories: string[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}

const PRIORITY_ORDER = [
  'Politics',
  'Sports', 
  'Crypto',
  'Finance',
  'Climate',
  'Economics',
  'Science',
  'Culture',
  'World',
];

function sortCategories(categories: string[]): string[] {
  return [...categories].sort((a, b) => {
    const aIndex = PRIORITY_ORDER.findIndex(p => a.toLowerCase().includes(p.toLowerCase()));
    const bIndex = PRIORITY_ORDER.findIndex(p => b.toLowerCase().includes(p.toLowerCase()));
    
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });
}

export default function CategoryTabs({ categories, selected, onSelect }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const sortedCategories = sortCategories(categories);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkScroll = () => {
      setShowLeftFade(el.scrollLeft > 0);
      setShowRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    };

    checkScroll();
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [categories]);

  return (
    <div className="relative">
      {showLeftFade && (
        <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none" style={{ background: 'linear-gradient(to right, #111111, transparent)' }} />
      )}
      
      <div
        ref={scrollRef}
        className="flex items-center gap-1 overflow-x-auto no-scrollbar"
      >
        <button
          onClick={() => onSelect(null)}
          className={`shrink-0 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider rounded-md transition-all ${
            selected === null
              ? 'bg-[#1A1A1A] text-white'
              : 'text-white/30 hover:text-white/60'
          }`}
        >
          All
        </button>
        
        {sortedCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={`shrink-0 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
              selected === cat
                ? 'bg-[#1A1A1A] text-white'
                : 'text-white/30 hover:text-white/60'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      
      {showRightFade && (
        <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none" style={{ background: 'linear-gradient(to left, #111111, transparent)' }} />
      )}
    </div>
  );
}
