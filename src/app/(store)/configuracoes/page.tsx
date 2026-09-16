import { db } from "@/lib/db";
import { requireStoreSession } from "@/lib/session";
import { saveStoreSettings } from "./actions";
import { WhatsappConnect } from "./WhatsappConnect";

export default async function ConfiguracoesPage() {
  const { storeId } = await requireStoreSession();
  const store = await db.store.findUniqueOrThrow({ where: { id: storeId } });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-neutral-900">Configurações</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Configure o número de WhatsApp, o catálogo e o comportamento do atendimento por IA.
      </p>

      <div className="mt-6">
        <WhatsappConnect />
      </div>

      <form action={saveStoreSettings} className="mt-6 space-y-6">
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-900">WhatsApp / Evolution API</h2>
          <div className="mt-4 space-y-4">
            <Field
              label="Número de WhatsApp (informativo)"
              name="whatsappNumber"
              defaultValue={store.whatsappNumber ?? ""}
              placeholder="5511999999999"
            />
            <Field
              label="URL da Evolution API"
              name="evolutionApiUrl"
              defaultValue={store.evolutionApiUrl}
              placeholder="https://evolution.suaempresa.com.br"
            />
            <Field
              label="Evolution API Key"
              name="evolutionApiKey"
              defaultValue={store.evolutionApiKey}
              type="password"
            />
            <Field
              label="Nome da instância"
              name="evolutionInstanceName"
              defaultValue={store.evolutionInstanceName}
            />
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-900">Catálogo</h2>
          <div className="mt-4">
            <Field
              label="Google Sheet ID"
              name="googleSheetId"
              defaultValue={store.googleSheetId ?? ""}
              placeholder="ID da planilha (parte da URL entre /d/ e /edit)"
            />
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-900">Atendimento por IA</h2>
          <div className="mt-4 space-y-4">
            <TextAreaField
              label="Quando transferir para atendimento humano"
              name="handoffInstructions"
              defaultValue={store.handoffInstructions}
              placeholder="Ex: transferir quando o cliente reclamar, pedir desconto, ou relatar problema com pedido já feito."
            />
            <TextAreaField
              label="Instruções adicionais para a IA (tom de voz, políticas da loja, etc.)"
              name="aiSystemPromptExtra"
              defaultValue={store.aiSystemPromptExtra}
              placeholder="Ex: a loja não faz troca de peças em promoção; frete grátis acima de R$300."
            />
          </div>
        </section>

        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Salvar configurações
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-700">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
      />
    </div>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-700">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={3}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
      />
    </div>
  );
}
