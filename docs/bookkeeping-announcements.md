# 记账公告

公开页面：`/{lang}/bookkeeping/announcements`，底部导航中的「公告」。管理页面：`/admin/bookkeeping`（中文为 `/zh/admin/bookkeeping`）。界面支持中文和英文，数据库中的标题/正文按管理员输入原文展示。

## 数据与发布

复用已有 `TURSO_DATABASE_URL` / `TURSO_DATABASE_AUTH_TOKEN`，不需要新的环境变量或依赖。首次访问自动创建 `bookkeeping_announcements` 表及时间线索引，不修改账号表或本地 IndexedDB。表保存标题、纯文本正文、发布时间、发布开关、置顶开关、创建/修改时间和最后修改者。

- 置顶：在管理表单中开启「置顶公告」并保存；关闭并保存即可取消。置顶公告优先展示，同组内按发布时间倒序。置顶不会使草稿或未到时间的公告提前公开。已有数据库会自动补充置顶字段，历史公告默认不置顶。
- 未开启发布：草稿，只在管理端显示。
- 已开启发布且时间已到：公开展示。
- 已开启发布但时间在未来：定时公告，到时间后可被新请求读取。
- 编辑/撤下/删除后，公开页面下次进入或刷新可读取变化；已打开的时间线不会主动轮询。
- 管理表单按浏览器本地时间编辑，服务端保存 UTC ISO 时间；公开时间线统一使用上海时区。

代码内置公告在 `src/lib/bookkeeping-announcements/builtin.ts` 中维护。每条公告需保留稳定 ID 和发布时间；它们参与公开时间线排序，在管理页中只读。正文作为文本渲染，不执行 HTML。

## 分页与离线边界

公开 API：`GET /api/bookkeeping/announcements?locale=zh&q=关键词&cursor=...`。初始最多返回 10 条，向下滚动接近底部后读取下一页；同时保留手动「加载更早的公告」入口和失败重试。搜索由数据库和内置公告共同参与。

游标包含首次请求时间以及最后一条公告的置顶状态、发布时间、ID。查询按 `pinned DESC, published_at DESC, id DESC`，合并数据库候选与内置公告后统一截取 10 条。同一时间的公告以 ID 稳定排序，翻页期间新增的记录不会插入旧快照。游标不能绕过定时公告的时间限制。编辑置顶状态或发布时间可能改变已有记录排序，重新进入页面可获取完整最新顺序。

公告页面壳仍由现有 PWA 提供；API 不进入离线缓存。网络失败时，首次访问展示内置公告，已经加载的公告则保留在当前页面，提供重试。其余账本、常用项目、照片和备份仍使用本地存储，公告接口不会接收这些数据。

## 管理与权限

管理 API：`/api/admin/bookkeeping/announcements`。

- `GET`：每页 10 条数据库公告（含草稿、待发布公告），支持搜索。
- `POST`：新建；默认表单保存草稿。
- `PATCH`：传入数据库记录 ID 更新；撤下时关闭发布开关并保存。
- `DELETE`：传入数据库记录 ID 删除，界面有二次确认。

所有管理请求独立检查登录会话及当前数据库角色，仅 `admin` / `super_admin` 可用。写入要求同源 Origin 和 JSON 请求体；访客不能读取管理列表或写入。代码内置 ID 不能通过管理 API 修改或删除。

## 验证

- `nr test:announcements`：使用内存 libSQL 验证合并分页、同时间排序、草稿/定时隔离、搜索、CRUD、管理员授权及同源写入限制。
- `nr test:bookkeeping-pwa`：验证公告页面离线壳，以及公告 API / 管理页面不被缓存。
- `node --import tsx --test src/lib/page-auth.test.ts`：页面门闩和登录回跳。
- `nr check`、`node_modules/.bin/tsc --noEmit --incremental false`。
