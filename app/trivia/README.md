# PPL That Touch Each Other Trivia

A one-night, Kahoot-style game show. Players join on their phones with just a
name, the host drives the whole thing from one screen, and the scores stay
hidden until the big reveal at the end.

Temporary by design — delete this folder, the two routes in `app/routes.ts`,
and the `trivia_*` tables in milktruck-api when the night is over.

## The two URLs

| Who | Where |
| --- | --- |
| Players | `/game` |
| You (host) | `/game/admin` — or just type the host name on `/game` |

## Being the host

There is one credential in the whole game: **type the host name on the join
screen and you get the console.** No other name works, and the host is not a
player.

The name is hardcoded in milktruck-api — `TriviaGame::ADMIN_NAME` in
`app/models/trivia_game.rb`, currently:

```ruby
ADMIN_NAME = "milktruck gamemaster".freeze
```

Matched case-insensitively with surrounding whitespace trimmed, so
`Milktruck Gamemaster` is fine. Change it there before the show if you want
something else — keep it **32 characters or fewer**, which is what the join box
allows you to type (a player name, by contrast, is capped at 16). `ADMIN_TOKEN`
in the same file is what your browser holds onto afterwards, so the console
survives a refresh.

## Editing the questions

Everything you type by hand lives in **`questions.ts`** and nowhere else.
Three categories, four questions each — twelve questions, played in this order:
Sam Said What? → Pete's Eats → Name That Texter!

Categories don't have to be the same length; the game counts whatever is there.

```ts
{
  prompt: "The question players read on their phone",
  choices: ["A choice", "B choice", "C choice", "D choice"],
  answer: "B",            // the LETTER of the right one
  note: "Slide 14",       // optional, only you see this
}
```

A category can be two-choice instead of four — just give it two `choices` and
an answer of `"A"` or `"B"`. Add or remove questions freely; the game counts
them itself. Pictures stay on your PowerPoint, and the question text just
points at it ("Eat #2 — what's in Peter's mouth?").

Category **ids** are wired to the superlative awards in `scoring.ts`
(`CATEGORY_AWARDS`). If you rename or replace a category, change its id there
too, or it falls back to a generic "Best in category" award.

**Changing the deck mid-game.** The server tracks questions by position, so if
you add, remove or reorder questions while a game is running, answers already
given point at the wrong ones. Hit **Clear the room** (or at least **Restart**)
after editing this file and before playing for real.

Two safety nets, both on the console the moment you load it:

- A **red** panel if something is broken — an answer letter with no matching
  choice, an empty prompt, too many choices.
- A **gold** panel listing everything that is still seed content rather than
  something you typed — unwritten questions, and any category you add but have
  not yet named.
  Each carries a `placeholder: true` line in `questions.ts`; **delete that
  line** once it is really yours and it drops off the list. Nothing seeded can
  reach the show without the console telling you first.

## Running the show

1. Open `/game/admin`, type the host name.
2. Players open `/game` and enter their names — they pop into your roster.
3. **Start the show.**
4. For each question: watch the roster fill in (you see each guess as it lands,
   and a bar that turns green at *all in*), then **Reveal answer**. Everyone's
   phone lights up green/red and shows their own running score — no leaderboard
   yet.
5. **Next question** (the gold arrow) until the deck runs out, which lands on
   the results.
6. **Results** shows every player, their score and their position — not just a
   top five. Then **Show superlatives** for the category awards.

Nobody can change an answer: one tap per question, and the server refuses
answers once you've revealed.

## When a round is about one of the players

Sam knows the Sam questions and Peter knows his own, so the host flags them:
tap the **star** on their row and pick the category the round is about.

What that changes:

- They still see the questions and still answer, and you still see their guess
  on your roster — marked **not scored**, so you know it is cosmetic.
- Those answers do not count for them.
- Instead they are credited **the room's average on that category**. If the
  others get 1, 3 and 1 of 4 right, Sam banks 1,667 for his own round.
- They cannot win that category's superlative. Winning a round about yourself
  is no achievement.

That keeps them genuinely competitive without either handing them four free
points or parking them at zero while everyone else banks four — their own
round scores exactly as hard as the room found it. Their phone says the same
thing ("Your round — scored at the room's average"), and the results screen
spells out the substitution under their name.

The flag is per player and per category, so it works for anyone you add later
(a Name That Texter regular, say), not just Sam and Peter. Tap the same
category again, or **Nobody's round**, to clear it. The average only counts
players who actually saw that category, so somebody who joined late does not
drag it down.

## Changing your name, or handing over the phone

Players tap their own name in the top-right of any screen, which opens two
options:

- **Save name** — renames them in place. Same seat, same score, every answer
  kept, and the new name shows up on everyone else's screen (and your roster)
  within a second or two. This is the one for typos.
- **Switch player** — drops back to the join screen so somebody else can play
  on that phone. Nothing is deleted: the old seat and its score stay on the
  board, and typing that same name again walks straight back into it.

Names stay unique, so a rename collides the same way a join does, and the host
phrase can't be worn as a player name.

## Resetting — rehearse live, then wipe it

Three levels, all on the console, and all three ask before they fire:

| Control | Does | Use it when |
| --- | --- | --- |
| **Kick** (per player row) | drops one player and their answers; their phone returns to the join screen | someone double-joined, or is stuck |
| **Restart** | scores to zero, back to the lobby, **players stay joined** | the show goes sideways and you want a clean run without making everyone re-enter their name |
| **Clear the room** | players *and* scores wiped, every phone back to the join screen | after a test run, so no rehearsal names are left on the board |

So yes — deploy it, play a full game against yourself to make sure it holds up,
then hit **Clear the room** and you are back to a pristine lobby.

Two things to know when rehearsing:

- A player is remembered per browser profile, so to be several players at once
  you need several profiles: your phone, a laptop, and an incognito window are
  three different players. Two tabs in the same window are the same player.
- The host is never a player, so you always need at least one real player to
  start.

If you ever want the nuclear option from outside the app, it is one line on the
API box:

```sh
bin/rails runner 'TriviaAnswer.delete_all; TriviaPlayer.delete_all; TriviaGame.delete_all'
```

## Pointing the frontend at the API

The backend is milktruck-api. Set the URL in `.env.local` (gitignored):

```
VITE_TRIVIA_API_URL=http://localhost:3001
```

That default is also the built-in fallback, so for local work you only need the
API running on 3001:

```sh
cd ../milktruck-api && bin/rails server -p 3001
cd ../milktruck-web && npm run dev
```

Vite bakes this value in **at build time**, so it cannot be a runtime secret.
It is pinned in `fly.toml` under `[build.args]`; change it there if the API
lands on a different hostname.

## Deploying to Fly

Two apps. **Deploy the API first** — the web build bakes in its URL.

```sh
# 1. the API (once)
cd milktruck-api
fly volumes create milktruck_storage --region iad --size 1   # sqlite lives here
fly secrets set SECRET_KEY_BASE="$(openssl rand -hex 64)"     # Rails needs this
fly deploy --ha=false                                         # ONE machine only

# 2. the frontend
cd ../milktruck-web
fly deploy
```

Three things that matter:

- **`--ha=false`.** The whole game is one sqlite file on one volume, so a
  second machine cannot serve it. Never scale this app past one.
- **`SECRET_KEY_BASE`.** There is no `config/master.key` in this checkout, so
  `credentials.yml.enc` cannot be decrypted — but nothing in the app needs it.
  Setting `SECRET_KEY_BASE` as a secret satisfies Rails and Devise.
- **Cold starts.** The API's `fly.toml` has `min_machines_running = 0`, so it
  sleeps when idle and the first request after a lull takes a few seconds —
  the join screen may show "Can't reach the game server" once before it wakes.
  Set it to `1` on show night so the machine stays up; put it back after.

The data lives on the volume, so a redeploy mid-show keeps players and scores.
Destroying the volume is what wipes them.

## How it hangs together

The backend is deliberately dumb. It knows the phase, the players, and which
choice index each player tapped — **not** what the right answers are. The deck
and all the scoring live here in the frontend, which is why `questions.ts` is
safe to edit right up to the start of the show without touching the API.

| File | Does |
| --- | --- |
| `questions.ts` | the deck — the only file you edit |
| `scoring.ts` | scores, standings (ties share a rank), superlatives |
| `api.ts` | fetch wrappers, the 1.5s polling hook, who-am-I in localStorage |
| `ui.tsx` | the design-system components (Button, Card, AnswerTile, …) |
| `trivia.css` | design tokens, scoped to `.ppl-stage` so they can't touch the Milktruck brand |

No websockets: every screen polls `/trivia/state` every 1.5 seconds, which is
plenty for a room of phones and one sqlite file.

## Design

The look comes from the **PPL Trivia** design system (Claude Design project
`ea643127`): a TV game-show studio — warm near-black stage under one spotlight,
marquee gold `#FFB81C` as the only primary, answers as dark pills identified by
a gold-ringed letter rather than by color, depth from glows instead of
shadows, and the bulb-framed marquee card around one hero element per screen.
Type is Big Shoulders Display for anything that should feel like a marquee and
Figtree for everything you read.

Two deliberate departures from the source system, both so nothing fails on the
night: `Icon` carries its Lucide paths locally instead of pulling them from a
CDN, and there is no `Timer` — the host controls the pace, so questions never
run out.
