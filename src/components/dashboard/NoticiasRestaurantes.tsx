import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight, RefreshCw, TrendingUp, TrendingDown,
  AlertTriangle, Building2, ExternalLink, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface NoticiaRestaurante {
  id: string;
  titulo: string;
  fonte: string;
  linkFonte: string;
  statusVendas: "alta" | "baixa" | "alerta" | "neutro";
  badgeTexto: string;
  tempo: string;
  resumo: string;
}

async function fetchNoticias(): Promise<NoticiaRestaurante[]> {
  const { data, error } = await supabase.functions.invoke("noticias-setor");
  if (error) throw new Error(error.message);
  return (data?.noticias || []) as NoticiaRestaurante[];
}

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
  const {
    data: noticias = [], isLoading, isError, refetch, isFetching, dataUpdatedAt,
  } = useQuery({
    queryKey: ["noticias-setor", "v2"],
    queryFn: fetchNoticias,
    staleTime: 1000 * 60 * 10,
    refetchInterval: 1000 * 60 * 15,
    refetchOnMount: "always",
  });

  const ultimoRefresco = new Date(dataUpdatedAt || Date.now())
    .toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

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
            Notícias reais do setor — Food Service News, Mercado&amp;Consumo, ABRASEL e Forbes Gastronomia.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <span className="text-[11px] text-slate-400">Atualizado às {ultimoRefresco}</span>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all text-slate-600 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={15} className={isFetching ? "animate-spin text-blue-600" : ""} />
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

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
          <Loader2 size={28} className="animate-spin text-blue-600" />
          <p className="text-sm">Buscando notícias reais do setor...</p>
        </div>
      )}

      {/* Erro */}
      {isError && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">
          Não foi possível carregar as notícias. Tente atualizar.
        </div>
      )}

      {/* Lista */}
      {!isLoading && !isError && noticias.length === 0 && (
        <p className="text-center py-8 text-sm text-slate-400">Nenhuma notícia encontrada agora.</p>
      )}

      <div className="space-y-4">
        {noticias.map((item) => (
          <div
            key={item.id}
            className="p-4 border border-slate-100 rounded-xl hover:border-slate-200 bg-gradient-to-r from-white to-slate-50/30 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex-1 space-y-1.5 min-w-0">
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
              {item.resumo && (
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {item.resumo}
                </p>
              )}
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
