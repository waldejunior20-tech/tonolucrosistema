
import { Pizza, Package, BookOpen, Tag } from "lucide-react";
import { HealthStatus } from "@/components/HealthStatus";

export default function Dashboard() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <HealthStatus status="healthy" />

      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
          <Pizza size={40} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-syne uppercase">Dom Corleone</h1>
          <p className="text-text2 font-medium">Painel de Controle — Gestão Profissional</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Fichas Técnicas", value: "24", icon: BookOpen, sub: "Produtos ativos" },
          { label: "Insumos", value: "142", icon: Package, sub: "Itens em estoque" },
          { label: "Promoções", value: "3", icon: Tag, sub: "Campanhas rodando" },
        ].map((card) => (
          <div key={card.label} className="card-premium p-6 group">
            <div className="flex justify-between items-start mb-4">
              <p className="label-upper">{card.label}</p>
              <card.icon className="text-text3 group-hover:text-primary transition-colors" size={20} />
            </div>
            <p className="kpi-number mb-1">{card.value}</p>
            <p className="text-[11px] text-text3 font-medium">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="card-premium p-12 text-center bg-surface2/50 border-dashed border-2">
        <div className="max-w-md mx-auto">
          <h3 className="text-xl mb-2">Bem-vindo, Chef!</h3>
          <p className="text-text2 mb-8">
            Seu ecossistema de gestão está pronto. Comece revisando suas fichas técnicas ou atualizando os preços dos insumos.
          </p>
          <div className="flex justify-center gap-4">
            <button className="btn-3d-red">Nova Ficha</button>
            <button className="btn-3d-ghost">Ver Relatórios</button>
          </div>
        </div>
      </div>
    </div>
  );
}
