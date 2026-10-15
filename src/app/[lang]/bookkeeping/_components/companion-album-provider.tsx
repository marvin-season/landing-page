"use client";

import { liveQuery } from "dexie";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import type { CompanionMood } from "@/lib/bbq/companion-album";
import { companionImages } from "@/lib/bbq/companion-album-store";

type Companion = { src: string; still: string; width: number; height: number };
type AlbumState = {
  images: Partial<Record<CompanionMood, Companion>>;
  loading: boolean;
  error: boolean;
};
const AlbumContext = createContext<AlbumState>({
  images: {},
  loading: true,
  error: false,
});

export function CompanionAlbumProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AlbumState>({
    images: {},
    loading: true,
    error: false,
  });
  useEffect(() => {
    let urls: string[] = [];
    const release = () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls = [];
    };
    const subscription = liveQuery(() => companionImages.toArray()).subscribe({
      next: (rows) => {
        release();
        const images: AlbumState["images"] = {};
        for (const row of rows) {
          const src = URL.createObjectURL(row.image);
          const still = URL.createObjectURL(row.still);
          urls.push(src, still);
          images[row.id] = { src, still, width: row.width, height: row.height };
        }
        setState({ images, loading: false, error: false });
      },
      error: () => {
        release();
        setState({ images: {}, loading: false, error: true });
      },
    });
    return () => {
      subscription.unsubscribe();
      release();
    };
  }, []);
  return <AlbumContext value={state}>{children}</AlbumContext>;
}

export function useCompanionAlbum() {
  return useContext(AlbumContext);
}
