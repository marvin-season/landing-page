import {
  Button,
  DetailsChevron,
  DetailsContent,
  DetailsSummary,
} from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  DatabaseBackup,
  FileDown,
  FileUp,
  FlaskConical,
  LoaderCircle,
} from "lucide-react";
import { useRef } from "react";
import type { SettingsData } from "../../_hooks/use-settings-data";
import {
  radioInputCls,
  radioOptionCls,
} from "../../_styles/data-settings-styles";
import {
  settingsActionCls,
  settingsCardCls,
} from "../../_styles/settings-styles";

import { SettingsDetails } from "./settings-details";

export function BackupSettings({
  section,
  data,
}: {
  section: string | null;
  data: Pick<
    SettingsData,
    | "task"
    | "includePhotos"
    | "setIncludePhotos"
    | "exportBackup"
    | "importFile"
    | "importSamples"
  >;
}) {
  const { t } = useLingui();
  const importInputRef = useRef<HTMLInputElement>(null);
  const {
    task,
    includePhotos,
    setIncludePhotos,
    exportBackup,
    importFile,
    importSamples,
  } = data;
  return (
    <SettingsDetails
      data-settings-section="backup"
      open={section === "backup"}
      className={settingsCardCls}
    >
      <DetailsSummary variant="flush">
        <DatabaseBackup className="size-4 text-primary" aria-hidden="true" />
        <h2 className="min-w-0 flex-1">
          <Trans>备份&还原</Trans>
        </h2>
        <DetailsChevron aria-hidden="true" />
      </DetailsSummary>
      <DetailsContent>
        <div className="flex flex-col gap-4 p-3 border-t border-border/60">
          <p className="text-xs text-muted-foreground">
            <Trans>
              保存一份记录和常用项目，换设备也能带走。备份不包含自定义图集，图集需单独导出；下方“图片”仅指记录中添加的图片。
            </Trans>
          </p>

          <fieldset
            disabled={task !== null}
            aria-busy={task === "import" || task === "export"}
            className="min-w-0"
          >
            <legend className="mb-2 text-xs font-medium">
              <Trans>导出图片</Trans>
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <label className={radioOptionCls}>
                <input
                  type="radio"
                  name="backup-photos"
                  value="exclude"
                  checked={!includePhotos}
                  onChange={() => setIncludePhotos(false)}
                  className={radioInputCls}
                />
                <Trans>不含图片</Trans>
              </label>
              <label className={radioOptionCls}>
                <input
                  type="radio"
                  name="backup-photos"
                  value="include"
                  checked={includePhotos}
                  onChange={() => setIncludePhotos(true)}
                  className={radioInputCls}
                />
                <Trans>包含图片</Trans>
              </label>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <Button
                type="button"
                variant="ghost"
                className={settingsActionCls}
                onClick={() => void exportBackup()}
              >
                <FileDown className="size-4" aria-hidden="true" />
                <Trans>导出备份</Trans>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={settingsActionCls}
                onClick={() => importInputRef.current?.click()}
              >
                <FileUp className="size-4" aria-hidden="true" />
                <Trans>导入完整备份</Trans>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={settingsActionCls}
                onClick={() => void importSamples()}
              >
                <FlaskConical className="size-4" aria-hidden="true" />
                <Trans>导入示例数据</Trans>
              </Button>
              <p className="text-xs text-muted-foreground">
                <Trans>
                  3 个常用项目，最近三天共 4
                  条记录。保留已有数据，重复导入不重复添加。
                </Trans>
              </p>
            </div>
          </fieldset>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            disabled={task !== null}
            onChange={(event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              input.value = "";
              void importFile(file);
            }}
          />
          {task === "import" || task === "export" ? (
            <p
              className="flex items-center gap-2 text-xs text-muted-foreground"
              role="status"
            >
              <LoaderCircle
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              {task === "import" ? t`导入中…` : t`导出中…`}
            </p>
          ) : null}
        </div>
      </DetailsContent>
    </SettingsDetails>
  );
}
