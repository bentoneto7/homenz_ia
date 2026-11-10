import { createClient, type SupabaseClientOptions } from "@supabase/supabase-js";

type ClientOptions = SupabaseClientOptions<"public">;

/**
 * O banco pode estar em dois lugares:
 * - Supabase hospedado: basta SUPABASE_URL.
 * - Postgres próprio com PostgREST na frente: POSTGREST_URL aponta direto para o PostgREST.
 *
 * O supabase-js sempre chama `${url}/rest/v1/...`, caminho que só existe atrás do gateway
 * do Supabase. O PostgREST puro responde na raiz, então o prefixo sai antes do envio.
 */
const postgrestUrl = process.env.POSTGREST_URL?.replace(/\/+$/, "");
const REST_PREFIX = "/rest/v1";

const fetchWithoutRestPrefix: typeof fetch = (input, init) => {
  if (typeof input === "string" || input instanceof URL) {
    return fetch(String(input).replace(REST_PREFIX, ""), init);
  }
  return fetch(new Request(input.url.replace(REST_PREFIX, ""), input), init);
};

export function createDbClient(key: string, options: ClientOptions = {}) {
  if (!postgrestUrl) {
    return createClient(process.env.SUPABASE_URL!, key, options);
  }
  return createClient(postgrestUrl, key, {
    ...options,
    global: { ...options.global, fetch: fetchWithoutRestPrefix },
  });
}
