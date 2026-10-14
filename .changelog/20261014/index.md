# 放开 Loopy 记账收录，并把搜索词写进页面正文

## 让 Loopy 记账的关键词可被搜索引擎抓取 (本地时间 09:34:00)
- **文件**: `src/app/[lang]/admin/bbq/layout.tsx`、`src/app/[lang]/admin/bbq/_components/bbq-search-copy.ts`、`src/app/[lang]/admin/bbq/_components/orders-home.tsx`、`src/app/robots.ts`、`src/app/sitemap.ts`、`src/lib/site-origin.ts`、`src/locales/*`
- **修改内容**: BBQ 布局覆盖后台的 `noindex`，改为允许收录，并把规范地址指到 `/zh/admin/bbq`。首页说明和可见文案写上「Loopy 记账、个人记账、支出统计、日常消费、热量记录、菜单管理、订单记录」。站点地图和 robots 不再指向 `acme.com`，改为当前访问域名下的中文记账页。
- **原因/上下文**: 这些词原先只在 `keywords` 里，父级管理布局又禁止收录，搜索引擎不会建立索引。
