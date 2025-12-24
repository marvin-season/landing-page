import { memo } from "react";
import { cn } from "@/lib/utils";

// 1. 使用 memo 封装自定义组件，防止因父组件重绘导致的无效 render
const MemoizedStrong = memo(({ className, children, ...props }: any) => {
  return (
    <strong className={cn("font-bold text-primary", className)} {...props}>
      {children}
    </strong>
  );
});
MemoizedStrong.displayName = "MemoizedStrong";

const components = {
  strong: MemoizedStrong,
  // 你可以继续在此添加 p, li, code 等的 memo 版本
};

export default components;
