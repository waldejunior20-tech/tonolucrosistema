import { cn } from "@/lib/utils";

/**
 * Exibe um valor monetário com o "R$" menor e mais leve que o número.
 * Hierarquia visual: o símbolo polui, o valor é o que importa.
 *
 * Uso:
 *   <Money value={1500} />              → R$  1.500,00 (R$ pequeno)
 *   <Money value={638.2} className="text-money-lg" />
 *   <Money value={-200} negativeColor /> → vermelho automático se negativo
 */
type Props = {
  value: number | null | undefined;
  className?: string;
  /** Tamanho do símbolo "R$" relativo ao número. Default 0.55 (≈55%). */
  symbolScale?: number;
  /** Aplica cor success/destructive automaticamente conforme sinal. */
  signColor?: boolean;
  /** Mostra "+" para positivos quando signColor está ativo. */
  showSign?: boolean;
};

const fmt = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function Money({
  value,
  className,
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

  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-[0.18em] tabular-nums whitespace-nowrap",
        colorClass,
        className,
      )}
    >
      {sign && <span className="font-semibold opacity-90">{sign}</span>}
      <span
        aria-hidden="true"
        className="font-normal opacity-60 leading-none"
        style={{ fontSize: `${symbolScale}em` }}
      >
        R$
      </span>
      <span>{fmt.format(abs)}</span>
    </span>
  );
}
