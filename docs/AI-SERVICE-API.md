# AI Service API Documentation

Stand: 2026-04-15

## Übersicht

Scriptony AI besteht aus einem zentralen Control Plane (`scriptony-ai`) und mehreren Feature-Functions. Alle Endpunkte (außer Health) erfordern Authentifizierung (`Authorization: Bearer <jwt>`).

## Control Plane — `scriptony-ai`

### Health

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/` oder `/health` | Health check, keine Auth nötig |

### Provider

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/providers` | Alle Provider mit Capabilities, Display-Namen, `requiresApiKey` |
| GET | `/providers/:provider/models` | Statische Modell-Liste für Provider |
| POST | `/providers/:provider/models/discover` | Live-Modell-Discovery. Body: `{ feature, api_key?, base_url? }` |
| POST | `/providers/:provider/validate` | Key-Validierung. Body: `{ api_key?, base_url?, feature? }` |

### API Keys

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api-keys` | Maskierte API-Keys des Users |
| POST | `/api-keys` | Key speichern. Body: `{ feature?, provider, api_key? }`. `api_key: null` löscht den Key |
| DELETE | `/api-keys/:feature/:provider` | Feature-spezifischen Key löschen |
| DELETE | `/api-keys/:provider` | Provider-Key löschen (optional `?feature=`) |

### Feature Config

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/features` | Alle Feature-Konfigurationen des Users |
| GET | `/features/:feature` | Konfiguration für ein Feature |
| PUT | `/features/:feature` | Feature-Config aktualisieren. Body: `{ provider, model, voice? }` |
| GET | `/features/:feature/runtime` | Runtime-Auflösung (effektiver Provider/Key/Model) |

### Settings

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/settings` | Komplettes Settings-Payload (Features + Keys + Legacy) |
| PUT/POST | `/settings` | Settings aktualisieren. Body kann `features`, `api_keys`, und Legacy-Felder enthalten |

### Routing

| Methode | Pfad | Beschreibung |
|---|---|---|
| POST | `/ai/route-request` | Gateway-Routing-Introspektion. Body: `{ path }` |

---

## Feature-Functions

Alle Feature-Functions nutzen `resolveFeatureRuntime(userId, feature)` aus dem zentralen ai-service, um Provider/Key/Model automatisch aus der User-Konfiguration aufzulösen. Body-Parameter `provider`/`model` werden ignoriert.

### `scriptony-image`

| Methode | Pfad | Beschreibung |
|---|---|---|
| POST | `/ai/image/generate-cover` | Cover-Bild generieren. Body: `{ prompt, projectId? }` |
| POST | `/ai/image/validate-key` | Image-Key validieren. Body: `{ api_key, provider? }` |
| GET/PUT | `/ai/image/settings` | Image-Settings abrufen/aktualisieren |

### `scriptony-assistant`

| Methode | Pfad | Beschreibung |
|---|---|---|
| POST | `/ai/chat` | Chat mit Assistant |
| POST | `/ai/gym/generate-starter` | Creative Gym Starter-Text |
| POST | `/ai/validate-key` | Key validieren |
| GET | `/ai/models` | Modelle auflisten |
| GET/PUT | `/ai/settings` | Assistant-Settings |
| POST | `/ai/conversations` | Konversation starten |
| GET/POST | `/ai/conversations/:id/messages` | Nachrichten einer Konversation |
| POST | `/ai/conversations/:id/prompt` | Prompt senden |

### `scriptony-video`

| Methode | Pfad | Beschreibung |
|---|---|---|
| POST | `/generate` | Video generieren. Body: `{ prompt, duration?, aspect_ratio?, ... }` |
| POST | `/generate/short` | Kurzes Video (5-10s) |
| POST | `/generate/landscape` | Landscape-Video (16:9) |
| POST | `/generate/from-image` | Bild-zu-Video (501 — noch nicht implementiert) |
| GET | `/status/:id` | Generierungs-Status prüfen |

### `scriptony-audio`

| Methode | Pfad | Beschreibung |
|---|---|---|
| POST | `/transcribe` | Audio transkribieren (multipart oder JSON) |
| POST | `/transcribe/url` | URL-basierte Transkription |
| POST | `/transcribe/batch` | Batch-Transkription (max 10) |
| POST | `/synthesize` | Text-to-Speech |

---

## Ollama Provider-Besonderheiten

Ollama hat drei Provider-IDs die im UI auf einen einzigen Eintrag `ollama` kollabiert werden:

| Provider-ID | Modus | Verwendung |
|---|---|---|
| `ollama` | Kanonisch (UI) | Wird im Dropdown angezeigt |
| `ollama_local` | Local | Local Ollama (`http://localhost:11434`) |
| `ollama_cloud` | Cloud | Ollama Cloud (`https://ollama.com`) |

Der UI-Toggle (Lokal/Cloud) bestimmt, welche Runtime-ID beim Speichern verwendet wird. Die Feature-Config speichert immer die kanonische `ollama`, der Modus wird in `user_settings.settings_json.ollama.mode` abgelegt.

---

## Feature-Keys

| Key | Beschreibung | Beispiel-Provider |
|---|---|---|
| `assistant_chat` | Chat/Assistant | OpenAI, Anthropic, Ollama |
| `assistant_embeddings` | Embeddings | OpenAI, DeepSeek |
| `creative_gym` | Creative Gym Starter | OpenAI, Ollama |
| `image_generation` | Bildgenerierung | OpenAI, Ollama, OpenRouter |
| `audio_stt` | Speech-to-Text | OpenAI, Ollama |
| `audio_tts` | Text-to-Speech | ElevenLabs, OpenAI, Ollama |
| `video_generation` | Video-Generierung | OpenRouter, Ollama |