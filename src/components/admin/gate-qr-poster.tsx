"use client";

import { PUBLIC_SITE_URL, SITE_NAME } from "@/lib/constants";
import { adminT } from "@/lib/admin-i18n";

type GateQrPosterProps = {
  gateUrl: string;
  qrDataUrl: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPosterHtml({
  gateUrl,
  qrDataUrl,
}: {
  gateUrl: string;
  qrDataUrl: string;
}) {
  const poster = adminT.gateAccess.poster;
  const logoUrl = `${PUBLIC_SITE_URL}/logo.png`;
  const siteName = escapeHtml(SITE_NAME);
  const docTitle = escapeHtml(poster.docTitle);
  const headline = escapeHtml(poster.headline);
  const instructions = escapeHtml(poster.instructions);
  const required = escapeHtml(poster.required);
  const safeGateUrl = escapeHtml(gateUrl);

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <title>${docTitle}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      color: #0e4a56;
      background: #fff;
    }
    .sheet {
      width: 182mm;
      min-height: 269mm;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
      padding: 8mm 6mm;
    }
    .logo {
      max-width: 72mm;
      max-height: 28mm;
      object-fit: contain;
    }
    h1 {
      margin: 6mm 0 2mm;
      font-size: 17pt;
      font-weight: 700;
      line-height: 1.25;
      max-width: 150mm;
    }
    .lead {
      margin: 0 0 8mm;
      font-size: 13pt;
      line-height: 1.45;
      max-width: 145mm;
      color: #155e75;
    }
    .qr-wrap {
      padding: 5mm;
      border: 2px solid #0e7a8c;
      border-radius: 6mm;
      background: #fff;
    }
    .qr {
      width: 78mm;
      height: 78mm;
      display: block;
    }
    .sub {
      margin: 8mm 0 0;
      font-size: 11pt;
      line-height: 1.45;
      max-width: 145mm;
      color: #334155;
    }
    .url {
      margin-top: 10mm;
      font-size: 9pt;
      color: #64748b;
      word-break: break-all;
    }
    .brand {
      margin-top: 4mm;
      font-size: 10pt;
      font-weight: 600;
      color: #0e7a8c;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div>
      <img class="logo" src="${logoUrl}" alt="${siteName}" />
      <p class="brand">${siteName}</p>
    </div>
    <div>
      <h1>${headline}</h1>
      <p class="lead">${instructions}</p>
      <div class="qr-wrap">
        <img class="qr" src="${qrDataUrl}" alt="QR code" />
      </div>
      <p class="sub">${required}</p>
    </div>
    <p class="url">${safeGateUrl}</p>
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

export function openGateQrPosterPrint({ gateUrl, qrDataUrl }: GateQrPosterProps) {
  if (!qrDataUrl) return;

  const html = buildPosterHtml({ gateUrl, qrDataUrl });
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);

  // Do not pass noopener — it makes window.open return null and leaves a blank tab.
  const printWindow = window.open(blobUrl, "_blank");
  if (!printWindow) {
    URL.revokeObjectURL(blobUrl);
    return;
  }

  printWindow.addEventListener("load", () => {
    URL.revokeObjectURL(blobUrl);
  });
}
