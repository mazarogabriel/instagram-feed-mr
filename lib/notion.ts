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

type NotionBlock = {
  id: string;
  type: string;
  has_children?: boolean;
  [key: string]: unknown;
};

type BlockChildrenResponse = {
  results: NotionBlock[];
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

function notionHeaders(token: string): HeadersInit {
  return {
    Authorization: "Bearer " + token,
    "Notion-Version": NOTION_API_VERSION,
    "Content-Type": "application/json",
  };
}

async function queryDataSource(
  startCursor?: string
): Promise<DataSourceQueryResponse> {
  const response = await fetch(
    NOTION_API_BASE + "/data_sources/" + DATA_SOURCE_ID + "/query",
    {
      method: "POST",
      headers: notionHeaders(getToken()),
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

function imageUrlFromBlock(block: NotionBlock): string | null {
  if (block.type !== "image") return null;

  const image = block.image as
    | {
        type?: string;
        file?: { url?: string };
        external?: { url?: string };
      }
    | undefined;

  if (!image) return null;
  if (image.type === "file") return image.file?.url ?? null;
  if (image.type === "external") return image.external?.url ?? null;
  return image.file?.url ?? image.external?.url ?? null;
}

async function getBlockChildren(
  blockId: string,
  token: string,
  startCursor?: string
): Promise<BlockChildrenResponse> {
  const params = new URLSearchParams({ page_size: "100" });
  if (startCursor) params.set("start_cursor", startCursor);

  const response = await fetch(
    NOTION_API_BASE + "/blocks/" + blockId + "/children?" + params.toString(),
    {
      headers: notionHeaders(token),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Não foi possível ler os blocos da publicação.");
  }

  return (await response.json()) as BlockChildrenResponse;
}

async function findImageInBlocks(
  blockId: string,
  token: string,
  depth = 0
): Promise<string | null> {
  if (depth > 4) return null;

  let cursor: string | undefined;
  do {
    const page = await getBlockChildren(blockId, token, cursor);

    for (const block of page.results) {
      const imageUrl = imageUrlFromBlock(block);
      if (imageUrl) return imageUrl;

      // Images are often nested inside Notion columns. Follow only blocks
      // that actually contain children, with a shallow depth limit.
      if (block.has_children) {
        const nestedImage = await findImageInBlocks(block.id, token, depth + 1);
        if (nestedImage) return nestedImage;
      }
    }

    cursor = page.has_more ? page.next_cursor ?? undefined : undefined;
  } while (cursor);

  return null;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return results;
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
  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const page = await queryDataSource(cursor);
    pages.push(...page.results);
    cursor = page.has_more && page.next_cursor ? page.next_cursor : undefined;
  } while (cursor && pages.length < 10_000);

  const token = getToken();
  const posts = await mapWithConcurrency(pages, 3, async (item) => {
    const propertyThumbnail = extractImage(item.properties);
    let thumbnail = propertyThumbnail;

    // The MR calendar frequently stores the artwork as an image block inside
    // the page body rather than in the "Imagens" property. Use that as a
    // fallback so the grid can display the artwork already attached to posts.
    if (!thumbnail) {
      try {
        thumbnail = await findImageInBlocks(item.id, token);
      } catch {
        thumbnail = null;
      }
    }

    return {
      id: item.id,
      title: extractTitle(item.properties),
      thumbnail,
      publishDate: extractPublishDate(item.properties),
      status: extractStatus(item.properties),
    };
  });

  return posts.sort((a, b) => {
    if (!a.publishDate && !b.publishDate) return 0;
    if (!a.publishDate) return 1;
    if (!b.publishDate) return -1;
    return b.publishDate.localeCompare(a.publishDate);
  });
}
