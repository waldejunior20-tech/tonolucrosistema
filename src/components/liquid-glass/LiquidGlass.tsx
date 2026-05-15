import * as React from "react";
import { cn } from "@/lib/utils";

/* ============================================================
   Liquid Glass — base primitives
   bg-white/10 → bg-white/20, backdrop-blur-md, iridescent border,
   shadow-xl, rounded-2xl. Light + dark mode.
   ============================================================ */

const glassBase =
  "relative isolate overflow-hidden rounded-2xl backdrop-blur-md " +
  "bg-white/10 hover:bg-white/20 dark:bg-white/5 dark:hover:bg-white/10 " +
  "shadow-xl transition-all duration-300 font-sans tracking-tight";

// Iridescent gradient border via mask trick
const iridescentBorder =
  "before:content-[''] before:absolute before:inset-0 before:rounded-2xl before:p-[1.5px] " +
  "before:bg-[linear-gradient(135deg,#a5f3fc,#c4b5fd,#f9a8d4,#fde68a,#a5f3fc)] " +
  "before:[mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] " +
  "before:[mask-composite:exclude] before:pointer-events-none before:opacity-70";

// Shimmer that follows cursor (uses CSS vars --mx/--my set on mouse move)
const cursorShimmer =
  "after:content-[''] after:absolute after:inset-0 after:rounded-2xl after:pointer-events-none " +
  "after:bg-[radial-gradient(220px_circle_at_var(--mx,50%)_var(--my,50%),rgba(255,255,255,0.25),transparent_60%)] " +
  "after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-300";

function useCursorShimmer<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const onMouseMove = React.useCallback((e: React.MouseEvent<T>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, []);
  return { ref, onMouseMove };
}

/* Ripple hook ------------------------------------------------ */
function useRipple<T extends HTMLElement>() {
  const [ripples, setRipples] = React.useState<{ id: number; x: number; y: number; size: number }[]>([]);
  const handler = (e: React.MouseEvent<T>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 1.2;
    const id = Date.now() + Math.random();
    setRipples((rs) => [...rs, { id, x: e.clientX - r.left - size / 2, y: e.clientY - r.top - size / 2, size }]);
    setTimeout(() => setRipples((rs) => rs.filter((x) => x.id !== id)), 600);
  };
  const node = (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full bg-white/40 dark:bg-white/30 animate-[lg-ripple_600ms_ease-out_forwards]"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}
    </span>
  );
  return { onClick: handler, ripples: node };
}

/* ============================================================
   GlassCard
   ============================================================ */
export interface LiquidGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}
export const LiquidGlassCard = React.forwardRef<HTMLDivElement, LiquidGlassCardProps>(
  ({ className, hoverable = true, children, ...props }, ref) => {
    const { ref: innerRef, onMouseMove } = useCursorShimmer<HTMLDivElement>();
    React.useImperativeHandle(ref, () => innerRef.current as HTMLDivElement);
    return (
      <div
        ref={innerRef}
        onMouseMove={onMouseMove}
        className={cn(
          glassBase,
          iridescentBorder,
          cursorShimmer,
          hoverable && "hover:scale-[1.02] hover:shadow-2xl",
          "p-6 text-foreground",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
LiquidGlassCard.displayName = "LiquidGlassCard";

/* ============================================================
   GlassFeatureCard
   ============================================================ */
export interface GlassFeatureCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}
export function GlassFeatureCard({ icon, title, description, className, ...props }: GlassFeatureCardProps) {
  return (
    <LiquidGlassCard className={cn("group hover:scale-105", className)} {...props}>
      {icon && (
        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 dark:bg-white/10 backdrop-blur-md ring-1 ring-white/30 text-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-foreground/70 leading-relaxed">{description}</p>
      )}
    </LiquidGlassCard>
  );
}

/* ============================================================
   GlassButton (with ripple + hover scale)
   ============================================================ */
export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary";
}
export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, children, onClick, variant = "default", ...props }, ref) => {
    const { onClick: rippleClick, ripples } = useRipple<HTMLButtonElement>();
    const { ref: innerRef, onMouseMove } = useCursorShimmer<HTMLButtonElement>();
    React.useImperativeHandle(ref, () => innerRef.current as HTMLButtonElement);
    return (
      <button
        ref={innerRef}
        onMouseMove={onMouseMove}
        onClick={(e) => {
          rippleClick(e);
          onClick?.(e);
        }}
        className={cn(
          glassBase,
          iridescentBorder,
          cursorShimmer,
          "inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold tracking-tight",
          "hover:scale-105 active:scale-[0.98]",
          variant === "primary" &&
            "bg-gradient-to-br from-white/30 to-white/10 dark:from-white/20 dark:to-white/5 text-foreground",
          "text-foreground",
          className
        )}
        {...props}
      >
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
        {ripples}
      </button>
    );
  }
);
GlassButton.displayName = "GlassButton";

/* ============================================================
   GlassToggle
   ============================================================ */
export interface GlassToggleProps {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label?: string;
  className?: string;
}
export function GlassToggle({ checked, onCheckedChange, label, className }: GlassToggleProps) {
  return (
    <label className={cn("inline-flex items-center gap-3 cursor-pointer select-none font-sans tracking-tight", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative h-7 w-12 rounded-full backdrop-blur-md transition-all duration-300 shadow-xl",
          iridescentBorder,
          checked
            ? "bg-white/30 dark:bg-white/20"
            : "bg-white/10 dark:bg-white/5"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-lg transition-transform duration-300",
            "bg-gradient-to-br from-white to-white/70",
            checked && "translate-x-5"
          )}
        />
      </button>
      {label && <span className="text-sm font-medium text-foreground">{label}</span>}
    </label>
  );
}

/* ============================================================
   GlassNavbar
   ============================================================ */
export interface GlassNavItem {
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}
export interface GlassNavbarProps {
  brand?: React.ReactNode;
  items: GlassNavItem[];
  right?: React.ReactNode;
  className?: string;
}
export function GlassNavbar({ brand, items, right, className }: GlassNavbarProps) {
  const { ref, onMouseMove } = useCursorShimmer<HTMLElement>();
  return (
    <nav
      ref={ref as any}
      onMouseMove={onMouseMove as any}
      className={cn(
        glassBase,
        iridescentBorder,
        cursorShimmer,
        "flex items-center justify-between gap-4 px-5 py-3",
        className
      )}
    >
      <div className="flex items-center gap-6">
        {brand && <div className="font-semibold tracking-tight text-foreground">{brand}</div>}
        <ul className="hidden md:flex items-center gap-1">
          {items.map((it) => (
            <li key={it.label}>
              <a
                href={it.href ?? "#"}
                onClick={(e) => {
                  if (!it.href) e.preventDefault();
                  it.onClick?.();
                }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium tracking-tight transition-all duration-200",
                  "hover:scale-105 hover:bg-white/20 dark:hover:bg-white/10",
                  it.active
                    ? "bg-white/25 dark:bg-white/15 text-foreground shadow-md"
                    : "text-foreground/80"
                )}
              >
                {it.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </nav>
  );
}

/* ============================================================
   GlassTabs
   ============================================================ */
export interface GlassTab {
  id: string;
  label: string;
  content?: React.ReactNode;
}
export interface GlassTabsProps {
  tabs: GlassTab[];
  defaultTab?: string;
  value?: string;
  onValueChange?: (id: string) => void;
  className?: string;
}
export function GlassTabs({ tabs, defaultTab, value, onValueChange, className }: GlassTabsProps) {
  const [internal, setInternal] = React.useState(defaultTab ?? tabs[0]?.id);
  const active = value ?? internal;
  const setActive = (id: string) => {
    if (value === undefined) setInternal(id);
    onValueChange?.(id);
  };
  const current = tabs.find((t) => t.id === active);
  const { ref, onMouseMove } = useCursorShimmer<HTMLDivElement>();

  return (
    <div className={cn("font-sans tracking-tight", className)}>
      <div
        ref={ref}
        onMouseMove={onMouseMove}
        className={cn(glassBase, iridescentBorder, cursorShimmer, "inline-flex p-1 gap-1")}
      >
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={cn(
                "relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
                "hover:scale-105",
                isActive
                  ? "bg-white/30 dark:bg-white/15 text-foreground shadow-lg"
                  : "text-foreground/70 hover:text-foreground hover:bg-white/10"
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {current?.content && <div className="mt-4">{current.content}</div>}
    </div>
  );
}
