import { LucideIcon, AlertTriangle, ShieldAlert, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertTone = "warning" | "danger" | "info" | "success";

interface AlertBannerProps {
  tone?: AlertTone;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const TONE: Record<
  AlertTone,
  { bg: string; border: string; icon: string; iconBg: string; text: string; sub: string; btn: string }
> = {
  warning: {
    bg: "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.08))",
    border: "rgba(245,158,11,0.35)",
    icon: "text-amber-700",
    iconBg: "bg-amber-100 border-amber-200",
    text: "text-amber-900",
    sub: "text-amber-800/80",
    btn: "bg-white text-amber-800 border-amber-200 hover:bg-amber-50 hover:border-amber-300",
  },
  danger: {
    bg: "linear-gradient(135deg, rgba(248,113,113,0.12), rgba(220,38,38,0.08))",
    border: "rgba(220,38,38,0.35)",
    icon: "text-red-700",
    iconBg: "bg-red-100 border-red-200",
    text: "text-red-900",
    sub: "text-red-800/80",
    btn: "bg-white text-red-800 border-red-200 hover:bg-red-50 hover:border-red-300",
  },
  info: {
    bg: "linear-gradient(135deg, rgba(59,130,246,0.10), rgba(37,99,235,0.06))",
    border: "rgba(37,99,235,0.30)",
    icon: "text-blue-700",
    iconBg: "bg-blue-100 border-blue-200",
    text: "text-blue-900",
    sub: "text-blue-800/80",
    btn: "bg-white text-blue-800 border-blue-200 hover:bg-blue-50 hover:border-blue-300",
  },
  success: {
    bg: "linear-gradient(135deg, rgba(52,211,153,0.12), rgba(16,185,129,0.08))",
    border: "rgba(16,185,129,0.30)",
    icon: "text-emerald-700",
    iconBg: "bg-emerald-100 border-emerald-200",
    text: "text-emerald-900",
    sub: "text-emerald-800/80",
    btn: "bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300",
  },
};

const DEFAULT_ICON: Record<AlertTone, LucideIcon> = {
  warning: AlertTriangle,
  danger: ShieldAlert,
  info: Info,
  success: CheckCircle2,
};

export function AlertBanner({
  tone = "warning",
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className,
}: AlertBannerProps) {
  const t = TONE[tone];
  const Icon = icon ?? DEFAULT_ICON[tone];
  return (
    <div
      className={cn("flex items-center gap-3 rounded-xl p-3.5 fade-up", className)}
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset, 0 6px 20px -8px rgba(15,23,42,0.10)",
      }}
    >
      <div className={cn("shrink-0 h-9 w-9 rounded-lg border inline-flex items-center justify-center", t.iconBg)}>
        <Icon className={cn("h-4 w-4", t.icon)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-[13px] font-semibold", t.text)}>{title}</p>
        {description && <p className={cn("text-[11.5px] mt-0.5", t.sub)}>{description}</p>}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className={cn(
            "shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-bold border transition-all shadow-sm",
            t.btn
          )}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
