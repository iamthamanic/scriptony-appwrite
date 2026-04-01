/**
 * Sphere particle loading animation for Scriptony Assistant (generating state).
 * Matches Hakim / CodePen structure: 62 nodes, same element carries
 * rotate(α) translate3d(r,0,0) and the spin keyframes (transform interpolation).
 * Background #8E75D1.
 * Location: src/components/ai/AssistantParticleLoader.tsx
 */

import "./assistant-particle-loader.css";

const PARTICLE_COUNT = 62;
const LAP_DURATION_S = 3;
const RADIUS_PX = 80;

export function AssistantParticleLoader({
  className = "",
  ariaLabel = "Antwort wird generiert",
}: {
  className?: string;
  /** Screen reader label (e.g. "Bild wird generiert" in cover flow). */
  ariaLabel?: string;
}) {
  return (
    <div className={`assistant-pl-root ${className}`.trim()} role="status" aria-label={ariaLabel}>
      <div className="assistant-pl-wrapper">
        {Array.from({ length: PARTICLE_COUNT }, (_, i) => {
          const angle = (i / PARTICLE_COUNT) * 720;
          const delay = i * (LAP_DURATION_S / PARTICLE_COUNT);
          return (
            <span
              key={i}
              className="assistant-pl-particle"
              aria-hidden
              style={{
                transform: `rotate(${angle}deg) translate3d(${RADIUS_PX}px, 0, 0)`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
