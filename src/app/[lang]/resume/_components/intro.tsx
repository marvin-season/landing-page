"use client";

import { Trans, useLingui } from "@lingui/react/macro";
import Link from "next/link";
import H2 from "@/app/[lang]/resume/_components/h2";
import { MotionDiv } from "@/components/ui/motion/motion-div";
import GradientText from "@/components/ui/react-bits/gradient-text";
import { ShimmeringText } from "@/components/ui/shadcn-io/shimmering-text";

function IntroArticle() {
  const { t } = useLingui();
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <article className="space-y-4">
        <span className="text-base leading-relaxed text-muted-foreground">
          <Trans>
            Hello, My name is <strong>Marvin</strong> and I am a web developer
            passionate about building functional and beautiful web applications,
            with a Bachelor of Science in Computer Science from the University
            of
          </Trans>
          <Link
            href="https://www.wust.edu.cn/"
            target="_blank"
            className="mx-2"
          >
            <ShimmeringText
              color="#ff0044"
              shimmeringColor="#9c40ff"
              text={t`Wuhan University of Science and Technology.`}
              className="inline-block text-foreground font-bold"
            />
          </Link>
          <Trans>
            , I'am skilled in
            <GradientText> React & Next.js </GradientText>
            TypeScript, Tailwind CSS, Shadcn UI.
          </Trans>
        </span>
        <span className="ml-2 text-base leading-relaxed text-muted-foreground">
          <Trans>
            I have worked at four companies, including Beijing Health Planet,
            Shenzhen Zhaori Technology, Digital China Tongminghu Wuhan R&D
            Center, and Shenzhen Jiuling Technology. I have rich experience in
            Web development and performance optimization.
          </Trans>
        </span>
        <p className="text-base leading-relaxed text-muted-foreground">
          <Trans>
            You can contact me via:
            <strong className="cursor-pointer hover:underline">
              <a href="mailto:mrvnseason@gmail.com">mrvnseason@gmail.com</a>
              <a href="tel:+8615623192717" className="ml-2">
                or phone: +86 15623192717
              </a>
            </strong>
          </Trans>
        </p>
      </article>
    </MotionDiv>
  );
}

export default function Intro() {
  return (
    <section>
      <H2 delay={0.2}>
        <Trans>Introduction</Trans>
      </H2>
      <IntroArticle />
    </section>
  );
}
