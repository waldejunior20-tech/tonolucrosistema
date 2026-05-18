import { cn } from "@/lib/utils";

export type HeroTone = "positive" | "negative" | "warning" | "neutral";

interface HeroStatusCardProps {
  tone?: HeroTone;
  eyebrow?: string;
  title?: React.ReactNode;
  /** Big content slot — usually a Money or large number */
  value: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

const TONE_BG: Record<HeroTone, string> = {
  positive: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #3b82f6 100%)",
  negative: "linear-gradient(135deg, #7f1d1d 0%, #b91c1c 55%, #dc2626 100%)",
  warning: "linear-gradient(135deg, #78350f 0%, #b45309 55%, #d97706 100%)",
  neutral: "linear-gradient(135deg, #1e293b 0%, #334155 55%, #475569 100%)",
};

const TONE_SHADOW: Record<HeroTone, string> = {
  positive: "0 20px 50px -20px rgba(37,99,235,0.45), 0 4px 12px -4px rgba(37,99,235,0.25)",
  negative: "0 20px 50px -20px rgba(220,38,38,0.40), 0 4px 12px -4px rgba(220,38,38,0.22)",
  warning: "0 20px 50px -20px rgba(217,119,6,0.40), 0 4px 12px -4px rgba(217,119,6,0.22)",
  neutral: "0 20px 50px -20px rgba(51,65,85,0.35), 0 4px 12px -4px rgba(51,65,85,0.20)",
};

/**
 * Premium hero card for the top of pages. Single source of truth for
 * the colored hero look (positive/negative/warning/neutral).
 * Controlled gradient + subtle highlight, no leaking colored glows.
 */
export function HeroStatusCard({
  tone = "positive",
  eyebrow,
  title,
  value,
  meta,
  actions,
  className,
  children,
}: HeroStatusCardProps) {
  return (
    <div
      className={cn("relative rounded-2xl overflow-hidden fade-up", className)}
      style={{ boxShadow: TONE_SHADOW[tone] }}
    >
      <div className="absolute inset-0" style={{ background: TONE_BG[tone] }} />
      {/* Subtle top highlight only — no colored blur glows */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

      <div className="relative p-5 sm:p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            {eyebrow && (
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/75">
                {eyebrow}
              </span>
            )}
            {title && (
              <div className="text-sm text-white/85 font-medium">{title}</div>
            )}
            <div className="mt-0.5">{value}</div>
            {meta && (
              <div className="text-[13px] text-white/85 mt-2 flex items-center flex-wrap gap-2">
                {meta}
              </div>
            )}
          </div>
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
