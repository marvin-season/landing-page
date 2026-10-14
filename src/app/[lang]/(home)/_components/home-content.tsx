import { Trans } from "@lingui/react/macro";
import { homeProfiles, navLinks } from "../data/home-data";
import { HomeHero } from "./home-hero";
import { HomeHeroTheme } from "./home-hero-theme";
import { NavigationCarousel, Section } from "./index";

export function HomeContent() {
  return (
    <main className="min-h-dvh bg-background text-foreground shinchan:bg-transparent apple:bg-transparent">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-5 py-10 sm:px-8 sm:py-14 lg:py-20">
        <HomeHeroTheme
          variants={{
            shinchan: <HomeHero profile={homeProfiles.shinchan} />,
            loopy: <HomeHero profile={homeProfiles.loopy} />,
          }}
        >
          <HomeHero profile={homeProfiles.default} />
        </HomeHeroTheme>

        <Section title={<Trans>Navigation</Trans>} delay={180}>
          <NavigationCarousel items={navLinks} />
        </Section>
      </div>
    </main>
  );
}
