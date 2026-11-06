import {
  type ChatStreamAdapter,
  createObservableStream,
} from "@landing-page/utils/stream";
import { buildSubmitMessageBody, type TInputParams } from "./chat-request";

/** 当前项目的 submit-message 请求和 AI SDK UI 消息流协议。 */
export const submitMessageStreamAdapter: ChatStreamAdapter<TInputParams> = (
  { url, text, threadId, messages },
  { signal },
) =>
  createObservableStream(
    url,
    buildSubmitMessageBody({ threadId, text, messages }),
    signal,
  );
