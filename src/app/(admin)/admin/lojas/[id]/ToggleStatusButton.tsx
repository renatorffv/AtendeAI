"use client";

import { useTransition } from "react";
import { toggleStoreStatus } from "./actions";

export function ToggleStatusButton({ storeId, status }: { storeId: string; status: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => toggleStoreStatus(storeId))}
      disabled={pending}
      className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
    >
      {status === "ACTIVE" ? "Suspender loja" : "Reativar loja"}
    </button>
  );
}
