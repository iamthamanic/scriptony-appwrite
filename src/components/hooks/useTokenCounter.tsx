/**
 * useTokenCounter Hook
 * 
 * Provides real-time token counting for chat input.
 * Estimates tokens locally for instant feedback.
 */

import { useState, useCallback, useRef } from 'react';
import { apiPost } from '../../lib/api-client';

interface TokenCounterState {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  contextWindow: number;
  isEstimating: boolean;
}

interface UseTokenCounterOptions {
  contextWindow?: number;
  model?: string;
  debounceMs?: number;
}

/**
 * Simple local token estimation
 * Rule: ~4 characters per token for English text
 */
function estimateTokensLocal(text: string): number {
  if (!text) return 0;
  // Conservative estimate: 3.5 characters per token
  return Math.ceil(text.length / 3.5);
}

export function useTokenCounter(options: UseTokenCounterOptions = {}) {
  const {
    contextWindow = 200000,
    model,
    debounceMs = 500,
  } = options;

  const [state, setState] = useState<TokenCounterState>({
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    contextWindow,
    isEstimating: false,
  });

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * Estimate tokens for input text (instant local estimation)
   */
  const estimateInput = useCallback((text: string) => {
    const estimated = estimateTokensLocal(text);
    setState(prev => ({
      ...prev,
      inputTokens: estimated,
      totalTokens: estimated + prev.outputTokens,
    }));
    return estimated;
  }, []);

  /**
   * Get accurate token count from backend (debounced)
   */
  const countInputAccurate = useCallback(async (text: string) => {
    if (!text) {
      setState(prev => ({ ...prev, inputTokens: 0, totalTokens: prev.outputTokens }));
      return;
    }

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Immediate local estimation
    estimateInput(text);

    // Debounced backend call for accuracy
    debounceTimer.current = setTimeout(async () => {
      setState(prev => ({ ...prev, isEstimating: true }));
      
      try {
        const result = await apiPost('/ai/count-tokens', {
          text,
          model: model || undefined,
        });

        if (result.data) {
          const d = result.data as {
            tokens?: number;
            token_count?: number;
            input_tokens?: number;
            total_tokens?: number;
          };
          const accurateTokens = Number(
            d.token_count ?? d.input_tokens ?? d.tokens ?? d.total_tokens ?? 0,
          );
          setState((prev) => ({
            ...prev,
            inputTokens: accurateTokens,
            totalTokens: accurateTokens + prev.outputTokens,
            isEstimating: false,
          }));
        }
      } catch (error) {
        console.error('Failed to get accurate token count:', error);
        setState(prev => ({ ...prev, isEstimating: false }));
      }
    }, debounceMs);
  }, [model, debounceMs, estimateInput]);

  /**
   * Add output tokens (from AI response)
   */
  const addOutputTokens = useCallback((tokens: number) => {
    setState(prev => ({
      ...prev,
      outputTokens: prev.outputTokens + tokens,
      totalTokens: prev.inputTokens + prev.outputTokens + tokens,
    }));
  }, []);

  /**
   * Update from backend response (most accurate)
   */
  const updateFromResponse = useCallback((tokenDetails: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  }) => {
    setState(prev => ({
      ...prev,
      inputTokens: tokenDetails.input_tokens || prev.inputTokens,
      outputTokens: tokenDetails.output_tokens || prev.outputTokens,
      totalTokens: tokenDetails.total_tokens || (
        (tokenDetails.input_tokens || prev.inputTokens) + 
        (tokenDetails.output_tokens || prev.outputTokens)
      ),
      isEstimating: false,
    }));
  }, []);

  /**
   * Reset counter
   */
  const reset = useCallback(() => {
    setState((prev) => ({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      contextWindow: prev.contextWindow,
      isEstimating: false,
    }));
  }, []);

  /**
   * Update context window
   */
  const setContextWindow = useCallback((window: number) => {
    setState(prev => ({ ...prev, contextWindow: window }));
  }, []);

  // Computed values
  const remainingTokens = Math.max(0, state.contextWindow - state.totalTokens);
  const usagePercent =
    state.contextWindow > 0 ? (state.totalTokens / state.contextWindow) * 100 : 0;
  const isNearLimit = usagePercent > 80;
  const isOverLimit = state.totalTokens > state.contextWindow;

  // Format for display
  const formatted = {
    total: formatTokens(state.totalTokens),
    contextWindow: formatTokens(state.contextWindow),
    remaining: formatTokens(remainingTokens),
    input: formatTokens(state.inputTokens),
    output: formatTokens(state.outputTokens),
  };

  return {
    // State
    ...state,
    remainingTokens,
    usagePercent,
    isNearLimit,
    isOverLimit,
    formatted,
    
    // Actions
    estimateInput,
    countInputAccurate,
    addOutputTokens,
    updateFromResponse,
    reset,
    setContextWindow,
  };
}

/**
 * Format token count for display
 */
function formatTokens(tokens: number): string {
  const n = Number.isFinite(tokens) ? tokens : 0;
  if (n >= 1000000) {
    return `${(n / 1000000).toFixed(2)}M`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}K`;
  }
  return n.toLocaleString();
}
