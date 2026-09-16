import { createStore } from "./actions";

export default function NovaLojaPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-neutral-900">Nova loja</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Cria a loja e o primeiro usuário de acesso dela. Os dados da Evolution API e do catálogo podem ser
        completados depois, na página Configurações da própria loja.
      </p>

      <form action={createStore} className="mt-6 space-y-6">
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-900">Dados da loja</h2>
          <div className="mt-4 space-y-4">
            <Field label="Nome da loja" name="name" placeholder="Ex: Loja Bela Roupas" required />
            <Field
              label="Nome da instância (Evolution API)"
              name="evolutionInstanceName"
              placeholder="Ex: loja-bela-roupas"
              required
            />
            <Field
              label="URL da Evolution API"
              name="evolutionApiUrl"
              placeholder="https://evolution.suaempresa.com.br"
            />
            <Field label="Evolution API Key" name="evolutionApiKey" type="password" />
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-900">Usuário de acesso da loja</h2>
          <div className="mt-4 space-y-4">
            <Field label="Nome" name="userName" placeholder="Ex: Atendente Loja Bela" />
            <Field label="E-mail" name="userEmail" type="email" required />
            <Field label="Senha inicial" name="userPassword" type="password" required />
          </div>
        </section>

        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Criar loja
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
      />
    </div>
  );
}
