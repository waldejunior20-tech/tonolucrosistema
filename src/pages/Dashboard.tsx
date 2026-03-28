import { Pizza } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Pizza className="text-primary" size={32} />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dom Corleone</h1>
          <p className="text-muted-foreground">Sistema de Gestão — Pizzaria Delivery</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Fichas Técnicas", value: "—" },
          { label: "Insumos Cadastrados", value: "—" },
          { label: "Promoções Ativas", value: "—" },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border bg-card p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground text-lg">Bem-vindo ao painel de gestão da Dom Corleone.</p>
      </div>
    </div>
  );
}
