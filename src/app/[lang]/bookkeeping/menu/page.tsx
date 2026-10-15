import { msg } from "@lingui/core/macro";
import type { Metadata } from "next";
import { getBookkeepingPageMetadata } from "@/lib/bookkeeping-seo";
import { getI18nInstance, type PageLangParam } from "@/lib/i18n/appRouterI18n";
import { MenuEditor } from "../_components/menu-editor";

export async function generateMetadata({
  params,
}: PageLangParam): Promise<Metadata> {
  const { lang } = await params;
  const i18n = getI18nInstance(lang);
  return {
    ...getBookkeepingPageMetadata(
      lang,
      "/menu",
      i18n._(msg`菜单管理 · 记露`),
      i18n._(
        msg`管理常用消费项目与餐饮菜单，设置单价、单位、每单位热量和启用状态。`,
      ),
    ),
  };
}

export default function BbqMenuPage() {
  return <MenuEditor />;
}
