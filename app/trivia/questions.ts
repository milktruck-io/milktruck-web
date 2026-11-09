/* ============================================================================
 * THE QUESTION DECK — this is the only file you need to edit.
 * ============================================================================
 *
 * How to edit:
 *   1. Find the category below.
 *   2. Type the question into `prompt` (this is what players read on their phone).
 *   3. Fill in `choices` in A, B, C, D order — 4 strings, or 2 for a
 *      two-choice category.
 *   4. Set `answer` to the LETTER of the correct choice: "A", "B", "C" or "D".
 *   5. `note` is optional and only ever shown to you on the admin screen.
 *   6. Delete the `placeholder: true` line once a question is really yours.
 *      Anything still carrying it is listed as unwritten on the admin screen,
 *      so seed content can't reach the show by accident.
 *
 * You can add or remove questions freely — the game counts them automatically,
 * and the categories do not all have to be the same length.
 * Keep the categories in the order you want them played.
 *
 * Nothing here is sent to the server: the backend only remembers which letter
 * each player tapped, so changing a question before the show is safe.
 * ========================================================================= */

export type AnswerLetter = "A" | "B" | "C" | "D";

export type Question = {
  prompt: string;
  choices: string[];
  answer: AnswerLetter;
  note?: string;
  /* Seed content, not yours yet. Delete this line when you write the real
   * question — the admin screen lists everything that still has it. */
  placeholder?: boolean;
};

export type Category = {
  /* Used to wire this category to its superlative award in scoring.ts
   * (CATEGORY_AWARDS). Change one, change the other. */
  id: string;
  title: string;
  /* One line shown under the category name when the question comes up. */
  tagline: string;
  questions: Question[];
  /* Set this on a category you have added but not yet named, and the admin
   * screen lists it as unfinished alongside any unwritten questions. */
  placeholder?: boolean;
};

export const CATEGORIES: Category[] = [
  {
    id: "sam",
    title: "Sam Said What?",
    tagline: "Finish the quote. Sam actually said this.",
    questions: [
      {
        prompt: "“I am not jit. I am ______.”",
        choices: ["The Moment", "CEO", "What I want to be", "Sam"],
        answer: "B",
        note: "Swap in the real quote.",
      },
      {
        prompt: "“Ok. I'm gonna go ______.”",
        choices: ["shave my bush and my balls", "buy a new yummy", "to my jazz dance class", "masturbate"],
        answer: "A",
      },
      {
        prompt: "“Sog, to think you would have been ______.”",
        choices: ["an AET major", "poor", "Joey's friend", "a Confederate"],
        answer: "D",
      },
      {
        prompt: "“I'm trying to figure out a way to ______ without showing you my penis.”",
        choices: ["Moon you", "Put on my toe separators", "Dance", "Get out of bed"],
        answer: "A",
        placeholder: true,
      },
    ],
  },
  {
    id: "pete",
    title: "Pete's Eats",
    tagline: "Peter is eating something on the big screen. What is it?",
    questions: [
      {
        prompt: "Eat #1 — what would Pete eat in the back seat?",
        choices: ["Taco Bell", "Chicken Tender", "Corn on the Cob", "Wings"],
        answer: "D",
        note: "Photo of Peter mid-bite, the food covered up.",
        placeholder: true,
      },
      {
        prompt: "Eat #2 — Big smiles for Peter!",
        choices: ["Lava Cake", "Brownie", "Slop Bowl", "Pasta"],
        answer: "A",
        placeholder: true,
      },
      {
        prompt: "Eat #3 — pour up that Siracha Pete!",
        choices: ["Chicken & Rice", "Pizza", "Caf Breakfast", "Fries"],
        answer: "B",
        placeholder: true,
      },
      {
        prompt: "Eat #4 — big bite for Big Pete!",
        choices: ["Club Sandwich", "Breakfast Sandwich", "Chicken Sandwich", "Burger"],
        answer: "D",
        placeholder: true,
      },
    ],
  },
  {
    id: "texter",
    title: "Name That Texter!",
    tagline: "The text is on the big screen. Who sent it?",
    questions: [
      {
        prompt: "Text #1 — look at the screen.",
        choices: ["Jo", "Anneke", "Nate", "Sam"],
        answer: "C",
        note: "Slide 14 on the deck.",
      },
      {
        prompt: "Text #2 — look at the screen.",
        choices: ["Macie", "Maren", "Addie", "Peter"],
        answer: "B",
      },
      {
        prompt: "Text #3 — look at the screen.",
        choices: ["Brennan", "Jo", "Becket", "David"],
        answer: "B",
      },
      {
        prompt: "Text #4 — look at the screen.",
        choices: ["David", "Brennan", "Adam", "Anneke"],
        answer: "A",
        placeholder: true,
      },
    ],
  },
];

/* --- derived: everything below is machinery, no need to edit -------------- */

export const LETTERS: AnswerLetter[] = ["A", "B", "C", "D"];

export type DeckQuestion = Question & {
  /* Position in the running order — this is what the server tracks. */
  index: number;
  categoryId: string;
  categoryTitle: string;
  categoryTagline: string;
  /* Position of the correct choice in `choices`. */
  answerIndex: number;
};

export const QUESTIONS: DeckQuestion[] = CATEGORIES.flatMap((category) =>
  category.questions.map((question) => ({
    ...question,
    index: 0, // replaced below
    categoryId: category.id,
    categoryTitle: category.title,
    categoryTagline: category.tagline,
    answerIndex: LETTERS.indexOf(question.answer),
  })),
).map((question, index) => ({ ...question, index }));

export const QUESTION_COUNT = QUESTIONS.length;

export const POINTS_PER_CORRECT = 1000;

export type DeckTodo = { label: string; detail: string };

/* Anything still carrying `placeholder: true` — a category nobody has named or
 * a question nobody has written. Surfaced on the admin screen so seed content
 * cannot quietly go on stage. */
export function deckTodos(): DeckTodo[] {
  const todos: DeckTodo[] = [];

  CATEGORIES.forEach((category, i) => {
    if (!category.placeholder) return;
    todos.push({
      label: `Category ${i + 1}`,
      detail: `"${category.title}" still needs a name, a tagline, an id, and its award in scoring.ts.`,
    });
  });

  QUESTIONS.forEach((question) => {
    if (!question.placeholder) return;
    const prompt = question.prompt.length > 52 ? `${question.prompt.slice(0, 51)}…` : question.prompt;
    todos.push({ label: `Q${question.index + 1}`, detail: `${question.categoryTitle} — ${prompt}` });
  });

  return todos;
}

/* Sanity check surfaced on the admin screen, so a typo in this file is caught
 * before the show rather than during it. */
export function deckProblems(): string[] {
  const problems: string[] = [];
  QUESTIONS.forEach((q) => {
    const where = `${q.categoryTitle} — question ${q.index + 1}`;
    if (!q.prompt.trim()) problems.push(`${where}: the prompt is empty.`);
    if (q.choices.length < 2) problems.push(`${where}: needs at least 2 choices.`);
    if (q.choices.length > 4) problems.push(`${where}: has more than 4 choices.`);
    if (q.answerIndex < 0 || q.answerIndex >= q.choices.length) {
      problems.push(`${where}: answer "${q.answer}" is not one of the ${q.choices.length} choices.`);
    }
  });
  return problems;
}
