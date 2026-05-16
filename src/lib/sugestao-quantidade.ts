/**
 * Algoritmo de sugestão de quantidades M e G a partir da quantidade P.
 *
 * Estratégia:
 * 1. Base fixa (massa/molho/disco) → puxa pesos padrão fixos por tamanho.
 * 2. Sem histórico do grupo → aplica o "Estilo do Chef" padrão (multiplicadores).
 * 3. Com histórico → calcula a média das proporções (qtdM/qtdP) do grupo
 *    e arredonda o resultado final para múltiplos de 10g (amigável para cozinha).
 */

export type GrupoComportamento =
  | "queijo_caro"
  | "proteina_volumosa"
  | "molho_liquido"
  | "vegetal_topping"
  | "base_fixa"
  | "padrao";

export interface HistoricoItem {
  grupoComportamento: GrupoComportamento;
  qtdP: number;
  qtdM: number;
  qtdG: number;
}

export interface Sugestao {
  qtdM: number;
  qtdG: number;
}

/** Pesos fixos para itens de base (massa/disco) por tamanho. */
const BASE_FIXA_PESOS: Record<"M" | "G", number> = {
  M: 300,
  G: 380,
};

/** Multiplicadores padrão quando não há histórico do grupo. */
const MULTIPLICADORES_PADRAO: Record<GrupoComportamento, { m: number; g: number }> = {
  queijo_caro: { m: 1.4, g: 1.7 }, // economiza no grande
  proteina_volumosa: { m: 1.5, g: 1.875 },
  molho_liquido: { m: 1.45, g: 1.8 },
  vegetal_topping: { m: 1.5, g: 1.9 },
  base_fixa: { m: 1.5, g: 1.875 }, // não usado (retorna fixo)
  padrao: { m: 1.5, g: 1.875 },
};

/** Arredonda para múltiplos de 10 (amigável para a cozinha: 237 → 240). */
const arredondarParaCozinha = (valor: number) => Math.round(valor / 10) * 10;

/** Arredonda para múltiplos de 5 (usado no fallback inicial). */
const arredondarPara5 = (valor: number) => Math.round(valor / 5) * 5;

export function sugerirQuantidades(
  tipoInsumo: GrupoComportamento,
  qtdP: number,
  historicoGeral: HistoricoItem[] = [],
): Sugestao {
  if (!qtdP || qtdP <= 0) return { qtdM: 0, qtdG: 0 };

  // 1. Base fixa: pesos absolutos por tamanho.
  if (tipoInsumo === "base_fixa") {
    return { qtdM: BASE_FIXA_PESOS.M, qtdG: BASE_FIXA_PESOS.G };
  }

  // 2. Filtra histórico válido do mesmo grupo de comportamento.
  const historicoDoGrupo = historicoGeral.filter(
    (h) => h.grupoComportamento === tipoInsumo && h.qtdP > 0 && h.qtdM > 0 && h.qtdG > 0,
  );

  // Sem histórico → multiplicadores padrão (arredondados a cada 5g).
  if (historicoDoGrupo.length === 0) {
    const mult = MULTIPLICADORES_PADRAO[tipoInsumo] ?? MULTIPLICADORES_PADRAO.padrao;
    return {
      qtdM: arredondarPara5(qtdP * mult.m),
      qtdG: arredondarPara5(qtdP * mult.g),
    };
  }

  // 3. Média das proporções reais do grupo.
  let somaProporcaoM = 0;
  let somaProporcaoG = 0;
  historicoDoGrupo.forEach((item) => {
    somaProporcaoM += item.qtdM / item.qtdP;
    somaProporcaoG += item.qtdG / item.qtdP;
  });
  const mediaM = somaProporcaoM / historicoDoGrupo.length;
  const mediaG = somaProporcaoG / historicoDoGrupo.length;

  return {
    qtdM: arredondarParaCozinha(qtdP * mediaM),
    qtdG: arredondarParaCozinha(qtdP * mediaG),
  };
}

/**
 * Infere o grupo de comportamento a partir do nome/categoria do insumo.
 * Heurística simples baseada em palavras-chave (PT-BR).
 */
export function inferirGrupoComportamento(
  nome: string,
  categoria?: string | null,
): GrupoComportamento {
  const txt = `${nome ?? ""} ${categoria ?? ""}`.toLowerCase();

  if (/(massa|disco|borda pré|base pizza)/.test(txt)) return "base_fixa";
  if (/(queijo|mussarela|muçarela|parmesão|gorgonzola|catupiry|cheddar|provolone|brie)/.test(txt))
    return "queijo_caro";
  if (/(frango|calabresa|presunto|bacon|carne|lombo|peperoni|pepperoni|atum|camarão|peito)/.test(txt))
    return "proteina_volumosa";
  if (/(molho|tomate pelado|extrato|polpa|creme de leite|leite condensado)/.test(txt))
    return "molho_liquido";
  if (/(cebola|tomate|pimentão|azeitona|milho|ervilha|brócolis|champignon|rúcula|palmito)/.test(txt))
    return "vegetal_topping";

  return "padrao";
}
