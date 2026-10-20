import { Button, Input } from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import { ChevronDown, LoaderCircle, Trash2 } from "lucide-react";
import { isValidCleanupRange } from "@/lib/bbq/cleanup";
import type { SettingsData } from "../../_hooks/use-settings-data";
import {
  radioInputCls,
  radioOptionCls,
} from "../../_styles/data-settings-styles";
import { detailsChevronCls, detailsMotionCls } from "../../_styles/layout";
import {
  settingsActionCls,
  settingsCardCls,
  settingsInputCls,
  settingsSummaryCls,
} from "../../_styles/settings-styles";

export function CleanupSettings({
  data,
}: {
  data: Pick<
    SettingsData,
    | "task"
    | "startDate"
    | "setStartDate"
    | "endDate"
    | "setEndDate"
    | "photosOnly"
    | "setPhotosOnly"
    | "cleanup"
  >;
}) {
  const { t } = useLingui();
  const {
    task,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    photosOnly,
    setPhotosOnly,
    cleanup,
  } = data;
  return (
    <details className={`${settingsCardCls} ${detailsMotionCls}`}>
      <summary className={settingsSummaryCls}>
        <Trash2 className="size-4 text-primary" aria-hidden="true" />
        <h2 className="min-w-0 flex-1">
          <Trans>清理瘦身</Trans>
        </h2>
        <ChevronDown className={detailsChevronCls} aria-hidden="true" />
      </summary>
      <div className="min-h-0 overflow-clip">
        <fieldset
          disabled={task !== null}
          aria-busy={task === "cleanup"}
          className="flex min-w-0 flex-col gap-4 p-3 border-t border-border/60"
        >
          <legend className="sr-only">
            <Trans>清理瘦身</Trans>
          </legend>
          <p className="text-xs text-muted-foreground">
            <Trans>
              按记账日期筛选，包含起止日期。仅清理记录或记录中的图片，不会删除常用项目及标签数据。
            </Trans>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex min-w-0 flex-col gap-1 text-xs">
              <Trans>开始日期</Trans>
              <Input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
                className={settingsInputCls}
                required
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs">
              <Trans>结束日期</Trans>
              <Input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                className={settingsInputCls}
                required
              />
            </label>
          </div>
          <fieldset className="min-w-0">
            <legend className="mb-2 text-xs font-medium">
              <Trans>清理内容</Trans>
            </legend>
            <div className="flex flex-col gap-2">
              <label className={radioOptionCls}>
                <input
                  type="radio"
                  name="cleanup-mode"
                  value="photos"
                  checked={photosOnly}
                  onChange={() => setPhotosOnly(true)}
                  className={radioInputCls}
                />
                <Trans>仅移除图片，保留账目</Trans>
              </label>
              <label className={radioOptionCls}>
                <input
                  type="radio"
                  name="cleanup-mode"
                  value="records"
                  checked={!photosOnly}
                  onChange={() => setPhotosOnly(false)}
                  className={radioInputCls}
                />
                <Trans>移除记录及图片</Trans>
              </label>
            </div>
          </fieldset>
          <p className="text-xs text-muted-foreground">
            <Trans>清理后无法撤销，建议先导出包含图片的备份。</Trans>
          </p>
          <Button
            type="button"
            variant="ghost"
            disabled={!isValidCleanupRange(startDate, endDate)}
            className={`${settingsActionCls} text-destructive hover:bg-destructive/10 hover:text-destructive`}
            onClick={() => void cleanup()}
          >
            {task === "cleanup" ? (
              <LoaderCircle
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <Trash2 className="size-4" aria-hidden="true" />
            )}
            {task === "cleanup" ? t`清理中…` : t`清理所选范围`}
          </Button>
        </fieldset>
      </div>
    </details>
  );
}
