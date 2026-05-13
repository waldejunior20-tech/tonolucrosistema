import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import Dashboard from "@/pages/Dashboard";
import SectionPage from "@/pages/SectionPage";
import InsumosComprados from "@/pages/InsumosComprados";
import InsumosProduzidos from "@/pages/InsumosProduzidos";
import FichasTecnicasPizza from "@/pages/FichasTecnicasPizza";
import FichasTecnicasProdutos from "@/pages/FichasTecnicasProdutos";
import PrecificacaoPizzas from "@/pages/PrecificacaoPizzas";
import PrecificacaoBebidas from "@/pages/PrecificacaoBebidas";
import PrecificacaoProdutos from "@/pages/PrecificacaoProdutos";
import PrecificacaoConfiguracoes from "@/pages/PrecificacaoConfiguracoes";
import CaixaDiario from "@/pages/CaixaDiario";
import FinanceiroDRE from "@/pages/FinanceiroDRE";
import FinanceiroContasPagar from "@/pages/FinanceiroContasPagar";
import FinanceiroPontoEquilibrio from "@/pages/FinanceiroPontoEquilibrio";
import Onboarding from "@/pages/Onboarding";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import PasswordRecovery from "@/pages/PasswordRecovery";
import ResetPassword from "@/pages/ResetPassword";
import ComboSimulator from "@/pages/ComboSimulator";
import PromocoesAtivas from "@/pages/PromocoesAtivas";
import Configuracoes from "@/pages/Configuracoes";
import AutomacaoAlertas from "@/pages/AutomacaoAlertas";
import AutomacaoHistoricoPrecos from "@/pages/AutomacaoHistoricoPrecos";
import AutomacaoFichasWarnings from "@/pages/AutomacaoFichasWarnings";
import AutomacaoSaude from "@/pages/AutomacaoSaude";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function AppRoutes() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { loading: onboardingLoading, needsOnboarding } = useOnboarding();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authLoading || (session && onboardingLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Bypass de login temporario para analise de layout
  // if (!session) {
  //   return (
  //     <Routes>
  //       <Route path="/login" element={<Login />} />
  //       <Route path="/signup" element={<Signup />} />
  //       <Route path="/recovery" element={<PasswordRecovery />} />
  //       <Route path="/reset-password" element={<ResetPassword />} />
  //       <Route path="*" element={<Navigate to="/login" replace />} />
  //     </Routes>
  //   );
  // }

  // if (needsOnboarding) {
  //   return (
  //     <Routes>
  //       <Route path="/onboarding" element={<Onboarding />} />
  //       <Route path="*" element={<Navigate to="/onboarding" replace />} />
  //     </Routes>
  //   );
  // }

  // Comentado: sessao = null para bypass
  const _sessionBypass = session; // evita unused var
  void _sessionBypass;
  void needsOnboarding;

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/signup" element={<Navigate to="/" replace />} />
      <Route path="/onboarding" element={<Navigate to="/" replace />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/insumos/comprados" element={<InsumosComprados />} />
        <Route path="/insumos/produzidos" element={<InsumosProduzidos />} />
        <Route path="/fichas/pizzas" element={<FichasTecnicasPizza />} />
        <Route path="/fichas/sanduiches" element={<FichasTecnicasProdutos categoria="sanduiche" />} />
        <Route path="/fichas/pratos" element={<FichasTecnicasProdutos categoria="prato" />} />
        <Route path="/fichas/sobremesas" element={<FichasTecnicasProdutos categoria="sobremesa" />} />
        <Route path="/fichas/bebidas" element={<FichasTecnicasProdutos categoria="bebida" />} />
        <Route path="/precificacao/pizzas" element={<PrecificacaoPizzas />} />
        <Route path="/precificacao/produtos" element={<PrecificacaoProdutos />} />
        <Route path="/precificacao/bebidas" element={<PrecificacaoBebidas />} />
        <Route path="/precificacao/configuracoes" element={<PrecificacaoConfiguracoes />} />
        <Route path="/financeiro/caixa-diario" element={<CaixaDiario />} />
        <Route path="/financeiro/dre" element={<FinanceiroDRE />} />
        <Route path="/financeiro/contas-a-pagar" element={<FinanceiroContasPagar />} />
        <Route path="/financeiro/ponto-de-equilibrio" element={<FinanceiroPontoEquilibrio />} />
        <Route path="/promocoes/ativas" element={<PromocoesAtivas />} />
        <Route path="/promocoes/combos" element={<ComboSimulator />} />
        <Route path="/automacao/alertas" element={<AutomacaoAlertas />} />
        <Route path="/automacao/historico-precos" element={<AutomacaoHistoricoPrecos />} />
        <Route path="/automacao/fichas-warnings" element={<AutomacaoFichasWarnings />} />
        <Route path="/automacao/saude" element={<AutomacaoSaude />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
