"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { MotionDiv } from "@/components/ui/motion/motion-div";
import { useTRPC } from "@/lib/trpc";
export default function AdminPage() {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.user.list.queryOptions());
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -48 }}
      className="space-y-6 px-4 py-8 md:px-6"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-slate-500">Admin</p>
          <h1 className="text-3xl font-semibold text-slate-900">管理入口</h1>
        </div>
        <Link
          href="/admin/trades"
          className="inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          交易记录
        </Link>
      </div>

      {data?.map((user) => (
        <div key={user.id}>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
        </div>
      ))}
    </MotionDiv>
  );
}
