import { FeatureServer } from "@/app/admin/crud/_components/feature-server";
import { FeaturesContent } from "@/app/admin/crud/_components/features";

export default function CRUDPage() {
  return (
    <FeatureServer>
      {({ featuresPromise }) => (
        <FeaturesContent featuresPromise={featuresPromise} />
      )}
    </FeatureServer>
  );
}
