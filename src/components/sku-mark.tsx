import { cn } from "@/lib/cn";

export function SkuMark({ slot, className }: { slot: string; className?: string }) {
  return (
    <div
      className={cn(
        "relative h-28 overflow-hidden rounded-md bg-surface-2",
        className,
      )}
      data-slot={slot}
      aria-hidden
    >
      <div className="absolute inset-x-6 top-5 h-16 rounded-sm border border-border-strong bg-bg/70" />
      <div className="absolute inset-x-10 top-8 h-10 rounded-xs bg-fg/8" />
      <div className="absolute bottom-3 left-1/2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-accent/40" />
    </div>
  );
}
