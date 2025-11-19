import { headers } from "next/headers";
import {
  type DropdownItem,
  HoverDropdown,
} from "@/components/ui/hover-dropdown";
import linguiConfig from "~/lingui.config";

const { locales } = linguiConfig;

// 语言显示名称映射
const languageNames: Record<string, string> = {
  en: "English",
  zh: "中文",
  ja: "日本語",
  pseudo: "Pseudo",
};

type LanguageSwitcherProps = {
  currentLang?: string;
  pathname?: string;
};

export const LanguageSwitcher = async ({
  currentLang,
  pathname: providedPathname,
}: LanguageSwitcherProps = {}) => {
  // 优先使用传入的 pathname，否则从 headers 获取
  let pathname = providedPathname;
  if (!pathname) {
    const headersList = await headers();
    // 尝试从 referer 获取路径
    const referer = headersList.get("referer");
    if (referer) {
      try {
        const url = new URL(referer);
        pathname = url.pathname;
      } catch {
        pathname = "/";
      }
    } else {
      pathname = "/";
    }
  }

  // 从路径中提取当前语言（路径格式：/lang/...）
  const pathSegments = pathname.split("/").filter(Boolean);
  const pathLocale = currentLang || pathSegments[0] || locales[0];

  // 构建新路径：替换路径中的语言部分
  const buildLanguagePath = (newLocale: string) => {
    const newPathSegments = [newLocale, ...pathSegments.slice(1)];
    return `/${newPathSegments.join("/")}`;
  };

  // 构建下拉菜单项
  const dropdownItems: DropdownItem[] = locales.map((locale) => ({
    id: locale,
    label: languageNames[locale] || locale,
    href: buildLanguagePath(locale),
  }));

  // 触发按钮
  const trigger = (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">Language</span>
      <span className="shrink-0 flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent">
        <span className="font-medium">
          {languageNames[pathLocale] || pathLocale}
        </span>
        <svg
          className="h-4 w-4 transition-transform group-hover:rotate-180"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </span>
    </div>
  );

  return (
    <HoverDropdown
      trigger={trigger}
      items={dropdownItems}
      activeId={pathLocale}
      align="right"
      width="w-40"
    />
  );
};
