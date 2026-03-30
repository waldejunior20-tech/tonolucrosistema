import { Pizza, Package, BookOpen, Tag, TrendingUp, ArrowUpRight } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-foreground">Bem-vindo de volta 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">Aqui está o resumo do seu negócio.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Fichas Técnicas", value: "24", sub: "Produtos ativos", icon: BookOpen, trend: "+3 este mês", positive: true },
          { label: "Insumos", value: "142", sub: "Itens cadastrados", icon: Package, trend: "+12 este mês", positive: true },
          { label: "Promoções", value: "3", sub: "Campanhas ativas", icon: Tag, trend: "2 novas", positive: true },
          { label: "Faturamento", value: "R$ 0", sub: "Este mês", icon: TrendingUp, trend: "—", positive: true },
        ].map((card) => (
          <div key={card.label} className="card-premium group cursor-default">
            <div className="flex items-start justify-between mb-4">
              <p className="label-upper">{card.label}</p>
              <span className={card.positive ? "trend-positive flex items-center gap-1" : "trend-negative flex items-center gap-1"}>
                {card.trend} <ArrowUpRight size={12} />
              </span>
            </div>
            <p className="kpi-number text-foreground mb-1">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card-ember text-center">
        <div className="max-w-md mx-auto">
          <div className="w-12 h-12 rounded-sm bg-primary flex items-center justify-center text-primary-foreground mx-auto mb-4">
            <Pizza size={24} />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Comece agora</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Seu sistema de gestão está pronto. Comece cadastrando seus insumos ou criando fichas técnicas.
          </p>
          <div className="flex justify-center gap-3">
            <button className="h-10 px-6 rounded-sm bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-light transition-all shadow-button">
              Nova Ficha Técnica
            </button>
            <button className="h-10 px-6 rounded-sm border border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              Ver Relatórios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
