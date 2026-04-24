"use client";

import { useLocalStorageState } from "ahooks";
import { use } from "react";
import LandLink from "@/components/link/land-link";

export interface IFeature {
  id: number;
  title: string;
  body: string;
}

function BlockA() {
  const [count, setCount] = useLocalStorageState<number>("count", {
    defaultValue: 0,
    listenStorageChange: true,
  });
  return (
    <div>
      <h1>Block A</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => localStorage.setItem("count", "1")}>Reset</button>
    </div>
  );
}

function BlockB() {
  const [count, setCount] = useLocalStorageState<number>("count", {
    defaultValue: 0,
    listenStorageChange: true,
  });
  return (
    <div>
      <h1>Block B</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

export const FeaturesContent = ({
  featuresPromise,
}: {
  featuresPromise: Promise<IFeature[]>;
}) => {
  const features = use(featuresPromise);

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <BlockA />
      <BlockB />
      {features.slice(0, 3).map((feature) => (
        <LandLink
          href={`/admin/crud/${feature.id}`}
          key={feature.id}
          className="text-left p-4 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
        >
          <div className="text-sm text-gray-700 mb-2">{feature.title}</div>
          <div className="text-sm text-gray-500">{feature.body}</div>
        </LandLink>
      ))}
    </div>
  );
};
