interface AdPlaceholderProps {
  type: "leaderboard" | "rectangle" | "halfpage" | "responsive";
  className?: string;
}

export function AdPlaceholder({ type, className = "" }: AdPlaceholderProps) {
  const dimensions = {
    leaderboard: "h-24 max-w-[728px]",
    rectangle: "h-64 w-80",
    halfpage: "h-[600px] w-80",
    responsive: "h-24 md:h-32",
  };

  return (
    <div
      className={`${dimensions[type]} mx-auto bg-muted/20 border border-border rounded-md flex items-center justify-center ${className}`}
      data-testid={`ad-${type}`}
    >
      <span className="text-xs text-muted-foreground">Advertisement</span>
    </div>
  );
}
