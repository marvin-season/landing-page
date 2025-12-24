import Link from "next/link";

export function Mine() {
  return (
    <div className="lg:max-w-lg mx-auto">
      <Section title="Marvin">
        <div className="text-[#63635e]">software engineer</div>
      </Section>
      <Section title="Links">
        <CardLink href={"https://fuelstack.icu/resume"}>
          About me in detail
        </CardLink>
        <CardLink href={"https://ds.fuelstack.icu"}>
          Design System & Component Libs
        </CardLink>
      </Section>
      <Section title="Sentences">
        <p className="text-[#63635e] italic">
          &ldquo;Leveraging less data to generate greater insights.&rdquo;
        </p>
      </Section>
    </div>
  );
}

function CardLink({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      className=" hover:text-black text-[#63635e] transition-colors duration-300 select-none"
    >
      {children}
    </Link>
  );
}

function Section({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-md p-4 my-8 flex flex-col gap-2">
      <p className="text-xl font-bold select-none">{title}</p>
      {children}
    </section>
  );
}
