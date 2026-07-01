export const PWA_DISMISS_KEY = "accp-pwa-dismissed-at";
export const PWA_DISMISS_DAYS = 7;

export type InstallPlatform = "android" | "ios" | "other";

export function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;
}

export function getInstallPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
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

export async function registerServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    // PWA install may still work on some browsers without SW
  }
}
