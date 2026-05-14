import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp, TrendingDown, AlertTriangle, Sparkles, ChefHat,
  Plus, FileUp, Tag, ArrowRight, CheckCircle2,
  Flame, ShieldAlert, ClipboardList, Zap, Trophy, Activity, Receipt,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useProfitAlerts } from "@/hooks/useProfitAlerts";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
};

const T = {
  display: "font-heading font-bold text-[24px] md:text-[32px] leading-tight tracking-tight",
  headline: "font-heading font-semibold text-[18px] leading-tight",
  body: "font-sans font-normal text-[14px] leading-relaxed",
  label: "font-sans font-medium text-[11px] uppercase tracking-wider",
  mono: "font-mono font-medium tabular-nums",
  accent: "font-heading font-semibold text-[14px]",
};

// ─── Bento card shell ────────────────────────────────────────────────
function Bento({
  className, title, description, icon: Icon, tone = "primary", action, children,
}: {
  className?: string;
  title?: string; description?: string; icon?: any;
  tone?: "primary" | "success" | "destructive" | "warning";
  action?: React.ReactNode; children: React.ReactNode;
}) {
  const toneCls: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/10 text-warning",
  };
  return (
    <div className={cn("bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col min-w-0", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {Icon && (
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", toneCls[tone])}>
                <Icon size={17} strokeWidth={2.2} />
              </div>
            )}
            <div className="min-w-0">
              {title && <h3 className={cn(T.headline, "text-foreground truncate")}>{title}</h3>}
              {description && <p className={cn(T.body, "text-muted-foreground mt-0.5 text-[12.5px]")}>{description}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      <div className="flex-1 min-w-0 min-h-0">{children}</div>
    </div>
  );
}

function InsightRow({ icon: Icon, tone, title, detail, value, onClick }: {
  icon: any; tone: "success" | "destructive" | "warning" | "primary";
  title: string; detail?: string; value?: string; onClick?: () => void;
}) {
  const toneCls: Record<string, string> = {
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/10 text-warning",
    primary: "bg-primary/10 text-primary",
  };
  const Wrapper: any = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card text-left transition-all",
        onClick && "hover:border-primary/40 hover:bg-muted/50 cursor-pointer",
      )}
    >
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", toneCls[tone])}>
        <Icon size={14} strokeWidth={2.4} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(T.accent, "text-[13.5px] text-foreground truncate")}>{title}</p>
        {detail && <p className={cn(T.body, "text-[12px] text-muted-foreground truncate")}>{detail}</p>}
      </div>
      {value && <span className={cn(T.mono, "text-[12.5px] font-bold text-foreground whitespace-nowrap")}>{value}</span>}
      {onClick && <ArrowRight size={13} className="text-muted-foreground/60 shrink-0" />}
    </Wrapper>
  );
}

function EmptyHint({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center py-6 px-2 text-center gap-2">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <Icon size={18} className="text-muted-foreground/60" />
      </div>
      <p className={cn(T.body, "text-muted-foreground text-[12.5px] max-w-[240px]")}>{message}</p>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick, primary = false }: {
  icon: any; label: string; onClick: () => void; primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 h-10 px-3.5 rounded-lg border transition-all text-[13.5px]",
        T.accent,
        primary
          ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-sm"
          : "bg-card text-foreground border-border hover:bg-muted hover:border-primary/40",
      )}
    >
      <Icon size={15} strokeWidth={2.4} />
      <span>{label}</span>
    </button>
  );
}

function MiniStat({ label, value, tone = "primary" }: {
  label: string; value: string | number;
  tone?: "primary" | "success" | "destructive" | "warning";
}) {
  const toneCls: Record<string, string> = {
    primary: "text-primary",
    success: "text-success",
    destructive: "text-destructive",
    warning: "text-warning",
  };
  return (
    <div className="bg-muted/30 border border-border rounded-lg p-3">
      <p className={cn(T.label, "text-muted-foreground mb-1")}>{label}</p>
      <p className={cn(T.mono, "text-[20px] font-bold leading-none", toneCls[tone])}>{value}</p>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [businessName, setBusinessName] = useState("");

  const {
    faturamentoMes, despesasMes, cmvPct, cmvMeta, graficoMensal, comparativos,
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

  const { data: warningsCount = 0 } = useQuery({
    queryKey: ["dashboard-fichas-warnings"],
    queryFn: async () => {
      const { count } = await supabase.from("fichas_tecnicas_warnings")
        .select("*", { count: "exact", head: true }).eq("resolvido", false);
      return count ?? 0;
    },
  });

  const { data: ultimasVendas = [] } = useQuery({
    queryKey: ["dashboard-ultimas-vendas"],
    queryFn: async () => {
      const { data } = await supabase.from("lancamentos_financeiros")
        .select("id, descricao, valor, data_lancamento, categoria")
        .eq("tipo", "receita")
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
      const first = fullName.trim().split(/\s+/)[0] || (user.email ? user.email.split("@")[0] : "");
      if (first) setUserName(first.charAt(0).toUpperCase() + first.slice(1));
      supabase.from("profiles").select("business_name").eq("id", user.id).single()
        .then(({ data }) => { if (data?.business_name) setBusinessName(data.business_name); });
    });
  }, []);

  const lucroMes = faturamentoMes - despesasMes;
  const dataHoje = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  const caixaPositivo = lucroMes > 0;
  const caixaNegativo = lucroMes < 0;
  const hasFaturamento = faturamentoMes > 0;
  const cmvOk = cmvPct <= cmvMeta;

  const perderamMargem = profitAlerts.filter((p) => p.delta_abs > 0);
  const produtosImpactadosPorAlerta = perderamMargem.slice(0, 3);

  const saudacao = (() => {
    const partes: string[] = [];
    if (hasFaturamento) {
      if (caixaPositivo) partes.push(`Seu caixa do mês está positivo em ${fmtBRL(lucroMes)}`);
      else if (caixaNegativo) partes.push(`Seu caixa do mês está negativo em ${fmtBRL(Math.abs(lucroMes))}`);
      else partes.push("Seu caixa do mês está zerado");
    } else {
      partes.push("Registre suas vendas para acompanhar o caixa");
    }
    if (perderamMargem.length > 0) {
      partes.push(`${perderamMargem.length} produto${perderamMargem.length > 1 ? "s" : ""} perde${perderamMargem.length > 1 ? "ram" : "u"} margem`);
    } else if (priceAlerts.length > 0) {
      partes.push(`${priceAlerts.length} insumo${priceAlerts.length > 1 ? "s" : ""} subiu de preço`);
    }
    return partes.join(", mas ");
  })();

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
    return items.slice(0, 5);
  })();

  // Top produto = produto com maior preço entre os "prontos para promoção"
  const topProduto = prontosPromocao.length
    ? [...prontosPromocao].sort((a, b) => b.preco - a.preco)[0]
    : null;

  const insumoCritico = priceAlerts[0];
  const varFat = comparativos?.faturamento;

  // Status do sistema — score qualitativo
  const sistemaScore = (() => {
    let pontos = 0; let total = 4;
    if (totalFichas > 0) pontos++;
    if (fichasIncompletas === 0 && totalFichas > 0) pontos++;
    if (warningsCount === 0) pontos++;
    if (cmvOk && hasFaturamento) pontos++;
    return { pontos, total };
  })();
  const sistemaTone = sistemaScore.pontos === sistemaScore.total
    ? "success" : sistemaScore.pontos >= 2 ? "warning" : "destructive";

  return (
    <div className="page-enter space-y-6 pb-12">

      {/* Saudação operacional */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div className="min-w-0">
          <h1 className={cn(T.display, "text-foreground")}>
            {greeting()}{userName ? `, ${userName}` : ""}.
          </h1>
          <p className={cn(T.body, "text-muted-foreground mt-2")}>
            <span className="capitalize-first lowercase">{dataHoje}</span>
            <span className="mx-2">·</span>
            <span className={cn(
              "font-semibold",
              caixaPositivo && "text-success",
              caixaNegativo && "text-destructive",
              perderamMargem.length > 0 && !caixaNegativo && "text-warning",
            )}>
              {saudacao}.
            </span>
          </p>
        </div>
        {businessName && (
          <span className={cn(T.label, "px-3 py-1.5 rounded-md bg-muted text-muted-foreground shrink-0")}>
            {businessName}
          </span>
        )}
      </header>

      <OnboardingChecklist />

      {/* ─── BENTO GRID ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 auto-rows-[minmax(120px,auto)] gap-4">

        {/* Caixa do Mês — destaque com gráfico mini (8 col, 2 row) */}
        <Bento
          className="md:col-span-6 lg:col-span-8 lg:row-span-2"
          title="Caixa do Mês"
          description="Receita - despesas no período."
          icon={Activity}
          tone={caixaPositivo ? "success" : caixaNegativo ? "destructive" : "primary"}
          action={
            <button
              onClick={() => navigate("/financeiro/caixa-diario")}
              className={cn(T.label, "text-primary hover:text-primary/80")}
            >
              Caixa diário →
            </button>
          }
        >
          <div className="flex flex-col h-full">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <p className={cn(T.label, "text-muted-foreground mb-1.5")}>Resultado</p>
                <p className={cn(
                  T.mono, "text-[36px] md:text-[44px] font-bold leading-none",
                  caixaPositivo ? "text-success" : caixaNegativo ? "text-destructive" : "text-foreground",
                )}>
                  {fmtBRL(lucroMes)}
                </p>
                <div className="flex items-center gap-3 mt-3 text-[12.5px]">
                  <span className="text-muted-foreground">
                    Receita <span className={cn(T.mono, "font-bold text-foreground")}>{fmtBRL(faturamentoMes)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Despesas <span className={cn(T.mono, "font-bold text-foreground")}>{fmtBRL(despesasMes)}</span>
                  </span>
                </div>
              </div>
              {varFat !== null && varFat !== undefined && (
                <div className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold",
                  varFat >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                )}>
                  {varFat >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {Math.abs(varFat).toFixed(1)}% vs mês anterior
                </div>
              )}
            </div>

            {/* Mini chart */}
            <div className="mt-4 flex-1 min-h-[120px]">
              {graficoMensal && graficoMensal.some((m) => m.receita > 0 || m.despesa > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={graficoMensal} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="receita" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#rev)" />
                    <Area type="monotone" dataKey="despesa" stroke="hsl(var(--destructive))" strokeWidth={2} fill="url(#exp)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyHint icon={Activity} message="Sem histórico ainda. Registre vendas e despesas para ver a curva." />
              )}
            </div>
          </div>
        </Bento>

        {/* Saúde do CMV (4 col, 2 row) */}
        <Bento
          className="md:col-span-6 lg:col-span-4 lg:row-span-2"
          title="Saúde do CMV"
          description="Custo da Mercadoria Vendida."
          icon={cmvOk ? CheckCircle2 : AlertTriangle}
          tone={cmvOk ? "success" : "destructive"}
        >
          {hasFaturamento ? (
            <div className="flex flex-col h-full justify-between gap-4">
              <div>
                <p className={cn(T.label, "text-muted-foreground mb-1.5")}>CMV operacional</p>
                <p className={cn(
                  T.mono, "text-[44px] font-bold leading-none",
                  cmvOk ? "text-success" : "text-destructive",
                )}>
                  {cmvPct.toFixed(1)}%
                </p>
                <p className={cn(T.body, "text-[12.5px] text-muted-foreground mt-2")}>
                  Meta: <span className={cn(T.mono, "font-bold text-foreground")}>{cmvMeta}%</span>
                </p>
              </div>

              {/* Barra de progresso */}
              <div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full transition-all", cmvOk ? "bg-success" : "bg-destructive")}
                    style={{ width: `${Math.min(100, (cmvPct / Math.max(cmvMeta, 1)) * 100)}%` }}
                  />
                </div>
                <p className={cn(T.body, "text-[12px] text-muted-foreground mt-2.5")}>
                  {cmvOk
                    ? "Dentro da meta. Margem protegida."
                    : `${(cmvPct - cmvMeta).toFixed(1)} pp acima da meta — revise produtos em risco.`}
                </p>
              </div>

              <button
                onClick={() => navigate("/automacao/saude")}
                className={cn(T.label, "text-primary hover:text-primary/80 self-start")}
              >
                Ver detalhes →
              </button>
            </div>
          ) : (
            <EmptyHint icon={Activity} message="Registre vendas e despesas para calcular o CMV." />
          )}
        </Bento>

        {/* Radar de Lucro (8 col, 2 row) */}
        <Bento
          className="md:col-span-6 lg:col-span-8 lg:row-span-2"
          title="Radar de Lucro"
          description="O que mexeu no seu lucro nesta semana."
          icon={Flame}
          tone="destructive"
        >
          {insumoCritico ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                    <TrendingUp size={18} strokeWidth={2.4} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(T.label, "text-destructive mb-0.5")}>Insumo em alta</p>
                    <h4 className={cn(T.headline, "text-foreground mb-0.5")}>
                      {insumoCritico.nome} subiu {insumoCritico.variacaoPct.toFixed(1)}%
                    </h4>
                    <p className={cn(T.body, "text-[13px] text-muted-foreground")}>
                      <span className={cn(T.mono, "font-semibold")}>{fmtBRL(insumoCritico.precoAnterior)}</span>
                      {" → "}
                      <span className={cn(T.mono, "font-semibold text-destructive")}>{fmtBRL(insumoCritico.precoAtual)}</span>
                      {" "}/{insumoCritico.unidade}
                    </p>
                  </div>
                </div>

                {produtosImpactadosPorAlerta.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-destructive/20 space-y-1.5">
                    <p className={cn(T.label, "text-muted-foreground mb-2")}>
                      Impactados ({produtosImpactadosPorAlerta.length})
                    </p>
                    {produtosImpactadosPorAlerta.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-card border border-border">
                        <div className="min-w-0">
                          <p className={cn(T.accent, "text-[13px] truncate")}>{p.nome}</p>
                          <p className={cn(T.body, "text-[11.5px] text-muted-foreground")}>
                            CMV +{fmtBRL(p.delta_abs)}
                          </p>
                        </div>
                        <span className={cn(T.mono, "text-[12.5px] font-bold text-warning whitespace-nowrap")}>
                          Sug. {fmtBRL(p.preco_sugerido)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate("/precificacao/pizzas")}
                    className={cn(T.accent, "h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-[13px] hover:bg-primary/90")}
                  >
                    Ajustar preços
                  </button>
                  <button
                    onClick={() => navigate("/insumos/comprados")}
                    className={cn(T.accent, "h-9 px-3.5 rounded-lg border border-border text-[13px] hover:bg-muted")}
                  >
                    Histórico do insumo
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <EmptyHint icon={CheckCircle2} message="Nenhum insumo subiu acima do limite. Lucro protegido." />
          )}
        </Bento>

        {/* Top Produto (4 col, 1 row) */}
        <Bento
          className="md:col-span-3 lg:col-span-4"
          title="Top Produto"
          description="Maior preço pronto para campanha."
          icon={Trophy}
          tone="warning"
        >
          {topProduto ? (
            <button
              onClick={() => navigate("/promocoes")}
              className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/40 transition-all"
            >
              <div className="min-w-0">
                <p className={cn(T.accent, "text-[14px] truncate")}>{topProduto.nome}</p>
                <p className={cn(T.body, "text-[12px] text-muted-foreground")}>{topProduto.categoria}</p>
              </div>
              <span className={cn(T.mono, "text-[18px] font-bold text-success whitespace-nowrap")}>
                {fmtBRL(topProduto.preco)}
              </span>
            </button>
          ) : (
            <EmptyHint icon={Trophy} message="Sem produtos prontos ainda." />
          )}
        </Bento>

        {/* Status do Sistema (4 col, 1 row) */}
        <Bento
          className="md:col-span-3 lg:col-span-4"
          title="Status do Sistema"
          description="Saúde geral da operação."
          icon={Activity}
          tone={sistemaTone as any}
        >
          <div className="flex items-center gap-4 h-full">
            <div className="relative w-16 h-16 shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15" fill="none" strokeWidth="3" strokeLinecap="round"
                  stroke={`hsl(var(--${sistemaTone}))`}
                  strokeDasharray={`${(sistemaScore.pontos / sistemaScore.total) * 94.2} 94.2`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn(T.mono, "text-[15px] font-bold")}>{sistemaScore.pontos}/{sistemaScore.total}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-1 text-[12.5px]">
              <p className="flex items-center gap-1.5">
                {totalFichas > 0 ? <CheckCircle2 size={12} className="text-success" /> : <AlertTriangle size={12} className="text-warning" />}
                Fichas cadastradas
              </p>
              <p className="flex items-center gap-1.5">
                {fichasIncompletas === 0 && totalFichas > 0 ? <CheckCircle2 size={12} className="text-success" /> : <AlertTriangle size={12} className="text-warning" />}
                Preços completos
              </p>
              <p className="flex items-center gap-1.5">
                {warningsCount === 0 ? <CheckCircle2 size={12} className="text-success" /> : <AlertTriangle size={12} className="text-warning" />}
                Sem alertas pendentes
              </p>
              <p className="flex items-center gap-1.5">
                {cmvOk && hasFaturamento ? <CheckCircle2 size={12} className="text-success" /> : <AlertTriangle size={12} className="text-warning" />}
                CMV na meta
              </p>
            </div>
          </div>
        </Bento>

        {/* Prontos para Promoção (6 col) */}
        <Bento
          className="md:col-span-6 lg:col-span-6"
          title="Prontos para Promoção"
          description="Margem suficiente para campanha."
          icon={Sparkles}
          tone="success"
          action={prontosPromocao.length > 0 && (
            <button onClick={() => navigate("/promocoes")} className={cn(T.label, "text-primary hover:text-primary/80")}>
              Criar →
            </button>
          )}
        >
          {prontosPromocao.length ? (
            <div className="space-y-2">
              {prontosPromocao.map((p) => (
                <InsightRow
                  key={p.id} icon={Sparkles} tone="success"
                  title={p.nome} detail={p.categoria}
                  value={fmtBRL(p.preco)}
                  onClick={() => navigate("/promocoes")}
                />
              ))}
            </div>
          ) : (
            <EmptyHint icon={Sparkles} message="Defina preços nas fichas para liberar produtos prontos." />
          )}
        </Bento>

        {/* Produtos em Risco (6 col) */}
        <Bento
          className="md:col-span-6 lg:col-span-6"
          title="Produtos em Risco"
          description="Não devem entrar em promoção."
          icon={ShieldAlert}
          tone="destructive"
        >
          {perderamMargem.length ? (
            <div className="space-y-2">
              {perderamMargem.slice(0, 5).map((p) => (
                <InsightRow
                  key={p.id} icon={TrendingDown} tone="destructive"
                  title={p.nome}
                  detail={`CMV ${fmtBRL(p.cmv_anterior)} → ${fmtBRL(p.cmv_atual)}`}
                  value={fmtBRL(p.preco_sugerido)}
                  onClick={() => navigate("/automacao/alertas")}
                />
              ))}
            </div>
          ) : (
            <EmptyHint icon={CheckCircle2} message="Nenhum produto em risco. Margens saudáveis." />
          )}
        </Bento>

        {/* Engenharia do Cardápio (8 col) */}
        <Bento
          className="md:col-span-6 lg:col-span-8"
          title="Engenharia do Cardápio"
          description="Saúde geral das fichas técnicas."
          icon={ClipboardList}
          tone="primary"
          action={
            <button onClick={() => navigate("/fichas/pizzas")} className={cn(T.label, "text-primary hover:text-primary/80")}>
              Abrir fichas →
            </button>
          }
        >
          {totalFichas > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MiniStat label="Incompletas" value={fichasIncompletas} tone={fichasIncompletas > 0 ? "warning" : "success"} />
              <MiniStat label="Desatualizados" value={warningsCount} tone={warningsCount > 0 ? "warning" : "success"} />
              <MiniStat label="CMV Alto" value={perderamMargem.length} tone={perderamMargem.length > 0 ? "destructive" : "success"} />
              <MiniStat label="Margem OK" value={fichasMargemOk} tone="success" />
            </div>
          ) : (
            <EmptyHint icon={ChefHat} message="Cadastre suas fichas técnicas para ver a saúde do cardápio." />
          )}
        </Bento>

        {/* Últimas Vendas (4 col) */}
        <Bento
          className="md:col-span-6 lg:col-span-4"
          title="Últimas Vendas"
          description="Receitas mais recentes."
          icon={Receipt}
          tone="success"
          action={
            <button onClick={() => navigate("/financeiro/caixa-diario")} className={cn(T.label, "text-primary hover:text-primary/80")}>
              Ver tudo →
            </button>
          }
        >
          {ultimasVendas.length ? (
            <div className="space-y-1.5">
              {ultimasVendas.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-md border border-border bg-muted/20">
                  <div className="min-w-0 flex-1">
                    <p className={cn(T.accent, "text-[12.5px] truncate")}>
                      {v.descricao || v.categoria || "Venda"}
                    </p>
                    <p className={cn(T.body, "text-[11px] text-muted-foreground")}>
                      {format(new Date(v.data_lancamento), "dd/MM", { locale: ptBR })}
                    </p>
                  </div>
                  <span className={cn(T.mono, "text-[12.5px] font-bold text-success whitespace-nowrap")}>
                    {fmtBRL(Number(v.valor))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyHint icon={Receipt} message="Nenhuma venda registrada ainda." />
          )}
        </Bento>

        {/* Ações Rápidas (full width) */}
        <Bento className="md:col-span-6 lg:col-span-12" tone="primary">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={cn(T.label, "text-muted-foreground mr-1 flex items-center gap-1.5")}>
              <Zap size={13} /> Ações Rápidas
            </span>
            <QuickAction icon={Plus} label="Registrar Venda" primary onClick={() => navigate("/financeiro/caixa-diario")} />
            <QuickAction icon={ChefHat} label="Nova Ficha" onClick={() => navigate("/fichas/pizzas")} />
            <QuickAction icon={Tag} label="Atualizar Preço" onClick={() => navigate("/precificacao/pizzas")} />
            <QuickAction icon={Sparkles} label="Criar Promoção" onClick={() => navigate("/promocoes")} />
            <QuickAction icon={FileUp} label="Importar Nota Fiscal" onClick={() => navigate("/insumos/comprados")} />
          </div>
        </Bento>

      </div>
    </div>
  );
}
