import { db } from "@/lib/db";
import { requireStoreSession } from "@/lib/session";

async function getDashboardStats(storeId: string) {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [botActive, humanActive, ordersNovos, ordersTotal, productsCount, conversationsToday] =
    await Promise.all([
      db.conversation.count({ where: { storeId, status: "BOT_ACTIVE" } }),
      db.conversation.count({ where: { storeId, status: "HUMAN_ACTIVE" } }),
      db.order.count({ where: { storeId, status: "NOVO" } }),
      db.order.count({ where: { storeId } }),
      db.product.count({ where: { storeId, active: true } }),
      db.conversation.count({ where: { storeId, lastMessageAt: { gte: since24h } } }),
    ]);

  return { botActive, humanActive, ordersNovos, ordersTotal, productsCount, conversationsToday };
}

export default async function DashboardPage() {
  const { storeId } = await requireStoreSession();

  const { botActive, humanActive, ordersNovos, ordersTotal, productsCount, conversationsToday } =
    await getDashboardStats(storeId);

  const cards = [
    { label: "Conversas com o bot ativo", value: botActive },
    { label: "Aguardando atendimento humano", value: humanActive, highlight: humanActive > 0 },
    { label: "Pedidos novos", value: ordersNovos, highlight: ordersNovos > 0 },
    { label: "Pedidos no total", value: ordersTotal },
    { label: "Produtos ativos no catálogo", value: productsCount },
    { label: "Conversas nas últimas 24h", value: conversationsToday },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
      <p className="mt-1 text-sm text-neutral-500">Visão geral do atendimento da sua loja.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-5 ${
              card.highlight ? "border-amber-300 bg-amber-50" : "border-neutral-200 bg-white"
            }`}
          >
            <p className="text-sm text-neutral-500">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-neutral-900">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
