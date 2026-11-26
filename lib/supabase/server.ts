import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../env";

/** Client lié à la session de l'utilisateur (cookies). */
export function getServerSupabase(): SupabaseClient {
  const cookieStore = cookies();
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
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

/**
 * Vérifie que l'appelant est connecté et membre de l'équipe.
 * Renvoie le client lié à sa session, ou un message d'erreur et un code HTTP.
 */
export async function requireMember(): Promise<
  { ok: true; supabase: SupabaseClient; userId: string } | { ok: false; error: string; status: number }
> {
  const supabase = getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired: reload the page.", status: 401 };
  const { data: member } = await supabase.from("members").select("id").eq("id", user.id).maybeSingle();
  if (!member) return { ok: false, error: "Pick your name in the team first.", status: 403 };
  return { ok: true, supabase, userId: user.id };
}
