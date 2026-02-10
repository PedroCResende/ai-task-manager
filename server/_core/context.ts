import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { InferSelectModel } from "drizzle-orm";
import { users } from "../db/schema";
import { sdk } from "./sdk";

// 👇 Tipo correto baseado na tabela users
export type User = InferSelectModel<typeof users>;

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {

  // ✅ LOGIN FAKE APENAS EM DESENVOLVIMENTO
  if (process.env.NODE_ENV === "development") {
    return {
      req: opts.req,
      res: opts.res,
      user: {
        id: 1,
        openId: "dev-open-id",
        name: "Pedro Dev",
        email: "dev@local.com",
        passwordHash: null,
        createdAt: new Date().toISOString(),
      },
    };
  }

  // 🔐 PRODUÇÃO (OAuth real)
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
