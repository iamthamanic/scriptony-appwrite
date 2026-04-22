# 🎬 NARRATIVE STRUCTURE & BEAT TEMPLATE - Frontend Code Snippets

## ✅ Status: READY TO COPY-PASTE

Diese Datei enthält alle Code-Snippets, die in `/components/pages/ProjectsPage.tsx` eingefügt werden müssen.

---

## 📦 SNIPPET 1: Edit Mode States (ProjectDetail Component)

**Location:** In der `ProjectDetail` Funktion, nach Zeile 2317 (nach `const [editedDuration, ...]`)

**Code:**

```typescript
const [editedNarrativeStructure, setEditedNarrativeStructure] = useState(
  project.narrative_structure || "",
);
const [editedBeatTemplate, setEditedBeatTemplate] = useState(
  project.beat_template || "",
);
const [editedGenresMulti, setEditedGenresMulti] = useState<string[]>(
  project.genre ? project.genre.split(", ") : [],
);
const [showTypeChangeWarning, setShowTypeChangeWarning] = useState(false);
```

---

## 📦 SNIPPET 2: Sync Edit States (useEffect)

**Location:** In der `ProjectDetail` Funktion, im `useEffect` das bei Zeile 2334 beginnt

**ERSETZE:**

```typescript
useEffect(() => {
  setEditedTitle(project.title || "");
  setEditedLogline(project.logline || "");
  setEditedType(project.type || "");
  setEditedGenre(project.genre || "");
  setEditedDuration(project.duration || "");
}, [
  project.id,
  project.title,
  project.logline,
  project.type,
  project.genre,
  project.duration,
]);
```

**MIT:**

```typescript
useEffect(() => {
  setEditedTitle(project.title || "");
  setEditedLogline(project.logline || "");
  setEditedType(project.type || "");
  setEditedGenre(project.genre || "");
  setEditedDuration(project.duration || "");
  setEditedNarrativeStructure(project.narrative_structure || "");
  setEditedBeatTemplate(project.beat_template || "");
  setEditedGenresMulti(project.genre ? project.genre.split(", ") : []);
}, [
  project.id,
  project.title,
  project.logline,
  project.type,
  project.genre,
  project.duration,
  project.narrative_structure,
  project.beat_template,
]);
```

---

## 📦 SNIPPET 3: Create Dialog - Project Type erweitern (ca. Zeile 998)

**ERSETZE:**

```tsx
<SelectContent>
  <SelectItem value="film">Film</SelectItem>
  <SelectItem value="series">Serie</SelectItem>
  <SelectItem value="audio">Hörspiel</SelectItem>
</SelectContent>
```

**MIT:**

```tsx
<SelectContent>
  <SelectItem value="film">Film</SelectItem>
  <SelectItem value="series">Serie</SelectItem>
  <SelectItem value="book">Buch</SelectItem>
  <SelectItem value="audio">Hörspiel</SelectItem>
</SelectContent>
```

---

## 📦 SNIPPET 4: Create Dialog - Narrative Structure & Beat Template Grid

**Location:** NACH dem Project Type Grid (ca. Zeile 1005) und VOR "Welt verknüpfen"

**Code:**

```tsx
{
  /* Narrative Structure & Story Beat Template */
}
<div className="grid grid-cols-2 gap-3">
  {/* Narrative Structure */}
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <Label htmlFor="narrative">Narrative Structure</Label>
      <Info className="size-3.5 text-muted-foreground" />
    </div>
    <Select
      value={newProjectNarrativeStructure}
      onValueChange={setNewProjectNarrativeStructure}
    >
      <SelectTrigger className="h-11">
        <SelectValue placeholder="None" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">None</SelectItem>
        {/* Film Structures */}
        {newProjectType === "film" && (
          <>
            <SelectItem value="3-act">3-Akt (klassisch)</SelectItem>
            <SelectItem value="4-act">4-Akt (gesplittetes Act II)</SelectItem>
            <SelectItem value="5-act">5-Akt (Freytag)</SelectItem>
            <SelectItem value="8-sequences">
              8-Sequenzen ("Mini-Movies")
            </SelectItem>
            <SelectItem value="kishotenketsu">
              Kishōtenketsu (4-Teiler)
            </SelectItem>
            <SelectItem value="non-linear">Nicht-linear / Rashomon</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </>
        )}
        {/* Serie Structures */}
        {newProjectType === "series" && (
          <>
            <SelectItem value="traditional">Traditionelle TV-Serie</SelectItem>
            <SelectItem value="miniseries">Mini-Serie</SelectItem>
            <SelectItem value="anthology">Anthology</SelectItem>
          </>
        )}
        {/* Buch Structures */}
        {newProjectType === "book" && (
          <>
            <SelectItem value="3-part">3-Teiler (klassisch)</SelectItem>
            <SelectItem value="hero-journey">Heldenreise</SelectItem>
            <SelectItem value="save-the-cat">Save the Cat (adapted)</SelectItem>
          </>
        )}
        {/* Hörspiel Structures */}
        {newProjectType === "audio" && (
          <>
            <SelectItem value="episodic">Episodisch</SelectItem>
            <SelectItem value="serial">Serial Story</SelectItem>
            <SelectItem value="single">Single Episode</SelectItem>
          </>
        )}
      </SelectContent>
    </Select>
    {newProjectNarrativeStructure === "custom" && (
      <Input
        placeholder="Custom Structure Name eingeben..."
        value={customNarrativeStructure}
        onChange={(e) => setCustomNarrativeStructure(e.target.value)}
        className="h-11 mt-2"
      />
    )}
    <p className="text-xs text-muted-foreground">
      {newProjectNarrativeStructure === ""
        ? "No specific narrative structure"
        : ""}
    </p>
  </div>

  {/* Story Beat Template */}
  <div className="space-y-2">
    <Label htmlFor="beat-template">Story Beat Template</Label>
    <Select
      value={newProjectBeatTemplate}
      onValueChange={setNewProjectBeatTemplate}
    >
      <SelectTrigger className="h-11">
        <SelectValue placeholder="None" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">None</SelectItem>
        <SelectItem value="lite-7">A) Lite-7 (minimal)</SelectItem>
        <SelectItem value="save-the-cat">B) Save the Cat! (15)</SelectItem>
        <SelectItem value="syd-field">C) Syd Field / Paradigm</SelectItem>
        <SelectItem value="heroes-journey">
          D) Heldenreise (Vogler, 12)
        </SelectItem>
        <SelectItem value="seven-point">
          E) Seven-Point Structure (Dan Wells)
        </SelectItem>
        <SelectItem value="8-sequences">
          F) 8-Sequenzen ("Mini-Movies" als Beats)
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>;
```

---

## 📦 SNIPPET 5: handleCreateProject erweitern

**Location:** In der `handleCreateProject` Funktion (ca. Zeile 200-250 im Hauptkomponent)

**Suche nach:** `const newProject = await projectsApi.create({`

**ERSETZE den gesamten API Call:**

```typescript
// Prepare narrative structure value (handle custom input)
let narrativeStructureValue = newProjectNarrativeStructure;
if (newProjectNarrativeStructure === "custom" && customNarrativeStructure) {
  narrativeStructureValue = `custom:${customNarrativeStructure}`;
}

const newProject = await projectsApi.create({
  title: newProjectTitle,
  type: newProjectType,
  logline: newProjectLogline,
  genre: selectedGenres.join(", "),
  duration: newProjectDuration,
  linkedWorldId: newProjectLinkedWorld,
  inspirations: projectInspirationNotes.filter((note) => note.trim()),
  coverImage: newProjectCoverImage,
  narrative_structure: narrativeStructureValue || undefined,
  beat_template: newProjectBeatTemplate || undefined,
});
```

**UND füge zum Reset hinzu (unten in der Funktion):**

```typescript
setNewProjectNarrativeStructure("");
setNewProjectBeatTemplate("");
setCustomNarrativeStructure("");
```

---

## 📦 SNIPPET 6: Edit Mode - Project Type erweitern (ca. Zeile 2945)

**ERSETZE:**

```tsx
<SelectContent>
  <SelectItem value="film">Film</SelectItem>
  <SelectItem value="series">Serie</SelectItem>
  <SelectItem value="audio">Hörspiel</SelectItem>
</SelectContent>
```

**MIT:**

```tsx
<SelectContent>
  <SelectItem value="film">Film</SelectItem>
  <SelectItem value="series">Serie</SelectItem>
  <SelectItem value="book">Buch</SelectItem>
  <SelectItem value="audio">Hörspiel</SelectItem>
</SelectContent>
```

---

## 📦 SNIPPET 7: Edit Mode - Genre zu Multi-Select Pills ändern

**Location:** Im Edit Mode (isEditingInfo === true), ca. Zeile 2946-2960

**ERSETZE das Genre Dropdown:**

```tsx
<div>
  <Label htmlFor="project-genre" className="text-sm mb-2 block font-bold">
    Genre
  </Label>
  <Select value={editedGenre} onValueChange={setEditedGenre}>
    <SelectTrigger id="project-genre" className="h-9">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="Action">Action</SelectItem>
      <SelectItem value="Comedy">Comedy</SelectItem>
      <SelectItem value="Drama">Drama</SelectItem>
      <SelectItem value="Sci-fi">Sci-fi</SelectItem>
      <SelectItem value="Horror">Horror</SelectItem>
      <SelectItem value="Romance">Romance</SelectItem>
    </SelectContent>
  </Select>
</div>
```

**MIT Multi-Select Pills (muss col-span-3 haben!):**

```tsx
<div className="col-span-3">
  <Label className="text-sm mb-2 block font-bold">Genres</Label>
  <div className="flex flex-wrap gap-2">
    {[
      "Action",
      "Abenteuer",
      "Komödie",
      "Drama",
      "Fantasy",
      "Horror",
      "Mystery",
      "Romantik",
      "Science Fiction",
      "Slice of Life",
      "Übernatürlich",
      "Thriller",
    ].map((genre) => (
      <button
        key={genre}
        onClick={() => {
          setEditedGenresMulti((prev) =>
            prev.includes(genre)
              ? prev.filter((g) => g !== genre)
              : [...prev, genre],
          );
        }}
        className={`px-3 py-1.5 rounded-lg border transition-all text-sm ${
          editedGenresMulti.includes(genre)
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background border-border hover:border-primary/50"
        }`}
      >
        {genre}
      </button>
    ))}
  </div>
  <p className="text-xs text-muted-foreground mt-1.5">
    Wähle ein oder mehrere Genres
  </p>
</div>
```

---

## 📦 SNIPPET 8: Edit Mode - Narrative Structure & Beat Template Fields

**Location:** NACH dem Genres Feld (im Edit Mode)

**Code:**

```tsx
{
  /* Narrative Structure & Beat Template - Grid 2 Spalten */
}
<div className="grid grid-cols-2 gap-3 col-span-3">
  {/* Narrative Structure */}
  <div>
    <Label
      htmlFor="narrative-structure"
      className="text-sm mb-2 block font-bold"
    >
      Narrative Structure
    </Label>
    <Select
      value={editedNarrativeStructure}
      onValueChange={setEditedNarrativeStructure}
    >
      <SelectTrigger id="narrative-structure" className="h-9">
        <SelectValue placeholder="Keine" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">None</SelectItem>
        {/* Film Structures */}
        {editedType === "film" && (
          <>
            <SelectItem value="3-act">3-Akt (klassisch)</SelectItem>
            <SelectItem value="4-act">4-Akt (gesplittetes Act II)</SelectItem>
            <SelectItem value="5-act">5-Akt (Freytag)</SelectItem>
            <SelectItem value="8-sequences">
              8-Sequenzen ("Mini-Movies")
            </SelectItem>
            <SelectItem value="kishotenketsu">
              Kishōtenketsu (4-Teiler)
            </SelectItem>
            <SelectItem value="non-linear">Nicht-linear / Rashomon</SelectItem>
          </>
        )}
        {/* Serie Structures */}
        {editedType === "series" && (
          <>
            <SelectItem value="traditional">Traditionelle TV-Serie</SelectItem>
            <SelectItem value="miniseries">Mini-Serie</SelectItem>
            <SelectItem value="anthology">Anthology</SelectItem>
          </>
        )}
        {/* Buch Structures */}
        {editedType === "book" && (
          <>
            <SelectItem value="3-part">3-Teiler (klassisch)</SelectItem>
            <SelectItem value="hero-journey">Heldenreise</SelectItem>
            <SelectItem value="save-the-cat">Save the Cat (adapted)</SelectItem>
          </>
        )}
        {/* Hörspiel Structures */}
        {editedType === "audio" && (
          <>
            <SelectItem value="episodic">Episodisch</SelectItem>
            <SelectItem value="serial">Serial Story</SelectItem>
            <SelectItem value="single">Single Episode</SelectItem>
          </>
        )}
      </SelectContent>
    </Select>
  </div>

  {/* Beat Template */}
  <div>
    <Label htmlFor="beat-template" className="text-sm mb-2 block font-bold">
      Beat Template
    </Label>
    <Select value={editedBeatTemplate} onValueChange={setEditedBeatTemplate}>
      <SelectTrigger id="beat-template" className="h-9">
        <SelectValue placeholder="Kein Template" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">None</SelectItem>
        <SelectItem value="lite-7">A) Lite-7 (minimal)</SelectItem>
        <SelectItem value="save-the-cat">B) Save the Cat! (15)</SelectItem>
        <SelectItem value="syd-field">C) Syd Field / Paradigm</SelectItem>
        <SelectItem value="heroes-journey">
          D) Heldenreise (Vogler, 12)
        </SelectItem>
        <SelectItem value="seven-point">
          E) Seven-Point Structure (Dan Wells)
        </SelectItem>
        <SelectItem value="8-sequences">
          F) 8-Sequenzen ("Mini-Movies" als Beats)
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>;
```

---

## 📦 SNIPPET 9: handleSaveProjectInfo erweitern

**Location:** In der `handleSaveProjectInfo` Funktion

**ERSETZE den kompletten Function Body:**

```typescript
const handleSaveProjectInfo = async () => {
  try {
    // Genre Validation: Mindestens 1 Genre erforderlich
    if (!editedGenresMulti || editedGenresMulti.length === 0) {
      toast.error("Bitte wähle mindestens ein Genre aus");
      return;
    }

    // Check if type changed - show warning
    if (editedType !== project.type) {
      setShowTypeChangeWarning(true);
      return; // Don't save yet, show warning first
    }

    // Update project
    await projectsApi.update(project.id, {
      title: editedTitle,
      logline: editedLogline,
      type: editedType,
      genre: editedGenresMulti.join(", "),
      duration: editedDuration,
      narrative_structure: editedNarrativeStructure || undefined,
      beat_template: editedBeatTemplate || undefined,
    });

    toast.success("Projekt erfolgreich aktualisiert");
    setIsEditingInfo(false);

    // Refresh data
    if (onUpdate) {
      onUpdate();
    }
  } catch (error: any) {
    console.error("Error updating project:", error);
    toast.error(error.message || "Fehler beim Aktualisieren des Projekts");
  }
};
```

---

## 📦 SNIPPET 10: Transformation Warning Dialog

**Location:** Ganz am ENDE der `ProjectDetail` Funktion, kurz vor dem schließenden `return` Statement

**Code:**

```tsx
{
  /* Project Type Change Warning Dialog */
}
<AlertDialog
  open={showTypeChangeWarning}
  onOpenChange={setShowTypeChangeWarning}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle className="flex items-center gap-2">
        <AlertTriangle className="size-5 text-orange-500" />
        Projekttyp ändern
      </AlertDialogTitle>
      <AlertDialogDescription className="space-y-3 pt-2">
        <p>
          Das Ändern des Projekttyps verändert die{" "}
          <strong>gesamte Projektstruktur</strong>.
        </p>
        <div className="bg-muted p-3 rounded-lg text-sm space-y-2">
          <p className="font-bold">Was passiert:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Dein aktuelles Projekt wird als Backup dupliziert</li>
            <li>Die Projektstruktur wird zum neuen Typ transformiert</li>
            <li>Timeline-Knoten werden automatisch gemappt</li>
          </ul>
        </div>
        <p className="text-orange-600 text-sm">
          ⚠️ Diese Funktion wird in Kürze verfügbar sein.
        </p>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
      <AlertDialogAction disabled className="opacity-50 cursor-not-allowed">
        Transformieren (Coming Soon)
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>;
```

---

## ✅ VALIDATION REGEL: Genre Pflichtfeld im Create Dialog

**Location:** In der `handleCreateProject` Funktion, GANZ AM ANFANG (nach Validation für title)

**Code:**

```typescript
if (!selectedGenres || selectedGenres.length === 0) {
  toast.error("Bitte wähle mindestens ein Genre aus");
  return;
}
```

---

## 📋 DEPLOYMENT CHECKLIST

- [ ] Snippet 1: Edit Mode States hinzugefügt
- [ ] Snippet 2: useEffect erweitert
- [ ] Snippet 3: Create Dialog Project Type um "Buch" erweitert
- [ ] Snippet 4: Create Dialog Narrative Structure & Beat Template Grid eingefügt
- [ ] Snippet 5: handleCreateProject erweitert
- [ ] Snippet 6: Edit Mode Project Type um "Buch" erweitert
- [ ] Snippet 7: Edit Mode Genre zu Multi-Select Pills geändert
- [ ] Snippet 8: Edit Mode Narrative Structure & Beat Template Fields eingefügt
- [ ] Snippet 9: handleSaveProjectInfo erweitert
- [ ] Snippet 10: Transformation Warning Dialog eingefügt
- [ ] Validation: Genre Pflichtfeld in Create Dialog
- [ ] Database Migration deployed (029_add_narrative_structure_beat_template.sql)
- [ ] Backend API deployed (scriptony-projects/index.ts)

---

## 🎯 WICHTIGE HINWEISE

1. **Genre Validation:** Mindestens 1 Genre muss beim Erstellen und Bearbeiten gewählt werden
2. **Custom Narrative Structure:** Wenn "custom" gewählt wird, erscheint ein Input Field. Der Wert wird als `custom:DeinName` gespeichert
3. **Project Type Change:** Beim Ändern des Project Types erscheint eine Warning - Button ist disabled (Coming Soon)
4. **Multi-Select Genres:** Im Edit Mode sind Genres jetzt Pills statt Dropdown (wie im Screenshot)
5. **Dynamische Optionen:** Narrative Structure Optionen ändern sich je nach Project Type

---

## 🚀 NÄCHSTE SCHRITTE

1. Database Migration im Supabase Dashboard ausführen
2. Backend Code im Supabase Dashboard deployen
3. Frontend Snippets in ProjectsPage.tsx manuell einfügen
4. Testen: Neues Projekt erstellen mit allen neuen Feldern
5. Testen: Projekt bearbeiten mit Genre Pills und neuen Feldern
