import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { verifyClinicToken } from "../db";
import { COOKIE_NAME } from "@shared/const";
import { jwtVerify } from "jose";
import { ENV } from "./env";
import { parse as parseCookieHeader } from "cookie";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

async function verifySessionCookie(cookieValue: string | undefined): Promise<User | null> {
  if (!cookieValue) return null;
  try {
    const secret = new TextEncoder().encode(ENV.cookieSecret);
    const { payload } = await jwtVerify(cookieValue, secret, { algorithms: ["HS256"] });
    const openId = payload.openId as string | undefined;
    if (!openId) return null;
    return (await db.getUserByOpenId(openId)) ?? null;
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // 1º: Tentar Bearer JWT próprio (sistema de clínicas)
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

  // 2º: Tentar cookie de sessão JWT
  try {
    const cookies = parseCookieHeader(opts.req.headers.cookie ?? "");
    const sessionCookie = cookies[COOKIE_NAME];
    user = await verifySessionCookie(sessionCookie);
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
