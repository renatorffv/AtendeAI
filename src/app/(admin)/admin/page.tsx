import Link from "next/link";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";

export default async function AdminPage() {
  await requireSuperAdmin();

  const stores = await db.store.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { conversations: true, orders: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Lojas</h1>
      <p className="mt-1 text-sm text-neutral-500">Visão geral de todas as lojas na plataforma.</p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3">Loja</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Conversas</th>
              <th className="px-4 py-3">Pedidos</th>
              <th className="px-4 py-3">Criada em</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => (
              <tr key={store.id} className="border-b border-neutral-100">
                <td className="px-4 py-3">
                  <Link href={`/admin/lojas/${store.id}`} className="font-medium text-neutral-900 hover:underline">
                    {store.name}
                  </Link>
                  <p className="text-xs text-neutral-500">{store.evolutionInstanceName}</p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      store.status === "ACTIVE"
                        ? "bg-green-100 text-green-800"
                        : "bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    {store.status === "ACTIVE" ? "Ativa" : "Suspensa"}
                  </span>
                </td>
                <td className="px-4 py-3">{store._count.conversations}</td>
                <td className="px-4 py-3">{store._count.orders}</td>
                <td className="px-4 py-3 text-xs text-neutral-500">
                  {store.createdAt.toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
            {stores.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-400">
                  Nenhuma loja cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
