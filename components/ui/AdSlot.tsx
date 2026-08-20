"use client";

interface AdSlotProps {
  position: "top" | "sidebar" | "bottom";
  className?: string;
}

export function AdSlot({ position, className = "" }: AdSlotProps) {
  const dimensions: Record<string, string> = {
    top: "h-24 w-full",
    sidebar: "h-96 w-full max-w-xs",
    bottom: "h-32 w-full",
  };

  return (
    <div
      className={`ad-container flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 ${dimensions[position]} ${className}`}
      data-ad-position={position}
      aria-hidden="true"
    >
      <span className="text-xs text-gray-400 dark:text-gray-600">
        Advertisement
      </span>
    </div>
  );
}
