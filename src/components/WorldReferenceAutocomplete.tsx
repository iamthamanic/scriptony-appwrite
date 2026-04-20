import { Globe, Mountain, Landmark, Users, Palette } from "lucide-react";

interface WorldItem {
  id: string;
  name: string;
  category: string;
  categoryType: string;
}

interface WorldReferenceAutocompleteProps {
  items: WorldItem[];
  search: string;
  position: { top: number; left: number };
  onSelect: (itemName: string) => void;
}

const getCategoryIcon = (categoryType: string) => {
  switch (categoryType) {
    case "geography":
      return Mountain;
    case "politics":
      return Landmark;
    case "society":
      return Users;
    case "culture":
      return Palette;
    default:
      return Globe;
  }
};

export function WorldReferenceAutocomplete({
  items,
  search,
  position,
  onSelect,
}: WorldReferenceAutocompleteProps) {
  // Filter by search
  const filtered = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()),
  );

  // Group by category
  const grouped = filtered.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, WorldItem[]>,
  );

  if (filtered.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-[300px] overflow-y-auto"
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        minWidth: "280px",
        maxWidth: "350px",
      }}
    >
      <div className="p-1">
        {Object.entries(grouped).map(([category, catItems]) => {
          const Icon = getCategoryIcon(catItems[0].categoryType);
          return (
            <div key={category}>
              <div className="px-2 py-1.5 text-xs text-asset-green flex items-center gap-1.5">
                <Icon className="size-3" />/ {category}
              </div>
              {catItems.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(item.name);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-asset-green-light rounded-md flex items-center gap-2 transition-colors"
                >
                  <Icon className="size-4 text-asset-green shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate text-asset-green">
                      /{item.name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
