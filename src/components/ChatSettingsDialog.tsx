import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { Slider } from "./ui/slider";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Loader2, Key, AlertCircle, CheckCircle2, Trash2, Sparkles, Database } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { apiGet, apiPut, apiPost } from "../lib/api-client";

interface AISettings {
  id: string;
  openai_api_key?: string;
  anthropic_api_key?: string;
  google_api_key?: string;
  openrouter_api_key?: string;
  deepseek_api_key?: string;
  active_provider: 'openai' | 'anthropic' | 'google' | 'openrouter' | 'deepseek';
  active_model: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  use_rag: boolean;
}

interface ProviderInfo {
  provider: string;
  default_model: string;
  available_models: string[];
}

const PROVIDER_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic (Claude)',
  google: 'Google (Gemini)',
  openrouter: 'OpenRouter',
  deepseek: 'DeepSeek',
};

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-green-500',
  anthropic: 'bg-purple-500',
  google: 'bg-blue-500',
  openrouter: 'bg-orange-500',
  deepseek: 'bg-cyan-500',
};

interface ChatSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void; // Called when provider/models change
}

export function ChatSettingsDialog({ open, onOpenChange, onUpdate }: ChatSettingsDialogProps) {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  const [tempApiKey, setTempApiKey] = useState("");
  const [detectedProvider, setDetectedProvider] = useState<ProviderInfo | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // ✅ PERFORMANCE FIX: Cache settings and models to avoid repeated API calls
  const [settingsCache, setSettingsCache] = useState<AISettings | null>(null);
  const [modelsCache, setModelsCache] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // ✅ Use cached settings if available (optimistic UI)
      if (settingsCache) {
        console.log('✅ Using cached settings for instant UI');
        setSettings(settingsCache);
        
        // Use cached models if available
        if (modelsCache[settingsCache.active_provider]) {
          setAvailableModels(modelsCache[settingsCache.active_provider]);
        }
        
        setLoading(false);
        
        // Load fresh data in background (don't block UI)
        loadSettingsInBackground();
        return;
      }
      
      // First load: fetch settings
      const result = await apiGet("/ai/settings");
      if (result.data) {
        setSettings(result.data.settings);
        setSettingsCache(result.data.settings);
        
        // ✅ DON'T validate key on every open - only when adding new key
        // Just use backend's available models
        const modelsResult = await apiGet("/ai/models");
        if (modelsResult.data?.models) {
          const modelIds = modelsResult.data.models.map((m: any) => m.id);
          setAvailableModels(modelIds);
          
          // Cache models for this provider
          setModelsCache(prev => ({
            ...prev,
            [result.data.settings.active_provider]: modelIds,
          }));
        }
      }
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      toast.error('Fehler beim Laden der Einstellungen');
    } finally {
      setLoading(false);
    }
  };

  const loadSettingsInBackground = async () => {
    try {
      console.log('🔄 Refreshing settings in background...');
      const result = await apiGet("/ai/settings");
      if (result.data) {
        setSettings(result.data.settings);
        setSettingsCache(result.data.settings);
        
        const modelsResult = await apiGet("/ai/models");
        if (modelsResult.data?.models) {
          const modelIds = modelsResult.data.models.map((m: any) => m.id);
          setAvailableModels(modelIds);
          setModelsCache(prev => ({
            ...prev,
            [result.data.settings.active_provider]: modelIds,
          }));
        }
      }
    } catch (error) {
      console.error('Background refresh failed:', error);
    }
  };

  const getProviderKey = (provider: string, s: AISettings) => {
    if (provider === 'openai') return s.openai_api_key;
    if (provider === 'anthropic') return s.anthropic_api_key;
    if (provider === 'google') return s.google_api_key;
    if (provider === 'openrouter') return s.openrouter_api_key;
    if (provider === 'deepseek') return s.deepseek_api_key;
    return '';
  };

  const detectProvider = async () => {
    if (!tempApiKey) {
      toast.error('Bitte gib einen API Key ein');
      return;
    }

    setDetecting(true);
    try {
      console.log('🔍 Validating API key...');
      const result = await apiPost("/ai/validate-key", {
        api_key: tempApiKey,
      });

      if (result.data?.valid) {
        const provider = result.data.provider;
        const models = result.data.models || [];
        
        setDetectedProvider({
          provider,
          default_model: models[0] || 'gpt-4o-mini',
          available_models: models,
        });
        setAvailableModels(models);
        
        console.log(`✅ Provider detected: ${provider}, Models: ${models.length}`);
        toast.success(`✅ ${PROVIDER_NAMES[provider]} API Key gültig!`);
      } else {
        const errorMsg = result.data?.error || 'Ungültiger API Key';
        console.error('❌ Validation failed:', errorMsg);
        toast.error(`❌ ${errorMsg}`);
        setDetectedProvider(null);
        setAvailableModels([]);
      }
    } catch (error: any) {
      console.error('❌ Validation error:', error);
      toast.error(error.message || 'Provider konnte nicht erkannt werden');
      setDetectedProvider(null);
      setAvailableModels([]);
    } finally {
      setDetecting(false);
    }
  };

  const saveApiKey = async () => {
    if (!detectedProvider || !tempApiKey) {
      toast.error('Bitte erkenne zuerst den Provider');
      return;
    }

    setSaving(true);
    try {
      const keyField = `${detectedProvider.provider}_api_key`;
      const result = await apiPut("/ai/settings", {
        [keyField]: tempApiKey,
        active_provider: detectedProvider.provider,
        active_model: detectedProvider.default_model,
      });

      if (result.data) {
        setSettings(result.data.settings);
        setSettingsCache(result.data.settings);
        
        // Update available models from backend response
        if (result.data.models_with_context) {
          const modelIds = result.data.models_with_context.map((m: any) => m.id);
          setAvailableModels(modelIds);
          setModelsCache(prev => ({
            ...prev,
            [detectedProvider.provider]: modelIds,
          }));
        } else if (result.data.available_models) {
          setAvailableModels(result.data.available_models);
          setModelsCache(prev => ({
            ...prev,
            [detectedProvider.provider]: result.data.available_models,
          }));
        }
        
        setTempApiKey("");
        setDetectedProvider(null);
        
        // Trigger reload in parent
        if (onUpdate) {
          onUpdate();
        }
        
        toast.success(`API Key gespeichert und zu ${PROVIDER_NAMES[detectedProvider.provider]} gewechselt!`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = async (updates: Partial<AISettings>) => {
    if (!settings) return;

    setSaving(true);
    try {
      const result = await apiPut("/ai/settings", updates);
      if (result.data) {
        setSettings(result.data.settings);
        setSettingsCache(result.data.settings);
        toast.success('Einstellungen gespeichert');
      }
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const syncRAG = async () => {
    setSyncing(true);
    try {
      const result = await apiPost("/ai/rag/sync", {});
      if (result.data) {
        toast.success(result.data.message || 'RAG synchronisiert');
      }
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Synchronisieren');
    } finally {
      setSyncing(false);
    }
  };

  const switchProvider = async (provider: string) => {
    setSaving(true);
    try {
      // Get the API key for this provider
      const apiKey = getProviderKey(provider, settings!);
      if (!apiKey) {
        toast.error('Kein API Key für diesen Provider');
        setSaving(false);
        return;
      }

      // Validate and get available models
      const providerResult = await apiPost("/ai/validate-key", {
        api_key: apiKey,
      });

      if (providerResult.data) {
        // Switch to this provider
        const result = await apiPut("/ai/settings", {
          active_provider: provider,
          active_model: providerResult.data.default_model,
        });

        if (result.data) {
          setSettings(result.data.settings);
          setSettingsCache(result.data.settings);
          
          // Update available models from backend
          if (result.data.models_with_context) {
            const modelIds = result.data.models_with_context.map((m: any) => m.id);
            setAvailableModels(modelIds);
            setModelsCache(prev => ({
              ...prev,
              [provider]: modelIds,
            }));
          } else if (result.data.available_models) {
            setAvailableModels(result.data.available_models);
            setModelsCache(prev => ({
              ...prev,
              [provider]: result.data.available_models,
            }));
          } else if (providerResult.data.available_models) {
            setAvailableModels(providerResult.data.available_models);
            setModelsCache(prev => ({
              ...prev,
              [provider]: providerResult.data.available_models,
            }));
          }
          
          // Trigger reload in parent (ScriptonyAssistant)
          if (onUpdate) {
            onUpdate();
          }
          
          toast.success(`Gewechselt zu ${PROVIDER_NAMES[provider]}`);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Wechseln');
    } finally {
      setSaving(false);
    }
  };

  const removeApiKey = async (provider: string) => {
    if (!confirm(`Möchtest du den API Key für ${PROVIDER_NAMES[provider]} wirklich entfernen?`)) {
      return;
    }

    setSaving(true);
    try {
      const keyField = `${provider}_api_key`;
      await apiPut("/ai/settings", {
        [keyField]: null,
      });
      await loadSettings();
      toast.success('API Key entfernt');
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Entfernen');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] flex flex-col md:w-auto">
          <DialogHeader>
            <DialogTitle>Chat Settings</DialogTitle>
            <DialogDescription>AI-Konfiguration lädt...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!settings) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-2xl md:w-auto">
          <DialogHeader>
            <DialogTitle>Chat Settings</DialogTitle>
          </DialogHeader>
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              Keine Einstellungen gefunden. Bitte versuche es erneut.
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  const hasApiKey = Boolean(
    settings.openai_api_key || settings.anthropic_api_key || settings.google_api_key || settings.openrouter_api_key || settings.deepseek_api_key
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] flex flex-col md:w-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Chat Settings
          </DialogTitle>
          <DialogDescription>
            Konfiguriere deinen AI-Assistenten mit API Keys, Modellen und RAG-Datenbank
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="api" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="api">API Keys</TabsTrigger>
            <TabsTrigger value="settings">Modell Settings</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            {/* API Keys Tab */}
            <TabsContent value="api" className="space-y-4 mt-0">
              {/* Current Keys */}
              {hasApiKey && (
                <div className="space-y-2">
                  <Label>Aktive API Keys</Label>
                  <div className="space-y-2">
                    {settings.openai_api_key && (
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Badge className={PROVIDER_COLORS.openai}>OpenAI</Badge>
                          <span className="text-sm text-muted-foreground font-mono">
                            sk-***{settings.openai_api_key.slice(-4)}
                          </span>
                          {settings.active_provider === 'openai' && (
                            <Badge variant="outline" className="ml-2">Aktiv</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {settings.active_provider !== 'openai' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => switchProvider('openai')}
                              disabled={saving}
                            >
                              Aktivieren
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeApiKey('openai')}
                            disabled={saving}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {settings.anthropic_api_key && (
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Badge className={PROVIDER_COLORS.anthropic}>Anthropic</Badge>
                          <span className="text-sm text-muted-foreground font-mono">
                            sk-ant-***{settings.anthropic_api_key.slice(-4)}
                          </span>
                          {settings.active_provider === 'anthropic' && (
                            <Badge variant="outline" className="ml-2">Aktiv</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {settings.active_provider !== 'anthropic' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => switchProvider('anthropic')}
                              disabled={saving}
                            >
                              Aktivieren
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeApiKey('anthropic')}
                            disabled={saving}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {settings.google_api_key && (
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Badge className={PROVIDER_COLORS.google}>Google</Badge>
                          <span className="text-sm text-muted-foreground font-mono">
                            AIza***{settings.google_api_key.slice(-4)}
                          </span>
                          {settings.active_provider === 'google' && (
                            <Badge variant="outline" className="ml-2">Aktiv</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {settings.active_provider !== 'google' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => switchProvider('google')}
                              disabled={saving}
                            >
                              Aktivieren
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeApiKey('google')}
                            disabled={saving}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {settings.openrouter_api_key && (
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Badge className={PROVIDER_COLORS.openrouter}>OpenRouter</Badge>
                          <span className="text-sm text-muted-foreground font-mono">
                            sk-or-***{settings.openrouter_api_key.slice(-4)}
                          </span>
                          {settings.active_provider === 'openrouter' && (
                            <Badge variant="outline" className="ml-2">Aktiv</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {settings.active_provider !== 'openrouter' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => switchProvider('openrouter')}
                              disabled={saving}
                            >
                              Aktivieren
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeApiKey('openrouter')}
                            disabled={saving}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {settings.deepseek_api_key && (
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Badge className={PROVIDER_COLORS.deepseek}>DeepSeek</Badge>
                          <span className="text-sm text-muted-foreground font-mono">
                            sk-***{settings.deepseek_api_key.slice(-4)}
                          </span>
                          {settings.active_provider === 'deepseek' && (
                            <Badge variant="outline" className="ml-2">Aktiv</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {settings.active_provider !== 'deepseek' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => switchProvider('deepseek')}
                              disabled={saving}
                            >
                              Aktivieren
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeApiKey('deepseek')}
                            disabled={saving}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Add New Key */}
              <div className="space-y-3">
                <Label htmlFor="api-key">Neuen API Key hinzufügen</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="sk-... oder sk-ant-... oder AIza..."
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && detectProvider()}
                  />
                  <Button
                    onClick={detectProvider}
                    disabled={detecting || !tempApiKey}
                  >
                    {detecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Erkenne...
                      </>
                    ) : (
                      'Erkennen'
                    )}
                  </Button>
                </div>
                
                {detectedProvider && (
                  <Alert>
                    <CheckCircle2 className="w-4 h-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <div>
                        <strong>{PROVIDER_NAMES[detectedProvider.provider]}</strong> erkannt
                        <br />
                        <span className="text-sm">Standard-Modell: {detectedProvider.default_model}</span>
                      </div>
                      <Button onClick={saveApiKey} disabled={saving} size="sm">
                        {saving ? 'Speichere...' : 'Speichern'}
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </div>


            </TabsContent>

            {/* Modell Settings Tab */}
            <TabsContent value="settings" className="space-y-4 mt-0">
              {hasApiKey ? (
                <>
                  <div className="space-y-2">
                    <Label>Aktiver Provider</Label>
                    <div className="flex items-center gap-2">
                      <Badge className={PROVIDER_COLORS[settings.active_provider]}>
                        {PROVIDER_NAMES[settings.active_provider]}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="temperature">
                      Temperatur: {settings.temperature.toFixed(2)}
                    </Label>
                    <Slider
                      id="temperature"
                      min={0}
                      max={2}
                      step={0.1}
                      value={[settings.temperature]}
                      onValueChange={([value]) => updateSettings({ temperature: value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Niedrigere Werte = präziser, Höhere Werte = kreativer
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-tokens">Max Tokens: {settings.max_tokens}</Label>
                    <Slider
                      id="max-tokens"
                      min={500}
                      max={4000}
                      step={100}
                      value={[settings.max_tokens]}
                      onValueChange={([value]) => updateSettings({ max_tokens: value })}
                    />
                  </div>
                </>
              ) : (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Bitte füge zuerst einen API Key im Tab "API Keys" hinzu.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex gap-3 justify-end mt-4 border-t pt-4">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}