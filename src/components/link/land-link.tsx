import Link from "next/link";
import LazyLink from "@/components/link/lazy-link";

export default function LandLink({
  noPrefetch,
  href,
  children,
  className,
}: {
  noPrefetch?: boolean;
  href: string;
  children: React.ReactNode;
  className: string;
}) {
  if (noPrefetch) {
    return (
      <LazyLink href={href} className={className}>
        {children}
      </LazyLink>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
