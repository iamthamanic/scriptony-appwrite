# 🎬 DEPLOY: Story Beats System - COMPLETE

## ✅ Was wurde erstellt:

### 1. **Migration** `/supabase/migrations/033_story_beats_system.sql`

- Tabelle `story_beats` mit allen Feldern
- RLS Policies (Users can view/create/update/delete their beats)
- Activity Logs Trigger
- Auto-update `updated_at` Trigger

### 2. **Edge Function** `/supabase/functions/scriptony-beats/index.ts`

- `GET /beats?project_id=xxx` - Liste aller Beats
- `POST /beats` - Neuen Beat erstellen
- `PATCH /beats/:id` - Beat aktualisieren
- `DELETE /beats/:id` - Beat löschen

### 3. **API Client** `/lib/api/beats-api.ts`

- `getBeats(projectId)` - Lädt alle Beats
- `createBeat(payload)` - Erstellt Beat
- `updateBeat(beatId, payload)` - Update Beat
- `deleteBeat(beatId)` - Löscht Beat
- `reorderBeats(beats[])` - Bulk-Reorder

### 4. **Frontend Integration** `/components/pages/ProjectsPage.tsx`

- Import für `StructureBeatsSection` hinzugefügt ✅
- **NOCH NICHT**: Verwendung in der Project-Detail-View

---

## 📦 DEPLOYMENT SCHRITTE:

### SCHRITT 1: Migration deployen

1. Öffne Supabase Dashboard → SQL Editor
2. Kopiere den kompletten Inhalt von `/supabase/migrations/033_story_beats_system.sql`
3. Führe aus
4. **Verify**: Tabelle `story_beats` sollte existieren

```sql
-- Test Query:
SELECT * FROM story_beats LIMIT 1;
```

---

### SCHRITT 2: Edge Function deployen

1. Öffne Supabase Dashboard → Edge Functions
2. **Erstelle neue Function**: `scriptony-beats`
3. Kopiere den Inhalt von `/supabase/functions/scriptony-beats/index.ts`
4. Paste & Deploy
5. **Verify**: Function sollte in der Liste erscheinen

**Test mit curl:**

```bash
curl -X GET "https://YOUR_PROJECT_ID.supabase.co/functions/v1/scriptony-beats/beats?project_id=XXX" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### SCHRITT 3: ProjectsPage Integration (MANUELL)

Die **StructureBeatsSection** wurde bereits importiert, aber **noch nicht verwendet**.

#### 3.1 Finde die Project-Detail-View

Öffne `/components/pages/ProjectsPage.tsx` und suche nach:

```typescript
// Beispiel-Pattern:
{selectedProject && (
  <div className="...">
    {/* Projekt-Header */}
    {/* Projekt-Info */}

    {/* ⭐ HIER EINFÜGEN ⭐ */}

    {/* Charaktere, Inspiration, etc. */}
  </div>
)}
```

#### 3.2 Füge die Section ein

Füge **nach den Projekt-Infos** und **vor Charaktere/Inspiration** ein:

```typescript
{/* ⭐ Structure & Beats Section ⭐ */}
<section className="mb-6">
  <StructureBeatsSection
    projectId={selectedProject.id}
    className=""
  />
</section>
```

#### 3.3 Vollständiges Beispiel

```typescript
{selectedProject && (
  <div className="p-6 space-y-6">

    {/* Projekt-Header (bestehend) */}
    <div className="flex items-center justify-between">
      <h1 className="text-3xl font-bold">{selectedProject.title}</h1>
      <Button variant="ghost" onClick={() => setSelectedProject(null)}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Zurück
      </Button>
    </div>

    {/* Projekt-Info (bestehend) */}
    <div className="space-y-4">
      {/* ... Logline, Duration, Genres, Cover ... */}
    </div>

    {/* ⭐⭐⭐ NEU: Structure & Beats ⭐⭐⭐ */}
    <section className="mb-6">
      <StructureBeatsSection
        projectId={selectedProject.id}
        className=""
      />
    </section>

    {/* Charaktere Section (bestehend) */}
    <Collapsible>
      {/* ... */}
    </Collapsible>

    {/* Inspiration Section (bestehend) */}
    <Collapsible>
      {/* ... */}
    </Collapsible>

  </div>
)}
```

---

## 🧪 TESTING:

### 1. Migration Test

```sql
-- Sollte leere Tabelle zeigen:
SELECT * FROM story_beats;

-- Teste Insert:
INSERT INTO story_beats (
  project_id,
  user_id,
  label,
  from_container_id,
  to_container_id,
  pct_from,
  pct_to
) VALUES (
  'YOUR_PROJECT_ID',
  'YOUR_USER_ID',
  'Opening Image',
  'act-1',
  'act-1',
  0,
  1
);

-- Sollte 1 Beat zeigen:
SELECT * FROM story_beats;
```

### 2. Edge Function Test

```bash
# GET Beats
curl "https://YOUR_PROJECT_ID.supabase.co/functions/v1/scriptony-beats/beats?project_id=XXX" \
  -H "Authorization: Bearer YOUR_TOKEN"

# POST Beat
curl -X POST "https://YOUR_PROJECT_ID.supabase.co/functions/v1/scriptony-beats/beats" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "XXX",
    "label": "Catalyst",
    "template_abbr": "STC",
    "from_container_id": "act-1",
    "to_container_id": "act-1",
    "pct_from": 10,
    "pct_to": 12
  }'
```

### 3. Frontend Test

1. Öffne ein Projekt in der App
2. Du solltest die **"Structure & Beats"** Section sehen
3. Die **lila Beat-Rail** (80px) sollte links erscheinen
4. Acts/Sequences/Scenes/Shots sollten rechts angezeigt werden
5. Klick auf einen Beat-Band → sollte expandieren

---

## 🎯 VISUELLER CHECK:

Nach dem Deploy solltest du das sehen:

```
┌────────────────────────────────────────────────────────┐
│  Structure & Beats    [∧]  [Dropdown][Timeline]  [+Act]│
├────┬───────────────────────────────────────────────────┤
│    │                                                    │
│ 0% │  [🎬] > Akt I - Einführung              [⋮]      │
│    │                                                    │
│[STC│  [🎬] > Akt II - Konfrontation          [⋮]      │
│25%]│                                                    │
│    │  [🎬] > Akt III - Auflösung             [⋮]      │
│    │                                                    │
│[STC│                                                    │
│50%]│                                                    │
│    │                                                    │
│75% │                                                    │
│    │                                                    │
│100%│                                                    │
└────┴───────────────────────────────────────────────────┘

Links: 80px lila Beat-Rail mit [STC 25%] etc.
Rechts: Acts/Sequences/Scenes/Shots
```

---

## 📁 FILES CREATED:

✅ `/supabase/migrations/033_story_beats_system.sql`  
✅ `/supabase/functions/scriptony-beats/index.ts`  
✅ `/lib/api/beats-api.ts`  
✅ `/components/pages/ProjectsPage.tsx` (Import added)  
⚠️ `/components/pages/ProjectsPage.tsx` (Usage pending - see SCHRITT 3)

---

## 🚀 NEXT STEPS (nach Deployment):

1. **API Integration in StructureBeatsSection:**
   - Ersetze Mock-Daten durch echte API-Calls
   - `getBeats(projectId)` beim Laden
   - `createBeat()` beim Erstellen
   - `updateBeat()` beim Editieren

2. **Beat-Template System:**
   - Save the Cat (15 Beats)
   - Hero's Journey (12 Beats)
   - Custom Templates

3. **Beat-Creation UI:**
   - "+ Beat hinzufügen" Button
   - Beat-Template auswählen
   - Drag & Drop für Beats

---

## 🔧 TROUBLESHOOTING:

### Problem: "story_beats does not exist"

→ Migration wurde nicht ausgeführt (siehe SCHRITT 1)

### Problem: "Failed to fetch beats"

→ Edge Function nicht deployed oder falsche URL (siehe SCHRITT 2)

### Problem: "StructureBeatsSection is not defined"

→ Import fehlt (sollte bereits da sein)

### Problem: Beat-Rail nicht sichtbar

→ StructureBeatsSection wurde noch nicht verwendet (siehe SCHRITT 3)

---

**Viel Erfolg beim Deployment!** 🎬💜
