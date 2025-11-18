import { chapters } from "@/components/sections/book-experience/chapters";
import DirectoryView from "@/components/sections/book-experience/phase-directory";

const ChapterDirectoryPage = () => {
  return <DirectoryView chapters={chapters} coverHref="/" />;
};

export default ChapterDirectoryPage;
