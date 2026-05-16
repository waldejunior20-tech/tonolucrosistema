import { useQuery } from "@tanstack/react-query";
import { Newspaper, ExternalLink, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
  source?: string;
  description?: string;
};

// Feeds RSS de portais brasileiros do setor — links diretos aos artigos
const FEEDS: { url: string; source: string }[] = [
  { url: "https://www.foodservicenews.com.br/feed/", source: "Food Service News" },
  { url: "https://www.mercadoeconsumo.com.br/categoria/food-service/feed/", source: "Mercado&Consumo" },
  { url: "https://forbes.com.br/forbeslife/gastronomia/feed/", source: "Forbes Gastronomia" },
];

async function fetchFromFeed(feed: { url: string; source: string }): Promise<NewsItem[]> {
  try {
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&count=5`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const items = (json.items || []) as any[];
    return items.map((i) => ({
      title: String(i.title || "").trim(),
      link: i.link,
      pubDate: i.pubDate,
      source: feed.source,
      description: i.description,
    }));
  } catch {
    return [];
  }
}

async function fetchNoticias(): Promise<NewsItem[]> {
  const results = await Promise.all(FEEDS.map(fetchFromFeed));
  const all = results.flat();
  // Ordena por data desc e pega os 10 mais recentes
  all.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  return all.slice(0, 10);
}

export function NoticiasRestaurantes() {
  const { data: noticias = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["noticias-restaurantes"],
    queryFn: fetchNoticias,
    staleTime: 1000 * 60 * 10, // 10 min
    refetchInterval: 1000 * 60 * 15, // 15 min — "tempo real"
  });

  return (
    <div className="relative rounded-[24px] border border-[#E6EAF0] bg-white p-5 md:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-14px_rgba(15,23,42,0.10)] overflow-hidden">
      {/* Aurora sutil */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 50% at 0% 0%, rgba(37,99,235,0.06) 0%, transparent 60%), radial-gradient(50% 50% at 100% 0%, rgba(5,150,105,0.05) 0%, transparent 65%)",
        }}
      />
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#EFF6FF] text-[#2563EB]">
              <Newspaper size={18} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-semibold text-[19px] md:text-[20px] leading-tight tracking-tight text-[#0F172A] truncate">
                  Notícias do setor
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] text-[10px] font-semibold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  Ao vivo
                </span>
              </div>
              <p className="text-[13px] text-[#475569] mt-1">
                Restaurantes &amp; food service no Brasil — atualizado a cada 15 min.
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="text-[#475569] hover:text-[#2563EB] transition-colors p-1.5 rounded-lg hover:bg-[#F1F5F9]"
            title="Atualizar agora"
          >
            <RefreshCw size={16} className={cn(isFetching && "animate-spin")} />
          </button>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-[#F1F5F9] animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-10">
            <p className="text-[14px] text-[#475569]">Não foi possível carregar as notícias agora.</p>
            <button
              onClick={() => refetch()}
              className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#2563EB] hover:underline"
            >
              <RefreshCw size={13} /> Tentar de novo
            </button>
          </div>
        ) : noticias.length === 0 ? (
          <p className="text-center py-10 text-[14px] text-[#475569]">Nenhuma notícia encontrada.</p>
        ) : (
          <ul className="divide-y divide-[#F1F5F9]">
            {noticias.map((n, idx) => {
              let timeAgo = "";
              try {
                timeAgo = formatDistanceToNow(new Date(n.pubDate), { locale: ptBR, addSuffix: true });
              } catch {}
              return (
                <li key={idx}>
                  <a
                    href={n.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 py-3 px-2 -mx-2 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-semibold text-[14px] text-[#0F172A] leading-snug line-clamp-2 group-hover:text-[#2563EB] transition-colors">
                        {n.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {n.source && (
                          <span className="text-[10.5px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569]">
                            {n.source}
                          </span>
                        )}
                        {timeAgo && <span className="text-[11.5px] text-[#94A3B8]">{timeAgo}</span>}
                      </div>
                    </div>
                    <ExternalLink size={14} className="text-[#94A3B8] mt-1 shrink-0 group-hover:text-[#2563EB] transition-colors" />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
