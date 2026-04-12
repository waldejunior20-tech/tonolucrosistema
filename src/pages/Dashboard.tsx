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
  AlertTriangle, Download, Share2, Bell, Clock, ArrowRight, ChevronRight,
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

// ─── KPI Card (Panze reference: icon top-left, label, big number, detail row, "See in details") ─
function StatusBadge({ type, label }: { type: "success" | "warning" | "danger"; label: string }) {
  const styles = {
    success: "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.2)]",
    warning: "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.2)]",
    danger: "bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))] border-[hsl(var(--destructive)/0.2)]",
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${styles[type]}`}>
      {label}
    </span>
  );
}

function KPICard({ label, value, icon: Icon, trend, trendLabel, detailLabel, detailValue, link, badge }: {
  label: string; value: string; icon: any;
  trend: "up" | "down"; trendLabel: string;
  detailLabel?: string; detailValue?: string;
  link?: string;
  badge?: { type: "success" | "warning" | "danger"; label: string };
}) {
  const borderColor = badge?.type === "success" ? "hsl(var(--success))" : badge?.type === "warning" ? "hsl(var(--warning))" : badge?.type === "danger" ? "hsl(var(--destructive))" : "hsl(var(--primary))";
  return (
    <div className="group bg-card border border-border rounded-2xl p-5 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-[5px]" style={{ borderTop: `4px solid ${borderColor}` }}>
      {/* Badge + Icon */}
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon size={18} className="text-primary" />
        </div>
        {badge && <StatusBadge type={badge.type} label={badge.label} />}
      </div>

      {/* Label */}
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>

      {/* Big number + trend inline */}
      <div className="flex items-baseline gap-3 mb-3">
        <p className="kpi-number text-foreground">{value}</p>
        {trendLabel !== "—" && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 ${
            trend === "up" ? "text-[hsl(var(--success))] bg-[hsl(var(--success)/0.08)]" : "text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.08)]"
          }`}>
            {trend === "up" ? "↑" : "↓"} {trendLabel}
          </span>
        )}
      </div>

      {/* Detail row */}
      {detailLabel && (
        <div className="flex items-center justify-between text-[12px] mb-3">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))]" />
            {detailLabel}
          </span>
          {detailValue && (
            <span className="font-semibold text-[hsl(var(--success))]">{detailValue}</span>
          )}
        </div>
      )}

      {/* See in details link */}
      <button className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-primary transition-colors group/link">
        <span>Ver detalhes</span>
        <ArrowRight size={12} className="group-hover/link:translate-x-0.5 transition-transform" />
      </button>
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
        ? "bg-[hsl(var(--destructive)/0.04)] border-[hsl(var(--destructive)/0.15)]"
        : "bg-[hsl(var(--warning)/0.04)] border-[hsl(var(--warning)/0.15)]"
    }`}>
      <div className={`mt-1 health-pulse ${isCritical ? "health-pulse-red" : "health-pulse-amber"}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-semibold flex items-center gap-1.5 ${
          isCritical ? "text-[hsl(var(--destructive))]" : "text-foreground"
        }`}>
          {isCritical && <AlertTriangle size={13} />}
          {title}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{detail}</p>
      </div>
      {value && (
        <span className={`text-[12px] font-bold whitespace-nowrap font-mono ${
          isCritical ? "text-[hsl(var(--destructive))]" : "text-foreground"
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
    <div className={`bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-[5px] ${className}`} style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
          {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Insight Card ───────────────────────────────────────────────────
function InsightCard({ tipo, titulo, descricao }: {
  tipo: "positivo" | "alerta" | "sucesso"; titulo: string; descricao: string;
}) {
  const variants = {
    positivo: "bg-[hsl(var(--success)/0.05)] border-[hsl(var(--success)/0.15)]",
    alerta: "bg-[hsl(var(--warning)/0.05)] border-[hsl(var(--warning)/0.15)]",
    sucesso: "bg-[hsl(var(--success)/0.05)] border-[hsl(var(--success)/0.15)]",
  };
  return (
    <div className={`rounded-xl p-4 border transition-all duration-200 hover:shadow-sm ${variants[tipo]}`}>
      <p className="text-[13px] font-semibold text-foreground mb-1">{titulo}</p>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{descricao}</p>
    </div>
  );
}

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

  const insights: { tipo: "positivo" | "alerta" | "sucesso"; titulo: string; descricao: string }[] = [];
  if (lucroMes > 0) insights.push({ tipo: "sucesso", titulo: "Lucro Positivo", descricao: `${formatBRL(lucroMes)} este mês` });
  if (cmvPct > cmvMeta && faturamentoMes > 0) insights.push({ tipo: "alerta", titulo: "CMV Acima da Meta", descricao: `${cmvPct.toFixed(1)}% vs meta ${cmvMeta}%` });
  if (contasVencendo.length > 0) insights.push({ tipo: "alerta", titulo: `${contasVencendo.length} Contas Vencendo`, descricao: "Nos próximos 3 dias" });
  if (totalFichas > 0) insights.push({ tipo: "positivo", titulo: `${totalFichas} Fichas Ativas`, descricao: "Produtos cadastrados" });
  if (insights.length === 0) insights.push({ tipo: "positivo", titulo: "Tudo em Dia", descricao: "Nenhum alerta no momento" });

  const tooltipStyle = {
    backgroundColor: "#fff",
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
          <p className="text-[13px] text-muted-foreground mb-1">Dashboard</p>
          <h1 className="text-[24px] sm:text-[28px] font-bold text-foreground tracking-tight leading-tight">
            {getGreeting()}{businessName ? `, ${businessName}` : ""}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl border border-border/40">
            {(["1m", "3m", "6m"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 ${
                  period === p
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "1m" ? "1 Mês" : p === "3m" ? "3 Meses" : "6 Meses"}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <button className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <Download size={14} />
            </button>
            <button className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <Share2 size={14} />
            </button>
            <div className="relative">
              <button className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <Bell size={14} />
              </button>
              {contasVencendo.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
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
          icon={DollarSign}
          trend="up"
          trendLabel={faturamentoMes > 0 ? "32.54%" : "—"}
          detailLabel="Lucro líquido:"
          detailValue={lucroMes > 0 ? formatBRL(lucroMes) : undefined}
          badge={lucroMes > 0 ? { type: "success", label: "Lucro em Alta" } : faturamentoMes > 0 ? { type: "danger", label: "Prejuízo" } : undefined}
        />
        <KPICard
          label="Fichas Técnicas"
          value={String(totalFichas)}
          icon={BookOpen}
          trend="up"
          trendLabel={totalFichas > 0 ? `${totalFichas} ativas` : "—"}
          detailLabel="Cadastradas"
          badge={totalFichas > 0 ? { type: "success", label: "Ativo" } : { type: "warning", label: "Cadastrar" }}
        />
        <KPICard
          label="Insumos"
          value={String(totalInsumos)}
          icon={Package}
          trend="up"
          trendLabel={totalInsumos > 0 ? `${totalInsumos} itens` : "—"}
          detailLabel="Em estoque"
          badge={totalInsumos > 0 ? { type: "success", label: "Ok" } : { type: "warning", label: "Revisar Custos" }}
        />
        <KPICard
          label="Promoções"
          value={String(promocoesAtivas)}
          icon={Tag}
          trend={promocoesAtivas > 0 ? "up" : "down"}
          trendLabel={promocoesAtivas > 0 ? `${promocoesAtivas} ativas` : "—"}
          detailLabel="Ativas agora"
          badge={promocoesAtivas > 0 ? { type: "success", label: "Ativas" } : undefined}
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

      {/* ─── CHARTS ROW 1 ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 fade-up fade-up-d2">
        <ChartCard
          title="Faturamento (6 Meses)"
          hint="Evolução de receitas vs. despesas"
          action={
            <select className="text-[11px] text-muted-foreground bg-secondary/50 border border-border rounded-lg px-2.5 py-1 outline-none focus:border-primary/30">
              <option>6 Meses</option>
              <option>3 Meses</option>
              <option>1 Ano</option>
            </select>
          }
        >
          {hasChartData ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={graficoMensal}>
                <defs>
                  <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} width={55} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatBRL(value)} />
                <Area type="monotone" dataKey="receita" name="Receita" stroke="hsl(var(--primary))" fill="url(#gradReceita)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="despesa" name="Despesa" stroke="hsl(var(--destructive))" fill="transparent" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground gap-3">
              <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center">
                <TrendingUp size={20} className="text-muted-foreground/50" />
              </div>
              <p className="text-[13px] text-center max-w-[220px]">Registre receitas e despesas no módulo Financeiro.</p>
            </div>
          )}
        </ChartCard>

        <ChartCard title="CMV vs Meta" hint="Controle de custo mensal">
          {hasChartData ? (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={cmvChartData}>
                <XAxis dataKey="mes" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Bar dataKey="cmv" name="CMV" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={24} opacity={0.85} />
                <Line type="monotone" dataKey="meta" name="Meta" stroke="hsl(var(--destructive))" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground gap-3">
              <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center">
                <Package size={20} className="text-muted-foreground/50" />
              </div>
              <p className="text-[13px] text-center max-w-[220px]">Dados insuficientes para o gráfico de CMV.</p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ─── CHARTS ROW 2 ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 fade-up fade-up-d3">
        <ChartCard title="Alertas & Avisos" hint="Contas e alertas que precisam de atenção">
          <div className="space-y-2.5">
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
              <div className="flex flex-col items-center justify-center h-[180px] text-muted-foreground gap-2">
                <div className="w-11 h-11 rounded-xl bg-[hsl(var(--success)/0.06)] flex items-center justify-center">
                  <Clock size={18} className="text-[hsl(var(--success))]" />
                </div>
                <p className="text-[12px]">Nenhuma conta vencendo nos próximos 3 dias.</p>
              </div>
            )}

            {cmvPct > cmvMeta && faturamentoMes > 0 && (
              <AlertItem
                severity="critical"
                title="CMV acima da meta"
                detail={`${cmvPct.toFixed(1)}% vs meta de ${cmvMeta}%`}
              />
            )}
          </div>
        </ChartCard>

        <ChartCard title="Distribuição de Cadastros" hint="Visão geral por categoria">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={vendasPorCategoria} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {vendasPorCategoria.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 flex flex-col gap-3">
              {vendasPorCategoria.map((cat, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[12px] font-medium text-foreground">{cat.name}</span>
                    <span className="text-[11px] text-muted-foreground">{cat.percentual}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* ─── FOOTER ─── */}
      <div className="border-t border-border pt-4 pb-2 text-center fade-up">
        <p className="text-[11px] text-muted-foreground">
          {businessName || "TôNoLucro"} © {new Date().getFullYear()} — Sistema Profissional de Gestão
        </p>
      </div>
    </div>
  );
}
