import type { NotionPost, StoryMedia } from "./types";

export type ProfileKey = "mr" | "lab";

const NOTION_API_VERSION = "2026-03-11";
const NOTION_API_BASE = "https://api.notion.com/v1";

const PROFILE_COMPANY_IDS: Record<ProfileKey, string> = {
  mr: "c444a082-c32a-8350-adfc-0110adbf4fa7",
  lab: "9014a082-c32a-832b-9abf-814a184c2594",
};

type RichTextItem = {
  plain_text?: string;
  text?: { content?: string };
};

type NotionFile =
  | { type: "file"; name?: string; file?: { url?: string; mime_type?: string } }
  | { type: "external"; name?: string; external?: { url?: string } };

type NotionProperty = {
  type?: string;
  title?: RichTextItem[];
  rich_text?: RichTextItem[];
  files?: NotionFile[];
  select?: { name?: string } | null;
  date?: { start?: string | null } | null;
  status?: { name?: string } | null;
};

type NotionPage = {
  id: string;
  url?: string;
  last_edited_time?: string;
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
  media: StoryMedia[];
  textBlocks: string[];
};

const DATA_SOURCE_ID =
  process.env.NOTION_DATA_SOURCE_ID ?? "c394a082-c32a-8389-8345-077f489e674f";

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
  profile: ProfileKey,
  onlyPublishedStories: boolean,
  startCursor?: string
): Promise<DataSourceQueryResponse> {
  const companyId = PROFILE_COMPANY_IDS[profile];
  const filters: Record<string, unknown>[] = [
    {
      property: "Empresa",
      relation: { contains: companyId },
    },
    onlyPublishedStories
      ? {
          property: "Tipo/Formato",
          select: { equals: "Stories" },
        }
      : {
          or: [
            {
              property: "Rede Social",
              multi_select: { contains: "Instagram" },
            },
            {
              property: "Rede Social",
              multi_select: { is_empty: true },
            },
          ],
        },
  ];

  if (onlyPublishedStories) {
    filters.push({
      property: "Status",
      status: { equals: "Publicado" },
    });
  }

  const response = await fetch(
    NOTION_API_BASE + "/data_sources/" + DATA_SOURCE_ID + "/query",
    {
      method: "POST",
      headers: notionHeaders(getToken()),
      body: JSON.stringify({
        result_type: "page",
        page_size: 100,
        ...(startCursor ? { start_cursor: startCursor } : {}),
        filter: { and: filters },
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
    throw new Error(
      "Notion API (" +
        response.status +
        (errorPayload.code ? ", " + errorPayload.code : "") +
        "): " +
        (errorPayload.message ?? "Erro desconhecido")
    );
  }

  return payload as DataSourceQueryResponse;
}

async function queryAllPages(
  profile: ProfileKey,
  onlyPublishedStories: boolean
): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const result = await queryDataSource(profile, onlyPublishedStories, cursor);
    pages.push(...result.results);
    cursor =
      result.has_more && result.next_cursor ? result.next_cursor : undefined;
  } while (cursor && pages.length < 10_000);

  return pages;
}

function richTextToString(items?: RichTextItem[]): string {
  return (
    items
      ?.map((item) => item.plain_text ?? item.text?.content ?? "")
      .join("")
      .trim() ?? ""
  );
}

function normalizeLineBreaks(value: string): string {
  return value
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\\_/g, "_")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanCaption(value: string): string | null {
  let caption = normalizeLineBreaks(value)
    .replace(/^Legenda\s*:?\s*/i, "")
    .replace(/[ \t]*ᴾᵀ⁻ᴱᴺᴳ[ \t]*/g, "")
    .trim();

  const editorialBoundary =
    /(?:^|\n)\s*(?:_{8,}|Referência de edição|Referencias? de edição|Roteiro|Orientação de edição|Notas? de edição|Inserir botão|Inserir imagens)/i.exec(
      caption
    );

  if (editorialBoundary && editorialBoundary.index >= 0) {
    caption = caption.slice(0, editorialBoundary.index).trim();
  }

  return caption || null;
}

function extractTitle(properties: Record<string, NotionProperty>): string {
  const titleProperty =
    properties["Tema"] ??
    Object.values(properties).find((property) => property.type === "title");

  return richTextToString(titleProperty?.title) || "Sem título";
}

function inferMediaKind(
  url: string,
  name = "",
  mimeType = ""
): StoryMedia["kind"] {
  const source = (url + " " + name + " " + mimeType).toLowerCase();
  return mimeType.toLowerCase().startsWith("video/") ||
    /\.(mp4|mov|m4v|webm)(?:[?#\s]|$)/i.test(source)
    ? "video"
    : "image";
}

function extractPropertyMedia(
  properties: Record<string, NotionProperty>
): StoryMedia[] {
  return (properties["Imagens"]?.files ?? []).flatMap((file) => {
    const url =
      file.type === "file"
        ? file.file?.url
        : file.type === "external"
          ? file.external?.url
          : undefined;

    if (!url) return [];

    const mimeType = file.type === "file" ? file.file?.mime_type ?? "" : "";
    return [{ url, kind: inferMediaKind(url, file.name ?? "", mimeType) }];
  });
}

function mediaFromBlock(block: NotionBlock): StoryMedia | null {
  if (!["image", "video", "file"].includes(block.type)) return null;

  const content = block[block.type] as
    | {
        type?: string;
        file?: { url?: string; mime_type?: string; name?: string };
        external?: { url?: string };
      }
    | undefined;

  if (!content) return null;

  const url =
    content.type === "external"
      ? content.external?.url
      : content.file?.url ?? content.external?.url;

  if (!url) return null;

  const kind =
    block.type === "video"
      ? "video"
      : inferMediaKind(
          url,
          content.file?.name ?? "",
          content.file?.mime_type ?? ""
        );

  return { url, kind };
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
  const data: PageBodyData = { media: [], textBlocks: [] };
  if (depth > 5) return data;

  let cursor: string | undefined;
  do {
    const page = await getBlockChildren(blockId, token, cursor);

    for (const block of page.results) {
      const media = mediaFromBlock(block);
      if (media) data.media.push(media);

      const blockText = textFromBlock(block);
      if (blockText) data.textBlocks.push(blockText);

      if (block.has_children) {
        const nested = await getPageBodyData(block.id, token, depth + 1);
        data.media.push(...nested.media);
        data.textBlocks.push(...nested.textBlocks);
      }
    }

    cursor = page.has_more ? page.next_cursor ?? undefined : undefined;
  } while (cursor);

  const seen = new Set<string>();
  data.media = data.media.filter((asset) => {
    if (seen.has(asset.url)) return false;
    seen.add(asset.url);
    return true;
  });

  return data;
}

function extractCaptionFromBody(textBlocks: string[]): string | null {
  const body = normalizeLineBreaks(textBlocks.join("\n\n"));
  if (!body) return null;

  const explicitMarker = /(?:^|\n)\s*Legenda(?: principal)?\s*:?\s*/i.exec(body);
  if (explicitMarker) {
    return cleanCaption(body.slice(explicitMarker.index + explicitMarker[0].length));
  }

  const languageMarker = /(?:^|\n)\s*ᴾᵀ⁻ᴱᴺᴳ\s*/i.exec(body);
  if (languageMarker) {
    return cleanCaption(body.slice(languageMarker.index + languageMarker[0].length));
  }

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

async function fetchProfilePages(profile: ProfileKey): Promise<NotionPage[]> {
  const [instagramPages, publishedStoryPages] = await Promise.all([
    queryAllPages(profile, false),
    queryAllPages(profile, true),
  ]);

  // Merge Instagram posts (including untagged network entries) and published
  // Stories by page id so each Notion page appears only once.
  const pageMap = new Map<string, NotionPage>();
  for (const page of instagramPages) pageMap.set(page.id, page);
  for (const page of publishedStoryPages) pageMap.set(page.id, page);
  return Array.from(pageMap.values());
}

function createRevision(pages: NotionPage[]): string {
  return pages
    .map((page) => [
      page.id,
      page.last_edited_time ?? "",
      page.properties["Status"]?.status?.name ?? "",
      page.properties["Tipo/Formato"]?.select?.name ?? "",
      page.properties["Data de Publicação"]?.date?.start ?? "",
    ].join(":"))
    .sort()
    .join("|");
}

export async function fetchPostsRevision(profile: ProfileKey): Promise<string> {
  const pages = await fetchProfilePages(profile);
  return createRevision(pages);
}

export async function fetchPostsSnapshot(
  profile: ProfileKey = "mr"
): Promise<{ posts: NotionPost[]; revision: string }> {
  const pages = await fetchProfilePages(profile);
  const revision = createRevision(pages);
  const token = getToken();
  const posts = await mapWithConcurrency(pages, 3, async (item) => {
    const propertyMedia = extractPropertyMedia(item.properties);
    let caption = cleanCaption(
      richTextToString(item.properties["Legenda (texto)"]?.rich_text)
    );

    // Read the complete page body for every format. Reels, videos and
    // carousels often store their media as separate blocks or inside columns.
    let body: PageBodyData = { media: [], textBlocks: [] };
    try {
      body = await getPageBodyData(item.id, token);
      caption ??= extractCaptionFromBody(body.textBlocks);
    } catch {
      // Preserve the media and caption already available from properties.
    }

    const media = [...propertyMedia, ...body.media].filter(
      (asset, index, array) =>
        array.findIndex((candidate) => candidate.url === asset.url) === index
    );

    return {
      id: item.id,
      title: extractTitle(item.properties),
      thumbnail:
        media.find((asset) => asset.kind === "image")?.url ??
        media[0]?.url ??
        null,
      caption,
      pageUrl: item.url ?? "https://www.notion.so/" + item.id.replace(/-/g, ""),
      publishDate: item.properties["Data de Publicação"]?.date?.start ?? null,
      status: item.properties["Status"]?.status?.name ?? null,
      format: item.properties["Tipo/Formato"]?.select?.name ?? null,
      media,
    };
  });

  const sortedPosts = posts.sort((a, b) => {
    if (!a.publishDate && !b.publishDate) return 0;
    if (!a.publishDate) return 1;
    if (!b.publishDate) return -1;
    return b.publishDate.localeCompare(a.publishDate);
  });

  return { posts: sortedPosts, revision };
}

export async function fetchPosts(profile: ProfileKey = "mr"): Promise<NotionPost[]> {
  return (await fetchPostsSnapshot(profile)).posts;
}
