# EduSmartAI Design System & Accessibility

## Direction

**"Academic records system — data legibility first."**

EduSmartAI is a bilingual (Arabic/English) university platform whose primary
surfaces are dense tables of grades, attendance and risk indicators, used by
three roles. The design serves scanning and comparison, not decoration.

Two deliberate choices define it:

1. **Prose moved from monospace to a humanist sans.** The previous global font
   ("Share Tech Mono") has **no Arabic glyphs**, so Arabic names and material
   titles fell back inconsistently, and long records were hard to scan.
2. **Monospace was kept — but scoped to numeric data.** `.font-tabular` /
   `.numeric` apply monospace with `tabular-nums` so grade and score columns
   align digit-for-digit. This is the **signature element**: it retains a trace
   of the original identity while doing real work.

Base size moved 18px → 16px; 18px overflowed dense tables at 360px.

## Tokens

Single source of truth: CSS custom properties in `src/index.css`, mirrored in
`tailwind.config.js`.

> Tailwind colours are literal hex **on purpose**. The app uses opacity
> modifiers (`bg-primary/90`, `ring-primary/40`) which do **not** work against a
> plain `var()` colour. Keep the two files in sync.

| Group | Tokens |
|---|---|
| Brand | `primary` 50/100/300/500/600/700 — anchor `#217aa3` retained for continuity |
| Neutral | `surface`, `canvas`, `ink` (16.1:1), `muted` (4.76:1) |
| Status | `success` `warning` `danger` `info`, each with a `-bg` tint |
| Type | `--font-sans` (Segoe UI → Noto Sans Arabic fallback), `--font-mono` |
| Shape | radius sm/md/lg/xl; `shadow-card`, `shadow-overlay` |
| Focus | `--focus-ring`: white 2px + brand 2px (visible on any background) |

**Breakpoints:** only `xs: 360px` was *added*. Tailwind's `sm/md/lg/xl` defaults
are deliberately left intact — redefining them would silently shift every
existing responsive class in the app. Verified viewports: 360 and 390 fall below
`sm` (base styles), 768 = `md`, 1024 = `lg`, 1440 = `xl`.

## Components (`src/components/UI/`)

| Component | Notes |
|---|---|
| `Button` | variants primary/outline/ghost/subtle/danger; used in 30 files |
| `Card` | surface container; used in 32 files |
| `Input` | label associated via `htmlFor`/`id`; errors via `aria-describedby` + `role="alert"`; `aria-invalid` |
| `Table` | `scope="col"` headers, `<caption>`, focusable scroll region, `numeric` columns |
| `Badge` | status tones; never colour-only — the label always states meaning |
| `StateBlock` | Loading / Error / Empty / Success; `role="status"` vs `role="alert"` |
| `ConfirmDialog`, `GradeDialog`, `FileUploadInput`, `InformationPanel` | existing |

Because `Button` and `Card` are used in 30+ files each, token changes propagate
system-wide without editing every page.

## Accessibility

Measured in-browser with an **alpha-aware** contrast probe (semi-transparent
backgrounds are composited over their ancestors before computing the ratio).

### Fixed

| Issue | Before | After |
|---|---|---|
| `text-slate-400` body text (104 usages / 35 files) | 2.54:1 | 4.76:1 (`slate-500`) |
| `text-primary/70` and `/80` (23 usages / 24 files) | 3.14:1 | ~7:1 (`primary-700`) |
| Dashboard description text | 4.34:1 | 7.0:1 (`slate-600`) |
| **Admin dashboard total failures** | **8** | **0** |

- **Dark-surface regression caught:** two `bg-slate-900` cards where `slate-400`
  was *correct* (5.7:1); the blanket swap would have made them worse (3.4:1).
  Those use `slate-300` (~11:1). The Chatbot's dark surface was excluded too.
- **Form labels:** `Input` labels were not programmatically associated (WCAG
  1.3.1 / 3.3.2) across 8 files — now fixed and verified (the password field
  reports an accessible name in the a11y tree).
- **Mobile navigation (real defect):** the sidebar is `hidden md:flex`, so below
  768px the app had **no navigation at all**. Added an accessible drawer:
  `aria-expanded`/`aria-controls`, `role="dialog" aria-modal`, Escape closes and
  **returns focus to the trigger**, focus moves into the panel, background
  scroll locked, closes on navigation.
- **Skip link** (WCAG 2.4.1) is the first focusable; `#main-content` exists.
- **Focus visibility** (2.4.7/2.4.11): verified with a real Tab press —
  `:focus-visible` matches and the double ring renders.
- **Reduced motion** (2.3.3) honoured globally.
- No positive-`tabindex` anti-pattern; `lang` present.

### Responsive

Verified at **360 / 390 / 768 / 1024 / 1440**.

- No page-level horizontal overflow. Wide tables scroll **inside their own
  container** (`.table-scroll`, WCAG 1.4.10 reflow), not the page.
- **Fixed at 360px:** ProfilePage definition rows used `justify-between`, so
  values were pushed past the card edge and clipped — the email rendered as
  `ahmed@edu.` and the Arabic name was cut off. Rows now stack below `sm`.

### Known limitations (honest)

- The contrast probe cannot see backgrounds painted by **gradients or
  absolutely-positioned siblings**. The profile hero (gradient + white text)
  reported a false 1.0 ratio and was confirmed legible by screenshot instead.
- Audits were run on representative pages per role (Admin dashboard/students,
  Student home/profile), **not exhaustively on all 37 routes**.
- No automated axe-core/Lighthouse run — checks are hand-written probes plus
  manual keyboard testing. **WCAG 2.2 AA is targeted and materially improved,
  not formally certified.**
- RTL: logical properties and `dir` support are in place, but the app does not
  yet expose a language switcher, so full RTL mirroring is unverified.
