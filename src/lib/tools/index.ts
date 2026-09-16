import * as handlers from "@/lib/tools/handlers";
import type { ToolContext } from "@/lib/tools/handlers";

export { toolDefinitions } from "@/lib/tools/definitions";
export type { ToolContext };

export const HANDOFF_TOOL_NAME = "transferir_atendimento_humano";

export async function runTool(name: string, input: Record<string, unknown>, ctx: ToolContext) {
  switch (name) {
    case "consultar_estoque":
      return handlers.consultarEstoque(ctx, input as never);
    case "consultar_preco":
      return handlers.consultarPreco(ctx, input as never);
    case "buscar_produtos_similares":
      return handlers.buscarProdutosSimilares(ctx, input as never);
    case "criar_pedido":
      return handlers.criarPedido(ctx, input as never);
    case "verificar_status_pedido":
      return handlers.verificarStatusPedido(ctx, input as never);
    case "transferir_atendimento_humano":
      return handlers.transferirAtendimentoHumano(ctx, input as never);
    default:
      return { erro: `Ferramenta desconhecida: ${name}` };
  }
}
