/**
 * Projet Supabase du journal SAP.
 *
 * L'URL et la clé « anon » sont publiques par conception : elles sont envoyées
 * au navigateur de toute façon, et la sécurité repose sur les règles RLS de la
 * base. On les garde donc comme valeurs par défaut, pour que l'app marche sans
 * configuration. Les variables d'environnement, si elles sont définies, sont
 * prioritaires (utile pour un autre projet Supabase ou en local).
 */
const DEFAULT_URL = "https://iklyvsttrceyaslylbnx.supabase.co";
const DEFAULT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbHl2c3R0cmNleWFzbHlsYm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU3MDExNzUsImV4cCI6MjExMTI3NzE3NX0.xWnE_ForVppoAzBN_xPwHNVzFCGyHVdp8TTvA8jseNw";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

export function missingPublicEnv(): string[] {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return missing;
}
