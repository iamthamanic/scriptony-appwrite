import { AtSign, Slash } from "lucide-react";
import { Badge } from "./ui/badge";

interface ReferenceTagProps {
  type: "character" | "asset";
  name: string;
  variant?: "default" | "outline";
  size?: "sm" | "md";
}

export function ReferenceTag({
  type,
  name,
  variant = "default",
  size = "md",
}: ReferenceTagProps) {
  const isCharacter = type === "character";

  const colorClasses = isCharacter
    ? "bg-character-blue-light text-character-blue border-character-blue/30 hover:bg-character-blue/20"
    : "bg-asset-green-light text-asset-green border-asset-green/30 hover:bg-asset-green/20";

  const sizeClasses =
    size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";
  const iconSize = size === "sm" ? "size-3" : "size-3.5";

  return (
    <Badge
      variant={variant}
      className={`${colorClasses} ${sizeClasses} gap-1.5`}
    >
      {isCharacter ? (
        <AtSign className={iconSize} />
      ) : (
        <Slash className={iconSize} />
      )}
      <span>{name}</span>
    </Badge>
  );
}
