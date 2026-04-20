# 🎬 Beats API - Quick Reference

## 📦 Import

```typescript
import * as BeatsAPI from "../lib/api/beats-api";
```

---

## 🔧 API Functions

### 1. Get all Beats for a Project

```typescript
const beats = await BeatsAPI.getBeats(projectId);

// Returns: StoryBeat[]
// [
//   {
//     id: "beat-uuid",
//     project_id: "project-uuid",
//     user_id: "user-uuid",
//     label: "Opening Image",
//     template_abbr: "STC",
//     description: "The first image of the movie",
//     from_container_id: "act-1",
//     to_container_id: "act-1",
//     pct_from: 0,
//     pct_to: 1,
//     color: "#6E59A5",
//     notes: "Should establish the tone",
//     order_index: 0,
//     created_at: "2025-11-10T...",
//     updated_at: "2025-11-10T..."
//   }
// ]
```

---

### 2. Create a new Beat

```typescript
const newBeat = await BeatsAPI.createBeat({
  project_id: "project-uuid",
  label: "Catalyst",
  template_abbr: "STC",
  description: "The inciting incident",
  from_container_id: "act-1",
  to_container_id: "sequence-2",
  pct_from: 10,
  pct_to: 12,
  color: "#6E59A5",
  notes: "This changes everything",
  order_index: 1,
});

// Returns: StoryBeat
```

---

### 3. Update a Beat

```typescript
const updatedBeat = await BeatsAPI.updateBeat("beat-uuid", {
  label: "New Label",
  from_container_id: "act-2",
  to_container_id: "act-2",
  pct_from: 50,
  pct_to: 55,
  notes: "Updated notes",
});

// Returns: StoryBeat
```

---

### 4. Delete a Beat

```typescript
await BeatsAPI.deleteBeat("beat-uuid");

// Returns: void
```

---

### 5. Reorder Beats (Bulk Update)

```typescript
await BeatsAPI.reorderBeats([
  { id: "beat-1", order_index: 0 },
  { id: "beat-2", order_index: 1 },
  { id: "beat-3", order_index: 2 },
]);

// Returns: void
```

---

## 📋 TypeScript Types

### StoryBeat

```typescript
interface StoryBeat {
  id: string;
  project_id: string;
  user_id: string;
  label: string; // "Opening Image", "Catalyst", etc.
  template_abbr?: string; // "STC", "HJ", "CUSTOM"
  description?: string; // Ausführliche Beschreibung
  from_container_id: string; // Timeline Node ID (Start)
  to_container_id: string; // Timeline Node ID (End)
  pct_from: number; // 0-100
  pct_to: number; // 0-100
  color?: string; // Hex color "#6E59A5"
  notes?: string; // Notizen
  order_index: number; // Reihenfolge
  created_at: string;
  updated_at: string;
}
```

### CreateBeatPayload

```typescript
interface CreateBeatPayload {
  project_id: string; // REQUIRED
  label: string; // REQUIRED
  template_abbr?: string; // Optional
  description?: string; // Optional
  from_container_id: string; // REQUIRED
  to_container_id: string; // REQUIRED
  pct_from?: number; // Optional (default: 0)
  pct_to?: number; // Optional (default: 0)
  color?: string; // Optional
  notes?: string; // Optional
  order_index?: number; // Optional (default: 0)
}
```

### UpdateBeatPayload

```typescript
interface UpdateBeatPayload {
  label?: string;
  template_abbr?: string;
  description?: string;
  from_container_id?: string;
  to_container_id?: string;
  pct_from?: number;
  pct_to?: number;
  color?: string;
  notes?: string;
  order_index?: number;
}
```

---

## 🎯 Common Use Cases

### Load Beats on Component Mount

```typescript
const [beats, setBeats] = useState<StoryBeat[]>([]);

useEffect(() => {
  async function loadBeats() {
    try {
      const data = await BeatsAPI.getBeats(projectId);
      setBeats(data);
    } catch (error) {
      console.error("Failed to load beats:", error);
      toast.error("Beats konnten nicht geladen werden");
    }
  }

  loadBeats();
}, [projectId]);
```

---

### Create Beat with Optimistic UI

```typescript
const handleCreateBeat = async (payload: CreateBeatPayload) => {
  // Optimistic UI
  const tempBeat = {
    id: `temp-${Date.now()}`,
    ...payload,
    user_id: currentUserId,
    order_index: beats.length,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  setBeats((prev) => [...prev, tempBeat]);

  try {
    const newBeat = await BeatsAPI.createBeat(payload);

    // Replace temp with real
    setBeats((prev) => prev.map((b) => (b.id === tempBeat.id ? newBeat : b)));

    toast.success("Beat erstellt");
  } catch (error) {
    // Rollback
    setBeats((prev) => prev.filter((b) => b.id !== tempBeat.id));
    toast.error("Beat konnte nicht erstellt werden");
  }
};
```

---

### Update Beat with Optimistic UI

```typescript
const handleUpdateBeat = async (beatId: string, updates: UpdateBeatPayload) => {
  // Optimistic UI
  const oldBeats = [...beats];
  setBeats((prev) =>
    prev.map((b) => (b.id === beatId ? { ...b, ...updates } : b)),
  );

  try {
    const updatedBeat = await BeatsAPI.updateBeat(beatId, updates);

    setBeats((prev) => prev.map((b) => (b.id === beatId ? updatedBeat : b)));
  } catch (error) {
    // Rollback
    setBeats(oldBeats);
    toast.error("Beat konnte nicht aktualisiert werden");
  }
};
```

---

### Delete Beat with Confirmation

```typescript
const handleDeleteBeat = async (beatId: string) => {
  const confirmed = window.confirm("Beat wirklich löschen?");
  if (!confirmed) return;

  // Optimistic UI
  const oldBeats = [...beats];
  setBeats((prev) => prev.filter((b) => b.id !== beatId));

  try {
    await BeatsAPI.deleteBeat(beatId);
    toast.success("Beat gelöscht");
  } catch (error) {
    // Rollback
    setBeats(oldBeats);
    toast.error("Beat konnte nicht gelöscht werden");
  }
};
```

---

### Drag & Drop Reorder

```typescript
const handleReorder = async (newBeats: StoryBeat[]) => {
  // Optimistic UI
  const oldBeats = [...beats];
  setBeats(newBeats);

  try {
    // Update order_index for all affected beats
    const updates = newBeats.map((beat, index) => ({
      id: beat.id,
      order_index: index,
    }));

    await BeatsAPI.reorderBeats(updates);
  } catch (error) {
    // Rollback
    setBeats(oldBeats);
    toast.error("Reihenfolge konnte nicht gespeichert werden");
  }
};
```

---

## 🎨 Beat Templates

### Save the Cat (15 Beats)

```typescript
const SAVE_THE_CAT_BEATS = [
  { label: "Opening Image", pct: 0 },
  { label: "Theme Stated", pct: 5 },
  { label: "Set-Up", pct: 1 - 10 },
  { label: "Catalyst", pct: 10 },
  { label: "Debate", pct: 10 - 20 },
  { label: "Break into Two", pct: 20 },
  { label: "B Story", pct: 22 },
  { label: "Fun and Games", pct: 20 - 50 },
  { label: "Midpoint", pct: 50 },
  { label: "Bad Guys Close In", pct: 50 - 75 },
  { label: "All Is Lost", pct: 75 },
  { label: "Dark Night of the Soul", pct: 75 - 80 },
  { label: "Break into Three", pct: 80 },
  { label: "Finale", pct: 80 - 99 },
  { label: "Final Image", pct: 99 - 100 },
];
```

### Hero's Journey (12 Beats)

```typescript
const HEROS_JOURNEY_BEATS = [
  { label: "Ordinary World", pct: 0 - 10 },
  { label: "Call to Adventure", pct: 10 },
  { label: "Refusal of the Call", pct: 10 - 15 },
  { label: "Meeting the Mentor", pct: 15 },
  { label: "Crossing the Threshold", pct: 20 },
  { label: "Tests, Allies, Enemies", pct: 20 - 50 },
  { label: "Approach to Inmost Cave", pct: 50 },
  { label: "Ordeal", pct: 50 - 60 },
  { label: "Reward", pct: 60 - 70 },
  { label: "The Road Back", pct: 70 - 75 },
  { label: "Resurrection", pct: 75 - 90 },
  { label: "Return with Elixir", pct: 90 - 100 },
];
```

---

## 🔐 Security

- **RLS Enabled**: Users können nur ihre eigenen Beats sehen/bearbeiten
- **Project Ownership Check**: Beats können nur für eigene Projekte erstellt werden
- **Auth Required**: Alle Endpoints benötigen Authorization Header
- **Percentage Validation**: `pct_from` und `pct_to` müssen 0-100 sein

---

## 🚀 Performance Tips

1. **Cache Beats**: Lade einmal beim Mount, update lokal
2. **Optimistic UI**: Sofortiges Feedback, Rollback bei Fehler
3. **Batch Updates**: Nutze `reorderBeats()` statt einzelne Updates
4. **Debounce Edits**: Speichere nicht bei jedem Keystroke

---

**Happy Beating!** 🎬💜
