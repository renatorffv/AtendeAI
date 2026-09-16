import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-neutral-200 bg-white p-5">
        <div className="mb-8">
          <p className="text-sm font-semibold text-neutral-900">AtendeAI</p>
          <p className="mt-0.5 text-xs text-neutral-500">Administrador Geral</p>
        </div>
        <nav className="space-y-1">
          <Link href="/admin" className="block rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100">
            Lojas
          </Link>
          <Link
            href="/admin/lojas/nova"
            className="block rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
          >
            Nova loja
          </Link>
        </nav>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="mt-8"
        >
          <button className="text-sm text-neutral-500 hover:text-neutral-800">Sair</button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
