import {
  Collapsible,
  CollapsibleChevron,
  CollapsibleContent,
  CollapsibleTitle,
  CollapsibleTrigger,
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
  SettingsAction,
  SettingsRadioInput,
  SettingsRadioOption,
} from "./settings-ui";

export function BackupSettings({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
    <Collapsible
      data-settings-section="backup"
      open={open}
      onOpenChange={onOpenChange}
      variant="card"
    >
      <CollapsibleTrigger variant="flush">
        <DatabaseBackup data-icon="inline-start" aria-hidden="true" />
        <CollapsibleTitle>
          <Trans>备份&还原</Trans>
        </CollapsibleTitle>
        <CollapsibleChevron />
      </CollapsibleTrigger>
      <CollapsibleContent variant="collapse">
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
              <SettingsRadioOption>
                <SettingsRadioInput
                  type="radio"
                  name="backup-photos"
                  value="exclude"
                  checked={!includePhotos}
                  onChange={() => setIncludePhotos(false)}
                />
                <Trans>不含图片</Trans>
              </SettingsRadioOption>
              <SettingsRadioOption>
                <SettingsRadioInput
                  type="radio"
                  name="backup-photos"
                  value="include"
                  checked={includePhotos}
                  onChange={() => setIncludePhotos(true)}
                />
                <Trans>包含图片</Trans>
              </SettingsRadioOption>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <SettingsAction
                type="button"
                variant="ghost"
                onClick={() => void exportBackup()}
              >
                <FileDown className="size-4" aria-hidden="true" />
                <Trans>导出备份</Trans>
              </SettingsAction>
              <SettingsAction
                type="button"
                variant="ghost"
                onClick={() => importInputRef.current?.click()}
              >
                <FileUp className="size-4" aria-hidden="true" />
                <Trans>导入完整备份</Trans>
              </SettingsAction>
              <SettingsAction
                type="button"
                variant="ghost"
                onClick={() => void importSamples()}
              >
                <FlaskConical className="size-4" aria-hidden="true" />
                <Trans>导入示例数据</Trans>
              </SettingsAction>
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
      </CollapsibleContent>
    </Collapsible>
  );
}
