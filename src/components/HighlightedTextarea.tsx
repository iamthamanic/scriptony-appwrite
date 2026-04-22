import { forwardRef, useRef, useEffect, useImperativeHandle } from "react";
import { cn } from "./ui/utils";
import { Textarea } from "./ui/textarea";

interface HighlightedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value?: string;
  highlightPattern?: RegExp;
  highlightClassName?: string;
}

/**
 * HighlightedTextarea - Textarea with @-mention syntax highlighting
 * Uses backdrop technique: Normal text uses same color as regular textarea, @mentions are highlighted
 */
export const HighlightedTextarea = forwardRef<
  HTMLTextAreaElement,
  HighlightedTextareaProps
>((props, ref) => {
  const {
    value = "",
    highlightPattern = /@\\w+/g,
    highlightClassName = "text-[#60A5FA] font-bold",
    className,
    onChange,
    onScroll,
    ...restProps
  } = props;

  const backdropRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Expose textarea ref to parent
  useImperativeHandle(ref, () => textareaRef.current!);

  // Sync scroll between textarea and backdrop
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (backdropRef.current && textareaRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    onScroll?.(e);
  };

  // Render highlighted text in backdrop
  const renderHighlightedText = () => {
    if (!value) return null;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    const text = String(value);
    const matches = Array.from(text.matchAll(highlightPattern));

    matches.forEach((match, matchIdx) => {
      const matchStart = match.index!;
      const matchEnd = matchStart + match[0].length;

      // Add normal text before match - inherits color from parent
      if (matchStart > lastIndex) {
        const normalText = text.slice(lastIndex, matchStart);
        parts.push(<span key={`normal-${matchIdx}`}>{normalText}</span>);
      }

      // Add highlighted @mention
      parts.push(
        <span key={`highlight-${matchIdx}`} className={highlightClassName}>
          {match[0]}
        </span>,
      );

      lastIndex = matchEnd;
    });

    // Add remaining normal text - inherits color from parent
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      parts.push(<span key="normal-end">{remainingText}</span>);
    }

    return parts;
  };

  return (
    <div className="relative w-full">
      {/* Actual textarea - text is transparent, provides background and border */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onScroll={handleScroll}
        className={cn(
          "relative",
          "text-transparent caret-gray-900 dark:caret-gray-100",
          "[&::selection]:bg-blue-500/30",
          className,
        )}
        style={{
          caretColor: "inherit", // Make cursor visible
        }}
        {...restProps}
      />

      {/* Backdrop with syntax highlighting - POSITIONED ON TOP with higher z-index */}
      <div
        ref={backdropRef}
        className={cn(
          "absolute inset-0 pointer-events-none overflow-hidden z-10",
          "whitespace-pre-wrap break-words",
          "p-2 text-[13px] leading-[1.5]",
          "text-[#0A0A0A] dark:text-[#EDE9FE]", // Explicit hex colors for maximum contrast
        )}
        aria-hidden="true"
      >
        {renderHighlightedText()}
      </div>
    </div>
  );
});

HighlightedTextarea.displayName = "HighlightedTextarea";
