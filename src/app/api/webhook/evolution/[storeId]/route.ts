import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseEvolutionWebhookPayload } from "@/lib/evolutionWebhook";
import { generateReply } from "@/lib/claude";
import { sendText } from "@/lib/evolution";

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
    update: parsed.pushName ? { name: parsed.pushName } : {},
    create: { storeId: store.id, phoneNumber: parsed.phoneNumber, name: parsed.pushName },
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

  const { text } = await generateReply({
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
    },
  });

  await sendText(
    {
      apiUrl: store.evolutionApiUrl,
      apiKey: store.evolutionApiKey,
      instanceName: store.evolutionInstanceName,
    },
    parsed.remoteJid,
    text,
  ).catch((err) => console.error("Falha ao enviar resposta via Evolution API:", err));

  return NextResponse.json({ ok: true });
}
