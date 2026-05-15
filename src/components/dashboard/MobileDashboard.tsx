import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChefHat, ShieldCheck, AlertTriangle, ArrowRight, Plus, FileUp, Tag,
  TrendingUp, TrendingDown, Sparkles, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Wallet, Activity, Receipt, ShieldAlert, Bell,
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

  const { faturamentoMes, despesasMes } = useDashboardData();
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

        {/* Caixa do mês — número gigante dentro do hero */}
        <div className="relative mt-6">
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
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
          <p className="font-mono text-[40px] font-bold leading-none tracking-tight text-white drop-shadow-sm">
            {hasFaturamento ? fmtBRL(lucroMes) : "—"}
          </p>
          <div className="flex items-center gap-4 mt-3 text-[12px]">
            <span className="inline-flex items-center gap-1 text-white/85">
              <ArrowUpRight size={13} className="text-[#86EFAC]" />
              <span className="font-mono font-semibold">{fmtBRL(faturamentoMes)}</span>
              <span className="text-white/60">entrada</span>
            </span>
            <span className="inline-flex items-center gap-1 text-white/85">
              <ArrowDownRight size={13} className="text-[#FCA5A5]" />
              <span className="font-mono font-semibold">{fmtBRL(despesasMes)}</span>
              <span className="text-white/60">saída</span>
            </span>
          </div>
        </div>
      </div>

      {/* Card branco sobreposto — tira a sensação de esmagado */}
      <div className="px-4 -mt-12 relative z-10">

      {/* HERO — Seu cardápio hoje */}
      <button
        onClick={() => navigate("/automacao/saude")}
        className="w-full text-left rounded-[22px] border border-[#E6EAF0] bg-white p-5 mb-4 active:scale-[0.99] transition-transform shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-14px_rgba(15,23,42,0.12)]"
        style={{
          background:
            "radial-gradient(60% 50% at 0% 0%, rgba(37,99,235,0.06) 0%, transparent 60%), radial-gradient(50% 60% at 100% 100%, rgba(5,150,105,0.06) 0%, transparent 65%), #FFFFFF",
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1">
              Seu cardápio hoje
            </p>
            <h2 className="font-heading text-[20px] font-bold leading-tight text-[#0F172A]">
              {cardapioTone === "success" ? "Cardápio protegido" : cardapioTone === "warning" ? "Precisa de atenção" : "Risco na margem"}
            </h2>
          </div>
          <Pill tone={cardapioTone}>
            <ShieldCheck size={11} /> {cardapioLabel}
          </Pill>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl bg-[#F8FAFC] border border-[#E6EAF0] p-3">
            <p className="font-mono text-[20px] font-bold text-[#059669] leading-none">{fichasMargemOk}</p>
            <p className="text-[10.5px] text-[#64748B] mt-1.5 font-medium">saudáveis</p>
          </div>
          <div className="rounded-xl bg-[#F8FAFC] border border-[#E6EAF0] p-3">
            <p className={cn(
              "font-mono text-[20px] font-bold leading-none",
              precosRevisar > 0 ? "text-[#D97706]" : "text-[#059669]",
            )}>{precosRevisar}</p>
            <p className="text-[10.5px] text-[#64748B] mt-1.5 font-medium">a revisar</p>
          </div>
          <div className="rounded-xl bg-[#F8FAFC] border border-[#E6EAF0] p-3">
            <p className={cn(
              "font-mono text-[20px] font-bold leading-none",
              perderamMargem.length > 0 ? "text-[#DC2626]" : "text-[#059669]",
            )}>{perderamMargem.length}</p>
            <p className="text-[10.5px] text-[#64748B] mt-1.5 font-medium">críticos</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-[#2563EB] font-semibold text-[13px]">
          <span>Ver Radar de Lucro</span>
          <ArrowRight size={15} />
        </div>
      </button>

      {/* CAIXA DO MÊS */}
      <button
        onClick={() => navigate("/financeiro/caixa-diario")}
        className="w-full text-left rounded-[22px] border border-[#E6EAF0] bg-white p-5 mb-4 active:scale-[0.99] transition-transform shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-14px_rgba(15,23,42,0.12)]"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1">
              Caixa do mês
            </p>
            <p className={cn(
              "font-mono font-bold leading-none tracking-tight text-[30px]",
              caixaPositivo ? "text-[#059669]" : caixaNegativo ? "text-[#DC2626]" : "text-[#0F172A]",
            )}>
              {hasFaturamento ? fmtBRL(lucroMes) : "—"}
            </p>
          </div>
          <Pill tone={finanTone}><Wallet size={11} />{finanLabel}</Pill>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-xl bg-[#F8FAFC] border border-[#E6EAF0] p-3">
            <div className="flex items-center gap-1 mb-1">
              <ArrowUpRight size={12} className="text-[#059669]" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Entrada</p>
            </div>
            <p className="font-mono text-[15px] font-bold text-[#0F172A]">{fmtBRL(faturamentoMes)}</p>
          </div>
          <div className="rounded-xl bg-[#F8FAFC] border border-[#E6EAF0] p-3">
            <div className="flex items-center gap-1 mb-1">
              <ArrowDownRight size={12} className="text-[#DC2626]" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Saída</p>
            </div>
            <p className="font-mono text-[15px] font-bold text-[#0F172A]">{fmtBRL(despesasMes)}</p>
          </div>
        </div>

        {caixaNegativo && (
          <p className="text-[12px] text-[#991B1B] font-medium mb-2">Revise despesas hoje.</p>
        )}

        <div className="flex items-center justify-between text-[#2563EB] font-semibold text-[13px]">
          <span>Ver caixa</span>
          <ArrowRight size={15} />
        </div>
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
