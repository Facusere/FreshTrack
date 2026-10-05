import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs sm:text-sm font-semibold transition duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.98] cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-sm shadow-emerald-600/25 font-semibold",
        destructive:
          "bg-rose-50 text-rose-700 border border-rose-200 rounded-full hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50",
        outline:
          "border border-line bg-surface text-content rounded-full hover:bg-surface-muted",
        secondary:
          "bg-surface-muted text-content border border-line rounded-full hover:bg-brand-subtle hover:text-brand-text",
        ghost:
          "text-content rounded-full hover:bg-surface-muted",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:px-3.5",
        sm: "h-8 rounded-full gap-1.5 px-3.5 text-xs has-[>svg]:px-2.5",
        lg: "h-11 rounded-full px-6 has-[>svg]:px-4.5",
        icon: "size-10 rounded-full",
        "icon-sm": "size-8 rounded-full",
        "icon-lg": "size-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
