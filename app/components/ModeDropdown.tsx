/**
 * Mode Dropdown Component
 * 
 * Dropdown for selecting search mode: Normal or Maxwell (Fast/Medium/Slow).
 * Always opens UPWARD since input can be centered or bottom-anchored.
 * Uses React Portal to escape any overflow containers.
 * 
 * @module components/ModeDropdown
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, Zap, Brain, Clock, LucideIcon, Sparkles, MessageSquare } from 'lucide-react';
import { createPortal } from 'react-dom';

export type SearchMode = 'normal' | 'maxwell-fast' | 'maxwell-medium' | 'maxwell-slow';

interface ModeDropdownProps {
    mode: SearchMode;
    onModeChange: (mode: SearchMode) => void;
    disabled?: boolean;
    hasMaxwellResults?: boolean;
    onViewResults?: () => void;
}

interface ModeOption {
    id: SearchMode;
    label: string;
    sublabel?: string;
    icon: LucideIcon;
}

const MODE_OPTIONS: ModeOption[] = [
    { id: 'normal', label: 'Normal', icon: MessageSquare },
    { id: 'maxwell-fast', label: 'Maxwell', sublabel: 'Fast', icon: Zap },
    { id: 'maxwell-medium', label: 'Maxwell', sublabel: 'Medium', icon: Brain },
    { id: 'maxwell-slow', label: 'Maxwell', sublabel: 'Slow', icon: Clock },
];

export default function ModeDropdown({
    mode,
    onModeChange,
    disabled = false,
    hasMaxwellResults = false,
    onViewResults,
}: ModeDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    // Ensure we're mounted before using portal
    useEffect(() => {
        setMounted(true);
    }, []);

    // Calculate menu position - ALWAYS opens upward
    const updatePosition = useCallback(() => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const menuWidth = 240;

            // Position menu above the button, aligned to right edge
            setMenuStyle({
                position: 'fixed',
                bottom: window.innerHeight - rect.top + 8, // 8px gap
                right: window.innerWidth - rect.right,
                width: menuWidth,
                maxHeight: rect.top - 20, // Don't go off top of screen
            });
        }
    }, []);

    // Update position when opened and on resize/scroll
    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
        }
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen, updatePosition]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            if (
                menuRef.current && !menuRef.current.contains(target) &&
                buttonRef.current && !buttonRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            // Small delay to prevent immediate close
            const timer = setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 10);
            return () => {
                clearTimeout(timer);
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isOpen]);

    // Close on escape
    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    const currentOption = MODE_OPTIONS.find((o) => o.id === mode) || MODE_OPTIONS[0];
    const isMaxwell = mode !== 'normal';
    const CurrentIcon = currentOption.icon;

    const handleToggle = () => {
        if (!disabled) {
            updatePosition(); // Calculate position before opening
            setIsOpen(!isOpen);
        }
    };

    const handleSelect = (optionId: SearchMode) => {
        onModeChange(optionId);
        setIsOpen(false);
    };

    const dropdownMenu = (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    style={menuStyle}
                    className="w-full max-w-[200px] rounded-2xl bg-[#18151d] border border-white/5 shadow-2xl overflow-hidden z-[9999]"
                >
                    <div className="p-1.5 flex flex-col gap-0.5">
                        {MODE_OPTIONS.map((option) => {
                            const isActive = option.id === mode;
                            const Icon = option.icon;

                            return (
                                <button
                                    key={option.id}
                                    onClick={() => handleSelect(option.id)}
                                    className={`
                                        w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all duration-200
                                        ${isActive
                                            ? 'bg-white/5 text-white'
                                            : 'text-white/40 hover:bg-white/[0.02] hover:text-white/80'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-2.5">
                                        {/* Icon */}
                                        {Icon ? (
                                            <Icon
                                                size={14}
                                                className={`transition-colors ${isActive ? 'text-white' : 'text-white/30'}`}
                                            />
                                        ) : (
                                            <div className="w-3.5 h-3.5 rounded-full border border-white/10" />
                                        )}

                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-medium leading-none mb-0.5">
                                                {option.sublabel || option.label}
                                            </span>
                                            {option.sublabel && (
                                                <span className="text-[9px] text-white/20 uppercase tracking-wider font-medium">
                                                    Maxwell
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Active Check */}
                                    {isActive && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <div className="flex items-center gap-2">
            {/* View Results Button - Shows when Maxwell has results but canvas is closed */}
            {hasMaxwellResults && onViewResults && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={onViewResults}
                    className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full 
                        bg-brand-accent/10 border border-brand-accent/30 text-brand-accent
                        hover:bg-brand-accent/20 transition-colors text-xs font-medium"
                >
                    <Sparkles size={14} />
                    <span>View Results</span>
                </motion.button>
            )}

            {/* Trigger Button */}
            <button
                ref={buttonRef}
                type="button"
                onClick={handleToggle}
                disabled={disabled}
                className={`
                    hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full 
                    bg-[#18151d] hover:bg-[#231f29] border border-white/5 
                    transition-all text-xs font-medium text-white/60
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
            >
                {/* Icon */}
                <CurrentIcon
                    size={14}
                    className="text-white/60"
                />

                <span>
                    {currentOption.sublabel ? currentOption.sublabel : currentOption.label}
                </span>
            </button>

            {/* Dropdown Menu - Rendered via Portal to document.body */}
            {mounted && createPortal(dropdownMenu, document.body)}
        </div>
    );
}
