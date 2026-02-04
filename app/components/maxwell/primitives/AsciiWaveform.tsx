'use client';

import React, { useEffect, useState } from 'react';

const CHARS = ['_', '-', '+', '=', '/', '\\', '|', ':'];
const LENGTH = 12;

export function AsciiWaveform() {
  const [text, setText] = useState('');

  useEffect(() => {
    // Initial fill
    setText(Array(LENGTH).fill(0).map(() => CHARS[Math.floor(Math.random() * CHARS.length)]).join(''));

    const interval = setInterval(() => {
      setText(prev => {
        const chars = prev.split('');
        // Change 3 random characters per tick for a "glitch" effect
        for (let i = 0; i < 3; i++) {
          const idx = Math.floor(Math.random() * LENGTH);
          chars[idx] = CHARS[Math.floor(Math.random() * CHARS.length)];
        }
        return chars.join('');
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-mono text-[10px] tracking-widest text-[#FA5D19] select-none opacity-80">
      [{text}]
    </div>
  );
}
