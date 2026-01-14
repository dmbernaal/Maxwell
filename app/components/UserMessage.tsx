'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { MessageAttachment } from '../types';

interface UserMessageProps {
  content: string;
  attachments?: MessageAttachment[];
  isHistory?: boolean;
}

export default function UserMessage({ content, attachments, isHistory = false }: UserMessageProps) {
  return (
    <motion.div
      initial={isHistory ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-3xl mx-auto flex justify-end mb-4"
    >
      <div className="bg-[#141414] px-5 py-2.5 rounded-xl rounded-tr-sm text-white/80 text-[15px] font-light leading-relaxed max-w-[85%]">
        {/* Attachments - displayed above text */}
        {attachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="w-20 h-20 rounded-md overflow-hidden bg-[#1a1a1a]"
              >
                <img
                  src={attachment.previewUrl}
                  alt="Attachment"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
        {/* Text content */}
        {content}
      </div>
    </motion.div>
  );
}
