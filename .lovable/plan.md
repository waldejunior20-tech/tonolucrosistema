## Objetivo
Restaurar a IA do app (que parou ao sobrescrever `LOVABLE_API_KEY` com valor inválido) e validar a integração n8n → edge function `ingest-nota-fiscal`.

## Passos

1. **Rotacionar `LOVABLE_API_KEY`** via `ai_gateway--rotate_lovable_api_key`.
   - Gera chave nova válida automaticamente.
   - Salva no Supabase sem expor o valor — você não precisa copiar nada.
   - IA do app volta a funcionar imediatamente.

2. **Confirmar `N8N_INGEST_SECRET`** no Supabase.
   - Valor `n8n_ts_7K9mP2xQwR8vL4nH6jF3bC5dY1aZ0sE9uI2oA7pN4kM8gT5` já salvo — OK, não mexer.

3. **Testar a edge function `ingest-nota-fiscal`** via `supabase--curl_edge_functions`:
   - POST com header `x-api-key: <secret>` e payload de exemplo.
   - Confirmar resposta 200 + gravação em `insumos_comprados`, `lancamentos_financeiros`, `workflow_runs`.
   - Ler logs com `supabase--edge_function_logs` se algo falhar.

4. **Validar lado do n8n** (depende de você ter colado o mesmo secret no EasyPanel).
   - Se já colou: disparo um teste no workflow.
   - Se não: te oriento o passo no EasyPanel.

## O que NÃO vou fazer
- Não alterar código da edge function.
- Não modificar o workflow n8n.
- Não tocar em outros secrets.

## Aprovação
Aprove este plano para eu executar a rotação e os testes.