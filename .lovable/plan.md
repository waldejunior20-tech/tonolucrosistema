

## Análise Completa do SaaS — Gestão para Food Service no Brasil

### O que você já tem (sólido)

| Módulo | Status |
|--------|--------|
| Autenticação + Onboarding | Completo (email, Google, recuperação de senha) |
| Insumos Comprados e Produzidos | Completo |
| Fichas Técnicas (Pizzas, Sanduíches, Pratos, Sobremesas, Bebidas) | Completo |
| Precificação inteligente (Balcão + Apps com CMV automático) | Completo |
| Financeiro (DRE, Contas a Pagar, Ponto de Equilíbrio) | Completo |
| Promoções e Combos | Completo |
| Configurações centralizadas | Completo |
| Segurança RLS por user_id | Completo |

### O que falta — Análise do mercado brasileiro de Food Service

Analisando os concorrentes (Saipos, EPOC, Consumer, Goomer, Yooga) e as dores reais do dono de pizzaria/restaurante no Brasil, identifiquei **7 melhorias de alto impacto** ordenadas por valor:

---

### 1. Dashboard Real (PRIORIDADE ALTA)
**Problema:** O Dashboard atual é estático com dados fictícios ("24 fichas", "142 insumos").
**Solução:** Dashboard dinâmico com dados reais do banco:
- Total de fichas técnicas cadastradas
- Total de insumos
- Faturamento do mês (soma de `lancamentos_financeiros` tipo receita)
- CMV real vs meta (com semáforo)
- Gráfico de faturamento dos últimos 6 meses
- Alertas (promoções vencendo, CMV acima da meta)

### 2. Controle de Estoque Básico (DIFERENCIAL)
**Problema:** Nenhum concorrente de baixo custo oferece controle de estoque integrado à ficha técnica.
**Solução:** 
- Ao registrar uma venda/receita, dar baixa automática nos insumos baseado na ficha técnica
- Alertas de estoque mínimo
- Nova tabela `estoque_movimentacoes` com entradas (compras) e saídas (vendas)
- Relatório de necessidade de compra

### 3. Cardápio Digital / Link de Pedidos (DIFERENCIAL BRASILEIRO)
**Problema:** 72% dos pedidos no Brasil vêm pelo WhatsApp. Os donos precisam de um link de cardápio.
**Solução:**
- Gerar um link público (`/cardapio/:slug`) com os produtos precificados
- Visual bonito com categorias e fotos
- Botão "Pedir pelo WhatsApp" que monta a mensagem automaticamente
- Sem custo de app de delivery — é o grande diferencial para o pequeno empreendedor

### 4. Relatórios em PDF / Exportação
**Problema:** Dono de restaurante precisa mostrar números para sócio, contador ou banco.
**Solução:**
- Exportar DRE em PDF
- Exportar fichas técnicas em PDF (para cozinha)
- Exportar lista de compras em PDF/WhatsApp

### 5. Simulador "E se?" de Precificação
**Problema:** O dono quer saber: "Se eu aumentar 10% o preço, quanto ganho a mais?"
**Solução:**
- Tela onde ele ajusta CMV meta, lucro desejado e vê o impacto em tempo real em todos os produtos
- Comparação lado a lado: cenário atual vs simulado

### 6. Multi-unidades (Escalabilidade)
**Problema:** Quem cresce abre uma segunda loja e precisa gerenciar separado.
**Solução:**
- Adicionar campo `unidade_id` nas tabelas
- Seletor de unidade no header
- Cada unidade com seus custos fixos e precificação própria

### 7. Notificações e Lembretes
**Solução:**
- Contas a pagar vencendo hoje/amanhã
- Promoção expirando
- CMV do mês acima da meta
- Push via browser notifications ou toast ao entrar

---

### Plano de implementação sugerido

**Fase 1 (impacto imediato):**
1. Dashboard real com dados do banco + gráficos
2. Exportação de DRE e fichas técnicas em PDF

**Fase 2 (diferencial competitivo):**
3. Cardápio digital com link público + WhatsApp
4. Controle de estoque básico

**Fase 3 (escala):**
5. Simulador de cenários
6. Multi-unidades
7. Notificações

### Diferencial competitivo

O que nenhum concorrente barato faz bem no Brasil:
- **Precificação automática por canal** (Balcão vs iFood vs Rappi) — vocês já têm
- **Cardápio digital gratuito com WhatsApp** — seria killer feature
- **DRE simplificado para leigo** — vocês já têm
- **Ficha técnica + custo real integrado** — vocês já têm

O sistema já tem uma base técnica muito forte. O próximo passo mais impactante é o **Dashboard real** seguido do **Cardápio digital**.

