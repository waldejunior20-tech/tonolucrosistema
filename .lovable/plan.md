
Objetivo: corrigir o campo monetário para funcionar no padrão brasileiro de forma simples, previsível e profissional, sem quebrar cálculos nem os fluxos já existentes.

1. Reescrever a lógica do `MoneyInput`
- Substituir a máscara atual por uma abordagem baseada em centavos inteiros.
- Enquanto o usuário digita, considerar apenas dígitos e formatar sempre como moeda BR.
- Exemplo de comportamento:
  - `1` → `R$ 0,01`
  - `10` → `R$ 0,10`
  - `100` → `R$ 1,00`
  - `7000` → `R$ 70,00`
  - `7000000` → `R$ 70.000,00`
- Isso elimina casas decimais infinitas, erros com ponto/vírgula e inconsistências de parse.

2. Padronizar helpers de formatação
- Ajustar `formatMoney` para sempre exibir 2 casas decimais em `pt-BR`.
- Criar/ajustar helpers internos do `MoneyInput` para:
  - limpar texto para dígitos
  - converter dígitos em centavos
  - formatar centavos em `R$ X.XXX,XX`
- Manter `parseFormattedNumber` compatível com o restante do sistema, mas deixar o `MoneyInput` menos dependente do parse textual atual.

3. Corrigir interação do input
- Manter `type="text"` e `inputMode="numeric"`/`decimal` apropriado.
- Ao focar, continuar mostrando máscara consistente em vez de entrar num estado “quebrado”.
- Ao digitar, atualizar visualmente em tempo real.
- Ao sair do campo, enviar `number` limpo para o estado pai e para o Supabase.

4. Garantir compatibilidade nos pontos já usados
- Validar os usos atuais do `MoneyInput` em:
  - `Onboarding`
  - `FinanceiroDRE`
  - `FinanceiroContasPagar`
  - `InsumosComprados`
- Confirmar que todos continuam recebendo `number` no `onChange`, sem precisar alterar regra de negócio.

5. Ajustar o `AutoSaveInput` para exibição monetária consistente
- Hoje ele usa `formatMoney`, então deve se beneficiar da padronização.
- Vou verificar se o comportamento focado/desfocado continua coerente para evitar aparecer valor cru ou mal formatado em campos com autosave.

6. Validação final
- Conferir cenários principais:
  - digitar `70000`
  - digitar `7000000`
  - apagar tudo
  - colar valores como `70000`, `70.000`, `70.000,00`
  - salvar e reabrir campo
- Garantir que o onboarding em `/onboarding` passe a aceitar preenchimento natural de “faturamento médio mensal”.

Se você aprovar, vou implementar a correção diretamente no componente compartilhado para resolver o problema em todos os campos de valor do sistema de uma vez.

Seção técnica
- Arquivo principal: `src/components/MoneyInput.tsx`
- Arquivo relacionado para conferência: `src/components/AutoSaveInput.tsx`
- Estratégia recomendada: armazenar e manipular a digitação como centavos inteiros e formatar com `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`
- Benefício: evita erro clássico de interpretar `.` como decimal quando no Brasil ele deve ser milhar.
