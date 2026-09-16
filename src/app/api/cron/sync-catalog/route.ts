import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncStoreCatalog } from "@/lib/catalogSync";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const stores = await db.store.findMany({
    where: { status: "ACTIVE", googleSheetId: { not: null } },
    select: { id: true, name: true },
  });

  const results = await Promise.allSettled(
    stores.map(async (store) => ({
      store: store.name,
      ...(await syncStoreCatalog(store.id)),
    })),
  );

  return NextResponse.json({
    ok: true,
    results: results.map((r, i) =>
      r.status === "fulfilled"
        ? r.value
        : { store: stores[i].name, error: String(r.reason) },
    ),
  });
}
