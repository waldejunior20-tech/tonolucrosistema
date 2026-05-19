import { Monitor, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

interface DesktopOnlyGuardProps {
  children: React.ReactNode;
  feature?: string;
}

/**
 * Bloqueia funções pesadas no mobile, exibindo aviso para usar no desktop.
 * Mobile = decisão rápida. Desktop = gestão completa.
 */
export function DesktopOnlyGuard({ children, feature }: DesktopOnlyGuardProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  if (!isMobile) return <>{children}</>;

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-[#E6EAF0] bg-white p-6 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center mb-4">
            <Monitor className="w-6 h-6 text-[#2563EB]" strokeWidth={2} />
          </div>

          <h2 className="text-[17px] font-bold text-[#0F172A] leading-tight mb-2">
            Melhor no computador
          </h2>

          <p className="text-[13.5px] text-[#475569] leading-relaxed mb-1">
            Essa função é melhor no computador para evitar erros.
          </p>
          <p className="text-[13.5px] text-[#475569] leading-relaxed mb-5">
            Use o desktop para editar com segurança.
          </p>

          {feature && (
            <div className="mb-5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-0.5">
                Função
              </p>
              <p className="text-[13px] text-slate-800 font-semibold">{feature}</p>
            </div>
          )}

          <button
            onClick={() => navigate(-1)}
            className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-[#0F172A] text-white text-[13.5px] font-semibold hover:bg-[#1E293B] transition-colors"
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
            Voltar
          </button>

          <p className="mt-4 text-[11.5px] text-slate-400 text-center leading-relaxed">
            No celular você pode acompanhar o caixa, lançar entradas/saídas,
            importar notas e ver alertas.
          </p>
        </div>
      </div>
    </div>
  );
}
