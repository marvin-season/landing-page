# Loopy 记账 PWA

`/bookkeeping` 及其子页面使用独立的应用名称、图标和 manifest，原站点的 PWA 配置不变。设置页“安装应用”在支持安装提示的浏览器中打开原生提示，其他浏览器显示操作说明；以独立窗口运行时隐藏按钮。

## 安装与数据

- 部署到 HTTPS 后安装；本地 `localhost` 可用于开发检查。
- iPhone / iPad：Safari → 分享 → 添加到主屏幕。
- Android：Chrome → 菜单 → 添加到主屏幕 / 安装应用。
- 电脑：Chrome / Edge → 地址栏或菜单 → 安装应用。
- 只提供中文 PWA，从 `/zh/bookkeeping` 安装，启动地址固定为 `/zh/bookkeeping`，应用 ID 保留 `/admin/bbq`，避免已安装应用被识别为新应用，与个人站点的应用区分。
- manifest 的作用域仅覆盖 `/zh/bookkeeping` 路径。离开中文 BBQ 路径时，浏览器可能显示站外导航栏。
- 订单、菜单、照片继续使用现有 IndexedDB；安装不会触发数据导出、迁移或清空。不同浏览器、设备及部分系统的主屏幕应用可能使用独立存储，需要通过原有备份功能迁移；照片需选择“导出备份（包含照片）”。

## 离线边界

本次提供可安装 PWA，不注册 Service Worker，也不缓存管理页面、API 或 Next.js RSC 响应。启动、刷新与跨页面导航仍需要网络；本地存储不等于离线启动支持。完整离线使用需要单独适配 Next.js 页面与资源缓存。

## 维护与验收

`nr bbq:pwa:assets` 生成 `public/bbq-pwa/` 下的中文静态 manifest 和图标。图标使用 `public/bbq-pwa/loopy-source.png` 中的完整 Loopy 角色，由 `scripts/generate-bbq-pwa.ts` 去除透明留白后生成 SVG、16/32/192/512 PNG、180 Apple touch icon 和独立的 maskable 图标，原配图保持不变。使用 Next 已安装的 Sharp，无额外依赖。修改品牌时重新运行此命令；替换图标时同步递增脚本与 BBQ metadata 的图标版本参数。

主题菜单新增 `Loopy · 奶油粉`，沿用现有主题偏好保存机制。PWA 的背景与浏览器主题色使用同款奶油粉，应用 ID 保持原值，启动地址和作用域已迁至 `/zh/bookkeeping`。旧启动地址通过永久跳转兼容。

`src/proxy.ts` 仅为 `/bbq-pwa/` 静态资源添加 locale 重写豁免，不改变页面登录规则。

手动验收：

1. 在 `/zh/bookkeeping` 检查应用名称、专属图标与安装说明。
2. HTTPS 环境安装后从桌面启动，确认直接进入中文 BBQ 首页，独立窗口中隐藏安装按钮。
3. 在应用内完成开单、菜单编辑、查看订单和备份；关闭再打开，确认本机数据保留。
4. 首页仍使用原站点 manifest，其他 admin 页面仍要求登录。

未通过手机或浏览器安装验收前，不能仅凭静态检查认定平台安装行为已验证。
