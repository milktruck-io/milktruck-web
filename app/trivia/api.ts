/* Talking to milktruck-api.
 *
 * The backend is deliberately dumb: it tracks the phase, the players, and
 * which choice index each player tapped. Correct answers and scoring live in
 * the frontend (questions.ts / scoring.ts) so the deck stays editable here.
 *
 * Point this at the API with VITE_TRIVIA_API_URL (see app/trivia/README.md).
 */
import { useEffect, useState, useSyncExternalStore } from "react";

const RAW_BASE = import.meta.env.VITE_TRIVIA_API_URL ?? "http://localhost:3001";
export const API_BASE = RAW_BASE.replace(/\/$/, "");

export type Phase = "lobby" | "question" | "reveal" | "results" | "superlatives";

export type StatePlayer = {
  id: number;
  name: string;
  /* The category id this player is the subject of, set by the host. Their
   * answers in it are recorded but don't score — see scoring.ts. */
  subject_category?: string | null;
};

export type StoredAnswer = { player_id: number; question_index: number; choice: number };

export type GameState = {
  phase: Phase;
  question_index: number;
  is_admin: boolean;
  players: StatePlayer[];
  /* Who has answered the question currently on screen. */
  answered_player_ids: number[];
  /* player id (as a string key) -> choice index. Sealed until the reveal;
   * the host always sees it. */
  choices: Record<string, number>;
  /* Every answer of the whole game. Sent at results time, and to the host. */
  all_answers: StoredAnswer[] | null;
  /* The polling player, with their own answers so far. */
  me?: { id: number; name: string; choices: Record<string, number> };
  /* Set when the player id we sent no longer exists — kicked, or game wiped. */
  removed?: boolean;
};

export type JoinResult =
  | { admin: true; admin_token: string; state: GameState }
  | { admin: false; player: StatePlayer; state: GameState };

export type AdvanceStep = "start" | "reveal" | "next" | "results" | "superlatives" | "restart" | "clear";

async function request<T>(path: string, init?: RequestInit & { adminToken?: string }): Promise<T> {
  const { adminToken, ...rest } = init ?? {};

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(adminToken ? { "X-Admin-Token": adminToken } : {}),
        ...rest.headers,
      },
    });
  } catch {
    /* fetch only throws like this when the request never landed: the API is
     * down, or VITE_TRIVIA_API_URL points somewhere else. Say which, because
     * "Failed to fetch" sends you looking in the wrong place. */
    throw new Error(`Can't reach the game server at ${API_BASE}`);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((body && (body.error as string)) || `Request failed (${response.status})`);
  }
  return body as T;
}

/* `host: true` is the admin sign-in: the server checks the phrase and creates
 * nothing, so mistyping it on the console does not put a stray player on the
 * board. */
export function join(name: string, opts?: { host?: boolean }) {
  return request<JoinResult>("/trivia/join", {
    method: "POST",
    body: JSON.stringify({ name, host: opts?.host ? true : undefined }),
  });
}

export function fetchState(opts: { playerId?: number | null; adminToken?: string | null }) {
  const params = new URLSearchParams();
  if (opts.playerId) params.set("player_id", String(opts.playerId));
  const query = params.toString();
  return request<GameState>(`/trivia/state${query ? `?${query}` : ""}`, {
    adminToken: opts.adminToken ?? undefined,
  });
}

export function submitAnswer(playerId: number, questionIndex: number, choice: number) {
  return request<GameState>("/trivia/answer", {
    method: "POST",
    body: JSON.stringify({ player_id: playerId, question_index: questionIndex, choice }),
  });
}

export function advance(step: AdvanceStep, adminToken: string, questionCount: number) {
  return request<GameState>("/trivia/advance", {
    method: "POST",
    adminToken,
    body: JSON.stringify({ step, question_count: questionCount }),
  });
}

/* Rename in place: same seat, same answers, new label. */
export function renamePlayer(playerId: number, name: string) {
  return request<GameState>(`/trivia/players/${playerId}/name`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

/* Host only. Flags a player as the subject of a category, or clears it with
 * `null`, so their own round scores off the room average instead. */
export function setSubjectCategory(playerId: number, category: string | null, adminToken: string) {
  return request<GameState>(`/trivia/players/${playerId}/subject`, {
    method: "PATCH",
    adminToken,
    body: JSON.stringify({ category: category ?? "" }),
  });
}

export function kickPlayer(playerId: number, adminToken: string) {
  return request<GameState>(`/trivia/players/${playerId}`, { method: "DELETE", adminToken });
}

/* --- polling ------------------------------------------------------------- */

/* No websockets: the whole show is a handful of phones polling a sqlite
 * database every second and a half. One request in flight at a time, and the
 * first one goes out on the next tick rather than during render. */
export function useGameState(opts: {
  playerId?: number | null;
  adminToken?: string | null;
  enabled?: boolean;
  intervalMs?: number;
  /* Called when the server says this player no longer exists. */
  onRemoved?: () => void;
}) {
  const { playerId = null, adminToken = null, enabled = true, intervalMs = 1500, onRemoved } = opts;
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let stopped = false;
    let inFlight = false;

    const tick = async () => {
      if (inFlight || stopped) return;
      inFlight = true;
      try {
        const next = await fetchState({ playerId, adminToken });
        if (stopped) return;
        setState(next);
        setError(null);
        if (next.removed) onRemoved?.();
      } catch (e) {
        if (!stopped) setError(e instanceof Error ? e.message : "Lost the connection");
      } finally {
        inFlight = false;
      }
    };

    const first = setTimeout(tick, 0);
    const interval = setInterval(tick, intervalMs);
    return () => {
      stopped = true;
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [enabled, playerId, adminToken, intervalMs, onRemoved]);

  return { state, setState, error };
}

/* --- who am I ------------------------------------------------------------ */

/* Identity lives in localStorage so a refresh — or a phone locking itself —
 * does not knock a player out of the game. Exposed through
 * useSyncExternalStore so it survives server rendering without a mismatch. */

const PLAYER_KEY = "ppl-trivia.player";
const ADMIN_KEY = "ppl-trivia.admin-token";

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/* useSyncExternalStore needs a referentially stable snapshot, so the parsed
 * player is cached until the raw string changes. */
let playerCache: { raw: string | null; value: StatePlayer | null } = { raw: null, value: null };

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parsePlayer(raw: string | null): StatePlayer | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StatePlayer;
  } catch {
    return null;
  }
}

function readPlayer(): StatePlayer | null {
  const raw = readRaw(PLAYER_KEY);
  if (raw !== playerCache.raw) playerCache = { raw, value: parsePlayer(raw) };
  return playerCache.value;
}

function readAdminToken(): string | null {
  return readRaw(ADMIN_KEY);
}

const readNothing = () => null;

export function usePlayer(): StatePlayer | null {
  return useSyncExternalStore(subscribe, readPlayer, readNothing);
}

export function useAdminToken(): string | null {
  return useSyncExternalStore(subscribe, readAdminToken, readNothing);
}

export function savePlayer(player: StatePlayer | null) {
  if (typeof window === "undefined") return;
  if (player) window.localStorage.setItem(PLAYER_KEY, JSON.stringify(player));
  else window.localStorage.removeItem(PLAYER_KEY);
  notify();
}

export function saveAdminToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(ADMIN_KEY, token);
  else window.localStorage.removeItem(ADMIN_KEY);
  notify();
}
