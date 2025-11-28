import { cn } from "@/lib/utils";

export function Background({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="relative min-h-dvh">
      <div
        className={cn(
          "fixed inset-0 z-1 bg-linear-to-br from-background-1 via-background-2 to-background-3 flex items-center justify-center",
          className,
        )}
      ></div>
      {children}
    </div>
  );
}
