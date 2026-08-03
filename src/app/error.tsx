"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App route error:", error);
  }, [error]);

  return (
    <div className="container mx-auto max-w-lg px-4 py-16 text-center space-y-4">
      <h1 className="text-2xl font-semibold">Não foi possível carregar a página</h1>
      <p className="text-muted-foreground text-sm">
        Verifique a ligação à internet e tente novamente. Se usar a app instalada e o problema
        continuar, abra o site no browser ou limpe a cache do site.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={reset}>
          Tentar outra vez
        </Button>
        <Button type="button" variant="outline" onClick={() => (window.location.href = "/")}>
          Ir ao início
        </Button>
      </div>
    </div>
  );
}
