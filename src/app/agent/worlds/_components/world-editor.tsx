"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Input,
  Switch,
} from "@landing-page/design-system";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { worldRequest } from "@/lib/group-chat/client";
import {
  type Character,
  configSchema,
  type WorldConfig,
  type WorldPreset,
} from "@/lib/group-chat/model";
import { FieldGroup, TextField } from "./fields";

export function WorldEditor({
  initial,
  onSave,
  onCancel,
  lockedMembers = false,
  presets = [],
  onPresetSaved,
  submitLabel,
}: {
  initial: WorldConfig;
  onSave: (config: WorldConfig) => Promise<void>;
  onCancel: () => void;
  lockedMembers?: boolean;
  presets?: WorldPreset[];
  onPresetSaved?: () => void;
  submitLabel?: string;
}) {
  const [config, setConfig] = useState(() => structuredClone(initial));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [connection, setConnection] = useState("");
  const [presetId, setPresetId] = useState("");
  const [characterPresetIds, setCharacterPresetIds] = useState<
    Record<string, string>
  >({});
  function update<K extends keyof WorldConfig>(key: K, value: WorldConfig[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }
  function updateCharacter(id: string, patch: Partial<Character>) {
    setConfig((c) => ({
      ...c,
      characters: c.characters.map((character) =>
        character.id === id ? { ...character, ...patch } : character,
      ),
    }));
  }
  async function action(work: () => Promise<void>) {
    setPending(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setPending(false);
    }
  }
  async function savePreset(character?: Character) {
    await action(async () => {
      if (character) {
        const savedId = characterPresetIds[character.id];
        await worldRequest(
          savedId ? `presets/${savedId}` : "presets",
          savedId ? "PATCH" : "POST",
          {
            kind: "character",
            name: character.name,
            content: character,
          },
        );
      } else {
        const parsed = configSchema.safeParse(config);
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
        await worldRequest(
          presetId ? `presets/${presetId}` : "presets",
          presetId ? "PATCH" : "POST",
          { kind: "world", name: config.title, content: parsed.data },
        );
      }
      setConnection("预设已保存");
      onPresetSaved?.();
    });
  }
  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        void action(async () => {
          const parsed = configSchema.safeParse(config);
          if (!parsed.success) throw new Error(parsed.error.issues[0].message);
          await onSave(parsed.data);
        });
      }}
    >
      <fieldset
        disabled={pending}
        className="flex min-w-0 flex-col gap-8 disabled:opacity-60"
      >
        {!lockedMembers && presets.some((p) => p.kind === "world") ? (
          <FieldGroup>
            <label className="flex flex-col gap-2 text-sm font-medium">
              使用世界预设
              <select
                value={presetId}
                onChange={(e) => {
                  setPresetId(e.target.value);
                  const preset = presets.find((p) => p.id === e.target.value);
                  if (preset?.kind === "world")
                    setConfig(structuredClone(preset.content));
                }}
                className="h-10 rounded-xl border border-input bg-background px-3"
              >
                <option value="">自定义世界</option>
                {presets
                  .filter((p) => p.kind === "world")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
          </FieldGroup>
        ) : null}
        <section className="flex flex-col gap-5">
          <h3 className="text-lg font-semibold">世界与规则</h3>
          <FieldGroup>
            <TextField
              label="世界名称"
              value={config.title}
              onChange={(v) => update("title", v)}
              maxLength={60}
              required
            />
            <TextField
              label="背景故事"
              value={config.background}
              onChange={(v) => update("background", v)}
              multiline
              maxLength={8000}
              required
            />
            <TextField
              label="初始场景"
              value={config.scene}
              onChange={(v) => update("scene", v)}
              multiline
              maxLength={2000}
              required
            />
            <TextField
              label="世界规则"
              value={config.rules}
              onChange={(v) => update("rules", v)}
              multiline
              hint="例如：没有超自然力量、不替用户决定行动、使用简短对话。"
            />
            <TextField
              label="已确认的公共事实"
              value={config.facts}
              onChange={(v) => update("facts", v)}
              multiline
              hint="仅填写已经确认的事实；角色的猜测不自动成为事实。"
            />
          </FieldGroup>
        </section>
        <section className="flex flex-col gap-5">
          <h3 className="text-lg font-semibold">你的角色</h3>
          <FieldGroup>
            <TextField
              label="名字"
              value={config.userName}
              onChange={(v) => update("userName", v)}
              maxLength={30}
              required
            />
            <TextField
              label="身份与背景"
              value={config.userRole}
              onChange={(v) => update("userRole", v)}
              multiline
              maxLength={1000}
            />
          </FieldGroup>
        </section>
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">
              登场角色 · {config.characters.length}/6
            </h3>
            {!lockedMembers ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={config.characters.length >= 6}
                onClick={() =>
                  update("characters", [
                    ...config.characters,
                    {
                      id: crypto.randomUUID(),
                      name: "",
                      identity: "",
                      personality: "",
                      goal: "",
                      publicInfo: "",
                      privateInfo: "",
                      style: "",
                      model: "cursor/auto",
                      enabled: true,
                    },
                  ])
                }
              >
                <Plus data-icon="inline-start" />
                添加角色
              </Button>
            ) : null}
          </div>
          {config.characters.map((character, index) => (
            <details
              key={character.id}
              open={index === 0}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <summary className="cursor-pointer text-sm font-semibold">
                {character.name || `角色 ${index + 1}`} ·{" "}
                {character.identity || "待设定身份"}
                {character.enabled ? "" : "（已禁用）"}
              </summary>
              <div className="mt-5 flex flex-col gap-5">
                {presets.some((p) => p.kind === "character") ? (
                  <label className="flex flex-col gap-2 text-sm">
                    使用角色预设
                    <select
                      value={characterPresetIds[character.id] ?? ""}
                      onChange={(e) => {
                        setCharacterPresetIds((ids) => ({
                          ...ids,
                          [character.id]: e.target.value,
                        }));
                        const preset = presets.find(
                          (p) => p.id === e.target.value,
                        );
                        if (preset?.kind === "character")
                          updateCharacter(character.id, {
                            ...preset.content,
                            id: character.id,
                          });
                      }}
                      className="h-10 rounded-xl border border-input bg-background px-3"
                    >
                      <option value="">选择预设</option>
                      {presets
                        .filter((p) => p.kind === "character")
                        .map((p) => (
                          <option value={p.id} key={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </label>
                ) : null}
                <FieldGroup>
                  <TextField
                    label="角色名"
                    value={character.name}
                    onChange={(name) => updateCharacter(character.id, { name })}
                    maxLength={30}
                    required
                  />
                  <TextField
                    label="身份"
                    value={character.identity}
                    onChange={(identity) =>
                      updateCharacter(character.id, { identity })
                    }
                    maxLength={300}
                    required
                  />
                  <TextField
                    label="性格"
                    value={character.personality}
                    onChange={(personality) =>
                      updateCharacter(character.id, { personality })
                    }
                    maxLength={600}
                    required
                  />
                  <TextField
                    label="个人目标"
                    value={character.goal}
                    onChange={(goal) => updateCharacter(character.id, { goal })}
                    maxLength={600}
                    required
                    hint="只提供给该角色。希望其他人知道的目标请写入公开背景。"
                  />
                  <TextField
                    label="公开背景"
                    value={character.publicInfo}
                    onChange={(publicInfo) =>
                      updateCharacter(character.id, { publicInfo })
                    }
                    multiline
                    maxLength={1200}
                  />
                  <TextField
                    label="秘密与私有知识"
                    value={character.privateInfo}
                    onChange={(privateInfo) =>
                      updateCharacter(character.id, { privateInfo })
                    }
                    multiline
                    maxLength={1200}
                    hint="房主可见；只发送给该角色，不提供给其他角色或调度器。"
                  />
                  <TextField
                    label="说话风格"
                    value={character.style}
                    onChange={(style) =>
                      updateCharacter(character.id, { style })
                    }
                    maxLength={300}
                  />
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    模型
                    <Input
                      value={character.model}
                      onChange={(e) =>
                        updateCharacter(character.id, { model: e.target.value })
                      }
                      list="world-models"
                      maxLength={160}
                      required
                    />
                  </label>
                </FieldGroup>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={character.enabled}
                      onCheckedChange={(enabled) =>
                        updateCharacter(character.id, { enabled })
                      }
                    />
                    允许发言
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void savePreset(character)}
                  >
                    {characterPresetIds[character.id]
                      ? "更新角色预设"
                      : "保存角色预设"}
                  </Button>
                  {!lockedMembers ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={config.characters.length <= 2}
                      onClick={() =>
                        update(
                          "characters",
                          config.characters.filter(
                            (c) => c.id !== character.id,
                          ),
                        )
                      }
                    >
                      <Trash2 data-icon="inline-start" />
                      移除
                    </Button>
                  ) : null}
                </div>
              </div>
            </details>
          ))}
        </section>
        <section className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold">对话节奏</h3>
          <p className="text-xs leading-5 text-muted-foreground">
            角色会依据各自设定主动推进故事，每次只由一位角色发言，回复完成后立即安排下一条。点名角色优先回应，之后恢复自动调度；你可以随时暂停，或使用“仅下一条”。需要你做决定时，故事会停下来等待。
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                void action(async () => {
                  const result = await worldRequest<{ models: string[] }>(
                    "models",
                  );
                  setModels(result.models);
                  setConnection(
                    `已获取 ${result.models.length} 个模型，可在模型输入框选择。`,
                  );
                })
              }
            >
              获取代理模型
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                void action(async () => {
                  await worldRequest("connection", "POST", {
                    model: config.characters[0].model,
                  });
                  setConnection("连接成功，纯文本流式响应正常。");
                })
              }
            >
              测试连接（调用一次模型）
            </Button>
          </div>
          <datalist id="world-models">
            {models.map((model) => (
              <option value={model} key={model} />
            ))}
          </datalist>
          {connection ? (
            <p className="text-sm text-muted-foreground">{connection}</p>
          ) : null}
        </section>
      </fieldset>
      {error ? (
        <Alert className="text-destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="sticky bottom-0 flex flex-wrap gap-3 border-t border-border bg-background py-4">
        <Button type="submit" disabled={pending}>
          {pending
            ? "正在保存…"
            : submitLabel || (lockedMembers ? "保存设定" : "创建世界")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => void savePreset()}
        >
          {presetId ? "更新世界预设" : "保存为世界预设"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={onCancel}
        >
          取消
        </Button>
      </div>
    </form>
  );
}
