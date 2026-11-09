import { MAX_NOTE_LENGTH } from "~/lib/notes";

/** `cleared`: a saved Note emptied in the box, which the server will not store. */
export type NoteDraftStatus = "unsaved" | "saved" | "blank" | "cleared";

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
  else if (length === 0) status = "cleared";

  return {
    length,
    max: MAX_NOTE_LENGTH,
    tooLong,
    status,
    canSave: length > 0 && !tooLong && !unchanged,
  };
}
