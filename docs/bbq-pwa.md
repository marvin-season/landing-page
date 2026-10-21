# 记露 PWA

`/bookkeeping` 及其子页面使用独立的应用名称、图标和 manifest，原站点的 PWA 配置不变。设置页“安装应用”在支持安装提示的浏览器中打开原生提示，其他浏览器显示操作说明；以独立窗口运行时隐藏按钮。

## 安装与数据

- 部署到 HTTPS 后安装；本地 `localhost` 可用于开发检查。
- iPhone / iPad：Safari → 分享 → 添加到主屏幕。
- Android：Chrome → 菜单 → 添加到主屏幕 / 安装应用。
- 电脑：Chrome / Edge → 地址栏或菜单 → 安装应用。
- 安装清单只提供中文，从 `/zh/bookkeeping` 安装，启动地址固定为 `/zh/bookkeeping`，应用 ID 使用当前记账入口 `/bookkeeping`，与个人站点的应用区分。中文、英文网页的离线支持独立于安装清单，见下文。
- manifest 的作用域仅覆盖 `/zh/bookkeeping` 路径。离开中文 BBQ 路径时，浏览器可能显示站外导航栏。
- 订单、菜单、照片继续使用现有 IndexedDB；安装不会触发数据导出、迁移或清空。不同浏览器、设备及部分系统的主屏幕应用可能使用独立存储，需要通过原有备份功能迁移；照片需选择“导出备份（包含照片）”。

## 离线使用

- 生产环境首次联网访问中文或英文记账页面时，会注册仅控制该语言记账路径的 Service Worker。设置页“放到主屏幕”区域显示准备状态；出现“已可离线使用”后，支持断网启动、刷新、切页、记账、编辑任意本机记录、查看统计、照片和导入导出备份。不需要先访问每个页面或每条记录。
- 每种语言分别准备；首次切换到尚未准备的语言需要联网。安装入口仍固定为中文。
- 离线文档和构建静态资源使用 Serwist 预缓存，包括统计、日历、备份等延迟加载代码及字体。正常访问使用 Next App Router 的页面、链接预取和 `router.push`，不再由布局中的客户端组件按 URL 分发页面。文档请求网络失败时才返回离线文档；进入该兜底页后，同源、同语言的已知记账地址通过 History API 本地切换，保留日期查询参数、返回/前进和本机记录 ID。
- 不内置表情图集。设置页导入的动图和静帧保存在独立 IndexedDB `luji-companions` 中，导入后可离线显示，缺少的场景留空。旧版动图缓存会在新版 Worker 激活时移除；用户账目、照片不受影响。
- 新版本下载完毕后显示提示，关闭所有对应语言的记账窗口，再打开即可生效。不会在编辑期间强制刷新。缓存版本更新不删除 IndexedDB，也不清理其他应用的缓存。
- 可点击“保护本机存储”申请持久存储。浏览器可能拒绝，用户清除站点数据也仍会删除账本，因此仍需定期导出含照片的备份。请保持同一域名、协议和端口；更换来源无法直接读取旧 IndexedDB。
- 不缓存登录、管理、API 或 Next.js RSC 响应，也不将离线 HTML 返回给 RSC 请求。正常页面断网切页时，如果 Next 没有可用的路由缓存，RSC 请求失败会退回文档导航，再由 Worker 提供离线文档。已进入离线文档的窗口恢复网络后继续本地切页，刷新后回到 Next 原生路由；不强制刷新编辑中的记录。站外页面和首次访问的其他语言仍需要网络。开发模式不注册 Service Worker。

## 构建与更新

`nr build` 在 Next 生产构建后自动执行 `scripts/build-bookkeeping-pwa.mjs`，用 esbuild 和 `@serwist/build` 生成 `public/bbq-pwa/sw.js`。该文件是忽略提交的构建产物，部署必须保留它；不能仅执行 `next build` 后跳过生成步骤。部署平台需支持 `next.config.ts` 中的 Service-Worker-Allowed 和 Cache-Control 响应头。

离线页面壳位于 `/{lang}/bookkeeping/offline`，仅用于缓存，无搜索收录。安装会验证页面壳标记和它引用的静态资源与当前构建一致，避免把错误页或不同版本页面当作离线就绪。首次安装未完成时依然可正常在线记账；失败后可从设置页重试，恢复联网时也会重新检查。

`nr test:bookkeeping-pwa` 在 Node 中运行真实打包后的 Worker，验证离线导航、未访问的记录 ID、缓存隔离、资源回收后的恢复、不缓存旧版内置图集及更新等待策略。这不能替代手机端的安装和离线验收。

## 实现入口

- `src/app/[lang]/bookkeeping/layout.tsx`：直接渲染 Next 提供的 `children`，挂载离线状态与导航模式 Provider，保留共用导航。
- `src/app/[lang]/bookkeeping/_components/pwa/offline-app.tsx`：仅由 `offline/page.tsx` 引入，缓存文档 hydration 后按实际地址展示本地页面；不接管正常 Next 页面。
- `_components/shared/local-link.tsx`、`_hooks/use-navigate.ts`：正常模式使用已有的 Next Link 封装与 `router.push`；只有 `_components/pwa/offline-navigation.tsx` 判断当前 Next 路由段是 `offline` 时，才对同源、同语言的已知记账页面使用 History API。修改键点击保留链接行为，`replace` 语义保留。`src/lib/bookkeeping-pwa/routes.ts` 仅供离线兜底解析页面和本机记录 ID。
- `_components/pwa/offline-provider.tsx`、`_components/pwa/offline-status.tsx`：注册 Worker、检查资源完整性、恢复联网后重试、提示等待中的更新，以及申请持久存储。以上相对路径均位于 `src/app/[lang]/bookkeeping/`。
- `src/app/[lang]/bookkeeping/offline/page.tsx`：通用离线文档入口，不嵌入具体账目，不参与搜索收录。
- `src/lib/bookkeeping-pwa/worker.ts`：文档请求使用 Serwist `NetworkOnly`，网络异常才回退到缓存的离线文档，服务器返回的错误状态不会被隐藏；使用 `bookkeeping-{locale}-precache` 隔离语言缓存，激活时清理旧版 `bookkeeping-{locale}-animations` 缓存。显式修复缺失缓存后，确认写入完成才报告就绪；RSC 请求即使没有查询标记，也不会得到已缓存的 HTML。
- `scripts/build-bookkeeping-pwa.mjs`：读取 `.next/BUILD_ID`、收集构建资源及应用图标、注入资源清单并生成 Worker。`nr bookkeeping:pwa:build` 可针对已有的当前生产构建单独重新生成 Worker；修改页面代码后仍须运行完整 `nr build`。
- `next.config.ts`：为 Worker 返回 `Service-Worker-Allowed: /` 和禁止 HTTP 缓存的响应头；实际注册作用域仍限制为 `/{lang}/bookkeeping`。
- `src/lib/bookkeeping-pwa/routes.test.ts`、`worker.test.ts`：路由边界、真实打包 Worker 的模拟离线测试，以及可选的生产资源集成测试。

## 自动检查与生产资源验证

常规检查：

```bash
nr check
nr test:bbq
nr test:bookkeeping-pwa
```

默认离线测试包含 10 项自动检查，另有 1 项需要运行中的生产服务，默认跳过。验证生产产物时，停止占用 3001 端口的开发服务，在一个终端运行：

```bash
nr build
nr start
```

另一个终端运行：

```bash
BOOKKEEPING_PWA_TEST_ORIGIN=http://localhost:3001 nr test:bookkeeping-pwa
```

该集成测试读取生成的 `public/bbq-pwa/sw.js`，从本机生产服务获取真实资源，分别安装中文、英文的缓存，然后模拟断网访问未打开过的记录网址。它使用 Node 中的 Worker/CacheStorage 测试环境，不会操作浏览器界面或用户的 IndexedDB。

2026-10-15 改造验证记录：生产构建、TypeScript 检查、`nr check`、81 项既有记账测试、包含生产资源集成检查的 9 项离线测试均通过。HTTP 检查确认 Worker 响应头、离线页面壳标记和引用资源匹配。该次构建生成 144 个预缓存条目，其中 Next 构建静态资源约 5.4 MB，数量和体积随后续构建变化；不把此数字作为固定验收条件。未运行 headless Chrome，手机安装、真实断网启动与浏览器交互仍需按下方步骤手动验收。

## 维护与验收

`nr bbq:pwa:assets` 生成 `public/bbq-pwa/` 下的中文静态 manifest 和图标。`scripts/generate-bbq-pwa.ts` 用原创笔记本 SVG 生成 16/32/192/512 PNG、180 Apple touch icon 和 maskable 图标，不依赖角色图片。使用 Next 已安装的 Sharp，无额外依赖。修改品牌时重新运行此命令；替换图标时同步递增脚本与记账 metadata 的图标版本参数。

奶油粉主题沿用原有偏好键 `loopy`，避免已保存的主题失效；界面名称不再显示角色名。PWA 应用 ID、启动地址和作用域保持不变，分别为 `/bookkeeping`、`/zh/bookkeeping` 和 `/zh/bookkeeping`。已安装的旧名称和图标由浏览器自行更新，可能需要重新安装；重装前先备份账本和图集。

## 自定义图集

设置 → 自定义图集，可一键导入记露图集 JSON，或按场景上传 GIF、PNG、JPEG、WebP；单张最大 12 MB，图集文件最大 100 MB。图片只在浏览器内处理并保存，不发送到服务器。场景未配置时留空。动图保持原始字节，单图上传会生成减少动态效果时使用的 PNG 静帧。

图集格式为 `{ "format": "luji-companions", "version": 1, "images": { "hello": { "src": "data:image/gif;base64,...", "still": "data:image/png;base64,..." } } }`。可用场景以 `src/lib/bbq/companion-album.ts` 的 `companionMoods` 为准。`still` 可省略，由导入流程生成。仅支持内嵌图片，不读取远程图片地址。

整包导入会替换图集，未包含的场景清空；逐场景上传只更新所选场景。所有图片通过格式和解码检查后，才以事务替换；失败保留旧图集。图集单独导出，不包含在账本备份里。清理账目不影响图集，清空图集不影响账目。

原有图集已保存到本机忽略提交的 `.local/companion-album/luji-companions.json`，可通过设置页导入恢复原场景效果；原素材保存在同目录的 `originals/`。这些私人文件不属于网站公开资源，也不应随网站部署。新安装默认没有图集。

`src/proxy.ts` 仅为 `/bbq-pwa/` 静态资源添加 locale 重写豁免，不改变页面登录规则。

手动验收：

1. 在 `/zh/bookkeeping` 检查应用名称、专属图标与安装说明。
2. HTTPS 环境安装后从桌面启动，确认直接进入中文 BBQ 首页，独立窗口中隐藏安装按钮。
3. 在应用内完成开单、菜单编辑、查看订单和备份；关闭再打开，确认本机数据保留。
4. 设置页显示“已可离线使用”后，关闭应用并开启飞行模式，再从桌面打开。验证四个导航入口、统计、日历、新建后编辑、刷新详情、返回/前进、照片和含照片备份。
5. 未导入时所有场景留空。导入图集后，在正常与减少动态效果两种系统设置下检查动图与静帧；刷新、跨页面和离线访问应保留配图。分别验证单图替换、导出后重新导入、清空，以及损坏文件不覆盖现有图集。
6. 恢复联网并部署新版本，编辑期间不应自动刷新；关闭所有记账窗口后重新打开，版本更新且账本保留。
7. 首页仍使用原站点 manifest，其他 admin 页面仍要求登录。

未通过手机或浏览器安装验收前，不能仅凭静态检查认定平台安装行为已验证。
