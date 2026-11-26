import { NextResponse } from "next/server";
import { fetchPostDetails, type ProfileKey } from "@/lib/notion";
import { getTeamUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(
  request: Request,
  context: { params: Promise<{ pageId: string }> }
) {
  const user = await getTeamUser();
  if (!user) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401, headers: noCacheHeaders });
  }

  try {
    const { pageId } = await context.params;
    const url = new URL(request.url);
    const profile: ProfileKey =
      url.searchParams.get("profile") === "lab" ? "lab" : "mr";

    const details = await fetchPostDetails(profile, pageId);

    return NextResponse.json(details, { headers: noCacheHeaders });
  } catch (error) {
    console.error("Error fetching post media:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("não pertence") || message.includes("inválido")
      ? 404
      : 500;

    return NextResponse.json(
      { error: message },
      { status, headers: noCacheHeaders }
    );
  }
}
