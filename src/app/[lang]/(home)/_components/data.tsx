import { toStream } from "@/lib/ui/stream";

const name = <span className="text-primary font-bold">John</span>;

export const generator = toStream`hello, my name is ${name}`;
