"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Collapsible,
  CollapsibleChevron,
  CollapsibleContent,
  CollapsibleTitle,
  CollapsibleTrigger,
  Input,
  SelectItem,
  Switch,
} from "@landing-page/design-system";
import {
  BookOpen,
  Plus,
  ScrollText,
  SlidersHorizontal,
  Trash2,
  Users,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { worldRequest } from "@/lib/group-chat/client";
import {
  type Character,
  configSchema,
  type WorldConfig,
  type WorldKind,
  type WorldPreset,
} from "@/lib/group-chat/model";
import { CharacterAvatar } from "./character-avatar";
import { FieldGroup, TextField } from "./fields";
import type { NovelWritingContext } from "./novel/model";
import { PriorContextField } from "./prior-context-field";
import { WorldSelect } from "./world-select";

type SectionKey = "world" | "story" | "cast" | "pace";

const noPreset = "no-preset";

function preview(value: string, fallback: string) {
  const line = value.trim().split("\n")[0] ?? "";
  return line || fallback;
}

function EditorSection({
  id,
  open,
  onOpenChange,
  title,
  summary,
  icon: Icon,
  actions,
  plain = false,
  children,
}: {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  summary: string;
  icon: typeof BookOpen;
  actions?: ReactNode;
  plain?: boolean;
  children: ReactNode;
}) {
  return (
    <Collapsible
      id={id}
      variant={plain ? "plain" : "card"}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="flex items-center">
        <CollapsibleTrigger variant="flush" className="min-w-0 flex-1">
          <Icon data-icon="inline-start" aria-hidden="true" />
          <CollapsibleTitle>
            <span className="block truncate font-serif text-base font-normal">
              {title}
            </span>
            <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground group-data-[state=open]/collapsible-trigger:hidden">
              {summary}
            </span>
          </CollapsibleTitle>
          <CollapsibleChevron />
        </CollapsibleTrigger>
        {actions ? (
          <div className="flex shrink-0 items-center pr-3">{actions}</div>
        ) : null}
      </div>
      <CollapsibleContent variant="collapse">
        <div
          className={
            plain
              ? "flex flex-col gap-4 px-3 pt-1 pb-2"
              : "flex flex-col gap-4 border-t border-border px-4 py-4"
          }
        >
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function WorldEditor({
  initial,
  onSave,
  onCancel,
  lockedMembers = false,
  presets = [],
  onPresetSaved,
  submitLabel,
  kind,
  initialNovelContext,
  plain = false,
}: {
  initial: WorldConfig;
  onSave: (
    config: WorldConfig,
    novelContext?: NovelWritingContext,
  ) => Promise<void>;
  onCancel: () => void;
  lockedMembers?: boolean;
  presets?: WorldPreset[];
  onPresetSaved?: () => void;
  submitLabel?: string;
  kind: WorldKind;
  initialNovelContext?: NovelWritingContext;
  plain?: boolean;
}) {
  const [config, setConfig] = useState(() => structuredClone(initial));
  const [novelContext, setNovelContext] = useState(initialNovelContext);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [importing, setImporting] = useState(false);
  const novel = kind === "novel";
  const [models, setModels] = useState<string[]>([]);
  const [connection, setConnection] = useState("");
  const [presetId, setPresetId] = useState("");
  const [characterPresetIds, setCharacterPresetIds] = useState<
    Record<string, string>
  >({});
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(
    () =>
      lockedMembers
        ? { world: false, story: true, cast: false, pace: false }
        : { world: true, story: false, cast: true, pace: false },
  );
  const [openCharacterIds, setOpenCharacterIds] = useState<Set<string>>(
    () =>
      new Set(
        lockedMembers || !initial.characters[0]
          ? []
          : [initial.characters[0].id],
      ),
  );
  function setSection(key: SectionKey, open: boolean) {
    setOpenSections((sections) => ({ ...sections, [key]: open }));
  }
  function update<K extends keyof WorldConfig>(key: K, value: WorldConfig[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }
  function updateNovelContext<K extends keyof NovelWritingContext>(
    key: K,
    value: NovelWritingContext[K],
  ) {
    setNovelContext((current) =>
      current ? { ...current, [key]: value } : current,
    );
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
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (pending || importing) return;
        void action(async () => {
          const writingContext = novel ? novelContext : undefined;
          if (writingContext && !writingContext.title.trim())
            throw new Error("请填写小说名称");
          const nextConfig = writingContext
            ? {
                ...config,
                storyGoal: writingContext.outline.trim().slice(0, 4000),
              }
            : config;
          const parsed = configSchema.safeParse(nextConfig);
          if (!parsed.success) throw new Error(parsed.error.issues[0].message);
          await onSave(parsed.data, writingContext);
        });
      }}
    >
      <div
        className={
          plain
            ? "flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-y-contain px-5 py-4"
            : "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain px-5 py-4"
        }
      >
        <fieldset
          disabled={pending || importing}
          className="flex min-w-0 flex-col gap-3 disabled:opacity-60"
        >
          {!lockedMembers && presets.some((p) => p.kind === "world") ? (
            <div className="flex flex-col gap-2 px-1 text-sm font-medium">
              <span>使用世界预设</span>
              <WorldSelect
                label="使用世界预设"
                value={presetId || noPreset}
                disabled={pending || importing}
                onValueChange={(value) => {
                  setPresetId(value === noPreset ? "" : value);
                  const preset = presets.find((p) => p.id === value);
                  if (preset?.kind === "world")
                    setConfig((current) => ({
                      ...structuredClone(preset.content),
                      priorContext:
                        current.priorContext ?? preset.content.priorContext,
                    }));
                }}
                className="w-full"
              >
                <SelectItem value={noPreset}>自定义世界</SelectItem>
                {presets
                  .filter((p) => p.kind === "world")
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
              </WorldSelect>
            </div>
          ) : null}
          <EditorSection
            id="world-section-world"
            open={openSections.world}
            onOpenChange={(open) => setSection("world", open)}
            title="世界与规则"
            summary={preview(config.title, "未命名世界")}
            icon={BookOpen}
            plain={plain}
          >
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
              <PriorContextField
                value={config.priorContext ?? ""}
                onChange={(value) => update("priorContext", value)}
                onImportingChange={setImporting}
              />
              <TextField
                label="世界规则"
                value={config.rules}
                onChange={(v) => update("rules", v)}
                multiline
                hint="例如：没有超自然力量、NPC 自主作出选择、使用简短对话。"
              />
              <TextField
                label="已确认的公共事实"
                value={config.facts}
                onChange={(v) => update("facts", v)}
                multiline
                hint="仅填写已经确认的事实；角色的猜测不自动成为事实。"
              />
            </FieldGroup>
          </EditorSection>
          <EditorSection
            id="world-section-story"
            open={openSections.story}
            onOpenChange={(open) => setSection("story", open)}
            title={
              novel ? (novelContext ? "创作设定" : "小说大纲") : "故事推进要求"
            }
            summary={preview(
              novel && novelContext ? novelContext.outline : config.storyGoal,
              !novel && config.narration ? "旁白已打开" : "未填写目标",
            )}
            icon={ScrollText}
            plain={plain}
          >
            <FieldGroup>
              {novel && novelContext ? (
                <>
                  <TextField
                    label="小说名称"
                    value={novelContext.title}
                    onChange={(title) => updateNovelContext("title", title)}
                    maxLength={100}
                    required
                  />
                  <TextField
                    label="文风与叙述视角"
                    value={novelContext.style}
                    onChange={(style) => updateNovelContext("style", style)}
                    multiline
                  />
                  <TextField
                    label="小说大纲与创作要求"
                    value={novelContext.outline}
                    onChange={(outline) =>
                      updateNovelContext("outline", outline)
                    }
                    multiline
                    maxLength={12000}
                    hint="沿用世界背景、规则与全部角色设定；角色秘密由作者统一掌握，按剧情逐步揭示。"
                  />
                </>
              ) : (
                <TextField
                  label={novel ? "大纲与创作要求" : "当前目标与节奏"}
                  value={config.storyGoal}
                  onChange={(v) => update("storyGoal", v)}
                  multiline
                  maxLength={4000}
                  hint={
                    novel
                      ? undefined
                      : "例如：先让大家调查停电原因，再逐步揭露各自隐瞒的线索。你是系统操作者，所有登场角色都是 NPC。"
                  }
                />
              )}
              {!novel ? (
                <label className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2.5 text-sm">
                  <span>
                    <span className="font-medium">旁白</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      打开后由旁白叙述场景和事件。对话角色只说自己的话。
                    </span>
                  </span>
                  <Switch
                    checked={config.narration}
                    onCheckedChange={(narration) =>
                      update("narration", narration)
                    }
                  />
                </label>
              ) : null}
            </FieldGroup>
          </EditorSection>
          <EditorSection
            id="world-section-cast"
            open={openSections.cast}
            onOpenChange={(open) => setSection("cast", open)}
            title={`${novel ? "角色" : "NPC"} · ${config.characters.length}/7`}
            summary={
              config.characters
                .map(
                  (character, index) => character.name || `角色 ${index + 1}`,
                )
                .join("、") || "还没有角色"
            }
            icon={Users}
            actions={
              !lockedMembers ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={config.characters.length >= 7}
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
              ) : null
            }
            plain={plain}
          >
            <div className="flex flex-col gap-3">
              {config.characters.map((character, index) => (
                <Collapsible
                  key={character.id}
                  variant={plain ? "plain" : "card"}
                  className={plain ? "rounded-lg bg-muted/30" : undefined}
                  open={openCharacterIds.has(character.id)}
                  onOpenChange={(open) =>
                    setOpenCharacterIds((current) => {
                      const next = new Set(current);
                      if (open) next.add(character.id);
                      else next.delete(character.id);
                      return next;
                    })
                  }
                >
                  <CollapsibleTrigger
                    variant="flush"
                    className={character.enabled ? undefined : "opacity-60"}
                  >
                    <CharacterAvatar
                      id={character.id}
                      name={character.name || `角色 ${index + 1}`}
                      avatar={character.avatar}
                    />
                    <CollapsibleTitle>
                      <span className="block truncate">
                        {character.name || `角色 ${index + 1}`}
                        {character.enabled ? null : (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {novel ? "备用模型" : "已禁用"}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground group-data-[state=open]/collapsible-trigger:hidden">
                        {character.identity || "待设定身份"}
                      </span>
                    </CollapsibleTitle>
                    <CollapsibleChevron />
                  </CollapsibleTrigger>
                  <CollapsibleContent variant="collapse">
                    <div
                      className={
                        plain
                          ? "flex flex-col gap-4 px-4 pt-1 pb-4"
                          : "flex flex-col gap-4 border-t border-border px-4 py-4"
                      }
                    >
                      {presets.some((p) => p.kind === "character") ? (
                        <div className="flex flex-col gap-2 text-sm">
                          <span>使用角色预设</span>
                          <WorldSelect
                            label="使用角色预设"
                            value={characterPresetIds[character.id] || noPreset}
                            disabled={pending || importing}
                            onValueChange={(value) => {
                              setCharacterPresetIds((ids) => ({
                                ...ids,
                                [character.id]: value === noPreset ? "" : value,
                              }));
                              const preset = presets.find(
                                (p) => p.id === value,
                              );
                              if (preset?.kind === "character")
                                updateCharacter(character.id, {
                                  ...preset.content,
                                  id: character.id,
                                });
                            }}
                            className="w-full"
                          >
                            <SelectItem value={noPreset}>选择预设</SelectItem>
                            {presets
                              .filter((p) => p.kind === "character")
                              .map((p) => (
                                <SelectItem value={p.id} key={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                          </WorldSelect>
                        </div>
                      ) : null}
                      <FieldGroup>
                        <TextField
                          label="角色名"
                          value={character.name}
                          onChange={(name) =>
                            updateCharacter(character.id, { name })
                          }
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
                          onChange={(goal) =>
                            updateCharacter(character.id, { goal })
                          }
                          maxLength={600}
                          required
                          hint={
                            novel
                              ? undefined
                              : "只提供给该角色。希望其他人知道的目标请写入公开背景。"
                          }
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
                          hint={
                            novel
                              ? "由作者掌握，按剧情逐步揭示。"
                              : "房主可见；只发送给该角色，不提供给其他角色或调度器。"
                          }
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
                              updateCharacter(character.id, {
                                model: e.target.value,
                              })
                            }
                            list="world-models"
                            maxLength={160}
                            required
                          />
                        </label>
                      </FieldGroup>
                      <div
                        className={
                          plain
                            ? "flex items-center justify-between gap-3"
                            : "flex items-center justify-between gap-3 border-t border-border pt-3"
                        }
                      >
                        <label className="flex items-center gap-2 text-sm">
                          <Switch
                            checked={character.enabled}
                            onCheckedChange={(enabled) =>
                              updateCharacter(character.id, { enabled })
                            }
                          />
                          {novel ? "候选写作模型" : "允许发言"}
                        </label>
                        <div className="flex items-center gap-1">
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
                              className="text-destructive"
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
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </EditorSection>
          <EditorSection
            id="world-section-pace"
            open={openSections.pace}
            onOpenChange={(open) => setSection("pace", open)}
            title={novel ? "写作模型" : "对话节奏"}
            summary={
              novel ? "采用第一个启用的候选模型" : "自动推进，可改成旁白或角色"
            }
            icon={SlidersHorizontal}
            plain={plain}
          >
            {!novel ? (
              <p className="text-sm leading-6 text-muted-foreground">
                进入新世界后，NPC
                会依据设定和推进要求自动行动，逐条接话，不等待你回答。输入默认是系统干预，也可以改成旁白或某个角色；你还可以暂停、点名或使用“仅下一条”。
              </p>
            ) : null}
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
                      model:
                        (novel
                          ? config.characters.find((c) => c.enabled)
                          : undefined
                        )?.model ?? config.characters[0].model,
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
          </EditorSection>
        </fieldset>
      </div>
      <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-card px-5 py-3">
        {error ? (
          <Alert className="text-destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {connection ? (
          <p className="text-xs leading-5 text-muted-foreground">
            {connection}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={onCancel}
          >
            取消
          </Button>
          <div className="flex min-w-0 flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={pending || importing}
              onClick={() => void savePreset()}
            >
              {presetId ? "更新世界预设" : "保存为世界预设"}
            </Button>
            <Button type="submit" disabled={pending || importing}>
              {pending
                ? "正在保存…"
                : submitLabel || (lockedMembers ? "保存设定" : "创建世界")}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
