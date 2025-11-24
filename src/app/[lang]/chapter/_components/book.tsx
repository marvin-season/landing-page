import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { getI18nInstance } from "@/lib/i18n/appRouterI18n";
import { cn } from "@/lib/utils";
import type { Chapter } from "@/types/chapter";

type ChapterItem = Pick<Chapter, "id" | "title">;

type BookProps = {
  lang: string;
  chapters?: Chapter[];
};

// 封面样式常量
const COVER_BASE_STYLES = "absolute inset-0 rounded-[32px] backface-hidden";
const COVER_FRONT_STYLES = cn(
  COVER_BASE_STYLES,
  "border border-slate-300/25",
  "[background:linear-gradient(120deg,rgba(15,23,42,0.95),rgba(30,41,59,0.8),rgba(15,23,42,0.95))]",
  "[box-shadow:0_40px_80px_-40px_rgba(15,23,42,0.55),inset_0_1px_0_rgba(255,255,255,0.1)]",
  "transform-[translateZ(24px)]",
);
const COVER_BACK_STYLES = cn(
  COVER_BASE_STYLES,
  "bg-linear-to-r from-[#f8fafc]/96 to-[#e2e8f0]/92",
  "transform-[rotateY(180deg)_translateZ(24px)]",
  "[border:1px_solid_rgba(148,163,184,0.35)]",
  "[box-shadow:0_30px_60px_-40px_rgba(15,23,42,0.25),inset_0_1px_0_rgba(255,255,255,0.7)]",
);

// 封面正面组件
type BookCoverProps = {
  i18n: I18n;
};

function BookCover({ i18n }: BookCoverProps) {
  return (
    <div className={COVER_FRONT_STYLES}>
      <div className="flex h-full flex-col justify-between p-8 text-left text-white">
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-white/60">
          <span>{i18n._(msg`AI STUDIO`)}</span>
          <span className="h-1 w-1 rounded-full bg-white/40" />
          <span>{i18n._(msg`2025`)}</span>
        </div>
        <div>
          <p className="text-lg font-semibold leading-tight">
            {i18n._(msg`Chapters Awaiting You`)}
          </p>
          <p className="mt-2 text-xs text-white/60">
            {i18n._(msg`Click the cover to awaken a new creative journey.`)}
          </p>
        </div>
      </div>
    </div>
  );
}

// 目录组件
type BookTableOfContentsProps = {
  i18n: I18n;
  chapters: ChapterItem[];
};

function BookTableOfContents({ i18n, chapters }: BookTableOfContentsProps) {
  return (
    <div className={COVER_BACK_STYLES}>
      <div className="flex h-full flex-col justify-between p-8 text-left text-slate-700">
        <span className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
          {i18n._(msg`Table of Contents`)}
        </span>
        <div className="space-y-3 text-sm text-slate-500">
          {chapters.map((chapter) => (
            <p key={chapter.id}>{chapter.title}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

// 获取默认占位章节（当没有传入 chapters 时使用）
function getDefaultChapters(i18n: I18n): ChapterItem[] {
  return [
    { id: "workflow", title: i18n._(msg`Creative Workflow`) },
    { id: "co-creation", title: i18n._(msg`AI Co-Creation Studio`) },
    { id: "expression", title: i18n._(msg`Insight-Driven Expression`) },
    { id: "governance", title: i18n._(msg`Content Governance Hub`) },
  ];
}

// 将完整的 Chapter 数组转换为目录显示所需的简化格式
function toChapterItems(chapters: Chapter[]): ChapterItem[] {
  return chapters.map((ch) => ({ id: ch.id, title: ch.title }));
}

// 主组件
export default function Book({ lang, chapters = [] }: BookProps) {
  const i18n = getI18nInstance(lang);

  // 如果传入了 chapters，使用它们；否则使用默认占位内容
  const displayChapters: ChapterItem[] =
    chapters.length > 0 ? toChapterItems(chapters) : getDefaultChapters(i18n);

  return (
    <>
      <BookCover i18n={i18n} />
      <BookTableOfContents i18n={i18n} chapters={displayChapters} />
    </>
  );
}
