/* The player's phone. One route for the whole show: which screen you see is
 * whatever phase the host has the game in.
 *
 * The host does not play — typing the host name here hands you the admin
 * console at /game/admin instead. */
import { useCallback, useState } from "react";
import { useNavigate } from "react-router";

import {
  AnswerTile,
  Badge,
  Button,
  Card,
  Dialog,
  Icon,
  Input,
  LeaderboardRow,
  PlayerChip,
  ProgressBar,
  StageShell,
  Toast,
} from "~/trivia/ui";
import type { AnswerState } from "~/trivia/ui";
import { join, renamePlayer, savePlayer, saveAdminToken, submitAnswer, useGameState, usePlayer } from "~/trivia/api";
import type { GameState, StatePlayer } from "~/trivia/api";
import { LETTERS, POINTS_PER_CORRECT, QUESTIONS, QUESTION_COUNT } from "~/trivia/questions";
import { isCorrect, scoreFromChoices, standingDetail, standings, superlatives } from "~/trivia/scoring";
import "~/trivia/trivia.css";

export function meta() {
  return [
    { title: "PPL Trivia" },
    { name: "description", content: "PPL That Touch Each Other Trivia — join the game." },
    { name: "robots", content: "noindex" },
  ];
}

export default function Game() {
  const navigate = useNavigate();
  /* Identity is kept in localStorage, so a refresh or a locked phone does not
   * knock you out of the game. */
  const player = usePlayer();

  /* Kicked, or the host wiped the game: back to the join screen. */
  const handleRemoved = useCallback(() => savePlayer(null), []);

  const { state, setState, error } = useGameState({
    playerId: player?.id,
    enabled: !!player,
    onRemoved: handleRemoved,
  });

  const handleJoin = useCallback(
    async (name: string) => {
      const result = await join(name);
      if (result.admin) {
        saveAdminToken(result.admin_token);
        navigate("/game/admin");
        return;
      }
      savePlayer(result.player);
      setState(result.state);
    },
    [navigate, setState],
  );

  if (!player) return <JoinScreen onJoin={handleJoin} />;

  if (!state) {
    return (
      <StageShell>
        <div className="ppl-centered">
          <p className="ppl-muted">{error ?? "Finding the stage…"}</p>
        </div>
      </StageShell>
    );
  }

  const myChoices = state.me?.choices ?? {};
  /* Their own round is excluded here too, so this badge agrees with the
   * results screen rather than counting points that won't land. */
  const mine = state.players.find((p) => p.id === player.id);
  const score = scoreFromChoices(myChoices, mine?.subject_category);

  switch (state.phase) {
    case "question":
    case "reveal":
      return <QuestionScreen state={state} player={player} score={score} onState={setState} />;
    case "results":
      return <ResultsScreen state={state} player={player} onState={setState} />;
    case "superlatives":
      return <SuperlativesScreen state={state} player={player} onState={setState} />;
    default:
      return <LobbyScreen state={state} player={player} onState={setState} />;
  }
}

/* Every player screen gets the same three things: what the game is doing, who
 * you are, and a way to push a fresh state up without waiting for the poll. */
type ScreenProps = {
  state: GameState;
  player: StatePlayer;
  onState: (state: GameState) => void;
};

/* --- join ---------------------------------------------------------------- */

function JoinScreen({ onJoin }: { onJoin: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      setError("Pick a name");
      return;
    }
    setBusy(true);
    try {
      await onJoin(name.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join");
    } finally {
      setBusy(false);
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
          style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 20 }}
        >
          <Card marquee padding="28px 24px 24px">
            <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
              <div>
                <div className="ppl-display ppl-display--xl">
                  PPL <span style={{ color: "var(--gold-500)" }}>Trivia</span>
                </div>
                <p className="ppl-muted" style={{ marginTop: 10 }}>
                  Enter your name to get in the game.
                </p>
              </div>
              <Input
                icon="user"
                placeholder="Your name"
                value={name}
                onChange={(v) => {
                  setName(v);
                  setError("");
                }}
                /* Long enough for the host phrase to be typed in full; the
                 * server still caps actual player names at 16. */
                maxLength={32}
                error={error}
                autoFocus
              />
              <Button size="lg" fullWidth type="submit" iconRight="arrow-right" disabled={busy}>
                {busy ? "Joining…" : "Let's go"}
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </StageShell>
  );
}

/* --- who you are --------------------------------------------------------- */

/* Sits in the header of every player screen. Two ways out of a name you don't
 * want: change it (same seat, same score) or hand the phone over and join
 * again as somebody else. */
function YouChip({ player, onState }: { player: StatePlayer; onState: (state: GameState) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(player.name);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const close = () => {
    setOpen(false);
    setName(player.name);
    setError("");
  };

  const save = async () => {
    const next = name.trim();
    if (!next) {
      setError("Pick a name");
      return;
    }
    if (next === player.name) {
      close();
      return;
    }
    setBusy(true);
    try {
      const state = await renamePlayer(player.id, next);
      savePlayer({ id: player.id, name: state.me?.name ?? next });
      onState(state);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change your name");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" icon="user" onClick={() => setOpen(true)}>
        {player.name}
      </Button>
      <Dialog
        open={open}
        title="Your name"
        onClose={close}
        actions={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={save}>
              {busy ? "Saving…" : "Save name"}
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input
            icon="user"
            value={name}
            onChange={(v) => {
              setName(v);
              setError("");
            }}
            maxLength={16}
            error={error}
            autoFocus
          />
          <p className="ppl-muted" style={{ fontSize: 14 }}>
            Changing your name keeps your score and everything you have answered.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              paddingTop: 14,
              borderTop: "var(--border-w) solid var(--border-subtle)",
            }}
          >
            <Button variant="panel" icon="rotate-ccw" onClick={() => savePlayer(null)}>
              Switch player
            </Button>
            <p className="ppl-muted" style={{ fontSize: 13 }}>
              Goes back to the join screen so someone else can play on this phone. Your score stays on
              the board under your name — type it again to pick it back up.
            </p>
          </div>
        </div>
      </Dialog>
    </>
  );
}

/* --- lobby --------------------------------------------------------------- */

function LobbyScreen({ state, player, onState }: ScreenProps) {
  return (
    <StageShell
      top={
        <>
          <Badge tone="live">On air</Badge>
          <Badge icon="users">{state.players.length} players</Badge>
          <YouChip player={player} onState={onState} />
        </>
      }
    >
      <div className="ppl-centered">
        <h1 className="ppl-display">Waiting for players…</h1>
        <p className="ppl-muted">You're in. The host starts the show.</p>
        <p className="ppl-muted" style={{ fontSize: 14 }}>
          Wrong name? Tap it up top to change it.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
            maxWidth: 900,
          }}
        >
          {state.players.map((p) => (
            <PlayerChip key={p.id} name={p.name} isYou={p.id === player.id} />
          ))}
        </div>
      </div>
    </StageShell>
  );
}

/* --- question + reveal --------------------------------------------------- */

function QuestionScreen({ state, player, score, onState }: ScreenProps & { score: number }) {
  const [busy, setBusy] = useState(false);
  const question = QUESTIONS[state.question_index];
  const revealed = state.phase === "reveal";
  const myChoice = state.me?.choices?.[String(state.question_index)];
  const locked = myChoice != null;

  if (!question) {
    return (
      <StageShell>
        <div className="ppl-centered">
          <p className="ppl-muted">Waiting for the next question…</p>
        </div>
      </StageShell>
    );
  }

  const pick = async (choice: number) => {
    if (locked || revealed || busy) return;
    setBusy(true);
    try {
      onState(await submitAnswer(player.id, state.question_index, choice));
    } catch {
      /* The host probably moved on; the next poll will catch us up. */
    } finally {
      setBusy(false);
    }
  };

  const stateFor = (choice: number): AnswerState => {
    if (revealed) {
      if (choice === question.answerIndex) return "correct";
      if (choice === myChoice) return "wrong";
      return "dimmed";
    }
    if (!locked) return "idle";
    return choice === myChoice ? "selected" : "dimmed";
  };

  const right = isCorrect(state.question_index, myChoice);
  /* The host has flagged this player as the subject of this category. */
  const myRound = question.categoryId === state.players.find((p) => p.id === player.id)?.subject_category;

  return (
    <StageShell
      top={
        <>
          <Badge>{`Q ${state.question_index + 1} / ${QUESTION_COUNT}`}</Badge>
          <Badge tone="cream" icon="star">
            {score.toLocaleString()}
          </Badge>
          <YouChip player={player} onState={onState} />
        </>
      }
    >
      <ProgressBar value={state.question_index + (revealed ? 1 : 0)} max={QUESTION_COUNT} height={8} />

      <div className="ppl-stack">
        <div className="ppl-row">
          <Badge tone="gold">{question.categoryTitle}</Badge>
          <span className="ppl-label">{question.categoryTagline}</span>
        </div>
        <Card marquee padding="22px 24px">
          <h1 className="ppl-question">{question.prompt}</h1>
        </Card>
      </div>

      <div className="ppl-answers">
        {question.choices.map((choice, i) => (
          <AnswerTile
            key={i}
            slot={LETTERS[i]}
            label={choice}
            state={stateFor(i)}
            onClick={() => pick(i)}
          />
        ))}
      </div>

      <div className="ppl-row" style={{ justifyContent: "center", minHeight: 68 }}>
        {myRound ? (
          <Toast
            tone="streak"
            icon="star"
            title="Your round"
            message={
              revealed
                ? "Scored at the room's average, not on your answer."
                : "Answer away — this one scores at the room's average instead."
            }
          />
        ) : revealed ? (
          myChoice == null ? (
            <Toast tone="wrong" icon="clock" title="No answer" message={`It was ${question.answer}. You'll get the next one.`} />
          ) : right ? (
            <Toast tone="correct" title="Nailed it!" message={`+${POINTS_PER_CORRECT.toLocaleString()} pts`} />
          ) : (
            <Toast tone="wrong" title="Not quite" message={`It was ${question.choices[question.answerIndex]}`} />
          )
        ) : locked ? (
          <Toast tone="streak" icon="lock" title="Locked in" message={`${state.answered_player_ids.length} of ${state.players.length} answered`} />
        ) : (
          <p className="ppl-muted">Tap your answer. You only get one.</p>
        )}
      </div>
    </StageShell>
  );
}

/* --- results ------------------------------------------------------------- */

function ResultsScreen({ state, player, onState }: ScreenProps) {
  const rows = standings(state.players, state.all_answers ?? []);
  const mine = rows.find((r) => r.player.id === player.id);

  return (
    <StageShell
      top={
        <>
          <Badge tone="gold" icon="trophy">
            Final results
          </Badge>
          <YouChip player={player} onState={onState} />
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <h1 className="ppl-display">And the winner is…</h1>
        {mine && (
          <p className="ppl-body">
            You finished <strong style={{ color: "var(--gold-400)" }}>#{mine.rank}</strong> with{" "}
            {mine.correct} of {mine.counted} right
            {!mine.substituted
              ? "."
              : mine.substituted.from === 0
                ? `. ${mine.substituted.categoryTitle} was about you, and it wasn't played.`
                : `, plus ${mine.substituted.points.toLocaleString()} from the room's average on ${mine.substituted.categoryTitle} — the round about you.`}
          </p>
        )}
        <div style={{ width: "100%", maxWidth: 680, display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((row) => (
            <LeaderboardRow
              key={row.player.id}
              rank={row.rank}
              name={row.player.name}
              score={row.score}
              detail={standingDetail(row)}
              highlight={row.player.id === player.id}
            />
          ))}
        </div>
        <p className="ppl-muted">Superlatives are next.</p>
      </div>
    </StageShell>
  );
}

/* --- superlatives -------------------------------------------------------- */

function SuperlativesScreen({ state, player, onState }: ScreenProps) {
  const awards = superlatives(state.players, state.all_answers ?? []);

  return (
    <StageShell
      top={
        <>
          <Badge tone="gold" icon="award">
            Superlatives
          </Badge>
          <YouChip player={player} onState={onState} />
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <h1 className="ppl-display">The awards</h1>
        <div
          style={{
            width: "100%",
            maxWidth: 900,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {awards.map((award) => (
            <Card key={award.title} padding={20}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    font: "900 26px/1 var(--font-display)",
                    textTransform: "uppercase",
                    color: "var(--gold-400)",
                  }}
                >
                  <Icon name="crown" size={20} />
                  {award.title}
                </span>
                <span style={{ font: "600 14px/1.4 var(--font-body)", color: "var(--text-muted)" }}>
                  {award.blurb}
                </span>
                <div className="ppl-row" style={{ gap: 8, marginTop: 4 }}>
                  {award.winners.length > 0 ? (
                    award.winners.map((name) => <PlayerChip key={name} name={name} size="sm" />)
                  ) : (
                    <span style={{ font: "700 16px/1 var(--font-body)", color: "var(--text-body)" }}>Vacant</span>
                  )}
                </div>
                <span style={{ font: "700 13px/1 var(--font-body)", color: "var(--text-muted)" }}>{award.detail}</span>
              </div>
            </Card>
          ))}
        </div>
        <p className="ppl-muted">Thanks for playing. That's the show.</p>
      </div>
    </StageShell>
  );
}
