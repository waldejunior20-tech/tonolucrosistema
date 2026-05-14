import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp, TrendingDown, AlertTriangle, Sparkles, ChefHat,
  Plus, Receipt, FileUp, Tag, ArrowRight, CheckCircle2,
  Flame, ShieldAlert, ClipboardList, Zap,
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

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
};

const T = {
  display: "font-heading font-bold text-[24px] md:text-[32px] leading-tight tracking-tight",
  headline: "font-heading font-semibold text-[20px] leading-tight",
  body: "font-sans font-normal text-[14px] leading-relaxed",
  label: "font-sans font-medium text-[12px] uppercase tracking-wider",
  mono: "font-mono font-medium text-[14px] tabular-nums",
  accent: "font-heading font-semibold text-[16px]",
};

// ─── Building blocks ─────────────────────────────────────────────────
function Section({ title, description, icon: Icon, tone = "primary", children, action }: {
  title: string; description?: string; icon?: any;
  tone?: "primary" | "success" | "destructive" | "warning";
  children: React.ReactNode; action?: React.ReactNode;
}) {
  const toneCls: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/10 text-warning",
  };
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-5 gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", toneCls[tone])}>
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
    <div className="bg-muted/30 border border-border rounded-lg p-4">
      <p className={cn(T.label, "text-muted-foreground mb-1.5")}>{label}</p>
      <p className={cn(T.mono, "text-[22px] font-bold leading-none", toneCls[tone])}>{value}</p>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [businessName, setBusinessName] = useState("");

  const { faturamentoMes, despesasMes, cmvPct, cmvMeta } = useDashboardData();
  const { data: priceAlerts = [] } = usePriceAlerts();
  const { data: profitAlerts = [] } = useProfitAlerts(20);

  // Fichas com preço — base para "prontos para promoção" e "engenharia"
  const { data: fichasPizza = [] } = useQuery({
    queryKey: ["dashboard-fichas-pizza-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fichas_tecnicas_pizza")
        .select("id, nome, preco_venda_p, preco_venda_m, preco_venda_g");
      return data ?? [];
    },
  });

  const { data: fichasProdutos = [] } = useQuery({
    queryKey: ["dashboard-fichas-produtos-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fichas_tecnicas_produtos")
        .select("id, nome, categoria, preco_venda");
      return data ?? [];
    },
  });

  const { data: warningsCount = 0 } = useQuery({
    queryKey: ["dashboard-fichas-warnings"],
    queryFn: async () => {
      const { count } = await supabase
        .from("fichas_tecnicas_warnings")
        .select("*", { count: "exact", head: true })
        .eq("resolvido", false);
      return count ?? 0;
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

  // Produtos que perderam margem (alertas com aumento de CMV)
  const perderamMargem = profitAlerts.filter((p) => p.delta_abs > 0);
  const produtosImpactadosPorAlerta = perderamMargem.slice(0, 3);

  // Saudação operacional
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
      partes.push(`${perderamMargem.length} produto${perderamMargem.length > 1 ? "s" : ""} perde${perderamMargem.length > 1 ? "ram" : "u"} margem esta semana`);
    } else if (priceAlerts.length > 0) {
      partes.push(`${priceAlerts.length} insumo${priceAlerts.length > 1 ? "s" : ""} subiu de preço`);
    }
    return partes.join(", mas ");
  })();

  // Engenharia do cardápio — métricas
  const fichasPizzaSemPreco = fichasPizza.filter((f: any) =>
    !f.preco_venda_p && !f.preco_venda_m && !f.preco_venda_g
  ).length;
  const fichasProdutosSemPreco = fichasProdutos.filter((f: any) => !f.preco_venda).length;
  const fichasIncompletas = fichasPizzaSemPreco + fichasProdutosSemPreco;
  const totalFichas = fichasPizza.length + fichasProdutos.length;
  const fichasMargemOk = Math.max(0, totalFichas - perderamMargem.length - fichasIncompletas);

  // Prontos para promoção — fichas com preço definido E sem alerta de margem
  const idsComAlerta = new Set(profitAlerts.map((p) => p.ficha_tecnica_id).filter(Boolean));

  const prontosPromocao = (() => {
    const items: { id: string; nome: string; categoria: string; preco: number }[] = [];
    for (const f of fichasPizza as any[]) {
      const preco = Number(f.preco_venda_m || f.preco_venda_g || f.preco_venda_p || 0);
      if (preco > 0 && !idsComAlerta.has(f.id)) {
        items.push({ id: f.id, nome: f.nome, categoria: "Pizza", preco });
      }
    }
    for (const f of fichasProdutos as any[]) {
      const preco = Number(f.preco_venda || 0);
      if (preco > 0 && !idsComAlerta.has(f.id)) {
        items.push({ id: f.id, nome: f.nome, categoria: f.categoria || "Produto", preco });
      }
    }
    return items.slice(0, 6);
  })();

  // Insumo mais crítico para o card "Radar de Lucro"
  const insumoCritico = priceAlerts[0];

  return (
    <div className="page-enter space-y-8 pb-12">

      {/* ─── 1. SAUDAÇÃO OPERACIONAL ─────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div className="min-w-0">
          <h1 className={cn(T.display, "text-foreground")}>
            {greeting()}{userName ? `, ${userName}` : ""}.
          </h1>
          <p className={cn(T.body, "text-muted-foreground mt-2 capitalize")}>
            <span className="lowercase">{dataHoje}</span>
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

      {/* ─── 6. AÇÕES RÁPIDAS (próximas da saudação para acesso rápido) */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn(T.label, "text-muted-foreground mr-1 flex items-center gap-1.5")}>
          <Zap size={14} /> Ações Rápidas
        </span>
        <QuickAction icon={Plus} label="Registrar Venda" primary onClick={() => navigate("/financeiro/caixa-diario")} />
        <QuickAction icon={ChefHat} label="Nova Ficha" onClick={() => navigate("/fichas/pizzas")} />
        <QuickAction icon={Tag} label="Atualizar Preço" onClick={() => navigate("/precificacao/pizzas")} />
        <QuickAction icon={Sparkles} label="Criar Promoção" onClick={() => navigate("/promocoes")} />
        <QuickAction icon={FileUp} label="Importar Nota Fiscal" onClick={() => navigate("/insumos/comprados")} />
      </div>

      {/* ─── 2. RADAR DE LUCRO ───────────────────────────────────── */}
      <Section
        title="Radar de Lucro"
        description="O que mexeu no seu lucro nesta semana."
        icon={Flame}
        tone="destructive"
      >
        {insumoCritico ? (
          <div className="space-y-5">
            {/* Card principal vivo */}
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                  <TrendingUp size={20} strokeWidth={2.4} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(T.label, "text-destructive mb-1")}>Insumo em alta</p>
                  <h4 className={cn(T.headline, "text-foreground mb-1")}>
                    {insumoCritico.nome} subiu {insumoCritico.variacaoPct.toFixed(1)}%
                  </h4>
                  <p className={cn(T.body, "text-muted-foreground")}>
                    De <span className={cn(T.mono, "font-semibold")}>{fmtBRL(insumoCritico.precoAnterior)}</span>
                    {" → "}
                    <span className={cn(T.mono, "font-semibold text-destructive")}>{fmtBRL(insumoCritico.precoAtual)}</span>
                    {" "}por {insumoCritico.unidade}
                  </p>
                </div>
              </div>

              {produtosImpactadosPorAlerta.length > 0 && (
                <div className="mt-5 pt-5 border-t border-destructive/20">
                  <p className={cn(T.label, "text-muted-foreground mb-3")}>
                    Produtos impactados ({produtosImpactadosPorAlerta.length})
                  </p>
                  <div className="space-y-2">
                    {produtosImpactadosPorAlerta.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-card border border-border">
                        <div className="min-w-0">
                          <p className={cn(T.accent, "text-[14px] truncate")}>{p.nome}</p>
                          <p className={cn(T.body, "text-[12px] text-muted-foreground")}>
                            CMV +{fmtBRL(p.delta_abs)}
                          </p>
                        </div>
                        <span className={cn(T.mono, "text-[13px] font-bold text-warning whitespace-nowrap")}>
                          Sugerido {fmtBRL(p.preco_sugerido)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => navigate("/precificacao/pizzas")}
                  className={cn(T.accent, "h-10 px-4 rounded-lg bg-primary text-primary-foreground text-[14px] hover:bg-primary/90 transition-colors")}
                >
                  Ajustar preços agora
                </button>
                <button
                  onClick={() => navigate("/insumos/comprados")}
                  className={cn(T.accent, "h-10 px-4 rounded-lg border border-border text-[14px] hover:bg-muted transition-colors")}
                >
                  Ver histórico do insumo
                </button>
              </div>
            </div>

            {priceAlerts.length > 1 && (
              <div className="space-y-2">
                {priceAlerts.slice(1, 4).map((a, i) => (
                  <InsightRow
                    key={i}
                    icon={TrendingUp}
                    tone="warning"
                    title={`${a.nome} +${a.variacaoPct.toFixed(1)}%`}
                    detail={`${fmtBRL(a.precoAnterior)} → ${fmtBRL(a.precoAtual)} / ${a.unidade}`}
                    onClick={() => navigate("/insumos/comprados")}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <EmptyHint
            icon={CheckCircle2}
            message="Nenhum insumo subiu acima do limite. Seu lucro está protegido por enquanto."
          />
        )}
      </Section>

      {/* ─── 3 & 4. PROMOÇÃO + RISCO (lado a lado) ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 3. Prontos para Promoção */}
        <Section
          title="Prontos para Promoção"
          description="Produtos com margem suficiente para campanha."
          icon={Sparkles}
          tone="success"
          action={prontosPromocao.length > 0 && (
            <button
              onClick={() => navigate("/promocoes")}
              className={cn(T.label, "text-primary hover:text-primary/80 transition-colors")}
            >
              Criar →
            </button>
          )}
        >
          {prontosPromocao.length ? (
            <div className="space-y-2">
              {prontosPromocao.map((p) => (
                <InsightRow
                  key={p.id}
                  icon={Sparkles}
                  tone="success"
                  title={p.nome}
                  detail={p.categoria}
                  value={fmtBRL(p.preco)}
                  onClick={() => navigate("/promocoes")}
                />
              ))}
            </div>
          ) : (
            <EmptyHint
              icon={Sparkles}
              message="Defina preços nas suas fichas técnicas para liberar produtos prontos para promoção."
            />
          )}
        </Section>

        {/* 4. Produtos em Risco */}
        <Section
          title="Produtos em Risco"
          description="Não devem entrar em promoção — precisam reajuste."
          icon={ShieldAlert}
          tone="destructive"
        >
          {perderamMargem.length ? (
            <div className="space-y-2">
              {perderamMargem.slice(0, 6).map((p) => (
                <InsightRow
                  key={p.id}
                  icon={TrendingDown}
                  tone="destructive"
                  title={p.nome}
                  detail={`CMV ${fmtBRL(p.cmv_anterior)} → ${fmtBRL(p.cmv_atual)}`}
                  value={fmtBRL(p.preco_sugerido)}
                  onClick={() => navigate("/automacao/alertas")}
                />
              ))}
            </div>
          ) : (
            <EmptyHint icon={CheckCircle2} message="Nenhum produto em risco. Margens estão saudáveis." />
          )}
        </Section>
      </div>

      {/* ─── 5. ENGENHARIA DO CARDÁPIO ───────────────────────────── */}
      <Section
        title="Engenharia do Cardápio"
        description="Saúde geral das suas fichas técnicas."
        icon={ClipboardList}
        tone="primary"
        action={
          <button
            onClick={() => navigate("/fichas/pizzas")}
            className={cn(T.label, "text-primary hover:text-primary/80 transition-colors")}
          >
            Abrir fichas →
          </button>
        }
      >
        {totalFichas > 0 ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MiniStat
                label="Fichas Incompletas"
                value={fichasIncompletas}
                tone={fichasIncompletas > 0 ? "warning" : "success"}
              />
              <MiniStat
                label="Preços Desatualizados"
                value={warningsCount}
                tone={warningsCount > 0 ? "warning" : "success"}
              />
              <MiniStat
                label="CMV Alto"
                value={perderamMargem.length}
                tone={perderamMargem.length > 0 ? "destructive" : "success"}
              />
              <MiniStat
                label="Margem Saudável"
                value={fichasMargemOk}
                tone="success"
              />
            </div>

            {hasFaturamento && (
              <div className="mt-5 flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30">
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  cmvOk ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                )}>
                  {cmvOk ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(T.accent, "text-[14px] text-foreground")}>
                    CMV operacional: {cmvPct.toFixed(1)}%
                  </p>
                  <p className={cn(T.body, "text-[12.5px] text-muted-foreground")}>
                    {cmvOk
                      ? `Dentro da meta de ${cmvMeta}%.`
                      : `Acima da meta de ${cmvMeta}% — revise os produtos em risco.`}
                  </p>
                </div>
                <button
                  onClick={() => navigate("/automacao/saude")}
                  className={cn(T.label, "text-primary hover:text-primary/80 transition-colors whitespace-nowrap")}
                >
                  Ver detalhes →
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyHint
            icon={ChefHat}
            message="Cadastre suas fichas técnicas para ver a saúde do cardápio."
          />
        )}
      </Section>

    </div>
  );
}
