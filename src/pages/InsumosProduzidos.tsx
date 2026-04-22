import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { appError } from "@/lib/error-codes";
import { Pencil, Trash2, Plus, Search, X, Beaker, AlertTriangle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { QuantityInput, formatMoney, formatQuantidade } from "@/components/MoneyInput";
import { requireActiveUnidadeId } from "@/hooks/useActiveUnidade";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { fieldErrorClass, FieldError } from "@/components/FormFieldError";
import { matchesSearch } from "@/lib/utils";

const UNIDADES_RENDIMENTO = ["kg", "g", "L", "ml", "unidade"];
const UNIDADES_INGREDIENTE = ["kg", "g", "L", "ml", "unidade", "caixa", "pacote"];

type InsumoProprio = Tables<"insumos_proprios">;
type InsumoProprioIngrediente = Tables<"insumos_proprios_ingredientes">;
type InsumoComprado = Tables<"insumos_comprados">;

interface IngredienteForm {
  insumo_comprado_id: string;
  nome_display: string;
  quantidade: number;
  unidade: string;
}

interface FormState {
  nome: string;
  rendimento: number;
  unidade_rendimento: string;
  ingredientes: IngredienteForm[];
}

const emptyForm: FormState = {
  nome: "",
  rendimento: 0,
  unidade_rendimento: "",
  ingredientes: [],
};

export default function InsumosProduzidos() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [buscaIngrediente, setBuscaIngrediente] = useState("");
  const [buscaAberta, setBuscaAberta] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Validation
  const errors = {
    nome: !form.nome.trim(),
    rendimento: !form.rendimento,
    unidade_rendimento: !form.unidade_rendimento,
  };
  const formIsValid = !Object.values(errors).some(Boolean);
  const showErr = (field: keyof typeof errors) => submitted && errors[field];

  // Fetch insumos próprios
  const { data: insumosProprios = [], isLoading } = useQuery({
    queryKey: ["insumos_proprios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insumos_proprios")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as InsumoProprio[];
    },
  });

  // Fetch ingredientes de todos os insumos próprios
  const { data: todosIngredientes = [] } = useQuery({
    queryKey: ["insumos_proprios_ingredientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insumos_proprios_ingredientes")
        .select("*");
      if (error) throw error;
      return data as InsumoProprioIngrediente[];
    },
  });

  // Fetch insumos comprados para busca e cálculo de custo
  const { data: insumosComprados = [] } = useQuery({
    queryKey: ["insumos_comprados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insumos_comprados")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data as InsumoComprado[];
    },
  });

  // Mapa de custo unitário dos insumos comprados (preço / quantidade)
  const custoUnitarioMap = new Map<string, number>();
  const nomeCompradoMap = new Map<string, string>();
  const unidadeCompradoMap = new Map<string, string>();
  insumosComprados.forEach((ic) => {
    custoUnitarioMap.set(ic.id, Number(ic.preco_pago) / Number(ic.quantidade));
    nomeCompradoMap.set(ic.id, ic.nome);
    unidadeCompradoMap.set(ic.id, ic.unidade);
  });

  // Família de uma unidade: "peso" | "volume" | "discreto" | "desconhecido"
  const familiaUnidade = (u?: string | null): "peso" | "volume" | "discreto" | "desconhecido" => {
    if (!u) return "desconhecido";
    const x = u.toLowerCase().trim();
    if (x === "kg" || x === "g" || x === "mg") return "peso";
    if (x === "l" || x === "ml") return "volume";
    if (x === "unidade" || x === "un" || x === "caixa" || x === "pacote" || x === "fardo" || x === "duzia" || x === "dúzia") return "discreto";
    return "desconhecido";
  };

  // Converte uma quantidade para a unidade-base da sua família (kg, L ou un).
  // Retorna null se a unidade for desconhecida.
  const converterParaBase = (quantidade: number, unidade: string): number | null => {
    const f = familiaUnidade(unidade);
    const u = unidade.toLowerCase().trim();
    if (f === "peso") return u === "kg" ? quantidade : quantidade / 1000; // g, mg → kg
    if (f === "volume") return u === "l" ? quantidade : quantidade / 1000; // ml → L
    if (f === "discreto") return quantidade; // un/caixa/pacote ficam como estão
    return null;
  };

  // Compatibilidade entre a unidade do ingrediente e a unidade de compra do insumo.
  const unidadesCompativeis = (uIngrediente: string, uCompra: string): boolean => {
    const fa = familiaUnidade(uIngrediente);
    const fb = familiaUnidade(uCompra);
    if (fa === "desconhecido" || fb === "desconhecido") return false;
    return fa === fb;
  };

  // Calcula custo de UM ingrediente. Retorna { custo, ok } — ok=false se unidades incompatíveis.
  const calcularCustoIngrediente = (
    insumoCompradoId: string,
    quantidade: number,
    unidade: string
  ): { custo: number; ok: boolean } => {
    const ic = insumosComprados.find((i) => i.id === insumoCompradoId);
    if (!ic) return { custo: 0, ok: false };
    if (!unidadesCompativeis(unidade, ic.unidade)) return { custo: 0, ok: false };

    const qtdBaseIngrediente = converterParaBase(quantidade, unidade);
    const qtdBaseCompra = converterParaBase(Number(ic.quantidade), ic.unidade);
    if (qtdBaseIngrediente == null || qtdBaseCompra == null || qtdBaseCompra === 0) {
      return { custo: 0, ok: false };
    }
    const custoPorBase = Number(ic.preco_pago) / qtdBaseCompra;
    return { custo: custoPorBase * qtdBaseIngrediente, ok: true };
  };

  // Calcula custo total de um insumo próprio (já salvo no banco).
  const calcularCusto = (insumoId: string) => {
    const ingredientes = todosIngredientes.filter(
      (ing) => ing.insumo_proprio_id === insumoId
    );
    return ingredientes.reduce((acc, ing) => {
      const { custo } = calcularCustoIngrediente(
        ing.insumo_comprado_id ?? "",
        Number(ing.quantidade),
        ing.unidade
      );
      return acc + custo;
    }, 0);
  };

  // Insert
  const insertMutation = useMutation({
    mutationFn: async (data: FormState) => {
      const unidade_id = requireActiveUnidadeId();
      const { data: inserted, error } = await supabase
        .from("insumos_proprios")
        .insert({
          nome: data.nome,
          rendimento: data.rendimento,
          unidade_rendimento: data.unidade_rendimento,
          unidade_id,
        })
        .select()
        .single();
      if (error) throw error;

      if (data.ingredientes.length > 0) {
        const { error: ingError } = await supabase
          .from("insumos_proprios_ingredientes")
          .insert(
            data.ingredientes.map((ing) => ({
              insumo_proprio_id: inserted.id,
              insumo_comprado_id: ing.insumo_comprado_id,
              quantidade: ing.quantidade,
              unidade: ing.unidade,
              unidade_id,
            }))
          );
        if (ingError) throw ingError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insumos_proprios"] });
      queryClient.invalidateQueries({ queryKey: ["insumos_proprios_ingredientes"] });
      toast.success("Insumo produzido cadastrado!");
      resetForm();
    },
    onError: (e) => appError("ERR-INS-010", e),
  });

  // Update
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: FormState & { id: string }) => {
      const unidade_id = requireActiveUnidadeId();
      const { error } = await supabase
        .from("insumos_proprios")
        .update({
          nome: data.nome,
          rendimento: data.rendimento,
          unidade_rendimento: data.unidade_rendimento,
        })
        .eq("id", id);
      if (error) throw error;

      // Remove ingredientes antigos e insere novos
      const { error: delError } = await supabase
        .from("insumos_proprios_ingredientes")
        .delete()
        .eq("insumo_proprio_id", id);
      if (delError) throw delError;

      if (data.ingredientes.length > 0) {
        const { error: ingError } = await supabase
          .from("insumos_proprios_ingredientes")
          .insert(
            data.ingredientes.map((ing) => ({
              insumo_proprio_id: id,
              insumo_comprado_id: ing.insumo_comprado_id,
              quantidade: ing.quantidade,
              unidade: ing.unidade,
              unidade_id,
            }))
          );
        if (ingError) throw ingError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insumos_proprios"] });
      queryClient.invalidateQueries({ queryKey: ["insumos_proprios_ingredientes"] });
      toast.success("Insumo produzido atualizado!");
      resetForm();
    },
    onError: (e) => appError("ERR-INS-011", e),
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: delIng } = await supabase
        .from("insumos_proprios_ingredientes")
        .delete()
        .eq("insumo_proprio_id", id);
      if (delIng) throw delIng;

      const { error } = await supabase
        .from("insumos_proprios")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insumos_proprios"] });
      queryClient.invalidateQueries({ queryKey: ["insumos_proprios_ingredientes"] });
      toast.success("Insumo produzido excluído!");
    },
    onError: (e) => appError("ERR-INS-012", e),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(false);
    setBuscaIngrediente("");
    setBuscaAberta(null);
    setSubmitted(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!formIsValid) return;
    if (temIncompativel) {
      toast.error("Há ingredientes com unidade incompatível com a unidade de compra. Corrija antes de salvar.");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ ...form, id: editingId });
    } else {
      insertMutation.mutate(form);
    }
  };

  const handleEdit = async (insumo: InsumoProprio) => {
    // Busca ingredientes deste insumo
    const { data: ings } = await supabase
      .from("insumos_proprios_ingredientes")
      .select("*")
      .eq("insumo_proprio_id", insumo.id);

    const ingredientesForm: IngredienteForm[] = (ings ?? []).map((ing) => ({
      insumo_comprado_id: ing.insumo_comprado_id ?? "",
      nome_display: nomeCompradoMap.get(ing.insumo_comprado_id ?? "") ?? "",
      quantidade: Number(ing.quantidade),
      unidade: ing.unidade,
    }));

    setForm({
      nome: insumo.nome,
      rendimento: Number(insumo.rendimento),
      unidade_rendimento: insumo.unidade_rendimento,
      ingredientes: ingredientesForm,
    });
    setEditingId(insumo.id);
    setDialogOpen(true);
  };

  const addIngrediente = () => {
    setForm({
      ...form,
      ingredientes: [
        ...form.ingredientes,
        { insumo_comprado_id: "", nome_display: "", quantidade: 0, unidade: "" },
      ],
    });
  };

  const removeIngrediente = (index: number) => {
    setForm({
      ...form,
      ingredientes: form.ingredientes.filter((_, i) => i !== index),
    });
  };

  const updateIngrediente = (index: number, field: keyof IngredienteForm, value: string | number) => {
    const updated = [...form.ingredientes];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, ingredientes: updated });
  };

  const selectInsumoComprado = (index: number, ic: InsumoComprado) => {
    const updated = [...form.ingredientes];
    updated[index] = {
      ...updated[index],
      insumo_comprado_id: ic.id,
      nome_display: ic.nome,
      unidade: ic.unidade,
    };
    setForm({ ...form, ingredientes: updated });
    setBuscaIngrediente("");
    setBuscaAberta(null);
  };

  // Resultado por ingrediente do formulário (custo + flag de compatibilidade).
  const ingredientesCalc = form.ingredientes.map((ing) => {
    if (!ing.insumo_comprado_id) return { custo: 0, ok: true };
    return calcularCustoIngrediente(ing.insumo_comprado_id, ing.quantidade, ing.unidade);
  });
  const custoFormulario = ingredientesCalc.reduce((acc, r) => acc + r.custo, 0);
  const temIncompativel = ingredientesCalc.some((r, i) => form.ingredientes[i].insumo_comprado_id && !r.ok);

  // CRÍTICO 1: rendimento convertido para a unidade-base (kg/L/un) antes de dividir.
  // Assim "500 g" vira 0,5 kg e o custo/kg sai correto.
  const rendimentoBase = converterParaBase(form.rendimento, form.unidade_rendimento) ?? form.rendimento;
  const unidadeBaseRendimento = (() => {
    const f = familiaUnidade(form.unidade_rendimento);
    if (f === "peso") return "kg";
    if (f === "volume") return "L";
    if (f === "discreto") return form.unidade_rendimento || "un";
    return form.unidade_rendimento || "un";
  })();
  const custoPorUnidade = rendimentoBase > 0 ? custoFormulario / rendimentoBase : 0;

  const filteredComprados = insumosComprados.filter((ic) =>
    matchesSearch(ic.nome, buscaIngrediente)
  );

  return (
    <div className="space-y-6 page-enter">
      <PageHeader title="Insumos Produzidos" description="Pré-preparos e produções internas.">
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="btn-action-add gap-2">
              <Plus className="h-4 w-4" /> Novo Pré-Preparo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Pré-Preparo" : "Novo Pré-Preparo"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Dados principais */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: Massa de Pizza, Frango Desfiado"
                    className={fieldErrorClass(showErr("nome"))}
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  />
                  <FieldError show={showErr("nome")} />
                </div>
                <div>
                  <Label htmlFor="rendimento">Rendimento *</Label>
                  <QuantityInput
                    id="rendimento"
                    className={fieldErrorClass(showErr("rendimento"))}
                    value={form.rendimento}
                    unidade={form.unidade_rendimento}
                    onChange={(v) => setForm({ ...form, rendimento: v })}
                  />
                  <FieldError show={showErr("rendimento")} />
                </div>
                <div>
                  <Label>Unidade *</Label>
                  <Select value={form.unidade_rendimento} onValueChange={(v) => setForm({ ...form, unidade_rendimento: v })}>
                    <SelectTrigger className={fieldErrorClass(showErr("unidade_rendimento"))}><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {UNIDADES_RENDIMENTO.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FieldError show={showErr("unidade_rendimento")} />
                </div>
                <div className="flex flex-col justify-end">
                  <p className="text-sm text-muted-foreground">Custo/{unidadeBaseRendimento}:</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatMoney(custoPorUnidade)}
                  </p>
                  {temIncompativel && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3" /> Unidades incompatíveis
                    </p>
                  )}
                </div>
              </div>

              {/* Ingredientes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Ingredientes</Label>
                  <Button type="button" size="sm" className="btn-action-add gap-1" onClick={addIngrediente}>
                    <Plus className="h-3 w-3" /> Adicionar
                  </Button>
                </div>

                {form.ingredientes.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum ingrediente adicionado.</p>
                )}

                {form.ingredientes.map((ing, idx) => {
                  const calc = ingredientesCalc[idx];
                  const incompat = ing.insumo_comprado_id && !calc?.ok;
                  const ic = insumosComprados.find((i) => i.id === ing.insumo_comprado_id);
                  return (
                  <div key={idx} className={`flex items-end gap-2 rounded-md border p-3 ${incompat ? "border-destructive/60 bg-destructive/5" : "border-border"}`}>
                    {incompat && ic && (
                      <div className="absolute -mt-9 ml-1 text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Comprado em "{ic.unidade}" — use unidade compatível
                      </div>
                    )}
                    {/* Busca insumo comprado */}
                    <div className="flex-1 relative">
                      <Label className="text-xs">Insumo Comprado</Label>
                      {ing.insumo_comprado_id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{ing.nome_display}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => updateIngrediente(idx, "insumo_comprado_id", "")}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input
                              placeholder="Buscar insumo..."
                              className="pl-7 h-8 text-sm"
                              value={buscaAberta === idx ? buscaIngrediente : ""}
                              onFocus={() => { setBuscaAberta(idx); setBuscaIngrediente(""); }}
                              onChange={(e) => setBuscaIngrediente(e.target.value)}
                            />
                          </div>
                          {buscaAberta === idx && (
                            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-40 overflow-y-auto">
                              {filteredComprados.length === 0 ? (
                                <p className="p-2 text-xs text-muted-foreground">Nenhum insumo encontrado.</p>
                              ) : (
                                filteredComprados.slice(0, 10).map((ic) => (
                                  <button
                                    key={ic.id}
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                                    onClick={() => selectInsumoComprado(idx, ic)}
                                  >
                                    <span className="font-medium">{ic.nome}</span>
                                    <span className="ml-2 text-muted-foreground text-xs">
                                      ({ic.unidade} — R$ {(Number(ic.preco_pago) / Number(ic.quantidade)).toFixed(2)}/{ic.unidade})
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quantidade */}
                    <div className="w-24">
                      <Label className="text-xs">Qtd</Label>
                      <QuantityInput
                        className="h-8 text-sm"
                        value={ing.quantidade}
                        unidade={ing.unidade}
                        onChange={(v) => updateIngrediente(idx, "quantidade", v)}
                      />
                    </div>

                    {/* Unidade */}
                    <div className="w-28">
                      <Label className="text-xs">Unidade</Label>
                      <Select value={ing.unidade} onValueChange={(v) => updateIngrediente(idx, "unidade", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Un" /></SelectTrigger>
                        <SelectContent>
                          {UNIDADES_INGREDIENTE.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Remover */}
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeIngrediente(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  );
                })}

                {form.ingredientes.length > 0 && (
                  <div className="text-right text-sm text-muted-foreground">
                    Custo total: {formatMoney(custoFormulario)}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" disabled={insertMutation.isPending || updateMutation.isPending || (submitted && !formIsValid)}>
                  {editingId ? "Salvar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Tabela */}
      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : insumosProprios.length === 0 ? (
        <EmptyState icon={Beaker} title="Nenhum pré-preparo cadastrado" description="Crie seus pré-preparos para calcular custos automaticamente." actionLabel="Novo Pré-Preparo" onAction={() => setDialogOpen(true)} />
      ) : (
        <div className="table-premium fade-up fade-up-d1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="">Nome</TableHead>
                <TableHead className="text-right">Rendimento</TableHead>
                <TableHead className="text-right">Custo/kg</TableHead>
                <TableHead className="text-right">Custo Total</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insumosProprios.map((ip) => {
                const custoTotal = calcularCusto(ip.id);
                const rendBase = converterParaBase(Number(ip.rendimento), ip.unidade_rendimento) ?? Number(ip.rendimento);
                const fam = familiaUnidade(ip.unidade_rendimento);
                const unBase = fam === "peso" ? "kg" : fam === "volume" ? "L" : (ip.unidade_rendimento || "un");
                const custoPorUn = rendBase > 0 ? custoTotal / rendBase : 0;
                return (
                  <TableRow key={ip.id}>
                    <TableCell className="font-medium">{ip.nome}</TableCell>
                    <TableCell className="text-right">
                      {formatQuantidade(Number(ip.rendimento), ip.unidade_rendimento)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(custoPorUn)}/{unBase}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(custoTotal)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(ip)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(ip.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
