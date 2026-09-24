import { PrefetchUsersLink } from "./_components/prefetch-users-link";

const tools = [
  {
    href: "/admin/users",
    title: "闲人止步",
    description: "管理用户列表，创建管理员或访客",
  },
];

export default function AdminPage() {
  return (
    <>
      <header>
        <h1 className="text-xl font-semibold text-foreground">管理入口</h1>
      </header>
      <ul className="mt-8 flex flex-col gap-3">
        {tools.map((tool) => (
          <li key={tool.href}>
            <PrefetchUsersLink
              href={tool.href}
              className="block rounded-xl border bg-card px-4 py-4 shadow-sm transition-colors hover:bg-muted/60 shinchan:matte-surface apple:glass-surface"
            >
              <p className="text-sm font-medium text-foreground">
                {tool.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {tool.description}
              </p>
            </PrefetchUsersLink>
          </li>
        ))}
      </ul>
    </>
  );
}
