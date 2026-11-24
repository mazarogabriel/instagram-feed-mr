import type { NotionPost } from "./types";

const NOTION_API_VERSION = "2026-03-11";
const NOTION_API_BASE = "https://api.notion.com/v1";

type RichTextItem = {
  plain_text?: string;
  text?: { content?: string };
};

type NotionProperty = {
  type?: string;
  title?: RichTextItem[];
  rich_text?: RichTextItem[];
  files?: Array<
    | { type: "file"; file?: { url?: string } }
    | { type: "external"; external?: { url?: string } }
  >;
  date?: { start?: string | null } | null;
  status?: { name?: string } | null;
};

type NotionPage = {
  id: string;
  url?: string;
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

type PageBodyData = {
  thumbnail: string | null;
  textBlocks: string[];
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

function richTextToString(items?: RichTextItem[]): string {
  return (
    items
      ?.map((item) => item.plain_text ?? item.text?.content ?? "")
      .join("")
      .trim() ?? ""
  );
}

function extractTitle(properties: Record<string, NotionProperty>): string {
  const titleProperty =
    properties["Tema"] ??
    Object.values(properties).find((property) => property.type === "title");

  return richTextToString(titleProperty?.title) || "Sem título";
}

function extractImage(properties: Record<string, NotionProperty>): string | null {
  const files = properties["Imagens"]?.files ?? [];
  const firstFile = files[0];

  if (!firstFile) return null;
  if (firstFile.type === "file") return firstFile.file?.url ?? null;
  if (firstFile.type === "external") return firstFile.external?.url ?? null;
  return null;
}

function extractCaptionProperty(
  properties: Record<string, NotionProperty>
): string | null {
  const caption = richTextToString(properties["Legenda (texto)"]?.rich_text);
  return caption || null;
}

function extractPublishDate(
  properties: Record<string, NotionProperty>
): string | null {
  return properties["Data de Publicação"]?.date?.start ?? null;
}

function extractStatus(properties: Record<string, NotionProperty>): string | null {
  return properties["Status"]?.status?.name ?? null;
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

function textFromBlock(block: NotionBlock): string | null {
  const content = block[block.type] as
    | { rich_text?: RichTextItem[]; title?: RichTextItem[] }
    | undefined;

  if (!content) return null;
  const text = richTextToString(content.rich_text) || richTextToString(content.title);
  return text || null;
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
    throw new Error("Não foi possível ler o conteúdo da publicação.");
  }

  return (await response.json()) as BlockChildrenResponse;
}

async function getPageBodyData(
  blockId: string,
  token: string,
  depth = 0
): Promise<PageBodyData> {
  const data: PageBodyData = { thumbnail: null, textBlocks: [] };
  if (depth > 5) return data;

  let cursor: string | undefined;
  do {
    const page = await getBlockChildren(blockId, token, cursor);

    for (const block of page.results) {
      data.thumbnail ??= imageUrlFromBlock(block);

      const blockText = textFromBlock(block);
      if (blockText) data.textBlocks.push(blockText);

      if (block.has_children) {
        const nested = await getPageBodyData(block.id, token, depth + 1);
        data.thumbnail ??= nested.thumbnail;
        data.textBlocks.push(...nested.textBlocks);
      }
    }

    cursor = page.has_more ? page.next_cursor ?? undefined : undefined;
  } while (cursor);

  return data;
}

function extractCaptionFromBody(textBlocks: string[]): string | null {
  const markerIndex = textBlocks.findIndex((text) =>
    /^Legenda\s*:?\s*$/i.test(text.trim())
  );

  if (markerIndex < 0) return null;

  const captionBlocks: string[] = [];
  for (const rawText of textBlocks.slice(markerIndex + 1)) {
    const text = rawText.trim();
    if (!text) continue;

    if (
      /^(Referência de edição|Referencias? de edição|Roteiro|Orientação de edição|Notas? de edição)/i.test(
        text
      ) ||
      /^_{8,}$/.test(text)
    ) {
      break;
    }

    captionBlocks.push(text);
  }

  return captionBlocks.join("\n\n").trim() || null;
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
    let thumbnail = extractImage(item.properties);
    let caption = extractCaptionProperty(item.properties);

    // The MR calendar stores some artwork and captions in the page body,
    // rather than in database properties. Reuse one block traversal for both.
    if (!thumbnail || !caption) {
      try {
        const body = await getPageBodyData(item.id, token);
        thumbnail ??= body.thumbnail;
        caption ??= extractCaptionFromBody(body.textBlocks);
      } catch {
        // Keep any values already read from properties if body access fails.
      }
    }

    return {
      id: item.id,
      title: extractTitle(item.properties),
      thumbnail,
      caption,
      pageUrl: item.url ?? "https://www.notion.so/" + item.id.replace(/-/g, ""),
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
