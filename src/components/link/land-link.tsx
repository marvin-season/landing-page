import Link, { type LinkProps } from "next/link";
import LazyLink from "@/components/link/lazy-link";

interface Props extends LinkProps {
  href: string;
  children: React.ReactNode;
  className: string;
}

export default function LandLink(props: Props) {
  const { prefetch, href, children, className, ...restProps } = props;
  if (!prefetch) {
    return (
      <LazyLink href={href} className={className}>
        {children}
      </LazyLink>
    );
  }
  return (
    <Link href={href} className={className} {...restProps}>
      {children}
    </Link>
  );
}
