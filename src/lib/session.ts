import { auth } from "@/lib/auth";

export async function requireStoreSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== "STORE_USER" || !session.user.storeId) {
    throw new Error("Não autorizado");
  }
  return { userId: session.user.id, storeId: session.user.storeId };
}

export async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Não autorizado");
  }
  return { userId: session.user.id };
}
