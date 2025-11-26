"use client";

import { Trans } from "@lingui/react/macro";
import {
  type Project,
  useExperience,
} from "@/app/[lang]/resume/hooks/use-experience";

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
      <div>
        <h5 className="text-sm font-semibold mb-2 text-foreground">
          <Trans>Key Responsibilities</Trans>
        </h5>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          {project.responsibilities.map((resp, index) => (
            <li key={index}>{resp}</li>
          ))}
        </ul>
      </div>
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
      <div className="space-y-6">
        <div className="prose prose-lg p-2 lg:p-6">
          <h3 className="text-2xl font-semibold mb-1 text-foreground">
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
      </div>
    </TabsContent>
  ));

  return (
    <section>
      <div className="mb-6 flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.36em] text-muted-foreground/70">
          <Trans>Career</Trans>
        </span>
        <h2 className="text-balance text-2xl font-semibold text-foreground">
          <Trans>Work Experience</Trans>
        </h2>
      </div>
      <Tabs className="w-full">
        <TabsList className="mb-6 max-w-full overflow-x-auto rounded-full border border-border/60">
          {experiences.map((experience) => (
            <TabsTrigger
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
