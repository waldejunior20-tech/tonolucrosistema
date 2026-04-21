

# Plano: Prompt de análise profunda do ecossistema "Tô No Lucro" para LLM

## Entregável único
Um **prompt objetivo, denso e auditável** que você cola em qualquer LLM (Claude, ChatGPT, Gemini) junto com este projeto/n8n para que ela devolva um diagnóstico completo e desenhe o workflow de cascata de preços. Nenhum código será escrito — apenas o prompt + os fatos reais já levantados que você anexa junto.

## Fatos reais do banco (para colar junto com o prompt)

**Volume atual no Supabase** (ref `lokqongxioqbesejavdm`):
- `insumos_comprados`: **35** registros — categorias reais usadas: Hortifruti, Laticínios, Secos, Bebidas, Molhos e Condimentos. Unidades reais: kg, g, ml, L, unidade. Exemplo: Mussarela 1 kg / R$ 36 (Gaucho Frios, 10/04) e antes Queijo mussarela fatiado 1 kg / R$ 32.
- `insumos_proprios`: **2** (Massa de pizza rendimento 6,5 kg; Molho Verde da Casa 0,8 kg) com **8** linhas em `insumos_proprios_ingredientes`.
- `fichas_tecnicas_pizza`: **2** (ambas "Marguerita" — duplicada entre 2 unidades) + **8** linhas de ingredientes (Mussarela, Tomate, Orégano, 3 embalagens P/M/G, Massa própria).
- `fichas_tecnicas_produtos`: **4** (Pastel de Queijo R$ 8, Pastel de queijo s/preço, Pudim s/preço, Coca-Cola s/preço) + **8** ingredientes.
- `precificacao_produtos`: **3** | `precificacao_bebidas`: **2**.
- `lancamentos_financeiros`: **27** (mistura de "Vendas - Dinheiro/PIX | Débito | Crédito | iFood" e despesas tipo aluguel/energia).
- `configuracoes_precificacao`: **2** linhas (uma por unidade) — CMV meta 32%, custos fixos 19,85–22%, taxa iFood 12–27,69% (plano caro detectado), débito 1,35%, crédito 3,15%.
- `configuracoes_negocio`: **4** — lucro desejado 15%, faturamento médio R$ 50–70k, custos fixos detalhados.
- `unidades`: **2** (multi-tenant ativo).
- `historico_precos_insumos`: **0** | `alertas_cmv`: **0** → **vazias, prontas para o n8n popular**.
- `combos_fixos`: 1 | `promocoes`: 0 | `metas_financeiras`: 2.

**Sinais já detectáveis nos dados** (que o n8n deveria capturar e ainda não captura):
1. Mussarela subiu de R$ 32 → R$ 36/kg (+12,5%) entre 28/03 e 10/04 — **alerta perdido**.
2. Ficha "Marguerita" usa Mussarela em 280 g (G) → impacto direto: +R$ 1,12 no custo do tamanho G — **CMV deveria ter sido recalculado**.
3. Existe uma 2ª ficha Marguerita órfã (só com Mussarela, sem outros ingredientes) — **dado sujo**, n8n precisa lidar.
4. Unidade "g" registrada como `g` em `insumo` mas regra do projeto é dividir por 1000 — fluxo precisa replicar essa conversão.
5. Configuração com `taxa_ifood_pct=27,69` indica plano "entrega pelo iFood" — fórmula de preço sugerido muda conforme o plano.

## O que o prompt vai pedir para a LLM analisar

A) **Mapa do fluxo atual no app** (telas → tabelas → fórmulas) com base nos arquivos do repo.
B) **Diagnóstico de gaps** entre o que o app faz hoje e o que a cascata de preços precisa.
C) **Desenho do workflow n8n** com nós, triggers, ramificações e SQL exato.
D) **Regras de negócio críticas** (conversão g→kg, CMV meta, fórmula de preço sugerido, multi-unidade/RLS).
E) **Plano de teste com os dados reais já existentes** (ex: usar a alta da Mussarela como caso 1).

## Estrutura do prompt entregue

O prompt terá 7 blocos numerados:
1. **Persona + objetivo** — "você é arquiteto de automação financeira para food service".
2. **Contexto do produto** — o que é Tô No Lucro, o que NÃO é (não é PDV).
3. **Inventário factual** — colar as contagens, exemplos e sinais reais listados acima.
4. **Tabelas e relações** — esquema resumido com PKs/FKs lógicos (sem FK física, mas relação por id).
5. **Fórmulas oficiais do app** — custo de insumo próprio, CMV de pizza por tamanho, preço sugerido com taxa de pagamento.
6. **Perguntas dirigidas** que a LLM DEVE responder, em ordem:
   - Quais eventos disparam o workflow? (INSERT em `insumos_comprados` é o gatilho primário; quais secundários?)
   - Como detectar variação real (mesmo `nome` + `unidade_id`, comparar penúltima vs última compra normalizada por unidade de medida)?
   - Quais fichas são afetadas? (query recursiva: insumo → `fichas_tecnicas_*_ingredientes` direto + via `insumos_proprios_ingredientes` → `insumos_proprios` → fichas).
   - Como calcular novo CMV por tamanho de pizza e por produto?
   - Quando gerar `alertas_cmv` (CMV atual > `cmv_meta_pct` ou variação > X%)?
   - Como calcular `preco_sugerido` mantendo margem alvo (fórmula com taxas + custos fixos + lucro)?
   - Como respeitar RLS multi-unidade usando service_role + `unidade_id` correto?
   - Tratamento de erros, idempotência, retries, e como evitar loop (insert em `historico_precos` não pode disparar outro recálculo).
7. **Formato da resposta esperada** — diagrama ASCII do fluxo, lista de nós n8n com nome/tipo/parâmetros principais, queries SQL prontas, e tabela de casos de teste usando os 35 insumos reais.

## Como você vai usar
1. Copia o prompt da próxima resposta (modo default).
2. Cola na LLM da sua preferência junto com: (a) screenshot ou export do seu workflow n8n atual, (b) os dados reais já listados acima, (c) o arquivo `useProductCosts.ts` (única referência de fórmula viva no projeto).
3. A LLM devolve o diagnóstico completo + desenho do workflow.

## Fora do escopo
- Não vou criar tabelas, edge functions, nem alterar n8n.
- Não vou escrever o workflow JSON — o prompt instrui a LLM a fazer isso.
- Não vou tocar em nenhum arquivo do projeto.

