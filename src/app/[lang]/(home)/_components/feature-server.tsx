import { Suspense } from "react";

export const FeatureServer = ({
  children,
}: {
  children: (props: { featuresPromise: Promise<any[]> }) => React.ReactNode;
}) => {
  const featuresPromise = new Promise<any[]>((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 1, name: "Feature 1" },
        { id: 2, name: "Feature 2" },
        { id: 3, name: "Feature 3" },
        { id: 4, name: "Feature 4" },
        { id: 5, name: "Feature 5" },
        { id: 6, name: "Feature 6" },
        { id: 7, name: "Feature 7" },
        { id: 8, name: "Feature 8" },
        { id: 9, name: "Feature 9" },
        { id: 10, name: "Feature 10" },
      ]);
    }, 3000);
  });

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div>
      <strong>Features:</strong>
      <Suspense fallback={<div>Loading...</div>}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {children({ featuresPromise })}
        </div>
      </Suspense>
    </div>
  );
};
