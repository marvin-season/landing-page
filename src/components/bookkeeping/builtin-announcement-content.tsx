"use client";

import type { ReactNode } from "react";
import { cls } from "@/app/[lang]/bookkeeping/_components/bbq-layout";
import { BbqLink as Link } from "@/app/[lang]/bookkeeping/_components/bbq-link";
import { bbqSettingsPath } from "@/app/[lang]/bookkeeping/_components/bbq-paths";

const linkCls = cls`text-primary underline underline-offset-4 hover:text-primary/80`;

// Author rich built-in bodies here; builtin.ts retains plain text for search/API.
export const builtinAnnouncementBodies: Record<string, ReactNode> = {
  "builtin:local-data-backup": (
    <div className="flex flex-col gap-4">
      <p>
        账本、常用项目和记录照片保存在当前浏览器中，日常记账可以离线使用。公告联网更新，不会上传你的记账数据。
      </p>
      <section>
        <h4 className="font-medium text-foreground">数据存储与备份</h4>
        <p>
          记账数据仅保存在当前设备的浏览器中，不会自动上传或同步到云端。请定期导出备份，避免清除浏览器数据或更换设备后丢失记录。
        </p>
      </section>
      <section>
        <h4 className="font-medium text-foreground">记得备份数据</h4>
        <p>
          数据仅保存在当前设备。移除应用前，请先备份数据，避免丢失。请到设置中的
          <Link
            href={`${bbqSettingsPath()}?section=backup`}
            className={linkCls}
          >
            备份&amp;还原
          </Link>
          导出备份。
        </p>
      </section>
      <section>
        <h4 className="font-medium text-foreground">给账本换上喜欢的配图</h4>
        <p>
          在设置的
          <Link
            href={`${bbqSettingsPath()}?section=companion-album`}
            className={linkCls}
          >
            自定义图集
          </Link>
          中上传自己的图片，也可以下载示例图集后导入。自定义图集需单独导出，账本备份不包含图集，其中的“图片”仅指记录中的图片。
        </p>
      </section>
    </div>
  ),
};
