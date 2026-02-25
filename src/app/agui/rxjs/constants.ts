/** 示例请求体：用于「查询北京天气」按钮 */
export const CHAT_BODY = {
  resourceId: "29bdf526-2fd1-4dd1-b301-a3812f267931",
  id: "29bdf526-2fd1-4dd1-b301-a3812f267931",
  messages: [
    {
      parts: [{ type: "text", text: "北京天气" }],
      id: "peNWQiE4DCSazZyo",
      role: "user",
    },
  ],
  trigger: "submit-message",
} as const;
