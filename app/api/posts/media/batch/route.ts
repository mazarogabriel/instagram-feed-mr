import { NextResponse } from "next/server";
import { fetchPostsDetails, type ProfileKey } from "@/lib/notion";
import { getTeamUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function POST(request: Request) {
  const user = await getTeamUser();
  if (!user) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401, headers: noCacheHeaders });
  }

  try {
    const body = (await request.json()) as {
      profile?: string;
      pageIds?: string[];
    };
    const profile: ProfileKey = body.profile === "lab" ? "lab" : "mr";

    if (!Array.isArray(body.pageIds)) {
      return NextResponse.json(
        { error: "A lista de publicações é obrigatória." },
        { status: 400, headers: noCacheHeaders }
      );
    }

    const results = await fetchPostsDetails(profile, body.pageIds);

    return NextResponse.json(
      { profile, results },
      { headers: noCacheHeaders }
    );
  } catch (error) {
    console.error("Error fetching posts media batch:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    const status =
      message.includes("inválidos") ||
      message.includes("não pertencem") ||
      message.includes("Informe entre")
        ? 400
        : 500;

    return NextResponse.json(
      { error: message },
      { status, headers: noCacheHeaders }
    );
  }
}
