"use client";

import { useLingui } from "@lingui/react/macro";
import { use } from "react";
import { request } from "@/utils/request";

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
  const { t } = useLingui();

  const handleClick = (id: number) => {
    request(`/posts/${id}`).then((data) => {
      console.log("data", data);
    });
  };

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {features.map((feature) => (
        <button
          onClick={() => handleClick(feature.id)}
          key={feature.id}
          className="text-left p-4 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
        >
          <div className="text-sm text-gray-700 mb-2">
            {t`Title`}: {feature.title}
          </div>
          <div className="text-sm text-gray-500">
            {t`Body`}: {feature.body}
          </div>
        </button>
      ))}
    </div>
  );
};
