/** SheetJS js-word: only the legacy DOC codec (avoids pulling HTML/jsdom from the main entry). */
declare module 'word/dist/cjs/codecs/DOC/index.js' {
  export function parse_cfb(file: unknown): { p: unknown[] };
}

declare module 'word/dist/cjs/codecs/TXT/index.js' {
  export function write_str(doc: { p: unknown[] }, opts?: { RS?: string }): string;
}
