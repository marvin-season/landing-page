import { nanoid } from "nanoid";

/** 预置问题：点击即可发送 */
export const PRESET_QUESTIONS = [
  { label: "北京天气", text: "北京天气" },
  { label: "查询今日纳斯达克100指数", text: "查询今日纳斯达克100指数" },
  {
    label: "发送邮件",
    text: "发送邮件到test@test.com，主题为Hello，内容为This is a test email.",
  },
] as const;

/** 根据会话 resourceId 与用户输入文本构建请求体 */
export function buildChatBody(
  resourceId: string,
  text: string,
): Record<string, unknown> {
  return {
    resourceId,
    id: resourceId,
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
