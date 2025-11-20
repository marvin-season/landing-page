"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/utils";

export default function AdminPage() {
  const trpc = useTRPC();
  const user = useQuery(trpc.userList.queryOptions());
  return <div>{user.data?.map((user) => user.name).join(", ")}</div>;
}
