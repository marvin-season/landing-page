import Image from "next/image";
import { cls } from "./bbq-layout";

const companions = {
  hello: { width: 608, height: 608 },
  dance: { width: 360, height: 360 },
  chef: { width: 551, height: 551 },
  exercise: { width: 360, height: 360 },
  shy: { width: 575, height: 606 },
  tumble: { width: 470, height: 470 },
  wave: { width: 512, height: 512 },
  workout: { width: 360, height: 360 },
  busy: { width: 558, height: 558 },
  ponder: { width: 226, height: 226 },
  happy: { width: 534, height: 534 },
  care: { width: 221, height: 221 },
  "photo-pose": { width: 474, height: 474 },
} as const;

const companionCls = cls`block size-full object-contain select-none`;

export function BbqCompanion({
  mood = "hello",
  className,
}: {
  mood?: keyof typeof companions;
  className?: string;
}) {
  const { width, height } = companions[mood];

  return (
    <picture className={className} aria-hidden="true">
      {/* GIF 原样使用；减少动态效果时只请求独立静帧，不隐藏仍在播放的 GIF。 */}
      <source
        media="(prefers-reduced-motion: reduce)"
        srcSet={`/bbq/companions/${mood}-still.png`}
      />
      <Image
        src={`/bbq/companions/${mood}.gif`}
        alt=""
        width={width}
        height={height}
        className={companionCls}
        unoptimized
        loading="lazy"
        draggable={false}
      />
    </picture>
  );
}
