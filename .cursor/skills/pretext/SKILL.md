---
name: pretext
description: Integrate and use `@chenglou/pretext` for multiline text measurement, predicted paragraph height, and manual line layout without DOM reflow. Use when the user mentions Pretext, text measurement, paragraph height prediction, line breaking, canvas/SVG/WebGL text layout, or text wrapping around custom geometry.
---

# Pretext

Use this skill when integrating `@chenglou/pretext` into apps, demos, or editor-like experiences.

## What Pretext Is Good At

- Predicting paragraph height from `text + font + width + lineHeight`
- Re-layout at different widths after a one-time `prepare()`
- Getting explicit lines for manual rendering with canvas, SVG, WebGL, or custom layout engines
- Working with multilingual text, bidi text, emojis, and `pre-wrap` style content

## Core Rule

`prepare()` and `prepareWithSegments()` are the expensive one-time pass.

- Reuse the prepared result for repeated width changes
- Do not rerun prepare on every resize if text and font are unchanged
- Rerun prepare only when text, font, locale, or whitespace mode changes

## API Choice

Use the smallest API that fits:

- Need only total height and line count: `prepare()` + `layout()`
- Need line strings: `prepareWithSegments()` + `layoutWithLines()`
- Need widths/cursors only: `prepareWithSegments()` + `walkLineRanges()`
- Need varying width per line: `prepareWithSegments()` + `layoutNextLine()`
- Need profiling for demos or diagnostics: `profilePrepare()`

## React / Next.js Guidance

- Treat Pretext as browser-first. Import and execute it in Client Components unless you have confirmed the target environment supports its measurement path.
- Keep `font` and `lineHeight` aligned with the actual rendered CSS. Pretext accuracy depends on this.
- Memoize prepared results from stable inputs such as `text`, `font`, and `whiteSpace`.
- When rendering a comparison demo, show both Pretext output and browser DOM output so the user can inspect any delta.
- In Next.js App Router, avoid server-only wrappers around browser-specific usage. Put interactive measurement logic in a Client Component.

## Typical Workflow

1. Confirm the exact CSS typography:
   - `font`
   - `line-height`
   - `white-space`
2. Decide whether only height is needed or explicit lines are needed.
3. Prepare once.
4. Reuse the prepared object for layout calls.
5. If needed, compare with DOM output using the same typography.
6. Document caveats when using `system-ui`, unusual wrapping rules, or server rendering.

## Default Example

```ts
import { prepare, layout } from "@chenglou/pretext";

const prepared = prepare(text, '16px Inter');
const result = layout(prepared, width, 24);
```

## Manual Layout Example

```ts
import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";

const prepared = prepareWithSegments(text, '18px "Helvetica Neue"');
const { lines, height } = layoutWithLines(prepared, 320, 26);
```

## Verification Checklist

- `font` string matches actual CSS shorthand
- `lineHeight` matches rendered line height
- Prepared values are reused instead of recomputed during resize
- `whiteSpace: "pre-wrap"` is used when preserving spaces, tabs, and `\n`
- Manual rendering paths use `layoutWithLines`, `walkLineRanges`, or `layoutNextLine` instead of DOM measurement loops

## Additional Resource

- For API details, caveats, and implementation patterns, read [reference.md](reference.md)
