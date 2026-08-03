"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <html lang="pt">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
          textAlign: "center",
          background: "#fff",
          color: "#0f172a",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>Algo correu mal</h1>
        <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
          A página não carregou corretamente. Tente outra vez ou recarregue.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "#0e7a8c",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Tentar outra vez
        </button>
      </body>
    </html>
  );
}
