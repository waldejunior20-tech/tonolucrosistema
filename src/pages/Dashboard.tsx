import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import {
  Wallet, Pizza, AlertTriangle, Clock, Plus, FileText, Receipt,
  TrendingUp, TrendingDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

// ─── KPI Card ────────────────────────────────────────────────
function KpiCard({
  label, icon: Icon, children, accent = "primary",
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
  accent?: "primary" | "success" | "warning" | "danger" | "muted";
}) {
  const accentMap = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    danger: "text-destructive bg-destructive/10",
    muted: "text-muted-foreground bg-muted",
  };
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentMap[accent]}`}>
          <Icon size={16} />
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Quick Action Button ────────────────────────────────────
function QuickAction({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-light transition-colors shadow-sm"
      style={{ background: "hsl(var(--primary))" }}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const { faturamentoMes, despesasMes, comparativos } = useDashboardData();
  const { data: priceAlerts = [] } = usePriceAlerts();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles").select("business_name").eq("id", user.id).single()
          .then(({ data }) => { if (data?.business_name) setBusinessName(data.business_name); });
      }
    });
  }, []);

  // Caixa hoje
  const today = new Date();
  const yest = subDays(today, 1);
  const { data: caixaHoje = { hoje: 0, ontem: 0 } } = useQuery({
    queryKey: ["dash-caixa-hoje"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lancamentos_financeiros")
        .select("tipo, valor, data_lancamento")
        .gte("data_lancamento", format(startOfDay(yest), "yyyy-MM-dd"))
        .lte("data_lancamento", format(endOfDay(today), "yyyy-MM-dd"));
      const hoje = (data ?? []).filter((l) => l.tipo === "receita" && l.data_lancamento === format(today, "yyyy-MM-dd"))
        .reduce((s, l) => s + Number(l.valor), 0);
      const ontem = (data ?? []).filter((l) => l.tipo === "receita" && l.data_lancamento === format(yest, "yyyy-MM-dd"))
        .reduce((s, l) => s + Number(l.valor), 0);
      return { hoje, ontem };
    },
  });

  const caixaVar = caixaHoje.ontem > 0
    ? ((caixaHoje.hoje - caixaHoje.ontem) / caixaHoje.ontem) * 100
    : null;

  // Top pizza (mais lucrativa)
  const { data: topPizzas = [] } = useQuery({
    queryKey: ["dash-top-pizzas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fichas_tecnicas_pizza")
        .select("nome, custo_total, preco_sugerido")
        .order("preco_sugerido", { ascending: false, nullsFirst: false })
        .limit(5);
      return (data ?? []).map((p: any) => {
        const preco = Number(p.preco_sugerido || 0);
        const custo = Number(p.custo_total || 0);
        const lucro = preco - custo;
        const margem = preco > 0 ? (lucro / preco) * 100 : 0;
        return { nome: p.nome, lucro, margem, preco };
      }).sort((a, b) => b.lucro - a.lucro);
    },
  });

  const topPizza = topPizzas[0];

  // Alerta de custo (top 1)
  const topAlerta = priceAlerts[0];

  // Evolução de custos — últimos 30 dias (3 insumos top)
  const { data: chartData = { points: [], insumos: [] } } = useQuery({
    queryKey: ["dash-evolucao-custos"],
    queryFn: async () => {
      const inicio = subDays(today, 29).toISOString();
      const { data } = await supabase
        .from("historico_precos_insumos")
        .select("nome_insumo, preco_novo, created_at")
        .gte("created_at", inicio)
        .order("created_at");
      const rows = data ?? [];
      // pega 3 insumos com mais variações
      const counts: Record<string, number> = {};
      rows.forEach((r: any) => { counts[r.nome_insumo] = (counts[r.nome_insumo] || 0) + 1; });
      const insumos = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n);
      const byDate: Record<string, any> = {};
      rows.forEach((r: any) => {
        if (!insumos.includes(r.nome_insumo)) return;
        const d = format(new Date(r.created_at), "dd/MM");
        if (!byDate[d]) byDate[d] = { data: d };
        byDate[d][r.nome_insumo] = Number(r.preco_novo);
      });
      return { points: Object.values(byDate), insumos };
    },
  });

  const points = chartData.points;
  const insumos = chartData.insumos;
  const lineColors = ["hsl(var(--primary))", "hsl(var(--warning))", "hsl(var(--success))"];

  // Últimos lançamentos
  const { data: ultimosLanc = [] } = useQuery({
    queryKey: ["dash-ultimos-lancamentos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lancamentos_financeiros")
        .select("descricao, valor, tipo, data_lancamento, pago, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  return (
    <div className="page-enter space-y-6">
      {/* HEADER */}
      <div className="fade-up">
        <h1 className="font-display">{getGreeting()}{businessName ? `, ${businessName}` : ""} 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hoje é {format(today, "dd 'de' MMMM 'de' yyyy")}.
          {caixaHoje.hoje > 0 && <> Seu caixa está <span className="text-success font-semibold">{formatBRL(caixaHoje.hoje)}</span> positivo.</>}
        </p>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-fade-in">
        <KpiCard label="Caixa Hoje" icon={Wallet} accent="primary">
          <div className="font-display text-2xl font-bold tabular text-foreground">
            {formatBRL(caixaHoje.hoje)}
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
            {caixaVar !== null ? (
              <>
                <span className={`inline-flex items-center gap-1 font-semibold ${caixaVar >= 0 ? "text-success" : "text-destructive"}`}>
                  {caixaVar >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {formatPct(caixaVar)}
                </span>
                <span>vs ontem</span>
              </>
            ) : (
              <span>sem base de comparação</span>
            )}
          </div>
        </KpiCard>

        <KpiCard label="Top Pizza" icon={Pizza} accent="success">
          {topPizza ? (
            <>
              <div className="font-display text-lg font-bold text-foreground truncate">{topPizza.nome}</div>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  lucro <span className="text-foreground font-semibold tabular">{formatBRL(topPizza.lucro)}</span>
                </span>
                <span className="status-profit text-[11px]">{topPizza.margem.toFixed(0)}% margem</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground leading-snug">
                Cadastre sua primeira ficha técnica para ver o lucro por pizza.
              </p>
              <button
                onClick={() => navigate("/fichas/pizzas")}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-light"
              >
                <Plus size={12} /> Criar Ficha
              </button>
            </>
          )}
        </KpiCard>

        <KpiCard label="Alerta de Custo" icon={AlertTriangle} accent="warning">
          {topAlerta ? (
            <>
              <div className="font-display text-lg font-bold text-foreground truncate">{topAlerta.nome}</div>
              <div className="mt-1.5 text-xs flex items-center gap-1.5">
                <span className="text-warning font-semibold inline-flex items-center gap-1">
                  <TrendingUp size={12} /> +{topAlerta.variacaoPct.toFixed(1)}%
                </span>
                <span className="text-muted-foreground">recente</span>
              </div>
            </>
          ) : (
            <>
              <div className="font-display text-lg font-bold text-muted-foreground">Sem alertas</div>
              <div className="mt-1.5 text-xs text-muted-foreground">Custos estáveis</div>
            </>
          )}
        </KpiCard>

        <KpiCard label="Hora do Fechamento" icon={Clock} accent="muted">
          <div className="font-display text-2xl font-bold tabular text-foreground">23:00</div>
          <div className="mt-1.5 text-xs text-muted-foreground">caixa aberto</div>
        </KpiCard>
      </div>

      {/* QUICK ACTIONS */}
      <div className="fade-up fade-up-d2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Ações rápidas</p>
        <div className="flex flex-wrap gap-3">
          <QuickAction icon={Plus} label="Registrar Venda" onClick={() => navigate("/financeiro/caixa-diario")} />
          <QuickAction icon={FileText} label="Nova Ficha Técnica" onClick={() => navigate("/fichas/pizzas")} />
          <QuickAction icon={Receipt} label="Lançar Despesa" onClick={() => navigate("/financeiro/contas-a-pagar")} />
        </div>
      </div>

      {/* MIDDLE ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 fade-up fade-up-d3">
        {/* Top pizzas ranking */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display">Pizzas mais lucrativas</h3>
            <span className="text-xs text-muted-foreground">este mês</span>
          </div>
          {topPizzas.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Pizza size={26} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Nenhuma ficha cadastrada ainda</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                  Crie sua primeira ficha técnica e descubra o lucro real de cada pizza.
                </p>
              </div>
              <button
                onClick={() => navigate("/fichas/pizzas")}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-light transition-colors"
              >
                <Plus size={14} /> Criar Ficha Técnica
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {topPizzas.map((p, i) => {
                const max = topPizzas[0].lucro || 1;
                const pct = (p.lucro / max) * 100;
                const medal = ["🥇", "🥈", "🥉"][i];
                return (
                  <div key={p.nome} className="flex items-center gap-3">
                    <div className="w-6 text-center text-sm font-semibold text-muted-foreground">
                      {medal ?? i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground truncate">{p.nome}</span>
                        <span className="text-sm font-semibold tabular text-foreground shrink-0">{formatBRL(p.lucro)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground tabular w-10 text-right">
                      {p.margem.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Evolução de custos */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display">Evolução de custos</h3>
            <span className="text-xs text-muted-foreground">últimos 30 dias</span>
          </div>
          {points.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Sem histórico de preços ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={points} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="data" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8, fontSize: 12,
                  }}
                  formatter={(v: any) => formatBRL(Number(v))}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {insumos.map((nome, i) => (
                  <Line
                    key={nome}
                    type="monotone"
                    dataKey={nome}
                    stroke={lineColors[i % lineColors.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ÚLTIMOS LANÇAMENTOS */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden fade-up fade-up-d4">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display">Últimos lançamentos</h3>
          <button
            onClick={() => navigate("/financeiro/caixa-diario")}
            className="text-xs font-semibold text-primary hover:text-primary-light"
          >
            Ver tudo →
          </button>
        </div>
        {ultimosLanc.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Nenhum lançamento ainda.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">Data</th>
                <th className="text-left">Descrição</th>
                <th className="text-right">Valor</th>
                <th className="text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {ultimosLanc.map((l: any, i: number) => {
                const isReceita = l.tipo === "receita";
                return (
                  <tr key={i}>
                    <td className="text-muted-foreground tabular text-xs">
                      {format(new Date(l.data_lancamento + "T00:00:00"), "dd/MM")}
                    </td>
                    <td className="font-medium text-foreground">{l.descricao || "—"}</td>
                    <td className={`text-right tabular font-semibold ${isReceita ? "text-success" : "text-foreground"}`}>
                      {isReceita ? "+" : "−"} {formatBRL(Number(l.valor))}
                    </td>
                    <td className="text-right">
                      <span className={l.pago || isReceita ? "status-profit" : "status-warning"}>
                        {l.pago || isReceita ? "✓ Pago" : "⏳ Pendente"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
