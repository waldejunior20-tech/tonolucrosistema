## Problema

A nota da Gaúcho Frios chegou e o item **"MUSSARELA BARRA"** caiu como **Proteínas** no DRE. Errado — mussarela é **Laticínios**. O GPT do n8n se confundiu porque o fornecedor é "Frios" e tudo virou Proteína.

Hoje a classificação depende **só** do que o GPT do n8n decide na hora. Sem rede de proteção. Resultado: lixo entra, lixo aparece no relatório.

## Tática (4 camadas, do barato pro inteligente)

Inspirado em como ERPs grandes (Bling, Conta Azul, Omie) e apps de inventário (Petti, Cardápio Web) resolvem isso:

```text
Item da NF chega
        │
        ▼
[1] Catálogo canônico  ──┐ achou? usa e pronto
        │ não achou      │
        ▼                │
[2] Dicionário de regras─┤ "mussarela" → Laticínios
        │ não bateu      │
        ▼                │
[3] Histórico do usuário ┤ já comprou esse nome antes? usa a mesma
        │ inédito        │
        ▼                │
[4] IA (Gemini Flash) ───┘ JSON estruturado {categoria}
        │
        ▼
Salva no DRE + grava no catálogo (vira aprendizado)
```

E uma **5ª camada humana**: tela de **Caixa de Entrada de Notas** onde o usuário revisa antes de virar lançamento definitivo.

---

## O que muda

### 1. Catálogo canônico de insumos (`insumos_catalog`)
A tabela já existe (`nome_canonico`, `aliases[]`, `categoria`). Vou popular com ~150 itens comuns de pizzaria/restaurante BR:

- **Laticínios:** mussarela, queijo, requeijão, catupiry, parmesão, gorgonzola, provolone, leite, creme de leite, manteiga, iogurte, ricota, cream cheese
- **Proteínas:** frango, peito, coxa, file, carne, alcatra, bacon, calabresa, linguiça, presunto, peperoni, atum, salmão, camarão
- **Hortifruti:** tomate, cebola, alho, pimentão, manjericão, rúcula, alface
- **Embalagens:** copo, tampa, sacola, caixa pizza, papel, guardanapo, canudo
- **Molhos:** molho tomate, azeitona, palmito, milho, ervilha, ketchup, maionese, mostarda
- **Bebidas:** coca, guaraná, suco, água, cerveja
- **Mercearia (Secos):** farinha, açúcar, sal, óleo, fermento, orégano
- **Confeitaria:** chocolate, granulado, leite condensado, doce de leite

### 2. Função de classificação `classificar_insumo(nome text)`
Postgres function (RPC). Ordem:

1. **Match exato** em `insumos_catalog.nome_canonico` (normalizado: lowercase, sem acento, sem plurais).
2. **Match em aliases** (`aliases @> array[normalizado]`).
3. **Match parcial por palavra-chave** — quebra o nome em tokens, procura cada token no catálogo. "MUSSARELA BARRA" → token "mussarela" → Laticínios. "FILE DE PEITO DE FRANGO RESF" → "frango" → Proteínas. **Esse passo já resolve o caso da nota atual.**
4. **Histórico do usuário:** consulta `insumos_comprados` daquela unidade — se já comprou item com nome parecido, herda categoria.
5. Se nada bater → retorna `null` (vai pra IA).

### 3. Edge function `classificar-insumo-ia` (fallback)
Quando a função SQL devolver `null`, chama Lovable AI Gateway com prompt curto pedindo JSON `{categoria, confianca}`. Modelo: `google/gemini-2.5-flash` (rápido e barato). Resposta vira INSERT em `insumos_catalog` pra próxima vez nem precisar chamar IA.

### 4. `ingest-nota-fiscal` passa a usar o classificador
Para cada item da NF: chama `classificar_insumo(nome)` antes de gravar. **Ignora a categoria que veio do GPT do n8n** — confia só no nosso classificador. Se vier `null`, marca o lançamento com `subcategoria='A Classificar'` e `confianca_classificacao=0` pra aparecer destacado na revisão.

### 5. Aprendizado contínuo
Quando o usuário **edita manualmente** a subcategoria de um lançamento de Insumo no DRE, um trigger:
- atualiza/insere alias em `insumos_catalog` com a categoria corrigida;
- atualiza `insumos_comprados` daquela unidade com mesma categoria;
- próxima nota com aquele item já entra certa.

### 6. (Opcional, fase 2) Caixa de entrada de NFs
Antes do lançamento ir pro DRE, vira `nota_fiscal_pendente` numa tela de revisão. Usuário vê item por item, confirma/corrige, clica "Aprovar nota". Só aí gera os lançamentos. Pra notas grandes vale muito; pra notas pequenas talvez seja fricção demais — por isso fase 2.

---

## Detalhes técnicos

**Arquivos / objetos novos:**
- `supabase/migrations/...` — popula `insumos_catalog` com seeds + cria `classificar_insumo(text)` RPC + cria trigger de aprendizado em `lancamentos_financeiros`
- `supabase/functions/classificar-insumo-ia/index.ts` — fallback IA com Lovable AI Gateway
- `supabase/functions/ingest-nota-fiscal/index.ts` — passa a chamar `classificar_insumo` por item

**Backfill imediato:**
```sql
-- Reclassifica os lançamentos já errados (Mussarela=Proteínas, etc.)
UPDATE lancamentos_financeiros lf
SET subcategoria = c.categoria
FROM (SELECT id, classificar_insumo(descricao) AS categoria FROM lancamentos_financeiros
      WHERE categoria='Insumos') c
WHERE lf.id = c.id AND c.categoria IS NOT NULL;
```

**Normalização de nome (chave do match parcial):**
```sql
lower(unaccent(regexp_replace(nome, '[^a-zA-Z0-9 ]', ' ', 'g')))
```
Requer extensão `unaccent` (já vem no Supabase).

---

## Resultado esperado

- Mussarela vai pra **Laticínios**, sempre.
- Filé de frango vai pra **Açougue/Proteínas**, sempre.
- Copo, tampa, sacola → **Embalagens**.
- Item desconhecido → IA decide e **aprende**. Da segunda vez nem precisa de IA.
- Você corrige uma vez no DRE → o sistema lembra pra todas as próximas notas.
- Gráfico "Para onde foi o dinheiro" para de mostrar Gaúcho Frios = tudo Proteína.

Posso seguir?