import { db } from "@/lib/db";
import { requireStoreSession } from "@/lib/session";
import { OrderStatusSelect } from "./OrderStatusSelect";

type OrderItem = {
  nome: string;
  tamanho?: string | null;
  cor?: string | null;
  quantidade: number;
  precoUnitario: number;
};

export default async function PedidosPage() {
  const { storeId } = await requireStoreSession();

  const orders = await db.order.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { customer: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Pedidos</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Pedidos gerados pelo chatbot. Atualize o status conforme forem atendidos.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Itens</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const items = order.items as unknown as OrderItem[];
              return (
                <tr key={order.id} className="border-b border-neutral-100 align-top">
                  <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                    {order.id.slice(-8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-900">
                      {order.customer.name || "Sem nome"}
                    </p>
                    <p className="text-xs text-neutral-500">{order.customer.phoneNumber}</p>
                  </td>
                  <td className="px-4 py-3">
                    <ul className="space-y-0.5 text-xs text-neutral-600">
                      {items?.map((item, i) => (
                        <li key={i}>
                          {item.quantidade}x {item.nome}
                          {item.tamanho ? ` (${item.tamanho})` : ""}
                          {item.cor ? ` - ${item.cor}` : ""}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    {Number(order.total).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    {order.createdAt.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusSelect orderId={order.id} status={order.status} />
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-400">
                  Nenhum pedido ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
