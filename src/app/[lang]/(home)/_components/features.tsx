"use client";

import { useLingui } from "@lingui/react/macro";
import { use } from "react";

export const FeaturesContent = ({
  featuresPromise,
}: {
  featuresPromise: Promise<any[]>;
}) => {
  const features = use(featuresPromise);
  const { t } = useLingui();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {features.map((feature) => (
        <div key={feature.id}>
          {t`Name`}: {feature.name}
        </div>
      ))}
    </div>
  );
};
