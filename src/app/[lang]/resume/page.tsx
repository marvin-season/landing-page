import Experience from "./_components/experience";
import Intro from "./_components/intro";

export default async function ResumePage() {
  return (
    <div className="space-y-4 max-w-6xl mx-auto ">
      <Intro />
      <Experience />
    </div>
  );
}
