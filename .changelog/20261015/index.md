# 记账 PWA 离线适配与项目文档

## 记账区完整离线适配及文档归档（2026-10-15 16:10，Asia/Shanghai）

- **原因/上下文**：原记账数据已保存在 IndexedDB，但 PWA 仅提供安装入口，启动、刷新和跨页仍依赖服务器。为个人使用补齐离线能力，沿用现有记账流程、网址和本机数据；本次不调整 Loopy 等角色素材，也不实现用户上传配图。
- **页面与导航**：`src/app/[lang]/bookkeeping/layout.tsx` 接入 `bbq-app.tsx`；`bbq-link.tsx`、`use-bbq-nav.ts` 和 `src/lib/bookkeeping-pwa/routes.ts` 处理同源、同语言的本地导航，移动导航按实际路径判断状态。复用原有账本、项目管理、设置和编辑器，支持离线新建后直接编辑此前未访问过的记录 ID，保留日期参数及返回/前进。
- **离线资源**：新增 `bookkeeping/offline/page.tsx` 通用页面壳和 `src/lib/bookkeeping-pwa/worker.ts`。使用 Serwist 为 `zh`、`en`、`ja` 分别预缓存页面壳、构建代码、字体、图标和静帧；大体积 GIF 按访问缓存，未缓存时离线使用对应静帧。登录、管理、API、RSC 响应不进入页面缓存。
- **状态与数据保护**：`bbq-offline-provider.tsx`、`bbq-offline-status.tsx` 提供准备状态、失败重试、恢复联网检查及持久存储申请。新版本等待所有对应语言的记账窗口关闭后激活，不强制刷新正在编辑的页面，不删除 IndexedDB 账本。中文安装清单、应用 ID 与原有数据备份功能保留。
- **构建部署**：增加 `serwist`、`@serwist/build`、`esbuild` 开发依赖，由包管理器更新锁文件。`nr build` 在 Next 构建后执行 `scripts/build-bookkeeping-pwa.mjs`；`public/bbq-pwa/sw.js` 是不提交的生成产物，部署必须包含。`next.config.ts` 配置 Worker 的作用域许可和 HTTP 缓存响应头。开发模式不注册 Worker。
- **文案**：更新安装说明及中文、英文、日文离线状态文案。
- **验证结果**：生产构建、TypeScript 检查、`nr check`、81 项记账测试均通过；`nr test:bookkeeping-pwa` 的 8 项基础检查及启用 `BOOKKEEPING_PWA_TEST_ORIGIN` 后的 1 项生产资源集成检查全部通过。真实 HTTP 资源验证覆盖三种语言的缓存安装、模拟断网后的任意记录网址和 Worker 响应头。该次构建包含 144 个预缓存条目，Next 构建静态资源约 5.4 MB，仅作当次快照。
- **验收边界**：Node Worker 测试及 HTTP 验证不等同于真实浏览器或手机离线验收。未运行 headless Chrome；手机安装、飞行模式冷启动、交互及升级后的数据保留仍需手动验证。首次准备、尚未缓存的语言和站外页面需要网络；持久存储不能防止用户主动清除数据。
- **项目文档**：完善 `docs/bbq-pwa.md` 的实现入口、构建/测试命令及验证记录；在 `docs/architecture.md` 补充记账离线链路，并从 `docs/README.md` 和根 `README.md` 提供入口。

详细维护与验收说明见 [记账 PWA 文档](../../docs/bbq-pwa.md)。
