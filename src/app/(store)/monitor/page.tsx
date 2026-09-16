"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ConversationSummary = {
  id: string;
  status: "BOT_ACTIVE" | "HUMAN_ACTIVE" | "CLOSED";
  lastMessageAt: string;
  customer: { name: string | null; phoneNumber: string };
  lastMessage: { content: string; direction: "IN" | "OUT"; sender: string } | null;
};

type Message = {
  id: string;
  direction: "IN" | "OUT";
  sender: "CUSTOMER" | "BOT" | "HUMAN";
  content: string;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  BOT_ACTIVE: "Bot ativo",
  HUMAN_ACTIVE: "Aguardando humano",
  CLOSED: "Encerrada",
};

export default function MonitorPage() {
  const { data, mutate } = useSWR<{ conversations: ConversationSummary[] }>(
    "/api/store/monitor",
    fetcher,
    { refreshInterval: 5000 },
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const conversations = data?.conversations ?? [];
  const activeId = selectedId ?? conversations[0]?.id ?? null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Monitor de atendimento</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Acompanhe as conversas em tempo (quase) real e assuma o atendimento quando necessário.
      </p>

      <div className="mt-6 flex h-[70vh] overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="w-80 shrink-0 overflow-y-auto border-r border-neutral-200">
          {conversations.length === 0 && (
            <p className="p-4 text-sm text-neutral-500">Nenhuma conversa ainda.</p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`block w-full border-b border-neutral-100 p-3 text-left hover:bg-neutral-50 ${
                activeId === c.id ? "bg-neutral-100" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-900">
                  {c.customer.name || c.customer.phoneNumber}
                </span>
                {c.status === "HUMAN_ACTIVE" && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                    humano
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-neutral-500">
                {c.lastMessage?.content ?? "—"}
              </p>
            </button>
          ))}
        </div>

        <div className="flex-1">
          {activeId ? (
            <ConversationView
              key={activeId}
              conversationId={activeId}
              onChanged={() => mutate()}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">
              Selecione uma conversa
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConversationView({
  conversationId,
  onChanged,
}: {
  conversationId: string;
  onChanged: () => void;
}) {
  const { data, mutate } = useSWR<{
    conversation: { id: string; status: string; customer: { name: string | null; phoneNumber: string } };
    messages: Message[];
  }>(`/api/store/monitor/${conversationId}`, fetcher, { refreshInterval: 4000 });

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages?.length]);

  async function sendMessage() {
    if (!draft.trim()) return;
    setSending(true);
    await fetch(`/api/store/monitor/${conversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "message", content: draft }),
    });
    setDraft("");
    setSending(false);
    mutate();
    onChanged();
  }

  async function toggleStatus(status: "BOT_ACTIVE" | "HUMAN_ACTIVE") {
    await fetch(`/api/store/monitor/${conversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "status", status }),
    });
    mutate();
    onChanged();
  }

  if (!data) return <div className="p-4 text-sm text-neutral-400">Carregando...</div>;

  const { conversation, messages } = data;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-200 p-4">
        <div>
          <p className="text-sm font-medium text-neutral-900">
            {conversation.customer.name || conversation.customer.phoneNumber}
          </p>
          <p className="text-xs text-neutral-500">
            {STATUS_LABEL[conversation.status]} · {conversation.customer.phoneNumber}
          </p>
        </div>
        {conversation.status === "HUMAN_ACTIVE" ? (
          <button
            onClick={() => toggleStatus("BOT_ACTIVE")}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Devolver para o bot
          </button>
        ) : (
          <button
            onClick={() => toggleStatus("HUMAN_ACTIVE")}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
          >
            Assumir atendimento
          </button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.direction === "IN" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                m.direction === "IN"
                  ? "bg-neutral-100 text-neutral-900"
                  : m.sender === "HUMAN"
                    ? "bg-blue-600 text-white"
                    : "bg-neutral-900 text-white"
              }`}
            >
              <p>{m.content}</p>
              <p className="mt-1 text-[10px] opacity-60">
                {m.sender === "BOT" ? "Bot" : m.sender === "HUMAN" ? "Você" : ""}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t border-neutral-200 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          placeholder="Responder como atendente..."
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        <button
          onClick={sendMessage}
          disabled={sending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
