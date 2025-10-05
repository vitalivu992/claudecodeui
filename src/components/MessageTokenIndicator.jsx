import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

function MessageTokenIndicator({
  message,
  showInputOutput = false,
  position = 'bottom-right', // 'top-right', 'top-left', 'bottom-right', 'bottom-left'
  className = ""
}) {
  const [tokenCount, setTokenCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Calculate or extract token count
  useEffect(() => {
    if (!message) return;

    let tokens = 0;

    // Use actual token count if available in message metadata
    if (message.tokens) {
      if (message.tokens.total) {
        tokens = message.tokens.total;
      } else if (message.tokens.input || message.tokens.output) {
        tokens = (message.tokens.input || 0) + (message.tokens.output || 0);
      }
    } else if (message.content) {
      // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
      tokens = Math.ceil(message.content.length / 4);
    }

    // Animate token count changes
    if (tokens !== tokenCount) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
      setTokenCount(tokens);
    }
  }, [message, tokenCount]);

  if (!message || tokenCount === 0) return null;

  const positionClasses = {
    'top-right': 'top-2 right-2',
    'top-left': 'top-2 left-2',
    'bottom-right': 'bottom-2 right-2',
    'bottom-left': 'bottom-2 left-2'
  };

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div className={cn(
      "absolute z-10 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono transition-all duration-300",
      positionClasses[position],
      isAnimating && "scale-110",
      isUser && "bg-blue-500/20 text-blue-300 border border-blue-500/30",
      isAssistant && "bg-green-500/20 text-green-300 border border-green-500/30",
      className
    )}>
      {/* Icon based on role */}
      {isUser && <span className="text-blue-400">→</span>}
      {isAssistant && <span className="text-green-400">←</span>}

      {/* Token count */}
      <span>{tokenCount.toLocaleString()}</span>

      {/* Token type label */}
      <span className="text-xs opacity-70">
        {isUser ? 'in' : 'out'}
      </span>

      {/* Detailed input/output breakdown */}
      {showInputOutput && message.tokens && (
        <div className="flex items-center gap-2 ml-2 text-xs">
          {message.tokens.input && (
            <span className="text-blue-300">
              in: {message.tokens.input.toLocaleString()}
            </span>
          )}
          {message.tokens.output && (
            <span className="text-green-300">
              out: {message.tokens.output.toLocaleString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default MessageTokenIndicator;