import type { UIMessage } from "ai";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import { createIdbPersistStorage } from "@/store/idb-persist-storage";

export type IMessageStore = {
  /**
   * 消息列表, 按sessionId分组, 每个sessionId对应一个消息列表
   */
  messagesMap: Record<string, UIMessage[]>;
  addMessages: (sessionId: string, messages: UIMessage[]) => void;
  /**
   * 当前选中的消息id, 用户消息id role=user
   */
  selectedMessageId: string | undefined;
  setSelectedMessageId: (messageId: string | undefined) => void;
};

type MessagePersistedState = Pick<IMessageStore, "messagesMap" | "selectedMessageId">;

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
      }),
      {
        name: "message-storage",
        storage: createIdbPersistStorage<MessagePersistedState>({ prefix: "pcai" }),
        partialize: (state) => ({
          messagesMap: state.messagesMap,
          selectedMessageId: state.selectedMessageId,
        }),
      },
    ),
  ),
);

export function useCurrentMessages(sessionId: string) {
  return useMessageStore(
    useShallow((state) =>
      state.messagesMap[sessionId] || []
    ),
  );
}
