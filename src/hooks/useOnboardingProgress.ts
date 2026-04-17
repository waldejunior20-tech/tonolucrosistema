import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OnboardingStep = {
  id: string;
  label: string;
  description: string;
  done: boolean;
  route: string;
};

async function countTable(table: string): Promise<number> {
  const { count } = await (supabase as any)
    .from(table)
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

async function countPizzasComPreco(): Promise<number> {
  const { count } = await (supabase as any)
    .from("fichas_tecnicas_pizza")
    .select("*", { count: "exact", head: true })
    .or("preco_venda_p.gt.0,preco_venda_m.gt.0,preco_venda_g.gt.0");
  return count ?? 0;
}

async function countReceitas(): Promise<number> {
  const { count } = await supabase
    .from("lancamentos_financeiros")
    .select("*", { count: "exact", head: true })
    .eq("tipo", "receita");
  return count ?? 0;
}

export function useOnboardingProgress() {
  return useQuery({
    queryKey: ["onboarding-progress"],
    staleTime: 30_000,
    queryFn: async (): Promise<{
      steps: OnboardingStep[];
      progress: number;
      completedCount: number;
      isComplete: boolean;
    }> => {
      const [insumos, fichasPizza, fichasProd, precProd, precBeb, pizzasPreco, receitas] =
        await Promise.all([
          countTable("insumos_comprados"),
          countTable("fichas_tecnicas_pizza"),
          countTable("fichas_tecnicas_produtos"),
          countTable("precificacao_produtos"),
          countTable("precificacao_bebidas"),
          countPizzasComPreco(),
          countReceitas(),
        ]);

      const steps: OnboardingStep[] = [
        {
          id: "config",
          label: "Configurar negócio",
          description: "Dados básicos do estabelecimento",
          done: true, // Concluído no onboarding inicial obrigatório
          route: "/configuracoes",
        },
        {
          id: "insumo",
          label: "Cadastrar 1º insumo",
          description: "Comece registrando os ingredientes que você compra",
          done: insumos > 0,
          route: "/insumos/comprados",
        },
        {
          id: "ficha",
          label: "Criar 1ª ficha técnica",
          description: "Monte a receita de uma pizza ou produto",
          done: fichasPizza + fichasProd > 0,
          route: "/fichas/pizzas",
        },
        {
          id: "preco",
          label: "Definir preço de 1 produto",
          description: "Configure o preço de venda com margem ideal",
          done: precProd + precBeb + pizzasPreco > 0,
          route: "/precificacao/pizzas",
        },
        {
          id: "venda",
          label: "Registrar 1ª venda no Caixa",
          description: "Lance uma venda para começar a ver seus lucros",
          done: receitas > 0,
          route: "/financeiro/caixa-diario",
        },
      ];

      const completedCount = steps.filter((s) => s.done).length;
      const progress = (completedCount / steps.length) * 100;

      return {
        steps,
        progress,
        completedCount,
        isComplete: completedCount === steps.length,
      };
    },
  });
}
