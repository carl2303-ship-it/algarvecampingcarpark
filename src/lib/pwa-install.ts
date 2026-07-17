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

/** Capture install event and register the service worker as early as possible. */
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
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function () {});
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

/** Wait briefly for beforeinstallprompt (must stay short to preserve user activation). */
export function waitForInstallPrompt(timeoutMs = 800): Promise<BeforeInstallPromptEvent | null> {
  const existing = getDeferredInstallPrompt();
  if (existing) return Promise.resolve(existing);
  if (typeof window === "undefined") return Promise.resolve(null);

  return new Promise((resolve) => {
    const finish = () => {
      cleanup();
      resolve(getDeferredInstallPrompt());
    };

    const timer = window.setTimeout(finish, timeoutMs);

    function cleanup() {
      window.clearTimeout(timer);
      window.removeEventListener("accp-install-ready", finish);
      window.removeEventListener("beforeinstallprompt", finish);
    }

    window.addEventListener("accp-install-ready", finish);
    window.addEventListener("beforeinstallprompt", finish);
  });
}
