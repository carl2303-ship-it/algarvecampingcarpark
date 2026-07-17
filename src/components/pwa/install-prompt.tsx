"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteLogo } from "@/components/brand/site-logo";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/constants";
import {
  dismissInstallPrompt,
  getInstallPlatform,
  isDismissedRecently,
  isStandaloneMode,
  PWA_DISMISS_KEY,
  registerServiceWorker,
  type InstallPlatform,
} from "@/lib/pwa";
import {
  getDeferredInstallPrompt,
  promptAppInstall,
  waitForInstallPrompt,
} from "@/lib/pwa-install";
import { cn } from "@/lib/utils";

export function InstallPrompt({ locale }: { locale: Locale }) {
  const t = getTranslations(locale).install;
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("other");
  const [canOneClickInstall, setCanOneClickInstall] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showManualFallback, setShowManualFallback] = useState(false);

  useEffect(() => {
    void registerServiceWorker();

    if (isStandaloneMode()) return;

    const forceInstall =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("install");
    if (forceInstall) {
      localStorage.removeItem(PWA_DISMISS_KEY);
    } else if (isDismissedRecently()) {
      return;
    }

    const detected = getInstallPlatform();
    setPlatform(detected);

    const syncDeferred = () => {
      const deferred = getDeferredInstallPrompt();
      if (deferred) {
        setCanOneClickInstall(true);
        setShowManualFallback(false);
        if (detected !== "ios") {
          setPlatform(detected === "desktop" ? "desktop" : "android");
        }
        setVisible(true);
      }
    };

    syncDeferred();
    window.addEventListener("accp-install-ready", syncDeferred);
    window.addEventListener("beforeinstallprompt", syncDeferred);

    if (detected === "ios") {
      const timer = window.setTimeout(() => setVisible(true), 1500);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("accp-install-ready", syncDeferred);
        window.removeEventListener("beforeinstallprompt", syncDeferred);
      };
    }

    const fallback = window.setTimeout(() => {
      syncDeferred();
      setVisible(true);
    }, 2000);

    return () => {
      window.clearTimeout(fallback);
      window.removeEventListener("accp-install-ready", syncDeferred);
      window.removeEventListener("beforeinstallprompt", syncDeferred);
    };
  }, []);

  function handleDismiss() {
    dismissInstallPrompt();
    setVisible(false);
  }

  async function handleInstall() {
    setInstalling(true);
    setShowManualFallback(false);

    let deferred = getDeferredInstallPrompt();
    if (!deferred) {
      deferred = await waitForInstallPrompt(800);
    }

    if (!deferred) {
      setInstalling(false);
      setCanOneClickInstall(false);
      setShowManualFallback(true);
      return;
    }

    setCanOneClickInstall(true);
    const outcome = await promptAppInstall();
    setInstalling(false);

    if (outcome === "accepted") {
      setVisible(false);
      setCanOneClickInstall(false);
      return;
    }

    if (outcome === "dismissed") {
      handleDismiss();
      return;
    }

    setCanOneClickInstall(Boolean(getDeferredInstallPrompt()));
    setShowManualFallback(true);
  }

  if (!visible) return null;

  const isIos = platform === "ios";
  const isDesktop = platform === "desktop" || platform === "other";
  const oneClickReady = canOneClickInstall || Boolean(getDeferredInstallPrompt());

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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 p-1">
            <SiteLogo size="xs" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p id="pwa-install-title" className="font-heading font-semibold leading-snug">
                {isDesktop ? t.desktop_title : t.title}
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
              {isIos ? t.ios_desc : isDesktop ? t.desktop_desc : t.android_desc}
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
            ) : (
              <div className="mt-3 space-y-2">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleInstall}
                  disabled={installing}
                  variant={oneClickReady ? "default" : "secondary"}
                >
                  <Download className="h-4 w-4" />
                  {installing
                    ? t.installing
                    : oneClickReady
                      ? t.install_btn
                      : t.install_btn_wait}
                </Button>
                {oneClickReady ? (
                  <p className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
                    {t.install_ready_hint}
                  </p>
                ) : null}
                {showManualFallback || !oneClickReady ? (
                  <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                    {showManualFallback ? t.install_not_ready : isDesktop ? t.desktop_manual : t.android_manual}
                  </p>
                ) : null}
              </div>
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
