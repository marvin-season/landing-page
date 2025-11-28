"use client";

import { Trans, useLingui } from "@lingui/react/macro";
import Link from "next/link";
import H2 from "@/app/[lang]/resume/_components/h2";
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
      <article className="space-y-4">
        <p className="text-base leading-relaxed text-muted-foreground">
          <Trans>
            Hello, My name is Marvin and I am a web developer passionate about
            building functional and beautiful web applications, with a Bachelor
            of Science in Computer Science from the University of
          </Trans>
          &nbsp;
          <Link href="https://www.wust.edu.cn/" target="_blank">
            <ShimmeringText
              color="#aaff40"
              shimmeringColor="#9c40ff"
              text={t`Wuhan University of Science and Technology.`}
              className="inline-block text-foreground"
            />
          </Link>
          &nbsp;<Trans>,I'am skilled in &nbsp;</Trans>
          <GradientText>React & Next.js</GradientText>
          &nbsp;<Trans>, TypeScript, Tailwind CSS, Shadcn UI,</Trans>
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
    </MotionDiv>
  );
}

export default function Intro() {
  return (
    <section>
      <H2>
        <Trans>Introduction</Trans>
      </H2>
      <IntroArticle />
    </section>
  );
}
