"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStoreSession } from "@/lib/session";

const VALID_STATUSES = ["NOVO", "EM_ATENDIMENTO", "CONFIRMADO", "CANCELADO"] as const;

export async function updateOrderStatus(orderId: string, status: string) {
  const { storeId, userId } = await requireStoreSession();

  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    throw new Error("Status inválido");
  }

  const order = await db.order.findFirst({ where: { id: orderId, storeId } });
  if (!order) throw new Error("Pedido não encontrado");

  await db.order.update({
    where: { id: orderId },
    data: {
      status: status as (typeof VALID_STATUSES)[number],
      handledByUserId: userId,
      handledAt: new Date(),
    },
  });

  revalidatePath("/pedidos");
}
