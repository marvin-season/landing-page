# 首页与 Knowledge 导航过渡

## Knowledge 返回首页改为方向滑动 · 14:20
- **文件**: [src/components/page-transition/directional-slide.tsx](../../src/components/page-transition/directional-slide.tsx)，[src/css/view-transitions.css](../../src/css/view-transitions.css)，[src/app/[lang]/knowledge/page.tsx](../../src/app/[lang]/knowledge/page.tsx)，[src/app/[lang]/(home)/page.tsx](../../src/app/[lang]/(home)/page.tsx)
- **修改内容**: 首页进入 Knowledge 时新页从右侧滑入、首页向左让位；点击左箭头返回时 Knowledge 向右划出，首页从左侧滑入。设置按钮在过渡中保持固定。
- **原因/上下文**: 返回箭头朝左，原先缺少匹配方向的页面过渡。

## 修复页面过渡重叠导致内容滚乱 · 14:25
- **文件**: [src/css/view-transitions.css](../../src/css/view-transitions.css)，[src/components/page-transition/directional-slide.tsx](../../src/components/page-transition/directional-slide.tsx)
- **修改内容**: 首页与 Knowledge 共用同一个 `app-page` 快照组，隐藏 root 重复层，禁止高度插值，改为左右对推滑入滑出，避免两页叠在一起看起来像在滚动。
- **原因/上下文**: 旧实现里多份快照叠加、高度不一致被拉伸，过渡时内容会重叠发乱。

## 简化为 Knowledge 离开时淡出向右滑出 · 14:30
- **文件**: [src/app/[lang]/knowledge/page.tsx](../../src/app/[lang]/knowledge/page.tsx)，[src/css/view-transitions.css](../../src/css/view-transitions.css)
- **修改内容**: 去掉首页与 Knowledge 的双向推页。离开 Knowledge 时只让该页淡出并向右滑出，首页保持静止。
- **原因/上下文**: 双向对推过于复杂，也容易叠层发乱。

## 去掉 Knowledge 页面过渡 · 14:35
- **文件**: [src/app/[lang]/knowledge/page.tsx](../../src/app/[lang]/knowledge/page.tsx)，[src/css/globals.css](../../src/css/globals.css)，[biome.json](../../biome.json)
- **修改内容**: 移除 ViewTransition 包装、过渡 CSS，以及为此加的 Biome 例外。
- **原因/上下文**: 过渡效果不符合预期，按要求撤回。
