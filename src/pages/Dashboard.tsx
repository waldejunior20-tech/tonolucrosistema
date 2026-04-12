import { useState, useEffect } from "react";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useDashboardData } from "@/hooks/useDashboardData";
import {
  TrendingUp, TrendingDown, Download, Share2, Bell, Clock,
  Wallet, Receipt, PiggyBank, AlertTriangle,
} from "lucide-react";
import CaixaRapido from "@/components/CaixaRapido";
import { AnimatedNumber } from "@/components/AnimatedNumber";

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
// KPI style variants
type KpiVariant = "faturamento" | "gastos" | "lucro_pos" | "lucro_neg" | "cmv_ok" | "cmv_bad";

function MiniKPI({ label, value, numericValue, formatter, icon: Icon, trendLabel, kpiType }: {
  label: string; value: string; icon: any;
  numericValue?: number; formatter?: (v: number) => string;
  trendLabel?: string;
  kpiType: KpiVariant;
}) {
  const gradients: Partial<Record<KpiVariant, { bg: string; shadow: string }>> = {
    faturamento: { bg: "linear-gradient(135deg, #166534, #2D7C5E)", shadow: "0 8px 24px rgba(22,101,52,0.2)" },
    gastos: { bg: "linear-gradient(135deg, #92400E, #D97706)", shadow: "0 8px 24px rgba(146,64,14,0.2)" },
    lucro_pos: { bg: "linear-gradient(135deg, #15803D, #22C55E)", shadow: "0 8px 24px rgba(34,197,94,0.3)" },
    lucro_neg: { bg: "linear-gradient(135deg, #7F1D1D, #B91C1C)", shadow: "0 8px 24px rgba(127,29,29,0.2)" },
    cmv_ok: { bg: "linear-gradient(135deg, #1E3A5F, #3B82F6)", shadow: "0 8px 24px rgba(59,130,246,0.2)" },
    cmv_bad: { bg: "linear-gradient(135deg, #7F1D1D, #B91C1C)", shadow: "0 8px 24px rgba(127,29,29,0.2)" },
  };

  const grad = gradients[kpiType];

  const renderValue = (textClass: string) => (
    numericValue !== undefined && formatter ? (
      <AnimatedNumber value={numericValue} formatter={formatter} className={`text-[24px] font-extrabold tracking-tight leading-none ${textClass}`} duration={1000} />
    ) : (
      <span className={`text-[24px] font-extrabold tracking-tight leading-none ${textClass}`}>{value}</span>
    )
  );

  // Colored gradient card
  if (grad) {
    return (
      <div
        style={{ background: grad.bg, boxShadow: grad.shadow }}
        className="group rounded-2xl px-5 py-4 border border-white/10 transition-all duration-300 hover:scale-[1.02] hover:brightness-110"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-white/80 uppercase tracking-wider">{label}</span>
          <Icon size={18} className="text-white/70" />
        </div>
        <div className="flex items-baseline gap-2">
          {renderValue("text-white drop-shadow-sm")}
          {trendLabel && trendLabel !== "—" && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white/20 text-white">{trendLabel}</span>
          )}
        </div>
      </div>
    );
  }

  // Clean white card (CMV)
  const iconColor = kpiType === "cmv_ok" ? "text-[hsl(var(--success))]" : "text-[hsl(var(--destructive))]";
  return (
    <div className="group bg-card rounded-2xl px-5 py-4 border border-border/60 transition-all duration-300 hover:shadow-[0_6px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{label}</span>
        <Icon size={18} className={iconColor} />
      </div>
      <div className="flex items-baseline gap-2">
        {renderValue("text-[#1F2937]")}
        {trendLabel && trendLabel !== "—" && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
            kpiType === "cmv_bad"
              ? "text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.08)]"
              : "text-[hsl(var(--success))] bg-[hsl(var(--success)/0.08)]"
          }`}>
            {trendLabel}
          </span>
        )}
      </div>
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
      style={
        isCritical
          ? { background: "linear-gradient(135deg, rgba(127,29,29,0.06), rgba(185,28,28,0.1))" }
          : { background: "linear-gradient(135deg, rgba(30,41,59,0.04), rgba(51,65,85,0.08))" }
      }
      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200 ${
        isCritical ? "border-[#B91C1C]/15" : "border-[#334155]/15"
      }`}
    >
      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${isCritical ? "bg-[#B91C1C]" : "bg-[#D97706]"}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-[12px] font-semibold flex items-center gap-1.5 ${
          isCritical ? "text-[#7F1D1D]" : "text-[#1E293B]"
        }`}>
          {isCritical && <AlertTriangle size={12} />}
          {title}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{detail}</p>
      </div>
      {value && (
        <span className={`text-[11px] font-bold whitespace-nowrap font-mono ${
          isCritical ? "text-[#B91C1C]" : "text-[#1E293B]"
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
    <div className={`bg-card border border-border/60 rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_6px_24px_rgba(0,0,0,0.06)] ${className}`}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
          {hint && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{hint}</p>}
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
      <tspan x={cx} dy="-6" fontSize="20" fontWeight="700" fill="hsl(222,47%,11%)">
        {value}
      </tspan>
      <tspan x={cx} dy="18" fontSize="10" fill="hsl(220,9%,46%)">
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
    backgroundColor: "#fff",
    border: "1px solid hsl(var(--border))",
    borderRadius: "10px",
    color: "hsl(var(--foreground))",
    fontSize: "12px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  };

  return (
    <div className="space-y-10 page-enter">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 fade-up">
        <div>
          <p className="text-[11px] text-muted-foreground/60 mb-0.5 uppercase tracking-wider font-medium">Dashboard</p>
          <h1 className="text-[22px] sm:text-[26px] font-bold text-foreground tracking-tight leading-tight">
            {getGreeting()}{businessName ? `, ${businessName}` : ""}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Period filters — small rounded pills */}
          <div className="flex gap-1 bg-muted/40 p-0.5 rounded-full border border-border/30">
            {(["1m", "3m", "6m"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 ${
                  period === p
                    ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "1m" ? "1 Mês" : p === "3m" ? "3 Meses" : "6 Meses"}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-1">
            <button className="w-7 h-7 rounded-full border border-border/40 bg-card flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-colors">
              <Download size={13} />
            </button>
            <button className="w-7 h-7 rounded-full border border-border/40 bg-card flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-colors">
              <Share2 size={13} />
            </button>
            <div className="relative">
              <button className="w-7 h-7 rounded-full border border-border/40 bg-card flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-colors">
                <Bell size={13} />
              </button>
              {contasVencendo.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {contasVencendo.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── MINI KPI CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 stagger-fade-in">
        <MiniKPI
          label="Faturamento"
          value={formatBRL(faturamentoMes)}
          numericValue={faturamentoMes}
          formatter={formatBRL}
          icon={Wallet}
          trendLabel={faturamentoMes > 0 ? "+32.5%" : undefined}
          kpiType="faturamento"
        />
        <MiniKPI
          label="Gastos"
          value={formatBRL(despesasMes)}
          numericValue={despesasMes}
          formatter={formatBRL}
          icon={Receipt}
          trendLabel={despesasMes > 0 ? "-8.2%" : undefined}
          kpiType="gastos"
        />
        <MiniKPI
          label="Lucro"
          value={formatBRL(lucroMes)}
          numericValue={lucroMes}
          formatter={formatBRL}
          icon={PiggyBank}
          trendLabel={lucroMes !== 0 ? (lucroMes > 0 ? "↑ Positivo" : "↓ Negativo") : undefined}
          kpiType={lucroMes >= 0 ? "lucro_pos" : "lucro_neg"}
        />
        <MiniKPI
          label="CMV"
          value={faturamentoMes > 0 ? `${cmvPct.toFixed(1)}%` : "—"}
          numericValue={faturamentoMes > 0 ? cmvPct : undefined}
          formatter={(v) => `${v.toFixed(1)}%`}
          icon={TrendingDown}
          trendLabel={faturamentoMes > 0 ? `Meta ${cmvMeta}%` : undefined}
          kpiType={cmvPct <= cmvMeta ? "cmv_ok" : "cmv_bad"}
        />
      </div>

      {/* ─── CAIXA RÁPIDO ─── */}
      <div className="fade-up fade-up-d1">
        <CaixaRapido />
      </div>

      {/* ─── CHART: Revenue ─── */}
      <div className="fade-up fade-up-d2">
        <div className="bg-card border border-border/60 rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
          {/* Chart header with inline legend */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[15px] font-bold text-foreground">Faturamento vs. Despesas</h3>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">Evolução mensal do seu negócio</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Inline legend */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-[3px] rounded-full bg-[#166534]" />
                  <span className="text-[10px] text-muted-foreground">Receita</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-[3px] rounded-full bg-[#D97706]" style={{ backgroundImage: "repeating-linear-gradient(90deg, #D97706 0, #D97706 4px, transparent 4px, transparent 7px)" }} />
                  <span className="text-[10px] text-muted-foreground">Despesa</span>
                </div>
              </div>
              <select className="text-[10px] text-muted-foreground bg-muted/40 border border-border/30 rounded-full px-2.5 py-1 outline-none focus:border-primary/30">
                <option>6 Meses</option>
                <option>3 Meses</option>
                <option>1 Ano</option>
              </select>
            </div>
          </div>

          {hasChartData ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={graficoMensal} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#15803D" stopOpacity={0.25} />
                    <stop offset="50%" stopColor="#22C55E" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.15} />
                    <stop offset="50%" stopColor="#D97706" stopOpacity={0.05} />
                    <stop offset="100%" stopColor="#D97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                <XAxis
                  dataKey="mes"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip
                  contentStyle={{
                    ...tooltipStyle,
                    padding: "10px 14px",
                  }}
                  formatter={(value: number) => formatBRL(value)}
                  cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="receita"
                  name="Receita"
                  stroke="#15803D"
                  fill="url(#gradReceita)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: "#15803D", stroke: "#fff", strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="despesa"
                  name="Despesa"
                  stroke="#D97706"
                  fill="url(#gradDespesa)"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  activeDot={{ r: 4, fill: "#D97706", stroke: "#fff", strokeWidth: 2 }}
                />
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
        <div style={{ background: "linear-gradient(135deg, #1E293B, #334155)" }} className="border border-white/10 rounded-2xl px-5 py-4">
          <h3 className="text-[13px] font-semibold text-white mb-2.5 flex items-center gap-2">
            <Bell size={14} className="text-white/50" />
            Alertas
          </h3>
          {contasVencendo.length > 0 || (cmvPct > cmvMeta && faturamentoMes > 0) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {contasVencendo.map((c, i) => (
                <AlertItem
                  key={i}
                  severity="warning"
                  title={c.descricao}
                  detail={`Vence ${format(new Date(c.data_lancamento + "T00:00:00"), "dd/MM")}`}
                  value={formatBRL(Number(c.valor))}
                />
              ))}
              {cmvPct > cmvMeta && faturamentoMes > 0 && (
                <AlertItem
                  severity="critical"
                  title="CMV acima da meta"
                  detail={`${cmvPct.toFixed(1)}% vs meta de ${cmvMeta}%`}
                />
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
