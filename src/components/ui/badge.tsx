import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-primary border border-primary/25",
        secondary: "bg-secondary text-secondary-foreground border border-border",
        success: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25",
        warning: "bg-amber-500/15 text-amber-300 border border-amber-500/25",
        danger: "bg-red-500/15 text-red-300 border border-red-500/25",
        outline: "text-muted-foreground border border-border",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
