import { apiCaller } from "~/server";

export default async function AdminPage() {
  const user = await apiCaller.user.list();
  return (
    <div>
      {user.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
