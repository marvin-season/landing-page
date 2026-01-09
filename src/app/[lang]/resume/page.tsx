import Experience from "./_components/experience";
import Intro from "./_components/intro";
import Stack from "./_components/stack";

export default function ResumePage() {
  return (
    <div className="space-y-16">
      <Stack />
      <Intro />
      <Experience />
    </div>
  );
}
