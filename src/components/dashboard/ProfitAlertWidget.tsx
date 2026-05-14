import { TrendingUp, AlertTriangle, ArrowRight, X, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfitAlerts, useDismissProfitAlert, type ProfitAlert } from "@/hooks/useProfitAlerts";
import { Skeleton } from "@/components/ui/skeleton";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function severityFor(deltaPct: number): "critical" | "warning" | "info" {
  if (deltaPct >= 15) return "critical";
  if (deltaPct >= 5) return "warning";
  return "info";
}

function PriceSuggestion({ a }: { a: ProfitAlert }) {
  if (a.tipo_ficha === "pizza") {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {a.preco_sugerido_p ? (
          <span className="text-money-md text-[14px] px-2 py-0.5 rounded-md bg-primary/10 text-primary">
            P {formatBRL(a.preco_sugerido_p)}
          </span>
        ) : null}
        {a.preco_sugerido_m ? (
          <span className="text-money-md text-[14px] px-2 py-0.5 rounded-md bg-primary/10 text-primary">
            M {formatBRL(a.preco_sugerido_m)}
          </span>
        ) : null}
        {a.preco_sugerido_g ? (
          <span className="text-money-md text-[14px] px-2 py-0.5 rounded-md bg-primary/10 text-primary">
            G {formatBRL(a.preco_sugerido_g)}
          </span>
        ) : null}
      </div>
    );
  }
  return (
    <div className="mt-2">
      <span className="text-money-md text-[14px] px-2 py-0.5 rounded-md bg-primary/10 text-primary">
        {formatBRL(a.preco_sugerido)}
      </span>
    </div>
  );
}

function AlertRow({ a, onReview, onDismiss }: {
  a: ProfitAlert;
  onReview: () => void;
  onDismiss: () => void;
}) {
  const sev = severityFor(a.delta_pct);
  const sevStyles = {
    critical: "border-l-destructive bg-destructive/[0.03]",
    warning: "border-l-warning bg-warning/[0.03]",
    info: "border-l-primary bg-primary/[0.03]",
  }[sev];
  const badgeStyles = {
    critical: "bg-destructive/10 text-destructive",
    warning: "bg-warning/10 text-warning",
    info: "bg-primary/10 text-primary",
  }[sev];

  return (
    <div
      className={`group relative border border-border border-l-[3px] ${sevStyles} rounded-lg p-3.5 transition-all hover:shadow-sm`}
    >
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 w-6 h-6 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        title="Ignorar alerta"
        aria-label="Ignorar alerta"
      >
        <X size={13} />
      </button>

      <div className="flex items-start justify-between gap-3 pr-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-[14px] text-foreground truncate max-w-[220px]">
              {a.nome}
            </h4>
            <span className="text-label-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {a.tipo_ficha}
            </span>
            <span className={`text-[12px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${badgeStyles}`}>
              <TrendingUp size={11} strokeWidth={3} />
              +{a.delta_pct.toFixed(1)}%
            </span>
          </div>

          <p className="text-[12px] text-muted-foreground mt-1 font-mono-data">
            CMV: <span className="line-through opacity-60">{formatBRL(a.cmv_anterior)}</span>
            {" → "}
            <span className="font-semibold text-foreground">{formatBRL(a.cmv_atual)}</span>
            <span className="ml-1.5 text-destructive font-semibold">
              (+{formatBRL(a.delta_abs)})
            </span>
          </p>

          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles size={11} className="text-primary" />
            <span className="font-medium">Preço sugerido:</span>
          </div>
          <PriceSuggestion a={a} />
        </div>
      </div>

      <button
        onClick={onReview}
        className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-primary hover:bg-primary/10 rounded-md py-1.5 transition-colors"
      >
        Reajustar preço <ArrowRight size={12} />
      </button>
    </div>
  );
}

export function ProfitAlertWidget() {
  const navigate = useNavigate();
  const { data: alerts = [], isLoading } = useProfitAlerts(5);
  const dismiss = useDismissProfitAlert();

  const handleReview = (a: ProfitAlert) => {
    const route =
      a.tipo_ficha === "pizza"
        ? "/precificacao/pizzas"
        : a.tipo_ficha === "bebida"
        ? "/precificacao/bebidas"
        : "/precificacao/produtos";
    navigate(route);
  };

  return (
    <div className="fade-up fade-up-d3">
      <div className="bg-card border border-border rounded-[12px] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-warning/10 border border-warning/20 flex items-center justify-center">
              <AlertTriangle size={16} className="text-warning" />
            </div>
            <div>
              <h3 className="text-card-title">Alerta de Lucro</h3>
              <p className="text-[12px] text-muted-foreground">
                Insumos subiram e estão comprimindo sua margem
              </p>
            </div>
          </div>
          {alerts.length > 0 && (
            <span className="text-[12px] font-bold px-2.5 py-1 rounded-md bg-destructive/10 text-destructive">
              {alerts.length} {alerts.length === 1 ? "ficha" : "fichas"}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
              <TrendingUp size={20} className="text-success" />
            </div>
            <p className="text-[13px] font-semibold text-foreground">Margens saudáveis</p>
            <p className="text-[12px] text-muted-foreground text-center max-w-[260px]">
              Nenhum insumo causou impacto relevante nas suas fichas técnicas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map((a) => (
              <AlertRow
                key={a.id}
                a={a}
                onReview={() => handleReview(a)}
                onDismiss={() => dismiss.mutate(a.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
