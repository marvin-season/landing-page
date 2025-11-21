import { MotionDiv } from "../../components/motion";
import Content from "./_components/content";

console.log("MotionDiv", MotionDiv);
export default async function AdminPage() {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -48 }}
    >
      <Content />
    </MotionDiv>
  );
}
