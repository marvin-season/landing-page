export function ChatError(props: { message: string }) {
  const { message = "Unknown error" } = props;
  return (
    <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100 flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-red-500" />
      Error: {message}
    </div>
  );
}
