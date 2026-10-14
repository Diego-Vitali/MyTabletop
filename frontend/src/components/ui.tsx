import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import Link from "next/link";
import { ChevronRight, CircleAlert, LoaderCircle } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

const buttonVariants = {
  /** Pílula azul preenchida — a ação principal da tela. */
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  /** Pílula com contorno azul — ação par da principal ("Comprar" ao lado de "Saiba mais"). */
  secondary:
    "border border-accent-strong text-accent-strong hover:border-accent hover:bg-accent hover:text-on-accent",
  /** Pílula cinza — ações neutras dentro de formulários/painéis. */
  tertiary: "bg-surface-3/70 text-text hover:bg-surface-3",
  /** Só texto, sem preenchimento. */
  ghost: "text-text-muted hover:text-text",
  /** Destrutivo: texto vermelho em pílula neutra. */
  danger: "bg-surface-2 text-danger hover:bg-danger-soft",
  /** Pílula clara (invertida) — destaque máximo, uso raro. */
  inverse: "bg-text text-bg hover:bg-text/85",
} as const;

const buttonSizes = {
  sm: "gap-1 px-3 py-1 text-xs",
  md: "gap-1.5 px-[18px] py-2 text-sm",
  lg: "gap-2 px-[22px] py-[11px] text-base",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

/** Classes de botão reutilizáveis em `<Link>` (evita `<Link><button/></Link>`). */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = "") {
  return `inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-full font-normal transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${buttonVariants[variant]} ${buttonSizes[size]} ${extra}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", ...props }, ref) => (
    <button ref={ref} className={buttonClass(variant, size, className)} {...props} />
  ),
);
Button.displayName = "Button";

/** Link de texto azul com chevron — o "Saiba mais ›" da Apple. */
export function ChevronLink({
  href,
  children,
  className = "",
  onInk = false,
  external = false,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  onInk?: boolean;
  /** Abre em nova aba (links para fora do app). */
  external?: boolean;
}) {
  const cls = `group inline-flex items-center gap-0.5 hover:underline ${
    onInk ? "text-link-on-ink" : "text-accent-strong"
  } ${className}`;
  const content = (
    <>
      {children}
      <ChevronRight size="0.9em" strokeWidth={2.25} className="translate-y-px" />
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {content}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {content}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Form fields                                                         */
/* ------------------------------------------------------------------ */

const fieldBase =
  "rounded-sm border border-border bg-surface-2/60 text-text placeholder:text-text-faint outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-50";

type DenseProps = { dense?: boolean };

/** Campo compacto, sem rótulo flutuante (painéis do VTT, filtros). */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & DenseProps>(
  ({ dense = false, className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`${fieldBase} ${dense ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"} ${className}`}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & DenseProps>(
  ({ dense = false, className = "", ...props }, ref) => (
    <select
      ref={ref}
      className={`${fieldBase} select-chevron cursor-pointer ${dense ? "py-1.5 pl-3 text-xs" : "py-2.5 pl-4 text-sm"} ${className}`}
      {...props}
    />
  ),
);
Select.displayName = "Select";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className = "", ...props }, ref) => (
  <textarea ref={ref} className={`${fieldBase} px-3.5 py-2.5 text-sm ${className}`} {...props} />
));
Textarea.displayName = "Textarea";

const groupRadius = {
  single: "rounded-sm",
  top: "rounded-t-sm",
  middle: "",
  bottom: "rounded-b-sm",
} as const;

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder"> & {
  label: string;
  /** Posição dentro de um grupo de campos colados (como o login da Apple). */
  position?: keyof typeof groupRadius;
  invalid?: boolean;
  /** Elemento à direita, dentro do campo (ex.: botão de seta). */
  trailing?: ReactNode;
};

/** Campo de formulário com rótulo flutuante, no padrão das páginas de conta da Apple. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, position = "single", invalid = false, trailing, className = "", id, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <div
        className={`relative focus-within:z-10 ${
          position === "middle" || position === "bottom" ? "-mt-px" : ""
        } ${className}`}
      >
        <input
          ref={ref}
          id={fieldId}
          placeholder=" "
          aria-invalid={invalid || undefined}
          className={`peer h-14 w-full border px-4 pt-[18px] pb-1 text-base outline-none transition ${
            groupRadius[position]
          } ${
            invalid
              ? "border-danger bg-danger-soft focus:ring-4 focus:ring-danger/15"
              : "border-border bg-surface-2/60 hover:border-text-faint focus:border-accent focus:ring-4 focus:ring-accent/15"
          } ${trailing ? "pr-14" : ""}`}
          {...props}
        />
        <label
          htmlFor={fieldId}
          className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base transition-all duration-150 peer-focus:top-[15px] peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-[15px] peer-[:not(:placeholder-shown)]:text-xs ${
            invalid ? "text-danger" : "text-text-faint"
          }`}
        >
          {label}
        </label>
        {trailing && <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
    );
  },
);
TextField.displayName = "TextField";

export function FieldError({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <p role="alert" className="flex items-start gap-1.5 text-sm text-danger">
      <CircleAlert size={16} className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}

/** Controle segmentado (estilo macOS/iOS). */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  size = "md",
  className = "",
}: {
  value: T;
  options: { value: T; label: ReactNode; disabled?: boolean }[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div role="radiogroup" className={`inline-flex rounded-full bg-surface-2 p-0.5 ${className}`}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={`flex-1 cursor-pointer whitespace-nowrap rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${
              size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm"
            } ${
              active
                ? "bg-control-selected font-medium text-text shadow-segment"
                : "text-text-muted hover:text-text"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

const cardVariants = {
  /** Branco com sombra suave — o card da Apple Store, sobre fundo cinza. */
  raised: "bg-surface shadow-card",
  /** Cinza-claro sem sombra — sobre fundo branco. */
  flat: "bg-surface-2",
  /** Branco com borda fina. */
  outline: "border border-border-soft bg-surface",
} as const;

type CardProps<T extends React.ElementType> = {
  as?: T;
  className?: string;
  variant?: keyof typeof cardVariants;
  /** Leve "levantar" no hover (cards clicáveis). */
  interactive?: boolean;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className">;

export function Card<T extends React.ElementType = "div">({
  as,
  className = "",
  variant = "raised",
  interactive = false,
  ...props
}: CardProps<T>) {
  const Tag = as ?? "div";
  return (
    <Tag
      className={`rounded-md p-6 ${cardVariants[variant]} ${
        interactive
          ? "transition duration-300 ease-out hover:scale-[1.01] hover:shadow-card-hover"
          : ""
      } ${className}`}
      {...props}
    />
  );
}

const badgeVariants = {
  accent: "bg-accent-soft text-accent-strong",
  neutral: "bg-surface-3/70 text-text-muted",
  rare: "bg-rare/10 text-rare",
} as const;

export function Badge({
  variant = "neutral",
  className = "",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof badgeVariants }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeVariants[variant]} ${className}`}
      {...props}
    />
  );
}

/** Avatar com iniciais, no estilo do monograma de Contatos. */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-linear-to-b from-monogram-from to-monogram-to font-semibold text-on-accent"
      style={{ width: size, height: size, fontSize: size * 0.4, letterSpacing: 0 }}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

/** Cabeçalho de seção "Negrito. Cinza." — o padrão das prateleiras da Apple Store. */
export function SectionHeading({
  title,
  tagline,
  as: Tag = "h2",
  size = "headline",
  className = "",
}: {
  title: string;
  tagline?: string;
  as?: "h1" | "h2" | "h3";
  size?: "hero" | "headline" | "title";
  className?: string;
}) {
  const sizeClass = size === "hero" ? "type-hero" : size === "title" ? "type-title" : "type-headline";
  return (
    <Tag className={`${sizeClass} text-balance ${className}`}>
      <span className="text-text">{title}</span>
      {tagline && <span className="text-text-muted"> {tagline}</span>}
    </Tag>
  );
}

export function Spinner({ label = "Carregando" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-24 text-text-faint">
      <LoaderCircle size={22} className="animate-spin" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Ícone de botão para as barras flutuantes do VTT. */
export const ToolbarIconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
>(({ active = false, className = "", ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-30 ${
      active ? "bg-accent text-on-accent" : "text-text hover:bg-hairline"
    } ${className}`}
    {...props}
  />
));
ToolbarIconButton.displayName = "ToolbarIconButton";
