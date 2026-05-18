import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { registerPWA } from "./registerSW";

export function UpdateToast() {
  const [reloadFn, setReloadFn] = useState<(() => void) | null>(null);

  useEffect(() => {
    registerPWA((reload) => setReloadFn(() => reload));
  }, []);

  if (!reloadFn) return null;

  return (
    <div
      className="fixed left-3 right-3 z-[70] rounded-2xl border border-[#BFDBFE] bg-white shadow-[0_18px_48px_-12px_rgba(37,99,235,0.35)] flex items-center gap-3 p-3"
      style={{
        top: "calc(env(safe-area-inset-top) + 12px)",
        maxWidth: 460,
        marginLeft: "auto",
        marginRight: "auto",
      }}
      role="status"
    >
      <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0">
        <RefreshCw size={18} className="text-[#2563EB]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-bold text-[#0F172A] leading-tight">
          Nova versão disponível
        </p>
        <p className="text-[12px] text-[#475569] leading-snug">
          Atualize para receber as últimas melhorias.
        </p>
      </div>
      <button
        onClick={reloadFn}
        className="h-9 px-3 rounded-lg bg-[#2563EB] text-white text-[12.5px] font-semibold active:bg-[#1D4ED8] transition-colors shrink-0"
      >
        Atualizar
      </button>
    </div>
  );
}
