"use client";

import { Trans } from "@lingui/react/macro";
import { useState } from "react";
import {
  type Project,
  useExperience,
  type WorkExperience,
} from "@/app/[lang]/resume/hooks/use-experience";
import { TransitionPanel } from "@/components/ui/motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-4">
        <h4 className="text-lg font-semibold mb-2">{project.title}</h4>
        {project.link && (
          <a
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {project.link}
          </a>
        )}
      </div>
      <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
        {project.description}
      </p>
      <div className="mb-4">
        <h5 className="text-sm font-semibold mb-2">
          <Trans>Tech Stack</Trans>
        </h5>
        <div className="flex flex-wrap gap-2">
          {project.techStack.split(",").map((tech) => (
            <span
              key={tech}
              className="inline-flex items-center rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
      <div>
        <h5 className="text-sm font-semibold mb-2">
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

function ExperienceContent({ experience }: { experience: WorkExperience }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-1">{experience.company}</h3>
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
  );
}

export default function Experience() {
  const { experiences } = useExperience();
  const [activeTab, setActiveTab] = useState(experiences[0]?.period || "");

  // 获取当前激活的索引
  const activeIndex = Math.max(
    0,
    experiences.findIndex((exp) => exp.period === activeTab),
  );

  // 准备所有工作经历的内容作为 children 数组
  const experienceContents = experiences.map((experience) => (
    <ExperienceContent key={experience.period} experience={experience} />
  ));

  return (
    <section>
      <h2 className="text-2xl font-bold mb-6">
        <Trans>Work Experience</Trans>
      </h2>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 max-w-full overflow-x-auto">
          {experiences.map((experience) => (
            <TabsTrigger key={experience.period} value={experience.period}>
              {experience.period}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={activeTab} className="mt-0">
          <TransitionPanel
            activeIndex={activeIndex}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            variants={{
              enter: { opacity: 0, x: -50, filter: "blur(4px)" },
              center: { opacity: 1, x: 0, filter: "blur(0px)" },
              exit: { opacity: 0, x: 50, filter: "blur(4px)" },
            }}
          >
            {experienceContents}
          </TransitionPanel>
        </TabsContent>
      </Tabs>
    </section>
  );
}
