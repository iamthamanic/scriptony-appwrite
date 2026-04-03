/**
 * Textfeld-Primitive (shadcn). Hintergrund: `bg-input-background` → CSS-Variable
 * `--input-background` (siehe `src/index.css`, Block `.dark`). Kein Hook nötig:
 * `useTheme` setzt nur `class="dark"` auf `documentElement`; die Variablen steuern Farben app-weit.
 */
import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-border flex h-9 w-full min-w-0 rounded-md border-2 px-3 py-1 text-base bg-input-background transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-primary focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
