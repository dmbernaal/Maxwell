'use client';

import { useState, useEffect } from 'react';
import { Message } from '../../types';
import InputInterface from '../InputInterface';
import ResponseDisplay from '../ResponseDisplay';
import { AsciiDecoration } from './primitives/AsciiDecoration';
import { Terminal } from 'lucide-react';

interface MarketChatProps {
    marketId: string;
}

export function MarketChat({ marketId }: MarketChatProps) {
    if (false) console.log(marketId);

    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [placeholderText, setPlaceholderText] = useState("");
    const [isTyping, setIsTyping] = useState(true);
    
    // Typing animation for empty state
    useEffect(() => {
        const placeholder = "Ask Maxwell about this market...";
        let i = 0;
        const interval = setInterval(() => {
            if (i <= placeholder.length) {
                setPlaceholderText(placeholder.substring(0, i));
                i++;
            } else {
                setIsTyping(false);
                clearInterval(interval);
            }
        }, 50);
        return () => clearInterval(interval);
    }, []);
    
    const handleQuery = async (query: string) => {
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: query,
            timestamp: Date.now()
        };
        
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        
        setTimeout(() => {
            const agentMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'agent',
                content: "I'm focusing on analyzing the market data. Please use the main intelligence panel for deep analysis.",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, agentMsg]);
            setIsLoading(false);
        }, 1000);
    };

    return (
        <div className="flex flex-col h-full relative overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full relative">
                        <AsciiDecoration />
                        <div className="text-center space-y-2 relative z-10">
                            <div className="text-[10px] font-mono font-medium uppercase tracking-wider text-[#525252] select-none">Market Chat</div>
                            <p className="text-[#525252] text-xs font-mono min-h-[1.5em]">{placeholderText || " "}</p>
                            <p className="text-[#525252] text-[10px] font-mono opacity-50">Try: "What's the main risk factor?"</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map(msg => (
                            <ResponseDisplay 
                                key={msg.id} 
                                message={msg} 
                                status="relaxed" 
                            />
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="max-w-[85%] bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Terminal className="w-3 h-3 text-[#FA5D19]" />
                                        <span className="text-[10px] font-mono text-[#FA5D19] tracking-wider">MAXWELL IS THINKING</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <span className="w-1 h-3 bg-[#FA5D19] rounded-full animate-pulse" style={{animationDelay: '0s'}}></span>
                                        <span className="w-1 h-3 bg-[#FA5D19] rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></span>
                                        <span className="w-1 h-3 bg-[#FA5D19] rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
            
            <div className="p-4 border-t border-[#2A2A2A] relative overflow-hidden">
                <InputInterface
                    state={isLoading ? 'thinking' : 'relaxed'}
                    hasMessages={messages.length > 0}
                    onQuery={handleQuery}
                    mode="maxwell"
                    hideSuggestions
                />
            </div>
        </div>
    );
}