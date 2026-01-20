"use client";

import dynamic from "next/dynamic";

const ProseMirrorEditor = dynamic(
  () => import("./_components/ProseMirrorEditor"),
  {
    ssr: false,
  },
);
export default function ProsePage() {
  return <ProseMirrorEditor />;
}
