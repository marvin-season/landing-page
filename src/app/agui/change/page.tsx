"use client";

import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useMeals } from "./store";

function PapaBear() {
  const papaBear = useMeals((state) => state.papaBear);
  return <div>{papaBear}</div>;
}

export default function ChangePage() {
  const names = useMeals(useShallow((state) => Object.keys(state)));

  useEffect(() => {
    const unsubscribe = useMeals.subscribe((state) => {
      console.log(" changed", state);
    });
    return unsubscribe;
  }, []);

  console.log("names", names);
  return (
    <div
      onClick={() =>
        useMeals.setState({ papaBear: "large porridge-pot" + Date.now() })
      }
    >
      <div>{names.join(", ")}</div>
      <PapaBear />
    </div>
  );
}
