/**
 * Deterministic assist when no LLM is wired (keeps flows usable).
 * Location: src/modules/creative-gym/infrastructure/providers/stub-creative-assist-port.ts
 */

import type { CreativeAssistPort } from "../../domain/ports/creative-assist-port";
import type { ChallengeMutationResult, MutationInput, RescueInput, RescueOutput } from "../../domain/types";

export class StubCreativeAssistPort implements CreativeAssistPort {
  async generateChallengeMutation(input: MutationInput): Promise<ChallengeMutationResult> {
    return {
      hint: "Mutation",
      appendedInstruction: ` (${input.mutationId}) Schreib weiter, ohne zurückzugehen. Neuer Einstieg: ein konkretes Objekt im Raum.`,
    };
  }

  async generateRescuePrompt(input: RescueInput): Promise<RescueOutput> {
    const id = input.rescueVariantId;
    const hints: Record<string, string> = {
      give_nudge: "Schreibe nur den nächsten Satz — Qualität egal.",
      simplify: "Halbiere die Szene: ein Ort, zwei Figuren.",
      change_perspective: "Schreibe dieselbe Beobachtung aus einer anderen Person.",
      add_constraint: "Neue Regel: kein Adjektiv in den nächsten 5 Zeilen.",
      reduce_scope: "Nur ein Dialogwechsel — sonst nichts.",
      generate_variant: "Schreib dieselbe Idee in umgekehrter Reihenfolge.",
      switch_output_shape: "Form wechseln: Stichpunkte statt Prosa (oder umgekehrt).",
    };
    return {
      message: "Rescue",
      nudgeText: hints[id] ?? "Atme. Drei Minuten Timer, kontinuierlich schreiben.",
    };
  }
}
