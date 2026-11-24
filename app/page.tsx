import { fetchPostsSnapshot } from "@/lib/notion";
import type { Profile, Highlight, NotionPost } from "@/lib/types";
import InstagramWidget from "@/components/InstagramWidget";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getProfile(): Profile {
  return {
    username: process.env.NEXT_PUBLIC_PROFILE_USERNAME ?? "mr.melinaromano",
    displayName: process.env.NEXT_PUBLIC_PROFILE_DISPLAY_NAME ?? "Melina Romano Studio",
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

export default async function HomePage() {
  const profile = getProfile();
  const highlights = getHighlights();
  let initialPosts: NotionPost[] = [];
  let initialRevision = "";
  let initialError: string | undefined;

  try {
    const snapshot = await fetchPostsSnapshot("mr");
    initialPosts = snapshot.posts;
    initialRevision = snapshot.revision;
  } catch (error) {
    initialError = error instanceof Error
      ? error.message
      : "Não foi possível conectar ao Notion. Verifique as variáveis de ambiente.";
  }

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#f3f2ef] px-3 py-4 sm:px-6 sm:py-8">
      <InstagramWidget
        initialPosts={initialPosts}
        initialRevision={initialRevision}
        profile={profile}
        highlights={highlights}
        initialError={initialError}
      />
    </main>
  );
}
