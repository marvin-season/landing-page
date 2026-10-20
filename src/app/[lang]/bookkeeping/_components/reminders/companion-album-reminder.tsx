"use client";

import { toast } from "@landing-page/design-system";
import { useLingui } from "@lingui/react/macro";
import { Images } from "lucide-react";
import { useWeeklyReminder } from "../../_hooks/use-weekly-reminder";
import { bbqSettingsPath } from "../../_lib/bbq-paths";
import { BbqLink as Link } from "../shared/bbq-link";

export function CompanionAlbumReminder() {
  const { t } = useLingui();

  useWeeklyReminder(
    "bookkeeping-companion-album-reminder:last-shown-day",
    () =>
      toast.info(t`给账本换上喜欢的配图`, {
        id: "bookkeeping-companion-album-reminder",
        description: t`在设置的“自定义图集”中上传自己的图片，也可以下载示例图集后导入。`,
        action: (
          <Link
            href={`${bbqSettingsPath()}?section=companion-album`}
            className="shrink-0 text-xs font-medium text-primary underline underline-offset-4"
          >
            {t`去换配图`}
          </Link>
        ),
        icon: <Images className="size-4" />,
        duration: 8_000,
      }),
    // Let the eight-second backup reminder finish before showing this one.
    8_500,
  );

  return null;
}
