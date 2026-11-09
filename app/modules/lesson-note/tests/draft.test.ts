import { describe, expect, it } from "vitest";
import { MAX_NOTE_LENGTH } from "~/lib/notes";
import { describeNoteDraft } from "../index";

describe("describeNoteDraft", () => {
  it("cannot save an empty box when nothing was ever saved", () => {
    expect(describeNoteDraft("", null)).toEqual({
      length: 0,
      max: MAX_NOTE_LENGTH,
      tooLong: false,
      status: "blank",
      canSave: false,
    });
  });

  it("can save new text", () => {
    const draft = describeNoteDraft("Generics are like parameters", null);
    expect(draft.status).toBe("unsaved");
    expect(draft.canSave).toBe(true);
    expect(draft.length).toBe(28);
  });

  it("cannot save whitespace", () => {
    const draft = describeNoteDraft("   \n ", null);
    expect(draft.length).toBe(0);
    expect(draft.canSave).toBe(false);
  });

  it("is saved, and needs no save, when the box matches the stored body", () => {
    const draft = describeNoteDraft("Same text", "Same text");
    expect(draft.status).toBe("saved");
    expect(draft.canSave).toBe(false);
  });

  it("ignores surrounding whitespace, as the server trims on save", () => {
    const draft = describeNoteDraft("  Same text\n", "Same text");
    expect(draft.status).toBe("saved");
    expect(draft.length).toBe(9);
  });

  it("is unsaved when the text differs from the stored body", () => {
    const draft = describeNoteDraft("Edited text", "Same text");
    expect(draft.status).toBe("unsaved");
    expect(draft.canSave).toBe(true);
  });

  it("is cleared, and cannot save, when a saved note is emptied", () => {
    const draft = describeNoteDraft(" ", "Same text");
    expect(draft.status).toBe("cleared");
    expect(draft.canSave).toBe(false);
  });

  it("accepts a note of exactly the limit", () => {
    const draft = describeNoteDraft("a".repeat(MAX_NOTE_LENGTH), null);
    expect(draft.tooLong).toBe(false);
    expect(draft.canSave).toBe(true);
  });

  it("refuses a note over the limit", () => {
    const draft = describeNoteDraft("a".repeat(MAX_NOTE_LENGTH + 1), null);
    expect(draft.tooLong).toBe(true);
    expect(draft.canSave).toBe(false);
  });
});
