import { type DefaultSession } from "next-auth";

export type AppRole = "SUPER_ADMIN" | "STORE_USER";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      storeId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: AppRole;
    storeId: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
    storeId: string | null;
  }
}
