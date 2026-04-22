# 🎯 PROJECT INFO EDIT MODE - SPEICHERN BUTTON PATCH

## Problem

Im Edit-Modus der Projektinformationen kann man nur über das 3-Punkte-Menü speichern.
Das ist nicht intuitiv - der User sollte einen sichtbaren "Speichern" Button sehen.

## Lösung

Füge einen **sichtbaren "Speichern" Button** hinzu, der im Edit-Modus neben dem 3-Punkte-Menü erscheint.

---

## IMPLEMENTATION

### Schritt 1: Edit State erweitern

Suche in `/components/pages/ProjectsPage.tsx` nach dem Bereich wo Projektinformationen bearbeitet werden.

**Finde die Zeile mit dem DropdownMenu für Projektinformationen** (sollte "Bearbeiten", "Speichern", etc. enthalten).

### Schritt 2: State Variable hinzufügen

```tsx
// Am Anfang der ProjectDetailView Component (NACH anderen States):
const [isEditingProjectInfo, setIsEditingProjectInfo] = useState(false);
```

### Schritt 3: DropdownMenu anpassen

**VORHER:**

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreVertical className="size-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={handleEdit}>
      <Edit2 className="size-3.5 mr-2" />
      Projektinformationen bearbeiten
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleSave}>
      <Save className="size-3.5 mr-2" />
      Speichern
    </DropdownMenuItem>
    {/* ... weitere Items */}
  </DropdownMenuContent>
</DropdownMenu>
```

**NACHHER:**

```tsx
<div className="flex items-center gap-2">
  {/* SAVE BUTTON - nur im Edit-Modus sichtbar */}
  {isEditingProjectInfo && (
    <Button
      variant="default"
      size="sm"
      onClick={handleSaveProjectInfo}
      className="h-9 gap-2"
    >
      <Save className="size-4" />
      Speichern
    </Button>
  )}

  {/* 3-PUNKTE-MENÜ */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <MoreVertical className="size-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {isEditingProjectInfo ? (
        <>
          <DropdownMenuItem
            onClick={() => {
              handleSaveProjectInfo();
            }}
          >
            <Save className="size-3.5 mr-2" />
            Speichern
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setIsEditingProjectInfo(false);
              // Reset edited values to original
            }}
          >
            <X className="size-3.5 mr-2" />
            Abbrechen
          </DropdownMenuItem>
        </>
      ) : (
        <>
          <DropdownMenuItem onClick={() => setIsEditingProjectInfo(true)}>
            <Edit2 className="size-3.5 mr-2" />
            Projektinformationen bearbeiten
          </DropdownMenuItem>
          {/* ... weitere Items */}
        </>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

### Schritt 4: Input-Felder conditional machen

```tsx
{
  isEditingProjectInfo ? (
    <Input
      value={editedProjectTitle}
      onChange={(e) => setEditedProjectTitle(e.target.value)}
      className="h-9"
    />
  ) : (
    <h2 className="text-xl font-bold">{project.title}</h2>
  );
}
```

---

## BEISPIEL: Vollständiger Header Code

```tsx
{
  /* PROJECT INFO HEADER */
}
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-3">
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setSelectedProject(null)}
      className="h-9 w-9"
    >
      <ArrowLeft className="size-4" />
    </Button>

    {isEditingProjectInfo ? (
      <Input
        value={editedProjectTitle}
        onChange={(e) => setEditedProjectTitle(e.target.value)}
        className="h-9 text-xl font-bold border-2"
        placeholder="Projekttitel"
      />
    ) : (
      <h2 className="text-xl font-bold">{project.title}</h2>
    )}
  </div>

  {/* SAVE BUTTON + 3-PUNKTE-MENÜ */}
  <div className="flex items-center gap-2">
    {/* SAVE BUTTON - nur im Edit-Modus */}
    {isEditingProjectInfo && (
      <Button
        variant="default"
        size="sm"
        onClick={handleSaveProjectInfo}
        className="h-9 gap-2"
      >
        <Save className="size-4" />
        Speichern
      </Button>
    )}

    {/* 3-PUNKTE-MENÜ */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isEditingProjectInfo ? (
          <>
            <DropdownMenuItem onClick={handleSaveProjectInfo}>
              <Save className="size-3.5 mr-2" />
              Speichern
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setIsEditingProjectInfo(false);
                // Reset form
                setEditedProjectTitle(project.title);
                setEditedProjectGenre(project.genre);
                setEditedProjectDuration(project.duration);
                setEditedProjectLogline(project.logline);
              }}
            >
              <X className="size-3.5 mr-2" />
              Abbrechen
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={() => setIsEditingProjectInfo(true)}>
              <Edit2 className="size-3.5 mr-2" />
              Projekt bearbeiten
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleOpenStatsDialog(project)}>
              <BarChart3 className="size-3.5 mr-2" />
              Project Stats & Logs
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDuplicateProject(project.id)}
            >
              <Copy className="size-3.5 mr-2" />
              Projekt duplizieren
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="size-3.5 mr-2" />
              Projekt löschen
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</div>;
```

---

## States die benötigt werden

```tsx
// Edit Mode
const [isEditingProjectInfo, setIsEditingProjectInfo] = useState(false);

// Edited Values
const [editedProjectTitle, setEditedProjectTitle] = useState(project.title);
const [editedProjectGenre, setEditedProjectGenre] = useState(project.genre);
const [editedProjectDuration, setEditedProjectDuration] = useState(
  project.duration,
);
const [editedProjectLogline, setEditedProjectLogline] = useState(
  project.logline,
);
```

---

## Save Handler

```tsx
const handleSaveProjectInfo = async () => {
  try {
    const updates = {
      title: editedProjectTitle,
      genre: editedProjectGenre,
      duration: editedProjectDuration,
      logline: editedProjectLogline,
    };

    await projectsApi.update(project.id, updates);

    // Update local state
    setProjects(
      projects.map((p) => (p.id === project.id ? { ...p, ...updates } : p)),
    );

    setIsEditingProjectInfo(false);
    toast.success("Projektinformationen gespeichert");
  } catch (error) {
    console.error("Error saving project:", error);
    toast.error("Fehler beim Speichern");
  }
};
```

---

## UX VERBESSERUNGEN

1. **Sichtbarer Button**: User sieht sofort wo er speichern kann
2. **Primärfarbe**: Save-Button in primary (violett) = deutliche Call-to-Action
3. **Abbrechen Option**: Im 3-Punkte-Menü bleibt "Abbrechen" verfügbar
4. **Konsistent**: Save-Button erscheint immer an der gleichen Stelle

---

## RESULT

**Vor dem Patch:**

- [3-Punkte-Menü] → Bearbeiten → Änderungen machen → [3-Punkte-Menü] → Speichern

**Nach dem Patch:**

- [3-Punkte-Menü] → Bearbeiten → Änderungen machen → [Speichern Button] ← **DIREKT SICHTBAR!**

---

Viel besser für die UX! 🎉
