// biome-ignore lint/performance/noBarrelFile: package public API entrypoint.
export { AiInput, type AiInputProps } from "./ai-input/ai-input";
export {
  consumeMentionQuery,
  filterMentionItems,
  getActiveMention,
} from "./ai-input/mention-query";
export type {
  AiInputSubmitValue,
  AiMentionItem,
  MentionRange,
} from "./ai-input/types";
