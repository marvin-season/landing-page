import ClosedView from "@/components/sections/book-experience/phase-closed";
import SceneLayout from "@/components/sections/book-experience/scene-layout";

export default function Home() {
  return (
    <SceneLayout
      title='Enter the next-gen AI content collaboration platform through a "book" interface'
      description="We shaped the experience as a breathing book. Open it to reveal chapters on strategy, creation, insight, and governance right at your fingertips."
    >
      <ClosedView directoryHref="/chapter" />
    </SceneLayout>
  );
}
