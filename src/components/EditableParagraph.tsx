import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cn } from "./ui/utils";

interface EditableParagraphProps {
  content: string;
  onSave: (content: string) => void;
  className?: string;
  isFirstParagraph?: boolean;
}

/**
 * 📝 EDITABLE PARAGRAPH
 *
 * Inline TipTap editor for book paragraphs
 * - Click to edit
 * - Auto-save on blur
 * - Preserves book formatting
 */
export function EditableParagraph({
  content,
  onSave,
  className,
  isFirstParagraph = false,
}: EditableParagraphProps) {
  const [isEditing, setIsEditing] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        listItem: false,
        bulletList: false,
        orderedList: false,
        // Keep only basic paragraph editing
      }),
    ],
    content: content || "<p></p>",
    editable: isEditing,
    editorProps: {
      attributes: {
        class: cn(
          "native-book-paragraph focus:outline-none",
          isFirstParagraph && "first-paragraph",
        ),
      },
    },
    onBlur: ({ editor }) => {
      const newContent = editor.getText();
      if (newContent !== content) {
        onSave(newContent);
      }
      setIsEditing(false);
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && !isEditing) {
      const currentText = editor.getText();
      if (currentText !== content) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor, isEditing]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing);
      if (isEditing) {
        // Focus at the end of content
        editor.commands.focus("end");
      }
    }
  }, [isEditing, editor]);

  // Click outside to stop editing
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        editorRef.current &&
        !editorRef.current.contains(event.target as Node)
      ) {
        setIsEditing(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing]);

  if (!editor) {
    return (
      <p className={cn("native-book-paragraph", className)}>
        {content || "\u00A0"}
      </p>
    );
  }

  return (
    <div
      ref={editorRef}
      className={cn("relative group", isEditing && "editing")}
      onClick={() => {
        if (!isEditing) {
          setIsEditing(true);
        }
      }}
      title="Klicken zum Bearbeiten"
    >
      {/* Edit indicator on hover */}
      {!isEditing && (
        <div className="absolute -left-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg
            className="w-4 h-4 text-primary/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </div>
      )}

      <EditorContent editor={editor} className={className} />

      {/* Editing indicator */}
      {isEditing && (
        <div className="absolute -left-6 top-0">
          <div className="w-1 h-full bg-primary/60 rounded-full animate-pulse" />
        </div>
      )}

      {/* Empty state hint */}
      {!isEditing && !content && (
        <div className="absolute inset-0 flex items-center text-muted-foreground/40 text-xs pointer-events-none">
          Klicken zum Schreiben...
        </div>
      )}
    </div>
  );
}
