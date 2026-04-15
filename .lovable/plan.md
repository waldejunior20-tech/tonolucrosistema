

# Plan: Sistema de Códigos de Erro Padronizado

## Problema
Quando um erro aparece no app, a mensagem é genérica (ex: "Erro ao salvar"), dificultando a identificação da origem do problema.

## Solução
Criar um sistema de códigos de erro únicos (ex: `ERR-CFG-001`) que aparecem junto com a mensagem no toast, permitindo rastreamento imediato.

## Estrutura dos Códigos

```text
ERR-{MÓDULO}-{NÚMERO}

Módulos:
  AUTH  → Login, Signup, Recovery
  CFG   → Configurações (negócio + precificação)
  INS   → Insumos (comprados/produzidos)
  FTP   → Fichas Técnicas (pizza/produtos)
  PRC   → Precificação (pizzas/produtos/bebidas)
  FIN   → Financeiro (DRE/Caixa/Contas)
  PRO   → Promoções/Combos
  DSH   → Dashboard
```

Exemplo no toast: `[ERR-CFG-001] Erro ao salvar configurações.`

## Implementação

### 1. Criar arquivo `src/lib/error-codes.ts`
Mapa centralizado de todos os códigos com mensagens padrão. Uma função helper `appError(code, detalhes?)` que formata a mensagem com o código.

### 2. Atualizar todos os `toast.error()` em ~19 arquivos
Substituir cada chamada genérica pelo código correspondente:

| Arquivo | Erro atual | Código |
|---------|-----------|--------|
| `Login.tsx` | "Erro ao fazer login" | ERR-AUTH-001 |
| `Login.tsx` | "Erro ao fazer login com Google" | ERR-AUTH-002 |
| `Signup.tsx` | "As senhas não coincidem" | ERR-AUTH-003 |
| `Signup.tsx` | "Erro ao criar conta" | ERR-AUTH-004 |
| `PasswordRecovery.tsx` | "Erro ao enviar email" | ERR-AUTH-005 |
| `Configuracoes.tsx` | "Erro ao salvar configurações" | ERR-CFG-001 |
| `PrecificacaoConfiguracoes.tsx` | "Erro ao salvar configurações" | ERR-CFG-002 |
| `InsumosComprados.tsx` | "Erro ao cadastrar insumo" | ERR-INS-001 |
| `InsumosComprados.tsx` | "Erro ao atualizar insumo" | ERR-INS-002 |
| `InsumosComprados.tsx` | "Erro ao excluir insumo" | ERR-INS-003 |
| `InsumosComprados.tsx` | "Preencha todos os campos" | ERR-INS-004 |
| `InsumosProduzidos.tsx` | cadastrar/atualizar/excluir | ERR-INS-010..012 |
| `FichasTecnicasPizza.tsx` | cadastrar/atualizar/excluir | ERR-FTP-001..003 |
| `FichasTecnicasProdutos.tsx` | cadastrar/atualizar/excluir | ERR-FTP-010..012 |
| `PrecificacaoPizzas.tsx` | "Erro ao salvar preço/config" | ERR-PRC-001..002 |
| `PrecificacaoProdutos.tsx` | erros de save | ERR-PRC-010+ |
| `PrecificacaoBebidas.tsx` | erros de save | ERR-PRC-020+ |
| `CaixaDiario.tsx` | "Erro ao salvar" | ERR-FIN-001 |
| `CaixaRapido.tsx` | "Erro ao salvar" | ERR-FIN-002 |
| `FinanceiroDRE.tsx` | "Erro ao salvar" | ERR-FIN-010..011 |
| `FinanceiroContasPagar.tsx` | "Erro ao salvar" | ERR-FIN-020 |
| `PromocoesAtivas.tsx` | erros | ERR-PRO-001+ |
| `ComboSimulator.tsx` | erros | ERR-PRO-010+ |

### 3. Formato do toast
```
toast.error(`[ERR-CFG-001] Erro ao salvar configurações.`)
```

Também logará `console.error` com detalhes técnicos do erro original para debugging no DevTools.

## Arquivos modificados
- **Criar**: `src/lib/error-codes.ts`
- **Editar**: ~19 arquivos (todas as páginas com toast.error)

