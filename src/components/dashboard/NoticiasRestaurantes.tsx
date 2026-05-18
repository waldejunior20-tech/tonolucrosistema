import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Loader2, ExternalLink } from "lucide-react";
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

const tagClass = (status: string) => {
  switch (status) {
    case "alta": return "bg-emerald-50 text-emerald-700";
    case "baixa": return "bg-rose-50 text-rose-700";
    case "alerta": return "bg-amber-100 text-amber-800";
    default: return "bg-blue-50 text-blue-700";
  }
};

const PORTAIS = [
  { nome: "Portal Abrasel Nacional", url: "https://abrasel.com.br/noticias/" },
  { nome: "Portal ANR Consultas", url: "https://anrbrasil.org.br/new/category/noticias/" },
];

export function NoticiasRestaurantes() {
  const { data: noticias = [], isLoading, isError, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["noticias-setor", "v3"],
    queryFn: fetchNoticias,
    staleTime: 1000 * 60 * 10,
    refetchInterval: 1000 * 60 * 15,
    refetchOnMount: "always",
  });

  const horaAtualizado = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "--:--";

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm font-sans">
      <div className="flex items-start justify-between mb-5 gap-4">
        <div className="flex-1">
          <h3 className="m-0 text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
            Radar do Dono de Restaurante
            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">LIVE MARKET</span>
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Notícias reais do setor — Food Service News, Mercado&amp;Consumo, ABRASEL e Forbes Gastronomia
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-slate-500">Atualizado às {horaAtualizado}</span>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin text-blue-600" : ""} />
          </button>
        </div>
      </div>

      {/* Portais fixos */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PORTAIS.map((p) => (
          <a
            key={p.nome}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5"
          >
            {p.nome}
            <ExternalLink size={12} className="text-slate-400" />
          </a>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-10 text-slate-500 gap-2">
          <Loader2 size={22} className="animate-spin text-blue-600" />
          <span className="text-sm">Buscando notícias...</span>
        </div>
      )}

      {isError && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          Não foi possível carregar as notícias.
        </div>
      )}

      {!isLoading && !isError && (
        <div className="flex flex-col gap-3">
          {noticias.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 px-4 py-3.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition-colors"
            >
              <div className="flex flex-col gap-1 min-w-[110px] shrink-0">
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded w-max ${tagClass(item.statusVendas)}`}>
                  {item.badgeTexto}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">{item.fonte}</span>
              </div>
              <h4 className="m-0 text-[13px] font-semibold text-slate-800 flex-1 truncate">
                {item.titulo}
              </h4>
              <a
                href={item.linkFonte}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-blue-600 hover:underline whitespace-nowrap shrink-0"
              >
                Ler notícia →
              </a>
            </div>
          ))}
          {noticias.length === 0 && (
            <p className="text-center py-6 text-sm text-slate-400">Nenhuma notícia encontrada agora.</p>
          )}
        </div>
      )}
    </div>
  );
}
