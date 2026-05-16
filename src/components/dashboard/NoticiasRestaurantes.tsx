import { useState } from "react";
import {
  ArrowUpRight, RefreshCw, TrendingUp, TrendingDown,
  AlertTriangle, Building2, ExternalLink,
} from "lucide-react";

interface NoticiaRestaurante {
  id: number;
  titulo: string;
  fonte: "ABRASEL" | "ANR" | "MERCADO" | "DELIVERY";
  linkFonte: string;
  statusVendas: "alta" | "baixa" | "alerta" | "neutro";
  badgeTexto: string;
  tempo: string;
  resumo: string;
}

const NOTICIAS: NoticiaRestaurante[] = [
  {
    id: 1,
    titulo: "Faturamento das pizzarias e bares registra alta de 14% no Centro-Oeste impulsionado pelo calor e delivery",
    fonte: "ABRASEL",
    linkFonte: "https://abrasel.com.br",
    statusVendas: "alta",
    badgeTexto: "Vendas em Alta",
    tempo: "há 5 min",
    resumo: "O movimento de sexta-feira superou as expectativas na região devido ao aumento de pedidos pelo ecossistema de delivery local e consumo de balcão.",
  },
  {
    id: 2,
    titulo: "Preço do queijo muçarela e óleo de soja registra nova alta de 6.8% nesta semana e pressiona o CMV",
    fonte: "MERCADO",
    linkFonte: "https://anrbrasil.org.br",
    statusVendas: "baixa",
    badgeTexto: "Alerta de Custos",
    tempo: "há 22 min",
    resumo: "Donos de restaurantes devem revisar as fichas técnicas imediatamente para evitar perda de margem de lucro operacional na precificação do cardápio.",
  },
  {
    id: 3,
    titulo: "ANR publica guia de orientação tributária sobre a exclusão de taxas de aplicativos na base de cálculo do Simples",
    fonte: "ANR",
    linkFonte: "https://anrbrasil.org.br",
    statusVendas: "neutro",
    badgeTexto: "Contabilidade",
    tempo: "há 1 hora",
    resumo: "Medida visa reduzir o impacto fiscal sobre o faturamento bruto que passa por intermediadores de pedidos de delivery.",
  },
  {
    id: 4,
    titulo: "Queda na instabilidade: Aplicativos de entrega registram lentidão em pagamentos via Pix nesta manhã",
    fonte: "DELIVERY",
    linkFonte: "https://abrasel.com.br",
    statusVendas: "alerta",
    badgeTexto: "Instabilidade",
    tempo: "há 2 horas",
    resumo: "Restaurantes relatam atrasos na confirmação automática de pedidos integrados ao PDV. Recomendável conferir o extrato da conta temporariamente.",
  },
  {
    id: 5,
    titulo: "Tendência: Consumidores reduzem ticket médio no salão, mas aumentam frequência de pedidos de combos familiares no delivery",
    fonte: "MERCADO",
    linkFonte: "https://abrasel.com.br",
    statusVendas: "neutro",
    badgeTexto: "Comportamento",
    tempo: "há 3 horas",
    resumo: "Estratégia recomendada para o fim de semana é focar em cupons de fidelidade e combos de pizzas grandes com bebida inclusa.",
  },
];

const renderStatusIcon = (status: string) => {
  switch (status) {
    case "alta": return <TrendingUp className="text-emerald-500 w-4 h-4" />;
    case "baixa": return <TrendingDown className="text-rose-500 w-4 h-4" />;
    case "alerta": return <AlertTriangle className="text-amber-500 w-4 h-4" />;
    default: return <Building2 className="text-blue-500 w-4 h-4" />;
  }
};

const getBadgeClass = (status: string) => {
  switch (status) {
    case "alta": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "baixa": return "bg-rose-50 text-rose-700 border-rose-200";
    case "alerta": return "bg-amber-50 text-amber-700 border-amber-200";
    default: return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

export function NoticiasRestaurantes() {
  const [loading, setLoading] = useState(false);
  const [ultimoRefresco, setUltimoRefresco] = useState(() =>
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  );

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setUltimoRefresco(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    }, 800);
  };

  return (
    <div className="w-full p-5 bg-white rounded-xl shadow-md border border-slate-200 font-sans">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 mb-5 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Radar do Dono de Restaurante</h2>
            <span className="flex items-center gap-1 text-[11px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100 animate-pulse">
              LIVE MARKET
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Indicadores de vendas, custos e atualizações institucionais da Abrasel e ANR.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <span className="text-[11px] text-slate-400">Atualizado às {ultimoRefresco}</span>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all text-slate-600 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-blue-600" : ""} />
          </button>
        </div>
      </div>

      {/* Links das entidades */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <a href="https://abrasel.com.br" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 rounded-lg transition-colors group">
          <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-600">Portal Abrasel Nacional</span>
          <ExternalLink size={13} className="text-slate-400 group-hover:text-blue-500" />
        </a>
        <a href="https://anrbrasil.org.br" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 rounded-lg transition-colors group">
          <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-600">Portal ANR Consultas</span>
          <ExternalLink size={13} className="text-slate-400 group-hover:text-blue-500" />
        </a>
      </div>

      {/* Lista */}
      <div className="space-y-4">
        {NOTICIAS.map((item) => (
          <div
            key={item.id}
            className="p-4 border border-slate-100 rounded-xl hover:border-slate-200 bg-gradient-to-r from-white to-slate-50/30 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getBadgeClass(item.statusVendas)} flex items-center gap-1`}>
                  {renderStatusIcon(item.statusVendas)}
                  {item.badgeTexto}
                </span>
                <span className="text-[11px] text-slate-400">•</span>
                <span className="text-[11px] text-slate-400 font-medium">{item.tempo}</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-800 leading-snug">
                {item.titulo}
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                {item.resumo}
              </p>
            </div>

            <a
              href={item.linkFonte}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all shadow-sm shrink-0 group self-end md:self-center"
            >
              Ver na {item.fonte}
              <ArrowUpRight size={14} className="text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
