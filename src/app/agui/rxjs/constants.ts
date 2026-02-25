import { nanoid } from "nanoid";

const RESOURCE_ID = "29bdf526-2fd1-4dd1-b301-a3812f267931";

/** 示例请求体：用于「查询北京天气」等预置请求 */
export const CHAT_BODY = {
  resourceId: RESOURCE_ID,
  id: RESOURCE_ID,
  messages: [
    {
      parts: [{ type: "text", text: "北京天气" }],
      id: "peNWQiE4DCSazZyo",
      role: "user",
    },
  ],
  trigger: "submit-message",
} as const;

/** 预置问题：点击即可发送 */
export const PRESET_QUESTIONS = [
  { label: "北京天气", text: "北京天气" },
  { label: "查询今日纳斯达克100指数", text: "查询今日纳斯达克100指数" },
  { label: "发送邮件", text: "发送邮件到test@test.com，主题为Hello，内容为This is a test email." },
] as const;

/** 根据用户输入文本构建与 CHAT_BODY 同结构的请求体 */
export function buildChatBody(text: string): Record<string, unknown> {
  return {
    resourceId: RESOURCE_ID,
    id: RESOURCE_ID,
    messages: [
      {
        parts: [{ type: "text", text: text.trim() || " " }],
        id: nanoid(),
        role: "user",
      },
    ],
    trigger: "submit-message",
  };
}
