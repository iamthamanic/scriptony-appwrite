import { useEffect, useState } from "react";
import {
  getActs,
  getAllSequencesByProject,
  getAllScenesByProject,
} from "../lib/api/timeline-api";
import { getAllShotsByProject } from "../lib/api/shots-api";
import { useAuth } from "../hooks/useAuth";
import type { TimelineData } from "./FilmDropdown";

/**
 * 🎬 NATIVE SCREENPLAY VIEW
 *
 * Zeigt Film/Serien-Projekte im professionellen Drehbuchformat nach Industrie-Standard:
 * - Courier 12pt (industry standard)
 * - Scene Headings (INT./EXT. LOCATION - DAY/NIGHT)
 * - Action descriptions (full width)
 * - Character names (centered, uppercase)
 * - Dialogue (centered, narrower)
 * - Parentheticals (centered, in parentheses)
 * - Page numbers top right
 *
 * Standards basierend auf:
 * - Final Draft formatting
 * - Fountain markup spec
 * - Hollywood screenplay standards
 * - WGA (Writers Guild of America) format
 */

interface NativeScreenplayViewProps {
  projectId: string;
  projectType?: string;
  initialData?: TimelineData;
}

interface Scene {
  id: string;
  title: string;
  description?: string;
  location?: string;
  timeOfDay?: string;
  intExt?: string;
  shots: Shot[];
}

interface Shot {
  id: string;
  description: string;
  shotNumber?: string;
  dialogue?: string;
  character?: string;
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
        text += "\n";
      }
    }
  }

  return text;
};

export function NativeScreenplayView({
  projectId,
  projectType,
  initialData,
}: NativeScreenplayViewProps) {
  const { getAccessToken } = useAuth();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectTitle, setProjectTitle] = useState("");
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    loadScreenplayData();
  }, [projectId]);

  const loadScreenplayData = async () => {
    try {
      setLoading(true);

      const token = await getAccessToken();
      if (!token) {
        console.error("[NativeScreenplayView] No access token");
        return;
      }

      // Load Acts
      const loadedActs = await getActs(projectId, token);

      // Load all sequences, scenes and shots in parallel
      const [allSequences, allScenes, allShots] = await Promise.all([
        getAllSequencesByProject(projectId, token).catch(() => []),
        getAllScenesByProject(projectId, token).catch(() => []),
        getAllShotsByProject(projectId, token).catch(() => []),
      ]);

      // Build scenes structure
      const scenesData: Scene[] = [];

      allScenes?.forEach((scene) => {
        const sceneShots =
          allShots?.filter((shot) => {
            const shotSceneId = (shot as any).sceneId || (shot as any).scene_id;
            return shotSceneId === scene.id;
          }) || [];

        const shots: Shot[] = sceneShots.map((shot) => {
          let description = shot.description || "";
          let dialogue = "";
          let character = "";

          // 🎯 Parse dialogue from TipTap JSON if needed
          if (shot.metadata?.dialogue) {
            try {
              const dialogueData =
                typeof shot.metadata.dialogue === "string"
                  ? JSON.parse(shot.metadata.dialogue)
                  : shot.metadata.dialogue;
              dialogue = extractTextFromTiptap(dialogueData).trim();
            } catch (e) {
              dialogue =
                typeof shot.metadata.dialogue === "string"
                  ? shot.metadata.dialogue
                  : "";
            }
          }

          // 🎯 Parse character name
          if (shot.metadata?.character) {
            character =
              typeof shot.metadata.character === "string"
                ? shot.metadata.character
                : "";
          }

          // 🎯 Parse description from TipTap JSON if needed
          if (shot.description) {
            try {
              const descData =
                typeof shot.description === "string"
                  ? JSON.parse(shot.description)
                  : shot.description;
              description = extractTextFromTiptap(descData).trim();
            } catch (e) {
              description =
                typeof shot.description === "string" ? shot.description : "";
            }
          }

          // 🎯 Fallback: Try content field for dialogue
          if (!dialogue && shot.metadata?.content) {
            try {
              const contentData =
                typeof shot.metadata.content === "string"
                  ? JSON.parse(shot.metadata.content)
                  : shot.metadata.content;
              dialogue = extractTextFromTiptap(contentData).trim();
            } catch (e) {
              dialogue =
                typeof shot.metadata.content === "string"
                  ? shot.metadata.content
                  : "";
            }
          }

          return {
            id: shot.id,
            description,
            shotNumber: (shot as any).shotNumber || (shot as any).shot_number,
            dialogue,
            character,
          };
        });

        // Extract metadata
        const metadata = scene.metadata || {};

        scenesData.push({
          id: scene.id,
          title: scene.title,
          description: scene.description || "",
          location: metadata.location || "",
          timeOfDay: metadata.timeOfDay || "DAY",
          intExt: metadata.intExt || "INT.",
          shots,
        });
      });

      setScenes(scenesData);

      // Rough page count estimate (1 page ≈ 1 minute ≈ ~8 elements)
      const totalElements = scenesData.reduce(
        (sum, s) => sum + s.shots.length + 1,
        0,
      );
      setPageCount(Math.ceil(totalElements / 8));
    } catch (error) {
      console.error("[NativeScreenplayView] Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-muted-foreground">Lade Drehbuchformat...</div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-full">
      {/* Page Container - Standard screenplay page size (8.5" x 11") */}
      <div className="max-w-[8.5in] mx-auto px-[1.5in] py-[1in] bg-white">
        {/* 
          🎬 SCREENPLAY FORMATTING STANDARDS:
          - Font: Courier 12pt (monospace, industry standard)
          - Margins: 1.5" left, 1" right, 1" top/bottom
          - Scene Heading: All caps, left aligned
          - Action: Full width, single spaced
          - Character: 3.7" from left, all caps
          - Dialogue: 2.5" from left, 3.5" wide
          - Parenthetical: 3.1" from left, italic
          - Transition: Right aligned, all caps
          - Page Numbers: Top right
          
          1 page = approximately 1 minute of screen time
        */}
        <style>{`
          .native-screenplay-content {
            font-family: 'Courier Prime', 'Courier New', monospace;
            font-size: 12pt;
            line-height: 1;
            color: #000;
          }
          
          .screenplay-scene-heading {
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 2em;
            margin-bottom: 1em;
          }
          
          .screenplay-action {
            margin-bottom: 1em;
            white-space: pre-wrap;
          }
          
          .screenplay-character {
            text-align: center;
            margin-left: 2.2in;
            margin-right: auto;
            width: 4in;
            text-transform: uppercase;
            margin-top: 1em;
            margin-bottom: 0;
          }
          
          .screenplay-parenthetical {
            text-align: center;
            margin-left: 1.7in;
            margin-right: auto;
            width: 5in;
            font-style: italic;
            margin-bottom: 0;
          }
          
          .screenplay-dialogue {
            text-align: left;
            margin-left: 1.5in;
            margin-right: auto;
            width: 3.5in;
            margin-bottom: 1em;
            white-space: pre-wrap;
          }
          
          .screenplay-transition {
            text-align: right;
            text-transform: uppercase;
            margin-top: 1em;
            margin-bottom: 1em;
          }
          
          .screenplay-shot {
            margin-bottom: 1.5em;
          }
          
          .screenplay-page-number {
            text-align: right;
            font-size: 10pt;
            margin-bottom: 1em;
            color: #666;
          }
          
          @media print {
            .screenplay-scene-heading {
              page-break-after: avoid;
            }
          }
        `}</style>

        <div className="native-screenplay-content">
          {scenes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-4">Noch keine Szenen vorhanden.</p>
              <p className="text-sm">
                Erstelle Akte, Sequenzen, Szenen und Shots im Dropdown-View,
              </p>
              <p className="text-sm">
                um sie hier im professionellen Drehbuchformat zu sehen.
              </p>
            </div>
          ) : (
            scenes.map((scene, sceneIndex) => (
              <div key={scene.id} className="screenplay-scene">
                {/* Scene Heading (Slug Line) */}
                <div className="screenplay-scene-heading">
                  {scene.intExt || "INT."}{" "}
                  {scene.location || scene.title.toUpperCase()} -{" "}
                  {scene.timeOfDay || "DAY"}
                </div>

                {/* Scene Description (Action) */}
                {scene.description && (
                  <div className="screenplay-action">{scene.description}</div>
                )}

                {/* Shots (Action/Dialogue blocks) */}
                {scene.shots.map((shot, shotIndex) => (
                  <div key={shot.id} className="screenplay-shot">
                    {/* Shot Description as Action */}
                    {shot.description && (
                      <div className="screenplay-action">
                        {shot.description}
                      </div>
                    )}

                    {/* Dialogue Block */}
                    {shot.character && shot.dialogue && (
                      <>
                        <div className="screenplay-character">
                          {shot.character.toUpperCase()}
                        </div>
                        <div className="screenplay-dialogue">
                          {shot.dialogue}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info Panel */}
      <div className="fixed bottom-4 right-4 bg-white border border-border rounded-lg p-3 shadow-lg text-xs max-w-xs">
        <div className="font-medium mb-1">🎬 Drehbuch-Standard</div>
        <ul className="text-muted-foreground space-y-0.5 text-[10px]">
          <li>• Courier 12pt (Industry Standard)</li>
          <li>• Scene Headings: INT./EXT.</li>
          <li>• Character Names: Zentriert, GROSSBUCHSTABEN</li>
          <li>• Dialog: Eingerückt, 3.5" breit</li>
          <li>• Action: Volle Breite</li>
          <li>• ~1 Seite = 1 Minute Screentime</li>
          <li className="mt-2 pt-2 border-t">Geschätzte Seiten: {pageCount}</li>
        </ul>
      </div>
    </div>
  );
}
