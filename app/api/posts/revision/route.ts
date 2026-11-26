import { NextResponse } from "next/server";
import { fetchPostsRevision, type ProfileKey } from "@/lib/notion";
import { getTeamUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(request: Request) {
  const user = await getTeamUser();
  if (!user) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401, headers: noCacheHeaders });
  }

  try {
    const url = new URL(request.url);
    const requestedProfile = url.searchParams.get("profile");

    if (requestedProfile === "all") {
      const [mr, lab] = await Promise.all([
        fetchPostsRevision("mr"),
        fetchPostsRevision("lab"),
      ]);

      return NextResponse.json(
        {
          revisions: { mr, lab },
          checkedAt: new Date().toISOString(),
        },
        { headers: noCacheHeaders }
      );
    }

    const profile: ProfileKey = requestedProfile === "lab" ? "lab" : "mr";
    const revision = await fetchPostsRevision(profile);

    return NextResponse.json(
      {
        profile,
        revision,
        checkedAt: new Date().toISOString(),
      },
      { headers: noCacheHeaders }
    );
  } catch (error) {
    console.error("Error checking feed revision:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
