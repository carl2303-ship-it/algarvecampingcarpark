"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function BookError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Book page error:", error);
  }, [error]);

  return (
    <div className="container mx-auto max-w-lg px-4 py-16 text-center space-y-4">
      <h1 className="text-2xl font-semibold">Não foi possível carregar esta etapa</h1>
      <p className="text-muted-foreground text-sm">
        Verifique a ligação à internet e tente novamente. Se o problema continuar, abra o site no
        browser (Chrome/Safari) em vez da app instalada, ou limpe a cache do site.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={reset}>
          Tentar outra vez
        </Button>
        <Button type="button" variant="outline" onClick={() => (window.location.href = "/book")}>
          Reiniciar reserva
        </Button>
      </div>
    </div>
  );
}
