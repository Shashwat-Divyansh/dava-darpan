import { cn } from "@/lib/utils";

/** shadcn/ui Skeleton — a pulsing placeholder shown while content loads. */
function Skeleton({ className, ...props }) {
  return <div data-slot="skeleton" className={cn("bg-accent animate-pulse rounded-md", className)} {...props} />;
}

export { Skeleton };
