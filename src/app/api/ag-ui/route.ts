import { HttpAgent, randomUUID } from "@ag-ui/client";
import { type NextRequest, NextResponse } from "next/server";

const agent = new HttpAgent({
  url: "http://localhost:7777/agui",
});

export const GET = async (req: NextRequest) => {
  agent.addMessage({
    id: randomUUID(),
    role: "user",
    content: req.nextUrl.searchParams.get("message") || "",
  });
  await agent.runAgent(undefined, {
    onTextMessageContentEvent: ({ event,  }) => {
      console.log(`Text message content: `, event);
    },

  });
  console.log("agent.messages", agent.messages);
  return NextResponse.json({ messages: agent.messages });
};
