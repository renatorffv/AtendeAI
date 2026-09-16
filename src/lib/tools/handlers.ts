import { db } from "@/lib/db";
import type { Product } from "@prisma/client";

export type ToolContext = {
  storeId: string;
  customerId: string;
  conversationId: string;
};

function serializeProduct(p: Product) {
  return {
    sku: p.sku,
    nome: p.name,
    categoria: p.category,
    descricao: p.description,
    cores: p.colors,
    tamanhos: p.sizes,
    estoquePorTamanho: p.stockBySize,
    preco: Number(p.price),
    imagens: p.imageUrls,
  };
}

async function findMatchingProducts(storeId: string, query: string, limit = 5) {
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 6);

  if (keywords.length === 0) {
    return db.product.findMany({ where: { storeId, active: true }, take: limit });
  }

  const products = await db.product.findMany({
    where: {
      storeId,
      active: true,
      OR: keywords.flatMap((kw) => [
        { name: { contains: kw, mode: "insensitive" as const } },
        { category: { contains: kw, mode: "insensitive" as const } },
        { description: { contains: kw, mode: "insensitive" as const } },
      ]),
    },
    take: 30,
  });

  return products.slice(0, limit);
}

export async function consultarEstoque(
  ctx: ToolContext,
  input: { peca: string; tamanho?: string },
) {
  const matches = await findMatchingProducts(ctx.storeId, input.peca, 5);
  if (matches.length === 0) {
    return { encontrado: false, mensagem: "Nenhuma peça encontrada com esse nome no catálogo." };
  }

  if (input.tamanho) {
    const size = input.tamanho.trim().toUpperCase();
    return {
      encontrado: true,
      produtos: matches.map((p) => ({
        ...serializeProduct(p),
        estoqueNoTamanho: (p.stockBySize as Record<string, number>)?.[size] ?? 0,
      })),
    };
  }

  return { encontrado: true, produtos: matches.map(serializeProduct) };
}

export async function consultarPreco(ctx: ToolContext, input: { peca: string }) {
  const matches = await findMatchingProducts(ctx.storeId, input.peca, 5);
  if (matches.length === 0) {
    return { encontrado: false, mensagem: "Nenhuma peça encontrada com esse nome no catálogo." };
  }
  return {
    encontrado: true,
    produtos: matches.map((p) => ({ sku: p.sku, nome: p.name, preco: Number(p.price) })),
  };
}

export async function buscarProdutosSimilares(ctx: ToolContext, input: { descricao: string }) {
  const matches = await findMatchingProducts(ctx.storeId, input.descricao, 5);
  return { produtos: matches.map(serializeProduct) };
}

type PedidoItemInput = {
  sku?: string;
  nome: string;
  tamanho?: string;
  cor?: string;
  quantidade: number;
};

export async function criarPedido(
  ctx: ToolContext,
  input: { itens: PedidoItemInput[]; nomeCliente?: string; observacoes?: string },
) {
  if (!input.itens || input.itens.length === 0) {
    return { sucesso: false, mensagem: "Nenhum item informado para o pedido." };
  }

  const resolvedItems = await Promise.all(
    input.itens.map(async (item) => {
      const product = item.sku
        ? await db.product.findUnique({ where: { storeId_sku: { storeId: ctx.storeId, sku: item.sku } } })
        : (await findMatchingProducts(ctx.storeId, item.nome, 1))[0];

      const unitPrice = product ? Number(product.price) : 0;
      return {
        sku: product?.sku ?? item.sku ?? null,
        nome: product?.name ?? item.nome,
        tamanho: item.tamanho ?? null,
        cor: item.cor ?? null,
        quantidade: item.quantidade,
        precoUnitario: unitPrice,
        subtotal: unitPrice * item.quantidade,
      };
    }),
  );

  const total = resolvedItems.reduce((sum, i) => sum + i.subtotal, 0);

  if (input.nomeCliente) {
    await db.customer.update({
      where: { id: ctx.customerId },
      data: { name: input.nomeCliente },
    }).catch(() => undefined);
  }

  const order = await db.order.create({
    data: {
      storeId: ctx.storeId,
      customerId: ctx.customerId,
      conversationId: ctx.conversationId,
      items: resolvedItems,
      total,
      notes: input.observacoes ?? null,
    },
  });

  return {
    sucesso: true,
    numeroPedido: order.id.slice(-8).toUpperCase(),
    total,
    itens: resolvedItems,
  };
}

export async function verificarStatusPedido(ctx: ToolContext, input: { numero?: string }) {
  if (input.numero) {
    const numero = input.numero.trim().toUpperCase();
    const orders = await db.order.findMany({
      where: { storeId: ctx.storeId, customerId: ctx.customerId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const found = orders.find((o) => o.id.slice(-8).toUpperCase() === numero);
    if (!found) {
      return { encontrado: false, mensagem: "Pedido não encontrado com esse número." };
    }
    return {
      encontrado: true,
      numeroPedido: found.id.slice(-8).toUpperCase(),
      status: found.status,
      total: Number(found.total),
      criadoEm: found.createdAt.toISOString(),
    };
  }

  const last = await db.order.findFirst({
    where: { storeId: ctx.storeId, customerId: ctx.customerId },
    orderBy: { createdAt: "desc" },
  });

  if (!last) {
    return { encontrado: false, mensagem: "Nenhum pedido encontrado para este cliente." };
  }

  return {
    encontrado: true,
    numeroPedido: last.id.slice(-8).toUpperCase(),
    status: last.status,
    total: Number(last.total),
    criadoEm: last.createdAt.toISOString(),
  };
}

export async function transferirAtendimentoHumano(ctx: ToolContext, input: { motivo: string }) {
  await db.conversation.update({
    where: { id: ctx.conversationId },
    data: { status: "HUMAN_ACTIVE" },
  });
  return { sucesso: true, motivo: input.motivo };
}
