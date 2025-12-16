import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '../lib/utils';
import TokenCounter from './TokenCounter';

function ConversationTokenTracker({
  messages = [],
  isStreaming = false,
  currentStreamingTokens = 0,
  compact = false,
  showHistory = false,
  className = ""
}) {
  const [aggregateStats, setAggregateStats] = useState({
    totalInputTokens: 0,
    totalOutputTokens: 0,
    messageCount: 0,
    turnCount: 0
  });

  // Calculate token statistics from messages
  const tokenStats = useMemo(() => {
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const messageCount = messages.length;
    let turnCount = 0;

    messages.forEach((message, index) => {
      if (message.role === 'user') {
        // Estimate input tokens (rough approximation: 1 token ≈ 4 characters)
        if (message.content) {
          totalInputTokens += Math.ceil(message.content.length / 4);
        }
        if (index > 0 && messages[index - 1].role !== 'user') {
          turnCount++;
        }
      } else if (message.role === 'assistant') {
        // Estimate output tokens
        if (message.content) {
          totalOutputTokens += Math.ceil(message.content.length / 4);
        }
      }

      // Include actual token counts if available in message metadata
      if (message.tokens) {
        if (message.role === 'user') {
          totalInputTokens = message.tokens.input || totalInputTokens;
        } else if (message.role === 'assistant') {
          totalOutputTokens = message.tokens.output || totalOutputTokens;
        }
        if (message.tokens.total) {
          const total = message.tokens.total;
          totalInputTokens = message.tokens.input || total * 0.3; // Rough split
          totalOutputTokens = message.tokens.output || total * 0.7;
        }
      }
    });

    return {
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      messageCount,
      turnCount: turnCount || Math.ceil(messageCount / 2)
    };
  }, [messages]);

  // Update aggregate stats when token stats change
  useEffect(() => {
    setAggregateStats(tokenStats);
  }, [tokenStats]);

  const totalTokens = aggregateStats.totalInputTokens + aggregateStats.totalOutputTokens +
                     (isStreaming ? currentStreamingTokens : 0);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <TokenCounter
          totalTokens={totalTokens}
          streaming={isStreaming}
          compact={true}
        />
        <span className="text-gray-500 text-xs">
          {aggregateStats.turnCount} turns
        </span>
      </div>
    );
  }

  return (
    <div className={cn("bg-gray-900/50 rounded-lg p-3 space-y-2", className)}>
      {/* Current conversation stats */}
      <div className="flex items-center justify-between">
        <h4 className="text-white font-medium text-sm">Current Session</h4>
        <TokenCounter
          inputTokens={aggregateStats.totalInputTokens}
          outputTokens={aggregateStats.totalOutputTokens}
          totalTokens={totalTokens}
          streaming={isStreaming}
          compact={true}
        />
      </div>

      {/* Detailed breakdown */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-blue-400">→ Input</span>
            <span className="text-gray-300 font-mono">
              {aggregateStats.totalInputTokens.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">← Output</span>
            <span className="text-gray-300 font-mono">
              {aggregateStats.totalOutputTokens.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">💬 Messages</span>
            <span className="text-gray-300 font-mono">
              {aggregateStats.messageCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">🔄 Turns</span>
            <span className="text-gray-300 font-mono">
              {aggregateStats.turnCount}
            </span>
          </div>
        </div>
      </div>

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="flex items-center gap-2 text-xs text-blue-400">
          <span className="animate-pulse">●</span>
          <span>Streaming... +{currentStreamingTokens.toLocaleString()} tokens</span>
        </div>
      )}

      {/* Cost estimation (rough) */}
      <div className="text-xs text-gray-500 border-t border-gray-800 pt-2">
        <div className="flex justify-between">
          <span>Est. cost</span>
          <span>${(totalTokens * 0.000003).toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
}

export default ConversationTokenTracker;