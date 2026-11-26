import { fetchPostsSnapshot, type ProfileKey } from "@/lib/notion";
import type { Profile, Highlight, NotionPost } from "@/lib/types";
import InstagramWidget from "@/components/InstagramWidget";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getProfile(): Profile {
  return {
    username: process.env.NEXT_PUBLIC_PROFILE_USERNAME ?? "mr.melinaromano",
    displayName: process.env.NEXT_PUBLIC_PROFILE_DISPLAY_NAME ?? "Melina Romano",
    bio: process.env.NEXT_PUBLIC_PROFILE_BIO ?? "Arquitetura, interiores, design e arte.",
    website: process.env.NEXT_PUBLIC_PROFILE_WEBSITE ?? "",
    avatarUrl: process.env.NEXT_PUBLIC_PROFILE_AVATAR_URL ?? "/mr-profile.jpg",
  };
}

function getHighlights(): Highlight[] {
  try {
    const raw = process.env.NEXT_PUBLIC_HIGHLIGHTS;
    if (!raw) return [];
    return JSON.parse(raw) as Highlight[];
  } catch {
    return [];
  }
}

type InitialSnapshot = {
  posts: NotionPost[];
  revision: string;
  hasMore: boolean;
  nextOffset: number;
  publishedCount: number;
  completedCount: number;
  error?: string;
};

async function loadInitialSnapshot(profile: ProfileKey): Promise<InitialSnapshot> {
  try {
    const snapshot = await fetchPostsSnapshot(profile);
    return {
      posts: snapshot.posts,
      revision: snapshot.revision,
      hasMore: snapshot.hasMore,
      nextOffset: snapshot.nextOffset,
      publishedCount: snapshot.publishedCount,
      completedCount: snapshot.completedCount,
    };
  } catch (error) {
    return {
      posts: [],
      revision: "",
      hasMore: false,
      nextOffset: 0,
      publishedCount: 0,
      completedCount: 0,
      error: error instanceof Error
        ? error.message
        : "Não foi possível conectar ao Notion. Verifique as variáveis de ambiente.",
    };
  }
}

export default async function HomePage() {
  const profile = getProfile();
  const highlights = getHighlights();

  // Load both companies concurrently. The client keeps both results in memory,
  // so changing the selected profile does not trigger another full media fetch.
  const [mr, lab] = await Promise.all([
    loadInitialSnapshot("mr"),
    loadInitialSnapshot("lab"),
  ]);

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#f3f2ef] px-3 py-4 sm:px-6 sm:py-8">
      <InstagramWidget
        initialProfiles={{ mr, lab }}
        profile={profile}
        highlights={highlights}
      />
    </main>
  );
}
