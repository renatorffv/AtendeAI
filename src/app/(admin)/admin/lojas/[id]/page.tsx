import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { ToggleStatusButton } from "./ToggleStatusButton";

export default async function LojaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;

  const store = await db.store.findUnique({
    where: { id },
    include: {
      users: true,
      _count: { select: { conversations: true, orders: true, products: true } },
    },
  });

  if (!store) notFound();

  const [recentOrders, humanActiveConversations] = await Promise.all([
    db.order.findMany({
      where: { storeId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { customer: true },
    }),
    db.conversation.count({ where: { storeId: id, status: "HUMAN_ACTIVE" } }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{store.name}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Instância: {store.evolutionInstanceName} · Criada em{" "}
            {store.createdAt.toLocaleDateString("pt-BR")}
          </p>
        </div>
        <ToggleStatusButton storeId={store.id} status={store.status} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Conversas" value={store._count.conversations} />
        <Stat label="Aguardando humano" value={humanActiveConversations} highlight={humanActiveConversations > 0} />
        <Stat label="Pedidos" value={store._count.orders} />
        <Stat label="Produtos" value={store._count.products} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-900">Usuários da loja</h2>
          <ul className="mt-3 space-y-2">
            {store.users.map((u) => (
              <li key={u.id} className="text-sm text-neutral-700">
                {u.name} <span className="text-neutral-400">· {u.email}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-900">Pedidos recentes</h2>
          <ul className="mt-3 space-y-2">
            {recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700">
                  {o.customer.name || o.customer.phoneNumber}
                </span>
                <span className="text-xs text-neutral-500">
                  {Number(o.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} ·{" "}
                  {o.status}
                </span>
              </li>
            ))}
            {recentOrders.length === 0 && (
              <p className="text-sm text-neutral-400">Nenhum pedido ainda.</p>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-amber-300 bg-amber-50" : "border-neutral-200 bg-white"}`}>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}
