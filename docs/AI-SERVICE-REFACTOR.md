# AI Service Refactor - Architektur-Dokumentation

> **Branch:** `feature/ai-service-refactor`  
> **Status:** In Progress  
> **Datum:** 2025-04-05

---

## 📋 Inhaltsverzeichnis

1. [Zusammenfassung](#zusammenfassung)
2. [Problemstellung](#problemstellung)
3. [Ziele](#ziele)
4. [Architektur: VORHER](#architektur-vorher)
5. [Architektur: NACHHER](#architektur-nachher)
6. [Implementierungsdetails](#implementierungsdetails)
7. [Provider-Details](#provider-details)
8. [Service-Details](#service-details)
9. [Feature-Konfiguration](#feature-konfiguration)
10. [Migration](#migration)
11. [API-Endpunkte](#api-endpunkte)
12. [Datenbankschema](#datenbankschema)
13. [Testing](#testing)
14. [Offene TODOs](#offene-todos)

---

## Zusammenfassung

### Was wird geändert?

Wir zentralisieren die AI-Integration in Scriptony durch einen neuen, modularen AI-Service. Statt dass jede Function (Assistant, Audio, Gym, etc.) ihre eigene AI-Logik implementiert, gibt es jetzt:

1. **`_shared/ai-service/`** - Zentrale AI-Abstraktion mit Provider-Support
2. **`scriptony-ai/`** - Neue Function für AI-Konfiguration (API-Keys, Feature-Zuweisung)
3. **Refactored Functions** - Alle Functions nutzen den zentralen Service

### Warum?

- **Wartbarkeit**: Eine Stelle für AI-Logik statt 5+ Functions
- **Flexibilität**: User können pro Feature verschiedene Provider wählen
- **Erweiterbarkeit**: Neuen Provider hinzufügen = 1 Datei, nicht 5+
- **Testbarkeit**: Provider können isoliert getestet werden
- **Kostenkontrolle**: User können günstige Models für einfache Tasks wählen

---

## Problemstellung

### Aktuelle Probleme

#### 1. **Duplizierte AI-Logik**

```
scriptony-assistant/
├── ai/
│   ├── chat.ts          ← Eigene AI-Implementierung
│   ├── settings.ts      ← Eigene Settings-Logik
│   ├── models.ts         ← Eigene Model-Liste
│   └── validate-key.ts   ← Eigene Validierung

scriptony-audio/
├── (geplant: audio-ai.ts) ← Würde eigene AI-Logik brauchen

scriptony-gym/
├── (geplant: gym-ai.ts)   ← Würde eigene AI-Logik brauchen
```

**Problem**: Jede Function implementiert AI neu → Wartungsalptraum

#### 2. **Keine Feature-Level-Konfiguration**

User können nicht wählen:

- "Für Assistant: GPT-4o"
- "Für Gym: DeepSeek (billiger)"
- "Für Embeddings: OpenAI Embeddings"
- "Für TTS: ElevenLabs"

**Problem**: Alles oder nichts - keine Flexibilität

#### 3. **API-Key Management verteilt**

API-Keys sind in verschiedenen Collections/Tabellen verstreut:

- User Settings
- Assistant Settings
- Environment Variables

**Problem**: Keine zentrale Übersicht, schwer zu verwalten

#### 4. **Keine Provider-Abstraktion**

```typescript
// VORHER: Direkter Fetch zu OpenAI
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
});
```

**Problem**:

- Wechsel zu anderem Provider = Code-Änderung
- Keine Fallback-Option
- Keine einheitliche Fehlerbehandlung

---

## Ziele

### Primäre Ziele

1. **Zentrale AI-Verwaltung** → `_shared/ai-service/`
2. **Feature-Level-Konfiguration** → User wählt Provider/Model pro Feature
3. **Multi-Provider-Support** → 8 Provider von Anfang an
4. **Saubere API-Key-Verwaltung** → Eine Collection, alle Keys
5. **Erweiterbarkeit** → Neuer Provider = 1 Datei

### Sekundäre Ziele

- Performance-Optimierung durch Caching
- Bessere Error-Handling
- Rate-Limiting pro Provider
- Usage-Tracking pro User

---

## Architektur: VORHER

### Struktur

```
functions/
├── _shared/
│   ├── ai.ts                    ← Minimales AI-Interface
│   ├── appwrite-db.ts
│   ├── auth.ts
│   └── env.ts
│
├── scriptony-assistant/
│   ├── ai/
│   │   ├── chat.ts              ← Direkte OpenAI-Calls
│   │   ├── settings.ts          ← Assistant-spezifische Settings
│   │   ├── models.ts            ← Hardcoded Model-Liste
│   │   └── validate-key.ts      ← Key-Validierung
│   └── ... (weitere Endpoints)
│
├── scriptony-audio/
│   └── (geplant: eigene AI-Logik)
│
└── scriptony-gym/
    └── (geplant: eigene AI-Logik)
```

### Code-Beispiel: VORHER

```typescript
// functions/scriptony-assistant/ai/chat.ts

export async function chat(messages: Message[], model: string) {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

  // Direkter Fetch zu OpenAI
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages,
    }),
  });

  return response.json();
}
```

### Probleme dieses Ansatzes

1. **Provider ist hardcoded** → Nur OpenAI möglich
2. **API-Key aus Env** → Kein User-spezifischer Key
3. **Keine Abstraktion** → Wechsel = Code-Änderung
4. **Keine Wiederverwendung** → Jede Function schreibt das neu

---

## Architektur: NACHHER

### Struktur

```
functions/
├── _shared/
│   ├── ai-service/              ← NEU: Zentrale AI-Abstraktion
│   │   ├── providers/            ← 8 Provider-Implementierungen
│   │   │   ├── base.ts           ← Interface & Types
│   │   │   ├── openai.ts         ← OpenAI-Implementierung
│   │   │   ├── anthropic.ts      ← Anthropic-Implementierung
│   │   │   ├── google.ts        ← Google/Gemini-Implementierung
│   │   │   ├── openrouter.ts    ← OpenRouter-Implementierung
│   │   │   ├── deepseek.ts      ← DeepSeek-Implementierung
│   │   │   ├── elevenlabs.ts    ← ElevenLabs-Implementierung
│   │   │   ├── ollama.ts        ← Ollama/Lokal-Implementierung
│   │   │   ├── huggingface.ts   ← HuggingFace-Implementierung
│   │   │   └── index.ts          ← Provider Registry
│   │   │
│   │   ├── services/             ← High-Level Services
│   │   │   ├── text.ts           ← Chat/Completion
│   │   │   ├── stt.ts            ← Speech-to-Text
│   │   │   ├── tts.ts            ← Text-to-Speech
│   │   │   ├── image.ts          ← Image Generation
│   │   │   ├── video.ts          ← Video Generation
│   │   │   ├── embeddings.ts    ← Embeddings
│   │   │   └── index.ts          ← Service Exports
│   │   │
│   │   ├── config/               ← Konfiguration
│   │   │   ├── settings.ts       ← User Settings Management
│   │   │   ├── models.ts         ← Model Registry
│   │   │   └── index.ts          ← Config Exports
│   │   │
│   │   └── index.ts              ← Main Entry Point
│   │
│   ├── ai.ts                     ← Legacy (wird entfernt)
│   └── ... (andere Shared-Module)
│
├── scriptony-ai/                 ← NEU: AI-Konfigurations-Function
│   └── index.ts                  ← Settings CRUD, Provider Registry
│
├── scriptony-assistant/
│   ├── ai/
│   │   └── (refactored: nutzt _shared/ai-service/)
│   └── ... (Endpoints bleiben gleich)
│
├── scriptony-gym/
│   ├── index.ts                  ← NEU: Nutzt AI-Service
│   └── ... (AI-generierte Übungen)
│
├── scriptony-image/              ← NEU: Image Generation
│   └── index.ts
│
└── scriptony-video/              ← NEU: Video Generation
    └── index.ts
```

### Code-Beispiel: NACHHER

```typescript
// functions/scriptony-assistant/ai/chat.ts

import { chat } from "../../_shared/ai-service";

export async function handleChat(userId: string, messages: Message[]) {
  // Zentraler Service kümmert sich um:
  // 1. User-spezifische Settings laden
  // 2. Richtigen Provider wählen
  // 3. API-Key aus User-Config holen
  // 4. Fallbacks (falls konfiguriert)

  return await chat(userId, messages, "assistant_chat");
}
```

```typescript
// functions/_shared/ai-service/services/text.ts

export async function chat(
  userId: string,
  messages: ChatMessage[],
  feature: string,
): Promise<ChatResponse> {
  // 1. User Settings laden
  const settings = await getUserSettings(userId);

  // 2. Feature-Config holen
  const featureConfig = settings.features[feature];

  // 3. Provider instanziieren
  const provider = getProvider(featureConfig.provider, {
    apiKey: settings.api_keys[featureConfig.provider],
  });

  // 4. Chat ausführen
  return provider.chat(messages, {
    model: featureConfig.model,
  });
}
```

### Vorteile dieses Ansatzes

1. **Ein Service, alle Features** → DRY
2. **User wählt Provider/Model** → Flexibilität
3. **Provider-Abstraktion** → Wechsel ohne Code-Änderung
4. **Zentrale Fehlerbehandlung** → Konsistente UX
5. **Erweiterbar** → Neuer Provider = 1 Datei

---

## Implementierungsdetails

### Provider Interface

```typescript
// _shared/ai-service/providers/base.ts

export interface AIProvider {
  readonly name: string;
  readonly capabilities: {
    text: boolean;
    audio_stt: boolean;
    audio_tts: boolean;
    image: boolean;
    video: boolean;
    embeddings: boolean;
  };

  // Pflicht: Text/Chat
  chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResponse>;

  // Optional: Andere Features
  transcribe?(audioUrl: string, options: STTOptions): Promise<STTResponse>;
  synthesize?(text: string, options: TTSOptions): Promise<TTSResponse>;
  generateImage?(prompt: string, options: ImageOptions): Promise<ImageResponse>;
  generateVideo?(prompt: string, options: VideoOptions): Promise<VideoResponse>;
  createEmbedding?(
    text: string,
    options: EmbeddingOptions,
  ): Promise<EmbeddingResponse>;
}
```

### Factory Pattern

```typescript
// _shared/ai-service/providers/index.ts

export function getProvider(name: string, config: ProviderConfig): AIProvider {
  switch (name) {
    case "openai":
      return new OpenAIProvider(config.apiKey, config.baseUrl);
    case "anthropic":
      return new AnthropicProvider(config.apiKey);
    case "google":
      return new GoogleProvider(config.apiKey, config.projectId);
    case "openrouter":
      return new OpenRouterProvider(config.apiKey, config.siteUrl);
    case "deepseek":
      return new DeepSeekProvider(config.apiKey);
    case "elevenlabs":
      return new ElevenLabsProvider(config.apiKey);
    case "ollama":
      return new OllamaProvider(config.baseUrl);
    case "huggingface":
      return new HuggingFaceProvider(config.apiKey);
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}
```

### Feature-basierte Konfiguration

```typescript
// _shared/ai-service/config/settings.ts

export interface AISettings {
  api_keys: {
    openai?: string;
    anthropic?: string;
    google?: string;
    openrouter?: string;
    deepseek?: string;
    elevenlabs?: string;
    huggingface?: string;
    ollama_base_url?: string; // Kein Key nötig für lokal
  };

  features: {
    assistant_chat: FeatureConfig; // z.B. OpenAI GPT-4o
    assistant_embeddings: FeatureConfig; // z.B. OpenAI Embeddings
    creative_gym: FeatureConfig; // z.B. DeepSeek (billiger)
    image_generation: FeatureConfig; // z.B. DALL·E 3
    audio_stt: FeatureConfig; // z.B. OpenAI Whisper
    audio_tts: FeatureConfig; // z.B. ElevenLabs
    video_generation: FeatureConfig; // z.B. OpenRouter/Runway
  };
}

export interface FeatureConfig {
  provider: string;
  model: string;
}
```

---

## Provider-Details

### Unterstützte Provider

| Provider    | Text | STT | TTS | Image | Video | Embeddings | API Key      |
| ----------- | ---- | --- | --- | ----- | ----- | ---------- | ------------ |
| OpenAI      | ✅   | ✅  | ✅  | ✅    | ❌    | ✅         | Ja           |
| Anthropic   | ✅   | ❌  | ❌  | ❌    | ❌    | ❌         | Ja           |
| Google      | ✅   | ❌  | ❌  | ✅    | ✅    | ✅         | Ja           |
| OpenRouter  | ✅   | ❌  | ❌  | ✅    | ✅    | ✅         | Ja           |
| DeepSeek    | ✅   | ❌  | ❌  | ❌    | ❌    | ✅         | Ja           |
| ElevenLabs  | ❌   | ❌  | ✅  | ❌    | ❌    | ❌         | Ja           |
| Ollama      | ✅   | ✅  | ✅  | ✅    | ❌    | ✅         | Nein (Lokal) |
| HuggingFace | ✅   | ✅  | ✅  | ✅    | ✅    | ✅         | Ja           |

### Capability Check

```typescript
// Prüfen ob Provider Feature unterstützt
import { hasCapability } from "./providers";

if (!hasCapability("anthropic", "image")) {
  throw new Error("Anthropic does not support image generation");
}

// Provider mit bestimmtem Feature finden
import { getProvidersWithFeature } from "./providers";

const imageProviders = getProvidersWithFeature("image");
// → ["openai", "google", "openrouter", "ollama", "huggingface"]
```

### Provider-Implementierung

Jeder Provider implementiert das `AIProvider` Interface:

```typescript
// Beispiel: OpenAI

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";

  readonly capabilities = {
    text: true,
    audio_stt: true,
    audio_tts: true,
    image: true,
    video: false,
    embeddings: true,
  };

  constructor(
    private apiKey: string,
    private baseUrl?: string,
  ) {}

  async chat(
    messages: ChatMessage[],
    options: ChatOptions,
  ): Promise<ChatResponse> {
    // OpenAI-spezifische Implementierung
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model,
        messages,
        temperature: options.temperature,
      }),
    });

    return this.parseResponse(response);
  }

  // ... andere Methoden
}
```

---

## Service-Details

### Text Service (Chat/Completion)

```typescript
// _shared/ai-service/services/text.ts

export async function chat(
  userId: string,
  messages: ChatMessage[],
  feature: "assistant_chat" | "creative_gym",
  options?: Partial<ChatOptions>,
): Promise<ChatResponse> {
  // 1. User Settings laden
  const settings = await getUserSettings(userId);

  // 2. Feature-Config holen
  const config = settings.features[feature];

  // 3. Provider instanziieren
  const provider = getProvider(config.provider, {
    apiKey: settings.api_keys[config.provider],
  });

  // 4. Chat ausführen
  return provider.chat(messages, {
    model: config.model,
    ...options,
  });
}
```

### Speech-to-Text (STT)

```typescript
// _shared/ai-service/services/stt.ts

export async function transcribe(
  userId: string,
  audioUrl: string,
  options?: Partial<STTOptions>,
): Promise<STTResponse> {
  const settings = await getUserSettings(userId);
  const config = settings.features.audio_stt;

  const provider = getProvider(config.provider, {
    apiKey: settings.api_keys[config.provider],
  });

  if (!provider.capabilities.audio_stt || !provider.transcribe) {
    throw new Error(`Provider ${config.provider} does not support STT`);
  }

  return provider.transcribe(audioUrl, {
    model: config.model,
    ...options,
  });
}
```

### Text-to-Speech (TTS)

```typescript
// _shared/ai-service/services/tts.ts

export async function synthesize(
  userId: string,
  text: string,
  options?: Partial<TTSOptions>,
): Promise<TTSResponse> {
  const settings = await getUserSettings(userId);
  const config = settings.features.audio_tts;

  const provider = getProvider(config.provider, {
    apiKey: settings.api_keys[config.provider],
  });

  if (!provider.capabilities.audio_tts || !provider.synthesize) {
    throw new Error(`Provider ${config.provider} does not support TTS`);
  }

  return provider.synthesize(text, {
    model: config.model,
    voice: config.voice, // z.B. ElevenLabs Voice-ID
    ...options,
  });
}
```

### Image Generation

```typescript
// _shared/ai-service/services/image.ts

export async function generateImage(
  userId: string,
  prompt: string,
  options?: Partial<ImageOptions>,
): Promise<ImageResponse> {
  const settings = await getUserSettings(userId);
  const config = settings.features.image_generation;

  const provider = getProvider(config.provider, {
    apiKey: settings.api_keys[config.provider],
  });

  if (!provider.capabilities.image || !provider.generateImage) {
    throw new Error(
      `Provider ${config.provider} does not support image generation`,
    );
  }

  return provider.generateImage(prompt, {
    model: config.model,
    ...options,
  });
}
```

### Video Generation

```typescript
// _shared/ai-service/services/video.ts

export async function generateVideo(
  userId: string,
  prompt: string,
  options?: Partial<VideoOptions>,
): Promise<VideoResponse> {
  const settings = await getUserSettings(userId);
  const config = settings.features.video_generation;

  const provider = getProvider(config.provider, {
    apiKey: settings.api_keys[config.provider],
  });

  if (!provider.capabilities.video || !provider.generateVideo) {
    throw new Error(
      `Provider ${config.provider} does not support video generation`,
    );
  }

  return provider.generateVideo(prompt, {
    model: config.model,
    ...options,
  });
}

// Video-Generierung ist asynchron → Status-Check
export async function getVideoStatus(
  userId: string,
  videoId: string,
): Promise<VideoResponse> {
  const settings = await getUserSettings(userId);
  const config = settings.features.video_generation;

  const provider = getProvider(config.provider, {
    apiKey: settings.api_keys[config.provider],
  });

  return provider.getVideoStatus!(videoId);
}
```

### Embeddings

```typescript
// _shared/ai-service/services/embeddings.ts

export async function createEmbedding(
  userId: string,
  text: string,
  options?: Partial<EmbeddingOptions>,
): Promise<EmbeddingResponse> {
  const settings = await getUserSettings(userId);
  const config = settings.features.assistant_embeddings;

  const provider = getProvider(config.provider, {
    apiKey: settings.api_keys[config.provider],
  });

  if (!provider.capabilities.embeddings || !provider.createEmbedding) {
    throw new Error(`Provider ${config.provider} does not support embeddings`);
  }

  return provider.createEmbedding(text, {
    model: config.model,
    ...options,
  });
}

// Helper: Ähnlichkeit berechnen
export function cosineSimilarity(a: number[], b: number[]): number {
  // Cosine Similarity Implementation
}
```

---

## Feature-Konfiguration

### Default Configuration

```typescript
// _shared/ai-service/config/settings.ts

export const DEFAULT_FEATURE_CONFIG = {
  assistant_chat: {
    provider: "openai",
    model: "gpt-4o-mini",
  },
  assistant_embeddings: {
    provider: "openai",
    model: "text-embedding-3-small",
  },
  creative_gym: {
    provider: "openai",
    model: "gpt-4o",
  },
  image_generation: {
    provider: "openai",
    model: "dall-e-3",
  },
  audio_stt: {
    provider: "openai",
    model: "whisper-1",
  },
  audio_tts: {
    provider: "elevenlabs",
    model: "eleven_multilingual_v2",
    voice: "21m00Tcm4TlvDq8ikWAM", // Rachel
  },
  video_generation: {
    provider: "openrouter",
    model: "runway-gen3",
  },
};
```

### User Override

User können pro Feature einen anderen Provider/Model wählen:

```typescript
// UI-Beispiel: Settings Page

// Tab 1: API Keys
const apiKeys = {
  openai: "sk-...",
  anthropic: "sk-ant-...",
  elevenlabs: "xi-...",
};

// Tab 2: Feature Configuration
const features = {
  assistant_chat: {
    provider: "anthropic", // ← User wählt Claude
    model: "claude-3-5-sonnet-20241022",
  },
  creative_gym: {
    provider: "deepseek", // ← User wählt DeepSeek (billiger)
    model: "deepseek-chat",
  },
  audio_tts: {
    provider: "elevenlabs",
    model: "eleven_multilingual_v2",
    voice: "21m00Tcm4TlvDq8ikWAM",
  },
  // ... andere Features bleiben auf Default
};
```

### Validation

```typescript
// Feature-Config validieren
function validateFeatureConfig(
  feature: string,
  config: FeatureConfig,
): boolean {
  // 1. Provider existiert?
  if (!PROVIDER_CAPABILITIES[config.provider]) {
    return false;
  }

  // 2. Provider unterstützt Feature?
  const capabilityMap = {
    assistant_chat: "text",
    assistant_embeddings: "embeddings",
    creative_gym: "text",
    image_generation: "image",
    audio_stt: "audio_stt",
    audio_tts: "audio_tts",
    video_generation: "video",
  };

  const capability = capabilityMap[feature];
  return PROVIDER_CAPABILITIES[config.provider][capability];
}
```

---

## Migration

### Datenhaltung: Assistant-Routen in `scriptony-ai` (2026)

Die HTTP-Pfade `/ai/*` (Chat, Konversationen, RAG-Sync, Token-Zähler, Legacy-Chat-Settings) werden von **`scriptony-ai`** bedient. Die eingebundenen Handler nutzen weiterhin **`requestGraphql`** und dieselben Collections wie zuvor (`ai_chat_settings`, `ai_conversations`, `ai_chat_messages`, `rag_sync_queue`). Die **`scriptony_ai`**-Datenbank (`api_keys`, `feature_config`) bleibt der Ort für Provider-Keys und Feature-Routing in der Integrations-UI.

**Optional (später):** Chat-Preferences und Konversationen in `scriptony_ai` konsolidieren und die GraphQL-Schicht dort schrittweise reduzieren — erst sinnvoll, wenn Migration und Backfill geklärt sind.

### Schritt 1: Datenbank

Neue Collections in Appwrite:

```
scriptony_ai (Database)
├── api_keys          ← User API Keys
├── feature_config    ← Feature-Zuweisung
└── user_settings     ← User Settings (optional, für zukünftige Features)
```

### Schritt 2: API-Keys migrieren

```typescript
// Migration Script

// Alt: Environment Variables
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// Neu: User-spezifische Keys
await databases.createDocument("scriptony_ai", "api_keys", "unique()", {
  user_id: "system",
  provider: "openai",
  api_key: OPENAI_API_KEY,
});
```

### Schritt 3: Functions refactoren

#### scriptony-assistant

```typescript
// VORHER
import { chat } from "./ai/chat";

export async function handleChat(req: Request) {
  const response = await chat(messages, model);
  return response;
}

// NACHHER
import { chat } from "../_shared/ai-service";

export async function handleChat(req: Request) {
  const userId = await getUserId(req);
  const response = await chat(userId, messages, "assistant_chat");
  return response;
}
```

#### scriptony-audio

```typescript
// VORHER: Direkter Whisper-Call
export async function transcribeAudio(audioUrl: string) {
  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    },
  );
  return response.json();
}

// NACHHER: Über AI-Service
import { transcribe } from "../_shared/ai-service";

export async function transcribeAudio(userId: string, audioUrl: string) {
  return await transcribe(userId, audioUrl);
}
```

---

## API-Endpunkte

### scriptony-ai (NEU)

```
GET  /                              ← Health Check + Docs
GET  /health                        ← Health Check

GET  /providers                     ← Alle Provider auflisten
GET  /providers/:id/models          ← Modelle für Provider
POST /providers/:id/validate         ← API-Key validieren

GET  /api-keys                      ← User's API Keys (maskiert)
POST /api-keys                      ← API Key speichern
DELETE /api-keys/:provider          ← API Key löschen

GET  /features                      ← Feature-Konfiguration
PUT  /features/:feature             ← Feature konfigurieren

GET  /settings                      ← Alle Settings kombiniert
PUT  /settings                      ← Alle Settings updaten
```

### scriptony-gym (NEU)

```
GET  /                              ← Health Check + Docs
GET  /health                        ← Health Check

GET  /exercises                     ← Übungen auflisten (filter: category, difficulty)
GET  /exercises/:id                 ← Übungsdetails
POST /exercises/:id/complete        ← Übung abschließen

GET  /progress                      ← User-Fortschritt
GET  /achievements                  ← Achievements
GET  /categories                    ← Kategorien
GET  /daily                         ← Daily Challenge

POST /ai/generate                   ← AI-generierte Übung
POST /ai/feedback                   ← AI-Feedback auf Submission
POST /ai/suggest                    ← Personalisierte Vorschläge
```

### scriptony-assistant (REFACTORED)

```
# Bestehende Endpoints bleiben gleich
GET  /ai/settings                   ← Refactored: Nutzt AI-Service
POST /ai/validate-key               ← Refactored: Nutzt AI-Service
GET  /ai/models                      ← Refactored: Nutzt AI-Service
POST /ai/chat                        ← Refactored: Nutzt AI-Service
```

---

## Datenbankschema

### api_keys Collection

```json
{
  "$id": "unique()",
  "user_id": "string",
  "feature": "string", // assistant_chat, image_generation, assistant_embeddings, … (required for new writes)
  "provider": "string", // openai, anthropic, google, etc.
  "api_key": "string",
  "$createdAt": "datetime",
  "$updatedAt": "datetime"
}
```

Unique identity per user: `(user_id, feature, provider)`. Legacy rows without `feature` are treated as migration candidates until backfilled.

### Pflicht: Attribut `feature` anlegen und Migration ausführen

Ohne das Attribut schlagen neue `createDocument`-Aufrufe fehl; ohne Migration laufen alte Zeilen nur über den Legacy-Fallback im Code.

**Empfohlen (CLI / ein Befehl):** Schema per **Appwrite Server API** (`node-appwrite`, gleiche Lib wie im Backend) — ohne separate **Appwrite CLI** (`appwrite` Binary), die hier nicht im Repo liegt und zusätzlich Login/Projektkontext bräuchte.

1. **`scriptony-ai`** deployen (enthält die Key-Logik).
2. **Env:** Skripte lesen **Repo-Root `.env.local`** (und optional `.env.migration`). `VITE_APPWRITE_ENDPOINT` / `VITE_APPWRITE_PROJECT_ID` werden automatisch auf `APPWRITE_*` gemappt, falls gesetzt. **`APPWRITE_API_KEY`** muss in `.env.local` stehen (oder per `export`) — **nie** als `VITE_*` (kein Secret im Frontend).

   | Variable              | Hinweis                                |
   | --------------------- | -------------------------------------- |
   | `APPWRITE_ENDPOINT`   | aus `VITE_APPWRITE_ENDPOINT` möglich   |
   | `APPWRITE_PROJECT_ID` | aus `VITE_APPWRITE_PROJECT_ID` möglich |
   | `APPWRITE_API_KEY`    | nur Server; in Console erzeugen        |
   | `AI_DATABASE_ID`      | optional; Standard ist `scriptony_ai`  |

   **Neue Umgebung:** Fehlt die Datenbank `scriptony_ai` oder die Collections `api_keys` / `feature_config`, einmal aus dem Repo-Root ausführen:

   ```bash
   npm run appwrite:bootstrap-scriptony-ai
   ```

   (Legt DB, Attribute und Indizes per Server-API an; idempotent.)

3. **Alles in einem** (Attribut `feature` anlegen, auf `available` warten, dann Legacy-Dokumente setzen):

   ```bash
   npm run appwrite:setup:api-keys-feature
   ```

   (Wechselt intern nach `functions` und führt `setup:api-keys-feature` aus.)

   Einzeln, falls nötig:
   - Nur Schema: `cd functions && npm run appwrite:ensure-api-keys-feature`
   - Nur Datenmigration: `cd functions && npm run migrate:api-keys-feature`

**Fallback (Console):** Databases → **`scriptony_ai`** → **`api_keys`** → Attribut **`feature`** (String, z. B. 128 Zeichen, optional bis zur Migration). Optional Index **Composite** auf `user_id`, `feature`, `provider`.

Das Datenmigrationsskript setzt bei allen Dokumenten ohne `feature` den Wert **`assistant_chat`**.

### feature_config Collection

```json
{
  "$id": "unique()",
  "user_id": "string",
  "feature": "string", // assistant_chat, creative_gym, etc.
  "provider": "string", // openai, anthropic, etc.
  "model": "string", // gpt-4o-mini, claude-3-5-sonnet, etc.
  "voice": "string?", // Optional, für TTS
  "$createdAt": "datetime",
  "$updatedAt": "datetime"
}
```

---

## Testing

### Provider Tests

```typescript
// tests/providers/openai.test.ts

import { OpenAIProvider } from "../../_shared/ai-service/providers/openai";

Deno.test("OpenAI chat returns valid response", async () => {
  const provider = new OpenAIProvider("test-api-key");
  const response = await provider.chat([{ role: "user", content: "Hello" }], {
    model: "gpt-4o-mini",
  });

  assertEquals(response.content, "Hello! How can I help you?");
  assertEquals(response.model, "gpt-4o-mini");
});
```

### Service Tests

```typescript
// tests/services/text.test.ts

import { chat } from "../../_shared/ai-service/services/text";

Deno.test("Text service uses correct provider", async () => {
  const response = await chat(
    "test-user",
    [{ role: "user", content: "Hello" }],
    "assistant_chat",
  );

  // Mock getUserSettings to return OpenAI config
  assertEquals(response.model, "gpt-4o-mini");
});
```

---

## Offene TODOs

### Phase 1: Core ✅

- [x] `_shared/ai-service/` Struktur erstellen
- [x] Provider Interface definieren
- [x] 8 Provider implementieren
- [x] 6 Services implementieren
- [x] Config Management
- [x] Model Registry

### Phase 2: Functions

- [x] `scriptony-ai/` erstellen
- [x] `scriptony-gym/` erstellen
- [x] `scriptony-image/` erstellen
- [x] `scriptony-video/` erstellen
- [x] `scriptony-assistant/` refactor
- [x] `scriptony-audio/` refactor

### Phase 3: Datenbank

- [x] Appwrite Collections erstellen (`scriptony_ai` DB existiert)
- [x] Migration Script für API-Keys (`migrate-ollama-provider-ids.mjs`)
- [x] Default Settings für User (über `scriptony-ai` Control Plane)

### Phase 4: Frontend

- [x] Settings UI: Tab 1 (API Keys) — `AIIntegrationsSection` + `FeatureProviderCard`
- [x] Settings UI: Tab 2 (Feature Config) — Feature-Drafts in `AIIntegrationsSection`
- [x] Provider-Auswahl pro Feature — Ollama-Collapse + Mode-Toggle
- [x] Model-Auswahl pro Feature — `FeatureModelPicker` mit Discovery
- [x] Validierung (Key → Provider aktivieren) — Key-Management in `FeatureProviderCard`

### Phase 5: Testing & Docs

- [x] Unit Tests für Provider (110 Vitest-Tests, siehe `src/lib/__tests__/`)
- [x] Integration Tests für Services (Integration-Smoke-Tests für alle 7 Feature-Bereiche)
- [x] API Documentation (`docs/AI-SERVICE-API.md`)
- [x] User Guide für Settings (`docs/AI-SETTINGS-USER-GUIDE.md`)

---

## Nächste Schritte

1. **API Documentation** — Endpunkte und Provider-Vertrag dokumentieren
2. **User Guide für Settings** — How-to für KI-Einstellungen
3. **`model-discovery.test.ts`** von Deno nach Vitest migrieren

---

## Fragen & Diskussion

### API-Key Storage

**Option A**: Plaintext in Appwrite (mit Appwrite Encryption)

```typescript
// Einfach, aber weniger sicher
api_key: "sk-..."; // Appwrite verschlüsselt automatisch
```

**Option B**: Custom Encryption

```typescript
// Mehr Kontrolle, aber komplexer
api_key: await encrypt(apiKey, userKey);
```

**Empfehlung**: Option A (Appwrite Encryption reicht für MVP)

### Fallback Strategy

Was passiert wenn Provider-Call fehlschlägt?

**Option A**: Error zurückgeben
**Option B**: Fallback auf anderen Provider
**Option C**: Retry mit Exponential Backoff

**Empfehlung**: Option A + C (Error + Retry, kein Fallback)

### Rate Limiting

**Wo implementieren?**

- Provider-Level (jeder Provider throttlet selbst)
- Service-Level (zentrales Rate Limiting)
- Beides

**Empfehlung**: Beides (Provider haben eigene Limits + zentrales Tracking)

---

## Fazit

Dieser Refactor zentralisiert die AI-Integration und ermöglicht:

1. **Flexibilität** - User wählen Provider/Model pro Feature
2. **Wartbarkeit** - Eine Stelle für AI-Logik
3. **Erweiterbarkeit** - Neuer Provider = 1 Datei
4. **Testbarkeit** - Provider isoliert testbar
5. **Kostenkontrolle** - Günstige Models für einfache Tasks

---

**Stand**: 2025-04-05  
**Branch**: `feature/ai-service-refactor`  
**Nächster Meilenstein**: Phase 2 (Functions)
