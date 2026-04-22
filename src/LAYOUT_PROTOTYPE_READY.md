# 🎨 LAYOUT PROTOTYPE - READY TO TEST!

## ✅ Was wurde erstellt?

Ein **interaktiver Prototyp** zum Testen der neuen Cover + Info Layouts für ProjectDetail und WorldDetail Pages!

---

## 🚀 WIE TESTE ICH DAS?

### 1. **Prototype öffnen:**

- Klick auf den **"🎨 Proto"** Button oben rechts in der Navigation
- ODER navigiere zur Page `layout-prototype`

### 2. **Features des Prototyps:**

#### **View Mode Toggle:**

- 🖥️ **Desktop** - Zeigt Desktop-Layout (max-width: 1024px)
- 📱 **Mobile** - Zeigt Mobile-Layout (max-width: 390px = iPhone)

#### **Layout Options:**

- **Option 1 (NEU):**
  - Desktop: Info LINKS + Cover RECHTS (gleiche Höhe 360px)
  - Mobile: Cover OBEN zentriert + Collapsible Info (Standard: eingeklappt)

- **Option 2 (AKTUELL):**
  - Desktop + Mobile: Cover OBEN zentriert + Info UNTEN (volle Breite)

---

## 🎯 Was solltest du testen?

### **Desktop View (1024px):**

#### Option 1:

- ✅ Info links (360px Höhe)
- ✅ Cover rechts (240x360px Portrait - gleich hoch wie Info!)
- ✅ Effizienter Platzverbrauch
- ✅ Cover prominent rechts positioniert!
- ❓ **Sieht das gut aus?**
- ❓ **Ist die Info-Card zu breit/zu schmal?**

#### Option 2:

- ✅ Cover oben zentriert
- ✅ Info unten volle Breite
- ❌ Verschenkt viel horizontalen Platz
- ❓ **Vergleich: Welches Layout ist besser?**

---

### **Mobile View (390px = iPhone):**

#### Option 1:

- ✅ Cover oben zentriert (prominent!)
- ✅ Info **Collapsible** (Standard: GESCHLOSSEN)
  - **Vorteil:** Spart Platz! User scrollt weniger!
  - Klick auf "Projekt-Informationen" zum Ausklappen
- ✅ Tabs direkt sichtbar
- ❓ **Ist Collapsible gut oder nervt das?**
- ❓ **Sollte Info standardmäßig OFFEN sein?**

#### Option 2:

- ✅ Cover oben
- ✅ Info immer sichtbar (volle Breite)
- ❌ User muss mehr scrollen
- ❓ **Vergleich: Welches ist mobil besser?**

---

## 📝 Feedback-Fragen:

### Desktop:

1. **Option 1:** Sieht Info LINKS + Cover RECHTS gut aus?
2. Ist die Info-Card zu breit / zu eng / perfekt?
3. Oder lieber doch Option 2 (Cover oben)?

### Mobile:

1. **Option 1:** Ist Collapsible Info (Standard: zu) eine gute Idee?
2. Oder sollte Info standardmäßig OFFEN sein?
3. Oder lieber Option 2 (Info immer sichtbar)?

### Allgemein:

1. **Gleicher Aufbau für Projects UND Worlds?** (Konsistenz!)
2. Welche Option fühlst sich am besten an?

---

## 🎨 Mock-Daten im Prototyp:

```
Titel: "Mein Episches Filmprojekt"
Genre: Drama, Sci-Fi
Status: In Arbeit
Erstellt: 9. November 2025
Beschreibung: Eine epische Geschichte über Mut...
```

**Cover:** Gradient Placeholder mit Film-Icon (wie wenn kein Cover hochgeladen)

---

## 🧪 Test-Workflow:

1. **Desktop View:**
   - Switch zu "Option 1" → Guck dir Layout an
   - Switch zu "Option 2" → Vergleich!
   - **Was sieht besser aus?**

2. **Mobile View:**
   - Switch zu "Option 1"
   - **Klick auf "Projekt-Informationen"** → Info klappt auf/zu
   - **Ist das praktisch oder nervt das?**
   - Switch zu "Option 2" → Vergleich!

3. **Switche zwischen Desktop/Mobile:**
   - Sieh dir responsive Verhalten an
   - **Ist der Übergang smooth?**

---

## 📦 Files Created:

1. `/components/pages/LayoutPrototypePage.tsx` - Der Prototyp
2. `/LAYOUT_PROTOTYPE_READY.md` - Diese Anleitung
3. `/App.tsx` - Route hinzugefügt
4. `/components/Navigation.tsx` - "🎨 Proto" Button hinzugefügt

---

## 🗑️ Nach dem Test:

Wenn du dich entschieden hast, **SAGE MIR BESCHEID:**

- ✅ "Option 1 implementieren!" → Ich ändere ProjectsPage + WorldbuildingPage
- ✅ "Option 2 behalten!" → Kein Änderung nötig
- ✅ "Option 1, aber Info standardmäßig OFFEN auf Mobile!" → Anpassung
- ✅ "Ich will noch eine andere Variante!" → Beschreib sie mir!

**Dann lösche ich den Prototyp und Button wieder!**

---

## ✅ READY TO TEST!

**Klick jetzt auf "🎨 Proto" oben rechts und teste die Layouts!** 🚀

---

## 💡 Weitere Ideen für den Prototyp?

- Mehr Mock-Daten?
- Andere Breakpoints?
- Animation zeigen?
- Side-by-Side Vergleich?

**Sag Bescheid, dann passe ich's an!** 🎨
