"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import { ChevronDown, Heart } from "lucide-react";
import Image from "next/image";

export function BbqSupportCard() {
  const { t } = useLingui();

  return (
    <Collapsible defaultOpen={false} asChild>
      <Card className="shrink-0 overflow-hidden border-0 shadow-none">
        <CardHeader className="p-0">
          <CardTitle className="text-sm font-medium tracking-normal">
            <h2>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="group flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl p-3 text-start text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/50"
                >
                  <Heart className="size-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1">
                    <Trans>支持开源</Trans>
                  </span>
                  <ChevronDown
                    className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </button>
              </CollapsibleTrigger>
            </h2>
          </CardTitle>
        </CardHeader>
        <CollapsibleContent>
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
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
