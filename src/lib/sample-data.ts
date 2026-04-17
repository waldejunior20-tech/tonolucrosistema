import { supabase } from "@/integrations/supabase/client";

type InsumoSeed = {
  nome: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  preco_pago: number;
  fornecedor: string;
};

const INSUMOS_EXEMPLO: InsumoSeed[] = [
  { nome: "Mussarela (exemplo)", categoria: "Laticínios", unidade: "kg", quantidade: 1, preco_pago: 42, fornecedor: "Laticínios Bom Sabor" },
  { nome: "Molho de Tomate (exemplo)", categoria: "Molhos", unidade: "kg", quantidade: 2, preco_pago: 18, fornecedor: "Sacolão Central" },
  { nome: "Calabresa (exemplo)", categoria: "Proteínas", unidade: "kg", quantidade: 1, preco_pago: 28, fornecedor: "Frigorífico São Paulo" },
  { nome: "Farinha de Trigo (exemplo)", categoria: "Secos", unidade: "kg", quantidade: 5, preco_pago: 25, fornecedor: "Atacadão" },
  { nome: "Caixa Pizza 35cm (exemplo)", categoria: "Embalagens", unidade: "un", quantidade: 100, preco_pago: 80, fornecedor: "Embalagens Brasil" },
];

export async function loadSampleData(): Promise<{ inserted: number }> {
  // 1) Insumos
  const { data: insumos, error: e1 } = await (supabase as any)
    .from("insumos_comprados")
    .insert(
      INSUMOS_EXEMPLO.map((i) => ({
        ...i,
        data_compra: new Date().toISOString().split("T")[0],
      })),
    )
    .select("id, nome");
  if (e1) throw e1;

  const byName = new Map<string, string>();
  (insumos ?? []).forEach((row: any) => byName.set(row.nome, row.id));

  // 2) Ficha de Pizza
  const { data: pizza, error: e2 } = await (supabase as any)
    .from("fichas_tecnicas_pizza")
    .insert({
      nome: "Pizza Calabresa (exemplo)",
      tipo: "tradicional",
      numero_ficha: "EX-001",
      preco_venda_p: 35,
      preco_venda_m: 45,
      preco_venda_g: 55,
      modo_preparo: "Exemplo: abrir a massa, espalhar molho, mussarela, calabresa fatiada e assar 8 min.",
    })
    .select("id")
    .single();
  if (e2) throw e2;

  const ingredientesPizza = [
    { nome: "Farinha de Trigo (exemplo)", unidade: "g", p: 200, m: 280, g: 360 },
    { nome: "Molho de Tomate (exemplo)", unidade: "g", p: 60, m: 90, g: 120 },
    { nome: "Mussarela (exemplo)", unidade: "g", p: 120, m: 180, g: 240 },
    { nome: "Calabresa (exemplo)", unidade: "g", p: 80, m: 120, g: 160 },
    { nome: "Caixa Pizza 35cm (exemplo)", unidade: "un", p: 1, m: 1, g: 1 },
  ];

  const ingPayload = ingredientesPizza
    .map((i) => {
      const insumoId = byName.get(i.nome);
      if (!insumoId) return null;
      return {
        ficha_id: pizza.id,
        tipo_insumo: "comprado",
        insumo_comprado_id: insumoId,
        unidade: i.unidade,
        qtd_p: i.p,
        qtd_m: i.m,
        qtd_g: i.g,
      };
    })
    .filter(Boolean);

  if (ingPayload.length) {
    const { error: e3 } = await (supabase as any)
      .from("fichas_tecnicas_pizza_ingredientes")
      .insert(ingPayload);
    if (e3) throw e3;
  }

  // 3) Ficha de Produto (bebida)
  const { error: e4 } = await (supabase as any)
    .from("fichas_tecnicas_produtos")
    .insert({
      nome: "Refrigerante Lata (exemplo)",
      categoria: "bebida",
      numero_ficha: "EX-002",
      preco_venda: 8,
    });
  if (e4) throw e4;

  return { inserted: INSUMOS_EXEMPLO.length + 2 };
}
