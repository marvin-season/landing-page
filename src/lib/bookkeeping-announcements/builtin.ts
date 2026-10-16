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
      body: "账本、常用项目和记录照片保存在当前浏览器中，日常记账可以离线使用。公告联网更新，不会上传你的记账数据。\n\n数据存储与备份\n记账数据仅保存在当前设备的浏览器中，不会自动上传或同步到云端。请定期导出备份，避免清除浏览器数据或更换设备后丢失记录。\n\n记得备份数据\n数据仅保存在当前设备。移除应用前，请先备份数据，避免丢失。请到设置中导出备份。\n\n给账本换上喜欢的配图\n在设置的“自定义图集”中上传自己的图片，也可以下载示例图集后导入。自定义图集需单独导出，账本备份不包含图集，其中的“图片”仅指记录中的图片。",
    },
  ];
}
