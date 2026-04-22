/**
 * 🐛 CLICK DEBUG HOOK
 *
 * Hilft beim Debuggen von Click-Events
 * Loggt alle Klicks mit Element-Informationen
 */

import { useEffect } from "react";

export function useClickDebug(enabled: boolean = false) {
  useEffect(() => {
    if (!enabled) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      console.log("[Click Debug] 🖱️ Click detected:", {
        target: target.tagName,
        className: target.className,
        id: target.id,
        textContent: target.textContent?.substring(0, 50),
        dataset: target.dataset,
        closest: {
          button: target.closest("button")?.textContent?.substring(0, 30),
          li: target.closest("li")?.dataset,
        },
      });
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [enabled]);
}
