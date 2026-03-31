# Pretext Reference

This file expands the `pretext` skill with API-specific guidance and copyable patterns.

## Install

```bash
pnpm add @chenglou/pretext
```

## Main Exports

```ts
type PrepareOptions = {
  whiteSpace?: "normal" | "pre-wrap";
};

type LayoutResult = {
  lineCount: number;
  height: number;
};

type LayoutLine = {
  text: string;
  width: number;
  start: { segmentIndex: number; graphemeIndex: number };
  end: { segmentIndex: number; graphemeIndex: number };
};

profilePrepare(text, font, options?)
prepare(text, font, options?)
prepareWithSegments(text, font, options?)
layout(prepared, maxWidth, lineHeight)
layoutWithLines(preparedWithSegments, maxWidth, lineHeight)
walkLineRanges(preparedWithSegments, maxWidth, onLine)
layoutNextLine(preparedWithSegments, start, maxWidth)
clearCache()
setLocale(locale?)
```

## When To Use Which API

### Height only

Use this for virtualization, estimated cards, chat rows, or any UI that only needs final height.

```ts
import { layout, prepare } from "@chenglou/pretext";

const prepared = prepare(text, '16px Inter');
const { height, lineCount } = layout(prepared, width, 24);
```

### Explicit lines

Use this for canvas, SVG, custom renderers, line annotations, or line-by-line inspection UIs.

```ts
import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";

const prepared = prepareWithSegments(text, '16px Inter');
const { lines } = layoutWithLines(prepared, width, 24);
```

### Width-only inspection

Use this when line widths matter but building line strings is unnecessary.

```ts
import { prepareWithSegments, walkLineRanges } from "@chenglou/pretext";

const prepared = prepareWithSegments(text, '16px Inter');
let maxLineWidth = 0;

walkLineRanges(prepared, width, (line) => {
  maxLineWidth = Math.max(maxLineWidth, line.width);
});
```

### Variable width per line

Use this when text must flow around images or arbitrary geometry.

```ts
import {
  layoutNextLine,
  prepareWithSegments,
  type LayoutCursor,
} from "@chenglou/pretext";

const prepared = prepareWithSegments(text, '16px Inter');
let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };

while (true) {
  const lineWidth = getWidthForCurrentRow();
  const line = layoutNextLine(prepared, cursor, lineWidth);
  if (line === null) break;
  drawLine(line.text);
  cursor = line.end;
}
```

## React Pattern

Prefer a stable `font` shorthand and memoized prepare results.

```tsx
const font = useMemo(() => `${weight} ${fontSize}px ${family}`, [
  family,
  fontSize,
  weight,
]);

const prepared = useMemo(() => {
  return prepareWithSegments(text, font, { whiteSpace });
}, [font, text, whiteSpace]);

const result = useMemo(() => {
  return layoutWithLines(prepared, width, lineHeight);
}, [lineHeight, prepared, width]);
```

## Next.js Pattern

For interactive measurement in App Router:

- Put the measurement code in a Client Component
- Keep browser comparison logic there too
- The page or layout can stay server-rendered, but the actual Pretext workflow should be inside a client boundary

## Accuracy Requirements

Pretext accuracy depends on matching the real rendering inputs:

- `font` must match the real CSS `font` shorthand
- `lineHeight` must match actual CSS `line-height`
- `whiteSpace` must match the intended behavior
- Use named fonts instead of `system-ui` on macOS if you care about precision

## whiteSpace

Default behavior targets typical paragraph flow:

- `white-space: normal`
- `word-break: normal`
- `overflow-wrap: break-word`
- `line-break: auto`

Use:

```ts
prepare(text, font, { whiteSpace: "pre-wrap" });
```

when ordinary spaces, tabs, and hard line breaks must be preserved.

## Performance Rules

- Prepare once, layout many times
- Cache by `text + font + whiteSpace` when the same content is reused
- Use `profilePrepare()` only for demos, benchmarks, or diagnostics
- Call `clearCache()` only when you intentionally want to release accumulated internal cache
- Call `setLocale()` before future prepares when locale-sensitive behavior should change

## Common Mistakes

- Re-running `prepare()` during every resize
- Passing a `font` string that does not match the rendered element
- Comparing Pretext output against DOM using different `line-height`
- Using `prepare()` when manual line access is required
- Forgetting `whiteSpace: "pre-wrap"` for textarea-like content

## Suggested Agent Behavior

When asked to use Pretext:

1. Check whether the user needs height only or explicit lines.
2. Check whether the width is fixed or varies line by line.
3. Keep measurement logic client-side unless the environment is confirmed safe.
4. Reuse prepared values aggressively.
5. If the task is a demo or verification page, include a browser DOM comparison.

## Source

- Official repo and README: [chenglou/pretext](https://github.com/chenglou/pretext)
