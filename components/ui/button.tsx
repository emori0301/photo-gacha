import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold",
    "border-2 border-ink transition-[transform,box-shadow,background-color] duration-100",
    "disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-red text-white shadow-hard hover:bg-red-deep active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        secondary:
          "bg-card text-ink shadow-hard hover:bg-paper-2 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        yellow:
          "bg-mustard text-ink shadow-hard hover:brightness-95 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        ghost: "border-transparent bg-transparent text-ink hover:bg-ink/6",
        danger:
          "border-red-deep bg-card text-red-deep hover:bg-red hover:text-white hover:border-ink",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-5 text-[15px]",
        lg: "h-13 px-7 text-lg",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      // フォーム内で意図せず submit しないよう既定は button にする
      type={asChild ? undefined : (type ?? "button")}
      {...props}
    />
  );
}

export { buttonVariants };
