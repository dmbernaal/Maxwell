'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Plus, MessageSquare, Trash2 } from 'lucide-react';
import { useChatStore } from '../store';

export default function ChatHistory() {
    const { sessions, activeSessionId, createSession, switchSession, deleteSession } = useChatStore();
    const [isHovered, setIsHovered] = useState(false);

    // Sort sessions by updatedAt desc
    const sortedSessions = useMemo(() => {
        return Object.values(sessions).sort((a, b) => b.updatedAt - a.updatedAt);
    }, [sessions]);

    const handleNewChat = (e: React.MouseEvent) => {
        e.stopPropagation();
        createSession();
    };

    const handleSessionClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        switchSession(id);
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        deleteSession(id);
    };

    // Animation Config (The Snappy Standard)
    const transition = { type: 'spring' as const, stiffness: 300, damping: 40 };

    // Staggered List Animation
    const listVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05,
                delayChildren: 0.1
            }
        },
        exit: { opacity: 0 }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -10, filter: 'blur(4px)' },
        show: { opacity: 1, x: 0, filter: 'blur(0px)' }
    };

    // Helper for relative time
    const getRelativeTime = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString();
    };

    return (
        <motion.div
            className="fixed top-6 left-6 z-50 flex flex-col items-start"
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            initial={false}
        >
            {/* The Container - Expands in place */}
            <motion.div
                initial={false}
                animate={{
                    width: isHovered ? 280 : 48, // Tighter width
                    height: isHovered ? 'auto' : 48
                }}
                transition={transition}
                className={`
          relative overflow-hidden backdrop-blur-xl border border-white/5 shadow-2xl
          bg-[#18151d]
          rounded-[24px]
        `}
            >
                {/* Header / Trigger Area */}
                <div className="flex items-center justify-between pl-3.5 pr-3 h-12 w-full">
                    <div className="flex items-center gap-3">
                        {/* Icon - Fixed Position */}
                        <motion.div
                            layout="position"
                            className="flex items-center justify-center shrink-0"
                        >
                            <History size={18} className="text-white/60" />
                        </motion.div>

                        {/* Title (Visible on Hover) */}
                        <motion.span
                            layout="position"
                            className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40 whitespace-nowrap"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: isHovered ? 1 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            History
                        </motion.span>
                    </div>

                    {/* New Chat Button (Visible on Hover) - Consistent Style */}
                    <AnimatePresence>
                        {isHovered && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={handleNewChat}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18151d] hover:bg-[#231f29] border border-white/5 transition-all text-white/60 hover:text-white group"
                            >
                                <Plus size={12} className="group-hover:text-white transition-colors" />
                                <span className="text-[10px] font-medium tracking-wide">New</span>
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                {/* Scrollable List (Visible on Hover) */}
                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            variants={listVariants}
                            initial="hidden"
                            animate="show"
                            exit="exit"
                            className="px-2 pb-2 max-h-[400px] overflow-y-auto no-scrollbar flex flex-col gap-1"
                        >
                            <AnimatePresence mode="popLayout" initial={false}>
                                {sortedSessions.length === 0 ? (
                                    <motion.div
                                        key="empty"
                                        variants={itemVariants}
                                        initial="hidden"
                                        animate="show"
                                        exit="hidden"
                                        className="p-4 text-center text-[11px] text-white/20 italic font-light tracking-wide"
                                    >
                                        No conversations yet
                                    </motion.div>
                                ) : (
                                    sortedSessions.map(session => (
                                        <motion.div
                                            key={session.id}
                                            layout
                                            variants={itemVariants}
                                            initial="hidden"
                                            animate="show"
                                            exit="hidden"
                                            onClick={(e) => handleSessionClick(session.id, e)}
                                            className={`
                        group relative flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-all duration-200
                        ${activeSessionId === session.id
                                                    ? 'bg-white/[0.03] text-white'
                                                    : 'text-white/50 hover:bg-white/[0.02] hover:text-white/80'
                                                }
                      `}
                                        >
                                            <MessageSquare
                                                size={12}
                                                className={`shrink-0 transition-colors ${activeSessionId === session.id ? 'text-white' : 'text-white/20 group-hover:text-white/40'}`}
                                            />

                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-[13px] truncate font-normal leading-none transition-colors">
                                                    {session.title}
                                                </span>
                                                <span className="text-[9px] text-white/20 font-mono leading-none mt-1.5 block">
                                                    {getRelativeTime(session.updatedAt)}
                                                </span>
                                            </div>

                                            {/* Delete Action - Polite & Subtle */}
                                            <button
                                                onClick={(e) => handleDelete(session.id, e)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 hover:text-white text-white/20 rounded-md transition-all absolute right-2"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}
