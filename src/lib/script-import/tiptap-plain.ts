/**
 * Minimal TipTap JSON for plain text (matches BookDropdown / word-count expectations).
 */

export function plainTextToTiptapJson(text: string): { type: string; content?: unknown[] } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { type: 'doc', content: [{ type: 'paragraph', content: [] }] };
  }
  const paragraphs = trimmed.split(/\n{2,}/);
  return {
    type: 'doc',
    content: paragraphs.map((p) => ({
      type: 'paragraph',
      content: p.split('\n').length
        ? p.split('\n').flatMap((line, i, arr) =>
            i < arr.length - 1
              ? [{ type: 'text', text: line }, { type: 'hardBreak' }]
              : [{ type: 'text', text: line }]
          )
        : [],
    })),
  };
}

export function tiptapDocToContentString(text: string): string {
  return JSON.stringify(plainTextToTiptapJson(text));
}
