import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Line,
} from "recharts";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useDashboardData } from "@/hooks/useDashboardData";
import {
  TrendingUp, TrendingDown, DollarSign, Package, BookOpen, Tag,
  AlertTriangle, Download, Share2, Bell, Clock,
} from "lucide-react";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

// ─── KPI Card (reference-style: icon top-left, label, big number, inline trend) ─
function KPICard({ label, value, subtitle, icon: Icon, trend, trendLabel }: {
  label: string; value: string; subtitle: string; icon: any;
  trend: "up" | "down"; trendLabel: string;
}) {
  return (
    <div className="group bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_8px_32px_rgba(255,107,43,0.06)] card">
      {/* Icon badge top-left */}
      <div className="w-10 h-10 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center mb-5 group-hover:bg-primary/12 transition-colors">
        <Icon size={18} className="text-primary" />
      </div>

      {/* Label */}
      <p className="label-upper mb-2">{label}</p>

      {/* Big number */}
      <p className="kpi-number text-foreground leading-none mb-3">{value}</p>

      {/* Subtitle + trend */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[12px] text-muted-foreground">{subtitle}</span>
        {trendLabel !== "—" && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
            trend === "up" ? "trend-positive" : "trend-negative"
          }`}>
            <span className="text-[10px]">{trend === "up" ? "↑" : "↓"}</span>
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
    <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 ${
      isCritical
        ? "bg-[hsl(var(--destructive)/0.06)] border-[hsl(var(--destructive)/0.20)]"
        : "bg-[hsl(var(--warning)/0.06)] border-[hsl(var(--warning)/0.20)]"
    }`}>
      {/* Pulse dot */}
      <div className={`mt-1 health-pulse ${isCritical ? "health-pulse-red" : "health-pulse-amber"}`} />

      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-semibold flex items-center gap-1.5 ${
          isCritical ? "text-[hsl(var(--destructive))]" : "text-[hsl(var(--warning))]"
        }`}>
          {isCritical && <AlertTriangle size={13} />}
          {title}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{detail}</p>
      </div>

      {value && (
        <span className={`text-xs font-bold whitespace-nowrap font-mono-data ${
          isCritical ? "text-[hsl(var(--destructive))]" : "text-[hsl(var(--warning))]"
        }`}>{value}</span>
      )}
    </div>
  );
}

// ─── Chart Card wrapper ──────────────────────────────────────────────
function ChartCard({ title, hint, children, className = "" }: {
  title: string; hint: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.20)] card ${className}`}>
      <div className="mb-6">
        <h3 className="text-[16px] font-semibold text-foreground tracking-tight">{title}</h3>
        <p className="text-[11px] text-muted-foreground mt-1 tracking-wide">{hint}</p>
      </div>
      {children}
    </div>
  );
}

// ─── Insight Card ───────────────────────────────────────────────────
function InsightCard({ tipo, titulo, descricao, icon }: {
  tipo: "positivo" | "alerta" | "sucesso"; titulo: string; descricao: string; icon: string;
}) {
  const variants = {
    positivo: "bg-[hsl(var(--success)/0.06)] border-[hsl(var(--success)/0.18)]",
    alerta: "bg-[hsl(var(--warning)/0.06)] border-[hsl(var(--warning)/0.18)]",
    sucesso: "bg-[hsl(var(--success)/0.06)] border-[hsl(var(--success)/0.18)]",
  };
  return (
    <div className={`rounded-xl p-4 border transition-all duration-200 ${variants[tipo]}`}>
      <p className="text-[13px] font-semibold text-foreground mb-1">{icon} {titulo}</p>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{descricao}</p>
    </div>
  );
}

// ─── Pie legend colors ──────────────────────────────────────────────
const CATEGORY_COLORS = ["#E63946", "#2D7C5E", "#F77F00", "#1FA89F", "#FCBF49"];

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

  const cmvChartData = graficoMensal.map((m) => ({
    mes: m.mes,
    cmv: m.receita > 0 ? ((m.despesa / m.receita) * 100) : 0,
    meta: cmvMeta,
  }));

  const vendasPorCategoria = [
    { name: "Pizzas", value: totalFichas || 1, percentual: 42, color: CATEGORY_COLORS[0] },
    { name: "Insumos", value: totalInsumos || 1, percentual: 36, color: CATEGORY_COLORS[1] },
    { name: "Promoções", value: promocoesAtivas || 1, percentual: 11, color: CATEGORY_COLORS[2] },
    { name: "Bebidas", value: 1, percentual: 8, color: CATEGORY_COLORS[3] },
    { name: "Outros", value: 1, percentual: 5, color: CATEGORY_COLORS[4] },
  ];

  const insights: { tipo: "positivo" | "alerta" | "sucesso"; titulo: string; descricao: string; icon: string }[] = [];
  if (lucroMes > 0) insights.push({ tipo: "sucesso", titulo: "Lucro Positivo", descricao: `${formatBRL(lucroMes)} este mês`, icon: "💰" });
  if (cmvPct > cmvMeta && faturamentoMes > 0) insights.push({ tipo: "alerta", titulo: "CMV Acima da Meta", descricao: `${cmvPct.toFixed(1)}% vs meta ${cmvMeta}%`, icon: "⚠️" });
  if (contasVencendo.length > 0) insights.push({ tipo: "alerta", titulo: `${contasVencendo.length} Contas Vencendo`, descricao: "Nos próximos 3 dias", icon: "📋" });
  if (totalFichas > 0) insights.push({ tipo: "positivo", titulo: `${totalFichas} Fichas Ativas`, descricao: "Produtos cadastrados", icon: "📈" });
  if (insights.length === 0) insights.push({ tipo: "positivo", titulo: "Tudo em Dia", descricao: "Nenhum alerta no momento", icon: "✅" });

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "10px",
    color: "hsl(var(--foreground))",
    fontSize: "12px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  };

  return (
    <div className="space-y-6 page-enter">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 fade-up">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold text-foreground tracking-tight leading-none">
            {getGreeting()}{businessName ? `, ${businessName}` : ""} 👋
          </h1>
          <p className="text-[13px] text-muted-foreground mt-2 tracking-wide">
            Visão geral do negócio em tempo real
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex gap-1 bg-secondary/60 p-1 rounded-xl border border-border/50">
            {(["1m", "3m", "6m"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 ${
                  period === p
                    ? "bg-card text-primary shadow-sm border border-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "1m" ? "1 Mês" : p === "3m" ? "3 Meses" : "6 Meses"}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <button className="w-9 h-9 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200">
              <Download size={14} />
            </button>
            <button className="w-9 h-9 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200">
              <Share2 size={14} />
            </button>
            <div className="relative">
              <button className="w-9 h-9 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200">
                <Bell size={14} />
              </button>
              {contasVencendo.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-card animate-pulse">
                  {contasVencendo.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── KPI CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-fade-in">
        <KPICard
          label="Faturamento"
          value={formatBRL(faturamentoMes)}
          subtitle="Últimos 30 dias"
          icon={DollarSign}
          trend="up"
          trendLabel={faturamentoMes > 0 ? "+12.5%" : "—"}
        />
        <KPICard
          label="Fichas Técnicas"
          value={String(totalFichas)}
          subtitle="Últimos 30 dias"
          icon={BookOpen}
          trend="up"
          trendLabel={totalFichas > 0 ? `${totalFichas} ativas` : "—"}
        />
        <KPICard
          label="Insumos"
          value={String(totalInsumos)}
          subtitle="Últimos 30 dias"
          icon={Package}
          trend="up"
          trendLabel={totalInsumos > 0 ? `${totalInsumos} itens` : "—"}
        />
        <KPICard
          label="Promoções"
          value={String(promocoesAtivas)}
          subtitle="Últimos 30 dias"
          icon={Tag}
          trend={promocoesAtivas > 0 ? "up" : "down"}
          trendLabel={promocoesAtivas > 0 ? `${promocoesAtivas} ativas` : "—"}
        />
      </div>

      {/* ─── INSIGHTS ─── */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 fade-up fade-up-d1">
          {insights.slice(0, 3).map((ins, idx) => (
            <InsightCard key={idx} {...ins} />
          ))}
        </div>
      )}

      {/* ─── CHARTS ROW 1: Faturamento + CMV ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 fade-up fade-up-d2">
        <ChartCard title="Faturamento (6 Meses)" hint="Evolução de receitas vs. despesas">
          {hasChartData ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={graficoMensal}>
                <defs>
                  <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} width={60} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatBRL(value)} />
                <Area type="monotone" dataKey="receita" name="Receita" stroke="hsl(var(--success))" fill="url(#gradReceita)" strokeWidth={2.5} dot={false} />
                <Area type="monotone" dataKey="despesa" name="Despesa" stroke="hsl(var(--destructive))" fill="url(#gradDespesa)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground gap-3">
              <div className="w-12 h-12 rounded-2xl bg-secondary/60 flex items-center justify-center">
                <TrendingUp size={20} className="text-muted-foreground/60" />
              </div>
              <p className="text-[13px] text-center max-w-[240px]">Registre receitas e despesas no módulo Financeiro para visualizar o gráfico.</p>
            </div>
          )}
        </ChartCard>

        <ChartCard title="CMV vs Meta" hint="Controle de custo mensal">
          {hasChartData ? (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={cmvChartData}>
                <XAxis dataKey="mes" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} width={45} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Bar dataKey="cmv" name="CMV" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={28} />
                <Line type="monotone" dataKey="meta" name="Meta" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="6 3" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground gap-3">
              <div className="w-12 h-12 rounded-2xl bg-secondary/60 flex items-center justify-center">
                <BarChart size={20} className="text-muted-foreground/60" />
              </div>
              <p className="text-[13px] text-center max-w-[240px]">Dados insuficientes para o gráfico de CMV.</p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ─── CHARTS ROW 2: Alertas + Categorias ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 fade-up fade-up-d3">
        {/* Alertas — redesigned for urgency */}
        <ChartCard title="Alertas & Avisos" hint="Contas e alertas que precisam de atenção">
          <div className="space-y-3">
            {contasVencendo.length > 0 ? (
              contasVencendo.map((c, i) => (
                <AlertItem
                  key={i}
                  severity="warning"
                  title={c.descricao}
                  detail={`Vence ${format(new Date(c.data_lancamento + "T00:00:00"), "dd/MM")}`}
                  value={formatBRL(Number(c.valor))}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--success)/0.08)] flex items-center justify-center">
                  <Clock size={20} className="text-[hsl(var(--success))]" />
                </div>
                <p className="text-[13px]">Nenhuma conta vencendo nos próximos 3 dias.</p>
              </div>
            )}

            {cmvPct > cmvMeta && faturamentoMes > 0 && (
              <AlertItem
                severity="critical"
                title={`CMV acima da meta`}
                detail={`${cmvPct.toFixed(1)}% vs meta de ${cmvMeta}% — ação recomendada`}
              />
            )}
          </div>
        </ChartCard>

        {/* Distribuição por Categoria */}
        <ChartCard title="Distribuição de Cadastros" hint="Visão geral por categoria">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={vendasPorCategoria} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {vendasPorCategoria.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 flex flex-col gap-4">
              {vendasPorCategoria.map((cat, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-foreground">{cat.name}</p>
                    <p className="text-[11px] text-muted-foreground">{cat.percentual}% · {cat.value} itens</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* ─── FOOTER ─── */}
      <div className="ember-line mt-2" />
      <div className="pt-3 pb-2 text-center fade-up">
        <p className="text-[11px] text-muted-foreground tracking-wide">
          {businessName || "TôNoLucro"} © {new Date().getFullYear()} — Sistema Profissional de Gestão
        </p>
      </div>
    </div>
  );
}
