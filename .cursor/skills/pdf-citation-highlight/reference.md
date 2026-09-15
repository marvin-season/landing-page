# PDF.js 文本层引用高亮 — 可移植技术规格

本文是一份**自包含**规格：目标读者是任意代码库里的 agent，不假设存在某个产品目录、store、组件名或测试文件。按本文即可在 PDF.js 系阅读器（原生 PDF.js、PDFSlick、其它封装）上实现「给定页码 + 引文 → 高亮并滚动」。

实现语言以 TypeScript + DOM 为准。React 只出现在可选集成层；高亮本身**不得**依赖 React 渲染。

---

## 1. 问题

### 输入

```ts
interface CitationQuery {
  /** 当前打开文档的稳定 id。与打开中的文档不一致则忽略。 */
  documentId: string
  /** 人类页码，从 1 起。非法则忽略。 */
  page: number
  /** 要定位的原文片段。允许含空白、换行；匹配前会规范化。 */
  quote: string
}
```

### 输出

1. 翻到 `page`。
2. 等该页 PDF.js 文本层可用。
3. 在 `.textLayer` 中定位 `quote` 的**第一处**出现。
4. 画出高亮。
5. 把阅读器**内部滚动容器**滚到高亮垂直居中（水平仅在溢出时微调）。
6. 之后同一条 citation 因缩放/重绘而重建高亮时，**不再滚动**。
7. 新的 citation 到来（新对象 / 新 quote / 新页）：拆掉旧高亮，再滚一次。

匹配失败、页码非法、文档未加载、文本层未出现：静默 return。不抛错、不滚、不画。

### 非目标

| 不要用这套解决 | 原因 |
|----------------|------|
| 用户划词选区 | 输入是 `Selection`，不是 quote；坐标系往往相对 viewer 根节点 |
| Markdown / 网页引用标记 | 与 PDF 文本层无关 |
| 在译文 PDF 上匹配原文 quote | 字形与文本都对不上，会永远失败 |
| 用 React 根据 quote 渲染 `<span>` | PDF.js 随时拆掉并重建页 DOM |

---

## 2. PDF.js 文本层事实

阅读器可见字形画在 **canvas** 上。可选择、可搜索的字符在 **`.textLayer`**：一层覆盖在 canvas 上的 HTML。

每个文本 span 通常是：

- `position: absolute`，带 `transform`（缩放、倾斜）
- 文字颜色透明或近透明，避免挡住 canvas 字形
- 一句被拆成许多 span；span 之间和内部会出现 `\n`、空格、软连字符 U+00AD、零宽字符 U+200B–U+200D

因此：

- UI 侧 quote 几乎总是「干净的一句」，**不能**对 `textContent` 做 `includes(quote)` 或 `indexOf(quote)`。
- 高亮若插入新的定位上下文或改了 `color`，字会错位或出现「canvas 字形 + HTML 实心字」叠字。
- 文本层是懒渲染的：页 canvas 可能先好，`.textLayer` 后到，或暂时 `hidden`。
- 缩放常见两种后果：页节点加 CSS `transform`，或整页 DOM 被换成新节点。旧 Range、旧高亮节点全部失效。

### 页码约定（必须统一）

| API | 基数 |
|-----|------|
| 产品 / store / `CitationQuery.page` | **1-based** |
| PDF.js `eventBus` 的 `pageNumber` | **1-based** |
| PDF.js `gotoPage` / `pdfViewer.currentPageNumber` | **1-based** |
| PDF.js `getPageView(index)` / `getPage(index)` | **0-based** |

把 store 的 `page` 直接传给 `getPageView(page)` 会高亮到上一页或拿到 `undefined`。

### 必须监听的事件

同时听：

- `textlayerrendered`
- `pagerendered`

两者的 payload 都带 1-based `pageNumber`。只处理当前 citation 那一页。

只听其中一个会漏：canvas 先就绪、或缩放后页被替换但 text layer 稍后才来。

### 滚动容器

必须滚 PDF 查看器自己的滚动层（PDF.js 里通常是 `pdfViewer.container`），**不要** `element.scrollIntoView()` 滚到 `window`，否则会把整页应用滚走。

---

## 3. 架构：三层，禁止混写

```
应用集成          何时高亮、哪份文档、有没有资格挂这套逻辑
        ↓ CitationQuery
生命周期所有者     等文本层、观察 DOM、合并调度、翻页、只滚一次、清理
        ↓ { page, textLayer, range, quote }
绘制器            同步把 Range 画成可见高亮，并返回 clear / target
```

**生命周期所有者拥有：** 懒渲染等待、MutationObserver、PDF.js 事件、rAF 合并、翻页、滚动、卸载清理。

**绘制器拥有：** 根据已算好的 `Range` 写 DOM，返回只撤销自己改动的 `clear`，以及用于滚动的 `target`。

绘制器禁止：读应用 store、订 PDF.js 事件、自己 `scrollTo`、返回后再异步写 DOM。

---

## 4. 逻辑模块（按职责拆文件，名称可自定）

```
match.ts           规范化 + 在源字符串上找 [start, end)
range.ts           把源偏移映射成 textLayer 上的 DOM Range
rects.ts           Range → 裁剪后的视口相对矩形（overlay 用）
session.ts         highlight()/clear() + 只滚一次
highlighters/
  types.ts         绘制器契约
  overlay.ts       推荐默认：页内覆盖层
  textWrap.ts      旧方案：包裹文本节点
lifecycle.ts       观察 + 事件 + 调度（可做成 React hook）
viewer.ts          把具体阅读器适配成统一接口
```

下面每一节给出**可直接落地的完整算法**，不要再去翻某个仓库。

---

## 5. Viewer 适配口

不要把生命周期写成「只能跟某一个封装绑死」。先适配成：

```ts
export interface PdfCitationViewer {
  isDocumentLoaded: boolean
  numPages: number
  /** 0-based。返回该页根节点（PDF.js 的 page.div）。 */
  getPageElement(pageIndex0: number): HTMLDivElement | undefined
  /** 阅读器内部滚动容器。 */
  getScrollContainer(): HTMLDivElement
  /** 1-based。 */
  goToPage(page1: number): void
  /**
   * 页或文本层渲染完成。回调参数为 1-based pageNumber。
   * 返回取消订阅函数。
   */
  onPageOrTextLayerRendered(listener: (page1: number) => void): () => void
}
```

### 5.1 原生 PDF.js 映射

```ts
function adaptPdfJs(pdfViewer: PDFViewer): PdfCitationViewer {
  return {
    get isDocumentLoaded() {
      return !!pdfViewer.pdfDocument
    },
    get numPages() {
      return pdfViewer.pdfDocument?.numPages ?? 0
    },
    getPageElement(pageIndex0) {
      return pdfViewer.getPageView(pageIndex0)?.div
    },
    getScrollContainer() {
      return pdfViewer.container
    },
    goToPage(page1) {
      pdfViewer.currentPageNumber = page1
    },
    onPageOrTextLayerRendered(listener) {
      const handler = ({ pageNumber }: { pageNumber: number }) =>
        listener(pageNumber)
      pdfViewer.eventBus.on('textlayerrendered', handler)
      pdfViewer.eventBus.on('pagerendered', handler)
      return () => {
        pdfViewer.eventBus.off('textlayerrendered', handler)
        pdfViewer.eventBus.off('pagerendered', handler)
      }
    },
  }
}
```

PDFSlick 等封装通常把上述对象挂在实例上（`getPageView` / `gotoPage` / `eventBus` / `viewer.container` / `document.numPages`），按同样字段适配即可。

---

## 6. 应用集成规则

生命周期之外，宿主应用必须保证：

1. **文档隔离。** `query.documentId` 必须等于当前打开文档 id，否则忽略。换文档后不要画上一份文档的引用。
2. **只在「quote 所属的那份 PDF」上画。** 若产品有译文 PDF，点引用时先切回原文再高亮。译文页上跑原文 quote 会匹配失败。
3. **功能门闩。** 同一套 PDF 预览若还用于「纯预览、无引用状态」的表面，默认不要挂生命周期。缺少 citation 状态却去读它，会运行时崩。
4. **新 citation = 新对象。** 写入状态时用浅拷贝 `{ ...query }`。生命周期按引用重建，从而重置「只滚一次」。即使用户连点同一处，也应再滚一次。
5. **Headless。** UI 组件只调用生命周期，**return null**。不要把高亮节点放进 React state 再 JSX 画。
6. **触发条件。** 只有 `quote.trim()` 非空且 `page` 为大于 0 的整数时才发起查询。

推荐状态形状：

```ts
type CitationState = CitationQuery | null

function showCitation(set: (q: CitationQuery) => void, query: CitationQuery) {
  set({ ...query })
  // 若有译文开关：这里关掉，切回原文 PDF。
}
```

没有「关闭高亮」协议也可以：卸载预览、`enabled=false`、换文档 id 对不上时，生命周期 cleanup 会拆 DOM。状态里可以留下旧对象，因为 documentId 对不上就不会画。

---

## 7. 匹配算法

### 7.1 为什么要规范化

PDF 文本层字符串常见形态：

```
Before The docu\u00ADment\n  explains this. After
```

产品 quote：

```
The document explains this.
```

直接 `indexOf` 失败。规范化必须：

- 丢掉布局空白和连字符痕迹，但仍能映回**源串下标**（后面要 `setStart`/`setEnd`）
- 处理全角字母、连字（`ﬁ` → `fi`）等视觉等价

### 7.2 规范化

跳过：任意 Unicode 空白 `\s`、软连字符 `\u00AD`、零宽 `\u200B-\u200D`。

其余字符做 `NFKC`。NFKC 可能 1 个源字符变成 N 个规范化字符（`ﬁ` → `f`+`i`）。每个规范化下标都记录源起止。

```ts
export function normalizeCitationText(text: string) {
  let normalized = ''
  const offsets: number[] = []
  const ends: number[] = []
  for (let index = 0; index < text.length; index++) {
    const character = text[index]
    if (/[\s\u00AD\u200B-\u200D]/u.test(character)) continue
    const value = character.normalize('NFKC')
    normalized += value
    for (let count = 0; count < value.length; count++) {
      offsets.push(index)
      ends.push(index + 1)
    }
  }
  return { normalized, offsets, ends }
}
```

### 7.3 找源区间

```ts
export function findCitationRange(text: string, quote: string) {
  const source = normalizeCitationText(text)
  const target = normalizeCitationText(quote).normalized
  if (!target) return undefined
  const start = source.normalized.indexOf(target)
  if (start < 0) return undefined
  return {
    start: source.offsets[start],
    end: source.ends[start + target.length - 1],
  }
}
```

- `start` / `end` 是源字符串的半开区间 `[start, end)`
- `indexOf` → **只取第一处**
- 规范化后 quote 为空（纯空白）→ 不匹配

### 7.4 必须覆盖的例子

| 源文本 | quote | 源切片 |
|--------|-------|--------|
| `Before The docu\u00ADment\n  explains this. After` | `The document explains this.` | `The docu\u00ADment\n  explains this.` |
| `前言。这是\n原文。结尾` | `这是原文。` | `这是\n原文。`（下标 3..9） |
| `前言ＯpenClaw\u200B自定义Skills ﬁle结尾` | `OpenClaw自定义Skills file` | `ＯpenClaw\u200B自定义Skills ﬁle` |
| `Text` | `' \n'` | 不匹配 |
| `''` | `Text` | 不匹配 |
| `这是原文。` | `这是其他内容。` | 不匹配 |

中文标点不要被规范化吃掉；只跳空白和那几类不可见字符。

---

## 8. 源偏移 → DOM Range

在 `.textLayer` 上用 `TreeWalker(SHOW_TEXT)` 按文档顺序拼接 `node.data`，同时记下节点列表。用上一节的源偏移切 Range。Range **可以跨多个 text node**。

```ts
export function findTextRange(layer: HTMLElement, quote: string) {
  const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let text = ''
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    nodes.push(node)
    text += node.data
  }
  const match = findCitationRange(text, quote)
  if (!match) return
  const range = document.createRange()
  let offset = 0
  let started = false
  for (const node of nodes) {
    const end = offset + node.length
    if (!started && match.start < end) {
      range.setStart(node, match.start - offset)
      started = true
    }
    if (started && match.end <= end) {
      range.setEnd(node, match.end - offset)
      break
    }
    offset = end
  }
  return started ? range : undefined
}
```

不要对 `layer.textContent` 直接匹配后再随便选节点：`textContent` 在部分浏览器会折叠，和 TreeWalker 拼接结果可能不一致；偏移必须来自**同一份**拼接串。

---

## 9. 高亮会话：画、清、只滚一次

会话是闭包，独立于 React。每次 citation 生命周期新建一份。

```ts
export interface CitationHighlight {
  target: Element | null
  clear: () => void
}

export type CitationHighlighter = (context: {
  page: HTMLDivElement
  textLayer: HTMLElement
  range: Range
  quote: string
}) => CitationHighlight | undefined

function scrollToHighlight(container: HTMLElement, element: Element) {
  const target = element.getBoundingClientRect()
  const viewport = container.getBoundingClientRect()
  container.scrollTo({
    top:
      container.scrollTop +
      target.top -
      viewport.top -
      container.clientTop -
      (container.clientHeight - target.height) / 2,
    left:
      container.scrollLeft +
      Math.min(0, target.left - viewport.left) +
      Math.max(0, target.right - viewport.right),
    behavior: 'smooth',
  })
}

export function createCitationHighlight(
  page: HTMLDivElement,
  quote: string,
  container: HTMLElement,
  renderer: CitationHighlighter,
) {
  let result: CitationHighlight | undefined
  let hasScrolled = false

  const clear = () => {
    result?.clear()
    result = undefined
  }

  const highlight = () => {
    const layer = page.querySelector<HTMLElement>('.textLayer')
    if (!layer || layer.hidden) return
    // 必须先 clear：text-wrap 的 unwrap 会合并文本节点，旧 Range 失效。
    clear()
    const range = findTextRange(layer, quote)
    if (!range) return
    result = renderer({ page, textLayer: layer, range, quote })
    if (!hasScrolled && result?.target) {
      scrollToHighlight(container, result.target)
      hasScrolled = true
    }
  }

  return { highlight, clear }
}
```

要点：

- `.textLayer` 不存在或 `hidden`：当作「还没好」，**不是**匹配失败。不要滚动。
- `clear()` 不重置 `hasScrolled`。同一会话里缩放重绘只重画，不滚。
- 新会话（新 citation 生命周期）自然 `hasScrolled = false`。
- `renderer` 可返回 `undefined` 或 `target: null`：不滚。
- 垂直居中；水平用 `min(0, 左溢出) + max(0, 右溢出)`，已完全可见则水平增量为 0。

---

## 10. 绘制器契约

```ts
export type CitationHighlighter = (context: {
  page: HTMLDivElement
  textLayer: HTMLElement
  /** 已映射到 DOM 文本节点，绘制器不要再 normalize。 */
  range: Range
  /** 原始 quote。第三方若坚持自匹配可用，但共享层已经匹配过。 */
  quote: string
}) =>
  | {
      /** 滚动锚点。没有可见节点则 null。 */
      target: Element | null
      /** 只撤销本次 DOM。页已被 PDF.js 拆掉时也必须安全。 */
      clear: () => void
    }
  | undefined
```

硬约束：

1. **同步。** 返回前 DOM 已写完。
2. **返回后禁止再写 DOM**（禁止 `setTimeout` / `rAF` / `import().then(draw)`）。第三方库在调用绘制器**之前**加载好。
3. `clear` 只删自己的节点。用 `data-pdf-citation`（或同等标记）识别。页已 detach 时 `parentNode` 可能为空，必须短路。
4. 不要在绘制器里滚动、订事件、读全局 store。

解析入口：字符串名或函数。

```ts
const builtIn = {
  overlay: overlayCitationHighlighter,
  'text-wrap': textWrapCitationHighlighter,
} as const

type Implementation = keyof typeof builtIn | CitationHighlighter

function resolveHighlighter(implementation: Implementation): CitationHighlighter {
  return typeof implementation === 'function'
    ? implementation
    : builtIn[implementation]
}
```

**默认用 `overlay`。** `text-wrap` 是旧方案，会改 PDF.js 文本节点。第三方：写一个符合契约的函数，当作 `implementation` 传入。

---

## 11. Overlay 绘制器（推荐默认）

不修改 `.textLayer` 内部节点。在**页根节点**上叠一层绝对定位、不可点击的覆盖层。划词、搜索仍走原始文本层。

### 11.1 两个坐标系

PDF.js 缩放常给 page 加 CSS `transform`。

| 量 | 是否含 transform |
|----|------------------|
| `element.getBoundingClientRect()` | 含（视觉像素） |
| `element.offsetWidth` / 绝对定位 `left`/`top` | 不含（布局像素） |

覆盖层是 page 的子节点，写的是**未变换**的 `left/top/width/height`，所以必须把视口矩形除以 scale。

**覆盖层必须挂在 page 上，bounds 必须是 page 的 `getBoundingClientRect()`。**  
若把矩形画在 viewer 根节点上（划词工具条常用那种坐标系），页一滚一缩，高亮就会漂。

### 11.2 从 Range 取文本矩形

跨页 Range 的 `getClientRects()` 会混进 canvas / 页框。只遍历 Range 内、且位于 `.textLayer` 的 **Text** 节点，对每个节点建子 Range 再 `getClientRects()`（换行会得到多个小框），再与 page 视口求交。

```ts
function textLayerFor(node: Node) {
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement
  return element?.closest('.textLayer')
}

export function selectionRects(range: Range, bounds: DOMRect) {
  const nodes: Text[] = []
  const ancestor = range.commonAncestorContainer
  if (ancestor.nodeType === Node.TEXT_NODE) {
    nodes.push(ancestor as Text)
  } else {
    const walker = document.createTreeWalker(ancestor, NodeFilter.SHOW_TEXT)
    let node = walker.nextNode()
    while (node) {
      if (textLayerFor(node) && range.intersectsNode(node)) {
        nodes.push(node as Text)
      }
      node = walker.nextNode()
    }
  }

  const rectangles = nodes.flatMap((node) => {
    const textRange = document.createRange()
    textRange.selectNodeContents(node)
    if (node === range.startContainer) {
      textRange.setStart(node, range.startOffset)
    }
    if (node === range.endContainer) {
      textRange.setEnd(node, range.endOffset)
    }
    return Array.from(textRange.getClientRects())
  })

  return rectangles.flatMap((rect) => {
    const left = Math.max(rect.left, bounds.left)
    const top = Math.max(rect.top, bounds.top)
    const right = Math.min(rect.right, bounds.right)
    const bottom = Math.min(rect.bottom, bounds.bottom)
    if (right <= left || bottom <= top) return []
    return [
      {
        left: left - bounds.left,
        top: top - bounds.top,
        width: right - left,
        height: bottom - top,
      },
    ]
  })
}
```

返回值相对 `bounds` 左上角，单位是视觉像素，下一步再除 scale。

### 11.3 绘制

```ts
export const overlayCitationHighlighter: CitationHighlighter = ({
  page,
  range,
}) => {
  const bounds = page.getBoundingClientRect()
  const overlay = document.createElement('div')
  overlay.style.cssText =
    'pointer-events:none;position:absolute;inset:0;z-index:2;'
  overlay.setAttribute('aria-hidden', 'true')
  overlay.dataset.pdfCitation = 'true'

  const scaleX = bounds.width / page.offsetWidth || 1
  const scaleY = bounds.height / page.offsetHeight || 1

  for (const rect of selectionRects(range, bounds)) {
    const mark = document.createElement('span')
    mark.style.cssText = 'position:absolute;background:rgba(255,226,143,.72);'
    Object.assign(mark.style, {
      left: `${rect.left / scaleX - page.clientLeft}px`,
      top: `${rect.top / scaleY - page.clientTop}px`,
      width: `${rect.width / scaleX}px`,
      height: `${rect.height / scaleY}px`,
    })
    overlay.appendChild(mark)
  }

  page.appendChild(overlay)
  return {
    target: overlay.firstElementChild,
    clear: () => overlay.remove(),
  }
}
```

样式要求（可用等价 Tailwind / CSS-in-JS，语义必须保留）：

- 容器：`pointer-events: none`、`position: absolute; inset: 0`、高于文本、低于应用级 modal
- 色块：半透明高亮色；不要挡 canvas 阅读
- `aria-hidden="true"`
- 测试可用 `[data-pdf-citation] span` 计色块数

`clear` 用 `overlay.remove()` 即可；节点已脱离文档时也安全。

---

## 12. Text-wrap 绘制器（旧方案）

把匹配到的文本节点切开，包进带背景的 `<span>`。高亮「就是字」，但会和 PDF.js 抢 DOM。

仅在产品强制要求高亮必须落在文本节点上时使用。

### 12.1 算法

1. 用 TreeWalker 收集与 `range` 相交的文本节点及局部 `[start, end)`。
2. **先 snapshot 全部 segment。** 随后 `splitText` 会改 live Range。
3. **倒序** `splitText` 再包裹，避免前面切开把后面 offset 打乱。
4. wrapper 必须 **不产生定位、不改文字颜色**：`position: static !important; color: inherit !important`。背景才是可见高亮。
5. `clear`：把 children 提回 parent，删 wrapper，对涉及的 parent 调用 `normalize()` 合并相邻文本节点。`parentNode` 为空则跳过。

```ts
interface TextSegment {
  node: Text
  start: number
  end: number
}

function getMatchedSegments(textLayer: HTMLElement, range: Range) {
  const segments: TextSegment[] = []
  const walker = document.createTreeWalker(textLayer, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    if (!range.intersectsNode(node)) continue
    const start = node === range.startContainer ? range.startOffset : 0
    const end = node === range.endContainer ? range.endOffset : node.length
    if (start < end) segments.push({ node, start, end })
  }
  return segments
}

export const textWrapCitationHighlighter: CitationHighlighter = ({
  textLayer,
  range,
}) => {
  const segments = getMatchedSegments(textLayer, range)
  const highlights: HTMLSpanElement[] = []

  for (const { node, start, end } of segments.reverse()) {
    const target = start > 0 ? node.splitText(start) : node
    if (end - start < target.length) target.splitText(end - start)
    const highlight = document.createElement('span')
    highlight.style.cssText =
      'background:rgba(255,226,143,.72);position:static!important;color:inherit!important;'
    highlight.dataset.pdfCitation = 'true'
    target.parentNode?.insertBefore(highlight, target)
    highlight.appendChild(target)
    highlights.unshift(highlight)
  }

  return {
    target: highlights[0] || null,
    clear: () => {
      const parents = new Set<Node>()
      for (const highlight of highlights) {
        const parent = highlight.parentNode
        if (!parent) continue
        while (highlight.firstChild) {
          parent.insertBefore(highlight.firstChild, highlight)
        }
        highlight.remove()
        parents.add(parent)
      }
      parents.forEach((parent) => (parent as Element).normalize())
    },
  }
}
```

会话每次 `highlight()` 都先 `clear()`，禁止套娃（`[data-pdf-citation] [data-pdf-citation]`）。二次 `clear()` 必须幂等。clear 之后，原 span 的 `style="transform: ..."` 和节点身份应仍在。

---

## 13. 生命周期

### 13.1 进入条件（全部满足才订阅）

```
enabled
&& query
&& query.documentId === currentDocumentId
&& viewer.isDocumentLoaded
&& Number.isInteger(query.page)
&& query.page >= 1
&& query.page <= viewer.numPages
&& viewer.getPageElement(query.page - 1) 存在
```

任一失败：不订事件、不翻页、不画。页码非法时不要调用 `getPageView` 越界。

### 13.2 启动顺序

1. `createCitationHighlight(pageEl, quote, scrollContainer, highlighter)`
2. `MutationObserver` 观察 **page 根节点**：
   - `childList: true`
   - `subtree: true`
   - `characterData: true`
   - `attributes: true`
   - `attributeFilter: ['style', 'class', 'hidden']`
3. 订阅 `pagerendered` / `textlayerrendered`，仅当 `pageNumber === query.page` 时调度
4. `goToPage(query.page)`
5. 立刻调度一次（文本层可能已经在）

### 13.3 调度：rAF 合并 + 观察与绘制互斥

`highlight()` 会插入 overlay 或包裹 span，这本身是 mutation。若观察器一直开着：

```
mutation → highlight → mutation → highlight → ∞
```

正确做法：同一帧多次触发合并成一次 rAF；执行时先 `disconnect`，`finally` 再 observe。

```ts
function attachCitationLifecycle(options: {
  viewer: PdfCitationViewer
  query: CitationQuery
  currentDocumentId: string
  enabled: boolean
  implementation: Implementation
}): () => void {
  const { viewer, query, currentDocumentId, enabled, implementation } = options
  if (
    !enabled ||
    !query ||
    query.documentId !== currentDocumentId ||
    !viewer.isDocumentLoaded ||
    !Number.isInteger(query.page) ||
    query.page < 1 ||
    query.page > viewer.numPages
  ) {
    return () => {}
  }

  const page = viewer.getPageElement(query.page - 1)
  if (!page) return () => {}

  const { highlight, clear } = createCitationHighlight(
    page,
    query.quote,
    viewer.getScrollContainer(),
    resolveHighlighter(implementation),
  )

  let frame: number | undefined
  let observer: MutationObserver

  const observePage = () =>
    observer.observe(page, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden'],
    })

  const scheduleHighlight = () => {
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      frame = undefined
      observer.disconnect()
      try {
        highlight()
      } finally {
        observePage()
      }
    })
  }

  observer = new MutationObserver(scheduleHighlight)
  observePage()
  const unsubscribe = viewer.onPageOrTextLayerRendered((page1) => {
    if (page1 === query.page) scheduleHighlight()
  })
  viewer.goToPage(query.page)
  scheduleHighlight()

  return () => {
    observer.disconnect()
    if (frame !== undefined) cancelAnimationFrame(frame)
    clear()
    unsubscribe()
  }
}
```

### 13.4 卸载

1. `observer.disconnect()`
2. `cancelAnimationFrame`
3. `clear()` 高亮 DOM
4. 取消 PDF.js 订阅

`query` / `implementation` / viewer 实例 / `currentDocumentId` / `enabled` 变化都应先完整卸载再重建（从而重置 `hasScrolled`）。

### 13.5 React 集成（可选）

Headless 组件 + `useEffect` 调用 `attachCitationLifecycle`。组件 **return null**。

```ts
useEffect(
  () =>
    attachCitationLifecycle({
      viewer,
      query: citation,
      currentDocumentId,
      enabled,
      implementation,
    }),
  [viewer, citation, currentDocumentId, enabled, implementation],
)
```

不要把 overlay 矩形放进 `useState` 再 JSX 渲染：PDF.js 重绘后 React 树和页 DOM 会分叉。

---

## 14. 与划词高亮共存时的坐标系

两套功能都可以用 `selectionRects` 和相近的高亮色，但 **bounds / 挂载点不能混**：

| | 引用 overlay | 典型划词 overlay |
|--|--|--|
| 输入 | 存储的 quote + page | `window.getSelection()` |
| 挂载点 | **page 根节点** | 常常是 viewer 外层根节点 |
| bounds | `page.getBoundingClientRect()` | 外层根节点的 rect |
| 缩放 | `bounds / offsetWidth` 转回 page 布局坐标 | 根节点 CSS 像素 |
| 指针 | `pointer-events: none` | 覆盖层不可点；工具条可点 |
| 滚动 | 跳转到引用后只滚一次 | 通常滚动即清选区 |

引用覆盖层不要画到 viewer 根上。划词页码可以从 `[data-page-number]` 读，同样是 1-based；引用页码来自查询对象，不要两套混算。

---

## 15. 时序

```
新的 CitationQuery
  校验 documentId / page / 文档已加载
  goToPage(n)
  observe(page)
  scheduleHighlight (rAF)
    尚无 .textLayer 或 hidden → highlight 直接 return
  PDF.js 插入或显示 .textLayer
    MutationObserver 或 textlayerrendered
      disconnect → clear → 匹配 Range → 绘制 → 首次则 scroll → observe
  用户缩放
    pagerendered / textlayerrendered / 页 DOM 被替换
      再 highlight；hasScrolled 已 true → 不滚
  卸载或下一条 query
    disconnect、取消 rAF、clear DOM、取消事件
```

`pagerendered` 时文本层仍可能 `hidden`，那次 `highlight()` 是 no-op，后续 mutation / `textlayerrendered` 会再跑。

---

## 16. 第三方绘制器

```ts
const vendorHighlighter: CitationHighlighter = ({ page, range }) => {
  const handle = VendorAPI.highlight(page, range) // 必须同步完成
  const el = handle.element
  if (!el) return undefined
  return {
    target: el,
    clear: () => handle.remove(),
  }
}
```

若库是 async：在生命周期**之外**先 `await import()` / 初始化，再传入已经同步的函数。禁止在绘制器内部 `void import(...).then(draw)`，否则 cleanup 对不上，observer 也会把延迟写入当成外部 mutation。

共享层仍负责：等待文本层、重绘、只滚一次、卸载。断言时：

- 第一次成功绘制：adapter 1 次，scroll 1 次
- `textlayerrendered` 后再画：adapter 2 次，`clear` 至少 1 次，scroll 仍 1 次
- 卸载：再 `clear`，节点离树

---

## 17. 测试契约（按行为，不按文件名）

环境需要真实 DOM（happy-dom / jsdom + Range/getClientRects polyfill，或浏览器）。生命周期测试要能推进 rAF（fake timers 或 `requestAnimationFrame` mock）。

### 17.1 匹配

- 跨行 + 软连字符能命中，返回的是源串切片（含那些被跳过的字符）
- 中文 + 标点，换行不影响
- 全角、零宽、连字能命中
- 空 / 纯空白 quote、源空、找不到 → `undefined`

### 17.2 Overlay 与 text-wrap 共用的生命周期（两种绘制器都要跑）

构造：页上先没有 `.textLayer`，挂上生命周期后不应有高亮。再插入：

```html
<div class="textLayer">
  <span>OpenClaw自定义</span>
  <span>Skills添加指南</span>
  <span>另一处引用</span>
</div>
```

quote = `OpenClaw自定义Skills添加指南`。

| 行为 | 期望 |
|------|------|
| 文本层后到 | 出现高亮；内部容器 `scrollTo` 被调用，`behavior: 'smooth'` |
| 改 quote 为 `另一处引用` | 旧节点 `isConnected === false`；新高亮 1 段；再次滚动 |
| 触发该页 `textlayerrendered`（模拟缩放重绘，可先重置 innerHTML） | 高亮仍在；滚动次数不增加 |
| 切换 overlay ↔ text-wrap | 旧节点全部断开；新实现画出对应数量的块；卸载后 innerHTML 回到插入文本层之后、高亮之前 |
| quote 不在文档中 | 无高亮、不滚动；卸载后取消 listener；再插入文本也不会画（pending rAF 已取消） |

跨两个 span 的 quote：若 `getClientRects` 对每个节点返回 1 个矩形，overlay 色块数为 2；text-wrap 的 `[data-pdf-citation]` 数为 2。

### 17.3 Text-wrap 额外

- 只包裹匹配子串（`prefix Open` + `Claw suffix` 匹配 `OpenClaw` → 两段文本为 `Open`、`Claw`）
- `page.textContent` 仍是完整句子
- 连续两次 `highlight()` 不套娃
- `clear()` 两次后 innerHTML 与高亮前一致
- 原 span 的 `transform` 还在，节点身份还在，clear 后 `childNodes.length === 1`

### 17.4 集成门闩

- 未启用引用能力的 PDF 预览：生命周期函数不被调用
- 点引用若产品有译文：必须切回原文；已缓存的译文 URL 可以留着，只是当前不显示

### 17.5 滚动公式回归

若 mock：

- page rect `(0, 100, 600, 800)`
- 容器 rect `(0, 0, 600, 400)`，`clientHeight = 400`
- 高亮 rect `(20, 300, 140, 20)`

则垂直：

```
scrollTop + 300 - 0 - 0 - (400 - 20) / 2 = 110
```

改滚动公式时同步改这条断言。

---

## 18. 绿地上实现顺序

给从零实现的 agent，按此顺序提交，不要一上来写 React 组件：

1. `normalizeCitationText` + `findCitationRange` + 第 7.4 节例子（纯函数，无 DOM）
2. `findTextRange` + `createCitationHighlight` 的 clear-before-match
3. `overlay` 绘制器 + `selectionRects` + scale 转换
4. Viewer 适配 + 生命周期（observer 互斥、rAF、只滚一次、cleanup）
5. 应用门闩：documentId、enabled、原文/译文
6. 需要时再加 `text-wrap` 或第三方适配器
7. 用第 17 节行为表做测试，两种绘制器 `describe.each`

---

## 19. 不变量

1. 高亮 DOM 由会话/绘制器写，不由 React 协调。
2. 绘制器同步；返回后不再写 DOM。
3. 观察与绘制互斥。
4. 每次重画先 `clear` 再匹配。
5. 同一会话只滚一次；新 query 新会话才再滚。
6. 只在 quote 所属的那份 PDF 上画。
7. 没有 citation 状态的预览不要挂生命周期。
8. `clear` 只删自己的节点，页销毁后也安全。
9. 文本层缺失或 `hidden` 视为未就绪，不是匹配失败。
10. 匹配必须走规范化，禁止原始 `includes` / `indexOf(quote)`。
11. 产品页码 1-based，`getPageView` 0-based。
12. Overlay 相对 **page**；不要抄划词相对 viewer 根节点的坐标。

---

## 20. 排障

按顺序查，不要先改绘制器。

| 现象 | 原因 |
|------|------|
| 完全没高亮 | enabled 关了；documentId 不一致；页码越界；文本层 hidden；规范化后 `indexOf` 失败 |
| 高亮在相邻页 | 把 1-based page 传给了 0-based `getPageView` |
| 缩放后高亮漂 | overlay 挂错父节点，或没做 `scaleX/Y` |
| 一缩放页面就跳 | 把 scroll 放进了绘制器，或每次重绘都新建会话把 `hasScrolled` 重置了（viewer 实例不应每 render 换新对象） |
| 卡死 / 疯狂闪 | observer 未 disconnect；绘制器异步写 DOM 又触发 observer |
| 字跑飞、叠字 | 用了 text-wrap 但 wrapper 不是 `static` + `color: inherit`；或 clear 没 `normalize` |
| 划词点不到 | overlay 缺少 `pointer-events: none` |
| 纯预览表面崩溃 | 在没有 citation 状态的 PDF 预览上挂了生命周期 |
| 译文里点引用没反应 | 没有先切回原文就匹配；或切换 PDF URL 时没有让阅读器换文档 |

调试匹配：把 TreeWalker 拼接串和 `normalize(quote).normalized` 打出来对比。失败几乎都是空白/软连字符/NFKC，而不是绘制器。

---

## 21. 常见错误

| 做法 | 后果 |
|------|------|
| React 渲染高亮 span | 与 PDF.js 重绘打架，闪烁、泄漏 |
| 绘制器 `setTimeout` 里插 DOM | cleanup 和 observer 对不上 |
| `textContent.includes(quote)` | 跨 span / 换行 / 软连字符失败 |
| page 当 0-based | 错页或 `getPageView` 为空 |
| 译文 PDF 上跑原文 quote | 永远不匹配 |
| 每次 `pagerendered` 都 `scrollTo` | 缩放时阅读区乱跳 |
| `element.scrollIntoView()` | 滚的是 window，不是 PDF 容器 |
| overlay 画在 viewer 根节点 | 跟页滚动/缩放脱节 |
| text-wrap 正序 `splitText`、不 snapshot | 只包到第一段或 Range 损坏 |
| 第三方库在绘制器里 lazy import | 画出时会话已经 clear |

---

## 22. 最小目录落地示例

宿主目录名随意，职责按这个切：

```
pdf-citation-highlight/
  match.ts
  range.ts
  rects.ts
  session.ts
  viewer.ts
  lifecycle.ts
  highlighters/types.ts
  highlighters/overlay.ts
  highlighters/textWrap.ts
  highlighters/resolve.ts
  match.test.ts
  overlay-lifecycle.test.ts
  textWrap.test.ts
```

`resolve.ts` 里一个常量切换默认实现即可：

```ts
export const CITATION_HIGHLIGHT_IMPLEMENTATION: Implementation = 'overlay'
```
