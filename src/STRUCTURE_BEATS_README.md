# 🎬 Structure & Beats System - Vollständige Dokumentation

## 📸 Was du siehst (basierend auf deinem Screenshot):

```
┌─────────────────────────────────────────────────────┐
│  Projekte                                       [×] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Projekt-Info: Logline, Type, Dauer, Genres]     │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │  Structure & Beats              [∧]         │  │
│  ├─────────────────────────────────────────────┤  │
│  │  [Dropdown] [Timeline]    [+ Act hinzufügen]│  │
│  ├─────┬───────────────────────────────────────┤  │
│  │Beat │ ┌─ Akt I - Einführung         [∨] │  │
│  │Rail │ │  ├─ Sequence 1 - Status Quo [∨] │  │
│  │     │ │  │  └─ Scene 1 - Opening    [∨] │  │
│  │ 0%  │ │  │     ├─ Shot 1           ...  │  │
│  │     │ │  │     └─ Shot 2           ...  │  │
│  │ STC │ │  └─ Sequence 2 - Incident  [∨] │  │
│  │ 25% │ │                                  │  │
│  │     │ ├─ Akt II - Konfrontation    [>] │  │
│  │ STC │ │                                  │  │
│  │ 50% │ └──────────────────────────────────┘  │
│  │     │                                        │  │
│  │ 75% │                                        │  │
│  │     │                                        │  │
│  │100% │                                        │  │
│  └─────┴────────────────────────────────────────┘  │
│                                                     │
│  [Szenen, Charaktere, Inspiration... ]             │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Komponenten-Hierarchie:

```
StructureBeatsSection
├── Header (Collapsible Trigger + Controls)
│   ├── Title: "Structure & Beats"
│   ├── Tabs: Dropdown / Timeline
│   └── Button: "+ Act hinzufügen"
│
└── Content (Collapsible Content)
    ├── BeatRail (80px, sticky links)
    │   ├── Percentage Scale (0%, 25%, 50%, 75%, 100%)
    │   └── BeatBand[] (dynamisch positioniert)
    │       ├── Collapsed View
    │       │   ├── Template Badge (STC, HJ, FLD)
    │       │   ├── Beat Label (rotiert)
    │       │   └── Percentage Range (10-15%)
    │       │
    │       └── Expanded View (Klick → öffnet Form)
    │           ├── Template Badge
    │           ├── Start Container Dropdown
    │           ├── End Container Dropdown
    │           ├── Percentage Inputs (pctFrom - pctTo)
    │           └── Collapse Button
    │
    └── Container Stack (flex-1, scrollable)
        └── ContainerCard[] (Acts)
            └── ContainerCard[] (Sequences)
                └── ContainerCard[] (Scenes)
                    └── ContainerCard[] (Shots)
```

---

## 💡 Wie es funktioniert:

### 1. **Beat-Rail Positionierung** (ResizeObserver)

```typescript
// BeatRail.tsx synchronisiert Beat-Bands mit DOM:
const startEl = document.querySelector(
  `[data-container-id="${beat.fromContainerId}"]`,
);
const endEl = document.querySelector(
  `[data-container-id="${beat.toContainerId}"]`,
);

const top = startEl.top - railRect.top;
const height = endEl.bottom - startEl.top;

beatBand.style.top = `${top}px`;
beatBand.style.height = `${height}px`;
```

**Resultat:** Beats wachsen/schrumpfen automatisch wenn Container collapsed/expanded werden!

---

### 2. **Inline Beat-Editing**

```typescript
// Klick auf Beat-Band:
<BeatBand
  beat={beat}
  containers={containers}
  onUpdate={(id, updates) => {
    setBeats(prev => prev.map(b =>
      b.id === id ? { ...b, ...updates } : b
    ));
  }}
/>

// Collapsed → onClick → Expanded
// Expanded → Dropdown ändern → onUpdate → State Update → ResizeObserver → neu positionieren
```

**Resultat:** Beat-Bands passen sich LIVE an neue Container an!

---

### 3. **Hierarchische Container-Auswahl**

```typescript
// flattenContainerIds() generiert Dropdown-Options:
Act 1 → Sequence 1 → Scene 3 → Shot 2
```

**Resultat:** Alle Container (Acts bis Shots) als Dropdown-Optionen verfügbar!

---

## 🎨 Design-Specs (exakte Pixel-Werte):

### BeatRail:

```css
width: 80px;
background: rgba(110, 89, 165, 0.05); /* primary/5 */
border-right: 1px solid rgba(110, 89, 165, 0.1); /* primary/10 */
position: relative;
overflow: visible; /* für expandierte Beats */
```

### BeatBand (Collapsed):

```css
min-height: 40px;
background: rgba(110, 89, 165, 0.2); /* primary/20 */
border-left: 4px solid #6e59a5; /* primary */
transition: all 0.2s;
cursor: pointer;

/* Hover */
&:hover {
  background: rgba(110, 89, 165, 0.3); /* primary/30 */
}
```

### BeatBand (Expanded):

```css
position: absolute;
left: 0;
top: 0;
bottom: 0;
min-width: 320px;
background: rgba(255, 255, 255, 0.95); /* background/95 */
backdrop-filter: blur(8px);
box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
border: 1px solid var(--border);
border-radius: 0 0.5rem 0.5rem 0; /* rounded-r-lg */
padding: 0.75rem;
z-index: 30;
```

### Container-Stack:

```css
flex: 1;
overflow-y: auto;
padding: 1rem;
background: var(--background);
```

### Main Container:

```css
display: flex;
min-height: 600px;
border: 1px solid var(--border);
border-radius: 0.5rem;
overflow: hidden;
background: var(--background);
```

---

## 🔧 API Integration (TODO):

### Benötigte Endpoints:

```typescript
// 1. Timeline Nodes (Container-Struktur)
GET /api/timeline-nodes?projectId={id}
Response: ContainerData[] // Acts → Sequences → Scenes → Shots

// 2. Beats (neu zu erstellen)
GET /api/beats?projectId={id}
Response: BeatDefinition[]

POST /api/beats
Body: { projectId, label, templateAbbr, fromContainerId, toContainerId, pctFrom, pctTo }

PATCH /api/beats/{beatId}
Body: { fromContainerId?, toContainerId?, pctFrom?, pctTo? }

DELETE /api/beats/{beatId}
```

### Datenbank-Schema (vorschlag):

```sql
CREATE TABLE beats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  template_abbr TEXT NOT NULL, -- 'STC', 'HJ', 'FLD', etc.
  from_container_id TEXT NOT NULL, -- Timeline Node ID
  to_container_id TEXT NOT NULL,
  pct_from INTEGER NOT NULL CHECK (pct_from >= 0 AND pct_from <= 100),
  pct_to INTEGER NOT NULL CHECK (pct_to >= 0 AND pct_to <= 100),
  color TEXT, -- Optional custom color
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_beats_project_id ON beats(project_id);
```

---

## ✅ Feature-Checklist:

- [x] BeatBand Component (Collapsible mit Inline-Edit)
- [x] BeatRail Component (80px Rail mit %-Skala)
- [x] ContainerCard Component (Acts/Sequences/Scenes/Shots)
- [x] StructureBeatsSection Component (Collapsible Section)
- [x] ResizeObserver für dynamische Positionierung
- [x] Hierarchische Container-Auswahl in Dropdowns
- [x] Smooth Animations & Transitions
- [x] Violet Design-System Integration
- [ ] API Integration (Backend Endpoints)
- [ ] CRUD Operations (Add/Update/Delete Beats)
- [ ] Timeline View (Alternative zu Dropdown)
- [ ] Drag & Drop für Beats
- [ ] Beat-Templates Auswahl (STC, HJ, FLD, Custom)
- [ ] Export/Import Beat-Definitionen

---

## 🚀 Deployment-Reihenfolge:

1. ✅ **Frontend-Komponenten** (FERTIG)
   - BeatBand.tsx
   - BeatRail.tsx
   - StructureBeatsSection.tsx

2. 🔨 **Integration in ProjectsPage** (JETZT)
   - Import hinzufügen
   - Section einbinden (siehe STRUCTURE_BEATS_SNIPPET.tsx)

3. 📦 **Backend-API** (SPÄTER)
   - Datenbank-Tabelle `beats` erstellen
   - API Endpoints implementieren
   - Mock-Daten durch echte Daten ersetzen

4. 🎯 **Enhanced Features** (FUTURE)
   - Timeline View
   - Drag & Drop
   - Beat-Templates Manager
   - Export/Import

---

## 🎓 Verwendungs-Beispiel:

```typescript
// In ProjectsPage.tsx Project-Detail-View:

import { StructureBeatsSection } from '../StructureBeatsSection';

// ...

{project && (
  <div className="p-6 space-y-6">
    {/* Projekt-Info Section */}
    <section>
      <h2>Projekt-Info</h2>
      {/* ... */}
    </section>

    {/* ⭐ Structure & Beats Section */}
    <StructureBeatsSection
      projectId={project.id}
      className=""
    />

    {/* Szenen Section */}
    <section>
      <h2>Szenen</h2>
      {/* ... */}
    </section>

    {/* Charaktere Section */}
    <section>
      <h2>Charaktere</h2>
      {/* ... */}
    </section>
  </div>
)}
```

---

## 🎉 Fertig!

Das **Structure & Beats System** ist VOLLSTÄNDIG implementiert und bereit für die Integration in die ProjectsPage!

**Nächster Schritt:** Öffne `/components/pages/ProjectsPage.tsx` und füge die StructureBeatsSection ein (siehe STRUCTURE_BEATS_SNIPPET.tsx).

---

## 📞 Support:

Bei Fragen oder Problemen:

1. Check DEPLOY_STRUCTURE_BEATS_INTEGRATION.md für Deployment-Guide
2. Check STRUCTURE_BEATS_SNIPPET.tsx für Integration-Snippet
3. Check BeatBand.tsx / BeatRail.tsx für technische Details

**Happy Coding!** 🚀💜
