"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Switch,
} from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "ahooks";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cls } from "@/app/[lang]/bookkeeping/_styles/layout";
import { AnnouncementTimeline } from "@/components/bookkeeping/announcement-timeline";
import { Link } from "@/components/link/link";
import { getBuiltinAnnouncements } from "@/lib/bookkeeping-announcements/builtin";
import {
  AnnouncementRequestError,
  announcementRequest,
  useAnnouncementFeed,
} from "@/lib/bookkeeping-announcements/client";
import type {
  Announcement,
  AnnouncementInput,
} from "@/lib/bookkeeping-announcements/model";

const fieldCls = cls`flex min-w-0 flex-col gap-1.5 text-sm`;
const bodyInputCls = cls`min-h-40 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring`;
const endpoint = "/api/admin/bookkeeping/announcements";

function localDateTime(iso: string) {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function AnnouncementManager() {
  const { t, i18n } = useLingui();
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const query = useDebounce(search.trim().slice(0, 100), { wait: 300 });
  const feed = useAnnouncementFeed(i18n.locale, query, true);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [formRevision, setFormRevision] = useState(0);
  const [notice, setNotice] = useState("");
  const save = useMutation({
    mutationFn: (input: AnnouncementInput & { id?: string }) =>
      announcementRequest(endpoint, {
        method: input.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      setEditing(null);
      setFormRevision((value) => value + 1);
      setNotice(t`公告已保存`);
      void client.invalidateQueries({
        queryKey: ["bookkeeping-announcements"],
      });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      announcementRequest(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }),
    onSuccess: (_, id) => {
      if (editing?.id === id) {
        setEditing(null);
        setFormRevision((value) => value + 1);
      }
      setNotice(t`公告已删除`);
      void client.invalidateQueries({
        queryKey: ["bookkeeping-announcements"],
      });
    },
  });
  const denied =
    feed.error instanceof AnnouncementRequestError &&
    [401, 403].includes(feed.error.status);
  const items = [
    ...new Map(
      (feed.data?.pages.flatMap((page) => page.items) ?? []).map((item) => [
        item.id,
        item,
      ]),
    ).values(),
  ];
  const busy = save.isPending || remove.isPending;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 py-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            <Trans>记账公告管理</Trans>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <Trans>管理面向所有记账用户的公告</Trans>
          </p>
        </div>
        <Button asChild size="sm" variant="ghost">
          <Link href="/admin">
            <Trans>返回管理入口</Trans>
          </Link>
        </Button>
      </header>
      {denied ? (
        <Alert>
          <AlertDescription>
            <Trans>需要管理员权限，请使用管理员账号登录。</Trans>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {notice ? (
            <p role="status" className="text-sm text-primary">
              {notice}
            </p>
          ) : null}
          {save.isError || remove.isError ? (
            <Alert>
              <AlertDescription>
                <Trans>操作失败，请检查输入、登录状态或网络后重试。</Trans>
              </AlertDescription>
            </Alert>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>{editing ? t`编辑公告` : t`新建公告`}</CardTitle>
              <CardDescription>
                <Trans>保存为草稿，或开启发布后按指定时间展示。</Trans>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnnouncementForm
                key={`${editing?.id ?? "new"}:${formRevision}`}
                item={editing}
                busy={busy || !feed.data}
                onSave={(input) => {
                  setNotice("");
                  remove.reset();
                  save.mutate({
                    ...input,
                    ...(editing ? { id: editing.id } : {}),
                  });
                }}
                onCancel={() => {
                  setEditing(null);
                  save.reset();
                }}
              />
            </CardContent>
          </Card>
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">
              <Trans>公告列表</Trans>
            </h2>
            <Input
              value={search}
              maxLength={100}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t`搜索公告…`}
              aria-label={t`搜索公告…`}
            />
            {feed.isError ? (
              <Alert>
                <AlertDescription>
                  <Trans>加载失败，请稍后重试。</Trans>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={feed.isFetching}
                    onClick={() =>
                      void (feed.isFetchNextPageError
                        ? feed.fetchNextPage()
                        : feed.refetch())
                    }
                  >
                    <Trans>Retry</Trans>
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            {items.map((item) => (
              <article
                key={item.id}
                className="flex items-start gap-3 rounded-xl border bg-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words text-sm font-medium">
                      {item.title}
                    </h3>
                    {item.pinned ? (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                        置顶
                      </span>
                    ) : null}
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {!item.published
                        ? t`草稿`
                        : Date.parse(item.publishedAt) > Date.now()
                          ? t`待发布`
                          : t`已发布`}
                    </span>
                  </div>
                  <time
                    className="mt-1 block text-xs text-muted-foreground"
                    dateTime={item.publishedAt}
                  >
                    {new Date(item.publishedAt).toLocaleString(i18n.locale)}
                  </time>
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {item.body}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 [&_svg]:size-4"
                    title={t`编辑公告`}
                    aria-label={t`编辑公告`}
                    disabled={busy}
                    onClick={() => {
                      setEditing(item);
                      save.reset();
                      remove.reset();
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 [&_svg]:size-4"
                    title={t`删除公告`}
                    aria-label={t`删除公告`}
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          t`确定删除公告“${item.title}”？此操作无法撤销。`,
                        )
                      ) {
                        setNotice("");
                        save.reset();
                        remove.mutate(item.id);
                      }
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </article>
            ))}
            {feed.isPending ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                <Trans>加载公告中…</Trans>
              </p>
            ) : items.length === 0 && !feed.isError ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                <Trans>暂无匹配的公告</Trans>
              </p>
            ) : null}
            {feed.hasNextPage ? (
              <Button
                variant="outline"
                disabled={feed.isFetching}
                onClick={() => void feed.fetchNextPage()}
              >
                <Trans>加载更早的公告</Trans>
              </Button>
            ) : null}
          </section>
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer text-sm font-medium">
              <Trans>代码内置公告（只读）</Trans>
            </summary>
            <p className="my-3 text-xs text-muted-foreground">
              <Trans>这些公告随应用更新，无法在管理页修改。</Trans>
            </p>
            <AnnouncementTimeline
              items={getBuiltinAnnouncements(i18n.locale)}
            />
          </details>
        </>
      )}
    </div>
  );
}

function AnnouncementForm({
  item,
  busy,
  onSave,
  onCancel,
}: {
  item: Announcement | null;
  busy: boolean;
  onSave: (input: AnnouncementInput) => void;
  onCancel: () => void;
}) {
  const { t } = useLingui();
  const [title, setTitle] = useState(item?.title ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [published, setPublished] = useState(item?.published ?? false);
  const [pinned, setPinned] = useState(item?.pinned ?? false);
  const [time, setTime] = useState(() =>
    item ? localDateTime(item.publishedAt) : "",
  );
  useEffect(() => {
    // New drafts use the browser's local clock after hydration.
    if (!item) setTime(localDateTime(new Date().toISOString()));
  }, [item]);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (
          busy ||
          !title.trim() ||
          !body.trim() ||
          !Number.isFinite(Date.parse(time))
        )
          return;
        onSave({
          title,
          body,
          published,
          pinned,
          publishedAt:
            item && time === localDateTime(item.publishedAt)
              ? item.publishedAt
              : new Date(time).toISOString(),
        });
      }}
    >
      <fieldset disabled={busy} className="flex flex-col gap-4">
        <label className={fieldCls}>
          <span>
            <Trans>公告标题</Trans>
          </span>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={120}
          />
        </label>
        <label className={fieldCls}>
          <span>
            <Trans>公告内容</Trans>
          </span>
          <textarea
            className={bodyInputCls}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
            maxLength={20000}
          />
        </label>
        <label className={fieldCls}>
          <span>
            <Trans>发布时间（本地时间）</Trans>
          </span>
          <Input
            type="datetime-local"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            required
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={published}
              onCheckedChange={setPublished}
              aria-label={t`发布公告`}
            />
            <Trans>发布公告</Trans>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={pinned}
              onCheckedChange={setPinned}
              aria-label="置顶公告"
            />
            置顶公告
          </label>
          <div className="flex gap-2">
            {item ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
              >
                <Trans>取消编辑</Trans>
              </Button>
            ) : null}
            <Button
              type="submit"
              size="sm"
              disabled={!title.trim() || !body.trim()}
            >
              {item ? <Save className="size-4" /> : <Plus className="size-4" />}
              {busy ? t`保存中…` : t`保存`}
            </Button>
          </div>
        </div>
      </fieldset>
    </form>
  );
}
