import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp, TrendingDown, AlertTriangle, Sparkles, ChefHat,
  Plus, FileUp, Tag, ArrowRight, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Flame, ShieldAlert, ClipboardList, Zap, Receipt, Bell, Wallet, Activity,
  Pizza, Coffee, Cake, Sandwich, UtensilsCrossed,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useProfitAlerts } from "@/hooks/useProfitAlerts";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { MobileDashboard } from "@/components/dashboard/MobileDashboard";
import { useIsMobile } from "@/hooks/use-mobile";
import { NoticiasRestaurantes } from "@/components/dashboard/NoticiasRestaurantes";
import { cn } from "@/lib/utils";

// ─── Palette (scoped to dashboard) ───────────────────────────────────
const C = {
  bg: "bg-[#F8FAFC]",
  card: "bg-white",
  border: "border-[#E2E8F0]",
  text: "text-[#0F172A]",
  muted: "text-[#475569]",
  primary: "#2563EB",
  success: "#059669",
  warning: "#D97706",
  danger: "#DC2626",
};

// Glassmorphism premium sutil — fundo translúcido, blur, borda luminosa,
// reflexo interno e sombra suave. Mantém legibilidade total.
const GLASS =
  "bg-white/65 backdrop-blur-xl border border-white/70 " +
  "shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-14px_rgba(15,23,42,0.12),0_28px_60px_-30px_rgba(37,99,235,0.10)]";
const GLASS_DANGER =
  "bg-white/65 backdrop-blur-xl border border-rose-200/70 " +
  "shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_10px_28px_-14px_rgba(225,29,72,0.18),0_28px_60px_-30px_rgba(225,29,72,0.20)]";
const GLASS_SUCCESS =
  "bg-white/65 backdrop-blur-xl border border-blue-200/70 " +
  "shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_10px_28px_-14px_rgba(37,99,235,0.18),0_28px_60px_-30px_rgba(37,99,235,0.18)]";
const GLASS_WARN =
  "bg-white/65 backdrop-blur-xl border border-amber-200/70 " +
  "shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_10px_28px_-14px_rgba(217,119,6,0.18),0_28px_60px_-30px_rgba(217,119,6,0.20)]";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
};

const T = {
  display: "font-heading font-bold text-[26px] md:text-[34px] leading-tight tracking-tight",
  headline: "font-heading font-semibold text-[18px] leading-tight",
  body: "font-sans text-[14px] leading-relaxed",
  label: "font-sans font-semibold text-[11px] uppercase tracking-wider",
  mono: "font-mono font-medium tabular-nums",
  accent: "font-heading font-semibold text-[14px]",
};

// ─── Building blocks ─────────────────────────────────────────────────
function Bento({
  className, children, hero = false,
}: { className?: string; children: React.ReactNode; hero?: boolean }) {
  return (
    <div
      className={cn(
        "group/bento relative rounded-[24px] border p-5 md:p-6 flex flex-col min-w-0",
        "transition-[transform,box-shadow,border-color] duration-300 ease-out will-change-transform",
        C.card, "border-[#E6EAF0]",
        hero
          ? "shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-12px_rgba(15,23,42,0.12),0_30px_70px_-30px_rgba(37,99,235,0.18)]"
          : "shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_1px_2px_rgba(15,23,42,0.03),0_8px_22px_-12px_rgba(15,23,42,0.10)]",
        "hover:-translate-y-[2px] hover:border-[#D8DFE8]",
        "hover:shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_2px_4px_rgba(15,23,42,0.05),0_16px_34px_-14px_rgba(15,23,42,0.16),0_32px_80px_-30px_rgba(16,185,129,0.14)]",
        "before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white before:to-transparent before:pointer-events-none",
        "after:pointer-events-none after:absolute after:inset-0 after:rounded-[24px] after:ring-1 after:ring-inset after:ring-white/40",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardHeader({
  title, subtitle, icon: Icon, tint = "primary", action,
}: {
  title: string; subtitle?: string; icon?: any;
  tint?: "primary" | "success" | "warning" | "danger";
  action?: React.ReactNode;
}) {
  const tintBg: Record<string, string> = {
    primary: "bg-[#EFF6FF] text-[#2563EB]",
    success: "bg-[#ECFDF5] text-[#059669]",
    warning: "bg-[#FFFBEB] text-[#D97706]",
    danger: "bg-[#FEF2F2] text-[#DC2626]",
  };
  return (
    <div className="flex items-start justify-between gap-3 mb-5">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", tintBg[tint])}>
            <Icon size={18} strokeWidth={2.2} />
          </div>
        )}
        <div className="min-w-0">
          <h3 className={cn("font-heading font-semibold text-[19px] md:text-[20px] leading-tight tracking-tight truncate", C.text)}>{title}</h3>
          {subtitle && <p className={cn(T.body, C.muted, "mt-1 text-[13px]")}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function StatusBadge({
  tone, children, glow = false,
}: { tone: "success" | "warning" | "danger" | "primary"; children: React.ReactNode; glow?: boolean }) {
  const cls: Record<string, string> = {
    success: "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]",
    warning: "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]",
    danger: "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
    primary: "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]",
  };
  const glowCls: Record<string, string> = {
    success: "shadow-[0_0_0_3px_rgba(5,150,105,0.12)]",
    warning: "shadow-[0_0_0_3px_rgba(217,119,6,0.12)]",
    danger: "shadow-[0_0_0_3px_rgba(220,38,38,0.12)]",
    primary: "shadow-[0_0_0_3px_rgba(37,99,235,0.12)]",
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border",
      T.label, "text-[10.5px]",
      cls[tone], glow && glowCls[tone],
    )}>
      {children}
    </span>
  );
}

function CTA({
  variant = "primary", icon: Icon, children, onClick,
}: { variant?: "primary" | "ghost"; icon?: any; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 h-10 px-4 rounded-xl border transition-all duration-200 text-[13.5px] active:scale-[0.98]",
        T.accent,
        variant === "primary"
          ? "text-white border-transparent bg-[linear-gradient(180deg,#3B82F6_0%,#2563EB_100%)] shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_6px_16px_-6px_rgba(37,99,235,0.55),0_2px_4px_rgba(15,23,42,0.08)] hover:shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_10px_22px_-8px_rgba(37,99,235,0.65),0_3px_6px_rgba(15,23,42,0.10)] hover:brightness-[1.03]"
          : "bg-white/80 backdrop-blur text-[#0F172A] border-[#E2E8F0] hover:border-[#94A3B8] hover:bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
      )}
    >
      {Icon && <Icon size={15} strokeWidth={2.4} />}
      {children}
    </button>
  );
}

function EmptyState({
  icon: Icon, title, hint, tone = "primary",
}: { icon: any; title: string; hint?: string; tone?: "primary" | "success" | "warning" | "danger" }) {
  const ring: Record<string, string> = {
    primary: "bg-[#EFF6FF] text-[#2563EB]",
    success: "bg-[#ECFDF5] text-[#059669]",
    warning: "bg-[#FFFBEB] text-[#D97706]",
    danger: "bg-[#FEF2F2] text-[#DC2626]",
  };
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-6">
      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", ring[tone])}>
        <Icon size={20} />
      </div>
      <p className={cn(T.accent, C.text, "text-[13.5px]")}>{title}</p>
      {hint && <p className={cn(T.body, C.muted, "text-[12.5px] max-w-[260px]")}>{hint}</p>}
    </div>
  );
}

function ProgressRing({ value, tone }: { value: number; tone: "success" | "warning" | "danger" | "primary" }) {
  const stops: Record<string, [string, string]> = {
    success: ["#10B981", "#059669"],
    warning: ["#FBBF24", "#D97706"],
    danger: ["#F87171", "#DC2626"],
    primary: ["#60A5FA", "#2563EB"],
  };
  const [from, to] = stops[tone];
  const r = 40;
  const c = 2 * Math.PI * r;
  const v = Math.min(100, Math.max(0, value));
  const gid = `pr-${tone}`;
  return (
    <div className="relative w-[120px] h-[120px] shrink-0">
      <div
        aria-hidden
        className="absolute inset-2 rounded-full"
        style={{ background: `radial-gradient(closest-side, ${from}22, transparent 70%)` }}
      />
      <svg viewBox="0 0 100 100" className="relative w-full h-full -rotate-90">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#E2E8F0" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={`url(#${gid})`} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${(v / 100) * c} ${c}`}
          style={{ transition: "stroke-dasharray 600ms cubic-bezier(.2,.7,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn(T.mono, "text-[24px] font-bold leading-none", C.text)}>{value.toFixed(0)}%</span>
        <span className={cn(T.label, C.muted, "text-[9.5px] mt-1")}>saúde</span>
      </div>
    </div>
  );
}

function MiniTile({
  icon: Icon, label, value, tone,
}: { icon: any; label: string; value: number | string; tone: "success" | "warning" | "danger" | "primary" }) {
  const tintBg: Record<string, string> = {
    success: "bg-[#ECFDF5] text-[#059669]",
    warning: "bg-[#FFFBEB] text-[#D97706]",
    danger: "bg-[#FEF2F2] text-[#DC2626]",
    primary: "bg-[#EFF6FF] text-[#2563EB]",
  };
  const valColor: Record<string, string> = {
    success: "text-[#059669]", warning: "text-[#D97706]",
    danger: "text-[#DC2626]", primary: "text-[#2563EB]",
  };
  return (
    <div className="group/tile relative rounded-xl border border-[#E6EAF0] bg-gradient-to-b from-white to-[#F8FAFC] p-3.5 transition-all duration-200 hover:border-[#D8DFE8] hover:shadow-[0_6px_18px_-10px_rgba(15,23,42,0.10)]">
      <div className="flex items-center justify-between mb-2">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center ring-1 ring-inset ring-white/60", tintBg[tone])}>
          <Icon size={14} strokeWidth={2.4} />
        </div>
      </div>
      <p className={cn(T.mono, "text-[26px] font-bold leading-none mb-1.5 tracking-tight", valColor[tone])}>{value}</p>
      <p className={cn(T.body, "text-[11.5px] font-medium", C.muted)}>{label}</p>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [userName, setUserName] = useState("");
  const [businessName, setBusinessName] = useState("");

  const {
    faturamentoMes, despesasMes, cmvPct, cmvMeta, comparativos,
    graficoMensal, contasVencendo,
  } = useDashboardData();
  const { data: priceAlerts = [] } = usePriceAlerts();
  const { data: profitAlerts = [] } = useProfitAlerts(20);

  const { data: fichasPizza = [] } = useQuery({
    queryKey: ["dashboard-fichas-pizza-list"],
    queryFn: async () => {
      const { data } = await supabase.from("fichas_tecnicas_pizza")
        .select("id, nome, preco_venda_p, preco_venda_m, preco_venda_g");
      return data ?? [];
    },
  });

  const { data: fichasProdutos = [] } = useQuery({
    queryKey: ["dashboard-fichas-produtos-list"],
    queryFn: async () => {
      const { data } = await supabase.from("fichas_tecnicas_produtos")
        .select("id, nome, categoria, preco_venda");
      return data ?? [];
    },
  });

  const { data: warnings = [] } = useQuery({
    queryKey: ["dashboard-fichas-warnings-list"],
    queryFn: async () => {
      const { data } = await supabase.from("fichas_tecnicas_warnings")
        .select("id, motivo, tipo_ficha, created_at, resolvido")
        .eq("resolvido", false)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: ultimosLancamentos = [] } = useQuery({
    queryKey: ["dashboard-ultimos-lancamentos"],
    queryFn: async () => {
      const { data } = await supabase.from("lancamentos_financeiros")
        .select("id, descricao, valor, data_lancamento, categoria, tipo, pago")
        .order("data_lancamento", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const meta: any = user.user_metadata || {};
      const fullName = meta.full_name || meta.name || meta.nome || "";
      let first = fullName.trim().split(/\s+/)[0] || (user.email ? user.email.split("@")[0] : "");
      // Limpa sufixos numéricos/underscores feios (ex: Waldejunior04_)
      first = first.replace(/[_\d]+$/g, "");
      if (first) setUserName(first.charAt(0).toUpperCase() + first.slice(1));
      supabase.from("profiles").select("business_name").eq("id", user.id).single()
        .then(({ data }) => { if (data?.business_name) setBusinessName(data.business_name); });
    });
  }, []);

  // Derived
  const lucroMes = faturamentoMes - despesasMes;
  const dataHoje = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  // Threshold de atenção: margem abaixo de 3% do faturamento (mín R$ 500)
  const atencaoThreshold = Math.max(faturamentoMes * 0.03, 500);
  const caixaAtencao = faturamentoMes > 0 && lucroMes >= 0 && lucroMes < atencaoThreshold;
  const caixaNegativo = lucroMes < 0;
  const caixaPositivo = lucroMes > 0 && !caixaAtencao;
  const statusCaixa: "positivo" | "negativo" | "atencao" =
    caixaNegativo ? "negativo" : caixaAtencao ? "atencao" : "positivo";
  const heroTitulo =
    statusCaixa === "negativo" ? "Caixa negativo"
    : statusCaixa === "atencao" ? "No limite"
    : "Tô no lucro";
  const heroGradient =
    statusCaixa === "negativo"
      ? "bg-gradient-to-br from-rose-600 to-rose-700"
      : statusCaixa === "atencao"
      ? "bg-gradient-to-br from-amber-500 to-orange-600"
      : "bg-gradient-to-br from-blue-600 to-blue-700";
  const heroShadow =
    statusCaixa === "negativo"
      ? "shadow-[0_30px_80px_-30px_rgba(225,29,72,0.45)]"
      : statusCaixa === "atencao"
      ? "shadow-[0_30px_80px_-30px_rgba(234,88,12,0.45)]"
      : "shadow-[0_30px_80px_-30px_rgba(37,99,235,0.45)]";
  const heroBtnText =
    statusCaixa === "negativo" ? "text-rose-700"
    : statusCaixa === "atencao" ? "text-orange-700"
    : "text-blue-700";
  const heroBadge =
    statusCaixa === "negativo"
      ? { label: "Negativo", cls: "bg-white/15 text-white border-white/30" }
      : statusCaixa === "atencao"
      ? { label: "Atenção", cls: "bg-amber-100/25 text-amber-50 border-amber-200/40" }
      : { label: "Positivo", cls: "bg-emerald-400/20 text-emerald-100 border-emerald-300/40" };
  const hasFaturamento = faturamentoMes > 0 || despesasMes > 0;
  const cmvOk = cmvPct <= cmvMeta;

  const perderamMargem = profitAlerts.filter((p) => p.delta_abs > 0);
  const insumoCritico = priceAlerts[0];

  const fichasPizzaSemPreco = fichasPizza.filter((f: any) =>
    !f.preco_venda_p && !f.preco_venda_m && !f.preco_venda_g
  ).length;
  const fichasProdutosSemPreco = fichasProdutos.filter((f: any) => !f.preco_venda).length;
  const fichasIncompletas = fichasPizzaSemPreco + fichasProdutosSemPreco;
  const totalFichas = fichasPizza.length + fichasProdutos.length;
  const fichasMargemOk = Math.max(0, totalFichas - perderamMargem.length - fichasIncompletas);

  const idsComAlerta = new Set(profitAlerts.map((p) => p.ficha_tecnica_id).filter(Boolean));
  const prontosPromocao = (() => {
    const items: { id: string; nome: string; categoria: string; preco: number }[] = [];
    for (const f of fichasPizza as any[]) {
      const preco = Number(f.preco_venda_m || f.preco_venda_g || f.preco_venda_p || 0);
      if (preco > 0 && !idsComAlerta.has(f.id))
        items.push({ id: f.id, nome: f.nome, categoria: "Pizza", preco });
    }
    for (const f of fichasProdutos as any[]) {
      const preco = Number(f.preco_venda || 0);
      if (preco > 0 && !idsComAlerta.has(f.id))
        items.push({ id: f.id, nome: f.nome, categoria: f.categoria || "Produto", preco });
    }
    return items.slice(0, 6);
  })();

  // Status do Radar
  const radarTone: "success" | "warning" | "danger" =
    insumoCritico && insumoCritico.variacaoPct >= 10 ? "danger"
    : insumoCritico ? "warning"
    : "success";

  const radarLabel = radarTone === "danger" ? "Risco" : radarTone === "warning" ? "Alerta" : "Saudável";

  // Status financeiro
  const finanTone: "success" | "warning" | "danger" =
    !hasFaturamento ? "warning" : caixaNegativo ? "danger" : caixaPositivo ? "success" : "warning";
  const finanLabel = !hasFaturamento ? "Atenção" : caixaNegativo ? "Negativo" : caixaPositivo ? "Positivo" : "Atenção";

  // Insight do greeting
  const greetingInsight = (() => {
    if (caixaNegativo && fichasMargemOk > 0)
      return `Seu caixa está negativo, mas ${fichasMargemOk} produto${fichasMargemOk > 1 ? "s estão" : " está"} com margem saudável.`;
    if (caixaPositivo && perderamMargem.length > 0)
      return `Caixa positivo, mas ${perderamMargem.length} produto${perderamMargem.length > 1 ? "s perderam" : " perdeu"} margem nesta semana.`;
    if (caixaPositivo) return `Caixa positivo em ${fmtBRL(lucroMes)}. Lucro protegido por enquanto.`;
    if (insumoCritico) return `${insumoCritico.nome} subiu ${insumoCritico.variacaoPct.toFixed(1)}% — fique de olho na margem.`;
    if (totalFichas === 0) return "Cadastre fichas, vendas e compras para ativar seus insights.";
    return "Acompanhe o pulso do seu cardápio em tempo real.";
  })();

  // ─── Diagnóstico do dia ──────────────────────────────────────
  const diagnosticoTone: "danger" | "warning" | "success" =
    statusCaixa === "negativo" ? "danger" : statusCaixa === "atencao" ? "warning" : "success";
  const topInsumos = priceAlerts.slice(0, 3).map((p) => p.nome);
  const entradaBaixa = comparativos?.faturamento != null && comparativos.faturamento < -10;
  const diagCausas: string[] = [];
  if (topInsumos.length) diagCausas.push(`aumento em ${topInsumos.join(", ")}`);
  if (entradaBaixa) diagCausas.push("baixa entrada no mês");
  if (perderamMargem.length >= 3) diagCausas.push(`${perderamMargem.length} produtos perdendo margem`);
  const fichasRevisar = perderamMargem.length;
  const precosAtualizar = priceAlerts.filter((p) => p.variacaoPct >= 10).length;
  const diagnosticoTexto =
    statusCaixa === "negativo"
      ? `Seu caixa está negativo${diagCausas.length ? ` por causa de ${diagCausas.join(" e ")}` : ""}.`
      : statusCaixa === "atencao"
      ? `Sua margem está no limite${diagCausas.length ? ` por causa de ${diagCausas.join(" e ")}` : ""}.`
      : diagCausas.length
      ? `Caixa positivo, mas atenção: ${diagCausas.join(" e ")}.`
      : `Caixa saudável. Operação rodando dentro da meta.`;
  const showDiagnostico = hasFaturamento && (statusCaixa !== "positivo" || diagCausas.length > 0);

  // Central de Alertas — combina priceAlerts, profitAlerts e warnings
  const centralAlertas: {
    id: string; icon: any; title: string; message: string;
    tone: "success" | "warning" | "danger" | "primary"; time?: string;
  }[] = [];
  for (const p of priceAlerts.slice(0, 2)) {
    centralAlertas.push({
      id: `price-${p.nome}`, icon: TrendingUp,
      title: "Insumo com aumento",
      message: `${p.nome} subiu ${p.variacaoPct.toFixed(1)}%`,
      tone: p.variacaoPct >= 10 ? "danger" : "warning",
    });
  }
  for (const p of perderamMargem.slice(0, 2)) {
    centralAlertas.push({
      id: `profit-${p.id}`, icon: TrendingDown,
      title: "Margem em queda",
      message: `${p.nome} — CMV +${fmtBRL(p.delta_abs)}`,
      tone: "danger",
    });
  }
  const humanizeMotivo = (raw: string | null | undefined, tipo: string | null | undefined): { title: string; message: string } => {
    const r = (raw || "").toLowerCase();
    const ficha = tipo === "pizza" ? "Ficha de pizza" : "Ficha";
    if (r.includes("embalagem") && r.includes("insumo")) {
      return { title: `${ficha} sem embalagem ou insumo`, message: "Complete a ficha para calcular a margem correta." };
    }
    if (r.includes("embalagem")) return { title: `${ficha} sem embalagem`, message: "Adicione a embalagem para fechar o custo." };
    if (r.includes("insumo")) return { title: `${ficha} sem insumo`, message: "Cadastre os ingredientes para calcular o CMV." };
    if (r.includes("preco") || r.includes("preço")) return { title: `${ficha} sem preço de venda`, message: "Defina o preço para liberar a análise de margem." };
    if (r.includes("cmv")) return { title: `${ficha} com CMV alto`, message: "Revise custos ou ajuste o preço de venda." };
    return { title: `${ficha} precisa de atenção`, message: raw || "Revisar ficha técnica." };
  };
  for (const w of warnings.slice(0, 2) as any[]) {
    const h = humanizeMotivo(w.motivo, w.tipo_ficha);
    centralAlertas.push({
      id: `warn-${w.id}`, icon: AlertTriangle,
      title: h.title,
      message: h.message,
      tone: "warning",
      time: w.created_at ? formatDistanceToNow(new Date(w.created_at), { locale: ptBR, addSuffix: true }) : undefined,
    });
  }
  if (centralAlertas.length === 0 && prontosPromocao.length > 0) {
    centralAlertas.push({
      id: "ok-1", icon: Sparkles,
      title: "Produto pronto para promoção",
      message: `${prontosPromocao.length} item${prontosPromocao.length > 1 ? "s" : ""} com margem segura`,
      tone: "success",
    });
  }
  if (centralAlertas.length === 0 && cmvOk && hasFaturamento) {
    centralAlertas.push({
      id: "ok-2", icon: CheckCircle2,
      title: "Margem saudável",
      message: `CMV em ${cmvPct.toFixed(1)}%, dentro da meta de ${cmvMeta}%`,
      tone: "success",
    });
  }

  if (isMobile) return <MobileDashboard />;

  return (
    <div className={cn("page-enter relative -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8 pb-12 min-h-[calc(100vh-4rem)] overflow-hidden", C.bg)}>
      {/* Page-level aurora wash — extremely subtle */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] -z-0"
        style={{
          background:
            "radial-gradient(40% 60% at 15% 0%, rgba(37,99,235,0.07) 0%, transparent 70%), radial-gradient(35% 60% at 85% 0%, rgba(139,92,246,0.06) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-[1]">

      {/* ─── GREETING + QUICK ACTIONS ─────────────────────────── */}
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-6">
        <div className="min-w-0">
          <h1 className={cn(T.display, C.text)}>
            {greeting()}{userName ? `, ${userName}` : ""}.
          </h1>
          <p className={cn(T.body, C.muted, "mt-1.5 text-[14px]")}>
            Este é o pulso financeiro do seu cardápio hoje.
          </p>
          <p className={cn(T.body, "mt-2 text-[13.5px] font-medium",
            caixaNegativo ? "text-[#DC2626]" : caixaPositivo ? "text-[#059669]" : "text-[#475569]",
          )}>
            {greetingInsight}
          </p>
        </div>
        <div className="flex flex-col items-start lg:items-end gap-2.5">
          {businessName && (
            <span className={cn(T.label, "px-3 py-1.5 rounded-full bg-white border border-[#E2E8F0]", C.muted)}>
              {businessName} · <span className="capitalize-first lowercase">{dataHoje}</span>
            </span>
          )}
        </div>
      </header>

      <div className="mb-6">
        <OnboardingChecklist />
      </div>

      {/* Quick Actions bar — 1 primary, demais secundárias */}
      <div className="flex flex-wrap items-center gap-2 mb-8 p-3 rounded-2xl bg-white border border-[#E2E8F0]">
        <span className={cn(T.label, C.muted, "mr-2 pl-2 flex items-center gap-1.5 shrink-0")}>
          <Zap size={13} /> Atalhos
        </span>
        <CTA variant="primary" icon={Plus} onClick={() => navigate("/financeiro/caixa-diario")}>Registrar Venda</CTA>
        <div className="w-px h-6 bg-[#E2E8F0] mx-1" />
        <CTA variant="ghost" icon={Sparkles} onClick={() => navigate("/promocoes")}>Criar Promoção</CTA>
        <CTA variant="ghost" icon={FileUp} onClick={() => navigate("/insumos/comprados")}>Importar Nota</CTA>
        <CTA variant="ghost" icon={ChefHat} onClick={() => navigate("/fichas/pizzas")}>Nova Ficha</CTA>
        <CTA variant="ghost" icon={Tag} onClick={() => navigate("/precificacao/pizzas")}>Atualizar Preço</CTA>
      </div>

      {/* ─── ROW 1 — HERO CAIXA DO MÊS + PARA VOCÊ AGORA ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
        {/* Hero card — azul / vermelho / âmbar conforme status */}
        <div
          className={cn(
            "lg:col-span-8 rounded-[2.5rem] p-8 lg:p-10 text-white relative overflow-hidden flex flex-col justify-between min-h-[280px] lg:min-h-[340px]",
            "fade-up",
            heroShadow,
            heroGradient,
          )}
        >
          {/* Decor blurs */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[80px] -mr-20 -mt-20 opacity-50 bg-white/20 pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full blur-[100px] opacity-30 bg-white/10 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <p className="text-white/75 font-semibold uppercase tracking-[0.2em] text-[11px] flex items-center gap-2">
                {heroTitulo}
                <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
              </p>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md",
                heroBadge.cls,
              )}>
                {heroBadge.label}
              </span>
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className={cn(T.mono, "font-bold leading-none tracking-tight text-[44px] sm:text-[56px] lg:text-[72px]")}>
                {fmtBRL(lucroMes)}
              </span>
              {comparativos?.lucro !== null && comparativos?.lucro !== undefined && (
                <span className={cn(
                  "px-3 py-1 rounded-full text-sm font-bold border backdrop-blur-md",
                  comparativos.lucro >= 0
                    ? "bg-emerald-400/20 text-emerald-100 border-emerald-300/40"
                    : "bg-white/15 text-white border-white/30",
                )}>
                  {comparativos.lucro >= 0 ? "+" : ""}{comparativos.lucro.toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-white/85 text-[13.5px] mt-3 max-w-[480px]">
              {greetingInsight}
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap gap-8 lg:gap-12 mt-8 pt-6 border-t border-white/15">
            <div>
              <p className="text-white/70 text-[11px] uppercase tracking-wider font-semibold mb-1">Entradas no mês</p>
              <p className={cn(T.mono, "text-xl font-bold")}>{fmtBRL(faturamentoMes)}</p>
            </div>
            <div>
              <p className="text-white/70 text-[11px] uppercase tracking-wider font-semibold mb-1">Saídas no mês</p>
              <p className={cn(T.mono, "text-xl font-bold")}>{fmtBRL(despesasMes)}</p>
            </div>
            <div className="ml-auto self-end">
              <button
                onClick={() => navigate("/financeiro/caixa-diario")}
                className={cn(
                  "px-5 py-2.5 rounded-xl bg-white font-semibold text-[13px] hover:bg-white/90 transition-colors flex items-center gap-2",
                  heroBtnText,
                )}
              >
                Abrir caixa <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Para você agora — promo lateral */}
        <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-[2.5rem] p-7 lg:p-8 flex flex-col justify-between shadow-sm relative overflow-hidden group fade-up">
          <div className="absolute -right-4 -top-4 w-28 h-28 bg-orange-50 rounded-full opacity-60 group-hover:scale-110 transition-transform" />
          <div className="relative">
            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4 inline-block">
              Para você agora
            </span>
            {insumoCritico ? (
              <>
                <h3 className={cn("font-heading font-bold text-[20px] leading-tight mb-2", C.text)}>
                  {insumoCritico.nome} subiu {insumoCritico.variacaoPct.toFixed(1)}%
                </h3>
                <p className={cn(T.body, C.muted, "text-[13px]")}>
                  Revise os preços das fichas que usam esse insumo antes que afete a margem.
                </p>
              </>
            ) : prontosPromocao.length > 0 ? (
              <>
                <h3 className={cn("font-heading font-bold text-[20px] leading-tight mb-2", C.text)}>
                  {prontosPromocao.length} produto{prontosPromocao.length > 1 ? "s" : ""} pronto{prontosPromocao.length > 1 ? "s" : ""} pra promoção
                </h3>
                <p className={cn(T.body, C.muted, "text-[13px]")}>
                  Margem segura — bom momento pra lançar campanha.
                </p>
              </>
            ) : (
              <>
                <h3 className={cn("font-heading font-bold text-[20px] leading-tight mb-2", C.text)}>
                  Tudo sob controle por aqui
                </h3>
                <p className={cn(T.body, C.muted, "text-[13px]")}>
                  Nenhum alerta crítico no momento. Continue acompanhando.
                </p>
              </>
            )}
          </div>
          <button
            onClick={() => navigate(insumoCritico ? "/precificacao/pizzas" : "/promocoes")}
            className="relative w-full mt-6 py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-[13px] transition-all group-hover:bg-blue-600"
          >
            {insumoCritico ? "Ver impacto nos preços" : "Criar promoção"}
          </button>
        </div>
      </div>

      {/* ─── Diagnóstico do dia — copiloto financeiro ───────── */}
      {showDiagnostico && (() => {
        const problema =
          statusCaixa === "negativo" ? "Você está no prejuízo este mês"
          : statusCaixa === "atencao" ? "Sua margem está no limite"
          : "Operação saudável";
        const causa =
          diagCausas.length > 0
            ? diagCausas.join(" + ")
            : "sem causas críticas identificadas";
        const acaoPrincipal =
          fichasRevisar > 0
            ? `Revisar ${fichasRevisar} ficha${fichasRevisar > 1 ? "s" : ""} técnica${fichasRevisar > 1 ? "s" : ""}`
            : precosAtualizar > 0
            ? `Atualizar ${precosAtualizar} preço${precosAtualizar > 1 ? "s" : ""} crítico${precosAtualizar > 1 ? "s" : ""}`
            : "Acompanhar próximas movimentações";
        const rotaCorrigir = fichasRevisar > 0 ? "/fichas/pizzas" : "/precificacao/pizzas";
        const glassTone = diagnosticoTone === "danger" ? GLASS_DANGER
          : diagnosticoTone === "warning" ? GLASS_WARN
          : GLASS_SUCCESS;
        return (
          <div className={cn("mb-5 rounded-[2rem] overflow-hidden fade-up", glassTone)}>
            <div className="flex flex-col lg:flex-row">
              <div
                className={cn(
                  "lg:w-1.5 h-1.5 lg:h-auto w-full",
                  diagnosticoTone === "danger" ? "bg-rose-500"
                  : diagnosticoTone === "warning" ? "bg-amber-500"
                  : "bg-emerald-500",
                )}
              />
              <div className="flex-1 p-6 lg:p-7 flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div
                    className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ring-1 ring-white/60",
                      diagnosticoTone === "danger" ? "bg-rose-50 text-rose-600"
                      : diagnosticoTone === "warning" ? "bg-amber-50 text-amber-600"
                      : "bg-emerald-50 text-emerald-600",
                    )}
                  >
                    <Activity size={20} />
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <p className={cn(T.label, C.muted, "text-[10.5px]")}>Diagnóstico do dia</p>
                    <p className={cn("font-heading font-bold text-[16px] lg:text-[17px] leading-snug", C.text)}>
                      {problema}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2">
                      <p className={cn(T.body, "text-[13px]", C.muted)}>
                        <span className="font-semibold text-[#0F172A]">Causa:</span> {causa}
                      </p>
                      <p className={cn(T.body, "text-[13px]", C.muted)}>
                        <span className="font-semibold text-[#0F172A]">Próxima ação:</span> {acaoPrincipal}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5 shrink-0 w-full lg:w-auto">
                  <button
                    onClick={() => navigate(rotaCorrigir)}
                    className={cn(
                      "flex-1 lg:flex-none px-5 py-2.5 rounded-xl font-semibold text-[13px] transition-all flex items-center justify-center gap-2 text-white active:scale-[0.98]",
                      diagnosticoTone === "danger"
                        ? "bg-gradient-to-br from-rose-600 to-rose-700 hover:brightness-110 shadow-[0_8px_20px_-8px_rgba(225,29,72,0.55)]"
                        : diagnosticoTone === "warning"
                        ? "bg-gradient-to-br from-amber-500 to-orange-600 hover:brightness-110 shadow-[0_8px_20px_-8px_rgba(217,119,6,0.55)]"
                        : "bg-gradient-to-br from-blue-600 to-blue-700 hover:brightness-110 shadow-[0_8px_20px_-8px_rgba(37,99,235,0.55)]",
                    )}
                  >
                    <Zap size={14} /> Corrigir prioridade
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}



      {/* ─── ROW 2 — 4 KPIs ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
        {/* Entradas — azul = sucesso */}
        <div className={cn("rounded-3xl p-6", GLASS_SUCCESS)}>
          <div className="flex justify-between items-start mb-3">
            <p className={cn(T.label, C.muted, "text-[11px]")}>Entradas</p>
            <div className="text-blue-600"><ArrowUpRight size={18} /></div>
          </div>
          <p className={cn(T.mono, "text-2xl font-bold mb-3 text-blue-700")}>{fmtBRL(faturamentoMes)}</p>
          <div className="h-1.5 w-full bg-slate-100/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
              style={{ width: `${Math.min(100, faturamentoMes > 0 ? 100 : 0)}%` }}
            />
          </div>
          {comparativos?.faturamento !== null && comparativos?.faturamento !== undefined && (
            <p className={cn(
              "text-[11px] font-semibold mt-2",
              comparativos.faturamento >= 0 ? "text-blue-700" : "text-rose-600",
            )}>
              {comparativos.faturamento >= 0 ? "+" : ""}{comparativos.faturamento.toFixed(1)}% vs mês anterior
            </p>
          )}
        </div>

        {/* Saídas — vermelho quando crescem, neutro caso contrário */}
        {(() => {
          const despAlta = (comparativos?.despesas ?? 0) > 5;
          const cls = despAlta ? GLASS_DANGER : GLASS;
          return (
            <div className={cn("rounded-3xl p-6", cls)}>
              <div className="flex justify-between items-start mb-3">
                <p className={cn(T.label, C.muted, "text-[11px]")}>Saídas</p>
                <div className={despAlta ? "text-rose-600" : "text-slate-500"}><ArrowDownRight size={18} /></div>
              </div>
              <p className={cn(T.mono, "text-2xl font-bold mb-3", despAlta ? "text-rose-600" : C.text)}>{fmtBRL(despesasMes)}</p>
              <div className="h-1.5 w-full bg-slate-100/60 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", despAlta ? "bg-gradient-to-r from-rose-500 to-rose-600" : "bg-slate-400")}
                  style={{ width: `${Math.min(100, faturamentoMes > 0 ? (despesasMes / faturamentoMes) * 100 : 0)}%` }}
                />
              </div>
              {comparativos?.despesas !== null && comparativos?.despesas !== undefined && (
                <p className={cn(
                  "text-[11px] font-semibold mt-2",
                  comparativos.despesas <= 0 ? "text-emerald-600" : "text-rose-600",
                )}>
                  {comparativos.despesas >= 0 ? "+" : ""}{comparativos.despesas.toFixed(1)}% vs mês anterior
                </p>
              )}
            </div>
          );
        })()}

        {/* CMV % — crítico se > 100% */}
        {(() => {
          const cmvCritico = cmvPct > 100;
          const cmvAlerta = !cmvOk && !cmvCritico;
          const cls = cmvCritico ? GLASS_DANGER : cmvAlerta ? GLASS_WARN : GLASS_SUCCESS;
          const valorCor = cmvCritico ? "text-rose-600" : cmvAlerta ? "text-amber-600" : "text-blue-700";
          return (
            <div className={cn("rounded-3xl p-6", cls)}>
              <div className="flex items-center justify-between mb-3">
                <p className={cn(T.label, C.muted, "text-[11px]")}>
                  {cmvCritico ? "CMV crítico" : "CMV Operacional"}
                </p>
                {cmvCritico && (
                  <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                    Risco
                  </span>
                )}
              </div>
              <div className="flex items-end justify-between mb-3">
                <p className={cn(T.mono, "text-2xl font-bold", valorCor)}>{cmvPct.toFixed(1)}%</p>
                <span className={cn("text-[11px] font-bold", cmvOk ? "text-blue-700" : "text-rose-600")}>
                  Meta {cmvMeta}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100/60 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    cmvCritico ? "bg-gradient-to-r from-rose-500 to-rose-700"
                    : cmvAlerta ? "bg-gradient-to-r from-amber-400 to-orange-500"
                    : "bg-gradient-to-r from-blue-500 to-blue-600",
                  )}
                  style={{ width: `${Math.min(100, (cmvPct / (cmvMeta * 1.5)) * 100)}%` }}
                />
              </div>
              {cmvCritico && (
                <p className="text-[11px] font-semibold mt-2 text-rose-600">
                  Custos ultrapassaram 100% — revisar preços urgente.
                </p>
              )}
            </div>
          );
        })()}

        {/* Lucro Líquido — azul positivo, vermelho negativo, âmbar limite */}
        {(() => {
          const cls = caixaNegativo ? GLASS_DANGER : caixaAtencao ? GLASS_WARN : GLASS_SUCCESS;
          const cor = caixaNegativo ? "text-rose-600" : caixaAtencao ? "text-amber-600" : "text-blue-700";
          const label = caixaNegativo ? "Prejuízo no mês" : caixaAtencao ? "Lucro no limite" : "Lucro Líquido";
          return (
            <div className={cn("rounded-3xl p-6", cls)}>
              <div className="flex items-center justify-between mb-3">
                <p className={cn(T.label, C.muted, "text-[11px]")}>{label}</p>
                {caixaNegativo && (
                  <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                    Alerta
                  </span>
                )}
              </div>
              <p className={cn(T.mono, "text-2xl font-bold mb-2", cor)}>{fmtBRL(lucroMes)}</p>
              <p className={cn(T.body, C.muted, "text-[11px]")}>
                Margem de {faturamentoMes > 0 ? ((lucroMes / faturamentoMes) * 100).toFixed(1) : "0"}%
              </p>
            </div>
          );
        })()}
      </div>


      {/* ─── ROW 3 — CHART + CONTAS A VENCER ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8">
        {/* Chart 6 meses */}
        <div className={cn("lg:col-span-8 rounded-[2.5rem] p-7 lg:p-8", GLASS)}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-heading font-bold text-lg text-slate-900">Desempenho Semestral</h3>
              <p className={cn(T.body, C.muted, "text-[12px] mt-0.5")}>Receita vs Despesa — últimos 6 meses</p>
            </div>
            <div className="flex gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Receita
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-300" /> Despesa
              </span>
            </div>
          </div>
          {(() => {
            const maxVal = Math.max(
              1,
              ...graficoMensal.flatMap((m) => [m.receita, m.despesa]),
            );
            const currentIdx = graficoMensal.length - 1;

            let insight = "";
            if (graficoMensal.length) {
              const maxDesp = graficoMensal.reduce((a, b) => (b.despesa > a.despesa ? b : a));
              const maxRec = graficoMensal.reduce((a, b) => (b.receita > a.receita ? b : a));
              const current = graficoMensal[currentIdx];
              const currentDef = current.receita - current.despesa;
              if (currentDef < 0) {
                insight = `${current.mes} fechou com déficit de ${fmtBRL(Math.abs(currentDef))} — pior resultado recente.`;
              } else if (maxDesp.despesa > maxRec.receita * 0.85 && maxDesp.despesa > 0) {
                insight = `${maxDesp.mes} concentrou o maior volume de despesas dos últimos 6 meses.`;
              } else if (maxRec.receita > 0) {
                insight = `${maxRec.mes} foi seu mês de maior receita: ${fmtBRL(maxRec.receita)}.`;
              }
            }

            return (
              <>
                <div className="h-56 flex items-end justify-between gap-3 lg:gap-4">
                  {graficoMensal.map((m, idx) => {
                    const hReceita = (m.receita / maxVal) * 100;
                    const hDespesa = (m.despesa / maxVal) * 100;
                    const isCurrent = idx === currentIdx;
                    return (
                      <div key={m.mes} className="flex-1 flex flex-col items-center gap-3 group">
                        <div className="w-full flex items-end justify-center gap-1 h-48">
                          <div
                            className={cn(
                              "flex-1 rounded-t-lg transition-all max-w-[16px]",
                              isCurrent ? "bg-blue-600" : "bg-blue-200/70 group-hover:bg-blue-300",
                            )}
                            style={{ height: `${hReceita}%` }}
                            title={`Receita: ${fmtBRL(m.receita)}`}
                          />
                          <div
                            className="flex-1 rounded-t-lg bg-rose-200 transition-all max-w-[16px] group-hover:bg-rose-300"
                            style={{ height: `${hDespesa}%` }}
                            title={`Despesa: ${fmtBRL(m.despesa)}`}
                          />
                        </div>
                        <span className={cn(
                          T.mono, "text-[10px] font-bold uppercase",
                          isCurrent ? "text-blue-700" : "text-slate-400",
                        )}>
                          {m.mes}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {insight && (
                  <div className="mt-5 flex items-start gap-2.5 p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100">
                    <Sparkles size={15} className="text-blue-600 shrink-0 mt-0.5" strokeWidth={2.2} />
                    <p className={cn(T.body, "text-[13px] text-blue-900 font-medium leading-snug")}>
                      {insight}
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </div>


        {/* Contas a vencer */}
        <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-[2.5rem] p-7 lg:p-8 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-heading font-bold text-lg text-slate-900">Contas a Vencer</h3>
            <span className={cn(
              "text-[10px] font-bold px-2 py-1 rounded-full",
              contasVencendo.length > 0 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600",
            )}>
              {contasVencendo.length} pendentes
            </span>
          </div>
          {contasVencendo.length > 0 ? (
            <>
              <div className="space-y-3 flex-1">
                {contasVencendo.slice(0, 3).map((c: any, idx) => {
                  const dias = Math.ceil(
                    (new Date(c.data_lancamento).getTime() - Date.now()) / 86400000,
                  );
                  const urgente = dias <= 1;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center justify-between p-3.5 rounded-2xl transition-colors",
                        urgente ? "bg-rose-50" : "border border-slate-100",
                      )}
                    >
                      <div className="flex gap-3 items-center min-w-0">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[10px] shrink-0 uppercase",
                          urgente ? "bg-rose-100 text-rose-600" : "bg-blue-50 text-blue-600",
                        )}>
                          {dias <= 0 ? "Hoje" : `${dias}d`}
                        </div>
                        <div className="min-w-0">
                          <p className={cn(T.accent, "text-[13px] truncate", C.text)}>
                            {c.descricao || "Conta a pagar"}
                          </p>
                          <p className="text-[10.5px] text-slate-400">
                            {dias <= 0 ? "Vence hoje" : `Vence em ${dias} dia${dias > 1 ? "s" : ""}`}
                          </p>
                        </div>
                      </div>
                      <p className={cn(T.mono, "font-bold text-[13px] whitespace-nowrap ml-2", C.text)}>
                        {fmtBRL(Number(c.valor))}
                      </p>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => navigate("/financeiro/contas-pagar")}
                className="mt-5 text-[13px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-2"
              >
                Ver todas as contas <ArrowRight size={14} />
              </button>
            </>
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="Nenhuma conta urgente"
              hint="Você está em dia com os pagamentos dos próximos 7 dias."
              tone="success"
            />
          )}
        </div>
      </div>

      {/* ─── OPORTUNIDADES + RADAR (lado a lado) ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* OPORTUNIDADES */}
        <Bento>
          <CardHeader
            title="Oportunidades Recomendadas"
            subtitle="Produtos validados pela IA para campanhas de margem rápida e injeção de caixa."
            icon={Sparkles}
            tint="success"
            action={
              prontosPromocao.length > 0 && (
                <button
                  onClick={() => navigate("/promocoes")}
                  className={cn(T.label, "text-[#2563EB] hover:text-[#1D4ED8]")}
                >
                  Criar Campanha →
                </button>
              )
            }
          />
          {prontosPromocao.length ? (
            <div className="space-y-1.5">
              {prontosPromocao.slice(0, 5).map((p) => {
                const cat = String(p.categoria || "").toLowerCase();
                const Icon = cat.includes("pizza") ? Pizza
                  : cat.includes("bebida") ? Coffee
                  : cat.includes("sobremesa") || cat.includes("doce") ? Cake
                  : cat.includes("sandu") || cat.includes("lanche") || cat.includes("burger") ? Sandwich
                  : UtensilsCrossed;
                return (
                  <button
                    key={p.id}
                    onClick={() => navigate("/promocoes")}
                    className="w-full flex items-center gap-3.5 px-1 py-3 border-b border-[#F1F5F9] last:border-b-0 hover:bg-[#F8FAFC]/40 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0">
                      <Icon size={18} strokeWidth={2.2} className="text-[#2563EB]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(T.accent, "text-[15px] font-semibold truncate", C.text)}>{p.nome}</p>
                      <span className={cn(T.label, "text-[11px] uppercase tracking-wider", C.muted)}>{p.categoria}</span>
                    </div>
                    <span className={cn(T.mono, "text-[15px] font-bold text-[#2563EB] whitespace-nowrap")}>
                      {fmtBRL(p.preco)}
                    </span>
                  </button>
                );
              })}

            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="Nenhum produto liberado ainda"
              hint="Defina preços nas fichas técnicas."
              tone="success"
            />
          )}
        </Bento>

        {/* RADAR / NOTÍCIAS */}
        <NoticiasRestaurantes />
      </div>

      </div>
    </div>
  );
}
