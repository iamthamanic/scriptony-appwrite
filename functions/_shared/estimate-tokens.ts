/**
 * Rough token estimate used for lightweight UI feedback.
 * Not a real tokenizer — for accurate counts use tiktoken or provider APIs.
 */
export function estimateTokens(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}
