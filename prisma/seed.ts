import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@atendeai.com.br";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "troque-esta-senha";
  const storeUserEmail = process.env.SEED_STORE_EMAIL ?? "loja@atendeai.com.br";
  const storeUserPassword = process.env.SEED_STORE_PASSWORD ?? "troque-esta-senha";

  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const storePasswordHash = await bcrypt.hash(storeUserPassword, 10);

  await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      name: "Administrador Geral",
      role: "SUPER_ADMIN",
    },
  });

  const store = await db.store.upsert({
    where: { evolutionInstanceName: "loja-demo" },
    update: {},
    create: {
      name: "Loja Demo",
      evolutionInstanceName: "loja-demo",
      evolutionApiUrl: "https://evolution.exemplo.com.br",
      evolutionApiKey: "troque-esta-chave",
      handoffInstructions:
        "Transfira para um atendente humano quando o cliente reclamar, pedir desconto/negociar preço, " +
        "relatar problema com um pedido já feito, ou pedir explicitamente para falar com uma pessoa.",
    },
  });

  await db.user.upsert({
    where: { email: storeUserEmail },
    update: {},
    create: {
      email: storeUserEmail,
      passwordHash: storePasswordHash,
      name: "Atendente Loja Demo",
      role: "STORE_USER",
      storeId: store.id,
    },
  });

  console.log("Seed concluído:");
  console.log(`  Super admin: ${adminEmail} / ${adminPassword}`);
  console.log(`  Usuário loja: ${storeUserEmail} / ${storeUserPassword}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
