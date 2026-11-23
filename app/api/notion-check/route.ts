import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return NextResponse.json({ configured: false }, { status: 500 });
  }

  const response = await fetch(
    "https://api.notion.com/v1/databases/9b84a082-c32a-8287-adfe-016f8108c405",
    {
      headers: {
        Authorization: "Bearer " + token,
        "Notion-Version": "2026-03-11",
      },
      cache: "no-store",
    }
  );

  const payload = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      {
        databaseLookupStatus: response.status,
        code: payload.code ?? null,
        message: payload.message ?? "Notion API error",
      },
      { status: response.status }
    );
  }

  return NextResponse.json({
    databaseLookupStatus: response.status,
    databaseId: payload.id,
    databaseTitle: payload.title?.map((item: { plain_text?: string }) => item.plain_text ?? "").join(""),
    dataSources: (payload.data_sources ?? []).map((source: { id: string; name: string }) => ({
      id: source.id,
      name: source.name,
    })),
  });
}
