import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireStoreSession } from "@/lib/session";
import { SyncButton } from "./SyncButton";

export default async function CatalogoPage() {
  const { storeId } = await requireStoreSession();
  const store = await db.store.findUnique({ where: { id: storeId } });

  const products = await db.product.findMany({
    where: { storeId },
    orderBy: { syncedAt: "desc" },
  });

  if (!store?.googleSheetId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Catálogo</h1>
        <div className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center">
          <p className="text-sm text-neutral-600">
            Nenhuma planilha do Google Sheets conectada ainda.
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            Configure o ID da planilha em{" "}
            <Link href="/configuracoes" className="underline">
              Configurações
            </Link>{" "}
            e siga o passo a passo no{" "}
            <Link href="/catalogo/guia" className="underline">
              guia de catálogo
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Catálogo</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Sincronizado da planilha do Google Sheets. {products.length} produto(s).
          </p>
        </div>
        <SyncButton />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => {
          const images = p.imageUrls as unknown as string[];
          const stock = p.stockBySize as unknown as Record<string, number>;
          const totalStock = Object.values(stock ?? {}).reduce((a, b) => a + b, 0);
          return (
            <div key={p.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              <div className="relative h-40 w-full bg-neutral-100">
                {images?.[0] ? (
                  <Image
                    src={images[0]}
                    alt={p.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-neutral-400">
                    Sem foto
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-neutral-900">{p.name}</p>
                <p className="text-xs text-neutral-500">{p.sku}</p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">
                  {Number(p.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Estoque total: {totalStock} {!p.active && "· inativo"}
                </p>
              </div>
            </div>
          );
        })}
        {products.length === 0 && (
          <p className="col-span-full text-sm text-neutral-400">
            Nenhum produto sincronizado ainda. Clique em &quot;Sincronizar agora&quot;.
          </p>
        )}
      </div>
    </div>
  );
}
