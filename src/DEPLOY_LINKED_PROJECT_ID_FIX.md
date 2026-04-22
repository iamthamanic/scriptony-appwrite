# 🔧 URGENT FIX: Add linked_project_id to worlds

## 🚨 Problem

```
Error: API Error: 500 - Could not find the 'linked_project_id' column of 'worlds' in the schema cache
```

## ✅ Root Cause

Die Spalte `linked_project_id` existiert nicht in der `worlds` Tabelle, aber das Frontend versucht sie zu setzen.

## 📝 Deploy Steps

### Step 1: Run SQL Migration in Supabase Dashboard

1. **Öffne Supabase Dashboard:**
   - Gehe zu: https://supabase.com/dashboard/project/ctkouztastyirjywiduc
   - Navigiere zu: **SQL Editor**

2. **Kopiere und führe aus:**

```sql
-- =====================================================
-- Migration 031: Add linked_project_id to worlds
-- =====================================================

-- Add linked_project_id column to worlds table
ALTER TABLE worlds
ADD COLUMN IF NOT EXISTS linked_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_worlds_linked_project ON worlds(linked_project_id);

-- Add comment for documentation
COMMENT ON COLUMN worlds.linked_project_id IS 'Optional FK to projects table - allows linking a world to a specific project';
```

3. **Klicke auf "RUN"**

### Step 2: Verify Migration

Führe diese Query aus, um zu überprüfen, dass die Spalte existiert:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'worlds'
  AND column_name = 'linked_project_id';
```

**Expected Result:**

```
column_name        | data_type | is_nullable
linked_project_id  | uuid      | YES
```

### Step 3: Test in Frontend

1. **Öffne eine Welt** in Worldbuilding
2. **Klicke "Bearbeiten"** in der Basis-Informationen Card
3. **Ändere den Namen** (z.B. "Testwelt" → "Meine Welt")
4. **Klicke "Speichern"**
5. ✅ **Sollte jetzt ohne Error funktionieren!**

## 🎯 Was wurde gefixt?

### Frontend (bereits deployed ✅):

- `linkedProjectId` → `linked_project_id` (snake_case)
- Type Interfaces angepasst
- Save Button & Dropdown Menu aktualisiert

### Backend (SQL Migration erforderlich):

- ✅ Spalte `linked_project_id` zur `worlds` Tabelle hinzugefügt
- ✅ Foreign Key Constraint zu `projects` Tabelle
- ✅ Index für Performance
- ✅ `ON DELETE SET NULL` - wenn Projekt gelöscht wird, bleibt Welt bestehen

## 📊 Migration Details

**File:** `/supabase/migrations/031_add_linked_project_id_to_worlds.sql`

**Changes:**

- Column: `linked_project_id UUID`
- Nullable: YES (optional)
- Foreign Key: `projects(id)`
- On Delete: `SET NULL`
- Index: `idx_worlds_linked_project`

## ✅ Success Criteria

- [ ] SQL Migration erfolgreich ausgeführt
- [ ] Spalte `linked_project_id` existiert in `worlds` Tabelle
- [ ] Frontend kann Welten-Namen ohne Fehler updaten
- [ ] Linked Project ID wird korrekt gespeichert (optional)

## 🧪 Test Cases

1. **Update World Name (no project link):**
   - Name ändern → Speichern → ✅ Success

2. **Update World with Project Link:**
   - Welt mit Projekt verknüpfen → Speichern → ✅ Success

3. **Delete Linked Project:**
   - Projekt löschen → `linked_project_id` wird auf NULL gesetzt → ✅ Welt bleibt bestehen

---

**Deploy Time:** ~2 Minuten  
**Risk Level:** 🟢 LOW (nur neue Spalte, keine Breaking Changes)  
**Rollback:** Spalte kann mit `ALTER TABLE worlds DROP COLUMN linked_project_id;` entfernt werden
