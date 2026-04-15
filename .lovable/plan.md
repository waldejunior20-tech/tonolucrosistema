

# Plan: 3 Correções Críticas Pre-Deploy

## 1. Criar página `/reset-password`

**Arquivo novo**: `src/pages/ResetPassword.tsx`
- Layout idêntico ao Login (centralizado, card, gradiente, ícone Pizza)
- Campos: nova senha + confirmar senha
- Validação: mínimo 8 caracteres, deve conter letras e números
- Usa `supabase.auth.onAuthStateChange` para detectar evento `PASSWORD_RECOVERY`
- Ao submeter: `supabase.auth.updateUser({ password })`
- Sucesso: toast + redireciona para `/`
- Erro: usa `appError("ERR-AUTH-006")`
- Novo código de erro `ERR-AUTH-006` em `error-codes.ts`

**Arquivo editado**: `src/App.tsx`
- Adicionar `import ResetPassword`
- Adicionar rota pública `<Route path="/reset-password" element={<ResetPassword />} />` nas rotas de não-autenticado E nas rotas autenticadas (o link de reset loga o usuário automaticamente)

## 2. Corrigir policy SELECT de profiles

**Migration SQL**:
```sql
DROP POLICY "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
```

Resultado: cada usuário só vê seu próprio perfil.

## 3. Leaked Password Protection

Este item requer ação manual no Supabase Dashboard — não pode ser feito via código. Vou incluir instruções claras após a implementação:
- Supabase Dashboard → Authentication → Settings → Password & Signups → Enable "Leaked password protection"

## Arquivos modificados
- **Criar**: `src/pages/ResetPassword.tsx`
- **Editar**: `src/App.tsx` (adicionar rota), `src/lib/error-codes.ts` (novo código ERR-AUTH-006)
- **Migration**: corrigir policy SELECT de profiles

