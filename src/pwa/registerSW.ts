/**
 * Service worker registration with safety guards.
 * - Never registers inside an iframe (Lovable preview).
 * - Never registers on Lovable preview/dev hosts.
 * - Auto-updates: when a new SW is waiting, prompt user to reload.
 */

type UpdateCallback = (reload: () => void) => void;

export function registerPWA(onUpdate?: UpdateCallback) {
  if (typeof window === "undefined") return;

  // Skip during dev
  if (import.meta.env.DEV) return;

  const inIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("preview--") ||
    host.endsWith("lovableproject.com") ||
    host.endsWith("lovableproject-dev.com");

  if (inIframe || isPreviewHost) {
    // Defensive: tear down any previously-installed SW in these contexts
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
    }
    return;
  }

  if (!("serviceWorker" in navigator)) return;

  // Use virtual module from vite-plugin-pwa
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          if (onUpdate) onUpdate(() => updateSW(true));
        },
        onOfflineReady() {
          // App ready to work offline
          // eslint-disable-next-line no-console
          console.info("[PWA] Pronto para funcionar offline.");
        },
      });
    })
    .catch(() => {
      // ignore — module only exists in build with PWA plugin
    });
}
