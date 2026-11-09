import { describe, type NoteDraft } from "./lib/draft";

export type { NoteDraft, NoteDraftStatus } from "./lib/draft";

/**
 * What the Lesson Note editor should show for the text in the box, given the
 * body last saved (`null` when the Student has never saved a Note here).
 */
export function describeNoteDraft(
  draft: string,
  savedBody: string | null
): NoteDraft {
  return describe(draft, savedBody);
}
