'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SmallGhostLogo } from './SmallGhostLogo';
import { User } from 'lucide-react';

export default function Header() {
    return (
        <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between"
        >
            {/* Left: Brand */}
            <div className="flex items-center">
                <div className="w-[32px] h-[40px]">
                    <SmallGhostLogo isActive={false} />
                </div>
            </div>

            {/* Right: Profile Placeholder */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-full bg-[#0a0a0a] border border-white/5 flex items-center justify-center text-white/40 hover:text-white hover:border-white/10 transition-all"
            >
                <User size={18} />
            </motion.button>
        </motion.header>
    );
}
