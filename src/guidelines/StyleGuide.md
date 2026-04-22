# Scriptony Style Guide

## Design-System Übersicht

Scriptony verwendet ein violett-basiertes Design-System mit Unterstützung für Light und Dark Theme. Das Design folgt einem 12-Spalten-Grid und nutzt die Inter-Schriftart.

---

## Farbpalette

### Primary Colors (Violett)

#### Light Theme

- **Primary Purple**: `#6E59A5` - Hauptfarbe für Buttons, Links, aktive Zustände
- **Primary Purple Light**: `#E5DEFF` - Hintergründe, Secondary Buttons
- **Primary Purple Dark**: `#4A3D70` - Text auf hellen Hintergründen

#### Dark Theme

- **Primary Purple**: `#8E75D1` - Hauptfarbe (aufgehellt für besseren Kontrast)
- **Primary Purple Light**: `#2E2A3A` - Gedämpfte Hintergründe
- **Primary Purple Dark**: `#B09FE0` - Hellere Variante für Akzente

---

### Accent Colors

#### Light Theme

- **Accent Blue**: `#33C3F0` - Informative Elemente, Links, Highlights
- **Accent Pink**: `#D946EF` - Besondere Aktionen, Badges

#### Dark Theme

- **Accent Blue**: `#1D9BF0` - Gedämpftes Blau für Dark Mode
- **Accent Pink**: `#BE3ED5` - Gedämpftes Pink für Dark Mode

---

### Background & Surface Colors

#### Light Theme

- **Background**: `#F5F6F8` - Haupt-Hintergrund der App
- **Card**: `#FFFFFF` - Karten, Panels, Dialoge
- **Popover**: `#FFFFFF` - Dropdown-Menüs, Tooltips
- **Secondary**: `#E5DEFF` - Secondary UI-Elemente
- **Muted**: `#E5E7EB` - Gedämpfte Hintergründe, inaktive Elemente

#### Dark Theme

- **Background**: `#1C1823` - Haupt-Hintergrund (dunkles Violett)
- **Card**: `#222033` - Karten, Panels (etwas heller als Background)
- **Popover**: `#222033` - Dropdown-Menüs, Tooltips
- **Secondary**: `#2E2A3A` - Secondary UI-Elemente
- **Muted**: `#2E2A3A` - Gedämpfte Hintergründe

---

### Text Colors

#### Light Theme

- **Foreground**: `#0A0A0A` - Haupttext
- **Card Foreground**: `#0A0A0A` - Text auf Karten
- **Primary Foreground**: `#FFFFFF` - Text auf Primary-Buttons
- **Secondary Foreground**: `#4A3D70` - Text auf Secondary-Buttons
- **Muted Foreground**: `#71717A` - Sekundärer Text, Hints
- **Accent Foreground**: `#FFFFFF` - Text auf Accent-Elementen

#### Dark Theme

- **Foreground**: `#EDE9FE` - Haupttext (helles Violett)
- **Card Foreground**: `#EDE9FE` - Text auf Karten
- **Primary Foreground**: `#1C1823` - Text auf Primary-Buttons (dunkler für Kontrast)
- **Secondary Foreground**: `#EDE9FE` - Text auf Secondary-Buttons
- **Muted Foreground**: `#9CA3AF` - Sekundärer Text, Hints
- **Accent Foreground**: `#FFFFFF` - Text auf Accent-Elementen

---

### Semantic Colors

#### Beide Themes

- **Destructive**: `#EF4444` - Fehler, Lösch-Aktionen, Warnungen
- **Destructive Foreground**: `#FFFFFF` - Text auf destructive Elementen

---

### UI Element Colors

#### Light Theme

- **Border**: `#E5E7EB` - Standard-Rahmenfarbe
- **Input**: `transparent` - Input-Rahmen
- **Input Background**: `#FFFFFF` - Input-Hintergrund
- **Switch Background**: `#E5E7EB` - Toggle-Switch Hintergrund
- **Ring**: `#6E59A5` - Focus-Ring (Barrierefreiheit)

#### Dark Theme

- **Border**: `#2E2A3A` - Standard-Rahmenfarbe
- **Input**: `#2E2A3A` - Input-Rahmen
- **Ring**: `#8E75D1` - Focus-Ring

---

### Sidebar Colors

#### Light Theme

- **Sidebar**: `#FFFFFF`
- **Sidebar Foreground**: `#0A0A0A`
- **Sidebar Primary**: `#6E59A5`
- **Sidebar Primary Foreground**: `#FFFFFF`
- **Sidebar Accent**: `#F5F6F8`
- **Sidebar Accent Foreground**: `#0A0A0A`
- **Sidebar Border**: `#E5E7EB`
- **Sidebar Ring**: `#6E59A5`

#### Dark Theme

- **Sidebar**: `#222033`
- **Sidebar Foreground**: `#EDE9FE`
- **Sidebar Primary**: `#8E75D1`
- **Sidebar Primary Foreground**: `#1C1823`
- **Sidebar Accent**: `#2E2A3A`
- **Sidebar Accent Foreground**: `#EDE9FE`
- **Sidebar Border**: `#2E2A3A`
- **Sidebar Ring**: `#8E75D1`

---

### Chart Colors (Beide Themes)

Verwendet für Diagramme und Datenvisualisierung:

#### Light Theme

- **Chart 1**: `oklch(0.646 0.222 41.116)` - Warmes Orange
- **Chart 2**: `oklch(0.6 0.118 184.704)` - Cyan
- **Chart 3**: `oklch(0.398 0.07 227.392)` - Dunkles Blau
- **Chart 4**: `oklch(0.828 0.189 84.429)` - Gelb-Grün
- **Chart 5**: `oklch(0.769 0.188 70.08)` - Orange

#### Dark Theme

- **Chart 1**: `oklch(0.488 0.243 264.376)` - Violett
- **Chart 2**: `oklch(0.696 0.17 162.48)` - Grün
- **Chart 3**: `oklch(0.769 0.188 70.08)` - Orange
- **Chart 4**: `oklch(0.627 0.265 303.9)` - Magenta
- **Chart 5**: `oklch(0.645 0.246 16.439)` - Rot-Orange

---

## Verwendung in Tailwind

### CSS Custom Properties

Alle Farben sind als CSS Custom Properties definiert und können über Tailwind-Klassen verwendet werden:

```tsx
// Primary Color
<button className="bg-primary text-primary-foreground">

// Background & Card
<div className="bg-background">
  <div className="bg-card text-card-foreground">

// Muted Elements
<p className="text-muted-foreground">

// Borders
<div className="border border-border">

// Accent
<span className="text-accent">
```

### Direct CSS Variable Usage

Falls du direkt auf die Farben zugreifen musst:

```css
.custom-element {
  background-color: var(--primary);
  color: var(--primary-foreground);
}
```

---

## Border Radius

Das Design-System verwendet abgerundete Ecken:

- **Default Radius**: `0.75rem` (12px)
- **Small**: `calc(var(--radius) - 4px)` → 8px
- **Medium**: `calc(var(--radius) - 2px)` → 10px
- **Large**: `var(--radius)` → 12px
- **Extra Large**: `calc(var(--radius) + 4px)` → 16px

```tsx
<div className="rounded-lg">      // 12px
<div className="rounded-xl">      // 16px
<div className="rounded-2xl">     // 24px (Dialoge)
<div className="rounded-full">    // Vollständig rund
```

---

## Typography

### Font Family

- **Default**: Inter (System Font Fallback)

### Font Sizes (nicht über Tailwind überschreiben!)

Die Schriftgrößen werden automatisch über Typography-Definitionen gesetzt:

- **h1**: `--text-2xl` - 24px, Medium (500)
- **h2**: `--text-xl` - 20px, Medium (500)
- **h3**: `--text-lg` - 18px, Medium (500)
- **h4**: `--text-base` - 16px, Medium (500)
- **p**: `--text-base` - 16px, Normal (400)
- **label**: `--text-base` - 16px, Medium (500)
- **button**: `--text-base` - 16px, Medium (500)
- **input**: `--text-base` - 16px, Normal (400)

### Font Weights

- **Normal**: `400`
- **Medium**: `500`

⚠️ **Wichtig**: Verwende KEINE Tailwind-Klassen für `text-*`, `font-weight`, oder `leading-*`, außer es ist explizit gewünscht!

---

## Spacing & Layout

### Grid System

- 12-Spalten-Grid
- Mobile-first Approach
- Responsive Breakpoints (Tailwind Standard)

### Container Padding

- Mobile: `px-4` (16px)
- Consistent vertical spacing: `py-6` (24px) für Sections

---

## Component States

### Default State

- Normale Farben laut Theme

### Hover State

```tsx
className = "hover:bg-primary/90"; // 90% Opacity
className = "hover:border-primary/50"; // 50% Opacity für Borders
```

### Active/Pressed State

```tsx
className = "active:scale-[0.98]"; // Leichte Verkleinerung
className = "active:scale-95"; // Stärkere Verkleinerung
```

### Disabled State

```tsx
className = "disabled:opacity-50 disabled:cursor-not-allowed";
```

### Focus State

- Automatischer Focus-Ring durch `--ring` Color
- `outline-ring/50` für bessere Sichtbarkeit

---

## Best Practices

### 1. Konsistenz

- Verwende immer die definierten Farbvariablen
- Keine Hard-Coded Hex-Werte im Code

### 2. Kontrast

- Achte auf ausreichenden Kontrast (WCAG AA Standard)
- Verwende `*-foreground` Farben für Text auf farbigen Hintergründen

### 3. Semantic Usage

- `primary` für Haupt-Aktionen
- `secondary` für weniger wichtige Aktionen
- `destructive` für Lösch-/Gefahr-Aktionen
- `muted` für deaktivierte/sekundäre Inhalte

### 4. Dark Mode Support

- Alle Komponenten müssen in beiden Themes funktionieren
- Teste immer beide Modi

### 5. Accessibility

- Focus-Rings nicht entfernen
- Ausreichender Kontrast bei Text
- Touch-Targets mindestens 44x44px (Mobile)

---

## Beispiel-Komponenten

### Primary Button

```tsx
<button className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg">
  Button
</button>
```

### Secondary Button

```tsx
<button className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-lg">
  Button
</button>
```

### Edit/Save Button (Gray Style)

Für Bearbeiten/Speichern-Buttons wird ein subtiler grauer Stil mit lila Hover verwendet:

```tsx
<Button
  variant="ghost"
  size="sm"
  className="h-7 px-3 rounded-[10px] bg-[#e4e6ea] dark:bg-muted hover:bg-gray-300 dark:hover:bg-muted/80 text-[#646567] dark:text-foreground hover:text-primary"
>
  <Edit2 className="size-3 mr-1" />
  <span className="text-xs">Bearbeiten</span>
</Button>
```

**Eigenschaften**:

- Hintergrund: `bg-[#e4e6ea]` (light) / `dark:bg-muted` (dark)
- Hover-Hintergrund: `hover:bg-gray-300` / `dark:hover:bg-muted/80`
- Textfarbe: `text-[#646567]` (light) / `dark:text-foreground` (dark)
- Hover-Text: `hover:text-primary` (wird lila beim Hover)
- Abgerundete Ecken: `rounded-[10px]`

### Card

```tsx
<div className="bg-card text-card-foreground border border-border rounded-xl p-4">
  <h3>Card Title</h3>
  <p className="text-muted-foreground">Card content</p>
</div>
```

### Input

Alle Input-Felder haben einen 2px dicken Rahmen:

```tsx
<Input placeholder="Enter text..." />
```

**Eigenschaften**:

- Rahmen: `border-2 border-border` (2px, grau standardmäßig)
- Beim Focus: `border-primary` (lila) mit Ring-Effekt
- Hintergrund: `bg-input-background` (weiß/dunkel je nach Theme)

### Farbige Tags in Textfeldern

Für Textfelder mit @Charakteren, /Assets und #Szenen-Tags wird ein Overlay-System verwendet:

```tsx
<div className="relative">
  {/* Colored Text Overlay */}
  <div className="absolute left-3 top-2 pointer-events-none text-sm whitespace-pre-wrap select-none z-10">
    {text
      ? colorizeText(text).map((part, index) => {
          if (part.type === "character") {
            return (
              <span
                key={index}
                style={{ color: "var(--character-blue)", fontWeight: 500 }}
              >
                {part.text}
              </span>
            );
          } else if (part.type === "asset") {
            return (
              <span
                key={index}
                style={{ color: "var(--asset-green)", fontWeight: 500 }}
              >
                {part.text}
              </span>
            );
          } else if (part.type === "scene") {
            return (
              <span
                key={index}
                style={{ color: "var(--scene-pink)", fontWeight: 500 }}
              >
                {part.text}
              </span>
            );
          }
          return <span key={index}>{part.text}</span>;
        })
      : null}
  </div>
  <Textarea
    value={text}
    className="relative text-transparent caret-foreground"
    style={{ caretColor: "var(--foreground)" }}
  />
</div>
```

**Tag-Farben**:

- `@Charaktere`: Blau (`--character-blue`) - kompletter Name inklusive @ ist blau
- `/Assets`: Grün (`--asset-green`) - kompletter Name inklusive / ist grün  
  Beispiel: `/Geographie` - der komplette Text ist grün
- `#Szenen`: Pink (`--scene-pink`) - kompletter Name inklusive # ist pink

**Wichtig**: Der komplette Tag (Symbol + Name) hat die jeweilige Farbe, nicht nur das Symbol!

---

## Worldbuilding-Kategorien

### Kategorie-Icons und Badges

Kategorien im Worldbuilding-System verwenden das folgende Farbschema:

**Icons**:

- Hintergrund: `bg-primary/10 dark:bg-primary/20` (helleres Lila)
- Icon-Farbe: `text-primary` (Lila)

**Asset-Anzahl Badges**:

- Hintergrund: `bg-primary/10 dark:bg-primary/20` (helleres Lila)
- Text: `text-primary` (Lila)
- Hover: `hover:bg-primary/20 dark:hover:bg-primary/30`

**Kategorienamen in der Liste**:

- Format: `/{Kategoriename}` - komplett grün (`text-asset-green`)
- Beispiel: `/Geographie`, `/Politik`, `/Kultur`

```tsx
// Kategorie Icon
<div className="rounded-lg bg-primary/10 dark:bg-primary/20 p-2">
  <Icon className="size-4 text-primary" />
</div>

// Asset-Anzahl Badge
<Badge className="text-[10px] bg-primary/10 dark:bg-primary/20 text-primary hover:bg-primary/20 dark:hover:bg-primary/30 border-0 px-1.5 py-0.5">
  {count} Assets
</Badge>

// Kategoriename
<span className="text-asset-green">/{categoryName}</span>
```

---

## Mobile Optimierungen

### Safe Areas

```tsx
className = "pb-safe"; // Padding bottom für Home-Indicator
className = "safe-area-bottom"; // iOS safe area support
```

### Bottom Navigation

- Fixiert am unteren Rand
- Schatten für Elevation: `shadow-[0_-2px_10px_rgba(0,0,0,0.1)]`
- Z-Index: `z-50`

### Touch Targets

- Minimum: `h-11 w-11` (44px)
- Buttons: `h-9` oder `h-11`
- FAB (Floating Action Button): `w-14 h-14`

---

## Transitions & Animations

### Standard Transitions

```tsx
className = "transition-colors"; // Farbübergänge
className = "transition-all"; // Alle Properties
className = "transition-transform"; // Transformationen
```

### Scale Effects

```tsx
className = "active:scale-[0.98]"; // Button Press
className = "hover:scale-110"; // Hover Vergrößerung
```

---

## Z-Index Hierarchy

- Navigation (Top Bar): `z-50`
- Bottom Navigation: `z-50`
- FAB (Floating Button): `z-40`
- Modals/Dialogs: Automatisch durch ShadCN
- Tooltips: Automatisch durch ShadCN

---

## Ressourcen

- **Farben Referenz**: `/styles/globals.css`
- **Komponenten**: `/components/ui/`
- **Guidelines**: `/guidelines/Guidelines.md`
- **Design-System**: Basiert auf ShadCN UI mit Custom Scriptony Theme

---

_Letzte Aktualisierung: September 2025_
