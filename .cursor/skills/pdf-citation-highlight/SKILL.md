---
name: pdf-citation-highlight
description: >-
  Use when implementing or debugging PDF quote highlighting on a PDF.js
  textLayer in any codebase: citation jump, overlay vs text-wrap, missing
  highlight, zoom misalignment, MutationObserver redraw loops, or porting this
  spec. Triggers: PDF.js, textLayer, citation highlight, quote matching,
  pdfslick, highlighter, pagerendered, textlayerrendered.
---

# PDF Citation Highlight

自包含规格，**不依赖任何宿主仓库路径**。完整算法、契约、可复制实现和测试行为表见 [reference.md](reference.md)。

在写代码之前把 `reference.md` 读完。不要去猜本仓库或其它产品里有没有同名文件。

## Overview

给定 `{ documentId, page, quote }`，在 PDF.js 文本层上定位第一处 quote，画出高亮，并把阅读器内部滚动容器滚到高亮。React 若存在，只负责订阅和卸载；匹配、绘制、滚动、清理都在 DOM 会话里完成。

三层不可混写：

1. 应用集成：何时高亮、哪份 PDF、门闩
2. 生命周期：等 `.textLayer`、观察、rAF、只滚一次、清理
3. 绘制器：同步把已算好的 `Range` 画出来

默认绘制器是 **overlay**（挂在 page 上的覆盖层）。**text-wrap** 是会改文本节点的旧方案。

## When to Use

- 在任意 PDF.js 阅读器上实现「点击引用 → 高亮原文」
- 高亮不出现、错页、缩放漂、闪烁、无限重绘、乱滚动
- 新增 overlay / text-wrap / 第三方绘制器
- 引用与划词选区、译文 PDF 抢同一预览

## When NOT to Use

- 用户划词、选区工具条（输入是 `Selection`，坐标系通常相对 viewer 根）
- 网页 / Markdown 引用标记
- 在译文 PDF 上匹配原文 quote

## Agent Workflow

1. 读 [reference.md](reference.md) 第 2（文本层事实）、3（分层）、19（不变量）。
2. 按任务只做一层：匹配 → 会话 → 绘制器 → 生命周期 → 宿主门闩。绿地上按第 18 节顺序。
3. 用第 17 节行为表写测试。不要发明 `includes(quote)` 或 React 高亮列表。
4. Overlay 的 bounds / 挂载点必须是 **page**，不要抄划词 overlay。

## Invariants

见 reference 第 19 节。最短清单：

- 绘制器同步；返回后不再写 DOM
- `highlight()` 期间 disconnect MutationObserver
- 先 clear 再匹配；同一会话只滚一次
- 页码：产品 1-based，`getPageView` 0-based
- 匹配走规范化（空白 / 软连字符 / 零宽 / NFKC），禁止原始 `indexOf(quote)`
- 没有 citation 状态的纯预览不要挂生命周期

## Switch Default Renderer

```ts
export const CITATION_HIGHLIGHT_IMPLEMENTATION: Implementation = 'overlay'
```

`'text-wrap'` 或自定义 `CitationHighlighter` 函数均可。滚动、事件、rAF 仍归生命周期，不归绘制器。
