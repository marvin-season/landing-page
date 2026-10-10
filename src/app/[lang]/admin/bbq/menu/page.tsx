import type { Metadata } from "next";
import { MenuEditor } from "../_components/menu-editor";

export const metadata: Metadata = {
  title: { absolute: "菜单管理 · 天天记账" },
  description:
    "管理常用消费项目与餐饮菜单，设置单价、单位、每单位热量和启用状态。",
};

export default function BbqMenuPage() {
  return <MenuEditor />;
}
