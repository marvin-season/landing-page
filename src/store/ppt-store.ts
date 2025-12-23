"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { createIdbPersistStorage } from "@/store/idb-persist-storage";
import type { FabricSlideJSON } from "@/app/admin/ppt/fabric-slide-schema";

export type GeneratedPptItem = {
  id: string;
  title: string;
  presetId: string;
  createdAt: number;
  slides: FabricSlideJSON[];
};

type PptPersistedState = {
  generatedPpts: GeneratedPptItem[];
  activeGeneratedPptId: string | null;
};

type PptState = PptPersistedState & {
  addGeneratedPpt: (params: {
    slides: FabricSlideJSON[];
    presetId: string;
    title: string;
    createdAt?: number;
  }) => void;
  setActiveGeneratedPptId: (id: string | null) => void;
  deleteGeneratedPpt: (id: string) => void;
  clearGeneratedPpts: () => void;
};

export const usePptStore = create<PptState>()(
  persist(
    immer((set) => ({
      generatedPpts: [],
      activeGeneratedPptId: null,
      addGeneratedPpt: ({ slides, presetId, title, createdAt }) => {
        const now = createdAt ?? Date.now();
        const id = crypto.randomUUID();
        set((state) => {
          state.generatedPpts.unshift({
            id,
            title,
            presetId,
            createdAt: now,
            slides,
          });
          state.activeGeneratedPptId = id;
        });
      },
      setActiveGeneratedPptId: (id) => {
        set((state) => {
          state.activeGeneratedPptId = id;
        });
      },
      deleteGeneratedPpt: (id) => {
        set((state) => {
          state.generatedPpts = state.generatedPpts.filter((p) => p.id !== id);
          if (state.activeGeneratedPptId === id) {
            state.activeGeneratedPptId = state.generatedPpts[0]?.id ?? null;
          }
        });
      },
      clearGeneratedPpts: () => {
        set((state) => {
          state.generatedPpts = [];
          state.activeGeneratedPptId = null;
        });
      },
    })),
    {
      name: "ppt-storage",
      storage: createIdbPersistStorage<PptPersistedState>({ prefix: "pcai" }),
      partialize: (state) => ({
        generatedPpts: state.generatedPpts,
        activeGeneratedPptId: state.activeGeneratedPptId,
      }),
    },
  ),
);
