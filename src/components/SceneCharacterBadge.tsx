import { Badge } from "./ui/badge";
import { AtSign } from "lucide-react";

interface SceneCharacterBadgeProps {
  character: {
    id: string;
    name: string;
    image?: string;
  };
}

export function SceneCharacterBadge({ character }: SceneCharacterBadgeProps) {
  return (
    <Badge
      variant="outline"
      className="bg-character-blue-light text-character-blue border-character-blue/30 hover:bg-character-blue/20 px-2 py-1 gap-1.5"
    >
      {character.image ? (
        <img
          src={character.image}
          alt={character.name}
          className="w-4 h-4 rounded-full object-cover"
        />
      ) : (
        <AtSign className="size-3.5" />
      )}
      <span className="text-xs">{character.name}</span>
    </Badge>
  );
}
