import type { NotionPost } from "./types";

const NOTION_API_VERSION = "2026-03-11";
const NOTION_API_BASE = "https://api.notion.com/v1";

type NotionProperty = {
  type?: string;
  title?: Array<{ plain_text?: string }>;
  files?: Array<
    | { type: "file"; file?: { url?: string } }
    | { type: "external"; external?: { url?: string } }
  >;
  date?: { start?: string | null } | null;
  status?: { name?: string } | null;
};

type NotionPage = {
  id: string;
  object: "page";
  properties: Record<string, NotionProperty>;
};

type DataSourceQueryResponse = {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
};

const DATA_SOURCE_ID =
  process.env.NOTION_DATA_SOURCE_ID ?? "c394a082-c32a-8389-8345-077f489e674f";

const MR_COMPANY_PAGE_ID =
  process.env.NOTION_COMPANY_PAGE_ID ?? "c444a082-c32a-8350-adfc-0110adbf4fa7";

function getToken(): string {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error("NOTION_TOKEN não está configurado nas variáveis de ambiente.");
  }
  return token;
}

async function queryDataSource(
  startCursor?: string
): Promise<DataSourceQueryResponse> {
  const response = await fetch(
    NOTION_API_BASE + "/data_sources/" + DATA_SOURCE_ID + "/query",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + getToken(),
        "Notion-Version": NOTION_API_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        result_type: "page",
        page_size: 100,
        ...(startCursor ? { start_cursor: startCursor } : {}),
        filter: {
          and: [
            {
              property: "Rede Social",
              multi_select: { contains: "Instagram" },
            },
            {
              property: "Empresa",
              relation: { contains: MR_COMPANY_PAGE_ID },
            },
          ],
        },
        sorts: [
          {
            property: "Data de Publicação",
            direction: "descending",
          },
        ],
      }),
      cache: "no-store",
    }
  );

  const payload = (await response.json()) as
    | DataSourceQueryResponse
    | { message?: string; code?: string };

  if (!response.ok) {
    const errorPayload = payload as { message?: string; code?: string };
    const detail = errorPayload.message ?? "Erro desconhecido";
    throw new Error(
      "Notion API (" +
        response.status +
        (errorPayload.code ? ", " + errorPayload.code : "") +
        "): " +
        detail
    );
  }

  return payload as DataSourceQueryResponse;
}

function extractTitle(properties: Record<string, NotionProperty>): string {
  const titleProperty =
    properties["Tema"] ??
    Object.values(properties).find((property) => property.type === "title");

  return (
    titleProperty?.title?.map((item) => item.plain_text ?? "").join("") ||
    "Sem título"
  );
}

function extractImage(properties: Record<string, NotionProperty>): string | null {
  const files = properties["Imagens"]?.files ?? [];
  const firstFile = files[0];

  if (!firstFile) return null;
  if (firstFile.type === "file") return firstFile.file?.url ?? null;
  if (firstFile.type === "external") return firstFile.external?.url ?? null;
  return null;
}

function extractPublishDate(
  properties: Record<string, NotionProperty>
): string | null {
  return properties["Data de Publicação"]?.date?.start ?? null;
}

function extractStatus(properties: Record<string, NotionProperty>): string | null {
  return properties["Status"]?.status?.name ?? null;
}

export async function fetchPosts(): Promise<NotionPost[]> {
  const posts: NotionPost[] = [];
  let cursor: string | undefined;

  // Notion limits a single query to 10,000 results. The widget only requests
  // the MR + Instagram publications, not the entire workspace.
  do {
    const page = await queryDataSource(cursor);
    posts.push(
      ...page.results.map((item) => ({
        id: item.id,
        title: extractTitle(item.properties),
        thumbnail: extractImage(item.properties),
        publishDate: extractPublishDate(item.properties),
        status: extractStatus(item.properties),
      }))
    );

    cursor = page.has_more && page.next_cursor ? page.next_cursor : undefined;
  } while (cursor && posts.length < 10_000);

  return posts.sort((a, b) => {
    if (!a.publishDate && !b.publishDate) return 0;
    if (!a.publishDate) return 1;
    if (!b.publishDate) return -1;
    return (
      new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    );
  });
}
