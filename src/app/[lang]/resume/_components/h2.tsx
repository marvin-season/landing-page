import { MotionH2 } from "@/components/ui/motion";

export default function H2({ children }: { children: React.ReactNode }) {
  return (
    <MotionH2
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="mb-6 text-2xl font-semibold text-foreground"
    >
      {children}
    </MotionH2>
  );
}
