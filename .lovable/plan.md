## Plano: voltar ao padrão visual e arrumar a ficha do jeito certo

### Passo 1 — Você reverte primeiro (eu não toco em nada antes)

Antes de eu mexer no código, **você** abre o histórico e reverte para a versão **anterior ao redesign bege/Fraunces** (a que tinha layout normal do sistema, com os bug-fixes da busca via Popover já aplicados — aquela mensagem onde só mexi nos 4 dropdowns para usar `Popover`).

```text
[Hoje] Redesign bege Fraunces ❌ (não queremos)
[Hoje] Filtro embalagens + selects horizontais ❌ (não queremos)
[Hoje] Fix busca via Popover ✅ ← REVERTER PARA AQUI
[Hoje] Ketchup/Maionese só salgadas ✅
```

Quando você confirmar que reverteu, eu sigo para o passo 2 em cima dessa versão limpa.

### Passo 2 — Ajustes em cima da versão revertida

Tudo no arquivo `src/pages/FichasTecnicasPizza.tsx` (sem mexer em design tokens, sem fontes novas, sem fundo bege, sem italics).

**A. Extras com quantidade por sachê**

Hoje os botões "Ketchup / Maionese / Mesinha" são apenas decorativos. Vou transformar em **3 mini-cards com input numérico**:

```text
┌─ Extras ──────────────────────────────────────┐
│ 🍅 Ketchup    [ 1 ] sachê(s)   (só salgadas)  │
│ 🟡 Maionese   [ 1 ] sachê(s)   (só salgadas)  │
│ 🪑 Mesinha    [ 1 ] un.        (sempre)       │
└───────────────────────────────────────────────┘
```

- Cada extra é um insumo comprado real (já existe na tabela `insumos_comprados`, categoria "Embalagens").
- Quando você digita a quantidade, esses extras entram automaticamente nos ingredientes da ficha como linhas com `tipo_insumo = 'comprado'`, qtd igual nos 3 tamanhos (P=M=G).
- Para pizzas doces (tipo = "doce"), Ketchup e Maionese ficam desabilitados (input cinza, hint "só salgadas"). Mesinha sempre ativa.
- O custo deles entra normalmente no Total P/M/G.

**B. Auto-sugerir "Salvar como base"**

Hoje já existe o botão "Salvar como base" no rodapé. Vou adicionar uma **faixa amarela discreta** que aparece quando:
- A ficha tem ≥ 3 ingredientes preenchidos
- Ainda não existe nenhuma base padrão para pizzas (`useBasesFicha("pizza")` retorna `[]`)
- Você ainda não dispensou a sugestão nesta sessão

```text
┌─────────────────────────────────────────────────────────┐
│ 💡 Vai usar esses mesmos ingredientes em outras pizzas? │
│    [ Salvar como base padrão ]    [ Agora não ]         │
└─────────────────────────────────────────────────────────┘
```

Clicar em "Salvar como base padrão" abre o `SalvarComoBaseDialog` já existente, com `is_padrao = true` pré-marcado. A próxima ficha nova já vem com a base aplicada automaticamente.

**C. Garantir que a busca continue funcionando**

Manter os 4 `Popover` do fix anterior (busca de ingrediente + 3 buscas de embalagem P/M/G). A busca de embalagem fica **filtrada** por `categoria === "Embalagens"` (foi um bom ajuste do redesign que vou preservar).

### O que NÃO vou fazer

- ❌ Não importar Fraunces, Geist ou JetBrains Mono
- ❌ Não usar fundo bege (`#FAF7F2`)
- ❌ Não usar italics em títulos
- ❌ Não mexer em `index.html`, `src/index.css`, `tailwind.config.ts`
- ❌ Não mexer em `BaseSelector.tsx` (volta ao original na reversão)
- ❌ Não criar migrations (estrutura do banco já suporta tudo)

### Arquivos que vou editar

- `src/pages/FichasTecnicasPizza.tsx` — só este arquivo

### Resultado

- Visual idêntico ao resto do sistema (Inter, branco, bordas padrão).
- Extras com quantidade real entrando no custo.
- Sugestão proativa de criar base na primeira ficha "completa".
- Busca de ingredientes e embalagens funcionando.
