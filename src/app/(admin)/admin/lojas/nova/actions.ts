"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";

export async function createStore(formData: FormData) {
  await requireSuperAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const evolutionInstanceName = String(formData.get("evolutionInstanceName") ?? "").trim();
  const evolutionApiUrl = String(formData.get("evolutionApiUrl") ?? "").trim();
  const evolutionApiKey = String(formData.get("evolutionApiKey") ?? "").trim();
  const userEmail = String(formData.get("userEmail") ?? "").trim().toLowerCase();
  const userName = String(formData.get("userName") ?? "").trim();
  const userPassword = String(formData.get("userPassword") ?? "");

  if (!name || !evolutionInstanceName || !userEmail || !userPassword) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }

  const passwordHash = await bcrypt.hash(userPassword, 10);

  const store = await db.store.create({
    data: {
      name,
      evolutionInstanceName,
      evolutionApiUrl: evolutionApiUrl || "https://",
      evolutionApiKey: evolutionApiKey || "",
      users: {
        create: {
          email: userEmail,
          name: userName || name,
          passwordHash,
          role: "STORE_USER",
        },
      },
    },
  });

  redirect(`/admin/lojas/${store.id}`);
}
