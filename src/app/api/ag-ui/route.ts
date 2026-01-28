import { HttpAgent, randomUUID } from "@ag-ui/client";
import { type NextRequest, NextResponse } from "next/server";

const agent = new HttpAgent({
  url: "http://localhost:7777/agui",
});

/**
 * Just for test
 */
export const GET = async (req: NextRequest) => {
  agent.addMessage({
    id: randomUUID(),
    role: "user",
    content: req.nextUrl.searchParams.get("message") || "",
  });
  console.log("\n==========Running agent...==========\n");
  await agent.runAgent(undefined, {
    onTextMessageEndEvent: ({ messages }) => {
      console.log("\n==========Text message end:==========\n", messages);
    },
    onRunErrorEvent: ({ event }) => {
      console.error("\n==========Agent error:==========\n", event.message);
    },
    onRunFinishedEvent: ({ messages }) => {
      console.log("\n==========Run finished:==========\n", messages);
    },
    onTextMessageContentEvent: ({ event,  }) => {
      // 不换行输出
      process.stdout.write(event.delta);
    },
  });
  return NextResponse.json({ messages: agent.messages });
};
