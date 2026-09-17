import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseEvolutionWebhookPayload } from "@/lib/evolutionWebhook";
import { generateReply } from "@/lib/claude";
import { sendText, sendImage } from "@/lib/evolution";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;

  const store = await db.store.findUnique({ where: { id: storeId } });
  if (!store) {
    return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
  }

  const secret = new URL(request.url).searchParams.get("secret");
  if (secret !== store.webhookSecret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseEvolutionWebhookPayload(body);

  if (!parsed || parsed.fromMe || !parsed.text.trim() && !parsed.imageBase64) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const customer = await db.customer.upsert({
    where: { storeId_phoneNumber: { storeId: store.id, phoneNumber: parsed.phoneNumber } },
    update: { whatsappJid: parsed.remoteJid, ...(parsed.pushName ? { name: parsed.pushName } : {}) },
    create: {
      storeId: store.id,
      phoneNumber: parsed.phoneNumber,
      whatsappJid: parsed.remoteJid,
      name: parsed.pushName,
    },
  });

  let conversation = await db.conversation.findFirst({
    where: { storeId: store.id, customerId: customer.id, status: { not: "CLOSED" } },
    orderBy: { lastMessageAt: "desc" },
  });

  if (!conversation) {
    conversation = await db.conversation.create({
      data: { storeId: store.id, customerId: customer.id },
    });
  }

  await db.message.create({
    data: {
      conversationId: conversation.id,
      direction: "IN",
      sender: "CUSTOMER",
      content: parsed.text || "[imagem]",
      mediaType: parsed.imageBase64 ? parsed.imageMimeType : null,
    },
  });

  await db.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });

  if (conversation.status === "HUMAN_ACTIVE") {
    return NextResponse.json({ ok: true, handledByHuman: true });
  }

  const history = await db.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 40,
  });

  const { text, images } = await generateReply({
    store,
    history: history.slice(0, -1),
    incoming: {
      text: parsed.text,
      imageBase64: parsed.imageBase64 ?? undefined,
      imageMediaType: parsed.imageMimeType ?? undefined,
    },
    ctx: { storeId: store.id, customerId: customer.id, conversationId: conversation.id },
  });

  await db.message.create({
    data: {
      conversationId: conversation.id,
      direction: "OUT",
      sender: "BOT",
      content: text,
      mediaUrl: images[0] ?? null,
      mediaType: images[0] ? "image" : null,
    },
  });

  const creds = {
    apiUrl: store.evolutionApiUrl,
    apiKey: store.evolutionApiKey,
    instanceName: store.evolutionInstanceName,
  };

  if (images.length > 0) {
    await sendImage(creds, parsed.remoteJid, images[0], text).catch((err) =>
      console.error("Falha ao enviar imagem via Evolution API:", err),
    );
    for (const extra of images.slice(1)) {
      await sendImage(creds, parsed.remoteJid, extra).catch((err) =>
        console.error("Falha ao enviar imagem extra via Evolution API:", err),
      );
    }
  } else {
    await sendText(creds, parsed.remoteJid, text).catch((err) =>
      console.error("Falha ao enviar resposta via Evolution API:", err),
    );
  }

  return NextResponse.json({ ok: true });
}
