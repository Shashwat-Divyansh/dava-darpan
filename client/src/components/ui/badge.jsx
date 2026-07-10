import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

/** shadcn/ui Badge — small status/label pill. Pick a look via the `variant` prop. */
const badgeVariants = cva(
  // rounded-full: badges are little pills, echoing the medicine motif.
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 [&>svg]:size-3 overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-white",
        outline: "text-foreground",
        /* Saffron: the rare secondary accent — small highlights only. */
        saffron: "border-saffron/35 bg-saffron/10 text-saffron-deep",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({ className, variant, ...props }) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
