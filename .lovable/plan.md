

# Plano: Refinar Caixa Diário como Lançamento Financeiro (não-PDV)

## Entendimento

O **Caixa Diário** é um **registro contábil retroativo de vendas por forma de pagamento**, não um PDV. O dono/operador abre a tela e diz: "no dia 20 vendi X em Dinheiro, Y no iFood, Z em Crédito". Esses valores alimentam DRE, Ponto de Equilíbrio e Dashboard como receitas reais. Hoje a tela já existe mas tem fricções:

1. Os botões abrem **um modal por forma de pagamento** — força 5 cliques separados quando o dono quer lançar o dia inteiro de uma vez.
2. Não há **seletor de período** (ex: "lancei só hoje agora os dias 20 a 04 de uma vez").
3. A linguagem ainda lembra "venda individual" ao invés de "fechamento do dia".

## O que muda

### A) Novo formulário "Lançar Vendas do Dia" (foco principal)
Substituir o fluxo de 5 modais por **um único card** com:
- **Seletor de data** (calendário) com opção de **intervalo** (ex: 20/04 a 04/05) — usa `react-day-picker` em modo `range` que já vem no projeto.
- **5 campos de valor lado a lado** (MoneyInput): Dinheiro/PIX, Débito, Crédito, iFood, Outros Apps.
- Mostra **taxa aplicada** abaixo de cada campo e o **líquido calculado em tempo real**.
- Total bruto + total líquido visível no rodapé.
- Botão único "Registrar Vendas" que cria os lançamentos em `lancamentos_financeiros` (1 linha por forma com valor > 0, distribuído igualmente nos dias do intervalo OU lançado em data única conforme escolha).

### B) Manter botões rápidos como atalho secundário
Os 5 botões coloridos atuais (Dinheiro/PIX, Débito, etc.) continuam para quem prefere registrar **uma venda pontual** — viram um bloco "Lançamento rápido" abaixo do formulário principal.

### C) Ajustes de copy
- Título da página: "Caixa Diário" → mantém, mas subtítulo vira "Registre o fechamento de vendas do dia por forma de pagamento. Os valores alimentam automaticamente DRE e Ponto de Equilíbrio."
- "Nova venda — Dinheiro/PIX" → "Registrar entrada — Dinheiro/PIX"
- Empty state: "Nenhuma venda registrada ainda hoje" → "Nenhum fechamento lançado para esta data"

### D) Visual do resumo
- Reforçar que o resumo (KPIs Bruto/Líquido/Taxas) é o que **vai para o DRE**.
- Adicionar pequeno badge "→ DRE" ao lado do total líquido linkando para `/financeiro/dre`.

## Detalhes técnicos

**Arquivos a editar:**
- `src/pages/CaixaDiario.tsx` — adicionar o novo card "Lançar Vendas do Dia" no topo, ajustar copy, manter botões rápidos como secundários.
- `src/components/caixa/VendaRapidaButton.tsx` — apenas ajustar copy do modal ("Registrar entrada" em vez de "Venda").
- **Novo**: `src/components/caixa/FechamentoDiaForm.tsx` — formulário consolidado com 5 MoneyInputs + DateRangePicker + cálculo de líquido em tempo real + mutation que faz `insert` em batch em `lancamentos_financeiros`.

**Lógica de inserção em intervalo de datas:**
- Se o usuário escolher intervalo (ex: 20-04 a 04-05 = 15 dias), cada valor informado é **dividido igualmente entre os dias** (ex: R$ 1500 em iFood / 15 dias = R$ 100/dia) e gera 1 lançamento por dia × forma. Alternativa: opção "lançar tudo em um único dia" (a data final do intervalo).
- Vamos oferecer **2 modos** via toggle: "Data única" (uma data, valores totais) e "Intervalo" (faixa de datas, valores são totalizados na data escolhida — sem dividir, para não confundir contabilmente). **Decisão: lançar sempre na data final do intervalo como "fechamento acumulado"**, mais simples e fiel ao que o dono quer.
- Cada insert continua usando `requireActiveUnidadeId()` e categoria `Vendas - {forma}` para manter compatibilidade com DRE, hooks `useCaixaDiario` e `useDashboardData`.

**Sem mudanças de schema** — `lancamentos_financeiros` já comporta tudo.

**Invalidations:** após salvar, invalidar `["caixa-diario"]`, `["caixa-historico"]`, `["dashboard"]`, `["dre"]`.

## Fora do escopo
- Não mexer em DRE/Ponto de Equilíbrio (já consomem `lancamentos_financeiros` corretamente).
- Não criar novas tabelas.
- Não tocar nos alertas n8n (`historico_precos_insumos`, `alertas_cmv`).

