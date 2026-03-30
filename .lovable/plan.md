

## Plano: Redesenhar sidebar no estilo do Admin Dashboard

Baseado na imagem de referência, a sidebar atual precisa de ajustes visuais para ficar mais limpa e profissional, no estilo do painel admin mostrado.

### Mudancas visuais principais

1. **Fundo da sidebar**: Mudar de `#161212` (quase preto) para um **branco/claro** (`#FFFFFF` ou usar o token `card`), seguindo o estilo claro da imagem de referência. Adicionar sombra sutil à direita em vez de border.

2. **Ícones dos módulos**: Trocar os ícones Lucide atuais por ícones de grid/quadrados (`LayoutGrid` ou `Grid2x2`) para os módulos com subitens, igual ao padrão `⊞` da imagem. Dashboard mantém seu ícone atual.

3. **Tipografia e cores dos itens**:
   - Texto do item pai: **preto/escuro** (`foreground`) com `font-semibold`
   - Subitens: cor mais suave (`muted-foreground`), sem o prefixo `→`
   - Item ativo (subitem): texto na cor primária vermelha, sem fundo colorido
   - Chevron à direita, virando para cima quando expandido (já existe)

4. **Espaçamento e indentação dos subitens**:
   - Subitens com `pl-10` (indentação generosa, sem ícone)
   - Sem bordas laterais nem bullets nos itens aninhados
   - Altura dos subitens: `h-9` com espaçamento vertical uniforme

5. **Remover barra vermelha lateral** do item ativo e o fundo `rgba(red, 0.15)`. Usar apenas cor do texto para indicar ativo.

6. **Header da sidebar**: Manter o logo TL + ToLucro, mas com cores adaptadas ao tema claro (texto escuro).

7. **Suporte a tema**: Usar variáveis CSS do design system (`bg-card`, `text-foreground`, `text-muted-foreground`) para que funcione tanto no modo claro quanto no escuro, em vez de cores hardcoded.

### Arquivos a editar

- `src/components/layout/UnifiedSidebar.tsx` — refatorar classes visuais

### O que NÃO muda
- Estrutura de dados dos itens/subitens
- Lógica de navegação e expansão
- Larguras (240px / 64px) e funcionalidade de colapsar
- Rotas e paths

