import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import SectionPage from "@/pages/SectionPage";
import InsumosComprados from "@/pages/InsumosComprados";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            {/* Insumos */}
            <Route path="/insumos/comprados" element={<InsumosComprados />} />
            <Route path="/insumos/produzidos" element={<SectionPage />} />
            {/* Fichas Técnicas */}
            <Route path="/fichas/tradicionais" element={<SectionPage />} />
            <Route path="/fichas/especiais" element={<SectionPage />} />
            <Route path="/fichas/premium" element={<SectionPage />} />
            <Route path="/fichas/doces" element={<SectionPage />} />
            <Route path="/fichas/sanduiches" element={<SectionPage />} />
            <Route path="/fichas/pratos" element={<SectionPage />} />
            <Route path="/fichas/sobremesas" element={<SectionPage />} />
            <Route path="/fichas/bebidas" element={<SectionPage />} />
            {/* Precificação */}
            <Route path="/precificacao/pizzas" element={<SectionPage />} />
            <Route path="/precificacao/produtos" element={<SectionPage />} />
            <Route path="/precificacao/bebidas" element={<SectionPage />} />
            {/* Financeiro */}
            <Route path="/financeiro/dre" element={<SectionPage />} />
            <Route path="/financeiro/contas-a-pagar" element={<SectionPage />} />
            <Route path="/financeiro/ponto-de-equilibrio" element={<SectionPage />} />
            {/* Promoções */}
            <Route path="/promocoes/ativas" element={<SectionPage />} />
            <Route path="/promocoes/combos" element={<SectionPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
