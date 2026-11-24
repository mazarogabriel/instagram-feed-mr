import { NextResponse } from "next/server";
import { fetchPostsRevision, type ProfileKey } from "@/lib/notion";

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
