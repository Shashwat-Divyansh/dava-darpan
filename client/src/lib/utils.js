import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn() merges class names and resolves Tailwind conflicts.
 * Used by every shadcn/ui component (e.g. cn("p-2", condition && "bg-red-500")).
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
