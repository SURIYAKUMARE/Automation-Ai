import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        // Stitch status variants
        stitch:
          "bg-gradient-to-r from-blue-500/15 via-indigo-500/15 to-violet-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-medium",
        success:
          "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium",
        warning:
          "bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium",
        error:
          "bg-rose-500/10 text-rose-500 border border-rose-500/20 font-medium",
        info:
          "bg-sky-500/10 text-sky-500 border border-sky-500/20 font-medium",
        neutral:
          "bg-slate-500/10 text-slate-400 border border-slate-500/20 font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "mr-1.5 h-1.5 w-1.5 rounded-full animate-pulse",
            variant === "success" && "bg-emerald-500",
            variant === "warning" && "bg-amber-500",
            variant === "error" && "bg-rose-500",
            variant === "info" && "bg-sky-500",
            (!variant || variant === "default") && "bg-primary"
          )}
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
