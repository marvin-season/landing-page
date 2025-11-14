import ClosedView from "@/components/sections/book-experience/phase-closed";
import SceneLayout from "@/components/sections/book-experience/scene-layout";

export default function Home() {
  return (
    <SceneLayout
      title="以「书」为界面，进入下一代 AI 内容协作平台"
      description="我们把平台体验设计成一本会呼吸的书。翻开它，思考、创作、洞察与治理的章节将在你指尖展开。"
    >
      <ClosedView directoryHref="/chapter" />
    </SceneLayout>
  );
}
