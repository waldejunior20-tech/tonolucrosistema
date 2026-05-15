import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronDown,
  Plus,
  Trash2,
  Box,
  Sparkles,
  Settings2,
  Package,
  X,
  Check,
} from "lucide-react";

/* ============================================================
   Ficha Técnica de Pizza — Mobile UI (Mock interativo)
   Deep dark, glassmorphism, mobile-first (max-w-[480px])
============================================================ */

type Ingrediente = {
  id: string;
  nome: string;
  tipo: "produzido" | "comprado";
  qtdP: string;
  qtdM: string;
  qtdG: string;
};

type Embalagem = { tamanho: "P" | "M" | "G"; cm: number; box: string; custo: number };

const EXTRAS_DISPONIVEIS = [
  { id: "ketchup", label: "Ketchup", custo: 0.35 },
  { id: "maionese", label: "Maionese", custo: 0.4 },
  { id: "mostarda", label: "Mostarda", custo: 0.3 },
  { id: "mesinha", label: "Mesinha", custo: 0.5 },
  { id: "guardanapo", label: "Guardanapo", custo: 0.1 },
  { id: "palito", label: "Palito", custo: 0.05 },
];

const BOXES = [
  { id: "p25", label: "Caixa Brancoflex P (25cm)", custo: 2.19 },
  { id: "m30", label: "Caixa Brancoflex M (30cm)", custo: 2.79 },
  { id: "g35", label: "Caixa Brancoflex G (35cm)", custo: 3.49 },
];

const BASES = [
  "Nenhuma",
  "Base pizza Salgada",
  "Base pizza Doce",
  "Base pizza Vegana",
];

const CATEGORIAS = ["Doce", "Salgada", "Especial", "Vegana"];

export default function FichaPizzaEditorMock() {
  const navigate = useNavigate();

  // Header / base
  const [nome, setNome] = useState("KitKat");
  const [numero, setNumero] = useState("FT-001");
  const [categoria, setCategoria] = useState("Doce");
  const [base, setBase] = useState(BASES[2]);
  const [catOpen, setCatOpen] = useState(false);

  // Ingredientes
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([
    { id: "1", nome: "Massa de pizza", tipo: "produzido", qtdP: "180", qtdM: "240", qtdG: "320" },
    { id: "2", nome: "Chocolate ao leite", tipo: "comprado", qtdP: "60", qtdM: "90", qtdG: "120" },
    { id: "3", nome: "KitKat triturado", tipo: "comprado", qtdP: "30", qtdM: "45", qtdG: "60" },
  ]);
  const [addingIng, setAddingIng] = useState(false);
  const [novoIng, setNovoIng] = useState<Ingrediente>({
    id: "",
    nome: "",
    tipo: "comprado",
    qtdP: "",
    qtdM: "",
    qtdG: "",
  });

  // Embalagens
  const [embalagens, setEmbalagens] = useState<Embalagem[]>([
    { tamanho: "P", cm: 25, box: "p25", custo: 2.19 },
    { tamanho: "M", cm: 30, box: "m30", custo: 2.79 },
    { tamanho: "G", cm: 35, box: "g35", custo: 3.49 },
  ]);

  // Extras
  const [extrasAtivos, setExtrasAtivos] = useState<string[]>(["mesinha", "guardanapo"]);

  // Accordions
  const [open, setOpen] = useState<Record<string, boolean>>({
    base: true,
    ingredientes: true,
    embalagens: false,
    extras: false,
  });

  // Cálculo simples (mock) — soma g/preço hipotético + embalagem + extras
  const calcCusto = (qtd: string) => {
    const n = parseFloat(qtd) || 0;
    return n * 0.045; // R$ por grama mock
  };
  const custoIngredientes = (key: "qtdP" | "qtdM" | "qtdG") =>
    ingredientes.reduce((acc, i) => acc + calcCusto(i[key]), 0);
  const custoExtras = extrasAtivos.reduce(
    (acc, id) => acc + (EXTRAS_DISPONIVEIS.find((e) => e.id === id)?.custo ?? 0),
    0,
  );
  const custoP = custoIngredientes("qtdP") + (embalagens[0]?.custo ?? 0) + custoExtras;
  const custoM = custoIngredientes("qtdM") + (embalagens[1]?.custo ?? 0) + custoExtras;
  const custoG = custoIngredientes("qtdG") + (embalagens[2]?.custo ?? 0) + custoExtras;

  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const toggleOpen = (k: string) => setOpen((s) => ({ ...s, [k]: !s[k] }));

  const addIngrediente = () => {
    if (!novoIng.nome.trim()) return;
    setIngredientes((arr) => [...arr, { ...novoIng, id: crypto.randomUUID() }]);
    setNovoIng({ id: "", nome: "", tipo: "comprado", qtdP: "", qtdM: "", qtdG: "" });
    setAddingIng(false);
  };

  const removeIngrediente = (id: string) =>
    setIngredientes((arr) => arr.filter((i) => i.id !== id));

  const toggleExtra = (id: string) =>
    setExtrasAtivos((arr) => (arr.includes(id) ? arr.filter((e) => e !== id) : [...arr, id]));

  return (
    <div className="min-h-screen w-full bg-[#080A0F] text-white antialiased">
      {/* container mobile centrado */}
      <div className="mx-auto w-full max-w-[480px] relative pb-36">
        {/* Glow ambient */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.25),transparent_70%)]" />

        {/* HEADER STICKY */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#080A0F]/70 border-b border-white/5">
          <div className="flex items-center gap-3 px-4 h-14">
            <button
              onClick={() => navigate(-1)}
              aria-label="Voltar"
              className="h-11 w-11 -ml-2 inline-flex items-center justify-center rounded-xl hover:bg-white/5 active:scale-95 transition"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-medium">
                Editar Ficha
              </p>
              <h1 className="text-[15px] font-semibold truncate">{nome || "Sem nome"}</h1>
            </div>

            {/* badge categoria */}
            <div className="relative">
              <button
                onClick={() => setCatOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/[0.06] border border-white/10 text-xs font-medium hover:bg-white/[0.09] transition"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB] shadow-[0_0_8px_#2563EB]" />
                {categoria}
                <ChevronDown
                  className={`h-3.5 w-3.5 opacity-60 transition ${catOpen ? "rotate-180" : ""}`}
                />
              </button>
              {catOpen && (
                <div className="absolute right-0 mt-2 min-w-[140px] rounded-xl border border-white/10 bg-[#121620]/95 backdrop-blur-xl shadow-2xl overflow-hidden z-40">
                  {CATEGORIAS.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setCategoria(c);
                        setCatOpen(false);
                      }}
                      className="flex items-center justify-between w-full text-left px-3 py-2.5 text-sm hover:bg-white/[0.06]"
                    >
                      {c}
                      {c === categoria && <Check className="h-4 w-4 text-[#2563EB]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Price summary */}
          <div className="px-4 pb-3">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-semibold">
                  Custo final por tamanho
                </p>
                <span className="text-[10px] text-emerald-400/80 font-medium">Atualizado</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { l: "P", v: custoP },
                  { l: "M", v: custoM },
                  { l: "G", v: custoG },
                ].map((s) => (
                  <div
                    key={s.l}
                    className="rounded-xl bg-[#0E1218] border border-white/[0.06] px-2 py-2.5 text-center"
                  >
                    <p className="text-[10px] text-white/40 font-medium mb-0.5">{s.l}</p>
                    <p className="text-[15px] font-bold tabular-nums text-emerald-400">
                      {fmt(s.v)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="px-4 pt-4 space-y-3">
          {/* Section: Configuração base */}
          <Section
            icon={<Settings2 className="h-4 w-4" />}
            title="Configuração Base"
            subtitle="Identificação da ficha"
            open={open.base}
            onToggle={() => toggleOpen("base")}
          >
            <div className="space-y-3">
              <Field label="Nome da pizza">
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Margherita"
                  className={inputCls}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Nº da ficha">
                  <input
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="FT-001"
                    className={inputCls}
                  />
                </Field>
                <Field label="Base salva">
                  <select
                    value={base}
                    onChange={(e) => setBase(e.target.value)}
                    className={`${inputCls} appearance-none pr-8 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23ffffff80%22 stroke-width=%222%22><polyline points=%226 9 12 15 18 9%22/></svg>')] bg-no-repeat bg-[right_10px_center] bg-[length:14px_14px]`}
                  >
                    {BASES.map((b) => (
                      <option key={b} value={b} className="bg-[#121620]">
                        {b}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </Section>

          {/* Section: Ingredientes */}
          <Section
            icon={<Sparkles className="h-4 w-4" />}
            title="Ingredientes"
            subtitle={`${ingredientes.length} ingrediente${ingredientes.length === 1 ? "" : "s"}`}
            open={open.ingredientes}
            onToggle={() => toggleOpen("ingredientes")}
          >
            <div className="space-y-2.5">
              {ingredientes.map((ing) => (
                <div
                  key={ing.id}
                  className="rounded-xl border border-white/[0.06] bg-[#0E1218] p-3"
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{ing.nome}</p>
                      <span
                        className={`inline-flex items-center gap-1 mt-1 px-2 h-5 rounded-full text-[10px] font-medium ${
                          ing.tipo === "produzido"
                            ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                            : "bg-sky-500/10 text-sky-300 border border-sky-500/20"
                        }`}
                      >
                        {ing.tipo === "produzido" ? "Produzido" : "Comprado"}
                      </span>
                    </div>
                    <button
                      onClick={() => removeIngrediente(ing.id)}
                      aria-label="Remover"
                      className="h-9 w-9 -mr-1 -mt-1 inline-flex items-center justify-center rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["qtdP", "qtdM", "qtdG"] as const).map((k, idx) => (
                      <div
                        key={k}
                        className="rounded-lg bg-[#080A0F] border border-white/[0.05] px-2 py-1.5"
                      >
                        <p className="text-[10px] text-white/40 font-medium">
                          {["P", "M", "G"][idx]}
                        </p>
                        <p className="text-sm font-semibold tabular-nums">
                          {ing[k] || "0"}
                          <span className="text-[10px] text-white/40 ml-0.5">g</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Inline add card */}
              {addingIng && (
                <div className="rounded-xl border border-[#2563EB]/40 bg-[#2563EB]/5 p-3 space-y-3">
                  {/* Tipo toggle */}
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#080A0F]/60 border border-white/[0.05]">
                    {(["produzido", "comprado"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setNovoIng((s) => ({ ...s, tipo: t }))}
                        className={`h-9 rounded-lg text-xs font-semibold capitalize transition ${
                          novoIng.tipo === t
                            ? "bg-[#2563EB] text-white shadow-[0_4px_12px_rgba(37,99,235,0.4)]"
                            : "text-white/60 hover:text-white"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <input
                    autoFocus
                    value={novoIng.nome}
                    onChange={(e) => setNovoIng((s) => ({ ...s, nome: e.target.value }))}
                    placeholder="Nome do ingrediente"
                    className={inputCls}
                  />

                  <div className="grid grid-cols-3 gap-2">
                    {(["qtdP", "qtdM", "qtdG"] as const).map((k, idx) => (
                      <div key={k}>
                        <p className="text-[10px] text-white/50 font-semibold mb-1 text-center">
                          {["P", "M", "G"][idx]} (g)
                        </p>
                        <input
                          inputMode="decimal"
                          value={novoIng[k]}
                          onChange={(e) =>
                            setNovoIng((s) => ({ ...s, [k]: e.target.value }))
                          }
                          placeholder="0"
                          className={`${inputCls} text-center tabular-nums`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setAddingIng(false)}
                      className="flex-1 h-11 rounded-xl border border-white/10 text-sm font-semibold text-white/70 hover:bg-white/5"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={addIngrediente}
                      className="flex-1 h-11 rounded-xl bg-[#2563EB] text-sm font-bold shadow-[0_8px_24px_rgba(37,99,235,0.4)] hover:bg-[#1d4ed8] active:scale-[0.98] transition"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              )}

              {!addingIng && (
                <button
                  onClick={() => setAddingIng(true)}
                  className="group w-full h-12 rounded-xl border border-dashed border-white/15 text-sm font-semibold text-white/70 hover:text-white hover:border-[#2563EB]/60 hover:bg-[#2563EB]/5 transition flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4 group-hover:text-[#2563EB] transition" />
                  Adicionar ingrediente
                </button>
              )}
            </div>
          </Section>

          {/* Section: Embalagens */}
          <Section
            icon={<Package className="h-4 w-4" />}
            title="Embalagens por Tamanho"
            subtitle="Caixa para cada tamanho"
            open={open.embalagens}
            onToggle={() => toggleOpen("embalagens")}
          >
            <div className="grid grid-cols-3 gap-2">
              {embalagens.map((emb, idx) => (
                <div
                  key={emb.tamanho}
                  className="rounded-xl border border-white/[0.06] bg-[#0E1218] p-2.5 space-y-2"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold">{emb.tamanho}</span>
                    <span className="text-[10px] text-white/40">{emb.cm}cm</span>
                  </div>
                  <select
                    value={emb.box}
                    onChange={(e) => {
                      const box = BOXES.find((b) => b.id === e.target.value)!;
                      setEmbalagens((arr) =>
                        arr.map((x, i) =>
                          i === idx ? { ...x, box: box.id, custo: box.custo } : x,
                        ),
                      );
                    }}
                    className="w-full h-9 px-2 text-[11px] rounded-lg bg-[#080A0F] border border-white/[0.06] text-white/80 appearance-none truncate"
                  >
                    {BOXES.map((b) => (
                      <option key={b.id} value={b.id} className="bg-[#121620]">
                        {b.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-center text-sm font-bold tabular-nums text-emerald-400">
                    {fmt(emb.custo)}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          {/* Section: Extras */}
          <Section
            icon={<Box className="h-4 w-4" />}
            title="Extras"
            subtitle={`${extrasAtivos.length} ativo${extrasAtivos.length === 1 ? "" : "s"}`}
            open={open.extras}
            onToggle={() => toggleOpen("extras")}
          >
            <div className="-mx-4 px-4 overflow-x-auto scrollbar-none">
              <div className="flex gap-2 pb-1 w-max">
                {EXTRAS_DISPONIVEIS.map((ex) => {
                  const active = extrasAtivos.includes(ex.id);
                  return (
                    <button
                      key={ex.id}
                      onClick={() => toggleExtra(ex.id)}
                      className={`shrink-0 min-w-[110px] rounded-xl px-3 py-2.5 text-left border transition ${
                        active
                          ? "border-[#2563EB]/60 bg-[#2563EB]/15 shadow-[0_4px_16px_rgba(37,99,235,0.25)]"
                          : "border-white/[0.06] bg-[#0E1218] hover:border-white/15"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold">{ex.label}</span>
                        <span
                          className={`h-4 w-4 rounded-full inline-flex items-center justify-center text-[10px] ${
                            active ? "bg-[#2563EB]" : "bg-white/10"
                          }`}
                        >
                          {active ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        </span>
                      </div>
                      <p className="text-[11px] tabular-nums text-white/50">{fmt(ex.custo)}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </Section>
        </main>

        {/* STICKY FOOTER */}
        <footer className="fixed bottom-0 inset-x-0 z-30">
          <div className="mx-auto max-w-[480px] px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 bg-gradient-to-t from-[#080A0F] via-[#080A0F]/95 to-transparent">
            <div className="rounded-2xl border border-white/10 bg-[#121620]/80 backdrop-blur-xl p-2 flex gap-2 shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
              <button
                onClick={() => navigate(-1)}
                className="flex-1 h-12 rounded-xl border border-white/10 text-sm font-semibold text-white/80 hover:bg-white/5 active:scale-[0.98] transition inline-flex items-center justify-center gap-1.5"
              >
                <X className="h-4 w-4" /> Cancelar
              </button>
              <button className="flex-[1.5] h-12 rounded-xl bg-[#2563EB] text-sm font-bold shadow-[0_8px_24px_rgba(37,99,235,0.45)] hover:bg-[#1d4ed8] active:scale-[0.98] transition inline-flex items-center justify-center gap-1.5">
                <Check className="h-4 w-4" /> Salvar Ficha
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* --- Subcomponents --- */

const inputCls =
  "w-full h-11 px-3 rounded-xl bg-[#0E1218] border border-white/[0.06] text-sm text-white placeholder:text-white/30 outline-none focus:border-[#2563EB]/60 focus:ring-2 focus:ring-[#2563EB]/20 transition";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-white/45 font-semibold mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

function Section({
  icon,
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-[#121620] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 h-14 text-left hover:bg-white/[0.02] transition"
      >
        <span className="h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.06] inline-flex items-center justify-center text-white/70">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">{title}</p>
          {subtitle && <p className="text-[11px] text-white/40 mt-0.5">{subtitle}</p>}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-1">{children}</div>
        </div>
      </div>
    </section>
  );
}
