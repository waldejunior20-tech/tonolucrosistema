# Plano: Arquitetura híbrida n8n + Edge Function para Notas Fiscais

## Objetivo

Acabar com o ciclo de erros (credencial Postgres apagada, IF frágil, `user_id null`) **sem abandonar o n8n**. O n8n continua fazendo o que faz bem (WhatsApp + GPT Vision visual). A gravação no banco vai pra uma edge function Supabase, que é blindada contra esses problemas.

---

## Divisão de responsabilidades

```text
┌─────────────────────┐      ┌──────────────────────────┐      ┌──────────────────────┐
│  WhatsApp / Upload  │ ───▶ │  n8n workflow             │ ───▶ │  Edge Function        │
│  manual no app      │      │  Ttd6M0adQ1ZMmXGt         │      │  ingest-nota-fiscal   │
└─────────────────────┘      │                           │      │                       │
                             │  1. Recebe webhook        │      │  1. Resolve user_id   │
                             │  2. Identifica numero     │      │     a partir do       │
                             │  3. GPT Vision extrai     │      │     whatsapp_number   │
                             │     itens da nota         │      │  2. Insere em         │
                             │  4. POST único pra        │      │     insumos_comprados │
                             │     edge function         │      │  3. Insere em         │
                             └───────────────────────────┘      │     lancamentos_fin   │
                                                                │  4. Registra em       │
                                                                │     workflow_runs     │
                                                                └──────────────────────┘
```

**O n8n vira um cliente HTTP simples.** Zero credenciais Postgres, zero nó IF frágil, zero resolução de IDs espalhada.

---

## Etapas de implementação

### Etapa 1 — Edge Function `ingest-nota-fiscal`

Cria `supabase/functions/ingest-nota-fiscal/index.ts` que:

- Aceita POST com payload:
  ```json
  {
    "whatsapp_number": "5511999999999",  // OU user_id+unidade_id direto
    "user_id": "uuid",                    // opcional se vier whatsapp_number
    "unidade_id": "uuid",                 // opcional se vier whatsapp_number
    "fornecedor": "Atacadão",
    "data_compra": "2026-04-30",
    "itens": [
      { "nome": "Mussarela", "categoria": "Laticínios",
        "quantidade": 5, "unidade": "kg", "preco_pago": 180 }
    ]
  }
  ```
- Resolve `user_id`/`unidade_id` via `whatsapp_users` se não vierem no payload
- Valida com Zod (tipos corretos, sem string-vs-boolean drama)
- Insere todos os itens em `insumos_comprados` (transação)
- Insere despesa total em `lancamentos_financeiros`
- Registra `workflow_runs` (sucesso/erro com detalhes)
- Retorna `{ success, itens_inseridos, run_id }`
- Usa `SUPABASE_SERVICE_ROLE_KEY` internamente (nunca exposta) — credencial gerenciada pelo Supabase, **não pode sumir**
- Autenticação: header `x-api-key` validando contra secret `N8N_INGEST_SECRET` (n8n manda esse header)

### Etapa 2 — Adicionar secret `N8N_INGEST_SECRET`

Token aleatório forte que o n8n usa pra autenticar contra a edge function. Gero e adiciono via `add_secret`.

### Etapa 3 — Simplificar o workflow n8n

Atual: ~10 nós (Webhook → Set → Resolver IDs → Mesclar → IF → Loop Postgres → ...)

Novo: **4 nós**
1. **Webhook** (recebe mensagem WhatsApp)
2. **GPT Vision** (extrai JSON estruturado da imagem)
3. **HTTP Request** (POST pra edge function com header `x-api-key`)
4. **Respond to Webhook** (devolve OK pro WhatsApp)

Removo todos os nós Postgres → fim do problema de credencial perdida.
Removo o IF "Precisa Buscar WhatsApp?" → fim do erro boolean.
Removo "Mesclar IDs" → edge function resolve tudo.

### Etapa 4 — Atualizar `src/lib/n8n-webhook.ts`

Mantém o mesmo helper, mas agora o app pode escolher:
- **Via n8n** (fluxo normal pra WhatsApp)
- **Direto na edge function** (pra upload manual de nota fiscal pelo app, sem passar pelo n8n)

Adiciono função `enviarNotaFiscalDireto()` que chama a edge function via `supabase.functions.invoke()`.

### Etapa 5 — Testes end-to-end

1. `curl_edge_functions` com payload de teste → confirma gravação em `insumos_comprados` + `lancamentos_financeiros` + `workflow_runs`
2. `test_workflow` no n8n com pin data → confirma que o POST chega na edge
3. Teste real via WhatsApp → fluxo completo

---

## Detalhes técnicos

**Tabelas afetadas (já existem, sem migração):**
- `insumos_comprados` (INSERT) — tem `unidade_id`, `user_id`, todas as colunas necessárias
- `lancamentos_financeiros` (INSERT) — tipo='despesa', categoria='Insumos'
- `workflow_runs` (INSERT) — registra cada execução
- `whatsapp_users` (SELECT) — resolve user_id/unidade_id por número

**RLS:** Edge function usa service role, então bypassa RLS. Mas valida `is_member_of_unidade` em código antes de inserir, pra evitar gravar em unidade errada se whatsapp_users tiver dado ruim.

**Logs:** Tudo cai em `workflow_runs.metadata` + edge function logs do Supabase. Posso ler com `supabase--edge_function_logs` quando algo der errado.

**Validação:**
- `whatsapp_number` formato E.164 (só dígitos, 10-15 chars)
- `itens[].quantidade > 0`, `preco_pago > 0`
- `categoria` deve ser uma das 9 conhecidas (`Proteínas`, `Laticínios`, etc.) — fallback `Outros`
- `unidade` deve ser uma das 7 conhecidas — fallback `unidade`

**Idempotência:** edge function aceita header opcional `x-idempotency-key` (n8n manda o execution_id). Se já existir um `workflow_runs` com esse trigger_record_id, retorna o resultado anterior em vez de duplicar.

---

## O que isso resolve

| Problema | Como resolve |
|---|---|
| Credencial Postgres some no n8n | Edge function não usa credencial — service role injetada pelo Supabase |
| IF "Precisa Buscar WhatsApp?" erro boolean | Removido. Lógica em TS type-safe |
| `user_id null` quando webhook vem vazio | Edge function rejeita com 400 + mensagem clara |
| Difícil testar gravação | `curl_edge_functions` testa direto, sem n8n |
| Sem visibilidade de erros | `workflow_runs` + edge logs estruturados |
| Workflow n8n complexo (10 nós) | Simplificado pra 4 nós |

---

## Aprovação

Posso começar pela **Etapa 1 (edge function)** + **Etapa 2 (secret)**? Depois disso testo via curl e só então mexo no n8n. Assim nada quebra no meio do caminho.