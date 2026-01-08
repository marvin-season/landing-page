import Link, { type LinkProps } from "next/link";
import LazyLink from "@/components/link/lazy-link";

interface Props extends LinkProps {
  noPrefetch?: boolean;
  href: string;
  children: React.ReactNode;
  className: string;
}

export default function LandLink(props: Props) {
  const { noPrefetch, href, children, className, ...restProps } = props;
  if (noPrefetch) {
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
