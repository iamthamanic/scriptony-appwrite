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

| Feature | Beschreibung |
|---------|--------------|
| **Film-Projekt** | Drehbuch-Editor, Shots, Clips, Beat-Timeline, Charaktere, Worldbuilding, Style-Guide |
| **Serien-Projekt** | Staffel-/Episoden-Struktur, sonst identisch zu Film |
| **Buch-Projekt** | Buch-Editor mit Kapitelhierarchie, Lesedauer-Timeline, Konzeptblöcke |
| **Hörbuch-Projekt** | Stereo-Audio-Timeline, Voice-Casting, Aufnahmesessions, TTS-Integration |
| **Projektstruktur** | Hierarchische Knoten: Akt → Sequenz → Szene → Shot → Clip (Film) / Kapitel (Buch) |
| **Story Beats** | Lite-7, Save the Cat (15 Beats), Hero's Journey (12), Syd Field (3-Act), Seven Point (7) |
| **Narrative Struktur** | 3-Akt, 4-Akt, 5-Akt (Theater), 3-Teilig (Buch) |
| **Charaktere** | Erstellen, Traits (JSON), Avatar, Beziehungen, Zuordnung zu Szenen und Shots |
| **Worldbuilding** | Welten, Kategorien (Orte, Kulturen, Zeiten), Items mit Bildern |
| **KI-Assistant** | Projekt-Kontext-Chat, Konversationsspeicher, RAG-Synchronisation |
| **Creative Gym** | Kreativübungen, Daily Challenge, Fortschritt, Achievements |
| **TTS (Text-to-Speech)** | OpenAI, ElevenLabs, Google, Ollama — mit Voice-Liste und Preview |
| **STT (Speech-to-Text)** | Whisper-basiert, Batch-Transkription |
| **Bildgenerierung** | OpenAI DALL-E, Midjourney, Stability, Google Imagen |
| **Stage 2D** | Layer-basierte 2D-Bühne, Puppet-Layer, Render-Jobs (Accept/Reject/Complete) |
| **Style-Guide** | Project Visual Style (Palette, Keywords, Typografie), Style-Items mit Bildern |
| **Projekt-Export** | JSON oder PDF (Scriptony-styled), mit nativem Share auf unterstützten Geräten |
| **Blender-Bridge** | Addon (Legacy + Extension), Metadaten-Ingress, Export-Adapter |
| **Self-Hosted Auth** | Registrierung, Login, OAuth, JWT, Sessions via Appwrite |

### 🚧 In Entwicklung

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| **Asset-Management** (T05/T06) | Schema deployed, API in Entwicklung | Zentrale Asset-Metadaten per Owner/Purpose-Matrix |
| **Audio-Produktion** (T08) | Sessions + Tracks stabil, Mixing/Orchestration in Entwicklung | Preview-Mix, Export als Job |
| **Video-Generierung** | API ready, keine Frontend-Route | Runway, Pika, OpenAI Sora |
| **Stage 3D** | API stabil, UI in Entwicklung | Three.js / Babylon.js View-State |
| **ARGUS** | Konzeptphase | Semantische Projekt-Suche, Impact-Analyse, Lore-Guard (siehe `docs/scriptony-argus-*.md`) |
| **Collaboration** (T21) | Konzeptphase | Projektfreigabe, Rollen, Organisationen/Workspaces |
| **Externer Storage** (T20) | Konzeptphase | Google Drive, Dropbox, OneDrive OAuth |

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

### Voraussetzungen

- Node.js ≥ 18
- Docker (für Self-Hosted Backend)

### 1. Repository klonen und installieren

```bash
git clone https://github.com/iamthamanic/scriptony-appwrite.git
cd scriptony-appwrite
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

### Projektstruktur

```
scriptony-appwrite/
├── src/                    # React + Vite Frontend
│   ├── components/         # Pages + UI-Komponenten
│   ├── hooks/              # React Hooks (Business Logik, keine direkten API-Calls in UI)
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
# Entwicklung
npm run dev              # Vite DevServer

# Code-Checks (laufen automatisch beim Push)
npm run lint             # ESLint
npm run typecheck        # TypeScript (tsc --noEmit)
npm run format:check     # Prettier
npm run test             # Vitest

# Full Gate (muß grün sein)
npm run checks           # Lint + TypeCheck + Format + Test + Vite-Build + AI-Review

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

| Layer | Technologie |
|-------|-------------|
| **Frontend** | React 18, Vite, TypeScript 5, Tailwind CSS, Radix UI, TipTap, Konva, Three.js |
| **State** | React Query (TanStack), React Hook Form |
| **Mobile** | Capacitor (iOS & Android) |
| **Backend** | Appwrite (Auth, Databases, Storage), 25+ Hono-Funktionen |
| **Functions** | Hono, Zod, node-appwrite, esbuild (→ `index.js`) |
| **Database** | MariaDB 10.11 (Appwrite Databases) + Redis 7.2.4 (Caching) |
| **AI** | OpenAI, Anthropic, Google, DeepSeek, OpenRouter, Ollama, ElevenLabs |
| **DevOps** | Docker Compose, Vitest, shimwrappercheck (mit AI Review) |

---

## Dokumentation

| Dokument | Zweck |
|----------|-------|
| [`docs/SELF_HOSTING.md`](docs/SELF_HOSTING.md) | Docker, VPS, Hetzner |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Env-Variablen, Vercel, Domains |
| [`docs/backend-domain-map.md`](docs/backend-domain-map.md) | Functions, Datenmodelle, Zuständigkeiten |
| [`docs/scriptony-architecture-refactor-tickets.md`](docs/scriptony-architecture-refactor-tickets.md) | Aktuelle Refactor-Phasen T00–T21 |
| [`functions/README.md`](functions/README.md) | Deploy, Provisioning, Env-Vars |
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

In Blender: *Edit → Preferences → Add-ons → Install from Disk* → `scriptony_blender_addon.zip` oder `scriptony_blender_extension.zip` wählen.

---

## Lizenz

Scriptony ist Open Source unter der [MIT License](LICENSE).

**Hinweis zu Third-Party-Lizenzen:**
- Appwrite (Server): BSD-3-Clause
- Redis Stack (Vektor-Search-Module): SSPL (Server Side Public License) — für Self-Hosted unproblematisch, bei SaaS-Angeboten bitte prüfen

---

*Built for storytellers, by storytellers.*
