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
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[var(--bg-primary)] to-transparent z-10 pointer-events-none" />
      )}
      
      <div
        ref={scrollRef}
        className="flex items-center gap-1 overflow-x-auto no-scrollbar"
      >
        <button
          onClick={() => onSelect(null)}
          className={`shrink-0 px-2.5 py-1 text-xs font-medium transition-colors ${
            selected === null
              ? 'text-white'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          All
        </button>
        
        {sortedCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={`shrink-0 px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
              selected === cat
                ? 'text-white'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      
      {showRightFade && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--bg-primary)] to-transparent z-10 pointer-events-none" />
      )}
    </div>
  );
}
