"use client";

import { useState, useTransition } from "react";
import { syncCatalogNow } from "./actions";

export function SyncButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await syncCatalogNow();
        setMessage(`${result.syncedCount} produtos sincronizados.`);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Erro ao sincronizar.");
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Sincronizando..." : "Sincronizar agora"}
      </button>
      {message && <span className="text-sm text-neutral-500">{message}</span>}
    </div>
  );
}
