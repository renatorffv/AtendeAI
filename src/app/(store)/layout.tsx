import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/monitor", label: "Monitor" },
  { href: "/pedidos", label: "Pedidos" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/configuracoes", label: "Configurações" },
];

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STORE_USER" || !session.user.storeId) {
    redirect("/login");
  }

  const store = await db.store.findUnique({ where: { id: session.user.storeId } });

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-neutral-200 bg-white p-5">
        <div className="mb-8">
          <p className="text-sm font-semibold text-neutral-900">AtendeAI</p>
          <p className="mt-0.5 text-xs text-neutral-500">{store?.name}</p>
        </div>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
            >
              {item.label}
            </Link>
          ))}
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
