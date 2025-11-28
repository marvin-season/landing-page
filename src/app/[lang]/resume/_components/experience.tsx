"use client";

import { Trans } from "@lingui/react/macro";
import { CollapsibleList } from "@/app/[lang]/resume/_components/collapsible-list";
import H2 from "@/app/[lang]/resume/_components/h2";
import {
  type Project,
  useExperience,
} from "@/app/[lang]/resume/hooks/use-experience";
import { MotionDiv } from "@/components/ui";
import {
  Tabs,
  TabsContent,
  TabsContents,
  TabsList,
  TabsTrigger,
} from "@/components/ui/shadcn-io/tabs";

function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/80 p-6 text-foreground backdrop-blur transition-shadow hover:shadow-[0_28px_60px_-38px_var(--ring)]">
      <div className="mb-4">
        <h4 className="text-lg font-semibold mb-2 text-foreground">
          {project.title}
        </h4>
        {project.link && (
          <a
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline transition-colors"
          >
            {project.link}
          </a>
        )}
      </div>
      <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
        {project.description}
      </p>
      <div className="mb-4">
        <h5 className="text-sm font-semibold mb-2 text-foreground">
          <Trans>Tech Stack</Trans>
        </h5>
        <div className="flex flex-wrap gap-2">
          {project.techStack.split(",").map((tech) => (
            <span
              key={tech}
              className="inline-flex items-center rounded-full border border-border/50 bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
      <CollapsibleList
        title={<Trans>Key Responsibilities</Trans>}
        items={project.responsibilities}
      />
    </div>
  );
}

export default function Experience() {
  const { experiences } = useExperience();

  // 准备所有工作经历的内容作为 children 数组
  const experienceContents = experiences.map((experience) => (
    <TabsContent
      key={experience.period}
      value={experience.period}
      className="mt-0"
    >
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        <div className="prose prose-lg p-2 lg:p-4">
          <h3 className="text-xl font-semibold mb-1 text-foreground">
            {experience.company}
          </h3>
          <p className="text-muted-foreground mb-2">
            {experience.position} · {experience.period}
          </p>
        </div>
        <div className="space-y-6">
          {experience.projects.map((project, index) => (
            <ProjectCard key={index} project={project} />
          ))}
        </div>
      </MotionDiv>
    </TabsContent>
  ));

  return (
    <section>
      <H2>
        <Trans>Career</Trans>
      </H2>
      <Tabs className="w-full">
        <TabsList className="relative mb-6 justify-start max-w-full overflow-x-auto">
          {experiences.map((experience) => (
            <TabsTrigger
              ref={(element) => {
                if (element) {
                  element.addEventListener("click", () => {
                    element.scrollIntoView({
                      // @ts-ignore https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView#container
                      container: "nearest",
                      behavior: "smooth",
                      inline: "center",
                    });
                  });
                }
              }}
              key={experience.period}
              value={experience.period}
              className="rounded-full"
            >
              {experience.period}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContents className="">{experienceContents}</TabsContents>
      </Tabs>
    </section>
  );
}
