import { Pizza, Package, BookOpen, Tag, TrendingUp, ArrowUpRight } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bem-vindo de volta 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">Aqui está o resumo do seu negócio.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Fichas Técnicas", value: "24", sub: "Produtos ativos", icon: BookOpen, trend: "+3 este mês", color: "text-primary bg-primary/10" },
          { label: "Insumos", value: "142", sub: "Itens cadastrados", icon: Package, trend: "+12 este mês", color: "text-success bg-success/10" },
          { label: "Promoções", value: "3", sub: "Campanhas ativas", icon: Tag, trend: "2 novas", color: "text-warning bg-warning/10" },
          { label: "Faturamento", value: "R$ 0", sub: "Este mês", icon: TrendingUp, trend: "—", color: "text-info bg-info/10" },
        ].map((card) => (
          <div key={card.label} className="card-premium group cursor-default">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center ${card.color}`}>
                <card.icon className="h-5 w-5" size={20} />
              </div>
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                {card.trend} <ArrowUpRight size={12} />
              </span>
            </div>
            <p className="kpi-number">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card-premium text-center">
        <div className="max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground mx-auto mb-4">
            <Pizza size={24} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Comece agora</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Seu sistema de gestão está pronto. Comece cadastrando seus insumos ou criando fichas técnicas.
          </p>
          <div className="flex justify-center gap-3">
            <button className="h-10 px-6 rounded-full bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 transition-all shadow-button">
              Nova Ficha Técnica
            </button>
            <button className="h-10 px-6 rounded-full border border-border text-sm font-medium hover:bg-primary/5 transition-colors">
              Ver Relatórios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
