import { db } from "@/lib/db";
import { fetchStoreCatalog } from "@/lib/googleSheets";

export async function syncStoreCatalog(storeId: string) {
  const store = await db.store.findUnique({ where: { id: storeId } });
  if (!store?.googleSheetId) {
    throw new Error("Loja sem Google Sheet ID configurado.");
  }

  const rows = await fetchStoreCatalog(store.googleSheetId);

  await db.$transaction(
    rows.map((row) =>
      db.product.upsert({
        where: { storeId_sku: { storeId, sku: row.sku } },
        update: {
          name: row.name,
          category: row.category,
          description: row.description,
          colors: row.colors,
          sizes: row.sizes,
          stockBySize: row.stockBySize,
          price: row.price,
          imageUrls: row.imageUrls,
          sheetRowId: row.sheetRowId,
          active: row.active,
          syncedAt: new Date(),
        },
        create: {
          storeId,
          sku: row.sku,
          name: row.name,
          category: row.category,
          description: row.description,
          colors: row.colors,
          sizes: row.sizes,
          stockBySize: row.stockBySize,
          price: row.price,
          imageUrls: row.imageUrls,
          sheetRowId: row.sheetRowId,
          active: row.active,
        },
      }),
    ),
  );

  return { syncedCount: rows.length };
}
