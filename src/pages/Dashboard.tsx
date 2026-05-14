import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp, TrendingDown, AlertTriangle, Sparkles, ChefHat,
  Plus, FileUp, Tag, ArrowRight, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Flame, ShieldAlert, ClipboardList, Zap, Receipt, Bell, Wallet, Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useProfitAlerts } from "@/hooks/useProfitAlerts";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
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
  className, children,
}: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 md:p-6 flex flex-col min-w-0",
        C.card, C.border,
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_16px_-4px_rgba(15,23,42,0.06)]",
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
          <h3 className={cn(T.headline, C.text, "truncate")}>{title}</h3>
          {subtitle && <p className={cn(T.body, C.muted, "mt-0.5 text-[12.5px]")}>{subtitle}</p>}
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
        "inline-flex items-center gap-2 h-10 px-4 rounded-xl border transition-all text-[13.5px]",
        T.accent,
        variant === "primary"
          ? "bg-[#2563EB] text-white border-[#2563EB] hover:bg-[#1D4ED8]"
          : "bg-white text-[#0F172A] border-[#E2E8F0] hover:border-[#94A3B8] hover:bg-[#F8FAFC]",
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
  const color = ({ success: C.success, warning: C.warning, danger: C.danger, primary: C.primary } as any)[tone];
  const r = 40;
  const c = 2 * Math.PI * r;
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className="relative w-[112px] h-[112px] shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#E2E8F0" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${(v / 100) * c} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn(T.mono, "text-[22px] font-bold", C.text)}>{value.toFixed(0)}%</span>
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
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
      <div className="flex items-center justify-between mb-2">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", tintBg[tone])}>
          <Icon size={14} strokeWidth={2.4} />
        </div>
      </div>
      <p className={cn(T.mono, "text-[24px] font-bold leading-none mb-1", valColor[tone])}>{value}</p>
      <p className={cn(T.body, "text-[11.5px] font-medium", C.muted)}>{label}</p>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [businessName, setBusinessName] = useState("");

  const { faturamentoMes, despesasMes, cmvPct, cmvMeta, comparativos } = useDashboardData();
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
        .select("id, mensagem, tipo, created_at, resolvido")
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
  const caixaPositivo = lucroMes > 0;
  const caixaNegativo = lucroMes < 0;
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
  for (const w of warnings.slice(0, 2) as any[]) {
    centralAlertas.push({
      id: `warn-${w.id}`, icon: AlertTriangle,
      title: w.tipo === "preco_desatualizado" ? "Preço desatualizado" : "Ficha precisa atenção",
      message: w.mensagem || "Revisar ficha técnica",
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

  return (
    <div className={cn("page-enter -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8 pb-12 min-h-[calc(100vh-4rem)]", C.bg)}>

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

      {/* Quick Actions bar */}
      <div className="flex flex-wrap items-center gap-2.5 mb-6 p-4 rounded-2xl bg-white border border-[#E2E8F0]">
        <span className={cn(T.label, C.muted, "mr-1 flex items-center gap-1.5")}>
          <Zap size={13} /> Ações Rápidas
        </span>
        <CTA variant="primary" icon={Plus} onClick={() => navigate("/financeiro/caixa-diario")}>Registrar Venda</CTA>
        <CTA variant="ghost" icon={ChefHat} onClick={() => navigate("/fichas/pizzas")}>Nova Ficha</CTA>
        <CTA variant="ghost" icon={Tag} onClick={() => navigate("/precificacao/pizzas")}>Atualizar Preço</CTA>
        <CTA variant="ghost" icon={Sparkles} onClick={() => navigate("/promocoes")}>Criar Promoção</CTA>
        <CTA variant="ghost" icon={FileUp} onClick={() => navigate("/insumos/comprados")}>Importar Nota Fiscal</CTA>
      </div>

      {/* ─── BENTO GRID ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-5">

        {/* ROW 1 — RADAR DE LUCRO (hero, col-span-7) */}
        <Bento className="lg:col-span-7 relative overflow-hidden">
          <div
            aria-hidden
            className={cn(
              "absolute inset-0 opacity-[0.55] pointer-events-none",
              radarTone === "danger" && "bg-gradient-to-br from-[#FEF2F2] via-white to-white",
              radarTone === "warning" && "bg-gradient-to-br from-[#FFFBEB] via-white to-white",
              radarTone === "success" && "bg-gradient-to-br from-[#ECFDF5] via-white to-white",
            )}
          />
          <div className="relative">
            <CardHeader
              title="Radar de Lucro"
              subtitle="O que mexeu no seu lucro nesta semana."
              icon={Flame}
              tint={radarTone}
              action={<StatusBadge tone={radarTone} glow>{radarLabel}</StatusBadge>}
            />

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
              <div className="space-y-4 min-w-0">
                {insumoCritico ? (
                  <>
                    <div>
                      <p className={cn(T.label, C.muted, "mb-1.5")}>Insumo em alta</p>
                      <h2 className={cn("font-heading font-bold text-[28px] md:text-[32px] leading-tight", C.text)}>
                        {insumoCritico.nome} subiu{" "}
                        <span className="text-[#DC2626]">{insumoCritico.variacaoPct.toFixed(1)}%</span>
                      </h2>
                      <p className={cn(T.body, C.muted, "mt-2")}>
                        <span className={cn(T.mono, "font-semibold")}>{fmtBRL(insumoCritico.precoAnterior)}</span>
                        {" → "}
                        <span className={cn(T.mono, "font-semibold text-[#DC2626]")}>
                          {fmtBRL(insumoCritico.precoAtual)}
                        </span>
                        {" "}/ {insumoCritico.unidade}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                        <span className={C.muted}>
                          <span className={cn(T.mono, "font-bold", C.text)}>{perderamMargem.length}</span> produtos impactados
                        </span>
                      </div>
                      {priceAlerts.length > 1 && (
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                          <span className={C.muted}>
                            <span className={cn(T.mono, "font-bold", C.text)}>{priceAlerts.length}</span> insumos em alta
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <CTA variant="primary" onClick={() => navigate("/precificacao/pizzas")}>
                        Ver impacto
                      </CTA>
                      <CTA variant="ghost" onClick={() => navigate("/insumos/comprados")}>
                        Histórico do insumo
                      </CTA>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className={cn(T.label, C.muted, "mb-1.5")}>Tudo certo</p>
                      <h2 className={cn("font-heading font-bold text-[26px] md:text-[30px] leading-tight", C.text)}>
                        Seu lucro está protegido.
                      </h2>
                      <p className={cn(T.body, C.muted, "mt-2")}>
                        Nenhum insumo subiu acima do limite nesta semana.
                      </p>
                    </div>
                    <CTA variant="primary" onClick={() => navigate("/automacao/saude")}>
                      Ver saúde do cardápio
                    </CTA>
                  </>
                )}
              </div>

              <div className="hidden md:flex items-center justify-center">
                <ProgressRing
                  value={insumoCritico ? Math.min(100, insumoCritico.variacaoPct * 5) : (cmvOk ? 100 - cmvPct : cmvPct)}
                  tone={radarTone}
                />
              </div>
            </div>
          </div>
        </Bento>

        {/* ROW 1 — STATUS FINANCEIRO (col-span-5) */}
        <Bento className="lg:col-span-5">
          <CardHeader
            title="Status Financeiro"
            subtitle="Caixa do mês corrente."
            icon={Wallet}
            tint={finanTone}
            action={<StatusBadge tone={finanTone} glow>{finanLabel}</StatusBadge>}
          />

          {hasFaturamento ? (
            <div className="space-y-5 flex-1 flex flex-col">
              <div>
                <p className={cn(T.label, C.muted, "mb-1.5")}>Saldo do mês</p>
                <p className={cn(
                  T.mono, "font-bold leading-none text-[34px] md:text-[40px]",
                  caixaPositivo ? "text-[#059669]" : caixaNegativo ? "text-[#DC2626]" : C.text,
                )}>
                  {fmtBRL(lucroMes)}
                </p>
                {comparativos?.lucro !== null && comparativos?.lucro !== undefined && (
                  <div className={cn(
                    "inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-md text-[11.5px] font-semibold",
                    comparativos.lucro >= 0 ? "bg-[#ECFDF5] text-[#059669]" : "bg-[#FEF2F2] text-[#DC2626]",
                  )}>
                    {comparativos.lucro >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(comparativos.lucro).toFixed(1)}% vs mês anterior
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ArrowUpRight size={13} className="text-[#059669]" />
                    <p className={cn(T.label, C.muted)}>Entrada</p>
                  </div>
                  <p className={cn(T.mono, "text-[18px] font-bold", C.text)}>{fmtBRL(faturamentoMes)}</p>
                </div>
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ArrowDownRight size={13} className="text-[#DC2626]" />
                    <p className={cn(T.label, C.muted)}>Saída</p>
                  </div>
                  <p className={cn(T.mono, "text-[18px] font-bold", C.text)}>{fmtBRL(despesasMes)}</p>
                </div>
              </div>

              {caixaNegativo && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA]">
                  <AlertTriangle size={15} className="text-[#DC2626] shrink-0 mt-0.5" />
                  <p className="text-[12.5px] text-[#991B1B]">
                    Seu caixa do mês está negativo em <strong>{fmtBRL(Math.abs(lucroMes))}</strong>. Revise despesas e priorize ajustes de preço.
                  </p>
                </div>
              )}

              <div className="mt-auto pt-1">
                <CTA variant="ghost" icon={ArrowRight} onClick={() => navigate("/financeiro/caixa-diario")}>
                  Ver financeiro
                </CTA>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Wallet}
              title="Dados insuficientes"
              hint="Cadastre vendas e despesas para ativar o status financeiro."
              tone="warning"
            />
          )}
        </Bento>

        {/* ROW 2 — PRONTOS PARA PROMOÇÃO (col-span-4) */}
        <Bento className="lg:col-span-4">
          <CardHeader
            title="Prontos para Promoção"
            subtitle="Produtos com margem segura para campanha."
            icon={Sparkles}
            tint="success"
            action={
              prontosPromocao.length > 0 && (
                <button
                  onClick={() => navigate("/promocoes")}
                  className={cn(T.label, "text-[#2563EB] hover:text-[#1D4ED8]")}
                >
                  Criar →
                </button>
              )
            }
          />
          {prontosPromocao.length ? (
            <div className="space-y-1.5">
              {prontosPromocao.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate("/promocoes")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:border-[#E2E8F0] hover:bg-[#F8FAFC] transition-all text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0">
                    <Sparkles size={13} strokeWidth={2.4} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(T.accent, "text-[13.5px] truncate", C.text)}>{p.nome}</p>
                    <span className={cn(
                      T.label, "text-[10px] inline-block mt-0.5 px-1.5 py-0.5 rounded-md bg-[#F1F5F9]",
                      C.muted,
                    )}>{p.categoria}</span>
                  </div>
                  <span className={cn(T.mono, "text-[13px] font-bold text-[#059669] whitespace-nowrap")}>
                    {fmtBRL(p.preco)}
                  </span>
                  <ArrowRight size={13} className="text-[#94A3B8] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="Nenhum produto liberado ainda"
              hint="Defina preços nas fichas técnicas para liberar candidatos a promoção."
              tone="success"
            />
          )}
        </Bento>

        {/* ROW 2 — PRODUTOS EM RISCO (col-span-4) */}
        <Bento className="lg:col-span-4">
          <CardHeader
            title="Produtos em Risco"
            subtitle="Não devem entrar em promoção sem revisão."
            icon={ShieldAlert}
            tint="danger"
          />
          {perderamMargem.length ? (
            <div className="space-y-1.5">
              {perderamMargem.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate("/automacao/alertas")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:border-[#E2E8F0] hover:bg-[#F8FAFC] transition-all text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center shrink-0">
                    <TrendingDown size={13} strokeWidth={2.4} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(T.accent, "text-[13.5px] truncate", C.text)}>{p.nome}</p>
                    <p className={cn(T.body, "text-[11.5px]", C.muted)}>
                      CMV {fmtBRL(p.cmv_anterior)} → <span className="text-[#DC2626] font-semibold">{fmtBRL(p.cmv_atual)}</span>
                    </p>
                  </div>
                  <span className={cn(T.mono, "text-[12px] font-bold text-[#D97706] whitespace-nowrap")}>
                    Sug. {fmtBRL(p.preco_sugerido)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="Nenhum produto em risco"
              hint="Margens estão saudáveis. Continue acompanhando custos e fichas."
              tone="success"
            />
          )}
        </Bento>

        {/* ROW 2 — ENGENHARIA DO CARDÁPIO (col-span-4) */}
        <Bento className="lg:col-span-4">
          <CardHeader
            title="Engenharia do Cardápio"
            subtitle="Saúde geral das suas fichas técnicas."
            icon={ClipboardList}
            tint="primary"
            action={
              <button
                onClick={() => navigate("/fichas/pizzas")}
                className={cn(T.label, "text-[#2563EB] hover:text-[#1D4ED8]")}
              >
                Abrir →
              </button>
            }
          />
          {totalFichas > 0 ? (
            <div className="grid grid-cols-2 gap-2.5">
              <MiniTile icon={ClipboardList} label="Fichas incompletas"
                value={fichasIncompletas} tone={fichasIncompletas > 0 ? "warning" : "success"} />
              <MiniTile icon={Tag} label="Preços desatualizados"
                value={warnings.length} tone={warnings.length > 0 ? "warning" : "success"} />
              <MiniTile icon={TrendingDown} label="CMV alto"
                value={perderamMargem.length} tone={perderamMargem.length > 0 ? "danger" : "success"} />
              <MiniTile icon={CheckCircle2} label="Margem saudável"
                value={fichasMargemOk} tone="success" />
            </div>
          ) : (
            <EmptyState
              icon={ChefHat}
              title="Sem fichas cadastradas"
              hint="Cadastre suas fichas técnicas para ver a saúde do cardápio."
              tone="primary"
            />
          )}
        </Bento>

        {/* ROW 3 — CENTRAL DE ALERTAS (col-span-5) */}
        <Bento className="lg:col-span-5">
          <CardHeader
            title="Central de Alertas"
            subtitle="Notificações que merecem sua atenção."
            icon={Bell}
            tint="warning"
            action={
              centralAlertas.length > 0 && (
                <button
                  onClick={() => navigate("/automacao/alertas")}
                  className={cn(T.label, "text-[#2563EB] hover:text-[#1D4ED8]")}
                >
                  Ver tudo →
                </button>
              )
            }
          />
          {centralAlertas.length ? (
            <div className="space-y-2">
              {centralAlertas.slice(0, 5).map((a) => {
                const tintBg: Record<string, string> = {
                  success: "bg-[#ECFDF5] text-[#059669]",
                  warning: "bg-[#FFFBEB] text-[#D97706]",
                  danger: "bg-[#FEF2F2] text-[#DC2626]",
                  primary: "bg-[#EFF6FF] text-[#2563EB]",
                };
                return (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", tintBg[a.tone])}>
                      <a.icon size={14} strokeWidth={2.4} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(T.accent, "text-[13.5px]", C.text)}>{a.title}</p>
                        <StatusBadge tone={a.tone}>
                          {a.tone === "danger" ? "Alta" : a.tone === "warning" ? "Média" : "Info"}
                        </StatusBadge>
                      </div>
                      <p className={cn(T.body, "text-[12.5px] mt-0.5", C.muted)}>{a.message}</p>
                      {a.time && <p className="text-[11px] text-[#94A3B8] mt-1">{a.time}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Bell}
              title="Nenhum alerta no momento"
              hint="Vamos te avisar assim que algo precisar de atenção."
              tone="success"
            />
          )}
        </Bento>

        {/* ROW 3 — ÚLTIMOS LANÇAMENTOS (col-span-7) */}
        <Bento className="lg:col-span-7">
          <CardHeader
            title="Últimos Lançamentos"
            subtitle="Movimentações financeiras recentes."
            icon={Receipt}
            tint="primary"
            action={
              <button
                onClick={() => navigate("/financeiro/caixa-diario")}
                className={cn(T.label, "text-[#2563EB] hover:text-[#1D4ED8]")}
              >
                Ver tudo →
              </button>
            }
          />
          {ultimosLancamentos.length ? (
            <div className="divide-y divide-[#F1F5F9]">
              {ultimosLancamentos.map((l: any) => {
                const isReceita = l.tipo === "receita";
                return (
                  <div
                    key={l.id}
                    className="flex items-center gap-3 py-3 px-2 -mx-2 rounded-lg hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      isReceita ? "bg-[#ECFDF5] text-[#059669]" : "bg-[#FEF2F2] text-[#DC2626]",
                    )}>
                      {isReceita ? <ArrowUpRight size={14} strokeWidth={2.4} /> : <ArrowDownRight size={14} strokeWidth={2.4} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(T.accent, "text-[13.5px] truncate", C.text)}>
                        {l.descricao || (isReceita ? "Venda" : "Despesa")}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn(T.label, "text-[10px] px-1.5 py-0.5 rounded-md bg-[#F1F5F9]", C.muted)}>
                          {l.categoria || (isReceita ? "Receita" : "Despesa")}
                        </span>
                        <span className="text-[11px] text-[#94A3B8]">
                          {format(new Date(l.data_lancamento), "dd/MM", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    {l.pago !== undefined && (
                      <StatusBadge tone={l.pago ? "success" : "warning"}>
                        {l.pago ? "Pago" : "Pendente"}
                      </StatusBadge>
                    )}
                    <span className={cn(
                      T.mono, "text-[14px] font-bold whitespace-nowrap",
                      isReceita ? "text-[#059669]" : "text-[#DC2626]",
                    )}>
                      {isReceita ? "+" : "−"} {fmtBRL(Number(l.valor))}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Receipt}
              title="Nenhum lançamento ainda"
              hint="Registre vendas e despesas no Caixa Diário para vê-los aqui."
              tone="primary"
            />
          )}
        </Bento>

      </div>
    </div>
  );
}
