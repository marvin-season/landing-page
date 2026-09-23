---
name: content-driven-split-pane
description: >-
  Build a two-column pane where one side's content drives height, the other
  follows without inflating the row, with min height, max 100dvh, internal
  scroll, and a pinned bottom bar. Use when implementing split panes, PDF +
  chat side-by-side, synced column height, sticky bottom toolbars that fail,
  or when absolute inset-0 is needed so tall media (PDF) does not stretch the
  layout.
---

# Content-Driven Split Pane

Reference implementation: `src/app/[lang]/dev/page.tsx`.

## Goal

| Phase | Behavior |
|-------|----------|
| Initial | Both columns share a floor height (e.g. `min-h-125` = 500px) |
| Grow | **Driving** column content raises the shell; **follower** stretches to match |
| Cap | Shell stops at `max-h-dvh` (100dvh); each scroll region scrolls inside |

Default: **right drives**, **left follows** (e.g. chat / list drives, PDF follows).

## Shell

```tsx
<div className="flex min-h-125 max-h-dvh w-full overflow-hidden">
  {/* follower */}
  <div className="relative w-1/2 shrink-0">
    <div className="absolute inset-0 flex flex-col">
      <FollowerPane /> {/* flex-1 min-h-0 overflow-auto inside */}
    </div>
  </div>

  {/* driver */}
  <div className="flex min-h-0 w-1/2 flex-col">
    <div className="min-h-0 flex-1 overflow-y-auto">{/* growing content */}</div>
    <div className="flex shrink-0 border-t">{/* pinned footer */}</div>
  </div>
</div>
```

Key classes on the shell:

- `min-h-*` — floor height
- `max-h-dvh` — ceiling
- `overflow-hidden` — clamp overflow so children own scrolling

## Why `absolute inset-0` on the follower

Tall follower content (multi-page PDF) in normal flow contributes to flex/grid intrinsic height and blows past the floor before the driver grows.

`absolute inset-0`:

1. Removes follower content from height contribution
2. Fills the follower cell, whose height comes from the shell (driven by the other column + min/max)
3. Pair with inner `flex flex-col` + child `flex-1 min-h-0 overflow-auto` so the follower scrolls inside

Parent of the absolute layer must be `relative` (and get height via stretch from the shell).

## Pinned bottom bar

**Do not** put the bar inside the scroll stream with `sticky bottom-0`.

`sticky bottom` only resists scrolling out past the scrollport bottom. A bar at the **end** of the document is off-screen until you reach the end, so it never stays visible while reading content above.

Correct pattern:

1. Driver column: `flex flex-col`
2. Content: `flex-1 min-h-0 overflow-y-auto`
3. Footer: `shrink-0` sibling **outside** the scroll container

## Checklist

- [ ] One column is explicitly the height driver; the other does not contribute intrinsic height
- [ ] Shell has both `min-h-*` and `max-h-dvh` (or `max-h-screen`)
- [ ] Follower uses `relative` → `absolute inset-0` → scrollable body
- [ ] Driver uses `min-h-0` so it can shrink under `max-h`
- [ ] Footer is a `shrink-0` sibling, not `sticky bottom` inside overflow
- [ ] Every scrollable flex child has `min-h-0` (or `min-w-0` for rows)

## Anti-patterns

| Avoid | Why |
|-------|-----|
| `max-h-screen` on a column without clamping the shell | Column can grow to viewport while PDF still expands the sibling track |
| Grid/flex item default `min-height: auto` without `min-h-0` | Content blocks shrinking; scroll never engages at the cap |
| Follower PDF/pages in normal flow | Follower becomes a second height driver |
| `sticky bottom-0` footer after long content | Does not keep a bottom toolbar always visible |
| Single overflow on a parent that wraps both content and footer | Footer scrolls away or sticky fails |

## Optional swaps

- **Left drives, right follows**: mirror the structure; put `absolute inset-0` on the right.
- **Equal intrinsic drivers**: do not use this pattern; use a fixed/`h-*` shell or JS measurement instead.
- **No footer**: drop the `shrink-0` bar; keep driver as `overflow-y-auto` only.
