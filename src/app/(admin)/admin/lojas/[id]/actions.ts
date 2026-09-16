"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";

export async function toggleStoreStatus(storeId: string) {
  await requireSuperAdmin();

  const store = await db.store.findUniqueOrThrow({ where: { id: storeId } });
  await db.store.update({
    where: { id: storeId },
    data: { status: store.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" },
  });

  revalidatePath(`/admin/lojas/${storeId}`);
  revalidatePath("/admin");
}
