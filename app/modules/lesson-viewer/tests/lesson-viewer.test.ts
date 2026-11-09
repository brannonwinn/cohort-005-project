import { describe, expect, it } from "vitest";
import { createComment } from "~/lib/comments.server";
import { fakeNotifications } from "~/lib/notifications.fake.server";
import { createLessonViewer } from "../index.server";
import { lessonRef, quizAnswersFrom } from "../intents";
import { decisionsFor, seedLessons } from "./fixtures";

const noNotifications = fakeNotifications();

describe("getLessonPage", () => {
  it("shows the locked view, without content, to someone who cannot view", async () => {
    const fixture = seedLessons();
    const viewer = createLessonViewer(fixture.db);
    const page = await viewer.getLessonPage(
      decisionsFor(fixture, { signedIn: false, canView: false }),
      fixture.first.id
    );
    expect(page).toMatchObject({
      view: "locked",
      lesson: { id: fixture.first.id, title: "Lesson 1" },
      lockedReason: { kind: "not-enrolled" },
    });
    expect(page).not.toHaveProperty("contentHtml");
  });

  it("shows the full view with neighbours, rendered content and the quiz", async () => {
    const fixture = seedLessons();
    const viewer = createLessonViewer(fixture.db);
    const page = await viewer.getLessonPage(
      decisionsFor(fixture, { signedIn: true, canView: true }),
      fixture.second.id
    );
    if (page?.view !== "full") throw new Error("expected the full view");
    expect(page.prevLesson?.id).toBe(fixture.first.id);
    expect(page.nextLesson).toBeNull();
    expect(page.contentHtml).toContain("Lesson 2");
    expect(page.lessonStatus).toBe("in_progress");
    expect(page.note).toBeNull();
    expect(page.quiz?.questions[0].options).toEqual([
      { id: fixture.right.id, optionText: "true" },
      { id: fixture.wrong.id, optionText: "false" },
    ]);
  });

  it("is null for a lesson that does not exist", async () => {
    const fixture = seedLessons();
    const viewer = createLessonViewer(fixture.db);
    const page = await viewer.getLessonPage(
      decisionsFor(fixture, { signedIn: true, canView: true }),
      9999
    );
    expect(page).toBeNull();
  });
});

describe("markLessonComplete", () => {
  it("records the lesson as completed", async () => {
    const fixture = seedLessons();
    const viewer = createLessonViewer(fixture.db);
    viewer.markLessonComplete(fixture.base.user.id, fixture.first.id);
    const page = await viewer.getLessonPage(
      decisionsFor(fixture, { signedIn: true, canView: true }),
      fixture.first.id
    );
    if (page?.view !== "full") throw new Error("expected the full view");
    expect(page.lessonStatus).toBe("completed");
  });
});

describe("isCommentOnLesson", () => {
  it("is true only for the lesson the comment was posted on", async () => {
    const fixture = seedLessons();
    const viewer = createLessonViewer(fixture.db);
    const created = await createComment(
      fixture.db,
      fixture.base.user.id,
      fixture.first.id,
      null,
      "How do generics work?",
      new Date(2026, 10, 9),
      noNotifications
    );
    if (!created.ok) throw new Error("expected the comment to post");
    expect(viewer.isCommentOnLesson(created.comment.id, fixture.first.id)).toBe(
      true
    );
    expect(
      viewer.isCommentOnLesson(created.comment.id, fixture.second.id)
    ).toBe(false);
    expect(viewer.isCommentOnLesson(9999, fixture.first.id)).toBe(false);
  });
});

describe("submitQuiz", () => {
  it("grades a right answer as passed", () => {
    const fixture = seedLessons();
    const submitted = createLessonViewer(fixture.db).submitQuiz({
      userId: fixture.base.user.id,
      lessonId: fixture.second.id,
      quizId: fixture.quiz.id,
      selectedAnswers: { [fixture.question.id]: fixture.right.id },
    });
    expect(submitted).toMatchObject({
      found: true,
      result: { passed: true, grade: "A", totalCorrect: 1, totalQuestions: 1 },
    });
  });

  it("grades a wrong answer as failed", () => {
    const fixture = seedLessons();
    const submitted = createLessonViewer(fixture.db).submitQuiz({
      userId: fixture.base.user.id,
      lessonId: fixture.second.id,
      quizId: fixture.quiz.id,
      selectedAnswers: { [fixture.question.id]: fixture.wrong.id },
    });
    expect(submitted).toMatchObject({
      found: true,
      result: { passed: false, grade: "F", totalCorrect: 0 },
    });
  });

  it("does not find a quiz from another lesson", () => {
    const fixture = seedLessons();
    const submitted = createLessonViewer(fixture.db).submitQuiz({
      userId: fixture.base.user.id,
      lessonId: fixture.first.id,
      quizId: fixture.quiz.id,
      selectedAnswers: {},
    });
    expect(submitted).toEqual({ found: false });
  });
});

describe("quizAnswersFrom", () => {
  it("reads question fields and ignores everything else", () => {
    const form = new FormData();
    form.set("intent", "submit-quiz");
    form.set("quizId", "3");
    form.set("question-7", "21");
    form.set("question-8", "not-a-number");
    expect(quizAnswersFrom(form)).toEqual({ 7: 21 });
  });
});

describe("lessonRef", () => {
  it("names the course by slug through the lesson", () => {
    expect(lessonRef({ slug: "ts", lessonId: "4" })).toEqual({
      slug: "ts",
      lessonId: "4",
    });
  });
});

describe("the discussion on the Lesson page", () => {
  it("nests replies under their question, with sanitised bodies", async () => {
    const fixture = seedLessons();
    const viewer = createLessonViewer(fixture.db);
    const at = new Date(2026, 10, 9);
    const question = await createComment(
      fixture.db,
      fixture.base.user.id,
      fixture.first.id,
      null,
      "Why <script>x</script> **types**?",
      at,
      noNotifications
    );
    if (!question.ok) throw new Error("expected the question to post");
    await createComment(
      fixture.db,
      fixture.base.instructor.id,
      fixture.first.id,
      question.comment.id,
      "Safety at compile time.",
      at,
      noNotifications
    );

    const page = await viewer.getLessonPage(
      decisionsFor(fixture, { signedIn: true, canView: true }),
      fixture.first.id
    );
    if (page?.view !== "full") throw new Error("expected the full view");
    const [thread] = page.comments;
    expect(page.comments).toHaveLength(1);
    expect(thread.bodyHtml).toContain("<strong>types</strong>");
    expect(thread.bodyHtml).not.toContain("<script>");
    expect(thread.author).toMatchObject({
      name: "Test User",
      isInstructor: false,
    });
    expect(thread.replies).toHaveLength(1);
    expect(thread.replies[0].author).toMatchObject({
      name: "Test Instructor",
      isInstructor: true,
    });
    expect(page.instructorName).toBe("Test Instructor");
  });
});
