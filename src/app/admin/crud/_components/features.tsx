"use client";

import Link from "next/link";
import { use } from "react";

export interface IFeature {
  id: number;
  title: string;
  body: string;
}

export const FeaturesContent = ({
  featuresPromise,
}: {
  featuresPromise: Promise<IFeature[]>;
}) => {
  const features = use(featuresPromise);

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {features.map((feature) => (
        <Link
          href={`/admin/crud/${feature.id}`}
          key={feature.id}
          className="text-left p-4 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
        >
          <div className="text-sm text-gray-700 mb-2">{feature.title}</div>
          <div className="text-sm text-gray-500">{feature.body}</div>
        </Link>
      ))}
    </div>
  );
};
