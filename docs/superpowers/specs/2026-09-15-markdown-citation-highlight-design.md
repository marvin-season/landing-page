# Markdown Citation Highlight

## Goal

Clicking a quote in the knowledge chat scrolls the Markdown preview to the first matching passage and paints the same yellow overlay used for PDF citations.

## Non-goals

- Do not reuse the PDF.js lifecycle (`lifecycle.ts`, `viewer.ts`, MutationObserver, page numbers, `.textLayer`).
- Do not match against raw `.md` source. Quotes come from rendered selection; source syntax (`#`, `*`, `>`) is not in the DOM.
- Do not wrap Streamdown output in `<mark>` or store highlight rects in React state.
- Do not invent Markdown page numbers.
- Do not change the PDF highlight path.

## Design

Three layers, same split as PDF, new Markdown-only session:

1. **App:** `DocumentPreview` already receives `activeQuote`. The Markdown branch consumes it. Chat `onLocate` already calls `setActiveQuote({ ...quote })`.
2. **Session:** Wait until the article is mounted, match, draw, scroll once, clear on teardown. Rebuild the session when `activeQuote` object identity changes so a second click on the same quote scrolls again.
3. **Renderer:** Synchronously paint an overlay from an already-computed `Range`. Return `{ target, clear }`. Do not scroll, subscribe, or write DOM after return.

**Reuse:** `pdf-citation-highlight/match.ts` and `range.ts` (`findTextRange` walks any root). They are format-agnostic.

**Do not reuse:** `rects.ts` and the PDF overlay. Both require `.textLayer`. Markdown overlay uses `Range.getClientRects()` relative to the article.

New files under `src/app/[lang]/knowledge/_components/markdown-citation-highlight/`:

| File | Responsibility |
|------|----------------|
| `overlay.ts` | Mount a pointer-events-none overlay on the article; same fill as PDF (`rgba(255,226,143,.72)`, `mix-blend-mode: multiply`). |
| `session.ts` | `highlight()` / `clear()`; scroll the preview overflow container once. |
| `lifecycle.ts` | One rAF after attach; `ResizeObserver` on the article redraws without scrolling; no MutationObserver. |
| `use-markdown-citation-highlight.ts` | React effect that attaches/tears down the lifecycle. |

Query shape: `{ documentId, quote }`. Ignore the query when `documentId` does not match the open document, or when `quote` is empty/whitespace.

Mount the overlay on `[data-document-content]`. Give that article `relative` so `position: absolute; inset: 0` is page-relative. Scroll `container.scrollTo` on the existing `overflow-auto` wrapper; do not use `element.scrollIntoView()`.

Match failure, missing article, or missing scroll container: silent return. No toast, no error copy. Same as PDF.

## Data Flow

```
Chat QuoteBlock click
  → onLocate(quote)
  → setActiveQuote({ ...quote })
  → DocumentPreview Markdown branch
  → query { documentId, quote }
  → findTextRange(article, quote)
  → overlay on article
  → scroll overflow container once
  → resize → redraw overlay, do not scroll
  → new activeQuote or unmount → clear
```

Selection continues to use `window.getSelection()` in `document-preview.tsx`. Locate never uses stored `rects` or `pageNumber`.

## Demo seed

When the Markdown sample document opens and chat is empty, seed one assistant message with a quote copied from the rendered sample (not the raw heading markers), matching the existing PDF `MOCK_PDF_QUOTE` behavior.

## Verification

- Open the Markdown sample. Click the seeded quote: preview scrolls and the passage is highlighted.
- Select a later paragraph, quote it into chat, send, click that quote: old overlay is gone; the new passage is highlighted and scrolled to.
- Click the same quote again: session rebuilds, overlay is redrawn, and the preview scrolls again.
- Resize the preview pane: overlay stays aligned; the view does not jump.
- Switch to a PDF (or another Markdown file): Markdown overlay is gone.
- A quote that does not appear in the rendered DOM produces no highlight and no error.
- Run `nr check`.
