import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, RefreshCw, FileText, Loader2, AlertCircle } from "lucide-react";

interface RSSItem {
  id: string;
  title: string;
  pubDate: string;
  link: string;
  source: string;
}

const FEEDS: { url: string; source: string }[] = [
  { url: "https://www.foodservicenews.com.br/feed/", source: "Food Service News" },
  { url: "https://www.mercadoeconsumo.com.br/categoria/food-service/feed/", source: "Mercado&Consumo" },
  { url: "https://forbes.com.br/forbeslife/gastronomia/feed/", source: "Forbes Gastronomia" },
];

async function fetchFromFeed(feed: { url: string; source: string }): Promise<RSSItem[]> {
  try {
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&count=5`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    if (json.status !== "ok") return [];
    return (json.items || []).map((i: any, idx: number) => ({
      id: i.guid || `${feed.source}-${idx}`,
      title: String(i.title || "").trim(),
      pubDate: i.pubDate,
      link: i.link,
      source: feed.source,
    }));
  } catch {
    return [];
  }
}

async function fetchNoticias(): Promise<RSSItem[]> {
  const results = await Promise.all(FEEDS.map(fetchFromFeed));
  const all = results.flat();
  all.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  return all.slice(0, 8);
}

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "";
  }
};

export function NoticiasRestaurantes() {
  const {
    data: noticias = [], isLoading, isError, error, refetch, isFetching,
  } = useQuery({
    queryKey: ["noticias-restaurantes"],
    queryFn: fetchNoticias,
    staleTime: 1000 * 60 * 10,
    refetchInterval: 1000 * 60 * 15,
  });

  return (
    <div className="w-full p-6 bg-slate-50 rounded-xl shadow-sm border border-slate-100">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
            <FileText size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">Feed do Setor Alimentar</h2>
              <span className="flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                CONECTADO RSS
              </span>
            </div>
            <p className="text-xs text-slate-500">Notícias e atualizações sobre bares, restaurantes e mercado de entregas.</p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600 disabled:opacity-50"
        >
          {isFetching ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
          <Loader2 size={32} className="animate-spin text-orange-500" />
          <p className="text-sm">Buscando os artigos mais recentes do setor...</p>
        </div>
      )}

      {/* Erro */}
      {isError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-lg text-sm my-4">
          <AlertCircle size={20} className="shrink-0" />
          <div>
            <p className="font-semibold">Não foi possível carregar as notícias</p>
            <p className="text-xs opacity-90">{(error as Error)?.message || "Erro de conexão."}</p>
          </div>
        </div>
      )}

      {/* Lista */}
      {!isLoading && !isError && (
        <div className="divide-y divide-slate-100">
          {noticias.length === 0 ? (
            <p className="text-center py-8 text-sm text-slate-400">Nenhuma notícia encontrada.</p>
          ) : (
            noticias.map((item) => (
              <a
                key={item.id}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="py-4 first:pt-0 last:pb-0 flex justify-between items-start gap-4 group cursor-pointer"
              >
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-slate-800 transition-colors group-hover:text-orange-600 line-clamp-2">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      {item.source}
                    </span>
                    <span className="text-[11px] text-slate-400">•</span>
                    <span className="text-[11px] text-slate-400">{formatDate(item.pubDate)}</span>
                  </div>
                </div>
                <div className="text-slate-400 group-hover:text-orange-600 transition-colors pt-0.5 shrink-0">
                  <ArrowUpRight size={16} />
                </div>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
