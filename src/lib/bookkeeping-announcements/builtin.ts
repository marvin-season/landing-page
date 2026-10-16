import type { Announcement } from "./model";

export function getBuiltinAnnouncements(_locale: string): Announcement[] {
  return [
    {
      id: "builtin:local-data-backup",
      source: "builtin",
      publishedAt: "2026-10-16T00:00:00.000Z",
      published: true,
      pinned: true,
      title: "记账数据保存在你的设备上",
      body: "账本、常用项目和记录照片保存在当前浏览器中，日常记账可以离线使用。\n\n清理浏览器数据或更换设备前，请到设置中导出备份。公告联网更新，不会上传你的记账数据。",
    },
  ];
}
