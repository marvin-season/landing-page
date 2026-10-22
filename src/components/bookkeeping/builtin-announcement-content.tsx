"use client";

import { cn as cls } from "@landing-page/utils";
import type { ReactNode } from "react";
import { LocalLink as Link } from "@/app/[lang]/bookkeeping/_components/shared/local-link";
import { bookkeepingPath } from "@/lib/bookkeeping-pwa/routes";

const linkCls = cls`text-primary underline underline-offset-4 hover:text-primary/80`;

// Author rich built-in bodies here; builtin.ts retains plain text for search/API.
export const builtinAnnouncementBodies: Record<string, ReactNode> = {
  "builtin:local-data-backup": (
    <div className="flex flex-col gap-4">
      <p>数据仅存本机，不会云同步，可离线记账。</p>
      <p>
        换设备、卸载应用或清理浏览器前，请先到
        <Link
          href={bookkeepingPath("settings", { section: "backup" })}
          className={linkCls}
        >
          备份&amp;还原
        </Link>
        导出数据。
      </p>
      <p>
        <Link
          href={bookkeepingPath("settings", { section: "companion-album" })}
          className={linkCls}
        >
          自定义图集
        </Link>
        可上传图片或导入示例，需单独导出，不包含在账本备份中。
      </p>
    </div>
  ),
};
