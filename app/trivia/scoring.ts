/* Scoring, standings and superlatives.
 *
 * All of it is computed here from the deck in questions.ts plus the raw
 * answers the server hands back, so the correct answers never have to be
 * duplicated into the backend.
 *
 * Category subjects
 * -----------------
 * The host can flag a player as the subject of a category — Sam for the Sam
 * questions, Peter for his. They still answer, and the host still sees their
 * taps, but those taps don't score. Instead they are credited the room's
 * average on that category, so being the subject neither hands them four free
 * points nor parks them at zero while everyone else banks four. They stay in
 * the race on the strength of how hard their own round turned out to be.
 */
import { CATEGORIES, POINTS_PER_CORRECT, QUESTIONS, QUESTION_COUNT } from "./questions";
import type { StatePlayer, StoredAnswer } from "./api";

export function isCorrect(questionIndex: number, choice: number | undefined | null): boolean {
  if (choice == null) return false;
  const question = QUESTIONS[questionIndex];
  return !!question && question.answerIndex === choice;
}

/* A player's own running score, from the `me.choices` map the server sends.
 * Their own round is left out here too, so the badge on their phone agrees
 * with the final standings. */
export function scoreFromChoices(choices: Record<string, number>, subjectCategory?: string | null): number {
  return Object.entries(choices).reduce((total, [index, choice]) => {
    const question = QUESTIONS[Number(index)];
    if (!question || question.categoryId === subjectCategory) return total;
    return isCorrect(Number(index), choice) ? total + POINTS_PER_CORRECT : total;
  }, 0);
}

const questionIndicesFor = (categoryId: string) =>
  QUESTIONS.filter((q) => q.categoryId === categoryId).map((q) => q.index);

type ChoiceLookup = (playerId: number, questionIndex: number) => number | undefined;

/* What the room managed on one category, ignoring its subject and anyone who
 * never saw it. This is the number the subject inherits. */
function roomAverage(categoryId: string, players: StatePlayer[], choiceFor: ChoiceLookup) {
  const indices = questionIndicesFor(categoryId);
  const scored = players.filter(
    (p) => p.subject_category !== categoryId && indices.some((i) => choiceFor(p.id, i) != null),
  );

  if (indices.length === 0 || scored.length === 0) return { points: 0, from: 0 };

  const totalCorrect = scored.reduce(
    (sum, p) => sum + indices.filter((i) => isCorrect(i, choiceFor(p.id, i))).length,
    0,
  );
  return { points: Math.round((totalCorrect / scored.length) * POINTS_PER_CORRECT), from: scored.length };
}

export type Standing = {
  player: StatePlayer;
  score: number;
  /* Right answers among the questions that actually counted for them. */
  correct: number;
  /* How many questions counted — fewer than the deck, for a subject. */
  counted: number;
  answered: number;
  /* Shared for ties: 1, 2, 2, 4. */
  rank: number;
  /* Only for a subject: the category they sat out, and what the room average
   * handed them for it. */
  substituted?: { categoryId: string; categoryTitle: string; points: number; from: number };
};

export function standings(players: StatePlayer[], answers: StoredAnswer[]): Standing[] {
  const byPlayerQuestion = new Map<string, number>();
  answers.forEach((a) => byPlayerQuestion.set(`${a.player_id}:${a.question_index}`, a.choice));
  const choiceFor: ChoiceLookup = (playerId, questionIndex) =>
    byPlayerQuestion.get(`${playerId}:${questionIndex}`);

  /* One average per category, computed once rather than once per player. */
  const averages = new Map(CATEGORIES.map((c) => [c.id, roomAverage(c.id, players, choiceFor)] as const));

  const rows: Standing[] = players
    .map((player) => {
      const subjectOf = player.subject_category
        ? CATEGORIES.find((c) => c.id === player.subject_category)
        : undefined;

      const counted = QUESTIONS.filter((q) => q.categoryId !== subjectOf?.id);
      const correct = counted.filter((q) => isCorrect(q.index, choiceFor(player.id, q.index))).length;
      const answered = QUESTIONS.filter((q) => choiceFor(player.id, q.index) != null).length;

      let score = correct * POINTS_PER_CORRECT;
      let substituted: Standing["substituted"];

      if (subjectOf) {
        const average = averages.get(subjectOf.id) ?? { points: 0, from: 0 };
        score += average.points;
        substituted = {
          categoryId: subjectOf.id,
          categoryTitle: subjectOf.title,
          points: average.points,
          from: average.from,
        };
      }

      return { player, score, correct, counted: counted.length, answered, rank: 0, substituted };
    })
    /* Ties break on name so the order is stable between polls. */
    .sort((a, b) => b.score - a.score || a.player.name.localeCompare(b.player.name));

  let rank = 0;
  let previousScore: number | null = null;
  rows.forEach((row, i) => {
    if (previousScore === null || row.score !== previousScore) rank = i + 1;
    row.rank = rank;
    previousScore = row.score;
  });

  return rows;
}

/* The line under a name on the results screen. */
export function standingDetail(row: Standing): string {
  const base = `${row.correct} of ${row.counted} right`;
  if (!row.substituted) return base;
  /* Nobody has played their round yet, so there is no average to inherit. */
  if (row.substituted.from === 0) return `${base} · ${row.substituted.categoryTitle} not played yet`;
  return `${base} · ${row.substituted.points.toLocaleString()} from the room on ${row.substituted.categoryTitle}`;
}

export type Superlative = {
  title: string;
  blurb: string;
  winners: string[];
  /* e.g. "4 of 4 right" — the reason they won. */
  detail: string;
};

/* Keyed by the category ids in questions.ts. Rename a category's id and you
 * must rename its key here, or the award falls back to a generic one. */
const CATEGORY_AWARDS: Record<string, { title: string; blurb: string }> = {
  sam: { title: "Sam's Biographer", blurb: "Has heard every story twice." },
  pete: { title: "Pete's Nutritionist", blurb: "Knows what Peter is eating better than Peter does." },
  texter: { title: "The Group Chat Historian", blurb: "Recognizes a text from across the room." },
};

export function superlatives(players: StatePlayer[], answers: StoredAnswer[]): Superlative[] {
  if (players.length === 0) return [];

  const choiceFor: ChoiceLookup = (playerId, questionIndex) =>
    answers.find((a) => a.player_id === playerId && a.question_index === questionIndex)?.choice;

  const awards: Superlative[] = [];

  /* One award per category: whoever got the most of it right. Its subject is
   * not eligible — winning a round about yourself is no achievement. */
  CATEGORIES.forEach((category) => {
    const indices = questionIndicesFor(category.id);
    if (indices.length === 0) return;

    const eligible = players.filter((p) => p.subject_category !== category.id);
    if (eligible.length === 0) return;

    const scores = eligible.map((player) => ({
      name: player.name,
      correct: indices.filter((index) => isCorrect(index, choiceFor(player.id, index))).length,
    }));
    const best = Math.max(...scores.map((s) => s.correct));
    const meta = CATEGORY_AWARDS[category.id] ?? { title: category.title, blurb: "Best in category." };

    awards.push({
      title: meta.title,
      blurb: `${category.title} — ${meta.blurb}`,
      winners: best === 0 ? [] : scores.filter((s) => s.correct === best).map((s) => s.name),
      detail: best === 0 ? "Nobody got a single one." : `${best} of ${indices.length} right`,
    });
  });

  /* Clean Sweep — everything that counted for you, so a subject can win it on
   * the rounds they were actually scored on. */
  const perfect = standings(players, answers).filter((row) => row.counted > 0 && row.correct === row.counted);
  if (perfect.length > 0) {
    awards.push({
      title: "Clean Sweep",
      blurb: "Every question that counted. Suspicious.",
      winners: perfect.map((row) => row.player.name),
      detail: perfect.every((row) => row.counted === QUESTION_COUNT)
        ? `${QUESTION_COUNT} of ${QUESTION_COUNT} right`
        : "Everything that counted",
    });
  }

  /* Lone Wolf — most answers nobody else in the room picked. A subject's own
   * category is left out: being alone on a question you know proves nothing. */
  const loners = players.map((player) => ({
    name: player.name,
    count: QUESTIONS.filter((q) => {
      if (q.categoryId === player.subject_category) return false;
      const mine = choiceFor(player.id, q.index);
      if (mine == null) return false;
      return players.every((other) => other.id === player.id || choiceFor(other.id, q.index) !== mine);
    }).length,
  }));
  const mostAlone = Math.max(...loners.map((l) => l.count));
  if (mostAlone > 0 && players.length > 1) {
    awards.push({
      title: "Lone Wolf",
      blurb: "Went their own way more than anyone.",
      winners: loners.filter((l) => l.count === mostAlone).map((l) => l.name),
      detail: `${mostAlone} answer${mostAlone === 1 ? "" : "s"} nobody else picked`,
    });
  }

  return awards;
}
