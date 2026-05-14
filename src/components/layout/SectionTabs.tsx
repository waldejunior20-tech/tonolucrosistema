import { NavLink } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionTabItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface SectionTabsProps {
  items: SectionTabItem[];
  className?: string;
}

export function SectionTabs({ items, className }: SectionTabsProps) {
  return (
    <div className={cn("mb-6 -mx-1 overflow-x-auto", className)}>
      <div className="flex items-center gap-2 px-1 min-w-max">
        {items.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end
            className={({ isActive }) =>
              cn(
                "inline-flex items-center gap-2 h-10 px-4 rounded-lg border text-sm font-semibold transition-all whitespace-nowrap",
                isActive
                  ? "bg-primary/10 border-primary text-primary shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <Icon size={16} strokeWidth={2.2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
