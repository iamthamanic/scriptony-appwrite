import { cn } from "./ui/utils";

/**
 * 📖 TIMELINE TEXT PREVIEW
 * Shows 3 sentences with current word highlighted (Karaoke/Teleprompter style)
 */

interface TimelineTextPreviewProps {
  wordsArray: string[];
  currentWordIndex: number;
  currentSceneTitle?: string;
}

export function TimelineTextPreview({
  wordsArray,
  currentWordIndex,
  currentSceneTitle,
}: TimelineTextPreviewProps) {
  if (wordsArray.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Kein Text verfügbar</p>
      </div>
    );
  }

  // Split text into sentences
  const text = wordsArray.join(" ");
  const sentences: string[] = [];
  let currentSentence = "";

  for (let i = 0; i < wordsArray.length; i++) {
    currentSentence += wordsArray[i] + " ";

    // Check if this word ends with sentence terminator
    if (wordsArray[i].match(/[.!?]$/)) {
      sentences.push(currentSentence.trim());
      currentSentence = "";
    }
  }

  // Add remaining words as final sentence
  if (currentSentence.trim()) {
    sentences.push(currentSentence.trim());
  }

  // Find which sentence contains current word
  let wordsSoFar = 0;
  let currentSentenceIndex = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentenceWords = sentences[i]
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    if (wordsSoFar + sentenceWords > currentWordIndex) {
      currentSentenceIndex = i;
      break;
    }
    wordsSoFar += sentenceWords;
  }

  // Show current sentence + 1 before + 1 after (= 3 sentences)
  const startSentence = Math.max(0, currentSentenceIndex - 1);
  const endSentence = Math.min(sentences.length, currentSentenceIndex + 2);
  const displaySentences = sentences.slice(startSentence, endSentence);
  const displayText = displaySentences.join(" ");
  const displayWords = displayText
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  // Calculate word offset (how many words before display text)
  let wordsBeforeDisplay = 0;
  for (let i = 0; i < startSentence; i++) {
    wordsBeforeDisplay += sentences[i]
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
  }

  const highlightIndex = currentWordIndex - wordsBeforeDisplay;

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6 px-6">
      <div className="text-lg leading-relaxed max-w-2xl text-center">
        {displayWords.map((word, index) => (
          <span
            key={index}
            className={cn(
              "transition-all duration-150",
              index === highlightIndex
                ? "text-primary font-bold"
                : "text-foreground",
            )}
          >
            {word}{" "}
          </span>
        ))}
      </div>
      <div className="text-sm text-muted-foreground">
        Wort {currentWordIndex + 1} von {wordsArray.length}
        {currentSceneTitle && (
          <span className="ml-2 text-muted-foreground/70">
            • {currentSceneTitle}
          </span>
        )}
      </div>
    </div>
  );
}
