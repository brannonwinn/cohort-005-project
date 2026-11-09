import { useState } from "react";
import { useFetcher } from "react-router";
import { Lock, NotebookPen } from "lucide-react";
import { LessonSection } from "~/components/lesson-section";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { cn, formatRelativeTime } from "~/lib/utils";
import {
  describeNoteDraft,
  type NoteDraft,
  type NoteDraftStatus,
} from "~/modules/lesson-note";

export function LessonNote({
  note,
}: {
  note: { body: string; updatedAt: string } | null;
}) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [body, setBody] = useState(note?.body ?? "");
  const isSaving = fetcher.state !== "idle";
  const error = isSaving ? undefined : fetcher.data?.error;
  const draft = describeNoteDraft(body, note?.body ?? null);

  return (
    <LessonSection
      icon={NotebookPen}
      title="Your notes"
      description={
        <span className="inline-flex items-center gap-1">
          <Lock className="size-3" />
          Private to you. Jot things down while you watch.
        </span>
      }
    >
      <fetcher.Form method="post" className="space-y-2">
        <input type="hidden" name="intent" value="save-note" />
        <Textarea
          name="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={4}
          placeholder="What do you want to remember from this lesson?"
          aria-label="Your notes"
          className="min-h-24 resize-y"
        />

        <NoteFooter
          draft={draft}
          isSaving={isSaving}
          error={error}
          updatedAt={note?.updatedAt ?? null}
        />
      </fetcher.Form>
    </LessonSection>
  );
}

function NoteStatus({
  status,
  updatedAt,
}: {
  status: NoteDraftStatus;
  updatedAt: string | null;
}) {
  if (status === "cleared") {
    return (
      <span className="text-xs text-muted-foreground">
        A note can&apos;t be empty
      </span>
    );
  }
  if (status === "unsaved") {
    return (
      <span className="text-xs text-muted-foreground">Unsaved changes</span>
    );
  }
  if (status === "saved" && updatedAt) {
    return (
      <span suppressHydrationWarning className="text-xs text-muted-foreground">
        Saved · last edited {formatRelativeTime(updatedAt)}
      </span>
    );
  }
  return null;
}

function NoteFooter({
  draft,
  isSaving,
  error,
  updatedAt,
}: {
  draft: NoteDraft;
  isSaving: boolean;
  error: string | undefined;
  updatedAt: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button type="submit" size="sm" disabled={isSaving || !draft.canSave}>
        {isSaving ? "Saving..." : "Save note"}
      </Button>

      {error ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : (
        <NoteStatus status={draft.status} updatedAt={updatedAt} />
      )}

      <span
        className={cn(
          "ml-auto text-xs",
          draft.tooLong ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {draft.length} / {draft.max}
      </span>
    </div>
  );
}
