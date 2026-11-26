import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/?auth_error=missing_code", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/?auth_error=exchange_failed", url.origin));
  }

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user?.email?.toLowerCase().endsWith("@melinaromano.com")) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/?auth_error=not_authorized", url.origin));
  }

  const { data: member, error: memberError } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError || !member) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/?auth_error=not_authorized", url.origin));
  }

  return NextResponse.redirect(new URL("/", url.origin));
}
