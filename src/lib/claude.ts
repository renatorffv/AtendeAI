import Anthropic from "@anthropic-ai/sdk";
import type { Store, Message as DbMessage } from "@prisma/client";
import {
  toolDefinitions,
  runTool,
  HANDOFF_TOOL_NAME,
  PHOTOS_TOOL_NAME,
  type ToolContext,
} from "@/lib/tools";

let anthropicClient: Anthropic | null = null;

/** Instanciado sob demanda (não no carregamento do módulo) para não quebrar o build/coleta de rotas
 *  do Next.js em ambientes onde ANTHROPIC_API_KEY ainda não foi configurada. */
function getAnthropicClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-5";
const MAX_HISTORY_MESSAGES = 20;
const MAX_TOOL_ITERATIONS = 6;

function buildSystemPrompt(store: Store) {
  const base = `Você é a atendente virtual da loja "${store.name}", uma loja de roupas femininas, conversando
com clientes pelo WhatsApp. Seja simpática, natural e objetiva, como uma vendedora de loja física experiente.
Use as ferramentas disponíveis para consultar estoque, preços e produtos parecidos, e para criar pedidos —
nunca invente informação de estoque, preço ou produto que não veio de uma ferramenta.
Ao apresentar produtos, mencione nome, preço e tamanhos/cores disponíveis. Se o produto tiver fotos
(campo temFotos), deixe claro que você pode enviar fotos.
Fotos só chegam à cliente pela ferramenta ${PHOTOS_TOOL_NAME}: sempre que ela pedir fotos (inclusive para
mandar de novo), chame essa ferramenta com o nome completo de cada produto. Nunca diga que enviou fotos sem
ter chamado ${PHOTOS_TOOL_NAME} nesta mesma resposta. Mande fotos SOMENTE dos produtos que a cliente pediu na
mensagem atual — pedidos de fotos anteriores já foram atendidos (as respostas com fotos aparecem no histórico
marcadas com ${PHOTOS_SENT_NOTE}); nunca reenvie fotos de outros produtos por conta própria. Quando mandar fotos de vários produtos, cada foto já
vai com nome e preço na legenda — então mantenha o texto da resposta curto, sem repetir a lista.
Nunca inclua links ou URLs nas mensagens.
Confirme sempre os itens, tamanhos e quantidades com o cliente antes de chamar a ferramenta criar_pedido.
Responda sempre em português do Brasil, em mensagens curtas adequadas para WhatsApp.`;

  const handoff = store.handoffInstructions?.trim()
    ? `\n\nRegras de transferência para atendimento humano (use a ferramenta ${HANDOFF_TOOL_NAME} nesses casos):\n${store.handoffInstructions.trim()}`
    : `\n\nTransfira para atendimento humano (ferramenta ${HANDOFF_TOOL_NAME}) em caso de reclamações, negociação de preço, problemas com pedidos já feitos, ou pedido explícito do cliente para falar com uma pessoa.`;

  const extra = store.aiSystemPromptExtra?.trim()
    ? `\n\nInstruções adicionais definidas pela loja:\n${store.aiSystemPromptExtra.trim()}`
    : "";

  return base + handoff + extra;
}

const PHOTOS_SENT_NOTE = "[fotos enviadas junto com esta mensagem]";

/** O histórico só guarda texto; sem a marcação de que a resposta teve fotos, o modelo não sabe que um
 *  pedido de fotos antigo já foi atendido e volta a mandar as mesmas fotos em respostas seguintes. */
function historyToMessages(history: DbMessage[]): Anthropic.MessageParam[] {
  return history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m): Anthropic.MessageParam => ({
      role: m.direction === "IN" ? "user" : "assistant",
      content: m.direction === "OUT" && m.mediaUrl ? `${m.content}\n\n${PHOTOS_SENT_NOTE}` : m.content,
    }));
}

export type IncomingContent = {
  text: string;
  imageBase64?: string;
  imageMediaType?: string;
};

const MAX_IMAGES_PER_REPLY = 4;
const MAX_IMAGES_SINGLE_PRODUCT = 3;

type ProductCandidate = { nome: string; imagens: string[]; preco: number | null };

/** Foto a enviar. `caption` só vem preenchida quando a resposta tem fotos de vários produtos: aí cada
 *  foto leva o nome e o preço do seu produto, e o texto da resposta vai numa mensagem separada. */
export type ReplyImage = { url: string; caption?: string };

/** Extrai os produtos (com URLs das fotos e preço) do resultado da ferramenta enviar_fotos. */
function extractCandidates(result: unknown): ProductCandidate[] {
  const produtos = (result as { produtos?: { nome?: unknown; imagens?: unknown; preco?: unknown }[] } | null)
    ?.produtos;
  if (!Array.isArray(produtos)) return [];
  return produtos
    .filter((p): p is { nome: string; imagens: unknown; preco: unknown } => typeof p?.nome === "string")
    .map((p) => ({
      nome: p.nome,
      imagens: Array.isArray(p.imagens) ? p.imagens.filter((u): u is string => typeof u === "string") : [],
      preco: typeof p.preco === "number" ? p.preco : null,
    }));
}

function productCaption(candidate: ProductCandidate): string {
  if (candidate.preco === null) return `*${candidate.nome}*`;
  const price = candidate.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `*${candidate.nome}* — ${price}`;
}

/** O resultado das ferramentas vai para o modelo sem as URLs das fotos (só `temFotos`): com a URL
 *  à vista, o modelo às vezes a cola na mensagem, expondo um link do AtendeAI para a cliente. As URLs
 *  continuam disponíveis para o envio das fotos via `extractCandidates`. Vale para todas as ferramentas
 *  que devolvem produtos, não só enviar_fotos. */
function hideImageUrls(result: unknown): unknown {
  const r = result as { produtos?: unknown } | null;
  if (!r || !Array.isArray(r.produtos)) return result;
  return {
    ...r,
    produtos: r.produtos.map((p) => {
      if (!p || typeof p !== "object" || !("imagens" in p)) return p;
      const { imagens, ...rest } = p as { imagens?: unknown };
      return { ...rest, temFotos: Array.isArray(imagens) && imagens.length > 0 };
    }),
  };
}

/** Rede de segurança: remove qualquer link que ainda apareça no texto antes de ir para o WhatsApp
 *  (e a marcação interna de fotos do histórico, caso o modelo a imite). */
function stripLinks(text: string): string {
  return text
    .replace(/\[fotos enviadas[^\]]*\]/gi, "")
    .replace(/\[([^\]]+)\]\(\s*https?:\/\/[^)]*\)/gi, "$1")
    .replace(/<?https?:\/\/[^\s>)]+>?/gi, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Monta as fotos a partir dos produtos pedidos pela IA via enviar_fotos, na ordem em que foram pedidos.
 *  Um produto: até 3 fotos dele, com o texto da resposta como legenda. Vários: a primeira foto de cada
 *  um, com nome e preço na legenda. */
function buildReplyImages(requested: ProductCandidate[]): ReplyImage[] {
  const products = requested.filter(
    (p, i) => p.imagens.length > 0 && requested.findIndex((o) => o.nome === p.nome) === i,
  );

  if (products.length === 0) return [];
  if (products.length === 1) {
    return products[0].imagens.slice(0, MAX_IMAGES_SINGLE_PRODUCT).map((url) => ({ url }));
  }
  return products
    .slice(0, MAX_IMAGES_PER_REPLY)
    .map((p) => ({ url: p.imagens[0], caption: productCaption(p) }));
}

export async function generateReply(params: {
  store: Store;
  history: DbMessage[];
  incoming: IncomingContent;
  ctx: ToolContext;
}): Promise<{ text: string; handoffTriggered: boolean; images: ReplyImage[] }> {
  const { store, history, incoming, ctx } = params;

  const userContent: Anthropic.ContentBlockParam[] = [];
  if (incoming.imageBase64) {
    userContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: (incoming.imageMediaType as "image/jpeg") ?? "image/jpeg",
        data: incoming.imageBase64,
      },
    });
  }
  userContent.push({ type: "text", text: incoming.text || "(imagem enviada sem legenda)" });

  const messages: Anthropic.MessageParam[] = [
    ...historyToMessages(history),
    { role: "user", content: userContent },
  ];

  let handoffTriggered = false;
  const requestedPhotos: ProductCandidate[] = [];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await getAnthropicClient().messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: buildSystemPrompt(store),
      tools: toolDefinitions,
      messages,
    });

    const toolUses = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();
      const finalText = stripLinks(text) || "Desculpe, não consegui gerar uma resposta agora.";
      return {
        text: finalText,
        handoffTriggered,
        images: buildReplyImages(requestedPhotos),
      };
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUses) {
      if (toolUse.name === HANDOFF_TOOL_NAME) {
        handoffTriggered = true;
      }
      const result = await runTool(
        toolUse.name,
        toolUse.input as Record<string, unknown>,
        ctx,
      );
      if (toolUse.name === PHOTOS_TOOL_NAME) {
        requestedPhotos.push(...extractCandidates(result));
      }
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(hideImageUrls(result)),
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  return {
    text: "Vou verificar isso com a equipe e já te retorno.",
    handoffTriggered,
    images: [],
  };
}
