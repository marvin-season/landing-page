import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import { createIdbPersistStorage } from "@/store/idb-persist-storage";
export interface ISession {
  id: string;
  title: string;
  createdAt: number;
}

interface ISessionStore {
  sessions: ISession[];

  deleteSession: (sessionId: string) => void;
  // New action to update a specific session's title
  updateSessionTitle: (sessionId: string, title: string) => void;
  createNewSession: () => void;
}

type SessionPersistedState = Pick<ISessionStore, "sessions">;

export const useSessionStore = create<ISessionStore>()(
  immer(
    persist(
      (set, get) => ({
        sessions: [],
        deleteSession: (sessionId) => {
          set((state) => {
            state.sessions = state.sessions.filter((s) => s.id !== sessionId);
          });
        },
        updateSessionTitle: (sessionId, title) => {
          set((state) => {
            state.sessions = state.sessions.map((s) =>
              s.id === sessionId ? { ...s, title } : s,
            );
          });
        },
        createNewSession: () => {
          const newSessionId = crypto.randomUUID();
          const existingSession = get().sessions.find(
            (s) => s.id === newSessionId || s.title === "New Conversation",
          );
          if (existingSession) {
            return existingSession.id;
          }
          set((state) => {
            state.sessions.push({
              id: newSessionId,
              title: "New Conversation",
              createdAt: Date.now(),
            });
          });
          return newSessionId;
        },
      }),
      {
        name: "session-storage",
        storage: createIdbPersistStorage<SessionPersistedState>({
          prefix: "pcai",
        }),
        partialize: (state) => ({
          sessions: state.sessions,
        }),
      },
    ),
  ),
);

export function useCurrentSession(sessionId: string) {
  return useSessionStore(
    useShallow((state) =>
      sessionId ? state.sessions.find((s) => s.id === sessionId) : undefined,
    ),
  );
}
