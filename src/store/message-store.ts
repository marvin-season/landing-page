import type { UIMessage } from "ai";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";

export type IMessageStore = {
  messagesMap: Record<string, UIMessage[]>;
  addMessages: (sessionId: string, messages: UIMessage[]) => void;
  selectedMessageId: string | undefined;
  setSelectedMessageId: (messageId: string | undefined) => void;
};

export const useMessageStore = create<IMessageStore>()(
  immer(
    persist(
      (set, _get) => ({
        messagesMap: {},
        addMessages: (sessionId, messages) => {
          set((state) => {
            return {
              messagesMap: {
                ...state.messagesMap,
                [sessionId]: messages,
              },
            };
          });
        },
        selectedMessageId: undefined,
        setSelectedMessageId: (messageId) => {
          set((state) => {
            state.selectedMessageId = messageId;
          });
        },
      }), { name: "message-storage", storage: createJSONStorage(() => localStorage) }),
  ),
);

export function useCurrentMessages(sessionId: string) {
  return useMessageStore(
    useShallow((state) =>
      state.messagesMap[sessionId] || []
    ),
  );
}
