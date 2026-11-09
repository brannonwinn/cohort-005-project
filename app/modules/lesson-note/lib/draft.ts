import { MAX_NOTE_LENGTH } from "~/lib/notes";

export type NoteDraftStatus = "unsaved" | "saved" | "blank";

export type NoteDraft = {
  /** Characters that will be saved: the server trims before it stores. */
  length: number;
  max: number;
  tooLong: boolean;
  status: NoteDraftStatus;
  canSave: boolean;
};

export function describeDraft(
  draft: string,
  savedBody: string | null
): NoteDraft {
  const length = draft.trim().length;
  const tooLong = length > MAX_NOTE_LENGTH;
  // The server trims before it stores, so the saved body needs no trim.
  const unchanged = draft.trim() === (savedBody ?? "");

  let status: NoteDraftStatus = "unsaved";
  if (unchanged) status = savedBody === null ? "blank" : "saved";

  return {
    length,
    max: MAX_NOTE_LENGTH,
    tooLong,
    status,
    canSave: length > 0 && !tooLong && !unchanged,
  };
}
