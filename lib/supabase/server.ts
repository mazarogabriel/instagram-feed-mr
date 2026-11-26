import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("As variáveis do Supabase não estão configuradas.");
  }

  return createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Middleware refreshes cookies when called from a Server Component.
        }
      },
    },
  });
}

export async function getTeamUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;

  if (
    error ||
    !user ||
    !user.email ||
    !user.email.toLowerCase().endsWith("@melinaromano.com")
  ) {
    return null;
  }

  const { data: member, error: memberError } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError || !member) return null;
  return user;
}
