import Anthropic from "@anthropic-ai/sdk";
import type { Store, Message as DbMessage } from "@prisma/client";
import { toolDefinitions, runTool, HANDOFF_TOOL_NAME, type ToolContext } from "@/lib/tools";

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
As fotos são enviadas automaticamente junto com a sua resposta para cada produto que você citar pelo nome
completo — para mandar fotos de vários produtos, cite o nome completo de cada um na mesma resposta.
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

function historyToMessages(history: DbMessage[]): Anthropic.MessageParam[] {
  return history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m): Anthropic.MessageParam => ({
      role: m.direction === "IN" ? "user" : "assistant",
      content: m.content,
    }));
}

export type IncomingContent = {
  text: string;
  imageBase64?: string;
  imageMediaType?: string;
};

const MAX_IMAGES_PER_REPLY = 4;
const MAX_IMAGES_SINGLE_PRODUCT = 3;

type ProductCandidate = { nome: string; imagens: string[] };

/** Extrai os produtos citados num resultado de ferramenta (consultar_estoque, consultar_preco,
 *  buscar_produtos_similares), para depois casar com o texto final da resposta. */
function extractCandidates(result: unknown): ProductCandidate[] {
  const produtos = (result as { produtos?: { nome?: unknown; imagens?: unknown }[] } | null)?.produtos;
  if (!Array.isArray(produtos)) return [];
  return produtos
    .filter((p): p is { nome: string; imagens: string[] } => typeof p?.nome === "string")
    .map((p) => ({
      nome: p.nome,
      imagens: Array.isArray(p.imagens) ? p.imagens.filter((u): u is string => typeof u === "string") : [],
    }));
}

/** O resultado das ferramentas vai para o modelo sem as URLs das fotos (só `temFotos`): com a URL
 *  à vista, o modelo às vezes a cola na mensagem, expondo um link do AtendeAI para a cliente. As URLs
 *  continuam disponíveis para o envio das fotos via `extractCandidates`. */
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

/** Rede de segurança: remove qualquer link que ainda apareça no texto antes de ir para o WhatsApp. */
function stripLinks(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\(\s*https?:\/\/[^)]*\)/gi, "$1")
    .replace(/<?https?:\/\/[^\s>)]+>?/gi, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Escolhe as imagens dos produtos que o texto final da resposta realmente menciona, em vez de
 *  assumir o primeiro resultado de busca. Pode haver vários produtos citados (ex: "fotos dos dois
 *  shorts"); um candidato é descartado quando as palavras que bateram dele estão contidas nas de
 *  outro candidato — assim "Short Jeans Azul" no texto não puxa também a foto do "Short Jeans Preto". */
function pickImagesForText(text: string, candidates: ProductCandidate[]): string[] {
  const normalizedText = normalize(text);
  const seen = new Set<string>();
  const matched: { candidate: ProductCandidate; words: Set<string>; score: number }[] = [];

  for (const candidate of candidates) {
    if (candidate.imagens.length === 0 || seen.has(candidate.nome)) continue;
    seen.add(candidate.nome);
    const words = new Set(
      normalize(candidate.nome)
        .split(/\s+/)
        .filter((w) => w.length > 2),
    );
    if (words.size === 0) continue;

    const hits = new Set([...words].filter((w) => normalizedText.includes(w)));
    const score = hits.size / words.size;
    if (score >= 0.5 && hits.size >= 2) {
      matched.push({ candidate, words: hits, score });
    }
  }

  matched.sort((a, b) => b.score - a.score);
  const isSubset = (a: Set<string>, b: Set<string>) => [...a].every((w) => b.has(w));
  const selected = matched.filter(
    (m, i) => !matched.some((other, j) => j < i && isSubset(m.words, other.words)),
  );

  if (selected.length === 0) return [];
  if (selected.length === 1) return selected[0].candidate.imagens.slice(0, MAX_IMAGES_SINGLE_PRODUCT);

  // Vários produtos: a primeira foto de cada um, na ordem em que aparecem no texto.
  const position = (m: (typeof selected)[number]) =>
    Math.min(...[...m.words].map((w) => normalizedText.indexOf(w)));
  return selected
    .sort((a, b) => position(a) - position(b))
    .map((m) => m.candidate.imagens[0])
    .slice(0, MAX_IMAGES_PER_REPLY);
}

export async function generateReply(params: {
  store: Store;
  history: DbMessage[];
  incoming: IncomingContent;
  ctx: ToolContext;
}): Promise<{ text: string; handoffTriggered: boolean; images: string[] }> {
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
  const candidates: ProductCandidate[] = [];

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
        images: pickImagesForText(finalText, candidates),
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
      candidates.push(...extractCandidates(result));
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
