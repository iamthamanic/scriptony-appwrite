import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { BeatColumn } from './BeatColumn';
import { BeatTimeline } from './BeatTimeline';
import { VideoEditorTimeline } from './VideoEditorTimeline';
import type { BeatCardData, TimelineNode } from './BeatCard';
import { FilmDropdown, type TimelineData } from './FilmDropdown';
import { BookDropdown, type BookTimelineData } from './BookDropdown';
import { NativeBookView } from './NativeBookView';
import { NativeScreenplayView } from './NativeScreenplayView';
import { NativeAudiobookView } from './NativeAudiobookView';
import { generateBeatsFromTemplate, LITE_7_TEMPLATE, SAVE_THE_CAT_TEMPLATE } from '../lib/beat-templates';
import { useBeats, useCreateBeat, useUpdateBeat, useDeleteBeat } from '../hooks/useBeats';
import * as TimelineAPI from '../lib/api/timeline-api';
import { toast } from 'sonner';

/**
 * 🎬 STRUCTURE & BEATS SECTION
 * 
 * Collapsible-Section für Project-Detail-Page mit:
 * - Dropdown/Timeline Toggle
 * - Beat-Rail (80px links)
 * - Container-Stack (Acts → Sequences → Scenes → Shots)
 * - Beats sind inline editierbar
 */

interface StructureBeatsSectionProps {
  projectId: string;
  projectType?: string;
  beatTemplate?: string | null;
  initialData?: TimelineData | BookTimelineData;
  onDataChange?: (data: TimelineData | BookTimelineData) => void;
  totalWords?: number;
  targetPages?: number;
  wordsPerPage?: number;
  readingSpeedWpm?: number;
  // 🚀 NEW: Loading state when parent is fetching cache
  isLoadingCache?: boolean;
}

// LITE-7 Story Beat Preset (minimales Template für schnelles Prototyping)
const MOCK_BEATS: BeatCardData[] = generateBeatsFromTemplate(LITE_7_TEMPLATE);

// 🧪 TEST: Hook bei 5% positionieren (oben sichtbar)
const TEST_BEAT_HOOK: BeatCardData = {
  ...MOCK_BEATS[0], // Hook (0-1%)
  pctFrom: 2, // Start bei 2%
  pctTo: 8,   // Ende bei 8% (6% hoch = ca. 60px bei 1000px Höhe)
};

export function StructureBeatsSection({ projectId, projectType, beatTemplate, initialData, onDataChange, totalWords, targetPages, wordsPerPage, readingSpeedWpm, isLoadingCache }: StructureBeatsSectionProps) {
  const containerStackRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(true); // DEFAULT: OPEN
  const [structureView, setStructureView] = useState<'dropdown' | 'timeline' | 'native'>('dropdown');
  
  // 🚀 REACT QUERY: Lade Beats für dieses Projekt (mit Cache!)
  const { data: beatsData, isLoading: beatsLoading } = useBeats(projectId);
  const createBeatMutation = useCreateBeat();
  const updateBeatMutation = useUpdateBeat();
  const deleteBeatMutation = useDeleteBeat();
  
  // 🎬 Initialize with Save the Cat 15 Beats
  const [beats, setBeats] = useState<BeatCardData[]>([]);
  
  const [timelineData, setTimelineData] = useState<TimelineData | null>(initialData || null);
  
  // 🔄 UPDATE: Sync timelineData when initialData changes
  useEffect(() => {
    if (initialData) {
      console.log('[StructureBeatsSection] 🔄 Updating timelineData from initialData:', initialData);
      setTimelineData(initialData);
    }
  }, [initialData]);
  
  // 📖 CALCULATE: Book timeline duration from timelineData (reactive!)
  const bookTimelineDuration = useMemo(() => {
    console.log('[StructureBeatsSection] 🔍 useMemo - Calculating duration:', {
      projectType,
      readingSpeedWpm,
      hasTimelineData: !!timelineData,
      hasActs: !!timelineData?.acts,
      hasSequences: !!timelineData?.sequences,
      hasScenes: !!timelineData?.scenes,
      scenesCount: timelineData?.scenes?.length || 0,
    });
    
    if (projectType === 'book' && readingSpeedWpm && timelineData?.acts && timelineData?.sequences && timelineData?.scenes) {
      const DEFAULT_EMPTY_ACT_SECONDS = 300; // 5 minutes = 300 seconds
      
      console.log('[StructureBeatsSection] 🧮 Calculating book timeline duration from SCENES:', {
        readingSpeedWpm,
        actsCount: timelineData.acts.length,
        sequencesCount: timelineData.sequences.length,
        scenesCount: timelineData.scenes.length,
      });
      
      const actDurations = timelineData.acts.map(act => {
        // 🔥 CALCULATE word count from sequences/scenes
        const actSequences = timelineData.sequences.filter(seq => seq.actId === act.id);
        const actScenes = timelineData.scenes.filter(scene => 
          actSequences.some(seq => seq.id === scene.sequenceId)
        );
        
        console.log(`  🔍 Act "${act.title}": Found ${actSequences.length} sequences, ${actScenes.length} scenes`);
        
        // 🚀 FIX: Calculate word count from content if wordCount is 0 or missing
        const actualWordCount = actScenes.reduce((sum, scene) => {
          const dbWordCount = scene.metadata?.wordCount || scene.wordCount || 0;
          if (dbWordCount > 0) {
            console.log(`    ✅ Scene "${scene.title}": Using DB wordCount = ${dbWordCount}`);
            return sum + dbWordCount;
          }
          
          // Calculate from content (like BookDropdown does)
          const content = scene.content as any;
          if (!content?.content || !Array.isArray(content.content)) {
            console.log(`    ⚠️ Scene "${scene.title}": No valid content structure`);
            return sum;
          }
          
          let sceneWords = 0;
          for (const node of content.content) {
            if (node.type === 'paragraph' && node.content) {
              for (const child of node.content) {
                if (child.type === 'text' && child.text) {
                  const words = child.text.trim().split(/\s+/).filter((w: string) => w.length > 0);
                  sceneWords += words.length;
                }
              }
            }
          }
          console.log(`    📝 Scene "${scene.title}": Calculated ${sceneWords} words from content`);
          return sum + sceneWords;
        }, 0);
        
        if (actualWordCount > 0) {
          const durationSec = (actualWordCount / readingSpeedWpm) * 60; // Convert minutes to seconds
          console.log(`  📊 Act "${act.title}": ${actualWordCount} words (from ${actScenes.length} scenes) / ${readingSpeedWpm} WPM = ${(actualWordCount / readingSpeedWpm).toFixed(2)} min = ${durationSec.toFixed(0)}s`);
          return durationSec;
        } else {
          console.log(`  📊 Act "${act.title}": Empty (0 scenes with text) → ${DEFAULT_EMPTY_ACT_SECONDS}s (5 min default)`);
          return DEFAULT_EMPTY_ACT_SECONDS; // 300 seconds
        }
      });
      
      const totalDuration = actDurations.reduce((sum, dur) => sum + dur, 0);
      console.log(`[StructureBeatsSection] ✅ Total duration: ${totalDuration}s (${(totalDuration/60).toFixed(1)} min)`);
      
      return totalDuration;
    } else {
      console.log('[StructureBeatsSection] ⚠️ Using default 300s (5 min) - Book condition not met');
      return 300; // Default: 300 seconds (5 minutes) for films
    }
  }, [projectType, readingSpeedWpm, timelineData]);
  
  // 🧪 TEST: Hook bei 5% positionieren (oben sichtbar)
  const TEST_BEAT_HOOK: BeatCardData = {
    ...MOCK_BEATS[0], // Hook (0-1%)
    pctFrom: 2, // Start bei 2%
    pctTo: 8,   // Ende bei 8% (6% hoch = ca. 60px bei 1000px Höhe)
  };

  const handleUpdateBeat = (beatId: string, updates: Partial<BeatCardData>) => {
    setBeats(prev => prev.map(beat => 
      beat.id === beatId ? { ...beat, ...updates } : beat
    ));
  };

  const handleDeleteBeat = (beatId: string) => {
    setBeats(prev => prev.filter(beat => beat.id !== beatId));
  };

  const handleTimelineChange = (data: TimelineData) => {
    setTimelineData(data);
    if (onDataChange) {
      onDataChange(data);
    }
  };

  // 🎯 Convert FilmDropdown TimelineData to BeatCard TimelineNode format
  const convertToTimelineNodes = (data: TimelineData | null): TimelineNode[] => {
    if (!data || !data.acts || !Array.isArray(data.acts)) return [];
    
    // Build hierarchical structure from flat arrays
    const { acts, sequences, scenes, shots } = data;
    
    // 🔍 DEBUG: Log shots data
    console.log('[StructureBeatsSection] Converting timeline data:', {
      acts: acts.length,
      sequences: sequences?.length || 0,
      scenes: scenes?.length || 0,
      shots: shots?.length || 0,
      allShots: shots
    });
    
    return acts.map(act => ({
      id: act.id,
      title: act.title,
      sequences: sequences
        ?.filter(seq => seq.actId === act.id)
        .map(seq => ({
          id: seq.id,
          title: seq.title,
          scenes: scenes
            ?.filter(scene => scene.sequenceId === seq.id)
            .map(scene => {
              const sceneShots = shots?.filter(shot => shot.sceneId === scene.id) || [];
              console.log(`[StructureBeatsSection] Scene "${scene.title}" (${scene.id}) has ${sceneShots.length} shots:`, sceneShots);
              
              return {
                id: scene.id,
                title: scene.title,
                shots: sceneShots.map(shot => ({
                  id: shot.id,
                  title: shot.shotNumber || shot.description || 'Untitled Shot',
                })),
              };
            }) || [],
        })) || [],
    }));
  };

  const timelineNodes = convertToTimelineNodes(timelineData);

  // 🎬 Sync beats from React Query data
  useEffect(() => {
    if (beatsData && !beatsLoading) {
      console.log('[StructureBeatsSection] 📊 Syncing beats from React Query:', beatsData);
      
      // Convert API beats to BeatCardData format
      const convertedBeats: BeatCardData[] = beatsData.map((beat) => ({
        id: beat.id,
        label: beat.label,
        pctFrom: beat.pct_from,
        pctTo: beat.pct_to,
        color: beat.color,
        description: beat.description,
        notes: beat.notes,
        templateAbbr: beat.template_abbr,
      }));
      
      setBeats(convertedBeats);
    }
  }, [beatsData, beatsLoading]);

  // 🎬 AUTO-GENERATE: Create default beats if none exist
  const hasAutoGenerated = useRef(false);
  
  useEffect(() => {
    if (beatsLoading) return; // Warte bis Daten geladen sind
    if (hasAutoGenerated.current) return; // Verhindere Doppel-Generierung
    
    const autoGenerateBeats = async () => {
      try {
        // Check if beats exist (from React Query)
        if (!beatsData || beatsData.length === 0) {
          const effectiveTemplate = beatTemplate || 'lite-7';
          hasAutoGenerated.current = true; // Markiere als generiert
          console.log(`[StructureBeatsSection] 🎬 No beats found, auto-generating ${effectiveTemplate} template...`);
          
          // Get first act to use as container
          let firstActId = 'placeholder-act-1';
          let lastActId = 'placeholder-act-3';
          
          try {
            const acts = await TimelineAPI.getActs(projectId);
            
            if (acts.length === 0) {
              console.log('[StructureBeatsSection] ⚠️ No acts found, will use placeholder IDs for beats');
            } else {
              firstActId = acts[0].id;
              lastActId = acts[acts.length - 1].id;
              console.log('[StructureBeatsSection] ✅ Using existing acts:', { firstActId, lastActId });
            }
          } catch (error) {
            console.warn('[StructureBeatsSection] ⚠️ Could not load acts (may not exist yet), using placeholder IDs:', error);
          }
          
          // 🎯 Select template based on project's beat_template
          const templateMap: Record<string, any> = {
            'lite-7': LITE_7_TEMPLATE,
            'save-the-cat': SAVE_THE_CAT_TEMPLATE,
          };
          
          const selectedTemplate = templateMap[effectiveTemplate] || SAVE_THE_CAT_TEMPLATE;
          const generatedBeats = generateBeatsFromTemplate(selectedTemplate);
          
          console.log(`[StructureBeatsSection] 🎯 Creating ${generatedBeats.length} beats from ${effectiveTemplate} template...`);
          
          // Create beats in database using mutation
          let successCount = 0;
          for (let i = 0; i < generatedBeats.length; i++) {
            const beat = generatedBeats[i];
            try {
              await createBeatMutation.mutateAsync({
                project_id: projectId,
                label: beat.label,
                template_abbr: beat.templateAbbr || effectiveTemplate.toUpperCase().replace('-', ''),
                description: beat.items?.join(', ') || '',
                from_container_id: firstActId,
                to_container_id: lastActId,
                pct_from: beat.pctFrom,
                pct_to: beat.pctTo === beat.pctFrom ? beat.pctFrom + 2 : beat.pctTo,
                color: beat.color,
                order_index: i,
              });
              successCount += 1;
            } catch (error) {
              console.error(`[StructureBeatsSection] ❌ Failed to create beat "${beat.label}":`, error);
            }
          }
          
          if (successCount > 0) {
            console.log(`[StructureBeatsSection] ✅ Successfully created ${successCount}/${generatedBeats.length} beats`);
            toast.success(`${successCount} Story Beats automatisch generiert`);
          } else {
            hasAutoGenerated.current = false;
            console.warn('[StructureBeatsSection] ⚠️ Beat auto-generation finished with 0 successful creates');
          }
        } else {
          console.log(`[StructureBeatsSection] ℹ️ Found ${beatsData.length} existing beats`);
        }
      } catch (error) {
        console.error('[StructureBeatsSection] ❌ Error in auto-generate:', error);
        toast.error('Fehler beim Generieren der Beats');
      }
    };

    autoGenerateBeats();
  }, [projectId, beatTemplate, beatsData, beatsLoading]); // 🔥 FIX: Entferne createBeatMutation von deps!

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-[#6E59A5] text-white h-8 flex items-center">Structure & Beats</Badge>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0"
            >
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <Tabs value={structureView} onValueChange={(v) => setStructureView(v as any)}>
            <TabsList className="h-9">
              <TabsTrigger value="dropdown" className="text-xs md:text-sm px-2 md:px-3">Dropdown</TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs md:text-sm px-2 md:px-3">Timeline</TabsTrigger>
              <TabsTrigger value="native" className="text-xs md:text-sm px-2 md:px-3">Native</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <CollapsibleContent>
        <div className="flex border border-border rounded-lg overflow-hidden bg-background" style={{ height: structureView === 'timeline' ? '600px' : 'auto' }}>
          {/* Container Stack - Dynamic Dropdown based on projectType */}
          <div className="flex-1 overflow-y-auto h-full">
            {/* 🚀 PERFORMANCE: Show loading skeleton while cache is loading */}
            {isLoadingCache ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6E59A5]"></div>
                  <p className="text-sm text-muted-foreground">Lade Timeline-Daten...</p>
                </div>
              </div>
            ) : structureView === 'dropdown' ? (
              projectType === 'book' ? (
                <BookDropdown
                  projectId={projectId}
                  projectType={projectType}
                  initialData={initialData}
                  onDataChange={handleTimelineChange}
                  containerRef={containerStackRef}
                />
              ) : (
                <FilmDropdown
                  projectId={projectId}
                  projectType={projectType}
                  initialData={initialData}
                  onDataChange={handleTimelineChange}
                  containerRef={containerStackRef}
                />
              )
            ) : structureView === 'timeline' ? (
              <VideoEditorTimeline
                projectId={projectId}
                projectType={projectType}
                initialData={timelineData}
                onDataChange={handleTimelineChange}
                duration={bookTimelineDuration}
                beats={beats}
                // 📖 Book Metrics for timeline markers
                totalWords={totalWords} // Actually written words
                wordsPerPage={wordsPerPage}
                targetPages={targetPages}
                readingSpeedWpm={readingSpeedWpm}
              />
            ) : structureView === 'native' ? (
              projectType === 'book' ? (
                <NativeBookView
                  key={`native-book-${projectId}-${structureView}`}
                  projectId={projectId}
                  projectType={projectType}
                  initialData={initialData}
                />
              ) : projectType === 'film' || projectType === 'series' ? (
                <NativeScreenplayView
                  key={`native-screenplay-${projectId}-${structureView}`}
                  projectId={projectId}
                  projectType={projectType}
                  initialData={initialData}
                />
              ) : projectType === 'audio' ? (
                <NativeAudiobookView
                  key={`native-audiobook-${projectId}-${structureView}`}
                  projectId={projectId}
                  projectType={projectType}
                  initialData={initialData}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Native View für diesen Projekttyp noch nicht verfügbar
                </div>
              )
            ) : null}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}