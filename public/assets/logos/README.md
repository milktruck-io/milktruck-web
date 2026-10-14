# Milktruck logo assets

Vector (`.svg`) and raster (`.png`) exports of the Milktruck marks. Prefer the
SVG for anything on-screen; the PNGs are for contexts that can't take vectors
(email, some social cards).

Served from `/assets/logos/<family>/<name>.svg`.

## Families

| Folder | Mark |
| --- | --- |
| `wordmark/` | Full "Milktruck" wordmark lockup |
| `bug/` | Compact badge / bug mark |
| `checker/` | Checkerboard mark |
| `truck/` | Truck icon only |
| `pattern/` | Stripes pattern fill |

## Variants

Single-color marks are named by their ink: `-black`, `-white`, `-cream`,
`-blue`, `-yellow`. Names of the form `-<ink>-on-<bg>` (e.g.
`bug-cream-on-blue`) include a baked-in background plate and should be placed
on neutral ground, not over another color. `-color` / `-full-color` are the
multi-color versions.

Note: `wordmark-color-on-blue` is SVG-only and `wordmark-full-color` is
PNG-only — the other variants ship in both formats.
