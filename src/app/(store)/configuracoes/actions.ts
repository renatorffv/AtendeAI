"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStoreSession } from "@/lib/session";
import { ensureInstance, getConnectQrCode, getConnectionState } from "@/lib/evolution";

export async function saveStoreSettings(formData: FormData) {
  const { storeId } = await requireStoreSession();

  await db.store.update({
    where: { id: storeId },
    data: {
      whatsappNumber: String(formData.get("whatsappNumber") ?? "").trim() || null,
      evolutionApiUrl: String(formData.get("evolutionApiUrl") ?? "").trim(),
      evolutionApiKey: String(formData.get("evolutionApiKey") ?? "").trim(),
      evolutionInstanceName: String(formData.get("evolutionInstanceName") ?? "").trim(),
      googleSheetId: String(formData.get("googleSheetId") ?? "").trim() || null,
      handoffInstructions: String(formData.get("handoffInstructions") ?? "").trim(),
      aiSystemPromptExtra: String(formData.get("aiSystemPromptExtra") ?? "").trim(),
    },
  });

  revalidatePath("/configuracoes");
}

export async function connectWhatsapp() {
  const { storeId } = await requireStoreSession();
  const store = await db.store.findUniqueOrThrow({ where: { id: storeId } });

  const appUrl = process.env.APP_URL ?? "";
  const webhookUrl = `${appUrl}/api/webhook/evolution/${store.id}?secret=${store.webhookSecret}`;

  const creds = {
    apiUrl: store.evolutionApiUrl,
    apiKey: store.evolutionApiKey,
    instanceName: store.evolutionInstanceName,
  };

  await ensureInstance(creds, webhookUrl);
  const qr = await getConnectQrCode(creds).catch(() => null);

  return { qrCodeBase64: qr?.base64 ?? qr?.qrcode?.base64 ?? null };
}

export async function checkWhatsappStatus() {
  const { storeId } = await requireStoreSession();
  const store = await db.store.findUniqueOrThrow({ where: { id: storeId } });

  const state = await getConnectionState({
    apiUrl: store.evolutionApiUrl,
    apiKey: store.evolutionApiKey,
    instanceName: store.evolutionInstanceName,
  }).catch(() => null);

  return { state: state?.instance?.state ?? state?.state ?? "desconhecido" };
}
