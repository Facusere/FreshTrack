import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs sm:text-sm font-semibold transition duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#68ef3f] focus-visible:ring-offset-2 active:scale-[0.98] cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[#68ef3f] text-[#30322a] rounded-full hover:bg-[#7cf457] shadow-xs font-semibold",
        destructive:
          "bg-[#fdf1ef] text-[#8e2b20] border border-[#f8c9c3] rounded-full hover:bg-[#fbdad4] dark:bg-[#2e1816] dark:text-[#f59c90] dark:border-[#4a2420]",
        outline:
          "border border-[#d9deca] dark:border-[#273f2b] bg-white dark:bg-[#122314] text-[#122314] dark:text-white rounded-full hover:bg-[#f2f5eb] dark:hover:bg-[#1c331f]",
        secondary:
          "bg-[#f2f5eb] text-[#273f2b] border border-[#d9deca] rounded-full hover:bg-[#e7f9dd] dark:bg-[#1c331f] dark:text-white dark:border-[#273f2b]",
        ghost:
          "text-[#30322a] dark:text-white rounded-full hover:bg-[#e7f9dd]/70 dark:hover:bg-[#1c3520]",
        link: "text-[#273f2b] dark:text-[#68ef3f] underline-offset-4 hover:underline",
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
