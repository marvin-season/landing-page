import { msg } from "@lingui/core/macro";
import type { PageLangParam } from "@/lib/i18n/appRouterI18n";
import { getI18nInstance } from "@/lib/i18n/appRouterI18n";
import { PixelHero } from "./_components/pixel-hero";

export default async function Home({ params }: PageLangParam) {
  const lang = (await params).lang;
  const i18n = getI18nInstance(lang);
  return (
    <PixelHero
      badge={i18n._(msg`AI PIXEL OPS`)}
      title={i18n._(msg`Pixel-grade AI command deck for content teams`)}
      description={i18n._(
        msg`We rebooted the landing experience into a living arcade shell. A self-driving snake simulates how our agents route briefs, and you can take over anytime just like co-creating with AI.`,
      )}
      highlights={[
        i18n._(
          msg`1s cadence with autonomous pathfinding toward every food node.`,
        ),
        i18n._(
          msg`Arrow keys instantly revoke autopilot and hand controls to you.`,
        ),
        i18n._(
          msg`Crashes trigger GAME OVER and a 3s cold reboot for resilience drills.`,
        ),
      ]}
      primaryCta={{
        label: i18n._(msg`Book a pilot`),
        href: `/${lang}/resume`,
      }}
      secondaryCta={{
        label: i18n._(msg`Explore knowledge chapters`),
        href: `/${lang}/chapter`,
      }}
    />
  );
}
