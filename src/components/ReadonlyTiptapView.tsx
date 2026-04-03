import { useEffect, useMemo } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import { mergeAttributes } from '@tiptap/core';

// Character Mention Extension (same as RichTextEditorModal)
const CharacterMention = Mention.extend({
  name: 'characterMention',
  
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => {
          if (!attributes.id) return {};
          return { 'data-id': attributes.id };
        },
      },
      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => {
          if (!attributes.label) return {};
          return { 'data-label': attributes.label };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="character-mention"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        { 
          'data-type': 'character-mention', 
          'class': 'mention'
        },
        HTMLAttributes
      ),
      `@${node.attrs.label || ''}`,
    ];
  },
});

interface ReadonlyTiptapViewProps {
  content: any; // JSON doc or string
  className?: string;
  /** Optional max height for the preview area (scroll inside if content overflows). */
  maxHeight?: string;
}

/**
 * Read-only TipTap Editor for displaying rich text with character mentions
 * Shows beautiful blue character pills (@name) in readonly mode
 */
export function ReadonlyTiptapView({
  content,
  className = '',
  maxHeight,
}: ReadonlyTiptapViewProps) {
  // Parse content if it's a string
  const doc = useMemo(() => {
    if (!content) return { type: 'doc', content: [{ type: 'paragraph' }] };
    
    if (typeof content === 'string') {
      try {
        return JSON.parse(content);
      } catch {
        // Fallback for plain text
        return { 
          type: 'doc', 
          content: [{ type: 'paragraph', content: [{ type: 'text', text: content }] }] 
        };
      }
    }
    
    return content;
  }, [content]);

  // Create read-only editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      CharacterMention.configure({
        HTMLAttributes: { class: 'mention' },
        renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
      }),
    ],
    content: doc,
    editable: false,
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none ${className}`,
      },
    },
  });

  // Update content when it changes
  useEffect(() => {
    if (editor && doc) {
      editor.commands.setContent(doc);
    }
  }, [editor, doc]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  if (!editor) {
    return <div className={`text-xs text-muted-foreground ${className}`}>Loading...</div>;
  }

  const inner = <EditorContent editor={editor} className={className} />;
  if (maxHeight) {
    return (
      <div className="overflow-y-auto" style={{ maxHeight }}>
        {inner}
      </div>
    );
  }
  return inner;
}
