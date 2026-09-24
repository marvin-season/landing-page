import Link from "next/link";
import { AdminShell } from "./_components/admin-shell";

const tools = [
  {
    href: "/admin/users",
    title: "账号",
    description: "查看登录账号，修改密码。",
  },
];

export default function AdminPage() {
  return (
    <AdminShell title="管理入口" description="内部工具，仅登录后可访问。">
      <ul className="flex flex-col gap-3">
        {tools.map((tool) => (
          <li key={tool.href}>
            <Link
              href={tool.href}
              className="block rounded-xl border bg-card px-4 py-4 shadow-sm transition-colors hover:bg-muted/60 shinchan:matte-surface apple:glass-surface"
            >
              <p className="text-sm font-medium text-foreground">
                {tool.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {tool.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
