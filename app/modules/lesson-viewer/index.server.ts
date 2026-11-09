import { db } from "~/db";
import type { Db } from "./lib/db";
import { buildLessonPage, type FoundCourseDecisions } from "./lib/page.server";
import { markLessonComplete } from "./lib/progress.server";
import { computeResult, getQuizById } from "./lib/quiz.server";
import { getCommentById } from "./lib/thread.server";

export type LessonPage = NonNullable<
  Awaited<ReturnType<typeof buildLessonPage>>
>;
export type FullLessonPage = Extract<LessonPage, { view: "full" }>;
export type LockedLessonPage = Extract<LessonPage, { view: "locked" }>;
export type QuizResult = NonNullable<ReturnType<typeof computeResult>>;

/**
 * The Lesson page bound to a database. The app uses `lessonViewer`, which
 * reads the app database; tests build their own against a test database.
 */
export function createLessonViewer(database: Db) {
  return {
    /**
     * What the Lesson page shows, given the permission decisions for its
     * course: the locked view without view access, the full view otherwise.
     * Null when the Lesson or its Module does not exist.
     */
    getLessonPage(decisions: FoundCourseDecisions, lessonId: number) {
      return buildLessonPage(database, decisions, lessonId);
    },

    /** Whether the comment exists and belongs to this Lesson. */
    isCommentOnLesson(commentId: number, lessonId: number): boolean {
      return getCommentById(database, commentId)?.lessonId === lessonId;
    },

    markLessonComplete(userId: number, lessonId: number) {
      markLessonComplete(database, userId, lessonId);
    },

    /**
     * Grades and records an attempt. `found: false` when the quiz does not
     * belong to this Lesson; `result: null` when scoring failed.
     */
    submitQuiz({
      userId,
      lessonId,
      quizId,
      selectedAnswers,
    }: {
      userId: number;
      lessonId: number;
      quizId: number;
      selectedAnswers: Record<number, number>;
    }): { found: false } | { found: true; result: QuizResult | null } {
      const quiz = getQuizById(database, quizId);
      if (!quiz || quiz.lessonId !== lessonId) return { found: false };
      return {
        found: true,
        result: computeResult(database, userId, quizId, selectedAnswers),
      };
    },
  };
}

export const lessonViewer = createLessonViewer(db);
