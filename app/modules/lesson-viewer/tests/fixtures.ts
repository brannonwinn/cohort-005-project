import * as schema from "~/db/schema";
import { markdown } from "~/lib/text";
import { createTestDb, seedBaseData, type TestDb } from "~/test/setup";

export type Fixture = ReturnType<typeof seedLessons>;

/** A course with one module of two lessons; the second has a quiz. */
export function seedLessons() {
  const db: TestDb = createTestDb();
  const base = seedBaseData(db);
  const mod = db
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Basics", position: 1 })
    .returning()
    .get();
  const [first, second] = [1, 2].map((position) =>
    db
      .insert(schema.lessons)
      .values({
        moduleId: mod.id,
        title: `Lesson ${position}`,
        position,
        content: markdown(`# Lesson ${position}`),
      })
      .returning()
      .get()
  );
  const quiz = db
    .insert(schema.quizzes)
    .values({ lessonId: second.id, title: "Check", passingScore: 0.7 })
    .returning()
    .get();
  const question = db
    .insert(schema.quizQuestions)
    .values({
      quizId: quiz.id,
      questionText: "Is TypeScript typed?",
      questionType: schema.QuestionType.TrueFalse,
      position: 1,
    })
    .returning()
    .get();
  const [right, wrong] = [true, false].map((isCorrect) =>
    db
      .insert(schema.quizOptions)
      .values({
        questionId: question.id,
        optionText: String(isCorrect),
        isCorrect,
      })
      .returning()
      .get()
  );

  return { db, base, mod, first, second, quiz, question, right, wrong };
}

const ALLOWED = { allowed: true } as const;

export function decisionsFor(
  fixture: Fixture,
  { signedIn, canView }: { signedIn: boolean; canView: boolean }
) {
  const view = canView
    ? ALLOWED
    : { allowed: false as const, reason: { kind: "not-enrolled" as const } };
  return {
    found: true as const,
    course: fixture.base.course,
    person: signedIn
      ? { id: fixture.base.user.id, role: "student" as const, country: null }
      : null,
    enrolled: canView,
    view,
    take: view,
    manage: {
      allowed: false as const,
      reason: { kind: "signed-out" as const },
    },
  };
}
