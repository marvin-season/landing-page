"use client";

import { Trans, useLingui } from "@lingui/react/macro";
import { ShimmeringText } from "@/components/ui";
import GradientText from "@/components/ui/react-bits/gradient-text";

function IntroArticle() {
  const { t } = useLingui();
  return (
    <article className="prose lg:prose-xl">
      <p className="indent-[2em]">
        <Trans>
          I am a web developer passionate about building functional and
          beautiful web applications, with a Bachelor of Science in Computer
          Science from the University of
        </Trans>
        &nbsp;
        <ShimmeringText
          text={t`Wuhan University of Science and Technology.`}
          className="inline-block indent-0"
        />
        &nbsp;<Trans>I'am skilled in &nbsp;</Trans>
        <GradientText>
          React & Next.js, TypeScript, Tailwind CSS, Shadcn UI
        </GradientText>
      </p>
      <p className="indent-[2em]">
        <Trans>
          I have worked at four companies, including Beijing Health Planet,
          Shenzhen Zhaori Technology, Digital China Tongminghu Wuhan R&D Center,
          and Shenzhen Jiuling Technology. I have rich experience in Java, web
          development, and mini program development.
        </Trans>
      </p>
    </article>
  );
}

export default function Intro() {
  return (
    <section>
      <h2 className="text-2xl font-bold mb-4">
        <Trans>Introduction</Trans>
      </h2>
      <IntroArticle />
    </section>
  );
}
