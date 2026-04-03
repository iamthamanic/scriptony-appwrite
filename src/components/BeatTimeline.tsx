import { useState, useEffect, useCallback } from 'react';
import { ResizableBeatBlock, type BeatBlockData } from './ResizableBeatBlock';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { SAVE_THE_CAT_TEMPLATE, LITE_7_TEMPLATE, HEROES_JOURNEY_TEMPLATE, SYD_FIELD_TEMPLATE, SEVEN_POINT_TEMPLATE, getAllTemplateOptions } from '../lib/beat-templates';
import { Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

/**
 * 🎬 BEAT TIMELINE
 * 
 * New beat system with:
 * - Resizable beat blocks (independent of containers)
 * - FL Studio-style UI with top/bottom handles
 * - Save the Cat template as default (15 beats)
 * - Constraints: First beat >= first act, last beat <= last act
 */

interface BeatTimelineProps {
  projectId: string;
  firstActStartPercent?: number;
  lastActEndPercent?: number;
}

export function BeatTimeline({
  projectId,
  firstActStartPercent = 0,
  lastActEndPercent = 100,
}: BeatTimelineProps) {
  const [beats, setBeats] = useState<BeatBlockData[]>([]);
  const [activeBeatId, setActiveBeatId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('save-the-cat');
  const [timelineHeight] = useState(2400); // Increased height for better visibility

  // Initialize with Save the Cat template
  useEffect(() => {
    loadBeats();
  }, [projectId]);

  const loadBeats = async () => {
    // TODO: Load from API
    // For now, initialize with Save the Cat template
    const template = SAVE_THE_CAT_TEMPLATE;
    const initialBeats: BeatBlockData[] = template.beats.map((beat, index) => {
      // Ensure beats have minimum height (at least 2% span)
      let endPercent = beat.pctTo;
      if (beat.pctFrom === beat.pctTo) {
        endPercent = beat.pctFrom + 2;
      } else if (beat.pctTo - beat.pctFrom < 2) {
        endPercent = beat.pctFrom + 2;
      }
      
      return {
        id: `beat-${Date.now()}-${index}`,
        label: beat.label,
        color: beat.color ?? "#9B87C4",
        startPercent: beat.pctFrom,
        endPercent: endPercent,
        notes: "",
        templateAbbr: beat.templateAbbr ?? "",
      };
    });

    console.log('[BeatTimeline] Loaded beats:', initialBeats.length, initialBeats);
    setBeats(initialBeats);
  };

  const handleResize = useCallback((id: string, startPercent: number, endPercent: number) => {
    setBeats((prev) =>
      prev.map((beat) =>
        beat.id === id
          ? { ...beat, startPercent, endPercent }
          : beat
      )
    );
  }, []);

  const handleNotesChange = useCallback((id: string, notes: string) => {
    setBeats((prev) =>
      prev.map((beat) =>
        beat.id === id
          ? { ...beat, notes }
          : beat
      )
    );
  }, []);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    
    let template;
    switch (templateId) {
      case 'save-the-cat':
        template = SAVE_THE_CAT_TEMPLATE;
        break;
      case 'lite-7':
        template = LITE_7_TEMPLATE;
        break;
      case 'heroes-journey':
        template = HEROES_JOURNEY_TEMPLATE;
        break;
      case 'syd-field':
        template = SYD_FIELD_TEMPLATE;
        break;
      case 'seven-point':
        template = SEVEN_POINT_TEMPLATE;
        break;
      default:
        template = SAVE_THE_CAT_TEMPLATE;
    }

    const newBeats: BeatBlockData[] = template.beats.map((beat, index) => ({
      id: `beat-${Date.now()}-${index}`,
      label: beat.label,
      color: beat.color ?? "#9B87C4",
      startPercent: beat.pctFrom,
      endPercent: beat.pctTo,
      notes: "",
      templateAbbr: beat.templateAbbr ?? "",
    }));

    setBeats(newBeats);
    toast.success(`Template "${template.name}" geladen`);
  };

  const handleSaveBeats = async () => {
    try {
      // TODO: Save to API
      console.log('Saving beats:', beats);
      toast.success('Beats gespeichert!');
    } catch (error) {
      console.error('Error saving beats:', error);
      toast.error('Fehler beim Speichern');
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex-shrink-0 border-b border-border p-4 bg-card">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Template wählen..." />
              </SelectTrigger>
              <SelectContent>
                {getAllTemplateOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{option.abbr}</span>
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground">
              {beats.length} Beats
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTemplateChange(selectedTemplate)}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>

            <Button
              size="sm"
              onClick={handleSaveBeats}
              className="bg-primary hover:bg-primary/90"
            >
              Beats speichern
            </Button>
          </div>
        </div>
      </div>

      {/* Timeline Container */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          {/* Act Boundaries Indicator */}
          <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Erster Akt: {firstActStartPercent.toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Letzter Akt: {lastActEndPercent.toFixed(0)}%</span>
            </div>
          </div>

          {/* Timeline */}
          <div
            className="relative bg-gradient-to-b from-muted/20 to-muted/40 rounded-lg border border-border"
            style={{ height: `${timelineHeight}px` }}
          >
            {/* Percentage Markers */}
            <div className="absolute left-0 top-0 bottom-0 w-12 border-r border-border bg-card/50">
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((pct) => (
                <div
                  key={pct}
                  className="absolute left-0 right-0 flex items-center justify-center text-[9px] text-muted-foreground"
                  style={{ top: `${(pct / 100) * timelineHeight}px`, transform: 'translateY(-50%)' }}
                >
                  <span className="bg-card px-1 rounded">{pct}%</span>
                </div>
              ))}
            </div>

            {/* Beats Container */}
            <div className="absolute left-12 right-0 top-0 bottom-0 px-4">
              {beats.map((beat) => (
                <ResizableBeatBlock
                  key={beat.id}
                  beat={beat}
                  timelineHeight={timelineHeight}
                  minPercent={firstActStartPercent}
                  maxPercent={lastActEndPercent}
                  onResize={handleResize}
                  onNotesChange={handleNotesChange}
                  isActive={activeBeatId === beat.id}
                  onClick={() => setActiveBeatId(beat.id)}
                />
              ))}
            </div>

            {/* First/Last Act Boundary Lines */}
            {firstActStartPercent > 0 && (
              <div
                className="absolute left-12 right-0 border-t-2 border-dashed border-primary/50"
                style={{ top: `${(firstActStartPercent / 100) * timelineHeight}px` }}
              />
            )}
            {lastActEndPercent < 100 && (
              <div
                className="absolute left-12 right-0 border-t-2 border-dashed border-primary/50"
                style={{ top: `${(lastActEndPercent / 100) * timelineHeight}px` }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}