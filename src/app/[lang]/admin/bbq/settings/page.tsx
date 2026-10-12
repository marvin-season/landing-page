import type { Metadata } from "next";
import { BbqSettings } from "../_components/bbq-settings";

export const metadata: Metadata = {
  title: { absolute: "设置 · 天天记账" },
  description: "管理记账数据备份与应用安装。",
};

export default function BbqSettingsPage() {
  return <BbqSettings />;
}
