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

import { SearchMode } from '../types';

interface ModeDropdownProps {
    mode: SearchMode;
    onModeChange: (mode: SearchMode) => void;
    disabled?: boolean;
    hasMaxwellResults?: boolean;
    onViewResults?: () => void;
}

const modes: { id: SearchMode; label: string; icon: LucideIcon; description: string; color: string }[] = [
    {
        id: 'normal',
        label: 'Standard',
        icon: MessageSquare,
        description: 'Quick, standard chat',
        color: 'text-white'
    },
    {
        id: 'fast',
        label: 'Fast',
        icon: Zap,
        description: 'Quick research',
        color: 'text-amber-400'
    },
    {
        id: 'balanced',
        label: 'Balanced',
        icon: Brain,
        description: 'Thorough analysis',
        color: 'text-brand-accent'
    },
    {
        id: 'deep',
        label: 'Deep',
        icon: Clock,
        description: 'Comprehensive report',
        color: 'text-emerald-400'
    }
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

    const currentOption = modes.find((o) => o.id === mode) || modes[0];
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
                    className="w-full max-w-[240px] rounded-2xl bg-[#18151d] border border-white/5 shadow-2xl overflow-hidden z-[9999]"
                >
                    <div className="p-1.5 flex flex-col gap-0.5">
                        {modes.map((option) => {
                            const isActive = option.id === mode;
                            const Icon = option.icon;

                            return (
                                <button
                                    key={option.id}
                                    onClick={() => handleSelect(option.id)}
                                    className={`
                                        w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-200
                                        ${isActive
                                            ? 'bg-white/5 text-white'
                                            : 'text-white/40 hover:bg-white/[0.02] hover:text-white/80'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Icon */}
                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center border transition-colors
                                            ${isActive
                                                ? 'bg-white/10 border-white/10'
                                                : 'bg-white/5 border-white/5'
                                            }
                                        `}>
                                            <Icon
                                                size={14}
                                                className={`transition-colors ${isActive ? option.color : 'text-white/40'}`}
                                            />
                                        </div>

                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-medium leading-none mb-1">
                                                {option.label}
                                            </span>
                                            <span className="text-[10px] text-white/30 leading-tight">
                                                {option.description}
                                            </span>
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
                    {currentOption.label}
                </span>
            </button>

            {/* Dropdown Menu - Rendered via Portal to document.body */}
            {mounted && createPortal(dropdownMenu, document.body)}
        </div>
    );
}
