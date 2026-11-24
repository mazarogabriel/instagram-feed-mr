"use client";

import Image from "next/image";
import { useEffect } from "react";
import { X, ExternalLink, CalendarDays } from "lucide-react";
import type { NotionPost } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface PostDetailModalProps {
  post: NotionPost;
  onClose: () => void;
}

export default function PostDetailModal({ post, onClose }: PostDetailModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={"Publicação: " + post.title}
        className="relative flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:flex-row"
      >
        <div className="relative aspect-[3/4] w-full flex-shrink-0 bg-[#eeece7] sm:aspect-auto sm:w-[44%]">
          {post.thumbnail ? (
            <Image
              src={post.thumbnail}
              alt={post.title}
              fill
              className="object-cover"
              unoptimized
              sizes="(max-width: 640px) 100vw, 340px"
            />
          ) : (
            <div className="flex h-full min-h-[220px] items-center justify-center p-8 text-center text-sm text-[#77736d]">
              Imagem não cadastrada
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-[#efefef] px-5 py-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8e8e8e]">
                @mr.melinaromano
              </p>
              <h2 className="mt-1 text-base font-semibold leading-snug text-[#262626]">
                {post.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar publicação"
              className="rounded-full p-1.5 text-[#6f6f6f] transition-colors hover:bg-[#f2f2f2]"
            >
              <X size={19} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[#77736d]">
              {post.publishDate && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={13} />
                  {formatDate(post.publishDate)}
                </span>
              )}
              {post.status && (
                <span className="rounded-full bg-[#f1f0ed] px-2.5 py-1">
                  {post.status}
                </span>
              )}
            </div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8e8e8e]">
              Legenda
            </h3>
            <p className="whitespace-pre-wrap text-[13px] leading-[1.75] text-[#262626]">
              {post.caption || "A legenda ainda não foi preenchida nesta publicação."}
            </p>
          </div>

          <div className="border-t border-[#efefef] px-5 py-3">
            <a
              href={post.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#262626] hover:underline"
            >
              Abrir no Notion <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
