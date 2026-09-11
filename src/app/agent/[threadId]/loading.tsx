import { ThreadHistoryLoading } from "../_components/ThreadHistoryLoading";

export default function AgentThreadLoading() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-8">
      <ThreadHistoryLoading />
    </div>
  );
}
