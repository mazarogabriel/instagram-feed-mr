"use client";

import type { NotionPost } from "@/lib/types";
import GridCell from "./GridCell";

interface InstagramGridProps {
  posts: NotionPost[];
  onSelectPost: (post: NotionPost) => void;
}

export default function InstagramGrid({ posts, onSelectPost }: InstagramGridProps) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#dbdbdb]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8e8e8e" strokeWidth="1.5">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <p className="text-[14px] font-semibold text-[#262626]">
          Nenhuma publicação para os filtros selecionados
        </p>
        <p className="mt-1 text-[12px] text-[#8e8e8e]">
          Ative um dos status acima para ampliar a visualização.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-[1px] bg-white">
      {posts.map((post) => (
        <GridCell
          key={post.id}
          post={post}
          onClick={() => onSelectPost(post)}
        />
      ))}
    </div>
  );
}
