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

/** Comportamento da instância pensado para parecer um aparelho comum e reduzir o risco de bloqueio:
 *  recusa ligações, ignora grupos, não fica "online" o tempo todo e não confirma leitura automaticamente
 *  (a leitura é marcada por nós, só nas conversas que o bot atende). */
const INSTANCE_SETTINGS = {
  rejectCall: true,
  msgCall: "Não conseguimos atender ligações por aqui. Por favor, envie sua mensagem por escrito.",
  groupsIgnore: true,
  alwaysOnline: false,
  readMessages: false,
  readStatus: false,
  syncFullHistory: false,
};

/** Cria a instância na Evolution API caso ainda não exista, já apontando o webhook para a nossa aplicação. */
export async function ensureInstance(creds: EvolutionCreds, webhookUrl: string) {
  try {
    return await evoFetch(creds, "/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName: creds.instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        ...INSTANCE_SETTINGS,
        webhook: {
          url: webhookUrl,
          byEvents: false,
          base64: true,
          events: ["MESSAGES_UPSERT"],
        },
      }),
    });
  } catch (err) {
    // Instância já existe — não é um erro fatal para o fluxo de conexão, mas garante que ela
    // também receba as configurações atuais (instâncias antigas foram criadas sem elas).
    await applyInstanceSettings(creds).catch((settingsErr) =>
      console.error("Falha ao aplicar configurações da instância na Evolution API:", settingsErr),
    );
    return { alreadyExists: true, error: String(err) };
  }
}

export async function applyInstanceSettings(creds: EvolutionCreds) {
  return evoFetch(creds, `/settings/set/${creds.instanceName}`, {
    method: "POST",
    body: JSON.stringify(INSTANCE_SETTINGS),
  });
}

export async function getConnectionState(creds: EvolutionCreds) {
  return evoFetch(creds, `/instance/connectionState/${creds.instanceName}`);
}

/** Retorna o QR Code (base64) para conectar o número de WhatsApp da loja. */
export async function getConnectQrCode(creds: EvolutionCreds) {
  return evoFetch(creds, `/instance/connect/${creds.instanceName}`);
}

/** `delayMs`: a Evolution mostra "digitando…" para o cliente durante esse tempo antes de enviar. */
export async function sendText(creds: EvolutionCreds, to: string, text: string, delayMs?: number) {
  return evoFetch(creds, `/message/sendText/${creds.instanceName}`, {
    method: "POST",
    body: JSON.stringify({ number: to, text, ...(delayMs ? { delay: delayMs } : {}) }),
  });
}

export async function sendImage(
  creds: EvolutionCreds,
  to: string,
  imageUrl: string,
  caption?: string,
  delayMs?: number,
) {
  return evoFetch(creds, `/message/sendMedia/${creds.instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      number: to,
      mediatype: "image",
      media: imageUrl,
      caption: caption ?? "",
      ...(delayMs ? { delay: delayMs } : {}),
    }),
  });
}

export async function markAsRead(creds: EvolutionCreds, remoteJid: string, messageId: string) {
  return evoFetch(creds, `/chat/markMessageAsRead/${creds.instanceName}`, {
    method: "POST",
    body: JSON.stringify({ readMessages: [{ remoteJid, fromMe: false, id: messageId }] }),
  });
}

function randomBetween(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

/** Tempo de "digitando…" proporcional ao tamanho da resposta, com variação para não ficar mecânico. */
export function typingDelayFor(text: string) {
  const jittered = (1200 + text.length * 35) * (0.8 + Math.random() * 0.4);
  return Math.min(8000, Math.max(2000, Math.round(jittered)));
}

/** Pausa entre imagens enviadas em sequência. */
export function pauseBetweenImages() {
  return randomBetween(1500, 3000);
}

export type { EvolutionCreds };
