import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Linear-style badges: pílulas compactas, fundo claro + texto escuro da mesma cor,
 * sem borda gritante. Use as variantes semânticas (success/warning/info/...) sempre
 * que possível em vez de classes soltas.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-tight transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-700",
        secondary: "bg-slate-100 text-slate-700",
        destructive: "bg-red-50 text-red-700",
        outline: "border border-slate-200 text-slate-700 bg-white",
        success: "bg-emerald-50 text-emerald-700",
        warning: "bg-amber-50 text-amber-700",
        info: "bg-blue-50 text-blue-700",
        purple: "bg-purple-50 text-purple-700",
        pink: "bg-pink-50 text-pink-700",
        indigo: "bg-indigo-50 text-indigo-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
