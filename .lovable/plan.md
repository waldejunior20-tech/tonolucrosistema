

## Plano: Redesign dos Cards de Precificacao seguindo Best Practices da Eleken

### Diagnostico do Layout Atual

O layout atual tem problemas claros que o artigo da Eleken ajuda a identificar:

1. **Sobrecarga de informacao** -- cada card tenta mostrar Custo, Sugerido, Seu Preco, CMV e Apps para 3 tamanhos simultaneamente. O artigo diz: "Less is more. Display only the most useful information."
2. **Falta de hierarquia visual** -- header, body e footer nao estao claramente separados. Tudo parece um bloco denso.
3. **Repeticao sem respiro** -- a grid de 3 colunas (P/M/G) com `divide-x` cria um visual de planilha, nao de card premium.
4. **Sem "entry point"** -- o artigo enfatiza que cards devem ser "entry points" com informacao resumida, expandindo para detalhes sob demanda.

### O que vou fazer

**1. Card com layout "Summary + Expand"**

Cada pizza vira um card compacto que mostra apenas o essencial:
- Nome da pizza (bold, display font) + tipo (badge discreto)
- 3 mini-blocos inline (P, M, G) mostrando apenas: preco atual e pill de CMV
- Um botao/chevron para expandir e ver os detalhes (custo, sugerido, apps)

Isso segue o principio "reveal more by drop-down" do artigo.

**2. Header limpo e funcional**

- Nome da pizza a esquerda com badge de tipo
- Indicador visual de saude geral (um unico dot verde/amarelo/vermelho)
- Sem pills de CMV repetidos no header (eles ficam no body)

**3. Body com grid respirada**

Quando expandido, cada tamanho (P/M/G) vira uma "mini-card" interna com:
- Fundo levemente diferenciado (Slate 50)
- Custo e Sugerido em layout vertical limpo
- Input de preco com o glow dinamico (mantido)
- CMV pill grande e legivel
- Apps abaixo com separador sutil

**4. Spacing e bordas refinadas**

- Gap entre cards: 16px (atualmente 16px, ok)
- Border-radius: 12px (mais rounded, como recomenda o artigo)
- Sombra sutil no repouso, mais pronunciada no hover
- Padding interno generoso (24px)

**5. Micro-animacao no expand/collapse**

- Transicao suave com `max-height` + opacity
- Stagger de 50ms entre os blocos P/M/G ao abrir

### Detalhes Tecnicos

```text
Arquivo editado:
  src/pages/PrecificacaoPizzas.tsx
    - Refatorar cada card para ter estado collapsed/expanded
    - Collapsed: nome + tipo + 3 mini-indicadores (preco + cmv pill) inline
    - Expanded: grid de 3 colunas com custo/sugerido/input/apps
    - Animacao CSS com Collapsible do Radix (ja existe no projeto)

  src/index.css
    - Adicionar classe .card-expand-transition para animacao suave
    - Ajustar border-radius e spacing dos cards
```

### O que NAO muda

- Toda a logica de calculo de CMV, custos, auto-save
- KPI cards do topo
- Paleta de cores e tipografia (Syne + JetBrains Mono)
- Bordas dinamicas dos inputs baseadas em CMV

### Resultado esperado

Cards compactos e escaneiaveis por padrao, com expansao sob demanda. Visual mais proximo de dashboards SaaS premium (como os exemplos Datawisp e Highpoint do artigo). Menos "planilha", mais "ferramenta inteligente".

