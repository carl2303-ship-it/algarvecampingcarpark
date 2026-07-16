export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __accpDeferredInstall?: BeforeInstallPromptEvent | null;
    __accpInstallReady?: boolean;
  }
}

/** Capture the Chrome/Edge install event as early as possible (inline in layout). */
export const EARLY_PWA_CAPTURE_SCRIPT = `
(function () {
  if (typeof window === "undefined") return;
  window.__accpDeferredInstall = null;
  window.__accpInstallReady = false;
  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    window.__accpDeferredInstall = event;
    window.__accpInstallReady = true;
    window.dispatchEvent(new Event("accp-install-ready"));
  });
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function () {});
    });
  }
})();
`;

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window === "undefined") return null;
  return window.__accpDeferredInstall ?? null;
}

export function clearDeferredInstallPrompt(): void {
  if (typeof window === "undefined") return;
  window.__accpDeferredInstall = null;
  window.__accpInstallReady = false;
}

export async function promptAppInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const deferred = getDeferredInstallPrompt();
  if (!deferred) return "unavailable";
  try {
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    clearDeferredInstallPrompt();
    return outcome;
  } catch {
    return "unavailable";
  }
}
