/**
 * 📱 BOOK DROPDOWN MOBILE - Flache Akkordeon-Struktur für Bücher auf Mobile
 * 
 * Optimiert für Touch-Interaktion und schmale Screens
 * - Flache Liste: Akte > Kapitel > Abschnitte
 * - Große Touch-Targets (min 44x44px)
 * - Swipe-Gesten für Actions
 * - Vereinfachte Navigation
 */

import { useState, useCallback } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, MoreVertical, Edit, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from './ui/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import { TimelineNodeStatsDialog } from './TimelineNodeStatsDialog';
import { ReadonlyTiptapView } from './ReadonlyTiptapView';
import type { Act, Sequence, Scene } from '../lib/types';

interface BookDropdownMobileProps {
  acts: Act[];
  sequences: Sequence[];
  scenes: Scene[];
  onAddAct: () => void;
  onAddSequence: (actId: string) => void;
  onAddScene: (sequenceId: string) => void;
  onUpdateAct: (actId: string, updates: Partial<Act>) => void;
  onUpdateSequence: (sequenceId: string, updates: Partial<Sequence>) => void;
  onUpdateScene: (sceneId: string, updates: Partial<Scene>) => void;
  onDeleteAct: (actId: string) => void;
  onDeleteSequence: (sequenceId: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onEditSceneContent: (sceneId: string) => void;
  projectId: string;
  projectType?: string;
}

export function BookDropdownMobile({
  acts,
  sequences,
  scenes,
  onAddAct,
  onAddSequence,
  onAddScene,
  onUpdateAct,
  onUpdateSequence,
  onUpdateScene,
  onDeleteAct,
  onDeleteSequence,
  onDeleteScene,
  onEditSceneContent,
  projectId,
  projectType = 'book',
}: BookDropdownMobileProps) {
  const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set());
  const [expandedSequences, setExpandedSequences] = useState<Set<string>>(new Set());
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<{ id: string; type: 'act' | 'sequence' | 'scene' } | null>(null);
  const [statsNode, setStatsNode] = useState<{ id: string; type: string; title: string } | null>(null);

  const toggleAct = useCallback((actId: string) => {
    setExpandedActs(prev => {
      const next = new Set(prev);
      if (next.has(actId)) {
        next.delete(actId);
      } else {
        next.add(actId);
      }
      return next;
    });
  }, []);

  const toggleSequence = useCallback((sequenceId: string) => {
    setExpandedSequences(prev => {
      const next = new Set(prev);
      if (next.has(sequenceId)) {
        next.delete(sequenceId);
      } else {
        next.add(sequenceId);
      }
      return next;
    });
  }, []);

  const toggleScene = useCallback((sceneId: string) => {
    setExpandedScenes(prev => {
      const next = new Set(prev);
      if (next.has(sceneId)) {
        next.delete(sceneId);
      } else {
        next.add(sceneId);
      }
      return next;
    });
  }, []);

  const getActLabel = () => {
    switch (projectType) {
      case 'audiobook': return 'Akt';
      default: return 'Akt';
    }
  };

  const getSequenceLabel = () => {
    switch (projectType) {
      case 'audiobook': return 'Kapitel';
      default: return 'Kapitel';
    }
  };

  const getSceneLabel = () => {
    switch (projectType) {
      case 'audiobook': return 'Abschnitt';
      default: return 'Abschnitt';
    }
  };

  return (
    <div className="space-y-3 pb-20">
      {/* Mobile Header mit Add Button */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b pb-3">
        <Button
          onClick={onAddAct}
          variant="outline"
          className="w-full h-12 text-base bg-white border-2 border-dashed border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
        >
          <Plus className="mr-2 h-5 w-5" />
          {getActLabel()} hinzufügen
        </Button>
      </div>

      {/* Acts Liste */}
      {acts.map((act) => {
        const actSequences = sequences.filter(s => s.actId === act.id);
        const isActExpanded = expandedActs.has(act.id);

        return (
          <Collapsible
            key={act.id}
            open={isActExpanded}
            onOpenChange={() => toggleAct(act.id)}
            className="border-2 rounded-lg bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-700 overflow-hidden"
          >
            <div className="bg-blue-100 dark:bg-blue-900/40 p-3">
              {/* Act Header - Touch-optimiert (min 44px) */}
              <div className="flex items-center gap-2 min-h-[44px]">
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-11 w-11 p-0 shrink-0"
                  >
                    {isActExpanded ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </Button>
                </CollapsibleTrigger>

                {editingItem?.id === act.id && editingItem.type === 'act' ? (
                  <Input
                    defaultValue={act.title}
                    autoFocus
                    onBlur={(e) => {
                      onUpdateAct(act.id, { title: e.target.value });
                      setEditingItem(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onUpdateAct(act.id, { title: e.currentTarget.value });
                        setEditingItem(null);
                      }
                      if (e.key === 'Escape') {
                        setEditingItem(null);
                      }
                    }}
                    className="flex-1 h-11 bg-white border-blue-200 dark:border-blue-700 focus-visible:ring-blue-400/20"
                  />
                ) : (
                  <button
                    onClick={() => setEditingItem({ id: act.id, type: 'act' })}
                    className="flex-1 text-left px-2 py-2 rounded-md hover:bg-blue-200/60 dark:hover:bg-blue-800/40 min-h-[44px] flex items-center transition-colors"
                  >
                    <span className="font-semibold text-[rgb(21,93,252)] dark:text-blue-300">
                      {act.title || `${getActLabel()} ${act.actNumber}`}
                    </span>
                  </button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-11 w-11 p-0 shrink-0"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setEditingItem({ id: act.id, type: 'act' })}>
                      <Edit className="mr-2 h-4 w-4" />
                      Bearbeiten
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatsNode({ id: act.id, type: 'act', title: act.title })}>
                      <Info className="mr-2 h-4 w-4" />
                      Details
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        if (confirm(`${getActLabel()} "${act.title}" wirklich löschen?`)) {
                          onDeleteAct(act.id);
                        }
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

              {/* Act Metadata */}
              {act.description && (
                <p className="text-sm text-muted-foreground px-3 py-2 border-t border-blue-200/50 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/25">
                  {act.description}
                </p>
              )}

              <CollapsibleContent>
                <div className="p-3 pt-2 space-y-3 border-t border-blue-200/60 dark:border-blue-800/40 bg-blue-50/30 dark:bg-blue-950/20">
                  {/* Add Sequence Button */}
                  <Button
                    onClick={() => onAddSequence(act.id)}
                    variant="outline"
                    size="sm"
                    className="w-full h-11 bg-white border-2 border-dashed border-green-200 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/40"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {getSequenceLabel()} hinzufügen
                  </Button>

                  {/* Kapitel (Sequences) */}
                  {actSequences.map((sequence) => {
                    const sequenceScenes = scenes.filter(sc => sc.sequenceId === sequence.id);
                    const isSequenceExpanded = expandedSequences.has(sequence.id);

                    return (
                      <Collapsible
                        key={sequence.id}
                        open={isSequenceExpanded}
                        onOpenChange={() => toggleSequence(sequence.id)}
                        className="border-2 rounded-lg bg-green-50 border-green-200 dark:bg-green-950/40 dark:border-green-700 overflow-hidden ml-3 sm:ml-4"
                      >
                        <div className="bg-green-100 dark:bg-green-900/40 p-2">
                          {/* Kapitel Header */}
                          <div className="flex items-center gap-2 min-h-[44px]">
                            <CollapsibleTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-10 w-10 p-0 shrink-0"
                              >
                                {isSequenceExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>

                            {editingItem?.id === sequence.id && editingItem.type === 'sequence' ? (
                              <Input
                                defaultValue={sequence.title}
                                autoFocus
                                onBlur={(e) => {
                                  onUpdateSequence(sequence.id, { title: e.target.value });
                                  setEditingItem(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    onUpdateSequence(sequence.id, { title: e.currentTarget.value });
                                    setEditingItem(null);
                                  }
                                  if (e.key === 'Escape') {
                                    setEditingItem(null);
                                  }
                                }}
                                className="flex-1 h-10 bg-white border-green-200 dark:border-green-700 focus-visible:ring-green-400/20"
                              />
                            ) : (
                              <button
                                onClick={() => setEditingItem({ id: sequence.id, type: 'sequence' })}
                                className="flex-1 text-left px-2 py-2 rounded-md hover:bg-green-200/60 dark:hover:bg-green-800/40 min-h-[44px] flex items-center text-sm font-medium text-green-800 dark:text-green-200 transition-colors"
                              >
                                {sequence.title || `${getSequenceLabel()} ${sequence.sequenceNumber}`}
                              </button>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-10 w-10 p-0 shrink-0"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => setEditingItem({ id: sequence.id, type: 'sequence' })}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Bearbeiten
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setStatsNode({ id: sequence.id, type: 'sequence', title: sequence.title })}>
                                  <Info className="mr-2 h-4 w-4" />
                                  Details
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    if (confirm(`${getSequenceLabel()} "${sequence.title}" wirklich löschen?`)) {
                                      onDeleteSequence(sequence.id);
                                    }
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Löschen
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                          <CollapsibleContent>
                            <div className="p-2 pt-1.5 space-y-2 border-t border-green-200/60 dark:border-green-800/40 bg-green-50/40 dark:bg-green-950/25">
                              {/* Add Scene Button */}
                              <Button
                                onClick={() => onAddScene(sequence.id)}
                                variant="outline"
                                size="sm"
                                className="w-full h-10 bg-white border-2 border-dashed border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                {getSceneLabel()} hinzufügen
                              </Button>

                              {/* Abschnitte (Scenes) */}
                              {sequenceScenes.map((scene) => {
                                const isSceneExpanded = expandedScenes.has(scene.id);

                                return (
                                  <Collapsible
                                    key={scene.id}
                                    open={isSceneExpanded}
                                    onOpenChange={() => toggleScene(scene.id)}
                                    className="border-2 rounded-md bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-700 overflow-hidden ml-2 sm:ml-3"
                                  >
                                    <div className="bg-amber-100 dark:bg-amber-900/40 p-2">
                                      {/* Scene Header */}
                                      <div className="flex items-center gap-2 min-h-[44px]">
                                        <CollapsibleTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            size="sm"
                                            className="h-10 w-10 p-0 shrink-0"
                                          >
                                            {isSceneExpanded ? (
                                              <ChevronDown className="h-4 w-4" />
                                            ) : (
                                              <ChevronRight className="h-4 w-4" />
                                            )}
                                          </Button>
                                        </CollapsibleTrigger>

                                        {editingItem?.id === scene.id && editingItem.type === 'scene' ? (
                                          <Input
                                            defaultValue={scene.title}
                                            autoFocus
                                            onBlur={(e) => {
                                              onUpdateScene(scene.id, { title: e.target.value });
                                              setEditingItem(null);
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                onUpdateScene(scene.id, { title: e.currentTarget.value });
                                                setEditingItem(null);
                                              }
                                              if (e.key === 'Escape') {
                                                setEditingItem(null);
                                              }
                                            }}
                                            className="flex-1 h-10 bg-white border-amber-200 dark:border-amber-700 focus-visible:ring-amber-400/20"
                                          />
                                        ) : (
                                          <button
                                            onClick={() => setEditingItem({ id: scene.id, type: 'scene' })}
                                            className="flex-1 text-left px-2 py-2 rounded-md hover:bg-amber-200/60 dark:hover:bg-amber-800/40 min-h-[44px] flex items-center text-sm font-medium text-amber-950 dark:text-amber-100 transition-colors"
                                          >
                                            {scene.title || `${getSceneLabel()} ${scene.sceneNumber}`}
                                          </button>
                                        )}

                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button 
                                              variant="ghost" 
                                              size="sm"
                                              className="h-10 w-10 p-0 shrink-0"
                                            >
                                              <MoreVertical className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem onClick={() => setEditingItem({ id: scene.id, type: 'scene' })}>
                                              <Edit className="mr-2 h-4 w-4" />
                                              Titel bearbeiten
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onEditSceneContent(scene.id)}>
                                              <Edit className="mr-2 h-4 w-4" />
                                              Text bearbeiten
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setStatsNode({ id: scene.id, type: 'scene', title: scene.title })}>
                                              <Info className="mr-2 h-4 w-4" />
                                              Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={() => {
                                                if (confirm(`${getSceneLabel()} "${scene.title}" wirklich löschen?`)) {
                                                  onDeleteScene(scene.id);
                                                }
                                              }}
                                              className="text-destructive"
                                            >
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              Löschen
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>

                                      {/* Scene Content Preview */}
                                      <CollapsibleContent>
                                        <div className="p-2 pt-1.5 ml-2 sm:ml-3 border-t border-amber-200/60 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/25">
                                          {scene.content ? (
                                            <div 
                                              className="bg-background/50 rounded-md p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                                              onClick={() => onEditSceneContent(scene.id)}
                                            >
                                              <ReadonlyTiptapView content={scene.content} maxHeight="150px" />
                                              <div className="text-xs text-muted-foreground mt-2 text-right">
                                                Tippen zum Bearbeiten
                                              </div>
                                            </div>
                                          ) : (
                                            <Button
                                              onClick={() => onEditSceneContent(scene.id)}
                                              variant="outline"
                                              size="sm"
                                              className="w-full h-10"
                                            >
                                              <Edit className="mr-2 h-4 w-4" />
                                              Text hinzufügen
                                            </Button>
                                          )}
                                        </div>
                                      </CollapsibleContent>
                                  </Collapsible>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </CollapsibleContent>
          </Collapsible>
        );
      })}

      {/* Stats Dialog */}
      {statsNode && (
        <TimelineNodeStatsDialog
          nodeId={statsNode.id}
          nodeType={statsNode.type}
          nodeTitle={statsNode.title}
          isOpen={true}
          onClose={() => setStatsNode(null)}
        />
      )}
    </div>
  );
}
