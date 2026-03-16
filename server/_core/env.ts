export const ENV = {
  // Auth
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "homenz-secret-change-in-production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // APIs de IA — suporta proxy Manus (legado) ou OpenAI direto
  // Prioridade: BUILT_IN_FORGE_API_KEY > OPENAI_API_KEY
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? process.env.OPENAI_BASE_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? process.env.OPENAI_API_KEY ?? "",

  // Supabase Storage
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
};
