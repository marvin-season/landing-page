import type { UIMessage } from "ai";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
}

interface MessageStore {
  [sessionId: string]: UIMessage[];
}

interface ChatState {
  sessions: ChatSession[];
  messages: MessageStore;
  currentSessionId: string | null;
  selectedMessageId: string | null;

  // Actions
  createSession: () => string;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  // New action to update a specific session's title
  updateSessionTitle: (sessionId: string, title: string) => void;
  
  // Message actions
  addMessages: (sessionId: string, messages: UIMessage[]) => void;
  updateSessionMessages: (sessionId: string, messages: UIMessage[]) => void;
  
  setSelectedMessageId: (messageId: string | null) => void;

}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      messages: {},
      currentSessionId: null,
      selectedMessageId: null,

      createSession: () => {
        const state = get();
        // Check if current session is empty
        if (state.currentSessionId) {
          const currentMessages = state.messages[state.currentSessionId] || [];
          if (currentMessages.length === 0) {
            // Already in an empty session, just return it
            return state.currentSessionId;
          }
        }

        // check if already has e empty session
        const emptySession = state.sessions.find((s) => s.title === "New Conversation");
        if (emptySession) {
          return emptySession.id;
        }

        const newSession: ChatSession = {
          id: crypto.randomUUID(),
          title: "New Conversation",
          createdAt: Date.now(),
        };

        set((state) => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: newSession.id,
          selectedMessageId: null,
          messages: {
            ...state.messages,
            [newSession.id]: [],
          },
        }));

        return newSession.id;
      },

      switchSession: (sessionId) => {
        set({ currentSessionId: sessionId, selectedMessageId: null });
      },

      deleteSession: (sessionId) => {
        set((state) => {
          const newSessions = state.sessions.filter((s) => s.id !== sessionId);
          const newMessages = { ...state.messages };
          delete newMessages[sessionId];

          const nextSessionId =
            state.currentSessionId === sessionId
              ? newSessions[0]?.id || null
              : state.currentSessionId;
          
          return {
            sessions: newSessions,
            messages: newMessages,
            currentSessionId: nextSessionId,
            selectedMessageId: null,
          };
        });
      },

      updateSessionTitle: (sessionId, title) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId ? { ...session, title } : session
          ),
        }));
      },

      addMessages: (sessionId, newMessages) => {
        set((state) => {
            const currentSessionMessages = state.messages[sessionId] || [];
            return {
                messages: {
                    ...state.messages,
                    [sessionId]: [...currentSessionMessages, ...newMessages]
                }
            };
        });
      },

      updateSessionMessages: (sessionId, newMessages) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [sessionId]: newMessages,
          },
        }));
      },

      setSelectedMessageId: (messageId) => {
        set({ selectedMessageId: messageId });
      },
    }),
    {
      name: "chat-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
          sessions: state.sessions, 
          messages: state.messages,
          currentSessionId: state.currentSessionId 
      }),
    },
  ),
);

export function useCurrentSession(sessionId: string) {
  return useChatStore(
    useShallow((state) =>
      sessionId
        ? state.sessions.find((s) => s.id === sessionId)
        : undefined,
    ),
  );
}

export function useCurrentSessionMessages(sessionId: string) {
  return useChatStore(
    useShallow((state) =>
      sessionId
        ? state.messages[sessionId] || []
        : [],
    ),
  );
}