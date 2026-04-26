<div align="center">

<img src="src/assets/scriptony-logo.png" alt="Scriptony" width="120" />

# Scriptony

**Das offene Produktionssystem für Geschichten.**

Vom ersten Satz bis zum finalen Render — in einem einzigen, selbst hostbaren Workspace.

[🚀 Schnellstart](#schnellstart) • [✨ Features](#was-scriptony-kann) • [🏗 Architektur](#architektur) • [🧑‍💻 Für Entwickler](#für-entwickler)

</div>

---

## 🎬 Was ist Scriptony? (30-Sekunden-Version)

Scriptony ist ein **Open-Source-Produktionssystem** für Autoren, Drehbuchautoren, Regisseure und Medienproduktionsteams. Es vereint:

- 📝 **Script-Editor** (Drehbuch, Buch, Hörspiel)
- 🌍 **Worldbuilding** (Orte, Kulturen, Zeitrechnung, Lore)
- 🎭 **Charakter-System** (Traits, Beziehungen, Voice-Casting)
- 🎬 **Story-Beats & Timeline** (Save the Cat, Hero's Journey, Shot-Listen)
- 🤖 **KI-Assistant** (Chat, TTS/STT, Bild- & Video-Generierung)
- 🎨 **2D/3D Stage & Puppet-Layer** (Storyboard, Style-Guides, Blender-Bridge)

Alles in **einer** Anwendung. Alles **selbst hostbar**. Deine Daten, deine Server, deine KI-Provider.

> *„Vor Scriptony war ich in 7 Tools gleichzeitig: Final Draft, Notion, Photoshop, Blender, Excel, Google Docs und Miro. Jetzt ist alles hier."*

---

## 💔 Die Pain Points, die Scriptony löst

| Ohne Scriptony | Mit Scriptony |
|---|---|
| 🔴 Script in Final Draft, Welt in Notion, Konzept in Miro — alles fragmentiert | 🟢 **Ein Workspace.** Script, Welt, Charaktere, Shots, Assets — alles verknüpft |
| 🔴 "Wie hieß nochmal die Schwester von Protagonist X?" — die KI hat keinen Kontext | 🟢 **ARGUS-Assistant** (in Entwicklung) kennt dein gesamtes Projekt und findet Inkonsistenzen |
| 🔴 Voice-Casting manuell, Audio-Produktion extern, Mixing in einem DAW | 🟢 **TTS/STT + Audio-Sessions** direkt im Projekt — Voice-Casting, Preview-Mix, Export |
| 🔴 Storyboard in Photoshop, Style-Guide in Figma, Render in Blender — Pipeline-Bruch | 🟢 **Stage 2D/3D + Style-Guide + Blender-Bridge** — visuelle Pipeline in einem Tool |
| 🔴 „Ich habe die erste Szene umgeschrieben — wo war das noch relevant?" | 🟢 **Impact-Analyse** (ARGUS) zeigt alle betroffenen Szenen, Charaktere und Lore-Einträge |
| 🔴 Monatliche SaaS-Kosten, Vendor-Lock-in, Daten in der Cloud | 🟢 **Open Source, Self-Hosted.** Läuft auf deinem Laptop, Hetzner-Server oder in der Cloud — du entscheidest |

---

## ✨ Was Scriptony kann

### 📝 Core: Das Fundament jeder Geschichte

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| **Script-Editor** | ✅ Stabil | Drehbuch, Buch, Hörspiel. Blocks mit Typen (Scene Heading, Action, Dialogue, Narration, Sound Effect). Reorder. Node-Zuordnung. |
| **Projekte & Templates** | ✅ Stabil | Film, Serie, Buch, Podcast. Templates (Beat-Struktur, Episode Layout, Season Engine). Drag & Drop. |
| **Story-Beats** | ✅ Stabil | Save the Cat, Hero's Journey, prozentuale Timeline-Position. CapCut-Style Ripple Editing. |
| **Projektstruktur (Nodes)** | ✅ Stabil | Hierarchische Timeline-Nodes (Acts → Sequences → Scenes). Templates pro Projekttyp. |
| **Charaktere** | ✅ Stabil | CRUD, Attribute, Traits (JSON), Avatar, Beziehungen. |
| **Worldbuilding** | ✅ Stabil | Welten, Kategorien (Orte, Kulturen, Zeiten), Items mit Bildern, Beschreibungen. |

### 🎨 Media: Bild, Audio, Video, Stage

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| **Asset-Management** | 🚧 In Entwicklung | Zentrale `assets`-Collection. Upload, Link, Query. Owner/Purpose-Matrix (Projekt-Cover, Shot-Storyboard, Character-Avatar, etc.). |
| **TTS (Text-to-Speech)** | ✅ Stabil | OpenAI, ElevenLabs, Google, Ollama. Voice Discovery. Spricht Script-Blöcke direkt an. |
| **STT (Speech-to-Text)** | ✅ Stabil | Whisper-basiert. Batch-Transkription. |
| **Audio-Sessions** | 🚧 Teils stabil | Voice-Casting pro Charakter, Track-Planung, Mixing-Orchestration (noch Fake-Responses in Teilen, siehe T08). |
| **Bildgenerierung** | ✅ Stabil | OpenAI DALL-E, Midjourney, Stability, Google Imagen. Cover-Generierung, Style-Profile. |
| **Video-Generierung** | 🚧 Deployable | Runway, Pika, OpenAI Sora. Aktuell keine Frontend-Route (API ready, UI fehlt). |
| **Stage 2D** | ✅ Stabil | Layer-basierte 2D-Stage mit Puppet-Layer. Render-Jobs, Accept/Reject/Complete. |
| **Stage 3D** | ✅ Stabil | 3D View-State Endpoints. Three.js/Babylon.js Integration. |
| **Blender-Bridge** | ✅ Stabil | Blender Addon (legacy + extension). Metadaten-Ingress, Export-Adapter. |
| **Style-Profile & Style-Guide** | ✅ Stabil | Puppet-Layer Style Profiles, Project Visual Style (Palette, Keywords, Typo). |

### 🤖 AI: KI-Integration & Assistant

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| **AI-Assistant (Chat)** | ✅ Stabil | Konversationen, Messages, RAG-Sync. Liest Projekt-Kontext. |
| **Provider-Auswahl** | ✅ Stabil | OpenAI, Anthropic, Google, DeepSeek, OpenRouter, Ollama (lokal + cloud). Pro-Feature Provider/Model. |
| **API-Key-Verwaltung** | ✅ Stabil | Per-User, per-Feature, per-Provider. Maskierte Keys. BYOK (Bring Your Own Key). |
| **Creative Gym** | ✅ Stabil | Kreative Übungen, Daily Challenge, Progress, Achievements. |
| **Model-Discovery** | ✅ Stabil | Live-Modell-Liste pro Provider. Ollama lokal + cloud erkennen. |
| **MCP (Model Context Protocol)** | ✅ Stabil | Thin HTTP Host für deterministische Tools. `list_tools` + `invoke`. Project Capabilities (get_project_summary, list_scenes, create_scene, rename_project). |
| **ARGUS (Semantic Search)** | 🔄 Konzeptphase | Vektor-basierte semantische Suche über alle Projektdokumente. Redis Stack als Vector-DB. Impact-Analyse, Lore-Guard, Multi-File Diff. Siehe `docs/scriptony-argus-assistant-extension-concept.md`. |

### 🔧 Platform: Administration, Jobs, Observability

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| **Auth & Account** | ✅ Stabil | Signup, Login, OAuth, JWT, Sessions. Appwrite Auth. |
| **Jobs-System** | 🚧 Konsolidierung | Async Job-Control-Plane. Status, Retry, Cancel. `scriptony-jobs-handler` + Legacy `jobs-handler` werden in T14 konsolidiert. |
| **Observability** | 🚧 Zukunft | Stats + Logs werden zu `scriptony-observability` zusammengeführt (T16). |
| **Admin / Superadmin** | 🚧 Zukunft | `scriptony-superadmin` wird zu `scriptony-admin` (T16). |
| **Collaboration** | 🔄 Konzeptphase | Direkte Projektfreigabe, Rollen (owner/editor/viewer), Organisationen/Workspaces (T21). |
| **Storage-Provider** | 🔄 Konzeptphase | Google Drive, Dropbox, OneDrive, AWS S3 OAuth (T20). |

---

## 🚀 Schnellstart

### Voraussetzungen

- [Node.js](https://nodejs.org/) ≥ 18
- [npm](https://www.npmjs.com/) oder [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) (für Backend)

### 1. Repository klonen

```bash
git clone https://github.com/iamthamanic/scriptony-appwrite.git
cd scriptony-appwrite
```

### 2. Frontend-Abhängigkeiten installieren

```bash
npm install
```

### 3. Umgebungsvariablen einrichten

```bash
# 1. Kopiere das Beispiel
cp .env.local.example .env.local

# 2. Fülle die Werte aus:
# VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1  # oder deine Self-Hosted URL
# VITE_APPWRITE_PROJECT_ID=dein-projekt-id
# VITE_BACKEND_API_BASE_URL=https://deine-functions-domain.com
# VITE_APP_WEB_URL=http://localhost:5173
```

> **Hinweis für Self-Hosted:** Du kannst auch Appwrite lokal in Docker betreiben:
> ```bash
> npm run docker:appwrite:up
> npm run docker:appwrite:verify
> ```
> Dann `VITE_APPWRITE_ENDPOINT=http://127.0.0.1:8080/v1` setzen.

### 4. Appwrite-Schema provisionieren

```bash
# Benötigt APPWRITE_API_KEY in .env.server.local oder Environment
cd functions
npm install
npm run provision-schema
cd ..
```

### 5. Storage-Buckets provisionieren

```bash
npm run appwrite:provision:buckets
```

### 6. Backend-Functions deployen

```bash
# Wichtigste Functions (mindestens diese, damit die App läuft):
npm run appwrite:deploy:ai        # AI Control Plane
npm run appwrite:deploy:assistant  # Chat / Assistant
npm run appwrite:deploy:auth       # Auth / Account
npm run appwrite:deploy:projects   # Projekte
npm run appwrite:deploy:shots      # Shots / Clips
npm run appwrite:deploy:script     # Script Editor
npm run appwrite:deploy:style      # Style Profiles
npm run appwrite:deploy:stage      # Render Jobs
npm run appwrite:deploy:audio      # TTS / STT
npm run appwrite:deploy:image      # Bildgenerierung
npm run appwrite:deploy:mcp        # MCP Tools

# Optional:
npm run appwrite:deploy:video      # Video-Generierung
npm run appwrite:deploy:gym        # Creative Gym
npm run appwrite:deploy:worldbuilding  # Worldbuilding
npm run appwrite:deploy:stage2d    # 2D Stage
npm run appwrite:deploy:stage3d    # 3D Stage
npm run appwrite:deploy:sync       # Blender Bridge
```

### 7. Function-Domains synchronisieren

```bash
# Schreibt die deployten Domains in deine .env.local
npm run appwrite:sync:function-domains
```

### 8. Frontend starten

```bash
npm run dev
```

Öffne [http://localhost:5173](http://localhost:5173).

> **⚠️ Hinweis:** Erstelle einen Account über die Register-Seite oder logge dich ein. Das Frontend kommuniziert direkt mit Appwrite (Auth) und den deployten Functions (Daten).

---

## 🏗 Architektur

Scriptony ist ein **modulares, domain-getriebenes System**. Der Code ist nach Verantwortungsbereichen getrennt — nie gemischte Zuständigkeiten.

```
┌─────────────────────────────────────────┐
│           Frontend (React + Vite)       │
│  React Query  •  Tailwind  •  Radix UI  │
│  TipTap Editor  •  React Router        │
│  Capacitor (iOS/Android)               │
└─────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │    API Gateway         │
        │  (src/lib/api-gateway) │
        └───────────────────────┘
                    │
     ┌──────────────┼──────────────┐
     ▼              ▼              ▼
┌────────┐   ┌──────────┐   ┌──────────┐
│Appwrite│   │ Scriptony│   │  Redis   │
│ Auth   │   │ Functions│   │  Stack   │
│ DB     │   │ (Hono)   │   │(Cache/   │
│Storage │   │          │   │ Vector)  │
└────────┘   └──────────┘   └──────────┘
```

### Kernprinzipien

- **Appwrite = Control Plane.** Auth, User, Databases, Storage. Functions greifen mit Server-API-Key zu — nie direkt aus dem Browser.
- **Functions = Domain Gateway.** Jede Function hat eine eindeutige Verantwortung: `scriptony-script` für Script-Text, `scriptony-audio` für TTS/STT, `scriptony-style` für Style-Profiles.
- **No Business Logic in Components.** Logik lebt in Hooks (`src/hooks/`) oder Services (`src/lib/api/`).
- **Strict TypeScript.** Kein `any`. Klare Interfaces für Props und API-Responses.
- **Checks vor jedem Push.** `npm run checks` läuft über Shimwrappercheck: ESLint, TypeScript, Prettier, Vitest, Vite-Build.

### Backend Domain Map

Eine vollständige Übersicht aller Functions, ihrer Datenmodelle und ihrer Zuständigkeit findest du in [`docs/backend-domain-map.md`](docs/backend-domain-map.md).

### Tech Stack im Detail

| Layer | Technologie |
|-------|-------------|
| **Frontend** | React 18, Vite, TypeScript 5, Tailwind CSS, Radix UI Primitives |
| **State** | React Query (TanStack), React Hook Form |
| **Editor** | TipTap (ProseMirror), Perfect Freehand (Zeichnen) |
| **2D/3D** | Konva, Three.js, Babylon.js |
| **Mobile** | Capacitor (iOS & Android Builds) |
| **Backend** | Appwrite (Auth, Databases, Storage), 25+ Node.js Functions (Hono) |
| **Functions** | Hono (Routing), Zod (Validation), node-appwrite (SDK) |
| **Bundler** | esbuild (pro Function → einzelne `index.js`) |
| **Database** | Appwrite Databases (MariaDB 10.11) + Redis Stack (Cache, Vector Search) |
| **AI** | OpenAI, Anthropic, Google, DeepSeek, OpenRouter, Ollama, ElevenLabs, Whisper |
| **DevOps** | Docker Compose, shimwrappercheck (CI/CD mit AI Review) |

---

## 🧑‍💻 Für Entwickler

### Projektstruktur

```
scriptony-appwrite/
├── src/                    # React Frontend
│   ├── components/         # UI-Komponenten + Pages
│   ├── hooks/              # React Hooks (Business Logik)
│   ├── lib/                # API-Layer, Utils, Types
│   ├── modules/            # Feature-Module (creative-gym, stage, ...)
│   └── engines/            # Stage 2D/3D Engines
├── functions/              # Backend Functions (Appwrite)
│   ├── _shared/            # Primitive Infrastruktur, Typen, Auth
│   ├── scriptony-*/        # Domain-Functions (siehe Domain Map)
│   └── tools/              # Provisioning-Skripte
├── infra/                  # Docker Compose (Appwrite, MariaDB, Redis Stack)
├── docs/                   # Architektur-Dokumentation, Tickets, Konzepte
├── scripts/                # Deploy-, Verify-, Build-Skripte
└── local-bridge/           # Blender Bridge Server
```

### Häufige Befehle

```bash
# Entwicklung
npm run dev              # Frontend + Vite DevServer
npm run dev:vite         # Nur Vite (ohne Bridge)

# Code-Qualität
npm run lint             # ESLint (Frontend)
npm run typecheck        # TypeScript Compiler (noEmit)
npm run format:check     # Prettier Check
npm run test             # Vitest Unit Tests

# Full Gate (muss passen, bevor du pushst)
npm run checks           # Shimwrappercheck: lint + typecheck + format + test + build + AI Review
npm run checks:frontend  # Nur Frontend-Checks
npm run checks:backend   # Nur Backend-Checks

# Appwrite
npm run docker:appwrite:up     # Starte lokale Appwrite-Instanz
npm run docker:appwrite:down   # Stoppe Appwrite
npm run appwrite:provision:schema   # Schema provisionieren
npm run appwrite:provision:buckets  # Storage Buckets erstellen
npm run appwrite:deploy:ai        # AI Function deployen
# ... weitere deploy:* Befehle siehe package.json

# Blender Addon
npm run addon:zip:all      # Beide ZIPs bauen (legacy + extension)

# Verifizierung
npm run verify:test-env           # Env-Variablen prüfen
npm run verify:functions-cli      # Functions Health-Check
npm run verify:parity             # Parity-Check Frontend/Backend
npm run smoke:user-flows          # Smoke Tests
```

### Weiterführende Dokumentation

| Dokument | Für wen |
|----------|---------|
| [`docs/ENTWICKLER_HANDBUCH.md`](docs/ENTWICKLER_HANDBUCH.md) | Neue Entwickler: KISS, DRY, SOLID, Verzeichnis-Landkarte |
| [`docs/SOURCE_OF_TRUTH.md`](docs/SOURCE_OF_TRUTH.md) | Architektur-Vertrag: Wer kommuniziert wie mit wem |
| [`docs/backend-domain-map.md`](docs/backend-domain-map.md) | Alle Functions, Datenmodelle, Zuständigkeiten |
| [`docs/scriptony-architecture-refactor-tickets.md`](docs/scriptony-architecture-refactor-tickets.md) | Aktuelle Refactor-Phasen (T00–T21) |
| [`docs/scriptony-argus-assistant-extension-concept.md`](docs/scriptony-argus-assistant-extension-concept.md) | ARGUS: Semantic Search, Impact Analysis, Lore-Guard |
| [`functions/README.md`](functions/README.md) | Backend-Details: Deploy, Provisioning, Env-Vars |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Produktions-Deployment, Vercel, Domain-Setup |
| [`docs/SELF_HOSTING.md`](docs/SELF_HOSTING.md) | Eigenes Hosting (Hetzner, VPS, etc.) |
| [`docs/SERVER_ROLLOUT.md`](docs/SERVER_ROLLOUT.md) | Server-Migration, Rollback-Plan |

---

## 📱 Mobile

Scriptony nutzt Capacitor für native iOS- und Android-Builds.

```bash
# iOS
npm run cap:sync
npm run cap:open:ios

# Android
npm run cap:sync
npm run cap:open:android
```

---

## 🎨 Blender Integration

1. `npm run addon:zip:all` baut beide Distributables.
2. In Blender: *Edit → Preferences → Add-ons → Install from Disk*
3. Wähle `scriptony_blender_addon.zip` (legacy) oder `scriptony_blender_extension.zip` (Blender 4.2+)
4. Öffne den *Scriptony*-Tab in der 3D-View Sidebar.
5. Trage deine `Cloud Base URL` und `Integration Token` ein.

Metadaten fließen über `scriptony-sync` in die Blender-Pipeline. Stage-Daten werden über den Export-Adapter ausgegeben.

---

## 🧪 Tests

```bash
# Unit Tests
npm run test

# Spezifischer Test
npx vitest run functions/_shared/ai-service/model-discovery.test.ts

# Smoke Tests (benötigt deployte Functions)
npm run smoke:user-flows
```

---

## 🔒 Sicherheit

- Keine Appwrite-API-Keys oder Secrets werden ans Frontend geleakt. Functions nutzen `APPWRITE_API_KEY` (Server-Only).
- Alle User-Inputs werden mit Zod validiert.
- Permissions: `canReadProject` / `canEditProject` / `canManageProject` (T21: zukünftig Multi-User).
- Self-Hosted = Deine Daten bleiben auf deiner Infrastruktur.

---

## 🗺 Roadmap

| Phase | Thema | Status |
|-------|-------|--------|
| **Phase 0–1** | Inventur, Domain Map, Check-Gates | ✅ Done |
| **Phase 2** | `scriptony-script` — Script als Source of Truth | ✅ Done |
| **Phase 3** | `scriptony-assets` — Zentrale Asset-Verwaltung | 🔜 Todo |
| **Phase 4** | `scriptony-audio-production` — Mixing, Export, Voice-Casting | 🔜 Todo |
| **Phase 5** | `scriptony-audio` — Technische Audio saubern | 🔜 Todo |
| **Phase 6** | `scriptony-image` + `scriptony-assistant` bereinigen | 🔜 Todo |
| **Phase 7** | `scriptony-editor-readmodel` — Editor State Aggregation | 🔜 Todo |
| **Phase 8** | Timeline-Konsolidierung (Shots + Clips) | 🔜 Todo |
| **Phase 9** | `scriptony-jobs` + `scriptony-media-worker` — Worker-Grenze | 🔜 Todo |
| **Phase 10** | Observability + Admin konsolidieren | 🔜 Todo |
| **Phase 11** | Legacy entfernen, Code aufräumen | 🔜 Todo |
| **Laufend** | `_shared` Logik, UI/UX Prüfung, Storage, Collaboration | 🔜 Todo |
| **Vision** | **ARGUS** — Omniscient Narrative Engine (Semantic Search, Impact Analysis, Lore-Guard) | 🔄 Konzept |

---

## 📄 Lizenz

Scriptony ist Open Source unter der [MIT License](LICENSE) (Frontend + Functions).

**Hinweis zu eingesetzter Infrastruktur:**
- **Appwrite** (Server): BSD-3-Clause
- **Redis Stack** (Vector Search): SSPL (Server Side Public License) — für Self-Hosted unproblematisch, für SaaS-Angebote bitte prüfen. Eine Zukunftsmigration auf Apache-2.0-kompatible Vector-DBs (z. B. Qdrant) ist über die `VectorStore`-Abstraktion vorgesehen.

---

<div align="center">

**Built for storytellers, by storytellers.**

[Website](https://scriptony.com) • [Discord](https://discord.gg/scriptony) • [Twitter](https://twitter.com/scriptony)

</div>
