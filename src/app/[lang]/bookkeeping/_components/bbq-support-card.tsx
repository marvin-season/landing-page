"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
} from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import { ChevronDown, Heart } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import {
  detailsChevronCls,
  detailsMotionCls,
  detailsSummaryCls,
} from "./bbq-layout";

export function BbqSupportCard() {
  const { t } = useLingui();
  const [requested, setRequested] = useState(false);

  return (
    <Card className="shrink-0 overflow-hidden border-0 shadow-none">
      <details
        className={detailsMotionCls}
        onToggle={(event) => {
          if (event.currentTarget.open) setRequested(true);
        }}
      >
        <summary className={detailsSummaryCls}>
          <Heart className="size-4 shrink-0" aria-hidden="true" />
          <h2 className="min-w-0 flex-1">
            <Trans>支持开源</Trans>
          </h2>
          <ChevronDown className={detailsChevronCls} aria-hidden="true" />
        </summary>
        <div className="min-h-0 overflow-clip">
          {requested ? (
            <>
              <CardContent className="flex flex-col gap-3 px-3 pb-3 pt-1">
                <CardDescription className="text-xs leading-relaxed">
                  <Trans>
                    如果这个小工具对你有帮助，欢迎自愿打赏，支持开源维护。你的使用和反馈同样珍贵。
                  </Trans>
                </CardDescription>
                <figure className="flex flex-col items-center gap-2">
                  <Image
                    src="/bbq/support/wechat-reward.png"
                    alt={t`作者的微信收款码`}
                    width={744}
                    height={764}
                    unoptimized
                    className="h-auto w-full max-w-60 rounded-lg"
                  />
                  <figcaption className="text-xs text-muted-foreground">
                    <Trans>微信扫码打赏</Trans>
                  </figcaption>
                </figure>
              </CardContent>
              <CardFooter className="px-3 pb-3 pt-0">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  <Trans>
                    说明：打赏完全自愿，不影响任何功能。款项由作者个人收取，不属于商品或服务购买，也不承诺额外权益或更新进度。请量力而行，付款前确认金额与收款人。
                  </Trans>
                </p>
              </CardFooter>
            </>
          ) : null}
        </div>
      </details>
    </Card>
  );
}
