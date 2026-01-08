import type { IFeature } from "@/app/admin/crud/_components/features";
import { request } from "@/utils/request";

export async function generateStaticParams() {
  return [1, 2, 3].map((id) => ({ id: id.toString() }));
}

export default async function CRUDSinglePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const data = await request<IFeature>(`/posts/${id}`);
  return (
    <div>
      {Object.entries(data).map(([key, value]) => (
        <div key={key}>
          <span>{key}:</span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  );
}
