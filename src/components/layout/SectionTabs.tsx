import { NavLink } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionTabItem {
  label: string;
  icon?: LucideIcon;
  /** Use for navigation tabs (route-based) */
  path?: string;
  /** Use for controlled toggle tabs (value-based) */
  value?: string;
}

interface SectionTabsProps {
  items: SectionTabItem[];
  /** Controlled value — required when items use `value` instead of `path` */
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  /** Use when rendered over a dark/colored surface (e.g. hero) */
  onDark?: boolean;
  size?: "sm" | "md";
}

/**
 * Unified secondary-navigation / toggle tabs.
 * Replaces ad-hoc chip rows, segmented controls, and category bars across the app.
 *
 * Usage (route-based):
 *   <SectionTabs items={[{ label: "Comprados", path: "/insumos/comprados", icon: ShoppingCart }]} />
 *
 * Usage (controlled):
 *   <SectionTabs value={periodo} onChange={setPeriodo} items={[{ label: "7 dias", value: "7" }]} />
 */
export function SectionTabs({
  items,
  value,
  onChange,
  className,
  onDark = false,
  size = "md",
}: SectionTabsProps) {
  const h = size === "sm" ? "h-9" : "h-11";
  const px = size === "sm" ? "px-3.5" : "px-[18px]";
  const text = size === "sm" ? "text-[13px]" : "text-sm";

  const containerCls = onDark
    ? "bg-white/10 backdrop-blur-md border-white/25"
    : "bg-slate-100/80 border-slate-200";

  return (
    <div className={cn("inline-flex max-w-full -mx-1 overflow-x-auto", className)}>
      <div
        className={cn(
          "inline-flex items-center gap-1.5 p-1 rounded-2xl border min-w-max",
          containerCls
        )}
      >
        {items.map((item) => {
          const key = item.path ?? item.value ?? item.label;
          const baseBtn = cn(
            "inline-flex items-center gap-2 rounded-xl border border-transparent font-semibold whitespace-nowrap transition-all",
            h,
            px,
            text
          );
          const activeCls = onDark
            ? "bg-white text-blue-700 border-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
            : "bg-white text-blue-600 border-blue-200 shadow-[0_6px_18px_rgba(37,99,235,0.12)]";
          const inactiveCls = onDark
            ? "text-white/80 hover:text-white hover:bg-white/10"
            : "text-slate-600 hover:text-slate-900 hover:bg-white/60";

          const inner = (isActive: boolean) => (
            <>
              {item.icon && <item.icon size={16} strokeWidth={2.2} />}
              <span>{item.label}</span>
            </>
          );

          if (item.path) {
            return (
              <NavLink
                key={key}
                to={item.path}
                end
                className={({ isActive }) =>
                  cn(baseBtn, isActive ? activeCls : inactiveCls)
                }
              >
                {({ isActive }) => inner(isActive)}
              </NavLink>
            );
          }

          const isActive = value === item.value;
          return (
            <button
              key={key}
              type="button"
              onClick={() => item.value && onChange?.(item.value)}
              className={cn(baseBtn, isActive ? activeCls : inactiveCls)}
            >
              {inner(isActive)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Alias — same component, semantic name for controlled toggles. */
export const PageTabs = SectionTabs;
