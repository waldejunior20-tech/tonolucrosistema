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
  if (pct < 25) return "bg-blue-900/40 text-blue-400";
  if (pct <= 35) return "bg-emerald-900/40 text-emerald-400";
  if (pct <= 40) return "bg-yellow-900/40 text-yellow-400";
  return "bg-red-900/40 text-red-400";
};

export const cmvColor = (pct: number): string => {
  if (pct < 25) return "text-info";
  if (pct <= 35) return "text-success";
  if (pct <= 40) return "text-warning";
  return "text-destructive";
};

export const cmvEmoji = (pct: number): string => {
  if (pct < 25) return "🔵";
  if (pct <= 35) return "🟢";
  if (pct <= 40) return "🟡";
  return "🔴";
};

export const cmvMessage = (pct: number): string => {
  if (pct < 25) return "Preço alto — verifique se está correto";
  if (pct <= 35) return "Ideal";
  if (pct <= 40) return "Atenção — margem apertada";
  return "Rever preços — prejuízo";
};

// ─── CMV faixas para bebidas industrializadas ────────────────────────
export const indCmvBg = (pct: number): string => {
  if (pct < 75) return "bg-blue-900/40 text-blue-400";
  if (pct <= 85) return "bg-emerald-900/40 text-emerald-400";
  if (pct <= 92) return "bg-yellow-900/40 text-yellow-400";
  return "bg-red-900/40 text-red-400";
};

export const indCmvColor = (pct: number): string => {
  if (pct < 75) return "text-info";
  if (pct <= 85) return "text-success";
  if (pct <= 92) return "text-warning";
  return "text-destructive";
};

export const indCmvEmoji = (pct: number): string => {
  if (pct < 75) return "🔵";
  if (pct <= 85) return "🟢";
  if (pct <= 92) return "🟡";
  return "🔴";
};

export const indCmvMessage = (pct: number): string => {
  if (pct < 75) return "Ótima margem — acima do mercado";
  if (pct <= 85) return "Margem normal para revenda";
  if (pct <= 92) return "Atenção — margem muito apertada";
  return "Prejuízo — rever preço";
};

// ─── App price calculation ───────────────────────────────────────────
/** Calculate app price to maintain same margin: preco / (1 - taxa/100) */
export const calcAppPrice = (precoPraticado: number, taxaPct: number) =>
  taxaPct < 100 ? precoPraticado / (1 - taxaPct / 100) : 0;

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
