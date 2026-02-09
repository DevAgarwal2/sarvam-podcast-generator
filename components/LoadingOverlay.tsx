'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Brain, Volume2, Loader2 } from 'lucide-react';

interface LoadingState {
  step: 'extract' | 'script' | 'audio';
  message: string;
  subMessage?: string;
}

interface LoadingOverlayProps {
  state: LoadingState;
}

// Animated messages for each step
const STEP_MESSAGES = {
  extract: [
    'Reading PDF document...',
    'Analyzing page structure...',
    'Extracting text content...',
    'Processing document layout...',
    'Organizing extracted data...',
  ],
  script: [
    'Analyzing document content...',
    'Identifying key topics...',
    'Creating conversation flow...',
    'Writing Host dialogue...',
    'Writing Expert responses...',
    'Adding Guest perspectives...',
    'Polishing script tone...',
  ],
  audio: [
    'Preparing voice models...',
    'Generating Host audio...',
    'Generating Expert audio...',
    'Generating Guest audio...',
    'Synthesizing speech segments...',
    'Combining audio tracks...',
    'Finalizing podcast...',
  ],
};

// Icons for each step
const STEP_ICONS = {
  extract: FileText,
  script: Brain,
  audio: Volume2,
};

// Colors for each step
const STEP_COLORS = {
  extract: 'text-[#C8D5B9]',
  script: 'text-[#A8B8E8]',
  audio: 'text-[#F5B57A]',
};

// Dot animation component
function DotAnimation() {
  return (
    <span className="inline-flex gap-1 ml-1">
      <span className="w-1.5 h-1.5 bg-[#2B2B2B] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 bg-[#2B2B2B] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 bg-[#2B2B2B] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </span>
  );
}

export function LoadingOverlay({ state }: LoadingOverlayProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  
  const messages = STEP_MESSAGES[state.step];
  const Icon = STEP_ICONS[state.step];
  const colorClass = STEP_COLORS[state.step];

  // Cycle through messages
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
      setDisplayedText('');
      setIsTyping(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [messages.length]);

  // Typewriter effect
  useEffect(() => {
    const currentMessage = messages[currentMessageIndex];
    
    if (isTyping) {
      if (displayedText.length < currentMessage.length) {
        const timeout = setTimeout(() => {
          setDisplayedText(currentMessage.slice(0, displayedText.length + 1));
        }, 30);
        return () => clearTimeout(timeout);
      } else {
        setIsTyping(false);
      }
    }
  }, [displayedText, isTyping, messages, currentMessageIndex]);

  return (
    <div className="fixed inset-0 bg-[#F8F6F3]/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-white border border-[#E5E5E5] shadow-xl">
        <CardContent className="p-8">
          {/* Header with icon */}
          <div className="flex items-center gap-4 mb-8">
            <div className={`w-12 h-12 rounded-xl bg-[#F5F5F5] flex items-center justify-center ${colorClass}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#2B2B2B]">
                {state.message}
              </h2>
              {state.subMessage && (
                <p className="text-sm text-[#8B8B8B]">{state.subMessage}</p>
              )}
            </div>
          </div>

          {/* Animated text area */}
          <div className="bg-[#F8F6F3] rounded-xl p-6 min-h-[120px]">
            <div className="flex items-start gap-3">
              <Loader2 className={`h-5 w-5 mt-0.5 animate-spin ${colorClass}`} />
              <div className="flex-1">
                <p className="text-[#2B2B2B] font-medium text-lg">
                  {displayedText}
                  {!isTyping && <DotAnimation />}
                  {isTyping && displayedText.length < messages[currentMessageIndex].length && (
                    <span className="inline-block w-0.5 h-5 bg-[#2B2B2B] ml-0.5 animate-pulse" />
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-6">
            {messages.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentMessageIndex
                    ? 'bg-[#2B2B2B] w-6'
                    : index < currentMessageIndex
                    ? 'bg-[#2B2B2B]/30'
                    : 'bg-[#E5E5E5]'
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export type { LoadingState };
