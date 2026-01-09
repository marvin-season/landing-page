import { use } from "react";

export default function RestPage({
  params,
}: {
  params: Promise<{
    params: Array<string>;
  }>;
}) {
  const { params: paramsData } = use(params);
  console.log(paramsData);
  return (
    <div className="h-screen text-center text-lg flex items-center justify-center font-bold">
      404: Page not found {paramsData.join("/")}
    </div>
  );
}
