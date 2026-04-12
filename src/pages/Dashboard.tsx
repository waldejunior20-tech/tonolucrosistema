import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Line,
} from "recharts";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useDashboardData } from "@/hooks/useDashboardData";
import { TrendingUp, TrendingDown, DollarSign, Package, BookOpen, Tag, AlertTriangle, Download, Share2, Bell } from "lucide-react";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

// ─── KPI Card ────────────────────────────────────────────────────────
function KPICard({ label, value, change, icon: Icon, trend }: {
  label: string; value: string; change: string; icon: any; trend: "up" | "down";
}) {
  return (
    <div className="group bg-card border border-border rounded-xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_hsl(var(--primary)/0.1)] hover:border-primary/30 card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon size={16} className="text-primary" />
        </div>
      </div>
      <p className="text-[32px] font-bold text-primary tracking-tight leading-none mb-3">{value}</p>
      <div className="flex items-center gap-1.5">
        <span className={`text-xs font-semibold flex items-center gap-1 ${trend === "up" ? "text-[hsl(var(--success))]" : "text-[hsl(var(--destructive))]"}`}>
          {trend === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {change}
        </span>
        <span className="text-[11px] text-muted-foreground">vs. mês anterior</span>
      </div>
    </div>
  );
}

// ─── Insight Card ───────────────────────────────────────────────────
function InsightCard({ tipo, titulo, descricao, icon }: {
  tipo: "positivo" | "alerta" | "sucesso"; titulo: string; descricao: string; icon: string;
}) {
  const variants = {
    positivo: "bg-[hsl(var(--success)/0.08)] border-[hsl(var(--success)/0.2)]",
    alerta: "bg-[hsl(var(--warning)/0.08)] border-[hsl(var(--warning)/0.2)]",
    sucesso: "bg-[hsl(var(--success)/0.08)] border-[hsl(var(--success)/0.2)]",
  };
  return (
    <div className={`rounded-lg p-4 border transition-all duration-200 ${variants[tipo]}`}>
      <p className="text-sm font-semibold text-foreground mb-1">{icon} {titulo}</p>
      <p className="text-xs text-muted-foreground">{descricao}</p>
    </div>
  );
}

// ─── Chart Card wrapper ──────────────────────────────────────────────
function ChartCard({ title, hint, children, className = "" }: {
  title: string; hint: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-card border border-border rounded-xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] card ${className}`}>
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-foreground tracking-tight">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
      </div>
      {children}
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
    totalFichas,
    totalInsumos,
    promocoesAtivas,
    faturamentoMes,
    despesasMes,
    cmvPct,
    cmvMeta,
    graficoMensal,
    contasVencendo,
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

  // Build CMV chart data from graficoMensal
  const cmvChartData = graficoMensal.map((m) => ({
    mes: m.mes,
    cmv: m.receita > 0 ? ((m.despesa / m.receita) * 100) : 0,
    meta: cmvMeta,
  }));

  // Build category data (placeholder until real data exists)
  const vendasPorCategoria = [
    { name: "Pizzas", value: totalFichas || 1, percentual: 42, color: CATEGORY_COLORS[0] },
    { name: "Insumos", value: totalInsumos || 1, percentual: 36, color: CATEGORY_COLORS[1] },
    { name: "Promoções", value: promocoesAtivas || 1, percentual: 11, color: CATEGORY_COLORS[2] },
    { name: "Bebidas", value: 1, percentual: 8, color: CATEGORY_COLORS[3] },
    { name: "Outros", value: 1, percentual: 5, color: CATEGORY_COLORS[4] },
  ];

  // Build dynamic insights
  const insights: { tipo: "positivo" | "alerta" | "sucesso"; titulo: string; descricao: string; icon: string }[] = [];
  if (lucroMes > 0) insights.push({ tipo: "sucesso", titulo: "Lucro Positivo", descricao: `${formatBRL(lucroMes)} este mês`, icon: "💰" });
  if (cmvPct > cmvMeta && faturamentoMes > 0) insights.push({ tipo: "alerta", titulo: "CMV Acima da Meta", descricao: `${cmvPct.toFixed(1)}% vs meta ${cmvMeta}%`, icon: "⚠️" });
  if (contasVencendo.length > 0) insights.push({ tipo: "alerta", titulo: `${contasVencendo.length} Contas Vencendo`, descricao: "Nos próximos 3 dias", icon: "📋" });
  if (totalFichas > 0) insights.push({ tipo: "positivo", titulo: `${totalFichas} Fichas Ativas`, descricao: "Produtos cadastrados", icon: "📈" });
  // Always show at least one
  if (insights.length === 0) insights.push({ tipo: "positivo", titulo: "Tudo em Dia", descricao: "Nenhum alerta no momento", icon: "✅" });

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    color: "hsl(var(--foreground))",
  };

  return (
    <div className="space-y-5 page-enter">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 fade-up">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {getGreeting()}{businessName ? `, ${businessName}` : ""} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral do negócio em tempo real</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex gap-1 bg-secondary p-1 rounded-lg">
            {(["1m", "3m", "6m"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === p
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "1m" ? "1 Mês" : p === "3m" ? "3 Meses" : "6 Meses"}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <button className="w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
              <Download size={14} />
            </button>
            <button className="w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
              <Share2 size={14} />
            </button>
            <div className="relative">
              <button className="w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                <Bell size={14} />
              </button>
              {contasVencendo.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-card">
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
          change={faturamentoMes > 0 ? "+12.5%" : "—"}
          icon={DollarSign}
          trend="up"
        />
        <KPICard
          label="Fichas Técnicas"
          value={String(totalFichas)}
          change={totalFichas > 0 ? `${totalFichas} ativas` : "—"}
          icon={BookOpen}
          trend="up"
        />
        <KPICard
          label="Insumos"
          value={String(totalInsumos)}
          change={totalInsumos > 0 ? `${totalInsumos} itens` : "—"}
          icon={Package}
          trend="up"
        />
        <KPICard
          label="Promoções"
          value={String(promocoesAtivas)}
          change={promocoesAtivas > 0 ? `${promocoesAtivas} ativas` : "—"}
          icon={Tag}
          trend={promocoesAtivas > 0 ? "up" : "down"}
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
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={graficoMensal}>
                <defs>
                  <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatBRL(value)} />
                <Area type="monotone" dataKey="receita" name="Receita" stroke="hsl(var(--success))" fill="url(#gradReceita)" strokeWidth={2} />
                <Area type="monotone" dataKey="despesa" name="Despesa" stroke="hsl(var(--destructive))" fill="url(#gradDespesa)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
              Registre receitas e despesas no módulo Financeiro para visualizar o gráfico.
            </div>
          )}
        </ChartCard>

        <ChartCard title="CMV vs Meta" hint="Controle de custo mensal">
          {hasChartData ? (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={cmvChartData}>
                <XAxis dataKey="mes" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Bar dataKey="cmv" name="CMV" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={32} />
                <Line type="monotone" dataKey="meta" name="Meta" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="6 3" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
              Dados insuficientes para o gráfico de CMV.
            </div>
          )}
        </ChartCard>
      </div>

      {/* ─── CHARTS ROW 2: Alertas + Categorias ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 fade-up fade-up-d3">
        {/* Alertas */}
        <ChartCard title="Alertas" hint="Contas e avisos recentes">
          <div className="space-y-3">
            {contasVencendo.length > 0 ? (
              contasVencendo.map((c, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[hsl(var(--warning)/0.05)] border border-[hsl(var(--warning)/0.15)]">
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-[hsl(var(--warning))] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{c.descricao}</p>
                    <p className="text-[10px] text-muted-foreground">Vence {format(new Date(c.data_lancamento + "T00:00:00"), "dd/MM")}</p>
                  </div>
                  <span className="text-xs font-semibold text-[hsl(var(--warning))] whitespace-nowrap font-mono">{formatBRL(Number(c.valor))}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                ✅ Nenhuma conta vencendo nos próximos 3 dias.
              </div>
            )}

            {cmvPct > cmvMeta && faturamentoMes > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[hsl(var(--destructive)/0.05)] border border-[hsl(var(--destructive)/0.15)]">
                <div className="mt-1.5 w-2 h-2 rounded-full bg-destructive flex-shrink-0" />
                <p className="text-xs font-medium text-destructive flex items-center gap-1">
                  <AlertTriangle size={12} /> CMV acima da meta ({cmvPct.toFixed(1)}% vs {cmvMeta}%)
                </p>
              </div>
            )}
          </div>
        </ChartCard>

        {/* Distribuição por Categoria */}
        <ChartCard title="Distribuição de Cadastros" hint="Visão geral por categoria">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={vendasPorCategoria} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {vendasPorCategoria.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 flex flex-col gap-3">
              {vendasPorCategoria.map((cat, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground">{cat.name}</p>
                    <p className="text-[11px] text-muted-foreground">{cat.value} itens</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* ─── FOOTER ─── */}
      <div className="border-t border-border pt-4 text-center fade-up">
        <p className="text-[11px] text-muted-foreground">
          {businessName || "Gestão Food"} © {new Date().getFullYear()} — Sistema Profissional de Gestão
        </p>
      </div>
    </div>
  );
}
