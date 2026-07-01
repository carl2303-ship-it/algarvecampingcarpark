"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/constants";
import {
  dismissInstallPrompt,
  getInstallPlatform,
  isDismissedRecently,
  isMobileDevice,
  isStandaloneMode,
  registerServiceWorker,
  type InstallPlatform,
} from "@/lib/pwa";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt({ locale }: { locale: Locale }) {
  const t = getTranslations(locale).install;
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("other");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    registerServiceWorker();

    if (isStandaloneMode() || isDismissedRecently() || !isMobileDevice()) return;

    const detected = getInstallPlatform();
    if (detected === "other") return;

    setPlatform(detected);

    if (detected === "android") {
      const onBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setVisible(true);
      };
      const fallback = window.setTimeout(() => setVisible(true), 2500);
      window.addEventListener("beforeinstallprompt", onBeforeInstall);
      return () => {
        window.clearTimeout(fallback);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      };
    }

    // iOS: no beforeinstallprompt — show instructions after short delay
    const timer = window.setTimeout(() => setVisible(true), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  function handleDismiss() {
    dismissInstallPrompt();
    setVisible(false);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") setVisible(false);
    else handleDismiss();
  }

  if (!visible) return null;

  const isIos = platform === "ios";

  return (
    <div
      role="dialog"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-desc"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
        "animate-in slide-in-from-bottom-4 duration-500"
      )}
    >
      <div className="mx-auto max-w-lg rounded-2xl border bg-card/95 p-4 shadow-2xl shadow-primary/10 ring-1 ring-black/5 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
            {isIos ? "📱" : "📲"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p id="pwa-install-title" className="font-heading font-semibold leading-snug">
                {t.title}
              </p>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t.dismiss}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p id="pwa-install-desc" className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {isIos ? t.ios_desc : t.android_desc}
            </p>

            {isIos ? (
              <ol className="mt-3 space-y-2 text-sm">
                <li className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
                  <Share className="h-4 w-4 shrink-0 text-primary" />
                  <span>{t.ios_step1}</span>
                </li>
                <li className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
                  <Smartphone className="h-4 w-4 shrink-0 text-primary" />
                  <span>{t.ios_step2}</span>
                </li>
              </ol>
            ) : deferredPrompt ? (
              <Button className="mt-3 w-full" onClick={handleInstall}>
                <Download className="h-4 w-4" />
                {t.install_btn}
              </Button>
            ) : (
              <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-sm">{t.android_manual}</p>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              {t.later}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
