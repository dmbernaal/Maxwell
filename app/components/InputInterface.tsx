'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { Mic, ArrowRight, Search, Zap, Globe, FileText, Plus, Paperclip, X } from 'lucide-react';
import { AgentState, SearchMode, Attachment, ATTACHMENT_LIMITS } from '../types';
import { convertToBase64, validateAttachment, generateAttachmentId } from '../lib/file-utils';
import ModeDropdown from './ModeDropdown';

interface InputInterfaceProps {
  state: AgentState;
  hasMessages: boolean;
  onQuery: (query: string, attachments?: Attachment[]) => void;
  mode?: SearchMode;
  onModeChange?: (mode: SearchMode) => void;
  disabled?: boolean;
  hasMaxwellResults?: boolean;
  onViewResults?: () => void;
  onFocusChange?: (isFocused: boolean) => void;
}

function SpotlightPill({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) {


  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative group rounded-full p-[1px] bg-white/5 overflow-hidden"
    >

      <div className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18151d] backdrop-blur-md border border-transparent">
        <Icon size={12} className="opacity-50 group-hover:opacity-100 transition-opacity text-white" />
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/50 group-hover:text-white/90 transition-colors">{label}</span>
      </div>
    </motion.button>
  );
}

export default function InputInterface({
  state,
  hasMessages,
  onQuery,
  mode = 'normal',
  onModeChange,
  disabled = false,
  hasMaxwellResults = false,
  onViewResults,
  onFocusChange,
}: InputInterfaceProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Is Maxwell mode (attachments disabled)
  const isMaxwellMode = mode === 'maxwell';

  // Reset height when query is cleared
  React.useEffect(() => {
    if (!query && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [query]);

  // Spotlight effect logic
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onQuery(query, attachments.length > 0 ? attachments : undefined);
      setQuery('');
      // Clear attachments from input (URLs are kept for display in chat)
      setAttachments([]);
    }
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check if adding these would exceed limit
    const remainingSlots = ATTACHMENT_LIMITS.MAX_FILES - attachments.length;
    const filesToProcess = files.slice(0, remainingSlots);

    for (const file of filesToProcess) {
      const error = validateAttachment(file);
      if (error) {
        console.warn('[Attachment]', error);
        continue;
      }

      try {
        const base64 = await convertToBase64(file);
        const attachment: Attachment = {
          id: generateAttachmentId(),
          file,
          previewUrl: URL.createObjectURL(file),
          base64,
          mediaType: file.type as Attachment['mediaType'],
        };
        setAttachments(prev => [...prev, attachment]);
      } catch (err) {
        console.error('[Attachment] Failed to process:', err);
      }
    }

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove an attachment
  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const toRemove = prev.find(a => a.id === id);
      if (toRemove) {
        URL.revokeObjectURL(toRemove.previewUrl);
      }
      return prev.filter(a => a.id !== id);
    });
  };

  const handlePillClick = (text: string) => {
    setQuery(text);
  };

  return (
    <div className="w-full max-w-3xl mx-auto z-10 flex flex-col gap-6">
      {/* Greeting - Only visible in Relaxed state AND no messages */}
      <AnimatePresence>
        {state === 'relaxed' && !hasMessages && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-2 mb-4"
          >
            <h1 className="text-xl md:text-2xl text-white/80 font-medium tracking-normal">
              I am Maxwell's AI.
            </h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Central Command Input - Kaiyros Spotlight Aesthetic */}
      <div className="relative w-full">
        <motion.form
          onSubmit={handleSubmit}
          className="relative group w-full p-[1px] rounded-[24px] bg-gradient-to-b from-white/15 to-white/5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Inner Container: Obsidian Surface */}
          <div
            className={`
              relative flex flex-col w-full rounded-[23px]
              bg-[#18151d] backdrop-blur-xl
              transition-all duration-500 ease-out
              overflow-hidden
              border
              hover:border-white/10 hover:shadow-[0_0_30px_-10px_rgba(255,255,255,0.05)]
              ${isFocused
                ? 'border-white/10 shadow-[0_0_30px_-5px_rgba(255,255,255,0.07)]'
                : 'border-transparent shadow-2xl'
              }
            `}
          >
            {/* Subtle top highlight gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

            {/* Attachment Preview Row */}
            {attachments.length > 0 && (
              <div className="px-4 pt-4 pb-2 flex items-center gap-2 border-b border-white/5">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="relative group w-12 h-12 rounded-lg overflow-hidden border border-white/10 bg-white/5"
                  >
                    <img
                      src={attachment.previewUrl}
                      alt="Attachment preview"
                      className="w-full h-full object-cover"
                    />
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <X size={16} className="text-white" />
                    </button>
                  </div>
                ))}
                {attachments.length < ATTACHMENT_LIMITS.MAX_FILES && !isMaxwellMode && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-12 h-12 rounded-lg border border-dashed border-white/20 flex items-center justify-center text-white/30 hover:text-white/60 hover:border-white/40 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                )}
              </div>
            )}

            {/* Top Section: Text Area */}
            <div className="p-4 pb-2">
              <textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  // Auto-resize
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (query.trim()) {
                      handleSubmit(e);
                    }
                  }
                }}
                onFocus={() => {
                  setIsFocused(true);
                  onFocusChange?.(true);
                }}
                onBlur={() => {
                  setIsFocused(false);
                  onFocusChange?.(false);
                }}
                placeholder="Ask anything..."
                rows={1}
                className="w-full bg-transparent text-lg text-white placeholder-white/30 focus:outline-none font-light py-2 resize-none max-h-[200px] overflow-y-auto"
              />
            </div>

            {/* Bottom Section: Controls */}
            <div className="px-4 pb-4 flex items-center justify-between">

              {/* Left: Tools & Attachments */}
              <div className="flex items-center gap-2">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Attach button with Maxwell mode guard */}
                <div className="relative group/attach">
                  <button
                    type="button"
                    onClick={() => !isMaxwellMode && fileInputRef.current?.click()}
                    disabled={isMaxwellMode || attachments.length >= ATTACHMENT_LIMITS.MAX_FILES}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/5 transition-all text-xs font-medium ${isMaxwellMode || attachments.length >= ATTACHMENT_LIMITS.MAX_FILES
                      ? 'bg-[#18151d] text-white/30 cursor-not-allowed'
                      : 'bg-[#18151d] hover:bg-[#231f29] text-white/60'
                      }`}
                  >
                    <Paperclip size={14} />
                    <span>Attach</span>
                    {attachments.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-white/10 rounded-full text-[10px]">
                        {attachments.length}
                      </span>
                    )}
                  </button>
                  {/* Tooltip for Maxwell mode */}
                  {isMaxwellMode && (
                    <div className="absolute left-0 bottom-full mb-2 px-3 py-1.5 bg-[#18151d] border border-white/10 rounded-lg text-[11px] text-white/70 whitespace-nowrap opacity-0 group-hover/attach:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                      Image analysis not available in Verified Research mode
                    </div>
                  )}
                </div>

                {onModeChange && (
                  <ModeDropdown
                    mode={mode}
                    onModeChange={onModeChange}
                    disabled={disabled}
                    hasMaxwellResults={hasMaxwellResults}
                    onViewResults={onViewResults}
                  />
                )}
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-3">

                {/* Mic - Disabled with tooltip */}
                <div className="relative group/mic">
                  <button
                    type="button"
                    disabled
                    className="text-white/20 cursor-not-allowed p-2"
                  >
                    <Mic size={18} />
                  </button>
                  {/* Tooltip - positioned to the left to avoid clipping */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 mr-10 px-3 py-1.5 bg-[#18151d] border border-white/10 rounded-lg text-[11px] text-white/70 whitespace-nowrap opacity-0 group-hover/mic:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                    Companion mode coming soon
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!query}
                  className={`
                    p-2 rounded-full transition-all duration-500
                    ${query
                      ? 'bg-white text-black shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:scale-105'
                      : 'bg-white/5 text-white/20 cursor-not-allowed'
                    }
                  `}
                >
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </motion.form>

        {/* Quick Actions - Pills (Absolute positioned to prevent layout shift) */}
        <div className="absolute top-full left-0 w-full pt-6">
          <AnimatePresence>
            {state === 'relaxed' && !query && (
              <motion.div
                className="flex flex-nowrap justify-center gap-2 px-4 overflow-x-auto no-scrollbar w-full"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {[
                  { icon: Search, label: 'Deep Research' },
                  { icon: Zap, label: 'Brainstorm' },
                  { icon: Globe, label: 'Market Analysis' },
                  { icon: FileText, label: 'Summarize' },
                ].map((item, idx) => (
                  <SpotlightPill
                    key={idx}
                    icon={item.icon}
                    label={item.label}
                    onClick={() => handlePillClick(item.label)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

