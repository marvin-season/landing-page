import BasicInfo from "@/app/[lang]/resume/_components/basic-info";
import WorkInfo from "@/app/[lang]/resume/_components/work-info";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";

export default async function ResumePage() {
  return (
    <div>
      <Tabs defaultValue="basic-info" className="w-[400px]">
        <TabsList>
          <TabsTrigger value="basic-info">BasicInfo</TabsTrigger>
          <TabsTrigger value="work-info">WorkInfo</TabsTrigger>
        </TabsList>
        <TabsContent value="basic-info">
          <BasicInfo />
        </TabsContent>
        <TabsContent value="work-info">
          <WorkInfo />
        </TabsContent>
      </Tabs>
    </div>
  );
}
