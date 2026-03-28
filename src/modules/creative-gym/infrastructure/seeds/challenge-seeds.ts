/**
 * Seed catalog: 24+ challenges (unblock / explore / craft / finisher).
 * Shared renderer builder keeps DRY across media.
 * Location: src/modules/creative-gym/infrastructure/seeds/challenge-seeds.ts
 */

import type {
  ChallengeTemplate,
  CreativeMedium,
  Difficulty,
  MediumChallengeRenderer,
  OutputType,
  ProblemType,
  SessionMode,
  SkillFocus,
} from "../../domain/types";

const R = [
  "Arbeite in einem einzigen Durchgang; keine Perfektion.",
  "Timer respektieren; Qualität entsteht durch Wiederholung, nicht durch Editieren.",
];

const S = ["Mindestens eine neue Passage ist sichtbar.", "Du hast das Medium respektiert."];

function mr(
  medium: CreativeMedium,
  instruction: string,
  outputHint: string
): MediumChallengeRenderer {
  return {
    medium,
    instruction,
    rules: R,
    successCriteria: S,
    suggestedOutputFormat: outputHint,
  };
}

function four(
  p: string,
  sc: string,
  ad: string,
  fv: string
): NonNullable<ChallengeTemplate["renderers"]> {
  return {
    prose: mr("prose", p, "Fließtext, Absätze"),
    screenplay: mr("screenplay", sc, "Scene-Slug + Action/Dialog"),
    audio_drama: mr("audio_drama", ad, "Szene mit Klängen/Klammern"),
    film_visual: mr("film_visual", fv, "Shot-Liste oder Blocking-Notizen"),
  };
}

const mut = (id: string, label: string, description: string) => ({ id, label, description });
const res = (id: string, label: string, promptHint: string) => ({ id, label, promptHint });

function ch(
  id: string,
  slug: string,
  title: string,
  description: string,
  problemTypes: ProblemType[],
  skillFocus: SkillFocus[],
  defaultIntent: ChallengeTemplate["defaultIntent"],
  defaultSessionMode: SessionMode,
  recommendedDurationMin: number,
  difficulty: Difficulty,
  outputType: OutputType,
  tags: string[],
  category: ChallengeTemplate["challengeCategory"],
  renderers: NonNullable<ChallengeTemplate["renderers"]>
): ChallengeTemplate {
  return {
    id,
    slug,
    title,
    description,
    problemTypes,
    skillFocus,
    supportedMedia: ["prose", "screenplay", "audio_drama", "film_visual"],
    defaultIntent,
    defaultSessionMode,
    recommendedDurationMin,
    difficulty,
    inputPolicy: {
      allowBlank: true,
      allowProjectContext: true,
      allowImportedText: true,
      allowPriorSessionOutput: true,
    },
    outputType,
    tags,
    tiers: ["core"],
    renderers,
    mutations: [
      mut(`${id}-m1`, "Variante A", "Gleiche Aufgabe, anderer Einstieg."),
      mut(`${id}-m2`, "Variante B", "Fokus auf Konflikt verschärfen."),
    ],
    rescueVariants: [
      res(`${id}-r1`, "Kürzer denken", "Halbiere die Szene mental."),
      res(`${id}-r2`, "Nur Dialog", "Schreibe nur gesprochene Zeilen."),
    ],
    challengeCategory: category,
  };
}

export const CHALLENGE_SEEDS: ChallengeTemplate[] = [
  ch(
    "cg-ub-01",
    "cold-open-sprint",
    "Cold-Open Sprint",
    "Starte mitten im Konflikt — kein Setup, keine Erklärung.",
    ["starting_block", "dead_scene"],
    ["conflict", "scene_flow"],
    "unblock",
    "breakthrough",
    12,
    "focused",
    "fragment",
    ["intent:unblock", "boss:false"],
    "unblocker",
    four(
      "Schreibe 12–20 Sätze, die sofort im Problem landen.",
      "INT. ORT — TAG\n\nBeginne mit der stärksten Spannung.",
      "[Szene]\n\nÖffne mit Geräusch + erstem Satz.",
      "3–5 Shots: Hook → Störung → Reaktion."
    )
  ),
  ch(
    "cg-ub-02",
    "tiny-promise",
    "Tiny Promise",
    "Ein Versprechen in einer Zeile; der Rest zeigt Bruch oder Erfüllung.",
    ["flat_idea", "generic_output"],
    ["originality", "structure"],
    "unblock",
    "exploration",
    10,
    "easy",
    "fragment",
    ["intent:unblock"],
    "unblocker",
    four(
      "Satz 1 = Versprechen; Absatz 2–3 liefern Folge.",
      "ACTION: Eine Zeile Versprechen. Dann Szene.",
      "[Studio]\n\nVersprechen → erste Reaktion.",
      "Shot 1: Objekt/Versprechen. Shot 2: Konsequenz."
    )
  ),
  ch(
    "cg-ub-03",
    "antagonist-voice",
    "Antagonist Voice",
    "Schreibe nur in der Stimme des Widerstands.",
    ["no_voice", "weak_conflict"],
    ["perspective", "dialogue_tension"],
    "unblock",
    "craft",
    15,
    "focused",
    "dialogue_piece",
    ["intent:unblock"],
    "unblocker",
    four(
      "Monolog oder Brief aus Sicht des Gegners.",
      "Szene: nur der Antagonist spricht/handelt sichtbar.",
      "Szene: Antagonist als Sprecher/Kommentar.",
      "Storyboard: Antagonist-Perspektive der Shots."
    )
  ),
  ch(
    "cg-ub-04",
    "constraint-ladder",
    "Constraint Ladder",
    "Jede Minute eine neue Einschränkung dazunehmen.",
    ["too_many_options", "structure_gap"],
    ["compression", "structure"],
    "unblock",
    "craft",
    18,
    "brutal",
    "fragment",
    ["intent:unblock"],
    "unblocker",
    four(
      "Absatz 1 frei, dann: nur Sätze mit max. 8 Wörtern.",
      "Seite 1 normal; Seite 2 nur Ein-Satz-Blöcke.",
      "Szene: erste Minute frei, dann nur Fragen.",
      "Shots: erst normal, dann nur feste Brennweite notieren."
    )
  ),
  ch(
    "cg-ub-05",
    "emotion-first",
    "Emotion First",
    "Wähle eine Emotion; alles dient ihr.",
    ["dead_scene", "generic_output"],
    ["scene_flow", "originality"],
    "unblock",
    "warmup",
    8,
    "easy",
    "fragment",
    ["intent:unblock"],
    "unblocker",
    four(
      "Nenne die Emotion oben; schreibe nur ihre Spuren.",
      "Szene: Emotion als Regiehinweis in jeder Zeile.",
      "[Emotion]\n\nSound → Stimme → Stille.",
      "Shotliste: Emotion pro Shot als ein Wort."
    )
  ),
  ch(
    "cg-ub-06",
    "timer-rewrite",
    "Timer Rewrite",
    "Nimm einen Satz und zerlege ihn in 5 Varianten.",
    ["starting_block", "finishing_problem"],
    ["compression", "finishing"],
    "unblock",
    "craft",
    14,
    "focused",
    "fragment",
    ["intent:unblock"],
    "unblocker",
    four(
      "Ein Satz → fünf Neuformulierungen mit unterschiedlicher Wirkung.",
      "Eine Dialogzeile → fünf subtext-lastige Versionen.",
      "Ein Satz → fünf Mikro-Szenen à 1 Zeile.",
      "Ein Beat → fünf visuelle Umsetzungen."
    )
  ),
  ch(
    "cg-ex-01",
    "what-if-matrix",
    "What-If Matrix",
    "Drei Was-wäre-wenn; eines wird ausgeschrieben.",
    ["flat_idea", "too_many_options"],
    ["originality", "structure"],
    "explore",
    "exploration",
    20,
    "easy",
    "idea_seed",
    ["intent:explore"],
    "explorer",
    four(
      "Liste 3 What-ifs; entwickle das stärkste in 200 Wörtern.",
      "3 Loglines; eine als Mini-Outline.",
      "3 Setting-What-ifs; eines als Hörspiel-Szene.",
      "3 visuelle What-ifs; eines als Shot-Folge."
    )
  ),
  ch(
    "cg-ex-02",
    "genre-friction",
    "Genre Friction",
    "Mische zwei Genres in einer Szene.",
    ["generic_output", "weak_conflict"],
    ["originality", "media_translation"],
    "explore",
    "exploration",
    16,
    "focused",
    "scene",
    ["intent:explore"],
    "explorer",
    four(
      "Kurzgeschichte: zwei Genre-Tropes kollidieren.",
      "Szene mit Genre-A/B in Slug/Format.",
      "Genre-Klang in Bühne + Stimme.",
      "Genre A Look / Genre B Rhythmus in Shots."
    )
  ),
  ch(
    "cg-ex-03",
    "object-obsession",
    "Object Obsession",
    "Ein Objekt steuert Handlung und Ton.",
    ["dead_scene", "flat_idea"],
    ["perspective", "scene_flow"],
    "explore",
    "exploration",
    14,
    "easy",
    "fragment",
    ["intent:explore"],
    "explorer",
    four(
      "Wähle Objekt; jeder Absatz berührt es.",
      "Szene: Objekt im Slug; Action kreist darum.",
      "Objekt als Sound-Motiv.",
      "Objekt als zentraler Shot; Variationen."
    )
  ),
  ch(
    "cg-ex-04",
    "secret-agenda",
    "Secret Agenda",
    "Jede Figur hat ein Geheimziel — nur subtext.",
    ["weak_conflict", "dialogue_tension"],
    ["conflict", "dialogue_tension"],
    "explore",
    "breakthrough",
    18,
    "focused",
    "scene",
    ["intent:explore"],
    "explorer",
    four(
      "Dialog mit zwei verdeckten Zielen.",
      "Szene: nur Action/Dialog, Ziele nie genannt.",
      "Hörspiel: Subtext in Pausen/Tonlage.",
      "Shot-Plan: Subtext pro Shot notieren."
    )
  ),
  ch(
    "cg-ex-05",
    "world-bite",
    "World Bite",
    "Ein Ausschnitt Welt ohne Exposition.",
    ["structure_gap", "generic_output"],
    ["structure", "originality"],
    "explore",
    "warmup",
    10,
    "easy",
    "world_note",
    ["intent:explore"],
    "explorer",
    four(
      "200 Wörter Ort/Kultur nur über Handlung.",
      "Szene ohne Erklärung; Regeln nur durch Tun.",
      "Klangwelt in 90 Sekunden Szene.",
      "Visuelle Regeln in 4 Shots zeigen."
    )
  ),
  ch(
    "cg-ex-06",
    "parallel-cut",
    "Parallel Cut",
    "Zwei Fäden laufen; Schnittpunkt ist der Twist.",
    ["ending_problem", "structure_gap"],
    ["structure", "scene_flow"],
    "explore",
    "finisher",
    22,
    "brutal",
    "outline_node",
    ["intent:explore"],
    "explorer",
    four(
      "Zwei Kapitelchen parallel; letzter Satz fusioniert.",
      "INTERCUT: zwei Orte; letzte Zeile = Wendung.",
      "Zwei Spuren; letzter Sound = Merge.",
      "Parallel montage; midpoint twist."
    )
  ),
  ch(
    "cg-cr-01",
    "dialogue-tightening",
    "Dialogue Tightening",
    "Schneide 30 % Wörter, behalte Sinn.",
    ["dialogue_tension", "compression"],
    ["dialogue_tension", "compression"],
    "train",
    "craft",
    15,
    "focused",
    "dialogue_piece",
    ["intent:train"],
    "craft",
    four(
      "Nimm einen Dialogblock; komprimiere aggressiv.",
      "Szene: gleiche Handlung, weniger Zeilen.",
      "Hörspiel: Stille statt Füllwörter.",
      "Dialog-Zeilen → kurze Bildimpulse."
    )
  ),
  ch(
    "cg-cr-02",
    "beat-turn",
    "Beat Turn",
    "Jeder Beat endet mit einer Wendung.",
    ["scene_flow", "weak_conflict"],
    ["scene_flow", "conflict"],
    "train",
    "craft",
    16,
    "focused",
    "beat",
    ["intent:train"],
    "craft",
    four(
      "4 Absätze; Absatzende = Mini-Twist.",
      "4 Mini-Szenen; jeweils Turn vor CUT.",
      "4 Audio-Beats; Klangwendung.",
      "4 Shot-Cluster; letzter Shot = Turn."
    )
  ),
  ch(
    "cg-cr-03",
    "sensory-channel",
    "Sensory Channel",
    "Ein Sinn pro Absatz rotieren.",
    ["generic_output", "originality"],
    ["originality", "perspective"],
    "train",
    "craft",
    12,
    "easy",
    "fragment",
    ["intent:train"],
    "craft",
    four(
      "Sehen/Hören/Fühlen/Riechen rotieren.",
      "Szene: Sinn pro Action-Block.",
      "Kanal pro Replik/Stage direction.",
      "Shot: ein Sinn dominant."
    )
  ),
  ch(
    "cg-cr-04",
    "reversal-scene",
    "Reversal Scene",
    "Mitte der Szene kehrt die Macht.",
    ["conflict", "scene_flow"],
    ["conflict", "structure"],
    "train",
    "breakthrough",
    18,
    "brutal",
    "scene",
    ["intent:train"],
    "craft",
    four(
      "Szene mit klarer Machtumkehr in der Mitte.",
      "SCREENPLAY: Midpoint-Reversal markieren.",
      "Audio: Stimmbruch/Musikflip.",
      "Storyboard: Midpoint als Bildwechsel."
    )
  ),
  ch(
    "cg-cr-05",
    "subtext-only",
    "Subtext Only",
    "Kein Satz darf das Thema beim Namen nennen.",
    ["dialogue_tension", "no_voice"],
    ["dialogue_tension", "perspective"],
    "train",
    "craft",
    14,
    "focused",
    "dialogue_piece",
    ["intent:train"],
    "craft",
    four(
      "Thema verboten; nur Metaphern.",
      "Szene: Tabuwortliste oben anlegen.",
      "Hörspiel: Thema nur über Nebengeräusche.",
      "Shots: Thema nur über Bildsymbole."
    )
  ),
  ch(
    "cg-cr-06",
    "pacing-metronome",
    "Pacing Metronome",
    "Wechsel kurz/lang im Strophenschema.",
    ["scene_flow", "compression"],
    ["compression", "scene_flow"],
    "train",
    "craft",
    17,
    "focused",
    "fragment",
    ["intent:train"],
    "craft",
    four(
      "Satzlängen: kurz, kurz, lang, mittel — wiederholen.",
      "Szene: Blocklängen nach Schema.",
      "Rhythmusschema für Repliken.",
      "Shotlängen: Schema als Notation."
    )
  ),
  ch(
    "cg-fn-01",
    "landing-the-end",
    "Landing the End",
    "Schreib nur die letzten 2 Minuten der Geschichte.",
    ["ending_problem", "finishing_problem"],
    ["finishing", "structure"],
    "train",
    "finisher",
    20,
    "focused",
    "fragment",
    ["intent:train"],
    "finisher",
    four(
      "Letzte Seite: Setup für Finale + letzter Beat.",
      "Final Scene + letztes Bild.",
      "Outro-Szene mit letztem Klang.",
      "Finale Shot-Sequenz."
    )
  ),
  ch(
    "cg-fn-02",
    "payoff-weave",
    "Payoff Weave",
    "Drei Setups aus dem Draft einlösen.",
    ["structure_gap", "finishing_problem"],
    ["structure", "finishing"],
    "project_extend",
    "finisher",
    25,
    "brutal",
    "outline_node",
    ["intent:project_extend"],
    "finisher",
    four(
      "Liste 3 Payoffs; schreibe Verknüpfungsparagraph.",
      "Szene: drei Payoffs in Action.",
      "Audio: drei Motive lösen auf.",
      "Shot: drei frühere Motive zahlen aus."
    )
  ),
  ch(
    "cg-fn-03",
    "character-button",
    "Character Button",
    "Ein wiederkehrendes Verhalten bekommt Finale.",
    ["finishing_problem", "generic_output"],
    ["finishing", "originality"],
    "train",
    "finisher",
    14,
    "easy",
    "character_note",
    ["intent:train"],
    "finisher",
    four(
      "Charakter-Tick → finaler Moment.",
      "Szene: Tick sichtbar; letzter Beat schließt.",
      "Tick als Sound-Callback.",
      "Visueller Callback im letzten Shot."
    )
  ),
  ch(
    "cg-fn-04",
    "one-room-finale",
    "One Room Finale",
    "Finale in einem Raum ohne neue Infos.",
    ["ending_problem", "too_many_options"],
    ["compression", "finishing"],
    "train",
    "finisher",
    18,
    "focused",
    "scene",
    ["intent:train"],
    "finisher",
    four(
      "Claustrophobic finale: nur vorhandene Fakten.",
      "INT. EIN RAUM — kontinuierlich.",
      "Ein Ort; keine neuen Figuren.",
      "Ein Set; Kamera nur innen."
    )
  ),
  ch(
    "cg-fn-05",
    "epilogue-sting",
    "Epilogue Sting",
    "30 Sekunden Nachspann mit Stachel.",
    ["ending_problem", "weak_conflict"],
    ["conflict", "finishing"],
    "explore",
    "finisher",
    12,
    "focused",
    "fragment",
    ["intent:explore"],
    "finisher",
    four(
      "Kurzer Epilog; letztes Wort = Haken.",
      "Epilog-Szene; Sting in letzter Zeile.",
      "Kurzer Nachspann; Sound-Sting.",
      "Post-Credit Shot-Idee."
    )
  ),
  ch(
    "cg-fn-06",
    "production-handoff",
    "Production Handoff",
    "Übersetze Szene in klare Shot-/Hör-Liste.",
    ["media_translation", "finishing_problem"],
    ["media_translation", "structure"],
    "project_extend",
    "finisher",
    22,
    "brutal",
    "shot_sequence",
    ["intent:project_extend", "boss:true"],
    "finisher",
    four(
      "Prosa-Szene → nummerierte Schritte für Set.",
      "Script → Shot-Liste + Übergänge.",
      "Szene → Misch-Notizen.",
      "Shot-Liste finalisieren mit Linsen/Move."
    )
  ),
];
