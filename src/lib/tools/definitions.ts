import type Anthropic from "@anthropic-ai/sdk";

export const toolDefinitions: Anthropic.Tool[] = [
  {
    name: "consultar_estoque",
    description:
      "Verifica se uma peça de roupa tem estoque disponível, opcionalmente filtrando por tamanho. " +
      "Use sempre que o cliente perguntar se tem determinada peça ou tamanho disponível.",
    input_schema: {
      type: "object",
      properties: {
        peca: {
          type: "string",
          description: "Nome ou descrição da peça, ex: 'blusa floral', 'saia jeans'.",
        },
        tamanho: {
          type: "string",
          description: "Tamanho desejado, ex: 'P', 'M', 'G'. Opcional.",
        },
      },
      required: ["peca"],
    },
  },
  {
    name: "consultar_preco",
    description: "Consulta o preço de uma peça de roupa pelo nome.",
    input_schema: {
      type: "object",
      properties: {
        peca: { type: "string", description: "Nome ou descrição da peça." },
      },
      required: ["peca"],
    },
  },
  {
    name: "buscar_produtos_similares",
    description:
      "Busca produtos parecidos com uma descrição livre (ex: 'algo parecido com uma blusa floral', " +
      "ou uma descrição gerada a partir de uma foto enviada pelo cliente). Retorna até 5 produtos com fotos.",
    input_schema: {
      type: "object",
      properties: {
        descricao: { type: "string", description: "Descrição livre do que o cliente procura." },
      },
      required: ["descricao"],
    },
  },
  {
    name: "criar_pedido",
    description:
      "Cria um pedido de venda com os itens escolhidos pelo cliente. Só use depois que o cliente confirmar " +
      "explicitamente que quer fechar o pedido com os itens, tamanhos e quantidades definidos.",
    input_schema: {
      type: "object",
      properties: {
        itens: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sku: { type: "string", description: "SKU do produto, se conhecido." },
              nome: { type: "string", description: "Nome da peça." },
              tamanho: { type: "string" },
              cor: { type: "string" },
              quantidade: { type: "integer", minimum: 1 },
            },
            required: ["nome", "quantidade"],
          },
        },
        nomeCliente: {
          type: "string",
          description: "Nome do cliente, se ele informou.",
        },
        observacoes: { type: "string", description: "Observações adicionais do pedido." },
      },
      required: ["itens"],
    },
  },
  {
    name: "verificar_status_pedido",
    description: "Verifica o status de um pedido feito anteriormente pelo cliente.",
    input_schema: {
      type: "object",
      properties: {
        numero: {
          type: "string",
          description: "Número/código do pedido informado pelo cliente. Se vazio, busca o pedido mais recente do cliente.",
        },
      },
      required: [],
    },
  },
  {
    name: "transferir_atendimento_humano",
    description:
      "Transfere a conversa para um atendente humano da loja. Use nos casos indicados nas instruções de " +
      "atendimento (reclamações, negociação de preço, problemas com pedidos, ou pedido explícito do cliente " +
      "para falar com uma pessoa). Depois de chamar esta ferramenta, envie uma mensagem curta avisando o " +
      "cliente que alguém da equipe vai continuar o atendimento.",
    input_schema: {
      type: "object",
      properties: {
        motivo: { type: "string", description: "Motivo resumido da transferência." },
      },
      required: ["motivo"],
    },
  },
];
