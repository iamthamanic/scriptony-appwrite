import { useEffect, useState } from "react";
import {
  getActs,
  getAllSequencesByProject,
  getAllScenesByProject,
} from "../lib/api/timeline-api";
import { useAuth } from "../hooks/useAuth";
import type { TimelineData } from "./FilmDropdown";

/**
 * 🎙️ NATIVE AUDIOBOOK VIEW
 *
 * Zeigt Hörbuch-Projekte im professionellen Hörbuch-Skriptformat nach Industrie-Standard:
 * - Sprecher-Namen fett und links
 * - Dialog/Narration klar formatiert
 * - Regieanweisungen in Klammern und kursiv
 * - Sound-Effekte in GROSSBUCHSTABEN
 * - Pausen und Timing-Marker
 * - Kapitel-Marker für Audio-Schnitt
 *
 * Standards basierend auf:
 * - ACX (Audiobook Creation Exchange) guidelines
 * - Professional audiobook narration scripts
 * - Voice acting scripts
 */

interface NativeAudiobookViewProps {
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
      if (child.type === "paragraph") {
        text += "\n\n";
      }
    }
  }

  return text;
};

export function NativeAudiobookView({
  projectId,
  projectType,
  initialData,
}: NativeAudiobookViewProps) {
  const { getAccessToken } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [estimatedDuration, setEstimatedDuration] = useState(0);

  useEffect(() => {
    loadAudiobookData();
  }, [projectId]);

  const loadAudiobookData = async () => {
    try {
      setLoading(true);

      const token = await getAccessToken();
      if (!token) {
        console.error("[NativeAudiobookView] No auth token");
        return;
      }

      // Load Acts
      const loadedActs = await getActs(projectId, token);

      // Load all sequences and scenes in parallel
      const [allSequences, allScenes] = await Promise.all([
        getAllSequencesByProject(projectId, token).catch(() => []),
        getAllScenesByProject(projectId, token).catch(() => []),
      ]);

      // Build chapters structure (same as book)
      const chaptersData: Chapter[] = [];
      let totalWords = 0;

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

            let textContent: string;
            try {
              const contentObj =
                typeof content === "string" ? JSON.parse(content) : content;
              textContent = extractTextFromTiptap(contentObj);
            } catch (e) {
              textContent = typeof content === "string" ? content : "";
            }

            // Count words for duration estimate
            const words = textContent
              .trim()
              .split(/\s+/)
              .filter((w) => w.length > 0);
            totalWords += words.length;

            return {
              id: section.id,
              title: section.title,
              content: textContent,
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

      // Estimate duration: Average narration speed is ~150-160 words per minute
      // We'll use 155 as middle ground
      const durationMinutes = Math.round(totalWords / 155);
      setEstimatedDuration(durationMinutes);
    } catch (error) {
      console.error("[NativeAudiobookView] Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-muted-foreground">Lade Hörbuch-Skript...</div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-full">
      {/* Page Container */}
      <div className="max-w-[8.5in] mx-auto px-[1in] py-[1in] bg-white">
        {/* 
          🎙️ AUDIOBOOK SCRIPT FORMATTING STANDARDS:
          - Font: Clean sans-serif for readability
          - Narrator: Bold, left-aligned
          - Direction: Italic, in (parentheses)
          - Sound Effects: ALL CAPS in [brackets]
          - Pause markers: [PAUSE], [BEAT]
          - Chapter markers: Clear breaks for audio editing
          - Timing notes: For pacing guidance
          
          Professional narrators prefer:
          - Clear hierarchy
          - Easy-to-scan format
          - Pronunciation guides
          - Emotional cues
        */}
        <style>{`
          .native-audiobook-content {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #000;
          }
          
          .audiobook-chapter {
            page-break-before: always;
            margin-bottom: 3em;
          }
          
          .audiobook-chapter-marker {
            background: #f0f0f0;
            border-left: 4px solid #6E59A5;
            padding: 0.5em 1em;
            margin-bottom: 2em;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 10pt;
            letter-spacing: 0.05em;
          }
          
          .audiobook-chapter-title {
            font-size: 16pt;
            font-weight: bold;
            margin-bottom: 1.5em;
            color: #333;
          }
          
          .audiobook-narrator {
            font-weight: bold;
            color: #6E59A5;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            font-size: 10pt;
            text-transform: uppercase;
          }
          
          .audiobook-direction {
            font-style: italic;
            color: #666;
            margin-bottom: 0.5em;
          }
          
          .audiobook-text {
            margin-bottom: 1em;
            line-height: 1.8;
          }
          
          .audiobook-sound-effect {
            text-transform: uppercase;
            color: #d97706;
            font-weight: bold;
            margin: 1em 0;
          }
          
          .audiobook-pause {
            color: #999;
            font-style: italic;
            text-align: center;
            margin: 0.5em 0;
          }
          
          .audiobook-section {
            margin-bottom: 2em;
          }
          
          @media print {
            .audiobook-chapter {
              page-break-before: always;
            }
          }
        `}</style>

        <div className="native-audiobook-content">
          {chapters.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-4">Noch keine Kapitel vorhanden.</p>
              <p className="text-sm">
                Erstelle Akte, Kapitel und Abschnitte im Dropdown-View,
              </p>
              <p className="text-sm">
                um sie hier im professionellen Hörbuch-Skript zu sehen.
              </p>
            </div>
          ) : (
            chapters.map((chapter, chapterIndex) => (
              <div key={chapter.id} className="audiobook-chapter">
                {/* Chapter Marker - For audio editing/bookmarks */}
                <div className="audiobook-chapter-marker">
                  [Kapitel {chapterIndex + 1} - Audio Marker]
                </div>

                {/* Chapter Title */}
                <div className="audiobook-chapter-title">
                  Kapitel {chapterIndex + 1}: {chapter.title}
                </div>

                {/* Narrator Direction */}
                <div className="audiobook-direction">
                  (Erzähler beginnt mit ruhiger, einladender Stimme)
                </div>

                {/* Narrator Label */}
                <div className="audiobook-narrator">Erzähler:</div>

                {/* Sections */}
                {chapter.sections.map((section, sectionIndex) => (
                  <div key={section.id} className="audiobook-section">
                    {/* Section content as narration */}
                    {section.content
                      .split(/\n\n+/)
                      .filter((p) => p.trim())
                      .map((paragraph, idx) => (
                        <div key={idx}>
                          <div className="audiobook-text">
                            {paragraph.trim()}
                          </div>

                          {/* Add pause markers between paragraphs for pacing */}
                          {idx <
                            section.content
                              .split(/\n\n+/)
                              .filter((p) => p.trim()).length -
                              1 && (
                            <div className="audiobook-pause">[KURZE PAUSE]</div>
                          )}
                        </div>
                      ))}

                    {/* Section break marker */}
                    {sectionIndex < chapter.sections.length - 1 && (
                      <div
                        className="audiobook-pause"
                        style={{ marginTop: "1.5em" }}
                      >
                        [BEAT - Abschnittswechsel]
                      </div>
                    )}
                  </div>
                ))}

                {/* Chapter end marker */}
                <div className="audiobook-pause" style={{ marginTop: "2em" }}>
                  [LÄNGERE PAUSE - Ende Kapitel {chapterIndex + 1}]
                </div>
              </div>
            ))
          )}

          {/* Example sound effect notation (for reference) */}
          {chapters.length > 0 && (
            <div
              style={{
                marginTop: "3em",
                padding: "1em",
                background: "#f9fafb",
                borderRadius: "4px",
                fontSize: "10pt",
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "0.5em" }}>
                📝 Notations-Hinweise:
              </div>
              <ul style={{ marginLeft: "1em", color: "#666" }}>
                <li>[SOUND: Türknarren] - Sound-Effekt Notiz</li>
                <li>[PAUSE] - Kurze Pause (~1 Sekunde)</li>
                <li>[BEAT] - Sehr kurze Pause für Emphasis</li>
                <li>[MUSIK EINBLENDEN] - Musik-Anweisung</li>
                <li>(mit Spannung) - Emotions-Anweisung für Sprecher</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Info Panel */}
      <div className="fixed bottom-4 right-4 bg-white border border-border rounded-lg p-3 shadow-lg text-xs max-w-xs">
        <div className="font-medium mb-1">🎙️ Hörbuch-Skript Standard</div>
        <ul className="text-muted-foreground space-y-0.5 text-[10px]">
          <li>• Sprecher-Namen: GROSSBUCHSTABEN</li>
          <li>• Regieanweisungen: (kursiv)</li>
          <li>• Sound-Effekte: [BRACKETS]</li>
          <li>• Pausen-Marker für Timing</li>
          <li>• Kapitel-Marker für Audio-Schnitt</li>
          <li>• ~155 Wörter/Minute Lesetempo</li>
          <li className="mt-2 pt-2 border-t">
            Geschätzte Dauer: {formatDuration(estimatedDuration)}
          </li>
        </ul>
      </div>
    </div>
  );
}
