import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

function isIos() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua) === false
    ? /iPhone|iPad|iPod/.test(ua)
    : /iPhone|iPad|iPod/.test(ua);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS
    window.navigator.standalone === true
  );
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissed && Date.now() - dismissed < DISMISS_TTL) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS Safari has no beforeinstallprompt — show manual hint
    if (isIos() && !isStandalone()) {
      // small delay so it doesn't pop up immediately
      const t = setTimeout(() => {
        setShowIos(true);
        setVisible(true);
      }, 4000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBIP);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
    } else {
      dismiss();
    }
    setDeferred(null);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed left-3 right-3 z-[60] rounded-2xl border border-[#BFDBFE] bg-white shadow-[0_18px_48px_-12px_rgba(37,99,235,0.35)]"
      style={{
        bottom: "calc(env(safe-area-inset-bottom) + 84px)",
        maxWidth: 460,
        marginLeft: "auto",
        marginRight: "auto",
      }}
      role="dialog"
      aria-label="Instalar aplicativo"
    >
      <div className="flex items-start gap-3 p-3.5">
        <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0">
          <Download size={20} className="text-[#2563EB]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-[#0F172A] leading-tight">
            Instalar TôNoLucro
          </p>
          {showIos ? (
            <p className="text-[12.5px] text-[#475569] mt-1 leading-snug flex items-center gap-1 flex-wrap">
              Toque em <Share size={14} className="inline text-[#2563EB]" /> e
              depois em <strong>Adicionar à Tela de Início</strong>.
            </p>
          ) : (
            <p className="text-[12.5px] text-[#475569] mt-1 leading-snug">
              Acesse direto da tela inicial, com modo offline e mais velocidade.
            </p>
          )}
          {!showIos && (
            <div className="flex items-center gap-2 mt-2.5">
              <button
                onClick={install}
                className="h-9 px-3.5 rounded-lg bg-[#2563EB] text-white text-[13px] font-semibold active:bg-[#1D4ED8] transition-colors"
              >
                Instalar app
              </button>
              <button
                onClick={dismiss}
                className="h-9 px-2.5 rounded-lg text-[13px] font-semibold text-[#64748B] active:bg-slate-100 transition-colors"
              >
                Agora não
              </button>
            </div>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Fechar"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] active:bg-slate-100 transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
