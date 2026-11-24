import { Button } from "@landing-page/design-system";
import { BrandStatusPage } from "@/components/brand-status-page";
import { Link } from "@/components/link/link";

export default function NotFound() {
  return (
    <BrandStatusPage
      eyebrow="404"
      title="迷路了"
      description="小新也找不到这一页。要不先回家看看？"
      actions={
        <Button asChild>
          <Link href="/">回首页</Link>
        </Button>
      }
    />
  );
}
