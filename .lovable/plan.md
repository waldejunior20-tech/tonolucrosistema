## Diagnóstico

O erro `Uncaught Error: supabaseUrl is required` aparece **só no build publicado** (`index-CayT69OP.js`), não em dev. Causa:

- `src/integrations/supabase/client.ts` foi modificado para ler `import.meta.env.VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Em dev local, essas variáveis vêm do `.env` e funcionam.
- **No build do Lovable (preview publicado), essas variáveis NÃO são injetadas** — o pipeline do Lovable espera os valores hardcoded no arquivo (que é marcado como auto-gerado).
- Resultado: `SUPABASE_URL` chega como `undefined` no bundle → `createClient(undefined, undefined)` → crash global → tela branca.

A chave anon e a URL são **publicáveis** (já estão expostas no frontend de qualquer forma), então hardcode é seguro e é o padrão oficial Lovable.

## Correção

**1. Reverter `src/integrations/supabase/client.ts` para o padrão Lovable** com valores hardcoded:

```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://lokqongxioqbesejavdm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxva3Fvbmd4aW9xYmVzZWphdmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MDA4MDIsImV4cCI6MjA5MDE3NjgwMn0.AssUc8nJbbrcQbG5kVnlehCAw89Xy-kdh0Hg_9JlMi4";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { storage: localStorage, persistSession: true, autoRefreshToken: true }
});
```

**2. Validar:** confirmar que o dev server sobe sem warnings e republicar — o erro `supabaseUrl is required` deve sumir.

## Por que não usar `.env` no published build

O Lovable só injeta `VITE_SUPABASE_*` no ambiente de dev do sandbox. O build de produção do preview publicado lê o código-fonte direto — sem `.env`. Por isso o arquivo `client.ts` é marcado como "automatically generated. Do not edit".
