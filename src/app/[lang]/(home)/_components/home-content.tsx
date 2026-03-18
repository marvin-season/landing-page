import Image from "next/image";
import { navLinks, profile, quotes } from "../data/home-data";
import { NavCard, Quote, Section } from "./index";

export function HomeContent() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <Section
        title={
          <div className="flex items-center gap-3">
            <span className="select-none text-2xl font-bold">
              {profile.name}
            </span>
            <Image
              unoptimized
              src={profile.avatar}
              alt={profile.avatarAlt}
              width={36}
              height={36}
              className="rounded-full object-cover"
            />
          </div>
        }
        className="bg-card/70 p-6 shadow-sm"
      >
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {profile.title}
          <span className="mx-2">·</span>
          {profile.subtitle}
        </p>
      </Section>

      <Section title="Navigation" delay={0.1}>
        <div className="grid gap-3 sm:grid-cols-2">
          {navLinks.map((item) => (
            <NavCard
              key={item.href}
              href={item.href}
              title={item.title}
              description={item.description}
              badge={item.badge}
            />
          ))}
        </div>
      </Section>

      <Section title="Sentences" delay={0.15}>
        {quotes.map((quote, i) => (
          <Quote key={i}>{quote}</Quote>
        ))}
      </Section>
    </div>
  );
}
