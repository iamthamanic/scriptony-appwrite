# 🚀 DEPLOY: Series Episode/Season Structure Support

**Date:** 2025-11-08  
**Feature:** Separate Episode Layout & Season Engine fields for TV Series

---

## 📦 **Deployment Checklist**

### **1. Database Migration** ✅

Deploy this file via Supabase Dashboard → SQL Editor:

**File:** `/supabase/migrations/030_add_series_episode_season_structures.sql`

```sql
-- Migration: Add Episode Layout & Season Engine for Series
-- Created: 2025-11-08
-- Purpose: Separate episode and season narrative structures for TV series

-- Add new columns to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS episode_layout TEXT,
ADD COLUMN IF NOT EXISTS season_engine TEXT;

-- Add comments for documentation
COMMENT ON COLUMN projects.episode_layout IS 'Episode narrative structure (series only): sitcom-2-act, sitcom-4-act, network-5-act, streaming-3-act, streaming-4-act, anime-ab, sketch-segmented, kids-11min';
COMMENT ON COLUMN projects.season_engine IS 'Season-level narrative engine (series only): serial, motw, hybrid, anthology, seasonal-anthology, limited-series';

-- Create index for filtering by episode layout
CREATE INDEX IF NOT EXISTS idx_projects_episode_layout ON projects(episode_layout) WHERE episode_layout IS NOT NULL;

-- Create index for filtering by season engine
CREATE INDEX IF NOT EXISTS idx_projects_season_engine ON projects(season_engine) WHERE season_engine IS NOT NULL;

-- No migration of existing data needed since these are new optional fields
```

---

### **2. Backend API Update** ✅

Deploy this code to Edge Function: `scriptony-projects`

**Replace Lines 181-198** with:

```typescript
const body = await c.req.json();
const {
  title,
  description,
  type,
  logline,
  genre,
  duration,
  world_id,
  cover_image_url,
  narrative_structure,
  beat_template,
  episode_layout,
  season_engine,
} = body;

if (!title) {
  return c.json({ error: "title is required" }, 400);
}

const { data, error } = await supabase
  .from("projects")
  .insert({
    title,
    logline: logline || description,
    genre,
    type: type || "film",
    duration: duration || null,
    world_id: world_id || null,
    cover_image_url: cover_image_url || null,
    narrative_structure: narrative_structure || null,
    beat_template: beat_template || null,
    episode_layout: episode_layout || null,
    season_engine: season_engine || null,
    organization_id: orgId,
  })
  .select()
  .single();
```

**Update Header Comment (Line 4):**

```typescript
 * 🕐 LAST UPDATED: 2025-11-08 (Added episode_layout & season_engine for Series)
```

---

### **3. Frontend** ✅

Already implemented in `/components/pages/ProjectsPage.tsx` - no manual action needed.

---

## 🎯 **New Data Structure**

### **For Series Projects:**

```json
{
  "type": "series",
  "narrative_structure": null, // Not used for series
  "episode_layout": "sitcom-2-act",
  "season_engine": "serial",
  "beat_template": "lite-7"
}
```

### **For Film/Book/Audio:**

```json
{
  "type": "film",
  "narrative_structure": "3-act",
  "episode_layout": null, // Not used
  "season_engine": null, // Not used
  "beat_template": "save-the-cat"
}
```

---

## 📋 **Episode Layout Options (Series)**

| Value              | Label            | Description                                                         |
| ------------------ | ---------------- | ------------------------------------------------------------------- |
| `sitcom-2-act`     | Sitcom 2-Akt     | Teaser → A1 → A2 → Tag (22–24 min)                                  |
| `sitcom-4-act`     | Sitcom 4-Akt     | Mit Werbebreaks (22 min)                                            |
| `network-5-act`    | Network 5-Akt    | Teaser + 5 Akte + Tag (~45 min)                                     |
| `streaming-3-act`  | Streaming 3-Akt  | 45–60 min Content                                                   |
| `streaming-4-act`  | Streaming 4-Akt  | Act II gesplittet (45–60 min)                                       |
| `anime-ab`         | Anime A/B        | Cold Open → OP → Part A → Eyecatch → Part B → ED → Preview (24 min) |
| `sketch-segmented` | Sketch/Segmented | 3–5 Mini-Stories pro Episode                                        |
| `kids-11min`       | Kids 11-Min      | Zwei Kurzsegmente pro Slot                                          |

---

## 📋 **Season Engine Options (Series)**

| Value                | Label                  | Description                   |
| -------------------- | ---------------------- | ----------------------------- |
| `serial`             | Serial (Season-Arc)    | Durchgehende Handlung         |
| `motw`               | MOTW/COTW              | Fall der Woche                |
| `hybrid`             | Hybrid (Arc+MOTW)      | Mischform                     |
| `anthology`          | Anthology (episodisch) | Jede Folge neu                |
| `seasonal-anthology` | Seasonal Anthology     | Jede Staffel neu              |
| `limited-series`     | Limited Series         | 4–10 Teile, geschlossener Arc |

---

## 📋 **Narrative Structure Options (Film/Book/Audio)**

### **Film:**

- `3-act`, `4-act`, `5-act`, `8-sequences`, `kishotenketsu`, `non-linear`, `custom`

### **Book:**

- `3-part`, `hero-journey`, `save-the-cat`

### **Audio (Hörspiel):**

- `30min-3-act`, `60min-4-act`, `podcast-25-35min`

---

## 📋 **Beat Template Options (All Types)**

| Value            | Label                    | Applicable To |
| ---------------- | ------------------------ | ------------- |
| `lite-7`         | Lite-7 (minimal)         | All           |
| `save-the-cat`   | Save the Cat! (15)       | All           |
| `syd-field`      | Syd Field / Paradigm     | All           |
| `heroes-journey` | Heldenreise (Vogler, 12) | All           |
| `seven-point`    | Seven-Point Structure    | All           |
| `8-sequences`    | 8-Sequenzen              | All           |
| `story-circle`   | Story Circle 8           | All           |
| `season-lite-5`  | Season-Lite-5 (Macro)    | Series only   |

---

## ✅ **Verification Steps**

1. **Database:**

   ```sql
   -- Check if columns exist
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'projects'
   AND column_name IN ('episode_layout', 'season_engine');
   ```

2. **Backend API:**
   - Test POST `/scriptony-projects/projects` with series data
   - Verify episode_layout and season_engine are saved

3. **Frontend:**
   - Create new Series project → Should show 2 dropdowns
   - Create new Film project → Should show 1 narrative structure dropdown
   - Edit existing Series → Should show episode_layout + season_engine

---

## 🔄 **Rollback (if needed)**

```sql
-- Remove new columns
ALTER TABLE projects
DROP COLUMN IF EXISTS episode_layout,
DROP COLUMN IF EXISTS season_engine;

-- Drop indexes
DROP INDEX IF EXISTS idx_projects_episode_layout;
DROP INDEX IF EXISTS idx_projects_season_engine;
```
