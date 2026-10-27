# Homiework UI profile

Data for the `ui-design` skill. Measured and decided 2026-10-26, before the first screen was written.

## 1. Platform and stack
- Mobile-first web app (PWA), Next.js 16 App Router, Tailwind CSS v4 tokens in `src/app/globals.css`.
- Mostly used on phones, a few times a week. Light mode only for v1 (signed decision below).
- Latin script (English). No CJK.

## 2. Systems

### Colour
| Token | Hex | Role | Contrast |
|---|---|---|---|
| `desk` | `#FAF7F3` | App background | — |
| `desk-deep` | `#F0EBE3` | Pressed rows, tab bar edge | — |
| `paper` | `#FFFFFF` | The handout and sheets only | — |
| `ink` | `#111111` | Primary text, primary button | 18.8:1 on paper, 17.8:1 on desk |
| `pencil` (= `slate-600`) | `#57534E` | Secondary text | 7.6:1 paper, 7.2:1 desk |
| `rule` | `#DED8CE` | Ruled lines, dividers. **Never text.** | — |
| `red` | `#C8102E` | Due stamp, "your turn", ticks, errors | 5.9:1 paper, 5.6:1 desk |
| `highlight` | `#FFE45C` | Behind "done" names and streak numbers; ink text on top | — |

Grey ramp `slate-50…900` is tinted toward ink. Text-safe from `slate-600` up on both paper and desk.
Avatar colours (`avatar-*`) all pass 4.5:1 with paper-coloured initials.

### Type
- **Young Serif** 400: topic titles and page headlines only.
- **Atkinson Hyperlegible Next** 400 / 600: everything else. Never below 400.

| Step | Size | Role |
|---|---|---|
| `text-sm` | 0.875rem | Metadata only (counts, "set by", timestamps next to a value) |
| `text-base` | 1rem | Body: what people came to read |
| `text-lg` | 1.125rem | Support / lead |
| `text-2xl` | 1.5rem | Page and section headline (serif) |
| `text-4xl` | 2.25rem | Topic title on the handout (serif) |

### Spacing
Tailwind steps used: 1, 2, 3, 4, 6, 8, 12, 16 (4–64px). Nothing between 4 and 6 or 8 and 12.
Always more space around a group than inside it.

### Radius and depth
- `rounded-md` = 6px on everything. Avatars are circles.
- One shadow, `shadow-paper`, used only for the handout and floating sheets.
- Depth otherwise comes from colour: paper on desk.

## 3. Utilities that exist
- `src/components/ui/button.tsx`: primary (ink, solid, one per screen), secondary (outline), tertiary (link).
- `src/components/ui/field.tsx`: label + control + hint/error with correct spacing.
- `.paper-ruled`, `.highlighted`, `.stamp` classes in `globals.css`.

## 4. Measured state
New project: nothing broken yet. Re-measure when screens exist.

## 5. Signed decisions
- **Only the handout is a card.** Every other screen is flat rows on desk. Reason: the assignment is the one object that matters; cards everywhere would flatten the hierarchy.
- **Red is the grading pen.** It marks due dates, "your turn" and completed ticks. Errors also use red, always with an icon and text.
- **No ALL-CAPS eyebrows, no middle-dot meta strings, no arrows on buttons.**
- **One entrance animation**: the stamp lands once per new topic. Check-in tick animates as a response to the tap.
- **Light only** for v1: the paper metaphor needs a light desk. Revisit if people ask.

## 6. Gate
`web-design-guidelines` audit over `src/app` and `src/components` after each batch of screens.
