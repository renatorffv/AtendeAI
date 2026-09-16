"use server";

import { revalidatePath } from "next/cache";
import { requireStoreSession } from "@/lib/session";
import { syncStoreCatalog } from "@/lib/catalogSync";

export async function syncCatalogNow() {
  const { storeId } = await requireStoreSession();
  const result = await syncStoreCatalog(storeId);
  revalidatePath("/catalogo");
  return result;
}
