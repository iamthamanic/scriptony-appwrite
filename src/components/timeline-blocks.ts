/**
 * 🎬 TIMELINE BLOCK CALCULATIONS
 * Extracted from VideoEditorTimeline for better performance
 */

const DEFAULT_EMPTY_ACT_MIN = 5;

interface TimelineData {
  acts?: any[];
  sequences?: any[];
  scenes?: any[];
}

interface BlockResult {
  startSec: number;
  endSec: number;
  x: number;
  width: number;
  visible: boolean;
  [key: string]: any;
}

/**
 * Calculate word count from Tiptap JSON content
 */
export function calculateWordCountFromContent(content: any): number {
  if (!content) return 0;

  let text = "";

  const extractText = (node: any) => {
    if (node.type === "text") {
      text += node.text + " ";
    }
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(extractText);
    }
  };

  try {
    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    extractText(parsed);
    const words = text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    return words.length;
  } catch (error) {
    return 0;
  }
}

/**
 * Calculate act blocks for timeline
 */
export function calculateActBlocks(
  timelineData: TimelineData | null,
  duration: number,
  viewStartSec: number,
  viewEndSec: number,
  pxPerSec: number,
  isBookProject: boolean,
  readingSpeedWpm?: number,
): BlockResult[] {
  if (!timelineData?.acts) return [];

  return timelineData.acts.map((act, actIndex) => {
    if (isBookProject && readingSpeedWpm) {
      // 📖 BOOK: Position based on cumulative duration
      const acts = timelineData.acts || [];
      const sequences = timelineData.sequences || [];
      const scenes = timelineData.scenes || [];

      // 🚀 CALCULATE: Act word count from scenes
      const getActWordCount = (actId: string): number => {
        const actSequences = sequences.filter((s) => s.actId === actId);
        const actScenes = scenes.filter((sc) =>
          actSequences.some((seq) => seq.id === sc.sequenceId),
        );

        return actScenes.reduce((sum, sc) => {
          const dbWordCount = sc.metadata?.wordCount || sc.wordCount || 0;
          if (dbWordCount > 0) return sum + dbWordCount;
          return sum + calculateWordCountFromContent(sc.content);
        }, 0);
      };

      // Calculate start time (cumulative duration of all previous acts)
      let startSec = 0;
      for (let i = 0; i < actIndex; i++) {
        const prevAct = acts[i];
        const prevActWordCount = getActWordCount(prevAct.id);

        if (prevActWordCount > 0) {
          startSec += (prevActWordCount / readingSpeedWpm) * 60;
        } else {
          startSec += DEFAULT_EMPTY_ACT_MIN * 60;
        }
      }

      // Calculate this act's duration
      const actWordCount = getActWordCount(act.id);
      const actDuration =
        actWordCount > 0
          ? (actWordCount / readingSpeedWpm) * 60
          : DEFAULT_EMPTY_ACT_MIN * 60;

      const endSec = startSec + actDuration;
      const x = (startSec - viewStartSec) * pxPerSec;
      const width = (endSec - startSec) * pxPerSec;

      return {
        ...act,
        wordCount: actWordCount,
        startSec,
        endSec,
        x,
        width,
        visible: endSec >= viewStartSec && startSec <= viewEndSec,
      };
    } else {
      // 🎬 FILM: Use manual trim pct if present; otherwise equal distribution.
      const totalActs = timelineData.acts?.length || 1;
      const actDurationFallback = duration / totalActs;

      const meta = (act as any).metadata ?? {};
      const pctFrom =
        typeof meta?.pct_from === "number" ? meta.pct_from : undefined;
      const pctTo = typeof meta?.pct_to === "number" ? meta.pct_to : undefined;

      const startSec =
        pctFrom !== undefined
          ? (pctFrom / 100) * duration
          : actIndex * actDurationFallback;
      const endSec =
        pctTo !== undefined
          ? (pctTo / 100) * duration
          : (actIndex + 1) * actDurationFallback;

      const x = (startSec - viewStartSec) * pxPerSec;
      const width = (endSec - startSec) * pxPerSec;

      return {
        ...act,
        startSec,
        endSec,
        x,
        width,
        // Film: immer rendern (Zoom/Trim-Griffe zuverlässig); Book: Viewport-Culling
        visible: true,
      };
    }
  });
}

/**
 * Calculate sequence blocks for timeline
 */
export function calculateSequenceBlocks(
  timelineData: TimelineData | null,
  duration: number,
  viewStartSec: number,
  viewEndSec: number,
  pxPerSec: number,
  isBookProject: boolean,
  totalWords?: number,
  readingSpeedWpm?: number,
): BlockResult[] {
  if (!timelineData) return [];

  const sequenceBlocks: BlockResult[] = [];

  if (isBookProject && totalWords && readingSpeedWpm) {
    // 📖 BOOK: Position based on ACTUAL word count from scenes
    const acts = timelineData.acts || [];
    const sequences = timelineData.sequences || [];
    const scenes = timelineData.scenes || [];
    const secondsPerWord = 60 / readingSpeedWpm;

    const getSequenceWordCount = (sequenceId: string): number => {
      const seqScenes = scenes.filter((sc) => sc.sequenceId === sequenceId);
      return seqScenes.reduce((sum, sc) => {
        const dbWordCount = sc.metadata?.wordCount || sc.wordCount || 0;
        if (dbWordCount > 0) return sum + dbWordCount;
        return sum + calculateWordCountFromContent(sc.content);
      }, 0);
    };

    let wordsSoFar = 0;

    acts.forEach((act) => {
      const actSequences = sequences.filter((s) => s.actId === act.id);

      actSequences.forEach((sequence) => {
        const seqWords = getSequenceWordCount(sequence.id);

        if (seqWords > 0) {
          const startSec = wordsSoFar * secondsPerWord;
          const endSec = (wordsSoFar + seqWords) * secondsPerWord;
          const x = (startSec - viewStartSec) * pxPerSec;
          const width = (endSec - startSec) * pxPerSec;

          sequenceBlocks.push({
            ...sequence,
            wordCount: seqWords,
            startSec,
            endSec,
            x,
            width,
            visible: endSec >= viewStartSec && startSec <= viewEndSec,
          });

          wordsSoFar += seqWords;
        }
      });

      // Add empty act padding
      const actSequenceWords = actSequences.reduce(
        (sum, seq) => sum + getSequenceWordCount(seq.id),
        0,
      );
      if (actSequenceWords === 0) {
        wordsSoFar += (DEFAULT_EMPTY_ACT_MIN * 60) / secondsPerWord;
      }
    });
  } else {
    // 🎬 FILM: Use manual trim pct if present; otherwise equal distribution.
    (timelineData.acts || []).forEach((act, actIndex) => {
      const sequences = (timelineData.sequences || []).filter(
        (s) => s.actId === act.id,
      );

      const totalActs = timelineData.acts?.length || 1;
      const actDurationFallback = duration / totalActs;
      const actMeta = (act as any).metadata ?? {};
      const actPctFrom =
        typeof actMeta?.pct_from === "number" ? actMeta.pct_from : undefined;
      const actPctTo =
        typeof actMeta?.pct_to === "number" ? actMeta.pct_to : undefined;

      const actStartSec =
        actPctFrom !== undefined
          ? (actPctFrom / 100) * duration
          : actIndex * actDurationFallback;
      const actEndSec =
        actPctTo !== undefined
          ? (actPctTo / 100) * duration
          : (actIndex + 1) * actDurationFallback;

      const actDurSec = Math.max(0, actEndSec - actStartSec);
      const sequenceDurationFallback =
        sequences.length > 0 ? actDurSec / sequences.length : actDurSec;

      sequences.forEach((sequence, seqIndex) => {
        const seqMeta = (sequence as any).metadata ?? {};
        const seqPctFrom =
          typeof seqMeta?.pct_from === "number" ? seqMeta.pct_from : undefined;
        const seqPctTo =
          typeof seqMeta?.pct_to === "number" ? seqMeta.pct_to : undefined;

        const startSec =
          seqPctFrom !== undefined
            ? actStartSec + (seqPctFrom / 100) * actDurSec
            : actStartSec + seqIndex * sequenceDurationFallback;
        const endSec =
          seqPctTo !== undefined
            ? actStartSec + (seqPctTo / 100) * actDurSec
            : startSec + sequenceDurationFallback;
        const x = (startSec - viewStartSec) * pxPerSec;
        const width = (endSec - startSec) * pxPerSec;

        sequenceBlocks.push({
          ...sequence,
          startSec,
          endSec,
          x,
          width,
          visible: true,
        });
      });
    });
  }

  return sequenceBlocks;
}

/**
 * Calculate scene blocks for timeline
 */
export function calculateSceneBlocks(
  timelineData: TimelineData | null,
  duration: number,
  viewStartSec: number,
  viewEndSec: number,
  pxPerSec: number,
  isBookProject: boolean,
  readingSpeedWpm?: number,
): BlockResult[] {
  if (!timelineData) return [];

  const sceneBlocks: BlockResult[] = [];

  if (isBookProject && readingSpeedWpm) {
    // 📖 BOOK: Position based on word count from content
    const scenes = timelineData.scenes || [];
    const sequences = timelineData.sequences || [];
    const acts = timelineData.acts || [];
    const secondsPerWord = 60 / readingSpeedWpm;

    let wordsSoFar = 0;

    acts.forEach((act) => {
      const actSequences = sequences.filter((s) => s.actId === act.id);

      actSequences.forEach((sequence) => {
        const seqScenes = scenes.filter((sc) => sc.sequenceId === sequence.id);

        seqScenes.forEach((scene) => {
          const dbWordCount = scene.metadata?.wordCount || scene.wordCount || 0;
          const sceneWords =
            dbWordCount > 0
              ? dbWordCount
              : calculateWordCountFromContent(scene.content);

          if (sceneWords > 0) {
            const startSec = wordsSoFar * secondsPerWord;
            const endSec = (wordsSoFar + sceneWords) * secondsPerWord;
            const x = (startSec - viewStartSec) * pxPerSec;
            const width = (endSec - startSec) * pxPerSec;

            sceneBlocks.push({
              ...scene,
              wordCount: sceneWords,
              startSec,
              endSec,
              x,
              width,
              visible: endSec >= viewStartSec && startSec <= viewEndSec,
            });

            wordsSoFar += sceneWords;
          }
        });
      });

      // Add empty act padding
      const actScenes = scenes.filter((sc) =>
        actSequences.some((seq) => seq.id === sc.sequenceId),
      );
      const actSceneWords = actScenes.reduce((sum, sc) => {
        const dbWordCount = sc.metadata?.wordCount || sc.wordCount || 0;
        return (
          sum +
          (dbWordCount > 0
            ? dbWordCount
            : calculateWordCountFromContent(sc.content))
        );
      }, 0);

      if (actSceneWords === 0) {
        wordsSoFar += (DEFAULT_EMPTY_ACT_MIN * 60) / secondsPerWord;
      }
    });
  } else {
    // 🎬 FILM: Use manual trim pct if present; otherwise equal distribution.
    (timelineData.acts || []).forEach((act, actIndex) => {
      const sequences = (timelineData.sequences || []).filter(
        (s) => s.actId === act.id,
      );

      const totalActs = timelineData.acts?.length || 1;
      const actDurationFallback = duration / totalActs;
      const actMeta = (act as any).metadata ?? {};
      const actPctFrom =
        typeof actMeta?.pct_from === "number" ? actMeta.pct_from : undefined;
      const actPctTo =
        typeof actMeta?.pct_to === "number" ? actMeta.pct_to : undefined;

      const actStartSec =
        actPctFrom !== undefined
          ? (actPctFrom / 100) * duration
          : actIndex * actDurationFallback;
      const actEndSec =
        actPctTo !== undefined
          ? (actPctTo / 100) * duration
          : (actIndex + 1) * actDurationFallback;

      const actDurSec = Math.max(0, actEndSec - actStartSec);
      const sequenceDurationFallback =
        sequences.length > 0 ? actDurSec / sequences.length : actDurSec;

      sequences.forEach((sequence, seqIndex) => {
        const scenes = (timelineData.scenes || []).filter(
          (sc) => sc.sequenceId === sequence.id,
        );

        const seqMeta = (sequence as any).metadata ?? {};
        const seqPctFrom =
          typeof seqMeta?.pct_from === "number" ? seqMeta.pct_from : undefined;
        const seqPctTo =
          typeof seqMeta?.pct_to === "number" ? seqMeta.pct_to : undefined;

        const seqStartSec =
          seqPctFrom !== undefined
            ? actStartSec + (seqPctFrom / 100) * actDurSec
            : actStartSec + seqIndex * sequenceDurationFallback;
        const seqEndSec =
          seqPctTo !== undefined
            ? actStartSec + (seqPctTo / 100) * actDurSec
            : seqStartSec + sequenceDurationFallback;

        const seqDurSec = Math.max(0, seqEndSec - seqStartSec);
        const sceneDurationFallback =
          scenes.length > 0 ? seqDurSec / scenes.length : seqDurSec;

        scenes.forEach((scene, sceneIndex) => {
          const sceneMeta = (scene as any).metadata ?? {};
          const scenePctFrom =
            typeof sceneMeta?.pct_from === "number"
              ? sceneMeta.pct_from
              : undefined;
          const scenePctTo =
            typeof sceneMeta?.pct_to === "number"
              ? sceneMeta.pct_to
              : undefined;

          const startSec =
            scenePctFrom !== undefined
              ? seqStartSec + (scenePctFrom / 100) * seqDurSec
              : seqStartSec + sceneIndex * sceneDurationFallback;
          const endSec =
            scenePctTo !== undefined
              ? seqStartSec + (scenePctTo / 100) * seqDurSec
              : startSec + sceneDurationFallback;
          const x = (startSec - viewStartSec) * pxPerSec;
          const width = (endSec - startSec) * pxPerSec;

          sceneBlocks.push({
            ...scene,
            startSec,
            endSec,
            x,
            width,
            visible: true,
          });
        });
      });
    });
  }

  return sceneBlocks;
}
