import { Button } from "@landing-page/design-system";
import { ArrowRight, BookOpen, MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getSiteOrigin } from "@/lib/site-origin";
import {
  worldsHomePath,
  worldsTemplatesPath,
  worldsWorksPath,
} from "@/lib/worlds-paths";
import { WorldLobbyNav } from "./_components/world-lobby-nav";

const title = "开放世界｜AI 小说续写与多角色剧本创作";
const description =
  "开放世界是一个 AI 故事创作工作台。用小说模式逐章续写、润色和整理剧情，或用剧本模式设定世界与角色，推动多角色对话。支持从预设模板开始，也可以导入已有小说。";

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(await getSiteOrigin()),
    title,
    description,
    alternates: { canonical: worldsHomePath },
    openGraph: {
      type: "website",
      locale: "zh_CN",
      url: worldsHomePath,
      title,
      description,
    },
  };
}

export default function WorldsPage() {
  return (
    <div lang="zh-CN" className="min-h-full bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link href={worldsHomePath} className="font-serif text-lg">
            开放世界
          </Link>
          <WorldLobbyNav />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <section className="grid items-center gap-10 py-14 md:grid-cols-[1.2fr_1fr] md:py-24 lg:gap-20">
          <div className="space-y-6">
            <h1 className="font-serif text-4xl leading-tight text-balance sm:text-5xl lg:text-6xl">
              AI 小说续写与
              <br className="hidden sm:block" />
              多角色剧本创作
            </h1>
            <p className="max-w-md text-base leading-8 text-muted-foreground">
              为你的故事设定世界、人物和规则。你可以按章写一部长篇小说，也可以让角色从一场对话开始，在同一个世界里推进剧情。
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={worldsWorksPath}>
                  进入我的作品 <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={worldsTemplatesPath}>浏览预设模板</Link>
              </Button>
            </div>
          </div>

          <figure className="rounded-2xl border border-border bg-muted/40 p-6 sm:p-9">
            <figcaption className="border-b border-border pb-4 text-sm text-muted-foreground">
              剧本片段示例 · 雾港的末班渡船
            </figcaption>
            <blockquote className="space-y-4 pt-5 font-serif text-base leading-8 sm:text-lg">
              <p>渡船还系在码头。雾里传来敲击声，三下，停顿，又三下。</p>
              <p>「港务员说今晚没人出港。」守夜人举起灯。</p>
              <p>船长没接话。湿漉漉的甲板上，脚印是从船舱里走出来的。</p>
            </blockquote>
          </figure>
        </section>

        <section className="border-t border-border py-10 sm:py-14">
          <h2 className="font-serif text-2xl sm:text-3xl">选择创作模式</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="space-y-3 rounded-xl border border-border p-6">
              <BookOpen className="size-5 text-primary" aria-hidden="true" />
              <h3 className="font-serif text-xl">小说模式</h3>
              <p className="leading-7 text-muted-foreground">
                设定大纲、文风和叙述视角，自己写下一章，或交给 AI
                续写。可润色整章或选中的段落，整理相邻章节，确认草稿后再写入正文。
              </p>
            </article>
            <article className="space-y-3 rounded-xl border border-border p-6">
              <MessagesSquare
                className="size-5 text-primary"
                aria-hidden="true"
              />
              <h3 className="font-serif text-xl">剧本模式</h3>
              <p className="leading-7 text-muted-foreground">
                为不同角色设定身份、动机和已知信息，让角色按各自的视角对话。你可以补充旁白、点名角色发言，或暂停下来修改设定。
              </p>
            </article>
          </div>
        </section>

        <section className="grid gap-6 border-t border-border py-10 sm:py-14 md:grid-cols-2 md:gap-12">
          <div className="space-y-3">
            <h2 className="font-serif text-2xl">从模板开始</h2>
            <p className="leading-7 text-muted-foreground">
              选一个已有世界，按需要修改人物、背景和规则。也可以创建自己的设定，或导入
              TXT、Markdown 小说，继续已有的故事。
            </p>
          </div>
          <div className="space-y-3">
            <h2 className="font-serif text-2xl">作品保存在哪里？</h2>
            <p className="leading-7 text-muted-foreground">
              登录后可在「我的作品」找到你的剧本和小说。小说正文保存在当前浏览器，可以导出
              TXT 备份或带到另一台设备。
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
