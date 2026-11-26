import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/** Client lié à la session de l'utilisateur (cookies). */
export function getServerSupabase(): SupabaseClient {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(list) {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Appelé depuis un Server Component : le middleware rafraîchit la session.
          }
        },
      },
    },
  );
}

/** Client « service role » : serveur uniquement, après vérification de l'utilisateur. */
export function getAdminSupabase(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Vérifie que l'appelant est connecté et membre de l'équipe.
 * Renvoie le client lié à sa session, ou un message d'erreur et un code HTTP.
 */
export async function requireMember(): Promise<
  { ok: true; supabase: SupabaseClient; userId: string } | { ok: false; error: string; status: number }
> {
  const missing = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"].filter(
    (k) => !process.env[k],
  );
  if (missing.length) return { ok: false, error: `Variables manquantes sur le serveur : ${missing.join(", ")}.`, status: 500 };
  const supabase = getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expirée : reconnecte-toi.", status: 401 };
  const { data: member } = await supabase.from("members").select("id").eq("id", user.id).maybeSingle();
  if (!member) return { ok: false, error: "Choisis d'abord ton nom dans l'équipe.", status: 403 };
  return { ok: true, supabase, userId: user.id };
}
