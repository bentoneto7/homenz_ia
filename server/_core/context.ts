import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifyClinicToken } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // 1º: Tentar Bearer JWT próprio (sistema de clínicas sem Manus OAuth)
  const authHeader = opts.req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const clinicUser = await verifyClinicToken(token);
      if (clinicUser) {
        return { req: opts.req, res: opts.res, user: clinicUser };
      }
    } catch {
      // token inválido, continuar
    }
  }

  // 2º: Fallback para cookie Manus OAuth (legado)
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
