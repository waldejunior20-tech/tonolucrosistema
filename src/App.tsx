import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DesktopOnlyGuard } from "@/components/layout/DesktopOnlyGuard";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import Dashboard from "@/pages/Dashboard";
import SectionPage from "@/pages/SectionPage";
import InsumosComprados from "@/pages/InsumosComprados";
import InsumosProduzidos from "@/pages/InsumosProduzidos";
import InsumosHistoricoCompras from "@/pages/InsumosHistoricoCompras";
import InsumosDuplicados from "@/pages/InsumosDuplicados";
import InsumosRevisar from "@/pages/InsumosRevisar";
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
import FichaPizzaEditorMock from "@/pages/FichaPizzaEditorMock";
import { InstallPrompt } from "@/pwa/InstallPrompt";
import { UpdateToast } from "@/pwa/UpdateToast";

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

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/recovery" element={<PasswordRecovery />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (needsOnboarding) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/signup" element={<Navigate to="/" replace />} />
      <Route path="/onboarding" element={<Navigate to="/" replace />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/fichas/pizza/editor-mock" element={<FichaPizzaEditorMock />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/insumos/comprados" element={<InsumosComprados />} />
        <Route path="/compras/historico" element={<InsumosHistoricoCompras />} />
        <Route path="/insumos/comprados/historico" element={<Navigate to="/compras/historico" replace />} />
        <Route path="/insumos/comprados/revisar" element={<InsumosRevisar />} />
        <Route path="/insumos/comprados/duplicados" element={<InsumosDuplicados />} />
        <Route path="/insumos/produzidos" element={<DesktopOnlyGuard feature="Pré-preparo / Insumos produzidos"><InsumosProduzidos /></DesktopOnlyGuard>} />
        <Route path="/fichas/pizzas" element={<DesktopOnlyGuard feature="Fichas técnicas de pizza"><FichasTecnicasPizza /></DesktopOnlyGuard>} />
        <Route path="/fichas/sanduiches" element={<DesktopOnlyGuard feature="Fichas técnicas de sanduíches"><FichasTecnicasProdutos key="sanduiche" categoria="sanduiche" /></DesktopOnlyGuard>} />
        <Route path="/fichas/pratos" element={<DesktopOnlyGuard feature="Fichas técnicas de pratos"><FichasTecnicasProdutos key="prato" categoria="prato" /></DesktopOnlyGuard>} />
        <Route path="/fichas/sobremesas" element={<DesktopOnlyGuard feature="Fichas técnicas de sobremesas"><FichasTecnicasProdutos key="sobremesa" categoria="sobremesa" /></DesktopOnlyGuard>} />
        <Route path="/fichas/bebidas" element={<DesktopOnlyGuard feature="Fichas técnicas de bebidas"><FichasTecnicasProdutos key="bebida" categoria="bebida" /></DesktopOnlyGuard>} />
        <Route path="/precificacao/pizzas" element={<DesktopOnlyGuard feature="Precificação de pizzas (P/M/G)"><PrecificacaoPizzas /></DesktopOnlyGuard>} />
        <Route path="/precificacao/produtos" element={<DesktopOnlyGuard feature="Precificação de produtos"><PrecificacaoProdutos /></DesktopOnlyGuard>} />
        <Route path="/precificacao/bebidas" element={<DesktopOnlyGuard feature="Precificação de bebidas"><PrecificacaoBebidas /></DesktopOnlyGuard>} />
        <Route path="/precificacao/configuracoes" element={<DesktopOnlyGuard feature="Configurações de precificação"><PrecificacaoConfiguracoes /></DesktopOnlyGuard>} />
        <Route path="/financeiro/caixa-diario" element={<CaixaDiario />} />
        <Route path="/financeiro/dre" element={<FinanceiroDRE />} />
        <Route path="/financeiro/contas-a-pagar" element={<FinanceiroContasPagar />} />
        <Route path="/financeiro/ponto-de-equilibrio" element={<FinanceiroPontoEquilibrio />} />
        <Route path="/promocoes" element={<Navigate to="/promocoes/ativas" replace />} />
        <Route path="/promocoes/ativas" element={<PromocoesAtivas />} />
        <Route path="/promocoes/combos" element={<DesktopOnlyGuard feature="Simulador de combos"><ComboSimulator /></DesktopOnlyGuard>} />
        <Route path="/automacao/alertas" element={<AutomacaoAlertas />} />
        <Route path="/automacao/historico-precos" element={<AutomacaoHistoricoPrecos />} />
        <Route path="/automacao/fichas-warnings" element={<AutomacaoFichasWarnings />} />
        <Route path="/automacao/saude" element={<AutomacaoSaude />} />
        <Route path="/configuracoes" element={<DesktopOnlyGuard feature="Configurações avançadas"><Configuracoes /></DesktopOnlyGuard>} />
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
            <InstallPrompt />
            <UpdateToast />
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
