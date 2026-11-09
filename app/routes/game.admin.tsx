/* The host console. Everything you need on the night from one screen:
 * who has answered and what they guessed, one button to reveal, one to move
 * on, and a way to kick anyone who gets stuck.
 *
 * Getting in is the one piece of auth in the game: type the host name from
 * TriviaGame::ADMIN_NAME (milktruck-api) and nothing else works. */
import { useCallback, useState } from "react";

import {
  Badge,
  Button,
  Card,
  Dialog,
  Icon,
  IconButton,
  Input,
  LeaderboardRow,
  PlayerChip,
  ProgressBar,
  StageShell,
} from "~/trivia/ui";
import { advance, join, kickPlayer, saveAdminToken, setSubjectCategory, useAdminToken, useGameState } from "~/trivia/api";
import type { AdvanceStep, GameState, StatePlayer } from "~/trivia/api";
import { CATEGORIES, LETTERS, QUESTIONS, QUESTION_COUNT, deckProblems, deckTodos } from "~/trivia/questions";
import { standingDetail, standings, superlatives } from "~/trivia/scoring";
import "~/trivia/trivia.css";

export function meta() {
  return [{ title: "PPL Trivia — Host" }, { name: "robots", content: "noindex" }];
}

export default function GameAdmin() {
  /* The host token is kept in localStorage, so the console survives a refresh
   * mid-show. */
  const token = useAdminToken();
  const { state, setState, error } = useGameState({ adminToken: token, enabled: !!token });

  const signIn = useCallback(
    async (name: string) => {
      const result = await join(name, { host: true });
      if (!result.admin) throw new Error("That's not the host");
      saveAdminToken(result.admin_token);
      setState(result.state);
    },
    [setState],
  );

  if (!token) return <HostSignIn onSignIn={signIn} />;

  if (!state) {
    return (
      <StageShell top={<Badge icon="presentation">Host</Badge>}>
        <div className="ppl-centered">
          <p className="ppl-muted">{error ?? "Connecting to the stage…"}</p>
        </div>
      </StageShell>
    );
  }

  return <HostConsole state={state} token={token} onState={setState} error={error} />;
}

/* --- sign in ------------------------------------------------------------- */

function HostSignIn({ onSignIn }: { onSignIn: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    try {
      await onSignIn(name.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in");
    }
  };

  return (
    <StageShell>
      <div className="ppl-centered">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          style={{ width: "100%", maxWidth: 420 }}
        >
          <Card padding={24}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <h1 className="ppl-display" style={{ fontSize: 36 }}>
                Host only
              </h1>
              <Input
                label="Host name"
                icon="lock"
                placeholder="Host name"
                value={name}
                onChange={(v) => {
                  setName(v);
                  setError("");
                }}
                error={error}
                autoFocus
              />
              <Button type="submit" size="lg" fullWidth iconRight="arrow-right">
                Take the stage
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </StageShell>
  );
}

/* --- console ------------------------------------------------------------- */

function HostConsole({
  state,
  token,
  onState,
  error,
}: {
  state: GameState;
  token: string;
  onState: (state: GameState) => void;
  error: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const problems = deckProblems();
  const todos = deckTodos();

  /* Anything that destroys scores or players asks first — these buttons sit
   * next to the ones you tap all night. */
  const [confirming, setConfirming] = useState<Confirmation | null>(null);
  /* The player whose subject-category picker is open. */
  const [subjectOf, setSubjectOf] = useState<StatePlayer | null>(null);

  const run = async (step: AdvanceStep) => {
    setBusy(true);
    try {
      onState(await advance(step, token, QUESTION_COUNT));
    } finally {
      setBusy(false);
    }
  };

  const kick = async (player: StatePlayer) => {
    setBusy(true);
    try {
      onState(await kickPlayer(player.id, token));
    } finally {
      setBusy(false);
    }
  };

  /* Flagging someone as a category's subject: their taps in it stop scoring
   * and the room average takes over. */
  const setSubject = async (player: StatePlayer, category: string | null) => {
    setSubjectOf(null);
    setBusy(true);
    try {
      onState(await setSubjectCategory(player.id, category, token));
    } finally {
      setBusy(false);
    }
  };

  const confirmRestart = () =>
    setConfirming({
      title: "Restart the show?",
      body: "Every score goes back to zero and we return to the lobby. Players stay joined — nobody has to re-enter their name.",
      label: "Restart",
      run: () => run("restart"),
    });

  const confirmClear = () =>
    setConfirming({
      title: "Clear the room?",
      body: "Players and scores are both wiped and every phone goes back to the join screen. This is the one to use after a test run.",
      label: "Clear everything",
      run: () => run("clear"),
    });

  const confirmKick = (player: StatePlayer) =>
    setConfirming({
      title: "Kick player?",
      body: `${player.name} comes off the board and loses their answers. They can rejoin by entering the same name.`,
      label: "Kick",
      run: () => kick(player),
    });

  const question = QUESTIONS[state.question_index];
  const answered = new Set(state.answered_player_ids);
  const everyoneIn = state.players.length > 0 && answered.size === state.players.length;

  return (
    <StageShell
      top={
        <>
          <Badge icon="presentation">Host</Badge>
          <Badge tone={state.phase === "question" ? "live" : "ghost"}>{PHASE_LABELS[state.phase]}</Badge>
          <Badge icon="users">{state.players.length}</Badge>
        </>
      }
    >
      {problems.length > 0 && (
        <Card padding={16} style={{ borderColor: "var(--onair-500)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--onair-400)" }}>
              <Icon name="circle-alert" size={18} />
              <strong style={{ font: "800 15px/1 var(--font-body)" }}>Check questions.ts</strong>
            </span>
            {problems.map((problem) => (
              <span key={problem} style={{ font: "600 14px/1.4 var(--font-body)", color: "var(--text-body)" }}>
                {problem}
              </span>
            ))}
          </div>
        </Card>
      )}

      {todos.length > 0 && (
        <Card padding={16} style={{ borderColor: "var(--gold-500)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--gold-400)" }}>
              <Icon name="circle-alert" size={18} />
              <strong style={{ font: "800 15px/1 var(--font-body)" }}>
                {todos.length} thing{todos.length === 1 ? "" : "s"} still seed content
              </strong>
            </span>
            {todos.map((todo) => (
              <span key={todo.label} style={{ font: "600 14px/1.4 var(--font-body)", color: "var(--text-body)" }}>
                <strong style={{ color: "var(--cream-50)" }}>{todo.label}</strong> · {todo.detail}
              </span>
            ))}
            <span style={{ font: "600 13px/1.4 var(--font-body)", color: "var(--text-muted)" }}>
              Write them in app/trivia/questions.ts, then delete their `placeholder: true` line.
            </span>
          </div>
        </Card>
      )}

      {error && <p className="ppl-muted">Connection hiccup: {error}. Still polling.</p>}

      {/* Controls — one row, in the order you press them. */}
      <Card padding={16}>
        <div className="ppl-row" style={{ gap: 10 }}>
          {state.phase === "lobby" && (
            <Button size="lg" iconRight="play" disabled={busy || state.players.length === 0} onClick={() => run("start")}>
              Start the show
            </Button>
          )}
          {state.phase === "question" && (
            <Button size="lg" icon="eye" disabled={busy} onClick={() => run("reveal")}>
              Reveal answer
            </Button>
          )}
          {state.phase === "reveal" && (
            <>
              <IconButton
                icon="arrow-right"
                label={state.question_index + 1 >= QUESTION_COUNT ? "Go to results" : "Next question"}
                variant="primary"
                size="lg"
                disabled={busy}
                onClick={() => run("next")}
              />
              <span className="ppl-label">
                {state.question_index + 1 >= QUESTION_COUNT ? "Next: the results" : `Next: question ${state.question_index + 2}`}
              </span>
            </>
          )}
          {state.phase === "results" && (
            <Button size="lg" icon="award" disabled={busy} onClick={() => run("superlatives")}>
              Show superlatives
            </Button>
          )}
          <div style={{ flex: 1 }} />
          {state.phase === "superlatives" && (
            <Button variant="ghost" icon="list-ordered" disabled={busy} onClick={() => run("results")}>
              Back to results
            </Button>
          )}
          {(state.phase === "question" || state.phase === "reveal") && (
            <Button variant="ghost" icon="trophy" disabled={busy} onClick={() => run("results")}>
              End + show results
            </Button>
          )}
          <Button variant="ghost" icon="rotate-ccw" disabled={busy} onClick={confirmRestart}>
            Restart
          </Button>
          <Button variant="ghost" icon="user-x" disabled={busy} onClick={confirmClear}>
            Clear the room
          </Button>
        </div>
      </Card>

      {state.phase !== "lobby" && state.phase !== "results" && state.phase !== "superlatives" && question && (
        <>
          <ProgressBar
            value={answered.size}
            max={Math.max(1, state.players.length)}
            tone={everyoneIn ? "correct" : "gold"}
            label={`${answered.size} of ${state.players.length} answered${everyoneIn ? " — all in" : ""}`}
          />
          <Card padding={20}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="ppl-row">
                <Badge tone="gold">{question.categoryTitle}</Badge>
                <Badge>{`Q ${state.question_index + 1} / ${QUESTION_COUNT}`}</Badge>
                {question.note && <span className="ppl-label">{question.note}</span>}
              </div>
              <h2 className="ppl-question" style={{ fontSize: 24 }}>
                {question.prompt}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {question.choices.map((choice, i) => {
                  const correct = i === question.answerIndex;
                  const picks = Object.values(state.choices).filter((c) => c === i).length;
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "8px 14px",
                        borderRadius: "var(--radius-pill)",
                        border: `var(--border-w) solid ${correct ? "var(--correct-500)" : "var(--border-subtle)"}`,
                        background: correct ? "rgba(47,210,122,.12)" : "transparent",
                        color: "var(--cream-50)",
                        font: "700 16px/1.2 var(--font-body)",
                      }}
                    >
                      <span style={{ font: "900 20px/1 var(--font-display)", color: "var(--gold-400)", width: 18 }}>
                        {LETTERS[i]}
                      </span>
                      <span style={{ flex: 1 }}>{choice}</span>
                      {correct && <Icon name="check" size={18} style={{ color: "var(--correct-400)" }} />}
                      <span style={{ font: "800 18px/1 var(--font-display)", color: "var(--text-muted)" }}>{picks}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </>
      )}

      {/* The roster: who is in, what they guessed, and the kick switch. */}
      <Card padding={20}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="ppl-label">Players</span>
          {state.players.length === 0 && <p className="ppl-muted">Nobody has joined yet.</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
            {state.players.map((player) => {
              const choice = state.choices[String(player.id)];
              const hasAnswered = answered.has(player.id);
              /* The question on screen belongs to this player's own category. */
              const notScored = !!question && question.categoryId === player.subject_category;
              return (
                <div
                  key={player.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: "var(--radius-md)",
                    border: `var(--border-w) solid ${hasAnswered ? "var(--border-strong)" : "var(--border-subtle)"}`,
                  }}
                >
                  <PlayerChip name={player.name} size="sm" muted={!hasAnswered && state.phase === "question"} />
                  {subjectCategoryOf(player) && (
                    <Badge tone="smooch" size="sm" icon="star">
                      {truncate(subjectCategoryOf(player)!.title, 14)}
                    </Badge>
                  )}
                  <div style={{ flex: 1 }} />
                  {hasAnswered && choice != null ? (
                    <Badge
                      tone={
                        notScored ? "ghost" : question && choice === question.answerIndex ? "correct" : "cream"
                      }
                      size="sm"
                    >
                      {LETTERS[choice]}
                      {question?.choices[choice] ? ` · ${truncate(question.choices[choice])}` : ""}
                      {notScored ? " · not scored" : ""}
                    </Badge>
                  ) : state.phase === "question" ? (
                    <Badge size="sm">{notScored ? "Their round" : "Waiting"}</Badge>
                  ) : null}
                  <IconButton
                    icon="star"
                    label={`Mark ${player.name} as a category subject`}
                    size="sm"
                    variant="ghost"
                    onClick={() => setSubjectOf(player)}
                  />
                  <IconButton
                    icon="user-x"
                    label={`Kick ${player.name}`}
                    size="sm"
                    variant="ghost"
                    onClick={() => confirmKick(player)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {(state.phase === "results" || state.phase === "superlatives") && (
        <HostResults state={state} />
      )}

      {/* Who a round is about. Buttons rather than a select — the design
          system has no Select, and three categories fit fine. */}
      <Dialog
        open={!!subjectOf}
        title="Whose round is it?"
        onClose={() => setSubjectOf(null)}
        width={520}
      >
        {subjectOf && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p className="ppl-muted" style={{ fontSize: 14 }}>
              If a category is about {subjectOf.name}, they can still answer it and you'll still see their
              guess — it just won't score. They get the room's average on that round instead, so they stay
              in the race.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {CATEGORIES.map((category) => {
                const current = subjectOf.subject_category === category.id;
                return (
                  <Button
                    key={category.id}
                    variant={current ? "primary" : "panel"}
                    icon={current ? "check" : "star"}
                    fullWidth
                    disabled={busy}
                    onClick={() => setSubject(subjectOf, current ? null : category.id)}
                  >
                    {category.title}
                  </Button>
                );
              })}
              <Button
                variant="ghost"
                icon="x"
                fullWidth
                disabled={busy || !subjectOf.subject_category}
                onClick={() => setSubject(subjectOf, null)}
              >
                Nobody's round
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={!!confirming}
        title={confirming?.title ?? ""}
        onClose={() => setConfirming(null)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                confirming?.run();
                setConfirming(null);
              }}
            >
              {confirming?.label ?? "Confirm"}
            </Button>
          </>
        }
      >
        {confirming?.body}
      </Dialog>
    </StageShell>
  );
}

/* --- results, as the host sees them -------------------------------------- */

function HostResults({ state }: { state: GameState }) {
  const rows = standings(state.players, state.all_answers ?? []);
  const awards = superlatives(state.players, state.all_answers ?? []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
      <Card padding={20}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="ppl-label">Standings</span>
          {rows.map((row) => (
            <LeaderboardRow
              key={row.player.id}
              rank={row.rank}
              name={row.player.name}
              score={row.score}
              detail={standingDetail(row)}
            />
          ))}
        </div>
      </Card>
      <Card padding={20}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="ppl-label">Superlatives</span>
          {awards.map((award) => (
            <div key={award.title} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ font: "900 20px/1 var(--font-display)", textTransform: "uppercase", color: "var(--gold-400)" }}>
                {award.title}
              </span>
              <span style={{ font: "700 15px/1.3 var(--font-body)", color: "var(--cream-50)" }}>
                {award.winners.length > 0 ? award.winners.join(", ") : "Vacant"} — {award.detail}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

type Confirmation = { title: string; body: string; label: string; run: () => void };

const PHASE_LABELS: Record<GameState["phase"], string> = {
  lobby: "Lobby",
  question: "Question live",
  reveal: "Answer revealed",
  results: "Results",
  superlatives: "Superlatives",
};

/* The category a player is the subject of, if any. */
function subjectCategoryOf(player: StatePlayer) {
  return player.subject_category ? CATEGORIES.find((c) => c.id === player.subject_category) : undefined;
}

function truncate(text: string, max = 18) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
