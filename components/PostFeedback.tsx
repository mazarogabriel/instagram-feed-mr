"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Heart, Send, Pencil, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type LikeRow = { actor_id: string; display_name: string };
type CommentRow = {
  id: string;
  actor_id: string;
  display_name: string;
  body: string;
  created_at: string;
};

export default function PostFeedback({
  postId,
  actorId,
  displayName,
}: {
  postId: string;
  actorId: string;
  displayName: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [comment, setComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadFeedback = useCallback(async () => {
    setError("");
    const [likesResult, commentsResult] = await Promise.all([
      supabase.from("post_likes_by_name").select("actor_id,display_name").eq("post_id", postId),
      supabase.from("post_comments_by_name")
        .select("id,actor_id,display_name,body,created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: true }),
    ]);

    const firstError = likesResult.error ?? commentsResult.error;
    if (firstError) {
      setError("Não foi possível carregar as aprovações e os comentários.");
      setLoading(false);
      return;
    }

    setLikes((likesResult.data ?? []) as LikeRow[]);
    setComments((commentsResult.data ?? []) as CommentRow[]);
    setLoading(false);
  }, [postId, supabase]);

  useEffect(() => {
    void loadFeedback();
  }, [loadFeedback]);

  const likedByMe = likes.some((like) => like.actor_id === actorId);

  async function toggleLike() {
    setSaving(true);
    setError("");

    const result = likedByMe
      ? await supabase.from("post_likes_by_name").delete().eq("post_id", postId).eq("actor_id", actorId)
      : await supabase.from("post_likes_by_name").insert({
          post_id: postId,
          actor_id: actorId,
          display_name: displayName,
        });

    if (result.error) {
      setError("Não foi possível registrar sua aprovação.");
    } else {
      await loadFeedback();
    }
    setSaving(false);
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = comment.trim();
    if (!body || body.length > 2000) return;

    setSaving(true);
    setError("");
    const { error: insertError } = await supabase.from("post_comments_by_name").insert({
      post_id: postId,
      actor_id: actorId,
      display_name: displayName,
      body,
    });

    if (insertError) {
      setError("Não foi possível publicar o comentário.");
    } else {
      setComment("");
      await loadFeedback();
    }
    setSaving(false);
  }

  function startEditingComment(item: CommentRow) {
    setEditingCommentId(item.id);
    setEditingBody(item.body);
    setError("");
  }

  function cancelEditingComment() {
    setEditingCommentId(null);
    setEditingBody("");
  }

  async function saveEditedComment(commentId: string) {
    const body = editingBody.trim();
    if (!body || body.length > 2000) return;

    setSaving(true);
    setError("");
    const { error: updateError } = await supabase.from("post_comments_by_name")
      .update({ body })
      .eq("id", commentId)
      .eq("actor_id", actorId);

    if (updateError) {
      setError("Não foi possível atualizar o comentário.");
    } else {
      cancelEditingComment();
      await loadFeedback();
    }
    setSaving(false);
  }

  return (
    <section className="mt-7 border-t border-[#efefef] pt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8e8e8e]">
          Aprovação da equipe
        </h3>
        <button
          type="button"
          onClick={() => void toggleLike()}
          disabled={saving || loading}
          aria-pressed={likedByMe}
          className={
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-medium transition disabled:opacity-50 " +
            (likedByMe
              ? "border-[#ead0d0] bg-[#fbf3f3] text-[#a33f43]"
              : "border-[#e6e3de] bg-white text-[#4c4944] hover:bg-[#f7f6f3]")
          }
        >
          <Heart size={14} fill={likedByMe ? "currentColor" : "none"} />
          {likedByMe ? "Aprovado" : "Aprovar"}
        </button>
      </div>

      {loading ? (
        <p className="mt-3 text-[11px] text-[#8e8e8e]">Carregando interações…</p>
      ) : (
        <>
          <p className="mt-3 text-[11px] text-[#77736d]">
            {likes.length === 0
              ? "Ainda sem aprovações."
              : "Aprovado por " + likes.map((like) => like.display_name).join(", ")}
          </p>

          <div className="mt-6">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8e8e8e]">
              Comentários ({comments.length})
            </h3>
            {comments.length === 0 ? (
              <p className="text-[12px] text-[#8e8e8e]">Nenhum comentário ainda.</p>
            ) : (
              <div className="space-y-3">
                {comments.map((item) => (
                  <article key={item.id} className="rounded-xl bg-[#f7f6f3] px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-[#4c4944]">
                          {item.display_name}
                          <span className="ml-2 font-normal text-[#99958e]">
                            {new Date(item.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </p>
                        {editingCommentId === item.id ? (
                          <div className="mt-2 space-y-2">
                            <textarea
                              value={editingBody}
                              onChange={(event) => setEditingBody(event.target.value)}
                              rows={3}
                              maxLength={2000}
                              aria-label="Editar comentário"
                              className="min-h-[64px] w-full resize-y rounded-lg border border-[#e6e3de] bg-white px-3 py-2 text-[12px] leading-5 text-[#262626] outline-none focus:border-[#99958e]"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={cancelEditingComment}
                                disabled={saving}
                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] text-[#77736d] hover:bg-white disabled:opacity-50"
                              >
                                <X size={12} /> Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => void saveEditedComment(item.id)}
                                disabled={saving || !editingBody.trim()}
                                className="inline-flex items-center gap-1 rounded-full bg-[#262626] px-2.5 py-1.5 text-[11px] text-white hover:bg-[#444] disabled:opacity-50"
                              >
                                <Check size={12} /> Salvar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-5 text-[#262626]">
                            {item.body}
                          </p>
                        )}
                      </div>
                      {item.actor_id === actorId && editingCommentId !== item.id && (
                        <button
                          type="button"
                          onClick={() => startEditingComment(item)}
                          aria-label="Editar comentário"
                          title="Editar comentário"
                          className="rounded-full p-1 text-[#99958e] hover:bg-white hover:text-[#4c4944]"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            <form onSubmit={submitComment} className="mt-4 flex items-end gap-2">
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="Escreva um comentário…"
                className="min-h-[42px] flex-1 resize-y rounded-xl border border-[#e6e3de] px-3 py-2 text-[12px] leading-5 text-[#262626] outline-none focus:border-[#99958e]"
              />
              <button
                type="submit"
                disabled={saving || !comment.trim()}
                aria-label="Enviar comentário"
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#262626] text-white transition hover:bg-[#444] disabled:opacity-40"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </>
      )}

      {error && <p role="alert" className="mt-3 text-[11px] text-[#a33f43]">{error}</p>}
    </section>
  );
}
