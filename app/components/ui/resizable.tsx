"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GripVertical } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface ResizablePanelsProps {
  children: [React.ReactNode, React.ReactNode, React.ReactNode];
  defaultSizes?: [number, number, number];
  minSizes?: [number, number, number];
  className?: string;
}

export function ResizablePanels({ 
  children, 
  defaultSizes = [25, 50, 25],
  minSizes = [15, 30, 15],
  className 
}: ResizablePanelsProps) {
  const [sizes, setSizes] = useState(defaultSizes);
  const [isDragging, setIsDragging] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef(0);
  const startSizesRef = useRef(sizes);

  const handleMouseDown = useCallback((index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(index);
    startPosRef.current = e.clientX;
    startSizesRef.current = [...sizes];
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sizes]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging === null || !containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const deltaX = e.clientX - startPosRef.current;
    const deltaPercent = (deltaX / containerWidth) * 100;

    const newSizes: [number, number, number] = [...startSizesRef.current] as [number, number, number];
    
    if (isDragging === 0) {
      newSizes[0] = Math.max(minSizes[0], Math.min(40, startSizesRef.current[0] + deltaPercent));
      newSizes[1] = 100 - newSizes[0] - newSizes[2];
    } else if (isDragging === 1) {
      newSizes[2] = Math.max(minSizes[2], Math.min(40, startSizesRef.current[2] - deltaPercent));
      newSizes[1] = 100 - newSizes[0] - newSizes[2];
    }

    if (newSizes[1] < minSizes[1]) {
      if (isDragging === 0) {
        newSizes[0] = 100 - minSizes[1] - newSizes[2];
      } else {
        newSizes[2] = 100 - newSizes[0] - minSizes[1];
      }
      newSizes[1] = minSizes[1];
    }

    setSizes(newSizes);
  }, [isDragging, minSizes]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    if (isDragging !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div 
      ref={containerRef}
      className={cn("flex h-full w-full overflow-hidden", className)}
    >
      <div 
        className="flex-shrink-0 flex flex-col h-full overflow-hidden"
        style={{ width: `${sizes[0]}%` }}
      >
        {children[0]}
      </div>

      <div
        className={cn(
          "flex-shrink-0 w-[1px] flex items-center justify-center cursor-col-resize hover:bg-[#FA5D19] active:bg-[#FA5D19] transition-all duration-150 group relative z-10",
          isDragging === 0 && "bg-[#FA5D19] w-[1px]"
        )}
        onMouseDown={handleMouseDown(0)}
      >
        <div className={cn(
          "w-[1px] h-full transition-all duration-150",
          isDragging === 0 ? "bg-[#FA5D19]" : "bg-[#2A2A2A] group-hover:bg-[#FA5D19]"
        )} />
      </div>

      <div 
        className="flex-1 flex flex-col h-full overflow-hidden min-w-0"
        style={{ flexBasis: `${sizes[1]}%` }}
      >
        {children[1]}
      </div>

      <div
        className={cn(
          "flex-shrink-0 w-[1px] flex items-center justify-center cursor-col-resize hover:bg-[#FA5D19] active:bg-[#FA5D19] transition-all duration-150 group relative z-10",
          isDragging === 1 && "bg-[#FA5D19] w-[1px]"
        )}
        onMouseDown={handleMouseDown(1)}
      >
        <div className={cn(
          "w-[1px] h-full transition-all duration-150",
          isDragging === 1 ? "bg-[#FA5D19]" : "bg-[#2A2A2A] group-hover:bg-[#FA5D19]"
        )} />
      </div>

      <div 
        className="flex-shrink-0 flex flex-col h-full overflow-hidden"
        style={{ width: `${sizes[2]}%` }}
      >
        {children[2]}
      </div>
    </div>
  );
}
