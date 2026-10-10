"use client";

import { ArrowRight, Store, Wallet } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/components/link/link";
import { BbqInstallButton } from "./bbq-install-button";
import { cls } from "./bbq-layout";
import { bbqHomePath } from "./bbq-paths";
import { OrdersHome } from "./orders-home";

const choiceCls = cls`
  flex flex-col gap-4 rounded-xl border bg-card p-5 text-foreground shadow-sm
  transition-colors hover:border-primary/50 hover:bg-primary/5
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
`;

export function AccountingHome() {
  const params = useSearchParams();
  const mode = params.get("mode");
  if (mode === "shop" || mode === "personal")
    return <OrdersHome key={mode} mode={mode} />;
  // Existing links to a shop business day still open that day's orders.
  if (params.has("day")) return <OrdersHome mode="shop" />;
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-6 md:py-12">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">天天记账</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            选择记账方式，管理店铺订单或记录个人消费
          </p>
        </div>
        <BbqInstallButton />
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href={bbqHomePath(undefined, "shop")} className={choiceCls}>
          <Store className="size-7 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold">店铺记账</h2>
          <p className="text-sm text-muted-foreground">
            从菜单选择菜品，管理座位、订单和营业档期，查看经营统计。
          </p>
          <span className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-primary">
            进入店铺记账
            <ArrowRight className="size-4" aria-hidden="true" />
          </span>
        </Link>
        <Link href={bbqHomePath(undefined, "personal")} className={choiceCls}>
          <Wallet className="size-7 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold">个人记账</h2>
          <p className="text-sm text-muted-foreground">
            手动填写商品名称、单价和数量，一单记录多件商品，查看消费统计。
          </p>
          <span className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-primary">
            进入个人记账
            <ArrowRight className="size-4" aria-hidden="true" />
          </span>
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">
        两个账本独立保存，数据保存在当前浏览器中，请定期导出备份。
      </p>
    </main>
  );
}
