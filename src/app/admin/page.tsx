import { apiCaller } from "@/server";

export default async function AdminPage() {
  const user = await apiCaller.userList();
  console.log(user);
  return (
    <div>
      {user.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
