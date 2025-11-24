"use client";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/utils/trpc";
import { MotionDiv } from "../../components/ui/motion";

export default function AdminPage() {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.user.list.queryOptions());
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -48 }}
    >
      {data?.map((user) => (
        <div key={user.id}>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
        </div>
      ))}
    </MotionDiv>
  );
}
