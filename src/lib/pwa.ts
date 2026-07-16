export const PWA_DISMISS_KEY = "accp-pwa-dismissed-at";
export const PWA_DISMISS_DAYS = 7;

export type InstallPlatform = "android" | "ios" | "desktop" | "other";

export function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    window.innerWidth < 768 ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function getInstallPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  // iPadOS 13+ often reports as Macintosh
  if (
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  ) {
    return "ios";
  }
  if (/Android/i.test(ua)) return "android";
  if (/Windows|Macintosh|Linux|CrOS/i.test(ua) && !/Mobile/i.test(ua)) {
    return "desktop";
  }
  return "other";
}

export function isDismissedRecently(): boolean {
  if (typeof localStorage === "undefined") return false;
  const raw = localStorage.getItem(PWA_DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = parseInt(raw, 10);
  if (Number.isNaN(dismissedAt)) return false;
  const ms = PWA_DISMISS_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - dismissedAt < ms;
}

export function dismissInstallPrompt(): void {
  localStorage.setItem(PWA_DISMISS_KEY, String(Date.now()));
}

/** Clears the dismiss flag so the banner can show again (e.g. after testing). */
export function clearInstallPromptDismiss(): void {
  localStorage.removeItem(PWA_DISMISS_KEY);
}

export async function registerServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    // PWA install may still work on some browsers without SW
  }
}
