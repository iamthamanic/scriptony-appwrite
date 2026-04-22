# 🧪 TESTE JETZT: Series Structure Feature

**Status:** ✅ Backend Deployed | ✅ Frontend Ready | ✅ Types Updated  
**Date:** 2025-11-08

---

## 🎯 **Was du jetzt testen solltest:**

### **Test 1: Serie erstellen** 📺

1. Gehe zu **Projects Page**
2. Klicke **Create New Project**
3. Wähle **Type: Serie**
4. Du solltest jetzt sehen:
   - ✅ **Episode Layout** Dropdown (statt Narrative Structure)
   - ✅ **Season Engine** Dropdown
   - ✅ **Beat Template** Dropdown

5. Fülle aus:
   - **Title:** "Breaking Bad - Test"
   - **Genres:** Drama, Thriller
   - **Episode Layout:** "Streaming 4-Akt"
   - **Season Engine:** "Serial (Season-Arc)"
   - **Beat Template:** "Season-Lite-5 (Macro)"

6. Klicke **Create Project**
7. ✅ Projekt sollte erfolgreich erstellt werden

---

### **Test 2: Film erstellen** 🎬

1. Klicke **Create New Project**
2. Wähle **Type: Film**
3. Du solltest jetzt sehen:
   - ✅ **Narrative Structure** Dropdown (statt Episode Layout/Season Engine)
   - ✅ **Beat Template** Dropdown

4. Fülle aus:
   - **Title:** "Inception - Test"
   - **Genres:** Sci-Fi, Action
   - **Narrative Structure:** "3-Akt (klassisch)"
   - **Beat Template:** "Save the Cat! (15)"

5. Klicke **Create Project**
6. ✅ Projekt sollte erfolgreich erstellt werden

---

### **Test 3: Buch erstellen** 📖

1. Klicke **Create New Project**
2. Wähle **Type: Buch**
3. Du solltest jetzt sehen:
   - ✅ **Narrative Structure** mit **Buch-spezifischen Optionen:**
     - "3-Teiler (klassisch)"
     - "Heldenreise"
     - "Save the Cat (adapted)"
   - ✅ **Beat Template** Dropdown

4. Erstelle ein Test-Projekt

---

### **Test 4: Hörspiel erstellen** 🎙️

1. Klicke **Create New Project**
2. Wähle **Type: Hörspiel**
3. Du solltest jetzt sehen:
   - ✅ **Narrative Structure** mit **Audio-spezifischen Optionen:**
     - "30 min / 3-Akt"
     - "60 min / 4-Akt"
     - "Podcast 25–35 min"
   - ✅ **Beat Template** Dropdown

4. Erstelle ein Test-Projekt

---

### **Test 5: Edit Mode** ✏️

1. Öffne ein **Serie-Projekt**
2. Klicke auf **Edit** (Stift-Icon)
3. Du solltest sehen:
   - ✅ **Episode Layout** Dropdown
   - ✅ **Season Engine** Dropdown
   - ✅ **Beat Template** Dropdown
4. Ändere Werte
5. Klicke **Save**
6. ✅ Änderungen sollten gespeichert werden

7. Öffne ein **Film-Projekt**
8. Klicke auf **Edit**
9. Du solltest sehen:
   - ✅ **Narrative Structure** Dropdown
   - ✅ **Beat Template** Dropdown
10. Ändere Werte → Save
11. ✅ Änderungen sollten gespeichert werden

---

### **Test 6: View Mode** 👁️

1. Öffne ein **Serie-Projekt** (nicht im Edit Mode)
2. Du solltest sehen:
   - ✅ **Episode Layout:** "Streaming 4-Akt" (oder was du gewählt hast)
   - ✅ **Season Engine:** "Serial (Season-Arc)"
   - ✅ **Beat Template:** "Season-Lite-5"

3. Öffne ein **Film-Projekt**
4. Du solltest sehen:
   - ✅ **Narrative Structure:** "3-Akt (klassisch)"
   - ✅ **Beat Template:** "Save the Cat!"

---

## 📊 **Episode Layout Optionen (Serie)**

| Wert               | Label            | Beschreibung                                                        |
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

## 📊 **Season Engine Optionen (Serie)**

| Wert                 | Label                  | Beschreibung                  |
| -------------------- | ---------------------- | ----------------------------- |
| `serial`             | Serial (Season-Arc)    | Durchgehende Handlung         |
| `motw`               | MOTW/COTW              | Fall der Woche                |
| `hybrid`             | Hybrid (Arc+MOTW)      | Mischform                     |
| `anthology`          | Anthology (episodisch) | Jede Folge neu                |
| `seasonal-anthology` | Seasonal Anthology     | Jede Staffel neu              |
| `limited-series`     | Limited Series         | 4–10 Teile, geschlossener Arc |

---

## 📊 **Beat Template Optionen (Alle Typen)**

| Wert             | Label                    | Verfügbar für    |
| ---------------- | ------------------------ | ---------------- |
| `lite-7`         | Lite-7 (minimal)         | Alle             |
| `save-the-cat`   | Save the Cat! (15)       | Alle             |
| `syd-field`      | Syd Field / Paradigm     | Alle             |
| `heroes-journey` | Heldenreise (Vogler, 12) | Alle             |
| `seven-point`    | Seven-Point Structure    | Alle             |
| `8-sequences`    | 8-Sequenzen              | Alle             |
| `story-circle`   | Story Circle 8           | Alle             |
| `season-lite-5`  | Season-Lite-5 (Macro)    | **Nur Serie** ⭐ |

---

## 🐛 **Wenn etwas nicht funktioniert:**

### **Problem: Ich sehe keine neuen Felder**

**Lösung:**

1. Hard Refresh: `Cmd+Shift+R` (Mac) / `Ctrl+Shift+F5` (Windows)
2. Clear Browser Cache
3. Check Browser Console für Errors

---

### **Problem: Create Project schlägt fehl**

**Lösung:**

1. Öffne Browser Console (F12)
2. Check Network Tab für API Errors
3. Check ob Migration erfolgreich war:
   ```sql
   -- Im Supabase SQL Editor
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'projects'
   AND column_name IN ('episode_layout', 'season_engine');
   ```
4. Sollte 2 Zeilen zurückgeben

---

### **Problem: Edge Function Error**

**Check:**

1. Gehe zu **Supabase Dashboard** → **Edge Functions** → **scriptony-projects**
2. Check **Logs Tab** für Errors
3. Check ob Version **1.1.0** deployed wurde

---

## ✅ **Success Checklist**

- [ ] Serie erstellt mit Episode Layout + Season Engine
- [ ] Film erstellt mit Narrative Structure
- [ ] Buch erstellt mit Buch-Strukturen
- [ ] Hörspiel erstellt mit Audio-Strukturen
- [ ] Edit Mode funktioniert für Serie
- [ ] Edit Mode funktioniert für Film
- [ ] View Mode zeigt korrekte Felder
- [ ] Keine Console Errors
- [ ] Speichern funktioniert korrekt

---

## 🎉 **Wenn alle Tests bestanden:**

**Feature ist LIVE und ready to use!** 🚀

Du kannst jetzt:

- ✅ Detaillierte Serien-Strukturen definieren
- ✅ Episode-Layouts für verschiedene TV-Formate wählen
- ✅ Season Engines (Serial, MOTW, Hybrid) auswählen
- ✅ Spezifische Narrative Structures für Bücher & Hörspiele nutzen
- ✅ Story Beat Templates für alle Projekt-Typen verwenden

---

**🎬 Viel Spaß beim Strukturieren deiner Serien-Projekte!**
