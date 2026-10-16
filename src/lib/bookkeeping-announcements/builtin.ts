import type { Announcement } from "./model";

export function getBuiltinAnnouncements(_locale: string): Announcement[] {
  return [
    {
      id: "builtin:local-data-backup",
      source: "builtin",
      publishedAt: "2026-10-16T00:00:00.000Z",
      published: true,
      pinned: true,
      title: "使用提醒",
      body: "数据仅存本机，不会云同步，可离线记账。\n\n换设备、卸载应用或清理浏览器前，请先到备份&还原导出数据。\n\n自定义图集可上传图片或导入示例，需单独导出，不包含在账本备份中。",
    },
  ];
}
