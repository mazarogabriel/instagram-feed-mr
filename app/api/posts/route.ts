import { NextResponse } from "next/server";
import { fetchPosts } from "@/lib/notion";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  try {
    const posts = await fetchPosts();
    return NextResponse.json(
      {
        posts,
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
