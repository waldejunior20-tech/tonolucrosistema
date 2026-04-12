import { BookOpen, Package, Tag, TrendingUp, AlertTriangle, DollarSign, Pizza, BarChart3, Receipt, Megaphone } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { HealthStatus } from "@/components/HealthStatus";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const SHORTCUTS = [
  { label: "Fichas de Pizza", icon: Pizza, path: "/fichas/pizzas", color: "text-primary" },
  { label: "Precificação", icon: BarChart3, path: "/precificacao/pizzas", color: "text-warning" },
  { label: "DRE Financeiro", icon: Receipt, path: "/financeiro/dre", color: "text-success" },
  { label: "Promoções", icon: Megaphone, path: "/promocoes/ativas", color: "text-info" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
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
  const cmvStatus: "healthy" | "warning" | "danger" =
    cmvPct === 0 ? "healthy" : cmvPct <= cmvMeta ? "healthy" : cmvPct <= cmvMeta + 5 ? "warning" : "danger";

  const hasChartData = graficoMensal.some((m) => m.receita > 0 || m.despesa > 0);

  return (
    <div className="space-y-6">
      {/* Welcome — fade up */}
      <div className="fade-up">
        <PageHeader
          title={`${getGreeting()}${businessName ? `, ${businessName}` : ""} 👋`}
          description="Aqui está o resumo do seu negócio."
        />
      </div>

      {/* Health Status - CMV */}
      {faturamentoMes > 0 && (
        <div className="fade-up fade-up-d1">
          <HealthStatus
            status={cmvStatus}
            label={`CMV: ${cmvPct.toFixed(1)}% — Meta: ${cmvMeta}%`}
          />
        </div>
      )}

      {/* KPI Cards — staggered entrance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-fade-in">
        <KpiCard
          label="Fichas Técnicas"
          value={totalFichas}
          icon={BookOpen}
          trend={totalFichas > 0 ? `${totalFichas} ativas` : undefined}
          trendPositive={totalFichas > 0}
          subtitle="Produtos cadastrados"
        />
        <KpiCard
          label="Insumos"
          value={totalInsumos}
          icon={Package}
          trend={totalInsumos > 0 ? `${totalInsumos} itens` : undefined}
          trendPositive={totalInsumos > 0}
          subtitle="Itens cadastrados"
        />
        <KpiCard
          label="Promoções"
          value={promocoesAtivas}
          icon={Tag}
          trend={promocoesAtivas > 0 ? `${promocoesAtivas} ativas` : undefined}
          trendPositive={promocoesAtivas > 0}
          subtitle="Campanhas ativas"
        />
        <KpiCard
          label="Faturamento"
          value={faturamentoMes}
          formatter={formatBRL}
          icon={TrendingUp}
          trend={faturamentoMes > 0 ? `Lucro: ${formatBRL(lucroMes)}` : undefined}
          trendPositive={lucroMes >= 0}
          subtitle="Este mês"
        />
      </div>

      {/* Ember divider */}
      <div className="ember-line fade-up fade-up-d2" />

      {/* Chart + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 fade-up fade-up-d2">
        {/* Gráfico */}
        <div className="lg:col-span-2 card-interactive">
          <h3 className="text-sm font-semibold text-foreground mb-4">Faturamento vs Despesas — Últimos 6 meses</h3>
          {hasChartData ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={graficoMensal} barCategoryGap="20%">
                <XAxis dataKey="mes" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => formatBRL(value)}
                />
                <Bar dataKey="receita" name="Receita" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesa" name="Despesa" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
              <p>Registre receitas e despesas no módulo Financeiro para visualizar o gráfico.</p>
            </div>
          )}
        </div>

        {/* Alertas */}
        <div className="card-interactive space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle size={16} className="text-warning" /> Alertas
          </h3>

          {contasVencendo.length > 0 ? (
            <div className="space-y-2">
              {contasVencendo.map((c, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-sm bg-warning/5 border border-warning/20">
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-warning flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{c.descricao}</p>
                    <p className="text-[10px] text-muted-foreground">Vence {format(new Date(c.data_lancamento + "T00:00:00"), "dd/MM")}</p>
                  </div>
                  <span className="text-xs font-semibold text-warning whitespace-nowrap font-mono">{formatBRL(Number(c.valor))}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma conta vencendo nos próximos 3 dias. ✅</p>
          )}

          {cmvPct > cmvMeta && faturamentoMes > 0 && (
            <div className="flex items-start gap-3 p-2.5 rounded-sm bg-destructive/5 border border-destructive/20">
              <div className="mt-1.5 w-2 h-2 rounded-full bg-destructive flex-shrink-0" />
              <p className="text-xs font-medium text-destructive flex items-center gap-1">
                <DollarSign size={12} /> CMV acima da meta ({cmvPct.toFixed(1)}% vs {cmvMeta}%)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick shortcuts — staggered */}
      <div className="fade-up fade-up-d3">
        <h3 className="text-sm font-semibold text-foreground mb-3">Atalhos Rápidos</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-fade-in">
          {SHORTCUTS.map((s) => (
            <button
              key={s.path}
              onClick={() => navigate(s.path)}
              className="card-interactive !p-4 flex items-center gap-3 text-left group"
            >
              <div className="w-9 h-9 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <s.icon size={18} className={s.color} />
              </div>
              <span className="text-sm font-medium text-foreground">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
