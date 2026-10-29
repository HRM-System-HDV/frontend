"use client";

import { cn } from "@/lib/utils";

type ButtonVariant =
  | "primary"
  | "white"
  | "ghost"
  | "dark"
  | "link"
  | "danger"
  | "success"
  | "outline";

type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary-300",
  white:
    "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-200",
  ghost:
    "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-800",
  dark: "bg-dark text-white hover:bg-gray-800",
  link: "bg-transparent text-primary hover:text-primary-600 underline underline-offset-4",
  danger: "bg-danger text-white hover:bg-danger-700 focus-visible:ring-2 focus-visible:ring-danger-300",
  success: "bg-success text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-success-100",
  outline:
    "bg-transparent text-primary border border-primary hover:bg-primary-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1 text-xs gap-1.5",
  md: "px-3.5 py-2 text-sm gap-2",
  lg: "px-5 py-2.5 text-sm gap-2",
};

export default function Button({
  variant = "primary",
  size = "md",
  block = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-bold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        block && "w-full",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
