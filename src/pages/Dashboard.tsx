import { useState, useEffect } from "react";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useDashboardData } from "@/hooks/useDashboardData";
import {
  TrendingUp, TrendingDown, Bell, Clock,
  Wallet, Receipt, PiggyBank, AlertTriangle, ArrowUp, ArrowDown, Minus,
} from "lucide-react";
import CaixaRapido from "@/components/CaixaRapido";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

// ─── Minimal KPI Card ────────────────────────────────────────────────
type KpiVariant = "faturamento" | "gastos" | "lucro_pos" | "lucro_neg" | "cmv_ok" | "cmv_bad";

function MoMBadge({ variacao, higherIsBetter, dark }: {
  variacao: number | null;
  higherIsBetter: boolean;
  dark: boolean;
}) {
  if (variacao === null) {
    return (
      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
        dark ? "bg-white/15 text-white/80" : "bg-muted text-muted-foreground"
      }`}>
        <Minus size={10} /> sem base
      </span>
    );
  }

  const isFlat = Math.abs(variacao) < 0.5;
  const isUp = variacao > 0;
  const isGood = isFlat ? true : isUp === higherIsBetter;
  const Icon = isFlat ? Minus : isUp ? ArrowUp : ArrowDown;
  const arrow = isFlat ? "" : isUp ? "+" : "";

  if (dark) {
    return (
      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 backdrop-blur ${
        isGood ? "bg-white/25 text-white" : "bg-black/30 text-white"
      }`}>
        <Icon size={10} strokeWidth={3} />
        {arrow}{Math.abs(variacao).toFixed(1)}%
      </span>
    );
  }

  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
      isGood ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
    }`}>
      <Icon size={10} strokeWidth={3} />
      {arrow}{Math.abs(variacao).toFixed(1)}%
    </span>
  );
}

function MiniKPI({ label, value, numericValue, formatter, icon: Icon, trendLabel, kpiType, momVariation, higherIsBetter }: {
  label: string; value: string; icon: any;
  numericValue?: number; formatter?: (v: number) => string;
  trendLabel?: string;
  kpiType: KpiVariant;
  momVariation?: number | null;
  higherIsBetter?: boolean;
}) {
  const gradients: Partial<Record<KpiVariant, { bg: string; shadow: string }>> = {
    faturamento: { bg: "linear-gradient(135deg, hsl(var(--grad-faturamento-from)), hsl(var(--grad-faturamento-to)))", shadow: "0 8px 24px hsl(var(--grad-faturamento-from) / 0.2)" },
    gastos: { bg: "linear-gradient(135deg, hsl(var(--grad-gastos-from)), hsl(var(--grad-gastos-to)))", shadow: "0 8px 24px hsl(var(--grad-gastos-from) / 0.2)" },
    lucro_pos: { bg: "linear-gradient(135deg, hsl(var(--grad-lucro-pos-from)), hsl(var(--grad-lucro-pos-to)))", shadow: "0 8px 24px hsl(var(--grad-lucro-pos-to) / 0.3)" },
    lucro_neg: { bg: "linear-gradient(135deg, hsl(var(--grad-lucro-neg-from)), hsl(var(--grad-lucro-neg-to)))", shadow: "0 8px 24px hsl(var(--grad-lucro-neg-from) / 0.2)" },
    cmv_ok: { bg: "linear-gradient(135deg, hsl(var(--grad-cmv-ok-from)), hsl(var(--grad-cmv-ok-to)))", shadow: "0 8px 24px hsl(var(--grad-cmv-ok-to) / 0.2)" },
    cmv_bad: { bg: "linear-gradient(135deg, hsl(var(--grad-lucro-neg-from)), hsl(var(--grad-lucro-neg-to)))", shadow: "0 8px 24px hsl(var(--grad-lucro-neg-from) / 0.2)" },
  };

  const grad = gradients[kpiType];
  const showMoM = momVariation !== undefined && higherIsBetter !== undefined;

  const renderValue = (textClass: string) => (
    numericValue !== undefined && formatter ? (
      <AnimatedNumber value={numericValue} formatter={formatter} className={`text-[28px] font-extrabold tracking-tight leading-none ${textClass}`} duration={1000} />
    ) : (
      <span className={`text-[28px] font-extrabold tracking-tight leading-none ${textClass}`}>{value}</span>
    )
  );

  // Colored gradient card
  if (grad) {
    return (
      <div
        style={{ background: grad.bg, boxShadow: grad.shadow }}
        className="group rounded-2xl px-6 py-5 border border-white/10 transition-all duration-300 hover:scale-[1.02] hover:brightness-110"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[13px] font-bold text-white/80 uppercase tracking-wider">{label}</span>
          <Icon size={20} className="text-white/70" />
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          {renderValue("text-white drop-shadow-sm")}
           {trendLabel && trendLabel !== "—" && (
             <span className="text-[12px] font-bold px-2 py-1 rounded-md bg-white/20 text-white">{trendLabel}</span>
           )}
        </div>
        {showMoM && (
          <div className="mt-2 flex items-center gap-1.5">
            <MoMBadge variacao={momVariation} higherIsBetter={higherIsBetter} dark />
            <span className="text-[10px] text-white/60 font-medium">vs mês anterior</span>
          </div>
        )}
      </div>
    );
  }

  // Clean white card (CMV)
  const iconColor = kpiType === "cmv_ok" ? "text-success" : "text-destructive";
  return (
    <div className="group bg-card rounded-2xl px-6 py-5 border border-border/60 transition-all duration-300 hover:shadow-[0_6px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-bold text-muted-foreground/70 uppercase tracking-wider">{label}</span>
        <Icon size={20} className={iconColor} />
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        {renderValue("text-foreground")}
        {trendLabel && trendLabel !== "—" && (
          <span className={`text-[12px] font-bold px-2 py-1 rounded-md ${
            kpiType === "cmv_bad"
              ? "text-destructive bg-destructive/8"
              : "text-success bg-success/8"
          }`}>
            {trendLabel}
          </span>
        )}
      </div>
      {showMoM && (
        <div className="mt-2 flex items-center gap-1.5">
          <MoMBadge variacao={momVariation} higherIsBetter={higherIsBetter} dark={false} />
          <span className="text-[10px] text-muted-foreground font-medium">vs mês anterior</span>
        </div>
      )}
    </div>
  );
}

// ─── Alert Item ──────────────────────────────────────────────────────
function AlertItem({ severity, title, detail, value }: {
  severity: "warning" | "critical"; title: string; detail: string; value?: string;
}) {
  const isCritical = severity === "critical";
  return (
    <div
      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200 ${
        isCritical
          ? "bg-destructive/5 border-destructive/15"
          : "bg-muted border-muted-foreground/15"
      }`}
    >
      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${isCritical ? "bg-destructive" : "bg-warning"}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-bold flex items-center gap-1.5 ${
          isCritical ? "text-destructive" : "text-muted-foreground"
        }`}>
          {isCritical && <AlertTriangle size={14} />}
          {title}
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5">{detail}</p>
      </div>
      {value && (
        <span className={`text-[13px] font-bold whitespace-nowrap font-mono ${
          isCritical ? "text-destructive" : "text-muted-foreground"
        }`}>{value}</span>
      )}
    </div>
  );
}

// ─── Chart Card wrapper ──────────────────────────────────────────────
function ChartCard({ title, hint, action, children, className = "" }: {
  title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-card border border-border/60 rounded-2xl p-7 transition-all duration-300 hover:shadow-[0_6px_24px_rgba(0,0,0,0.06)] ${className}`}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-[16px] font-bold text-foreground">{title}</h3>
          {hint && <p className="text-[12px] text-muted-foreground/60 mt-0.5">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Donut center label ─────────────────────────────────────────────
function DonutCenterLabel({ viewBox, value }: any) {
  const { cx, cy } = viewBox;
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-6" fontSize="20" fontWeight="700" fill="hsl(var(--text-heading))">
        {value}
      </tspan>
      <tspan x={cx} dy="18" fontSize="10" fill="hsl(var(--text-muted))">
        total
      </tspan>
    </text>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [period, setPeriod] = useState("6m");

  const {
    totalFichas, totalInsumos, promocoesAtivas, faturamentoMes,
    despesasMes, cmvPct, cmvMeta, graficoMensal, contasVencendo,
  } = useDashboardData();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles").select("business_name").eq("id", user.id).single()
          .then(({ data }) => { if (data?.business_name) setBusinessName(data.business_name); });
      }
    });
  }, []);

  const lucroMes = faturamentoMes - despesasMes;
  const hasChartData = graficoMensal.some((m) => m.receita > 0 || m.despesa > 0);

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "10px",
    color: "hsl(var(--foreground))",
    fontSize: "12px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  };

  return (
    <div className="space-y-6 page-enter">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 fade-up">
        <div>
          <h1 className="text-2xl font-extrabold text-text-heading tracking-tight leading-tight">
            {getGreeting()}{businessName ? `, ${businessName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Visão geral do seu negócio</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-muted/40 p-0.5 rounded-full border border-border/30">
            {(["1m", "3m", "6m"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 ${
                  period === p
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "1m" ? "1 Mês" : p === "3m" ? "3 Meses" : "6 Meses"}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* ─── ONBOARDING CHECKLIST ─── */}
      <OnboardingChecklist />

      {/* ─── MINI KPI CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 stagger-fade-in">
        <MiniKPI label="Faturamento" value={formatBRL(faturamentoMes)} numericValue={faturamentoMes} formatter={formatBRL} icon={Wallet} kpiType="faturamento" />
        <MiniKPI label="Gastos" value={formatBRL(despesasMes)} numericValue={despesasMes} formatter={formatBRL} icon={Receipt} kpiType="gastos" />
        <MiniKPI label="Lucro" value={formatBRL(lucroMes)} numericValue={lucroMes} formatter={formatBRL} icon={PiggyBank} trendLabel={lucroMes !== 0 ? (lucroMes > 0 ? "↑ Positivo" : "↓ Negativo") : undefined} kpiType={lucroMes >= 0 ? "lucro_pos" : "lucro_neg"} />
        <MiniKPI label="Custo" value={faturamentoMes > 0 ? `${cmvPct.toFixed(1)}%` : "—"} numericValue={faturamentoMes > 0 ? cmvPct : undefined} formatter={(v) => `${v.toFixed(1)}%`} icon={TrendingDown} trendLabel={faturamentoMes > 0 ? `Meta ${cmvMeta}%` : undefined} kpiType={cmvPct <= cmvMeta ? "cmv_ok" : "cmv_bad"} />
      </div>

      {/* ─── CAIXA RÁPIDO ─── */}
      <div className="fade-up fade-up-d1">
        <CaixaRapido />
      </div>

      {/* ─── CHART: Revenue ─── */}
      <div className="fade-up fade-up-d2">
        <div className="bg-card border border-border rounded-2xl p-7 transition-all duration-300 hover:shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[16px] font-bold text-foreground">Faturamento vs. Despesas</h3>
              <p className="text-[12px] text-muted-foreground/50 mt-0.5">Evolução mensal do seu negócio</p>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-[3px] rounded-full bg-success" />
                <span className="text-[10px] text-muted-foreground">Receita</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-[3px] rounded-full bg-warning" />
                <span className="text-[10px] text-muted-foreground">Despesa</span>
              </div>
            </div>
          </div>

          {hasChartData ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={graficoMensal} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.25} />
                    <stop offset="50%" stopColor="hsl(var(--success))" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--warning))" stopOpacity={0.15} />
                    <stop offset="50%" stopColor="hsl(var(--warning))" stopOpacity={0.05} />
                    <stop offset="100%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                <XAxis
                  dataKey="mes"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 700 }}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip
                  contentStyle={{ ...tooltipStyle, padding: "10px 14px", fontWeight: 700 }}
                  formatter={(value: number) => formatBRL(value)}
                  cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="receita" name="Receita" stroke="hsl(var(--success))" fill="url(#gradReceita)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "hsl(var(--success))", stroke: "#fff", strokeWidth: 2 }} />
                <Area type="monotone" dataKey="despesa" name="Despesa" stroke="hsl(var(--warning))" fill="url(#gradDespesa)" strokeWidth={2} strokeDasharray="6 3" dot={false} activeDot={{ r: 4, fill: "hsl(var(--warning))", stroke: "#fff", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground gap-3">
              <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
                <TrendingUp size={20} className="text-muted-foreground/40" />
              </div>
              <p className="text-[12px] text-center max-w-[220px]">Registre receitas e despesas no módulo Financeiro para ver a evolução aqui.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── ALERTAS COMPACTO ─── */}
      <div className="fade-up fade-up-d3">
        <div className="bg-sidebar border border-border rounded-2xl px-5 py-4">
          <h3 className="text-[13px] font-semibold text-white mb-2.5 flex items-center gap-2">
            <Bell size={14} className="text-white/50" />
            Alertas
          </h3>
          {contasVencendo.length > 0 || (cmvPct > cmvMeta && faturamentoMes > 0) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {contasVencendo.map((c, i) => (
                <AlertItem key={i} severity="warning" title={c.descricao} detail={`Vence ${format(new Date(c.data_lancamento + "T00:00:00"), "dd/MM")}`} value={formatBRL(Number(c.valor))} />
              ))}
              {cmvPct > cmvMeta && faturamentoMes > 0 && (
                <AlertItem severity="critical" title="CMV acima da meta" detail={`${cmvPct.toFixed(1)}% vs meta de ${cmvMeta}%`} />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-1">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <Clock size={12} className="text-white/60" />
              </div>
              <p className="text-[11px] text-white/50">Nenhum alerta no momento.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <div className="border-t border-border/40 pt-4 pb-2 text-center fade-up">
        <p className="text-[10px] text-muted-foreground/50">
          {businessName || "TôNoLucro"} © {new Date().getFullYear()} — Sistema Profissional de Gestão
        </p>
      </div>
    </div>
  );
}
