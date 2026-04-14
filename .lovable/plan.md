

## Plano: Atualizar mensagens das faixas de CMV

### Alteração única em `src/lib/pricing-helpers.ts`

Função `cmvMessage` — atualizar as 4 mensagens:

| Faixa | Mensagem atual | Nova mensagem |
|-------|---------------|---------------|
| < 25% | "Preço alto — verifique se está correto" | "Preço alto — margem acima do necessário" |
| 25–35% | "Ideal" | "Ideal — CMV dentro da faixa saudável" |
| 35–40% | "Atenção — margem apertada" | "Atenção — preço baixo, margem apertada" |
| > 40% | "Rever preços — prejuízo" | "Preço muito baixo — rever urgente" |

Cores e faixas numéricas permanecem iguais. Nenhum outro arquivo alterado.

