"use client";

import { Trans, useLingui } from "@lingui/react/macro";
import { MotionDiv, ShimmeringText } from "@/components/ui";
import GradientText from "@/components/ui/react-bits/gradient-text";

function IntroArticle() {
  const { t } = useLingui();
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="rounded-3xl border border-border/60 bg-card/80 p-8 text-foreground backdrop-blur">
        <article className="space-y-4">
          <p className="text-base leading-relaxed text-muted-foreground">
            <Trans>
              I am a web developer passionate about building functional and
              beautiful web applications, with a Bachelor of Science in Computer
              Science from the University of
            </Trans>
            &nbsp;
            <ShimmeringText
              text={t`Wuhan University of Science and Technology.`}
              className="inline-block text-foreground"
            />
            &nbsp;<Trans>I'am skilled in &nbsp;</Trans>
            <GradientText>React & Next.js</GradientText>
            &nbsp;<Trans>, TypeScript, Tailwind CSS, Shadcn UI</Trans>
          </p>
          <p className="text-base leading-relaxed text-muted-foreground">
            <Trans>
              I have worked at four companies, including Beijing Health Planet,
              Shenzhen Zhaori Technology, Digital China Tongminghu Wuhan R&D
              Center, and Shenzhen Jiuling Technology. I have rich experience in
              Java, web development, and mini program development.
            </Trans>
          </p>
        </article>
      </div>
    </MotionDiv>
  );
}

export default function Intro() {
  return (
    <section>
      <div className="mb-6 flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.36em] text-muted-foreground/70">
          <Trans>About Me</Trans>
        </span>
        <h2 className="text-balance text-2xl font-semibold text-foreground">
          <Trans>Introduction</Trans>
        </h2>
      </div>
      <IntroArticle />
    </section>
  );
}
