import { useLingui } from "@lingui/react/macro";

export interface Project {
  title: string;
  description: string;
  link?: string;
  techStack: string;
  responsibilities: string[];
}

export interface WorkExperience {
  company: string;
  position: string;
  period: string;
  projects: Project[];
}

export const useExperience = () => {
  const { t } = useLingui();
  const experiences: WorkExperience[] = [
    {
      company: t`Digital China · Tongming Lake Cloud & Innovation Research Institute · AI R&D Center`,
      position: t`Web Developer`,
      period: t`June 2023 - April 2025`,
      projects: [
        {
          title: t`Digital China Smart Vision`,
          description: t`Enterprise-level AI application one-stop construction and management platform that fully integrates model, data, application, and computing power.`,
          link: "https://smartvision.dcclouds.com/welcome",
          techStack: t`React.js, React-Router, Redux, ShadcnUI, TailwindCSS, TanStack Query, ReactFlow, React-Windows, Fetch, Vite, Vue2, ECharts, ElementUI, Next.js, SSR, ISR, Strapi-CMS`,
          responsibilities: [
            t`Implemented streaming chat interface with real-time message push`,
            t`Developed document processing system with PDF, Excel, and Markdown support`,
            t`Created internationalization solution based on Vite and Babel`,
            t`Designed and implemented new user onboarding system`,
            t`Developed workflow system with visual process editing`,
            t`Optimized performance with lazy loading and data virtualization`,
          ],
        },
        {
          title: t`AI PC`,
          description: t`Intelligent Q&A system based on large language models, supporting cloud-based DeepSeek free full-featured version or local DeepSeek lightweight version.`,
          link: "https://aipc.dcclouds.com/",
          techStack: t`ExpressJs, React18, Prisma, PostgresSQL, RAG, TailwindCSS`,
          responsibilities: [
            t`Designed and implemented frontend-backend separation architecture`,
            t`Developed rich text editor and AI intelligent writing system`,
            t`Implemented RAG retrieval augmentation and tool calling features`,
            t`Integrated Ollama for local large model deployment`,
          ],
        },
      ],
    },
    {
      company: t`Wuhan Zhaori Technology Co., Ltd.`,
      position: t`Web Developer`,
      period: t`July 2022 - June 2023`,
      projects: [
        {
          title: t`Jushihui`,
          description: t`E-commerce platform focused on providing users with excellent shopping experience.`,
          techStack: t`Vue2, UniApp, Vuex, VantUI`,
          responsibilities: [
            t`Implemented product management system supporting CRUD operations`,
            t`Developed shopping cart and order system`,
            t`Developed user management system`,
            t`Developed homepage decoration system (low-code)`,
          ],
        },
      ],
    },
    {
      company: t`Health Planet International Technology Co., Ltd.`,
      position: t`Java Developer`,
      period: t`June 2021 - May 2022`,
      projects: [
        {
          title: t`Health Planet`,
          description: t`Health management software providing health management services for users.`,
          techStack: t`Java, SpringBoot, Mybatis, MySQL, Vue2, UniApp`,
          responsibilities: [
            t`Developed member module APIs for member information management`,
            t`Developed coupon module APIs supporting coupon creation and distribution`,
            t`Implemented member information statistics functionality`,
            t`Developed member management system with Vue2`,
            t`Developed user personal center page with UniApp`,
          ],
        },
      ],
    },
  ];
  return {
    experiences,
  };
};
