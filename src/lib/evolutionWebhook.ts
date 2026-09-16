/** Extrai o texto/imagem de um payload de webhook `messages.upsert` da Evolution API.
 *  O formato exato pode variar por versão — ajuste aqui se a sua instância enviar campos diferentes. */

export type ParsedIncomingMessage = {
  fromMe: boolean;
  remoteJid: string;
  phoneNumber: string;
  pushName: string | null;
  text: string;
  imageBase64: string | null;
  imageMimeType: string | null;
};

export function parseEvolutionWebhookPayload(body: unknown): ParsedIncomingMessage | null {
  const payload = body as Record<string, unknown>;
  const data = (payload?.data ?? payload) as Record<string, unknown> | undefined;
  if (!data) return null;

  const key = data.key as Record<string, unknown> | undefined;
  const remoteJid = String(key?.remoteJid ?? "");
  if (!remoteJid) return null;

  const fromMe = Boolean(key?.fromMe);
  const phoneNumber = remoteJid.split("@")[0];
  const pushName = (data.pushName as string) ?? null;

  const message = (data.message ?? {}) as Record<string, unknown>;

  const text =
    (message.conversation as string) ??
    (message.extendedTextMessage as Record<string, unknown> | undefined)?.text as string ??
    (message.imageMessage as Record<string, unknown> | undefined)?.caption as string ??
    "";

  const imageMessage = message.imageMessage as Record<string, unknown> | undefined;
  const base64 = (message.base64 as string) ?? null;

  return {
    fromMe,
    remoteJid,
    phoneNumber,
    pushName,
    text: String(text ?? ""),
    imageBase64: imageMessage && base64 ? base64 : null,
    imageMimeType: (imageMessage?.mimetype as string) ?? "image/jpeg",
  };
}
