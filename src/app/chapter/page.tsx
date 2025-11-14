import DirectoryView from "@/components/sections/book-experience/phase-directory";
import SceneLayout from "@/components/sections/book-experience/scene-layout";
import { chapters } from "@/components/sections/book-experience/chapters";

const ChapterDirectoryPage = () => {
  return (
    <SceneLayout
      title="打开目录，与团队一起规划 AI 内容蓝图"
      description="从工作流到洞察与资产治理，我们为 AI 驱动的内容平台整理了四个核心章节。选择一章继续深入。"
    >
      <DirectoryView chapters={chapters} coverHref="/" />
    </SceneLayout>
  );
};

export default ChapterDirectoryPage;

