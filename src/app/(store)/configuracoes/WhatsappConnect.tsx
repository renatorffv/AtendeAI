"use client";

import { useState, useTransition } from "react";
import { connectWhatsapp, checkWhatsappStatus } from "./actions";

export function WhatsappConnect() {
  const [pending, startTransition] = useTransition();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleConnect() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await connectWhatsapp();
        if (res.qrCodeBase64) {
          setQrCode(res.qrCodeBase64);
        } else {
          setError("Não foi possível gerar o QR Code. Verifique a URL/chave da Evolution API.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao conectar.");
      }
    });
  }

  function handleCheckStatus() {
    startTransition(async () => {
      const res = await checkWhatsappStatus();
      setStatus(res.state);
    });
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-neutral-900">Conexão com o WhatsApp</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Salve os dados da Evolution API abaixo antes de conectar. Depois, escaneie o QR Code com o
        WhatsApp que vai atender os clientes.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleConnect}
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Gerando..." : "Gerar QR Code"}
        </button>
        <button
          type="button"
          onClick={handleCheckStatus}
          disabled={pending}
          className="rounded-md border border-neutral-300 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          Verificar status da conexão
        </button>
        {status && <span className="text-xs text-neutral-500">Status: {status}</span>}
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      {qrCode && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
          alt="QR Code de conexão do WhatsApp"
          className="mt-4 h-56 w-56 rounded-md border border-neutral-200"
        />
      )}
    </div>
  );
}
