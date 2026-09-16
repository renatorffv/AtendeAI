type EvolutionCreds = {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
};

async function evoFetch(creds: EvolutionCreds, path: string, init?: RequestInit) {
  const url = `${creds.apiUrl.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: creds.apiKey,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Evolution API ${res.status} em ${path}: ${body}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** Cria a instância na Evolution API caso ainda não exista, já apontando o webhook para a nossa aplicação. */
export async function ensureInstance(creds: EvolutionCreds, webhookUrl: string) {
  try {
    return await evoFetch(creds, "/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName: creds.instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        webhook: {
          url: webhookUrl,
          byEvents: false,
          base64: true,
          events: ["MESSAGES_UPSERT"],
        },
      }),
    });
  } catch (err) {
    // Instância já existe — não é um erro fatal para o fluxo de conexão.
    return { alreadyExists: true, error: String(err) };
  }
}

export async function getConnectionState(creds: EvolutionCreds) {
  return evoFetch(creds, `/instance/connectionState/${creds.instanceName}`);
}

/** Retorna o QR Code (base64) para conectar o número de WhatsApp da loja. */
export async function getConnectQrCode(creds: EvolutionCreds) {
  return evoFetch(creds, `/instance/connect/${creds.instanceName}`);
}

export async function sendText(creds: EvolutionCreds, to: string, text: string) {
  return evoFetch(creds, `/message/sendText/${creds.instanceName}`, {
    method: "POST",
    body: JSON.stringify({ number: to, text }),
  });
}

export async function sendImage(
  creds: EvolutionCreds,
  to: string,
  imageUrl: string,
  caption?: string,
) {
  return evoFetch(creds, `/message/sendMedia/${creds.instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      number: to,
      mediatype: "image",
      media: imageUrl,
      caption: caption ?? "",
    }),
  });
}

export type { EvolutionCreds };
