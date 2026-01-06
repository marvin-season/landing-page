import { Suspense } from "react";
import type { IFeature } from "@/app/admin/crud/_components/features";
import { request } from "@/utils/request";

export const FeatureServer = ({
  children,
}: {
  children: (props: {
    featuresPromise: Promise<IFeature[]>;
  }) => React.ReactNode;
}) => {
  const featuresPromise = request<IFeature[]>("/posts");

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div>
      <strong>Features:</strong>
      <Suspense fallback={<div>Loading...</div>}>
        {children({ featuresPromise })}
      </Suspense>
    </div>
  );
};
