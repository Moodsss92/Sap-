"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

/**
 * Session sans e-mail : à la première visite, le navigateur reçoit une identité
 * anonyme Supabase (gardée ensuite). On choisit ensuite son nom dans l'équipe.
 */
export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (data.user) {
        setUser(data.user);
        setLoading(false);
        return;
      }
      const { data: anon, error: anonError } = await supabase.auth.signInAnonymously();
      if (cancelled) return;
      if (anonError) setError(anonError.message);
      setUser(anon.user ?? null);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) setUser(session.user);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading, error };
}
