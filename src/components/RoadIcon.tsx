import svgPaths from "../imports/svg-yshwnm428s";

interface RoadIconProps {
  className?: string;
  style?: React.CSSProperties;
}

export function RoadIcon({ className, style }: RoadIconProps) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      viewBox="0 0 14 15"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        clipRule="evenodd"
        d={svgPaths.p3391bc00}
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}
