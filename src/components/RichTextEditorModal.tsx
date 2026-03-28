import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from './ui/dialog';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import { mergeAttributes } from '@tiptap/core';
import { Button } from './ui/button';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Heading3,
  X,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import Underline from '@tiptap/extension-underline';
import { useDebouncedSave, type SaveStatus } from '../hooks/useDebouncedSave';

// Custom CharacterMention Node Extension to render @mentions
const CharacterMention = Mention.extend({
  name: 'characterMention',
  
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {};
          }
          return {
            'data-id': attributes.id,
          };
        },
      },
      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => {
          if (!attributes.label) {
            return {};
          }
          return {
            'data-label': attributes.label,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="character-mention"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        { 
          'data-type': 'character-mention', 
          'class': 'mention' // Use mention class for styling
        },
        HTMLAttributes
      ),
      `@${node.attrs.label || ''}`,
    ];
  },
});

interface Character {
  id: string;
  name: string;
  imageUrl?: string;
  role?: string;
}

interface RichTextEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: any; // Can be JSON or string
  onChange: (value: any) => void; // Passes JSON
  title: string;
  characters: Character[];
  lastModified?: {
    timestamp: string; // ISO timestamp
    userName?: string; // Username who last modified
  };
}

export function RichTextEditorModal({
  isOpen,
  onClose,
  value,
  onChange,
  title,
  characters,
  lastModified
}: RichTextEditorModalProps) {
  // CRITICAL: Store latest suggestion props for stable reference in button callbacks
  const latestPropsRef = useRef<any>(null);
  
  // Local state for live timestamp updates
  const [localLastModified, setLocalLastModified] = useState(lastModified);
  const [updateCounter, setUpdateCounter] = useState(0);
  
  // Use refs to avoid stale closures in editor callbacks
  const onChangeRef = useRef(onChange);
  const charactersRef = useRef(characters);
  const lastModifiedRef = useRef(lastModified);
  
  useEffect(() => {
    onChangeRef.current = onChange;
    charactersRef.current = characters;
  }, [onChange, characters]);
  
  // Track if modal was previously open to detect open transitions
  const wasOpenRef = useRef(false);
  
  // Update local timestamp ONLY when modal FIRST opens (not on every prop change while open)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      // Modal just opened - initialize from prop
      lastModifiedRef.current = lastModified;
      setLocalLastModified(lastModified);
      setUpdateCounter(0); // Reset counter
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, lastModified]);
  
  // Listen for content changes and update timestamp
  useEffect(() => {
    const handleContentChange = () => {
      const now = new Date().toISOString();
      console.log('[RichTextEditorModal] 🕐 Updating timestamp to NOW:', now);
      setLocalLastModified({
        timestamp: now,
        userName: lastModifiedRef.current?.userName
      });
      setUpdateCounter(c => c + 1); // Force re-render
    };
    
    window.addEventListener('tiptap-content-changed', handleContentChange);
    return () => window.removeEventListener('tiptap-content-changed', handleContentChange);
  }, []);
  
  const editor = useEditor(
    {
    extensions: [
      // CRITICAL: Configure StarterKit WITHOUT underline to prevent duplicate extension
      StarterKit.configure({
        underline: false, // Disable underline in StarterKit (we add it separately)
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline, // Add underline support separately
      CharacterMention.configure({
        HTMLAttributes: { class: 'mention' },
        renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
        renderHTML: ({ node }) => ['span', { class: 'mention' }, `@${node.attrs.label ?? node.attrs.id}`],
        suggestion: {
          char: '@',
          startOfLine: false,
          allowSpaces: false,
          
          items: ({ query }: { query: string }) => {
            return charactersRef.current
              .filter(char => 
                char.name.toLowerCase().startsWith(query.toLowerCase())
              )
              .slice(0, 12)
              .map(char => ({ 
                id: char.id, 
                label: char.name,
                imageUrl: char.imageUrl,
                role: char.role
              }));
          },
          
          // CRITICAL: Always allow - no gates blocking instant @
          allow: () => true,
          
          // CRITICAL: Custom command to insert characterMention nodes with normal space
          // We use normal space instead of NBSP so the next @ triggers correctly
          command: ({ editor, range, props }: any) => {
            console.log('[RichTextEditorModal] 💉 Inserting character mention:', { id: props.id, label: props.label });
            console.log('[RichTextEditorModal] 💉 Range TO REPLACE:', { from: range.from, to: range.to });
            
            // CRITICAL: Use insertContentAt with EXPLICIT range to replace @ + query
            editor
              .chain()
              .focus()
              .insertContentAt(
                { from: range.from, to: range.to }, // Replace the entire range
                [
                  {
                    type: 'characterMention',
                    attrs: {
                      id: props.id,
                      label: props.label,
                    },
                  },
                  {
                    type: 'text',
                    text: ' ', // Normal space - allows next @ to trigger
                  },
                ]
              )
              .run();
            
            console.log('[RichTextEditorModal] ✅ Character mention inserted');
          },
          
          render: () => {
            let component: HTMLDivElement;
            let popup: HTMLDivElement;

            return {
              onStart: (props: any) => {
                console.log('[RichTextEditorModal] 🎯 Character picker onStart', { 
                  itemsCount: props.items?.length
                });
                
                // Store props for button callbacks
                latestPropsRef.current = props;
                
                popup = document.createElement('div');
                popup.style.position = 'absolute';
                popup.style.zIndex = '999999';
                
                component = document.createElement('div');
                component.className = 'bg-popover border border-border rounded-lg shadow-lg overflow-hidden character-picker';
                component.style.minWidth = '280px';
                component.style.maxWidth = '350px';

                // Header
                const header = document.createElement('div');
                header.className = 'flex items-center justify-between px-3 py-2 border-b border-border bg-purple-50/50 dark:bg-purple-900/10';
                header.innerHTML = `
                  <div class="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400">
                    <svg class="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    <span class="font-semibold">Characters</span>
                  </div>
                `;
                component.appendChild(header);

                // Search Bar
                const searchBar = document.createElement('div');
                searchBar.className = 'p-2 border-b border-border';
                searchBar.innerHTML = `
                  <div class="relative">
                    <svg class="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <input 
                      type="text" 
                      placeholder="Tippe weiter um zu filtern..." 
                      class="pl-8 h-8 text-sm w-full border border-input bg-muted/50 rounded-md px-3 py-2 cursor-not-allowed"
                      readonly
                      value="${props.query || ''}"
                    />
                  </div>
                `;
                component.appendChild(searchBar);

                // List container
                const listContainer = document.createElement('div');
                listContainer.className = 'max-h-[280px] overflow-y-auto p-1';

                if (props.items.length === 0) {
                  listContainer.innerHTML = '<div class="text-xs text-muted-foreground text-center py-6">Kein Charakter gefunden</div>';
                } else {
                  props.items.forEach((item: any, index: number) => {
                    const button = document.createElement('button');
                    button.className = cn(
                      'w-full text-left px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md flex items-center gap-2 transition-colors',
                      index === props.selectedIndex && 'bg-purple-50 dark:bg-purple-900/20'
                    );
                    button.style.pointerEvents = 'auto';
                    button.style.cursor = 'pointer';
                    button.setAttribute('type', 'button');
                    
                    // Avatar
                    const avatar = document.createElement('div');
                    avatar.className = 'size-8 shrink-0 rounded-full overflow-hidden bg-blue-100 dark:bg-blue-900 flex items-center justify-center';
                    if (item.imageUrl) {
                      avatar.innerHTML = `<img src="${item.imageUrl}" alt="${item.label}" class="w-full h-full object-cover" />`;
                    } else {
                      avatar.innerHTML = `<span class="text-xs text-blue-600 dark:text-blue-400 font-semibold">${item.label[0]}</span>`;
                    }
                    button.appendChild(avatar);

                    // Text content
                    const textDiv = document.createElement('div');
                    textDiv.className = 'flex-1 min-w-0';
                    textDiv.innerHTML = `
                      <p class="text-sm font-bold truncate text-[#1D4ED8]">@${item.label}</p>
                      ${item.role ? `<p class="text-xs text-muted-foreground truncate">${item.role}</p>` : ''}
                    `;
                    button.appendChild(textDiv);

                    // CRITICAL: onMouseDown preventDefault to prevent blur/focus flicker
                    button.addEventListener('mousedown', (e) => {
                      e.preventDefault();
                    });

                    button.addEventListener('click', (e) => {
                      console.log('[RichTextEditorModal] 🎯 BUTTON CLICKED!', item.label);
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Use the LATEST props from ref (not closure)
                      const currentProps = latestPropsRef.current;
                      if (currentProps?.command) {
                        console.log('[RichTextEditorModal] 🎯 Executing command with item:', item.label);
                        currentProps.command({ id: item.id, label: item.label });
                      } else {
                        console.error('[RichTextEditorModal] ❌ No command available in props!');
                      }
                    });

                    listContainer.appendChild(button);
                  });
                }

                component.appendChild(listContainer);
                popup.appendChild(component);
                popup.style.pointerEvents = 'auto';
                popup.style.zIndex = '9999';
                
                // Append directly INSIDE DialogContent
                const dialogContent = document.querySelector('[role="dialog"]');
                if (dialogContent) {
                  dialogContent.appendChild(popup);
                  console.log('[RichTextEditorModal] 🎯 Popup appended to: DIALOG CONTENT (inside)');
                } else {
                  document.body.appendChild(popup);
                  console.log('[RichTextEditorModal] ⚠️ Popup appended to: BODY (fallback)');
                }

                if (!props.clientRect) {
                  return;
                }

                const rect = props.clientRect();
                
                // Calculate position relative to dialog if appended to dialog
                if (dialogContent) {
                  const dialogRect = dialogContent.getBoundingClientRect();
                  popup.style.top = `${rect.bottom - dialogRect.top + 4}px`;
                  popup.style.left = `${rect.left - dialogRect.left}px`;
                } else {
                  popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
                  popup.style.left = `${rect.left + window.scrollX}px`;
                }
              },

              onUpdate(props: any) {
                if (!component || !popup) return;
                
                // Update props ref
                latestPropsRef.current = props;

                // Update list
                const listContainer = component.querySelector('.max-h-\\[280px\\]');
                if (!listContainer) return;

                listContainer.innerHTML = '';

                if (props.items.length === 0) {
                  listContainer.innerHTML = '<div class="text-xs text-muted-foreground text-center py-6">Kein Charakter gefunden</div>';
                } else {
                  props.items.forEach((item: any, index: number) => {
                    const button = document.createElement('button');
                    button.className = cn(
                      'w-full text-left px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md flex items-center gap-2 transition-colors',
                      index === props.selectedIndex && 'bg-purple-50 dark:bg-purple-900/20'
                    );
                    button.style.pointerEvents = 'auto';
                    button.style.cursor = 'pointer';
                    button.setAttribute('type', 'button');
                    
                    const avatar = document.createElement('div');
                    avatar.className = 'size-8 shrink-0 rounded-full overflow-hidden bg-blue-100 dark:bg-blue-900 flex items-center justify-center';
                    if (item.imageUrl) {
                      avatar.innerHTML = `<img src="${item.imageUrl}" alt="${item.label}" class="w-full h-full object-cover" />`;
                    } else {
                      avatar.innerHTML = `<span class="text-xs text-blue-600 dark:text-blue-400 font-semibold">${item.label[0]}</span>`;
                    }
                    button.appendChild(avatar);

                    const textDiv = document.createElement('div');
                    textDiv.className = 'flex-1 min-w-0';
                    textDiv.innerHTML = `
                      <p class="text-sm font-bold truncate text-[#1D4ED8]">@${item.label}</p>
                      ${item.role ? `<p class="text-xs text-muted-foreground truncate">${item.role}</p>` : ''}
                    `;
                    button.appendChild(textDiv);

                    // CRITICAL: onMouseDown preventDefault
                    button.addEventListener('mousedown', (e) => {
                      e.preventDefault();
                    });

                    button.addEventListener('click', (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Use the LATEST props from ref
                      const currentProps = latestPropsRef.current;
                      if (currentProps?.command) {
                        currentProps.command({ id: item.id, label: item.label });
                      }
                    });

                    listContainer.appendChild(button);
                  });
                }

                if (!props.clientRect) {
                  return;
                }

                const rect = props.clientRect();
                
                // Calculate position relative to dialog
                const dialogContent = document.querySelector('[role="dialog"]');
                if (dialogContent) {
                  const dialogRect = dialogContent.getBoundingClientRect();
                  popup.style.top = `${rect.bottom - dialogRect.top + 4}px`;
                  popup.style.left = `${rect.left - dialogRect.left}px`;
                } else {
                  popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
                  popup.style.left = `${rect.left + window.scrollX}px`;
                }
              },

              onKeyDown(props: any) {
                if (!props.event) return false;
                
                // CRITICAL: Only handle keys if popup is visible with items
                const hasItems = props.items && props.items.length > 0;
                
                if (props.event.key === 'Escape') {
                  popup?.remove();
                  return true;
                }
                
                // Only intercept navigation/selection keys if dropdown has items
                if (!hasItems) {
                  return false;
                }
                
                if (props.event.key === 'ArrowUp') {
                  props.selectPrevious?.();
                  return true;
                }

                if (props.event.key === 'ArrowDown') {
                  props.selectNext?.();
                  return true;
                }

                if (props.event.key === 'Enter') {
                  const selected = props.items?.[props.selectedIndex];
                  if (selected) {
                    props.command({ id: selected.id, label: selected.label });
                  }
                  return true;
                }

                return false;
              },

              onExit() {
                console.log('[RichTextEditorModal] 🎯 Popup onExit - removing popup');
                popup?.remove();
              },
            };
          },
        },
      }),
    ],
    // CRITICAL: Accept JSON content
    content: typeof value === 'object' ? value : { type: 'doc', content: [{ type: 'paragraph' }] },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      // CRITICAL: Save as JSON, not HTML
      const json = editor.getJSON();
      console.log('[RichTextEditorModal] 💾 Saving JSON:', json);
      onChangeRef.current(json);
      
      // CRITICAL: Trigger timestamp update via DOM event
      // We use a custom event because setState in this callback has stale closure
      window.dispatchEvent(new CustomEvent('tiptap-content-changed'));
    },
  }
  // No dependencies - editor is created once and reused
);

  // Update editor content when value changes externally
  useEffect(() => {
    if (!editor) return;
    
    // Parse value to JSON if it's a string
    let contentToSet = value;
    if (typeof value === 'string') {
      try {
        contentToSet = JSON.parse(value);
      } catch {
        // If parsing fails, treat as empty document
        contentToSet = { type: 'doc', content: [{ type: 'paragraph' }] };
      }
    }
    
    // Only update if content is different
    const currentJSON = JSON.stringify(editor.getJSON());
    const newJSON = JSON.stringify(contentToSet);
    
    if (currentJSON !== newJSON) {
      console.log('[RichTextEditorModal] 📥 Loading JSON content:', contentToSet);
      editor.commands.setContent(contentToSet, false);
    }
  }, [editor, value]);

  const handleClose = () => {
    // Clean up any character picker popups
    document.querySelectorAll('.character-picker').forEach(el => el.closest('div[style*="position: absolute"]')?.remove());
    console.log('[RichTextEditorModal] 🧹 Cleaned up character pickers on close');
    
    // Auto-save happens through onChange
    onClose();
  };

  const charCount = editor?.storage.characterCount?.characters() ?? editor?.getText().length ?? 0;

  if (!editor) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="w-[95vw] max-w-[56rem] max-h-[75vh] flex flex-col p-0 gap-0 border-2 border-yellow-400 dark:border-yellow-600 md:w-[75vw]"
      >
        {/* Custom styles for mentions */}
        <style>{`
          [data-slot="dialog-content"] > [data-slot="dialog-close"] {
            display: none !important;
          }
          
          .tiptap .mention {
            color: #6E59A5;
            background: color-mix(in oklab, #6E59A5 15%, transparent);
            border-radius: 6px;
            padding: 0 3px;
            font-weight: 600;
          }
          
          .dark .tiptap .mention {
            color: #9B8ACE;
            background: color-mix(in oklab, #9B8ACE 20%, transparent);
          }
        `}</style>
        
        {/* Hidden description for accessibility */}
        <DialogDescription className="sr-only">
          Rich text editor with character mention support. Type @ to mention characters.
        </DialogDescription>

        {/* Header with Title */}
        <DialogHeader className="px-6 py-4 border-b border-yellow-400 dark:border-yellow-600 flex-shrink-0">
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/50 flex-shrink-0 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              'h-8 w-8 p-0',
              editor.isActive('bold') && 'bg-muted'
            )}
            type="button"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              'h-8 w-8 p-0',
              editor.isActive('italic') && 'bg-muted'
            )}
            type="button"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={cn(
              'h-8 w-8 p-0',
              editor.isActive('underline') && 'bg-muted'
            )}
            type="button"
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-border mx-1" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn(
              'h-8 w-8 p-0',
              editor.isActive('heading', { level: 1 }) && 'bg-muted'
            )}
            type="button"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(
              'h-8 w-8 p-0',
              editor.isActive('heading', { level: 2 }) && 'bg-muted'
            )}
            type="button"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={cn(
              'h-8 w-8 p-0',
              editor.isActive('heading', { level: 3 }) && 'bg-muted'
            )}
            type="button"
          >
            <Heading3 className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-border mx-1" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn(
              'h-8 w-8 p-0',
              editor.isActive('bulletList') && 'bg-muted'
            )}
            type="button"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn(
              'h-8 w-8 p-0',
              editor.isActive('orderedList') && 'bg-muted'
            )}
            type="button"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto">
          <EditorContent editor={editor} />
        </div>

        {/* Footer with character count and last modified */}
        <div className="px-6 py-3 border-t border-border bg-muted/50 flex items-center justify-between flex-shrink-0 gap-4">
          <p className="text-xs text-muted-foreground">
            Tipp: Tippe <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs">@</kbd> um Charaktere zu erwähnen
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {localLastModified && (() => {
              const formatted = new Date(localLastModified.timestamp).toLocaleString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              console.log('[RichTextEditorModal] 🎨 Rendering timestamp (counter:', updateCounter, '):', localLastModified.timestamp, '→', formatted);
              return (
                <div className="flex items-center gap-1.5">
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 6v6l4 2"></path>
                  </svg>
                  <span>
                    {formatted}
                    {localLastModified.userName && ` • ${localLastModified.userName}`}
                  </span>
                </div>
              );
            })()}
            <span>
              {charCount} Zeichen
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
