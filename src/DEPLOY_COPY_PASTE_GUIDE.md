# 🚀 COPY-PASTE DEPLOYMENT GUIDE

**Feature:** Series Episode/Season Structure Support  
**Date:** 2025-11-08  
**Status:** ✅ Ready to Deploy

---

## 📋 **Deployment Checklist**

### ✅ **Step 1: Database Migration** (5 min)

1. Gehe zu **Supabase Dashboard** → **SQL Editor**
2. Klicke auf **New Query**
3. Öffne die Datei `/supabase/migrations/030_add_series_episode_season_structures.sql`
4. **Markiere ALLES** (Cmd+A / Ctrl+A)
5. **Kopiere** (Cmd+C / Ctrl+C)
6. **Füge im SQL Editor ein** (Cmd+V / Ctrl+V)
7. Klicke auf **RUN**
8. ✅ Warte auf Success-Message

---

### ✅ **Step 2: Edge Function Update** (5 min)

1. Gehe zu **Supabase Dashboard** → **Edge Functions** → **scriptony-projects**
2. Klicke auf den **Code Editor Tab**
3. Öffne die Datei `/supabase/functions/scriptony-projects/index.ts` in deinem Code Editor
4. **Markiere ALLES** (Cmd+A / Ctrl+A)
5. **Kopiere** (Cmd+C / Ctrl+C)
6. Gehe zurück zu Supabase Dashboard
7. **Markiere ALLES im Dashboard Editor** (Cmd+A / Ctrl+A)
8. **Füge den kopierten Code ein** (Cmd+V / Ctrl+V)
9. Klicke auf **Deploy**
10. ✅ Warte auf Success-Message

---

### ✅ **Step 3: Verification** (2 min)

1. **Öffne deine Scriptony App**
2. Klicke auf **Projects** → **Create New Project**
3. Wähle **Type: Serie**
4. ✅ Du solltest **2 neue Dropdowns** sehen:
   - **Episode Layout** (8 Optionen)
   - **Season Engine** (6 Optionen)
5. Erstelle ein Test-Projekt
6. ✅ Öffne das Projekt → Edit Mode sollte die Felder anzeigen

---

## 🎯 **Was wurde geändert?**

### **Database:**

- ✅ Neue Spalten: `episode_layout`, `season_engine`
- ✅ Indizes für Performance

### **Backend API:**

- ✅ POST /projects: Akzeptiert `episode_layout` & `season_engine`
- ✅ PUT /projects/:id: Updated neue Felder
- ✅ Version: 1.1.0

### **Frontend:**

- ✅ Create Dialog: Conditional layout (Serie = 2 Felder, Film/Buch/Audio = 1 Feld)
- ✅ Edit Mode: Vollständig implementiert
- ✅ View Mode: Korrekte Anzeige

---

## 🐛 **Troubleshooting**

### **Problem: Migration schlägt fehl**

```
Error: column "episode_layout" already exists
```

**Lösung:** Felder existieren bereits, Step 1 überspringen ✅

---

### **Problem: Edge Function Deploy schlägt fehl**

```
Error: Deployment failed
```

**Lösung:**

1. Prüfe ob kompletter Code kopiert wurde
2. Prüfe auf Syntax-Fehler (sollte keine geben)
3. Retry Deploy

---

### **Problem: Frontend zeigt keine neuen Felder**

**Lösung:**

1. Hard Refresh: Cmd+Shift+R / Ctrl+Shift+F5
2. Clear Cache
3. Prüfe ob Edge Function erfolgreich deployed wurde

---

## 📊 **Expected Data Structure**

### **Serie:**

```json
{
  "type": "series",
  "episode_layout": "streaming-4-act",
  "season_engine": "serial",
  "narrative_structure": null,
  "beat_template": "season-lite-5"
}
```

### **Film:**

```json
{
  "type": "film",
  "narrative_structure": "3-act",
  "episode_layout": null,
  "season_engine": null,
  "beat_template": "save-the-cat"
}
```

---

## ✅ **Success Indicators**

- [ ] Database Migration ran successfully
- [ ] Edge Function deployed (Version 1.1.0)
- [ ] Create Serie Project shows 2 dropdowns
- [ ] Create Film Project shows 1 dropdown
- [ ] Test project saves correctly
- [ ] Edit Mode works
- [ ] View Mode displays correctly

---

## 🔄 **Rollback (if needed)**

### **Database:**

```sql
ALTER TABLE projects
DROP COLUMN IF EXISTS episode_layout,
DROP COLUMN IF EXISTS season_engine;

DROP INDEX IF EXISTS idx_projects_episode_layout;
DROP INDEX IF EXISTS idx_projects_season_engine;
```

### **Edge Function:**

Redeploy previous version from Git history.

---

## 📁 **Files to Copy**

1. **Migration:** `/supabase/migrations/030_add_series_episode_season_structures.sql`
2. **Edge Function:** `/supabase/functions/scriptony-projects/index.ts`

---

**🎉 Das war's! Nach beiden Steps sollte alles funktionieren.**
