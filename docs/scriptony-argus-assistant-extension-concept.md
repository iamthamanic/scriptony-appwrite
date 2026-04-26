Konzept: Scriptony ARGUS
Codename: ARGUS (Omniscient Narrative Engine)
Vision: „The Assistant with a Hundred Eyes.“
Ziel: Totale Projekt-Awareness und Multi-Dokument-Synchronisation für komplexes Storytelling.

1. Kontext & Vision
In der Softwareentwicklung ist Code logisch strikt. In der Erzählung ist Logik „weich“, aber ebenso kritisch. Scriptony Argus überträgt die Architektur von Cursor composer auf die kreative Arbeit. Argus liest nicht nur Text; Argus versteht die kausalen Ketten eines Projekts. Wenn ein Auge (der User) auf ein Detail blickt, blicken die anderen 99 Augen von Argus auf die Konsequenzen im gesamten restlichen Projekt.

2. Problemstellung (Die blinden Flecken)
Narrative Kurzsichtigkeit: Standard-KIs haben ein begrenztes Kontextfenster. Sie vergessen Fakten aus Kapitel 1, wenn sie an Kapitel 10 schreiben.
Fragmentierung: Charaktere, Orte und Szenen liegen in separaten Appwrite-Collections. Änderungen werden nicht automatisch kaskadiert.
Lore-Erosion: Je länger ein Projekt dauert, desto öfter widerspricht die KI den eigenen etablierten Weltregeln, was zu massivem manuellem Korrekturaufwand führt.

3. Die Lösung: Scriptony Argus
Argus fungiert als aktive Schicht zwischen dem LLM und der Appwrite-Datenbank, realisiert durch ein internes MCP (Model Context Protocol).
Die drei Säulen von Argus:
- **Argus-Sight (Global Indexing):** Permanente Analyse aller Dokumente via Vektor-Embeddings und strukturierter Metadaten-Extraktion.
- **Argus-Plan (Impact Analysis):** Ein Tool, das vor jeder Aktion die „Domino-Effekte“ im Projekt berechnet – inklusive eines **Revision-Pre-Checks**, der sicherstellt, dass geplante Änderungen noch auf dem aktuellen Dokumentenstand basieren.
- **Argus-Hand (Multi-File Refactoring):** Die Fähigkeit, über MCP Diffs für beliebig viele Dokumente gleichzeitig vorzuschlagen.

Zusätzlich fungiert der **Argus-Lore-Guard** als Narrativ-Linter: Ähnlich ESLint für Code durchsucht er laufend Textentwürfe auf Inkonsistenzen gegenüber etablierter Lore und zeigt Warnungen in der UI an, ohne den Schreibfluss zu blockieren.

4. Vergleich: Cursor vs. Scriptony Argus
Feature	Cursor (Software)	Scriptony Argus (Narrative)
Erkennung	Tree-sitter (Parsing von Code)	Semantic Sitter (Parsing von Drama & Lore)
Referenz	Definitionen & Symbole	Entities (Wer ist wo mit wem?)
Änderung	cmd+K / Composer	Argus-Refactor (Plot-Änderungen kaskadieren)
Validation	Unit Tests / Linter	Lore-Guard (Logik-Checks gegen das Welt-Wiki)

5. User Journey
Der Intent: Der User schreibt im Assistant: "Ändere den Tatort von der Waldhütte in den schicken Nachtclub 'Argus' und pass alle Hinweise in den vorherigen Kapiteln an."
Argus-Scan: Über das MCP-Tool argus_impact_analyzer scannt das System das Projekt.
Der Report: Argus antwortet: "Ich habe 3 betroffene Szenen und 2 Lore-Einträge gefunden. Soll ich die Änderungen für den Nachtclub-Kontext generieren?"
Review-Phase: Der User sieht in der UI eine Liste von Änderungen. Er klickt auf ein Kapitel und sieht die alte Waldhütten-Beschreibung rot gestrichen und die neue Nachtclub-Atmosphäre grün hinzugefügt.
Execution: Ein Klick auf "Sync Universe" schreibt alle Änderungen via MCP in die entsprechenden Appwrite-Dokumente.

6. Architektur: Die "Augen" von Argus

A. Der Daten-Layer (Appwrite)
Argus nutzt Appwrite nicht nur als Speicher, sondern als Graph-Datenbank. Jedes Dokument hat Relationen:
Scene -> belongs_to -> Location
Character -> appears_in -> Scene

B. Das MCP-Tool: argus_impact_analyzer
Dieses Tool ist das Gehirn. Es wird im internen MCP-Server von Scriptony definiert:

code
TypeScript
// MCP Tool Definition
{
  name: "argus_impact_analyzer",
  description: "Berechnet die Auswirkungen einer Plot- oder Faktenänderung auf das gesamte Projekt.",
  parameters: {
    type: "object",
    properties: {
      change_description: { type: "string" }, // Was soll geändert werden?
      target_entities: { type: "array", items: { type: "string" } } // Welche Charaktere/Orte sind der Fokus?
    },
    required: ["change_description"]
  },
  handler: async (args) => {
    // 1. Vektor-Suche in Redis Stack für semantische Treffer
    // 2. Graph-Abfrage für relationale Treffer (z.B. alle Szenen an Ort X)
    // 3. Rückgabe einer Impact-Liste
    return {
      files_to_edit: [...],
      logic_conflicts: ["In Szene 5 regnet es, Clubs haben aber meist keine Außenwirkung durch Wetter..."]
    };
  }
}

C. Die drei Säulen im Stack
- Argus-Sight: Embedding-Indexer + Redis Stack Vector Search
- Argus-Plan: MCP Tool Registry + Appwrite-Relation-Orchestration
- Argus-Hand: Diff/Patch API über `scriptony-script` + `scriptony-worldbuilding`

---

## 7. Tech-Stack & Infrastruktur

### 7.1 Prinzip: Write-Through Indexing
Appwrite bleibt die einzige Source of Truth. Redis Stack ist ein semantischer Such-Index daneben.

```
┌─────────────────┐         ┌─────────────────────────────┐
│  Appwrite DB    │         │  Redis Stack (RediSearch +│
│  (MariaDB)      │         │   Vector Similarity Search) │
│                 │         │                             │
│  scripts        │────┐    │  ┌───────────────────────┐  │
│  script_blocks  │    │    │  │ key: argus:block_001  │  │
│  characters     │────┼────┼──│   embedding: […]      │  │
│  world_items    │    │    │  │   text: "Dialog…"     │  │
│  scenes         │────┘    │  │   project_id: "p1"    │  │
│                 │         │  │   entity_type: "block"│  │
│  ⇧ SOURCE OF    │         │  │   entity_id: "blk_1"  │  │
│    TRUTH        │         │  └───────────────────────┘  │
└─────────────────┘         └─────────────────────────────┘
          │
          │ Events / Queue
          ▼
┌───────────────────────────┐
│   scriptony-rag-indexer   │  (Appwrite Function / Worker)
│   - Chunking              │
│   - Embedding Generation  │
│   - Redis Upsert          │
└───────────────────────────┘
```

### 7.2 Docker-Konfiguration

Das bestehende `redis`-Service-Image im `infra/appwrite/docker-compose.yml` wird auf `redis/redis-stack-server` angehoben. Redis Stack ist vollständig kompatibel mit Redis Core, behält alle Appwrite-Queues/Caches bei und ergänzt RediSearch + Vector Search.

```yaml
# Infra: redis wird zu Redis Stack (kein zusätzlicher Container)
redis:
  image: redis/redis-stack-server:latest
  volumes:
    - redis_data:/data
  ports:
    - "6379:6379"
```

**Hinweis:** Appwrite 1.8.1 nutzt Redis intern für Queues und Caching. Das Image-Upgrade beeinflusst bestehende Appwrite-Funktionalität nicht. Redis Stack aktiviert die Vector-Search-Module transparent.

### 7.3 Embedding-Provider

Der Provider wird über die bestehende Feature-Config aufgelöst (siehe `AI-SERVICE-API.md`, Key `assistant_embeddings`):

| Provider | Modell | Kosten | Latenz | Fallback |
|----------|--------|--------|--------|----------|
| OpenAI | `text-embedding-3-small` | Gering (<$0.02/1M tokens) | ~200-500ms | Ja (Default) |
| Ollama (lokal) | `bge-m3` | Kostenlos | ~500-2000ms | Ja |
| DeepSeek | DeepSeek Embeddings | Sehr gering | ~300-800ms | Optional |

Für Self-Hosting ohne API-Keys wird Ollama `bge-m3` als Fallback empfohlen (bereits im Repo via `scripts/rag-start.sh` etabliert).

Env-Var (verbindlich):
- `ARGUS_EMBEDDING_PROVIDER` (default: `openai`)
- `ARGUS_EMBEDDING_MODEL` (default: `text-embedding-3-small`)
- `ARGUS_REDIS_URL` (default: `redis://redis:6379`)

---

## 8. Datenfluss & Indexing-Pipeline

### 8.1 Trigger-Mechanismen

| Phase | Mechanismus | Beschreibung |
|-------|-------------|--------------|
| **Initial-Füllung** | On-Demand / CLI | `npm run argus:index -- --projectId=x` indexiert ein Projekt manuell |
| **Delta-Updates** | Appwrite Events / Queue | `rag_sync_queue` (bestehende Collection) nimmt Änderungen auf; `scriptony-rag-indexer` verarbeitet sie |
| **Lazy-Hydration** | Bei erster ARGUS-Query | Falls ein Projekt noch nicht indexiert ist, wird es im Hintergrund aufgebaut und gecacht |

### 8.2 Chunking-Strategie

Chunking erfolgt **pro Entität**, nicht als Monolith. Das verhindert, dass eine einzelne Änderung das ganze Projekt invalidiert.

| Entität | Chunking | Beispiel |
|---------|----------|----------|
| `script_block` | Pro Block = 1–N Chunks à ~512 Tokens (oder 1500 Zeichen). Bei `content` > 1500 Zeichen: Satz-grenzorientiertes Splitting mit 10% Overlap. | Ein Dialog mit 3000 Zeichen → 2 Chunks |
| `character` | Bio + Traits je 1 Chunk. Reference-Images werden als separate Keywords-Chunks indexiert. | Charakterprofil = 1 Chunk |
| `world_item` | Body-Text (XL-Feld) wie `script_block`. Titel separat als Keyword-Chunk. | Welt-Eintrag = 1 Chunk |
| `scene` | `summary` als eigenes Chunk. `name` als Keyword-Chunk. | Szene = 1 Chunk |

> **V2-Index-Schema (Phase 2+):** Nach dem Chunking kann eine optionale Enrichment-Stufe semantische Metadaten wie `sentiment` (z. B. `positive`, `negative`, `neutral`, `tense`) und `tone` (z. B. `romantic`, `aggressive`, `mysterious`) extrahieren. Dies ermöglicht später hybride Abfragen nach Stimmungsverlauf, aber sie ist für den MVP nicht erforderlich – die Grundarchitektur bleibt identisch und das Schema in Redis kann nachträglich mit neuen TAG-Feldern erweitert werden.

### 8.3 Upsert-Workflow

```
Appwrite Document Changed
  │
  ▼
Enrichment: Extrahiere "project_id", "entity_type", "entity_id", Text
  │
  ▼
Delete Old Chunks: `FT.DEL` / `HDEL` für `argus:<entity_type>:<id>:*` in Redis
  │
  ▼
Chunking: Zerlege Text in Sätze/Paragraph-Chunks
  │
  ▼
Batch Embedding: Sammle Chunks in Batches (z. B. 20–50 pro Request für OpenAI,
                 Ollama-Limit beachten) und generiere Embeddings parallel.
  │
  ▼
Upsert: `HSET argus:<entity_type>:<id>:<chunk_idx> ...`
```

### 8.4 Event-Driven vs. Polling

Für die MVP-Phase nutzt `scriptony-rag-indexer` ein Polling-Muster über `rag_sync_queue.status = 'pending'`. Langfristig wird dies auf Appwrite Events migriert, sobald die Self-Hosted-Instanz Events zuverlässig liefert.

---

## 9. Vector-Datenmodell (Redis Stack)

### 9.1 Redis Search Index

```
FT.CREATE argus_idx ON HASH
  PREFIX 1 argus:
SCHEMA
  project_id    TAG SORTABLE
  entity_type   TAG SORTABLE
  entity_id     TAG
  chunk_index   NUMERIC SORTABLE
  text          TEXT WEIGHT 1.0
  revision      NUMERIC SORTABLE
  embedding     VECTOR FLAT
    6
    DIM 1536
    DISTANCE_METRIC COSINE
    TYPE FLOAT32
DIALECT 2
```

**Bei Skalierung auf >100k Chunks:** `FLAT` wird zu `HNSW` gewechselt (deutlich schneller, mehr RAM):
```
embedding VECTOR HNSW 12 DIM 1536 DISTANCE_METRIC COSINE TYPE FLOAT32 M 40 EF_CONSTRUCTION 100 EF_RUNTIME 80
```

### 9.2 Document Schema pro Hash

| Redis-Feld | Typ | Beschreibung |
|------------|-----|--------------|
| `project_id` | TAG | Filter: Nur eigene Projekte |
| `entity_type` | TAG | `script_block`, `character`, `world_item`, `scene`, `timeline_node` |
| `entity_id` | TAG | Appwrite `$id` der Original-Entität |
| `chunk_index` | NUMERIC | 0, 1, 2… falls ein Dokument gesplittet wird |
| `sentiment` | TAG | *(V2, Phase 2+)* Stimmungsklasse des Chunks |
| `tone` | TAG | *(V2, Phase 2+)* Tonlage des Chunks |
| `text` | TEXT | Der reine Text-Chunk (RediSearch Fulltext-Index) |
| `revision` | NUMERIC | Appwrite-Dokument-Revision, damit Delta-Updates prüfbar sind |
| `embedding` | VECTOR | Float32-Array, Dimension 1536 (OpenAI) oder 1024 (bge-m3) |

### 9.3 Key-Naming

```
argus:<entity_type>:<entity_id>:<chunk_index>

Beispiel:
argus:script_block:6623a...:0
argus:script_block:6623a...:1
argus:character:77b1c...:0
```

### 9.4 Query-Muster

```
# Semantische Suche (Argus-Sight)
FT.SEARCH argus_idx
  "*=>[KNN 10 @embedding $vec AS score]"
  PARAMS 2 vec <binary-float32>
  FILTER project_id "proj_abc"
  DIALECT 2

# Hybride Suche: Vektor + Textfilter (z.B. nur Szene-Beschreibungen)
FT.SEARCH argus_idx
  "(@entity_type:{scene} @text:(Wald Waldhütte))=>[KNN 5 @embedding $vec AS score]"
  PARAMS 2 vec <binary-float32>
  DIALECT 2
```

---

## 10. MCP Tool-Spezifikationen

Alle Argus-Tools werden über `scriptony-mcp-appwrite` (`POST /invoke`) bereitgestellt und sind in `src/scriptony-mcp/` registriert.

### 10.1 `argus_search` (Argus-Sight)

```ts
{
  name: "argus_search",
  description: "Semantische Suche über alle Projektdokumente (Script, World, Characters).",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", minLength: 1, maxLength: 2000 },
      project_id: { type: "string", pattern: "^[a-z0-9_]+$" },
      entity_types: { type: "array", items: { enum: ["script_block", "character", "world_item", "scene", "timeline_node"] }, default: [] },
      top_k: { type: "number", minimum: 1, maximum: 50, default: 10 }
    },
    required: ["query", "project_id"]
  },
  policy: "read",
  riskLevel: "low",
  requiresApproval: false,
  execute: async (ctx, input) => {
    // 1. canReadProject prüfen
    // 2. Query-Embedding generieren
    // 3. KNN-Suche in Redis Stack
    // 4. Volltexte aus Appwrite ergänzen (optional, für Preview)
    return { matches: [{ entity_type, entity_id, score, text_preview }] };
  }
}
```

### 10.2 `argus_impact_analyzer` (Argus-Plan)

```ts
{
  name: "argus_impact_analyzer",
  description: "Berechnet die Auswirkungen einer Plot- oder Faktenänderung auf das gesamte Projekt.",
  inputSchema: {
    type: "object",
    properties: {
      change_description: { type: "string", minLength: 5, maxLength: 2000 },
      project_id: { type: "string" },
      target_entities: { type: "array", items: { type: "string" } },
      scope: { type: "string", enum: ["lore", "characters", "locations", "all"], default: "all" }
    },
    required: ["change_description", "project_id"]
  },
  policy: "read",
  riskLevel: "medium",
  requiresApproval: false,
  execute: async (ctx, input) => {
    // 1. Semantische Suche über change_description
    // 2. Relationale Traversal über Appwrite ($id -> Foreign Keys)
    // 3. Lore-Regeln gegen relevante Treffer prüfen
    // 4. Pre-Flight Concurrency: Snapshot aktueller Revisionen aller betroffenen Dokumente
    return {
      files_to_edit: [{ collection, document_id, field, reason }],
      expected_revisions: [{ collection, document_id, revision }], // Für Merge-Conflict-Prüfung
      logic_conflicts: ["string"],
      related_entities: [{ type, id, relevance }],
      estimated_complexity: "low" | "medium" | "high"
    };
  }
}
```

**Performance-Regel**: Das Tool orchestriert maximal 10 Appwrite-Queries (siehe T12-Constraint). Das Ergebnis wird in Redis gecacht (`argus:impact:<project_id>:<hash>`) mit TTL 300s.

### 10.3 `argus_lore_guard` (Validation)

```ts
{
  name: "argus_lore_guard",
  description: "Prüft einen Text-Entwurf gegen etablierte Projekt-Regeln und Inkonsistenzen. Fungiert als Linter für Narrative – zeigt Warnungen statt hart zu blockieren.",
  inputSchema: {
    type: "object",
    properties: {
      project_id: { type: "string" },
      proposed_text: { type: "string", maxLength: 50000 },
      entity_id: { type: "string" }, // Optional: Kontext-Entität
      strictness: { type: "string", enum: ["relaxed", "normal", "strict"], default: "normal" }
    },
    required: ["project_id", "proposed_text"]
  },
  policy: "read",
  riskLevel: "low",
  requiresApproval: false,
  execute: async (ctx, input) => {
    // 1. Semantische Suche nach ähnlichen Konzepten im Projekt
    // 2. Widerspruchserkennung (Regel-Engine + Embedding-Similarity)
    return {
      passed: boolean,
      warnings: [{ severity, message, related_entity_id }],
      suggestions: [{ replacement, reason }]
    };
  }
}
```

### 10.4 `argus_apply_patch` (Argus-Hand)

```ts
{
  name: "argus_apply_patch",
  description: "Wendet ein genehmigtes Diff-Set auf mehrere Appwrite-Dokumente an.",
  inputSchema: {
    type: "object",
    properties: {
      project_id: { type: "string" },
      patches: {
        type: "array",
        items: {
          type: "object",
          properties: {
            collection: { type: "string" },
            document_id: { type: "string" },
            field: { type: "string" },
            old_value_fragment: { type: "string" }, // Für idempotente Prüfung
            new_value: { type: "string" },
            origin: { type: "string", default: "argus" }, // Für Traceability
            reason: { type: "string" }
          },
          required: ["collection", "document_id", "field", "new_value"]
        }
      }
    },
    required: ["project_id", "patches"]
  },
  policy: "write",
  riskLevel: "high",
  requiresApproval: true,
  execute: async (ctx, input) => {
    // 1. canEditProject prüfen
    // 2. Concurrency Gate: Prüfe expected_revisions gegen aktuellen Appwrite-Stand.
    //    Bei Abweichung -> Merge Conflict (Patch wird abgelehnt, Nutzer muss neu analysieren).
    // 3. Idempotente Prüfung: old_value_fragment stimmt noch überein?
    // 4. Best-Effort Apply (Appwrite hat keine Multi-Doc-Transaktionen)
    // 5. Origin-Tag in Revision/Metadata schreiben
    // 6. Redis-Index für geänderte Dokumente invalidieren -> Delta-Queue
    return { applied: number, failed: number, results: [{ id, status }] };
  }
}
```

### 10.5 `argus_get_project_state` (Readmodel-Integration)

Kombiniert T12 (`scriptony-editor-readmodel`) mit ARGUS-Insights:

```ts
{
  name: "argus_get_project_state",
  description: "Liefert einen aggregierten Projekt-Zustand inklusive ARGUS-Metadaten (Top-Themen, Charakter-Netzwerk-Graph, aktive Entitäten).",
  inputSchema: schemaProjectId,
  // Intern: Nutzt scriptony-editor-readmodel + Redis-Statistiken
}
```

---

## 11. API-Oberfläche & Frontend-Integration

### 11.1 Primärer Einstieg: MCP (Phase 1)

Der Assistant-Chat ist die Haupt-UI für ARGUS. Alle Befehle laufen über `scriptony-assistant` → `scriptony-mcp-appwrite` (POST `/invoke`). Der Nutzer spricht natürlich mit dem Assistant (z. B. "Was passiert, wenn ich den Boss zum Verräter mache?"), der das passende MCP Tool aufruft.

### 11.2 Direkte REST-Oberfläche (Phase 2+)

Für explizite UI-Features (Argus-Overlay, Lore-Warning-Toast, Diff-Viewer) erhalten folgende Routen dedizierte Hono-Endpunkte in `scriptony-assistant` oder einer separaten ARGUS-Facade:

| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/ai/projects/:projectId/argus/search` | POST | Direkte semantische Suche (für Argus-Panel) |
| `/ai/projects/:projectId/argus/impact` | POST | Impact-Analyse ohne Chat (für Struktur-Tree-View) |
| `/ai/projects/:projectId/argus/lore-guard` | POST | Echtzeit-Validierung eines Textes |
| `/ai/projects/:projectId/argus/diff` | GET | Liste der offenen/vorgeschlagenen Patches |
| `/ai/projects/:projectId/argus/diff/:diffId/apply` | POST | Patches freigeben |

### 11.3 Frontend-Komponenten (React/Vite)

| Komponente | Beschreibung | Phase |
|------------|--------------|-------|
| `ArgusOverlay` | Subtile Badge/Anzeige im Editor, die zeigt, wie viele Dokumente ARGUS aktuell „beobachtet“. | Phase 1 |
| `ArgusSearchPanel` | Seitliches Panel mit semantischer Suche über das Projekt. | Phase 1 |
| `ArgusDiffViewer` | Mehrspaltige Diff-Ansicht (alt vs. neu) ähnlich Git-Diff, aber für Narrative. | Phase 2 |
| `LoreWarningToast` | Orange hervorgehobener Hinweis bei manuellem Schreiben, das Regeln bricht. | Phase 2 |
| `ArgusGraphView` | Visuelle Darstellung von Charakter-Ort-Szenen-Beziehungen (optional, später). | Phase 3 |

**Design-Regel:** Alle Komponenten nutzen bestehende Tailwind/Radix UI Patterns, Loading/Empty/Error States von `src/components/ui`. Kein neues Designsystem.

---

## 12. Sicherheit & Multi-Tenancy

### 12.1 Projekt-Isolation

Redis Stack ist ein **globaler Index**. Jede Query MUSS über `project_id` als Filter gefiltert werden. Die Filterung erfolgt `FT.SEARCH`-seitig (kein clientseitiges Filtern).

```ts
// IN `argus_search` und `argus_impact_analyzer` ENFORCED:
const ok = await canReadProject(userId, input.project_id);
if (!ok) throw new PermissionDeniedError();
// Nur dann wird die Redis-Query mit `FILTER project_id "..."` ausgestattet.
```

**Fehlerhandhabung**, wenn keine `project_id` übergeben wird: **Bad Request 400** (kein Default-Projekt erlaubt).

### 12.2 Embeddings und Datenlecks

Embeddings sind mathematische Repräsentationen von Text. Unter bestimmten Bedingungen ist ein Text aus einem Embedding *annahernd* rekonstruierbar (Model-Inversion-Angriffe). Für ein Self-Hosted-Setup ist das Risiko gering (Daten liegen auf eigenem Server), aber:
- Kein Export von Redis-Hashes mit Embeddings in ungesicherte Backups
- Redis Auth (`requirepass`) oder Unix-Socket-Bindung empfohlen

### 12.3 Permission-Durchgriff (Appwrite → Redis)

Redis hat kein Permission-System. ARGUS vertraut auf den **Gateway-Layer** (`scriptony-assistant`, `scriptony-mcp-appwrite`), dass:
1. Jede eingehende Anfrage ein valides JWT trägt
2. `canReadProject` / `canEditProject` validiert wird
3. Erst dann wird Redis oder Appwrite angefragt

### 12.4 Traceability & Undo

Jede von `argus_apply_patch` durchgeführte Änderung erhält ein `origin: "argus"` Metadata-Tag im Appwrite-Dokument. Dadurch kann eine spätere Admin-/Audit-View ARGUS-Änderungen kennzeichnen.

Das `origin`-Tag wird in einer optionalen Collection `argus_change_log` mit folgendem Schema protokolliert:
- `project_id`, `user_id`, `collection`, `document_id`
- `field`, `old_value_fragment`, `new_value`
- `origin: "argus"`, `approved_at`, `reason`

---

## 13. Performance-Budget & Skalierung

### 13.1 Latenzen

| Operation | Budget | Zielplattform |
|-----------|--------|---------------|
| **Semantic Search (KNN Top-10)** | < 50ms | Redis Stack (in-memory) |
| **Impact Analyzer (Gesamt-Roundtrip)** | < 1500ms | Appwrite-Queries + Redis |
| **Lore Guard (Echtzeit)** | < 800ms | Embedding + KNN + Regelprüfung |
| **Diff Apply** | < 300ms pro Dokument | Appwrite Write |

### 13.2 Embedding-Generierung ist NICHT Teil der Query-Budgets

Das Generieren eines Embeddings über OpenAI oder Ollama dauert **200ms–3s** und ist der teuerste Schritt. Die Abfrage auf Redis ist der schnellste. Deshalb:
- **Pre-computed Embeddings**: Alle Projekt-Dokumente werden vorindexiert.
- **Query-Embeddings** werden bei jeder Suche frisch generiert (unumgänglich, da User-Query variabel).

### 13.3 Caching-Strategie

| Cache-Schlüssel | TTL | Nutzen |
|-----------------|-----|--------|
| `argus:impact:<project_id>:<hash(change_description)>` | 5 Min | Impact-Analyzer-Ergebnisse |
| `argus:state:<project_id>` | 60 Sek | `argus_get_project_state` Lite-Metadaten |
| `argus:embed:<provider>:<hash(text)>` | 24h | Wiederverwendung identischer Texte (z. B. wiederholte Validierung) |

### 13.4 Skalierungsgrenzen

| Grenze | Redis Stack (HNSW, 16GB RAM) | Massnahme |
|--------|------------------------------|-----------|
| Chunks pro Projekt | ~50.000 (ca. >1.000 Szenen mit Dialogen) | Projekt-ID-Partitionierung oder Redis Cluster |
| Projekte pro Instanz | 500+ | Clustering oder separater Redis pro Node |
| Einbettungs-Dimension | 1536 oder 1024 | Provider-Config in `AI-SERVICE-API.md` |
| Cold-Start "erster Scan" | ~3 Sekunden für 100 Dokumente | Hintergrund-Indexing via Queue; Batched Embedding (20–50 Chunks/Request) |

> **Hinweis zum Cold-Start:** Die Angabe von ~3 Sekunden für 100 Dokumente setzt batched Embedding voraus (20–50 Chunks pro parallelem Request). Werden Embeddings seriell generiert, überschreitet der Indexer bei großen Projekten schnell Appwrite-Function-Timeouts. Der Worker muss daher immer batchingfähig sein und bei >500 Dokumenten automatisch in asynchrone Queue-Jobs aufteilen.

---

## 14. Roadmap: Phasen

### Phase 1 — Argus-Sight (MVP)
**Ziel:** Der Assistant findet relevante Stellen im Projekt.

- [ ] Redis Stack in Docker Compose (`infra/appwrite/docker-compose.yml`)
- [ ] `scriptony-rag-indexer` Function: Chunking + Embedding + Upsert
- [ ] MCP Tool `argus_search` registriert in `scriptony-mcp-appwrite`
- [ ] Frontend: `ArgusOverlay` + `ArgusSearchPanel`
- [ ] Delta-Update via `rag_sync_queue` oder Polling

**Akzeptanzkriterien:**
- Semantische Suche über Script + Welt + Charaktere funktioniert im Assistant-Chat.
- Antwortzeit <1.5 Sekunden für Top-10 Treffer (inkl. Embedding-Generierung über Ollama local).
- Index-Invalidierung nach Document-Update funktioniert.

### Phase 2 — Argus-Plan (Impact & Guard)
**Ziel:** Der Assistant berechnet Konsequenzen und wacht über Regeln.

- [ ] MCP Tool `argus_impact_analyzer`
- [ ] MCP Tool `argus_lore_guard`
- [ ] `project_lore_rules` Schema in Appwrite (regelbasierter Guard)
- [ ] Frontend: `ArgusDiffViewer` + `LoreWarningToast`
- [ ] Caching-Strategie in Redis

**Akzeptanzkriterien:**
- "Ändere den Tatort von Waldhütte zu Nachtclub" liefert >80% der betroffenen Szenen korrekt.
- Lore-Guard erkennt Widersprüche zu hinterlegten Regeln mit >70% Precision.
- Keine manuelle Suche im Projekt mehr nötig, um Inkonsistenzen zu finden.

### Phase 3 — Argus-Hand (Multi-File Refactoring)
**Ziel:** Änderungen werden nicht nur vorgeschlagen, sondern als Patches ausgeführt.

- [ ] MCP Tool `argus_apply_patch`
- [ ] Origin-Tagging in Dokument-Revisions
- [ ] Frontend: Genehmigungs-Flow für Patch-Sets ("Apply All" / "Reject All" / "Einzeln reviewen")
- [ ] Audit-Log Collection `argus_change_log`

**Akzeptanzkriterien:**
- Ein Patch-Set mit ≤10 betroffenen Dokumenten wird atomisch-idempotent angewendet.
- Der Nutzer kann alle ARGUS-Änderungen rückgängig machen (Rollbacks via Audit-Log).
- Keine doppelte Wahrheit: Patches schreiben direkt in Appwrite-Collections.

### Phase 4 — Advanced (optional)
- [ ] Realtime-Präsenz: ARGUS überwacht Editor-Eingaben live per WebSocket/Redis PubSub
- [ ] Knowledge-Graph-Visualisierung in der UI (Charakter-Netzwerk)
- [ ] Autonomes Indexing: Appwrite Events statt Polling

---

## 15. Integration mit bestehendem Ticket-System

| Ticket | Verbindung zu ARGUS |
|--------|---------------------|
| **T12** `scriptony-editor-readmodel` | `argus_get_project_state` nutzt denselben Aggregations-Code für Projekt-State; ARGUS fügt nur semantische Statistiken hinzu |
| **T08** Audio Production Orchestration | Audio-Script-Metadaten (z. B. "Szene X hat Audio Y") können später ebenfalls indexiert werden |
| **T19** UI/UX Prüfung | Neue Frontend-Komponenten (`ArgusOverlay`, `ArgusDiffViewer`, `LoreWarningToast`) müssen bestehende Designsystem-Patterns nutzen |
| **T21** `scriptony-collaboration` | `canReadProject` / `canEditProject` ist Pflichtvoraussetzung für alle ARGUS-Tools |
| **T03/T04** `scriptony-script` | `script_blocks` ist die am meisten indexierte Collection; ihr Chunking-Format definiert die ARGUS-Qualität |
| **T16** Observability | ARGUS-Metrics (Query-Latenz, Cache-Hit-Rate, Index-Größe) werden über `scriptony-observability` gemessen |

ARGUS darf NICHT in Phasen eingeführt werden, in denen `scriptony-editor-readmodel` noch nicht stabil läuft (T12), weil der State-Context des Editors die Datengrundlage für ARGUS ist.

---

## 16. Lizenz-Hinweis

Redis Stack wird unter der **Server Side Public License (SSPL)** verbreitet. Für die Verwendung als interner Index innerhalb von Scriptony (Self-Hosted) und für kostenlose Open-Source-Distribution des Gesamtprojekts ist dies unkritisch.

**SaaS-Hinweis:** Werden Scriptony selbst als SaaS-Angebot betrieben (Managed Hosting für Medienfirmen), ist die SSPL-Lage von Redis Stack als eingebetteten Service zu prüfen. Eine zukünftige Migration auf eine Apache-2.0-kompatible Vector-DB (z. B. Qdrant) ist über die `VectorStore`-Abstraktion vorgesehen.

---

## 17. Fazit & Ausblick

Scriptony Argus macht Schluss mit dem "Wiederkäuen" von Informationen. In 3 Monaten (Phase 1–2) wird dieses Konzept es ermöglichen, dass sich der Nutzer auf die kreative Vision konzentriert, während Argus die logische Konsistenz garantiert. Wir bauen hier kein Schreibprogramm, sondern ein Navigationssystem für Phantasie-Welten.
