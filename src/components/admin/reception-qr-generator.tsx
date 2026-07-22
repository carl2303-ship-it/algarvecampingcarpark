"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, Printer, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { receptionQrUrl } from "@/lib/constants";
import { adminT } from "@/lib/admin-i18n";
import { openReceptionQrPosterPrint } from "@/components/admin/reception-qr-poster";

export function ReceptionQrGenerator() {
  const receptionUrl = useMemo(() => receptionQrUrl(), []);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(receptionUrl, {
      width: 480,
      margin: 2,
      color: { dark: "#0e4a56", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then((url) => {
      if (active) setQrDataUrl(url);
    });
    return () => {
      active = false;
    };
  }, [receptionUrl]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(receptionUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function handleDownload() {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = "algarve-camping-reception-qr.png";
    link.click();
  }

  function handlePrintA4() {
    openReceptionQrPosterPrint({ receptionUrl, qrDataUrl });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          {adminT.gateAccess.receptionQrTitle}
        </CardTitle>
        <CardDescription>{adminT.gateAccess.receptionQrDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={adminT.gateAccess.receptionQrAlt}
                width={256}
                height={256}
                className="h-64 w-64"
              />
            ) : (
              <div className="flex h-64 w-64 items-center justify-center text-sm text-muted-foreground">
                …
              </div>
            )}
          </div>
          <div className="w-full space-y-3 sm:flex-1">
            <div className="space-y-2">
              <Label htmlFor="reception_qr_url">{adminT.gateAccess.receptionQrUrlLabel}</Label>
              <Input
                id="reception_qr_url"
                readOnly
                value={receptionUrl}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" />
                {copied ? adminT.gateAccess.qrCopied : adminT.gateAccess.qrCopy}
              </Button>
              <Button type="button" onClick={handleDownload} disabled={!qrDataUrl}>
                <Download className="mr-2 h-4 w-4" />
                {adminT.gateAccess.qrDownload}
              </Button>
              <Button type="button" variant="secondary" onClick={handlePrintA4} disabled={!qrDataUrl}>
                <Printer className="mr-2 h-4 w-4" />
                {adminT.gateAccess.qrPrintA4}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {adminT.gateAccess.receptionQrPrintHint}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
