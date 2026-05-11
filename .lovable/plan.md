
# Análise: Insumos Comprados — o que está errado e o que melhorar

## 1. O que está acontecendo hoje (diagnóstico real do banco)

Rodei consulta nos seus dados. Encontrei 3 problemas concretos:

### Problema A — Itens que NÃO são insumos estão entrando na lista
Exemplos reais encontrados:
- **"Spots Comerciais No Mês De Abril"** — R$ 300,00 — fornecedor *Axion Soluções Empresariais Ltda* — categoria **"Marketing"**
- **"COPO 500"** — R$ 14,00 — fornecedor *Gaucho Frios* — categoria **"Outros"**

**Causa raiz:** a edge function `ingest-nota-fiscal` (que recebe NF do n8n/WhatsApp) joga **todo item da nota** em `insumos_comprados`, sem distinguir se é matéria-prima ou despesa de serviço/marketing. Ela só valida categoria contra uma lista fixa, e quando não bate, manda para `"Outros"` — mas categorias inválidas como **"Marketing"** estão entrando direto, fora da lista oficial de categorias do app (Proteínas, Laticínios, Hortifruti, Secos, Bebidas, Molhos, Embalagens, Congelados, Confeitaria).

Resultado: o "Spots Comerciais" aparece como insumo, mas o filtro do front (que só lista as 9 categorias fixas) **esconde** ele do agrupamento, então some da tela mas continua somando no CMV. Pior dos dois mundos.

### Problema B — Duplicatas reais por unidade/fornecedor diferente
O trigger `deduplicar_insumo_comprado` só deduplica por `lower(nome) + unidade_id`, **ignorando a unidade de medida**. Isso permitiu duplicatas legítimas no banco:

| Nome | Conflito |
|---|---|
| Fermento | cadastrado em **kg** e em **g** |
| Orégano | cadastrado em **kg** e em **g** |
| Alho | em duas categorias (Hortifruti vs Molhos) |
| Sal | em duas categorias (Molhos vs Secos) |
| Mussarela, Molho de Tomate, Farinha de Trigo, Tomate, Cebola, Óleo de Soja | dois fornecedores, preços diferentes |

A ficha técnica vai pegar **um** desses (o trigger reaponta para o de maior preço unitário), mas o usuário vê os dois na lista — confusão visual e risco de escolher o errado ao montar receita.

### Problema C — Categorias "fantasma" e unidades fora do padrão
- Categorias salvas no banco que **não existem** no select do front: `Marketing`, `Outros`.
- Unidades em **maiúsculo** (`UN`, `KG`) misturadas com as oficiais (`unidade`, `kg`) — quebra a conversão de g→kg do cálculo de custo.

---

## 2. O que melhorar (plano de correção)

### Etapa 1 — Separar despesas de insumos na ingestão de NF
Editar `supabase/functions/ingest-nota-fiscal/index.ts`:
- Detectar itens que **não são insumo** (categoria fora da whitelist OU palavras-chave: "spot", "serviço", "comercial", "publicidade", "anúncio", "consultoria", "mensalidade", etc.).
- Esses itens vão **direto para `lancamentos_financeiros`** como despesa categorizada (usando `classificar_por_palavra_chave`), **não** para `insumos_comprados`.
- Só insumos de verdade entram em `insumos_comprados`.

### Etapa 2 — Limpeza dos dados existentes (migration)
- Mover "Spots Comerciais" e qualquer item com `categoria NOT IN (lista oficial)` de `insumos_comprados` para `lancamentos_financeiros` (despesa).
- Reclassificar "COPO 500" (Outros) → **Embalagens**.
- Normalizar unidades: `UN`→`unidade`, `KG`→`kg`, `G`→`g`, `L`→`L`, `ML`→`ml`.
- Mesclar duplicatas óbvias (Fermento kg ↔ g convertendo, etc.) — revisão manual sugerida antes do merge.

### Etapa 3 — Endurecer o trigger de deduplicação
Atualizar `deduplicar_insumo_comprado` para considerar **(nome + unidade_id + unidade_medida_normalizada)**, e bloquear inserção de unidade incompatível para um nome já existente (forçar o usuário a usar a unidade já cadastrada ou renomear).

### Etapa 4 — UI: exibir "categorias órfãs" em vez de escondê-las
Em `InsumosComprados.tsx`, quando um item tem `categoria` fora da lista `CATEGORIAS`, mostrar agrupado em **"⚠ Sem categoria válida"** com botão **"Reclassificar"** (em vez de simplesmente sumir). Assim o usuário vê e corrige.

### Etapa 5 — UI: badge de duplicata
No card de cada insumo, se existir outro registro com mesmo `lower(trim(nome))` na unidade, mostrar badge **"⚠ Duplicado (2)"** com ação **"Mesclar"**.

---

## 3. Detalhes técnicos

**Arquivos afetados:**
- `supabase/functions/ingest-nota-fiscal/index.ts` — roteamento despesa vs insumo
- `supabase/migrations/...` — limpeza de dados + trigger atualizado
- `src/pages/InsumosComprados.tsx` — agrupamento "sem categoria válida" + badge duplicata

**Tabelas:** `insumos_comprados`, `lancamentos_financeiros`, `categorias_despesa` (já existe e tem palavras-chave).

**Função SQL já existente que ajuda:** `classificar_por_palavra_chave(texto)` — devolve categoria/subcategoria de despesa baseada em palavras-chave. Ideal para rotear "Spots Comerciais" → Marketing/Publicidade automaticamente.

---

## 4. Pergunta antes de implementar

Quer que eu execute o plano completo (Etapas 1-5), ou prefere começar só pela limpeza dos dados ruins (Etapa 2) + a correção da ingestão (Etapa 1) para parar o sangramento, e deixar UI/dedup para depois?
