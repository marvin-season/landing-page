import { Button } from "@landing-page/design-system";
import { MessageSquarePlus } from "lucide-react";
import { BrandStatusPage } from "@/components/brand-status-page";
import { Link } from "@/components/link/link";

export default function AgentNotFound() {
  return (
    <BrandStatusPage
      className="min-h-full"
      eyebrow="404"
      title="对话不见了"
      description="这场对话不存在、被删了，或当前账号看不到。开一场新的吧。"
      actions={
        <Button asChild>
          <Link href="/agent">
            <MessageSquarePlus className="size-4" />
            开一场新对话
          </Link>
        </Button>
      }
    />
  );
}
