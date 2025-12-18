import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

function TokenCounter({
  inputTokens = 0,
  outputTokens = 0,
  totalTokens = null,
  streaming = false,
  compact = false,
  showDetails = false,
  className = ''
}) {
  const [animatedTotal, setAnimatedTotal] = useState(0);
  const [prevTotal, setPrevTotal] = useState(0);

  // Calculate total if not provided
  const calculatedTotal = totalTokens !== null ? totalTokens : inputTokens + outputTokens;

  // Animate token count changes
  useEffect(() => {
    if (calculatedTotal !== prevTotal) {
      const duration = 300; // ms
      const steps = 20;
      const increment = (calculatedTotal - prevTotal) / steps;
      let currentStep = 0;

      const timer = setInterval(() => {
        currentStep++;
        const newValue = prevTotal + (increment * currentStep);
        setAnimatedTotal(Math.round(newValue));

        if (currentStep >= steps) {
          setAnimatedTotal(calculatedTotal);
          setPrevTotal(calculatedTotal);
          clearInterval(timer);
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [calculatedTotal, prevTotal]);

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1 text-xs', className)}>
        <span className="text-gray-400">⚒</span>
        <span className="text-gray-300 font-mono">{animatedTotal.toLocaleString()}</span>
        {streaming && (
          <span className="text-blue-400 animate-pulse">◆</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col space-y-1', className)}>
      {/* Main total display */}
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-sm">Tokens</span>
        <span className="text-white font-mono font-medium">
          {animatedTotal.toLocaleString()}
        </span>
        {streaming && (
          <span className="text-blue-400 animate-pulse text-xs">live</span>
        )}
      </div>

      {/* Detailed breakdown */}
      {showDetails && (inputTokens > 0 || outputTokens > 0) && (
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <span className="text-blue-400">→</span>
            <span>In: {inputTokens.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-400">←</span>
            <span>Out: {outputTokens.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default TokenCounter;
