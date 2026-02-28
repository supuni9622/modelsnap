"use client";

import { cn } from "@/lib/utils";

export interface FilterChipOption<T extends string = string> {
  value: T;
  label: string;
}

interface FilterChipGroupProps<T extends string> {
  label: string;
  options: FilterChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** When true, "All" (first option) is styled as neutral reset; otherwise same as others */
  allIsReset?: boolean;
  /** Smaller label and chips for dense layouts */
  compact?: boolean;
}

export function FilterChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
  allIsReset = true,
  compact = false,
}: FilterChipGroupProps<T>) {
  return (
    <div className={cn(compact ? "space-y-1" : "space-y-2", className)}>
      <span
        className={cn(
          "font-medium uppercase tracking-wider text-muted-foreground",
          compact ? "text-[10px]" : "text-xs"
        )}
      >
        {label}
      </span>
      <div className={cn("flex flex-wrap", compact ? "gap-1" : "gap-1.5")}>
        {options.map((opt) => {
          const isSelected = value === opt.value;
          const isAllOption = allIsReset && opt.value === "all";
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value as T)}
              className={cn(
                "rounded-full font-medium transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                compact ? "px-2 py-0.5 text-xs" : "px-3 py-1.5 text-sm",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : isAllOption
                    ? "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    : "bg-muted/50 text-foreground hover:bg-muted hover:text-foreground"
              )}
              aria-pressed={isSelected}
              aria-label={`Filter by ${label}: ${opt.label}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
