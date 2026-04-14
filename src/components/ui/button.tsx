import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-[#FF8C00] to-[#F27121] text-white shadow-[0_4px_15px_rgba(242,113,33,0.3)] hover:shadow-[0_6px_20px_rgba(242,113,33,0.4)] hover:-translate-y-px hover:brightness-110 active:scale-[0.98] transition-all duration-200",
        destructive: "bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-sm",
        outline: "border-[1.5px] border-[#D1D5DB] bg-white text-[#374151] hover:border-[#10B981] hover:text-[#059669] hover:bg-[#F0FDF4]",
        secondary: "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] font-semibold",
        ghost: "hover:bg-[#F3F4F6] hover:text-[#1F2937]",
        link: "text-[#10B981] underline-offset-4 hover:underline font-semibold",
        emerald: "bg-[#10B981] text-white hover:bg-[#059669] shadow-[0_4px_15px_rgba(16,185,129,0.3)]",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-sm px-4",
        lg: "h-12 rounded-sm px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
