import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreSession } from "@/lib/session";
import { sendText } from "@/lib/evolution";

async function loadConversation(storeId: string, id: string) {
  const conversation = await db.conversation.findFirst({
    where: { id, storeId },
    include: { customer: true, store: true },
  });
  return conversation;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { storeId } = await requireStoreSession().catch(() => ({ storeId: null }));
  if (!storeId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const conversation = await loadConversation(storeId, id);
  if (!conversation) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const messages = await db.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      status: conversation.status,
      customer: { name: conversation.customer.name, phoneNumber: conversation.customer.phoneNumber },
    },
    messages,
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { storeId } = await requireStoreSession().catch(() => ({ storeId: null }));
  if (!storeId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const conversation = await loadConversation(storeId, id);
  if (!conversation) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  if (body.type === "status") {
    const status = body.status === "BOT_ACTIVE" ? "BOT_ACTIVE" : "HUMAN_ACTIVE";
    await db.conversation.update({ where: { id }, data: { status } });
    return NextResponse.json({ ok: true });
  }

  if (body.type === "message") {
    const content = String(body.content ?? "").trim();
    if (!content) return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });

    const targetJid =
      conversation.customer.whatsappJid ?? `${conversation.customer.phoneNumber}@s.whatsapp.net`;

    let deliveryError: string | null = null;
    try {
      await sendText(
        {
          apiUrl: conversation.store.evolutionApiUrl,
          apiKey: conversation.store.evolutionApiKey,
          instanceName: conversation.store.evolutionInstanceName,
        },
        targetJid,
        content,
      );
    } catch (err) {
      deliveryError = err instanceof Error ? err.message : "Falha ao enviar mensagem.";
      console.error("Falha ao enviar mensagem manual:", err);
    }

    await db.message.create({
      data: { conversationId: id, direction: "OUT", sender: "HUMAN", content },
    });
    await db.conversation.update({
      where: { id },
      data: { status: "HUMAN_ACTIVE", lastMessageAt: new Date() },
    });

    if (deliveryError) {
      return NextResponse.json({ ok: false, error: deliveryError }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
}
