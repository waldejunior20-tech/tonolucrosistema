// ─── Shared pricing helpers ──────────────────────────────────────────

export const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtPct = (v: number) => `${v.toFixed(1)}%`;

export const calcCmv = (custo: number, preco: number) =>
  preco > 0 ? (custo / preco) * 100 : 0;

export const converterQuantidade = (qtd: number, unidade: string) =>
  unidade === "g" || unidade === "ml" ? qtd / 1000 : qtd;

// ─── CMV faixas padrão Abrasel (Pizzas / Produtos) ──────────────────
export const cmvBg = (pct: number): string => {
  if (pct < 25) return "bg-blue-50 text-blue-700 border border-blue-200";
  if (pct <= 35) return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (pct <= 40) return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-red-50 text-red-700 border border-red-200";
};

export const cmvColor = (pct: number): string => {
  if (pct < 25) return "text-info";
  if (pct <= 35) return "text-success";
  if (pct <= 40) return "text-warning";
  return "text-destructive";
};

export const cmvEmoji = (pct: number): string => {
  if (pct < 25) return "●";
  if (pct <= 35) return "●";
  if (pct <= 40) return "●";
  return "●";
};

export const cmvMessage = (pct: number): string => {
  if (pct < 25) return "Preço alto — margem acima do necessário";
  if (pct <= 35) return "Ideal — CMV dentro da faixa saudável";
  if (pct <= 40) return "Atenção — preço baixo, margem apertada";
  return "Preço muito baixo — rever urgente";
};

// ─── CMV faixas para bebidas industrializadas ────────────────────────
export const indCmvBg = (pct: number): string => {
  if (pct < 75) return "bg-blue-50 text-blue-700 border border-blue-200";
  if (pct <= 85) return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (pct <= 92) return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-red-50 text-red-700 border border-red-200";
};

export const indCmvColor = (pct: number): string => {
  if (pct < 75) return "text-info";
  if (pct <= 85) return "text-success";
  if (pct <= 92) return "text-warning";
  return "text-destructive";
};

export const indCmvEmoji = (pct: number): string => {
  if (pct < 75) return "●";
  if (pct <= 85) return "●";
  if (pct <= 92) return "●";
  return "●";
};

export const indCmvMessage = (pct: number): string => {
  if (pct < 75) return "Ótima margem — acima do mercado";
  if (pct <= 85) return "Margem normal para revenda";
  if (pct <= 92) return "Atenção — margem muito apertada";
  return "Prejuízo — rever preço";
};

// ─── App price calculation ───────────────────────────────────────────
/**
 * Gross-up de preço para apps de delivery.
 * Mantém a margem do balcão aplicando a taxa do app.
 * Ex: balcão R$50, taxa 27,69% → R$69,15 no app.
 */
export const precoComTaxaApp = (precoBalcao: number, taxaAppPct: number): number => {
  if (taxaAppPct >= 100) return 0;
  return Math.round((precoBalcao / (1 - taxaAppPct / 100)) * 100) / 100;
};

/** @deprecated Use precoComTaxaApp. Mantido para compat com telas existentes. */
export const calcAppPrice = precoComTaxaApp;

// ─── Preço sugerido (markup vs meta de CMV) ──────────────────────────
export interface MixPagamento {
  pct_ifood: number;
  pct_credito: number;
  pct_debito: number;
  pct_dinheiro_pix: number;
}

export interface ConfigNegocioMin {
  lucro_desejado_pct: number;
  mix: MixPagamento;
}

export interface PrecoSugeridoResult {
  /** Preço pelo método markup (taxas + custos fixos + lucro). */
  markup: number;
  /** Preço para atingir exatamente a meta de CMV: custo / cmv_meta. */
  metaCmv: number;
  /** Recomendado: o MAIOR dos dois (garante meta E cobre custos). */
  recomendado: number;
  /** Soma % usada no denominador do markup, para diagnóstico. */
  somaMarkup: number;
  /** Taxa de pagamento ponderada pelo mix real. */
  taxaPonderada: number;
}

/**
 * Calcula preço sugerido a partir do custo do produto.
 *
 * - Método 1 (markup): custo / (1 - (custos_fixos + taxa_ponderada + lucro)/100)
 *   NÃO inclui cmv_meta_pct no denominador — custo/preço já É o CMV.
 * - Método 2 (meta CMV): custo / (cmv_meta_pct/100)
 * - Recomendado: max(método 1, método 2).
 *
 * Lança erro se o markup for impossível (soma >= 100%).
 */
export function calcularPrecoSugerido(
  custo: number,
  cfgPrecif: ConfigPrecificacao,
  cfgNegocio: ConfigNegocioMin
): PrecoSugeridoResult {
  const { mix } = cfgNegocio;
  const somaMix = mix.pct_ifood + mix.pct_credito + mix.pct_debito + mix.pct_dinheiro_pix;
  if (somaMix < 95 || somaMix > 105) {
    // Não bloqueia — só avisa. Se o usuário ainda não preencheu o mix, default ~0.
    console.warn(`[calcularPrecoSugerido] Mix de pagamento soma ${somaMix.toFixed(1)}%, esperado ~100%`);
  }

  const taxaPonderada =
    (mix.pct_ifood        / 100) * cfgPrecif.taxa_ifood_pct  +
    (mix.pct_credito      / 100) * cfgPrecif.taxa_credito_pct +
    (mix.pct_debito       / 100) * cfgPrecif.taxa_debito_pct  +
    (mix.pct_dinheiro_pix / 100) * cfgPrecif.taxa_pix_pct;

  const somaMarkup = cfgPrecif.custos_fixos_pct + taxaPonderada + cfgNegocio.lucro_desejado_pct;
  const denominador = 1 - somaMarkup / 100;
  if (denominador <= 0) {
    throw new Error(
      `Markup impossível: custos fixos + taxas + lucro = ${somaMarkup.toFixed(1)}%. Reduza algum desses valores.`
    );
  }
  const precoMarkup = custo / denominador;
  const precoMetaCmv = cfgPrecif.cmv_meta_pct > 0 ? custo / (cfgPrecif.cmv_meta_pct / 100) : 0;
  const precoRecomendado = Math.max(precoMarkup, precoMetaCmv);

  const round2 = (n: number) => Math.round(n * 100) / 100;
  return {
    markup: round2(precoMarkup),
    metaCmv: round2(precoMetaCmv),
    recomendado: round2(precoRecomendado),
    somaMarkup: round2(somaMarkup),
    taxaPonderada: round2(taxaPonderada),
  };
}

// ─── Active apps from config ─────────────────────────────────────────
export interface AppInfo {
  key: string;
  label: string;
  taxa: number;
}

export interface ConfigPrecificacao {
  id: string;
  custos_fixos_pct: number;
  cmv_meta_pct: number;
  taxa_ifood_pct: number;
  taxa_debito_pct: number;
  taxa_credito_pct: number;
  taxa_pix_pct: number;
  app_ifood_ativo: boolean;
  app_rappi_ativo: boolean;
  app_aiqfome_ativo: boolean;
  taxa_rappi_pct: number;
  taxa_aiqfome_pct: number;
  app_outro_ativo?: boolean;
  app_outro_nome?: string;
  taxa_outro_pct?: number;
  ifood_plano?: string;
}

export const getActiveApps = (config: ConfigPrecificacao | undefined): AppInfo[] => {
  if (!config) return [];
  const apps: AppInfo[] = [];
  if (config.app_ifood_ativo) apps.push({ key: "ifood", label: "iFood", taxa: config.taxa_ifood_pct });
  if (config.app_rappi_ativo) apps.push({ key: "rappi", label: "Rappi", taxa: config.taxa_rappi_pct });
  if (config.app_aiqfome_ativo) apps.push({ key: "aiqfome", label: "Aiqfome", taxa: config.taxa_aiqfome_pct });
  if (config.app_outro_ativo && config.app_outro_nome) {
    apps.push({ key: "outro", label: config.app_outro_nome, taxa: config.taxa_outro_pct ?? 12 });
  }
  return apps;
};

export const APP_TOOLTIP = "Cobrar esse valor no app mantém sua margem igual ao balcão";
