"use client";

import dynamic from "next/dynamic";

const ProseMirrorEditor = dynamic(
  () => import("@/components/editor/ProseMirrorEditor"),
  {
    ssr: false,
  },
);
export default function ProsePage() {
  return <ProseMirrorEditor />;
}
