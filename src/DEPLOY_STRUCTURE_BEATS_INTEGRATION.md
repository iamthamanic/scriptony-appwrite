# 🎬 Structure & Beats Integration - DEPLOY GUIDE

## ✅ Was wurde implementiert:

### 1. **BeatBand.tsx** - Collapsible Beat mit Inline-Editing

- Collapsed: Kompakter Beat-Band mit Template-Badge, Label, Percentage
- Expanded: Vollständige Edit-Form DIREKT IM BEAT
  - Start Container Dropdown (hierarchisch)
  - End Container Dropdown
  - Percentage Range Inputs (pctFrom - pctTo)

### 2. **BeatRail.tsx** - Lila Beat-Rail mit dynamischer Positionierung

- 80px breite Spalte mit %-Skala
- Rendert BeatBand-Komponenten
- ResizeObserver für dynamische Positionierung

### 3. **ContainerCard.tsx** - Bereits vorhanden

- Collapsible Container mit data-container-id Attribut

### 4. **StructureBeatsSection.tsx** - Neue Collapsible-Section

- Header mit "Structure & Beats" Title
- Dropdown/Timeline Toggle
- Beat-Rail + Container-Stack Layout
- Ready für Integration in ProjectsPage

---

## 📋 Integration in ProjectsPage.tsx

### Schritt 1: Import hinzufügen

Füge oben in `/components/pages/ProjectsPage.tsx` hinzu:

```typescript
import { StructureBeatsSection } from "../StructureBeatsSection";
```

### Schritt 2: Section in Project-Detail-View einfügen

Suche in der Project-Detail-View nach der Stelle, wo die Collapsible-Sections sind (z.B. nach "Inspiration" Section).

Füge die neue Section ein:

```typescript
{/* Structure & Beats Section */}
<StructureBeatsSection
  projectId={project.id}
  className="mb-6"
/>
```

### Empfohlene Position:

- **NACH** der "Projekt-Info" Section (Logline, Duration, etc.)
- **VOR** der "Szenen" Section
- **VOR** der "Charaktere" Section

---

## 🎯 Größenverhältnisse (genau wie im Screenshot)

### BeatRail:

- **Breite:** 80px
- **Background:** `bg-primary/5`
- **Border:** `border-r border-primary/10`

### BeatBand (Collapsed):

- **Min-Height:** 40px
- **Background:** `bg-primary/20`
- **Border-Left:** `border-l-4 border-primary`
- **Hover:** `hover:bg-primary/30`

### BeatBand (Expanded):

- **Min-Width:** 320px
- **Background:** `bg-background/95 backdrop-blur-sm`
- **Shadow:** `shadow-xl`
- **z-index:** 30 (overflows to the right)

### Container-Stack:

- **flex-1** (füllt restlichen Platz)
- **Padding:** `p-4`
- **overflow-y-auto**

### Main Layout:

- **min-h-[600px]** - Mindesthöhe für scrollbare Ansicht
- **border border-border rounded-lg** - Rahmen um gesamte Section

---

## 🧪 Test-Anweisungen:

1. **Beat auswählen:** Klick auf lila Beat-Band → expandiert
2. **Container ändern:** Dropdown für Start/End Container → Beat-Band passt sich dynamisch an
3. **Percentage ändern:** Input-Felder → Beat-Band Position updated
4. **Container collapse:** Act/Sequence einklappen → Beat-Band schrumpft mit
5. **Collapse Beat:** Pfeil-Button oben links → Beat minimiert sich wieder

---

## 📦 Dateien:

- ✅ `/components/BeatBand.tsx` - FERTIG
- ✅ `/components/BeatRail.tsx` - FERTIG
- ✅ `/components/ContainerCard.tsx` - BEREITS VORHANDEN
- ✅ `/components/StructureBeatsSection.tsx` - FERTIG
- 🔨 `/components/pages/ProjectsPage.tsx` - MUSS INTEGRIERT WERDEN (siehe oben)

---

## 🎨 Design Notes:

- **Lila Theme:** `#6E59A5` (primary color)
- **Beat-Bands:** Semi-transparent purple overlay
- **Template-Badges:** `bg-primary/10 text-primary border-primary/30`
- **Smooth Transitions:** `transition-all duration-200`
- **Responsive:** overflow-visible für expandierte Beats

---

## 🚀 Next Steps:

1. **Integration in ProjectsPage:** Siehe Schritt 1 & 2 oben
2. **API-Integration:** Mock-Daten durch echte API-Calls ersetzen
   - `/api/timeline-nodes` für Container-Struktur
   - `/api/beats` für Beat-Definitionen (neu zu erstellen)
3. **CRUD-Operations:**
   - Add Act / Sequence / Scene / Shot
   - Add Beat
   - Update Beat Range
   - Delete Beat

---

## ✨ Features Ready:

- ✅ Inline Beat-Editing (wie bei Shots/Scenes)
- ✅ Hierarchische Container-Auswahl in Dropdowns
- ✅ Dynamische Beat-Positionierung mit ResizeObserver
- ✅ Collapsible Beats (expand/collapse)
- ✅ Dropdown/Timeline Toggle (Timeline = Coming Soon)
- ✅ Responsive Layout
- ✅ Violet Design-System

**Bereit für Deployment!** 🎉
