import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChefHat, ShieldCheck, AlertTriangle, ArrowRight, Plus, FileUp, Tag,
  TrendingUp, TrendingDown, Sparkles, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Wallet, Activity, Receipt, ShieldAlert, Bell, Eye, EyeOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useProfitAlerts } from "@/hooks/useProfitAlerts";
import { cn } from "@/lib/utils";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
};

type Tone = "success" | "warning" | "danger" | "primary";

const toneBg: Record<Tone, string> = {
  success: "bg-[#ECFDF5] text-[#059669]",
  warning: "bg-[#FFFBEB] text-[#D97706]",
  danger: "bg-[#FEF2F2] text-[#DC2626]",
  primary: "bg-[#EFF6FF] text-[#2563EB]",
};

const toneBadge: Record<Tone, string> = {
  success: "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]",
  warning: "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]",
  danger: "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
  primary: "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]",
};

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px] font-semibold uppercase tracking-wider",
      toneBadge[tone],
    )}>{children}</span>
  );
}

export function MobileDashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [showSaldo, setShowSaldo] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("dashboard-show-saldo") !== "0";
  });
  const toggleSaldo = () => {
    setShowSaldo((v) => {
      const next = !v;
      try { localStorage.setItem("dashboard-show-saldo", next ? "1" : "0"); } catch {}
      return next;
    });
  };
  const mask = "R$ ••••••";

  const { faturamentoMes, despesasMes, contasVencendo, contasPagar7Dias } = useDashboardData();
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

  const { data: warnings = [] } = useQuery({
    queryKey: ["dashboard-fichas-warnings-list"],
    queryFn: async () => {
      const { data } = await supabase.from("fichas_tecnicas_warnings")
        .select("id, motivo, tipo_ficha, created_at, resolvido")
        .eq("resolvido", false)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  // Última compra registrada
  const { data: ultimaCompra } = useQuery({
    queryKey: ["dashboard-ultima-compra"],
    queryFn: async () => {
      const { data } = await supabase.from("insumos_comprados")
        .select("nome, preco_pago, fornecedor, data_compra")
        .order("data_compra", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const meta: any = user.user_metadata || {};
      const fullName = meta.full_name || meta.name || meta.nome || "";
      let first = fullName.trim().split(/\s+/)[0] || (user.email ? user.email.split("@")[0] : "");
      first = first.replace(/[_\d]+$/g, "");
      if (first) setUserName(first.charAt(0).toUpperCase() + first.slice(1));
      supabase.from("profiles").select("business_name").eq("id", user.id).single()
        .then(({ data }) => { if (data?.business_name) setBusinessName(data.business_name); });
    });
  }, []);

  const lucroMes = faturamentoMes - despesasMes;
  const caixaPositivo = lucroMes > 0;
  const caixaNegativo = lucroMes < 0;
  const hasFaturamento = faturamentoMes > 0 || despesasMes > 0;

  const fichasPizzaSemPreco = fichasPizza.filter((f: any) =>
    !f.preco_venda_p && !f.preco_venda_m && !f.preco_venda_g
  ).length;
  const fichasProdutosSemPreco = fichasProdutos.filter((f: any) => !f.preco_venda).length;
  const fichasIncompletas = fichasPizzaSemPreco + fichasProdutosSemPreco;
  const totalFichas = fichasPizza.length + fichasProdutos.length;
  const perderamMargem = profitAlerts.filter((p) => p.delta_abs > 0);
  const fichasMargemOk = Math.max(0, totalFichas - perderamMargem.length - fichasIncompletas);
  const precosRevisar = fichasIncompletas + warnings.length + priceAlerts.length;

  const cardapioTone: Tone =
    perderamMargem.length > 0 ? "danger"
    : precosRevisar > 0 ? "warning"
    : "success";
  const cardapioLabel =
    cardapioTone === "danger" ? "Crítico"
    : cardapioTone === "warning" ? "Atenção"
    : "Protegido";

  const finanTone: Tone =
    !hasFaturamento ? "warning" : caixaNegativo ? "danger" : "success";
  const finanLabel =
    !hasFaturamento ? "Sem dados" : caixaNegativo ? "Negativo" : "Positivo";

  // Smart feed
  type FeedItem = {
    id: string; icon: any; title: string; message: string;
    tone: Tone; time?: string; onClick: () => void;
  };
  const feed: FeedItem[] = [];

  for (const p of priceAlerts.slice(0, 2)) {
    feed.push({
      id: `price-${p.nome}`,
      icon: TrendingUp,
      title: `${p.nome} subiu ${p.variacaoPct.toFixed(1)}%`,
      message: "Insumo em alta nesta semana.",
      tone: p.variacaoPct >= 10 ? "danger" : "warning",
      onClick: () => navigate("/insumos/comprados"),
    });
  }
  for (const p of perderamMargem.slice(0, 2)) {
    feed.push({
      id: `profit-${p.id}`,
      icon: TrendingDown,
      title: `${p.nome} perdeu margem`,
      message: `CMV subiu ${fmtBRL(p.delta_abs)}.`,
      tone: "danger",
      onClick: () => navigate("/automacao/alertas"),
    });
  }
  for (const w of warnings.slice(0, 2) as any[]) {
    feed.push({
      id: `warn-${w.id}`,
      icon: AlertTriangle,
      title: w.tipo_ficha === "pizza" ? "Ficha de pizza incompleta" : "Ficha incompleta",
      message: "Complete para liberar o cálculo de margem.",
      tone: "warning",
      time: w.created_at ? formatDistanceToNow(new Date(w.created_at), { locale: ptBR, addSuffix: true }) : undefined,
      onClick: () => navigate("/fichas/pizzas"),
    });
  }
  if (feed.length === 0) {
    feed.push({
      id: "ok",
      icon: CheckCircle2,
      title: "Tudo sob controle",
      message: "Nenhum alerta ativo no momento.",
      tone: "success",
      onClick: () => navigate("/automacao/alertas"),
    });
  }

  const notifCount = priceAlerts.length + perderamMargem.length + warnings.length;

  return (
    <div className="page-enter -m-4 pb-6 bg-[#F1F5F9] min-h-[calc(100vh-4rem)]">
      {/* HERO AZUL — gradiente + saudação + caixa do mês gigante */}
      <div
        className="relative px-5 pt-6 pb-20 text-white overflow-hidden"
        style={{
          background:
            "radial-gradient(120% 80% at 100% 0%, #60A5FA 0%, transparent 55%)," +
            "radial-gradient(100% 90% at 0% 100%, #1E3A8A 0%, transparent 60%)," +
            "linear-gradient(135deg, #2563EB 0%, #1D4ED8 55%, #1E40AF 100%)",
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        {/* Brilhos decorativos */}
        <div
          aria-hidden
          className="absolute -top-16 -right-10 w-56 h-56 rounded-full opacity-30 blur-2xl"
          style={{ background: "radial-gradient(circle, #93C5FD 0%, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-20 blur-2xl"
          style={{ background: "radial-gradient(circle, #BFDBFE 0%, transparent 70%)" }}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-white/80">{greeting()},</p>
            <h1 className="font-heading text-[22px] font-bold leading-tight mt-0.5 truncate">
              {userName || "Bem-vindo"}
            </h1>
            {businessName && (
              <p className="text-[12px] text-white/70 mt-0.5 truncate">{businessName}</p>
            )}
          </div>
          <button
            onClick={() => navigate("/automacao/alertas")}
            aria-label="Notificações"
            className="relative w-11 h-11 rounded-full bg-white/15 backdrop-blur flex items-center justify-center active:scale-95 transition-transform shrink-0 ring-1 ring-white/20"
          >
            <Bell size={20} strokeWidth={2.2} />
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#1D4ED8]">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </button>
        </div>

        {/* Caixa do mês — número GIGANTE com olhinho */}
        <div className="relative mt-7">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <p className="text-[11.5px] font-semibold uppercase tracking-wider text-white/70">
                Caixa do mês
              </p>
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur",
                !hasFaturamento ? "bg-white/15 text-white/80" :
                caixaNegativo ? "bg-[#DC2626]/90 text-white" :
                "bg-[#10B981]/90 text-white",
              )}>
                <Wallet size={10} />{finanLabel}
              </span>
            </div>
            <button
              onClick={toggleSaldo}
              aria-label={showSaldo ? "Ocultar saldo" : "Mostrar saldo"}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-95 transition"
            >
              {showSaldo ? <Eye size={15} className="text-white" /> : <EyeOff size={15} className="text-white" />}
            </button>
          </div>
          <p className={cn(
            "leading-none transition-all num-depth-light",
            showSaldo ? "text-[34px]" : "text-[26px] tracking-widest",
          )}>
            {!hasFaturamento ? "—" : showSaldo ? fmtBRL(lucroMes) : mask}
          </p>
          {(() => {
            const maxVal = Math.max(faturamentoMes, despesasMes, 1);
            const entradaPct = Math.min(100, (faturamentoMes / maxVal) * 100);
            const saidaPct = Math.min(100, (despesasMes / maxVal) * 100);
            return (
              <div className="mt-5 space-y-2.5">
                <div className="rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/15 px-3.5 py-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
                        <ArrowUpRight size={14} className="text-[#86EFAC]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[12.5px] font-semibold text-white">Entrada</span>
                    </div>
                    <span className="font-mono text-[13px] font-bold text-white">{showSaldo ? fmtBRL(faturamentoMes) : "•••••"}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${entradaPct}%`, background: "linear-gradient(90deg, #34D399 0%, #10B981 100%)" }} />
                  </div>
                </div>
                <div className="rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/15 px-3.5 py-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
                        <ArrowDownRight size={14} className="text-[#FCA5A5]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[12.5px] font-semibold text-white">Saída</span>
                    </div>
                    <span className="font-mono text-[13px] font-bold text-white">{showSaldo ? fmtBRL(despesasMes) : "•••••"}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${saidaPct}%`, background: "linear-gradient(90deg, #FB923C 0%, #EF4444 100%)" }} />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Card branco sobreposto — tira a sensação de esmagado */}
      <div className="px-4 -mt-12 relative z-10">

      {/* INSIGHTS — carrossel deslizável horizontal */}
      {(() => {
        type Insight = {
          key: string;
          tag: string;
          tagBg: string;
          tagFg: string;
          icon: any;
          accent: string; // hex for left bar / glow
          gradient: string; // bg gradient
          title: string;
          subtitle: string;
          metric?: string;
          metricColor?: string;
          cta: string;
          onClick: () => void;
        };
        const insights: Insight[] = [];

        // 1) Top pra promoção (até 3 pizzas com maior preço)
        const topPromos = [...fichasPizza]
          .filter((f: any) => f.preco_venda_g || f.preco_venda_m || f.preco_venda_p)
          .sort((a: any, b: any) =>
            (b.preco_venda_g || b.preco_venda_m || b.preco_venda_p || 0) -
            (a.preco_venda_g || a.preco_venda_m || a.preco_venda_p || 0)
          )
          .slice(0, 3) as any[];
        topPromos.forEach((p, i) => {
          insights.push({
            key: `promo-${p.id}`,
            tag: i === 0 ? "Top promoção" : "Boa pra promo",
            tagBg: "bg-[#ECFDF5]",
            tagFg: "text-[#059669]",
            icon: Sparkles,
            accent: "#10B981",
            gradient: "linear-gradient(135deg, #ffffff 0%, #F0FDF4 100%)",
            title: p.nome,
            subtitle: "Margem favorável agora",
            metric: fmtBRL(p.preco_venda_g || p.preco_venda_m || p.preco_venda_p),
            metricColor: "text-[#0F172A]",
            cta: "Criar promoção",
            onClick: () => navigate("/promocoes"),
          });
        });

        // 2) Contas a vencer em 7 dias — agregado com nomes + total
        if (contasVencendo && contasVencendo.length > 0) {
          const total = contasVencendo.reduce((s: number, c: any) => s + Number(c.valor || 0), 0);
          const nomes = contasVencendo.slice(0, 2).map((c: any) => c.descricao).filter(Boolean).join(" • ");
          insights.push({
            key: "vencer",
            tag: "Vence em 7 dias",
            tagBg: "bg-[#FFFBEB]",
            tagFg: "text-[#D97706]",
            icon: Receipt,
            accent: "#F59E0B",
            gradient: "linear-gradient(135deg, #ffffff 0%, #FFFBEB 100%)",
            title: `${contasVencendo.length} ${contasVencendo.length === 1 ? "conta" : "contas"} a pagar`,
            subtitle: nomes || "Despesas próximas do vencimento",
            metric: fmtBRL(total),
            metricColor: "text-[#D97706]",
            cta: "Ver contas",
            onClick: () => navigate("/financeiro/contas-pagar"),
          });
        }

        // 3) Contas a pagar nos últimos 7 dias
        if (contasPagar7Dias && contasPagar7Dias.length > 0) {
          const total = contasPagar7Dias.reduce((s: number, c: any) => s + Number(c.valor || 0), 0);
          const nomes = contasPagar7Dias.slice(0, 2).map((c: any) => c.descricao).filter(Boolean).join(" • ");
          insights.push({
            key: "pagar-7d",
            tag: "A pagar",
            tagBg: "bg-[#FEF2F2]",
            tagFg: "text-[#DC2626]",
            icon: Receipt,
            accent: "#DC2626",
            gradient: "linear-gradient(135deg, #ffffff 0%, #FEF2F2 100%)",
            title: `${contasPagar7Dias.length} ${contasPagar7Dias.length === 1 ? "conta" : "contas"} a pagar`,
            subtitle: nomes || "Despesas pendentes nos últimos 7 dias",
            metric: fmtBRL(total),
            metricColor: "text-[#DC2626]",
            cta: "Quitar agora",
            onClick: () => navigate("/financeiro/contas-pagar"),
          });
        }

        // 4) Produtos que subiram o preço — um card por alerta (até 4)
        priceAlerts.slice(0, 4).forEach((p) => {
          insights.push({
            key: `alta-${p.nome}`,
            tag: "Subiu de preço",
            tagBg: "bg-[#FEF2F2]",
            tagFg: "text-[#DC2626]",
            icon: TrendingUp,
            accent: "#DC2626",
            gradient: "linear-gradient(135deg, #ffffff 0%, #FEF2F2 100%)",
            title: p.nome,
            subtitle: `De ${fmtBRL(p.precoAnterior)} para ${fmtBRL(p.precoAtual)}`,
            metric: `+${p.variacaoPct.toFixed(1)}%`,
            metricColor: "text-[#DC2626]",
            cta: "Ver insumo",
            onClick: () => navigate("/insumos/comprados"),
          });
        });

        // 4) Última compra (sempre por último)
        if (ultimaCompra) {
          insights.push({
            key: "ultima",
            tag: "Última compra",
            tagBg: "bg-[#EFF6FF]",
            tagFg: "text-[#2563EB]",
            icon: Receipt,
            accent: "#2563EB",
            gradient: "linear-gradient(135deg, #ffffff 0%, #EFF6FF 100%)",
            title: ultimaCompra.nome,
            subtitle: ultimaCompra.fornecedor || (ultimaCompra.data_compra ? format(new Date(ultimaCompra.data_compra), "dd/MM/yyyy") : "Recente"),
            metric: ultimaCompra.preco_pago != null ? fmtBRL(Number(ultimaCompra.preco_pago)) : undefined,
            metricColor: "text-[#0F172A]",
            cta: "Ver histórico",
            onClick: () => navigate("/insumos/historico-compras"),
          });
        }

        // Fallback
        if (insights.length === 0) {
          insights.push({
            key: "ok",
            tag: "Tudo certo",
            tagBg: "bg-[#ECFDF5]",
            tagFg: "text-[#059669]",
            icon: ShieldCheck,
            accent: "#10B981",
            gradient: "linear-gradient(135deg, #ffffff 0%, #F0FDF4 100%)",
            title: "Cardápio protegido",
            subtitle: "Nenhum alerta agora",
            cta: "Ver Radar de Lucro",
            onClick: () => navigate("/automacao/saude"),
          });
        }

        return (
          <div className="mb-4 -mx-4">
            <div className="flex items-center justify-between px-5 mb-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                Para você agora
              </p>
              <span className="text-[10.5px] text-[#94A3B8] font-medium">deslize →</span>
            </div>
            <div
              className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-3 [&::-webkit-scrollbar]:hidden"
              style={{ paddingLeft: 16, paddingRight: 16, scrollPaddingLeft: 16 }}
            >
              {insights.map((it) => {
                const Icon = it.icon;
                return (
                  <button
                    key={it.key}
                    onClick={it.onClick}
                    className="snap-start shrink-0 w-[82%] text-left rounded-2xl border border-[#E6EAF0] p-4 active:scale-[0.99] transition-transform shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_-14px_rgba(15,23,42,0.18)] relative overflow-hidden"
                    style={{ background: it.gradient }}
                  >
                    {/* accent bar */}
                    <span
                      aria-hidden
                      className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full"
                      style={{ background: it.accent }}
                    />
                    {/* glow */}
                    <span
                      aria-hidden
                      className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full opacity-20 blur-2xl pointer-events-none"
                      style={{ background: it.accent }}
                    />
                    <div className="relative flex items-start justify-between gap-2 mb-3">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", it.tagBg, it.tagFg)}>
                        {it.tag}
                      </span>
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", it.tagBg)}>
                        <Icon size={17} className={it.tagFg} strokeWidth={2.4} />
                      </div>
                    </div>
                    <h3 className="relative font-heading text-[15.5px] font-bold text-[#0F172A] leading-tight line-clamp-1">
                      {it.title}
                    </h3>
                    <p className="relative text-[11.5px] text-[#64748B] mt-0.5 line-clamp-1">{it.subtitle}</p>
                    {it.metric && (
                      <p className={cn("relative font-mono text-[22px] font-bold leading-none mt-3", it.metricColor)}>
                        {it.metric}
                      </p>
                    )}
                    <div className="relative flex items-center gap-1 text-[#2563EB] font-semibold text-[12px] mt-3">
                      <span>{it.cta}</span>
                      <ArrowRight size={13} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* CAIXA DIÁRIO — atalho enxuto (números já estão no hero) */}
      <button
        onClick={() => navigate("/financeiro/caixa-diario")}
        className="w-full text-left rounded-2xl border border-[#E6EAF0] bg-white p-4 mb-4 active:scale-[0.99] transition-transform shadow-sm flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
            <Wallet size={18} strokeWidth={2.4} />
          </div>
          <div>
            <p className="font-semibold text-[14px] text-[#0F172A] leading-tight">Caixa diário</p>
            <p className="text-[11.5px] text-[#64748B] mt-0.5">
              {caixaNegativo ? "Revise despesas hoje" : "Lançamentos e fechamentos"}
            </p>
          </div>
        </div>
        <ArrowRight size={16} className="text-[#94A3B8]" />
      </button>

      {/* QUICK ACTIONS — 2x2 */}
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-2 px-1">
        Ações rápidas
      </p>
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <button
          onClick={() => navigate("/financeiro/caixa-diario")}
          className="rounded-2xl p-4 text-left bg-[linear-gradient(180deg,#3B82F6_0%,#2563EB_100%)] text-white active:scale-[0.97] transition-transform shadow-[0_8px_20px_-8px_rgba(37,99,235,0.55)] min-h-[88px]"
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-2">
            <Plus size={18} strokeWidth={2.5} />
          </div>
          <p className="font-semibold text-[14px] leading-tight">Registrar venda</p>
        </button>
        <button
          onClick={() => navigate("/insumos/comprados")}
          className="rounded-2xl p-4 text-left bg-white border border-[#E6EAF0] active:scale-[0.97] transition-transform min-h-[88px]"
        >
          <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mb-2">
            <FileUp size={18} strokeWidth={2.4} />
          </div>
          <p className="font-semibold text-[14px] leading-tight text-[#0F172A]">Importar nota</p>
        </button>
        <button
          onClick={() => navigate("/fichas/pizzas")}
          className="rounded-2xl p-4 text-left bg-white border border-[#E6EAF0] active:scale-[0.97] transition-transform min-h-[88px]"
        >
          <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center mb-2">
            <ChefHat size={18} strokeWidth={2.4} />
          </div>
          <p className="font-semibold text-[14px] leading-tight text-[#0F172A]">Nova ficha</p>
        </button>
        <button
          onClick={() => navigate("/precificacao/pizzas")}
          className="rounded-2xl p-4 text-left bg-white border border-[#E6EAF0] active:scale-[0.97] transition-transform min-h-[88px]"
        >
          <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] text-[#D97706] flex items-center justify-center mb-2">
            <Tag size={18} strokeWidth={2.4} />
          </div>
          <p className="font-semibold text-[14px] leading-tight text-[#0F172A]">Revisar preço</p>
        </button>
      </div>

      </div>
    </div>
  );
}
