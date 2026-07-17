"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { gateQrUrl } from "@/lib/constants";
import { adminT } from "@/lib/admin-i18n";

export function GateQrGenerator() {
  const gateUrl = useMemo(() => gateQrUrl(), []);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(gateUrl, {
      width: 320,
      margin: 2,
      color: { dark: "#0e4a56", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then((url) => {
      if (active) setQrDataUrl(url);
    });
    return () => {
      active = false;
    };
  }, [gateUrl]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(gateUrl);
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
    link.download = "algarve-camping-gate-qr.png";
    link.click();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          {adminT.gateAccess.qrTitle}
        </CardTitle>
        <CardDescription>{adminT.gateAccess.qrDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={adminT.gateAccess.qrAlt}
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
              <Label htmlFor="gate_qr_url">{adminT.gateAccess.qrUrlLabel}</Label>
              <Input id="gate_qr_url" readOnly value={gateUrl} className="font-mono text-xs" />
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
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {adminT.gateAccess.qrPrintHint}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
