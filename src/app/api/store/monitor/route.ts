import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreSession } from "@/lib/session";

export async function GET() {
  const { storeId } = await requireStoreSession().catch(() => ({ storeId: null }));
  if (!storeId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const conversations = await db.conversation.findMany({
    where: { storeId },
    orderBy: [{ status: "desc" }, { lastMessageAt: "desc" }],
    take: 100,
    include: {
      customer: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return NextResponse.json({
    conversations: conversations.map((c) => ({
      id: c.id,
      status: c.status,
      lastMessageAt: c.lastMessageAt,
      customer: { name: c.customer.name, phoneNumber: c.customer.phoneNumber },
      lastMessage: c.messages[0]
        ? { content: c.messages[0].content, direction: c.messages[0].direction, sender: c.messages[0].sender }
        : null,
    })),
  });
}
