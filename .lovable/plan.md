

## Plano: Adicionar Login com Google

### O que muda para o usuário
Um botão "Entrar com Google" aparecerá nas páginas de Login e Cadastro, permitindo acesso rápido sem precisar digitar email e senha.

### Configuração necessária no Supabase (manual)

Antes de funcionar, você precisará configurar o Google OAuth no painel do Supabase e no Google Cloud Console:

1. **Google Cloud Console** (https://console.cloud.google.com):
   - Criar um projeto (ou usar existente)
   - Ir em APIs & Services > Credentials > Create OAuth Client ID (Web application)
   - Em "Authorized JavaScript origins": adicionar `https://id-preview--661827de-d1a0-4733-8b47-293c9eeb6611.lovable.app` (e seu domínio final quando publicar)
   - Em "Authorized redirect URIs": adicionar `https://lokqongxioqbesejavdm.supabase.co/auth/v1/callback`
   - Copiar o **Client ID** e **Client Secret**

2. **Supabase Dashboard** (https://supabase.com/dashboard/project/lokqongxioqbesejavdm/auth/providers):
   - Ativar o provider "Google"
   - Colar o Client ID e Client Secret obtidos acima

### Alterações no código

1. **`src/pages/Login.tsx`** — Adicionar botão "Entrar com Google" que chama `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`

2. **`src/pages/Signup.tsx`** — Adicionar o mesmo botão com separador visual "ou"

3. **`src/App.tsx`** — Nenhuma alteração necessária; o `onAuthStateChange` já captura sessões OAuth

### Detalhes técnicos

- Usar `signInWithOAuth` do Supabase JS SDK (já instalado)
- O `redirectTo` aponta para a origem atual, garantindo que o callback funcione em preview e produção
- O trigger `handle_new_user` já existente criará o perfil automaticamente no signup via Google
- O botão usará um ícone SVG do Google inline para manter a identidade visual padrão

