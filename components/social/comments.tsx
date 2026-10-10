"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { buttonClass } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { formatDate } from "@/lib/dates";
import { addComment, deleteComment, editComment } from "@/lib/posts/actions";
import type { CommentView } from "@/lib/posts/queries";
import { sectionHeading } from "@/components/shell/page-grid";
import { Avatar } from "./avatar";
import { ReportDialog } from "./report-dialog";

const MAX = 2000;

function CommentForm({
  initial = "",
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: string;
  submitLabel: string;
  onSubmit: (text: string) => Promise<{ ok: boolean; message?: string }>;
  onCancel?: () => void;
}) {
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return setError("Write something first.");
    start(async () => {
      try {
        const res = await onSubmit(text);
        if (res.ok) {
          setText("");
          setError(null);
        } else setError(res.message ?? "Something went wrong.");
      } catch {
        setError("Couldn't reach the server. Try again.");
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor={`comment-${submitLabel}`} className="sr-only">
        {submitLabel}
      </label>
      <textarea
        id={`comment-${submitLabel}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX}
        rows={3}
        placeholder="Leave a kind word…"
        className="field-sizing-content min-h-20 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-base focus:border-taupe focus:outline-none"
      />
      {error && <FormMessage error={error} />}
      <div className="flex items-center justify-end gap-2">
        {text.length > MAX - 200 && <span className="mr-auto text-xs text-muted">{MAX - text.length} left</span>}
        {onCancel && (
          <button type="button" onClick={onCancel} className={buttonClass("ghost")}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={pending || !text.trim()} className={buttonClass("primary", "px-4 py-2")}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function CommentItem({ comment, viewerId, postAuthorId }: { comment: CommentView; viewerId: string | null; postAuthorId: string }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const mine = viewerId === comment.author.id;
  const canRemove = mine || viewerId === postAuthorId;

  const remove = () => {
    if (!window.confirm(mine ? "Delete your comment?" : "Remove this comment from your post?")) return;
    start(async () => {
      const res = await deleteComment(comment.id);
      if (!res.ok) setError(res.message);
    });
  };

  return (
    <li className={`py-5 ${pending ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-2.5 text-sm">
        <Avatar name={comment.author.display_name} size="sm" />
        <Link href={`/u/${comment.author.username}`} className="font-medium hover:underline">
          {comment.author.display_name}
        </Link>
        <span className="text-muted">@{comment.author.username}</span>
        <span className="text-muted">·</span>
        <time dateTime={comment.created_at} className="text-muted">
          {formatDate(comment.created_at)}
        </time>
        {comment.updated_at !== comment.created_at && <span className="text-xs text-muted">(edited)</span>}
      </div>
      {editing ? (
        <div className="mt-3">
          <CommentForm
            initial={comment.content}
            submitLabel="Save"
            onCancel={() => setEditing(false)}
            onSubmit={async (text) => {
              const res = await editComment(comment.id, text);
              if (res.ok) setEditing(false);
              return res;
            }}
          />
        </div>
      ) : (
        <p className="mt-2 pl-9 leading-relaxed whitespace-pre-line">{comment.content}</p>
      )}
      {!editing && viewerId && (
        <div className="mt-2 flex items-center gap-1 pl-7">
          {mine && (
            <button type="button" onClick={() => setEditing(true)} className="rounded-full px-2.5 py-1.5 text-xs text-muted hover:bg-paper-soft hover:text-ink">
              Edit
            </button>
          )}
          {canRemove && (
            <button type="button" onClick={remove} className="rounded-full px-2.5 py-1.5 text-xs text-muted hover:bg-paper-soft hover:text-danger">
              {mine ? "Delete" : "Remove"}
            </button>
          )}
          {!mine && <ReportDialog target="comment" targetId={comment.id} label="comment" signedIn />}
          {error && (
            <span role="alert" className="text-xs text-danger">
              {error}
            </span>
          )}
        </div>
      )}
    </li>
  );
}

export function Comments({
  entryId,
  postAuthorId,
  comments,
  viewerId,
  loginHref,
}: {
  entryId: string;
  postAuthorId: string;
  comments: CommentView[];
  viewerId: string | null;
  loginHref: string;
}) {
  return (
    <section aria-labelledby="comments-heading" className="mt-4 pt-6 xl:border-t xl:border-line xl:pt-10">
      <h2 id="comments-heading" className={sectionHeading}>
        {comments.length === 0 ? "Responses" : `${comments.length} ${comments.length === 1 ? "response" : "responses"}`}
      </h2>
      <div className="mt-6">
        {viewerId ? (
          <CommentForm submitLabel="Respond" onSubmit={(text) => addComment(entryId, text)} />
        ) : (
          <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
            <Link href={loginHref} className="text-ink underline underline-offset-4">
              Log in
            </Link>{" "}
            to respond.
          </p>
        )}
      </div>
      {comments.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No responses yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} viewerId={viewerId} postAuthorId={postAuthorId} />
          ))}
        </ul>
      )}
    </section>
  );
}
