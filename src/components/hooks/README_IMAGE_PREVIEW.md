# useImagePreview Hook

Wiederverwendbarer Hook für Hover-Vorschau von Bildern in der gesamten Scriptony-App.

## Features

- ✅ **Kleines Thumbnail** - Zeigt kleines Vorschaubild (z.B. 24x24px)
- ✅ **Hover-Vergrößerung** - Bei Hover erscheint großes Bild in Originalgröße
- ✅ **Smart Positioning** - Automatische Positionierung (rechts, links, zentriert)
- ✅ **Smooth Animations** - Fade-in und Zoom-Effekte
- ✅ **300ms Delay** - Verhindert ungewollte Popups bei schnellem Hover
- ✅ **Responsive** - Max. 400x400px, passt sich an Viewport an

## Usage

```tsx
import { useImagePreview } from "../hooks/useImagePreview";

function MyComponent() {
  const { handleMouseEnter, handleMouseLeave, ImagePreviewOverlay } =
    useImagePreview();

  return (
    <div>
      {/* Small thumbnail with hover preview */}
      <div
        className="w-6 h-6 rounded overflow-hidden cursor-pointer"
        onMouseEnter={(e) => handleMouseEnter(e, imageUrl)}
        onMouseLeave={handleMouseLeave}
      >
        <img
          src={imageUrl}
          alt="Preview"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Render overlay at end of component */}
      <ImagePreviewOverlay />
    </div>
  );
}
```

## API

### Return Values

- `handleMouseEnter(e: React.MouseEvent, imageUrl: string)` - Trigger beim Hover-Start
- `handleMouseLeave()` - Trigger beim Hover-End
- `ImagePreviewOverlay` - React Component für das Popup
- `isPreviewOpen` - Boolean State (optional für custom logic)

## Styling

Das Popup hat:

- Border mit `border-primary/20`
- Shadow mit `shadow-2xl`
- Smooth animations (`animate-in fade-in zoom-in-95`)
- Gradient overlay für besseren visuellen Effekt
