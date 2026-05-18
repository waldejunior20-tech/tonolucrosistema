// Edge function: busca notícias reais do setor de food service no Brasil
// via RSS dos portais (sem CORS no client). Cache simples em memória de 10 min.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Noticia {
  id: string;
  titulo: string;
  fonte: string;
  linkFonte: string;
  statusVendas: "alta" | "baixa" | "alerta" | "neutro";
  badgeTexto: string;
  tempo: string;
  pubDate: string;
  resumo: string;
}

const FEEDS: { url: string; fonte: string }[] = [
  { url: "https://www.foodservicenews.com.br/feed/", fonte: "Food Service News" },
  { url: "https://www.mercadoeconsumo.com.br/categoria/food-service/feed/", fonte: "Mercado&Consumo" },
  { url: "https://abrasel.com.br/noticias/feed/", fonte: "ABRASEL" },
  { url: "https://forbes.com.br/forbeslife/gastronomia/feed/", fonte: "Forbes Gastronomia" },
];

// Cache em memória do worker (até 10 min)
let cache: { at: number; data: Noticia[] } | null = null;
const TTL_MS = 1000 * 60 * 10;

const stripHtml = (s: string) =>
  s.replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

function parseRSS(xml: string): { title: string; link: string; pubDate: string; description: string }[] {
  const items: { title: string; link: string; pubDate: string; description: string }[] = [];
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  const matches = xml.match(itemRegex) || [];
  for (const block of matches) {
    const title = (block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
    const link = (block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "").trim();
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || "").trim();
    const description = (block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || "").trim();
    if (title && link) {
      items.push({
        title: stripHtml(title),
        link: link.replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
        pubDate,
        description: stripHtml(description),
      });
    }
  }
  return items;
}

function classificar(titulo: string, resumo: string): { statusVendas: Noticia["statusVendas"]; badgeTexto: string } {
  const txt = `${titulo} ${resumo}`.toLowerCase();
  if (/(alta|cresce|cresceu|aumento|recorde|sobe|expansão|expansao|fatura mais|impulsiona|melhor)/.test(txt))
    return { statusVendas: "alta", badgeTexto: "Vendas em Alta" };
  if (/(queda|cai|caiu|baixa|reduç|reduc|recu|piora|crise|prejuízo|prejuizo|fecha|encerra)/.test(txt))
    return { statusVendas: "baixa", badgeTexto: "Mercado em Queda" };
  if (/(custo|preço|preco|inflaç|inflac|alerta|imposto|tributári|tributari|instabilidade|reajuste)/.test(txt))
    return { statusVendas: "alerta", badgeTexto: "Alerta de Custos" };
  return { statusVendas: "neutro", badgeTexto: "Setor" };
}

function tempoRelativo(pubDate: string): string {
  try {
    const d = new Date(pubDate).getTime();
    if (!d) return "";
    const diff = Date.now() - d;
    const min = Math.floor(diff / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `há ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h} h`;
    const dias = Math.floor(h / 24);
    return `há ${dias} d`;
  } catch {
    return "";
  }
}

async function fetchFeed(feed: { url: string; fonte: string }): Promise<Noticia[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LovableNewsBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = parseRSS(xml).slice(0, 5);
    return items.map((i, idx) => {
      const { statusVendas, badgeTexto } = classificar(i.title, i.description);
      return {
        id: `${feed.fonte}-${idx}-${i.link.slice(-20)}`,
        titulo: i.title,
        fonte: feed.fonte,
        linkFonte: i.link,
        statusVendas,
        badgeTexto,
        tempo: tempoRelativo(i.pubDate),
        pubDate: i.pubDate,
        resumo: i.description.slice(0, 220),
      };
    });
  } catch (e) {
    console.error(`Falha em ${feed.fonte}:`, (e as Error).message);
    return [];
  }
}

async function fetchNewsApi(): Promise<Noticia[]> {
  const apiKey = Deno.env.get("NEWSAPI_KEY");
  if (!apiKey) return [];
  try {
    const q = encodeURIComponent('restaurante OR abrasel OR "food service" OR gastronomia');
    const url = `https://newsapi.org/v2/everything?q=${q}&language=pt&sortBy=publishedAt&pageSize=10&apiKey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.error("NewsAPI status:", res.status);
      return [];
    }
    const json = await res.json();
    const articles = (json.articles || []) as any[];
    return articles.map((a, idx) => {
      const titulo = stripHtml(a.title || "");
      const resumo = stripHtml(a.description || "");
      const { statusVendas, badgeTexto } = classificar(titulo, resumo);
      return {
        id: `newsapi-${idx}-${(a.url || "").slice(-20)}`,
        titulo,
        fonte: a.source?.name || "NewsAPI",
        linkFonte: a.url,
        statusVendas,
        badgeTexto,
        tempo: tempoRelativo(a.publishedAt),
        pubDate: a.publishedAt,
        resumo: resumo.slice(0, 220),
      } as Noticia;
    });
  } catch (e) {
    console.error("Falha NewsAPI:", (e as Error).message);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (cache && Date.now() - cache.at < TTL_MS) {
      return new Response(JSON.stringify({ noticias: cache.data, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = await Promise.all(FEEDS.map(fetchFeed));
    const all = results.flat();
    all.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    const noticias = all.slice(0, 10);

    cache = { at: Date.now(), data: noticias };

    return new Response(JSON.stringify({ noticias, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message, noticias: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
