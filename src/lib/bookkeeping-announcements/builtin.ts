import type { Announcement } from "./model";

// Stable IDs and publication times participate in the same cursor order as Turso rows.
const content = {
  zh: {
    title: "记账数据保存在你的设备上",
    body: "账本、常用项目和记录照片保存在当前浏览器中，日常记账可以离线使用。\n\n清理浏览器数据或更换设备前，请到设置中导出备份。公告联网更新，不会上传你的记账数据。",
  },
  en: {
    title: "Your bookkeeping data stays on your device",
    body: "Your ledger, saved items and record photos are stored in this browser. Everyday bookkeeping works offline.\n\nExport a backup in Settings before clearing browser data or switching devices. Announcements update online without uploading your bookkeeping data.",
  },
  ja: {
    title: "記帳データは端末に保存されます",
    body: "帳簿、よく使う項目、記録の写真は、このブラウザーに保存されます。日常の記帳はオフラインでも利用できます。\n\nブラウザーのデータを削除したり端末を変更したりする前に、設定からバックアップをエクスポートしてください。お知らせの更新時に記帳データが送信されることはありません。",
  },
};

export function getBuiltinAnnouncements(locale: string): Announcement[] {
  return [
    {
      id: "builtin:local-data-backup",
      source: "builtin",
      publishedAt: "2026-10-16T00:00:00.000Z",
      published: true,
      ...(content[locale as keyof typeof content] ?? content.zh),
    },
  ];
}
