import type { PageLangParam } from "@/lib/i18n/appRouterI18n";
import SceneLayout from "../_components/scene-layout";
import PretextDemo from "./pretext-demo";

export async function generateMetadata() {
  return {
    title: "Pretext Demo",
    description:
      "Interactive demo for height prediction and manual line layout with @chenglou/pretext.",
  };
}

export default async function PretextPage({ params }: PageLangParam) {
  await params;

  return (
    <SceneLayout
      badge="Text Layout Lab"
      title="Pretext Demo"
      description="Measure multilingual text without DOM reflow, inspect line breaks, and compare the predicted result against the browser."
      className="flex flex-col gap-8"
    >
      <PretextDemo />
    </SceneLayout>
  );
}
