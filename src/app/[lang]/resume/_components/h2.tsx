import { MotionH2 } from "@/components/ui/motion/motion-h2";

export default function H2({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <MotionH2
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="mb-6 text-2xl font-semibold text-foreground"
    >
      {children}
    </MotionH2>
  );
}
