import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { useOnboarding } from "@/hooks/useOnboarding";
import Dashboard from "@/pages/Dashboard";
import SectionPage from "@/pages/SectionPage";
import InsumosComprados from "@/pages/InsumosComprados";
import InsumosProduzidos from "@/pages/InsumosProduzidos";
import FichasTecnicasPizza from "@/pages/FichasTecnicasPizza";
import FichasTecnicasProdutos from "@/pages/FichasTecnicasProdutos";
import PrecificacaoPizzas from "@/pages/PrecificacaoPizzas";
import PrecificacaoBebidas from "@/pages/PrecificacaoBebidas";
import FinanceiroDRE from "@/pages/FinanceiroDRE";
import FinanceiroContasPagar from "@/pages/FinanceiroContasPagar";
import FinanceiroPontoEquilibrio from "@/pages/FinanceiroPontoEquilibrio";
import Onboarding from "@/pages/Onboarding";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function AppRoutes() {
  const { loading, needsOnboarding } = useOnboarding();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
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
      <Route path="/onboarding" element={<Navigate to="/" replace />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        {/* Insumos */}
        <Route path="/insumos/comprados" element={<InsumosComprados />} />
        <Route path="/insumos/produzidos" element={<InsumosProduzidos />} />
        {/* Fichas Técnicas */}
        <Route path="/fichas/tradicionais" element={<FichasTecnicasPizza />} />
        <Route path="/fichas/especiais" element={<FichasTecnicasPizza />} />
        <Route path="/fichas/premium" element={<FichasTecnicasPizza />} />
        <Route path="/fichas/doces" element={<FichasTecnicasPizza />} />
        <Route path="/fichas/sanduiches" element={<FichasTecnicasProdutos categoria="sanduiche" />} />
        <Route path="/fichas/pratos" element={<FichasTecnicasProdutos categoria="prato" />} />
        <Route path="/fichas/sobremesas" element={<FichasTecnicasProdutos categoria="sobremesa" />} />
        <Route path="/fichas/bebidas" element={<FichasTecnicasProdutos categoria="bebida" />} />
        {/* Precificação */}
        <Route path="/precificacao/pizzas" element={<PrecificacaoPizzas />} />
        <Route path="/precificacao/produtos" element={<SectionPage />} />
        <Route path="/precificacao/bebidas" element={<PrecificacaoBebidas />} />
        {/* Financeiro */}
        <Route path="/financeiro/dre" element={<FinanceiroDRE />} />
        <Route path="/financeiro/contas-a-pagar" element={<FinanceiroContasPagar />} />
        <Route path="/financeiro/ponto-de-equilibrio" element={<FinanceiroPontoEquilibrio />} />
        {/* Promoções */}
        <Route path="/promocoes/ativas" element={<SectionPage />} />
        <Route path="/promocoes/combos" element={<SectionPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
