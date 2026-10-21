"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import type { CompanionMood } from "@/lib/bbq/companion-album";

import { useCompanionAlbum } from "./companion-album-provider";

export function Companion({
  mood = "hello",
  className,
  fallback = null,
}: {
  mood?: CompanionMood;
  className?: string;
  fallback?: ReactNode;
}) {
  const { images } = useCompanionAlbum();
  const image = images[mood];
  if (!image) return fallback;

  return (
    <picture className={className} aria-hidden="true">
      <source media="(prefers-reduced-motion: reduce)" srcSet={image.still} />
      <Image
        src={image.src}
        alt=""
        width={image.width}
        height={image.height}
        className="block size-full object-contain select-none"
        unoptimized
        loading="lazy"
        draggable={false}
      />
    </picture>
  );
}
