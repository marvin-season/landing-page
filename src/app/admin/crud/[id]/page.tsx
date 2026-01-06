export async function generateStaticParams() {
  return [1, 2, 3].map((id) => ({ id: id.toString() }));
}

export default async function CRUDSinglePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <div>CRUDSinglePage {id}</div>;
}
