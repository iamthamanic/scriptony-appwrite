/**
 * Compact 3-ring orbit loader used in the assistant chat while a reply is in progress.
 * Location: src/components/ai/AssistantOrbitLoader.tsx
 */

import "./assistant-orbit-loader.css";

export function AssistantOrbitLoader({
  className = "",
  ariaLabel = "Antwort wird generiert",
}: {
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      className={`assistant-orbit-root ${className}`.trim()}
      role="status"
      aria-label={ariaLabel}
    >
      <div className="assistant-orbit-loader" aria-hidden>
        <span className="assistant-orbit-ring assistant-orbit-ring-one" />
        <span className="assistant-orbit-ring assistant-orbit-ring-two" />
        <span className="assistant-orbit-ring assistant-orbit-ring-three" />
      </div>
      <span className="assistant-orbit-label">Scriptony antwortet…</span>
    </div>
  );
}
