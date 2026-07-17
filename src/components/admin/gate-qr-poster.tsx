"use client";

import { PUBLIC_SITE_URL, SITE_NAME } from "@/lib/constants";
import { adminT } from "@/lib/admin-i18n";

type GateQrPosterProps = {
  gateUrl: string;
  qrDataUrl: string | null;
};

export function openGateQrPosterPrint({ gateUrl, qrDataUrl }: GateQrPosterProps) {
  if (!qrDataUrl) return;

  const poster = adminT.gateAccess.poster;
  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) return;

  printWindow.document.write(`<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <title>${poster.docTitle}</title>
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
      <img class="logo" src="${PUBLIC_SITE_URL}/logo.png" alt="${SITE_NAME}" />
      <p class="brand">${SITE_NAME}</p>
    </div>
    <div>
      <h1>${poster.headline}</h1>
      <p class="lead">${poster.instructions}</p>
      <div class="qr-wrap">
        <img class="qr" src="${qrDataUrl}" alt="QR code" />
      </div>
      <p class="sub">${poster.required}</p>
    </div>
    <p class="url">${gateUrl}</p>
  </div>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`);
  printWindow.document.close();
}
