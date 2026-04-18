import { useEffect, useState, useCallback } from "react";
import {
  getActs,
  getAllSequencesByProject,
  getAllScenesByProject,
  updateScene,
} from "../lib/api/timeline-api";
import { useAuth } from "../hooks/useAuth";
import type { TimelineData } from "./FilmDropdown";
import { EditableParagraph } from "./EditableParagraph";
import { toast } from "sonner@2.0.3";
import scriptonyLogo from "../assets/scriptony-logo.png";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * 📖 NATIVE BOOK VIEW
 *
 * Zeigt das Buch-Projekt im professionellen Buchformat nach Industrie-Standard:
 * - Times New Roman / Serif Font
 * - Seitenlayout mit Seitenzahlen
 * - Kapiteltitel formatiert und zentriert
 * - 1.5 Zeilenabstand für Lesbarkeit
 * - Absätze mit Einzug
 * - Seitenumbrüche bei Kapiteln
 *
 * Two View Modes:
 * - SIDES: Editable manuscript view with all chapters
 * - BOOK: Paginated reader view with page-by-page navigation
 *
 * Standards basierend auf:
 * - Manuscript formatting guidelines (William Shunn standard)
 * - Traditional book publishing format
 */

type ViewMode = "sides" | "book";

interface NativeBookViewProps {
  projectId: string;
  projectType?: string;
  initialData?: TimelineData;
}

interface Chapter {
  id: string;
  title: string;
  sections: Section[];
}

interface Section {
  id: string;
  title: string;
  content: string;
  paragraphs: string[]; // 🎯 Split content into paragraphs for individual editing
}

// Helper to extract text from TipTap JSON
const extractTextFromTiptap = (node: any): string => {
  let text = "";

  if (node.text) {
    text += node.text;
  }

  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      text += extractTextFromTiptap(child);
      // Add paragraph breaks
      if (child.type === "paragraph") {
        text += "\n\n";
      }
    }
  }

  return text;
};

export function NativeBookView({
  projectId,
  projectType,
  initialData,
}: NativeBookViewProps) {
  const { getAccessToken } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookTitle, setBookTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("sides");
  const [currentPage, setCurrentPage] = useState(1);
  const [pages, setPages] = useState<string[][]>([]);

  useEffect(() => {
    loadBookData();
  }, [projectId]);

  const loadBookData = async () => {
    try {
      setLoading(true);

      const token = await getAccessToken();
      if (!token) {
        console.error("[NativeBookView] No auth token");
        return;
      }

      // Load Acts
      const loadedActs = await getActs(projectId, token);

      // Load all sequences and scenes in parallel
      const [allSequences, allScenes] = await Promise.all([
        getAllSequencesByProject(projectId, token).catch(() => []),
        getAllScenesByProject(projectId, token).catch(() => []),
      ]);

      // Build chapters structure
      // For books: Act = Act, Sequence = Chapter, Scene = Section
      const chaptersData: Chapter[] = [];

      loadedActs?.forEach((act) => {
        const actChapters =
          allSequences?.filter((seq) => seq.actId === act.id) || [];

        actChapters.forEach((chapter) => {
          const chapterSections =
            allScenes?.filter((scene) => scene.sequenceId === chapter.id) || [];

          const sections: Section[] = chapterSections.map((section) => {
            const content =
              section.content ||
              section.metadata?.content ||
              section.description ||
              "";

            // Extract text from TipTap JSON if needed
            let textContent: string;
            try {
              const contentObj =
                typeof content === "string" ? JSON.parse(content) : content;
              textContent = extractTextFromTiptap(contentObj);
            } catch (e) {
              textContent = typeof content === "string" ? content : "";
            }

            // Split into paragraphs
            const paragraphs = textContent
              .split(/\n\n+/)
              .filter((p) => p.trim());

            // 🎯 If no paragraphs, add one empty paragraph for editing
            if (paragraphs.length === 0) {
              paragraphs.push("");
            }

            return {
              id: section.id,
              title: section.title,
              content: textContent,
              paragraphs,
            };
          });

          chaptersData.push({
            id: chapter.id,
            title: chapter.title ?? "",
            sections,
          });
        });
      });

      setChapters(chaptersData);
    } catch (error) {
      console.error("[NativeBookView] Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // 💾 Save paragraph changes
  const handleParagraphSave = useCallback(
    async (sectionId: string, paragraphIndex: number, newContent: string) => {
      try {
        setSaving(true);

        // Find the section and update the paragraph
        const updatedChapters = chapters.map((chapter) => ({
          ...chapter,
          sections: chapter.sections.map((section) => {
            if (section.id === sectionId) {
              const newParagraphs = [...section.paragraphs];
              newParagraphs[paragraphIndex] = newContent;

              // Join paragraphs back into full content
              const fullContent = newParagraphs.join("\n\n");

              return {
                ...section,
                paragraphs: newParagraphs,
                content: fullContent,
              };
            }
            return section;
          }),
        }));

        setChapters(updatedChapters);

        // Find the updated section to save to API
        const updatedSection = updatedChapters
          .flatMap((c) => c.sections)
          .find((s) => s.id === sectionId);

        if (updatedSection) {
          const token = await getAccessToken();
          if (!token) {
            toast.error("Nicht authentifiziert");
            return;
          }

          // 📊 CALCULATE WORD COUNT from content
          let wordCount = 0;
          try {
            const parsed =
              typeof updatedSection.content === "string"
                ? JSON.parse(updatedSection.content)
                : updatedSection.content;
            const textContent = extractTextFromTiptap(parsed);
            wordCount = textContent.trim()
              ? textContent
                  .trim()
                  .split(/\s+/)
                  .filter((w) => w.length > 0).length
              : 0;
            console.log(
              `[NativeBookView] 💾 Saving section with ${wordCount} words`,
            );
          } catch (e) {
            console.warn(
              "[NativeBookView] Could not parse content for word count:",
              e,
            );
          }

          // Save to API with word count
          await updateScene(
            sectionId,
            { content: updatedSection.content, wordCount },
            token,
          );
          toast.success("Gespeichert", { duration: 1000 });
        }
      } catch (error) {
        console.error("[NativeBookView] Save error:", error);
        toast.error("Fehler beim Speichern");
      } finally {
        setSaving(false);
      }
    },
    [chapters, getAccessToken],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-muted-foreground">Lade Buchformat...</div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-full relative">
      {/* 📝 Header: Written in Scriptony + Tabs */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-border px-4 md:px-[1in] py-3">
        <div className="max-w-[8.5in] mx-auto">
          <div className="flex items-center justify-center mb-3 relative">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="italic">written in Scriptony</span>
              <img
                src={scriptonyLogo}
                alt="Scriptony"
                className="h-5 md:h-6 w-auto object-contain"
              />
            </div>

            {saving && (
              <div className="absolute right-0 text-xs text-primary animate-pulse">
                Speichert...
              </div>
            )}
          </div>

          {/* View Mode Tabs */}
          <div className="flex gap-1 md:gap-2 border-b border-border">
            <button
              onClick={() => setViewMode("sides")}
              className={`px-3 md:px-4 py-2 text-xs md:text-sm transition-colors relative ${
                viewMode === "sides"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sites
              {viewMode === "sides" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setViewMode("book")}
              className={`px-3 md:px-4 py-2 text-xs md:text-sm transition-colors relative ${
                viewMode === "book"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Book
              {viewMode === "book" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Page Container - Standard book page size simulation */}
      <div className="max-w-[8.5in] mx-auto px-4 md:px-[1in] py-6 md:py-[1in] bg-white">
        {/* 
          📖 BOOK FORMATTING STANDARDS:
          - Font: Serif (Times New Roman / Georgia)
          - Size: 12pt for body, 14-16pt for chapter titles
          - Line Height: 1.5-2.0 (double-spaced for manuscripts)
          - Margins: 1 inch all sides
          - Chapter starts: New page with title centered
          - Paragraphs: First line indent (0.5in) OR block style with spacing
          - Page numbers: Top right or bottom center
        */}
        <style>{`
          .native-book-content {
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.8;
            color: #000;
          }
          
          @media (min-width: 768px) {
            .native-book-content {
              font-size: 12pt;
            }
          }
          
          .native-book-chapter {
            page-break-before: always;
            margin-bottom: 2em;
          }
          
          .native-book-chapter-title {
            text-align: center;
            font-size: 14pt;
            font-weight: normal;
            margin-bottom: 1.5em;
            margin-top: 2em;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          
          @media (min-width: 768px) {
            .native-book-chapter-title {
              font-size: 16pt;
              margin-bottom: 2em;
              margin-top: 3em;
            }
          }
          
          .native-book-section {
            margin-bottom: 1.5em;
            position: relative;
            padding-left: 0.5rem;
          }
          
          @media (min-width: 768px) {
            .native-book-section {
              padding-left: 1.5rem;
            }
          }
          
          .native-book-section-title {
            font-size: 13pt;
            font-weight: normal;
            margin-bottom: 1em;
            font-style: italic;
          }
          
          @media (min-width: 768px) {
            .native-book-section-title {
              font-size: 14pt;
            }
          }
          
          .native-book-paragraph {
            text-indent: 0.3in;
            margin-bottom: 0;
            text-align: justify;
            cursor: pointer;
            transition: background-color 0.2s;
            padding: 0.25rem;
            margin-left: -0.25rem;
            border-radius: 4px;
          }
          
          @media (min-width: 768px) {
            .native-book-paragraph {
              text-indent: 0.5in;
            }
          }
          
          .native-book-paragraph:hover {
            background-color: rgba(110, 89, 165, 0.05);
          }
          
          .native-book-paragraph.first-paragraph {
            text-indent: 0;
          }
          
          .native-book-paragraph .ProseMirror {
            outline: none;
          }
          
          .native-book-paragraph .ProseMirror p {
            margin: 0;
            text-indent: inherit;
            text-align: inherit;
          }
          
          @media print {
            .native-book-chapter {
              page-break-before: always;
            }
            .native-book-section {
              padding-left: 0;
            }
          }
        `}</style>

        <div className="native-book-content">
          {/* Title Page would go here */}

          {chapters.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-4">Noch keine Kapitel vorhanden.</p>
              <p className="text-sm">
                Erstelle Akte, Kapitel und Abschnitte im Dropdown-View,
              </p>
              <p className="text-sm">
                um sie hier im professionellen Buchformat zu sehen.
              </p>
            </div>
          ) : viewMode === "sides" ? (
            // 📄 SIDES VIEW: Editable manuscript view with all chapters
            chapters.map((chapter, chapterIndex) => (
              <div key={chapter.id} className="native-book-chapter">
                {/* Chapter Title */}
                <h2 className="native-book-chapter-title">
                  Kapitel {chapterIndex + 1}
                  <br />
                  {chapter.title}
                </h2>

                {/* Sections */}
                {chapter.sections.map((section) => (
                  <div key={section.id} className="native-book-section">
                    {/* Section Title (optional - can be removed for cleaner look) */}
                    {section.title && section.title !== "Untitled Section" && (
                      <h3 className="native-book-section-title">
                        {section.title}
                      </h3>
                    )}

                    {/* Editable Paragraphs */}
                    {section.paragraphs.map((paragraph, idx) => (
                      <EditableParagraph
                        key={`${section.id}-${idx}`}
                        content={paragraph}
                        onSave={(newContent) =>
                          handleParagraphSave(section.id, idx, newContent)
                        }
                        isFirstParagraph={idx === 0}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ))
          ) : (
            // 📖 BOOK VIEW: Paginated reader view
            <BookReaderView
              chapters={chapters}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// 📖 Book Reader View Component with Pagination
interface BookReaderViewProps {
  chapters: Chapter[];
  currentPage: number;
  onPageChange: (page: number) => void;
}

function BookReaderView({
  chapters,
  currentPage,
  onPageChange,
}: BookReaderViewProps) {
  // Split content into pages (approximate ~500 words per page)
  const allParagraphs: {
    chapterIndex: number;
    chapterTitle: string;
    content: string;
  }[] = [];

  chapters.forEach((chapter, chapterIndex) => {
    // Add chapter title as first "paragraph"
    allParagraphs.push({
      chapterIndex,
      chapterTitle: chapter.title,
      content: `__CHAPTER_TITLE__${chapterIndex}__${chapter.title}`,
    });

    // Add all section paragraphs
    chapter.sections.forEach((section) => {
      section.paragraphs.forEach((paragraph) => {
        if (paragraph.trim()) {
          allParagraphs.push({
            chapterIndex,
            chapterTitle: chapter.title,
            content: paragraph,
          });
        }
      });
    });
  });

  // Simple pagination: ~6-8 paragraphs per page
  const paragraphsPerPage = 8;
  const totalPages = Math.max(
    1,
    Math.ceil(allParagraphs.length / paragraphsPerPage),
  );
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startIdx = (safePage - 1) * paragraphsPerPage;
  const endIdx = Math.min(startIdx + paragraphsPerPage, allParagraphs.length);
  const pageParagraphs = allParagraphs.slice(startIdx, endIdx);

  return (
    <div className="relative min-h-[700px]">
      {/* Page Content */}
      <div className="space-y-4">
        {pageParagraphs.map((item, idx) => {
          // Check if it's a chapter title
          if (item.content.startsWith("__CHAPTER_TITLE__")) {
            const parts = item.content.split("__");
            const chapterNum = parseInt(parts[2]) + 1;
            const title = parts[3];

            return (
              <div
                key={`chapter-${startIdx + idx}`}
                className="text-center my-12"
              >
                <h2 className="native-book-chapter-title">
                  Kapitel {chapterNum}
                  <br />
                  {title}
                </h2>
              </div>
            );
          }

          // Regular paragraph
          return (
            <p
              key={`para-${startIdx + idx}`}
              className={`native-book-paragraph ${idx === 0 && !item.content.startsWith("__CHAPTER") ? "" : ""}`}
              style={{ cursor: "default" }}
            >
              {item.content}
            </p>
          );
        })}
      </div>

      {/* Page Navigation */}
      <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 md:gap-4 bg-white/95 backdrop-blur-sm border border-border rounded-full px-4 md:px-6 py-2 md:py-3 shadow-lg z-50">
        <button
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="p-1.5 md:p-2 rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
        </button>

        <div className="text-xs md:text-sm min-w-[80px] md:min-w-[100px] text-center">
          Seite {safePage} / {totalPages}
        </div>

        <button
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className="p-1.5 md:p-2 rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>
    </div>
  );
}
