"use client";

import { Button, Switch } from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import { Folder, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import {
  groupNameLength,
  MAX_GROUP_NAME_LENGTH,
  requireGroupName,
} from "@/lib/bbq/grouping";
import { bbqStore } from "@/lib/bbq/idb-store";
import { BbqStoreError } from "@/lib/bbq/store";
import type { GroupingSettings } from "@/lib/bbq/types";
import { useGroupingSettings } from "../../_hooks/use-grouping-settings";
import { errorMessage } from "../../_lib/errors";
import { BookkeepingCard } from "../shared/bookkeeping-layout";
import { SettingsInput } from "./settings-ui";

export function GroupingSettingsCard({ disabled }: { disabled: boolean }) {
  const { i18n, t } = useLingui();
  const { settings, error: loadError } = useGroupingSettings();
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const count = groupNameLength(name.trim());

  async function save(next: GroupingSettings, added = false) {
    if (busy.current || disabled) return;
    busy.current = true;
    setPending(true);
    setMessage(null);
    try {
      await bbqStore.saveGroupingSettings(next);
      if (added) setName("");
    } catch (error) {
      setMessage(errorMessage(i18n, error));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  function add() {
    if (!settings) return;
    try {
      const group = requireGroupName(name);
      if (settings.names.includes(group))
        throw new BbqStoreError("group_exists");
      void save({ ...settings, names: [...settings.names, group] }, true);
    } catch (error) {
      setMessage(errorMessage(i18n, error));
    }
  }

  return (
    <BookkeepingCard>
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <h2
          id="grouping-setting-label"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <Folder className="size-4 text-primary" aria-hidden="true" />
          <Trans>启用分组</Trans>
        </h2>
        <Switch
          aria-labelledby="grouping-setting-label"
          checked={settings?.enabled ?? false}
          disabled={disabled || pending || !settings}
          onCheckedChange={(enabled) => {
            if (settings) void save({ ...settings, enabled });
          }}
        />
      </div>
      {settings?.enabled ? (
        <fieldset
          disabled={disabled || pending}
          aria-busy={pending}
          className="min-w-0 border-t border-border/60 p-3 flex flex-col gap-3"
        >
          <legend className="sr-only">
            <Trans>自定义分组</Trans>
          </legend>
          <p className="text-xs text-muted-foreground">
            <Trans>名称最多 10 个字符，支持任意文字和符号。</Trans>
          </p>
          <div className="flex min-w-0 items-center gap-2">
            <SettingsInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-label={t`分组名称`}
              placeholder={t`输入分组名称`}
              aria-invalid={count > MAX_GROUP_NAME_LENGTH}
              aria-describedby="group-name-count"
              className="min-w-0 flex-1"
            />
            <Button
              type="button"
              variant="subtle"
              className="h-11 shrink-0 rounded-lg px-3"
              disabled={!name.trim() || count > MAX_GROUP_NAME_LENGTH}
              onClick={add}
            >
              {pending ? (
                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <Plus className="size-4" />
              )}
              <Trans>添加分组</Trans>
            </Button>
          </div>
          <p
            id="group-name-count"
            className="text-xs tabular-nums text-muted-foreground"
          >
            {count}/{MAX_GROUP_NAME_LENGTH}
          </p>
          {settings.names.length ? (
            <ul className="divide-y divide-border/60">
              {settings.names.map((group) => (
                <li
                  key={group}
                  className="flex min-w-0 items-center justify-between gap-2 py-1"
                >
                  <span className="min-w-0 break-all text-sm">{group}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={t`删除分组 ${group}`}
                    onClick={() =>
                      void save({
                        ...settings,
                        names: settings.names.filter((item) => item !== group),
                      })
                    }
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              <Trans>添加分组后，即可在记账时选择。</Trans>
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            <Trans>删除分组不会影响已有记录。</Trans>
          </p>
        </fieldset>
      ) : null}
      {message || loadError ? (
        <p className="px-3 pb-3 text-xs text-destructive" role="alert">
          {message ?? errorMessage(i18n, loadError)}
        </p>
      ) : null}
    </BookkeepingCard>
  );
}
