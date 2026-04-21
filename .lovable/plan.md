

# Agrupar insumos por categoria automaticamente

## O que muda
Hoje a tabela em **Insumos Comprados** mostra tudo misturado por data de cadastro. Você cadastra "Mussarela" (Laticínios) e ela aparece no topo, longe das outras proteínas/laticínios.

A ideia: ao salvar, o insumo **já aparece visualmente agrupado com os da mesma categoria**, sem você precisar filtrar.

## Como vai funcionar

**Visualização "Agrupada por categoria" (padrão novo):**

```text
🥩 PROTEÍNAS (3)
   Frango ......... R$ 18,90 / kg
   Calabresa ...... R$ 24,00 / kg
   Bacon .......... R$ 32,00 / kg

🥛 LATICÍNIOS (2)
   Mussarela ...... R$ 36,00 / kg
   Catupiry ....... R$ 28,00 / kg

📦 EMBALAGENS (1)
   Caixa Pizza G .. R$ 0,80 / un
```

- Cada categoria vira um **bloco com cabeçalho colorido** (mesma cor do `CategoryBadge` que já existe).
- Dentro do bloco: insumos ordenados por nome (A→Z).
- Categoria fica **recolhível** (clica no cabeçalho → fecha/abre).
- Contador de quantos itens em cada categoria.

**Toggle de visualização** no topo (ao lado do filtro):
- `[ Agrupada ]` ← padrão
- `[ Lista ]` ← visualização antiga (linear, ordenada por data)

O filtro de categoria existente continua funcionando em ambos os modos.

## Comportamento ao cadastrar
1. Você abre "Novo Insumo", escolhe categoria "Proteínas", salva.
2. A tela atualiza e o item **já aparece dentro do bloco "Proteínas"**, ordenado pelo nome.
3. Se a categoria estava recolhida, ela **abre automaticamente** e dá um leve highlight no item recém-criado (1 segundo) pra você ver onde caiu.

## Arquivos afetados
- `src/pages/InsumosComprados.tsx` — adicionar agrupamento + toggle de modo + lógica de auto-expand após criar.
- Nenhuma mudança de banco. Nenhuma mudança em RLS. Nenhum impacto no n8n / cascata de preços.

## Fora do escopo
- Não muda fichas técnicas, precificação ou caixa.
- Não cria nova categoria automaticamente — continua usando a lista fixa de `CATEGORIAS`.
- Não mexe em insumos próprios (essa tela é só dos comprados). Se quiser depois, replicamos lá.

