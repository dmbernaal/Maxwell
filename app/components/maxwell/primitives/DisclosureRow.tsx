import React, { useState } from 'react';
import { cn } from '@/app/lib/utils';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DisclosureRowProps {
  label: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  rightElement?: React.ReactNode;
}

export function DisclosureRow({ 
  label, 
  children, 
  defaultOpen = false, 
  className,
  rightElement 
}: DisclosureRowProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("w-full group", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 px-1 hover:bg-white/[0.03] transition-colors duration-200 rounded-sm group-hover:text-white"
      >
        <div className="flex items-center gap-2 text-[13px] text-white/60 group-hover:text-white/90 transition-colors">
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </motion.div>
          <span className="font-medium tracking-tight">{label}</span>
        </div>
        {rightElement && (
          <div className="text-[11px] text-white/40">{rightElement}</div>
        )}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-2 pb-4 pl-6 pr-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
