import { request } from "@landing-page/utils";
import { Suspense } from "react";

import {
  FeaturesContent,
  type IFeature,
} from "@/app/admin/crud/_components/features";
export default function CRUDPage() {
  const featuresPromise = request<IFeature[]>("/posts");
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FeaturesContent featuresPromise={featuresPromise} />
    </Suspense>
  );
}
