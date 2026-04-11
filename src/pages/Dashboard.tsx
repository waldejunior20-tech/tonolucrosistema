import { BookOpen, Package, Tag, TrendingUp, ArrowUpRight, ArrowDownRight, AlertTriangle, DollarSign } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { HealthStatus } from "@/components/HealthStatus";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format } from "date-fns";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Dashboard() {
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

  const lucroMes = faturamentoMes - despesasMes;
  const cmvStatus: "healthy" | "warning" | "danger" =
    cmvPct === 0 ? "healthy" : cmvPct <= cmvMeta ? "healthy" : cmvPct <= cmvMeta + 5 ? "warning" : "danger";

  const kpis = [
    {
      label: "Fichas Técnicas",
      value: String(totalFichas),
      sub: "Produtos cadastrados",
      icon: BookOpen,
      trend: totalFichas > 0 ? `${totalFichas} ativas` : "Nenhuma",
      positive: totalFichas > 0,
    },
    {
      label: "Insumos",
      value: String(totalInsumos),
      sub: "Itens cadastrados",
      icon: Package,
      trend: totalInsumos > 0 ? `${totalInsumos} itens` : "Nenhum",
      positive: totalInsumos > 0,
    },
    {
      label: "Promoções Ativas",
      value: String(promocoesAtivas),
      sub: "Campanhas ativas",
      icon: Tag,
      trend: promocoesAtivas > 0 ? `${promocoesAtivas} ativas` : "Nenhuma",
      positive: promocoesAtivas > 0,
    },
    {
      label: "Faturamento",
      value: formatBRL(faturamentoMes),
      sub: "Este mês",
      icon: TrendingUp,
      trend: faturamentoMes > 0 ? `Lucro: ${formatBRL(lucroMes)}` : "Sem lançamentos",
      positive: lucroMes >= 0,
    },
  ];

  const hasChartData = graficoMensal.some((m) => m.receita > 0 || m.despesa > 0);

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-foreground">Bem-vindo de volta 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">Aqui está o resumo do seu negócio.</p>
      </div>

      {/* Health Status - CMV */}
      {faturamentoMes > 0 && (
        <HealthStatus
          status={cmvStatus}
          label={`CMV: ${cmvPct.toFixed(1)}% — Meta: ${cmvMeta}%`}
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((card) => (
          <div key={card.label} className="card-premium group cursor-default">
            <div className="flex items-start justify-between mb-4">
              <p className="label-upper">{card.label}</p>
              <span className={`${card.positive ? "trend-positive" : "trend-negative"} flex items-center gap-1`}>
                {card.trend}
                {card.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              </span>
            </div>
            <p className="kpi-number text-foreground mb-1">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico */}
        <div className="lg:col-span-2 card-premium">
          <h3 className="text-sm font-semibold text-foreground mb-4">Faturamento vs Despesas — Últimos 6 meses</h3>
          {hasChartData ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={graficoMensal} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
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
            <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
              <p>Registre receitas e despesas no módulo Financeiro para visualizar o gráfico.</p>
            </div>
          )}
        </div>

        {/* Alertas */}
        <div className="card-premium space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle size={16} className="text-warning" /> Alertas
          </h3>

          {contasVencendo.length > 0 ? (
            <div className="space-y-2">
              {contasVencendo.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-warning/5 border border-warning/20">
                  <div>
                    <p className="text-xs font-medium text-foreground">{c.descricao}</p>
                    <p className="text-[10px] text-muted-foreground">Vence {format(new Date(c.data_lancamento + "T00:00:00"), "dd/MM")}</p>
                  </div>
                  <span className="text-xs font-semibold text-warning">{formatBRL(Number(c.valor))}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma conta vencendo nos próximos 3 dias. ✅</p>
          )}

          {cmvPct > cmvMeta && faturamentoMes > 0 && (
            <div className="p-2 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="text-xs font-medium text-destructive flex items-center gap-1">
                <DollarSign size={12} /> CMV acima da meta ({cmvPct.toFixed(1)}% vs {cmvMeta}%)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
