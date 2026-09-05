# Scriptony

![Scriptony Logo](src/assets/scriptony-logo.png)

Das offene Produktionssystem für Filme, Serien, Bücher und Hörbücher.

[Getting Started](#getting-started) • [Was Scriptony kann](#was-scriptony-kann) • [Für Entwickler](#für-entwickler) • [Tech Stack](#tech-stack)

---

## Was ist Scriptony?

Scriptony ist ein **offenes Produktionssystem** für Drehbuchautoren, Autoren, Regisseure und Medienproduktionsteams. Statt zwischen Final Draft, Notion, Figma, Blender und Excel hin- und herzuspringen, vereint Scriptony die gesamte Pipeline in einem einzigen Workspace.

Vom ersten Logline bis zum finalen Shot — alles in einer Anwendung, alles auf deinem eigenen Server.

### Für die Story

- Drehbuch-Editor mit Block-Struktur (Scene Heading, Action, Dialogue, Narration, Sound Effect)
- Buch-Editor mit Kapitelhierarchie
- Hörbuch-Stereo-Timeline mit Voice-Casting und Aufnahmesessions

### Für die Produktion

- Shot-Listen mit Kamera-Notation (Angle, Movement, Framing, Lens)
- Timeline mit Clips, Spuren und Ripple-Editing
- 2D Stage mit Puppet-Layer und Style-Guide-System
- 3D Stage mit Render-Jobs

### Für das Worldbuilding

- Welten, Orte, Kulturen, Zeitrechnung
- Charaktere mit Traits, Beziehungen, Avatar und Voice-Casting
- Lore-Items mit Bildern und Beschreibungen

### Für die Kreation

- Integrierter KI-Assistant, der dein Projekt kennt
- TTS (Text-to-Speech) für Dialoge
- STT (Speech-to-Text) für Transkription
- Bildgenerierung (OpenAI, Midjourney, Stability)
- Creative Gym mit Kreativübungen

---

## Was Scriptony kann

### ✅ Jetzt nutzbar

| Feature                  | Beschreibung                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| **Film-Projekt**         | Drehbuch-Editor, Shots, Clips, Beat-Timeline, Charaktere, Worldbuilding, Style-Guide     |
| **Serien-Projekt**       | Staffel-/Episoden-Struktur, sonst identisch zu Film                                      |
| **Buch-Projekt**         | Buch-Editor mit Kapitelhierarchie, Lesedauer-Timeline, Konzeptblöcke                     |
| **Hörbuch-Projekt**      | Stereo-Audio-Timeline, Voice-Casting, Aufnahmesessions, TTS (Voicebox lokal, Kokoro Fallback) |
| **Projektstruktur**      | Hierarchische Knoten: Akt → Sequenz → Szene → Shot → Clip (Film) / Kapitel (Buch)        |
| **Story Beats**          | Lite-7, Save the Cat (15 Beats), Hero's Journey (12), Syd Field (3-Act), Seven Point (7) |
| **Narrative Struktur**   | 3-Akt, 4-Akt, 5-Akt (Theater), 3-Teilig (Buch)                                           |
| **Charaktere**           | Erstellen, Traits (JSON), Avatar, Beziehungen, Zuordnung zu Szenen und Shots             |
| **Worldbuilding**        | Welten, Kategorien (Orte, Kulturen, Zeiten), Items mit Bildern                           |
| **KI-Assistant**         | Projekt-Kontext-Chat, Konversationsspeicher, RAG-Synchronisation                         |
| **Creative Gym**         | Kreativübungen, Daily Challenge, Fortschritt, Achievements                               |
| **TTS (Text-to-Speech)** | OpenAI, ElevenLabs, Google, Ollama — mit Voice-Liste und Preview                         |
| **STT (Speech-to-Text)** | Whisper-basiert, Batch-Transkription                                                     |
| **Bildgenerierung**      | OpenAI DALL-E, Midjourney, Stability, Google Imagen                                      |
| **Stage 2D**             | Layer-basierte 2D-Bühne, Puppet-Layer, Render-Jobs (Accept/Reject/Complete)              |
| **Style-Guide**          | Project Visual Style (Palette, Keywords, Typografie), Style-Items mit Bildern            |
| **Projekt-Export**       | JSON oder PDF (Scriptony-styled), mit nativem Share auf unterstützten Geräten            |
| **Blender-Bridge**       | Addon (Legacy + Extension), Metadaten-Ingress, Export-Adapter                            |
| **Self-Hosted Auth**     | Registrierung, Login, OAuth, JWT, Sessions via Appwrite                                  |

### 🚧 In Entwicklung

| Feature                        | Status                                                        | Beschreibung                                                                              |
| ------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Asset-Management** (T05/T06) | Schema deployed, API in Entwicklung                           | Zentrale Asset-Metadaten per Owner/Purpose-Matrix                                         |
| **Audio-Produktion** (T08)     | Sessions + Tracks stabil, Mixing/Orchestration in Entwicklung | Preview-Mix, Export als Job                                                               |
| **Video-Generierung**          | API ready, keine Frontend-Route                               | Runway, Pika, OpenAI Sora                                                                 |
| **Stage 3D**                   | API stabil, UI in Entwicklung                                 | Three.js / Babylon.js View-State                                                          |
| **ARGUS**                      | Konzeptphase                                                  | Semantische Projekt-Suche, Impact-Analyse, Lore-Guard (siehe `docs/scriptony-argus-*.md`) |
| **Collaboration** (T21)        | Konzeptphase                                                  | Projektfreigabe, Rollen, Organisationen/Workspaces                                        |
| **Externer Storage** (T20)     | Konzeptphase                                                  | Google Drive, Dropbox, OneDrive OAuth                                                     |

### 🎭 Projekttypen im Detail

**Film**

- Story-Editor (Blocks: Scene Heading, Action, Dialogue, Narration, Stage Direction, Sound Effect)
- Shot-Liste mit Kamera-Notizen
- Video-Clip-Timeline
- Beat-Struktur: Optional Lite-7, Save the Cat, Hero's Journey, Syd Field, Seven Point
- Hieararchie: Act → Sequence → Scene → Shot → Clip

**Serie**

- Wie Film, mit Staffel- und Episoden-Ebene
- Staffel-Engine: Beat-Templated pro Episode

**Buch**

- Nativer Buch-Editor mit Kapitelhierarchie
- Lesedauer-Schätzung (WPM, Seitenzählung)
- Keine Shots/Clips, dafür Konzeptblöcke (Hook, Kernhaken)
- Keine Bild-/Video-Uploads

**Hörbuch**

- Stereo-Audio-Timeline pro Szene
- Voice-Casting: Charakter → Sprecher → TTS-Stimme
- Aufnahmesessions pro Szene
- Audio-Tracks zuordnen

---

## Getting Started

### Desktop-App (Endnutzer)

Lade die neueste **macOS / Windows / Linux**-Version:

**[Scriptony Desktop — Download](https://iamthamanic.github.io/scriptony-multihost/)**

Release Notes & alle Assets: [GitHub Releases](https://github.com/iamthamanic/scriptony-multihost/releases/latest)

Nach der Erstinstallation prüft die App automatisch auf Updates (**Einstellungen → System**). Maintainer-Release-Prozess: [`docs/DESKTOP_RELEASE.md`](docs/DESKTOP_RELEASE.md).

### Voraussetzungen (Entwicklung)

- Node.js ≥ 18
- Docker (für Self-Hosted Backend)

### 1. Repository klonen und installieren

```bash
git clone https://github.com/iamthamanic/scriptony-multihost.git
cd scriptony-multihost
npm install
cd functions && npm install && cd ..
```

### 2. Lokales Backend (optional)

```bash
# Appwrite starten (Docker)
npm run docker:appwrite:up
npm run docker:appwrite:verify
```

Ansonsten: Appwrite Cloud nutzen.

### 3. Env-Variablen

```bash
cp .env.local.example .env.local
```

### 4. Schema und Buckets provisionieren

```bash
# Schema (Collections + Attribute + Indexes)
npm run appwrite:provision:schema

# Storage-Buckets
npm run appwrite:provision:buckets
```

### 5. Functions deployen

```bash
# Mindestens diese für Basis-Betrieb:
npm run appwrite:deploy:ai
npm run appwrite:deploy:assistant
npm run appwrite:deploy:auth
npm run appwrite:deploy:projects
npm run appwrite:deploy:script
npm run appwrite:deploy:shots
npm run appwrite:deploy:style
npm run appwrite:deploy:stage
npm run appwrite:deploy:audio
npm run appwrite:deploy:image
npm run appwrite:deploy:mcp

# Weitere nach Bedarf:
npm run appwrite:deploy:clips
npm run appwrite:deploy:gym
npm run appwrite:deploy:worldbuilding
npm run appwrite:deploy:stage2d
npm run appwrite:deploy:stage3d
npm run appwrite:deploy:sync
npm run appwrite:deploy:jobs
```

### 6. Domains synchronisieren

```bash
npm run appwrite:sync:function-domains
```

### 7. Frontend starten

```bash
npm run dev
```

Öffne [http://localhost:5173](http://localhost:5173).

### Verifizierung

```bash
npm run verify:test-env
npm run verify:functions-cli
npm run verify:parity
npm run smoke:user-flows
```

---

## Fürs lokale Hoster & Docker

- `infra/appwrite/docker-compose.yml` startet Appwrite mit MariaDB 10.11, Redis 7.2.4 und Traefik auf Port 8080
- Port `:8080` ist die Appwrite-Console und API
- `APPWRITE_API_KEY` braucht Scopes: `databases.read`, `databases.write`, `storage.read`, `storage.write`, `functions.read`, `functions.write`

Self-Hosted-Anleitung ausführlich: [`docs/SELF_HOSTING.md`](docs/SELF_HOSTING.md)

---

## Für Entwickler

**Desktop (Standard):** [`docs/DESKTOP_FIRST_DEV.md`](docs/DESKTOP_FIRST_DEV.md) — `npm run dev:desktop`, lokale `.scriptony`-Projekte, ohne Appwrite im Alltag. Architektur (3 Achsen): [`docs/ARCHITECTURE_LOCAL_CLOUD.md`](docs/ARCHITECTURE_LOCAL_CLOUD.md), Feature-Matrix Lokal/Cloud/API: [`docs/FEATURE_LOCAL_CLOUD_MATRIX.md`](docs/FEATURE_LOCAL_CLOUD_MATRIX.md), Domänen-Glossar: [`docs/DOMAIN_GLOSSAR.md`](docs/DOMAIN_GLOSSAR.md). Agent-Regeln: [`AGENTS.md`](AGENTS.md). Cloud/Docker: [`docs/GETTING_STARTED.md`](docs/GETTING_STARTED.md).

### Projektstruktur

```
scriptony-multihost/
├── src/                    # React + Vite Frontend
│   ├── backend/local/      # SQLite Source of Truth (Desktop)
│   ├── backend/appwrite/   # Web Cloud Backend
│   ├── backend/sync/       # Per-project Cloud activation (T40)
│   ├── capabilities/       # Feature capability registry
│   ├── components/         # Pages + UI-Komponenten
│   ├── hooks/              # React Hooks (Business Logik, keine direkten API-Calls in UI)
│   ├── lib/api/            # Facades (UI imports only this)
│   ├── lib/api-adapter/    # dispatchByRuntime + *-local.ts
│   ├── lib/                # API-Layer, Types, Utils, Auth, Templates
│   ├── modules/            # Feature-Module (creative-gym, scriptony-ai)
│   └── engines/            # Stage 2D (Konva), Stage 3D (Three.js/Babylon.js)
├── functions/              # Appwrite Functions (Hono, Node.js)
│   ├── _shared/            # Auth, HTTP, DB, Storage Adapter
│   ├── scriptony-*/        # Domain-Functions (siehe Domain Map unten)
│   └── tools/              # Provisioning-Skripte
├── infra/appwrite/         # docker-compose.yml, .env
├── docs/                   # Architektur-Dokumentation
├── scripts/                # Deploy, Verify, Build
└── local-bridge/           # Blender Bridge Server
```

### Backend Domain Map

Welche Function für was zuständig ist: [`docs/backend-domain-map.md`](docs/backend-domain-map.md)

### Wichtige Dev-Commands

```bash
# Desktop (empfohlen)
npm run dev:desktop      # Tauri + Vite (Port 3000 nur für WebView/HMR)
npm run build:desktop    # Installer lokal bauen
npm run release:desktop:check  # Version-Sync + Release-Checkliste vor Tag app-v*

# Cloud / Full stack
npm run dev              # Docker Appwrite + Bridge + Vite
npm run dev:vite         # Browser, remote Appwrite

# Code-Checks (laufen automatisch beim Push)
npm run lint             # ESLint
npm run typecheck        # TypeScript (tsc --noEmit)
npm run format:check     # Prettier
npm run test             # Vitest

# ECC quality gate (Standard vor Commit/PR)
@ecc-check                # verify + review-ticket + AgentShield (Skill)
npm run verify           # Deterministisch: Format + Lint + TS + Test + Build (+ Functions)
npm run verify:frontend  # Nur Frontend/Desktop

# Legacy full gate (Appwrite deploy / Release)
npm run checks           # Shim: inkl. optionaler Legacy-Checks (ohne AI Review)

# Appwrite local
npm run docker:appwrite:up     # Starten
npm run docker:appwrite:down   # Stoppen
npm run appwrite:provision:schema
npm run appwrite:provision:buckets

# Funktionen deployen
npm run appwrite:deploy:ai       # ... und weitere deploy:* Scripts

# Blender Addon
npm run addon:zip:all      # Legacy + Extension bauen

# Verifizierung
npm run verify:test-env
npm run verify:functions-cli
npm run smoke:user-flows
```

### Coding Conventions

- **Max 300 Zeilen** pro Datei, max 150 Zeilen pro Komponente
- **Keine rohen `fetch` zu Appwrite** in Komponenten — alles über `${src/lib/api/}`
- **React Query** für Server-State, Hooks für Business-Logik
- **Tailwind CSS** für Styling, keine hartkodierten Farben
- **Radix UI** für interaktive Komponenten
- **Zod** für Input-Validierung in Backend-Routen
- **Kein `any`** in TypeScript — `unknown` + Type Guards bei Bedarf

---

## Tech Stack

| Layer         | Technologie                                                                   |
| ------------- | ----------------------------------------------------------------------------- |
| **Frontend**  | React 18, Vite, TypeScript 5, Tailwind CSS, Radix UI, TipTap, Konva, Three.js |
| **State**     | React Query (TanStack), React Hook Form                                       |
| **Mobile**    | Capacitor (iOS & Android)                                                     |
| **Backend**   | Appwrite (Auth, Databases, Storage), 25+ Hono-Funktionen                      |
| **Functions** | Hono, Zod, node-appwrite, esbuild (→ `index.js`)                              |
| **Database**  | MariaDB 10.11 (Appwrite Databases) + Redis 7.2.4 (Caching)                    |
| **AI**        | OpenAI, Anthropic, Google, DeepSeek, OpenRouter, Ollama, ElevenLabs           |
| **DevOps**    | Docker Compose, Vitest, `@ecc-check` / `npm run verify`, ECC AgentShield      |

---

## Dokumentation

| Dokument                                                                                                     | Zweck                                    |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| [`docs/SELF_HOSTING.md`](docs/SELF_HOSTING.md)                                                               | Docker, VPS, Hetzner                     |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)                                                                   | Env-Variablen, Vercel, Domains           |
| [`docs/backend-domain-map.md`](docs/backend-domain-map.md)                                                   | Functions, Datenmodelle, Zuständigkeiten |
| [`docs/scriptony-architecture-refactor-tickets.md`](docs/scriptony-architecture-refactor-tickets.md)         | Aktuelle Refactor-Phasen T00–T21         |
| [`functions/README.md`](functions/README.md)                                                                 | Deploy, Provisioning, Env-Vars           |
| [`docs/scriptony-argus-assistant-extension-concept.md`](docs/scriptony-argus-assistant-extension-concept.md) | ARGUS: Semantische Suche, Impact-Analyse |

---

## Mobile

iOS und Android über Capacitor:

```bash
npm run cap:sync
npm run cap:open:ios
```

---

## Blender Addon

```bash
npm run addon:zip:all
```

In Blender: _Edit → Preferences → Add-ons → Install from Disk_ → `scriptony_blender_addon.zip` oder `scriptony_blender_extension.zip` wählen.

---

## Recent changes

<!-- Agents: append newest line first (max 10). See .cursor/readme-contract.md -->

- **2026-08-10** — Desktop Workspace-Gate verdrahtet: `FirstRunWorkspaceGate` + Settings → Speicher → Lokal; Projekt-Create mit `restoreWorkspaceScope` und klarer Fehlermeldung (local desktop)
- **2026-07-14** — Structure Timeline Film (#51): Clip/Musik/SFX als Row-Pairs; parallele Film-Label-Spalte entfernt (local desktop) DAW-Lanes als Row-Pairs (Header, jede Spur sidebar+content, Footer) statt paralleler Label-/Scroll-Listen (local desktop)
- **2026-07-14** — MVE line render instruct (#59): `compilePerformanceInstruct` kombiniert Voice-Identity + LineDirection; Voicebox `/generate` erhält `instruct` für designed/cloned Profile (local desktop)
- **2026-07-14** — MVE Voice Materialize (#57): `POST /voice-design/materialize`, WAV → Projekt-Asset, Voicebox Qwen Base Clone, `MveVoiceProfile` Identity-Felder (local desktop)
- **2026-07-14** — MVE voice design casting (#58): Voice Studio preview/save via Qwen `VoiceCreationAdapter`; keine Voicebox-`designed`-Preview-Profile mehr (local desktop)
- **2026-07-14** — MVE Qwen VoiceDesign Provider (#56): lokaler Sidecar (Port 3767), `VoiceCreationAdapter.generateCandidates`, `POST /voice-design/generate` (local desktop)
- **2026-07-14** — MVE Voice Identity Pipeline (#55): `MveVoiceProfile` um `creationMode`, `provider`, `model`, Identity-/Clone-Asset-Felder; SQLite v8; `VoiceCreationAdapter` + Registry; Voicebox ohne `supportsVoiceGenerationFromPrompt` (local desktop)
- **2026-07-12** — MVE Dialog-Audio: Audiolänge ersetzt WPM im Header bei gebundenem Clip; Waveform-Peaks beim Upload/Record persistiert (local desktop)
- **2026-07-12** — Voicebox Auto-Start auf macOS für Charakterstimmen-Vorschau + aktualisierte Banner-Copy (local desktop)
- **2026-07-12** — MVE Dialog-Clips: kompakte Lane (210px), scrollbarer Text, WPM-/Audio-Dauer-Chips, Contenteditable-Editor mit Tag-Chips (local desktop, #49)

---

## Lizenz

Scriptony ist Open Source unter der [MIT License](LICENSE).

**Hinweis zu Third-Party-Lizenzen:**

- Appwrite (Server): BSD-3-Clause
- Redis Stack (Vektor-Search-Module): SSPL (Server Side Public License) — für Self-Hosted unproblematisch, bei SaaS-Angeboten bitte prüfen

---

_Built for storytellers, by storytellers._
