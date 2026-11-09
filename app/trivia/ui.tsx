/* PPL Trivia design system — React primitives.
 *
 * Ported from the Claude Design project (ppl-trivia-design). Same props and
 * same visuals as the source JSX components; typed, and with Icon backed by
 * local Lucide path data instead of the CDN so nothing on the night depends on
 * unpkg being up.
 *
 * Rules this file encodes, from the system's readme:
 *   - gold #FFB81C is the only primary; one gold action per screen
 *   - all four answers share one dark pill; identity comes from the letter
 *   - depth is light (glows), not ink; press inverts the bevel and scales .98
 *   - marquee bulb frame wraps at most one hero element per screen
 */
import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";

/* --- Icon ---------------------------------------------------------------- */

/* Lucide (2px stroke, rounded) — only the glyphs this game uses. */
const ICONS: Record<string, string> = {
  "arrow-right": "M5 12h14M12 5l7 7-7 7",
  play: "M6 3l14 9-14 9V3z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  user: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  "user-x": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M17 8l5 5M22 8l-5 5",
  trophy:
    "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18M6 6l12 12",
  clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z",
  flame:
    "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z",
  "circle-alert": "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01",
  "rotate-ccw": "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5",
  "list-ordered": "M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1",
  presentation: "M2 3h20M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3M7 21l5-5 5 5",
  lock: "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM7 11V7a5 5 0 0 1 10 0v4",
  award: "M18 8a6 6 0 1 1-12 0 6 6 0 0 1 12 0zM15.48 12.89L17 22l-5-3-5 3 1.52-9.11",
  eye: "M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  crown: "M11.56 3.27a.5.5 0 0 1 .88 0l2.95 5.6a1 1 0 0 0 1.52.3l4.28-3.67a.5.5 0 0 1 .8.52l-2.84 10.25a1 1 0 0 1-.95.73H5.81a1 1 0 0 1-.96-.73L2.02 6.02a.5.5 0 0 1 .8-.52L7.1 9.17a1 1 0 0 0 1.51-.3l2.95-5.6zM5 21h14",
};

export function Icon({
  name,
  size = 24,
  title,
  style,
}: {
  name: string;
  size?: number;
  title?: string;
  style?: CSSProperties;
}) {
  const d = ICONS[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ display: "inline-block", flex: "none", ...style }}
    >
      <path d={d} />
    </svg>
  );
}

/* --- Button -------------------------------------------------------------- */

const TONES = {
  primary: { bg: "var(--gold-500)", hover: "var(--gold-400)", fg: "var(--studio-950)", bevel: true },
  secondary: { bg: "var(--smooch-500)", hover: "var(--smooch-400)", fg: "var(--studio-950)", bevel: true },
  danger: { bg: "var(--onair-500)", hover: "var(--onair-400)", fg: "var(--studio-950)", bevel: true },
  ghost: {
    bg: "transparent",
    hover: "rgba(255,240,215,.06)",
    fg: "var(--cream-50)",
    border: "var(--border-w) solid var(--border-strong)",
  },
  panel: {
    bg: "var(--surface-panel-raised)",
    hover: "var(--studio-600)",
    fg: "var(--cream-50)",
    border: "var(--border-w) solid var(--border-subtle)",
  },
} as const;

const BUTTON_SIZES = { sm: [40, 18, 17, 18], md: [52, 24, 21, 20], lg: [64, 32, 26, 24] } as const;

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  fullWidth,
  disabled,
  onClick,
  type = "button",
  style,
}: {
  children?: ReactNode;
  variant?: keyof typeof TONES;
  size?: keyof typeof BUTTON_SIZES;
  icon?: string;
  iconRight?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  style?: CSSProperties;
}) {
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);
  const t = TONES[variant];
  const [h, px, fs, is] = BUTTON_SIZES[size];
  const pressed = down && !disabled;
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setDown(false);
      }}
      onMouseDown={() => setDown(true)}
      onMouseUp={() => setDown(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        height: h,
        padding: `0 ${px}px`,
        width: fullWidth ? "100%" : undefined,
        font: `800 ${fs}px/1 var(--font-display)`,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: t.fg,
        background: hover && !disabled ? t.hover : t.bg,
        border: "border" in t ? t.border : "none",
        borderRadius: "var(--radius-pill)",
        boxShadow: "bevel" in t ? (pressed ? "var(--shadow-button-press)" : "var(--shadow-button)") : "none",
        transform: pressed ? "translateY(1px) scale(.98)" : "none",
        transition: "transform var(--dur-fast) var(--ease-out), background var(--dur-fast)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={is} />}
      {children}
      {iconRight && <Icon name={iconRight} size={is} />}
    </button>
  );
}

/* --- IconButton ---------------------------------------------------------- */

const ICON_BUTTON_SIZES = { sm: [40, 18], md: [52, 22], lg: [64, 28] } as const;

export function IconButton({
  icon,
  label,
  variant = "panel",
  size = "md",
  disabled,
  onClick,
  style,
}: {
  icon: string;
  label: string;
  variant?: keyof typeof TONES;
  size?: keyof typeof ICON_BUTTON_SIZES;
  disabled?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);
  const t = TONES[variant];
  const [d, is] = ICON_BUTTON_SIZES[size];
  const pressed = down && !disabled;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setDown(false);
      }}
      onMouseDown={() => setDown(true)}
      onMouseUp={() => setDown(false)}
      style={{
        width: d,
        height: d,
        display: "inline-grid",
        placeItems: "center",
        padding: 0,
        flex: "none",
        color: t.fg,
        background: hover && !disabled ? t.hover : t.bg,
        border: "border" in t ? t.border : "none",
        borderRadius: "50%",
        boxShadow: "bevel" in t ? (pressed ? "var(--shadow-button-press)" : "var(--shadow-button)") : "none",
        transform: pressed ? "scale(.94)" : "none",
        transition: "transform var(--dur-fast) var(--ease-out), background var(--dur-fast)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        ...style,
      }}
    >
      <Icon name={icon} size={is} />
    </button>
  );
}

/* --- Badge --------------------------------------------------------------- */

const BADGE_TONES = {
  gold: ["var(--gold-500)", "var(--studio-950)"],
  smooch: ["var(--smooch-500)", "var(--studio-950)"],
  sky: ["var(--sky-500)", "var(--studio-950)"],
  live: ["var(--onair-500)", "var(--studio-950)"],
  correct: ["var(--correct-500)", "var(--studio-950)"],
  cream: ["var(--cream-50)", "var(--studio-950)"],
  ghost: ["transparent", "var(--cream-50)"],
} as const;

export function Badge({
  children,
  tone = "ghost",
  icon,
  size = "md",
  style,
}: {
  children?: ReactNode;
  tone?: keyof typeof BADGE_TONES;
  icon?: string;
  size?: "sm" | "md";
  style?: CSSProperties;
}) {
  const [bg, fg] = BADGE_TONES[tone];
  const sm = size === "sm";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: sm ? 24 : 30,
        padding: sm ? "0 10px" : "0 14px",
        background: bg,
        color: fg,
        border: tone === "ghost" ? "var(--border-w) solid var(--border-strong)" : "none",
        borderRadius: "var(--radius-pill)",
        font: `800 ${sm ? 11 : 12}px/1 var(--font-body)`,
        letterSpacing: "var(--ls-label)",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {tone === "live" && !icon && (
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--studio-950)" }} />
      )}
      {icon && <Icon name={icon} size={sm ? 13 : 15} />}
      {children}
    </span>
  );
}

/* --- Card ---------------------------------------------------------------- */

const CARD_TONES = {
  panel: ["var(--surface-panel)", "var(--text-body)", "var(--border-subtle)"],
  raised: ["var(--surface-panel-raised)", "var(--text-body)", "var(--border-subtle)"],
  paper: ["var(--surface-paper)", "var(--studio-950)", "transparent"],
  gold: ["var(--gold-500)", "var(--studio-950)", "transparent"],
} as const;

export function Card({
  children,
  tone = "panel",
  padding = 24,
  radius = "lg",
  marquee,
  style,
}: {
  children?: ReactNode;
  tone?: keyof typeof CARD_TONES;
  padding?: number | string;
  radius?: "sm" | "md" | "lg" | "xl";
  /* The signature motif: a frame of gold bulbs. Max one per screen. */
  marquee?: boolean;
  style?: CSSProperties;
}) {
  const [bg, fg, bd] = CARD_TONES[tone];
  const inner = (
    <div
      style={{
        background: bg,
        color: fg,
        padding,
        border: `var(--border-w) solid ${bd}`,
        borderRadius: `var(--radius-${radius})`,
        boxShadow: marquee ? "none" : "var(--shadow-panel)",
        ...(marquee ? {} : style),
      }}
    >
      {children}
    </div>
  );
  if (!marquee) return inner;
  return (
    <div
      style={{
        padding: 12,
        borderRadius: `calc(var(--radius-${radius}) + 12px)`,
        background: "var(--marquee-bulbs) 0 0/18px 18px, var(--studio-950)",
        boxShadow: "inset 0 0 0 2px var(--gold-700), 0 0 60px -10px rgba(255,184,28,.35)",
        ...style,
      }}
    >
      {inner}
    </div>
  );
}

/* --- Input --------------------------------------------------------------- */

export function Input({
  label,
  value,
  onChange,
  placeholder,
  icon,
  error,
  maxLength,
  disabled,
  autoFocus,
  style,
}: {
  label?: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  icon?: string;
  error?: string;
  maxLength?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  style?: CSSProperties;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", ...style }}>
      {label && <span className="ppl-label">{label}</span>}
      <span style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {icon && (
          <span style={{ position: "absolute", left: 18, color: "var(--studio-400)", display: "flex" }}>
            <Icon name={icon} size={20} />
          </span>
        )}
        <input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          autoFocus={autoFocus}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            width: "100%",
            height: "var(--control-h-md)",
            padding: icon ? "0 18px 0 48px" : "0 20px",
            font: "600 18px/1 var(--font-body)",
            color: "var(--cream-50)",
            background: "var(--studio-950)",
            borderRadius: "var(--radius-md)",
            outline: "none",
            border: `var(--border-w) solid ${
              error ? "var(--onair-500)" : focus ? "var(--gold-500)" : "var(--border-strong)"
            }`,
            boxShadow: focus ? "0 0 20px rgba(255,184,28,.25)" : "none",
            opacity: disabled ? 0.5 : 1,
            transition: "border-color var(--dur-fast), box-shadow var(--dur-fast)",
          }}
        />
      </span>
      {error && (
        <span
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            font: "700 14px/1.2 var(--font-body)",
            color: "var(--onair-400)",
          }}
        >
          <Icon name="circle-alert" size={16} />
          {error}
        </span>
      )}
    </label>
  );
}

/* --- AnswerTile ---------------------------------------------------------- */

export type AnswerState = "idle" | "selected" | "correct" | "wrong" | "dimmed";

const ANSWER_STATES: Record<AnswerState, [string, string, string, string]> = {
  idle: ["var(--surface-panel)", "var(--cream-50)", "var(--border-strong)", "none"],
  selected: ["var(--gold-500)", "var(--studio-950)", "var(--gold-500)", "var(--glow-gold)"],
  correct: ["var(--correct-500)", "var(--studio-950)", "var(--correct-500)", "var(--glow-correct)"],
  wrong: ["var(--onair-500)", "var(--studio-950)", "var(--onair-500)", "none"],
  dimmed: ["var(--surface-panel)", "var(--cream-50)", "var(--border-subtle)", "none"],
};

export function AnswerTile({
  slot,
  label,
  state = "idle",
  size = "lg",
  count,
  onClick,
  style,
}: {
  slot: string;
  label?: string;
  state?: AnswerState;
  size?: "md" | "lg";
  count?: number;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);
  const [bg, fg, bd, glow] = ANSWER_STATES[state];
  const lg = size === "lg";
  const interactive = state === "idle" && !!onClick;
  const lit = state === "selected" || state === "correct" || state === "wrong";
  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setDown(false);
      }}
      onMouseDown={() => setDown(true)}
      onMouseUp={() => setDown(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: lg ? 18 : 12,
        width: "100%",
        minHeight: lg ? 88 : 64,
        padding: lg ? "12px 28px 12px 12px" : "8px 20px 8px 8px",
        textAlign: "left",
        color: fg,
        background: bg,
        borderRadius: "var(--radius-pill)",
        border: `var(--border-w) solid ${interactive && hover ? "var(--gold-500)" : bd}`,
        boxShadow: glow,
        opacity: state === "dimmed" ? 0.35 : 1,
        transform: down && interactive ? "scale(.98)" : "none",
        transition:
          "background var(--dur-base), border-color var(--dur-fast), box-shadow var(--dur-slow), opacity var(--dur-slow), transform var(--dur-fast)",
        cursor: interactive ? "pointer" : "default",
        ...style,
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          flex: "none",
          width: lg ? 60 : 44,
          height: lg ? 60 : 44,
          borderRadius: "50%",
          background: lit ? "var(--studio-950)" : "transparent",
          color: lit ? "var(--cream-50)" : "var(--gold-400)",
          border: lit ? "none" : "var(--border-w) solid var(--gold-500)",
          font: `900 ${lg ? 32 : 24}px/1 var(--font-display)`,
        }}
      >
        {slot.toUpperCase()}
      </span>
      {label && (
        <span style={{ flex: 1, font: `700 ${lg ? 21 : 18}px/1.2 var(--font-body)`, textWrap: "pretty" }}>{label}</span>
      )}
      {count != null && <span style={{ font: `800 ${lg ? 30 : 22}px/1 var(--font-display)` }}>{count}</span>}
      {(state === "correct" || state === "wrong") && (
        <Icon
          name={state === "correct" ? "check" : "x"}
          size={lg ? 28 : 22}
          style={{ animation: "ppl-pop-in var(--dur-slow) var(--ease-pop)" }}
        />
      )}
    </button>
  );
}

/* --- ProgressBar --------------------------------------------------------- */

export function ProgressBar({
  value,
  max = 100,
  tone = "gold",
  height = 10,
  label,
  style,
}: {
  value: number;
  max?: number;
  tone?: "gold" | "correct" | "smooch" | "sky";
  height?: number;
  label?: string;
  style?: CSSProperties;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
      {label && <span className="ppl-label">{label}</span>}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemax={max}
        style={{
          height,
          background: "var(--studio-950)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-pill)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: `var(--${tone}-500)`,
            borderRadius: "var(--radius-pill)",
            boxShadow: `0 0 12px var(--${tone}-500)`,
            transition: "width var(--dur-slow) var(--ease-out)",
          }}
        />
      </div>
    </div>
  );
}

/* --- PlayerChip ---------------------------------------------------------- */

const CHIP_COLORS = ["gold", "smooch", "sky", "correct"] as const;

export function PlayerChip({
  name,
  size = "md",
  isYou,
  muted,
  trailing,
  style,
}: {
  name: string;
  size?: "sm" | "md";
  isYou?: boolean;
  muted?: boolean;
  trailing?: ReactNode;
  style?: CSSProperties;
}) {
  /* Avatar color is derived from the name, so a player keeps the same one. */
  const color = CHIP_COLORS[[...(name || "?")].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 4];
  const sm = size === "sm";
  const d = sm ? 28 : 36;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: `4px ${sm ? 14 : 18}px 4px 4px`,
        background: "var(--surface-panel-raised)",
        color: "var(--cream-50)",
        border: `var(--border-w) solid ${isYou ? "var(--gold-500)" : "var(--border-subtle)"}`,
        borderRadius: "var(--radius-pill)",
        font: `700 ${sm ? 14 : 17}px/1 var(--font-body)`,
        whiteSpace: "nowrap",
        opacity: muted ? 0.5 : 1,
        animation: "ppl-pop-in var(--dur-slow) var(--ease-pop)",
        ...style,
      }}
    >
      <span
        style={{
          width: d,
          height: d,
          flex: "none",
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: `var(--${color}-500)`,
          color: "var(--studio-950)",
          font: `900 ${sm ? 15 : 19}px/1 var(--font-display)`,
        }}
      >
        {(name || "?").slice(0, 1).toUpperCase()}
      </span>
      {name}
      {trailing}
    </span>
  );
}

/* --- LeaderboardRow ------------------------------------------------------ */

const RANK_COLORS: Record<number, string> = {
  1: "var(--gold-400)",
  2: "var(--cream-200)",
  3: "var(--smooch-400)",
};

export function LeaderboardRow({
  rank,
  name,
  score,
  detail,
  highlight,
  style,
}: {
  rank: number;
  name: string;
  score: number;
  detail?: string;
  highlight?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "10px 18px",
        background: "var(--surface-panel)",
        color: "var(--cream-50)",
        border: `var(--border-w) solid ${highlight ? "var(--gold-500)" : "var(--border-subtle)"}`,
        borderRadius: "var(--radius-md)",
        boxShadow: highlight ? "0 0 22px rgba(255,184,28,.25)" : "none",
        ...style,
      }}
    >
      <span
        style={{
          width: 40,
          flex: "none",
          font: "900 34px/1 var(--font-display)",
          color: RANK_COLORS[rank] || "var(--studio-400)",
        }}
      >
        {rank}
      </span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            font: "700 19px/1.2 var(--font-body)",
          }}
        >
          {name}
        </span>
        {detail && <span style={{ font: "600 13px/1 var(--font-body)", color: "var(--text-muted)" }}>{detail}</span>}
      </span>
      <span
        style={{
          font: "800 30px/1 var(--font-display)",
          letterSpacing: "0.02em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {score.toLocaleString()}
      </span>
    </div>
  );
}

/* --- Toast --------------------------------------------------------------- */

const TOAST_TONES = {
  correct: ["var(--correct-500)", "check"],
  wrong: ["var(--onair-500)", "x"],
  info: ["var(--sky-500)", "circle-alert"],
  streak: ["var(--gold-500)", "flame"],
} as const;

export function Toast({
  tone = "info",
  title,
  message,
  icon,
  style,
}: {
  tone?: keyof typeof TOAST_TONES;
  title: string;
  message?: string;
  icon?: string;
  style?: CSSProperties;
}) {
  const [bg, defaultIcon] = TOAST_TONES[tone];
  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 22px 10px 10px",
        minWidth: 240,
        maxWidth: 420,
        background: "var(--surface-panel-raised)",
        color: "var(--cream-50)",
        border: "var(--border-w) solid var(--border-subtle)",
        borderRadius: "var(--radius-pill)",
        boxShadow: "var(--shadow-panel)",
        animation: "ppl-pop-in var(--dur-slow) var(--ease-pop)",
        ...style,
      }}
    >
      <span
        style={{
          width: 44,
          height: 44,
          flex: "none",
          display: "grid",
          placeItems: "center",
          background: bg,
          color: "var(--studio-950)",
          borderRadius: "50%",
        }}
      >
        <Icon name={icon || defaultIcon} size={24} />
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        <span style={{ font: "800 22px/1 var(--font-display)", letterSpacing: "0.03em", textTransform: "uppercase" }}>
          {title}
        </span>
        {message && <span style={{ font: "600 14px/1.3 var(--font-body)", color: "var(--text-body)" }}>{message}</span>}
      </span>
    </div>
  );
}

/* --- Dialog -------------------------------------------------------------- */

export function Dialog({
  open = true,
  title,
  children,
  actions,
  onClose,
  width = 460,
}: {
  open?: boolean;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  onClose?: () => void;
  width?: number;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "rgba(14,11,9,.7)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: width,
          background: "var(--surface-panel)",
          color: "var(--text-body)",
          border: "var(--border-w) solid var(--border-strong)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-panel)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          animation: "ppl-pop-in var(--dur-slow) var(--ease-pop)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <h2
            style={{
              flex: 1,
              margin: 0,
              font: "900 32px/1 var(--font-display)",
              letterSpacing: "0.01em",
              textTransform: "uppercase",
              color: "var(--cream-50)",
            }}
          >
            {title}
          </h2>
          {onClose && <IconButton icon="x" label="Close" size="sm" variant="ghost" onClick={onClose} />}
        </div>
        {children && <div style={{ font: "500 17px/1.5 var(--font-body)" }}>{children}</div>}
        {actions && (
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 6 }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/* --- StageShell ---------------------------------------------------------- */

/* Every screen is the stage: wordmark left, status badges right, content
 * centered underneath. */
export function StageShell({ top, children }: { top?: ReactNode; children: ReactNode }) {
  return (
    <div className="ppl-stage">
      <header className="ppl-header">
        <div className="ppl-wordmark">
          PPL <span style={{ color: "var(--gold-500)" }}>Trivia</span>
        </div>
        <div style={{ flex: 1 }} />
        {top}
      </header>
      <main className="ppl-main">{children}</main>
    </div>
  );
}
