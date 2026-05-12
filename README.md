# TonoLucro Sistema

Sistema completo de gestão financeira e operacional para pizzarias, lanchonetes e restaurantes. Controle de insumos, precificação, DRE, caixa diário, fichas técnicas, combos e análise de saúde do negócio — tudo em um só lugar.

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + Vite 5 + TypeScript 5 |
| Estilização | Tailwind CSS v3 + shadcn/ui |
| Estado & Dados | TanStack Query (React Query) |
| Backend / Banco | Supabase (PostgreSQL + Edge Functions) |
| Automação | n8n (ingestão de Notas Fiscais) |
| Testes | Vitest + Playwright |
| Package Manager | Bun |

---

## Como rodar localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) 18+ (ou [Bun](https://bun.sh/) 1.0+)
- Conta no [Supabase](https://supabase.com/) (projeto configurado)

### 1. Clone o repositório
```bash
git clone <url-do-repo>
cd tonolucro-sistema
```

### 2. Instale as dependências
```bash
bun install
```

> Se preferir npm: `npm install` (os lockfiles do Bun serão ignorados).

### 3. Configure as variáveis de ambiente
```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais do Supabase:

| Variável | Onde encontrar |
|----------|----------------|
| `VITE_SUPABASE_PROJECT_ID` | Settings → General → Project ID (Supabase Dashboard) |
| `VITE_SUPABASE_URL` | Settings → API → URL (Supabase Dashboard) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Settings → API → `anon` public key (Supabase Dashboard) |

### 4. Rode o servidor de desenvolvimento
```bash
bun run dev
```

Acesse em `http://localhost:5173`.

### 5. Rodar testes
```bash
bun run test          # unitários (Vitest)
bun run test:watch    # modo watch
```

---

## Deploy

### Supabase Edge Functions
```bash
supabase functions deploy
```

### Frontend (Vite build)
```bash
bun run build
```

O diretório `dist/` pode ser servido por qualquer CDN estática (Vercel, Netlify, Cloudflare Pages, etc.).

> O projeto foi criado com [Lovable](https://lovable.dev) e sincroniza automaticamente com o preview/published URL.

---

## Variáveis de Ambiente

Veja `.env.example` para o template completo. **Nunca commite o arquivo `.env`** — ele já está listado no `.gitignore`.

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `VITE_SUPABASE_PROJECT_ID` | ID do projeto Supabase | Sim |
| `VITE_SUPABASE_URL` | URL do projeto Supabase | Sim |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública (anon) do Supabase | Sim |
| `N8N_INGEST_SECRET` | Secret para webhook de ingestão de NF | Não |
| `N8N_INGEST_SECRET_NEW` | Secret alternativo para webhook | Não |
| `LOVABLE_API_KEY` | Chave da AI Gateway da Lovable | Não |

---

## Arquitetura de Automação (n8n)

```
WhatsApp (Evolution API)
    │
    ▼
n8n Webhook (nf-whatsapp-v3)
    │
    ├─► Google Vision OCR ──► Gemini 2.5 Flash (parse)
    │                              │
    │                              ▼
    │                     Edge Function: ingest-nota-fiscal
    │                         │
    │                         ├─► classificar_e_upsert_insumo (SQL 6 camadas)
    │                         ├─► classificar-insumo-ia (Gemini, se confiança < 0.7)
    │                         ├─► insumos_comprados (live row)
    │                         ├─► insumos_compras_historico (evento imutável)
    │                         └─► notas_fiscais_pendentes (se confiança < 0.85)
    │
    └─► WhatsApp: resposta formatada
```

### Estrutura de Pastas

```
tonolucro-sistema/
├── src/                           # Frontend React
│   ├── components/                # Componentes reutilizáveis
│   ├── hooks/                     # Custom hooks (queries, mutations)
│   ├── lib/                       # Utilidades e helpers
│   └── pages/                     # Páginas do app
├── supabase/
│   ├── functions/                 # Edge Functions (Deno)
│   │   ├── ingest-nota-fiscal/    # Ingestão de NF (principal)
│   │   ├── classificar-insumo-ia/ # Classificação IA (Gemini)
│   │   ├── cascata-preco-cmv/     # Cascata de preços
│   │   └── n8n-helpers/           # Módulos compartilhados
│   └── migrations/                # Migrações SQL
├── .env.example                   # Template de variáveis
└── package.json
```

---

## Principais Funcionalidades

- **Controle de Insumos** — Catálogo canônico com classificação inteligente e aprendizado contínuo.
- **Notas Fiscais** — Ingestão automática via webhook N8N; cada item vira um lançamento DRE categorizado.
- **DRE (Demonstração de Resultados)** — Visualização interativa com drill-down por categoria, fornecedor e mês.
- **Fichas Técnicas** — Receitas para pizzas e produtos com cálculo automático de custo.
- **Precificação** — Sugestão de preço considerando CMV, taxas do app e margem desejada.
- **Caixa Diário** — Lançamento rápido de vendas e fechamento de caixa.
- **Combos & Promoções** — Simulador de impacto na margem.
- **Alertas** — Notificação de variação de preço de insumos.
- **Multi-unidade** — Suporte a filiais/franquias com isolamento de dados.

---

## Licença

Privado — Todos os direitos reservados.
