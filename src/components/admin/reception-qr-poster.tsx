"use client";

import { LOCALES, PUBLIC_SITE_URL, SITE_NAME, type Locale } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n";
import { adminT } from "@/lib/admin-i18n";

type ReceptionQrPosterProps = {
  receptionUrl: string;
  qrDataUrl: string | null;
};

const LOCALE_LABELS: Record<Locale, string> = {
  pt: "Português",
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildLanguageBlocks(): string {
  return LOCALES.map((locale) => {
    const poster = getTranslations(locale).reception.poster;
    const tag = escapeHtml(locale.toUpperCase());
    const label = escapeHtml(LOCALE_LABELS[locale]);
    const headline = escapeHtml(poster.headline);
    const instructions = escapeHtml(poster.instructions);
    const required = escapeHtml(poster.required);

    return `<article class="lang-block">
      <p class="lang-tag"><span class="lang-code">${tag}</span> ${label}</p>
      <p class="lang-headline">${headline}</p>
      <p class="lang-text">${instructions}</p>
      <p class="lang-required">${required}</p>
    </article>`;
  }).join("");
}

function buildPosterHtml({
  receptionUrl,
  qrDataUrl,
}: {
  receptionUrl: string;
  qrDataUrl: string;
}) {
  const docTitle = escapeHtml(adminT.gateAccess.receptionPoster.docTitle);
  const logoUrl = `${PUBLIC_SITE_URL}/logo.png`;
  const siteName = escapeHtml(SITE_NAME);
  const safeReceptionUrl = escapeHtml(receptionUrl);
  const noQrHint = escapeHtml(adminT.gateAccess.receptionPoster.noQrHint);
  const languageBlocks = buildLanguageBlocks();

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <title>${docTitle}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      color: #0e4a56;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      width: 190mm;
      min-height: 277mm;
      margin: 0 auto;
      padding: 6mm 8mm 8mm;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .header {
      width: 100%;
      text-align: center;
      flex-shrink: 0;
    }
    .logo {
      width: 108mm;
      max-height: 44mm;
      height: auto;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
    .brand {
      margin: 3mm 0 0;
      font-size: 11pt;
      font-weight: 600;
      color: #0e7a8c;
      letter-spacing: 0.02em;
    }
    .qr-section {
      flex: 1;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6mm 0;
      min-height: 100mm;
    }
    .qr-wrap {
      padding: 6mm;
      border: 3px solid #0e7a8c;
      border-radius: 8mm;
      background: #fff;
      box-shadow: 0 4mm 12mm rgba(14, 74, 86, 0.12);
    }
    .qr {
      width: 92mm;
      height: 92mm;
      display: block;
    }
    .languages {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3mm 5mm;
      margin-top: 2mm;
      padding-top: 4mm;
      border-top: 1px solid #cbd5e1;
    }
    .lang-block {
      border-left: 3px solid #0e7a8c;
      padding: 0 0 0 3mm;
      text-align: left;
    }
    .lang-block:last-child:nth-child(odd) {
      grid-column: 1 / -1;
      max-width: 50%;
      justify-self: center;
    }
    .lang-tag {
      margin: 0;
      font-size: 7pt;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .lang-code {
      display: inline-block;
      min-width: 5mm;
      padding: 0.4mm 1.6mm;
      margin-right: 1mm;
      border-radius: 1mm;
      background: #0e7a8c;
      color: #fff;
      font-weight: 700;
      font-size: 6.5pt;
    }
    .lang-headline {
      margin: 1mm 0 0;
      font-size: 8.5pt;
      font-weight: 700;
      line-height: 1.25;
      color: #0e4a56;
    }
    .lang-text,
    .lang-required {
      margin: 0.8mm 0 0;
      font-size: 7pt;
      line-height: 1.35;
      color: #475569;
    }
    .lang-required {
      font-weight: 600;
      color: #334155;
    }
    .book-link {
      width: 100%;
      margin-top: 5mm;
      padding: 4mm 3mm;
      border: 2px solid #0e7a8c;
      border-radius: 3mm;
      background: #f0fdfa;
      text-align: center;
    }
    .book-link-hint {
      margin: 0;
      font-size: 8pt;
      color: #0f766e;
      font-weight: 600;
    }
    .book-link-url {
      margin: 2mm 0 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13pt;
      font-weight: 700;
      color: #0e4a56;
      word-break: break-all;
      line-height: 1.3;
    }
    .footer-url {
      width: 100%;
      margin-top: 3mm;
      text-align: center;
      font-size: 7pt;
      color: #94a3b8;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="header">
      <img class="logo" src="${logoUrl}" alt="${siteName}" />
      <p class="brand">${siteName}</p>
    </header>

    <section class="qr-section" aria-label="QR code">
      <div class="qr-wrap">
        <img class="qr" src="${qrDataUrl}" alt="QR code" />
      </div>
    </section>

    <section class="languages" aria-label="Instructions">
      ${languageBlocks}
    </section>

    <div class="book-link">
      <p class="book-link-hint">${noQrHint}</p>
      <p class="book-link-url">${safeReceptionUrl}</p>
    </div>
    <p class="footer-url">QR → ${safeReceptionUrl}</p>
  </div>
  <script>
    function printWhenReady() {
      var imgs = document.images;
      if (!imgs.length) {
        window.print();
        return;
      }
      var pending = 0;
      for (var i = 0; i < imgs.length; i++) {
        if (imgs[i].complete) continue;
        pending++;
        imgs[i].addEventListener("load", onDone);
        imgs[i].addEventListener("error", onDone);
      }
      if (!pending) window.print();
      function onDone() {
        pending--;
        if (pending <= 0) window.print();
      }
    }
    window.addEventListener("load", printWhenReady);
  </script>
</body>
</html>`;
}

export function openReceptionQrPosterPrint({ receptionUrl, qrDataUrl }: ReceptionQrPosterProps) {
  if (!qrDataUrl) return;

  const html = buildPosterHtml({ receptionUrl, qrDataUrl });
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);

  const printWindow = window.open(blobUrl, "_blank");
  if (!printWindow) {
    URL.revokeObjectURL(blobUrl);
    return;
  }

  printWindow.addEventListener("load", () => {
    URL.revokeObjectURL(blobUrl);
  });
}
