import type { Metadata } from "next";
import { OrderEditor } from "../../_components/order-editor";

export const metadata: Metadata = {
  title: { absolute: "新增记录 · 天天记账" },
  description: "记录日常消费与订单，选择项目、调整数量，汇总金额与饮食热量。",
};

export default function BbqNewOrderPage() {
  return <OrderEditor />;
}
