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
  multi_select?: { name?: string }[];
  relation?: { id: string }[];
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

async function queryCompanyDataSource(
  profile: ProfileKey,
  startCursor?: string
): Promise<DataSourceQueryResponse> {
  const companyId = PROFILE_COMPANY_IDS[profile];

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
          property: "Empresa",
          relation: { contains: companyId },
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

async function fetchCompanyPages(profile: ProfileKey): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const result = await queryCompanyDataSource(profile, cursor);
    pages.push(...result.results);
    cursor =
      result.has_more && result.next_cursor ? result.next_cursor : undefined;
  } while (cursor && pages.length < 10_000);

  // Keep Instagram posts, published Stories and published items whose
  // Rede Social field has not been filled. All other channels stay excluded.
  return pages.filter((page) => {
    const properties = page.properties;
    const social = properties["Rede Social"]?.multi_select ?? [];
    const isInstagram = social.some((item) => item.name === "Instagram");
    const isPublished = properties["Status"]?.status?.name === "Publicado";
    const isStory = properties["Tipo/Formato"]?.select?.name === "Stories";
    const isUntagged = social.length === 0;

    return isInstagram || (isPublished && (isStory || isUntagged));
  });
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

async function getFirstMediaFromBlocks(
  blocks: NotionBlock[],
  token: string,
  depth = 0
): Promise<StoryMedia | null> {
  if (depth > 5) return null;

  let firstVideo: StoryMedia | null = null;

  for (const block of blocks) {
    const media = mediaFromBlock(block);
    if (media?.kind === "image") return media;
    if (media?.kind === "video" && !firstVideo) firstVideo = media;

    if (block.has_children) {
      const nested = await getBlockChildren(block.id, token);
      const childMedia = await getFirstMediaFromBlocks(
        nested.results,
        token,
        depth + 1
      );
      if (childMedia?.kind === "image") return childMedia;
      if (childMedia?.kind === "video" && !firstVideo) {
        firstVideo = childMedia;
      }
    }
  }

  return firstVideo;
}

async function getFirstPageMedia(
  pageId: string,
  token: string
): Promise<StoryMedia | null> {
  const children = await getBlockChildren(pageId, token);
  return getFirstMediaFromBlocks(children.results, token);
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
  const pages = await fetchCompanyPages(profile);
  return createRevision(pages);
}

function dedupeMedia(media: StoryMedia[]): StoryMedia[] {
  const seen = new Set<string>();
  return media.filter((asset) => {
    if (seen.has(asset.url)) return false;
    seen.add(asset.url);
    return true;
  });
}

async function fetchDetailsFromPage(
  page: NotionPage,
  pageId: string,
  token: string
): Promise<{ media: StoryMedia[]; caption: string | null }> {
  const propertyMedia = extractPropertyMedia(page.properties);
  const propertyCaption = cleanCaption(
    richTextToString(page.properties["Legenda (texto)"]?.rich_text)
  );

  const body = await getPageBodyData(pageId, token);
  const media = dedupeMedia([...propertyMedia, ...body.media]);

  return {
    media,
    caption: propertyCaption ?? extractCaptionFromBody(body.textBlocks),
  };
}

function normalizePageId(value: string): string {
  return value.replace(/-/g, "").toLowerCase();
}

export async function fetchPostsDetails(
  profile: ProfileKey,
  pageIds: string[]
): Promise<Record<string, { media: StoryMedia[]; caption: string | null }>> {
  if (!Array.isArray(pageIds) || pageIds.length === 0 || pageIds.length > 8) {
    throw new Error("Informe entre 1 e 8 publicações por lote.");
  }

  if (pageIds.some((id) => !/^[0-9a-f-]{32,36}$/i.test(id))) {
    throw new Error("Um ou mais IDs de publicação são inválidos.");
  }

  const token = getToken();
  // One company-scoped query validates every page in this batch instead of
  // repeating the full data-source query for every post.
  const pages = await fetchCompanyPages(profile);
  const pageMap = new Map(
    pages.map((page) => [normalizePageId(page.id), page] as const)
  );

  const requested = pageIds.map((id) => ({
    requestedId: id,
    page: pageMap.get(normalizePageId(id)),
  }));

  if (requested.some((item) => !item.page)) {
    throw new Error("Uma ou mais publicações não pertencem ao perfil selecionado.");
  }

  const details = await mapWithConcurrency(
    requested,
    2,
    async ({ requestedId, page }) => {
      const result = await fetchDetailsFromPage(page as NotionPage, (page as NotionPage).id, token);
      return [requestedId, result] as const;
    }
  );

  return Object.fromEntries(details);
}

export async function fetchPostDetails(
  profile: ProfileKey,
  pageId: string
): Promise<{ media: StoryMedia[]; caption: string | null }> {
  const results = await fetchPostsDetails(profile, [pageId]);
  return results[pageId];
}

const FEED_PAGE_SIZE = 12;

function pageDate(page: NotionPage): string | null {
  return page.properties["Data de Publicação"]?.date?.start ?? null;
}

function pageToPost(item: NotionPage, media: StoryMedia[] = []): NotionPost {
  return {
    id: item.id,
    title: extractTitle(item.properties),
    thumbnail:
      media.find((asset) => asset.kind === "image")?.url ??
      media[0]?.url ??
      null,
    caption: cleanCaption(
      richTextToString(item.properties["Legenda (texto)"]?.rich_text)
    ),
    pageUrl: item.url ?? "https://www.notion.so/" + item.id.replace(/-/g, ""),
    publishDate: pageDate(item),
    status: item.properties["Status"]?.status?.name ?? null,
    format: item.properties["Tipo/Formato"]?.select?.name ?? null,
    media,
  };
}

export async function fetchPostsSnapshot(
  profile: ProfileKey = "mr",
  offset = 0
): Promise<{
  posts: NotionPost[];
  revision: string;
  hasMore: boolean;
  nextOffset: number;
  publishedCount: number;
  completedCount: number;
}> {
  // Read the database properties once, but resolve thumbnails only for the
  // requested 12-item page. Published Stories are returned as lightweight
  // records and their full media is loaded after the main feed.
  const pages = await fetchCompanyPages(profile);
  const revision = createRevision(pages);

  const storyPages = pages
    .filter(
      (page) =>
        page.properties["Tipo/Formato"]?.select?.name === "Stories" &&
        page.properties["Status"]?.status?.name === "Publicado"
    )
    .sort((a, b) => (pageDate(b) ?? "").localeCompare(pageDate(a) ?? ""));

  const feedPages = pages
    .filter((page) => {
      const status = page.properties["Status"]?.status?.name;
      return (
        page.properties["Tipo/Formato"]?.select?.name !== "Stories" &&
        (status === "Publicado" || status === "Concluído")
      );
    })
    .sort((a, b) => (pageDate(b) ?? "").localeCompare(pageDate(a) ?? ""));

  const safeOffset = Math.max(0, Math.floor(offset));
  const selectedPages = feedPages.slice(safeOffset, safeOffset + FEED_PAGE_SIZE);
  const token = getToken();

  // Two requests per profile at a time: enough parallelism to reduce the old
  // sequential delay without flooding the Notion integration with requests.
  const feedPosts = await mapWithConcurrency(selectedPages, 2, async (item) => {
    const propertyMedia = extractPropertyMedia(item.properties);
    let firstBodyMedia: StoryMedia | null = null;

    if (!propertyMedia.some((asset) => asset.kind === "image")) {
      try {
        firstBodyMedia = await getFirstPageMedia(item.id, token);
      } catch {
        // A missing thumbnail must not prevent the rest of the feed from loading.
      }
    }

    return pageToPost(
      item,
      dedupeMedia([...propertyMedia, ...(firstBodyMedia ? [firstBodyMedia] : [])])
    );
  });

  // Story cards need only their metadata at startup. The Story viewer fetches
  // all slides when opened, after the first feed page has already appeared.
  const storyPosts =
    safeOffset === 0
      ? storyPages.map((page) => pageToPost(page, extractPropertyMedia(page.properties)))
      : [];

  return {
    posts: [...feedPosts, ...storyPosts],
    revision,
    hasMore: safeOffset + FEED_PAGE_SIZE < feedPages.length,
    nextOffset: Math.min(safeOffset + FEED_PAGE_SIZE, feedPages.length),
    publishedCount: feedPages.filter(
      (page) => page.properties["Status"]?.status?.name === "Publicado"
    ).length,
    completedCount: feedPages.filter(
      (page) => page.properties["Status"]?.status?.name === "Concluído"
    ).length,
  };
}

export async function fetchPosts(profile: ProfileKey = "mr"): Promise<NotionPost[]> {
  return (await fetchPostsSnapshot(profile)).posts;
}
