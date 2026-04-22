# 🎬 NARRATIVE STRUCTURE & BEAT TEMPLATE - Complete Deployment Guide

## ✅ STATUS: READY TO DEPLOY

Alle Files sind vorbereitet und warten auf Deployment!

---

## 📋 DEPLOYMENT ÜBERSICHT

| Phase | Component          | Status     | Action Required                         |
| ----- | ------------------ | ---------- | --------------------------------------- |
| 1     | Database Migration | ✅ Ready   | Deploy via Supabase SQL Editor          |
| 2     | Backend API        | ✅ Ready   | Deploy via Supabase Edge Functions      |
| 3     | Frontend Code      | ✅ Ready   | Manual Copy-Paste (siehe Snippets File) |
| 4     | Testing            | ⏳ Pending | After deployment                        |

---

## 🗂️ FILES OVERVIEW

### ✅ Created Files:

1. `/supabase/migrations/029_add_narrative_structure_beat_template.sql` - Database schema
2. `/DEPLOY_NARRATIVE_STRUCTURE_FRONTEND_SNIPPETS.md` - All frontend code snippets
3. `/DEPLOY_NARRATIVE_STRUCTURE_COMPLETE.md` - This guide

### ✅ Modified Files:

1. `/supabase/functions/scriptony-projects/index.ts` - Backend API extended
2. `/components/pages/ProjectsPage.tsx` - Needs manual edits (see snippets file)

---

## 🚀 STEP-BY-STEP DEPLOYMENT

### **PHASE 1: DATABASE MIGRATION** 📦

#### 1.1 Open Supabase Dashboard

- Navigate to your Supabase project
- Go to **SQL Editor**

#### 1.2 Run Migration

Copy the content from `/supabase/migrations/029_add_narrative_structure_beat_template.sql` and execute it.

**Migration Content:**

```sql
-- Add new columns to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS narrative_structure TEXT,
  ADD COLUMN IF NOT EXISTS beat_template TEXT;

-- Add comments for documentation
COMMENT ON COLUMN projects.narrative_structure IS 'Selected narrative structure (e.g., "3-act", "4-act", "heroes-journey", "custom:CustomName")';
COMMENT ON COLUMN projects.beat_template IS 'Selected story beat template (e.g., "save-the-cat", "lite-7", "heroes-journey")';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_narrative_structure
  ON projects(narrative_structure)
  WHERE narrative_structure IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_beat_template
  ON projects(beat_template)
  WHERE beat_template IS NOT NULL;
```

#### 1.3 Verify Migration

Run this query to verify the columns exist:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name IN ('narrative_structure', 'beat_template');
```

Expected result: 2 rows showing both columns as TEXT type.

---

### **PHASE 2: BACKEND API DEPLOYMENT** ⚙️

#### 2.1 Open Supabase Edge Functions

- Navigate to **Edge Functions** in Supabase Dashboard
- Select `scriptony-projects` function

#### 2.2 Deploy Backend Code

Copy the **ENTIRE** content from `/supabase/functions/scriptony-projects/index.ts` and paste it into the editor.

**Key Changes Made:**

- ✅ POST `/projects` - Added `narrative_structure` and `beat_template` to INSERT
- ✅ PUT `/projects/:id` - Already supports all fields via generic update
- ✅ GET `/projects` and GET `/projects/:id` - Automatically return new fields
- ✅ Header comment updated with timestamp

#### 2.3 Save & Deploy

Click **Save** and wait for deployment to complete.

#### 2.4 Verify Backend

Test the health endpoint:

```bash
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/scriptony-projects/health
```

Expected response:

```json
{
  "status": "ok",
  "function": "scriptony-projects",
  "version": "1.0.0",
  "timestamp": "2025-11-08T..."
}
```

---

### **PHASE 3: FRONTEND CODE** 🎨

#### 3.1 Open Frontend Snippets File

Open `/DEPLOY_NARRATIVE_STRUCTURE_FRONTEND_SNIPPETS.md` in your editor.

#### 3.2 Apply All 10 Snippets

Carefully follow the instructions in the snippets file. Each snippet has:

- **Location:** Where to insert/replace code
- **Code:** Ready-to-paste code block
- **Context:** Explanation of what it does

**Order Matters!** Apply snippets in this order:

1. ✅ Create Dialog States (top of ProjectsPage component)
2. ✅ Edit Mode States (ProjectDetail component)
3. ✅ Sync useEffect for Edit States
4. ✅ Create Dialog UI (Project Type dropdown - add "Buch")
5. ✅ Create Dialog UI (Narrative Structure & Beat Template grid)
6. ✅ handleCreateProject function extension
7. ✅ Edit Mode UI (Project Type dropdown - add "Buch")
8. ✅ Edit Mode UI (Genre to Multi-Select Pills)
9. ✅ Edit Mode UI (Narrative Structure & Beat Template fields)
10. ✅ handleSaveProjectInfo function extension
11. ✅ Transformation Warning Dialog
12. ✅ Genre Validation in Create Dialog

#### 3.3 Save File

After applying all snippets, save `/components/pages/ProjectsPage.tsx`.

---

## 🧪 TESTING CHECKLIST

### Test 1: Create New Project

- [ ] Open "Neues Projekt" dialog
- [ ] Verify "Buch" option in Project Type dropdown
- [ ] Verify Narrative Structure & Beat Template fields appear
- [ ] Change Project Type → Verify Narrative Structure options change dynamically
- [ ] Select "Custom" in Narrative Structure → Verify custom input appears
- [ ] Try to create without selecting Genre → Verify validation error
- [ ] Create project with all fields filled → Verify project is created

### Test 2: Edit Existing Project

- [ ] Open project detail view
- [ ] Click "Bearbeiten" in Project Info card
- [ ] Verify Genre is now Multi-Select Pills (not dropdown)
- [ ] Verify Narrative Structure & Beat Template dropdowns appear
- [ ] Change Project Type → Verify warning dialog appears
- [ ] Cancel warning → Verify type doesn't change
- [ ] Change other fields → Save → Verify changes persist
- [ ] Try to save with no Genres selected → Verify validation error

### Test 3: Data Persistence

- [ ] Create project with narrative_structure & beat_template
- [ ] Reload page → Verify fields are still populated
- [ ] Edit project → Change values → Save
- [ ] Reload → Verify new values persist

### Test 4: Backward Compatibility

- [ ] Open old projects (created before migration)
- [ ] Verify they load without errors
- [ ] Edit old project → Add Narrative Structure
- [ ] Save → Verify it works

---

## 🔍 TROUBLESHOOTING

### Issue: Frontend doesn't compile

**Solution:** Check for syntax errors in copied snippets. Verify all imports are present.

### Issue: Backend returns 500 error

**Solution:**

1. Check Supabase Edge Function logs
2. Verify database migration was successful
3. Verify column names match exactly: `narrative_structure`, `beat_template`

### Issue: Data doesn't persist

**Solution:**

1. Open browser DevTools → Network tab
2. Check API request payload - should include new fields
3. Check API response - should include new fields
4. Verify database columns exist

### Issue: Narrative Structure options don't change

**Solution:** Check that `newProjectType` (Create) or `editedType` (Edit) is used in conditional rendering.

---

## 📊 DATABASE SCHEMA REFERENCE

### Before Migration:

```
projects
  ├── id
  ├── title
  ├── type
  ├── logline
  ├── genre
  ├── duration
  ├── world_id
  ├── cover_image_url
  └── ...
```

### After Migration:

```
projects
  ├── id
  ├── title
  ├── type
  ├── logline
  ├── genre
  ├── duration
  ├── world_id
  ├── cover_image_url
  ├── narrative_structure  ← NEW
  ├── beat_template        ← NEW
  └── ...
```

---

## 🎯 FEATURE SUMMARY

### What's New:

1. **Narrative Structure Field**
   - Dynamic options based on Project Type
   - Supports custom structures via "custom:Name" format
   - Optional field (can be empty)

2. **Story Beat Template Field**
   - 6 predefined templates
   - Independent of Narrative Structure
   - Optional field (can be empty)

3. **Enhanced Project Type**
   - Added "Buch" option
   - Now supports: Film, Serie, Buch, Hörspiel

4. **Multi-Select Genres**
   - Changed from single dropdown to pill buttons
   - At least 1 genre required (validation)
   - Consistent in Create & Edit mode

5. **Project Type Change Warning**
   - Shows warning when changing type in Edit mode
   - "Transform" button disabled (Coming Soon)
   - Prevents accidental data loss

---

## ⚠️ IMPORTANT NOTES

1. **API Compatibility:** Backend API is backward compatible. Old requests without new fields still work.

2. **Custom Narrative Structure:** When saving custom structure, format is: `custom:UserInputName`
   - Frontend shows just "UserInputName" in input
   - Backend stores "custom:UserInputName"

3. **Genre Validation:** Both Create and Edit require at least 1 genre selected.

4. **Project Type Transformation:** Currently shows warning only. Actual transformation feature is "Coming Soon".

5. **Database Nullability:** Both new columns are nullable. Existing projects have NULL values.

---

## 📈 NEXT STEPS (Future Enhancements)

1. **Template Conversion System**
   - Allow converting between Story Beat Templates
   - Implement Beat Template → Timeline Node mapping
   - Auto-generate timeline structure from template

2. **Project Type Transformation**
   - Implement actual transformation logic
   - Create backup before transformation
   - Map timeline nodes between types

3. **Narrative Structure Presets**
   - Save custom structures as reusable presets
   - Share structures between projects
   - Import/Export structure definitions

4. **Advanced Validation**
   - Validate Narrative Structure matches selected Beat Template
   - Suggest compatible combinations
   - Show warnings for incompatible selections

---

## ✅ DEPLOYMENT SIGN-OFF

- [ ] Database migration executed successfully
- [ ] Backend API deployed successfully
- [ ] Frontend code snippets applied
- [ ] All 4 test scenarios passed
- [ ] No console errors
- [ ] Data persists correctly
- [ ] Old projects still work

**Deployed By:** **\*\*\*\***\_**\*\*\*\***  
**Date:** **\*\*\*\***\_**\*\*\*\***  
**Time:** **\*\*\*\***\_**\*\*\*\***  
**Environment:** Production / Staging

---

## 📞 SUPPORT

If you encounter any issues:

1. Check Supabase Edge Function logs
2. Check browser console for errors
3. Verify all snippets were applied correctly
4. Check database migration was successful

**Migration File:** `/supabase/migrations/029_add_narrative_structure_beat_template.sql`  
**Backend File:** `/supabase/functions/scriptony-projects/index.ts`  
**Frontend Snippets:** `/DEPLOY_NARRATIVE_STRUCTURE_FRONTEND_SNIPPETS.md`

---

**Version:** 1.0  
**Last Updated:** 2025-11-08  
**Status:** ✅ Ready for Production Deployment
