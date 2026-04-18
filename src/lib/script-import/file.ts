/**
 * Read browser File as UTF-8 text.
 */

export function readFileAsUtf8(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsText(file, "UTF-8");
  });
}

/** HTML file input `accept` — MIME types help macOS / Windows file dialogs. */
export const SCRIPT_IMPORT_ACCEPT =
  ".txt,.fountain,.md,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
