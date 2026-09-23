import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";

const buttonVariants = {
  primary:
    "bg-accent text-on-accent hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100",
  secondary:
    "border border-border text-text hover:border-border-soft hover:bg-surface disabled:opacity-50",
  ghost: "text-text-muted hover:text-text disabled:opacity-50",
  danger: "text-danger hover:text-danger/80 disabled:opacity-50",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`cursor-pointer rounded-sm px-4 py-2.5 text-sm font-bold transition ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`rounded-sm border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text placeholder:text-text-faint outline-none transition focus:border-accent focus:ring-1 focus:ring-accent ${className}`}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", ...props }, ref) => (
    <select
      ref={ref}
      className={`rounded-sm border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-accent focus:ring-1 focus:ring-accent ${className}`}
      {...props}
    />
  ),
);
Select.displayName = "Select";

type CardProps<T extends React.ElementType> = {
  as?: T;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className">;

export function Card<T extends React.ElementType = "div">({
  as,
  className = "",
  ...props
}: CardProps<T>) {
  const Tag = as ?? "div";
  return (
    <Tag
      className={`rounded-md border border-border-soft bg-surface-2 p-5 ${className}`}
      {...props}
    />
  );
}

const badgeVariants = {
  accent: "bg-accent-soft text-accent-strong",
  neutral: "border border-border bg-surface text-text-muted",
  rare: "border border-rare/35 bg-rare/15 text-rare",
} as const;

export function Badge({
  variant = "neutral",
  className = "",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof badgeVariants }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide ${badgeVariants[variant]} ${className}`}
      {...props}
    />
  );
}

export function FieldError({ children }: { children?: string | null }) {
  if (!children) return null;
  return <p className="text-sm text-danger">{children}</p>;
}

/** Icon-only button for a VTT-style floating toolbar (see VttView). */
export const ToolbarIconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
>(({ active = false, className = "", ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
      active
        ? "bg-accent-soft text-accent-strong"
        : "text-text-muted hover:bg-surface-2 hover:text-text"
    } ${className}`}
    {...props}
  />
));
ToolbarIconButton.displayName = "ToolbarIconButton";
