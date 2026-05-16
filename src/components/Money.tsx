import { cn } from "@/lib/utils";

/**
 * Exibe um valor numérico com o símbolo ("R$" ou "%") menor e mais leve que o número.
 * Hierarquia visual: o símbolo polui, o valor é o que importa.
 *
 * Uso:
 *   <Money value={1500} />                              → R$ pequeno + 1.500,00 grande
 *   <Money value={638.2} unit="PERCENT" />              → 638,2 grande + % pequeno
 *   <Money value={-200} signColor />                    → vermelho automático se negativo
 *   <Money value={5} signColor showSign unit="PERCENT" /> → "+5%" verde
 */
type Props = {
  value: number | null | undefined;
  className?: string;
  /** "BRL" mostra R$ antes; "PERCENT" mostra % depois. */
  unit?: "BRL" | "PERCENT";
  /** Tamanho do símbolo relativo ao número. Default 0.55 (≈55%). */
  symbolScale?: number;
  /** Aplica cor success/destructive automaticamente conforme sinal. */
  signColor?: boolean;
  /** Mostra "+" para positivos quando signColor está ativo. */
  showSign?: boolean;
};

const brl = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pct = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function Money({
  value,
  className,
  unit = "BRL",
  symbolScale = 0.55,
  signColor = false,
  showSign = false,
}: Props) {
  const v = typeof value === "number" && isFinite(value) ? value : 0;
  const isNegative = v < 0;
  const abs = Math.abs(v);
  const sign = isNegative ? "−" : showSign && v > 0 ? "+" : "";

  const colorClass = signColor
    ? isNegative
      ? "text-destructive"
      : v > 0
        ? "text-success"
        : ""
    : "";

  const formatted = unit === "PERCENT" ? pct.format(abs) : brl.format(abs);
  const symbol = unit === "PERCENT" ? "%" : "R$";

  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-[0.18em] tabular-nums whitespace-nowrap",
        colorClass,
        className,
      )}
    >
      {sign && <span className="font-semibold opacity-90">{sign}</span>}
      {unit === "BRL" && (
        <span
          aria-hidden="true"
          className="font-normal opacity-60 leading-none"
          style={{ fontSize: `${symbolScale}em` }}
        >
          {symbol}
        </span>
      )}
      <span>{formatted}</span>
      {unit === "PERCENT" && (
        <span
          aria-hidden="true"
          className="font-normal opacity-60 leading-none"
          style={{ fontSize: `${symbolScale}em` }}
        >
          {symbol}
        </span>
      )}
    </span>
  );
}
