"use client";
import dayjs from "dayjs";
import { useRef, useSyncExternalStore } from "react";

const useCD = ({
  interval = 1000,
  onCD,
}: {
  interval?: number;
  onCD?: (cd: number) => void;
}) => {
  const timestamp = useRef<number>(Date.now());
  return useSyncExternalStore(
    (callback) => {
      const intervalId = setInterval(() => {
        timestamp.current = Date.now();
        onCD?.(timestamp.current);
        callback();
      }, interval);
      return () => clearInterval(intervalId);
    },
    () => timestamp.current,
    () => timestamp.current,
  );
};

export default function ChangePage() {
  const timestamp = useCD({});
  return <div>{dayjs(timestamp).format("YYYY-MM-DD HH:mm:ss")}</div>;
}
