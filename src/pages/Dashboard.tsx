import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Wallet, Trophy, AlertTriangle, Clock, TrendingUp, TrendingDown,
  Plus, ChefHat, Receipt, FileUp, Sparkles, Bell, ArrowRight,
  CheckCircle2, Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useProfitAlerts } from "@/hooks/useProfitAlerts";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
};

// ─── Typography classes (Plus Jakarta + Inter + JetBrains Mono) ──────
const T = {
  display: "font-heading font-bold text-[24px] md:text-[32px] leading-tight tracking-tight",
  headline: "font-heading font-semibold text-[20px] leading-tight",
  body: "font-sans font-normal text-[14px] leading-relaxed",
  label: "font-sans font-medium text-[12px] uppercase tracking-wider",
  mono: "font-mono font-medium text-[14px] tabular-nums",
  accent: "font-heading font-semibold text-[16px]",
};

// ─── KPI Card ────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  iconTone,
  label,
  value,
  hint,
  badge,
  badgeTone = "neutral",
  onClick,
}: {
  icon: any;
  iconTone: "primary" | "success" | "destructive" | "warning";
  label: string;
  value: string;
  hint?: string;
  badge?: string;
  badgeTone?: "neutral" | "success" | "destructive" | "warning";
  onClick?: () => void;
}) {
  const iconBg: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/10 text-warning",
  };
  const badgeCls: Record<string, string> = {
    neutral: "bg-muted text-muted-foreground",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/10 text-warning",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card border border-border rounded-xl p-6 shadow-sm transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        onClick && "cursor-pointer",
      )}
    >
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-4", iconBg[iconTone])}>
        <Icon size={20} strokeWidth={2.2} />
      </div>
      <p className={cn(T.label, "text-muted-foreground mb-2")}>{label}</p>
      <p className={cn(T.mono, "text-[24px] font-bold text-foreground leading-none mb-2")}>{value}</p>
      {hint && <p className={cn(T.body, "text-muted-foreground text-[13px]")}>{hint}</p>}
      {badge && (
        <span className={cn("inline-flex mt-3 items-center gap-1 px-2 py-0.5 rounded-md", T.label, "text-[11px]", badgeCls[badgeTone])}>
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── Quick Action ────────────────────────────────────────────────────
function QuickAction({ icon: Icon, label, onClick, primary = false }: {
  icon: any; label: string; onClick: () => void; primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 h-11 px-4 rounded-lg border transition-all",
        T.accent,
        primary
          ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-sm"
          : "bg-card text-foreground border-border hover:bg-muted hover:border-primary/40",
      )}
    >
      <Icon size={16} strokeWidth={2.4} />
      <span>{label}</span>
    </button>
  );
}

// ─── Insight List Item ───────────────────────────────────────────────
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
        "w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card text-left transition-all",
        onClick && "hover:border-primary/40 hover:bg-muted/50 cursor-pointer",
      )}
    >
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", toneCls[tone])}>
        <Icon size={15} strokeWidth={2.4} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(T.accent, "text-[14px] text-foreground truncate")}>{title}</p>
        {detail && <p className={cn(T.body, "text-[12.5px] text-muted-foreground truncate")}>{detail}</p>}
      </div>
      {value && <span className={cn(T.mono, "text-[13px] font-bold text-foreground whitespace-nowrap")}>{value}</span>}
      {onClick && <ArrowRight size={14} className="text-muted-foreground/60 shrink-0" />}
    </Wrapper>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────
function EmptyHint({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center gap-2">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <Icon size={18} className="text-muted-foreground/60" />
      </div>
      <p className={cn(T.body, "text-muted-foreground text-[13px] max-w-[260px]")}>{message}</p>
    </div>
  );
}

// ─── Section Card ────────────────────────────────────────────────────
function Section({ title, description, icon: Icon, children, action }: {
  title: string; description?: string; icon?: any;
  children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-5 gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon size={18} strokeWidth={2.2} />
            </div>
          )}
          <div className="min-w-0">
            <h3 className={cn(T.headline, "text-foreground")}>{title}</h3>
            {description && <p className={cn(T.body, "text-muted-foreground mt-0.5 text-[13px]")}>{description}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [businessName, setBusinessName] = useState("");

  const {
    faturamentoMes, despesasMes, cmvPct, cmvMeta, contasVencendo, comparativos,
  } = useDashboardData();

  const { data: priceAlerts = [] } = usePriceAlerts();
  const { data: profitAlerts = [] } = useProfitAlerts(5);

  // Últimos lançamentos (read-only sobre tabela existente)
  const { data: ultimosLancamentos = [] } = useQuery({
    queryKey: ["dashboard-ultimos-lancamentos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lancamentos_financeiros")
        .select("id, descricao, valor, tipo, categoria, data_lancamento, created_at")
        .order("created_at", { ascending: false })
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
  const caixaStatus = lucroMes > 0 ? "positivo" : lucroMes < 0 ? "negativo" : "zerado";
  const caixaColor = lucroMes > 0 ? "text-success" : lucroMes < 0 ? "text-destructive" : "text-muted-foreground";

  const cmvOk = cmvPct <= cmvMeta;
  const hasFaturamento = faturamentoMes > 0;

  const topProfitAlert = profitAlerts[0];
  const topPriceAlert = priceAlerts[0];

  return (
    <div className="page-enter space-y-8 pb-12">

      {/* ─── WELCOME ─────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className={cn(T.display, "text-foreground")}>
            {greeting()}{userName ? `, ${userName}` : ""} <span className="inline-block">👋</span>
          </h1>
          <p className={cn(T.body, "text-muted-foreground mt-2 capitalize")}>
            Hoje é {dataHoje}.{" "}
            {hasFaturamento ? (
              <>Seu caixa do mês está <span className={cn(caixaColor, "font-semibold")}>{fmtBRL(Math.abs(lucroMes))} {caixaStatus}</span>.</>
            ) : (
              <>Registre suas vendas para acompanhar o caixa em tempo real.</>
            )}
          </p>
        </div>
        {businessName && (
          <span className={cn(T.label, "px-3 py-1.5 rounded-md bg-muted text-muted-foreground")}>
            {businessName}
          </span>
        )}
      </header>

      {/* ─── ONBOARDING ──────────────────────────────────────────── */}
      <OnboardingChecklist />

      {/* ─── KPI CARDS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <KpiCard
          icon={Wallet}
          iconTone={lucroMes >= 0 ? "success" : "destructive"}
          label="Caixa do Mês"
          value={hasFaturamento ? fmtBRL(lucroMes) : "—"}
          hint={hasFaturamento
            ? `Faturamento ${fmtBRL(faturamentoMes)} · Despesas ${fmtBRL(despesasMes)}`
            : "Sem lançamentos este mês"}
          badge={comparativos.lucro !== null
            ? `${comparativos.lucro > 0 ? "+" : ""}${comparativos.lucro.toFixed(1)}% vs mês anterior`
            : "Sem base de comparação"}
          badgeTone={comparativos.lucro && comparativos.lucro > 0 ? "success" : comparativos.lucro && comparativos.lucro < 0 ? "destructive" : "neutral"}
          onClick={() => navigate("/financeiro/dre")}
        />

        <KpiCard
          icon={Trophy}
          iconTone="primary"
          label="Top Produto"
          value={topProfitAlert ? topProfitAlert.nome : "—"}
          hint={topProfitAlert
            ? `Sugestão de preço ${fmtBRL(topProfitAlert.preco_sugerido)} · CMV ${fmtBRL(topProfitAlert.cmv_atual)}`
            : "Cadastre fichas técnicas para ver os mais rentáveis"}
          badge={topProfitAlert ? topProfitAlert.tipo_ficha : undefined}
          badgeTone="neutral"
          onClick={() => navigate("/precificacao/pizzas")}
        />

        <KpiCard
          icon={AlertTriangle}
          iconTone={topPriceAlert ? "destructive" : "success"}
          label="Alerta de Custo"
          value={topPriceAlert
            ? `${topPriceAlert.nome} +${topPriceAlert.variacaoPct.toFixed(1)}%`
            : "Tudo estável"}
          hint={topPriceAlert
            ? `${fmtBRL(topPriceAlert.precoAnterior)} → ${fmtBRL(topPriceAlert.precoAtual)} / ${topPriceAlert.unidade}`
            : "Nenhum insumo subiu acima do limite"}
          badge={topPriceAlert ? `${priceAlerts.length} insumo${priceAlerts.length > 1 ? "s" : ""} afetado${priceAlerts.length > 1 ? "s" : ""}` : undefined}
          badgeTone="destructive"
          onClick={() => navigate("/insumos/comprados")}
        />

        <KpiCard
          icon={Clock}
          iconTone={cmvOk ? "success" : "warning"}
          label="Saúde do CMV"
          value={hasFaturamento ? fmtPct(cmvPct) : "—"}
          hint={hasFaturamento
            ? cmvOk ? `Dentro da meta de ${cmvMeta}%` : `Acima da meta de ${cmvMeta}% — revise preços`
            : "Sem dados suficientes ainda"}
          badge={hasFaturamento ? (cmvOk ? "Saudável" : "Atenção") : undefined}
          badgeTone={cmvOk ? "success" : "warning"}
          onClick={() => navigate("/automacao/saude")}
        />
      </div>

      {/* ─── QUICK ACTIONS ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn(T.label, "text-muted-foreground mr-1")}>Ações Rápidas</span>
        <QuickAction icon={Plus} label="Registrar Venda" primary onClick={() => navigate("/financeiro/caixa-diario")} />
        <QuickAction icon={ChefHat} label="Nova Ficha Técnica" onClick={() => navigate("/fichas/pizzas")} />
        <QuickAction icon={Receipt} label="Lançar Despesa" onClick={() => navigate("/financeiro/contas-a-pagar")} />
        <QuickAction icon={FileUp} label="Importar Nota Fiscal" onClick={() => navigate("/insumos/comprados")} />
      </div>

      {/* ─── INSIGHT GRID ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Radar de Lucro — large */}
        <div className="lg:col-span-2">
          <Section
            title="Radar de Lucro"
            description="Insights gerados a partir das suas fichas, vendas e compras."
            icon={Sparkles}
          >
            {profitAlerts.length || priceAlerts.length ? (
              <div className="space-y-2.5">
                {priceAlerts.slice(0, 3).map((a, i) => (
                  <InsightRow
                    key={`pa-${i}`}
                    icon={TrendingUp}
                    tone="destructive"
                    title={`${a.nome} subiu ${a.variacaoPct.toFixed(1)}%`}
                    detail={`Custo unitário ${fmtBRL(a.precoAnterior)} → ${fmtBRL(a.precoAtual)} / ${a.unidade}`}
                    onClick={() => navigate("/insumos/comprados")}
                  />
                ))}
                {profitAlerts.slice(0, 3).map((p) => (
                  <InsightRow
                    key={`pf-${p.id}`}
                    icon={TrendingDown}
                    tone="warning"
                    title={`${p.nome} perdeu margem`}
                    detail={`CMV passou de ${fmtBRL(p.cmv_anterior)} para ${fmtBRL(p.cmv_atual)} · Preço sugerido ${fmtBRL(p.preco_sugerido)}`}
                    onClick={() => navigate("/automacao/alertas")}
                  />
                ))}
              </div>
            ) : (
              <EmptyHint
                icon={Sparkles}
                message="Cadastre fichas técnicas, vendas e compras para ativar insights inteligentes."
              />
            )}
          </Section>
        </div>

        {/* Central de Alertas */}
        <Section
          title="Central de Alertas"
          icon={Bell}
          description={`${priceAlerts.length + contasVencendo.length} pendência${priceAlerts.length + contasVencendo.length === 1 ? "" : "s"}`}
        >
          {priceAlerts.length || contasVencendo.length || (hasFaturamento && !cmvOk) ? (
            <div className="space-y-2.5">
              {!cmvOk && hasFaturamento && (
                <InsightRow
                  icon={AlertTriangle}
                  tone="destructive"
                  title="CMV acima da meta"
                  detail={`${fmtPct(cmvPct)} vs meta ${cmvMeta}%`}
                  onClick={() => navigate("/financeiro/dre")}
                />
              )}
              {priceAlerts.slice(0, 2).map((a, i) => (
                <InsightRow
                  key={`alert-price-${i}`}
                  icon={TrendingUp}
                  tone="warning"
                  title={`${a.nome} subiu`}
                  detail={`+${a.variacaoPct.toFixed(1)}% no custo`}
                  onClick={() => navigate("/insumos/comprados")}
                />
              ))}
              {contasVencendo.slice(0, 2).map((c, i) => (
                <InsightRow
                  key={`alert-conta-${i}`}
                  icon={Receipt}
                  tone="warning"
                  title={c.descricao}
                  detail={`Vence ${format(new Date(c.data_lancamento + "T00:00:00"), "dd/MM")}`}
                  value={fmtBRL(Number(c.valor))}
                  onClick={() => navigate("/financeiro/contas-a-pagar")}
                />
              ))}
            </div>
          ) : (
            <EmptyHint icon={CheckCircle2} message="Tudo em dia. Nenhum alerta no momento." />
          )}
        </Section>
      </div>

      {/* ─── PROMOTIONS / RISK ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section
          title="Prontos para Promoção"
          description="Produtos com margem suficiente para uma campanha."
          icon={Sparkles}
        >
          <EmptyHint
            icon={Sparkles}
            message="Em breve: sugestões automáticas de promoção a partir das suas fichas técnicas com maior margem."
          />
        </Section>

        <Section
          title="Produtos em Risco"
          description="Itens com margem baixa, CMV alto ou preço desatualizado."
          icon={AlertTriangle}
        >
          {profitAlerts.length ? (
            <div className="space-y-2.5">
              {profitAlerts.slice(0, 4).map((p) => (
                <InsightRow
                  key={`risk-${p.id}`}
                  icon={TrendingDown}
                  tone="destructive"
                  title={p.nome}
                  detail={`CMV +${fmtBRL(p.delta_abs)} · Preço sugerido ${fmtBRL(p.preco_sugerido)}`}
                  onClick={() => navigate("/automacao/alertas")}
                />
              ))}
            </div>
          ) : (
            <EmptyHint icon={CheckCircle2} message="Nenhum produto em risco identificado." />
          )}
        </Section>
      </div>

      {/* ─── ÚLTIMOS LANÇAMENTOS ────────────────────────────────── */}
      <Section
        title="Últimos Lançamentos"
        description="Movimentações recentes do caixa."
        icon={Activity}
        action={
          <button
            onClick={() => navigate("/financeiro/caixa-diario")}
            className={cn(T.label, "text-primary hover:text-primary/80 transition-colors")}
          >
            Ver tudo →
          </button>
        }
      >
        {ultimosLancamentos.length ? (
          <div className="divide-y divide-border">
            {ultimosLancamentos.map((l: any) => {
              const isReceita = l.tipo === "receita";
              return (
                <div key={l.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                    isReceita ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                  )}>
                    {isReceita ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(T.accent, "text-[14px] text-foreground truncate")}>{l.descricao || "Sem descrição"}</p>
                    <p className={cn(T.body, "text-[12px] text-muted-foreground")}>
                      {format(new Date(l.data_lancamento + "T00:00:00"), "dd/MM/yyyy")}
                      {l.categoria && <span className="ml-2 px-1.5 py-0.5 rounded bg-muted text-[11px] uppercase tracking-wider">{l.categoria}</span>}
                    </p>
                  </div>
                  <span className={cn(
                    T.mono, "text-[14px] font-bold whitespace-nowrap",
                    isReceita ? "text-success" : "text-destructive",
                  )}>
                    {isReceita ? "+" : "−"} {fmtBRL(Math.abs(Number(l.valor)))}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyHint icon={Activity} message="Nenhum lançamento ainda. Registre uma venda ou despesa para começar." />
        )}
      </Section>

    </div>
  );
}
