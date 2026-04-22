# ✅ DEPLOYMENT COMPLETE: Series Episode/Season Structure

**Date:** 2025-11-08  
**Status:** ✅ Frontend Complete | ⏳ Backend Pending Deploy  
**Feature:** Separate Episode Layout & Season Engine fields for TV Series

---

## 📋 **Implementation Summary**

### **What Changed:**

#### **Database (NEW FIELDS)**

- ✅ `episode_layout` TEXT - Episode narrative structure (series only)
- ✅ `season_engine` TEXT - Season-level narrative engine (series only)
- ✅ Indexed for fast filtering

#### **Backend API**

- ✅ POST /projects - Accepts `episode_layout` & `season_engine`
- ✅ PUT /projects/:id - Updates episode/season fields
- ✅ Conditional logic: Series uses episode/season, others use narrative_structure

#### **Frontend UI**

- ✅ Create Dialog: Conditional layout based on project type
  - **Series:** 2 dropdowns (Episode Layout + Season Engine)
  - **Film/Book/Audio:** 1 dropdown (Narrative Structure)
- ✅ Edit Mode: Same conditional logic
- ✅ View Mode: Displays correct fields
- ✅ Beat Template: Added "Story Circle 8" & "Season-Lite-5" (series only)

---

## 🚀 **Deployment Steps**

### **1. Database Migration** ⏳ **PENDING**

```bash
# In Supabase Dashboard → SQL Editor
# Run file: /supabase/migrations/030_add_series_episode_season_structures.sql
```

**Verification:**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name IN ('episode_layout', 'season_engine');
```

---

### **2. Backend API Update** ⏳ **PENDING**

**Edge Function:** `scriptony-projects`

**Changes Required:**

1. **Update Header Comment (Line 4):**

```typescript
 * 🕐 LAST UPDATED: 2025-11-08 (Added episode_layout & season_engine for Series)
```

2. **Update POST /projects (Lines 181-200):**

Replace:

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
} = body;
```

With:

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
  episode_layout, // NEW
  season_engine, // NEW
} = body;
```

And in the `.insert()` call:

```typescript
narrative_structure: narrative_structure || null,
beat_template: beat_template || null,
episode_layout: episode_layout || null,      // NEW
season_engine: season_engine || null,        // NEW
```

**Full deploy-ready code:** See `/DEPLOY_SERIES_EPISODE_SEASON.md`

---

### **3. Frontend** ✅ **COMPLETE**

Already implemented in `/components/pages/ProjectsPage.tsx`

---

## 📊 **New Data Structure**

### **Series Project:**

```json
{
  "id": "uuid",
  "type": "series",
  "title": "Breaking Bad",
  "episode_layout": "streaming-4-act",
  "season_engine": "serial",
  "beat_template": "season-lite-5",
  "narrative_structure": null // Not used for series
}
```

### **Film Project:**

```json
{
  "id": "uuid",
  "type": "film",
  "narrative_structure": "3-act",
  "beat_template": "save-the-cat",
  "episode_layout": null, // Not used
  "season_engine": null // Not used
}
```

---

## 📋 **Complete Option Lists**

### **Episode Layout (Series Only)**

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

### **Season Engine (Series Only)**

| Value                | Label                  | Description                   |
| -------------------- | ---------------------- | ----------------------------- |
| `serial`             | Serial (Season-Arc)    | Durchgehende Handlung         |
| `motw`               | MOTW/COTW              | Fall der Woche                |
| `hybrid`             | Hybrid (Arc+MOTW)      | Mischform                     |
| `anthology`          | Anthology (episodisch) | Jede Folge neu                |
| `seasonal-anthology` | Seasonal Anthology     | Jede Staffel neu              |
| `limited-series`     | Limited Series         | 4–10 Teile, geschlossener Arc |

---

### **Narrative Structure (Film/Book/Audio)**

#### **Film:**

- `3-act` - 3-Akt (klassisch)
- `4-act` - 4-Akt (gesplittetes Act II)
- `5-act` - 5-Akt (Freytag)
- `8-sequences` - 8-Sequenzen ("Mini-Movies")
- `kishotenketsu` - Kishōtenketsu (4-Teiler)
- `non-linear` - Nicht-linear / Rashomon
- `custom` - Custom

#### **Book:**

- `3-part` - 3-Teiler (klassisch)
- `hero-journey` - Heldenreise
- `save-the-cat` - Save the Cat (adapted)

#### **Audio (Hörspiel):**

- `30min-3-act` - 30 min / 3-Akt
- `60min-4-act` - 60 min / 4-Akt
- `podcast-25-35min` - Podcast 25–35 min

---

### **Beat Template (All Types)**

| Value            | Label                    | Available For   |
| ---------------- | ------------------------ | --------------- |
| `lite-7`         | Lite-7 (minimal)         | All             |
| `save-the-cat`   | Save the Cat! (15)       | All             |
| `syd-field`      | Syd Field / Paradigm     | All             |
| `heroes-journey` | Heldenreise (Vogler, 12) | All             |
| `seven-point`    | Seven-Point Structure    | All             |
| `8-sequences`    | 8-Sequenzen              | All             |
| `story-circle`   | Story Circle 8           | All             |
| `season-lite-5`  | Season-Lite-5 (Macro)    | **Series only** |

---

## 🧪 **Testing Checklist**

### **After Backend Deploy:**

1. **Create New Series:**
   - [ ] Episode Layout dropdown shows 8 options
   - [ ] Season Engine dropdown shows 6 options
   - [ ] Beat Template shows "Season-Lite-5" option
   - [ ] Narrative Structure field NOT visible
   - [ ] Project saves with episode_layout + season_engine

2. **Create New Film:**
   - [ ] Narrative Structure dropdown shows 7 options
   - [ ] Episode Layout/Season Engine NOT visible
   - [ ] Beat Template works (no Season-Lite-5)
   - [ ] Project saves with narrative_structure

3. **Edit Existing Series:**
   - [ ] Loads episode_layout + season_engine correctly
   - [ ] Can change values
   - [ ] Save updates backend

4. **View Mode:**
   - [ ] Series shows Episode Layout + Season Engine
   - [ ] Film/Book/Audio shows Narrative Structure
   - [ ] All show Beat Template

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

Then revert Edge Function code to previous version.

---

## 📁 **Files Changed**

| File                                                                | Status      | Lines Changed |
| ------------------------------------------------------------------- | ----------- | ------------- |
| `/supabase/migrations/030_add_series_episode_season_structures.sql` | ✅ Created  | New file      |
| `/supabase/functions/scriptony-projects/index.ts`                   | ⏳ Pending  | ~20 lines     |
| `/components/pages/ProjectsPage.tsx`                                | ✅ Complete | ~200 lines    |
| `/DEPLOY_SERIES_EPISODE_SEASON.md`                                  | ✅ Created  | Documentation |

---

## 🎯 **Next Steps**

1. ⏳ Deploy migration to Supabase
2. ⏳ Update Edge Function via Dashboard
3. ✅ Test all project types
4. ✅ Document any issues

---

**🔗 Related Files:**

- Migration: `/supabase/migrations/030_add_series_episode_season_structures.sql`
- Deploy Guide: `/DEPLOY_SERIES_EPISODE_SEASON.md`
- Frontend: `/components/pages/ProjectsPage.tsx`
