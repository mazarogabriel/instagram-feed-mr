import { NextResponse } from "next/server";
import { fetchPostsSnapshot, type ProfileKey } from "@/lib/notion";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requestedProfile = url.searchParams.get("profile");
    const profile: ProfileKey = requestedProfile === "lab" ? "lab" : "mr";
    const offsetValue = Number(url.searchParams.get("offset") ?? "0");
    const offset =
      Number.isFinite(offsetValue) && offsetValue >= 0
        ? Math.floor(offsetValue)
        : 0;
    const {
      posts,
      revision,
      hasMore,
      nextOffset,
      publishedCount,
      completedCount,
    } = await fetchPostsSnapshot(profile, offset);

    return NextResponse.json(
      {
        profile,
        posts,
        revision,
        hasMore,
        nextOffset,
        publishedCount,
        completedCount,
        refreshedAt: new Date().toISOString(),
      },
      { headers: noCacheHeaders }
    );
  } catch (error) {
    console.error("Error fetching posts:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
